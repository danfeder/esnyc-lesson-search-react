# ReviewDetail Follow-up PR — Execution Status

**Last updated:** 2026-06-29 (Session 2 — bot rounds 1, 2 & 3 all triaged + fixed + pushed; PR green/MERGEABLE; awaiting user merge go-ahead).

## Current State

**Phase:** **PR #556 OPEN — ALL bot rounds done (1+2+3), all CI green, MERGEABLE/CLEAN — awaiting user merge go-ahead.** https://github.com/danfeder/esnyc-lesson-search-react/pull/556
All 7 planned tasks + 1 GATE-3 fix-up + round-1 (3) + round-2 (5) + round-3 (2) fix-ups built,
supervisor-verified, **all PUSHED**, on branch `fix/reviewdetail-followup` (cut from `main` @ `1cd2693`).
**Full suite 2040/2040; `npm run check` exit 0.** Round 3 was the round-cap round (critical-only) →
2 trivial one-liners folded, 1 finding rejected.

**Bot round 3 (`claude[bot]`, COMMENTED — non-blocking; all CI incl. 4 advisory bots `pass`) — 3 findings, round-cap applied:**
- **#1 `!submissionData` guard returns without `setLoadError` (useReviewSubmission.ts ~L202) — REJECTED.**
  Unreachable today (`.single()` 0-rows → PGRST116, caught earlier). The bot's premise is debatable: in
  the hypothetical `.maybeSingle()` future it cites, null-data-no-error is a GENUINE not-found →
  "Submission not found" with no Retry is CORRECT; adding `setLoadError` would wrongly offer Retry for a
  truly-deleted row. Current defense-in-depth kept.
- **#2 `legacyDecisionWarning` missing `aria-live` (ReviewMetadataForm.tsx:85) — ACCEPTED + FIXED `0a6ca45`.**
  Added `aria-live="assertive"` (additive, zero visual change). Notably this PR's N6 touched that line.
- **#3 non-PGRST116 `submissionError` logged raw (useReviewSubmission.ts:191) — ACCEPTED + FIXED `4b3b232`.**
  Wrapped in `parseDbError` (matches every other error path); logging-only.
Frontend-only — **no DB / no migration → no TEST-DB step.** Design + plan are LOCKED and committed
(`906f2e0` design, `75da10b` plan, `ccc997a` GATE-1B amendments).

**Bot round 2 (`claude[bot]`, COMMENTED — non-blocking; all CI incl. 3 advisory bots `pass`) — 6 findings (across 2 surfaces), all triaged + Codex-cross-examined where substantive:**
- **R2-1 [correctness] network *reject* → "Submission not found", no Retry — ACCEPTED + FIXED `b1bebec`.**
  A true promise reject hit the outer catch (logger.error only) → dead-end not-found. Added
  `setLoadError(SUBMISSION_LOAD_ERROR_MESSAGE)` to the catch (extends F2's retry treatment to
  connection-level failures). GATE-4 Codex (gpt-5.5) AGREE: can't mask a real 0-row not-found (that
  returns inline before the catch), and `loadError` wins render precedence so a mid-load throw shows a
  clean Retry screen, not a half-seeded form — strict improvement. New page test 17 (mock extended with
  a `reject?` field, RED→GREEN); preamble comment updated.
- **R2-2 [a11y] sibling `saveError` banner missing aria-live — ACCEPTED + FIXED `65587aa`.** Same fix as
  round-1 #2; migrated to `<IntAlert variant="error">`.
- **R2-3 vs S1-1 [CONTRADICTION] — resolved: reject R2-3 / accept S1-1, FIXED `acc80a4`.** R2-3 wanted
  Mode-2's `!lessons` defensive gate REMOVED (dead code); S1-1 wanted a symmetric `!similarities` gate
  ADDED to Mode 1. Kept Mode 2's documented gate + added Mode 1's (symmetric defensive consistency),
  `logger.warn` unconditional (Codex refinement), comments clarified as intentional contract-drift/mock
  defense. GATE-4 Codex AGREE: modes mutually exclusive today → behavior-identical; defensive symmetry is
  the more defensible call than removing.
