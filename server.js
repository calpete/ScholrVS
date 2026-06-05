import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';
import { Storage } from '@google-cloud/storage';
import fs from 'fs';
import os from 'os';
import { randomUUID } from 'crypto';
import { createRequire } from 'module';

// pdfjs-dist is the only PDF text extractor that reliably works in pure
// Node ESM. The legacy build is the Node-safe variant; the regular build
// expects a browser worker. We resolve the worker path with createRequire
// so pdfjs can find it without any bundler help.
const _require = createRequire(import.meta.url);
let _pdfjs = null;
async function getPdfjs() {
  if (_pdfjs) return _pdfjs;
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    pdfjs.GlobalWorkerOptions.workerSrc = _require.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs');
    _pdfjs = pdfjs;
    return pdfjs;
  } catch (e) {
    console.warn('⚠️  pdfjs unavailable — PDF text extraction disabled:', e.message);
    _pdfjs = false;
    return null;
  }
}

dotenv.config();

if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  const tmpPath = path.join(os.tmpdir(), 'gcp-credentials.json');
  fs.writeFileSync(tmpPath, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath;
  console.log('✅ GCP credentials written from env var');
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID || 'scholr-dev';
const LOCATION = process.env.GCP_LOCATION || 'us-central1';
const MODEL = 'gemini-2.5-flash';            // heavy generation: quiz / test / cards / debrief / chat
// NOTE: gemini-2.5-flash-lite would be ~half the TTFT here, but the
// @google/genai SDK pinned to 0.7.0 in package.json predates that model
// by months and chokes on its streaming wire format ("Incomplete JSON
// segment at the end" after a few characters). Production logs show this
// firing reliably. Until we bump @google/genai to a recent release and
// re-test, run chat on the proven 2.5-flash. RAG keeps us at ~3s anyway.
// Chat generation runs on OpenAI gpt-4o. Gemini was over-escaping LaTeX
// backslashes and tangling with markdown; gpt-4o-mini fixed the escaping
// but ignored the "no formulas inside list items" rule. gpt-4o follows
// formatting instructions reliably and writes more thorough answers — the
// extra cost is small at our scale and saves us from chasing one prompt-
// adherence bug after another. Quiz / test / cards / debrief still run on
// Gemini — they don't have the math-rendering issue.
const MODEL_CHAT = 'gpt-4o';
const MODEL_EMBED = 'text-embedding-004';    // 768-dim embeddings for retrieval

const ai = new GoogleGenAI({ vertexai: true, project: PROJECT, location: LOCATION });
const openai = new OpenAI(); // reads OPENAI_API_KEY from env
console.log(`✅ AI ready — gen (quiz/test/cards): ${MODEL} (Gemini) · chat: ${MODEL_CHAT} (OpenAI) · embed: ${MODEL_EMBED}`);

const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY;
const supabase = createClient(process.env.SUPABASE_URL, SUPABASE_KEY);
console.log('✅ Supabase connected');

// Dedicated client for sign-in / sign-up ONLY. signInWithPassword() and signUp()
// mutate a client's auth state — calling them on the shared admin client above
// would switch it off the service role and onto the just-logged-in user, so
// every later query (on every request, since the client is a singleton) would
// be subject to RLS and silently return nothing. Keep auth on an isolated,
// stateless client and never run table queries through it.
const supabaseAuth = createClient(process.env.SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Guard against the #1 deploy mistake: using the publishable/anon key instead
// of the secret (service_role) key. The backend talks to Supabase as a trusted
// service and MUST bypass RLS — with an anon key, writes like enrolling a
// student fail at runtime with "new row violates row-level security policy".
// Verify the key has admin powers at boot so we catch this before any user does.
(async () => {
  if (!SUPABASE_KEY) {
    console.error('❌ SUPABASE_SECRET_KEY is missing. The server cannot write to the database.');
    return;
  }
  if (SUPABASE_KEY.startsWith('sb_publishable_') || SUPABASE_KEY.includes('anon')) {
    console.error('❌ SUPABASE_SECRET_KEY looks like a PUBLISHABLE/ANON key. Use the SECRET (service_role) key — student enrollment and other writes will fail with RLS errors.');
  }
  try {
    const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (error) console.error('❌ Supabase key is NOT a service_role/secret key — admin API rejected it. Writes blocked by RLS will fail:', error.message);
    else console.log('✅ Supabase key verified as service_role (RLS bypass active)');
  } catch (e) {
    console.error('❌ Could not verify Supabase service key:', e.message);
  }
})();

// GCS — caches PDFs so Vertex AI can read them by gs:// URI instead of
// receiving the full file inline base64 on every chat. Vertex AI doesn't
// support the standalone Gemini File API, so GCS is the proper path.
const GCS_BUCKET = process.env.GCS_BUCKET;
const gcs = GCS_BUCKET ? new Storage({ projectId: PROJECT }) : null;
if (gcs) console.log(`✅ GCS ready — bucket: ${GCS_BUCKET}`);
else console.warn('⚠️ GCS_BUCKET not set — falling back to inline base64 on every chat (slow)');

function getMimeType(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  const map = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
  return map[ext] || null;
}
function isImage(mimeType) { return mimeType && mimeType.startsWith('image/'); }

function generateJoinCode(name) {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(' ').filter(Boolean);
  const prefix = words.slice(0, 2).map(w => w.slice(0, 4)).join('-');
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `${prefix}-${suffix}`;
}

const SYSTEM_PROMPT = `You are Scholr — an AI tutor for college students. You answer using the retrieved excerpts from the professor's course materials (syllabus, lecture notes, readings, slides) and the student's own notes when present.

# VOICE
You're a senior TA who has taken this class. Direct, warm, peer-to-peer — never preachy. Lead with the answer, no warm-up phrases ("Great question!", "Sure, let's…", "Certainly!"). Don't restate the question.

If a student sounds stressed ("I'm panicking", "going to fail", "lost"), open with ONE short empathetic line before the answer. Then move on — no therapy-speak.

# WHAT TO ANSWER
Default: give the student what they ask for. Don't make them work for answers they're allowed to have. The one exception — when a student asks you to produce a full piece of work from scratch (write a complete essay, solve every problem on a practice exam, summarize a whole chapter), offer the coaching path FIRST in ONE polite check: "I can write it, but want to nail down the argument first, or just go to a draft?" If they say "just do it" or repeat the ask, comply fully. Single problems, factual questions, concept explanations, debugging — answer straight, no friction.

If a question has nothing to act on ("help me", "I'm lost"), ask ONE focused clarifying question. Otherwise just answer.

# FORMAT
Use your judgment. Markdown is available — headings, bold, lists, tables, prose, code blocks. Pick whatever serves THIS question. A one-line factual question gets a one-line answer; a "what is X" concept question gets the depth a peer tutor would give walking someone through it for the first time. Don't pad with filler, but don't shortchange a concept question with two lines either.

Tables, bullets, headings, and structure are tools — use them when they help, skip them when prose is clearer. Don't force a table just because there are 3+ items.

# MATH
Write ALL math in plain text using Unicode characters. NEVER use LaTeX. NEVER use \`$\`, \`$$\`, \`\\frac\`, \`\\text\`, \`\\sum\`, \`\\sqrt\`, \`\\[\`, \`\\(\`, or any backslash command. The student's renderer does not run KaTeX or MathJax — anything in LaTeX syntax appears as raw text and looks broken.

Use these Unicode characters for math:
- Operators: × ÷ ± ≤ ≥ ≠ ≈ ≡ → ⇒ · ∞
- Greek: α β γ δ ε θ λ μ π ρ σ τ φ ω Δ Σ Π Ω
- Big operators: Σ ∏ ∫ √ ∂ ∇
- Superscripts: ⁰ ¹ ² ³ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹ ⁿ ⁱ ⁺ ⁻
- Subscripts: ₀ ₁ ₂ ₃ ₄ ₅ ₆ ₇ ₈ ₉ ₜ ₙ ₓ

Fractions: write inline as \`a / b\` or \`(numerator) / (denominator)\`. For named formulas, give it its own line and use bold labels:

  **NPV** = Σ Cₜ / (1+r)ᵗ − C₀

  **Margin of Safety** = Actual Sales − Break-even Sales

  **Margin of Safety (%)** = (Actual Sales − Break-even Sales) / Actual Sales

  **CM Ratio** = CM per Unit / Selling Price per Unit

Currency: write the number followed by the currency word ("500 dollars", "0.50 dollars") — never lead with a \`$\` sign. Percentages: write the number followed by \`%\` ("20%", "0.25 × 68% = 17 points"). For exponents, use Unicode superscripts when possible (1.08², (1+r)ᵗ); for more complex cases write \`(1+r)^t\` with a caret.

Bold labels (with **) are how you mark formulas. Put each formula on its own line so it stands out. No LaTeX, no \`$$\`, no backslash commands, ever.

# GRADE CALCULATIONS
If a student asks about their grade and you don't have their actual scores, ASK for them with the weighted breakdown listed — don't assume or default to "max possible." Only run the calculation once you have a real number for every weighted component. For "what do I need on X to get a Y?", solve for the missing score.

# WHEN A CONCEPT ISN'T IN THE RETRIEVED EXCERPTS
- **Course-specific facts** (dates, deadlines, grading rules, what's on the exam): if not in the materials, don't guess. Say "**That's not in your uploaded materials** — check with your professor."
- **General concepts the course covers** (a definition, standard formula, how a method works): answer with general knowledge of the subject. Briefly note the syllabus location if mentioned ("Your syllabus places this in Chapter 9").

Never frame as "this isn't in your materials but here's the general idea" — that reads as a brush-off. Lead with the answer, tuck the course-context note in at the end.

# CONFLICTING DOCUMENTS
If two docs disagree (syllabus vs. announcement), flag it explicitly and trust the newer one — but suggest the student verify with the professor.

# REDIRECT
Grade disputes, accommodation requests, edge-case policy interpretation → answer what you can, then point them at the professor. Don't refuse — just route.

# REFERRING TO THE PROFESSOR
"Your professor" or "your instructor" — don't assume gender or pronouns from a name.

# SOURCES & FOLLOW-UP
The system shows source documents automatically below your answer. NEVER write a "SOURCES:" line, inline page citations, or attribution lists — just answer cleanly.

End with one specific follow-up question tailored to what they asked ("Want me to walk through the worked example?", "Should I show how the formula handles negative cases?"). Skip the follow-up for trivial factual answers like "When is the midterm?"

The original materials are still authoritative — your job is to make them clearer, faster, and easier to act on. You have access to:
- [Professor document: filename] — course materials uploaded by the instructor: syllabus, lecture notes, readings, diagrams, slides
- [Student note: filename] — personal files the student uploaded: notes, photos of whiteboards, handwritten study guides

Read ALL retrieved excerpts. Conversation history is fair game too — "explain that more" refers to what you just said.`;


// ── In-memory caches ──────────────────────────────────────────────────────────
const courseDocuments = {};   // { courseId: { filename: { buffer, sizeKb, mimeType, uploadedAt } } }
const questionsCaches = {};   // { courseId: string[] }
// Gemini URI cache: { courseId: { filename: { uri, expiresAt } } }
// This is a fast in-memory layer on top of the DB so we don't query Supabase on every message
const geminiUriCache = {};

function getCourseDocuments(courseId) {
  if (!courseDocuments[courseId]) courseDocuments[courseId] = {};
  return courseDocuments[courseId];
}

function getGeminiUriCache(courseId) {
  if (!geminiUriCache[courseId]) geminiUriCache[courseId] = {};
  return geminiUriCache[courseId];
}

// ── GCS file caching ─────────────────────────────────────────────────────────
// Vertex AI accepts gs:// URIs in fileData.fileUri, sourced from a bucket the
// service account can read. We upload each PDF once on teacher upload, then
// reference it on every chat — no more inline base64.

const courseGcsPath = (courseId, filename) => `courses/${courseId}/${filename}`;

async function uploadToGCS(buffer, mimeType, gcsPath) {
  if (!gcs) return null;
  try {
    const file = gcs.bucket(GCS_BUCKET).file(gcsPath);
    await file.save(buffer, {
      contentType: mimeType,
      resumable: false,  // single-shot upload, much faster for small files
      metadata: { cacheControl: 'public, max-age=31536000' },
    });
    const uri = `gs://${GCS_BUCKET}/${gcsPath}`;
    console.log(`✅ GCS upload: ${gcsPath}`);
    return uri;
  } catch (err) {
    console.error(`❌ GCS upload failed for ${gcsPath}:`, err.message);
    return null;
  }
}

async function deleteFromGCS(uri) {
  if (!gcs || !uri || !uri.startsWith(`gs://${GCS_BUCKET}/`)) return;
  try {
    const objectPath = uri.slice(`gs://${GCS_BUCKET}/`.length);
    await gcs.bucket(GCS_BUCKET).file(objectPath).delete({ ignoreNotFound: true });
    console.log(`✅ GCS deleted: ${objectPath}`);
  } catch (err) {
    console.warn(`⚠️ GCS delete skipped (${uri}):`, err.message);
  }
}

// Get a valid gs:// URI for a course document.
// Checks memory cache, then DB, then uploads to GCS if missing.
// (We keep the column name `gemini_uri` to avoid a migration — it now stores gs:// URIs.)
async function getGeminiUri(courseId, filename, doc) {
  if (!gcs) return null;  // No bucket configured → caller falls back to inline base64
  const memCache = getGeminiUriCache(courseId);

  // 1. Memory cache
  if (memCache[filename]?.uri?.startsWith('gs://')) {
    return memCache[filename].uri;
  }

  // 2. DB
  const { data: dbDoc } = await supabase
    .from('documents')
    .select('gemini_uri')
    .eq('course_id', courseId)
    .eq('name', filename)
    .maybeSingle();

  if (dbDoc?.gemini_uri?.startsWith('gs://')) {
    memCache[filename] = { uri: dbDoc.gemini_uri };
    return dbDoc.gemini_uri;
  }

  // 3. Need to upload (never uploaded, or old broken Files API URI)
  console.log(`🔄 Uploading to GCS: ${filename}`);
  const gcsPath = courseGcsPath(courseId, filename);
  const uri = await uploadToGCS(doc.buffer, doc.mimeType, gcsPath);
  if (!uri) return null;

  // Persist — GCS URIs don't expire, so we set the legacy expires_at far in the future.
  await supabase
    .from('documents')
    .update({ gemini_uri: uri, gemini_uri_expires_at: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString() })
    .eq('course_id', courseId)
    .eq('name', filename);

  memCache[filename] = { uri };
  return uri;
}

// ── Startup: load all documents + seed Gemini URIs ───────────────────────────
async function loadAllDocumentsFromStorage() {
  try {
    const { data: courses } = await supabase.from('courses').select('id');
    if (!courses) return;

    for (const course of courses) {
      const { data: files } = await supabase.storage.from('documents').list(course.id, { limit: 100 });
      if (!files) continue;

      for (const file of files) {
        const { data: fileData } = await supabase.storage.from('documents').download(`${course.id}/${file.name}`);
        if (!fileData) continue;
        const buffer = Buffer.from(await fileData.arrayBuffer());
        const mimeType = getMimeType(file.name) || 'application/pdf';
        getCourseDocuments(course.id)[file.name] = {
          buffer, sizeKb: Math.round(buffer.length / 1024), mimeType, uploadedAt: file.created_at,
        };
        console.log(`✅ Loaded: ${course.id}/${file.name}`);
      }

      // Warm Gemini URI cache from DB (don't re-upload on startup, just load valid URIs)
      const { data: dbDocs } = await supabase
        .from('documents')
        .select('name, gemini_uri, gemini_uri_expires_at')
        .eq('course_id', course.id)
        .not('gemini_uri', 'is', null);

      if (dbDocs) {
        const memCache = getGeminiUriCache(course.id);
        for (const d of dbDocs) {
          if (d.gemini_uri && d.gemini_uri_expires_at && new Date(d.gemini_uri_expires_at) > new Date()) {
            memCache[d.name] = { uri: d.gemini_uri, expiresAt: d.gemini_uri_expires_at };
            console.log(`✅ Gemini URI cached: ${d.name}`);
          }
        }
      }
    }

    console.log('✅ All course documents loaded from Supabase Storage');

    // Background: upload any docs that don't have a Gemini URI yet
    // Do this after startup so we don't block the server
    setTimeout(() => seedMissingGeminiUris(), 5000);

  } catch (err) {
    console.error('Failed to load documents:', err.message);
  }
}

// After startup, upload any docs that don't yet have a gs:// URI to GCS.
// This handles existing documents that were uploaded before GCS was wired up
// (and ones that have stale Files API URIs from the Vertex AI mismatch).
async function seedMissingGeminiUris() {
  if (!gcs) return;
  console.log('🔄 Seeding missing GCS URIs in background...');
  for (const [courseId, docs] of Object.entries(courseDocuments)) {
    for (const [filename, doc] of Object.entries(docs)) {
      const memCache = getGeminiUriCache(courseId);
      if (memCache[filename]?.uri?.startsWith('gs://')) continue;
      await getGeminiUri(courseId, filename, doc);
      await new Promise(r => setTimeout(r, 300));
    }
  }
  console.log('✅ GCS URI seeding complete');
}

// ── RAG: chunk + embed + retrieve ───────────────────────────────────────────
// Instead of shipping the entire course PDF library to Gemini on every
// student question (slow + expensive), we chunk each PDF at upload time,
// embed each chunk, and at query time retrieve only the top-k most relevant
// slices. Net effect: 6s → ~1.5s, smaller token bills, sharper answers.

// Pull all extractable text out of a PDF buffer using pdfjs-dist directly.
// Returns null if the extraction fails or pdfjs isn't available.
async function extractPdfText(buffer) {
  const pdfjs = await getPdfjs();
  if (!pdfjs) return null;
  try {
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      // Silence pdfjs's verbose chatter on Render — only show errors.
      verbosity: 0,
    });
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const pageTexts = [];
    for (let i = 1; i <= numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      // Each item is one text run; join with spaces, then collapse runs of
      // whitespace so the chunked text stays readable.
      const pageText = content.items
        .map(item => (item && typeof item.str === 'string') ? item.str : '')
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (pageText) pageTexts.push(pageText);
    }
    return { text: pageTexts.join('\n\n'), pages: numPages };
  } catch (e) {
    console.error('PDF extract error:', e.message);
    return null;
  }
}

