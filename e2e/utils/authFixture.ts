import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createClient, type SupabaseClient, type Session } from '@supabase/supabase-js';

// Shared plumbing for the authenticated E2E suite (T5b).
//
// Credentials model (user-approved 2026-07-03, option A):
//   - Login runs programmatically with the ANON key + the seeded test accounts
//     (teacher@test.com / reviewer@test.com, password123) and is saved as
//     Playwright storageState — no UI login per spec.
//   - Cleanup runs with the SERVICE-ROLE key on the Node side only (never in
//     the browser). CI already holds this secret for `npm run test:rls`; the
//     same secret is reused here. Every row the suite creates carries MARKER
//     in its Google-Doc URL, and every delete below is scoped to that marker —
//     the helpers structurally cannot touch unmarked rows.

export const MARKER = '1E2EAUTH';

/** Hard stop: this suite must never run against the production project. */
const PROD_REF = 'jxlxtzkmicfhchkhiojz';

// ESM context (no __dirname) — Playwright loads these files as modules.
const HERE = path.dirname(fileURLToPath(import.meta.url));
const AUTH_DIR = path.join(HERE, '..', '.auth');
export const TEACHER_STATE = path.join(AUTH_DIR, 'teacher.json');
export const REVIEWER_STATE = path.join(AUTH_DIR, 'reviewer.json');
const RUN_FILE = path.join(AUTH_DIR, 'run.json');

export const TEACHER_EMAIL = 'teacher@test.com';
export const REVIEWER_EMAIL = 'reviewer@test.com';
export const TEST_PASSWORD = 'password123';

export interface AuthEnv {
  url: string;
  anonKey: string;
  serviceKey: string;
}

/** Minimal .env parser — the Playwright process runs outside Vite, so the
 * local fallback reads the repo .env directly (no dotenv dependency). */
function parseDotEnv(): Record<string, string> {
  const envPath = path.join(HERE, '..', '..', '.env');
  if (!fs.existsSync(envPath)) return {};
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && !line.trimStart().startsWith('#')) {
      out[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
    }
  }
  return out;
}