- **S1-2 [maint] magic `5` in 2 (→3) files — ACCEPTED + FIXED `986635c`.** `export const MAX_DUPLICATE_CARDS = 5`
  in `buildCandidateCards.ts`; wired into the banner cap + `renderedTopFive` slice (a 3rd coupled site the
  executor's grep found) + ReviewDetail's `topDuplicates` slice. (User opted in.)
- **S1-3 [test] test 15 didn't pin the F2 message copy — ACCEPTED + FIXED `cd4a022`.** Added a
  SUBMISSION-specific-copy assertion (`/check your connection and try again/i`); a swap to the reviews
  message would now fail.
- **S1-4 [defensive] `key={id ?? ''}` when id undefined — REJECTED.** Unreachable (`ReviewDetailRoute`
  only renders under the matched `/review/:id`); pure hypothetical, below bar.

**Bot round 1 (`claude[bot]`, CHANGES_REQUESTED) — 5 findings, all triaged + rebutted:**
- **#1 `ReviewErrorBoundary` not keyed to `:id` (App.tsx) — ACCEPTED + FIXED `9cf2f8f`.** Real bug in
  R2-NEW-1's blast radius: the class boundary (no reset path) sat OUTSIDE the keyed element → a caught
  render error on `/review/A` permanently blocked `/review/B`. ⚠️ The bot's *literal* "move inside
  unkeyed" snippet is WRONG (boundary instance still stable). Correct fix = **`key={id}` on the
  `ReviewErrorBoundary` itself** (remounts the whole subtree → clears `hasError` AND folds in R2-NEW-1,
  so `<ReviewDetail>` drops its own key). Covered by a NEW focused test
  `src/__tests__/integration/review-detail-route.test.tsx` (RED→GREEN witnessed; renders the real
  exported `ReviewDetailRoute`, throws for one id, navigates out-of-boundary, asserts recovery).
- **#2 banner missing `aria-live` (ReviewDecisionPanel.tsx) — ACCEPTED via Option A (IntAlert), FIXED
  `2c5cab9`.** User chose Option A. Raw `<div role="alert">` (no aria-live, unreliable SR announce for a
  conditionally-mounted alert) → `<IntAlert variant="error">` (emits role+aria-live=assertive). Copy
  preserved verbatim. **Absorbs #5** (`style={{marginTop:12}}` → `className="mt-3"`).
- **#3 `formatGrades` singular/plural (buildCandidateCards.ts) — ACCEPTED + FIXED `cfe4731`.** Single
  grade now "Grade N" (was "Grades N"), matches `IntActivePills`. Pre-existing but corrected now; 2
  test assertions flipped `Grades 5/K`→`Grade 5/K`. User-confirmed (user-visible copy change beyond
  N4's original "behavior-identical" scope).
- **#4 `'PGRST116'` shared constant — REJECTED.** Stable PostgREST code; a constant touches 4 files (3
  outside this PR) for zero correctness/user-visible benefit — DRY nit below the accept bar. Optional
  future cleanup. (GATE-4 skipped: pure-nit reject.)
- **#5 inline style → `mt-3` — ACCEPTED (folded into `2c5cab9`).**

**Round-1 fix-up commits (held local, NOT pushed):** `9cf2f8f` (#1 boundary key + test) · `2c5cab9`
(#2 IntAlert + #5 mt-3) · `cfe4731` (#3 singular grade + test updates). Supervisor-verified: diffs
inspected, targeted tests 30/30, full suite 2039/2039, `npm run check` exit 0.

**What shipped (each a labeled commit, `main..HEAD`):**
- `cbdad68` — Task 1: `duplicatesError {count:number|null}` signal + non-blocking banner + Retry. Both
  silent-zero-cards modes (similarities-list error → count-less; details error gated `if(!lessons)` →
  `min(len,5)`). Partial/"Unknown" fallback unchanged. (tests 13/14)
- `6a42bce` — Task 2 (F2): primary-fetch transient error → load-error screen w/ Retry; PGRST116 →
  "Submission not found" (no Retry); `!submissionData` kept as documented defense-in-depth. (tests 15/16)
- `335f0da` — Task 3 (R2-NEW-1): module-scope `ReviewDetailRoute` → `<ReviewDetail key={id}/>` remount.
  Fallback test path (harness renders ReviewDetail directly; a final-state test would give false
  confidence) → documented manual smoke.
- `4fe2710` F1 (embed `logger.warn`) · `3dad003` N4 (`formatGrades` extract) · `e38540a` N5 (textarea
  `aria-label`, test assertion) · `bb3520f` N6 (`role="alert"`).
- `2530e46` — GATE-3 fix-up: clear `submission`/`initialFormState` at top of `loadSubmission` so a
  failed reload (PGRST116/catch, newly reachable via the banner Retry) can't render a stale/deleted
  submission. (test 17) + stale `reload` JSDoc rewritten.

**Gates passed:** GATE 1B (Codex gpt-5.5 + Claude on the plan — no blockers; folded: cover-both-modes,
`!lessons` gate, module-scope wrapper, count cap, honest test note). GATE 3 (Codex + Claude on the
diff — Codex found the stale-submission should-fix → fixed `2530e46`; 2 NITs handled/no-action).

**GATE-3/4 on the fix-ups — BOTH FAMILIES GO (Session 2).** Codex (gpt-5.5, inline) + a feature-dev
code-reviewer, both on `git diff 9cf2f8f^..HEAD`. Codex: all 3 fixes CORRECT, high confidence, no new
bugs — verified the boundary-key reconciler semantics (fresh `hasError:false` instance per nav),
`IntAlert` role+`aria-live=assertive`, `ProtectedRoute` catch-scope unchanged, lazy/Suspense path
unaffected, `formatGrades` grep clean; one non-blocking note (the new test doesn't cover the async
lazy-load-failure path — pre-existing, out of scope — no action). Claude: GO; flagged comment-drift →
fixed `4589771` (behavior-neutral: `useReviewSubmission.ts` key-owner comments now name
`ReviewErrorBoundary`, not `ReviewDetail`). No blockers either family.

**Round-2 fix-ups (PUSHED `fcc7ef4..8b8e7d2`):** `b1bebec` (R2-1 reject→Retry + test 17) · `65587aa`
(R2-2 saveError IntAlert) · `acc80a4` (S1-1 symmetric gate) · `986635c` (S1-2 MAX_DUPLICATE_CARDS) ·
`cd4a022` (S1-3 test-15 copy pin). GATE-4 Codex pre-impl on R2-1 + the contradiction (both
AGREE-WITH-NUANCE); pre-push GATE-3 Claude reviewer on `b1bebec^..HEAD` = GO (verified catch
reachability, loadError render precedence, mock reject? backward-compat, test-17 discrimination).
**Round-3 fix-ups (PUSHED):** `0a6ca45` (#2 aria-live) · `4b3b232` (#3 parseDbError) — page test 22/22,
check exit 0.

**NEXT (this session):** **Awaiting user merge go-ahead.** All 3 bot rounds done; CI green; PR
MERGEABLE/CLEAN. Before/at merge: optionally run the two manual deploy-preview smokes below (cheap
insurance for the fetch-dependency + remount paths the page mock can't exercise). On merge: PR-cycle
archival + memory hygiene (this is the prioritized W5 follow-up — update [[project_deferred_work_campaign]]).

**Accepted tradeoffs (don't re-flag as bugs):** Retry = full `reload()` → re-seeds the form (discards
in-progress edits) + briefly shows the page spinner. Banner appears at load before edits; copy says
"Retry before deciding." Targeted refetch considered + declined (user-locked).

**Deploy-preview smoke to run (manual, not automated):** (1) force a `lessons_with_metadata` failure →
banner + Retry render + recover on retry; (2) `/review/A` (force a load-error) → `/review/B` → B renders
clean (R2-NEW-1 remount).

**Push history:** Round-1 bundle PUSHED `2530e46..fcc7ef4` (3 fixes + comment-drift `4589771` + Session-1/2
status docs). Round-2 bundle (`b1bebec`..tip + this status update) held pending the GATE-3 reviewer.

## Pointers
- Design: `2026-06-28-reviewdetail-followup-design.md` (Option A + GATE-1B amendment box)
- Plan: `2026-06-28-reviewdetail-followup-implementation.md` (7 tasks, TDD)
- Memory: `project_deferred_work_campaign` (Wave-5 block — this is the prioritized W5 follow-up),
  `feedback_pr_comment_surfaces`, `feedback_bot_review_investigation`, `feedback_codex_*`,
  `feedback_no_docs_push_during_pr`.

## Session log

### Session 1 — 2026-06-28/29 — design → build → GATE 3 → PR #556 opened
- Oriented (Wave 5 found COMPLETE; kickoff footer stale). User chose the lessonsError follow-up PR.
- Brainstormed: scope = one PR; UX = Option A (banner + Retry); Retry = full reload(). Wrote design
  (`906f2e0`) + impl plan (`75da10b`). Cut `fix/reviewdetail-followup` off main, carried 2 wave-5 docs
  forward.
- GATE 1B (Codex+Claude): no blockers; folded the cover-both-modes scope completion (user-confirmed) +
  hardening (`ccc997a`).
- Built 7 tasks via fresh-context executors, supervisor-verified + checkpointed each: Task 1 `cbdad68`,
  Task 2 `6a42bce`, Task 3 `335f0da`, cluster `4fe2710`/`3dad003`/`e38540a`/`bb3520f`.
- GATE 3 (Codex+Claude on diff): Codex caught the stale-submission-on-reload should-fix → fixed
  `2530e46` (RED→GREEN test 17). Full suite 2038/2038, check clean.
- Pushed; opened PR #556. **Process win:** the cross-family GATE 3 caught a real data-integrity-adjacent
  bug (stale deleted-submission render) that single-family review + supervisor-verify missed.

### Session 2 — 2026-06-29 — PR #556 bot round-1 triage + 3 fix-ups + GATE-3/4
- Session-start: kickoff "RIGHT NOW" footer STALE (says "start PR-1b" — Wave 5 long since complete +
  merged). Reconciled via git + the Wave-5 status doc + THIS follow-up status doc; confirmed we're on
  PR #556 (built, opened, all CI incl. 3 advisory bots `pass`). `npm run check` clean. User confirmed
  orientation.
- Four-surface triage of #556: only `claude[bot]` posted (CHANGES_REQUESTED, 1 review + 5 line/summary
  findings; reviews/line surfaces otherwise empty; all 3 advisory checks `pass`). Rebuttal-pass on all 5.
- **User verdicts:** accept #3 (singular grade); #2 → Option A (IntAlert). Recorded dispositions:
  #1/#2/#3/#5 accept, #4 reject.
- One fresh-context Opus executor built #1/#2(+#5)/#3 (3 labeled commits `9cf2f8f`/`2c5cab9`/`cfe4731`)
  with TDD. Supervisor-verified: inspected each diff, re-ran targeted tests 30/30 + full suite 2039/2039
  + `npm run check` exit 0. **Caught the bot's own fix being wrong** — its literal "move boundary inside
  unkeyed" doesn't reset `hasError`; the executor keyed the boundary itself (correct).
- **GATE-3/4 (Codex gpt-5.5 inline + feature-dev code-reviewer):** both GO, all 3 fixes CORRECT.
  Claude flagged comment-drift (key owner) → fixed `4589771` (behavior-neutral). Codex's async-path note
  = out of scope, no action.
- **Process learnings (promote at close):** (1) GATE-4 earned its keep again — the bot's *suggested fix*
  for its own #1 finding was subtly wrong (unkeyed boundary never resets); supervisor caught it pre-dispatch
  and the executor implemented the correct keying. Bot findings are signals, not patches. (2) Folding a
  user-visible copy fix (#3 "Grade N") into a refactor-cleanup PR was fine because it was tiny, correct,
  and the tests changed regardless — but it WAS surfaced to the user as a scope call first.
- Pushed round-1 bundle `2530e46..fcc7ef4`.

### Session 2 (cont.) — 2026-06-29 — PR #556 bot round-2 triage + 5 fix-ups (ROUND-CAP)
- Polled the 3 advisory bots to completion on the round-1 push (all `pass`); re-collected all 4 surfaces
  by timestamp. `claude[bot]` posted **COMMENTED** (non-blocking) across 2 surfaces — 6 findings.
- **The two surfaces CONTRADICTED each other:** R2-3 (remove Mode-2's `!lessons` defensive gate as dead
  code) vs S1-1 (add a symmetric `!similarities` gate to Mode 1). Resolved toward documented-defensive
  symmetry (keep Mode 2 + add Mode 1), confirmed by GATE-4 Codex.
- Explained R2-1 + S1-2 to the user in plain language (per `feedback_plain_language`); user verdicts:
  **do both.** Dispositions: accept R2-1/R2-2/S1-1/S1-2/S1-3; reject R2-3 (keep gate) + S1-4 (unreachable).
- **GATE-4 Codex (gpt-5.5, inline)** pre-implementation on R2-1 + the contradiction: both AGREE-WITH-NUANCE
  (R2-1 catch can't mask a real not-found + improves the mid-load-throw case; keep Mode-1 `logger.warn`
  unconditional; defensive symmetry > removal).
- One fresh-context Opus executor built all 5 as labeled commits `b1bebec`/`65587aa`/`acc80a4`/`986635c`/`cd4a022`
  (TDD: new reject test 17 via a backward-compatible mock `reject?` field, RED→GREEN; test-15 copy pin).
  Supervisor-verified: all 5 diffs + mock + tests inspected, full suite **2040/2040**, `npm run check` exit 0.
  Executor's grep found a 3rd coupled `5` (`renderedTopFive`) → folded into MAX_DUPLICATE_CARDS.
- Final pre-push GATE-3 Claude reviewer on `b1bebec^..HEAD` dispatched.
- **Process learnings (promote at close):** (1) when two bot findings CONTRADICT, don't pick one
  mechanically — resolve toward the design's *documented* intent (here: defensive symmetry) and let GATE-4
  arbitrate the direction. (2) A small, backward-compatible test-mock extension (optional `reject?` field)
  was worth it to get a REAL discriminating test for the reject path rather than falling back to
  manual-smoke-only. (3) `[simplification]` findings that propose REMOVING deliberate defensive code are a
  default-reject under data-safety priorities — keeping documented belt-and-suspenders can't introduce a bug.
- GATE-3 reviewer = GO (verified catch reachability, loadError precedence, mock backward-compat, test-17
  discrimination, all 3 coupled MAX_DUPLICATE_CARDS sites). Pushed round-2 bundle `fcc7ef4..8b8e7d2`.

### Session 2 (cont.) — 2026-06-29 — PR #556 bot round-3 (round-cap) + merge-ready
- Polled CI/bots to completion on the round-2 push: ALL green (Test&Build, E2E, Coverage, CodeQL, Security
  Audit + 4 advisory bots `pass`); PR MERGEABLE/CLEAN. `claude[bot]` posted round 3 COMMENTED (non-blocking),
  3 findings. Applied the **round-cap** (3rd round = critical-only): none were critical.
- Triaged: #1 (`!submissionData` no setLoadError) REJECTED — unreachable + the bot's `.maybeSingle()`-future
  premise is wrong (null-no-error = genuine not-found → no-Retry is correct). #2 (legacyDecisionWarning
  aria-live) + #3 (parseDbError on submission-error log) = trivial correct one-liners → user chose to fold
  both in (option B). Fixed `0a6ca45` + `4b3b232`; page test 22/22, check exit 0; pushed.
- **Process learning (promote at close):** the round-cap is "critical-bugs-only," not "ignore round 3" —
  still rebuttal-pass each finding (caught that #1's suggested fix was actively wrong for a genuine
  not-found), then fold only the trivial-correct ones and reject the rest. A11y `aria-live` on
  conditionally-mounted `role=alert` banners recurred across 3 banners — candidate for a lint rule.
- NEXT: **awaiting user merge go-ahead** (+ optional manual deploy-preview smokes). On merge: PR-cycle
  archival + memory hygiene ([[project_deferred_work_campaign]] Wave-5 follow-up).
