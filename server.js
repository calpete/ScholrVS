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

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);
console.log('✅ Supabase connected');

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

const SYSTEM_PROMPT = `You are Scholr — a brilliant, concise academic tutor. You read every uploaded document and image and answer questions with precision and confidence.

You have access to two types of materials:
- **Professor documents** [Professor document: filename] — course materials: syllabus, lecture notes, readings, diagrams, slides
- **Student notes** [Student note: filename] — personal files the student uploaded: notes, photos of whiteboards, handwritten notes, study guides

Read ALL documents and images. Pull from any of them to answer.

You also have access to the full conversation history. Use it to understand context — if a student says "explain that more" or "what about the second one", refer back to what was just discussed.

# HOW TO ANSWER
**Lead with the answer.** One sharp sentence. No preamble, no "great question", no "based on the document". Just the answer.
**Then support it briefly.** 2-4 sentences max. Use the document's exact numbers, dates, and names. Cite pages inline like (p. 3).
**Use formatting only when it helps:** bullet lists for 3+ items, **bold** for key terms, tables only for grading breakdowns with 4+ components, NO headers unless truly separate sections.
**Keep it tight.** Cut every word that doesn't add meaning.
**For broad questions**: give a 2-3 sentence overview, then offer to go deeper.
**For grade/logistics questions**: extract the exact numbers. Show calculations step by step.
**For follow-up questions**: use the conversation history. Never ask "what do you mean?" — infer from context.

# FOLLOW-UP QUESTIONS
End with one sharp, specific follow-up question. Skip it for simple factual answers.

# WHEN NOTHING IS FOUND
Say exactly: "**This doesn't appear to be in any of your uploaded documents.**" Don't guess.

# SOURCE LINE (REQUIRED)
After a blank line at the very end, write:
SOURCES: DocumentName1.pdf, DocumentName2.jpg
Only list documents you actually used. This line is parsed separately.`;

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

// ── Gemini File API helpers ───────────────────────────────────────────────────

// Upload a single file to Gemini File API and return the URI + expiry
async function uploadToGemini(buffer, mimeType, displayName) {
  try {
    // Write to a temp file — the Gemini SDK needs a file path
    const tmpPath = path.join(os.tmpdir(), `scholr_${Date.now()}_${displayName.replace(/[^a-zA-Z0-9._-]/g, '_')}`);
    fs.writeFileSync(tmpPath, buffer);

    const uploaded = await ai.files.upload({
      file: tmpPath,
      config: { mimeType, displayName },
    });

    // Clean up temp file
    try { fs.unlinkSync(tmpPath); } catch {}

    // Gemini files expire after 48 hours; we store expiry as 47h to be safe
    const expiresAt = new Date(Date.now() + 47 * 60 * 60 * 1000).toISOString();
    console.log(`✅ Gemini upload: ${displayName} → ${uploaded.name}`);
    return { uri: uploaded.uri || uploaded.name, expiresAt };
  } catch (err) {
    console.error(`❌ Gemini upload failed for ${displayName}:`, err.message);
    return null;
  }
}

// Delete a file from Gemini File API by URI/name
async function deleteFromGemini(uri) {
  if (!uri) return;
  try {
    // uri looks like "https://generativelanguage.googleapis.com/v1beta/files/abc123"
    // or just "files/abc123" — extract the file name
    const fileName = uri.includes('/files/') ? uri.split('/files/')[1] : uri;
    await ai.files.delete({ name: `files/${fileName}` });
    console.log(`✅ Gemini file deleted: ${fileName}`);
  } catch (err) {
    // Non-fatal — file may have already expired
    console.warn(`⚠️ Gemini delete skipped (${uri}):`, err.message);
  }
}

