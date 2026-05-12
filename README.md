# Scholr

AI-powered learning grounded in your course materials. Teachers upload PDFs; students get answers tied to those exact materials, not the open web.

## What's in here

- `server.js` — Node/Express backend on port 3001. Handles PDF upload, text extraction, and chat via OpenAI's `gpt-4o-mini`.
- `src/App.jsx` — React UI with a role picker, a teacher portal (upload + manage course materials), and a student portal (chat).
- `uploads/` — created automatically; holds the PDFs the teacher has uploaded. Gitignored.

## Setup (first time only)

You'll need Node 18+ installed. Check with `node --version`.

**1. Install dependencies**

From the project folder, in your terminal:

```bash
npm install
```

**2. Add your OpenAI API key**

Open the `.env` file in this folder. Replace the placeholder with your real OpenAI API key. You can get one at https://platform.openai.com/api-keys.

The file should look like:

```
OPENAI_API_KEY=sk-proj-your-real-key-here
```

> ⚠️ **Important:** Never commit the `.env` file or paste the key into any other file. The key gives anyone with it the ability to spend money on your OpenAI account. `.env` is already in `.gitignore` to prevent accidental commits.

## Running it

You need **two terminal windows** open in this folder.

**Terminal 1 — backend:**

```bash
npm run server
```

You should see `✅ ScholrAI server running on http://localhost:3001`.

**Terminal 2 — frontend:**

```bash
npm run dev
```

Vite will print a local URL (usually `http://localhost:5173`). Open it in your browser.

## How to use it

1. Open the app and pick **Teacher Portal**.
2. Click **+ Upload PDF** and select a course material (lecture notes, syllabus, reading).
3. Click **Exit Portal**, then pick **Student Portal**.
4. Ask a question about the uploaded material. The AI will answer using the PDF as its source.

## Troubleshooting

- **"OPENAI_API_KEY is not set"** — your `.env` file is missing or doesn't have a real key. Check step 2 of setup.
- **"Server unreachable"** in the UI — the backend isn't running. Start it with `npm run server`.
- **PDF upload fails with "appears empty or unreadable"** — the PDF is image-only (scanned). Text-based PDFs work; scanned PDFs need OCR (not yet supported).
- **Answers feel like generic ChatGPT, not grounded in the material** — confirm the upload completed (you should see the file in the teacher portal). The first 8,000 characters of each PDF are sent as context, so very long PDFs only have their first chunk used right now (this is a known v0 limitation).

## Roadmap

- Real chunking + retrieval (so long PDFs work properly)
- Inline citations (show students exactly which page an answer came from)
- Streaming responses (faster perceived speed)
- Per-course separation (right now everything is one global pool)
- Persistent storage (currently in-memory; everything resets on server restart)
- Vertex AI option (for institutional FERPA-aligned deployments)

## Tech

React 19 · Vite · Tailwind v4 · Express · OpenAI · pdf-extraction
