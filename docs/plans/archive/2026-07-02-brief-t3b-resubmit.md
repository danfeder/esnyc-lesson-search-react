# Brief: T3b — Resubmit-after-revisions button (punch-list row 7)

**Written by:** Fable, 2026-07-02 (T3b brief session). **Executor:** Opus, fresh session.
**This brief tells you exactly what to build, how to verify, and when to STOP. Do not
redesign, expand scope, or improvise around a failed assumption — halt and report instead.**
All file:line references verified against `main` at `104337f` on 2026-07-02.

## What this fixes (context)

When a reviewer sends a submission back with "Request revisions", the teacher sees the
reviewer's note on their My-submissions card — and then has NO way to act on it. There is no
button, no instructions; the "Update existing lesson" flow only targets *published* lessons.
The revision loop cannot close in-system (T2 punch-list row 7, rated **blocker**).

The user designed the fix during the T2 walkthrough: instructions + an "I've updated the
doc — send it back for review" button that **re-snapshots the doc** (re-runs extraction on
the same submission row), flips status back into the review queue, and preserves the
reviewer's tags + feedback. The snapshot-not-live-doc model is deliberate and stays
(review integrity, search, link-rot).

## Locked design decisions (all pre-verified against code/DB — do not revisit)

1. **No migration. No new tables, columns, RLS, or RPC changes.** Everything the flow
   needs already exists (`lesson_submissions` column inventory probed on TEST 2026-07-02;
   status CHECK already allows the `needs_revision` → `submitted` flip).
2. **Server side = a `resubmit` mode inside `process-submission`** (the machinery —
   extract, embed, auto-tag, dedup — already lives there; a `regenerateEmbedding` mode
   operating on an existing row is precedent, `index.ts:163-182`). No new edge function.
3. **The write path is the edge function's service client, gated in-code.** RLS forbids
   teacher UPDATEs on `lesson_submissions` (baseline policies: teachers INSERT own :3161 +
   SELECT own :3165; only reviewers UPDATE :3111) — that stays. The teacher calls the
   function with their JWT; the function verifies ownership + status, then writes with
   `supabaseAdmin`.
4. **Status flips `needs_revision` → `submitted`** in the SAME update that stores the fresh
   snapshot, only AFTER extraction succeeds. A failed extraction (doc unshared/deleted)
   returns the honest error (post-#572 propagation) and leaves the row in `needs_revision`
   so the teacher can fix and retry.
5. **`revision_requested_reason` → NULL in that same update.** The teacher card renders the
   "Revision requested" callout whenever that field is set (`UserProfile.tsx:538-543`);
   nulling it makes the card return cleanly to a "Submitted" state with no stale ask. The
   reviewer's note is NOT lost — it lives on in `submission_reviews.notes` and prefills the
   reviewer's form on re-open. Leave `reviewer_notes`, `reviewed_at`, `review_completed_at`
   alone (history).
6. **Clear stale duplicate candidates before re-running detection.** `detect-duplicates`
   only INSERTs into `submission_similarities` (`detect-duplicates/index.ts:432-450`),
   there is NO unique constraint on (submission_id, lesson_id) (probed on TEST), and a
   zero-result re-run inserts nothing — so without an explicit
   `DELETE FROM submission_similarities WHERE submission_id = …` the reviewer would see
   stale or doubled candidates from the old snapshot.
7. **Tags + feedback preservation needs NO code.** `submission_reviews` is one upserted row
   per submission (`ON CONFLICT (submission_id)`); the review form restores
   `tagged_metadata`, prior decision, and notes when the row comes back to review
   (`useReviewSubmission.ts:373-417`). Expected (correct, do not "fix"): the reviewer
   reopens the resubmission with their old tags prefilled, decision preset to
   "needs_revision", and their old note in the notes box.
8. **The RPC's idempotency guard is safe.** `complete_review_atomic` (current definition:
   `20260702000000_complete_review_atomic_reviewer_title.sql`) blocks re-entry only on
   terminal statuses (approved/rejected, ERRCODE 55000); `needs_revision` and `submitted`
   are deliberately non-terminal, so re-reviewing the resubmission flows through the normal
   UPSERT path. Do not touch the RPC.
9. **No Playwright E2E in this PR — and the deferred T3 accept-flow E2E does NOT ride
   here either.** Verified: the repo has zero authenticated-E2E infrastructure —
   `e2e/review-flow.spec.ts` is entirely `.skip`ped waiting on an auth fixture that was
   never built, and `e2e/submission-flow.spec.ts` is unauthenticated/structural only.
   Both the accept-flow test and any resubmit test would require building that fixture
   from scratch — its own scoped task, not a rider on a blocker fix. **Recommendation
   (decide at T5):** T5's final smoke either builds the auth fixture once for both flows
   or accepts the manual smokes as the launch gate. Unit tests + the TEST-DB manual smoke
   (gates below) cover this PR.
