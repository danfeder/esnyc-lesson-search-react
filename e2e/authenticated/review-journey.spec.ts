import { test, expect, type BrowserContext, type Page } from '@playwright/test';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  anonClient,
  authSuiteEnabled,
  cleanupMarkerRows,
  currentRunId,
  getAuthEnv,
  markerDocUrl,
  MARKER,
  plantSimilarity,
  REVIEWER_STATE,
  runLikePattern,
  serviceClient,
  TEACHER_EMAIL,
  TEACHER_STATE,
  TEST_PASSWORD,
  type AuthEnv,
} from '../utils/authFixture';

// T5b: the authenticated review journey, mirroring the T5 launch smoke
// (docs/plans/2026-07-03-t5-launch-smoke.md) station by station:
//   1. teacher submits via /submit/new and lands `submitted`;
//   2. every one of the five reviewer decisions is exercised, including the
//      card-bound gating, the already-in-library prefill + re-bind, the
//      reject-requires-reason block, and the publish-anyway guard (fired and
//      cancelled cleanly);
//   3. the revision loop: note → resubmit → status flips back, stale
//      similarity rows cleared, reviewer tags preserved on reopen;
//   4. the teacher's My-submissions badges (Submitted / Revision / Approved /
//      Not published + reason);
//   5. the published lesson is reachable in public, logged-out search with
//      its edited title + summary.
//
// Design notes:
// - Serial by design: one journey, shared state, single worker. On retry the
//   whole file re-runs; beforeAll wipes the previous attempt's rows (same run
//   marker), and doc ids carry the attempt number so locators never collide.
// - Extraction is CANNED on TEST (no Google credential): titles/content are
//   random mock lessons, so nothing here asserts on extracted content.
//   Duplicate evidence is PLANTED via marker-scoped service helpers (the T5
//   precedent) to make the guard/card scenarios deterministic.
// - Candidate-card assertions tolerate EXTRA cards (a concurrent CI run's
//   published mock lesson can organically match ours) — they always target
//   cards by known title, never by count or position.
// - The publish-as-update decision targets THIS RUN's published lesson, so no
//   real corpus row is ever written to.

test.describe.configure({ mode: 'serial' });

const { enabled, reason } = authSuiteEnabled();
test.skip(!enabled, reason);

// Tag choices for the required-metadata gate. Deliberately avoids the Cooking
// and Garden activity types so their conditional required fields stay off.
const REQUIRED_TAGS: Array<{ group: string; label: string }> = [
  { group: 'Activity type', label: 'Academic' },
  { group: 'Location', label: 'Indoor' },
  { group: 'Grades', label: '3rd Grade' },
  { group: 'Seasons', label: 'Fall' },
  { group: 'Thematic categories', label: 'Food Justice' },
  { group: 'Core competencies', label: 'Social Justice' },
  // FP5 Brief 1 renamed the category label ("Social-Emotional Learning" →
  // "Social-Emotional Skills"); the form sentence-cases group names.
  { group: 'Social-emotional skills', label: 'Self-awareness' },
];

let env: AuthEnv;
let svc: SupabaseClient;
let teacherApi: SupabaseClient;
let runId: string;
let attempt: string;
let teacherCtx: BrowserContext;
let reviewerCtx: BrowserContext;

// Two real live lessons used as read-only targets for planted evidence (their
// rows are never written; only our own similarity rows point at them).
let lessonX: { lesson_id: string; title: string };
let lessonY: { lesson_id: string; title: string };

// Journey state.
const S: {
  docA?: string;
  docB?: string;
  docC?: string;
  docD?: string;
  subA?: string;
  subB?: string;
  subC?: string;
  subD?: string;
  publishedTitle?: string;
  publishedSummary?: string;
  publishedLessonId?: string;
} = {};

function docId(suffix: string): string {
  return `${MARKER}${runId}${attempt}${suffix}`;
}

/** The teacher's My-submissions card for one of our submissions, located by
 * its unique marker doc id (titles are canned and can repeat). */
function mySubsCard(page: Page, doc: string) {
  return page.locator('article', { has: page.locator(`a[href*="${doc}"]`) });
}

async function submitViaApi(googleDocUrl: string): Promise<string> {
  const { data, error } = await teacherApi.functions.invoke('process-submission', {
    body: { googleDocUrl, submissionType: 'new', originalLessonId: null },
  });
  expect(error, 'process-submission invoke error').toBeNull();
  expect(data?.success, `process-submission failed: ${JSON.stringify(data)}`).toBe(true);
  expect(data.data.status).toBe('submitted');
  return data.data.submissionId as string;
}