// Get a valid Gemini URI for a document.
// Checks memory cache first, then DB, then re-uploads if expired/missing.
async function getGeminiUri(courseId, filename, doc) {
  const memCache = getGeminiUriCache(courseId);

  // 1. Check memory cache
  if (memCache[filename]) {
    const cached = memCache[filename];
    if (new Date(cached.expiresAt) > new Date()) {
      return cached.uri;
    }
    // Expired in memory — clear it
    delete memCache[filename];
  }

  // 2. Check DB
  const { data: dbDoc } = await supabase
    .from('documents')
    .select('gemini_uri, gemini_uri_expires_at')
    .eq('course_id', courseId)
    .eq('name', filename)
    .single();

  if (dbDoc?.gemini_uri && dbDoc?.gemini_uri_expires_at) {
    if (new Date(dbDoc.gemini_uri_expires_at) > new Date()) {
      // Valid URI in DB — warm the memory cache
      memCache[filename] = { uri: dbDoc.gemini_uri, expiresAt: dbDoc.gemini_uri_expires_at };
      return dbDoc.gemini_uri;
    }
  }

  // 3. Need to upload (either never uploaded, or expired)
  console.log(`🔄 Re-uploading to Gemini: ${filename}`);
  const result = await uploadToGemini(doc.buffer, doc.mimeType, filename);
  if (!result) return null; // Upload failed — will fall back to inline

  // Save to DB
  await supabase
    .from('documents')
    .update({ gemini_uri: result.uri, gemini_uri_expires_at: result.expiresAt })
    .eq('course_id', courseId)
    .eq('name', filename);

  // Warm memory cache
  memCache[filename] = result;
  return result.uri;
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

// After startup, upload any docs that are missing a Gemini URI in the background
async function seedMissingGeminiUris() {
  console.log('🔄 Seeding missing Gemini URIs in background...');
  for (const [courseId, docs] of Object.entries(courseDocuments)) {
    for (const [filename, doc] of Object.entries(docs)) {
      const memCache = getGeminiUriCache(courseId);
      if (!memCache[filename]) {
        // Not in memory — check DB then upload if needed
        await getGeminiUri(courseId, filename, doc);
        // Small delay to avoid hammering the API
        await new Promise(r => setTimeout(r, 500));
      }
    }
  }
  console.log('✅ Gemini URI seeding complete');
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
    return { totalQuestions: total, weekQuestions: weekCount, timeSavedHours: Math.floor(timeSavedMins / 60), timeSavedMinutes: timeSavedMins % 60, timeSavedMins, topTopics, peakHourLabel, flagged: flagged || [], recent: (allQ || []).slice(0, 50), lastQuestion: allQ?.[0] || null };
  } catch (err) {
    console.error('Insights error:', err.message);
    return { totalQuestions: 0, weekQuestions: 0, timeSavedHours: 0, timeSavedMinutes: 0, timeSavedMins: 0, topTopics: [], peakHourLabel: null, flagged: [], recent: [], lastQuestion: null };
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
  credentials: true,
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
  <meta property="og:image" content="https://scholr.study/preview.png" />
  <meta property="og:type" content="website" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:image" content="https://scholr.study/preview.png" />
  <script>window.location.href = "https://scholr.study/join/${code}"</script>
  </head><body>Redirecting...</body></html>`);
});

app.get('/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// ── Professor Auth ────────────────────────────────────────────────────────────
app.post('/professor/signup', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return res.status(400).json({ error: error.message });
    await supabase.from('professors').upsert({ id: data.user.id, email, name: name || email.split('@')[0] }, { onConflict: 'id' });
    res.json({ success: true, user: { id: data.user.id, email, name } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/professor/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
    const { data: prof } = await supabase.from('professors').select('*').eq('id', data.user.id).single();
    res.json({ success: true, token: data.session.access_token, user: { id: data.user.id, email: data.user.email, name: prof?.name || email.split('@')[0] } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/smart-login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
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
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return res.status(400).json({ error: error.message });
    await supabase.from('students').upsert({ id: data.user.id, email, name: name || email.split('@')[0] }, { onConflict: 'id' });
    res.json({ success: true, user: { id: data.user.id, email, name } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/student/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
    const { data: student } = await supabase.from('students').select('*').eq('id', data.user.id).single();
    if (!student) {
      await supabase.from('students').upsert({ id: data.user.id, email: data.user.email, name: data.user.email.split('@')[0] }, { onConflict: 'id' });
    }
    res.json({ success: true, token: data.session.access_token, user: { id: data.user.id, email: data.user.email, name: student?.name || data.user.email.split('@')[0] } });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/student/auth/google', (req, res) => {
  const redirectTo = encodeURIComponent(`${process.env.FRONTEND_URL || 'https://scholr.study'}/auth/callback`);
  res.redirect(`${process.env.SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${redirectTo}`);
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
app.get('/professor/courses', requireAuth, async (req, res) => {
  const { data } = await supabase.from('courses').select('*').eq('professor_id', req.user.id).order('created_at', { ascending: false });
  res.json(data || []);
});

app.post('/professor/courses', requireAuth, async (req, res) => {
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
  await supabase.from('courses').delete().eq('id', id);
  delete courseDocuments[id];
  delete geminiUriCache[id];
  res.json({ success: true });
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

  // 1. Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage.from('documents').upload(storagePath, buffer, { contentType: mimeType, upsert: true });
  if (uploadError) return res.status(500).json({ error: 'Storage upload failed: ' + uploadError.message });

  // 2. Upload to Gemini File API immediately
  const geminiResult = await uploadToGemini(buffer, mimeType, file.name);

  // 3. Save to documents table including Gemini URI
  const { error: dbError } = await supabase.from('documents').upsert({
    name: file.name, course_id: courseId, size_kb: sizeKb, mime_type: mimeType,
    storage_path: storagePath, uploaded_at: new Date().toISOString(),
    gemini_uri: geminiResult?.uri || null,
    gemini_uri_expires_at: geminiResult?.expiresAt || null,
  }, { onConflict: 'name,course_id' });
  if (dbError) console.error('DB insert error:', dbError.message);

  // 4. Warm in-memory caches
  getCourseDocuments(courseId)[file.name] = { buffer, sizeKb, mimeType, uploadedAt: new Date().toISOString() };
  if (geminiResult) {
    getGeminiUriCache(courseId)[file.name] = { uri: geminiResult.uri, expiresAt: geminiResult.expiresAt };
  }
  questionsCaches[courseId] = null;

  console.log(`✅ Uploaded: ${storagePath} — ${sizeKb}kb${geminiResult ? ' + Gemini URI cached' : ' (Gemini upload failed, will use inline)'}`);
  res.json({ success: true, fileName: file.name, sizeKb, mimeType });
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

  // 4. Delete from Gemini File API
  if (dbDoc?.gemini_uri) await deleteFromGemini(dbDoc.gemini_uri);

  // 5. Clear in-memory caches
  if (courseDocuments[courseId]) delete courseDocuments[courseId][filename];
  if (geminiUriCache[courseId]) delete geminiUriCache[courseId][filename];
  questionsCaches[courseId] = null;

  console.log(`✅ Deleted: ${storagePath}`);
  res.json({ success: true });
});

app.get('/course/:courseId/insights', requireAuth, requireCourseAccess, async (req, res) => {
  res.json(await getCourseInsights(req.params.courseId));
});

app.get('/course/:courseId/suggested-questions', requireAuth, requireCourseAccess, async (req, res) => {
  const { courseId } = req.params;
  const docs = getCourseDocuments(courseId);
  if (Object.keys(docs).length === 0) return res.json({ questions: [] });
  if (questionsCaches[courseId]) return res.json({ questions: questionsCaches[courseId] });
  try {
    const firstPdf = Object.entries(docs).find(([, doc]) => doc.mimeType === 'application/pdf');
    if (!firstPdf) return res.json({ questions: ["What are the main topics in this course?", "Summarize the key concepts", "What should I focus on for the exam?"] });
    const result = await ai.models.generateContent({
      model: MODEL,
      contents: [{ role: 'user', parts: [{ inlineData: { mimeType: 'application/pdf', data: firstPdf[1].buffer.toString('base64') } }, { text: 'Read this course document and write exactly 3 short student questions about the content. Each question must be under 8 words. Output only a JSON array on a single line.\n\nExample: ["Short question one?","Short question two?","Short question three?"]' }] }],
      config: { temperature: 0.5, maxOutputTokens: 256 },
    });
    const raw = result.text.trim();
    let questions = [];
    try { const m = raw.match(/\[.*?\]/s); if (m) questions = JSON.parse(m[0]); } catch {}
    if (!questions.length) { const m = raw.match(/"([^"]{5,60})"/g); if (m) questions = m.map(x => x.replace(/"/g, '')).slice(0, 3); }
    const final = questions.length ? questions.slice(0, 3) : ["What are the main topics in this course?", "Summarize the key concepts", "What should I focus on for the exam?"];
    questionsCaches[courseId] = final;
    res.json({ questions: final });
  } catch {
    res.json({ questions: ["What are the main topics in this course?", "Summarize the key concepts", "What should I focus on for the exam?"] });
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

  const docNames = Object.keys(docs);
  const docParts = [];

  // Build doc parts — use Gemini URI if available, fall back to inline base64
  for (const [name, doc] of Object.entries(docs)) {
    const uri = await getGeminiUri(courseId, name, doc);
    if (uri) {
      // Fast path — just a URI reference, no data upload
      docParts.push({ fileData: { mimeType: doc.mimeType, fileUri: uri } });
      docParts.push({ text: isImage(doc.mimeType) ? `[Professor image: ${name}]` : `[Professor document: ${name}]` });
    } else {
      // Fallback — inline base64 (same as before)
      docParts.push({ inlineData: { mimeType: doc.mimeType, data: doc.buffer.toString('base64') } });
      docParts.push({ text: isImage(doc.mimeType) ? `[Professor image: ${name}]` : `[Professor document: ${name}]` });
    }
  }

  // Student notes always sent inline (they are per-student, not worth caching)
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

  const contents = [];
  if (history.length === 0) {
    contents.push({ role: 'user', parts: [...docParts, { text: `STUDENT QUESTION: ${message}` }] });
  } else {
    contents.push({ role: 'user', parts: [...docParts, { text: `STUDENT QUESTION: ${history[0].content}` }] });
    for (let i = 1; i < history.length; i++) {
      const msg = history[i];
      const content = msg.role === 'assistant' ? msg.content.replace(/\nSOURCES:.*$/m, '').trim() : msg.content;
      contents.push({ role: msg.role === 'assistant' ? 'model' : 'user', parts: [{ text: content }] });
    }
    contents.push({ role: 'user', parts: [{ text: `STUDENT QUESTION: ${message}` }] });
  }

  res.write(`data: ${JSON.stringify({ type: 'citations', citations: [] })}\n\n`);

  try {
    const stream = await ai.models.generateContentStream({
      model: MODEL, contents,
      config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.3, maxOutputTokens: 2048 },
    });

    let fullText = '';
    for await (const chunk of stream) {
      const token = chunk.text;
      if (token) { fullText += token; res.write(`data: ${JSON.stringify({ type: 'token', token })}\n\n`); }
    }

    const sourcesMatch = fullText.match(/\nSOURCES:\s*(.+)$/m);
    const sources = sourcesMatch ? sourcesMatch[1].split(',').map(s => s.trim()).filter(Boolean) : docNames;
    const confident = !fullText.toLowerCase().includes("doesn't appear to be in any of your uploaded");

    await supabase.from('questions').insert({ course_id: courseId, question: message, confident });

    res.write(`data: ${JSON.stringify({ type: 'sources', sources })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Chat error:', err.message);
    res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
    res.end();
  }
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

app.post('/professor/courses/:courseId/cover', requireAuth, async (req, res) => {
  const { courseId } = req.params;
  const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).eq('professor_id', req.user.id).single();
  if (!course) return res.status(403).json({ error: 'Not your course' });
  const file = req.files?.file;
  if (!file) return res.status(400).json({ error: 'No file uploaded' });
  const mimeType = getMimeType(file.name);
  if (!mimeType) return res.status(400).json({ error: 'Unsupported file type' });
  const buffer = Buffer.from(file.data);
  const storagePath = `covers/${courseId}/${file.name}`;
  const { error: uploadError } = await supabase.storage.from('documents').upload(storagePath, buffer, { contentType: mimeType, upsert: true });
  if (uploadError) return res.status(500).json({ error: 'Upload failed: ' + uploadError.message });
  const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(storagePath);
  await supabase.from('courses').update({ cover_image: publicUrl }).eq('id', courseId);
  res.json({ success: true, coverImage: publicUrl });
});

app.post('/course/:courseId/quiz', requireAuth, requireCourseAccess, async (req, res) => {
  const { courseId } = req.params;
  const { topic } = req.body;
  const docs = getCourseDocuments(courseId);
  if (Object.keys(docs).length === 0) return res.status(400).json({ error: 'No documents uploaded yet' });

  const docParts = [];
  for (const [name, doc] of Object.entries(docs)) {
    const uri = await getGeminiUri(courseId, name, doc);
    if (uri) {
      docParts.push({ fileData: { mimeType: doc.mimeType, fileUri: uri } });
    } else {
      docParts.push({ inlineData: { mimeType: doc.mimeType, data: doc.buffer.toString('base64') } });
    }
    docParts.push({ text: `[Document: ${name}]` });
  }

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
    res.json({ questions });
  } catch (err) {
    console.error('Quiz generation error:', err.message);
    res.status(500).json({ error: err.message });
  }
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

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, async () => {
  console.log(`✅ ScholrAI running on port ${PORT}`);
  await loadAllDocumentsFromStorage();
});