// Split text into ~2000-char chunks (~500 tokens) with 200-char overlap.
// Tries to break at sentence boundaries so chunks read naturally.
function chunkText(text, { chunkSize = 2000, overlap = 200 } = {}) {
  if (!text || text.length === 0) return [];
  if (text.length <= chunkSize) return [text.trim()];
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + chunkSize, text.length);
    if (end < text.length) {
      const lastPeriod = text.lastIndexOf('. ', end);
      if (lastPeriod > start + chunkSize / 2) end = lastPeriod + 1;
    }
    const slice = text.slice(start, end).trim();
    if (slice.length > 80) chunks.push(slice);
    if (end >= text.length) break;
    start = end - overlap;
  }
  return chunks;
}

// Embed one text → 768-dim vector. Returns null on failure.
async function embedSingle(text) {
  try {
    const result = await ai.models.embedContent({
      model: MODEL_EMBED,
      contents: text,
    });
    const values = result?.embeddings?.[0]?.values || result?.embedding?.values || null;
    return Array.isArray(values) ? values : null;
  } catch (e) {
    console.error('Embed error:', e.message);
    return null;
  }
}

// Embed many texts. Runs in parallel batches of 8 to avoid hammering the API.
async function embedTexts(texts) {
  const results = [];
  const batchSize = 8;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const vecs = await Promise.all(batch.map(embedSingle));
    results.push(...vecs);
  }
  return results;
}

// Generate per-page descriptions of a PDF using Gemini vision. Captures
// the visual content of each page (diagrams, charts, equations rendered
// as images, code screenshots, structural formulas, plots) as
// searchable text. Returns an array of { page, description }. Uses
// MODEL (flash, not flash-lite) because vision quality matters here.
async function captionPdfPages(courseId, docName, mimeType, buffer, pageCount) {
  if (!pageCount || pageCount === 0) return [];

  // Prefer the cached GCS URI so Gemini doesn't have to process the
  // inline base64 every time. Falls back to inlineData if GCS isn't set.
  const cached = getGeminiUriCache(courseId)[docName]?.uri;
  const docPart = cached
    ? { fileData: { mimeType, fileUri: cached } }
    : { inlineData: { mimeType, data: buffer.toString('base64') } };

  // ~120 output tokens per page of description, capped on both ends so
  // tiny PDFs still have headroom and massive PDFs don't blow the limit.
  const maxOutput = Math.min(Math.max(pageCount * 120 + 500, 2000), 16000);

  const prompt = `For each page of this PDF, write a concise 2-3 sentence description capturing BOTH the text content AND any visual elements — diagrams, charts, equations, figures, code screenshots, photographs, structural formulas, plots. If a page is mostly visual, describe what's depicted in specific terms a student might search for (proper nouns, technical terminology, named processes, components, labels). Skip filler like "this page shows…" and lead with the content.

Return ONLY a JSON array, no preamble or markdown fences:
[{"page":1,"description":"…"},{"page":2,"description":"…"}]`;

  try {
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [docPart, { text: prompt }] }],
      config: { temperature: 0.2, maxOutputTokens: maxOutput },
    });
    const text = (result.text || '').trim();
    // Tolerate Gemini wrapping the JSON in ```json fences or stray text.
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.warn(`No JSON array in captions for ${docName}`);
      return [];
    }
    const parsed = JSON.parse(jsonMatch[0]);
    return parsed
      .filter(c => c && typeof c.page === 'number' && typeof c.description === 'string' && c.description.length > 20)
      .slice(0, pageCount);
  } catch (e) {
    console.warn(`Vision captioning failed for ${docName}: ${e.message}`);
    return [];
  }
}

// Chunk + embed a whole PDF and persist the chunks to document_chunks.
// Now produces two kinds of chunks: extracted text (via pdfjs) AND
// per-page visual captions (via Gemini vision). Both are embedded and
// retrieved together so a student asking about a diagram on page 12
// retrieves the caption chunk even when pdfjs found no text for it.
// Re-running on the same doc clears its old chunks first.
async function chunkAndEmbedPdf(courseId, docName, pdfBuffer) {
  const pdfData = await extractPdfText(pdfBuffer);
  if (!pdfData) return { ok: false, error: 'PDF extract failed' };

  const textChunks = chunkText(pdfData.text || '');

  // Generate per-page vision captions in parallel with the embedding of
  // text chunks. Visual content (chemistry structures, flow charts,
  // equations as images) becomes searchable alongside the bullet text.
  const visionCaptions = await captionPdfPages(courseId, docName, 'application/pdf', pdfBuffer, pdfData.pages);

  const allItems = [
    ...textChunks.map(t => ({ text: t, page_number: null })),
    ...visionCaptions.map(c => ({ text: `Page ${c.page}: ${c.description}`, page_number: c.page })),
  ];

  if (allItems.length === 0) return { ok: false, error: 'No chunks produced' };

  // Wipe any prior chunks for this doc so re-uploads stay consistent.
  await supabase.from('document_chunks').delete()
    .eq('course_id', courseId).eq('doc_name', docName);

  const vectors = await embedTexts(allItems.map(i => i.text));
  const rows = allItems
    .map((item, chunk_index) => ({
      course_id: courseId,
      doc_name: docName,
      chunk_index,
      chunk_text: item.text,
      page_number: item.page_number,
      embedding: vectors[chunk_index],
    }))
    .filter(r => Array.isArray(r.embedding));

  if (rows.length === 0) return { ok: false, error: 'All embeddings failed' };

  for (let i = 0; i < rows.length; i += 50) {
    const { error } = await supabase.from('document_chunks').insert(rows.slice(i, i + 50));
    if (error) {
      console.error('Chunk insert error:', error.message);
      return { ok: false, error: error.message };
    }
  }
  return {
    ok: true,
    count: rows.length,
    textChunks: textChunks.length,
    visualChunks: visionCaptions.length,
    pages: pdfData.pages,
  };
}

// Find the top-k most relevant chunks for a question.
async function searchChunks(courseId, question, k = 6) {
  const queryEmb = await embedSingle(question);
  if (!queryEmb) return [];
  const { data, error } = await supabase.rpc('match_document_chunks', {
    query_embedding: queryEmb,
    match_course_id: courseId,
    match_count: k,
  });
  if (error) {
    console.error('Chunk search error:', error.message);
    return [];
  }
  return data || [];
}