/** Click a pill only when needed so canned-extraction prefills can't flip a
 * previously-on pill off (mock content sometimes seeds metadata). */
async function setPill(page: Page, group: string, label: string, pressed: boolean) {
  const btn = page
    .getByRole('group', { name: group, exact: true })
    .getByRole('button', { name: label, exact: true });
  if (((await btn.getAttribute('aria-pressed')) === 'true') !== pressed) {
    await btn.click();
  }
  await expect(btn).toHaveAttribute('aria-pressed', String(pressed));
}

async function fillRequiredTags(page: Page) {
  // Keep the conditional cooking/garden field sets off regardless of what the
  // canned extraction seeded.
  await setPill(page, 'Activity type', 'Cooking', false);
  await setPill(page, 'Activity type', 'Garden', false);
  for (const { group, label } of REQUIRED_TAGS) {
    await setPill(page, group, label, true);
  }
}

test.beforeAll(async ({ browser }, testInfo) => {
  const resolved = getAuthEnv();
  if (!resolved.env) throw new Error(`auth env missing: ${resolved.missing.join(', ')}`);
  env = resolved.env;
  svc = serviceClient(env);

  const minted = currentRunId();
  if (!minted) throw new Error('run id missing — did auth.setup.ts run?');
  runId = minted;
  attempt = `r${testInfo.retry}`;

  // Retry hygiene: a previous attempt may have left rows (including a
  // published mock-content lesson that would organically match this attempt's
  // submissions). Start every attempt from a clean marker slate.
  await cleanupMarkerRows(svc, runLikePattern(runId));

  teacherApi = anonClient(env);
  const { error: signInErr } = await teacherApi.auth.signInWithPassword({
    email: TEACHER_EMAIL,
    password: TEST_PASSWORD,
  });
  if (signInErr) throw new Error(`teacher API sign-in failed: ${signInErr.message}`);

  const { data: targets, error: targetErr } = await svc
    .from('lessons')
    .select('lesson_id, title')
    .is('retired_at', null)
    .not('file_link', 'like', `%${MARKER}%`)
    .order('lesson_id', { ascending: true })
    .limit(2);
  if (targetErr || !targets || targets.length < 2) {
    throw new Error(`could not pick two live target lessons: ${targetErr?.message}`);
  }
  [lessonX, lessonY] = targets as typeof targets & [typeof lessonX, typeof lessonY];

  teacherCtx = await browser.newContext({ storageState: TEACHER_STATE });
  reviewerCtx = await browser.newContext({ storageState: REVIEWER_STATE });
});

test.afterAll(async () => {
  await teacherCtx?.close();
  await reviewerCtx?.close();
});

test('teacher submits a new lesson through /submit/new', async () => {
  S.docA = docId('a');
  const page = await teacherCtx.newPage();
  await page.goto('/submit/new');
  await page
    .getByPlaceholder('https://docs.google.com/document/d/...')
    .fill(markerDocUrl(runId, `${attempt}a`));
  await page.getByRole('button', { name: 'Submit', exact: true }).click();

  // Extraction + duplicate detection round-trip through two edge functions.
  await expect(page.getByText('Submitted!')).toBeVisible({ timeout: 90_000 });
  await expect(page.locator('.adm-status')).toHaveText('Submitted');

  const idLine = await page.getByText(/Submission ID:/).textContent();
  const id = idLine?.match(/[0-9a-f-]{36}/)?.[0];
  expect(id, `couldn't read submission id from "${idLine}"`).toBeTruthy();
  S.subA = id!;
  await page.close();
});

test('three more submissions land through the same pipeline', async () => {
  test.setTimeout(180_000);
  S.docB = docId('b');
  S.docC = docId('c');
  S.docD = docId('d');
  S.subB = await submitViaApi(markerDocUrl(runId, `${attempt}b`));
  S.subC = await submitViaApi(markerDocUrl(runId, `${attempt}c`));
  S.subD = await submitViaApi(markerDocUrl(runId, `${attempt}d`));
});

test('teacher sees Submitted badges under My submissions', async () => {
  const page = await teacherCtx.newPage();
  await page.goto('/profile');
  await expect(mySubsCard(page, S.docA!).locator('.adm-status')).toHaveText('Submitted', {
    timeout: 15_000,
  });
  await expect(mySubsCard(page, S.docB!).locator('.adm-status')).toHaveText('Submitted');
  await page.close();
});

