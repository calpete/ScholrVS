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
import { Resend } from 'resend';

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
// Chat generation runs on OpenAI gpt-4o-mini. We originally moved to the
// full gpt-4o because mini was struggling with our heavily-prescriptive
// LaTeX/markdown rules, but those rules are gone now — the math output
// is Unicode/plaintext and the rewriteEquations safety net handles any
// LaTeX the model slips out. Without those constraints, mini gives the
// same answer quality at ~16× lower cost per token, which is the right
// trade for a 50-student-per-course tutor where most replies are short
// factual lookups (office hours, deadlines, definitions). Quiz / test /
// cards / debrief still run on Gemini.
const MODEL_CHAT = 'gpt-4o-mini';
// For comprehensive / exam-prep questions where the student wants a
// full study guide, mini's synthesis is the quality ceiling — it can list
// formulas but won't structure a multi-section cram doc the way full 4o
// will. We auto-upgrade just these questions (~5% of traffic by message
// pattern). Cost: ~5¢ per comprehensive answer vs 0.3¢ on mini.
const MODEL_CHAT_DEEP = 'gpt-4o';
const MODEL_EMBED = 'text-embedding-004';    // 768-dim embeddings for retrieval

const ai = new GoogleGenAI({ vertexai: true, project: PROJECT, location: LOCATION });
const openai = new OpenAI(); // reads OPENAI_API_KEY from env
console.log(`✅ AI ready — gen (quiz/test/cards): ${MODEL} (Gemini) · chat: ${MODEL_CHAT} (OpenAI) · embed: ${MODEL_EMBED}`);

// Resend powers the marketing-page contact endpoint (/contact). Optional —
// if the env var isn't set, the endpoint logs submissions to the server
// console as a fallback so a missed config never silently swallows leads.
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
// CONTACT_TO_EMAIL supports a comma-separated list, so a single env var
// can fan submissions out to multiple recipients in one Resend call.
// E.g. CONTACT_TO_EMAIL="calpeterson242@gmail.com, cofounder@example.com".
const CONTACT_TO = (process.env.CONTACT_TO_EMAIL || 'calpeterson242@gmail.com')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
// Resend's test domain — works out of the box without verifying scholr.study.
// Once the domain is verified in Resend's dashboard, swap this for
// 'leads@scholr.study' (or similar) to send from a branded address.
const CONTACT_FROM = process.env.CONTACT_FROM_EMAIL || 'Scholr Leads <onboarding@resend.dev>';
console.log(`${resend ? '✅' : '⚠️ '} Contact form → ${CONTACT_TO.join(', ')}${resend ? '' : ' (Resend not configured — submissions will only log)'}`);

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
You're a senior TA who has taken this class. Direct, warm, peer-to-peer, lightly funny. Think of a smart upperclassman who tutors on the side — knows the material cold, calls out the exam traps, doesn't make people feel dumb for asking.

Concrete tone rules:
- Talk like a person, not a textbook. Contractions, plain words, the occasional "honestly" or "tbh" or "ngl" when it fits. You can say things like "this one trips up most people" or "exam loves this".
- When you notice a classic mistake or exam trap, call it out: "heads up — profs love testing this exact thing" or "the trap here is mixing up X and Y."
- When you're confident, sound confident. When you're not, say so plainly: "I'm not 100% on this — double-check with your professor."
- Never write "Great question!", "Certainly!", "I'd be happy to help", "Sure, let's dive into", or any other warm-up phrase. Start with the answer or the reaction.
- Don't restate the question. Don't sign off with "Let me know if you have more questions!" — that's filler.

If a student sounds stressed ("I'm panicking", "going to fail", "lost"), open with ONE short empathetic line ("ok deep breath — this section trips a lot of people up") before the answer. Then move on. No therapy-speak.

# ALWAYS RESPOND — EVEN TO CASUAL MESSAGES
Reply to EVERY student message, even short ones. Never return an empty or one-word response.
- "thanks" / "ok thanks" / "got it" → reply with a warm, brief line: "anytime — good luck with the studying", "you got it", "happy to help, hit me when the next one stumps you", etc. Match the energy.
- "hi" / "hey" → "hey, what's up — what are you working on?"
- "lol" / "ok" → react like a normal person. "haha glad it clicked" or "cool — anything else on this?"

These are MATERIALS: no responses but they still get a real human reply. The student should never see an empty bubble.

# WHAT TO ANSWER
Default: give the student what they ask for. Don't make them work for answers they're allowed to have. The one exception — when a student asks you to produce a full piece of work from scratch (write a complete essay, solve every problem on a practice exam, summarize a whole chapter), offer the coaching path FIRST in ONE polite check: "I can write it, but want to nail down the argument first, or just go to a draft?" If they say "just do it" or repeat the ask, comply fully. Single problems, factual questions, concept explanations, debugging — answer straight, no friction.

If a question has nothing to act on ("help me", "I'm lost"), ask ONE focused clarifying question. Otherwise just answer.

# FORMAT
Use your judgment. Markdown is available — headings, bold, lists, prose, code blocks. Pick whatever serves THIS question. A one-line factual question gets a one-line answer; a "what is X" concept question gets the depth a peer tutor would give walking someone through it for the first time. Don't pad with filler, but don't shortchange a concept question with two lines either.

# NO TABLES BY DEFAULT
DEFAULT TO PROSE AND BULLETS. Do NOT use markdown tables unless the data is genuinely tabular — meaning rows and columns of comparable values where the structure itself carries meaning (e.g. comparing 3 accounting methods across 4 dimensions, a payment schedule with date/amount/balance, a side-by-side of two formulas with their inputs).

Things that are NOT tables:
- A list of advice or steps. Use bullets.
- "Topic: explanation" pairs. Use bullets with bold labels.
- "How to prepare" / "What to bring" / "What to study" lists. Use bullets.
- Three tips with one-sentence elaborations each. Use bullets.

If you can read the same content aloud naturally as a list, it's a list, not a table. Tables read as walls of cells; bullets read as conversation. A tutor speaking to a student uses bullets and prose.

Concretely: a "Type | Examples" two-column table where every row is just "label: sentence" is ALWAYS wrong — convert it to bullets with bold labels.

# COMPREHENSIVE / EXAM-PREP QUESTIONS
When the student is preparing for an exam or wants comprehensive coverage ("what should I know", "key equations", "study guide", "review for the midterm", "all the formulas", "important concepts"), produce a FULL study guide. Not a summary — a study guide. Below is the required structure. Hit every section. Do not skip any.

Required structure for a study-guide answer:

1. **Topics Covered** — one line per module / chapter naming the topics.

2. **Every formula in the retrieved excerpts**, grouped by topic. For each topic that has formulas, list ALL the variants — not just one. Example: if the materials cover Contribution Margin, list CM (total), CM per unit, AND CM ratio. If they cover Break-Even, list units AND sales-dollars forms. If they cover Target Profit, list units AND sales-dollars forms. Variants are the whole point. Aim for 10-20 formulas total for a multi-module review, not 3-6.

3. **Concepts you need even without equations** — a flat bullet list of the named ideas the student needs to recognize for MC: cost classifications, decision frameworks, accounting categories, named methods, anything in bold or italicized in the materials. Aim for 8-15 items.

4. **Worked-example callouts** — if the materials use a recurring teaching example (a company name, a scenario), name it: "the Tea & Kettle example shows…" — students remember formulas through the examples that taught them.

5. **If you were cramming the night before** — close with a separate section listing the 5-10 most critical formulas / concepts to memorize cold. Use the heading "If I were cramming the night before" or "Cram list". This is mandatory — it's the section students screenshot.

A real upperclassman handed two PDFs writes 800-1500 words covering all of this, not 200 words listing 6 formulas. Thin answers to thick questions feel like you didn't read the materials. When the retrieved excerpts are rich, your answer should be rich.