/** Env resolution: real environment first (CI), .env fallback (local). */
export function getAuthEnv(): { env: AuthEnv | null; missing: string[] } {
  const file = parseDotEnv();
  const url = process.env.VITE_SUPABASE_URL ?? file.VITE_SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY ?? file.VITE_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? file.SUPABASE_SERVICE_ROLE_KEY;

  const missing: string[] = [];
  if (!url) missing.push('VITE_SUPABASE_URL');
  if (!anonKey) missing.push('VITE_SUPABASE_ANON_KEY');
  if (!serviceKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
  if (missing.length > 0) return { env: null, missing };

  if (url!.includes(PROD_REF)) {
    throw new Error(
      `Refusing to run the authenticated E2E suite against the PRODUCTION project (${PROD_REF}). ` +
        'Point VITE_SUPABASE_URL at the TEST project or the local stack.'
    );
  }
  return { env: { url: url!, anonKey: anonKey!, serviceKey: serviceKey! }, missing: [] };
}

/**
 * Gate for the whole suite. In CI it always runs (missing env fails loudly in
 * auth.setup.ts). Locally it's opt-in via E2E_AUTH=1 so a casual
 * `npm run test:e2e` keeps running only the public specs.
 */
export function authSuiteEnabled(): { enabled: boolean; reason: string } {
  if (process.env.CI) return { enabled: true, reason: '' };
  if (process.env.E2E_AUTH === '1') return { enabled: true, reason: '' };
  return {
    enabled: false,
    reason: 'Authenticated suite is opt-in locally: set E2E_AUTH=1 (see e2e/README.md).',
  };
}

export function serviceClient(env: AuthEnv): SupabaseClient {
  if (env.url.includes(PROD_REF)) throw new Error('Service client refused: PROD URL.');
  return createClient(env.url, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function anonClient(env: AuthEnv): SupabaseClient {
  return createClient(env.url, env.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Signs in and returns the session (throws with a readable message). */
export async function signIn(env: AuthEnv, email: string): Promise<Session> {
  const client = anonClient(env);
  const { data, error } = await client.auth.signInWithPassword({
    email,
    password: TEST_PASSWORD,
  });
  if (error || !data.session) {
    throw new Error(`Sign-in failed for ${email} against ${env.url}: ${error?.message}`);
  }
  return data.session;
}

/**
 * Builds a Playwright storageState that pre-authenticates the app: supabase-js
 * v2 persists the whole Session object in localStorage under
 * `sb-<url-host-label>-auth-token` (see SupabaseClient defaultStorageKey).
 */
export function storageStateForSession(env: AuthEnv, baseURL: string, session: Session): object {
  const storageKey = `sb-${new URL(env.url).hostname.split('.')[0]}-auth-token`;
  return {
    cookies: [],
    origins: [
      {
        origin: new URL(baseURL).origin,
        localStorage: [{ name: storageKey, value: JSON.stringify(session) }],
      },
    ],
  };
}

export function baseURLFromEnv(): string {
  return process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:5173';
}

// ---------------------------------------------------------------------------
// Run identity + marker helpers
// ---------------------------------------------------------------------------

/** Mint a run id (alphanumeric only — it must survive FTS tokenization when it
 * appears inside a published title) and persist it for the teardown project. */
export function mintRunId(): string {
  const runId = (Date.now().toString(36) + Math.random().toString(36).slice(2, 6)).toLowerCase();
  fs.mkdirSync(AUTH_DIR, { recursive: true });
  fs.writeFileSync(RUN_FILE, JSON.stringify({ runId, mintedAt: new Date().toISOString() }));
  return runId;
}

export function currentRunId(): string | null {
  try {
    return JSON.parse(fs.readFileSync(RUN_FILE, 'utf8')).runId ?? null;
  } catch {
    return null;
  }
}

/** Doc ids look like `1E2EAUTH<runId>r<retry><suffix>` — unique per run,
 * retry attempt, and submission, so locators and cleanup never collide. */
export function markerDocUrl(runId: string, suffix: string): string {
  return `https://docs.google.com/document/d/${MARKER}${runId}${suffix}/edit`;
}

/** SQL LIKE pattern matching every row this run created (all retry attempts). */
export function runLikePattern(runId: string): string {
  return `%/d/${MARKER}${runId}%`;
}

/** SQL LIKE pattern matching rows from ANY auth-E2E run (stale sweeps). */
export function anyRunLikePattern(): string {
  return `%/d/${MARKER}%`;
}

// ---------------------------------------------------------------------------
// Planted evidence + marker-scoped cleanup
// ---------------------------------------------------------------------------

export async function plantSimilarity(
  svc: SupabaseClient,
  args: {
    submissionId: string;
    lessonId: string;
    score: number;
    matchType: 'exact' | 'high' | 'medium' | 'low';
    runId: string;
  }
): Promise<void> {
  const { error } = await svc.from('submission_similarities').insert({
    submission_id: args.submissionId,
    lesson_id: args.lessonId,
    title_similarity: args.score,
    content_similarity: args.score,
    combined_score: args.score,
    match_type: args.matchType,
    match_details: { planted_by: 'auth-e2e', run: args.runId },
  });
  if (error) throw new Error(`plantSimilarity failed: ${error.message}`);
}

export interface CleanupCounts {
  similarities: number;
  reviews: number;
  versions: number;
  lessons: number;
  submissions: number;
}

/**
 * Deletes every row matching the marker pattern, children-first (none of the
 * FKs cascade): submission_similarities / submission_reviews / lesson_versions
 * → lessons → lesson_submissions. All deletes are scoped to ids derived from
 * marker-matching rows — unmarked rows are structurally unreachable.
 */
export async function cleanupMarkerRows(
  svc: SupabaseClient,
  likePattern: string,
  olderThanIso?: string
): Promise<CleanupCounts> {
  const counts: CleanupCounts = {
    similarities: 0,
    reviews: 0,
    versions: 0,
    lessons: 0,
    submissions: 0,
  };

  let subQuery = svc.from('lesson_submissions').select('id').like('google_doc_url', likePattern);
  if (olderThanIso) subQuery = subQuery.lt('created_at', olderThanIso);
  const { data: subs, error: subErr } = await subQuery;
  if (subErr) throw new Error(`cleanup: submission lookup failed: ${subErr.message}`);
  const subIds = (subs ?? []).map((r) => r.id as string);

  // Marker lessons: published from a marker submission (file_link carries the
  // marker) or linked back via original_submission_id.
  let lessonQuery = svc.from('lessons').select('id, lesson_id').like('file_link', likePattern);
  if (olderThanIso) lessonQuery = lessonQuery.lt('created_at', olderThanIso);
  const { data: l1, error: l1Err } = await lessonQuery;
  if (l1Err) throw new Error(`cleanup: lesson lookup failed: ${l1Err.message}`);
  const lessonRows = new Map<string, string>(
    (l1 ?? []).map((r) => [r.id as string, r.lesson_id as string])
  );
  if (subIds.length > 0) {
    const { data: l2, error: l2Err } = await svc
      .from('lessons')
      .select('id, lesson_id')
      .in('original_submission_id', subIds);
    if (l2Err) throw new Error(`cleanup: lesson-by-submission lookup failed: ${l2Err.message}`);
    for (const r of l2 ?? []) lessonRows.set(r.id as string, r.lesson_id as string);
  }
  const lessonUuids = [...lessonRows.keys()];
  const lessonTextIds = [...lessonRows.values()];

  const del = async (
    table: string,
    apply: (q: ReturnType<SupabaseClient['from']>) => PromiseLike<{
      data: unknown[] | null;
      error: { message: string } | null;
    }>
  ): Promise<number> => {
    const { data, error } = await apply(svc.from(table));
    if (error) throw new Error(`cleanup: delete from ${table} failed: ${error.message}`);
    return data?.length ?? 0;
  };

  if (subIds.length > 0) {
    counts.similarities += await del('submission_similarities', (q) =>
      q.delete().in('submission_id', subIds).select('id')
    );
    counts.reviews += await del('submission_reviews', (q) =>
      q.delete().in('submission_id', subIds).select('id')
    );
    counts.versions += await del('lesson_versions', (q) =>
      q.delete().in('archived_from_submission_id', subIds).select('id')
    );
  }
  if (lessonTextIds.length > 0) {
    // A concurrent run's submission may have organically matched OUR published
    // lesson — clear similarity rows pointing at marker lessons too.
    counts.similarities += await del('submission_similarities', (q) =>
      q.delete().in('lesson_id', lessonTextIds).select('id')
    );
    counts.versions += await del('lesson_versions', (q) =>
      q.delete().in('lesson_id', lessonTextIds).select('id')
    );
  }
  if (lessonUuids.length > 0) {
    counts.lessons += await del('lessons', (q) => q.delete().in('id', lessonUuids).select('id'));
  }
  if (subIds.length > 0) {
    counts.submissions += await del('lesson_submissions', (q) =>
      q.delete().in('id', subIds).select('id')
    );
  }
  return counts;
}

/**
 * Residue probe used by the teardown gate. Coverage argument, per table:
 * - lesson_submissions / lessons: counted directly by marker pattern.
 * - organic children (similarities from detection, versions from
 *   approve_update): every one the suite can create references one of our
 *   submissions via a real NO-ACTION FK (`submission_id` /
 *   `archived_from_submission_id`), so the submission deletes above would
 *   have errored — not silently skipped — if any remained. submissions=0
 *   therefore proves them gone. (The lessons-side `lesson_id` columns carry
 *   NO FK, which is why that argument is never used for them.)
 * - planted similarity rows: counted directly by their `match_details` run
 *   signature, so the gate holds even if a future refactor changed how
 *   cleanup collects ids.
 */
export async function markerResidue(
  svc: SupabaseClient,
  likePattern: string,
  runId?: string
): Promise<{ submissions: number; lessons: number; plantedSimilarities: number }> {
  const { count: subCount, error: e1 } = await svc
    .from('lesson_submissions')
    .select('id', { count: 'exact', head: true })
    .like('google_doc_url', likePattern);
  if (e1) throw new Error(`residue probe (submissions) failed: ${e1.message}`);
  const { count: lessonCount, error: e2 } = await svc
    .from('lessons')
    .select('id', { count: 'exact', head: true })
    .like('file_link', likePattern);
  if (e2) throw new Error(`residue probe (lessons) failed: ${e2.message}`);
  let plantedCount = 0;
  if (runId) {
    const { count, error: e3 } = await svc
      .from('submission_similarities')
      .select('id', { count: 'exact', head: true })
      .eq('match_details->>planted_by', 'auth-e2e')
      .eq('match_details->>run', runId);
    if (e3) throw new Error(`residue probe (planted similarities) failed: ${e3.message}`);
    plantedCount = count ?? 0;
  }
  return {
    submissions: subCount ?? 0,
    lessons: lessonCount ?? 0,
    plantedSimilarities: plantedCount,
  };
}
