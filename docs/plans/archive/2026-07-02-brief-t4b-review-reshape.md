# Brief t4b — Review-screen reshape + detection rewrite + admin-dup-page removal (Opus executor)

**Read first:** `2026-07-02-t4-dedup-design-decisions.md` (D7–D11 are the spec; the recon
section has verified file:line anchors) and `2026-07-02-t4-status.md`. One PR, branch
`feat/t4b-review-reshape`. Independent of t4a — may run in parallel with the sweep. Code
writing + gate running only; if reality diverges from this brief, STOP and report — do not
redesign.

## A. Migration (one file; mind the same-day-filename gotcha — date it AFTER any existing
same-day migration so ASCII order = version order)

1. **New RPC `find_similar_lessons_text(p_title text, p_content text, p_exclude_lesson_id
   text DEFAULT NULL, p_limit int DEFAULT 20)`** returning
   `(lesson_id text, title text, title_sim real, content_sim real)`:
   `similarity(lower(l.title), lower(p_title))` and `similarity(l.content_text, p_content)`
   over `lessons WHERE retired_at IS NULL` (this WHERE is load-bearing — retired lessons must
   never be offered as update targets), excluding `p_exclude_lesson_id`, ordered by
   `GREATEST(title_sim, content_sim)` desc, limit `p_limit`. Candidates only need to beat the
   caller's floor — return the top 20 and let the edge fn score. `SECURITY DEFINER`,
   `SET search_path = ''`, `GRANT EXECUTE TO service_role` ONLY (called by edge fns with the
   service client; no anon/authenticated grant). pg_trgm 1.6 is installed on PROD/TEST
   (verified 2026-07-02).
2. **`REVOKE EXECUTE ON FUNCTION archive_duplicate_lesson(...) FROM authenticated, anon`**
   (exact signature from `20260209140001_cleanup_archive_function.sql`). It hard-deletes
   lessons while the UI called it "soft-delete" (D10). Two-stage retirement: revoke now, DROP
   post-launch. Do NOT drop tables or other functions.
3. Standard: `supabase db reset` + `npm run test:rls` locally; note the 2 known pre-existing
   `archive_duplicate_lesson` RLS-test scenarios — if the revoke flips them, update those
   test expectations to match the new grants (that's the intended behavior change, not a
   regression to route around; say so in the PR).

## B. `detect-duplicates` rewrite (`supabase/functions/detect-duplicates/index.ts`)

- REMOVE the embedding leg: the `embedding` request param, the
  `find_similar_lessons_by_embedding` RPC call (~lines 295–345), and the embedding-weighted
  combined score (line ~329).
- REPLACE with: call `find_similar_lessons_text` (service client) once per submission, then
  `combined = 0.35*title_sim + 0.45*content_sim + 0.20*metadataOverlap` using the EXISTING
  `calculateMetadataOverlap`. Keep the content-hash leg exactly as is.
- Buckets: `exact` = **hash match ONLY** (never similarity — this kills the false-EXACT
  class); `high` ≥ 0.80; `medium` ≥ 0.60; `low` ≥ 0.45 floor; top 10; keep the
  `submission_similarities` write shape and match-type codes byte-compatible (display
  relabeling happens in the frontend, section C).
- `process-submission/index.ts`: remove the embedding generation + the async
  `content_embedding` update (zones ~301–359 and ~522) and any now-dead helper imports. The
  `lessons.content_embedding` / `lesson_submissions.content_embedding` COLUMNS STAY (inert).
- Delete now-dead scripts `scripts/backfill-embeddings.ts` + `scripts/check-missing-embeddings.mjs`.
  Then `grep -rn content_embedding src supabase/functions scripts` — remaining hits must be
  reads-only/types; list them in the PR description.

## C. Reviewer decision screen (D7 — the locked shape)

Anchors: `ReviewDetail.tsx:46,184-192` (esp. the `:190` ternary), `ReviewDecisionPanel.tsx`
(cards at 140-171, radios at 180-192), `buildCandidateCards.ts`, `IntDuplicateCard.tsx`
(labels 26-31), `reviewDetailHelpers.ts:96-100`.

1. Panel header/question: **"Is this lesson already in the library?"** with the candidate
   cards as evidence beneath. Zero candidates → question hidden, decision list = options
   1/4/5 only.
