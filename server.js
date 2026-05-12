import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createRequire } from 'module';

dotenv.config();

const require = createRequire(import.meta.url);
const PDFParser = require('pdf2json');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const PROJECT = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT_ID || 'scholr-dev';
const LOCATION = process.env.GCP_LOCATION || 'us-central1';
const MODEL = 'gemini-2.5-flash';

const ai = new GoogleGenAI({ vertexai: true, project: PROJECT, location: LOCATION });
console.log(`✅ Vertex AI ready — project: ${PROJECT}, model: ${MODEL}`);

const SYSTEM_PROMPT = `You are Scholr — a sharp, patient, encouraging university tutor helping a student understand their course materials.

# Your job
Answer the student's question using ONLY the EXCERPTS provided in the user message below. Never use outside knowledge. If the materials don't cover something, say so directly.

# How to write answers
Lead with a clear one-sentence direct answer. Then unpack it. Match the depth to the question — a one-line question gets a tight reply; a "explain X to me" gets a structured walkthrough.

Format every response in clean markdown:
- Use **bold** for key terms and concepts the student should remember.
- Use \`## Header\` only when the answer has 2+ genuinely distinct sections. Don't over-structure short answers.
- Use bullet or numbered lists when listing items, comparing things, or describing steps.
- Use \`> blockquotes\` when quoting directly from the materials (more than ~10 consecutive words).
- Keep paragraphs short — 2 to 4 sentences each. White space matters.
- If something is technical, define it the first time you use it.

# Citations (REQUIRED)
After every factual claim, add the source number in brackets like [1] or [2]. These numbers match the SOURCE labels in the excerpts. Place them at the end of the relevant sentence, not at the end of the whole answer. Multiple sources? Use [1][3], not [1, 3].

# When the question isn't covered
Say plainly: "**This isn't covered in your course materials.**" Then suggest the closest related topic that IS in the materials and ask if they'd like to explore that instead. Never invent an answer.

# Tone
Smart, warm, encouraging. Like a TA who genuinely cares. Never condescending. Never robotic. Never apologize for limitations — just be useful within them.

# Closing
For substantive answers, end with one brief follow-up: a question that deepens understanding ("Want me to walk through an example?") or points to a related concept in the materials. Skip this for tiny answers.`;

let documents = {};

// --- Suggested questions cache ---
let questionsCache = null;

function invalidateQuestionsCache() {
  questionsCache = null;
  console.log('🔄 Suggested questions cache cleared');
}

async function generateSuggestedQuestions() {
  if (Object.keys(documents).length === 0) return [];

  const sample = Object.entries(documents).map(([name, doc]) => {
    const preview = doc.chunks.slice(0, 5).map(c => c.text).join(' ');
    return `[${name}]\n${preview}`;
  }).join('\n\n').slice(0, 2000);

  const prompt = `Read these university course material excerpts and write exactly 3 short student questions about the content. Each question must be under 8 words. Output only a JSON array on a single line with no newlines inside it.

EXCERPTS:
${sample}

Output example (single line): ["Short question one?","Short question two?","Short question three?"]`;

  const result = await ai.models.generateContent({
    model: MODEL,
    contents: prompt,
    config: { temperature: 0.5, maxOutputTokens: 1024 },
  });

  const raw = result.text.trim();
  console.log('Gemini suggested questions:', raw);

  let questions = [];
  try {
    const arrayMatch = raw.match(/\[.*?\]/s);
    if (arrayMatch) questions = JSON.parse(arrayMatch[0]);
  } catch {
    const matches = raw.match(/"([^"]{5,60})"/g);
    if (matches) questions = matches.map(m => m.replace(/"/g, '')).slice(0, 3);
  }

  return Array.isArray(questions) && questions.length > 0
    ? questions.slice(0, 3)
    : [
        "What are the main topics in this course?",
        "Summarize the key concepts from the materials",
        "What should I focus on for the exam?"
      ];
}

function extractPdfText(buffer) {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser(null, 1);
    parser.on('pdfParser_dataError', err => reject(err));
    parser.on('pdfParser_dataReady', () => {
      const text = parser.getRawTextContent();
      resolve(text);
    });
    parser.parseBuffer(buffer);
  });
}

function chunkText(text, chunkSize = 800, overlap = 100) {
  const chunks = [];
  const pages = text.split(/\f/).filter(p => p.trim().length > 0);
  if (pages.length > 1) {
    pages.forEach((pageText, pageIndex) => {
      let start = 0;
      while (start < pageText.length) {
        const content = pageText.slice(start, Math.min(start + chunkSize, pageText.length)).trim();
        if (content.length > 50) chunks.push({ text: content, page: pageIndex + 1 });
        start += chunkSize - overlap;
      }
    });
  } else {
    let start = 0;
    while (start < text.length) {
      const content = text.slice(start, Math.min(start + chunkSize, text.length)).trim();
      if (content.length > 50) chunks.push({ text: content, page: Math.ceil(start / 3000) + 1 });
      start += chunkSize - overlap;
    }
  }
  return chunks;
}