10. **Resubmit is offered ONLY for `needs_revision`.** Rejected rows stay a dead-end for
    now (punch-list row 8, folded into T4's decision-screen reshape).

## Scope (2 files + docs — nothing else)

### A. `supabase/functions/process-submission/index.ts` — resubmit mode

- Add `resubmit?: boolean` to `ProcessSubmissionRequest` (:33-41); it pairs with the
  existing `submissionId` field.
- Branch when `resubmit && submissionId` (the normal flow's Step 1 INSERT at :236-251 is
  what it replaces; Steps 2–6 are shared):
  1. Require an authenticated **user** (the JWT path at :143-155 must have run;
     service-role-only callers get the normal "User authentication required" rejection).
  2. Fetch the row by id via `supabaseAdmin`. Not found → `success:false` error.
  3. Gates — on failure return **HTTP 200 with `{ success:false, error: <plain words> }`**
     (same reasoning as the extraction-error comment at :264-271: supabase-js only exposes
     the message verbatim on a 2xx):
     - `row.teacher_id !== user.id` → "This isn't your submission."
     - `row.status !== 'needs_revision'` → "This submission isn't waiting on revisions."
  4. Re-run extraction (Step 2, :253-283, unchanged) using the row's stored
     `google_doc_url` — the teacher edits the same doc; no new URL is accepted.
  5. Step-3 update (:289-299) for the resubmit case additionally sets
     `status: 'submitted'`, `revision_requested_reason: null`, and
     `updated_at: new Date().toISOString()`.
  6. `DELETE` this submission's `submission_similarities` rows (service client) before the
     Step-5 `detect-duplicates` call (:583-598).
  7. Fall through the existing Steps 4–6 untouched: embedding regen (fail-soft), auto-tag
     passes (skip without `ANTHROPIC_API_KEY` — expected, launch is manual-tagging),
     dedup, content-hash update. Response shape stays the normal-flow shape (:615-630) —
     but return the post-flip status (`'submitted'`), not the stale fetched value.
- Extract the ownership/status gate into a small pure helper (e.g.
  `validateResubmit.ts` colocated, mirroring `normalizeSubmissionInputs.ts`) with a
  colocated `.test.ts` — vitest picks up `supabase/functions/**/*.test.ts`
  (precedent: `_shared/timing-safe-equal.test.ts`).

### B. `src/pages/UserProfile.tsx` — instructions + button on the card

- Inside the existing "Revision requested" callout (:538-543), when
  `submission.status === 'needs_revision'` (gate on STATUS, not on reason-presence —
  rejected rows can carry a reason too), add:
  - One plain-language instruction line, e.g.: *"Open your Google Doc (link above), make
    the changes, then send it back. We'll take a fresh copy of your doc for the
    reviewers."*
  - An `IntButton` (primary): **"I've updated my doc — send it back for review"**, with
    the file's existing `Loader2` in-flight pattern, disabled while in flight (double-click
    guard).
  - Minor wording adjustments allowed; plain words, no jargon.
- Handler: `supabase.functions.invoke('process-submission', { body: { resubmit: true,
  submissionId } })` — mirror the response handling in `NewSubmissionForm.tsx:68-90`
  (`invokeError` AND `response.success === false` both surface as errors). On success:
  `setSuccessMessage('Sent back for review. A reviewer will take another look.')` +
  `loadSubmissions()` (the reloaded card shows the Submitted badge and the callout is gone,
  because the reason is now null). On failure: `setErrorMessage(<the honest error>)`.
- Track the in-flight submission id in state (`resubmittingId`), not a global boolean —
  a teacher can have several cards.

### C. Docs riding this PR

- `docs/plans/2026-07-01-go-live-tracker.md` (modified on local main — the T3-close +
  this-brief session edits) and `docs/plans/2026-07-02-brief-t3b-resubmit.md` (this file).
- **Do NOT sweep in any other untracked `docs/plans/` files** (several kickoff docs +
  `heritage-worksheet-form/` are deliberately uncommitted).

## Explicitly NOT in scope

