import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import os from 'os';

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
const MODEL = 'gemini-2.5-flash';

const ai = new GoogleGenAI({ vertexai: true, project: PROJECT, location: LOCATION });
console.log(`✅ Vertex AI ready — project: ${PROJECT}, model: ${MODEL}`);

// ── Supabase ──────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY
);
console.log('✅ Supabase connected');

function getMimeType(filename) {
  const ext = filename.toLowerCase().split('.').pop();
  const map = {
    'pdf': 'application/pdf',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
  };
  return map[ext] || null;
}

function isImage(mimeType) {
  return mimeType && mimeType.startsWith('image/');
}

const SYSTEM_PROMPT = `You are Scholr — a brilliant, concise academic tutor. You read every uploaded document and image and answer questions with precision and confidence.

You have access to two types of materials:
- **Professor documents** [Professor document: filename] — course materials: syllabus, lecture notes, readings, diagrams, slides
- **Student notes** [Student note: filename] — personal files the student uploaded: notes, photos of whiteboards, handwritten notes, study guides

Read ALL documents and images. Pull from any of them to answer.

You also have access to the full conversation history. Use it to understand context — if a student says "explain that more" or "what about the second one", refer back to what was just discussed.

---

# HOW TO ANSWER

**Lead with the answer.** One sharp sentence. No preamble, no "great question", no "based on the document". Just the answer.

**Then support it briefly.** 2-4 sentences max. Use the document's exact numbers, dates, and names. Cite pages inline like (p. 3). For images, describe what you see and reference it clearly.

**Use formatting only when it helps:**
- Bullet lists for 3+ items or steps
- **Bold** for key terms, names, numbers
- Tables only for grading breakdowns with 4+ components
- NO headers unless the answer has truly separate sections

**Keep it tight.** Cut every word that doesn't add meaning.

**For broad questions**: give a 2-3 sentence overview, then offer to go deeper. Don't dump everything.

**For grade/logistics questions**: extract the exact numbers. Show calculations step by step. Be precise.

**For image questions**: describe what's visible, read any text in the image, and answer based on what you see.

**For follow-up questions**: use the conversation history to understand what they're referring to. Never ask "what do you mean?" — infer from context.

---

# FOLLOW-UP QUESTIONS
End with one sharp, specific follow-up question. Skip it for simple factual answers.

---

# WHEN NOTHING IS FOUND
Say exactly: "**This doesn't appear to be in any of your uploaded documents.**" Don't guess. Don't pull from general knowledge.

---

# SOURCE LINE (REQUIRED)
After a blank line at the very end, write:
SOURCES: DocumentName1.pdf, DocumentName2.jpg

Only list documents/images you actually used. This line is parsed separately — do not include it in the answer body.`;

// ── In-memory document cache ──────────────────────────────────────────────────
let documents = {};
let questionsCache = null;

// ── Load documents from Supabase Storage on startup ──────────────────────────
async function loadDocumentsFromStorage() {
  try {
    const { data, error } = await supabase.storage.from('documents').list('', { limit: 100 });
    if (error || !data) return;
    for (const file of data) {
      const { data: fileData, error: dlError } = await supabase.storage.from('documents').download(file.name);
      if (dlError || !fileData) continue;
      const arrayBuffer = await fileData.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const mimeType = getMimeType(file.name) || 'application/pdf';
      const sizeKb = Math.round(buffer.length / 1024);
      documents[file.name] = { buffer, sizeKb, mimeType, uploadedAt: file.created_at };
      console.log(`✅ Loaded from storage: ${file.name}`);
    }
    console.log(`✅ Loaded ${Object.keys(documents).length} documents from Supabase Storage`);
  } catch (err) {
    console.error('Failed to load documents from storage:', err.message);
  }
}