function retrieveChunks(query, docName, topK = 5) {
  const doc = documents[docName];
  if (!doc) return [];
  const words = query.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  return doc.chunks
    .map(chunk => ({ ...chunk, score: words.reduce((acc, w) => acc + (chunk.text.toLowerCase().match(new RegExp(w, 'g')) || []).length, 0) }))
    .filter(c => c.score > 0).sort((a, b) => b.score - a.score).slice(0, topK);
}

function retrieveAllDocs(query, topK = 6) {
  const all = [];
  const words = query.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  for (const [docName, doc] of Object.entries(documents)) {
    doc.chunks.forEach(chunk => {
      const score = words.reduce((acc, w) => acc + (chunk.text.toLowerCase().match(new RegExp(w, 'g')) || []).length, 0);
      if (score > 0) all.push({ ...chunk, score, docName });
    });
  }
  return all.sort((a, b) => b.score - a.score).slice(0, topK);
}

app.use(cors());
app.use(express.json());
app.use(fileUpload({ limits: { fileSize: 50 * 1024 * 1024 } }));

app.post('/upload', async (req, res) => {
  try {
    if (!req.files?.pdf) return res.status(400).json({ error: 'No PDF uploaded' });
    const file = req.files.pdf;
    const text = await extractPdfText(file.data);
    if (!text || text.trim().length < 50)
      return res.status(400).json({ error: 'Could not extract text — PDF may be scanned or image-based' });
    const chunks = chunkText(text);
    documents[file.name] = { text, chunks, uploadedAt: new Date().toISOString() };
    console.log(`✅ Uploaded: ${file.name} — ${chunks.length} chunks`);

    // Invalidate cache and regenerate in background
    invalidateQuestionsCache();
    generateSuggestedQuestions().then(q => {
      questionsCache = q;
      console.log('✅ Suggested questions cached');
    }).catch(err => console.error('Cache generation error:', err.message));

    res.json({ success: true, fileName: file.name, chunkCount: chunks.length, charCount: text.length });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to process PDF: ' + err.message });
  }
});

app.get('/documents', (req, res) => {
  res.json(Object.entries(documents).map(([name, doc]) => ({
    name, chunkCount: doc.chunks.length, charCount: doc.text.length, uploadedAt: doc.uploadedAt
  })));
});

app.delete('/document/:name', (req, res) => {
  const name = decodeURIComponent(req.params.name);
  if (!documents[name]) return res.status(404).json({ error: 'Not found' });
  delete documents[name];
  invalidateQuestionsCache();

  // Regenerate in background if other docs still exist
  if (Object.keys(documents).length > 0) {
    generateSuggestedQuestions().then(q => {
      questionsCache = q;
      console.log('✅ Suggested questions re-cached after delete');
    }).catch(err => console.error('Cache regeneration error:', err.message));
  }

  res.json({ success: true });
});

app.post('/chat', async (req, res) => {
  try {
    const { message, documentName } = req.body;
    if (!message) return res.status(400).json({ error: 'No message provided' });
    if (Object.keys(documents).length === 0)
      return res.status(400).json({ error: 'No documents uploaded yet' });

    const chunks = documentName ? retrieveChunks(message, documentName) : retrieveAllDocs(message);

    if (chunks.length === 0) {
      return res.json({
        answer: "I couldn't find anything in the course materials covering this. Try rephrasing.",
        citations: []
      });
    }

    const context = chunks.map((chunk, i) =>
      `[SOURCE ${i + 1} — ${chunk.docName || documentName}, page ${chunk.page}]\n${chunk.text}`
    ).join('\n\n');

    const userMessage = `EXCERPTS FROM THE COURSE MATERIALS:

${context}

---

STUDENT QUESTION:
${message}`;

    const result = await ai.models.generateContent({
      model: MODEL,
      contents: userMessage,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        temperature: 0.4,
        maxOutputTokens: 500,
      },
    });
    const answer = result.text || '';
    const citations = chunks.map((chunk, i) => ({
      number: i + 1,
      source: chunk.docName || documentName,
      page: chunk.page,
      excerpt: chunk.text.slice(0, 200) + (chunk.text.length > 200 ? '...' : '')
    }));

    res.json({ answer, citations });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: `Error: ${err.message}` });
  }
});

app.get('/suggested-questions', async (req, res) => {
  try {
    if (Object.keys(documents).length === 0) return res.json({ questions: [] });

    // Return cache instantly if available
    if (questionsCache) {
      return res.json({ questions: questionsCache });
    }

    // Otherwise generate and cache
    const questions = await generateSuggestedQuestions();
    questionsCache = questions;
    res.json({ questions });
  } catch (err) {
    console.error('Suggested questions error:', err.message);
    res.json({ questions: [
      "What are the main topics in this course?",
      "Summarize the key concepts from the materials",
      "What should I focus on for the exam?"
    ]});
  }
});

app.listen(PORT, () => console.log(`✅ ScholrAI running on http://localhost:${PORT}`));