import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createRequire } from 'module';
import fs from 'fs';
import os from 'os';

dotenv.config();

// ── Google Credentials from env var (for cloud deployment) ──────────────────
if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  const tmpPath = path.join(os.tmpdir(), 'gcp-credentials.json');
  fs.writeFileSync(tmpPath, process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  process.env.GOOGLE_APPLICATION_CREDENTIALS = tmpPath;
  console.log('✅ GCP credentials written from env var');
}
// ────────────────────────────────────────────────────────────────────────────

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

You have access to the actual uploaded course documents — PDFs that Gemini can read directly including all tables, formatting, and structure.

You handle two types of questions:

---

# TYPE 1: Course content questions
Questions about concepts, theories, topics, arguments, definitions, or anything requiring subject matter understanding.

How to answer:
- Use ONLY information from the provided course documents. Never use outside knowledge.
- Lead with a clear one-sentence direct answer, then unpack it.
- Use **bold** for key terms and concepts.
- Use bullet or numbered lists when comparing, listing steps, or enumerating items.
- Use ## headers only when the answer has 2+ genuinely distinct sections.
- Keep paragraphs short — 2 to 4 sentences.
- Cite page numbers when referencing specific content, e.g. (p. 3).
- End with one brief follow-up question that deepens understanding. Skip for short answers.

---

# TYPE 2: Logistics and grade questions
Questions about deadlines, exam dates, grading weights, office hours, policies, grade calculations.

How to answer:
- Read the documents carefully including all tables and formatted sections.
- For grading tables: extract every component and its exact percentage weight.
- For grade calculations: show your math step by step with the actual weights from the document.
- If the student gives scores, calculate their current grade and project what they need on remaining work.
- Answer directly — no hedging if the information is clearly in the document.

---

# When nothing is covered
Say: "**This doesn't appear to be in your uploaded course materials.**" Never invent an answer.

# Source attribution (REQUIRED)
At the very end of your response, after a blank line, add a line in exactly this format:
SOURCES: DocumentName1.pdf, DocumentName2.pdf

List only the documents you actually referenced. Use the exact document names provided. This line will be parsed and displayed separately — do not include it in the main body of your answer.