// ── Log question to Supabase ──────────────────────────────────────────────────
async function logQuestion(question, confident = true) {
  try {
    await supabase.from('questions').insert({ question, confident });
  } catch (err) {
    console.error('Failed to log question:', err.message);
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

// ── Get insights from Supabase ────────────────────────────────────────────────
async function getInsights() {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: allQuestions } = await supabase
      .from('questions').select('*').order('ts', { ascending: false }).limit(1000);

    const { data: weekQuestions } = await supabase
      .from('questions').select('*').gte('ts', weekAgo);

    const { data: flagged } = await supabase
      .from('questions').select('*').eq('confident', false)
      .order('ts', { ascending: false }).limit(10);

    const total = allQuestions?.length || 0;
    const weekCount = weekQuestions?.length || 0;
    const timeSavedMins = weekCount * 3;
    const timeSavedHours = Math.floor(timeSavedMins / 60);
    const timeSavedMinutes = timeSavedMins % 60;

    const topicCounts = {};
    (weekQuestions || []).forEach(q => {
      const tag = getTopicTag(q.question);
      topicCounts[tag] = (topicCounts[tag] || 0) + 1;
    });
    const topTopics = Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1]).slice(0, 4)
      .map(([topic, count]) => ({ topic, count }));

    const hourCounts = {};
    (weekQuestions || []).forEach(q => {
      const hour = new Date(q.ts).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
    const peakHourLabel = peakHour
      ? `${peakHour[0] % 12 || 12}${parseInt(peakHour[0]) < 12 ? 'am' : 'pm'}`
      : null;

    const recent = (allQuestions || []).slice(0, 50);
    const lastQuestion = recent[0] || null;

    return {
      totalQuestions: total, weekQuestions: weekCount,
      timeSavedHours, timeSavedMinutes, timeSavedMins,
      topTopics, peakHourLabel,
      flagged: flagged || [], recent, lastQuestion,
    };
  } catch (err) {
    console.error('Insights error:', err.message);
    return {
      totalQuestions: 0, weekQuestions: 0, timeSavedHours: 0,
      timeSavedMinutes: 0, timeSavedMins: 0, topTopics: [],
      peakHourLabel: null, flagged: [], recent: [], lastQuestion: null,
    };
  }
}

function invalidateQuestionsCache() { questionsCache = null; }

async function generateSuggestedQuestions() {
  if (Object.keys(documents).length === 0) return [];
  const firstPdf = Object.entries(documents).find(([, doc]) => doc.mimeType === 'application/pdf');
  if (!firstPdf) return ["What are the main topics in this course?", "Summarize the key concepts from the materials", "What should I focus on for the exam?"];
  try {
    const pdfPart = { inlineData: { mimeType: 'application/pdf', data: firstPdf[1].buffer.toString('base64') } };
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [pdfPart, { text: `Read this course document and write exactly 3 short student questions about the content. Each question must be under 8 words. Output only a JSON array on a single line.\n\nExample: ["Short question one?","Short question two?","Short question three?"]` }] }],
      config: { temperature: 0.5, maxOutputTokens: 256 },
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
    return Array.isArray(questions) && questions.length > 0
      ? questions.slice(0, 3)
      : ["What are the main topics in this course?", "Summarize the key concepts from the materials", "What should I focus on for the exam?"];
  } catch (err) {
    console.error('Suggested questions error:', err.message);
    return ["What are the main topics in this course?", "Summarize the key concepts from the materials", "What should I focus on for the exam?"];
  }
}

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(fileUpload({ limits: { fileSize: 50 * 1024 * 1024 } }));

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Upload — saves to Supabase Storage ───────────────────────────────────────
app.post('/upload', async (req, res) => {
  try {
    const file = req.files?.file || req.files?.pdf;
    if (!file) return res.status(400).json({ error: 'No file uploaded' });
    const mimeType = getMimeType(file.name);
    if (!mimeType) return res.status(400).json({ error: 'Unsupported file type.' });

    const buffer = Buffer.from(file.data);
    const sizeKb = Math.round(buffer.length / 1024);

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(file.name, buffer, { contentType: mimeType, upsert: true });

    if (uploadError) {
      console.error('Storage upload error:', uploadError.message);
      return res.status(500).json({ error: 'Failed to upload to storage: ' + uploadError.message });
    }

    await supabase.from('documents').upsert({
      name: file.name, size_kb: sizeKb, mime_type: mimeType,
      storage_path: file.name, uploaded_at: new Date().toISOString()
    }, { onConflict: 'name' });

    documents[file.name] = { buffer, sizeKb, mimeType, uploadedAt: new Date().toISOString() };
    console.log(`✅ Uploaded: ${file.name} (${mimeType}) — ${sizeKb}kb`);
    invalidateQuestionsCache();
    res.json({ success: true, fileName: file.name, sizeKb, mimeType });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to process file: ' + err.message });
  }
});