# MATH
Write ALL math in plain text using Unicode characters. NEVER use LaTeX. NEVER use \`$\`, \`$$\`, \`\\frac\`, \`\\text\`, \`\\sum\`, \`\\sqrt\`, \`\\[\`, \`\\(\`, or any backslash command. The student's renderer does not run KaTeX or MathJax — anything in LaTeX syntax appears as raw text and looks broken.

Use these Unicode characters for math:
- Operators: × ÷ ± ≤ ≥ ≠ ≈ ≡ → ⇒ · ∞
- Greek: α β γ δ ε θ λ μ π ρ σ τ φ ω Δ Σ Π Ω
- Big operators: Σ ∏ ∫ √ ∂ ∇
- Superscripts: ⁰ ¹ ² ³ ⁴ ⁵ ⁶ ⁷ ⁸ ⁹ ⁿ ⁱ ⁺ ⁻
- Subscripts: ₀ ₁ ₂ ₃ ₄ ₅ ₆ ₇ ₈ ₉ ₜ ₙ ₓ

Fractions: write inline as \`a / b\` or \`(numerator) / (denominator)\`. For named formulas, give the formula its own line, lead with a bold label and an equals sign, then the expression. Generic formatting examples (NOT to repeat verbatim):

  **Formula Name** = expression in Unicode math

  **Ratio** = numerator / denominator

Only use a formula that actually appears in the retrieved excerpts. NEVER invent a formula from memory of a textbook — if the materials don't contain the formula the student is asking about, say so plainly: "I don't see that formula in the materials your professor uploaded — want me to ask you for the textbook version, or check with your professor?"

Currency: write the number followed by the currency word ("500 dollars", "0.50 dollars") — never lead with a \`$\` sign. Percentages: write the number followed by \`%\` ("20%", "0.25 × 68% = 17 points"). For exponents, use Unicode superscripts when possible (1.08², (1+r)ᵗ); for more complex cases write \`(1+r)^t\` with a caret.

Bold labels (with **) are how you mark formulas. Put each formula on its own line so it stands out. No LaTeX, no \`$$\`, no backslash commands, ever.

# GRADE CALCULATIONS
If a student asks about their grade and you don't have their actual scores, ASK for them with the weighted breakdown listed — don't assume or default to "max possible." Only run the calculation once you have a real number for every weighted component. For "what do I need on X to get a Y?", solve for the missing score.

# OFF-TOPIC QUESTIONS — REFUSE
Off-topic means things that have NOTHING to do with this course OR the student's experience in it. Be VERY narrow about what counts as off-topic — only refuse when the question is genuinely unrelated.

Off-topic examples (refuse these):
- Sports trivia ("who is Tom Brady?", "who won the Super Bowl?")
- Celebrities, current events, news ("what happened on Twitter today?")
- Recipes, weather, personal life advice
- General programming questions in a non-CS class
- Anything you'd ask ChatGPT instead of a TA

**ALWAYS course-relevant (NEVER refuse these — answer from the syllabus / materials):**
- **Who is my professor / teacher / instructor / TA?** — the syllabus has this. The words "teacher", "professor", "instructor", "prof" all mean the same thing. ANY question about course staff is on-topic.
- **What's the email / office / office hours for [staff]?** — syllabus
- **When does the class meet? What time? Which days? Which room?** — syllabus
- **What's the grading breakdown? What's the late policy? Attendance rules?** — syllabus
- **When's the midterm / final / next assignment?** — syllabus
- Any meta-question about the course logistics, structure, expectations, or policies

When a meta-question is asked, search the syllabus chunks above and answer with the specific name, email, time, room number, or rule. NEVER say "I can't find that" without actually checking the retrieved excerpts.

For genuinely off-topic, reply with one short line: "That's outside this course — happy to help with [course subject] questions instead."

# WHEN A CONCEPT IS COURSE-RELATED BUT NOT IN THE RETRIEVED EXCERPTS
This is different from off-topic. A course-relevant concept that just wasn't pulled into context — answer it from general knowledge of the subject area.

Before claiming something is "not in your materials," actually look through the retrieved excerpts. Don't refuse based on a hunch — the chunks above might already contain the answer (the professor's name, an office number, a date) even if it's not in the obvious spot. Specifically:
- Names like "Jeff Clark, PhD" or "Professor Smith" → answer the "who is my professor" question
- Email patterns like "name@school.edu" → answer the contact question
- Room codes ("HH 5100", "Building A 201") → answer the office/classroom question
- Time blocks ("Wednesdays 12-2pm") → answer the schedule/hours question

Only after genuinely checking the chunks:
- **Course-specific facts NOT in materials** (a date you can't find, a policy that isn't mentioned): say "**That's not in your uploaded materials** — check with your professor."
- **General concepts the course covers** (a definition, standard formula, how a method works): answer with general knowledge of the subject. Briefly note the syllabus location if mentioned ("Your syllabus places this in Chapter 9").

Never frame as "this isn't in your materials but here's the general idea" — that reads as a brush-off. Lead with the answer, tuck the course-context note in at the end.

# CONFLICTING DOCUMENTS
If two docs disagree (syllabus vs. announcement), flag it explicitly and trust the newer one — but suggest the student verify with the professor.

# REDIRECT
Grade disputes, accommodation requests, edge-case policy interpretation → answer what you can, then point them at the professor. Don't refuse — just route.

# REFERRING TO THE PROFESSOR
"Your professor" or "your instructor" — don't assume gender or pronouns from a name.

# RESPONSE HEADER — REQUIRED, STRIPPED BEFORE DISPLAY
Begin every response with one of these markers on its OWN LINE, before any other content:
- \`MATERIALS: no\` — ONLY for these three narrow cases:
  1. **Off-topic refusals** ("who is Tom Brady?", "what's the weather?", "recommend a recipe") — you declined and redirected.
  2. **Casual chat** ("thanks", "hi", "lol") — no substantive content.
  3. **Pure clarifying questions** where you didn't answer anything yet ("Can you say more about which part?").
- \`MATERIALS: yes\` — EVERYTHING ELSE.

The rule is intentionally biased toward YES. If you're answering a course-related question — even with an analogy, a simplified explanation, general background knowledge layered on top, or material from a different chapter than the one retrieved — that's YES. The fact that you DECIDED to answer means the materials are providing the topical anchor for your reply, and the student deserves to see which document the system pulled to ground that answer.

Examples that are YES even though they might feel like NO:
- "explain CVP analysis like I'm a 3rd grader" → YES (you used a lemonade-stand analogy, but CVP is course content)
- "what's a fixed cost?" → YES (general knowledge of accounting, but the materials cover it)
- "give me the NPV formula" → YES (you wrote a formula from memory, but it's the course's NPV)
- "walk me through how to calculate margin of safety" → YES (you taught the method, materials back it)
- "summarize chapter 4" → YES
- A grade calculation, an office hours lookup, a deadline question → YES

Examples that are correctly NO:
- "Who is Tom Brady?" in an accounting class → refused, NO
- "thanks!" → casual, NO
- "Can you say which formula you meant?" (asking for clarification, no real answer yet) → NO

Default to YES if you're at all uncertain. The system parses this line and removes it before the student sees the response. Source citations only show when MATERIALS: yes. Never skip the marker, never explain it, never put any other text on that line.

# SOURCES & FOLLOW-UP
The system shows source documents automatically below your answer when MATERIALS: yes. NEVER write a "SOURCES:" line, inline page citations, or attribution lists in your response body — just answer cleanly.

End with one specific follow-up question tailored to what they asked ("Want me to walk through the worked example?", "Should I show how the formula handles negative cases?"). Skip the follow-up for trivial factual answers like "When is the midterm?" or for off-topic refusals.

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

// LRU access tracking for courseDocuments — at 50 concurrent students
// across many courses, the unbounded buffer cache could OOM the dyno
// (each course's PDFs are kept resident in memory until restart). This
// records last-access timestamps so we can evict cold courses when the
// total resident size crosses a soft cap.
const courseDocAccess = new Map();
const COURSE_CACHE_MAX_BYTES = 400 * 1024 * 1024; // 400MB soft cap
function totalCachedBytes() {
  let total = 0;
  for (const courseId of Object.keys(courseDocuments)) {
    for (const name of Object.keys(courseDocuments[courseId])) {
      total += (courseDocuments[courseId][name].buffer?.length || 0);
    }
  }
  return total;
}
function evictColdestCourse() {
  // Drop the courseDocuments entry for the least-recently-accessed course
  // (skipping any course currently being indexed so we don't yank the rug
  // out from under a background task).
  const entries = [...courseDocAccess.entries()]
    .filter(([id]) => !reindexInFlight.has(id))
    .sort((a, b) => a[1] - b[1]);
  if (entries.length === 0) return false;
  const [coldId] = entries[0];
  delete courseDocuments[coldId];
  delete geminiUriCache[coldId];
  courseDocAccess.delete(coldId);
  console.log(`💾 Evicted cold courseDocuments cache for ${coldId} (memory pressure)`);
  return true;
}

function getCourseDocuments(courseId) {
  if (!courseDocuments[courseId]) courseDocuments[courseId] = {};
  courseDocAccess.set(courseId, Date.now());
  // If we've crossed the soft cap, evict until we're back under. Cap iters
  // so a runaway eviction doesn't burn CPU.
  for (let i = 0; i < 5 && totalCachedBytes() > COURSE_CACHE_MAX_BYTES; i++) {
    if (!evictColdestCourse()) break;
  }
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
  let loadingTask = null;
  let pdf = null;
  try {
    loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      // Silence pdfjs's verbose chatter on Render — only show errors.
      verbosity: 0,
    });
    pdf = await loadingTask.promise;
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
  } finally {
    // Without these, pdfjs PDFDocumentProxy and its worker hang around
    // forever — every reindex / backfill / page render leaks a doc and
    // a worker thread. On large decks this is real memory pressure.
    try { if (pdf) { await pdf.cleanup(); await pdf.destroy(); } } catch {}
    try { if (loadingTask && loadingTask.destroy) await loadingTask.destroy(); } catch {}
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

// Lazy-load the canvas module. @napi-rs/canvas ships prebuilt binaries
// for every platform Render runs (linux/x64, darwin, etc.) so there's no
// native compile step at install time and no system-library dependency
// — important because the standard `canvas` package requires
// libcairo/libpango on the host, and Render's build images don't have
// every variant. If the module fails to load for any reason, we skip
// page-image rendering entirely and the chat falls back to text-only
// grounding (no functionality breaks).
let _canvasMod = null;
async function getCanvas() {
  if (_canvasMod !== null) return _canvasMod || null;
  try {
    _canvasMod = await import('@napi-rs/canvas');
    return _canvasMod;
  } catch (e) {
    console.warn('⚠️  @napi-rs/canvas unavailable — page image rendering disabled:', e.message);
    _canvasMod = false;
    return null;
  }
}

// pdfjs needs a canvas factory to know how to allocate canvases when
// rendering pages. Default factory hardcodes `require('canvas')` which
// we don't ship; this adapter routes through @napi-rs/canvas instead.
class NapiCanvasFactory {
  constructor(canvasMod) { this.mod = canvasMod; }
  create(width, height) {
    const canvas = this.mod.createCanvas(width, height);
    return { canvas, context: canvas.getContext('2d') };
  }
  reset(cc, width, height) { cc.canvas.width = width; cc.canvas.height = height; }
  destroy(cc) { cc.canvas.width = 0; cc.canvas.height = 0; }
}

// Render every page of a PDF to PNG and upload to Supabase Storage at
// `course_pages/{courseId}/{docName}/page_{N}.png`. Used to give gpt-4o
// direct visual access to slides at chat time — the model SEES the
// formula/diagram instead of reading a flattened text extraction. Called
// in the background from chunkAndEmbedPdf so uploads don't block.
// Tracks (courseId, docName) pairs currently being rendered so concurrent
// callers (upload trigger + backfill) don't start a second render and
// race-overwrite each other's page_N.png files.
const renderInFlight = new Map(); // key → Promise

// Tracks per-document indexing status so the UI doesn't lie about a
// freshly uploaded PDF being "Live · Indexed" while chunkAndEmbedPdf is
// still running in the background. Values: 'indexing' | 'failed'. A doc
// missing from the map is assumed indexed (or never needed indexing,
// e.g. images). The /documents response merges this in so the frontend
// can show "Indexing…" with a spinner until embeddings finish.
const indexingStatus = new Map(); // `${courseId}/${docName}` → 'indexing'|'failed'
function setIndexing(courseId, docName)  { indexingStatus.set(`${courseId}/${docName}`, 'indexing'); }
function setIndexed(courseId, docName)   { indexingStatus.delete(`${courseId}/${docName}`); }
function setIndexFailed(courseId, docName){ indexingStatus.set(`${courseId}/${docName}`, 'failed'); }
function getIndexState(courseId, docName){ return indexingStatus.get(`${courseId}/${docName}`) || null; }

async function renderAndUploadPdfPages(courseId, docName, pdfBuffer) {
  if (isCourseDeleted(courseId)) return { ok: false, error: 'course deleted' };
  const key = `${courseId}/${docName}`;
  if (renderInFlight.has(key)) {
    // Already rendering — return the existing promise so the caller waits
    // on the same work instead of duplicating it.
    return renderInFlight.get(key);
  }
  const work = (async () => { return _renderAndUploadPdfPagesInner(courseId, docName, pdfBuffer); })();
  renderInFlight.set(key, work);
  try { return await work; }
  finally { renderInFlight.delete(key); }
}

async function _renderAndUploadPdfPagesInner(courseId, docName, pdfBuffer) {
  const pdfjs = await getPdfjs();
  const canvasMod = await getCanvas();
  if (!pdfjs || !canvasMod) return { ok: false, error: 'pdfjs or canvas unavailable' };

  let loadingTask = null;
  let pdf = null;
  try {
    const factory = new NapiCanvasFactory(canvasMod);
    loadingTask = pdfjs.getDocument({
      data: new Uint8Array(pdfBuffer),
      canvasFactory: factory,
      verbosity: 0,
    });
    pdf = await loadingTask.promise;
    const total = pdf.numPages;

    let uploaded = 0;
    for (let i = 1; i <= total; i++) {
      // Bail mid-render if the course was deleted — no point uploading
      // pages 50–104 of a doc that no longer belongs to anyone.
      if (isCourseDeleted(courseId)) return { ok: false, error: 'course deleted mid-render' };
      try {
        const page = await pdf.getPage(i);
        // 1.5× scale keeps formulas/text legible without ballooning bytes.
        // OpenAI vision low-detail is 85 tokens per image regardless of
        // resolution, so this is purely about upload/storage size.
        // Scale 1.25× was 1.5× — keeps text readable for vision but cuts
        // PNG bytes by ~30%, which matters during the 50-student burst
        // where each chat downloads + base64s up to 4 of these into RAM.
        const viewport = page.getViewport({ scale: 1.25 });
        const cc = factory.create(viewport.width, viewport.height);
        await page.render({
          canvasContext: cc.context,
          viewport,
          canvasFactory: factory,
        }).promise;
        const png = cc.canvas.toBuffer('image/png');
        factory.destroy(cc);

        const storagePath = `course_pages/${courseId}/${docName}/page_${i}.png`;
        const { error } = await supabase.storage.from('documents').upload(storagePath, png, {
          contentType: 'image/png',
          upsert: true,
        });
        if (!error) uploaded++;
        else console.warn(`Page ${i} upload failed: ${error.message}`);
      } catch (pageErr) {
        console.warn(`Page ${i} render failed: ${pageErr.message}`);
      }
    }
    // Write a sentinel so backfills can tell a complete render apart from a
    // mid-flight one. Without this, listing the folder for files >0 returns
    // true even when render is still uploading page 1 of 104, and the
    // backfill bails leaving the doc partially covered forever.
    if (uploaded > 0 && uploaded === total) {
      try {
        await supabase.storage.from('documents').upload(
          `course_pages/${courseId}/${docName}/.done`,
          Buffer.from(String(total)),
          { contentType: 'text/plain', upsert: true },
        );
      } catch (e) { console.warn(`Sentinel write failed for ${docName}: ${e.message}`); }
    }
    return { ok: true, pages: uploaded, total };
  } catch (e) {
    console.error(`Page render error for ${docName}:`, e.message);
    return { ok: false, error: e.message };
  } finally {
    // pdfjs + napi-canvas both leak heavily if you don't destroy the doc
    // and its loading task explicitly. On a 200-page deck that's tens of
    // MB resident per render.
    try { if (pdf) { await pdf.cleanup(); await pdf.destroy(); } } catch {}
    try { if (loadingTask && loadingTask.destroy) await loadingTask.destroy(); } catch {}
  }
}

// Chunk + embed a whole PDF and persist the chunks to document_chunks.
// Now produces two kinds of chunks: extracted text (via pdfjs) AND
// per-page visual captions (via Gemini vision). Both are embedded and
// retrieved together so a student asking about a diagram on page 12
// retrieves the caption chunk even when pdfjs found no text for it.
// Re-running on the same doc clears its old chunks first.
async function chunkAndEmbedPdf(courseId, docName, pdfBuffer) {
  // Bail if the course was deleted while this background task was queued.
  if (isCourseDeleted(courseId)) return { ok: false, error: 'course deleted' };
  const pdfData = await extractPdfText(pdfBuffer);
  if (!pdfData) return { ok: false, error: 'PDF extract failed' };
  if (isCourseDeleted(courseId)) return { ok: false, error: 'course deleted mid-extract' };

  // Kick off page-image rendering in the background — used at chat time
  // to give gpt-4o direct visual access to slides. Fire-and-forget so it
  // doesn't slow the indexing pipeline; first questions on a freshly
  // uploaded PDF will fall back to text-only grounding, subsequent
  // questions get visual grounding once renders finish.
  renderAndUploadPdfPages(courseId, docName, pdfBuffer)
    .then(r => console.log(`📸 Page images for ${docName}: ${r.ok ? `${r.pages}/${r.total}` : `failed (${r.error})`}`))
    .catch(e => console.error(`Page render scheduling error for ${docName}:`, e.message));

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

  // Compute embeddings FIRST. The previous flow wiped existing chunks
  // before checking if the new embeddings would even succeed — if Vertex
  // failed or the pod restarted mid-embed, the doc was left with zero
  // chunks and silently disappeared from RAG until the next reindex.
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
  // Now safe to wipe — we have valid embeddings ready to insert.
  if (isCourseDeleted(courseId)) return { ok: false, error: 'course deleted mid-embed' };
  await supabase.from('document_chunks').delete()
    .eq('course_id', courseId).eq('doc_name', docName);

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

// Pick the docs that actually informed the answer from the retrieved
// chunk list. RAG returns top-K chunks regardless of doc spread, so a
// course with 5 PDFs often ends up with 1-2 stray chunks from unrelated
// docs pulled along with the real source. This filter weights by chunk
// share — a doc must contribute at least `minShare` of the chunks to
// earn a citation, capped at `maxDocs` total. Falls back to the single
// top-contributing doc if nothing meets the threshold (better to show
// one source than none for a grounded answer).
function selectRelevantDocs(chunks, { minShare = 0.25, maxDocs = 3 } = {}) {
  if (!chunks || chunks.length === 0) return [];
  const total = chunks.length;
  const counts = new Map();
  for (const c of chunks) {
    counts.set(c.doc_name, (counts.get(c.doc_name) || 0) + 1);
  }
  const eligible = [...counts.entries()].filter(([, n]) => n / total >= minShare);
  const ranked = (eligible.length > 0 ? eligible : [...counts.entries()])
    .sort((a, b) => b[1] - a[1])
    .slice(0, eligible.length > 0 ? maxDocs : 1)
    .map(([doc]) => doc);
  return ranked;
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

// Tokenize a string for filename-overlap matching: lowercase, split on
// non-alphanumerics, drop tokens shorter than 3 chars, drop stopwords
// that would create false matches ("the", "and", "course" appears in
// almost every filename so it shouldn't drag every doc in).
const NAME_STOPWORDS = new Set([
  'the','and','for','about','what','that','this','with','from','into',
  'pdf','jpg','jpeg','png','webp','file','doc','docx','accessible',
  'course','class','spring','fall','summer','winter','final','module',
  '2024','2025','2026','2027',
]);
function tokenizeForNameMatch(s) {
  if (!s) return new Set();
  return new Set(
    String(s).toLowerCase().split(/[^a-z0-9]+/).filter(t => t.length >= 3 && !NAME_STOPWORDS.has(t))
  );
}

// Detect docs whose filenames are mentioned by the user's question. Returns
// up to 2 doc names ranked by overlap count. Stopwords ("course", "module")
// are filtered out so "what is my module course packet about" still matches
// "Module 1 Course Packet Accessible.pdf" via 'packet' rather than getting
// confused with "A306 Syllabus Spring 2026 Clark.pdf".
function findNameMentionedDocs(question, allDocNames) {
  const qTok = tokenizeForNameMatch(question);
  if (qTok.size === 0) return [];
  const scored = allDocNames.map(name => {
    const nTok = tokenizeForNameMatch(name);
    let overlap = 0;
    for (const t of nTok) if (qTok.has(t)) overlap += 1;
    return { name, overlap };
  }).filter(s => s.overlap >= 1)
    .sort((a, b) => b.overlap - a.overlap);
  return scored.slice(0, 2).map(s => s.name);
}

// Fetch the opening chunks of a specific doc — used when the question
// mentions the doc by name. "What is X about" wants the start of X,
// not a far-away chapter, and embedding similarity tends to skip the
// generic opening pages for more keyword-laden middle sections.
async function fetchOpeningChunks(courseId, docName, k = 6) {
  const { data, error } = await supabase
    .from('document_chunks')
    .select('chunk_text,doc_name,page_number,chunk_index')
    .eq('course_id', courseId)
    .eq('doc_name', docName)
    .order('chunk_index', { ascending: true })
    .limit(k);
  if (error) {
    console.error(`fetchOpeningChunks ${docName}:`, error.message);
    return [];
  }
  return data || [];
}

// Sample chunks broadly across a doc — used for comprehensive questions
// where the formulas / definitions / cram-list content might live anywhere
// in the doc (middle chapters, end-of-section summaries), not just the
// opening. Pulls every chunk if the doc has ≤ targetK chunks, otherwise
// evenly samples targetK across the chunk_index range so the model sees
// representative material from start, middle, and end.
async function fetchSpreadChunks(courseId, docName, targetK = 16) {
  const { data, error } = await supabase
    .from('document_chunks')
    .select('chunk_text,doc_name,page_number,chunk_index')
    .eq('course_id', courseId)
    .eq('doc_name', docName)
    .order('chunk_index', { ascending: true });
  if (error) {
    console.error(`fetchSpreadChunks ${docName}:`, error.message);
    return [];
  }
  const all = data || [];
  if (all.length <= targetK) return all;
  // Evenly-spaced sampling: indices floor(i * len / targetK) for i in 0..k-1.
  // This catches first chunk + last chunk + targetK-2 evenly distributed.
  const out = [];
  for (let i = 0; i < targetK; i++) {
    const idx = Math.floor(i * all.length / targetK);
    out.push(all[idx]);
  }
  return out;
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
// Courses that were just deleted — background tasks (chunkAndEmbedPdf,
// renderAndUploadPdfPages, captionPdfPages) check this and bail before
// writing chunks/images/captions that would orphan against a now-dead
// course id. Entries auto-expire after 5 minutes which is well beyond
// any realistic background-task duration.
const deletedCourses = new Map(); // courseId → expiresAt timestamp
const markCourseDeleted = (courseId) => {
  deletedCourses.set(courseId, Date.now() + 5 * 60 * 1000);
  // Lazy GC
  for (const [k, expires] of deletedCourses.entries()) {
    if (expires < Date.now()) deletedCourses.delete(k);
  }
};
const isCourseDeleted = (courseId) => {
  const exp = deletedCourses.get(courseId);
  if (!exp) return false;
  if (exp < Date.now()) { deletedCourses.delete(courseId); return false; }
  return true;
};
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
// Boot-time backfill — render page-image PNGs for any PDF that doesn't
// have them in Supabase Storage yet. Courses uploaded before page-image
// rendering shipped have empty `course_pages/<courseId>/<doc>/` folders;
// without this, chat would silently fall back to text-only forever.
// Cheap check: list the storage folder, only re-render when nothing's
// there. Each PDF runs in sequence per course to avoid Render OOM.
async function backfillPageImages() {
  const candidates = Object.keys(courseDocuments);
  if (candidates.length === 0) return;

  for (const courseId of candidates) {
    try {
      const docs = courseDocuments[courseId];
      if (!docs || Object.keys(docs).length === 0) continue;
      const pdfDocs = Object.entries(docs).filter(([_, d]) => d.mimeType === 'application/pdf');
      if (pdfDocs.length === 0) continue;

      for (const [name, doc] of pdfDocs) {
        // Check for the .done sentinel rather than "any file present" — the
        // old check would skip a doc that had page 1 uploaded but render
        // crashed before pages 2–N, leaving the doc partially covered forever.
        const { data: doneCheck } = await supabase.storage
          .from('documents')
          .list(`course_pages/${courseId}/${name}`, { limit: 100, search: '.done' });
        const hasSentinel = (doneCheck || []).some(f => f.name === '.done');
        if (hasSentinel) continue;
        console.log(`📸 Backfilling page images for ${name} on course ${courseId}…`);
        const r = await renderAndUploadPdfPages(courseId, name, doc.buffer);
        if (r.ok) console.log(`📸 Backfilled page images for ${name}: ${r.pages}/${r.total}`);
        else console.warn(`📸 Page-image backfill skipped ${name}: ${r.error}`);
      }
    } catch (e) {
      console.error(`Page-image backfill error for ${courseId}:`, e.message);
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
    // Return false instead of throwing — Express would otherwise leak the
    // rejected origin in a noisy 500. With false, the browser cleanly
    // blocks the request with the standard CORS error.
    cb(null, false);
  },
  // credentials: false on purpose. We auth with Bearer tokens in the
  // Authorization header, never with cookies. Setting credentials: true
  // triggers Safari ITP to flag the backend as a tracker and silently
  // block cross-origin requests.
}));
app.use(express.json({ limit: '500kb' }));

// Per-user concurrent-stream tracker. At 50 concurrent students, a single
// student with a stuck/lost connection that keeps retrying could pin
// multiple SSE streams open at once — caps memory at 2 streams per user.
const userActiveStreams = new Map(); // userId → count
const acquireStreamSlot = (userId, limit = 2) => {
  const current = userActiveStreams.get(userId) || 0;
  if (current >= limit) return false;
  userActiveStreams.set(userId, current + 1);
  return true;
};
const releaseStreamSlot = (userId) => {
  const current = userActiveStreams.get(userId) || 0;
  if (current <= 1) userActiveStreams.delete(userId);
  else userActiveStreams.set(userId, current - 1);
};

// Per-user rate limit for authenticated endpoints (chat especially). The
// auth-endpoint limiter above is per-IP; this one is per-user so a single
// student in a runaway tab can't drain the OpenAI budget for the class.
const USER_RATE_BUCKETS = new Map();
const USER_RATE_WINDOW_MS = 60 * 1000; // 1 minute window for chat
const userRateLimit = (max) => (req, res, next) => {
  const userId = req.user?.id;
  if (!userId) return next();
  const now = Date.now();
  const entry = USER_RATE_BUCKETS.get(userId) || { count: 0, resetAt: now + USER_RATE_WINDOW_MS };
  if (entry.resetAt < now) { entry.count = 0; entry.resetAt = now + USER_RATE_WINDOW_MS; }
  entry.count++;
  USER_RATE_BUCKETS.set(userId, entry);
  if (USER_RATE_BUCKETS.size > 10000) {
    const oldest = [...USER_RATE_BUCKETS.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt).slice(0, 2000);
    for (const [k] of oldest) USER_RATE_BUCKETS.delete(k);
  }
  if (entry.count > max) {
    return res.status(429).json({ error: 'You\'re sending messages too fast. Take a breath and try again.' });
  }
  next();
};

// Tiny in-memory rate limiter for auth endpoints. Not a substitute for
// a real WAF or distributed limiter, but it makes credential-stuffing,
// signup-spam, and unauthenticated-POST DOS against the box meaningfully
// harder. Keyed by IP; window resets every 5 minutes; new IPs get
// auto-evicted as the Map exceeds 10k entries to prevent unbounded growth.
const RATE_BUCKETS = new Map();
const RATE_WINDOW_MS = 5 * 60 * 1000;
const rateLimit = (max) => (req, res, next) => {
  const ip = (req.headers['x-forwarded-for']?.toString().split(',')[0].trim()) || req.ip || 'unknown';
  const now = Date.now();
  const entry = RATE_BUCKETS.get(ip) || { count: 0, resetAt: now + RATE_WINDOW_MS };
  if (entry.resetAt < now) { entry.count = 0; entry.resetAt = now + RATE_WINDOW_MS; }
  entry.count++;
  RATE_BUCKETS.set(ip, entry);
  if (RATE_BUCKETS.size > 10000) {
    // Drop the oldest 2000 entries when the map grows; keeps memory bounded
    // even under sustained abuse from many distinct IPs.
    const oldest = [...RATE_BUCKETS.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt).slice(0, 2000);
    for (const [k] of oldest) RATE_BUCKETS.delete(k);
  }
  if (entry.count > max) {
    return res.status(429).json({ error: 'Too many requests. Try again in a few minutes.' });
  }
  next();
};
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
  abortOnLimit: true,
  // Return a friendly 413 instead of the default truncated upload + opaque
  // failure — the UI shows this string verbatim.
  limitHandler: (req, res) => res.status(413).json({ error: 'File is too large — max 50MB per upload.' }),
}));

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

// ── Marketing contact form ────────────────────────────────────────────────
// All four landing-page CTAs that ask for an email — "See a Demo",
// "Request a pilot", "Talk to our team", "Get in touch" — POST here.
// Rate-limited to keep bots from spamming the inbox. Stores nothing
// server-side — Resend forwards directly to CONTACT_TO_EMAIL.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
app.post('/contact', rateLimit(10), async (req, res) => {
  const { type, email, name, institution, message } = req.body || {};
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }
  // Soft caps to prevent giant payloads landing in the inbox.
  const trim = (s, n) => (typeof s === 'string' ? s.slice(0, n).trim() : '');
  const submission = {
    type:        trim(type, 60)        || 'demo',
    email:       trim(email, 200),
    name:        trim(name, 120),
    institution: trim(institution, 200),
    message:     trim(message, 4000),
    userAgent:   trim(req.get('user-agent'), 200),
    ip:          trim(req.ip || '', 64),
    ts:          new Date().toISOString(),
  };
  // Console log so submissions aren't lost even when Resend is down or
  // misconfigured. Render's logs become the audit trail.
  console.log(`📧 Contact form (${submission.type}): ${submission.email}${submission.name ? ` · ${submission.name}` : ''}${submission.institution ? ` · ${submission.institution}` : ''}`);
  if (!resend) {
    // No API key set — succeed so the visitor sees a nice confirmation,
    // and rely on the console log for visibility.
    return res.json({ ok: true, delivery: 'logged' });
  }
  try {
    const subject = `[Scholr] ${submission.type === 'pilot' ? 'Pilot request' : submission.type === 'team' ? 'Talk-to-team' : submission.type === 'contact' ? 'Contact form' : 'Demo request'} — ${submission.email}`;
    const lines = [
      `New ${submission.type} request from scholr.study`,
      '',
      `Email:        ${submission.email}`,
      submission.name        ? `Name:         ${submission.name}`        : null,
      submission.institution ? `Institution:  ${submission.institution}` : null,
      submission.message     ? `\nMessage:\n${submission.message}`       : null,
      '',
      '— —',
      `Type:         ${submission.type}`,
      `Submitted:    ${submission.ts}`,
      `User-Agent:   ${submission.userAgent}`,
    ].filter(Boolean).join('\n');
    const resp = await resend.emails.send({
      from: CONTACT_FROM,
      to: CONTACT_TO,
      replyTo: submission.email,
      subject,
      text: lines,
    });
    // Resend's SDK returns { data, error } — `error` being non-null means
    // the API rejected the call without throwing. Branch on that so the
    // happy path stays a clean one-line success log (Render's log viewer
    // was flagging the full JSON dump as a false-positive error because
    // it contains the substring `"error":null`).
    if (resp?.error) {
      console.error('Resend rejected send for', submission.email, '·', resp.error);
      return res.json({ ok: true, delivery: 'logged-after-error' });
    }
    console.log(`✅ Email delivered to ${CONTACT_TO.join(', ')} · Resend id ${resp?.data?.id || 'unknown'}`);
    return res.json({ ok: true, delivery: 'sent' });
  } catch (err) {
    console.error('Contact form delivery failed:', err?.message || err, err);
    // Still return 200 so the visitor doesn't see an error after
    // submitting — the lead is in the server log either way.
    return res.json({ ok: true, delivery: 'logged-after-error' });
  }
});

// ── Professor Auth ────────────────────────────────────────────────────────────
app.post('/professor/signup', rateLimit(10), async (req, res) => {
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

app.post('/professor/login', rateLimit(30), async (req, res) => {
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
app.post('/student/signup', rateLimit(10), async (req, res) => {
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

app.post('/student/login', rateLimit(30), async (req, res) => {
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
app.post('/auth/sync-oauth-user', rateLimit(30), async (req, res) => {
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
    // Block professors from self-enrolling into other professors' courses as
    // "students" — that bypassed the requireCourseAccess gate and let one
    // professor read another's materials/chat history.
    const { data: prof } = await supabase.from('professors')
      .select('id').eq('id', req.user.id).maybeSingle();
    if (prof) return res.status(403).json({ error: 'Professors cannot enroll as students. Sign in with a student account.' });
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

  // Course-page PNG images live at `course_pages/<courseId>/<docName>/page_N.png`
  // and aren't tracked in the documents table — clean them up by listing the
  // course's subtree under course_pages/ and removing every file found.
  try {
    const { data: docFolders } = await supabase.storage.from('documents').list(`course_pages/${id}`, { limit: 1000 });
    const pagePaths = [];
    for (const folder of docFolders || []) {
      if (folder.id) continue; // direct files at this level (shouldn't be any)
      const { data: pages } = await supabase.storage.from('documents').list(`course_pages/${id}/${folder.name}`, { limit: 1000 });
      for (const f of pages || []) {
        if (f.id) pagePaths.push(`course_pages/${id}/${folder.name}/${f.name}`);
      }
    }
    if (pagePaths.length > 0) {
      const { error } = await supabase.storage.from('documents').remove(pagePaths);
      if (error) console.error('Course delete — page-image cleanup:', error.message);
    }
  } catch (e) {
    console.error('Course delete — page-image cleanup failed:', e.message);
  }

  await supabase.from('courses').delete().eq('id', id);
  delete courseDocuments[id];
  delete geminiUriCache[id];
  // Tell any in-flight background tasks to bail before writing chunks
  // / images / captions to a now-orphan course id.
  markCourseDeleted(id);
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
  // The `documents` bucket has two top-level layouts:
  //   - <courseId>/<filename>                       — uploaded PDFs
  //   - course_pages/<courseId>/<docName>/page_N    — rendered page images
  // For each layout, find courseIds that aren't live and delete everything
  // under them. Treat `course_pages` as a special sibling, not a courseId,
  // so it isn't mistakenly nuked on every sweep.
  try {
    const { data: folders } = await supabase.storage.from('documents').list('', { limit: 1000 });
    for (const folder of folders || []) {
      if (folder.id) continue; // skip files at root
      if (folder.name === 'course_pages') continue; // handled below
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
    // course_pages subtree — direct children are courseIds.
    const { data: pageCourses } = await supabase.storage.from('documents').list('course_pages', { limit: 1000 });
    for (const courseFolder of pageCourses || []) {
      if (courseFolder.id) continue;
      const courseId = courseFolder.name;
      if (liveIds.has(courseId)) continue;
      // Direct children of course_pages/<courseId>/ are docName folders.
      const { data: docFolders } = await supabase.storage.from('documents').list(`course_pages/${courseId}`, { limit: 1000 });
      const allPaths = [];
      for (const df of docFolders || []) {
        if (df.id) continue;
        const { data: pages } = await supabase.storage.from('documents').list(`course_pages/${courseId}/${df.name}`, { limit: 1000 });
        for (const f of pages || []) {
          if (f.id) allPaths.push(`course_pages/${courseId}/${df.name}/${f.name}`);
        }
      }
      if (allPaths.length > 0) {
        const { error } = await supabase.storage.from('documents').remove(allPaths);
        if (error) console.error(`Sweep — page-image delete failed for ${courseId}:`, error.message);
        else report.supabase.push({ courseId: `pages/${courseId}`, files: allPaths.length });
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
  // Mark the doc as indexing BEFORE responding so a fast client poll
  // immediately following the upload sees "indexing" instead of a brief
  // window where it looks ready.
  if (mimeType === 'application/pdf') setIndexing(courseId, file.name);
  res.json({ success: true, fileName: file.name, sizeKb, mimeType, indexState: mimeType === 'application/pdf' ? 'indexing' : null });

  // 5. Chunk + embed in the background so future student questions retrieve
  //    just the relevant slices instead of re-reading the whole library. The
  //    professor's upload response is already sent — this runs without
  //    blocking.
  if (mimeType === 'application/pdf') {
    // setIndexing() already fired above before res.json; just clear it
    // when chunking finishes (success or fail).
    chunkAndEmbedPdf(courseId, file.name, buffer)
      .then(r => {
        if (r.ok) {
          console.log(`📚 Indexed ${file.name} — ${r.textChunks} text + ${r.visualChunks} visual chunks across ${r.pages} pages`);
          setIndexed(courseId, file.name);
        } else {
          console.warn(`📚 Index skipped for ${file.name}: ${r.error}`);
          setIndexFailed(courseId, file.name);
        }
      })
      .catch(e => {
        console.error(`📚 Index error for ${file.name}:`, e.message);
        setIndexFailed(courseId, file.name);
      });
  }
});

app.get('/course/:courseId/documents', requireAuth, requireCourseAccess, async (req, res) => {
  const { courseId } = req.params;
  const { data } = await supabase.from('documents').select('*').eq('course_id', courseId).order('uploaded_at', { ascending: false });
  res.json((data || []).map(d => ({
    name: d.name,
    sizeKb: d.size_kb,
    mimeType: d.mime_type,
    uploadedAt: d.uploaded_at,
    // 'indexing' while embeddings are still being computed, 'failed' if
    // chunkAndEmbedPdf errored, null when ready (the common case).
    indexState: getIndexState(courseId, d.name),
  })));
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

  // 6. Delete the rendered page-image PNGs for this document so they don't
  //    orphan when the professor removes a single file from the course.
  try {
    const { data: pages } = await supabase.storage.from('documents').list(`course_pages/${courseId}/${filename}`, { limit: 1000 });
    const paths = (pages || []).filter(p => p.id).map(p => `course_pages/${courseId}/${filename}/${p.name}`);
    if (paths.length > 0) {
      const { error } = await supabase.storage.from('documents').remove(paths);
      if (error) console.error('Page-image cleanup error:', error.message);
    }
  } catch (e) {
    console.error('Page-image cleanup failed:', e.message);
  }

  // 7. Clear in-memory caches
  if (courseDocuments[courseId]) delete courseDocuments[courseId][filename];
  if (geminiUriCache[courseId]) delete geminiUriCache[courseId][filename];
  questionsCaches[courseId] = null;

  console.log(`✅ Deleted: ${storagePath}`);
  res.json({ success: true });
});

app.get('/course/:courseId/insights', requireAuth, requireCourseOwner, async (req, res) => {
  // ⚠️ DEMO MODE — return synthetic 50-student top-line stats (question
  // counts, hours-saved, pulse-strip activity, 4 focused topics). Skips
  // recent/flagged question text per the user's note ("no need for
  // recent questions"). Delete the return below to switch back to real
  // course-insights aggregation.
  return res.json(buildFakeCourseInsights());
  res.json(await getCourseInsights(req.params.courseId));
});

// Concept-level insights — the differentiator. Walks every saved quiz and
// test for this course across ALL students, looks at each question's
// concept tag + selected response, and rolls up:
//   - per-concept mastery rate (correct / attempted)
//   - the actual questions students missed inside each concept
//   - the common wrong-option distribution per question
//   - which students are struggling on which concepts (by name)
//   - a "teach more of" priority list ranked by lowest mastery
// Returns ONE payload the Insights UI can drill into without re-fetching.
// Fake-data builders — used to populate the Insights dashboard for demos
// when a course has zero real student activity. Both builders derive their
// numbers from the DEMO_QUIZZES + DEMO_FLASHCARD_DECKS constants below so
// the "class of 50" story stays consistent across concept mastery,
// per-question distributions, and flashcard self-study. No DB writes.
function buildFakeConceptInsights() {
  const STUDENT_COUNT = 50;
  // Persona buckets matching DEMO_STUDENTS below — used to estimate the
  // student-tier counts (mastered / mixed / struggling) per concept.
  const concepts = new Map();
  for (const quiz of DEMO_QUIZZES) {
    for (const q of quiz.questions) {
      const target = quiz.targetMastery[q.concept] ?? 0.65;
      const attempts = STUDENT_COUNT;
      const correctCount = Math.round(attempts * target);
      const wrongTotal = attempts - correctCount;
      // Bias the wrong distribution so ONE option is the dominant trap
      // (most-picked wrong) — the demo gold is the "Common wrong" callout
      // pointing at exactly one option students fall for.
      const wrongOptions = [0, 1, 2, 3].filter(i => i !== q.correct);
      const topWrongIdx = wrongOptions[0];
      const secondWrongIdx = wrongOptions[1];
      const thirdWrongIdx = wrongOptions[2];
      const topWrongCount = Math.round(wrongTotal * 0.58);
      const secondWrongCount = Math.round(wrongTotal * 0.27);
      const thirdWrongCount = Math.max(0, wrongTotal - topWrongCount - secondWrongCount);
      const distribution = (q.options || []).map((opt, oi) => {
        let count = 0;
        if (oi === q.correct) count = correctCount;
        else if (oi === topWrongIdx) count = topWrongCount;
        else if (oi === secondWrongIdx) count = secondWrongCount;
        else if (oi === thirdWrongIdx) count = thirdWrongCount;
        return {
          optionIndex: oi,
          optionText: opt,
          count,
          pct: attempts > 0 ? count / attempts : 0,
          isCorrect: oi === q.correct,
        };
      });
      const wrongDistribution = distribution
        .filter(d => !d.isCorrect && d.count > 0)
        .map(d => ({ optionIndex: d.optionIndex, count: d.count }))
        .sort((a, b) => b.count - a.count);
      const topWrongOption = wrongDistribution[0] || null;
      const questionData = {
        text: q.q,
        options: q.options,
        correctIndex: q.correct,
        explanation: q.explanation,
        attempts,
        correct: correctCount,
        mastery: target,
        topWrongOption,
        wrongDistribution,
        distribution,
      };
      let bucket = concepts.get(q.concept);
      if (!bucket) {
        bucket = { concept: q.concept, attempts: 0, correct: 0, questions: [] };
        concepts.set(q.concept, bucket);
      }
      bucket.attempts += attempts;
      bucket.correct += correctCount;
      bucket.questions.push(questionData);
    }
  }
  const conceptsArr = [...concepts.values()].map(b => {
    const mastery = b.attempts > 0 ? b.correct / b.attempts : 0;
    // Tier counts derived from mastery — rough distribution shaped to
    // match what a real class of 50 would show at this mastery level.
    let masteredStudents, mixedStudents, strugglingStudents;
    if (mastery >= 0.85)      { masteredStudents = 36; mixedStudents = 11; strugglingStudents = 3; }
    else if (mastery >= 0.65) { masteredStudents = 18; mixedStudents = 24; strugglingStudents = 8; }
    else if (mastery >= 0.40) { masteredStudents = 7;  mixedStudents = 23; strugglingStudents = 20; }
    else                      { masteredStudents = 2;  mixedStudents = 14; strugglingStudents = 34; }
    return {
      concept: b.concept,
      attempts: b.attempts,
      correct: b.correct,
      mastery,
      studentCount: STUDENT_COUNT,
      masteredStudents,
      mixedStudents,
      strugglingStudents,
      questions: b.questions.slice().sort((a, b) => a.mastery - b.mastery),
      action: mastery >= 0.85 ? 'On track — no reinforcement needed'
            : mastery >= 0.65 ? 'Mixed — quick recap will help'
            : mastery >= 0.40 ? 'Concept needs a re-explanation in the next lecture'
            : 'Major gap — schedule a dedicated review session',
    };
  }).sort((a, b) => a.mastery - b.mastery);
  const totalAttempts = conceptsArr.reduce((s, c) => s + c.attempts, 0);
  const totalCorrect = conceptsArr.reduce((s, c) => s + c.correct, 0);
  const overallMastery = totalAttempts > 0 ? totalCorrect / totalAttempts : 0;
  // Dark "Teach more of these" callout is the primary surface in the
  // redesign — expanded to 8 concepts so the prof sees their whole
  // teaching priority list in one block, each one expandable inline
  // with the analytical breakdown.
  const teachMoreOf = conceptsArr.filter(c => c.mastery < 0.65 && c.attempts >= 2).slice(0, 8);
  const conceptsTrimmed = conceptsArr.slice(0, 10);
  return {
    overallMastery,
    totalAttempts,
    totalCorrect,
    quizCount: DEMO_QUIZZES.length,
    testCount: 1,
    studentCount: STUDENT_COUNT,
    concepts: conceptsTrimmed,
    teachMoreOf,
  };
}

function buildFakeStudyInsights() {
  // Persona distribution matching DEMO_STUDENTS.
  const PERSONA_COUNT = {
    topper: 5, allrounder: 20, struggling_cvp: 10, struggling_npv: 8, struggling_variance: 7,
  };
  const studyByConcept = new Map();
  for (const [persona, count] of Object.entries(PERSONA_COUNT)) {
    const deckSpecs = DEMO_FLASHCARD_DECKS[persona] || [];
    for (const spec of deckSpecs) {
      for (const concept of spec.concepts) {
        let bucket = studyByConcept.get(concept);
        if (!bucket) { bucket = { concept, deckCount: 0, cardCount: 0, studentSet: new Set() }; studyByConcept.set(concept, bucket); }
        bucket.deckCount += count;
        bucket.cardCount += count * 4; // avg ~4 cards per concept per deck
        // Each persona group represents `count` distinct students.
        for (let i = 0; i < count; i++) bucket.studentSet.add(`${persona}-${i}`);
      }
    }
  }
  const studyConcepts = [...studyByConcept.values()]
    .map(b => ({ concept: b.concept, deckCount: b.deckCount, cardCount: b.cardCount, studentCount: Math.min(50, b.studentSet.size) }))
    .sort((a, b) => b.deckCount - a.deckCount)
    .slice(0, 5); // top 5 concepts students are studying — focused, scannable
  return {
    totalDecks: studyConcepts.reduce((s, c) => s + c.deckCount, 0),
    studyConcepts,
  };
}

function buildFakeCourseInsights() {
  // ── 7-day pulse strip — shape matches what InsightPulseStrip expects:
  //    { day: 'Sun', questions: N }. 7 days exactly; component falls
  //    back to flat zeros if length is wrong, which is the bug we saw.
  //    Pattern: builds across the week, big spike Thursday (pre-exam),
  //    quiet Saturday.
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const PULSE_QUESTIONS = [18, 24, 31, 27, 56, 38, 22];
  const dailyActivity = DAYS.map((day, i) => ({ day, questions: PULSE_QUESTIONS[i] }));
  const weekQuestions  = PULSE_QUESTIONS.reduce((s, n) => s + n, 0);
  // Total includes earlier weeks too — bigger number for the headline.
  const totalQuestions = weekQuestions + 154;

  // ── Time saved — each chat question = ~5 minutes of office hours / TA
  //    time the professor or staff didn't have to spend. Real metric a
  //    prof can quote on the demo.
  const timeSavedMins = totalQuestions * 5;
  const timeSavedHours = Math.floor(timeSavedMins / 60);
  const timeSavedMinutes = timeSavedMins % 60;

  // ── Peak study time — derived for verisimilitude. "Sun 9pm" is a
  //    classic college pattern (Sunday night cramming) — believable.
  const peakHourLabel = 'Sun 9pm';

  // ── Topic Ledger — 4 focused topics, each clearly tied to a concept
  //    in the Concept Mastery section so the demo flow is "they're
  //    ASKING about Variance Analysis AND missing it in quizzes."
  const topTopics = [
    { topic: 'Variance Analysis',    count: 64 },
    { topic: 'Net Present Value',    count: 47 },
    { topic: 'Operating Leverage',   count: 38 },
    { topic: 'Contribution Margin',  count: 24 },
  ];

  return {
    totalQuestions,
    weekQuestions,
    timeSavedHours,
    timeSavedMinutes,
    timeSavedMins,
    topTopics,
    peakHourLabel,
    dailyActivity,
    flagged: [],   // user said "no need for recent questions" — leave empty
    recent:  [],
    lastQuestion: null,
  };
}

app.get('/course/:courseId/concept-insights', requireAuth, requireCourseOwner, async (req, res) => {
  const { courseId } = req.params;
  // ⚠️ DEMO MODE — always returns synthetic 50-student data so the
  // Insights page is fully populated for the Tuesday demo regardless of
  // any real activity in the course.
  //
  // ───────────────────────────────────────────────────────────────────
  // 🔧 TO SWITCH TO REAL DATA (post-demo):
  //   Delete the `return` line directly below this comment block.
  //   The aggregation code below is unchanged production logic — it
  //   will start computing mastery from real student attempts the moment
  //   this early-return is removed.
  // ───────────────────────────────────────────────────────────────────
  return res.json(buildFakeConceptInsights());

  // Pull both quizzes and tests in parallel — same data shape, same aggregation.
  const [quizzesRes, testsRes] = await Promise.all([
    supabase.from('quizzes').select('id, student_id, topic, questions, last_score, attempts, created_at').eq('course_id', courseId),
    supabase.from('tests').select('id, student_id, topic, questions, last_score, attempts, created_at').eq('course_id', courseId),
  ]);
  const all = [...(quizzesRes.data || []), ...(testsRes.data || [])];

  // Collect every (concept, question text, correctIndex, optionsCount) once.
  // Each question key = `${concept}::${question}` so identical questions
  // reused across multiple students aggregate together.
  // concept → { concept, attempts, correct, questions: Map<qKey, {text, correctIndex, options, attempts, correct, wrongCounts[]}>, students: Map<studentId, {attempted, correct}> }
  const concepts = new Map();
  // Per-student aggregate across the whole course so the UI can rank
  // who's struggling overall — not just on one concept.
  const studentTotals = new Map();
  const struggleStudentIds = new Set();

  for (const row of all) {
    if (!Array.isArray(row.questions)) continue;
    for (let i = 0; i < row.questions.length; i++) {
      const q = row.questions[i] || {};
      if (typeof q.selected !== 'number' || q.selected < 0) continue; // not answered yet
      // Concept fallback hierarchy: explicit concept → quiz/test topic →
      // "Uncategorized". Aggregation still works even when concept tagging
      // hasn't propagated to all questions (old data, model misses).
      const concept = (q.concept && q.concept.trim()) || row.topic || 'Uncategorized';
      const isCorrect = q.selected === q.correct;
      let bucket = concepts.get(concept);
      if (!bucket) {
        bucket = { concept, attempts: 0, correct: 0, questions: new Map(), studentTotals: new Map() };
        concepts.set(concept, bucket);
      }
      bucket.attempts += 1;
      if (isCorrect) bucket.correct += 1;
      // Per-student inside this concept.
      const studPrev = bucket.studentTotals.get(row.student_id) || { attempted: 0, correct: 0 };
      studPrev.attempted += 1;
      if (isCorrect) studPrev.correct += 1;
      bucket.studentTotals.set(row.student_id, studPrev);
      // Per-question detail.
      const qKey = `${q.question || `q${i}`}`.slice(0, 280);
      let qb = bucket.questions.get(qKey);
      if (!qb) {
        qb = {
          text: q.question || `Question ${i + 1}`,
          options: Array.isArray(q.options) ? q.options : [],
          correctIndex: typeof q.correct === 'number' ? q.correct : 0,
          explanation: q.explanation || '',
          attempts: 0,
          correct: 0,
          wrongCounts: {}, // optionIndex → count
        };
        bucket.questions.set(qKey, qb);
      }
      qb.attempts += 1;
      if (isCorrect) qb.correct += 1;
      else qb.wrongCounts[q.selected] = (qb.wrongCounts[q.selected] || 0) + 1;
      // Track every student that touched any question — populates struggleStudentIds list below.
      struggleStudentIds.add(row.student_id);
      const stTotal = studentTotals.get(row.student_id) || { attempted: 0, correct: 0 };
      stTotal.attempted += 1;
      if (isCorrect) stTotal.correct += 1;
      studentTotals.set(row.student_id, stTotal);
    }
  }

  // Shape the response. Anonymized — professors see what students got
  // right/wrong and aggregate patterns; never individual identities.
  // Concepts ranked by mastery ASC so the worst stuff is on top.
  const conceptsArr = [...concepts.values()].map(b => {
    const mastery = b.attempts > 0 ? b.correct / b.attempts : 0;
    // Count students at each mastery tier within this concept.
    let strugglingStudents = 0, mixedStudents = 0, masteredStudents = 0;
    for (const [, s] of b.studentTotals.entries()) {
      const stMastery = s.attempted > 0 ? s.correct / s.attempted : 0;
      if (stMastery < 0.5) strugglingStudents += 1;
      else if (stMastery < 0.8) mixedStudents += 1;
      else masteredStudents += 1;
    }
    const questionsArr = [...b.questions.values()].map(q => {
      const qMastery = q.attempts > 0 ? q.correct / q.attempts : 0;
      // Full answer distribution — % who picked each option. Drives the
      // mini-bar chart in the drilldown UI.
      const totalAttemptsForQ = q.attempts;
      const distribution = (Array.isArray(q.options) ? q.options : []).map((opt, oi) => {
        const correctCount = oi === q.correctIndex ? q.correct : 0;
        const wrongCount = q.wrongCounts[oi] || 0;
        const total = correctCount + wrongCount;
        return {
          optionIndex: oi,
          optionText: opt,
          count: total,
          pct: totalAttemptsForQ > 0 ? total / totalAttemptsForQ : 0,
          isCorrect: oi === q.correctIndex,
        };
      });
      const wrongEntries = Object.entries(q.wrongCounts).map(([oi, c]) => ({ optionIndex: parseInt(oi, 10), count: c }));
      wrongEntries.sort((a, b) => b.count - a.count);
      return {
        text: q.text,
        options: q.options,
        correctIndex: q.correctIndex,
        explanation: q.explanation,
        attempts: q.attempts,
        correct: q.correct,
        mastery: qMastery,
        topWrongOption: wrongEntries[0] || null,
        wrongDistribution: wrongEntries,
        distribution,
      };
    }).sort((a, b) => a.mastery - b.mastery);
    return {
      concept: b.concept,
      attempts: b.attempts,
      correct: b.correct,
      mastery,
      studentCount: b.studentTotals.size,
      strugglingStudents,
      mixedStudents,
      masteredStudents,
      questions: questionsArr,
      action: mastery >= 0.85
        ? 'On track — no reinforcement needed'
        : mastery >= 0.65
          ? 'Mixed — quick recap will help'
          : mastery >= 0.40
            ? 'Concept needs a re-explanation in the next lecture'
            : 'Major gap — schedule a dedicated review session',
    };
  }).sort((a, b) => a.mastery - b.mastery);

  // Top-line numbers for the dashboard header.
  const totalAttempts = conceptsArr.reduce((s, c) => s + c.attempts, 0);
  const totalCorrect = conceptsArr.reduce((s, c) => s + c.correct, 0);
  const overallMastery = totalAttempts > 0 ? totalCorrect / totalAttempts : 0;
  const teachMoreOf = conceptsArr.filter(c => c.mastery < 0.65 && c.attempts >= 2).slice(0, 5);

  // No real student data yet → render the page with synthetic
  // 50-student class data so demos look populated. Real data overrides
  // this the moment any quiz/test gets submitted.
  if (conceptsArr.length === 0) {
    return res.json(buildFakeConceptInsights());
  }

  res.json({
    overallMastery,
    totalAttempts,
    totalCorrect,
    quizCount: (quizzesRes.data || []).length,
    testCount: (testsRes.data || []).length,
    studentCount: struggleStudentIds.size,
    concepts: conceptsArr,
    teachMoreOf,
  });
});

// What students are STUDYING — flashcard activity rolled up by concept.
// Each deck has a list of cards; we infer concepts by scanning card text
// against the question concepts we already know about. The Insights page
// shows the top concepts students are voluntarily making cards on — a
// strong signal of where they think THEY need help (which we can then
// cross-reference with quiz mastery for the real teaching priority).
app.get('/course/:courseId/study-insights', requireAuth, requireCourseOwner, async (req, res) => {
  const { courseId } = req.params;
  // ⚠️ DEMO MODE — same pattern as /concept-insights. Always returns
  // the fake "Self-study signal" data so the flashcard cross-reference
  // section is populated alongside the concept ledger. Delete the
  // return line below to switch back to real flashcard aggregation.
  return res.json(buildFakeStudyInsights());
  const { data: decks } = await supabase.from('flashcard_decks')
    .select('id, student_id, topic, cards, created_at')
    .eq('course_id', courseId);
  // Pull all distinct concepts the course's quizzes know about so we
  // can match flashcards against them. Without this we'd just bucket
  // by deck topic, which is noisier.
  const { data: quizzes } = await supabase.from('quizzes')
    .select('questions').eq('course_id', courseId);
  const knownConcepts = new Set();
  for (const q of quizzes || []) {
    if (Array.isArray(q.questions)) for (const item of q.questions) if (item?.concept) knownConcepts.add(item.concept);
  }
  // concept → { concept, deckCount, cardCount, studentIds: Set }
  const conceptStudy = new Map();
  for (const deck of decks || []) {
    const cards = Array.isArray(deck.cards) ? deck.cards : [];
    const cardText = (deck.topic || '') + ' ' + cards.map(c => `${c.front || ''} ${c.back || ''}`).join(' ');
    const cardTextLower = cardText.toLowerCase();
    for (const concept of knownConcepts) {
      if (cardTextLower.includes(concept.toLowerCase())) {
        let bucket = conceptStudy.get(concept);
        if (!bucket) { bucket = { concept, deckCount: 0, cardCount: 0, studentIds: new Set() }; conceptStudy.set(concept, bucket); }
        bucket.deckCount += 1;
        bucket.cardCount += cards.length;
        bucket.studentIds.add(deck.student_id);
      }
    }
  }
  const studyArr = [...conceptStudy.values()]
    .map(b => ({ concept: b.concept, deckCount: b.deckCount, cardCount: b.cardCount, studentCount: b.studentIds.size }))
    .sort((a, b) => b.deckCount - a.deckCount)
    .slice(0, 12);
  // No real flashcard activity yet → return fake 50-student class data
  // so the Self-study signal section populates for demos.
  if (studyArr.length === 0) {
    return res.json(buildFakeStudyInsights());
  }
  res.json({
    totalDecks: (decks || []).length,
    studyConcepts: studyArr,
  });
});

// ── Demo seeding for the Insights Concept Mastery section ────────────────────
// One-call setup for demos: creates 5 synthetic students + 3 realistic
// accounting quizzes with concept tags + embedded responses calibrated to
// show clear teaching priorities when the dashboard loads.
//
// Calibration intentionally varied so the demo isn't flat:
//   - "Break-even Point", "Contribution Margin"   → ~85-90% mastery (On track)
//   - "Contribution Margin Ratio", "Target Profit" → ~60% mastery (Mixed)
//   - "Net Present Value", "IRR"                  → ~40% mastery (Reinforce)
//   - "Flexible Budget Variance"                  → ~25% mastery (Major gap)
// Each student also has a skill multiplier so individual rows differ
// (Maya breezes through, Taylor struggles, others land in between).
//
// Owner-only. Safe to call multiple times — synthetic students are looked
// up by email and reused; demo quizzes carry a [DEMO] marker on the topic
// so they can be wiped with /seed-demo-concepts DELETE.
// 50-student class with persona distribution shaped to look like a real
// undergraduate accounting section: 5 toppers, 20 allrounders, 25 split
// across three struggle areas. Skill multiplier drives per-question
// correctness; persona drives WHICH concepts they ask about and which
// flashcard decks they make. Generated from first/last name pools so the
// dashboard reads "real class of 50" without hardcoding 50 entries.
const DEMO_FIRST = ['Alex','Maya','Jordan','Sam','Taylor','Liam','Priya','Noah','Olivia','Devon','Sofia','Ethan','Aaliyah','Wei','Fatima','Mia','Lucas','Zara','Carter','Imani','Ryan','Avery','Kai','Nina','Eli','Layla','Jaylen','Sienna','Owen','Aanya','Mason','Ruby','Caleb','Hana','Felix','Tariq','Ana','Jamal','Eve','Marcus','Kira','Theo','Sana','Ravi','Cora','Brooks','Daria','Quinn','Yusef','Esme'];
const DEMO_LAST  = ['Chen','Patel','Williams','Rodriguez','Kim','OSullivan','Mehta','Park','Brown','Harris','Martinez','Murphy','Thompson','Zhang','Ahmed','Singh','Nguyen','Garcia','Davis','Kumar','Hassan','Lopez','Khan','Wright','Tanaka','Adebayo','Cohen','Yang','Rivera','Bell','Anderson','Reyes','Russo','Sharma','Walker','Lin','Bauer','Iqbal','Knight','Diaz','Goldberg','Ortiz','Powell','Foster','Mitchell','Choi','Cooper','Robinson','Mendoza','OConnor'];
const PERSONA_PLAN = [
  ...Array(5).fill('topper'),               // 10% — coasts through everything
  ...Array(20).fill('allrounder'),          // 40% — average, mixed
  ...Array(10).fill('struggling_cvp'),      // 20% — CVP pain area
  ...Array(8).fill('struggling_npv'),       // 16% — capital budgeting pain area
  ...Array(7).fill('struggling_variance'),  // 14% — variance analysis pain area
];
const SKILL_BAND = {
  topper:               { base: 0.90, spread: 0.08 },
  allrounder:           { base: 0.65, spread: 0.22 },
  struggling_cvp:       { base: 0.45, spread: 0.18 },
  struggling_npv:       { base: 0.40, spread: 0.18 },
  struggling_variance:  { base: 0.40, spread: 0.20 },
};
const DEMO_STUDENTS = PERSONA_PLAN.map((persona, i) => {
  const first = DEMO_FIRST[i % DEMO_FIRST.length];
  const last  = DEMO_LAST[(i * 7) % DEMO_LAST.length];
  const handle = `${first}.${last}`.toLowerCase().replace(/[^a-z.]/g, '');
  const band = SKILL_BAND[persona];
  // Deterministic skill: function of index so the same student always
  // gets the same skill across server restarts (so insights look stable).
  const skillJitter = ((i * 13 + 7) % 100) / 100;
  return {
    email: `${handle}+demo${i}@scholr.study`,
    name: `${first} ${last.replace(/^O/, "O'")}`,
    skill: Math.max(0.20, Math.min(0.98, band.base + (skillJitter - 0.5) * band.spread)),
    persona,
  };
});

// Chat questions students realistically ask, themed by struggle area.
// Each persona drops 3-4 of these into the questions table so the Topic
// Ledger + concept-cross-reference can correlate "what they're asking"
// with "what they're missing."
const DEMO_CHAT_QUESTIONS = {
  topper: [
    'How would the CVP formula change for a multi-product mix?',
    'When is it appropriate to use IRR over NPV for ranking projects?',
    'How does activity-based costing improve on job-order costing for overhead allocation?',
    'What\'s the intuition behind the materials quantity variance?',
    'Can you explain how operating leverage interacts with margin of safety?',
    'When does profitability index beat NPV for project ranking?',
  ],
  allrounder: [
    'Can you walk me through a contribution margin example with target profit?',
    'What\'s the difference between contribution margin and gross margin?',
    'How do I solve a break-even problem with multiple products?',
    'When do I use NPV vs payback period in a real decision?',
    'What\'s on the midterm exam?',
    'Can you explain the difference between job-order and process costing with an example?',
    'How does the high-low method work?',
    'What\'s the discount rate I should use for NPV problems on the exam?',
  ],
  struggling_cvp: [
    'I keep getting break-even wrong — can you walk me through it slowly?',
    'What\'s the difference between contribution margin and contribution margin ratio?',
    'How do I find target profit units when CM ratio is given instead of CM per unit?',
    'Can you explain the CVP graph again? I don\'t understand the axes.',
    'What does "margin of safety" actually mean in plain English?',
    'I don\'t understand operating leverage at all. Help?',
    'What\'s the difference between margin of safety in dollars and as a percentage?',
  ],
  struggling_npv: [
    'What does discount rate actually mean and where does it come from?',
    'I\'m totally lost on NPV. Can you start from scratch?',
    'How is IRR different from NPV? Aren\'t they the same?',
    'Why do we reject a project with negative NPV?',
    'Can you do a worked example of NPV step by step?',
    'What\'s the profitability index and how is it different from NPV?',
    'When would discounted payback give a different answer than regular payback?',
    'How do I find the discount rate if it\'s not given?',
  ],
  struggling_variance: [
    'What\'s the difference between flexible budget and static budget?',
    'I don\'t get when a variance is favorable vs unfavorable.',
    'Can you explain standard cost vs actual cost in an example?',
    'How do you calculate the materials price variance?',
    'What does the flexible budget variance actually tell me?',
    'What\'s the difference between direct labor rate variance and efficiency variance?',
    'I\'m confused about variable overhead spending vs efficiency variance.',
    'How does fixed overhead volume variance work?',
  ],
};

// Flashcard deck topics by persona — students make decks on what they
// THINK they need to study. Struggle personas cluster decks on their
// pain area (the cross-signal: they KNOW they're weak there).
const DEMO_FLASHCARD_DECKS = {
  topper: [
    { topic: 'Multi-Product CVP — Edge Cases', concepts: ['Contribution Margin Ratio', 'Target Profit', 'Operating Leverage'] },
    { topic: 'Capital Budgeting — Ranking Projects', concepts: ['Net Present Value', 'Internal Rate of Return', 'Profitability Index'] },
    { topic: 'Advanced Variance Decomposition', concepts: ['Variable Overhead Variance', 'Fixed Overhead Variance'] },
  ],
  allrounder: [
    { topic: 'CVP Formulas Cheat Sheet', concepts: ['Break-even Point', 'Contribution Margin', 'Contribution Margin Ratio', 'Margin of Safety'] },
    { topic: 'Capital Budgeting Basics', concepts: ['Net Present Value', 'Payback Period', 'Discount Rate'] },
    { topic: 'Cost Behavior Review', concepts: ['Fixed Costs', 'Variable Costs', 'Mixed Costs'] },
    { topic: 'Midterm Review', concepts: ['Break-even Point', 'Net Present Value', 'Standard Cost Variance', 'Job Order Costing'] },
  ],
  struggling_cvp: [
    { topic: 'Break-Even Problems I Keep Missing', concepts: ['Break-even Point', 'Contribution Margin'] },
    { topic: 'CM vs CM Ratio Drill', concepts: ['Contribution Margin', 'Contribution Margin Ratio'] },
    { topic: 'Target Profit Practice', concepts: ['Target Profit', 'Margin of Safety'] },
    { topic: 'Operating Leverage — Help', concepts: ['Operating Leverage', 'Contribution Margin'] },
  ],
  struggling_npv: [
    { topic: 'NPV from Scratch', concepts: ['Net Present Value', 'Discount Rate'] },
    { topic: 'IRR and Discount Rates', concepts: ['Internal Rate of Return', 'Net Present Value'] },
    { topic: 'Capital Budgeting Vocab', concepts: ['Net Present Value', 'Internal Rate of Return', 'Payback Period', 'Discounted Payback'] },
    { topic: 'Profitability Index Drill', concepts: ['Profitability Index', 'Net Present Value'] },
  ],
  struggling_variance: [
    { topic: 'Variance Analysis Step by Step', concepts: ['Flexible Budget Variance', 'Standard Cost Variance'] },
    { topic: 'Favorable vs Unfavorable Drill', concepts: ['Standard Cost Variance', 'Direct Materials Variance'] },
    { topic: 'Materials Variance Worked Examples', concepts: ['Direct Materials Variance', 'Direct Labor Variance'] },
    { topic: 'Overhead Variance Bootcamp', concepts: ['Variable Overhead Variance', 'Fixed Overhead Variance'] },
  ],
};

// Flashcard card pool by concept — what would land on a real student's
// flashcard if they were trying to memorize it.
const DEMO_FLASHCARD_CARDS = {
  'Break-even Point': [
    { front: 'Break-even Point (units) formula', back: 'Fixed Costs / Contribution Margin per Unit' },
    { front: 'Break-even Point (sales dollars) formula', back: 'Fixed Costs / Contribution Margin Ratio' },
    { front: 'What does break-even point represent?', back: 'The level of sales at which total revenues equal total costs — zero profit, zero loss.' },
  ],
  'Contribution Margin': [
    { front: 'Contribution Margin formula', back: 'Sales − Variable Costs' },
    { front: 'CM per unit formula', back: 'Selling Price per Unit − Variable Cost per Unit' },
    { front: 'Why is CM (not gross margin) used for break-even?', back: 'CM isolates variable cost behavior, which is what changes with volume — gross margin includes fixed cost of goods sold.' },
  ],
  'Contribution Margin Ratio': [
    { front: 'CM Ratio formula', back: 'Contribution Margin / Sales (or CM per unit / Selling Price per unit)' },
    { front: 'CM Ratio interpretation', back: 'The fraction of each sales dollar that contributes to fixed costs and profit.' },
  ],
  'Target Profit': [
    { front: 'Target Profit Units formula', back: '(Fixed Costs + Target Profit) / CM per Unit' },
    { front: 'Target Profit Sales Dollars formula', back: '(Fixed Costs + Target Profit) / CM Ratio' },
  ],
  'Net Present Value': [
    { front: 'NPV formula', back: 'Σ (Cash Flows / (1 + r)^t) − Initial Investment' },
    { front: 'NPV decision rule', back: 'Accept if NPV ≥ 0, reject if NPV < 0.' },
    { front: 'What does the discount rate represent?', back: 'The required rate of return / cost of capital used to translate future cash flows to today\'s dollars.' },
  ],
  'Internal Rate of Return': [
    { front: 'IRR definition', back: 'The discount rate at which NPV equals zero.' },
    { front: 'IRR decision rule', back: 'Accept if IRR ≥ required rate of return; reject otherwise.' },
  ],
  'Payback Period': [
    { front: 'Payback Period formula', back: 'Initial Investment / Annual Cash Inflow' },
    { front: 'Main weakness of payback', back: 'Ignores cash flows after payback AND ignores time value of money.' },
  ],
  'Flexible Budget Variance': [
    { front: 'Flexible budget variance formula', back: 'Actual Results − Flexible Budget (at actual activity level)' },
    { front: 'Why use a flexible budget vs static?', back: 'A flexible budget adjusts for actual activity, so variances reveal cost-control issues rather than just volume differences.' },
  ],
  'Standard Cost Variance': [
    { front: 'Standard cost variance formula', back: 'Actual Cost − Standard Cost' },
    { front: 'Favorable variance meaning', back: 'For costs: actual was LESS than standard. For revenues: actual was MORE than expected.' },
  ],
  'Direct Materials Variance': [
    { front: 'Materials price variance', back: '(Actual Price − Standard Price) × Actual Quantity' },
    { front: 'Materials quantity variance', back: '(Actual Quantity − Standard Quantity) × Standard Price' },
  ],
  'Margin of Safety': [
    { front: 'Margin of Safety formula', back: 'Actual Sales − Break-even Sales' },
    { front: 'Margin of Safety percentage', back: '(Margin of Safety / Actual Sales) × 100%' },
    { front: 'Why does Margin of Safety matter?', back: 'It shows how much sales can drop before the company hits break-even — the cushion against loss.' },
  ],
  'Operating Leverage': [
    { front: 'Degree of Operating Leverage', back: 'Contribution Margin / Net Operating Income' },
    { front: 'High DOL means…', back: 'A small % change in sales causes a much larger % change in operating income.' },
  ],
  'Discount Rate': [
    { front: 'What does the discount rate represent?', back: 'The required rate of return — opportunity cost of capital, often the WACC, adjusted for project risk.' },
    { front: 'Discount rate effect on NPV', back: 'Higher rate → lower NPV. Lower rate → higher NPV.' },
  ],
  'Discounted Payback': [
    { front: 'Discounted payback definition', back: 'The time required for the PRESENT VALUE of cumulative cash inflows to equal the initial investment.' },
    { front: 'Discounted payback vs payback', back: 'Both stop counting after recovery, but discounted payback applies the discount rate to each year\'s cash flow first.' },
  ],
  'Profitability Index': [
    { front: 'Profitability Index formula', back: 'PV of future cash inflows / Initial Investment' },
    { front: 'PI decision rule', back: 'Accept if PI ≥ 1; reject if PI < 1. Useful for ranking projects under capital rationing.' },
  ],
  'Direct Labor Variance': [
    { front: 'Direct labor rate variance', back: '(Actual Rate − Standard Rate) × Actual Hours' },
    { front: 'Direct labor efficiency variance', back: '(Actual Hours − Standard Hours Allowed) × Standard Rate' },
  ],
  'Variable Overhead Variance': [
    { front: 'Variable OH spending variance', back: '(Actual Rate − Standard Rate) × Actual Hours' },
    { front: 'Variable OH efficiency variance', back: '(Actual Hours − Standard Hours) × Standard Rate' },
  ],
  'Fixed Overhead Variance': [
    { front: 'Fixed OH budget variance', back: 'Actual Fixed OH − Budgeted Fixed OH' },
    { front: 'Fixed OH volume variance', back: 'Budgeted Fixed OH − (Standard Hours × Predetermined Fixed OH Rate)' },
  ],
  'Fixed Costs': [
    { front: 'Fixed cost behavior — total', back: 'Total fixed cost is constant within the relevant range, regardless of activity.' },
    { front: 'Fixed cost behavior — per unit', back: 'Per-unit fixed cost DECREASES as activity increases (spread over more units).' },
  ],
  'Variable Costs': [
    { front: 'Variable cost behavior — total', back: 'Total variable cost CHANGES proportionally with activity level.' },
    { front: 'Variable cost behavior — per unit', back: 'Per-unit variable cost is CONSTANT within the relevant range.' },
  ],
  'Mixed Costs': [
    { front: 'Mixed cost formula', back: 'Y = a + bX, where a = fixed component, b = variable rate per unit of activity, X = activity level.' },
    { front: 'High-low method', back: 'Variable rate = (High cost − Low cost) / (High activity − Low activity). Then solve for fixed component.' },
  ],
  'Job Order Costing': [
    { front: 'When to use job-order costing', back: 'Custom or batch production where each job/order is distinct — construction, custom furniture, consulting jobs.' },
    { front: 'Predetermined overhead rate', back: 'Estimated total overhead / Estimated allocation base. Set BEFORE the period; applied as jobs are worked on.' },
  ],
  'Process Costing': [
    { front: 'When to use process costing', back: 'Continuous production of homogeneous units — refining, chemicals, food production.' },
    { front: 'Equivalent units', back: 'Work done on partially completed units expressed in terms of completed-unit equivalents.' },
  ],
  'Activity-Based Costing': [
    { front: 'ABC vs traditional costing', back: 'ABC uses multiple activity cost drivers (setups, inspections, machine hours) rather than a single allocation base — more accurate for complex overhead.' },
    { front: 'When does ABC matter most?', back: 'When products consume overhead resources very differently, or when overhead is large relative to direct costs.' },
  ],
};

// Realistic accounting questions tagged with the named concept they test.
// Concepts are NAMED IDEAS — never "General", never "Module 1". Each
// question lists 4 options with the correct index marked.
// Four quizzes covering 18+ named accounting concepts. Target mastery is
// the CLASS-LEVEL hit rate the seed aims for on each concept — varied so
// the dashboard shows on-track concepts (Cost Behavior basics), mixed
// concepts (CM Ratio), and clear teaching priorities (NPV, Variance,
// Operating Leverage). Per-student outcome is target × student.skill.
const DEMO_QUIZZES = [
  {
    topic: '[DEMO] Module 1 · Cost-Volume-Profit',
    targetMastery: {
      'Break-even Point': 0.90, 'Contribution Margin': 0.88, 'Contribution Margin Ratio': 0.62,
      'Target Profit': 0.55, 'Margin of Safety': 0.50, 'Operating Leverage': 0.42,
    },
    questions: [
      { concept: 'Break-even Point', q: 'Fixed Costs are $40,000. Selling Price per Unit is $25. Variable Cost per Unit is $15. What is the break-even point in units?',
        options: ['A) 1,600 units', 'B) 2,500 units', 'C) 4,000 units', 'D) 6,000 units'], correct: 2,
        explanation: 'Break-even units = Fixed Costs / (Selling Price − Variable Cost) = 40,000 / (25 − 15) = 4,000.' },
      { concept: 'Break-even Point', q: 'A company has fixed costs of $120,000 and a contribution margin per unit of $30. What is its break-even point in units?',
        options: ['A) 3,000', 'B) 4,000', 'C) 6,000', 'D) 12,000'], correct: 1,
        explanation: '120,000 / 30 = 4,000 units.' },
      { concept: 'Contribution Margin', q: 'Sales total $200,000 and variable costs total $80,000. What is total contribution margin?',
        options: ['A) $80,000', 'B) $120,000', 'C) $200,000', 'D) $280,000'], correct: 1,
        explanation: 'CM = Sales − Variable Costs = 200,000 − 80,000 = 120,000.' },
      { concept: 'Contribution Margin', q: 'Selling price per unit is $50, variable cost per unit is $30. What is the contribution margin per unit?',
        options: ['A) $20', 'B) $30', 'C) $50', 'D) $80'], correct: 0,
        explanation: 'CM per unit = $50 − $30 = $20.' },
      { concept: 'Contribution Margin Ratio', q: 'Sales are $500,000 and contribution margin is $200,000. What is the contribution margin ratio?',
        options: ['A) 20%', 'B) 30%', 'C) 40%', 'D) 60%'], correct: 2,
        explanation: 'CM Ratio = CM / Sales = 200,000 / 500,000 = 40%.' },
      { concept: 'Contribution Margin Ratio', q: 'Selling price is $80, variable cost is $48. What is the CM ratio?',
        options: ['A) 25%', 'B) 40%', 'C) 48%', 'D) 60%'], correct: 1,
        explanation: 'CM Ratio = ($80 − $48) / $80 = 32/80 = 40%.' },
      { concept: 'Target Profit', q: 'Fixed Costs are $60,000. CM per unit is $20. The target profit is $20,000. How many units must be sold?',
        options: ['A) 3,000', 'B) 4,000', 'C) 5,000', 'D) 6,000'], correct: 1,
        explanation: '(60,000 + 20,000) / 20 = 4,000 units.' },
      { concept: 'Target Profit', q: 'Fixed Costs are $90,000, CM Ratio is 30%, target profit is $30,000. What sales dollars are needed?',
        options: ['A) $300,000', 'B) $360,000', 'C) $400,000', 'D) $420,000'], correct: 2,
        explanation: 'Sales = (90,000 + 30,000) / 0.30 = $400,000.' },
      { concept: 'Margin of Safety', q: 'Actual sales are $500,000 and break-even sales are $350,000. What is the margin of safety in dollars?',
        options: ['A) $150,000', 'B) $200,000', 'C) $350,000', 'D) $500,000'], correct: 0,
        explanation: 'MoS = Actual Sales − Break-even Sales = 500,000 − 350,000 = 150,000.' },
      { concept: 'Margin of Safety', q: 'Margin of safety percentage is calculated as:',
        options: ['A) (Margin of Safety / Break-even Sales) × 100', 'B) (Margin of Safety / Actual Sales) × 100', 'C) Margin of Safety / Fixed Costs', 'D) (Actual Sales − Variable Costs) / Sales'], correct: 1,
        explanation: 'MoS % = (Margin of Safety / Actual Sales) × 100.' },
      { concept: 'Operating Leverage', q: 'Operating Leverage is calculated as:',
        options: ['A) Contribution Margin / Net Operating Income', 'B) Net Operating Income / Sales', 'C) Fixed Costs / Variable Costs', 'D) Sales / Contribution Margin'], correct: 0,
        explanation: 'Degree of Operating Leverage = Contribution Margin / Net Operating Income.' },
      { concept: 'Operating Leverage', q: 'A high degree of operating leverage means:',
        options: ['A) The company has low fixed costs', 'B) Small changes in sales drive large changes in operating income', 'C) Variable costs equal fixed costs', 'D) Break-even point is very low'], correct: 1,
        explanation: 'High DOL = small revenue change amplifies into a big operating-income change.' },
    ],
  },
  {
    topic: '[DEMO] Module 2 · Capital Budgeting',
    targetMastery: {
      'Net Present Value': 0.42, 'Internal Rate of Return': 0.32, 'Payback Period': 0.78,
      'Discounted Payback': 0.45, 'Profitability Index': 0.38, 'Discount Rate': 0.55,
    },
    questions: [
      { concept: 'Net Present Value', q: 'An investment of $50,000 generates $20,000 per year for 3 years. With a discount rate of 10%, what is the approximate NPV?',
        options: ['A) −$300', 'B) $0', 'C) $10,000', 'D) $4,700'], correct: 0,
        explanation: 'PV of cash flows ≈ 49,737. NPV = 49,737 − 50,000 = −$263, closest to −$300.' },
      { concept: 'Net Present Value', q: 'If NPV is negative, the project should be:',
        options: ['A) Accepted', 'B) Rejected', 'C) Deferred', 'D) Re-evaluated at a lower rate'], correct: 1,
        explanation: 'A negative NPV means the project earns less than the required rate — reject.' },
      { concept: 'Net Present Value', q: 'Increasing the discount rate causes a project\'s NPV to:',
        options: ['A) Increase', 'B) Decrease', 'C) Stay the same', 'D) Become undefined'], correct: 1,
        explanation: 'A higher discount rate decreases the PV of future cash flows, so NPV falls.' },
      { concept: 'Internal Rate of Return', q: 'IRR is the discount rate at which:',
        options: ['A) NPV is maximized', 'B) NPV equals zero', 'C) NPV equals initial investment', 'D) Payback equals project life'], correct: 1,
        explanation: 'IRR is by definition the discount rate where NPV = 0.' },
      { concept: 'Internal Rate of Return', q: 'A project has an IRR of 8%. If the required rate of return is 10%, you should:',
        options: ['A) Accept it', 'B) Reject it', 'C) Re-calculate using NPV', 'D) Defer the decision'], correct: 1,
        explanation: 'IRR (8%) < required rate (10%) → reject.' },
      { concept: 'Internal Rate of Return', q: 'A drawback of IRR when comparing two mutually-exclusive projects is that it:',
        options: ['A) Cannot be calculated when cash flows are negative', 'B) Can give a different ranking than NPV due to scale differences', 'C) Requires a positive discount rate', 'D) Always equals payback period'], correct: 1,
        explanation: 'IRR can rank a smaller project higher than NPV does — scale problem.' },
      { concept: 'Payback Period', q: 'A $40,000 investment returns $10,000 per year. What is the payback period?',
        options: ['A) 2 years', 'B) 3 years', 'C) 4 years', 'D) 5 years'], correct: 2,
        explanation: 'Payback = $40,000 / $10,000 = 4 years.' },
      { concept: 'Payback Period', q: 'A weakness of the payback period method is that it:',
        options: ['A) Is hard to calculate', 'B) Ignores cash flows after payback and the time value of money', 'C) Is only useful for long projects', 'D) Requires NPV inputs'], correct: 1,
        explanation: 'Classic critique: ignores post-payback flows + ignores time value of money.' },
      { concept: 'Discounted Payback', q: 'Discounted payback differs from regular payback because it:',
        options: ['A) Uses after-tax cash flows only', 'B) Discounts each year\'s cash flow before computing payback', 'C) Excludes the initial investment', 'D) Adds salvage value at the end'], correct: 1,
        explanation: 'Discounted payback applies the discount rate to each cash flow before summing.' },
      { concept: 'Profitability Index', q: 'Profitability Index is calculated as:',
        options: ['A) NPV / Initial Investment', 'B) PV of future cash flows / Initial Investment', 'C) NPV × IRR', 'D) Annual cash flow / Discount rate'], correct: 1,
        explanation: 'PI = PV of future cash inflows / Initial Investment. PI > 1 → accept.' },
      { concept: 'Profitability Index', q: 'When capital is rationed and projects must be ranked, the most useful metric is:',
        options: ['A) Payback period', 'B) Profitability Index', 'C) Accounting rate of return', 'D) Initial investment alone'], correct: 1,
        explanation: 'PI ranks projects by NPV per dollar invested — perfect for capital rationing.' },
      { concept: 'Discount Rate', q: 'The discount rate used in NPV typically reflects:',
        options: ['A) Inflation alone', 'B) The required rate of return / cost of capital', 'C) The risk-free rate', 'D) Average tax rate'], correct: 1,
        explanation: 'Discount rate = required rate of return or cost of capital adjusted for project risk.' },
    ],
  },
  {
    topic: '[DEMO] Module 3 · Variance Analysis',
    targetMastery: {
      'Flexible Budget Variance': 0.25, 'Standard Cost Variance': 0.48, 'Direct Materials Variance': 0.55,
      'Direct Labor Variance': 0.45, 'Variable Overhead Variance': 0.32, 'Fixed Overhead Variance': 0.30,
    },
    questions: [
      { concept: 'Flexible Budget Variance', q: 'The flexible budget variance is the difference between:',
        options: ['A) Static budget and actual results', 'B) Static budget and flexible budget', 'C) Flexible budget and actual results', 'D) Standard cost and actual cost'], correct: 2,
        explanation: 'Flexible budget variance = Actual Results − Flexible Budget at actual activity.' },
      { concept: 'Flexible Budget Variance', q: 'Actual sales were 12,000 units at $25. Flexible budget at 12,000 units showed sales of $312,000. What is the sales-price flexible-budget variance?',
        options: ['A) $12,000 Favorable', 'B) $12,000 Unfavorable', 'C) $24,000 Favorable', 'D) Zero'], correct: 1,
        explanation: 'Actual: 12,000 × $25 = $300,000. Flexible: $312,000. Variance = $12,000 Unfavorable.' },
      { concept: 'Flexible Budget Variance', q: 'A favorable flexible budget variance for variable costs indicates:',
        options: ['A) Actual variable costs exceeded the budget at actual activity', 'B) Actual variable costs were less than the budget at actual activity', 'C) The static budget was set too low', 'D) Sales volume increased'], correct: 1,
        explanation: 'Favorable variable cost variance = actual costs LESS than budgeted at the actual activity level.' },
      { concept: 'Standard Cost Variance', q: 'Standard cost variance is calculated as:',
        options: ['A) Standard cost minus actual cost', 'B) Actual cost minus standard cost', 'C) Standard cost minus budgeted cost', 'D) Budgeted cost minus actual cost'], correct: 1,
        explanation: 'Standard cost variance = Actual Cost − Standard Cost. Positive = Unfavorable.' },
      { concept: 'Standard Cost Variance', q: 'A favorable variance means:',
        options: ['A) Actual was higher than expected (good for revenue)', 'B) Actual was lower than expected (good for costs)', 'C) Actual equals budget', 'D) Variance was reversed'], correct: 1,
        explanation: 'Favorable for costs = actual LESS than expected. Favorable for revenue = actual MORE than expected.' },
      { concept: 'Direct Materials Variance', q: 'The materials price variance isolates the impact of:',
        options: ['A) Quantity used vs allowed', 'B) Price paid vs standard price', 'C) Yield from materials', 'D) Material substitution'], correct: 1,
        explanation: 'Price variance = (Actual Price − Standard Price) × Actual Quantity.' },
      { concept: 'Direct Materials Variance', q: 'Actual quantity used was 1,100 lbs at $5.20. Standard was 1,000 lbs at $5.00. What is the materials quantity variance?',
        options: ['A) $500 Unfavorable', 'B) $500 Favorable', 'C) $520 Unfavorable', 'D) $220 Unfavorable'], correct: 0,
        explanation: 'Quantity variance = (1,100 − 1,000) × $5.00 = $500 Unfavorable.' },
      { concept: 'Direct Labor Variance', q: 'Direct labor rate variance is calculated as:',
        options: ['A) (Actual Hours − Standard Hours) × Standard Rate', 'B) (Actual Rate − Standard Rate) × Actual Hours', 'C) (Standard Hours × Standard Rate) − Actual Cost', 'D) Actual Hours × Standard Rate'], correct: 1,
        explanation: 'Labor rate variance = (Actual Rate − Standard Rate) × Actual Hours.' },
      { concept: 'Direct Labor Variance', q: 'Direct labor efficiency variance measures:',
        options: ['A) Whether workers were paid the right wage', 'B) Whether workers used the planned number of hours', 'C) Total labor cost vs budget', 'D) Idle labor hours only'], correct: 1,
        explanation: 'Efficiency variance = (Actual Hours − Standard Hours Allowed) × Standard Rate.' },
      { concept: 'Variable Overhead Variance', q: 'Variable overhead spending variance is calculated using:',
        options: ['A) Actual hours and standard rate', 'B) Actual hours and actual rate vs standard rate', 'C) Standard hours and standard rate', 'D) Sales volume and overhead rate'], correct: 1,
        explanation: 'Spending variance = (Actual Rate − Standard Rate) × Actual Hours.' },
      { concept: 'Variable Overhead Variance', q: 'Variable overhead efficiency variance reflects:',
        options: ['A) Differences in overhead spending rate', 'B) Differences between actual and standard activity (hours)', 'C) Fixed overhead absorbed', 'D) Volume changes only'], correct: 1,
        explanation: 'Efficiency variance = (Actual Hours − Standard Hours) × Standard Rate.' },
      { concept: 'Fixed Overhead Variance', q: 'Fixed overhead budget variance is:',
        options: ['A) Actual fixed overhead − Budgeted fixed overhead', 'B) Standard cost − Actual cost', 'C) Applied overhead − Actual overhead', 'D) Standard hours × Predetermined rate'], correct: 0,
        explanation: 'Budget variance = Actual Fixed Overhead − Budgeted Fixed Overhead.' },
      { concept: 'Fixed Overhead Variance', q: 'Fixed overhead volume variance arises because:',
        options: ['A) Actual rate differs from standard rate', 'B) Actual activity differs from the activity used to compute the overhead rate', 'C) Workers are paid differently', 'D) Materials prices changed'], correct: 1,
        explanation: 'Volume variance compares applied overhead with budgeted overhead — driven by activity differences.' },
    ],
  },
  {
    topic: '[DEMO] Module 4 · Cost Behavior & Costing Methods',
    targetMastery: {
      'Fixed Costs': 0.92, 'Variable Costs': 0.94, 'Mixed Costs': 0.72,
      'Job Order Costing': 0.70, 'Process Costing': 0.55, 'Activity-Based Costing': 0.48,
    },
    questions: [
      { concept: 'Fixed Costs', q: 'A fixed cost behaves as follows when activity increases (within the relevant range):',
        options: ['A) Total cost increases', 'B) Total cost stays the same; per-unit cost decreases', 'C) Per-unit cost stays the same', 'D) Total cost decreases'], correct: 1,
        explanation: 'Total fixed cost is unchanged; spreading it across more units lowers per-unit cost.' },
      { concept: 'Fixed Costs', q: 'Which of the following is an example of a fixed cost?',
        options: ['A) Direct materials', 'B) Sales commissions', 'C) Annual factory rent', 'D) Hourly labor'], correct: 2,
        explanation: 'Rent is committed and does not vary with production volume.' },
      { concept: 'Variable Costs', q: 'Per-unit variable cost behaves how as activity increases (within the relevant range)?',
        options: ['A) Increases', 'B) Decreases', 'C) Remains constant', 'D) Becomes zero'], correct: 2,
        explanation: 'Per-unit variable cost is constant by definition; total variable cost scales with activity.' },
      { concept: 'Variable Costs', q: 'Which of the following is a variable cost?',
        options: ['A) Plant manager salary', 'B) Direct materials', 'C) Property tax', 'D) Depreciation on equipment'], correct: 1,
        explanation: 'Direct materials consumption scales 1:1 with units produced.' },
      { concept: 'Mixed Costs', q: 'A mixed cost contains:',
        options: ['A) Only fixed elements', 'B) Only variable elements', 'C) Both fixed and variable elements', 'D) Step-cost elements only'], correct: 2,
        explanation: 'Mixed cost = Fixed component + Variable component (e.g., Y = a + bX).' },
      { concept: 'Mixed Costs', q: 'The high-low method estimates the variable cost per unit by:',
        options: ['A) Averaging all observations', 'B) Dividing the change in cost by the change in activity between the highest and lowest activity points', 'C) Using regression analysis', 'D) Using the median observation'], correct: 1,
        explanation: 'High-low: variable rate = (cost at high − cost at low) / (activity at high − activity at low).' },
      { concept: 'Job Order Costing', q: 'Job-order costing is most appropriate when:',
        options: ['A) Products are identical and continuously produced', 'B) Each job or batch is distinct', 'C) There is no work-in-process inventory', 'D) Overhead is zero'], correct: 1,
        explanation: 'Job-order suits custom or batch production — distinct jobs each carry their own cost.' },
      { concept: 'Job Order Costing', q: 'In a job-order system, overhead is typically applied using a:',
        options: ['A) Predetermined overhead rate based on estimated activity', 'B) Direct trace to each job', 'C) Process-costing equivalent units', 'D) Standard cost only'], correct: 0,
        explanation: 'A predetermined rate is set at the start of the period and applied as activity occurs.' },
      { concept: 'Process Costing', q: 'Process costing is appropriate when:',
        options: ['A) Each unit is unique', 'B) Products are homogeneous and produced continuously', 'C) The firm does not use direct materials', 'D) Overhead is zero'], correct: 1,
        explanation: 'Process costing averages costs across many identical units — refining, food production, chemicals.' },
      { concept: 'Process Costing', q: 'In process costing, equivalent units of production reflect:',
        options: ['A) Completed units only', 'B) Partially completed units expressed as a fraction of completed units', 'C) Sold units only', 'D) Units transferred out plus rework'], correct: 1,
        explanation: 'Equivalent units account for work done on partially complete units in WIP.' },
      { concept: 'Activity-Based Costing', q: 'Activity-Based Costing (ABC) improves on traditional costing by:',
        options: ['A) Eliminating overhead', 'B) Assigning overhead based on multiple cost drivers rather than a single allocation base', 'C) Using direct labor hours as the only driver', 'D) Skipping overhead allocation entirely'], correct: 1,
        explanation: 'ABC uses multiple activity drivers (setups, inspections, machine hours) to assign overhead more accurately.' },
      { concept: 'Activity-Based Costing', q: 'A weakness of ABC is that it:',
        options: ['A) Always reports lower costs', 'B) Is more complex and costly to implement than traditional methods', 'C) Cannot be used in service industries', 'D) Ignores direct costs'], correct: 1,
        explanation: 'ABC requires identifying many cost pools and drivers — more accurate but more expensive.' },
    ],
  },
];

app.post('/course/:courseId/seed-demo-concepts', requireAuth, requireCourseOwner, async (req, res) => {
  const { courseId } = req.params;
  const summary = { studentsReady: 0, quizzesInserted: 0, testsInserted: 0, decksInserted: 0, questionsInserted: 0, errors: [] };

  // 1) Resolve every demo student to an auth user id.
  //    Critical perf fix: with 50 students we list all auth users ONCE
  //    (paginating across pages of 1,000), build an email→id map, then
  //    only call createUser for the ones genuinely missing. Previously
  //    this listed all users in a loop = 50× the network cost and
  //    enough latency to blow Render's 30s timeout.
  const emailToId = new Map();
  try {
    let page = 1;
    while (page <= 10) {
      const { data: list } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      const users = list?.users || [];
      for (const u of users) if (u.email) emailToId.set(u.email.toLowerCase(), u.id);
      if (users.length < 1000) break;
      page += 1;
    }
  } catch (e) { summary.errors.push(`listUsers: ${e?.message || e}`); }

  // Create missing auth users in parallel batches of 5. Auth admin has
  // per-second rate limits; small batches stay safely under them while
  // collapsing wall-clock time for 50 students from ~30s to ~6-8s.
  const missing = DEMO_STUDENTS.filter(s => !emailToId.has(s.email.toLowerCase()));
  const BATCH = 5;
  for (let i = 0; i < missing.length; i += BATCH) {
    const slice = missing.slice(i, i + BATCH);
    const created = await Promise.all(slice.map(async (s) => {
      try {
        const { data, error } = await supabase.auth.admin.createUser({
          email: s.email,
          password: `demo-${randomUUID().slice(0, 12)}!Q`,
          email_confirm: true,
          user_metadata: { name: s.name, is_demo: true },
        });
        if (error) throw error;
        return { email: s.email, id: data?.user?.id };
      } catch (e) {
        summary.errors.push(`Create ${s.email}: ${e?.message || e}`);
        return null;
      }
    }));
    for (const c of created) if (c?.id) emailToId.set(c.email.toLowerCase(), c.id);
  }

  // Upsert students rows + course enrollments in single batch operations.
  const resolved = []; // [{ studentId, name, skill, persona }]
  const studentRows = [];
  const enrollmentRows = [];
  for (const s of DEMO_STUDENTS) {
    const studentId = emailToId.get(s.email.toLowerCase());
    if (!studentId) continue;
    studentRows.push({ id: studentId, email: s.email, name: s.name });
    enrollmentRows.push({ course_id: courseId, student_id: studentId });
    resolved.push({ studentId, name: s.name, skill: s.skill, persona: s.persona });
  }
  if (studentRows.length > 0) {
    try {
      await supabase.from('students').upsert(studentRows, { onConflict: 'id' });
    } catch (e) { summary.errors.push(`students upsert: ${e?.message || e}`); }
  }
  if (enrollmentRows.length > 0) {
    try {
      await supabase.from('course_students').upsert(enrollmentRows, { onConflict: 'course_id,student_id' });
    } catch {} // soft-ignore — enrollment table may not exist
  }
  summary.studentsReady = resolved.length;

  // 2) Quiz rows — batched per-quiz so all 50 student attempts hit
  //    Supabase in ONE call instead of 50. Calibration: per-question
  //    probability = concept target × student skill, with intentional
  //    randomness so the data doesn't look hand-tuned.
  for (const quiz of DEMO_QUIZZES) {
    const rows = [];
    for (const stud of resolved) {
      const merged = quiz.questions.map(q => {
        const target = quiz.targetMastery[q.concept] ?? 0.65;
        const pCorrect = Math.max(0.05, Math.min(0.98, target * stud.skill * 1.05));
        const gotIt = Math.random() < pCorrect;
        let selected = q.correct;
        if (!gotIt) {
          const wrongs = [0, 1, 2, 3].filter(i => i !== q.correct);
          selected = wrongs[Math.floor(Math.random() * wrongs.length)];
        }
        return { question: q.q, options: q.options, correct: q.correct, concept: q.concept, explanation: q.explanation, selected };
      });
      const right = merged.filter(q => q.selected === q.correct).length;
      rows.push({
        student_id: stud.studentId,
        course_id: courseId,
        topic: quiz.topic,
        questions: merged,
        last_score: right,
        best_score: right,
        attempts: 1,
      });
    }
    try {
      const { error } = await supabase.from('quizzes').insert(rows);
      if (error) throw error;
      summary.quizzesInserted += rows.length;
    } catch (e) {
      summary.errors.push(`Quiz "${quiz.topic}" batch: ${e?.message || e}`);
    }
  }

  // 3) Tests — same shape as quizzes but persist to the tests table so
  //    the insights aggregator counts them under testCount and gives
  //    professors signal across multiple assessment types.
  //    Pick the first 6 questions from the 3rd quiz (variance analysis)
  //    as a "Module 3 Practice Test" — variance is the worst-mastered
  //    concept area, so showing test attempts there reinforces the
  //    "teach more of these" priority on the dashboard.
  const TEST_QUIZ = DEMO_QUIZZES[2]; // variance analysis — worst-mastered
  const testRows = [];
  for (const stud of resolved) {
    if (Math.random() > 0.7) continue; // ~70% of students take the test
    const merged = TEST_QUIZ.questions.slice(0, 8).map(q => {
      const target = TEST_QUIZ.targetMastery[q.concept] ?? 0.65;
      const pCorrect = Math.max(0.05, Math.min(0.98, target * stud.skill * 1.05));
      const gotIt = Math.random() < pCorrect;
      let selected = q.correct;
      if (!gotIt) {
        const wrongs = [0, 1, 2, 3].filter(i => i !== q.correct);
        selected = wrongs[Math.floor(Math.random() * wrongs.length)];
      }
      return { question: q.q, options: q.options, correct: q.correct, concept: q.concept, explanation: q.explanation, selected };
    });
    const right = merged.filter(q => q.selected === q.correct).length;
    testRows.push({
      student_id: stud.studentId,
      course_id: courseId,
      topic: '[DEMO] Module 3 · Practice Test (Variance)',
      questions: merged,
      last_score: right,
      best_score: right,
      attempts: 1,
    });
  }
  if (testRows.length > 0) {
    try {
      const { error } = await supabase.from('tests').insert(testRows);
      if (error) throw error;
      summary.testsInserted = testRows.length;
    } catch (e) {
      summary.errors.push(`Tests batch: ${e?.message || e}`);
    }
  }

  // 4) Flashcard decks — batched. Each student makes 1-4 decks themed to
  //    their persona's pain area (strugglers cluster on what they're
  //    failing — the cross-signal that sells the demo).
  const deckRows = [];
  for (const stud of resolved) {
    const deckSpecs = DEMO_FLASHCARD_DECKS[stud.persona] || DEMO_FLASHCARD_DECKS.allrounder;
    for (const spec of deckSpecs) {
      const cards = [];
      for (const concept of spec.concepts) {
        const pool = DEMO_FLASHCARD_CARDS[concept] || [];
        for (const card of pool.slice(0, 2)) cards.push(card);
      }
      if (cards.length === 0) continue;
      deckRows.push({
        student_id: stud.studentId,
        course_id: courseId,
        topic: `[DEMO] ${spec.topic}`,
        cards,
      });
    }
  }
  if (deckRows.length > 0) {
    try {
      const { error } = await supabase.from('flashcard_decks').insert(deckRows);
      if (error) throw error;
      summary.decksInserted = deckRows.length;
    } catch (e) {
      summary.errors.push(`Decks batch: ${e?.message || e}`);
    }
  }

  // 5) Chat questions — populate the questions table that drives the
  //    existing Topic Ledger. Cross-signal: students are ASKING about the
  //    concepts they're MISSING on quizzes.
  const questionRows = [];
  for (const stud of resolved) {
    const pool = DEMO_CHAT_QUESTIONS[stud.persona] || DEMO_CHAT_QUESTIONS.allrounder;
    const count = 2 + Math.floor(Math.random() * 4); // 2-5 per student
    for (let i = 0; i < count; i++) {
      const q = pool[Math.floor(Math.random() * pool.length)];
      questionRows.push({
        course_id: courseId,
        question: q,
        confident: stud.persona.startsWith('struggling') ? Math.random() > 0.4 : true,
      });
    }
  }
  if (questionRows.length > 0) {
    try {
      const { error } = await supabase.from('questions').insert(questionRows);
      if (error) throw error;
      summary.questionsInserted = questionRows.length;
    } catch (e) {
      summary.errors.push(`Questions batch: ${e?.message || e}`);
    }
  }

  console.log(`🌱 Demo seed for course ${courseId}: ${summary.studentsReady} students · ${summary.quizzesInserted} quizzes · ${summary.testsInserted} tests · ${summary.decksInserted} decks · ${summary.questionsInserted} questions${summary.errors.length ? ` · ${summary.errors.length} errors` : ''}`);
  res.json({ ok: true, ...summary });
});

// Owner-only — wipes ALL [DEMO]-marked seed data so the prof can reset
// concept insights between demos without nuking real student data.
// Touches quizzes, tests, and flashcard_decks; chat questions are not
// individually marked so they're left in place (low-noise either way).
app.delete('/course/:courseId/seed-demo-concepts', requireAuth, requireCourseOwner, async (req, res) => {
  const { courseId } = req.params;
  const errors = [];
  for (const table of ['quizzes', 'tests', 'flashcard_decks']) {
    const { error } = await supabase.from(table)
      .delete().eq('course_id', courseId).ilike('topic', '[DEMO]%');
    if (error) errors.push(`${table}: ${error.message}`);
  }
  if (errors.length) return res.status(500).json({ error: errors.join('; ') });
  res.json({ ok: true });
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
app.post('/course/:courseId/chat', requireAuth, userRateLimit(20), requireCourseAccess, async (req, res) => {
  const { courseId } = req.params;
  const message = req.body?.message;
  const history = req.body?.history || [];

  if (!message) return res.status(400).json({ error: 'No message provided' });
  const docs = getCourseDocuments(courseId);
  if (Object.keys(docs).length === 0) return res.status(400).json({ error: 'No documents uploaded yet' });

  // Per-user concurrent-stream cap. At 50 concurrent students a single
  // stuck connection that keeps retrying could pin multiple SSE streams
  // open against the same user — this bounds it to 2 per student.
  if (!acquireStreamSlot(req.user.id, 2)) {
    return res.status(429).json({ error: 'Too many active chats — wait for one to finish before sending another.' });
  }
  // Both 'close' and 'finish' can fire on the same response so guard with
  // a one-shot flag — releasing twice would underflow the user's slot
  // count and let them open more streams than the cap permits.
  let slotReleased = false;
  const releaseSlotOnce = () => {
    if (slotReleased) return;
    slotReleased = true;
    releaseStreamSlot(req.user.id);
  };
  res.on('close', releaseSlotOnce);
  res.on('finish', releaseSlotOnce);

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

  // Top-level safety net for the whole chat handler. Any throw — from
  // searchChunks, page-image download, OpenAI create, anywhere — lands
  // here, emits a clean SSE error event, and closes the stream. Without
  // this, a pre-stream throw left the SSE socket open with no event
  // and the student saw an infinite loader until socket timeout.
  let topLevelGuardFailed = false;
  const guardCleanup = (err) => {
    topLevelGuardFailed = true;
    console.error(`Chat handler unhandled error (course ${courseId}): ${err?.message || err}`);
    try { safeWrite(`data: ${JSON.stringify({ type: 'error', error: 'Lost the thread answering that — try again.' })}\n\n`); } catch {}
    safeEnd();
  };

  try {  // Top-level guard — closes at the bottom of the handler

  sendStatus('searching');

  // RAG: retrieve the most relevant chunks for THIS question instead of
  // sending the whole PDF library every turn. If no chunks are stored yet
  // (course uploaded before RAG existed), fall back to the old whole-library
  // flow so nothing breaks.
  const docParts = [];
  let docNames = [];
  // Detect questions that want comprehensive coverage of a topic or doc
  // rather than a single-fact answer. "What equations should I know for
  // the exam" wants 20 formulas; "what is the break-even formula" wants 1.
  // We bump retrieval depth aggressively for the comprehensive case so the
  // model has the full picture to synthesize a study-guide answer instead
  // of a thin 3-bullet summary.
  const COMPREHENSIVE_CUES = /\b(exam|midterm|final|quiz|test|study|review|cram|prep|prepare|cheat\s*sheet|study\s*guide|summary|summarize|overview|outline|all|every|complete|comprehensive|important|key|main|core|crucial|essential|should\s+(?:i|we)\s+(?:know|memorize|focus)|what\s+do\s+i\s+need|topics|concepts|formulas|equations|chapters?|sections?)\b/i;
  const isComprehensive = COMPREHENSIVE_CUES.test(message);
  // Comprehensive questions: 24 chunks (~12K tokens of context) so a
  // study-guide answer can actually be grounded. Normal: 8.
  const semanticK = isComprehensive ? 24 : 8;
  // Semantic chunks — these are the ones that actually MATCH the question
  // by embedding similarity. They are what should drive citation choice:
  // a doc that's in the context purely because we topped it up to prevent
  // hallucination ("doc-spread guarantee" below) should NOT get cited
  // unless the model actually used it.
  const semanticChunks = await searchChunks(courseId, message, semanticK);
  // Full chunk list (semantic + name-mention boost + doc-spread top-up) is
  // what we send to the model. Citations are picked from semanticChunks
  // only, with name-mentioned docs force-added because the student
  // explicitly asked about them by name.
  const retrievedChunks = [...semanticChunks];
  if (isComprehensive) console.log(`📚 Comprehensive question detected — retrieving ${semanticK} chunks`);

  // Filename-aware boost: if the question mentions a doc by name (e.g.
  // "what is my Module 1 packet about"), pull the opening chunks of that
  // doc and prepend them. Purely semantic retrieval otherwise prefers
  // OTHER docs that describe the named doc (the syllabus paraphrases the
  // packet) over the named doc's actual contents, because the syllabus
  // text matches the question phrasing more directly than chapter content.
  const allDocNames = Object.keys(getCourseDocuments(courseId) || {});
  const mentionedDocs = findNameMentionedDocs(message, allDocNames);
  if (mentionedDocs.length > 0) {
    // Comprehensive questions about a named doc want SPREAD sampling
    // across the doc (formulas often live mid-chapter, not in the opening
    // intro); single-fact questions want opening chunks.
    const openings = (await Promise.all(
      mentionedDocs.map(d => isComprehensive
        ? fetchSpreadChunks(courseId, d, 18)
        : fetchOpeningChunks(courseId, d, 4))
    )).flat();
    if (openings.length > 0) {
      // Dedupe by (doc_name, chunk_index) so we don't double-count a
      // chunk that already came back from semantic search.
      const seen = new Set(retrievedChunks.map(c => `${c.doc_name}#${c.chunk_index}`));
      for (const c of openings) {
        const k = `${c.doc_name}#${c.chunk_index}`;
        if (!seen.has(k)) { retrievedChunks.unshift(c); seen.add(k); }
      }
      console.log(`📎 Name-mentioned: ${mentionedDocs.join(', ')} — added ${openings.length} opening chunks`);
    }
  }

  // Doc-spread guarantee. On a small course (≤4 docs) the semantic top-K
  // can land entirely inside the doc whose phrasing matches the question
  // best (e.g. the syllabus), leaving the OTHER docs (e.g. the chapter
  // packet with the actual formulas) with zero context. The model then
  // hallucinates the missing content from training. To prevent that,
  // top up the underrepresented docs with their opening chunks so every
  // uploaded doc contributes at least something the model can ground on.
  // Skipped on larger courses where 10+ docs would blow the context.
  // IMPORTANT: these chunks go into the CONTEXT but NOT into the citation
  // pool — they exist to prevent hallucination, not to declare a source.
  if (allDocNames.length > 0 && allDocNames.length <= 4) {
    const present = new Set(retrievedChunks.map(c => c.doc_name));
    const missing = allDocNames.filter(d => !present.has(d));
    if (missing.length > 0) {
      // Comprehensive: spread-sample missing docs so the model sees their
      // full scope, not just the intro. Normal: 3 opening chunks each.
      const fillers = (await Promise.all(
        missing.map(d => isComprehensive
          ? fetchSpreadChunks(courseId, d, 10)
          : fetchOpeningChunks(courseId, d, 3))
      )).flat();
      const seen = new Set(retrievedChunks.map(c => `${c.doc_name}#${c.chunk_index}`));
      for (const c of fillers) {
        const k = `${c.doc_name}#${c.chunk_index}`;
        if (!seen.has(k)) { retrievedChunks.push(c); seen.add(k); }
      }
      if (fillers.length > 0) console.log(`📚 Doc-spread top-up: ${missing.join(', ')} — added ${fillers.length} chunks (NOT counted toward citations)`);
    }
  }

  if (retrievedChunks.length > 0) {
    // Citation choice runs on SEMANTIC chunks only — the doc-spread filler
    // is in the context to feed the model, not to claim "this doc informed
    // the answer." Without this separation, asking "who is my teacher"
    // would cite the packet just because we topped it up.
    docNames = selectRelevantDocs(semanticChunks, { minShare: 0.25, maxDocs: 3 });
    // Name-mentioned docs always get cited, even if they didn't dominate
    // the chunk count — the student asked about THIS doc by name, so they
    // expect to see THIS doc in the sources pill.
    for (const d of mentionedDocs) {
      if (!docNames.includes(d)) docNames.unshift(d);
    }
    docNames = docNames.slice(0, 3);
    sendStatus('found', { sources: docNames });
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
        // Sanitize the filename used in the prompt so a maliciously-named
        // upload like `Syllabus.pdf]\n\nSYSTEM:` can't break out of its
        // bracket context and inject instructions.
        const safeName = String(file.name).replace(/[\r\n\[\]]/g, ' ').slice(0, 80);
        docParts.push({ inlineData: { mimeType: mime, data: buf.toString('base64') } });
        docParts.push({ text: isImage(mime) ? `[Student image: ${safeName}]` : `[Student note: ${safeName}]` });
        // Prefix with "your note: " so the citation pill makes clear this
        // came from the student's own upload, not a professor doc.
        docNames.push(`your note: ${safeName}`);
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

  // ── Multimodal grounding: attach the actual slide images for the pages
  // ── the retrieved chunks came from. gpt-4o SEES the formula/diagram
  // ── instead of reading flattened pdfjs text. Dedup by (doc, page),
  // ── cap at 4 images to keep token cost bounded (low-detail mode =
  // ── 85 tokens/image flat). Falls back silently to text-only if any
  // ── image is missing — courses uploaded before page-rendering shipped
  // ── still work, just without visual grounding.
  const pageRefs = [...new Map(retrievedChunks
    .filter(c => c.page_number)
    .map(c => [`${c.doc_name}:::${c.page_number}`, { doc: c.doc_name, page: c.page_number }])).values()];

  // Fetch all page images in parallel with a per-image timeout so a stuck
  // Supabase Storage call can't hang the whole chat request. 5 seconds is
  // generous for the ~300ms cold-cache case but short enough to fail-fast
  // and fall back to text-only grounding if storage is down.
  // Capture the timer handle and clear it whichever side of the race wins,
  // so up-to-4 dangling 5s timers per chat don't accumulate on the happy path.
  const withTimeout = (p, ms, label) => {
    let timer;
    const timeoutP = new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`${label} timeout`)), ms); });
    return Promise.race([p, timeoutP]).finally(() => clearTimeout(timer));
  };
  const imageParts = (await Promise.all(pageRefs.slice(0, 4).map(async (ref) => {
    try {
      const storagePath = `course_pages/${courseId}/${ref.doc}/page_${ref.page}.png`;
      const { data, error } = await withTimeout(
        supabase.storage.from('documents').download(storagePath),
        5000,
        `download ${ref.doc} p.${ref.page}`
      );
      if (error || !data) return null;
      const buf = Buffer.from(await data.arrayBuffer());
      const dataUrl = `data:image/png;base64,${buf.toString('base64')}`;
      return { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } };
    } catch (e) {
      console.warn(`Page image fetch failed for ${ref.doc} p.${ref.page}: ${e.message}`);
      return null;
    }
  }))).filter(Boolean);
  if (imageParts.length > 0) console.log(`📸 Attached ${imageParts.length} page image(s) to chat request`);

  const messages = [{ role: 'system', content: SYSTEM_PROMPT }];
  // Build the first user turn. If we have images, OpenAI requires a
  // content ARRAY with text + image_url parts. Otherwise plain string.
  const firstUserText = history.length === 0
    ? `${contextBlock}\nSTUDENT QUESTION: ${message}`
    : `${contextBlock}\nSTUDENT QUESTION: ${history[0].content}`;
  if (imageParts.length > 0) {
    messages.push({
      role: 'user',
      content: [{ type: 'text', text: firstUserText }, ...imageParts],
    });
  } else {
    messages.push({ role: 'user', content: firstUserText });
  }

  if (history.length > 0) {
    // Skip malformed history entries (system, missing content) instead of
    // silently coercing them to user — OpenAI rejects invalid alternation
    // and a coerced 'system' message could be a prompt-injection vector
    // from a tampered client.
    for (let i = 1; i < history.length; i++) {
      const msg = history[i];
      if (!msg || typeof msg.content !== 'string') continue;
      if (msg.role !== 'user' && msg.role !== 'assistant') continue;
      const content = msg.role === 'assistant' ? msg.content.replace(/\nSOURCES:.*$/m, '').trim() : msg.content;
      if (!content) continue;
      messages.push({ role: msg.role, content });
    }
    messages.push({ role: 'user', content: `STUDENT QUESTION: ${message}` });
  }

  // Live token estimate so the UI can show a "Writing your answer · N tokens"
  // counter next to the thinking indicator while the model processes. ~4
  // chars per token is a close enough approximation for the display; the
  // real count comes back via the 'usage' SSE event when the stream
  // completes (which the UI also captures for telemetry).
  const estimatedInputTokens = Math.ceil(
    messages.reduce((sum, m) => {
      if (typeof m.content === 'string') return sum + m.content.length;
      if (Array.isArray(m.content)) {
        return sum + m.content.reduce((s, p) => s + ((p.type === 'text' && p.text) ? p.text.length : 0), 0);
      }
      return sum;
    }, 0) / 4
  );
  sendStatus('writing', { inputTokens: estimatedInputTokens });
  // (citations event removed — client never had a handler for it; sources
  // arrive in the 'sources' event after the stream finishes.)

  let rawText = '';            // full response accumulator for DB + sources
  let streamedToClient = '';   // what the student has seen so far
  let streamCutOff = false;
  // Hard wall-clock budget. The SDK's `timeout` option doesn't reliably
  // interrupt a stream once chunks start flowing — it only bounds the
  // INITIAL response. So we run our own AbortController on top of it,
  // armed for 45 seconds. If the model is still emitting (or NOT
  // emitting) after that, we abort the stream and let the catch below
  // surface "lost the thread" rather than letting the student stare at
  // a loading indicator indefinitely.
  const openaiAbort = new AbortController();
  const openaiTimeout = setTimeout(() => {
    console.warn(`Chat request exceeded 45s wall clock — aborting`);
    openaiAbort.abort();
  }, 45_000);
  // Also kill the request if the student closes their tab — no point
  // burning OpenAI tokens for a connection no one's listening to.
  req.on('close', () => { openaiAbort.abort(); });

  // Auto-upgrade model for comprehensive / exam-prep questions where
  // mini's synthesis is the quality ceiling. ~5¢ per upgraded question
  // vs 0.3¢ on mini — worth it when the student is asking for a real
  // study guide rather than a one-line lookup.
  const chatModel = isComprehensive ? MODEL_CHAT_DEEP : MODEL_CHAT;
  if (isComprehensive) console.log(`🧠 Using ${chatModel} for comprehensive answer`);

  let stream;
  try {
    stream = await openai.chat.completions.create({
      model: chatModel,
      messages,
      temperature: 0.3,
      max_tokens: 4096,
      stream: true,
      // Ask OpenAI to include real token counts in the final stream chunk.
      // Without this the streaming endpoint omits the `usage` object that
      // the non-streaming endpoint returns by default. We pass the numbers
      // through to the client so the UI can show an honest "N tokens"
      // pill — Claude-style, but with real numbers, not an estimate.
      stream_options: { include_usage: true },
    }, { signal: openaiAbort.signal, timeout: 45_000 });
  } catch (openErr) {
    if (imageParts.length === 0) { clearTimeout(openaiTimeout); throw openErr; }
    console.warn(`Multimodal request failed (${openErr.message}) — retrying text-only`);
    const textOnlyMessages = messages.map(m => {
      if (Array.isArray(m.content)) {
        const textPart = m.content.find(p => p.type === 'text');
        return { ...m, content: textPart ? textPart.text : '' };
      }
      return m;
    });
    stream = await openai.chat.completions.create({
      model: chatModel,
      messages: textOnlyMessages,
      temperature: 0.3,
      max_tokens: 4096,
      stream: true,
      // Ask OpenAI to include real token counts in the final stream chunk.
      // Without this the streaming endpoint omits the `usage` object that
      // the non-streaming endpoint returns by default. We pass the numbers
      // through to the client so the UI can show an honest "N tokens"
      // pill — Claude-style, but with real numbers, not an estimate.
      stream_options: { include_usage: true },
    }, { signal: openaiAbort.signal, timeout: 45_000 });
  }

  try {
    // ── STREAM tokens directly to client as they arrive ──
    // The old buffer-then-stream approach held the whole response on the
    // server before flushing anything, which made the student stare at
    // "Reading your materials..." for 10+ seconds while the model was
    // generating. Now we stream as the model emits, buffering only the
    // very first line (to parse and strip the MATERIALS: yes/no marker
    // before it reaches the student).
    let usedMaterials = false;
    let markerParsed = false;
    let markerBuffer = '';

    const emitToken = (token) => {
      streamedToClient += token;
      if (!safeWrite(`data: ${JSON.stringify({ type: 'token', token })}\n\n`)) return false;
      return true;
    };

    // Real token counts from OpenAI — captured from the final stream
    // chunk (the one that has usage but no delta.content). Sent to the
    // client as a SSE 'usage' event before stream end so the UI can
    // attach the numbers to the assistant message bubble.
    let finalUsage = null;
    try {
      for await (const chunk of stream) {
        if (clientGone) break;
        // OpenAI emits one trailing chunk with the usage object and no
        // choices/delta. Capture it whenever it appears; don't `continue`
        // until we've checked because the usage chunk has no content.
        if (chunk.usage) {
          finalUsage = {
            input: chunk.usage.prompt_tokens || 0,
            output: chunk.usage.completion_tokens || 0,
            total: chunk.usage.total_tokens || 0,
            model: chatModel,
          };
        }
        const token = chunk.choices?.[0]?.delta?.content;
        if (!token) continue;
        rawText += token;

        if (markerParsed) {
          // Past the first line — send tokens straight through.
          if (!emitToken(token)) break;
          continue;
        }

        // Still hunting for the first newline so we can extract the
        // MATERIALS marker. Keep buffering until we find it or the
        // buffer grows past a sane bound (model didn't follow the rule).
        markerBuffer += token;
        const nlIdx = markerBuffer.indexOf('\n');
        if (nlIdx >= 0) {
          const firstLine = markerBuffer.slice(0, nlIdx);
          const rest = markerBuffer.slice(nlIdx + 1);
          const m = firstLine.match(/^\s*MATERIALS:\s*(yes|no)/i);
          if (m) {
            usedMaterials = m[1].toLowerCase() === 'yes';
            if (rest && !emitToken(rest)) break;
          } else {
            // No marker — model forgot. Ship the whole buffer including
            // the first line so the student doesn't lose content.
            if (!emitToken(markerBuffer)) break;
          }
          markerParsed = true;
          markerBuffer = '';
        } else if (markerBuffer.length > 300) {
          // First "line" is taking forever — bail and ship what we have.
          if (!emitToken(markerBuffer)) break;
          markerParsed = true;
          markerBuffer = '';
        }
      }
      // If we never got a newline (very short response, no marker), flush.
      // Check emitToken's return so we honor a mid-flush client disconnect
      // instead of pressing on with sources/done writes against a dead socket.
      if (!markerParsed && markerBuffer.length > 0) {
        if (!emitToken(markerBuffer)) clientGone = true;
        markerParsed = true;
      }
    } catch (streamErr) {
      streamCutOff = true;
      console.warn(`Stream interrupted (${streamErr.message}) — partial answer length ${streamedToClient.length}`);
      // Include buffered-but-unflushed marker content in the threshold —
      // a stream that died with content still in markerBuffer shouldn't
      // re-throw just because streamedToClient hasn't been flushed yet.
      if (streamedToClient.length + markerBuffer.length < 20) throw streamErr;
    }

    if (clientGone) { clearTimeout(openaiTimeout); safeEnd(); return; }

    // Empty-response fallback. If nothing made it to the student (model
    // returned just the marker and stopped, or the stream died early),
    // ship a friendly default so they don't see an empty bubble.
    if (streamedToClient.trim().length === 0) {
      console.warn(`Chat returned empty after marker strip — sending fallback`);
      const fallback = `You got it — let me know if anything else comes up.`;
      emitToken(fallback);
    }

    // Safety net: if the model emitted MATERIALS: no but the response
    // doesn't actually look like a refusal or pure casual chat, override
    // to YES. Earlier this had a 250-char threshold which missed brief
    // factual lookups ("Your professor is Jeff Clark, PhD, CPA." — 54
    // chars, definitely a syllabus-grounded answer). New rule:
    //   - response contains a refusal phrase → leave at NO
    //   - response is ≥ 35 chars AND no refusal phrases AND docs available
    //     → override to YES (catches one-liner factual answers)
    //   - shorter than 35 → trust the model's marker (casual chat /
    //     "thanks" / "you got it" stays NO)
    const refusalSignals = [
      "outside this course",
      "outside the scope",
      "doesn't appear to be in any of your uploaded",
      "not in your uploaded materials",
      "check with your professor",
      "i can help with",  // common redirect phrasing
    ];
    const looksLikeRefusal = refusalSignals.some(s => streamedToClient.toLowerCase().includes(s));
    const looksSubstantive = streamedToClient.trim().length >= 35 && !looksLikeRefusal;
    if (!usedMaterials && looksSubstantive && docNames.length > 0) {
      console.log(`💬 Override materials=false → true (substantive ${streamedToClient.length} chars, no refusal phrasing)`);
      usedMaterials = true;
    }

    // Source attribution: show retrieved docs whenever the model is actually
    // answering a course-related question (MATERIALS: yes OR substantive
    // response override). Refusals + casual chat correctly suppress sources.
    const sources = usedMaterials ? docNames : [];
    const confident = !streamedToClient.toLowerCase().includes("doesn't appear to be in any of your uploaded");
    console.log(`💬 Chat response: ${streamedToClient.length} chars streamed, materials=${usedMaterials}, sources=${sources.length}`);

    try {
      await supabase.from('questions').insert({ course_id: courseId, question: message, confident });
    } catch (e) { console.warn('Question log failed:', e.message); }

    safeWrite(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);
    if (finalUsage) {
      safeWrite(`data: ${JSON.stringify({ type: 'usage', usage: finalUsage })}\n\n`);
      console.log(`🔢 Tokens: ${finalUsage.input} in + ${finalUsage.output} out = ${finalUsage.total} total (${finalUsage.model})`);
    }
    safeWrite(`data: ${JSON.stringify({ type: 'done', truncated: streamCutOff })}\n\n`);
    safeEnd();
    clearTimeout(openaiTimeout);
  } catch (err) {
    clearTimeout(openaiTimeout);
    console.error(`Chat error: ${err.message} (course ${courseId}, partial ${streamedToClient.length} chars)`);
    if (clientGone) { safeEnd(); return; }
    safeWrite(`data: ${JSON.stringify({ type: 'error', error: 'Lost the thread answering that — try again.' })}\n\n`);
    safeEnd();
  }
  } catch (handlerErr) {
    // Outer catch — anything that throws before the inner try takes over
    // (RAG retrieval, page-image fetch, message-array build, OpenAI create)
    // lands here. Emit a single error event and close the SSE stream so
    // the student doesn't see an infinite loader.
    if (!topLevelGuardFailed) guardCleanup(handlerErr);
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
app.post('/student/notes/:courseId/upload', requireAuth, requireCourseAccess, async (req, res) => {
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

app.get('/student/notes/:courseId', requireAuth, requireCourseAccess, async (req, res) => {
  const { courseId } = req.params;
  const { data } = await supabase.from('student_notes').select('*').eq('student_id', req.user.id).eq('course_id', courseId).order('uploaded_at', { ascending: false });
  res.json(data || []);
});

app.delete('/student/notes/:courseId/:name', requireAuth, requireCourseAccess, async (req, res) => {
  const { courseId, name } = req.params;
  const filename = decodeURIComponent(name);
  const storagePath = `student_notes/${req.user.id}/${courseId}/${filename}`;
  await supabase.storage.from('documents').remove([storagePath]);
  await supabase.from('student_notes').delete().eq('student_id', req.user.id).eq('course_id', courseId).eq('name', filename);
  res.json({ success: true });
});

app.get('/student/notes/:courseId/file/:name', requireAuth, requireCourseAccess, async (req, res) => {
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
  // CRITICAL: verify the chat belongs to the calling student before inserting.
  // Without this, any authenticated user could write or inject messages into
  // any chat by guessing or enumerating chat IDs.
  const { data: chat } = await supabase.from('chats')
    .select('student_id').eq('id', chatId).maybeSingle();
  if (!chat) return res.status(404).json({ error: 'Chat not found' });
  if (chat.student_id !== req.user.id) return res.status(403).json({ error: 'Not your chat' });
  // Also validate the role and content shape so a tampered client can't store
  // a 'system' message into our chat history.
  if (role !== 'user' && role !== 'assistant') return res.status(400).json({ error: 'Invalid role' });
  if (typeof content !== 'string' || !content.trim()) return res.status(400).json({ error: 'Content required' });
  const { data, error } = await supabase.from('messages').insert({ chat_id: chatId, role, content, sources: Array.isArray(sources) ? sources : [] }).select().single();
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

// Normalize a topic for collision detection: lowercase, trim, strip a
// leading article ("the syllabus" → "syllabus"), and collapse internal
// whitespace. Two topics that normalize to the same string are treated
// as the same intent and get auto-disambiguated.
function normalizeTopic(s) {
  return (s || '').toLowerCase().trim()
    .replace(/^(the|a|an)\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Levenshtein distance — for typo-fuzzy collision detection. Iterative DP
// implementation; tight loop over short strings, no perf concern at our
// scale (a few dozen topics per student max).
function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const prev = new Array(b.length + 1);
  const curr = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    for (let j = 0; j <= b.length; j++) prev[j] = curr[j];
  }
  return prev[b.length];
}

// Treat two topics as "the same" if either:
//  (a) they normalize to the same string ("the syllabus" ≡ "syllabus"), or
//  (b) their normalized forms are within Levenshtein distance 2 AND both
//      are long enough that random collision is unlikely (≥6 chars).
// Carve-out: if both end in DIFFERENT trailing digits ("midterm 1" vs
// "midterm 2"), keep them distinct — the digits are intentional.
function topicsCollide(a, b) {
  const na = normalizeTopic(a);
  const nb = normalizeTopic(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const tailA = na.match(/(\d+)\s*$/);
  const tailB = nb.match(/(\d+)\s*$/);
  // Asymmetric guard: if exactly ONE side ends in a digit, keep distinct
  // ("Midterm Review" vs "Midterm 2" — different intent). The earlier
  // both-sides-have-digits-AND-different rule still applies.
  if ((tailA && !tailB) || (!tailA && tailB)) return false;
  if (tailA && tailB && tailA[1] !== tailB[1]) return false;
  if (Math.min(na.length, nb.length) < 6) return false;
  return levenshtein(na, nb) <= 2;
}

// If a student already has a quiz / test / deck saved under a colliding
// topic in this course, append " (2)", " (3)" etc. Catches exact dupes
// ("the syllabus" + "the syllabus") AND near-typo dupes ("the syllabus"
// + "the sllyabus") AND article-stripped dupes ("syllabus" + "the
// syllabus"). Different topics like "midterm 1" vs "midterm 2" remain
// distinct thanks to the trailing-digit carve-out in topicsCollide.
async function disambiguateTopic(table, studentId, courseId, proposed) {
  if (!proposed || !proposed.trim()) return proposed;
  const base = proposed.trim();
  try {
    const { data } = await supabase.from(table)
      .select('topic')
      .eq('student_id', studentId).eq('course_id', courseId);
    const existingTopics = (data || []).map(r => r.topic).filter(Boolean);
    const collides = (candidate) => existingTopics.some(t => topicsCollide(candidate, t));
    if (!collides(base)) return base;
    for (let i = 2; i < 100; i++) {
      const candidate = `${base} (${i})`;
      // Only check exact collision on the suffixed form — `(N)` carries the
      // disambiguation, no need to fuzzy-match it against everything else.
      if (!existingTopics.some(t => normalizeTopic(t) === normalizeTopic(candidate))) {
        return candidate;
      }
    }
    return `${base} (${Date.now()})`;
  } catch (e) {
    console.warn(`disambiguateTopic(${table}) failed: ${e.message}`);
    return base;
  }
}

// Post-insert duplicate sweep — catches the race where two simultaneous
// generations both passed disambiguateTopic's check (saw the same
// pre-insert state) and ended up with the same suffix in the database.
// Looks up siblings created within a 5-second window and renames the
// NEWER one with a short random suffix to break the tie. No-op when
// only one row carries the topic.
async function deduplicateAfterInsert(table, studentId, courseId, insertedId, topic) {
  if (!topic) return;
  try {
    const fiveSecondsAgo = new Date(Date.now() - 5000).toISOString();
    const { data: siblings } = await supabase.from(table)
      .select('id, topic, created_at')
      .eq('student_id', studentId).eq('course_id', courseId)
      .gte('created_at', fiveSecondsAgo)
      .order('created_at', { ascending: true });
    if (!siblings || siblings.length < 2) return;
    const dupes = siblings.filter(r => normalizeTopic(r.topic) === normalizeTopic(topic));
    if (dupes.length < 2) return;
    // Keep the earliest, rename later rows. We only rename our OWN insert
    // (or the very latest) so we don't mutate someone else's record by
    // accident under another auth context.
    const ours = dupes.find(r => r.id === insertedId);
    if (!ours || ours.id === dupes[0].id) return; // we were the first, nothing to do
    const suffix = Math.random().toString(36).slice(2, 5);
    const newTopic = `${topic} (${suffix})`;
    await supabase.from(table)
      .update({ topic: newTopic })
      .eq('id', insertedId).eq('student_id', studentId);
    console.log(`🪄 Deduped ${table} ${insertedId}: "${topic}" → "${newTopic}"`);
  } catch (e) {
    console.warn(`deduplicateAfterInsert(${table}) failed: ${e.message}`);
  }
}

app.post('/course/:courseId/quiz', requireAuth, requireCourseAccess, async (req, res) => {
  const { courseId } = req.params;
  const { topic } = req.body;
  // Clamp count so the model never sees an absurd value (cost + UX guard).
  const requestedCount = parseInt(req.body.count, 10);
  const quizCount = Number.isFinite(requestedCount) ? Math.min(20, Math.max(3, requestedCount)) : 5;
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

  const prompt = `Read these course documents and generate ${quizCount} multiple choice quiz questions${topic ? ` about: ${topic}` : ''}.

Start with EXACTLY this line on its own (no markdown, no quotes):
TOPIC: [a 3-5 word title summarizing the quiz — e.g. "Margin of Safety", "CVP Analysis", "Module 1 Concepts"]

Then for each question, write it in this EXACT format with no variations:
QUESTION: [question text]
A: [option a]
B: [option b]
C: [option c]
D: [option d]
CORRECT: [A or B or C or D]
CONCEPT: [a single specific concept name this question tests — 1-3 words, e.g. "Break-even Point", "Contribution Margin", "Net Present Value", "Variance Analysis". Use the actual named concept from the materials, NEVER a generic label like "General", "Other", "Module 1", "Chapter 4", or the broad topic from the TOPIC line above]
EXPLANATION: [one sentence explanation]
---

Concept naming rules — read carefully, professors use this for teaching insights:
- Each CONCEPT must be a SPECIFIC NAMED IDEA from the course (a formula name, a method, a defined term).
- Two questions testing the SAME named concept must use the EXACT same CONCEPT string (so "Break-even Point" appears identically across all break-even questions).
- Different questions covering different aspects of the same topic should still get distinct concept tags (e.g. "Contribution Margin", "CM Ratio", "Contribution Margin per Unit" — not all just "Contribution Margin").
- NEVER use "General", "Misc", "Other", "Topic 1", or anything that doesn't name a real idea.

Generate the TOPIC line then all ${quizCount} questions now:`;

  try {
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [...docParts, { text: prompt }] }],
      config: { temperature: 0.3, maxOutputTokens: 3000 },
    });
    let text = result.text.trim();
    // Extract the model's TOPIC line FIRST, then strip it from the text
    // before parsing questions. Without this strip, the topic line was
    // surviving the "block.length > 20" filter and getting consumed by
    // the slice(quizCount) — the student asked for N questions and got
    // N-1 because the first "block" was the topic header, not a question.
    // Capture the TOPIC line whether it's plain, **markdown-wrapped**, or
    // the very last line of the response with no trailing newline.
    const modelTopicMatch = text.match(/^\s*(?:\*\*)?TOPIC:?(?:\*\*)?\s*([^\n]+)/im);
    const modelTopic = modelTopicMatch ? modelTopicMatch[1].trim().replace(/^[\*"']+|[\*"']+$/g, '').trim() : '';
    // Strip the TOPIC line whether plain or **markdown-wrapped**. Use `\n*`
    // (not `\n+`) so we also strip when TOPIC is the final line of the
    // response with no trailing newline — otherwise the block would survive
    // the length filter and steal a slot from the question/card count.
    text = text.replace(/^\s*(?:\*\*)?TOPIC:?(?:\*\*)?[^\n]*\n*/im, '');
    const blocks = text.split(/---+|\n(?=QUESTION:)/).map(b => b.trim()).filter(b => b.length > 20);
    // Filter THEN slice — slicing first would silently shrink the result if
    // any block fails the question/options validity check, leaving the
    // student with fewer questions than they asked for.
    const questions = blocks.map(block => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      const get = (prefix) => { const line = lines.find(l => l.startsWith(prefix)); return line ? line.slice(prefix.length).trim() : ''; };
      const question = get('QUESTION:');
      const options = [`A) ${get('A:')}`, `B) ${get('B:')}`, `C) ${get('C:')}`, `D) ${get('D:')}`];
      const correctLetter = get('CORRECT:').toUpperCase().trim();
      const correct = ['A', 'B', 'C', 'D'].indexOf(correctLetter);
      const explanation = get('EXPLANATION:');
      // Normalize concept: strip markdown, drop generic labels so insights
      // aggregate to meaningful named ideas, not "General" buckets that
      // mask what students are actually missing.
      let concept = get('CONCEPT:').replace(/^[\*"'\[]+|[\*"'\]]+$/g, '').trim();
      if (/^(general|misc|other|none|n\/a|topic\s*\d+|module\s*\d+|chapter\s*\d+|section\s*\d+)$/i.test(concept)) concept = '';
      return { question, options, correct: correct === -1 ? 0 : correct, explanation, concept };
    }).filter(q => q.question && q.options[0] !== 'A) ').slice(0, quizCount);
    if (questions.length === 0) return res.status(500).json({ error: 'Could not generate quiz questions' });
    // Persist so the student can revisit / retake from the Quizzes sidebar.
    // Title preference: explicit user topic > model-generated TOPIC > dated fallback.
    const effectiveTopic = (topic && topic.trim()) || modelTopic || `Practice Quiz · ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    const finalTopic = await disambiguateTopic('quizzes', req.user.id, courseId, effectiveTopic);
    let savedId = null;
    let saveError = null;
    try {
      const { data: saved, error } = await supabase.from('quizzes')
        .insert({ student_id: req.user.id, course_id: courseId, topic: finalTopic, questions })
        .select('id').single();
      if (error) throw error;
      savedId = saved?.id || null;
    } catch (e) {
      console.error('Quiz save error:', e.message);
      saveError = e.message;
    }
    // Race-safety: if two simultaneous /quiz calls both passed the
    // disambiguateTopic check and ended up with the same suffix, the
    // dedupe pass renames the loser to break the tie.
    if (savedId) deduplicateAfterInsert('quizzes', req.user.id, courseId, savedId, finalTopic);
    // Surface save failures to the client so it can flag the score-retake
    // path won't persist instead of silently PATCHing /:id with null.
    res.json({ id: savedId, questions, saveError });
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
  const requestedCount = parseInt(req.body.count, 10);
  const cardCount = Number.isFinite(requestedCount) ? Math.min(30, Math.max(3, requestedCount)) : 10;
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

  const prompt = `Read these course documents and generate ${cardCount} study flashcards${topic ? ` about: ${topic}` : ' covering the most exam-worthy concepts'}.

Start with EXACTLY this line on its own (no markdown, no quotes):
TOPIC: [a 3-5 word title summarizing the deck — e.g. "Cost Behavior", "Variance Analysis", "Module 1 Key Terms"]

Then for each card, write it in this EXACT format with no variations:
FRONT: [a concise term, concept, or question]
BACK: [the definition or answer in 1-2 sentences]
SOURCE: [one short citation like "Lecture 6 · slide 14" or "Chapter 4 · p. 132"]
---

Keep each side under two sentences. Use plain text, no markdown inside the FRONT/BACK fields. Generate the TOPIC line then all ${cardCount} cards now:`;

  try {
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [...docParts, { text: prompt }] }],
      config: { temperature: 0.4, maxOutputTokens: 3000 },
    });
    let text = result.text.trim();
    // Pull the TOPIC line out before parsing cards so it doesn't get
    // counted as a partial card and steal a slot from the slice(cardCount).
    // Capture the TOPIC line whether it's plain, **markdown-wrapped**, or
    // the very last line of the response with no trailing newline.
    const modelTopicMatch = text.match(/^\s*(?:\*\*)?TOPIC:?(?:\*\*)?\s*([^\n]+)/im);
    const modelTopic = modelTopicMatch ? modelTopicMatch[1].trim().replace(/^[\*"']+|[\*"']+$/g, '').trim() : '';
    // Strip the TOPIC line whether plain or **markdown-wrapped**. Use `\n*`
    // (not `\n+`) so we also strip when TOPIC is the final line of the
    // response with no trailing newline — otherwise the block would survive
    // the length filter and steal a slot from the question/card count.
    text = text.replace(/^\s*(?:\*\*)?TOPIC:?(?:\*\*)?[^\n]*\n*/im, '');
    const blocks = text.split(/---+|\n(?=FRONT:)/i).map(b => b.trim()).filter(b => b.length > 10);
    const cards = blocks.map(block => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      const get = (prefix) => { const line = lines.find(l => l.toUpperCase().startsWith(prefix)); return line ? line.slice(prefix.length).trim() : ''; };
      return { front: get('FRONT:'), back: get('BACK:'), source: get('SOURCE:') };
    }).filter(c => c.front && c.back).slice(0, cardCount);
    if (cards.length === 0) return res.status(500).json({ error: 'Could not generate flashcards' });
    const effectiveTopic = (topic && topic.trim()) || modelTopic || `Flashcard Deck · ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    const finalTopic = await disambiguateTopic('flashcard_decks', req.user.id, courseId, effectiveTopic);
    let savedId = null;
    let saveError = null;
    try {
      const { data: saved, error } = await supabase.from('flashcard_decks')
        .insert({ student_id: req.user.id, course_id: courseId, topic: finalTopic, cards })
        .select('id').single();
      if (error) throw error;
      savedId = saved?.id || null;
    } catch (e) {
      console.error('Deck save error:', e.message);
      saveError = e.message;
    }
    if (savedId) deduplicateAfterInsert('flashcard_decks', req.user.id, courseId, savedId, finalTopic);
    res.json({ id: savedId, cards, saveError });
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
  // Fetch questions too so we can derive a 1-line preview + count for the
  // card. Strip the full questions array from the response to keep the
  // payload small — only preview + count travel to the client.
  const { data } = await supabase.from('quizzes')
    .select('id, topic, attempts, last_score, best_score, created_at, questions')
    .eq('student_id', req.user.id).eq('course_id', courseId)
    .order('created_at', { ascending: false });
  const enriched = (data || []).map(({ questions, ...rest }) => ({
    ...rest,
    questionCount: Array.isArray(questions) ? questions.length : 0,
    preview: Array.isArray(questions) && questions[0]?.question
      ? String(questions[0].question).slice(0, 140)
      : null,
  }));
  res.json(enriched);
});

app.get('/student/quizzes/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('quizzes')
    .select('*').eq('student_id', req.user.id).eq('id', req.params.id).single();
  if (error || !data) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

app.patch('/student/quizzes/:id', requireAuth, async (req, res) => {
  const raw = Number(req.body?.score);
  if (!Number.isFinite(raw)) return res.status(400).json({ error: 'score required' });
  const score = Math.max(0, Math.min(100, raw));
  // Per-question responses for concept-level insights. Each entry:
  // { q: <question index>, selected: <option index> }. Server merges
  // selected onto each questions[i] in the existing jsonb column so no
  // schema migration is needed and the insights aggregator can read
  // (concept, correct, selected) directly off the quiz row.
  const responses = Array.isArray(req.body?.responses) ? req.body.responses : null;
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: cur } = await supabase.from('quizzes')
      .select('best_score, attempts, questions').eq('id', req.params.id).eq('student_id', req.user.id).single();
    if (!cur) return res.status(404).json({ error: 'Not found' });
    const prevAttempts = cur.attempts ?? 0;
    const best = Math.max(cur.best_score ?? 0, score);
    const newAttempts = prevAttempts + 1;
    // Merge the responses onto the persisted questions array. Latest
    // attempt overwrites prior selected — insights show the most
    // recent response per (student, question).
    let mergedQuestions = cur.questions;
    if (responses && Array.isArray(cur.questions)) {
      const byIdx = new Map(responses.filter(r => Number.isInteger(r?.q) && Number.isInteger(r?.selected)).map(r => [r.q, r.selected]));
      mergedQuestions = cur.questions.map((q, i) => {
        if (!byIdx.has(i)) return q;
        return { ...q, selected: byIdx.get(i) };
      });
    }
    const update = { last_score: score, best_score: best, attempts: newAttempts };
    if (responses) update.questions = mergedQuestions;
    const { data: updated, error: updErr } = await supabase.from('quizzes')
      .update(update)
      .eq('id', req.params.id).eq('student_id', req.user.id).eq('attempts', prevAttempts)
      .select('attempts').maybeSingle();
    if (updErr) return res.status(500).json({ error: updErr.message });
    if (updated) {
      return res.json({ success: true, attempts: newAttempts, last_score: score, best_score: best });
    }
  }
  console.warn('PATCH /student/quizzes — CAS update failed after 3 retries');
  res.status(409).json({ error: 'Score update conflict — please retry' });
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
  // Strip the full cards array from the list response — we only need the
  // first card's FRONT for the preview and the count for the badge. Full
  // cards still come back from the per-deck GET when the student opens it.
  const enriched = (data || []).map(({ cards, ...rest }) => ({
    ...rest,
    cardCount: Array.isArray(cards) ? cards.length : 0,
    preview: Array.isArray(cards) && cards[0]?.front
      ? String(cards[0].front).slice(0, 140)
      : null,
  }));
  res.json(enriched);
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
  const requestedCount = parseInt(req.body.count, 10);
  const testCount = Number.isFinite(requestedCount) ? Math.min(25, Math.max(3, requestedCount)) : 8;
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
  const prompt = `Read these course documents and generate a ${testCount}-question closed-book practice test${topic ? ` about: ${topic}` : ''}. Vary the difficulty — some recall, some application, some synthesis.

Start with EXACTLY this line on its own (no markdown, no quotes):
TOPIC: [a 3-5 word title summarizing the test — e.g. "Cost Accounting Midterm", "Module 2 Concepts", "Variance Practice"]


For each question, write it in this EXACT format with no variations:
QUESTION: [question text]
A: [option a]
B: [option b]
C: [option c]
D: [option d]
CORRECT: [A or B or C or D]
CONCEPT: [a single specific concept name this question tests — 1-3 words, e.g. "Break-even Point", "Contribution Margin", "Net Present Value", "Variance Analysis". Use the actual named concept from the materials, NEVER a generic label like "General", "Other", "Module 1", "Chapter 4", or the broad topic from the TOPIC line above]
EXPLANATION: [one sentence explanation grounded in the materials]
---

Concept naming rules — read carefully, professors use this for teaching insights:
- Each CONCEPT must be a SPECIFIC NAMED IDEA from the course (a formula name, a method, a defined term).
- Two questions testing the SAME named concept must use the EXACT same CONCEPT string.
- Different aspects of the same broad topic get distinct concept tags.
- NEVER use "General", "Misc", "Other", "Topic 1", or anything that doesn't name a real idea.

Generate all ${testCount} questions now:`;

  try {
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [...docParts, { text: prompt }] }],
      config: { temperature: 0.3, maxOutputTokens: 4000 },
    });
    let text = result.text.trim();
    // Pull TOPIC out before splitting so the test count is correct.
    // Capture the TOPIC line whether it's plain, **markdown-wrapped**, or
    // the very last line of the response with no trailing newline.
    const modelTopicMatch = text.match(/^\s*(?:\*\*)?TOPIC:?(?:\*\*)?\s*([^\n]+)/im);
    const modelTopic = modelTopicMatch ? modelTopicMatch[1].trim().replace(/^[\*"']+|[\*"']+$/g, '').trim() : '';
    // Strip the TOPIC line whether plain or **markdown-wrapped**. Use `\n*`
    // (not `\n+`) so we also strip when TOPIC is the final line of the
    // response with no trailing newline — otherwise the block would survive
    // the length filter and steal a slot from the question/card count.
    text = text.replace(/^\s*(?:\*\*)?TOPIC:?(?:\*\*)?[^\n]*\n*/im, '');
    const blocks = text.split(/---+|\n(?=QUESTION:)/).map(b => b.trim()).filter(b => b.length > 20);
    // Filter THEN slice (same fix as the quiz endpoint).
    const questions = blocks.map(block => {
      const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
      const get = (prefix) => { const line = lines.find(l => l.startsWith(prefix)); return line ? line.slice(prefix.length).trim() : ''; };
      const question = get('QUESTION:');
      const options = [`A) ${get('A:')}`, `B) ${get('B:')}`, `C) ${get('C:')}`, `D) ${get('D:')}`];
      const correctLetter = get('CORRECT:').toUpperCase().trim();
      const correct = ['A', 'B', 'C', 'D'].indexOf(correctLetter);
      const explanation = get('EXPLANATION:');
      let concept = get('CONCEPT:').replace(/^[\*"'\[]+|[\*"'\]]+$/g, '').trim();
      if (/^(general|misc|other|none|n\/a|topic\s*\d+|module\s*\d+|chapter\s*\d+|section\s*\d+)$/i.test(concept)) concept = '';
      return { question, options, correct: correct === -1 ? 0 : correct, explanation, concept };
    }).filter(q => q.question && q.options[0] !== 'A) ').slice(0, testCount);
    if (questions.length === 0) return res.status(500).json({ error: 'Could not generate test questions' });
    const effectiveTopic = (topic && topic.trim()) || modelTopic || `Practice Test · ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    const finalTopic = await disambiguateTopic('tests', req.user.id, courseId, effectiveTopic);
    let savedId = null;
    let saveError = null;
    try {
      const { data: saved, error } = await supabase.from('tests')
        .insert({ student_id: req.user.id, course_id: courseId, topic: finalTopic, questions })
        .select('id').single();
      if (error) throw error;
      savedId = saved?.id || null;
    } catch (e) {
      console.error('Test save error:', e.message);
      saveError = e.message;
    }
    if (savedId) deduplicateAfterInsert('tests', req.user.id, courseId, savedId, finalTopic);
    res.json({ id: savedId, questions, saveError });
  } catch (err) {
    console.error('Test generation error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.get('/student/tests', requireAuth, async (req, res) => {
  const { courseId } = req.query;
  if (!courseId) return res.status(400).json({ error: 'courseId required' });
  const { data } = await supabase.from('tests')
    .select('id, topic, attempts, last_score, best_score, created_at, questions')
    .eq('student_id', req.user.id).eq('course_id', courseId)
    .order('created_at', { ascending: false });
  const enriched = (data || []).map(({ questions, ...rest }) => ({
    ...rest,
    questionCount: Array.isArray(questions) ? questions.length : 0,
    preview: Array.isArray(questions) && questions[0]?.question
      ? String(questions[0].question).slice(0, 140)
      : null,
  }));
  res.json(enriched);
});

app.get('/student/tests/:id', requireAuth, async (req, res) => {
  const { data, error } = await supabase.from('tests')
    .select('*').eq('student_id', req.user.id).eq('id', req.params.id).single();
  if (error || !data) return res.status(404).json({ error: 'Not found' });
  res.json(data);
});

app.patch('/student/tests/:id', requireAuth, async (req, res) => {
  const raw = Number(req.body?.score);
  if (!Number.isFinite(raw)) return res.status(400).json({ error: 'score required' });
  const score = Math.max(0, Math.min(100, raw));
  const responses = Array.isArray(req.body?.responses) ? req.body.responses : null;
  // Same CAS-style optimistic concurrency as /student/quizzes/:id, plus
  // the per-question response merge so test attempts feed concept-level
  // insights identically to quizzes.
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data: cur } = await supabase.from('tests')
      .select('best_score, attempts, questions').eq('id', req.params.id).eq('student_id', req.user.id).single();
    if (!cur) return res.status(404).json({ error: 'Not found' });
    const prevAttempts = cur.attempts ?? 0;
    const best = Math.max(cur.best_score ?? 0, score);
    const newAttempts = prevAttempts + 1;
    let mergedQuestions = cur.questions;
    if (responses && Array.isArray(cur.questions)) {
      const byIdx = new Map(responses.filter(r => Number.isInteger(r?.q) && Number.isInteger(r?.selected)).map(r => [r.q, r.selected]));
      mergedQuestions = cur.questions.map((q, i) => byIdx.has(i) ? { ...q, selected: byIdx.get(i) } : q);
    }
    const update = { last_score: score, best_score: best, attempts: newAttempts };
    if (responses) update.questions = mergedQuestions;
    const { data: updated, error: updErr } = await supabase.from('tests')
      .update(update)
      .eq('id', req.params.id).eq('student_id', req.user.id).eq('attempts', prevAttempts)
      .select('attempts').maybeSingle();
    if (updErr) return res.status(500).json({ error: updErr.message });
    if (updated) {
      return res.json({ success: true, attempts: newAttempts, last_score: score, best_score: best });
    }
  }
  console.warn('PATCH /student/tests — CAS update failed after 3 retries');
  return res.status(409).json({ error: 'Score update conflict — please retry' });
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
  // Wait until traffic is quiet before starting heavy backfills — at 50
  // concurrent students, vision-captioning a 200-page PDF while chat is
  // hot would burn the Gemini quota the live chat needs for embeddings.
  const startBackfillWhenIdle = (fn, label, intervalMs = 30_000) => {
    const tick = () => {
      if (userActiveStreams.size === 0) {
        fn().catch(e => console.error(`Boot-time ${label} error:`, e.message));
      } else {
        setTimeout(tick, intervalMs);
      }
    };
    tick();
  };
  setTimeout(() => startBackfillWhenIdle(backfillVisualCaptions, 'vision backfill'), 30000);
  // ~60s after boot, render page-image PNGs for any PDF that doesn't have
  // them yet. Cheap to check (one storage list per PDF); only renders when
  // the folder is empty. Lets visual-grounding chat work on courses
  // uploaded before page rendering shipped, without requiring a manual
  // reindex per course.
  setTimeout(() => startBackfillWhenIdle(backfillPageImages, 'page-image backfill'), 60000);
});