// Convert any LaTeX the model emits into plain text + Unicode. Our prompt
// tells gpt-4o to use Unicode/plaintext math (no `$$`, no `\frac`, no
// `\text`) because remark-math+KaTeX can't be made reliable against the
// long tail of LaTeX-variant bugs the model invents. This is the safety
// net: if the model rebels and emits LaTeX anyway, we transform it to
// readable plain text rather than wrap-and-pray.
//
// `\frac{a}{b}` → `a/b`, `\text{Foo}` → `Foo`, `\sum` → `Σ`, etc.
// All `$$`, `$`, `\(`, `\)`, `\[`, `\]` delimiters are stripped — they're
// just noise to the renderer.
function rewriteEquations(text) {
  if (!text) return text;

  // ── 1. Strip LaTeX math delimiters ──────────────────────────────────────
  // `\[ ... \]` block math → just the content. (No KaTeX involved anymore;
  // the content itself, after the substitutions below, is plain text.)
  text = text.replace(/\\\[([\s\S]+?)\\\]/g, (_, inner) => inner.trim());
  // `\( ... \)` inline math → just the content.
  text = text.replace(/\\\(([^\n]+?)\\\)/g, (_, inner) => inner.trim());
  // Bare `[ \text{...} ]` block math — model wrote `\[ ... \]` but the
  // leading `\` got swallowed. Conservative: only fires when the bracketed
  // content contains a recognized LaTeX command, so prose with legitimate
  // square brackets is untouched.
  text = text.replace(
    /\[\s+([^\[\]]*?\\(?:frac|text|sum|prod|int|sqrt|times|cdot|alpha|beta|gamma|delta|sigma|mu|pi|theta|lambda|omega|infty|approx|leq|geq|neq|partial|nabla|equiv)[^\[\]]*?)\s+\]/g,
    (_, inner) => inner.replace(/\$+/g, '').trim()
  );
  // `$$ ... $$` block math → just the content.
  text = text.replace(/\$\$([\s\S]+?)\$\$/g, (_, inner) => inner.trim());
  // `$ ... $` inline math (single $) → just the content. The lookbehinds
  // avoid eating `$5` currency or `$$` boundaries.
  text = text.replace(/(?<![\\$])\$([^$\n]+?)\$(?!\$)/g, (_, inner) => inner.trim());
  // Stray escaped delimiters and orphan `$$` left by the model.
  text = text.replace(/\\\$/g, '');
  text = text.replace(/\\%/g, '%');
  text = text.replace(/\$\$/g, '');

  // ── 2. Iteratively unwrap brace-content commands ─────────────────────────
  // `\frac{a}{b}` → `a/b`, `\text{X}` → `X`, `\sqrt{x}` → `√(x)`. Loop until
  // no more changes so nested commands (\frac{\text{a}}{\text{b}}) collapse
  // correctly. Bounded loop in case input has pathological nesting.
  for (let i = 0; i < 8; i++) {
    const before = text;
    text = text
      .replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1)/($2)')
      .replace(/\\dfrac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1)/($2)')
      .replace(/\\tfrac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '($1)/($2)')
      .replace(/\\text\s*\{([^{}]*)\}/g, '$1')
      .replace(/\\textbf\s*\{([^{}]*)\}/g, '**$1**')
      .replace(/\\textit\s*\{([^{}]*)\}/g, '*$1*')
      .replace(/\\mathrm\s*\{([^{}]*)\}/g, '$1')
      .replace(/\\mathbf\s*\{([^{}]*)\}/g, '**$1**')
      .replace(/\\mathit\s*\{([^{}]*)\}/g, '*$1*')
      .replace(/\\sqrt\s*\{([^{}]+)\}/g, '√($1)')
      .replace(/\\overline\s*\{([^{}]+)\}/g, '$1̅')
      .replace(/\\bar\s*\{([^{}]+)\}/g, '$1̄')
      .replace(/\\hat\s*\{([^{}]+)\}/g, '$1̂')
      .replace(/\\vec\s*\{([^{}]+)\}/g, '$1⃗')
      .replace(/\\left\s*([()\[\]|])/g, '$1')
      .replace(/\\right\s*([()\[\]|])/g, '$1');
    // Strip redundant `()/()` parens when numerator/denominator is a single
    // simple token — `(a)/(b)` reads better than `((a))/((b))` when nesting
    // produced unnecessary wrapping.
    text = text.replace(/\(\(([^()]+)\)\)/g, '($1)');
    if (text === before) break;
  }

  // Drop simple parens around single-token numerator/denominator for
  // readability: `(NPV)/(rate)` → `NPV/rate`. Only when the token has no
  // internal whitespace or operators that would change meaning.
  text = text.replace(/\(([A-Za-zα-ωΑ-Ω₀-₉⁰-⁹]+)\)\/\(([A-Za-zα-ωΑ-Ω₀-₉⁰-⁹]+)\)/g, '$1/$2');

  // ── 3. Convert LaTeX symbol commands to Unicode ─────────────────────────
  const symbols = {
    '\\times': '×', '\\cdot': '·', '\\div': '÷', '\\pm': '±', '\\mp': '∓',
    '\\leq': '≤', '\\le': '≤', '\\geq': '≥', '\\ge': '≥',
    '\\neq': '≠', '\\ne': '≠', '\\approx': '≈', '\\equiv': '≡',
    '\\sim': '∼', '\\propto': '∝',
    '\\infty': '∞', '\\partial': '∂', '\\nabla': '∇',
    '\\to': '→', '\\rightarrow': '→', '\\leftarrow': '←',
    '\\Rightarrow': '⇒', '\\Leftarrow': '⇐', '\\Leftrightarrow': '⇔',
    '\\sum': 'Σ', '\\prod': '∏', '\\int': '∫', '\\oint': '∮',
    '\\bullet': '•', '\\cdots': '⋯', '\\ldots': '…', '\\dots': '…',
    '\\Alpha': 'Α', '\\Beta': 'Β', '\\Gamma': 'Γ', '\\Delta': 'Δ',
    '\\Epsilon': 'Ε', '\\Zeta': 'Ζ', '\\Eta': 'Η', '\\Theta': 'Θ',
    '\\Iota': 'Ι', '\\Kappa': 'Κ', '\\Lambda': 'Λ', '\\Mu': 'Μ',
    '\\Nu': 'Ν', '\\Xi': 'Ξ', '\\Pi': 'Π', '\\Rho': 'Ρ',
    '\\Sigma': 'Σ', '\\Tau': 'Τ', '\\Upsilon': 'Υ', '\\Phi': 'Φ',
    '\\Chi': 'Χ', '\\Psi': 'Ψ', '\\Omega': 'Ω',
    '\\alpha': 'α', '\\beta': 'β', '\\gamma': 'γ', '\\delta': 'δ',
    '\\epsilon': 'ε', '\\varepsilon': 'ε', '\\zeta': 'ζ', '\\eta': 'η',
    '\\theta': 'θ', '\\vartheta': 'θ', '\\iota': 'ι', '\\kappa': 'κ',
    '\\lambda': 'λ', '\\mu': 'μ', '\\nu': 'ν', '\\xi': 'ξ',
    '\\pi': 'π', '\\varpi': 'π', '\\rho': 'ρ', '\\sigma': 'σ',
    '\\tau': 'τ', '\\upsilon': 'υ', '\\phi': 'φ', '\\varphi': 'φ',
    '\\chi': 'χ', '\\psi': 'ψ', '\\omega': 'ω',
  };
  // Replace longest names first so `\Delta` doesn't get half-eaten by `\D`.
  const symKeys = Object.keys(symbols).sort((a, b) => b.length - a.length);
  for (const k of symKeys) {
    text = text.split(k).join(symbols[k]);
  }

  // ── 4. Subscripts and superscripts ──────────────────────────────────────
  // Single-character `_n` / `^n` → Unicode where available.
  const subMap = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', a: 'ₐ', e: 'ₑ', h: 'ₕ', i: 'ᵢ', j: 'ⱼ', k: 'ₖ', l: 'ₗ', m: 'ₘ', n: 'ₙ', o: 'ₒ', p: 'ₚ', r: 'ᵣ', s: 'ₛ', t: 'ₜ', u: 'ᵤ', v: 'ᵥ', x: 'ₓ', '+': '₊', '-': '₋', '=': '₌' };
  const supMap = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', a: 'ᵃ', b: 'ᵇ', c: 'ᶜ', d: 'ᵈ', e: 'ᵉ', f: 'ᶠ', g: 'ᵍ', h: 'ʰ', i: 'ⁱ', j: 'ʲ', k: 'ᵏ', l: 'ˡ', m: 'ᵐ', n: 'ⁿ', o: 'ᵒ', p: 'ᵖ', r: 'ʳ', s: 'ˢ', t: 'ᵗ', u: 'ᵘ', v: 'ᵛ', w: 'ʷ', x: 'ˣ', y: 'ʸ', z: 'ᶻ', '+': '⁺', '-': '⁻', '=': '⁼' };

  text = text.replace(/_([0-9A-Za-z+\-=])/g, (m, c) => subMap[c.toLowerCase()] ? subMap[c.toLowerCase()] : `_${c}`);
  text = text.replace(/\^([0-9A-Za-z+\-=])/g, (m, c) => supMap[c.toLowerCase()] ? supMap[c.toLowerCase()] : `^${c}`);
  // Multi-char braced forms → keep as `_(abc)` / `^(abc)` so they read.
  text = text.replace(/_\{([^{}]+)\}/g, '_($1)');
  text = text.replace(/\^\{([^{}]+)\}/g, '^($1)');

  // ── 5. Residual cleanup ─────────────────────────────────────────────────
  // LaTeX line break `\\` → newline.
  text = text.replace(/\\\\/g, '\n');
  // Lone `\` followed by space (LaTeX thin space) → just space.
  text = text.replace(/\\ /g, ' ');
  // Collapse runs of whitespace within a line (but preserve blank lines
  // between paragraphs).
  text = text.split('\n').map(l => l.replace(/[ \t]{2,}/g, ' ').trimEnd()).join('\n');
  // Collapse 3+ consecutive blank lines down to 2.
  text = text.replace(/\n{3,}/g, '\n\n');

  return text;
}

// Lazy backfill: the first time the chat endpoint sees a course with no
// chunks yet, we kick off indexing in the background. The current question
// falls back to whole-library mode, but every subsequent question on the
// same course is fast. Professors never touch a button.
const reindexInFlight = new Set();
const reindexCompleted = new Set();

// Boot-time backfill — re-index any course whose document_chunks rows
// are ALL text (no captions, i.e. page_number is null on every row).
// Those were indexed before vision captioning shipped, so their tables /
// diagrams / image-only slides are invisible to retrieval. Vision
// captioning takes ~1 second per page so this only runs once after a
// deploy; future boots find captions in place and exit immediately.
async function backfillVisualCaptions() {
  const candidates = Object.keys(courseDocuments);
  if (candidates.length === 0) return;

  for (const courseId of candidates) {
    try {
      const { count } = await supabase
        .from('document_chunks')
        .select('id', { count: 'exact', head: true })
        .eq('course_id', courseId)
        .not('page_number', 'is', null);

      if (count && count > 0) continue; // course already has visual chunks

      const docs = courseDocuments[courseId];
      if (!docs || Object.keys(docs).length === 0) continue;

      const pdfDocs = Object.entries(docs).filter(([_, d]) => d.mimeType === 'application/pdf');
      if (pdfDocs.length === 0) continue;

      console.log(`📚 Backfilling vision captions for ${pdfDocs.length} file(s) on course ${courseId}…`);
      for (const [name, doc] of pdfDocs) {
        const r = await chunkAndEmbedPdf(courseId, name, doc.buffer);
        if (r.ok) console.log(`📚 Backfilled ${name}: ${r.textChunks} text + ${r.visualChunks} visual chunks across ${r.pages} pages`);
        else console.warn(`📚 Backfill skipped ${name}: ${r.error}`);
      }
      reindexCompleted.add(courseId);
    } catch (e) {
      console.error(`Backfill error for ${courseId}:`, e.message);
    }
  }
}
async function ensureCourseIndexed(courseId) {
  if (reindexInFlight.has(courseId) || reindexCompleted.has(courseId)) return;
  reindexInFlight.add(courseId);
  try {
    // Cheap existence check — if any chunks at all exist for this course,
    // we treat it as indexed.
    const { count } = await supabase
      .from('document_chunks')
      .select('id', { count: 'exact', head: true })
      .eq('course_id', courseId);
    if (count && count > 0) {
      reindexCompleted.add(courseId);
      return;
    }
    const docs = getCourseDocuments(courseId);
    if (!docs || Object.keys(docs).length === 0) return;
    console.log(`📚 Auto-indexing ${Object.keys(docs).length} file(s) for course ${courseId}…`);
    for (const [name, doc] of Object.entries(docs)) {
      if (doc.mimeType !== 'application/pdf') continue;
      const r = await chunkAndEmbedPdf(courseId, name, doc.buffer);
      console.log(`📚 ${name}: ${r.ok ? `${r.textChunks} text + ${r.visualChunks} visual chunks across ${r.pages} pages` : `skipped (${r.error})`}`);
    }
    reindexCompleted.add(courseId);
  } catch (e) {
    console.error('Auto-index error:', e.message);
  } finally {
    reindexInFlight.delete(courseId);
  }
}

