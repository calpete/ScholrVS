import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
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

const SYSTEM_PROMPT = `You are Scholr — a brilliant, concise academic tutor. You read every uploaded document and answer questions with precision and confidence.

You have access to two types of documents:
- **Professor documents** [Professor document: filename] — course materials: syllabus, lecture notes, readings
- **Student notes** [Student note: filename] — personal files the student uploaded: notes, resume, study guides

Read ALL documents. Pull from any of them to answer.

You also have access to the full conversation history. Use it to understand context — if a student says "explain that more" or "what about the second one", refer back to what was just discussed.

---

# HOW TO ANSWER

**Lead with the answer.** One sharp sentence. No preamble, no "great question", no "based on the document". Just the answer.

**Then support it briefly.** 2-4 sentences max. Use the document's exact numbers, dates, and names. Cite pages inline like (p. 3).

**Use formatting only when it helps:**
- Bullet lists for 3+ items or steps
- **Bold** for key terms, names, numbers
- Tables only for grading breakdowns with 4+ components
- NO headers unless the answer has truly separate sections

**Keep it tight.** Cut every word that doesn't add meaning. If something can be said in 5 words, don't use 10.

**For broad questions** ("what is his experience", "summarize the course"): give a 2-3 sentence overview, then offer to go deeper on any part. Don't dump everything.

**For grade/logistics questions**: extract the exact numbers. Show calculations step by step. Be precise.

**For personal document questions** (resume, notes): answer directly from what's there. Cross-reference course materials only if genuinely relevant.

**For follow-up questions** ("explain that more", "what about X", "and the second one"): use the conversation history to understand what they're referring to. Never ask "what do you mean?" — infer from context.

---

# FOLLOW-UP QUESTIONS
End with one sharp, specific follow-up question — not generic but pointed and useful. Skip it for simple one-word factual answers.

---

# WHEN NOTHING IS FOUND
Say exactly: "**This doesn't appear to be in any of your uploaded documents.**" Don't guess. Don't pull from general knowledge.

---

# SOURCE LINE (REQUIRED)
After a blank line at the very end, write:
SOURCES: DocumentName1.pdf, DocumentName2.pdf

Only list documents you actually used. This line is parsed separately — do not include it in the answer body.`;

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

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(fileUpload({ limits: { fileSize: 50 * 1024 * 1024 } }));

app.post('/upload', async (req, res) => {
  try {
    if (!req.files?.pdf) return res.status(400).json({ error: 'No PDF uploaded' });
    const file = req.files.pdf;
    const buffer = Buffer.from(file.data);
    const sizeKb = Math.round(buffer.length / 1024);
    documents[file.name] = { buffer, sizeKb, uploadedAt: new Date().toISOString() };
    console.log(`✅ Uploaded: ${file.name} — ${sizeKb}kb`);
    invalidateQuestionsCache();
    res.json({ success: true, fileName: file.name, sizeKb });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Failed to process PDF: ' + err.message });
  }
});

app.get('/documents', (req, res) => {
  res.json(Object.entries(documents).map(([name, doc]) => ({
    name, sizeKb: doc.sizeKb, uploadedAt: doc.uploadedAt
  })));
});

app.delete('/document/:name', (req, res) => {
  const name = decodeURIComponent(req.params.name);
  if (!documents[name]) return res.status(404).json({ error: 'Not found' });
  delete documents[name];
  invalidateQuestionsCache();
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
    const message = req.body?.message;
    const history = req.body?.history || []; // conversation history from frontend

    if (!message) return res.status(400).json({ error: 'No message provided' });
    if (Object.keys(documents).length === 0)
      return res.status(400).json({ error: 'No documents uploaded yet' });

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const docNames = Object.keys(documents);

    // Build document parts (PDFs + labels)
    const docParts = [];
    for (const [name, doc] of Object.entries(documents)) {
      docParts.push({ inlineData: { mimeType: 'application/pdf', data: doc.buffer.toString('base64') } });
      docParts.push({ text: `[Professor document: ${name}]` });
    }

    // Student notes (sent as multipart files)
    if (req.files) {
      Object.entries(req.files).forEach(([key, file]) => {
        if (key.startsWith('note_')) {
          const buf = Buffer.from(file.data);
          docParts.push({ inlineData: { mimeType: 'application/pdf', data: buf.toString('base64') } });
          docParts.push({ text: `[Student note: ${file.name}]` });
          docNames.push(file.name);
        }
      });
    }

    // Build conversation contents with full history
    // First message always includes the documents so Gemini has context throughout
    const contents = [];

    if (history.length === 0) {
      // First message in conversation — include docs
      contents.push({
        role: 'user',
        parts: [...docParts, { text: `STUDENT QUESTION: ${message}` }]
      });
    } else {
      // Subsequent messages — include docs in first turn, then conversation history, then new message
      const firstUserMsg = history[0];
      contents.push({
        role: 'user',
        parts: [...docParts, { text: `STUDENT QUESTION: ${firstUserMsg.content}` }]
      });

      // Add rest of history (alternating user/assistant)
      for (let i = 1; i < history.length; i++) {
        const msg = history[i];
        // Strip SOURCES line from assistant messages
        const content = msg.role === 'assistant'
          ? msg.content.replace(/\nSOURCES:.*$/m, '').trim()
          : msg.content;
        contents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: content }]
        });
      }

      // Add new message
      contents.push({
        role: 'user',
        parts: [{ text: `STUDENT QUESTION: ${message}` }]
      });
    }

    res.write(`data: ${JSON.stringify({ type: 'citations', citations: [] })}\n\n`);

    const stream = await ai.models.generateContentStream({
      model: MODEL,
      contents,
      config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.3, maxOutputTokens: 4096 },
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

    const confident = !fullText.toLowerCase().includes("doesn't appear to be in any of your uploaded");
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