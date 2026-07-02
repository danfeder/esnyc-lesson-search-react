# Brief: Quick-wins patch PR (T2 punch-list bucket 1)

**Written by:** Fable, 2026-07-01 (post-T2 brief session; scope ratified by the user, incl.
one addition: the editable title field). **Executor:** Opus, fresh session. **This brief tells
you exactly what to build, how to verify, and when to STOP. Do not redesign, expand scope, or
improvise around a failed assumption — halt and report instead.** All file:line references
verified against `main` on 2026-07-01.

## Scope (10 items — nothing else)

### A. Scope the required-tags gate to the two approve decisions (punch-list blocker)

- `src/pages/ReviewDetail.tsx:126-131` (`handleSaveReview`) runs `computeRequiredFieldErrors`
  unconditionally before every decision. Change: run it ONLY when
  `decision === 'approve_new' || decision === 'approve_update'`; for `'needs_revision'`, skip
  it AND `setValidationErrors([])` so a stale missing-field banner from a prior approve
  attempt clears.
- **No server-side change needed — verified 2026-07-01:** `complete-review/index.ts:117-131`
  only Zod-parses `metadata` when present, and every field in `reviewFormPayloadSchema` is
  `.optional()`. The edge fn already accepts a bare decision. Do NOT touch the edge gate.