2. One decision list (exact copy in D7): Publish as NEW / Publish as an UPDATE to
   "<selected>" (with the inline replaces-and-archives explainer; this renames merge) /
   Don't publish — already in the library (duplicate of "<selected>") / Send back for
   revisions / Reject with a reason the teacher will see.
3. Options 2 and 3 are disabled until a card is selected; selecting a card enables them and
   shows the selected title inline. `selectedLessonId` is sent for BOTH option 2
   (`approve_update`, unchanged server contract) and option 3 (see 5). The `:190`
   silently-null-out ternary must be structurally gone.
4. Guard: choosing option 1 while any `exact`- or `high`-code card exists on the submission
   (selected or not) → inline are-you-sure naming the top match before submit.
5. Option 3 wiring: `decision:'reject'` + note prefilled editable **"This lesson is already
   in the library as '<selected title>'."** — server contract already supports it
   (`complete-review/index.ts:15,29`; RPC CHECK at `20260702000000_…:64`). No edge/RPC change
   for this path. (`selectedLessonId` for option 3 is frontend-only context for the note; do
   NOT send it as `p_selected_lesson_id`, which must stay approve_update-only.)
6. Option 5 (plain Reject): reason textarea required before submit.
7. Display labels (frontend-only remap): exact→"Identical copy", high→"Nearly identical",
   medium→"Very similar", low→"Some overlap". Score % stays as small secondary text. Header
   chip "1 POSSIBLE DUP" → "1 possible duplicate". Fix the card text-overflow CSS
   (walkthrough row: "55% + NEAR-DUPLICATE spills outside the card").
8. Title-mismatch banner: say who actually picked the target — detector-picked → "The
   duplicate checker matched this to '<title>'"; only say "the submitter linked" when the
   submitter actually did (`buildCandidateCards.ts` badges at 112/127/149 know the source).

## D. Teacher-side rejected status (D8)

`UserProfile.tsx:43` (`SubmissionStatus` type) + `:62` (`STATUS_BADGE` map) omit `rejected` →
today a rejected submission renders a blank badge. Add `rejected` with an honest plain badge
("Not published") and show the reviewer's note on the card. **Probe first** (TEST DB has 17
rejected rows): find where the reject note is teacher-readable (`revision_requested_reason`?
`submission_reviews.notes` via the existing restore path? somewhere else?). If NO
teacher-readable note surface exists for rejects, STOP-report — ship the badge, skip the
note, and flag it, rather than inventing a new data path.

## E. Remove the admin Duplicates pages (D10)

Routes `App.tsx:155-169`, nav `Header.tsx:146`, `AdminDuplicates.tsx`,
`AdminDuplicateReview.tsx`, `duplicateGroupService.ts` + its test, dead types, and the
now-unused `Permission.MANAGE_DUPLICATES` wiring IF nothing else references it (grep first;
if referenced elsewhere, leave the constant, remove only the dup-page usage). Leave RPCs
`find_duplicate_pairs` / `get_lesson_details_for_review` in the DB (post-launch drop list) —
this PR only removes frontend surface + the section-A revoke. Also delete the orphaned
`src/components/review/ReviewDuplicates.tsx` (unwired duplicate of the panel, confirmed
2026-07-02).

## Gates

`npm run check` + `npm run test:run` (update the review-detail integration tests +
`buildCandidateCards`/panel tests for the new shape; add: guard-modal test, option-3 wiring
test, rejected-badge test, label-map test) + `supabase db reset` + `npm run test:rls` + E2E
green. After CI applies the migration to TEST: `mcp__supabase-test__execute_sql` verify —
RPC exists with right grants (and returns sane sims for a known pair), revoke in effect;
re-run after every DB-affecting fix-up round. Direct-edge smoke on TEST: a submission
whose canned TEST fingerprint used to produce the false "EXACT" must now show hash-honest
results (no exact label without hash match). Bot triage all four surfaces; investigate every
finding before fixing.

## STOP conditions

Server reject contract differs from the anchors above; no teacher-readable reject-note
surface (see D); `submission_similarities` consumers depend on the embedding fields you're
removing; RPC signature collisions; anything that smells like it needs a design call —
including any urge to also "fix" the metadata-overlap Title-case kebab gap (explicitly out
of scope unless trivially in reach, per design doc).

## Session end

Status doc + tracker line. Report: one line + PR link. PROD gates (migration approval + edge
deploy) are USER-only; 3-signal PROD verify per `reference_ci_flakes` after merge.
