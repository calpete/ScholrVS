/**
 * test-vertex.js — quick auth check for Vertex AI.
 *
 * What it does:
 *   1. Loads the service account credentials from .env
 *   2. Initializes the new Google Gen AI SDK in Vertex mode
 *   3. Sends one short prompt to Gemini
 *   4. Prints the response
 *
 * If you see "Hello from Vertex AI" in your terminal, everything works.
 * If you see an error, the error message tells you what's missing.
 *
 * Run from the project root with:
 *     npm run test:vertex
 */

import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

const projectId = process.env.GCP_PROJECT_ID;
const location = process.env.GCP_LOCATION || 'us-central1';
const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

console.log('—— Vertex AI auth test ——');
console.log(`Project:     ${projectId || '(missing — set GCP_PROJECT_ID in .env)'}`);
console.log(`Location:    ${location}`);
console.log(`Credentials: ${credsPath || '(missing — set GOOGLE_APPLICATION_CREDENTIALS in .env)'}`);
console.log('');

if (!projectId || !credsPath) {
  console.error('❌ Missing env vars. Check your .env file.');
  process.exit(1);
}

try {
  const ai = new GoogleGenAI({
    vertexai: true,
    project: projectId,
    location,
  });

  console.log('🔄 Calling Gemini…');
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash-001',
    contents: 'Say exactly: Hello from Vertex AI',
  });

  const text = response.text || '(no text returned)';

  console.log('');
  console.log('✅ Success! Gemini responded:');
  console.log('   ' + text.trim());
  console.log('');
  console.log('Your Vertex AI setup is working. Ready to build retrieval.');
} catch (err) {
  console.error('');
  console.error('❌ Vertex AI call failed.');
  console.error('   ' + (err.message || err));
  console.error('');
  console.error('Most common causes:');
  console.error('   • Vertex AI API not enabled on the project');
  console.error('   • Service account missing the "Vertex AI User" role');
  console.error('   • Wrong project ID in .env');
  console.error('   • Credentials file path is wrong in .env');
  console.error('   • The service account key was deleted/rotated in GCP');
  process.exit(1);
}