- The Zod shape check (`ReviewDetail.tsx:161`) stays for all decisions (invalid values should
  always block; empty ones shouldn't block a send-back).
- Update `src/pages/reviewValidation.test.ts` + the ReviewDetail integration tests
  (`src/__tests__/integration/review-detail-page.test.tsx`) for the new decision-awareness.

### B. Success feedback on all three decisions

- Today: `handleSaveReview` → `navigate('/review')` (`ReviewDetail.tsx:191`), silent.
- There is no toast library. Copy the app's one existing pattern (navigation-state toast):
  `AdminInviteUser.tsx:222` passes `state: { toast: { kind, msg } }`;
  `AdminInvitations.tsx:118` + `:684-687` renders `<div role="status" aria-live="polite"
  className="adm-toast adm-toast--{kind}">` (CSS already in `src/styles/internal-admin.css`).
- Do the same for `/review`: pass a decision-specific toast and render it in
  `ReviewDashboard.tsx`. Plain-language messages, e.g. approve_new → "Published: {title}";
  approve_update → "Merged into the existing lesson."; needs_revision → "Sent back to the
  teacher with your note." Exact copy is yours; plain words, no jargon.

### C. Lesson title on the teacher's "My submissions" cards

- `src/pages/UserProfile.tsx`: the query (:127-131) is `select('*')` so `extracted_title` is
  already fetched; the local `LessonSubmission` interface (:44-55) and mapper (:134-146)
  discard it. Add the field through interface + mapper and render it as the card headline
  (cards at :503-551), falling back to "Untitled submission" when empty. Keep the existing
  "View Google Doc →" link and badges as-is.

### D. Lesson title on the reviewer queue cards (+ Review-button width rider)

- `ReviewDashboard.tsx:203-212` computes card titles from the FIRST LINE of
  `extracted_content` (that's why cards read "Grade Levels: 5, 6, 7"). Change: prefer
  `submission.extracted_title`, fall back to the existing first-line logic, then
  "Untitled submission". (Keep `sanitizeContent`.)
- Rider (same punch-list row): the Review affordance (`IntQueueRow.tsx:129-131`, a styled
  `<span>` in the row grid's last cell) stretches full-width — constrain it in the
  `.adm-queue-row` grid in `internal-admin.css` (e.g. `justify-self`) so it renders at its
  natural button size. Visual-only; verify by eye.

### E. Sticky doc pane on the review screen

- Layout: `ReviewDetail.tsx:377-424`, a `.adm-split--3col` grid with children
  ReviewMetadataForm / ReviewDocPanel / ReviewDecisionPanel.
- A ready-made class exists and is already used on admin pages: `.adm-col-sticky`
  (`internal-admin.css:661-666` — sticky, top 120px, own scroll, collapses to static at the
  mobile breakpoint at :1317). Wrap the doc column with it. No overflow-hidden ancestor blocks
  sticky (checked; the `overflow:hidden` at `.adm-doc-frame` is inside the pane, harmless).
- Consider whether the right (decision) column should get the same treatment ONLY if it's a
  one-line copy of the same wrapper and looks right; otherwise doc pane only.

### F. Editable Title + prefilled Summary on the review form (persisted to the published lesson)

The one item with a DB migration. Current facts (verified):
- `parseExtractedContent` (`src/pages/reviewDetailHelpers.ts:67-93`) already extracts
  `{ title, summary }` from the doc text; `summary` is currently computed and thrown away
  (`ReviewDetail.tsx:262-266` uses only `.title`, as a header fallback at :318).
- The RPC `complete_review_atomic` (current body:
  `supabase/migrations/20260519000000_complete_review_atomic_tags_side_channel.sql`) already
  reads `v_meta->>'summary'` (line 234) — but for title (line 233) it does
  `COALESCE(NULLIF(v_submission.extracted_title,''), NULLIF(v_meta->>'title',''), 'Untitled
  Lesson')` — **extracted_title beats the reviewer's edit**, so a reviewer-edited title would
  be silently ignored. approve_update mirrors this (~:314-315).

Build:
1. Form: add a "Title" text input (prefilled from `submission.extracted_title`, falling back
   to `parsedContent.title`) and a "Summary" textarea (prefilled from `parsedContent.summary`,
   empty if none) to the review form — a small "What gets published" section near the top of
   `ReviewMetadataForm` is fine. Add both keys to the `ReviewMetadata` type
   (`src/types/index.ts:101-118`) and to the metadata init helper (see
   `reviewMetadataInit.test.ts` for where prefill defaults live).
2. Payload: `summary` already exists in `reviewFormPayloadSchema`
   (`src/types/reviewFormPayload.zod.ts:81`); add `title` (trimmed string, optional, mirror
   the schema's existing conventions/length caps). **The edge fn validates with its own copy
   of this schema — locate it (grep `reviewFormPayload` under `supabase/functions/`) and keep
   the two copies byte-parallel.** Ensure `handleSaveReview`'s payload derivation
   (`ReviewDetail.tsx:144-147, 176-184`) passes both through.
3. Migration: CREATE OR REPLACE `complete_review_atomic`, copying the 20260519 body verbatim
   and flipping ONLY the title precedence in BOTH spots (approve_new :233, approve_update
   ~:314): `COALESCE(NULLIF(v_meta->>'title',''), NULLIF(v_submission.extracted_title,''),
   'Untitled Lesson')`. **First confirm 20260519000000 is the latest definition** (grep all
   migrations for `complete_review_atomic`); if a later migration redefines it → STOP.
   Use the `database-migrations` skill + `/new-migration` before touching the file (mandatory;
   mind the same-day filename-sort gotcha). `supabase db reset` + `npm run test:rls` locally.
4. Gate tie-in: add Title (label "Lesson title") to the approve-scoped required list in
   `validateRequiredFields` — it's prefilled, so it near-never blocks, but an empty title
   shouldn't publish. Summary stays optional.

### G. Clear the sign-in form on sign-out/close

- `AuthModal.tsx` keeps `email`/`password` in local state (:15-16) and stays mounted when
  closed (`if (!isOpen) return null`, :21) — so the previous user's credentials reappear.
  Fix once for all four call sites inside AuthModal itself:
  `useEffect(() => { if (!isOpen) { setEmail(''); setPassword(''); } }, [isOpen])`.

### H. Fix the dead /login button on the signed-out profile view

- `src/pages/UserProfile.tsx:249` navigates to `/login`, which doesn't exist (auth is
  modal-based). There is no global modal opener — copy the local pattern from
  `NewSubmissionForm.tsx` (:34/:58/:158): local `showAuthModal` state + render `<AuthModal>`,
  open it from the button. After successful sign-in the profile view re-renders signed-in.

### I. Copy fixes

1. "POSSIBLE DUP" chip → `ReviewDetail.tsx:372`: `possible dup{…}` / `dupes` → spell out
   `possible duplicate{…'' : 's'}`.
2. `ReviewDecisionPanel.tsx:223-225`: label `Note to {firstName}` → **"Note to the teacher"**
   (drop the name interpolation). Placeholder at :235 currently promises "Will be emailed to
   the teacher along with the decision." — false (decision emails are retired for launch).
   Replace with truthful copy, e.g. "Optional. The teacher will see this note with your
   decision under My Submissions."
3. Submit form share hint: `NewSubmissionForm.tsx:127-136` — add a hint line under the URL
   field: plain-language "Before you submit, share your doc so we can read it: in Google Docs,
   Share → 'Anyone with the link' (Viewer)." Do NOT hardcode the service-account email in the
   frontend (it lives server-side only); the dynamic error (item J) carries it when needed.

### J. Propagate the specific doc-sharing error

- Origin: `extract-google-doc/index.ts:104-116` already produces the helpful message
  ("Document not accessible. Please share the document with the service account or make it
  public.") plus `serviceAccountEmail`.
- Swallow: `process-submission/index.ts:263-266` throws generic `'Failed to extract content'`,
  discarding it. Fix: when `extractResult.error` exists, throw/return THAT message (append the
  service-account email when provided, e.g. "… share it with docs-reader@esynyc.org"), else
  keep the generic fallback. The frontend already displays `response.error` verbatim
  (`NewSubmissionForm.tsx:75` → red alert at :137-145) — verify `parseDbError` passes unknown
  strings through untouched.

## Explicitly NOT in scope (do not touch, even though the punch-list mentions them)

Default-to-Pending queue tab; "In Review" tab; duplicate-card CSS overflow; "Merge into
existing" explainer; title-mismatch banner attribution — all deferred (dup-panel items fold
into the T4 redesign). Resubmit-after-revisions button = its own PR after T3. Rejection UI =
T4. No `filterDefinitions.ts` changes. No dup-panel logic changes.

## PR mechanics

- Branch `fix/t2-quickwins-punchlist` off `main`. ONE PR.
- **This PR carries the uncommitted sprint docs** (they sit modified/untracked on local main):
  `docs/plans/2026-07-01-go-live-tracker.md`, `docs/plans/2026-07-01-t2-walkthrough.md`,
  `docs/plans/2026-07-01-brief-quickwins-patch.md` (this file),
  `docs/plans/2026-07-01-brief-t3-auth-email.md`. **Do NOT sweep in any other untracked
  `docs/plans/` files or `.md` kickoff docs — several are deliberately uncommitted.**
- Edge fns touched: `process-submission` (item J) + `complete-review` only if its schema copy
  needs the `title` key (item F2). Verify TEST deploys per the CI-flakes playbook (version
  bump via `mcp__supabase-test__list_edge_functions`, not workflow-green alone).
- This is a DB-migration PR: after CI applies it to TEST, verify with
  `mcp__supabase-test__execute_sql`, and RE-RUN that verification after every DB-affecting
  fix-up round (standing rule).
- `npm run check` + `npm run test:run` before push (mandatory, fast). Bot-review triage across
  all four PR comment surfaces; write the rebuttal pass before fixing anything.

## Verification gates (pre-registered — run all)

1. `npm run check` + `npm run test:run` green; `supabase db reset` + `npm run test:rls` green
   locally with the new migration.
2. Local manual smoke (dev server against local stack or TEST per the walkthrough doc's env
   recipe, sign in as `reviewer@test.com` or `admin@test.com` / `password123`):
   (a) with required tags EMPTY, "Request revisions" with a note **succeeds** and lands on
   /review with the success toast; (b) with tags still empty, "Approve & publish" is
   **blocked** with the missing-field list (now including "Lesson title" if blanked);
   (c) sticky doc pane follows the scroll; (d) queue cards + My-submissions cards show real
   titles; (e) sign out → reopen sign-in modal → fields empty; (f) signed-out profile view
   button opens the auth modal.
3. Title/summary end-to-end on TEST after CI applies the migration: create one submission as
   `teacher@test.com` (the prepared herb-toasts doc URL is in the walkthrough doc §Where we
   run it), approve it via the UI (or direct `complete-review` call) with an EDITED title and
   summary, then `mcp__supabase-test__execute_sql`: the new `lessons` row must show the edited
   title (proving the COALESCE flip) and the summary. **Clean up**: delete lesson + submission
   + review rows with verbatim IDs copied from the responses, `RETURNING` checks, then confirm
   TEST is back to its baseline lesson count (`SELECT count(*) FROM lessons` before/after —
   walkthrough baseline was 763). Mind the pre-delete FK checklist
   (`lessons.original_submission_id` OUT-ref gotcha — memory: data-mutation gotchas).
4. Item J: code-level verification only (TEST can't exercise the 403 path — extraction is
   mocked there, no Google credential). Confirm by reading the deployed bundle behavior via a
   unit-style check or the function logs on a TEST submission (mock path returns success —
   unchanged behavior is the assertion). Do NOT create PROD submissions for this.
5. E2E in CI green (`e2e/review-flow.spec.ts`, `e2e/submission-flow.spec.ts`) — check first
   whether they assert the old always-on gate or the old card headlines; update assertions to
   the new behavior where the spec covers it.

## STOP conditions

- A migration later than 20260519000000 redefines `complete_review_atomic`.
- The edge-side `reviewFormPayloadSchema` copy diverges structurally from the frontend copy
  (more than adding the `title` key can reconcile).
- Gate 3 shows the published title still coming from `extracted_title` after a confirmed
  TEST migration apply.
- The needs_revision path turns out to write anything to `lessons` (it shouldn't — RPC is
  status-only for that decision).
- Any need to touch `filterDefinitions.ts`, RLS, or the dup-panel logic.

On any STOP: halt, write findings to a short handoff doc in `docs/plans/`, report back.
Fable adjudicates.

## On success — session end

Update the tracker (`docs/plans/2026-07-01-go-live-tracker.md`): T2b row → ✅ DONE with PR #,
squash sha, one line of gate evidence; update "Last updated". Per the session-end protocol,
name the next step in your report: **T3 execution (Opus) using
`docs/plans/2026-07-01-brief-t3-auth-email.md`** — no Fable session needed in between unless a
STOP fired. Update memory go-live lines (MEMORY.md + project_golive_sprint.md).