app.get('/documents', async (req, res) => {
  try {
    const { data } = await supabase.from('documents').select('*').order('uploaded_at', { ascending: false });
    res.json((data || []).map(d => ({
      name: d.name, sizeKb: d.size_kb, mimeType: d.mime_type, uploadedAt: d.uploaded_at
    })));
  } catch {
    res.json(Object.entries(documents).map(([name, doc]) => ({
      name, sizeKb: doc.sizeKb, mimeType: doc.mimeType, uploadedAt: doc.uploadedAt
    })));
  }
});

app.delete('/document/:name', async (req, res) => {
  const name = decodeURIComponent(req.params.name);
  try {
    await supabase.storage.from('documents').remove([name]);
    await supabase.from('documents').delete().eq('name', name);
    delete documents[name];
    invalidateQuestionsCache();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/log-question', async (req, res) => {
  const { question, confident } = req.body;
  if (!question) return res.status(400).json({ error: 'No question provided' });
  await logQuestion(question, confident !== false);
  res.json({ success: true });
});

app.get('/insights', async (req, res) => { res.json(await getInsights()); });

app.post('/auth', (req, res) => {
  const { password } = req.body;
  const correct = process.env.ACCESS_PASSWORD || 'scholr2026';
  if (password === correct) return res.json({ success: true });
  res.status(401).json({ error: 'Invalid password' });
});

// ── Chat ──────────────────────────────────────────────────────────────────────
app.post('/chat', async (req, res) => {
  try {
    const message = req.body?.message;
    const history = req.body?.history || [];

    if (!message) return res.status(400).json({ error: 'No message provided' });
    if (Object.keys(documents).length === 0)
      return res.status(400).json({ error: 'No documents uploaded yet' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const docNames = Object.keys(documents);
    const docParts = [];

    for (const [name, doc] of Object.entries(documents)) {
      docParts.push({ inlineData: { mimeType: doc.mimeType, data: doc.buffer.toString('base64') } });
      const label = isImage(doc.mimeType) ? `[Professor image: ${name}]` : `[Professor document: ${name}]`;
      docParts.push({ text: label });
    }

    if (req.files) {
      Object.entries(req.files).forEach(([key, file]) => {
        if (key.startsWith('note_')) {
          const buf = Buffer.from(file.data);
          const mime = getMimeType(file.name) || 'application/pdf';
          docParts.push({ inlineData: { mimeType: mime, data: buf.toString('base64') } });
          const label = isImage(mime) ? `[Student image: ${file.name}]` : `[Student note: ${file.name}]`;
          docParts.push({ text: label });
          docNames.push(file.name);
        }
      });
    }

    const contents = [];
    if (history.length === 0) {
      contents.push({ role: 'user', parts: [...docParts, { text: `STUDENT QUESTION: ${message}` }] });
    } else {
      const firstUserMsg = history[0];
      contents.push({ role: 'user', parts: [...docParts, { text: `STUDENT QUESTION: ${firstUserMsg.content}` }] });
      for (let i = 1; i < history.length; i++) {
        const msg = history[i];
        const content = msg.role === 'assistant' ? msg.content.replace(/\nSOURCES:.*$/m, '').trim() : msg.content;
        contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: content }] });
      }
      contents.push({ role: 'user', parts: [{ text: `STUDENT QUESTION: ${message}` }] });
    }

    res.write(`data: ${JSON.stringify({ type: 'citations', citations: [] })}\n\n`);

    const stream = await ai.models.generateContentStream({
      model: MODEL,
      contents,
      config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.3, maxOutputTokens: 2048 },
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
    const sources = sourcesMatch
      ? sourcesMatch[1].split(',').map(s => s.trim()).filter(s => s.length > 0)
      : docNames;

    const confident = !fullText.toLowerCase().includes("doesn't appear to be in any of your uploaded");
    await logQuestion(message, confident);

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
  } catch {
    res.json({ questions: ["What are the main topics in this course?", "Summarize the key concepts from the materials", "What should I focus on for the exam?"] });
  }
});

app.post('/generate-title', (req, res) => {
  const { question } = req.body;
  if (!question) return res.json({ title: 'New Chat' });
  const title = question.trim().split(/\s+/).slice(0, 5).join(' ').replace(/[.!?,:]+$/, '');
  res.json({ title });
});

// ── Start server ──────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`✅ ScholrAI running on port ${PORT}`);
  await loadDocumentsFromStorage();
});