function getTopicTag(question) {
  const q = question.toLowerCase();
  if (/grade|gpa|score|point|percent|weight|exam|midterm|final|quiz|assignment|homework|rubric|curve/.test(q)) return 'Grading';
  if (/deadline|due|when|date|schedule|syllabus|office hour|location|room|time/.test(q)) return 'Logistics';
  if (/how|explain|what is|define|concept|theory|mean|understand|work/.test(q)) return 'Concepts';
  if (/exam|test|midterm|final|study|prepare|review|focus/.test(q)) return 'Exam Prep';
  if (/reading|chapter|lecture|slide|note|material|textbook/.test(q)) return 'Materials';
  return 'General';
}

async function getCourseInsights(courseId) {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: allQ } = await supabase.from('questions').select('*').eq('course_id', courseId).order('ts', { ascending: false }).limit(1000);
    const { data: weekQ } = await supabase.from('questions').select('*').eq('course_id', courseId).gte('ts', weekAgo);
    const { data: flagged } = await supabase.from('questions').select('*').eq('course_id', courseId).eq('confident', false).order('ts', { ascending: false }).limit(10);
    const total = allQ?.length || 0, weekCount = weekQ?.length || 0;
    const timeSavedMins = weekCount * 3;
    const topicCounts = {};
    (weekQ || []).forEach(q => { const tag = getTopicTag(q.question); topicCounts[tag] = (topicCounts[tag] || 0) + 1; });
    const topTopics = Object.entries(topicCounts).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([topic, count]) => ({ topic, count }));
    const hourCounts = {};
    (weekQ || []).forEach(q => { const h = new Date(q.ts).getHours(); hourCounts[h] = (hourCounts[h] || 0) + 1; });
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    const peakHourLabel = peakHour ? `${peakHour[0] % 12 || 12}${parseInt(peakHour[0]) < 12 ? 'am' : 'pm'}` : null;

    // Weekly Activity: one bucket per day for the last 7 days (oldest → today),
    // counted from the persisted questions table so it's accurate and survives
    // until the professor clears the data. UTC throughout for consistent buckets.
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayKey = (dt) => dt.toISOString().slice(0, 10); // YYYY-MM-DD (UTC)
    const buckets = {};
    const dailyActivity = [];
    const now = Date.now();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = dayKey(d);
      buckets[key] = 0;
      dailyActivity.push({ day: DAY_NAMES[d.getUTCDay()], _key: key, questions: 0 });
    }
    (weekQ || []).forEach(q => { const key = dayKey(new Date(q.ts)); if (key in buckets) buckets[key]++; });
    dailyActivity.forEach(b => { b.questions = buckets[b._key]; delete b._key; });

    return { totalQuestions: total, weekQuestions: weekCount, timeSavedHours: Math.floor(timeSavedMins / 60), timeSavedMinutes: timeSavedMins % 60, timeSavedMins, topTopics, peakHourLabel, dailyActivity, flagged: flagged || [], recent: (allQ || []).slice(0, 50), lastQuestion: allQ?.[0] || null };
  } catch (err) {
    console.error('Insights error:', err.message);
    return { totalQuestions: 0, weekQuestions: 0, timeSavedHours: 0, timeSavedMinutes: 0, timeSavedMins: 0, topTopics: [], peakHourLabel: null, dailyActivity: [], flagged: [], recent: [], lastQuestion: null };
  }
}

const ALLOWED_ORIGINS = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://scholr.study',
  'https://www.scholr.study',
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
]);
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no Origin header (curl, server-to-server, mobile apps)
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
    cb(new Error(`CORS blocked: ${origin}`));
  },
  // credentials: false on purpose. We auth with Bearer tokens in the
  // Authorization header, never with cookies. Setting credentials: true
  // triggers Safari ITP to flag the backend as a tracker and silently
  // block cross-origin requests.
}));
app.use(express.json());
app.use(fileUpload({ limits: { fileSize: 50 * 1024 * 1024 } }));

app.get('/join/:code', async (req, res) => {
  const { code } = req.params;
  let courseName = 'a class';
  try {
    let { data: course } = await supabase.from('courses').select('name').eq('join_code', code).single();
    if (!course) {
      const { data: byCode } = await supabase.from('courses').select('name').eq('code', code).single();
      course = byCode;
    }
    if (course) courseName = course.name;
  } catch {}
  res.send(`<!doctype html><html lang="en"><head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Join ${courseName} on Scholr</title>
  <meta property="og:title" content="Join ${courseName} on Scholr" />
  <meta property="og:description" content="Your professor invited you. Click to join your AI-powered course." />
  <meta property="og:image" content="https://scholr.study/preview.jpg" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="https://scholr.study/preview.jpg" />
  <script>window.location.href = "https://scholr.study/join/${code}"</script>
  </head><body>Redirecting...</body></html>`);
});