test('reject without a reason is blocked; with a reason it commits (B)', async () => {
  const page = await reviewerCtx.newPage();
  await page.goto(`/review/${S.subB}`);
  await page.getByRole('radio', { name: 'Reject — with a reason the teacher will see' }).check();
  await page.getByRole('button', { name: 'Reject submission' }).click();

  // Blocked, nothing written, field relabelled to the reason framing.
  await expect(
    page.getByText(
      'Save failed — nothing was written. Add a reason the teacher will see before rejecting.'
    )
  ).toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/review/${S.subB}`));

  await page
    .getByRole('textbox', { name: 'Reason for the teacher' })
    .fill(`E2E reject reason ${runId}`);
  await page.getByRole('button', { name: 'Reject submission' }).click();
  await page.waitForURL('**/review', { timeout: 30_000 });

  const { data } = await svc
    .from('lesson_submissions')
    .select('status, reviewer_notes')
    .eq('id', S.subB!)
    .single();
  expect(data?.status).toBe('rejected');
  expect(data?.reviewer_notes).toBe(`E2E reject reason ${runId}`);
  await page.close();
});

test('teacher sees Not published plus the reason (B)', async () => {
  const page = await teacherCtx.newPage();
  await page.goto('/profile');
  const card = mySubsCard(page, S.docB!);
  await expect(card.locator('.adm-status')).toHaveText('Not published', { timeout: 15_000 });
  await expect(card.getByText(`E2E reject reason ${runId}`)).toBeVisible();
  await page.close();
});

test('candidate cards gate the card-bound options; the prefilled note re-binds on card switch; already-in-library commits (C)', async () => {
  await plantSimilarity(svc, {
    submissionId: S.subC!,
    lessonId: lessonX.lesson_id,
    score: 1.0,
    matchType: 'exact',
    runId,
  });
  await plantSimilarity(svc, {
    submissionId: S.subC!,
    lessonId: lessonY.lesson_id,
    score: 0.91,
    matchType: 'high',
    runId,
  });

  const page = await reviewerCtx.newPage();
  await page.goto(`/review/${S.subC}`);
  await expect(page.getByText('Is this lesson already in the library?')).toBeVisible({
    timeout: 15_000,
  });

  // Card-bound options are disabled until a candidate is selected.
  const updateRadio = page.getByRole('radio', { name: /Publish as an update/ });
  const dupRadio = page.getByRole('radio', { name: /already in the library/ });
  await expect(updateRadio).toBeDisabled();
  await expect(dupRadio).toBeDisabled();
  await expect(
    page.getByText(
      'Select a matching lesson above to enable the update / already-in-the-library options.'
    )
  ).toBeVisible();

  // Select the exact-match card → both options unlock and bind its title.
  const cardX = page.locator('.adm-dup', { hasText: lessonX.title });
  const cardY = page.locator('.adm-dup', { hasText: lessonY.title });
  await cardX.click();
  await expect(updateRadio).toBeEnabled();
  await expect(dupRadio).toBeEnabled();

  // Option 3 prefills the teacher-visible note with the selected title…
  await dupRadio.check();
  const noteBox = page.getByRole('textbox', { name: 'Reason for the teacher' });
  await expect(noteBox).toHaveValue(`This lesson is already in the library as "${lessonX.title}".`);

  // …and re-binds when the reviewer switches cards (bot-round-2 regression).
  await cardY.click();
  await expect(noteBox).toHaveValue(`This lesson is already in the library as "${lessonY.title}".`);

  // Leaving option 3 clears an unedited prefill (bot-round-1 regression).
  await page.getByRole('radio', { name: 'Publish as a new lesson' }).check();
  await expect(page.getByRole('textbox', { name: 'Note to the teacher' })).toHaveValue('');

  // Commit "already in the library" against card Y.
  await dupRadio.check();
  await expect(noteBox).toHaveValue(`This lesson is already in the library as "${lessonY.title}".`);
  await page.getByRole('button', { name: "Don't publish" }).click();
  await page.waitForURL('**/review', { timeout: 30_000 });

  // Server contract (D8): stored as a reject with the note; the review row
  // carries no canonical link (the card only prefills the note).
  const { data } = await svc
    .from('lesson_submissions')
    .select('status, reviewer_notes')
    .eq('id', S.subC!)
    .single();
  expect(data?.status).toBe('rejected');
  expect(data?.reviewer_notes).toBe(`This lesson is already in the library as "${lessonY.title}".`);
  const { data: review } = await svc
    .from('submission_reviews')
    .select('decision, canonical_lesson_id')
    .eq('submission_id', S.subC!)
    .single();
  expect(review?.decision).toBe('reject');
  expect(review?.canonical_lesson_id).toBeNull();
  await page.close();
});

test('teacher sees Not published naming the duplicate (C)', async () => {
  const page = await teacherCtx.newPage();
  await page.goto('/profile');
  const card = mySubsCard(page, S.docC!);
  await expect(card.locator('.adm-status')).toHaveText('Not published', { timeout: 15_000 });
  await expect(
    card.getByText(`This lesson is already in the library as "${lessonY.title}".`)
  ).toBeVisible();
  await page.close();
});

test('reviewer fills the tags and sends A back for revisions', async () => {
  const page = await reviewerCtx.newPage();
  await page.goto(`/review/${S.subA}`);
  await expect(page.getByLabel('Lesson title')).not.toHaveValue('', { timeout: 15_000 });

  await fillRequiredTags(page);
  await page.getByRole('radio', { name: 'Send back for revisions' }).check();
  await page
    .getByRole('textbox', { name: 'Note to the teacher' })
    .fill(`E2E revision request ${runId}`);
  await page.getByRole('button', { name: 'Send for revision' }).click();
  await page.waitForURL('**/review', { timeout: 30_000 });
  await page.close();
});

test('teacher sees the revision note and resubmits; status flips and stale duplicate flags clear (A)', async () => {
  test.setTimeout(180_000);
  // Plant round-1 "stale" candidates that the resubmit must clear (T3b).
  await plantSimilarity(svc, {
    submissionId: S.subA!,
    lessonId: lessonX.lesson_id,
    score: 1.0,
    matchType: 'exact',
    runId,
  });
  await plantSimilarity(svc, {
    submissionId: S.subA!,
    lessonId: lessonY.lesson_id,
    score: 0.91,
    matchType: 'high',
    runId,
  });

  const page = await teacherCtx.newPage();
  await page.goto('/profile');
  const card = mySubsCard(page, S.docA!);
  await expect(card.locator('.adm-status')).toHaveText('Revision', { timeout: 15_000 });
  await expect(card.getByText('Revision requested')).toBeVisible();
  await expect(card.getByText(`E2E revision request ${runId}`)).toBeVisible();

  // The T3b button: re-snapshots the doc, flips the status back, clears the
  // stale similarity rows.
  await card.getByRole('button', { name: "I've updated my doc — send it back for review" }).click();
  await expect(card.locator('.adm-status')).toHaveText('Submitted', { timeout: 90_000 });

  const { data: after } = await svc
    .from('lesson_submissions')
    .select('status, revision_requested_reason')
    .eq('id', S.subA!)
    .single();
  expect(after?.status).toBe('submitted');
  expect(after?.revision_requested_reason).toBeNull();

  // Both planted "stale" rows must be gone — asserted by their plant
  // signature, so a legitimate organic row from the fresh detection re-run
  // can never flake this (regardless of its score).
  const { count } = await svc
    .from('submission_similarities')
    .select('id', { count: 'exact', head: true })
    .eq('submission_id', S.subA!)
    .eq('match_details->>planted_by', 'auth-e2e');
  expect(count).toBe(0);
  await page.close();
});

test('reviewer reopens A with tags preserved; the publish guard fires, cancels cleanly, then publishes (A)', async () => {
  test.setTimeout(180_000);
  // Fresh strong candidate so publishing-as-new must raise the D7 guard.
  await plantSimilarity(svc, {
    submissionId: S.subA!,
    lessonId: lessonX.lesson_id,
    score: 1.0,
    matchType: 'exact',
    runId,
  });

  const page = await reviewerCtx.newPage();
  await page.goto(`/review/${S.subA}`);
  await expect(page.getByLabel('Lesson title')).not.toHaveValue('', { timeout: 15_000 });

  // T3b restore path: every tag saved before the revision round is still set.
  for (const { group, label } of REQUIRED_TAGS) {
    await expect(
      page
        .getByRole('group', { name: group, exact: true })
        .getByRole('button', { name: label, exact: true })
    ).toHaveAttribute('aria-pressed', 'true');
  }

  // Reviewer-owned title + summary (T2b fields) — unique so the public search
  // step is deterministic.
  S.publishedTitle = `E2E Auth Journey ${MARKER}${runId}`;
  S.publishedSummary = `Published by the authenticated E2E suite (run ${runId}).`;
  await page.getByLabel('Lesson title').fill(S.publishedTitle);
  await page.getByLabel('Summary').fill(S.publishedSummary);

  await page.getByRole('radio', { name: 'Publish as a new lesson' }).check();
  await page.getByRole('button', { name: 'Publish lesson' }).click();

  // Guard up, naming the planted match; Keep reviewing cancels with no write.
  // (The callout renders the title in typographic quotes — assert on the
  // callout's text content, not a quote-sensitive literal.)
  const guard = page.getByText('This looks like an existing lesson');
  const guardBox = page.locator('.adm-callout--warning', {
    hasText: 'This looks like an existing lesson',
  });
  await expect(guard).toBeVisible();
  await expect(guardBox).toContainText(lessonX.title);
  await expect(guardBox).toContainText('is already in the library');
  await page.getByRole('button', { name: 'Keep reviewing' }).click();
  await expect(guard).not.toBeVisible();
  await expect(page).toHaveURL(new RegExp(`/review/${S.subA}`));
  const { data: mid } = await svc
    .from('lesson_submissions')
    .select('status')
    .eq('id', S.subA!)
    .single();
  expect(mid?.status).toBe('submitted');

  // Second pass: publish anyway.
  await page.getByRole('button', { name: 'Publish lesson' }).click();
  await expect(guard).toBeVisible();
  await page.getByRole('button', { name: 'Publish anyway' }).click();
  await page.waitForURL('**/review', { timeout: 60_000 });

  const { data: lesson } = await svc
    .from('lessons')
    .select('lesson_id, title, summary, retired_at')
    .eq('original_submission_id', S.subA!)
    .single();
  expect(lesson?.title).toBe(S.publishedTitle);
  expect(lesson?.summary).toBe(S.publishedSummary);
  expect(lesson?.retired_at).toBeNull();
  S.publishedLessonId = lesson!.lesson_id as string;
  await page.close();
});

test('the published lesson appears in logged-out public search with title and summary', async ({
  browser,
}) => {
  const publicCtx = await browser.newContext();
  const page = await publicCtx.newPage();
  await page.goto('/');
  await page.getByPlaceholder(/search/i).fill(`${MARKER}${runId}`);
  await expect(page.getByText(S.publishedTitle!)).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(S.publishedSummary!)).toBeVisible();
  await publicCtx.close();
});

test('teacher sees Approved on A', async () => {
  const page = await teacherCtx.newPage();
  await page.goto('/profile');
  await expect(mySubsCard(page, S.docA!).locator('.adm-status')).toHaveText('Approved', {
    timeout: 15_000,
  });
  await page.close();
});

test('reviewer publishes D as an update into this run’s lesson; one version is archived', async () => {
  test.setTimeout(180_000);
  // The update target is OUR published lesson — no real corpus row is written.
  await plantSimilarity(svc, {
    submissionId: S.subD!,
    lessonId: S.publishedLessonId!,
    score: 0.93,
    matchType: 'high',
    runId,
  });

  const page = await reviewerCtx.newPage();
  await page.goto(`/review/${S.subD}`);
  await expect(page.getByText('Is this lesson already in the library?')).toBeVisible({
    timeout: 15_000,
  });
  await page.locator('.adm-dup', { hasText: S.publishedTitle! }).click();
  await page.getByRole('radio', { name: /Publish as an update/ }).check();
  await fillRequiredTags(page);
  await page.getByRole('button', { name: 'Publish update' }).click();
  await page.waitForURL('**/review', { timeout: 60_000 });

  // Exactly one archived version of the target; target updated in place; the
  // run still owns exactly one published lesson row.
  const { count: versions } = await svc
    .from('lesson_versions')
    .select('id', { count: 'exact', head: true })
    .eq('lesson_id', S.publishedLessonId!);
  expect(versions).toBe(1);
  const { count: markerLessons } = await svc
    .from('lessons')
    .select('id', { count: 'exact', head: true })
    .like('file_link', runLikePattern(runId));
  expect(markerLessons).toBe(1);
  const { data: subD } = await svc
    .from('lesson_submissions')
    .select('status')
    .eq('id', S.subD!)
    .single();
  expect(subD?.status).toBe('approved');
  await page.close();
});

test('teacher sees Approved on D', async () => {
  const page = await teacherCtx.newPage();
  await page.goto('/profile');
  await expect(mySubsCard(page, S.docD!).locator('.adm-status')).toHaveText('Approved', {
    timeout: 15_000,
  });
  await page.close();
});
