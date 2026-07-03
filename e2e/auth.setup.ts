import * as fs from 'fs';
import * as path from 'path';
import { test as setup } from '@playwright/test';
import {
  anyRunLikePattern,
  authSuiteEnabled,
  baseURLFromEnv,
  cleanupMarkerRows,
  getAuthEnv,
  mintRunId,
  REVIEWER_EMAIL,
  REVIEWER_STATE,
  serviceClient,
  signIn,
  storageStateForSession,
  TEACHER_EMAIL,
  TEACHER_STATE,
} from './utils/authFixture';

// Setup project for the authenticated suite: programmatic sign-in (no UI
// login), storageState per role, a fresh run id, and a stale-marker sweep so
// leftovers from a crashed earlier run can't pollute this one's duplicate
// detection. Runs once, before e2e/authenticated/*.

setup('authenticate teacher + reviewer, sweep stale markers', async () => {
  const { enabled, reason } = authSuiteEnabled();
  setup.skip(!enabled, reason);

  const { env, missing } = getAuthEnv();
  if (!env) {
    // In CI a half-configured workflow must fail loudly, never silently skip.
    throw new Error(
      `Authenticated E2E env incomplete — missing: ${missing.join(', ')}. ` +
        '(CI: pass these on the Playwright step; local: see e2e/README.md.)'
    );
  }

  // Sweep leftovers from prior crashed runs. The 2h age gate keeps a
  // concurrently running PR's rows safe; ours are brand new either way.
  const svc = serviceClient(env);
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
  const swept = await cleanupMarkerRows(svc, anyRunLikePattern(), twoHoursAgo);
  const sweptTotal = Object.values(swept).reduce((a, b) => a + b, 0);
  if (sweptTotal > 0) {
    console.warn(`[auth-e2e] swept ${sweptTotal} stale marker row(s) from a previous run:`, swept);
  }

  const runId = mintRunId();
  console.warn(`[auth-e2e] run id: ${runId} (marker docs: 1E2EAUTH${runId}…)`);

  const baseURL = baseURLFromEnv();
  const [teacherSession, reviewerSession] = await Promise.all([
    signIn(env, TEACHER_EMAIL),
    signIn(env, REVIEWER_EMAIL),
  ]);

  // The reviewer must actually hold a reviewer/admin role or every /review/:id
  // visit fails opaquely — check once here with a readable error.
  const { data: profile, error: profErr } = await svc
    .from('user_profiles')
    .select('role')
    .eq('user_id', reviewerSession.user.id)
    .single();
  if (profErr || !['reviewer', 'admin', 'super_admin'].includes(profile?.role ?? '')) {
    throw new Error(
      `${REVIEWER_EMAIL} has role "${profile?.role}" — the suite needs reviewer/admin. (${profErr?.message ?? 'no error'})`
    );
  }

  fs.mkdirSync(path.dirname(TEACHER_STATE), { recursive: true });
  fs.writeFileSync(
    TEACHER_STATE,
    JSON.stringify(storageStateForSession(env, baseURL, teacherSession))
  );
  fs.writeFileSync(
    REVIEWER_STATE,
    JSON.stringify(storageStateForSession(env, baseURL, reviewerSession))
  );
});