app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Professor Auth ────────────────────────────────────────────────────────────
app.post('/professor/signup', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    // Block emails already registered as a student so we never end up with a
    // user in both tables (which is what caused the wrong-portal bug).
    const { data: existingStudent } = await supabase.from('students').select('id').eq('email', email).maybeSingle();
    if (existingStudent) return res.status(400).json({ error: 'This email is already registered as a student. Use a different email or sign in as a student.' });
    const { data, error } = await supabaseAuth.auth.signUp({ email, password });
    if (error) return res.status(400).json({ error: error.message });
    await supabase.from('professors').upsert({ id: data.user.id, email, name: name || email.split('@')[0] }, { onConflict: 'id' });
    res.json({ success: true, user: { id: data.user.id, email, name } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/professor/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
    // Strict role enforcement — only allow if this user has a professor row.
    // Prevents a student account from being silently logged into the teacher portal.
    const { data: prof } = await supabase.from('professors').select('*').eq('id', data.user.id).maybeSingle();
    if (!prof) return res.status(403).json({ error: 'This email is not registered as a teacher. Try the student sign-in instead.' });
    res.json({ success: true, token: data.session.access_token, user: { id: data.user.id, email: data.user.email, name: prof.name || email.split('@')[0] } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/smart-login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
    const { data: prof } = await supabase.from('professors').select('*').eq('id', data.user.id).single();
    if (prof) return res.json({ success: true, role: 'professor', token: data.session.access_token, user: { id: data.user.id, email: data.user.email, name: prof.name || email.split('@')[0] } });
    const { data: student } = await supabase.from('students').select('*').eq('id', data.user.id).single();
    return res.json({ success: true, role: 'student', token: data.session.access_token, user: { id: data.user.id, email: data.user.email, name: student?.name || email.split('@')[0] } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Student Auth ──────────────────────────────────────────────────────────────
app.post('/student/signup', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    // Block emails already registered as a teacher so we never end up with a
    // user in both tables (which is what caused the wrong-portal bug).
    const { data: existingProf } = await supabase.from('professors').select('id').eq('email', email).maybeSingle();
    if (existingProf) return res.status(400).json({ error: 'This email is already registered as a teacher. Use a different email or sign in as a teacher.' });
    const { data, error } = await supabaseAuth.auth.signUp({ email, password });
    if (error) return res.status(400).json({ error: error.message });
    await supabase.from('students').upsert({ id: data.user.id, email, name: name || email.split('@')[0] }, { onConflict: 'id' });
    res.json({ success: true, user: { id: data.user.id, email, name } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/student/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const { data, error } = await supabaseAuth.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
    // Strict role enforcement — only allow if this user has a student row.
    // If they exist only as a professor, reject so they go to the teacher portal.
    const { data: student } = await supabase.from('students').select('*').eq('id', data.user.id).maybeSingle();
    if (!student) {
      const { data: prof } = await supabase.from('professors').select('id').eq('id', data.user.id).maybeSingle();
      if (prof) return res.status(403).json({ error: 'This email is registered as a teacher. Try the teacher sign-in instead.' });
      return res.status(403).json({ error: 'This email is not registered as a student. Sign up first.' });
    }
    res.json({ success: true, token: data.session.access_token, user: { id: data.user.id, email: data.user.email, name: student.name || data.user.email.split('@')[0] } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/student/auth/google', (req, res) => {
  const redirectTo = encodeURIComponent(`${process.env.FRONTEND_URL || 'https://scholr.study'}/auth/callback?role=student`);
  res.redirect(`${process.env.SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`);
});

app.get('/professor/auth/google', (req, res) => {
  const redirectTo = encodeURIComponent(`${process.env.FRONTEND_URL || 'https://scholr.study'}/auth/callback?role=professor`);
  res.redirect(`${process.env.SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`);
});

// After the Google redirect, the frontend has an access_token but the user's
// role row may not exist yet. This runs server-side with the service key so it
// can read/write across RLS — the frontend must NOT touch these tables directly
// (that would require professors/students to be world-writable).
//
// One Google account can be BOTH a student (of classes they join) and a teacher
// (of courses they run). Login is role-explicit, so we never block sign-in based
// on the other role — we just ensure the requested role's row exists and let
// them into that portal. (No more "you're already a teacher" alert for students.)
app.post('/auth/sync-oauth-user', async (req, res) => {
  const { access_token } = req.body;
  const role = req.body.role === 'professor' ? 'professor' : 'student';
  if (!access_token) return res.status(400).json({ error: 'access_token required' });
  try {
    const { data: { user } = {}, error: userErr } = await supabase.auth.getUser(access_token);
    if (userErr || !user) return res.status(401).json({ error: 'Invalid session' });
    const name = user.user_metadata?.full_name || user.email.split('@')[0];
    const targetTable = role === 'professor' ? 'professors' : 'students';
    const { error: upsertErr } = await supabase.from(targetTable).upsert(
      { id: user.id, email: user.email, name }, { onConflict: 'id' }
    );
    if (upsertErr) return res.status(500).json({ error: upsertErr.message });
    res.json({ user: { id: user.id, email: user.email, name } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Auth middleware ───────────────────────────────────────────────────────────
async function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data.user) return res.status(401).json({ error: 'Invalid token' });
    req.user = data.user;
    next();
  } catch { res.status(401).json({ error: 'Unauthorized' }); }
}

// User can access a course if they own it (professor) or are enrolled (student)
async function userCanAccessCourse(userId, courseId) {
  const { data: course } = await supabase
    .from('courses')
    .select('professor_id')
    .eq('id', courseId)
    .maybeSingle();
  if (!course) return false;
  if (course.professor_id === userId) return true;
  const { data: enrollment } = await supabase
    .from('enrollments')
    .select('course_id')
    .eq('course_id', courseId)
    .eq('student_id', userId)
    .maybeSingle();
  return !!enrollment;
}

async function requireCourseAccess(req, res, next) {
  const courseId = req.params.courseId;
  if (!courseId) return res.status(400).json({ error: 'Missing courseId' });
  const allowed = await userCanAccessCourse(req.user.id, courseId);
  if (!allowed) return res.status(403).json({ error: 'Not enrolled in this course' });
  next();
}

// Teacher actions (create a course, etc.) require an actual professors row, so a
// student token can never reach the teacher side via the API.
async function requireProfessor(req, res, next) {
  const { data: prof } = await supabase.from('professors').select('id').eq('id', req.user.id).maybeSingle();
  if (!prof) return res.status(403).json({ error: 'Teacher access required' });
  next();
}

// The requester must OWN this course (be its professor). Used for teacher-only
// course actions like insights/analytics — unlike requireCourseAccess, an
// enrolled student is rejected.
async function requireCourseOwner(req, res, next) {
  const courseId = req.params.courseId || req.params.id;
  if (!courseId) return res.status(400).json({ error: 'Missing courseId' });
  const { data: course } = await supabase.from('courses').select('professor_id').eq('id', courseId).maybeSingle();
  if (!course || course.professor_id !== req.user.id) return res.status(403).json({ error: 'Not your course' });
  next();
}

// ── Student routes ────────────────────────────────────────────────────────────
app.get('/student/courses', requireAuth, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('enrollments')
      .select('course_id, joined_at, courses(id, name, code, join_code, professor_id, cover_image, professors(name))')
      .eq('student_id', req.user.id)
      .order('joined_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json((data || []).map(e => ({
      id: e.courses.id, name: e.courses.name, code: e.courses.code,
      cover_image: e.courses.cover_image || null, join_code: e.courses.join_code,
      professor_name: e.courses.professors?.name || 'Instructor', joined_at: e.joined_at,
    })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/student/enroll', requireAuth, async (req, res) => {
  const { course_id } = req.body;
  if (!course_id) return res.status(400).json({ error: 'course_id required' });
  try {
    await supabase.from('students').upsert({ id: req.user.id, email: req.user.email, name: req.user.email.split('@')[0] }, { onConflict: 'id' });
    const { error } = await supabase.from('enrollments').insert({ student_id: req.user.id, course_id });
    if (error) {
      if (error.code === '23505') return res.json({ success: true, already_enrolled: true });
      // 42501 = RLS policy violation. This only happens when the backend is
      // configured with a non-service key — surface a clean message to the
      // student and a loud hint in the logs instead of leaking Postgres errors.
      if (error.code === '42501') {
        console.error('❌ Enrollment blocked by RLS — backend is not using the Supabase SECRET (service_role) key. Fix SUPABASE_SECRET_KEY.');
        return res.status(500).json({ error: "Couldn't join the course — please try again in a moment." });
      }
      return res.status(500).json({ error: error.message });
    }
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/course/join/:code', async (req, res) => {
  const { code } = req.params;
  try {
    let { data: course } = await supabase.from('courses').select('id, name, code, join_code').eq('join_code', code.toUpperCase()).single();
    if (!course) {
      const { data: byCode } = await supabase.from('courses').select('id, name, code, join_code').eq('code', code.toUpperCase()).single();
      course = byCode;
    }
    if (!course) return res.status(404).json({ error: 'Course not found' });
    res.json(course);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ── Professor Courses ─────────────────────────────────────────────────────────
app.get('/professor/courses', requireAuth, requireProfessor, async (req, res) => {
  const { data } = await supabase.from('courses').select('*').eq('professor_id', req.user.id).order('created_at', { ascending: false });
  res.json(data || []);
});

app.post('/professor/courses', requireAuth, requireProfessor, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Course name required' });
  const code = generateJoinCode(name);
  const { data, error } = await supabase.from('courses').insert({ professor_id: req.user.id, name, code, join_code: code }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.delete('/professor/courses/:id', requireAuth, async (req, res) => {
  const { id } = req.params;
  const { data: course } = await supabase.from('courses').select('*').eq('id', id).eq('professor_id', req.user.id).single();
  if (!course) return res.status(404).json({ error: 'Course not found' });

  // Fetch all documents for this course BEFORE the cascade wipes the rows,
  // so we know which blobs to clean up in Supabase Storage and GCS. The
  // database cascade handles document_chunks, enrollments, chats, quizzes,
  // tests, flashcard_decks, etc. — but storage buckets are external and
  // would otherwise orphan.
  const { data: docs } = await supabase
    .from('documents')
    .select('name, storage_path, gemini_uri')
    .eq('course_id', id);

  if (docs && docs.length > 0) {
    // Supabase Storage — batch delete every PDF blob for this course.
    const paths = docs.map(d => d.storage_path).filter(Boolean);
    if (paths.length > 0) {
      const { error } = await supabase.storage.from('documents').remove(paths);
      if (error) console.error('Course delete — Supabase Storage cleanup:', error.message);
    }
    // GCS — delete the gs:// copies in parallel.
    await Promise.all(docs.map(d => d.gemini_uri ? deleteFromGCS(d.gemini_uri) : Promise.resolve()));
  }

  await supabase.from('courses').delete().eq('id', id);
  delete courseDocuments[id];
  delete geminiUriCache[id];
  console.log(`🗑️  Course ${id} deleted — cleaned up ${docs?.length || 0} document blob(s)`);
  res.json({ success: true });
});

// Walk Supabase Storage AND GCS for blobs belonging to courses that no
// longer exist in the database, and delete them. Safe to run repeatedly —
// only touches blobs that can't possibly match any live course.
async function sweepOrphanBlobs() {
  const { data: courses } = await supabase.from('courses').select('id');
  const liveIds = new Set((courses || []).map(c => c.id));
  const report = { liveCourses: liveIds.size, supabase: [], gcs: [] };

  // ── Supabase Storage sweep ──
  // The `documents` bucket is structured as <courseId>/<filename>. List
  // the top-level folders, drop any whose name isn't in liveIds,
  // recursively delete their contents.
  try {
    const { data: folders } = await supabase.storage.from('documents').list('', { limit: 1000 });
    for (const folder of folders || []) {
      if (folder.id) continue; // skip files at root
      const courseId = folder.name;
      if (liveIds.has(courseId)) continue;
      const { data: files } = await supabase.storage.from('documents').list(courseId, { limit: 1000 });
      const paths = (files || []).map(f => `${courseId}/${f.name}`);
      if (paths.length > 0) {
        const { error } = await supabase.storage.from('documents').remove(paths);
        if (error) console.error(`Sweep — Supabase delete failed for ${courseId}:`, error.message);
        else report.supabase.push({ courseId, files: paths.length });
      }
    }
  } catch (e) {
    console.error('Supabase orphan sweep error:', e.message);
  }

  // ── GCS sweep ──
  // Objects live at courses/<courseId>/<filename>. Group by course_id,
  // delete groups with no matching live course.
  if (gcs) {
    try {
      const [files] = await gcs.bucket(GCS_BUCKET).getFiles({ prefix: 'courses/' });
      const orphansByCourse = new Map();
      for (const file of files) {
        const parts = file.name.split('/');
        if (parts.length < 3) continue;
        const courseId = parts[1];
        if (liveIds.has(courseId)) continue;
        if (!orphansByCourse.has(courseId)) orphansByCourse.set(courseId, []);
        orphansByCourse.get(courseId).push(file);
      }
      for (const [courseId, orphanFiles] of orphansByCourse.entries()) {
        await Promise.all(orphanFiles.map(f => f.delete({ ignoreNotFound: true }).catch(e => console.error(`GCS delete ${f.name}:`, e.message))));
        report.gcs.push({ courseId, files: orphanFiles.length });
      }
    } catch (e) {
      console.error('GCS orphan sweep error:', e.message);
    }
  }

  const totalCleaned = report.supabase.reduce((a, x) => a + x.files, 0) + report.gcs.reduce((a, x) => a + x.files, 0);
  if (totalCleaned > 0) {
    console.log(`🧹 Orphan sweep — cleaned ${totalCleaned} blob(s) across ${report.supabase.length + report.gcs.length} dead course(s)`);
  } else {
    console.log('🧹 Orphan sweep — nothing to clean');
  }
  return { totalCleaned, ...report };
}

// Manual endpoint (kept as an escape hatch — the automatic boot-time sweep
// below is the primary path).
app.post('/admin/cleanup-orphans', requireAuth, async (req, res) => {
  const report = await sweepOrphanBlobs();
  res.json({ success: true, ...report });
});

app.get('/course/:idOrCode', async (req, res) => {
  const { idOrCode } = req.params;
  let { data: course } = await supabase.from('courses').select('id, name, code, join_code').eq('id', idOrCode).single();
  if (!course) {
    const { data: byCode } = await supabase.from('courses').select('id, name, code, join_code').eq('code', idOrCode.toUpperCase()).single();
    course = byCode;
  }
  if (!course) return res.status(404).json({ error: 'Course not found' });
  res.json(course);
});

// ── Upload per course — now also uploads to Gemini ────────────────────────────
app.post('/course/:courseId/upload', requireAuth, async (req, res) => {
  const { courseId } = req.params;
  const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).eq('professor_id', req.user.id).single();
  if (!course) return res.status(403).json({ error: 'Not your course' });

  const file = req.files?.file || req.files?.pdf;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  const mimeType = getMimeType(file.name);
  if (!mimeType) return res.status(400).json({ error: 'Unsupported file type.' });

  const buffer = Buffer.from(file.data);
  const sizeKb = Math.round(buffer.length / 1024);
  const storagePath = `${courseId}/${file.name}`;

  // 1. Upload to Supabase Storage (canonical durable copy)
  const { error: uploadError } = await supabase.storage.from('documents').upload(storagePath, buffer, { contentType: mimeType, upsert: true });
  if (uploadError) return res.status(500).json({ error: 'Storage upload failed: ' + uploadError.message });

  // 2. Upload to GCS so Vertex AI can read it by gs:// URI on every chat
  //    (no more 10MB+ base64 in every chat request)
  const gcsUri = await uploadToGCS(buffer, mimeType, courseGcsPath(courseId, file.name));

  // 3. Save to documents table
  const farFuture = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString();
  const { error: dbError } = await supabase.from('documents').upsert({
    name: file.name, course_id: courseId, size_kb: sizeKb, mime_type: mimeType,
    storage_path: storagePath, uploaded_at: new Date().toISOString(),
    gemini_uri: gcsUri || null,
    gemini_uri_expires_at: gcsUri ? farFuture : null,
  }, { onConflict: 'name,course_id' });
  if (dbError) console.error('DB insert error:', dbError.message);

  // 4. Warm in-memory caches
  getCourseDocuments(courseId)[file.name] = { buffer, sizeKb, mimeType, uploadedAt: new Date().toISOString() };
  if (gcsUri) {
    getGeminiUriCache(courseId)[file.name] = { uri: gcsUri };
  }
  questionsCaches[courseId] = null;

  console.log(`✅ Uploaded: ${storagePath} — ${sizeKb}kb${gcsUri ? ' + GCS URI cached' : ' (GCS upload failed, will fall back to inline)'}`);
  res.json({ success: true, fileName: file.name, sizeKb, mimeType });

  // 5. Chunk + embed in the background so future student questions retrieve
  //    just the relevant slices instead of re-reading the whole library. The
  //    professor's upload response is already sent — this runs without
  //    blocking.
  if (mimeType === 'application/pdf') {
    chunkAndEmbedPdf(courseId, file.name, buffer)
      .then(r => {
        if (r.ok) console.log(`📚 Indexed ${file.name} — ${r.textChunks} text + ${r.visualChunks} visual chunks across ${r.pages} pages`);
        else console.warn(`📚 Index skipped for ${file.name}: ${r.error}`);
      })
      .catch(e => console.error(`📚 Index error for ${file.name}:`, e.message));
  }
});

app.get('/course/:courseId/documents', requireAuth, requireCourseAccess, async (req, res) => {
  const { courseId } = req.params;
  const { data } = await supabase.from('documents').select('*').eq('course_id', courseId).order('uploaded_at', { ascending: false });
  res.json((data || []).map(d => ({ name: d.name, sizeKb: d.size_kb, mimeType: d.mime_type, uploadedAt: d.uploaded_at })));
});

// ── Delete document — also deletes from Gemini ────────────────────────────────
app.delete('/course/:courseId/document/:name', requireAuth, async (req, res) => {
  const { courseId, name } = req.params;
  const filename = decodeURIComponent(name);
  const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).eq('professor_id', req.user.id).single();
  if (!course) return res.status(403).json({ error: 'Not your course' });

  // 1. Get the Gemini URI before deleting from DB
  const { data: dbDoc } = await supabase.from('documents').select('gemini_uri').eq('course_id', courseId).eq('name', filename).single();

  // 2. Delete from Supabase Storage
  const storagePath = `${courseId}/${filename}`;
  const { error: storageError } = await supabase.storage.from('documents').remove([storagePath]);
  if (storageError) console.error('Storage delete error:', storageError.message);

  // 3. Delete from DB
  await supabase.from('documents').delete().eq('course_id', courseId).eq('name', filename);

  // 4. Delete chunks for this document so retrieval doesn't surface
  //    stale excerpts from a file the professor removed.
  await supabase.from('document_chunks').delete().eq('course_id', courseId).eq('doc_name', filename);

  // 5. Delete from Gemini File API
  if (dbDoc?.gemini_uri) await deleteFromGCS(dbDoc.gemini_uri);

  // 6. Clear in-memory caches
  if (courseDocuments[courseId]) delete courseDocuments[courseId][filename];
  if (geminiUriCache[courseId]) delete geminiUriCache[courseId][filename];
  questionsCaches[courseId] = null;

  console.log(`✅ Deleted: ${storagePath}`);
  res.json({ success: true });
});

app.get('/course/:courseId/insights', requireAuth, requireCourseOwner, async (req, res) => {
  res.json(await getCourseInsights(req.params.courseId));
});

// Owner-only — wipes all logged questions for this course so the professor
// can reset analytics before sharing with real students. Does not touch
// student chat history or course materials, only the questions table that
// powers Insights.
app.delete('/course/:courseId/insights-data', requireAuth, async (req, res) => {
  const { courseId } = req.params;
  const { data: course } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('professor_id', req.user.id)
    .maybeSingle();
  if (!course) return res.status(403).json({ error: 'Only the course owner can clear insights data' });
  const { error } = await supabase.from('questions').delete().eq('course_id', courseId);
  if (error) return res.status(500).json({ error: error.message });
  delete aiSummaryCache[courseId];
  console.log(`✅ Cleared insights data for course ${courseId}`);
  res.json({ success: true });
});

// ── AI summary ───────────────────────────────────────────────────────────────
// Generates a short 2-3 sentence professor-facing summary of what students
// have been asking about. Cached per course for 5 minutes so we don't spam
// Gemini if a professor sits on the page.
const aiSummaryCache = {};  // { courseId: { summary, generatedAt, totalAtGeneration } }

app.get('/course/:courseId/ai-summary', requireAuth, requireCourseOwner, async (req, res) => {
  const { courseId } = req.params;
  const insights = await getCourseInsights(courseId);
  if (!insights.totalQuestions) {
    return res.json({ summary: null, generatedAt: null });
  }

  // Serve cached summary if fresh AND no new questions arrived since last gen
  const cached = aiSummaryCache[courseId];
  const fiveMinAgo = Date.now() - 5 * 60 * 1000;
  if (cached && new Date(cached.generatedAt).getTime() > fiveMinAgo && cached.totalAtGeneration === insights.totalQuestions) {
    return res.json({ summary: cached.summary, generatedAt: cached.generatedAt, cached: true });
  }

  try {
    const recentQs = (insights.recent || []).slice(0, 30).map(q => `- ${q.question}${q.confident === false ? ' [unanswered confidently]' : ''}`).join('\n');
    const topTopics = (insights.topTopics || []).map(t => `${t.topic} (${t.count})`).join(', ') || 'none yet';
    const prompt = `You are an academic-insights assistant for a college professor. Based on what their students have been asking the course AI tutor, write a brief 2-3 sentence summary for the professor.

Be specific, conversational, and actionable. Mention what students are asking about most, any clear pattern (confusion, common topics), and one practical suggestion for the professor if obvious. Don't repeat the raw numbers — they already see the stat cards. Don't use lists. Just plain prose.

STATS:
- ${insights.totalQuestions} total questions, ${insights.weekQuestions} this week
- Top topics: ${topTopics}
- ${insights.flagged?.length || 0} questions the AI couldn't answer confidently
${insights.peakHourLabel ? `- Peak study time: ${insights.peakHourLabel}` : ''}

RECENT STUDENT QUESTIONS:
${recentQs}

Write the summary now in 2-3 sentences, no preamble, no headers.`;

    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      // gemini-2.5-flash spends tokens on internal reasoning before output;
      // 600 was getting truncated mid-sentence. 2048 gives ample headroom.
      config: { temperature: 0.4, maxOutputTokens: 2048 },
    });
    const summary = (result.text || '').trim();
    const generatedAt = new Date().toISOString();
    aiSummaryCache[courseId] = { summary, generatedAt, totalAtGeneration: insights.totalQuestions };
    res.json({ summary, generatedAt, cached: false });
  } catch (err) {
    console.error('ai-summary error:', err.message);
    res.status(500).json({ error: 'Could not generate summary' });
  }
});

const FALLBACK_QUESTIONS = [
  "What are the main topics in this course?",
  "Summarize the key concepts",
  "What should I focus on for the exam?",
];

function parseSuggestedQuestions(raw) {
  if (!raw) return [];
  const text = raw.trim();
  // 1. Try parsing a JSON array (may be wrapped in markdown code fences)
  const arrayMatch = text.match(/\[[\s\S]*?\]/);
  if (arrayMatch) {
    try {
      const parsed = JSON.parse(arrayMatch[0]);
      if (Array.isArray(parsed)) {
        const cleaned = parsed.map(q => String(q).trim()).filter(q => q.length >= 5 && q.length <= 120);
        if (cleaned.length) return cleaned.slice(0, 3);
      }
    } catch {}
  }
  // 2. Fall back to any quoted strings of reasonable length
  const quoted = text.match(/"([^"]{5,120})"/g);
  if (quoted) {
    const out = quoted.map(s => s.replace(/^"|"$/g, '').trim()).filter(Boolean);
    if (out.length) return out.slice(0, 3);
  }
  // 3. Last resort: any lines ending with ? that look like questions
  const lines = text.split('\n')
    .map(l => l.replace(/^[-*\d.\s]+/, '').replace(/^["']|["']$/g, '').trim())
    .filter(l => l.length >= 5 && l.length <= 120 && l.endsWith('?'));
  return lines.slice(0, 3);
}

app.get('/course/:courseId/suggested-questions', requireAuth, requireCourseAccess, async (req, res) => {
  const { courseId } = req.params;
  const docs = getCourseDocuments(courseId);
  if (Object.keys(docs).length === 0) return res.json({ questions: [] });
  if (questionsCaches[courseId]) return res.json({ questions: questionsCaches[courseId] });
  try {
    const pdfs = Object.entries(docs).filter(([, doc]) => doc.mimeType === 'application/pdf').slice(0, 5);
    if (pdfs.length === 0) return res.json({ questions: FALLBACK_QUESTIONS });

    // Build a multi-part request. Prefer gs:// URIs (no inline upload cost);
    // fall back to inline base64 only if GCS isn't ready yet.
    const uris = await Promise.all(pdfs.map(([name, doc]) => getGeminiUri(courseId, name, doc)));
    const parts = [];
    pdfs.forEach(([name, doc], i) => {
      const uri = uris[i];
      if (uri) parts.push({ fileData: { mimeType: 'application/pdf', fileUri: uri } });
      else parts.push({ inlineData: { mimeType: 'application/pdf', data: doc.buffer.toString('base64') } });
      parts.push({ text: `[Course document: ${name}]` });
    });
    parts.push({ text: `Read ALL of the course documents above. Write exactly 3 short student questions a student would realistically ask about this course. Draw from across the materials — do not focus on just one document. Each question must be 4-12 words and end with a question mark.

Output ONLY a JSON array, nothing else, no markdown, no commentary. Example:
["When is the midterm?","How is participation graded?","What chapters cover the Bohr model?"]` });

    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts }],
      // gemini-2.5-flash burns tokens on internal reasoning before output —
      // 512 wasn't enough to finish 3 questions, so give it room.
      config: { temperature: 0.5, maxOutputTokens: 2048 },
    });

    const parsed = parseSuggestedQuestions(result.text);
    const final = parsed.length >= 3 ? parsed.slice(0, 3) : [...parsed, ...FALLBACK_QUESTIONS].slice(0, 3);
    questionsCaches[courseId] = final;
    res.json({ questions: final });
  } catch (err) {
    console.error('suggested-questions error:', err.message);
    res.json({ questions: FALLBACK_QUESTIONS });
  }
});

// ── Chat — uses Gemini URIs instead of re-uploading PDFs ─────────────────────
app.post('/course/:courseId/chat', requireAuth, requireCourseAccess, async (req, res) => {
  const { courseId } = req.params;
  const message = req.body?.message;
  const history = req.body?.history || [];

  if (!message) return res.status(400).json({ error: 'No message provided' });
  const docs = getCourseDocuments(courseId);
  if (Object.keys(docs).length === 0) return res.status(400).json({ error: 'No documents uploaded yet' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Track the connection so we can stop writing the moment the student
  // closes their tab. Without this, the for-await loop below keeps reading
  // Gemini chunks into a dead socket and the @google/genai SDK throws
  // "Incomplete JSON segment at the end" trying to parse the truncated
  // tail — which we then accidentally surface to the next student as an
  // error. This bug is exactly what blew up the 10:52 chat in your logs.
  let clientGone = false;
  req.on('close', () => { clientGone = true; });
  req.on('aborted', () => { clientGone = true; });

  // Safe writer — silently no-ops once the client has disappeared, so we
  // never trigger an EPIPE/ECONNRESET trying to write to a closed socket.
  const safeWrite = (payload) => {
    if (clientGone || res.writableEnded) return false;
    try { res.write(payload); return true; }
    catch { clientGone = true; return false; }
  };
  const safeEnd = () => {
    if (!res.writableEnded) {
      try { res.end(); } catch {}
    }
  };

  const sendStatus = (step, extra = {}) =>
    safeWrite(`data: ${JSON.stringify({ type: 'status', step, ...extra })}\n\n`);

  sendStatus('searching');

  // RAG: retrieve the most relevant chunks for THIS question instead of
  // sending the whole PDF library every turn. If no chunks are stored yet
  // (course uploaded before RAG existed), fall back to the old whole-library
  // flow so nothing breaks.
  const docParts = [];
  let docNames = [];
  // Retrieve 8 chunks (bumped from 6) so the model sees more potentially-
  // relevant context — particularly helpful when the question crosses
  // topics and the right answer lives across the syllabus + a content PDF.
  const retrievedChunks = await searchChunks(courseId, message, 8);

  if (retrievedChunks.length > 0) {
    const uniqueDocs = [...new Set(retrievedChunks.map(c => c.doc_name))];
    sendStatus('found', { sources: uniqueDocs });
    docNames = uniqueDocs;
    const contextText = retrievedChunks
      .map(c => `[Source: ${c.doc_name}${c.page_number ? ` · p.${c.page_number}` : ''}]\n${c.chunk_text}`)
      .join('\n\n---\n\n');
    docParts.push({ text: `COURSE MATERIALS — RELEVANT EXCERPTS:\n\n${contextText}\n\n---\n\n` });
  } else {
    // Fallback path — same as before, send everything. Triggers for courses
    // uploaded before RAG was added, or while embeddings are still indexing.
    sendStatus('reading');
    // Kick off background indexing for this course so the NEXT question is
    // fast — fire-and-forget, don't await.
    ensureCourseIndexed(courseId).catch(e => console.error('Auto-index trigger:', e.message));
    docNames = Object.keys(docs);
    const docEntries = Object.entries(docs);
    const docUris = await Promise.all(docEntries.map(([name, doc]) => getGeminiUri(courseId, name, doc)));
    docEntries.forEach(([name, doc], i) => {
      const uri = docUris[i];
      if (uri) docParts.push({ fileData: { mimeType: doc.mimeType, fileUri: uri } });
      else docParts.push({ inlineData: { mimeType: doc.mimeType, data: doc.buffer.toString('base64') } });
      docParts.push({ text: isImage(doc.mimeType) ? `[Professor image: ${name}]` : `[Professor document: ${name}]` });
    });
  }

  // Student notes (ephemeral attachments + persistent My Notes) always go
  // inline — they're per-student so caching doesn't apply.
  if (req.files) {
    Object.entries(req.files).forEach(([key, file]) => {
      if (key.startsWith('note_')) {
        const buf = Buffer.from(file.data);
        const mime = getMimeType(file.name) || 'application/pdf';
        docParts.push({ inlineData: { mimeType: mime, data: buf.toString('base64') } });
        docParts.push({ text: isImage(mime) ? `[Student image: ${file.name}]` : `[Student note: ${file.name}]` });
        docNames.push(file.name);
      }
    });
  }

  // Flatten docParts into a single text context block for OpenAI. The RAG
  // path produces only text parts. Fallback path (no chunks indexed yet) and
  // student-attached notes may include PDFs/images — extract PDF text inline
  // so the model sees something useful, and skip raw image bytes for now.
  // Vision support can be added later by switching to a content array.
  const contextChunks = [];
  for (const part of docParts) {
    if (part.text) {
      contextChunks.push(part.text);
    } else if (part.inlineData?.mimeType === 'application/pdf') {
      const extracted = await extractPdfText(Buffer.from(part.inlineData.data, 'base64'));
      if (extracted?.text) contextChunks.push(extracted.text.slice(0, 50000));
    }
    // fileData (Gemini URIs) and images are silently dropped in this branch.
    // RAG covers the PDF case; image support can be added later via vision.
  }
  const contextBlock = contextChunks.join('\n');

  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
  if (history.length === 0) {
    messages.push({ role: 'user', content: `${contextBlock}\nSTUDENT QUESTION: ${message}` });
  } else {
    messages.push({ role: 'user', content: `${contextBlock}\nSTUDENT QUESTION: ${history[0].content}` });
    for (let i = 1; i < history.length; i++) {
      const msg = history[i];
      const content = msg.role === 'assistant' ? msg.content.replace(/\nSOURCES:.*$/m, '').trim() : msg.content;
      messages.push({ role: msg.role === 'assistant' ? 'assistant' : 'user', content });
    }
    messages.push({ role: 'user', content: `STUDENT QUESTION: ${message}` });
  }

  sendStatus('writing');
  safeWrite(`data: ${JSON.stringify({ type: 'citations', citations: [] })}\n\n`);

  let rawText = '';
  let streamCutOff = false;
  try {
    const stream = await openai.chat.completions.create({
      model: MODEL_CHAT,
      messages,
      temperature: 0.3,
      max_tokens: 2048,
      stream: true,
    });

    // ── COLLECT first, STREAM cleaned ──
    // We buffer the full response on the server, run rewriteEquations as a
    // safety net, then stream the cleaned text as tokens. Every client
    // receives already-clean tokens regardless of browser bundle freshness.
    try {
      for await (const chunk of stream) {
        if (clientGone) break;
        const token = chunk.choices?.[0]?.delta?.content;
        if (token) rawText += token;
      }
    } catch (streamErr) {
      streamCutOff = true;
      console.warn(`Stream interrupted (${streamErr.message}) — partial answer length ${rawText.length}`);
      if (rawText.length < 20) throw streamErr;
    }

    if (clientGone) { safeEnd(); return; }

    // Apply the math-rescue rewrite. Wrapped in try/catch so any unexpected
    // edge case in the regex doesn't take down the response — we'd fall
    // back to streaming the raw text, which at least gets a (broken-looking
    // but readable) answer to the student.
    let fullText;
    try {
      fullText = rewriteEquations(rawText);
      if (fullText !== rawText) {
        console.log(`🧹 Rewrite v5 applied to chat response (${rawText.length} → ${fullText.length} chars)`);
      } else {
        console.log(`🧹 Rewrite v5 no-op for chat response (${rawText.length} chars)`);
        // If the no-op surfaces but the text actually contains LaTeX, dump
        // the relevant line so we can see the EXACT bytes the regex is
        // failing to match against.
        if (/\\(?:text|frac|sum)/.test(rawText)) {
          const offendingLine = rawText.split('\n').find(l => /\\(?:text|frac|sum)/.test(l)) || '';
          const chars = offendingLine.slice(0, 200).split('').map(c => {
            const code = c.charCodeAt(0);
            if (c === '\\') return '\\\\';
            if (c === '\n') return '\\n';
            if (code < 32 || code > 126) return `\\u${code.toString(16).padStart(4, '0')}`;
            return c;
          }).join('');
          console.log(`📝 OFFENDING LINE BYTES: ${chars}`);
        }
      }
    } catch (e) {
      console.error(`Rewrite threw — falling back to raw text: ${e.message}`);
      fullText = rawText;
    }

    // Now stream the cleaned text in chunks so it still feels like
    // streaming on the client even though we held the response until
    // Gemini finished. ~80 chars per chunk with 12ms gaps feels natural.
    const CHUNK = 80;
    for (let i = 0; i < fullText.length; i += CHUNK) {
      if (clientGone) break;
      const tokenChunk = fullText.slice(i, i + CHUNK);
      if (!safeWrite(`data: ${JSON.stringify({ type: 'token', token: tokenChunk })}\n\n`)) break;
      if (i + CHUNK < fullText.length) {
        await new Promise(r => setTimeout(r, 12));
      }
    }

    if (clientGone) { safeEnd(); return; }

    // Source attribution comes from what we ACTUALLY retrieved, not from
    // the AI's self-reported SOURCES line.
    const sources = docNames;
    const confident = !fullText.toLowerCase().includes("doesn't appear to be in any of your uploaded");

    try {
      await supabase.from('questions').insert({ course_id: courseId, question: message, confident });
    } catch (e) { console.warn('Question log failed:', e.message); }

    safeWrite(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);
    safeWrite(`data: ${JSON.stringify({ type: 'done', truncated: streamCutOff })}\n\n`);
    safeEnd();
  } catch (err) {
    console.error(`Chat error: ${err.message} (course ${courseId}, partial ${rawText.length} chars)`);
    if (clientGone) { safeEnd(); return; }
    safeWrite(`data: ${JSON.stringify({ type: 'error', error: 'Lost the thread answering that — try again.' })}\n\n`);
    safeEnd();
  }
});

// One-shot backfill: chunk + embed every PDF already uploaded to a course.
// Use this once after running the SQL migration to bring existing courses
// online without re-uploading.
app.post('/course/:courseId/reindex', requireAuth, async (req, res) => {
  const { courseId } = req.params;
  const { data: course } = await supabase.from('courses').select('id').eq('id', courseId).eq('professor_id', req.user.id).single();
  if (!course) return res.status(403).json({ error: 'Not your course' });

  const docs = getCourseDocuments(courseId);
  const results = [];
  for (const [name, doc] of Object.entries(docs)) {
    if (doc.mimeType !== 'application/pdf') { results.push({ name, skipped: 'not a PDF' }); continue; }
    const r = await chunkAndEmbedPdf(courseId, name, doc.buffer);
    results.push({ name, ...r });
    console.log(`📚 Reindexed ${name}: ${r.ok ? `${r.count} chunks` : `failed (${r.error})`}`);
  }
  res.json({ success: true, results });
});

// ── Student Notes ─────────────────────────────────────────────────────────────
app.post('/student/notes/:courseId/upload', requireAuth, async (req, res) => {
  const { courseId } = req.params;
  const file = req.files?.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  const mimeType = getMimeType(file.name);
  if (!mimeType) return res.status(400).json({ error: 'Unsupported file type' });
  const buffer = Buffer.from(file.data);
  const sizeKb = Math.round(buffer.length / 1024);
  const storagePath = `student_notes/${req.user.id}/${courseId}/${file.name}`;
  const { error: uploadError } = await supabase.storage.from('documents').upload(storagePath, buffer, { contentType: mimeType, upsert: true });
  if (uploadError) return res.status(500).json({ error: 'Upload failed: ' + uploadError.message });
  await supabase.from('student_notes').upsert(
    { student_id: req.user.id, course_id: courseId, name: file.name, size_kb: sizeKb, mime_type: mimeType, storage_path: storagePath },
    { onConflict: 'student_id,course_id,name' }
  );
  res.json({ success: true, fileName: file.name, sizeKb, mimeType });
});

app.get('/student/notes/:courseId', requireAuth, async (req, res) => {
  const { courseId } = req.params;
  const { data } = await supabase.from('student_notes').select('*').eq('student_id', req.user.id).eq('course_id', courseId).order('uploaded_at', { ascending: false });
  res.json(data || []);
});

app.delete('/student/notes/:courseId/:name', requireAuth, async (req, res) => {
  const { courseId, name } = req.params;
  const filename = decodeURIComponent(name);
  const storagePath = `student_notes/${req.user.id}/${courseId}/${filename}`;
  await supabase.storage.from('documents').remove([storagePath]);
  await supabase.from('student_notes').delete().eq('student_id', req.user.id).eq('course_id', courseId).eq('name', filename);
  res.json({ success: true });
});

app.get('/student/notes/:courseId/file/:name', requireAuth, async (req, res) => {
  const { courseId, name } = req.params;
  const storagePath = `student_notes/${req.user.id}/${courseId}/${decodeURIComponent(name)}`;
  const { data, error } = await supabase.storage.from('documents').download(storagePath);
  if (error) return res.status(404).json({ error: 'File not found' });
  const buffer = Buffer.from(await data.arrayBuffer());
  res.set('Content-Type', req.query.mimeType || 'application/octet-stream');
  res.send(buffer);
});

// ── Chat History ──────────────────────────────────────────────────────────────
app.get('/student/chats/:courseId', requireAuth, async (req, res) => {
  const { courseId } = req.params;
  try {
    const { data: chats, error: chatsError } = await supabase
      .from('chats')
      .select('id, title, created_at, updated_at')
      .eq('student_id', req.user.id)
      .eq('course_id', courseId)
      .order('updated_at', { ascending: false });
    if (chatsError) return res.status(500).json({ error: chatsError.message });
    if (!chats || chats.length === 0) return res.json([]);

    const chatIds = chats.map(c => c.id);
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('id, chat_id, role, content, sources, created_at')
      .in('chat_id', chatIds)
      .order('created_at', { ascending: true });
    if (messagesError) return res.json(chats.map(c => ({ ...c, messages: [] })));

    const messagesByChat = {};
    for (const msg of (messages || [])) {
      if (!messagesByChat[msg.chat_id]) messagesByChat[msg.chat_id] = [];
      messagesByChat[msg.chat_id].push(msg);
    }
    res.json(chats.map(c => ({ ...c, messages: messagesByChat[c.id] || [] })));
  } catch (err) {
    console.error('GET chats crash:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/student/chats/:courseId', requireAuth, async (req, res) => {
  const { courseId } = req.params;
  const { title } = req.body;
  try {
    const { data, error } = await supabase.from('chats').insert({ student_id: req.user.id, course_id: courseId, title: title || 'New Chat' }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.patch('/student/chats/:chatId', requireAuth, async (req, res) => {
  const { chatId } = req.params;
  const { title } = req.body;
  const { error } = await supabase.from('chats').update({ title, updated_at: new Date().toISOString() }).eq('id', chatId).eq('student_id', req.user.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.delete('/student/chats/:chatId', requireAuth, async (req, res) => {
  const { chatId } = req.params;
  await supabase.from('chats').delete().eq('id', chatId).eq('student_id', req.user.id);
  res.json({ success: true });
});

app.post('/student/chats/:chatId/messages', requireAuth, async (req, res) => {
  const { chatId } = req.params;
  const { role, content, sources } = req.body;
  const { data, error } = await supabase.from('messages').insert({ chat_id: chatId, role, content, sources: sources || [] }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  await supabase.from('chats').update({ updated_at: new Date().toISOString() }).eq('id', chatId).eq('student_id', req.user.id);
  res.json(data);
});

// Course cover is now a chosen pattern (0–8), not an uploaded photo. Stored in
// cover_image as "pattern:N" so it flows through to the student side unchanged.
app.post('/professor/courses/:courseId/cover', requireAuth, async (req, res) => {
  const { courseId } = req.params;
  const { data: course } = await supabase.from('courses').select('id').eq('id', courseId).eq('professor_id', req.user.id).single();
  if (!course) return res.status(403).json({ error: 'Not your course' });
  const patternId = parseInt(req.body?.patternId, 10);
  if (!(patternId >= 0 && patternId <= 8)) return res.status(400).json({ error: 'Invalid pattern (0–8)' });
  const cover = `pattern:${patternId}`;
  const { error } = await supabase.from('courses').update({ cover_image: cover }).eq('id', courseId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, coverImage: cover });
});

app.post('/course/:courseId/quiz', requireAuth, requireCourseAccess, async (req, res) => {
  const { courseId } = req.params;
  const { topic } = req.body;
  const docs = getCourseDocuments(courseId);
  if (Object.keys(docs).length === 0) return res.status(400).json({ error: 'No documents uploaded yet' });

  const docEntries = Object.entries(docs);
  const docUris = await Promise.all(docEntries.map(([name, doc]) => getGeminiUri(courseId, name, doc)));
  const docParts = [];
  docEntries.forEach(([name, doc], i) => {
    const uri = docUris[i];
    if (uri) {
      docParts.push({ fileData: { mimeType: doc.mimeType, fileUri: uri } });
    } else {
      docParts.push({ inlineData: { mimeType: doc.mimeType, data: doc.buffer.toString('base64') } });
    }
    docParts.push({ text: `[Document: ${name}]` });
  });

  const prompt = `Read these course documents and generate 5 multiple choice quiz questions${topic ? ` about: ${topic}` : ''}.

For each question, write it in this EXACT format with no variations:
QUESTION: [question text]
A: [option a]
B: [option b]
C: [option c]
D: [option d]
CORRECT: [A or B or C or D]
EXPLANATION: [one sentence explanation]
---

Generate all 5 questions now:`;

  try {
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [...docParts, { text: prompt }] }],
      config: { temperature: 0.3, maxOutputTokens: 3000 },
    });
    const text = result.text.trim();
    const blocks = text.split(/---+|\n(?=QUESTION:)/).map(b => b.trim()).filter(b => b.length > 20);
    const questions = blocks.slice(0, 5).map(block => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      const get = (prefix) => { const line = lines.find(l => l.startsWith(prefix)); return line ? line.slice(prefix.length).trim() : ''; };
      const question = get('QUESTION:');
      const options = [`A) ${get('A:')}`, `B) ${get('B:')}`, `C) ${get('C:')}`, `D) ${get('D:')}`];
      const correctLetter = get('CORRECT:').toUpperCase().trim();
      const correct = ['A', 'B', 'C', 'D'].indexOf(correctLetter);
      const explanation = get('EXPLANATION:');
      return { question, options, correct: correct === -1 ? 0 : correct, explanation };
    }).filter(q => q.question && q.options[0] !== 'A) ');
    if (questions.length === 0) return res.status(500).json({ error: 'Could not generate quiz questions' });
    // Persist so the student can revisit / retake from the Quizzes sidebar.
    let savedId = null;
    try {
      const { data: saved } = await supabase.from('quizzes')
        .insert({ student_id: req.user.id, course_id: courseId, topic: topic || null, questions })
        .select('id').single();
      savedId = saved?.id || null;
    } catch (e) { console.error('Quiz save error:', e.message); }
    res.json({ id: savedId, questions });
  } catch (err) {
    console.error('Quiz generation error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Flashcards — same pattern as /quiz: a one-shot generation grounded in the
// course materials. Returns parsed cards with front/back/source so the
// client can show them in a flippable panel.
app.post('/course/:courseId/flashcards', requireAuth, requireCourseAccess, async (req, res) => {
  const { courseId } = req.params;
  const { topic } = req.body;
  const docs = getCourseDocuments(courseId);
  if (Object.keys(docs).length === 0) return res.status(400).json({ error: 'No documents uploaded yet' });

  const docEntries = Object.entries(docs);
  const docUris = await Promise.all(docEntries.map(([name, doc]) => getGeminiUri(courseId, name, doc)));
  const docParts = [];
  docEntries.forEach(([name, doc], i) => {
    const uri = docUris[i];
    if (uri) docParts.push({ fileData: { mimeType: doc.mimeType, fileUri: uri } });
    else docParts.push({ inlineData: { mimeType: doc.mimeType, data: doc.buffer.toString('base64') } });
    docParts.push({ text: `[Document: ${name}]` });
  });

  const prompt = `Read these course documents and generate 10 study flashcards${topic ? ` about: ${topic}` : ' covering the most exam-worthy concepts'}.

For each card, write it in this EXACT format with no variations:
FRONT: [a concise term, concept, or question]
BACK: [the definition or answer in 1-2 sentences]
SOURCE: [one short citation like "Lecture 6 · slide 14" or "Chapter 4 · p. 132"]
---

Keep each side under two sentences. Use plain text, no markdown inside the FRONT/BACK fields. Generate all 10 cards now:`;

  try {
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [...docParts, { text: prompt }] }],
      config: { temperature: 0.4, maxOutputTokens: 3000 },
    });
    const text = result.text.trim();
    const blocks = text.split(/---+|\n(?=FRONT:)/i).map(b => b.trim()).filter(b => b.length > 10);
    const cards = blocks.map(block => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      const get = (prefix) => { const line = lines.find(l => l.toUpperCase().startsWith(prefix)); return line ? line.slice(prefix.length).trim() : ''; };
      return { front: get('FRONT:'), back: get('BACK:'), source: get('SOURCE:') };
    }).filter(c => c.front && c.back).slice(0, 12);
    if (cards.length === 0) return res.status(500).json({ error: 'Could not generate flashcards' });
    let savedId = null;
    try {
      const { data: saved } = await supabase.from('flashcard_decks')
        .insert({ student_id: req.user.id, course_id: courseId, topic: topic || null, cards })
        .select('id').single();
      savedId = saved?.id || null;
    } catch (e) { console.error('Deck save error:', e.message); }
    res.json({ id: savedId, cards });
  } catch (err) {
    console.error('Flashcards generation error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Saved quizzes + flashcard decks ────────────────────────────────────────────
// Lightweight CRUD so the student-side sidebar can list, re-open, score, and
// delete the artifacts that /course/:id/quiz and /course/:id/flashcards persist.

app.get('/student/quizzes', requireAuth, async (req, res) => {
  const { courseId } = req.query;
  if (!courseId) return res.status(400).json({ error: 'courseId required' });
  const { data } = await supabase.from('quizzes')
    .select('id, topic, attempts, last_score, best_score, created_at')
    .eq('student_id', req.user.id).eq('course_id', courseId)
    .order('created_at', { ascending: false });
  res.json(data || []);
});

app.get('/student/quizzes/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('quizzes')
    .select('*').eq('student_id', req.user.id).eq('id', req.params.id).single();
  if (error || !data) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

app.patch('/student/quizzes/:id', requireAuth, async (req, res) => {
  const { score } = req.body;
  if (typeof score !== 'number') return res.status(400).json({ error: 'score required' });
  const { data: cur } = await supabase.from('quizzes')
    .select('best_score, attempts').eq('id', req.params.id).eq('student_id', req.user.id).single();
  if (!cur) return res.status(404).json({ error: 'Not found' });
  const best = Math.max(cur.best_score ?? 0, score);
  const attempts = (cur.attempts ?? 0) + 1;
  await supabase.from('quizzes')
    .update({ last_score: score, best_score: best, attempts })
    .eq('id', req.params.id).eq('student_id', req.user.id);
  res.json({ success: true, attempts, last_score: score, best_score: best });
});

app.delete('/student/quizzes/:id', requireAuth, async (req, res) => {
  await supabase.from('quizzes').delete().eq('id', req.params.id).eq('student_id', req.user.id);
  res.json({ success: true });
});

app.get('/student/flashcard-decks', requireAuth, async (req, res) => {
  const { courseId } = req.query;
  if (!courseId) return res.status(400).json({ error: 'courseId required' });
  const { data } = await supabase.from('flashcard_decks')
    .select('id, topic, cards, created_at')
    .eq('student_id', req.user.id).eq('course_id', courseId)
    .order('created_at', { ascending: false });
  res.json(data || []);
});

app.get('/student/flashcard-decks/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('flashcard_decks')
    .select('*').eq('student_id', req.user.id).eq('id', req.params.id).single();
  if (error || !data) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

app.delete('/student/flashcard-decks/:id', requireAuth, async (req, res) => {
  await supabase.from('flashcard_decks').delete().eq('id', req.params.id).eq('student_id', req.user.id);
  res.json({ success: true });
});

// ── Tests (closed-book practice) ──────────────────────────────────────────────
// Same shape as quizzes — same question schema, same CRUD — but lives in its
// own table so the Tests folder in the sidebar stays distinct from Quizzes.
// The taking UX defers all feedback until the end (no per-question reveal),
// but that's a client-side concern — the data is identical.
app.post('/course/:courseId/test', requireAuth, requireCourseAccess, async (req, res) => {
  const { courseId } = req.params;
  const { topic } = req.body;
  const docs = getCourseDocuments(courseId);
  if (Object.keys(docs).length === 0) return res.status(400).json({ error: 'No documents uploaded yet' });

  const docEntries = Object.entries(docs);
  const docUris = await Promise.all(docEntries.map(([name, doc]) => getGeminiUri(courseId, name, doc)));
  const docParts = [];
  docEntries.forEach(([name, doc], i) => {
    const uri = docUris[i];
    if (uri) docParts.push({ fileData: { mimeType: doc.mimeType, fileUri: uri } });
    else docParts.push({ inlineData: { mimeType: doc.mimeType, data: doc.buffer.toString('base64') } });
    docParts.push({ text: `[Document: ${name}]` });
  });

  // Tests are slightly longer + more midterm-shaped than quizzes — 8 questions,
  // mix of difficulty. Same answer schema so the client can reuse the renderer.
  const prompt = `Read these course documents and generate an 8-question closed-book practice test${topic ? ` about: ${topic}` : ''}. Vary the difficulty — some recall, some application, some synthesis.

For each question, write it in this EXACT format with no variations:
QUESTION: [question text]
A: [option a]
B: [option b]
C: [option c]
D: [option d]
CORRECT: [A or B or C or D]
EXPLANATION: [one sentence explanation grounded in the materials]
---

Generate all 8 questions now:`;

  try {
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [...docParts, { text: prompt }] }],
      config: { temperature: 0.3, maxOutputTokens: 4000 },
    });
    const text = result.text.trim();
    const blocks = text.split(/---+|\n(?=QUESTION:)/).map(b => b.trim()).filter(b => b.length > 20);
    const questions = blocks.slice(0, 8).map(block => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      const get = (prefix) => { const line = lines.find(l => l.startsWith(prefix)); return line ? line.slice(prefix.length).trim() : ''; };
      const question = get('QUESTION:');
      const options = [`A) ${get('A:')}`, `B) ${get('B:')}`, `C) ${get('C:')}`, `D) ${get('D:')}`];
      const correctLetter = get('CORRECT:').toUpperCase().trim();
      const correct = ['A', 'B', 'C', 'D'].indexOf(correctLetter);
      const explanation = get('EXPLANATION:');
      return { question, options, correct: correct === -1 ? 0 : correct, explanation };
    }).filter(q => q.question && q.options[0] !== 'A) ');
    if (questions.length === 0) return res.status(500).json({ error: 'Could not generate test questions' });
    let savedId = null;
    try {
      const { data: saved } = await supabase.from('tests')
        .insert({ student_id: req.user.id, course_id: courseId, topic: topic || null, questions })
        .select('id').single();
      savedId = saved?.id || null;
    } catch (e) { console.error('Test save error:', e.message); }
    res.json({ id: savedId, questions });
  } catch (err) {
    console.error('Test generation error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/student/tests', requireAuth, async (req, res) => {
  const { courseId } = req.query;
  if (!courseId) return res.status(400).json({ error: 'courseId required' });
  const { data } = await supabase.from('tests')
    .select('id, topic, attempts, last_score, best_score, created_at')
    .eq('student_id', req.user.id).eq('course_id', courseId)
    .order('created_at', { ascending: false });
  res.json(data || []);
});

app.get('/student/tests/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('tests')
    .select('*').eq('student_id', req.user.id).eq('id', req.params.id).single();
  if (error || !data) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

app.patch('/student/tests/:id', requireAuth, async (req, res) => {
  const { score } = req.body;
  if (typeof score !== 'number') return res.status(400).json({ error: 'score required' });
  const { data: cur } = await supabase.from('tests')
    .select('best_score, attempts').eq('id', req.params.id).eq('student_id', req.user.id).single();
  if (!cur) return res.status(404).json({ error: 'Not found' });
  const best = Math.max(cur.best_score ?? 0, score);
  const attempts = (cur.attempts ?? 0) + 1;
  await supabase.from('tests')
    .update({ last_score: score, best_score: best, attempts })
    .eq('id', req.params.id).eq('student_id', req.user.id);
  res.json({ success: true, attempts, last_score: score, best_score: best });
});

app.delete('/student/tests/:id', requireAuth, async (req, res) => {
  await supabase.from('tests').delete().eq('id', req.params.id).eq('student_id', req.user.id);
  res.json({ success: true });
});

// ── Legacy routes ─────────────────────────────────────────────────────────────
app.post('/auth', (req, res) => {
  const { password } = req.body;
  const correct = process.env.ACCESS_PASSWORD || 'scholr2026';
  if (password === correct) return res.json({ success: true });
  res.status(401).json({ error: 'Invalid password' });
});

app.post('/generate-title', (req, res) => {
  const { question } = req.body;
  if (!question) return res.json({ title: 'New Chat' });
  const title = question.trim().split(/\s+/).slice(0, 5).join(' ').replace(/[.!?,:]+$/, '');
  res.json({ title });
});

// ── Deep health check ─────────────────────────────────────────────────────────
// Actively self-tests the exact failure that blocked a student from joining:
// can the backend write an enrollment past RLS? Point an uptime monitor
// (e.g. UptimeRobot) at /health/deep — it returns 503 the moment the write path
// breaks, so you find out before a student does. (/health stays lightweight for
// Render's own liveness probe.)
app.get('/health/deep', async (req, res) => {
  const checks = {};

  // 1. Supabase key is the service_role/secret key (anon key = enrollment fails)
  try {
    const { error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    checks.service_key = error ? `FAIL: ${error.message}` : 'ok';
  } catch (e) { checks.service_key = `FAIL: ${e.message}`; }

  // 2. The actual enrollment write path bypasses RLS. Insert with random UUIDs:
  //    a healthy service key gets past RLS and is stopped only by the foreign-key
  //    check (23503). If RLS blocks it (42501), enrollment is broken. Never
  //    writes a real row, so it's safe to call repeatedly.
  try {
    const { error } = await supabase.from('enrollments')
      .insert({ student_id: randomUUID(), course_id: randomUUID() });
    if (!error) checks.enrollment_write = 'ok';            // (would be cleaned up, but FK makes this unreachable)
    else if (error.code === '23503') checks.enrollment_write = 'ok';  // past RLS, stopped by FK — healthy
    else if (error.code === '42501') checks.enrollment_write = 'FAIL: blocked by RLS — backend is not using the service key';
    else checks.enrollment_write = `FAIL: ${error.code} ${error.message}`;
  } catch (e) { checks.enrollment_write = `FAIL: ${e.message}`; }

  const ok = Object.values(checks).every(v => v === 'ok');
  res.status(ok ? 200 : 503).json({ ok, checks, ts: new Date().toISOString() });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`✅ ScholrAI running on port ${PORT}`);
  await loadAllDocumentsFromStorage();
  // Run an orphan sweep ~10s after boot so any storage blobs left behind
  // by courses deleted before on-delete cleanup shipped get cleaned up
  // without any manual action. Idempotent — subsequent boots find nothing
  // and log "nothing to clean" in <1s.
  setTimeout(() => {
    sweepOrphanBlobs().catch(e => console.error('Boot-time orphan sweep error:', e.message));
  }, 10000);
  // ~30s after boot, re-index any courses whose chunks are all text
  // (pre-vision-captioning indexing). Self-healing: PDFs uploaded before
  // captioning shipped automatically get diagrams + tables added to
  // retrieval the next time the server restarts. Cheap on subsequent
  // boots — finds visuals already present and exits immediately.
  setTimeout(() => {
    backfillVisualCaptions().catch(e => console.error('Boot-time vision backfill error:', e.message));
  }, 30000);
});