Rejection UI / rejected-row display (T4). Dup-panel anything (T4). Review-queue default
tab / "In Review" tab. Accepting a NEW doc URL on resubmit. Any migration, RLS, RPC, or
`filterDefinitions.ts` change. E2E auth fixture (see decision 9). The
`process-submission:134` plain `===` service-role compare (pre-existing, tracked
hardening candidate — leave it). No PROD test submissions.

## PR mechanics

- Branch `feat/t3b-resubmit-button` off `main`. ONE PR.
- `npm run check` + `npm run test:run` before push (mandatory, fast).
- Edge fn touched: `process-submission` only. After CI deploys to TEST, verify the version
  actually bumped via `mcp__supabase-test__list_edge_functions` (memory: a red or green
  "Deploy to TEST" checkbox alone is not evidence — see the CI-flakes playbook; the strict
  no-op guard has produced cosmetic reds before).
- No migration → no TEST-DB migration verify round and no PROD migration gate. The PROD
  **edge deploy** gate after merge is the USER's action only — never approve it yourself.
- Bot-review triage across all four PR comment surfaces (`/pr-triage`); write the rebuttal
  pass before fixing anything.

## Verification gates (pre-registered — run all)

1. `npm run check` + `npm run test:run` green, including the new gate-helper tests
   (cases: wrong owner, wrong status, happy path).
2. **TEST-DB manual smoke** (dev server against TEST per
   `2026-07-01-t2-walkthrough.md` §Where we run it; test creds `teacher@test.com` /
   `admin@test.com` / `password123`; the prepared doc URLs are in that section — note TEST
   extraction is mocked/canned content, so the assertions are the MECHANICS, not content
   diffs). TEST currently has ZERO `needs_revision` rows (probed 2026-07-02: 113 approved +
   17 rejected, nothing else) — you create the state yourself:
   a. As teacher: submit the prepared doc → card shows Submitted.
   b. As admin: open the review, set 2–3 metadata fields (to prove tag preservation
      later), decision "Request revisions" with a note → teacher card shows the
      Revision-requested callout + the new instructions + button.
   c. As teacher: click resubmit → success message; badge back to Submitted; callout gone.
   d. SQL probe (`mcp__supabase-test__execute_sql`, verbatim ids from the UI/responses):
      `status='submitted'`, `revision_requested_reason IS NULL`, `updated_at` bumped,
      `extracted_content`/`extracted_title` present; `submission_similarities` has no
      duplicated (submission_id, lesson_id) pairs.
   e. As admin: reopen the review → the 2–3 tags from (b) are prefilled and the old note
      is in the notes box (proves preservation via the restore path).
   f. Negative probes (curl with a real teacher JWT — password-grant recipe parallels the
      walkthrough's curl examples): resubmit the now-`submitted` row → refused with the
      plain error; resubmit as a DIFFERENT signed-in user → "This isn't your submission.";
      no auth header → 4xx.
   g. **Cleanup with verbatim ids + RETURNING**: delete `submission_similarities` +
      `submission_reviews` + the `lesson_submissions` row (that FK order). No lesson was
      published in this smoke, so `lessons` stays untouched — confirm count 763 and
      submissions back to 113 approved + 17 rejected.
3. After merge + USER-approved PROD edge deploy: 3-signal verification (version bump on
   `process-submission`, `ezbr_sha256` matches the TEST-verified bundle, and a negative
   probe — `resubmit:true` with a bogus id and no/anon auth → auth rejection, proving the
   new bundle is live without touching PROD data). Live resubmit-for-real validation folds
   into T5's final smoke.

## STOP conditions

- Any schema/RLS/RPC/migration change turns out to be needed after all.
- The `needs_revision → submitted` UPDATE is rejected on TEST (unknown trigger/constraint).
- The resubmit branch can't reuse Steps 2–6 without restructuring the normal-flow behavior
  (the existing new-submission path must be byte-equivalent in behavior).
- Gate 2e shows tags or the note NOT restored (would falsify decision 7's verification).
- Re-reviewing the resubmission trips the RPC's 55000 guard (would falsify decision 8).
- Anything needing `complete-review`, the RPC, `filterDefinitions.ts`, or RLS.

On any STOP: halt, write findings to a short handoff doc in `docs/plans/`, report back.
Fable adjudicates.

## On success — session end

Update the tracker (`docs/plans/2026-07-01-go-live-tracker.md`): T3b row → ✅ DONE with
PR #, squash sha, one line of gate evidence; update "Last updated". Per the session-end
protocol, name the next step in your report: **T4 dedup design — a Fable session** (the
2nd of the 2 planned Fable sessions; T4 gets the slim design-decisions + status doc
exception). Update memory go-live lines (MEMORY.md + project_golive_sprint.md).
