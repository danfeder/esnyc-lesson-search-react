# Wave 5 — Reviewer/Admin Features — Execution Status

**Last updated:** 2026-06-27 by Session 3 (PR-1a START — branch cut from main; carry-forward docs + PR-0-cycle archival committed; dispatching Task 1a.1 next)

## Current State

**Phase:** **PR-1a — ReviewDetail decomposition, easy seams (IN PROGRESS).** PR-0 (safety net) is SHIPPED + MERGED to main (squash `3258365`, [#552](https://github.com/danfeder/esnyc-lesson-search-react/pull/552), 2026-06-27) — the decomposition gate is satisfied. Design **LOCKED** (Session 1, `61ae519`); impl plan PR 0–2 authored + GATE 1B folded. Branch **`refactor/wave5-reviewdetail-easy-seams`** cut from main; first commit = carry-forward docs (status + kickoff) + PR-0-cycle session-log archival (Sessions 0–2 → `…-execution-status-archive.md`). **Baseline verified clean** at branch cut: `npm run check` green; `ReviewDetail.tsx` = 1,483 lines (matches design anchors); all 6 PR-0 `export` helpers present (`reAddActivityTypeSuffix`/`parseExtractedContent`/`normalizeMatchType`/`selectOptionsFromConfig`/`flattenHeritageOptions`/`ZOD_FIELD_TO_LABEL`, L96–200); PR-0 test files (`supabaseReviewMock.ts`, `reviewFixtures.ts`, `review-detail-page.test.tsx`, `reviewDetailHelpers.test.ts`) all present.

**PR-1a task plan (impl §"PR 1a", execute IN ORDER; supervisor-verify + checkpoint after EACH):**
1. ✅ **1a.1 DONE** (`240663a`) — relocated the 6 pure helpers → `src/pages/reviewDetailHelpers.ts` (self-contained imports, no circular dep); repointed `reviewDetailHelpers.test.ts`; only the test imported the symbols (no other importer). `ReviewDashboard.tsx`'s private same-named `parseExtractedContent` left untouched (bot F1). Gate test 39/39 green, `npm run check` clean. Supervisor-verified (pure relocation: 113 del / 115 ins).
2. ✅ **1a.2 DONE** (`cf1e469`) — extracted `buildCandidateCards()` → sibling `src/pages/buildCandidateCards.ts` (`SimilarityWithLesson`/`SubmitterTargetLesson` co-located; `normalizeMatchType`+`IntDuplicateMatchType` moved with it; no circular import). TDD test-first confirmed (saw RED first); 7-case suite (4 named branches + 3 edges). Original useMemo dep array `[submission, topDuplicates, selectedSearchLesson]` + 4-branch logic preserved byte-for-byte. Gate 23/23 green, `npm run check` clean. Supervisor-verified against the removed diff.
3. ✅ **1a.3 DONE** (`36fcd1c`) — extracted `<ReviewDocPanel>` → `src/components/Review/ReviewDocPanel.tsx` (+ barrel); owns `viewMode`/localStorage internally (key `reviewViewMode`, default `'embed'` unchanged); `<div>` root preserves the `adm-split--3col` 3-direct-child grid; removed now-unused page imports (`FEATURES`/`sanitizeContent`/`GoogleDocEmbed`/`IntDocFrame`). Gate 16/16 green, check clean. Supervisor-verified.
4. ✅ **1a.4 DONE** (`7e5550a`) — extracted `<SubmitterIntentBanner>` (4-state, branch order preserved: blue→amber-degraded→amber-null→green; degraded-update `targetId && !targetTitle` precedes the green fallthrough → invariant held) + `<TitleMismatchWarning>` (gates on `titlesAreSimilar`) → `src/components/Review/` (+ barrel). NOTE: real code uses identical `amber-50/amber-300` classes for both degraded + null-target (distinguished by text/icon), not a literal "yellow" — design's color label was imprecise; classNames kept byte-identical. Gate 16/16 green, check clean. Supervisor-verified.
5. ✅ **1a.5 DONE** (`8ddd36f`) — extracted `reviewValidation.ts` (`validateRequiredFields`→`computeRequiredFieldErrors`, `computeFieldProgress`, `showCookingFields`/`showGardenFields` as exported pure helpers) + 21-case TDD suite (cooking/garden/both/neither conditional-required branches + progress counts). Page keeps thin `useMemo`/`useCallback` wrappers (local names unchanged via aliased imports → no JSX/call-site churn). ⚠️ **One deliberate, behavior-NEUTRAL deviation (GATE-3 watch):** the 4 wrappers' dep arrays narrowed-input → `[metadata]` (forced by `exhaustive-deps` once the wrappers close over whole `metadata`). New deps are a SUPERSET of the old effective triggers (`[metadata.activityType]` / `[metadata,showCooking,showGarden]`), so memo values are never staler — only fresher — with identical output; boolean consumers compare by value. Gate 37/37 green, check clean. Supervisor-verified (read the wrappers + reasoned the superset property).

**Invariant for EVERY task:** **no behavior change**; run `npm run test:run -- review-detail-page` after each extraction — it MUST stay green. Re-verify all line anchors against current code before extracting (2026-06-26 anchors may drift). **R2-1 latent data-integrity bug rides into PR-1b, NOT PR-1a** (see Out-of-scope follow-ups).

**Active PR:** **#553 OPEN** (`refactor(wave5): PR-1a — ReviewDetail decomposition (easy seams)`, base main, opened 2026-06-28). **Round 1 DONE:** all CI green; `claude[bot]` posted (no `claude-database-review` — no DB). Four-surface triage + rebuttal-pass: **ACCEPTED** the comment-cleanup (6 provenance/caller-enum strips + 1 misleading-comment fix; comment-only, gate stayed 16/16); **REJECTED** the optional `if(!submissionType) return null` guard (behavior change); **DEFERRED** F1 (logger.error→warn, GATE-4 Codex AGREE-DEFER, user-confirmed defer → tracked follow-up), F3 (components→pages types, →PR-1b), F5 (alias-rebind naming, →PR-1b), F6 (grades/meta helper, bot agrees defer). Fix-up = comment cleanup + this status bundle → push round 2. **Round 2 DONE:** all CI green; `claude[bot]` = "shippable as-is" (all non-blocking). Triage: **ACCEPTED** R2-A (corrected my own F1 doc-note — verified `GoogleDocEmbed`: fallback is a MANUAL "Show Text View" button, NOT auto-recovery) + **R2-B/R2-C** (closed 2 branch-coverage holes in the new test files: off-list null-grades synthetic card; BOTH cooking-satisfied/garden-empty → +2 tests, additive, on-mission for the safety net); **DEFERRED** R2-D (`const type` alias) + R2-E/F6 (`formatGrades` DRY) → PR-1b cosmetic bucket. **User chose "add 2 tests, then merge."** Round 3 = the 2 tests + F1-note correction + status (deliberate final round to close net holes, NOT bot-chasing). **Round-cap: this is the cap — merge once round 3 green unless a true critical bug appears.** Full suite **2031 green** (90 files), `npm run check` clean. **GATE 3 (pre-push) — BOTH families CLEAN, no behavior drift:** Claude code-reviewer = CLEAN ("ship it"); **Codex (`gpt-5.5`, cross-family) = CLEAN** (re-ran after the user reset the usage limit — full independent signal obtained, NOT a fallback). Both independently confirmed byte-parity on all 5 extractions, the banner degraded-update invariant (`??` + branch-2-before-green), `buildCandidateCards`' 4 branches + `!base.some()` dedup + ordering, the `submission?.`→`submission.` safety, the `[metadata]` dep-array superset reasoning, no circular imports, prop completeness. One **deferred cosmetic nit** (the 2 `Review/` components type-import from `@/pages/buildCandidateCards` — components→pages dir; type-only, no circular/runtime risk; settle the type home in PR-1b). **Branch pushed** (`origin/refactor/wave5-reviewdetail-easy-seams`). **Next: `gh pr create`** (awaiting user go-ahead, per PR-0 pattern). PR-0 (#552) is MERGED.

**🔭 RE-SCOPED 2026-06-26 (Session 1, user-confirmed): Wave 5 = PR 0–2 ONLY** (ReviewDetail test net →
decompose → C107 speedup; frontend-only, no DB, no product decisions). The personalization cluster
(PR 3–5: Bookmarks/Saved-Searches/Collections) + the admin tail (PR 6+: C28/C22/C74/C78) are **DEFERRED
to a future wave** — only ~3 internal reviewers/admins have accounts (general-user login is a later
rollout → personalization audience ≈0) and reviewers never collide on submissions (→ C22/C78 solve a
non-problem). See memory `project_user_base_accounts`. Re-scope banners folded into the design + impl
docs; §§6/7 + the Q3/Q4/Q5/Q9/Q6/Q7 material retained as future-wave reference.

**Locked-answer headlines (durable):** PR-0 = page-level RTL test (build a NEW table-dispatch
`makeReviewSupabaseMock`; render ReviewDetail directly, no ProtectedRoute/auth-mock/QueryClientProvider;
5 behaviors incl. a legacy scalar-`activityType`/`reject` fixture) + `export`-in-place pure-helper unit
suites (`buildCandidateCards` extraction deferred to PR-1). C107 = `Promise.all` 3-wave shape
(A:[#1,#2,#5] re-apply #1 guards → B:[#3,#6] → C:cond #4); query errors degrade, never hit
ReviewErrorBoundary. C112 stores `SearchFilters` directly as jsonb. Bookmark surface = 3 leaves
(IntCard/IntListRow/IntLessonDetail), `stopPropagation` on the role=button wrappers, gate on `!!user`,
anon = hide/disable (no AuthModal-lift this wave). My-Bookmarks = `/bookmarks` ProtectedRoute (no perms).

**Branch:** `refactor/wave5-reviewdetail-easy-seams` (PR-1a; cut from `main` @ `3258365`, 2026-06-27).
Commits so far: `9cdbd82` (carry-forward + archival) · `240663a` (1a.1) ✅ · `cf1e469` (1a.2 `buildCandidateCards`+TDD) ✅ · `36fcd1c` (1a.3 `<ReviewDocPanel>`) ✅ · `7e5550a` (1a.4 banners) ✅ · **`8ddd36f` (1a.5 — `reviewValidation.ts` + 21-case TDD suite) ✅ verified.** **ALL 5 PR-1a extractions DONE.** ReviewDetail 1483→**1120 lines** (−363/−24.5%). Next: full-suite run → GATE 3 (reviewer + Codex) → bundle status-doc commit → push + `gh pr create`.
**Last commit on main:** `3258365` (PR-0 safety net, #552 MERGED).

**Design status:** **LOCKED** (Session 1, `61ae519`). GATE 1A + 1B complete (folded).

**Pre-next-PR verification (before push/PR for PR-1a):** GATE 3 (pre-push reviewer-agent + Codex on `git diff main...HEAD`). No DB → no TEST-DB verify. The load-bearing automated gate is `npm run test:run -- review-detail-page` staying green after every extraction + `npm run check` clean.

**Open `[user-verdict]` questions:** **all resolved or deferred.** Q1 LOCKED (split PR-1 into 1a/1b). Q2/Q3/Q4/Q8 evidence-locked. Q5/Q6/Q7/Q9 deferred with the personalization + admin tracks (future wave). Nothing pending for PR 0–2.

## Recent decisions worth carrying forward

- **Backend reality confirmed (GATE 1A + independent check):** `bookmarks` / `saved_searches` /
  `lesson_collections` exist in the APPLIED baseline (`20251001_…` L1534/1710/1967), RLS-enabled,
  PROD-verified, zero frontend wiring. **Read shapes from the baseline / `database.types.ts`, NEVER
  from `10_future_user_features.sql.skip` (skipped + stale shapes).**
- **No `LessonCard` component exists** — results render via `IntCardGrid`/`IntListRow`/`IntLessonDrawer`/
  `IntSplitDetail`; the bookmark action is a multi-view, **auth-gated** surface (bookmarks RLS is
  authenticated-only; public search serves anonymous users). Exact insertion points = Session-1 discovery.
- **`lesson_collections.is_public` is `TO authenticated`-only** — authenticated cross-user sharing works
  with no migration; an anonymous public route needs a new policy/migration + security review.
- **Collections array mutation has a hidden migration dependency** (atomic RPC needs a migration vs
  race-prone client read-modify-write) → captured as Q9.
- **Auth hook = `useEnhancedAuth`; filter type = `SearchFilters`; C114 serializer** (`urlParams.ts` +
  `useUrlSync`) already shipped → C112 likely stores the `SearchFilters` object directly as jsonb.
- `ReviewDetail.tsx` = **1,483 lines** (roadmap's 1361/1475 were stale); `loadSubmission` (L308–492) is
  fully serial (the C107 target); **zero page-level tests today** (the gate is currently unmet).

## Done

- ✅ **Scaffold (Session 0)** — four docs created on `chore/wave5-scaffold`: design (Draft, Q1–Q9),
  implementation (SKELETON), kickoff, this status doc. Orientation via a 4-agent parallel read +
  independent baseline-snapshot cross-check.
- ✅ **GATE 1A (design doc)** — Codex (`gpt-5.5`, inline) + a Claude reviewer in parallel; both verdicts
  GO-WITH-CHANGES (no BLOCKER/rework; core anchors verified accurate to the line). 19 accuracy findings
  folded (fictional LessonCard, `is_public` authenticated-only, +Q9 array-mutation, "no schema migration"
  wording, C22 split-deploy, `useEnhancedAuth`/`SearchFilters`/named-export/C114 precision fixes, etc.).

## In flight

(none — scaffold session ends before design-lock)

## Blocked

(none — Session 1 is gated on a user checkpoint for the `[user-verdict]` questions, which is expected, not a blocker)

## Decisions made during execution

- Cut the scaffold branch from `origin/main` (not the in-flight `chore/migration-check-constraint-pattern`
  tip) for a clean base. Pre-existing untracked `docs/plans/*.md` files in the worktree are unrelated and
  were NOT staged.
- GATE 1A run THIS session (per user instruction) rather than deferred to Session 1 — the Draft design had
  real reviewable content (reality findings + locked strategy + tagged questions).

## Out-of-scope follow-ups captured here

- **⚠️ R2-1 — latent reviewer-flow DATA-INTEGRITY bug (fix in PR-1b; round-2 bot, HIGH).** `ReviewDetail.loadSubmission` destructures three fetches WITHOUT capturing `error` — `submission_reviews` (L390), `submission_similarities` (L323), `user_profiles` (L397). supabase-js resolves a DB error as `{data:null,error}` (no throw), so on a transient error `reviews=null` → the restore block (L430) is SKIPPED → the preselect block (L472) runs → the reviewer sees a blank/preselected form with NO prior work loaded, unaware the restore failed. Blast radius: `complete_review_atomic` (migration `20260428000003`) uses `ON CONFLICT … DO UPDATE`, so saving the "fresh" form **silently overwrites the prior review row** — a transient DB blip can turn an `approve_update`→Lesson A into a clean `approve_new`. **PR-0 only PINS this (test 12); the FIX is OUT of PR-0's pure-additive scope.** Right home = **PR-1b**, when `loadSubmission` moves into `useReviewSubmission` (capture each `error`, at minimum `logger.warn`, and ideally surface a load-error state so the reviewer doesn't blind-overwrite). When fixed, **test 12 must be updated** (it currently pins the silent-preselect behavior). Ties to `feedback_data_safety_top_priority`.
- **PR-2 mock seam (GATE-4 7th issue):** `makeReviewSupabaseMock` cannot serve `lessons_with_metadata` as BOTH a `.in()` array AND a `.eq().single()` object in the SAME render (it keys only on table name; the dual-shape unwrap picks one). Today fine (no fixture fires both paths at once — `degradedUpdateFixture` keeps similarities empty). But PR-2's parallel reorder could plausibly trigger both `lessons_with_metadata` paths in one render → if a PR-2 fixture needs that, key the mock handler on `{table, terminal}` (the mock header already flags this). Validate during PR-2's manual smoke; not a PR-0 defect.
- **Type-layering nit (PR-1a GATE-3, cosmetic, settle in PR-1b):** the two extracted `Review/` components (`SubmitterIntentBanner.tsx`, `TitleMismatchWarning.tsx`) type-import `SimilarityWithLesson`/`SubmitterTargetLesson`/`CandidateCard` from `@/pages/buildCandidateCards` — a components→pages import direction. Type-only (zero runtime coupling, no circular risk; lint-clean). PR-1b builds the `Review/` cluster core (`<ReviewMetadataForm>`/`<ReviewDecisionPanel>`) and is the natural place to decide the shared-type home (move to `src/types/` or a `Review/`-local types file). Not a PR-1a defect.
- **NOTE — R2-1 line anchors above (L390/L323/L397/L430/L472) are PRE-PR-1a** (file was 1,483 lines; now 1,120). PR-1b's `useReviewSubmission` executor must re-locate `loadSubmission` by symbol, not those numbers.
- **⚠️ F1 (PR-1a round-1+2 bot, Medium) — `ReviewDocPanel` Google-Doc-embed `onError` uses `logger.error` (→ Sentry, ERROR severity) on embed failure.** **CORRECTED understanding (round-2 bot, verified against `GoogleDocEmbed.tsx`):** recovery is NOT automatic — `handleError` (L51–58) sets error state + calls `onError`; the embed then renders an **"Unable to Load Document" error screen with a MANUAL "Show Text View" button** (L124–149, the button only appears if `fallbackToText` is passed). So the reviewer sees an error UI and must click to get the text — it does NOT silently fall back. Sentry gets an ERROR-severity `captureMessage` (no stack trace) on every CSP-block / iframe-auth failure. **Should be `logger.warn`** (embed failure is a recoverable degraded state, not an exception). PRE-EXISTING (carried verbatim from the original `ReviewDetail.tsx`); DEFERRED out of PR-1a to keep it byte-identical (GATE-4 Codex = AGREE-DEFER; user-confirmed). **Explicit follow-up (do NOT rely on proximity — Codex caveat):** one-line change at `src/components/Review/ReviewDocPanel.tsx` `onError` handler — a tiny dedicated cleanup commit (PR-1b does NOT touch this file, so do not assume proximity).
- **PR-1b cosmetic-cleanup bucket (PR-1a round-1+2 bot, Low, all behavior-neutral, all DEFERRED to PR-1b):**
  - **F5 — alias-then-rebind naming in `ReviewDetail.tsx`:** `validateRequiredFields as computeRequiredFieldErrors` import + a local `const validateRequiredFields = useCallback(...)` wrapper reusing the original name. Cleaner scheme = import as `validateRequiredFields`, name the memoized wrapper distinctly (e.g. `getValidationErrors`); same for the `computeFieldProgress`/`fieldProgress` pair.
  - **R2-D — redundant `const type = submissionType` alias** in `SubmitterIntentBanner.tsx` (leftover from the original nullable-`submission` IIFE; the prop is already the typed value). Drop the alias, use `submissionType` directly at the 3 `type ===` sites.
  - **R2-E / F6 — `formatGrades` DRY** in `buildCandidateCards.ts`: the `arr?.length ? 'Grades '+join : 'Grades —'` ternary repeats verbatim 3× (dup-map, off-list, reviewer-search sites). Extract a one-line `formatGrades(arr)` helper. Behavior-identical (now unit-pinned by the round-2 null-grades test).
  - All three are carried-forward/extraction-artifact style; kept byte-identical in PR-1a to preserve the pure-refactor contract. None block.
- F4/F5 process tooling was roadmap-sequenced "after W1, before W5"; proceeding with Wave 5 now per user
  direction. F4/F5 remain queued (`reference_working_efficiency_deferred`).
- C27 (search-query logging) blocks C28's "Library searches" KPI → C28 ships without it.
- Anonymous public collections route + broader C157 shareable-URL encoding → deferred (Q5 / Wave 6).

## Pointers to durable context

- Kickoff prompt: `2026-06-26-wave5-reviewer-admin-kickoff.md`
- Design doc: `2026-06-26-wave5-reviewer-admin-design.md` (locked strategy + Q1–Q9)
- Implementation plan: `2026-06-26-wave5-reviewer-admin-implementation.md` (PR 0–2 tasks authored; PR 3–6+ deferred-reference)
- **PR-cycle archive:** `2026-06-26-wave5-reviewer-admin-execution-status-archive.md` (Sessions 0–2 forensic trail; grep, don't read end-to-end)
- Campaign master status: `2026-06-21-deferred-campaign-status.md` (Wave 5 row)
- Roadmap: `2026-06-20-deferred-work-roadmap.md` (§Wave 5, scope source of truth)
- Memory: `project_deferred_work_campaign`, `project_teacher_zero_metadata_model`, `reference_ci_flakes`

## Session log

> Sessions 0–2 (scaffold → design-lock → PR-0 safety net built + merged, #552 `3258365`) moved to
> `2026-06-26-wave5-reviewer-admin-execution-status-archive.md` at PR-1a-cycle start (2026-06-27).
> Grep the archive for forensic detail; the durable carry-forward lives in the sections above.

### Session 3 — 2026-06-27 — PR-1a start (branch cut + carry-forward + archival)

Major events:
- **Session-start ritual:** read kickoff + status + design doc end-to-end + impl plan PR-1a section; `npm run check` clean baseline; verified git matches (PR-0 `3258365` merged on main, worktree dirty only with the 2 carry-forward docs + unrelated untracked `docs/plans/*.md`). Confirmed PR-0's 6 `export` helpers + 4 test files present, `ReviewDetail.tsx` = 1,483 lines. User confirmed orientation.
- **Cut `refactor/wave5-reviewdetail-easy-seams` from main** (`3258365`). First commit bundles the carry-forward docs (status + kickoff, from PR-0's merge onto main) + the PR-0-cycle session-log archival (ritual step 5: Sessions 0–2 → new archive file). Untracked unrelated docs NOT staged.
- **Ritual-step-5 learnings audit (Sessions 0–2):** all process learnings already covered by existing feedback memories (GATE 3/round-cap/reject-discipline → `feedback_pr_bot_review_workflow` + `feedback_bot_review_investigation`; Codex-fallback → `feedback_make_failing_tools_work`). The "ask who uses this early on a feature wave" learning overlaps `project_user_base_accounts`; not promoting a new memory mid-initiative — revisit at initiative-close retrospective (ritual step 6).
- **NEXT:** dispatch PR-1a Task 1a.1 (relocate pure helpers) to a fresh-context executor; supervisor-verify + checkpoint after each of 1a.1–1a.5.

- **PR-1a build complete (all 5 extractions, each supervisor-verified):** 1a.1 `240663a` · 1a.2 `cf1e469` · 1a.3 `36fcd1c` · 1a.4 `7e5550a` · 1a.5 `8ddd36f`. `ReviewDetail.tsx` 1483→1120 lines (−363/−24.5%). Full suite 2031 green; +28 new unit tests (buildCandidateCards 7, reviewValidation 21). Zero behavior change.
- **GATE 3 (pre-push) — both families CLEAN:** Claude code-reviewer + **Codex `gpt-5.5`** (re-ran after the user reset the usage limit → genuine cross-family signal, not a fallback) both confirmed byte-parity across all 5 extractions + the dep-array superset reasoning + banner invariant + dedup/ordering + no circular imports + prop completeness. Zero behavior drift. No fix-ups.
- **Process note:** the one non-byte-identical change in the whole PR (1a.5's `[metadata]` dep arrays) was flagged by the executor, scrutinized by the supervisor (superset → never staler), and re-confirmed by the GATE-3 reviewer — exactly the kind of deviation the verify chain is for. Logged for any PR-bot re-raise.

- **PR #553 opened (2026-06-28); round 1 triaged.** CI all green (E2E/Lighthouse/CodeQL/semgrep/Security Audit/coverage/deploy-preview). `claude[bot]` = 7 findings across surfaces (1 issue-comment summary + 1 review + 6 line-comments); `claude-component-review`/`performance-review` checks passed with no blocking comments; no `claude-database-review` (no DB). Rebuttal-passed all: accepted comment-cleanup (non-semantic) + the misleading-`(new)`-comment fix; rejected the `return null` guard (behavior change); deferred F1 logger (GATE-4 Codex AGREE-DEFER, user-confirmed) / F3 / F5 / F6. **GATE 4 ran on F1** (the one non-trivial lean-reject) → Codex AGREE-DEFER with a "track explicitly, don't rely on proximity" caveat → logged F1+F5 as concrete Out-of-scope follow-ups. Fix-up commit = comment cleanup + docs bundle.
- **Process note:** the bot's "CLAUDE.md rule" citation for the provenance-comment finding was inaccurate (not literally in-repo CLAUDE.md), but the advice was sound and the noise was executor-introduced → accepted on merit, not on the (wrong) citation. Verified by grep before accepting.

- **Round 2 (fix-up `f708d44` re-review):** all CI green; `claude[bot]` = "shippable as-is." 5 findings, all non-blocking. R2-A corrected MY F1 note (verified `GoogleDocEmbed` myself: error → "Unable to Load Document" screen + MANUAL "Show Text View" button, not silent fallback) → fixed the note. R2-B/R2-C = real branch-coverage holes in the new test files → added 2 cases (additive). R2-D (`const type` alias) + R2-E/F6 (`formatGrades` DRY) → deferred to the PR-1b cosmetic bucket. **User chose "add 2 tests, then merge"** → round 3 = the deliberate final round (close net holes), then merge per the round-cap.
- **Process note:** investigating R2-A myself (reading `GoogleDocEmbed.tsx`) caught that MY OWN earlier characterization ("graceful auto-recovery, no visible error") was wrong — the bot was right. `feedback_bot_review_investigation` cuts both ways: it surfaced an inaccuracy in my own tracked follow-up, not just in the bot's claims.

<!-- append PR-1a round outcomes below as they land -->
