// Smoke test — guards against the failures we hit in production:
//   1. Backend can't write enrollments (wrong Supabase key) -> students can't join
//   2. Tables readable/writable by the public key (RLS holes) -> data leak
//
// Run anytime:   npm run smoke
// Against prod:  HEALTH_URL=https://scholrvs.onrender.com npm run smoke
// Exits non-zero on any failure, so it can gate a deploy.

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { randomUUID } from 'crypto';

const URL = process.env.SUPABASE_URL;
const SECRET = process.env.SUPABASE_SECRET_KEY;
// Publishable/anon key is public by design; override via env if you rotate it.
const PUBLISHABLE = process.env.SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_bmvI67pGsWD52YYoIF3oDw_88izApLs';
const HEALTH_URL = process.env.HEALTH_URL; // optional: also ping the live /health

const TABLES = ['courses', 'students', 'professors', 'enrollments', 'documents', 'messages', 'questions', 'student_notes', 'chats'];

let failures = 0;
const pass = (m) => console.log('  ✅', m);
const fail = (m) => { console.log('  ❌', m); failures++; };

if (!URL || !SECRET) { console.error('Missing SUPABASE_URL / SUPABASE_SECRET_KEY in env'); process.exit(2); }

const svc = createClient(URL, SECRET);
const pub = createClient(URL, PUBLISHABLE);

console.log('\n1. Backend key is service_role (bypasses RLS)');
{
  const { error } = await svc.auth.admin.listUsers({ page: 1, perPage: 1 });
  error ? fail(`admin API rejected the key: ${error.message}`) : pass('service key verified');
}

console.log('\n2. Enrollment write path bypasses RLS (the join bug)');
{
  const { error } = await svc.from('enrollments').insert({ student_id: randomUUID(), course_id: randomUUID() });
  if (error?.code === '23503') pass('insert reached FK check — RLS bypassed');
  else if (error?.code === '42501') fail('insert blocked by RLS — students cannot join');
  else if (!error) { pass('insert allowed (cleaning up)'); }
  else fail(`unexpected: ${error.code} ${error.message}`);
}

console.log('\n3. No table is readable by the public key');
for (const t of TABLES) {
  const { error, count } = await pub.from(t).select('*', { count: 'exact', head: true });
  if (error) pass(`${t}: read blocked`);
  else if ((count ?? 0) === 0) pass(`${t}: no rows exposed`);
  else fail(`${t}: LEAKS ${count} rows to the public key`);
}

console.log('\n4. No table is writable by the public key');
for (const t of TABLES) {
  const payload = t === 'enrollments'
    ? { student_id: randomUUID(), course_id: randomUUID() }
    : { id: randomUUID() };
  const { data, error } = await pub.from(t).insert(payload).select();
  if (error?.code === '42501') pass(`${t}: write blocked by RLS`);
  else if (!error) { fail(`${t}: PUBLIC WRITE SUCCEEDED`); if (data?.[0]?.id) await pub.from(t).delete().eq('id', data[0].id); }
  else fail(`${t}: write reached DB (${error.code}) — RLS not blocking`);
}

if (HEALTH_URL) {
  console.log(`\n5. Live /health/deep at ${HEALTH_URL}`);
  try {
    const r = await fetch(`${HEALTH_URL.replace(/\/$/, '')}/health/deep`);
    const d = await r.json();
    r.ok && d.ok ? pass(`200 ok: ${JSON.stringify(d.checks)}`) : fail(`${r.status}: ${JSON.stringify(d)}`);
  } catch (e) { fail(`could not reach /health/deep: ${e.message}`); }
}

console.log(`\n${failures === 0 ? '✅ ALL CHECKS PASSED' : `❌ ${failures} CHECK(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
