# ReviewDetail Follow-up PR — Execution Status

**Last updated:** 2026-06-29 (Session 2 — bot round-1 triage + 3 accepted fix-ups built + supervisor-verified; GATE-3/4 dual-family review in flight; held pre-push).

## Current State

**Phase:** **PR #556 OPEN — bot round-1 triaged, 3 fix-ups built (held, not yet pushed).** https://github.com/danfeder/esnyc-lesson-search-react/pull/556
All 7 planned tasks + 1 GATE-3 fix-up + the round-1 fix-ups built, supervisor-verified, on branch
`fix/reviewdetail-followup` (cut from `main` @ `1cd2693`). **Full suite 2039/2039; `npm run check` exit 0.**
Frontend-only — **no DB / no migration → no TEST-DB step.** Design + plan are LOCKED and committed
(`906f2e0` design, `75da10b` plan, `ccc997a` GATE-1B amendments).

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

**NEXT (this session):** push the held bundle → **bot round 2** (re-collect all 4 surfaces by
timestamp `>` the push) → rebuttal-pass any new finding (GATE-4 Codex on real changes) → round-cap at 2
→ request user merge go-ahead. Four-surface round-1 triage already done (issue-comments / reviews /
line-comments / checks — only `claude[bot]` posted; the 3 advisory bots in `gh pr checks` are all
`pass`). The two manual deploy-preview smokes below are cheap insurance before merge.

**Accepted tradeoffs (don't re-flag as bugs):** Retry = full `reload()` → re-seeds the form (discards
in-progress edits) + briefly shows the page spinner. Banner appears at load before edits; copy says
"Retry before deciding." Targeted refetch considered + declined (user-locked).

**Deploy-preview smoke to run (manual, not automated):** (1) force a `lessons_with_metadata` failure →
banner + Retry render + recover on retry; (2) `/review/A` (force a load-error) → `/review/B` → B renders
clean (R2-NEW-1 remount).

**Held local commits being pushed NOW (Session 2 bundle):** `9cf2f8f` (#1 boundary key + test) ·
`2c5cab9` (#2 IntAlert + #5 mt-3) · `cfe4731` (#3 singular grade) · `4589771` (GATE-3 comment-drift
fix) · `0f86275` (Session-1 held status doc) · the Session-2 status-doc commit. (The 2
`docs/plans/2026-06-26-wave5-…` commits `62f8e78`/`58c461e` are carried-forward Wave-5-closure docs,
already pushed in the PR.)

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
- NEXT: push the held bundle → bot round 2 → round-cap at 2 → user merge go-ahead.