# Tone
Smart, warm, encouraging. Like a TA who genuinely cares.`;

let documents = {};
let questionsCache = null;
let questionLog = [];

function logQuestion(question, confident = true) {
  questionLog.push({ id: Date.now(), question, ts: new Date().toISOString(), confident });
  if (questionLog.length > 1000) questionLog = questionLog.slice(-1000);
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

function getInsights() {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const weekQuestions = questionLog.filter(q => new Date(q.ts).getTime() > weekAgo);

  const timeSavedMins = weekQuestions.length * 3;
  const timeSavedHours = Math.floor(timeSavedMins / 60);
  const timeSavedMinutes = timeSavedMins % 60;

  const topicCounts = {};
  weekQuestions.forEach(q => {
    const tag = getTopicTag(q.question);
    topicCounts[tag] = (topicCounts[tag] || 0) + 1;
  });
  const topTopics = Object.entries(topicCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([topic, count]) => ({ topic, count }));

  const hourCounts = {};
  weekQuestions.forEach(q => {
    const hour = new Date(q.ts).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
  const peakHourLabel = peakHour
    ? `${peakHour[0] % 12 || 12}${parseInt(peakHour[0]) < 12 ? 'am' : 'pm'}`
    : null;

  const flagged = questionLog.filter(q => !q.confident).slice(-10).reverse();
  const recent = [...questionLog].reverse().slice(0, 50);
  const lastQuestion = questionLog[questionLog.length - 1] || null;

  return {
    totalQuestions: questionLog.length,
    weekQuestions: weekQuestions.length,
    timeSavedHours,
    timeSavedMinutes,
    timeSavedMins,
    topTopics,
    peakHourLabel,
    flagged,
    recent,
    lastQuestion,
  };
}

function invalidateQuestionsCache() {
  questionsCache = null;
  console.log('🔄 Suggested questions cache cleared');
}

async function generateSuggestedQuestions() {
  if (Object.keys(documents).length === 0) return [];
  const firstDoc = Object.entries(documents)[0];
  try {
    const pdfPart = { inlineData: { mimeType: 'application/pdf', data: firstDoc[1].buffer.toString('base64') } };
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [
        pdfPart,
        { text: `Read this course document and write exactly 3 short student questions about the content. Each question must be under 8 words. Output only a JSON array on a single line with no newlines inside it.\n\nOutput example (single line): ["Short question one?","Short question two?","Short question three?"]` }
      ]}],
      config: { temperature: 0.5, maxOutputTokens: 1024 },
    });
    const raw = result.text.trim();
    let questions = [];
    try {
      const arrayMatch = raw.match(/\[.*?\]/s);
      if (arrayMatch) questions = JSON.parse(arrayMatch[0]);
    } catch {
      const matches = raw.match(/"([^"]{5,60})"/g);
      if (matches) questions = matches.map(m => m.replace(/"/g, '')).slice(0, 3);
    }
    return Array.isArray(questions) && questions.length > 0 ? questions.slice(0, 3) : [
      "What are the main topics in this course?",
      "Summarize the key concepts from the materials",
      "What should I focus on for the exam?"
    ];
  } catch (err) {
    console.error('Suggested questions error:', err.message);
    return [
      "What are the main topics in this course?",
      "Summarize the key concepts from the materials",
      "What should I focus on for the exam?"
    ];
  }
}

function extractPdfText(buffer) {
  return new Promise((resolve, reject) => {
    const parser = new PDFParser(null, 1);
    parser.on('pdfParser_dataError', err => reject(err));
    parser.on('pdfParser_dataReady', () => resolve(parser.getRawTextContent()));
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

app.use(cors());
app.use(express.json());
app.use(fileUpload({ limits: { fileSize: 50 * 1024 * 1024 } }));

app.post('/upload', async (req, res) => {
  try {
    if (!req.files?.pdf) return res.status(400).json({ error: 'No PDF uploaded' });
    const file = req.files.pdf;
    const buffer = Buffer.from(file.data);
    let text = '';
    let chunks = [];
    try {
      text = await extractPdfText(buffer);
      chunks = chunkText(text);
    } catch (e) {
      console.warn('Text extraction failed, using native PDF only:', e.message);
    }
    documents[file.name] = { buffer, text, chunks, uploadedAt: new Date().toISOString() };
    console.log(`✅ Uploaded: ${file.name} — ${chunks.length} chunks`);
    invalidateQuestionsCache();
    generateSuggestedQuestions().then(q => { questionsCache = q; console.log('✅ Questions cached'); }).catch(() => {});
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
  if (Object.keys(documents).length > 0) {
    generateSuggestedQuestions().then(q => { questionsCache = q; }).catch(() => {});
  }
  res.json({ success: true });
});

app.post('/log-question', (req, res) => {
  const { question, confident } = req.body;
  if (!question) return res.status(400).json({ error: 'No question provided' });
  logQuestion(question, confident !== false);
  res.json({ success: true });
});

app.get('/insights', (req, res) => {
  res.json(getInsights());
});

app.post('/auth', (req, res) => {
  const { password } = req.body;
  const correct = process.env.ACCESS_PASSWORD || 'scholr2026';
  if (password === correct) return res.json({ success: true });
  res.status(401).json({ error: 'Invalid password' });
});

app.post('/chat', async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'No message provided' });
    if (Object.keys(documents).length === 0)
      return res.status(400).json({ error: 'No documents uploaded yet' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const parts = [];
    const docNames = Object.keys(documents);

    for (const [name, doc] of Object.entries(documents)) {
      parts.push({ inlineData: { mimeType: 'application/pdf', data: doc.buffer.toString('base64') } });
      parts.push({ text: `[Document: ${name}]` });
    }

    parts.push({ text: `\nSTUDENT QUESTION: ${message}` });
    res.write(`data: ${JSON.stringify({ type: 'citations', citations: [] })}\n\n`);

    const stream = await ai.models.generateContentStream({
      model: MODEL,
      contents: [{ role: 'user', parts }],
      config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.4, maxOutputTokens: 8192 },
    });

    let fullText = '';
    for await (const chunk of stream) {
      const token = chunk.text;
      if (token) {
        fullText += token;
        res.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`);
      }
    }

    const sourcesMatch = fullText.match(/\nSOURCES:\s*(.+)$/m);
    let sources = sourcesMatch
      ? sourcesMatch[1].split(',').map(s => s.trim()).filter(s => s.length > 0)
      : docNames;

    const confident = !fullText.toLowerCase().includes("doesn't appear to be in your uploaded");
    logQuestion(message, confident);

    res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Chat error:', err.message);
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    res.end();
  }
});

app.get('/suggested-questions', async (req, res) => {
  try {
    if (Object.keys(documents).length === 0) return res.json({ questions: [] });
    if (questionsCache) return res.json({ questions: questionsCache });
    const questions = await generateSuggestedQuestions();
    questionsCache = questions;
    res.json({ questions });
  } catch (err) {
    res.json({ questions: [
      "What are the main topics in this course?",
      "Summarize the key concepts from the materials",
      "What should I focus on for the exam?"
    ]});
  }
});

app.listen(PORT, () => console.log(`✅ ScholrAI running on port ${PORT}`));