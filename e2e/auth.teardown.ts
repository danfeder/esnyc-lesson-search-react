import { test as teardown, expect } from '@playwright/test';
import {
  authSuiteEnabled,
  cleanupMarkerRows,
  currentRunId,
  getAuthEnv,
  markerResidue,
  runLikePattern,
  serviceClient,
} from './utils/authFixture';

// Teardown project: after the authenticated specs finish (pass OR fail),
// delete every row this run created — scoped to the run's marker — and gate
// on a zero-residue probe so the shared TEST DB returns to its baseline
// automatically. Runs on the Node side with the service key; the browser
// never sees privileged credentials.

teardown('delete this run’s marker rows and verify zero residue', async () => {
  const { enabled, reason } = authSuiteEnabled();
  teardown.skip(!enabled, reason);

  const { env } = getAuthEnv();
  if (!env) return; // setup already failed loudly; nothing was created.

  const runId = currentRunId();
  if (!runId) return; // setup never ran far enough to mint a run.

  const svc = serviceClient(env);
  const pattern = runLikePattern(runId);
  const deleted = await cleanupMarkerRows(svc, pattern);
  console.warn(`[auth-e2e] cleanup receipts for run ${runId}:`, deleted);

  const residue = await markerResidue(svc, pattern, runId);
  expect(residue, 'this run must leave zero marker rows behind').toEqual({
    submissions: 0,
    lessons: 0,
    plantedSimilarities: 0,
  });
});
