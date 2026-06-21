#!/usr/bin/env node

/**
 * Daily smoke test for all 10 deployed edge functions.
 *
 * Two tiers:
 *   1. Full smoke (2 fns) — POST a real payload and assert response shape.
 *      Catches business-logic regressions on top of deploy regressions.
 *      Functions: smart-search, generate-embeddings.
 *   2. Health check (8 fns) — OPTIONS preflight, expect non-404 / non-5xx.
 *      Catches "function not deployed" (404) and module-load crashes (5xx)
 *      without exercising side-effecting code paths. Does NOT catch latent
 *      runtime failures inside the function body — e.g. a missing secret
 *      that only blows up when its non-null assertion is dereferenced
 *      inside a POST handler. Tradeoff is intentional: the side-effecting
 *      paths (DB writes, real emails, admin actions, Google Doc fetch)
 *      aren't safe to exercise on PROD on a daily cron.
 *
 * Side-effect safety:
 *   - detect-duplicates is auth-gated in-code (it uses a service-role client
 *     and deploys --no-verify-jwt, so it requires the service-role key OR a
 *     reviewer/admin user token; see
 *     supabase/functions/detect-duplicates/index.ts). An anon-key POST would
 *     401, so we OPTIONS-health-check it instead — the auth gate sits after
 *     the OPTIONS early-return, so the preflight still returns 200 pre-auth.
 *     (The full-smoke payload also deliberately omitted submissionId to avoid
 *     a submission_similarities write; the health check writes nothing either.)
 *   - generate-embeddings makes an OpenAI text-embedding-3-small call;
 *     ~5 input tokens × $0.02/M = ~$0.0000001 per smoke run. Negligible.
 *
 * Env vars (CI provides via repo secrets; local dev loads from .env):
 *   SUPABASE_URL          (default: VITE_SUPABASE_URL)
 *   SUPABASE_ANON_KEY     (default: VITE_SUPABASE_ANON_KEY)
 *   SMOKE_TARGET          informational label, e.g. "prod" or "test"
 *
 * Exit codes:
 *   0 — all checks passed
 *   1 — at least one check failed
 *   2 — misconfiguration (missing env vars)
 */

// dotenv is convenient for local runs but isn't required in CI where
// env vars are injected directly. Skip silently if it's not installed.
try {
  const dotenv = await import('dotenv');
  dotenv.default.config();
} catch {
  // ignore — env vars expected to be set externally.
}

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const SMOKE_TARGET = process.env.SMOKE_TARGET || 'unknown';

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    'Missing SUPABASE_URL / SUPABASE_ANON_KEY (or VITE_ prefixed equivalents).'
  );
  process.exit(2);
}

const HEADERS = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
};

const FULL_SMOKE = [
  {
    name: 'smart-search',
    payload: { query: 'garden', limit: 5, page: 1 },
    assert: (json) => {
      if (!Array.isArray(json.lessons)) throw new Error('lessons not an array');
      if (typeof json.totalCount !== 'number') throw new Error('totalCount not a number');
      if (json.totalCount <= 0) throw new Error(`totalCount=${json.totalCount}, expected > 0`);
    },
  },
  {
    name: 'generate-embeddings',
    payload: { text: 'edge function smoke test' },
    assert: (json) => {
      if (!Array.isArray(json.embedding)) throw new Error('embedding not an array');
      if (json.embedding.length !== 1536) {
        throw new Error(`embedding length=${json.embedding.length}, expected 1536`);
      }
    },
  },
];

const HEALTH_CHECK = [
  'detect-duplicates',
  'extract-google-doc',
  'process-submission',
  'send-email',
  'password-reset',
  'invitation-management',
  'user-management',
  'generate-gemini-embeddings',
];

// Per-request timeout. Sequential execution means one hung endpoint would
// otherwise block every subsequent check until the job-level 5-min cap
// killed the run with no per-function visibility. 15 s × 10 ≈ 2.5 min
// worst case, still under the cap.
const FETCH_TIMEOUT_MS = 15_000;

async function fullSmoke({ name, payload, assert }) {
  const url = `${SUPABASE_URL}/functions/v1/${name}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: HEADERS,
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '<unreadable>');
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  assert(json);
  return { name, kind: 'smoke', status: res.status };
}

async function healthCheck(name) {
  const url = `${SUPABASE_URL}/functions/v1/${name}`;
  const res = await fetch(url, {
    method: 'OPTIONS',
    headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (res.status === 404) {
    throw new Error('HTTP 404 — function not deployed');
  }
  if (res.status >= 500) {
    throw new Error(`HTTP ${res.status} — runtime error at startup`);
  }
  return { name, kind: 'health', status: res.status };
}

async function runOne(label, fn) {
  const start = Date.now();
  try {
    const result = await fn();
    return { ...result, ok: true, ms: Date.now() - start };
  } catch (err) {
    return { name: label, ok: false, error: err.message, ms: Date.now() - start };
  }
}

async function main() {
  const host = (() => {
    try {
      return new URL(SUPABASE_URL).hostname;
    } catch {
      return SUPABASE_URL;
    }
  })();
  console.log(`Edge function smoke (target=${SMOKE_TARGET}, host=${host})`);
  console.log('');

  // Sequential so log output reads top-to-bottom in cron logs. Total wall
  // time is ~5–10 s for 11 functions; parallelism would buy little and
  // muddle the output.
  const results = [];
  for (const spec of FULL_SMOKE) {
    const r = await runOne(spec.name, () => fullSmoke(spec));
    results.push(r);
    const icon = r.ok ? 'PASS' : 'FAIL';
    console.log(`${icon}  ${spec.name.padEnd(28)} smoke   ${r.ms}ms${r.ok ? '' : '   ' + r.error}`);
  }
  for (const name of HEALTH_CHECK) {
    const r = await runOne(name, () => healthCheck(name));
    results.push(r);
    const icon = r.ok ? 'PASS' : 'FAIL';
    console.log(`${icon}  ${name.padEnd(28)} health  ${r.ms}ms${r.ok ? '' : '   ' + r.error}`);
  }

  const failures = results.filter((r) => !r.ok);
  console.log('');
  console.log(`Result: ${results.length - failures.length}/${results.length} passing`);
  if (failures.length > 0) {
    console.log('');
    console.log('Failures:');
    for (const f of failures) {
      console.log(`  - ${f.name}: ${f.error}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
