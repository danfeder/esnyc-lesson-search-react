# Wave 5 — Reviewer/Admin Features — Execution Status

**Last updated:** 2026-06-28 by Session 4 (**PR-1b STARTED** — branch `refactor/wave5-reviewdetail-core-seams` cut from main @ `e4c248d`; carry-forward docs + Session-3 archival committed as the branch's first commit; next = dispatch Task 1b.1 + the R2-1 fix)

## Current State

**Phase:** **PR-1b IN PROGRESS** (branch `refactor/wave5-reviewdetail-core-seams` cut from `e4c248d`, 2026-06-28; first commit = carry-forward docs + Session-3 archival; **Task 1b.1 next**). PR-1a SHIPPED + MERGED to main (squash `e4c248d`, [#553](https://github.com/danfeder/esnyc-lesson-search-react/pull/553), 2026-06-28). PR-0 safety net = `3258365` (#552). Design **LOCKED** (Session 1, `61ae519`); impl plan PR 0–2 authored + GATE 1B folded. **PR-1a result:** all 5 easy-seam extractions shipped, **zero behavior change**; `ReviewDetail.tsx` **1,483 → 1,120 lines** (−363/−24.5%); +30 unit tests (buildCandidateCards 9 incl. round-2 add, reviewValidation 22 incl. round-2 add); full suite green; GATE-3 byte-parity confirmed by Claude **and** Codex (both families); 3 bot rounds, all findings triaged (accepted comment-cleanup + 2 coverage-hole tests; deferred all cosmetic/structural nits to PR-1b; rejected the one behavior-change suggestion). Merged per user "add 2 tests, then merge" + round-cap.

**▶ PR-1b — what's next (impl §"PR 1b", `refactor/wave5-reviewdetail-core-seams` from main):** the high-regression cohesive seams. Tasks: **1b.1** `useReviewSubmission(id)` data hook (returns a computed initial-form-state object, NOT 13 setters; preserve restore-vs-preselect mutual-exclusion) — **AND fix R2-1 here** (capture each fetch `error`; surface a load-error state; **update page test 12** which currently PINS the silent-preselect bug); **1b.2** `useSearchEscapeHatch` + `<ReviewSearchPanel>` (preserve the 2 effects' declaration order + dep arrays verbatim — risk 4); **1b.3** `<ReviewMetadataForm>` (LEFT column — do NOT over-DRY the 5 closed-enum selects, risk 7); **1b.4** `<ReviewDecisionPanel>` (RIGHT column). PR-0 page gate stays green throughout. **Then PR-2** (C107 parallel load) lands on the extracted hook. Re-locate all anchors by SYMBOL (file is now 1,120 lines; impl-plan line numbers are pre-PR-1a). Fold the deferred PR-1b cleanup bucket (below) in opportunistically where those files are touched.

**PR-1a extractions (all shipped in `e4c248d`; per-task detail in the Session-3 log below):** 1a.1 relocate 6 pure helpers → `reviewDetailHelpers.ts` · 1a.2 `buildCandidateCards()` (+TDD) · 1a.3 `<ReviewDocPanel>` · 1a.4 `<SubmitterIntentBanner>`+`<TitleMismatchWarning>` · 1a.5 `reviewValidation.ts` (+TDD). Each supervisor-verified byte-identical; PR-0 page gate (`review-detail-page`) green after every extraction. The one non-byte-identical change (1a.5's `[metadata]` dep arrays) = a behavior-neutral SUPERSET, confirmed by both GATE-3 families + both round-3 bot reviews.

**Active PR:** **none — #553 MERGED** (`e4c248d`, 2026-06-28). 3 bot rounds, all `claude[bot]` (no `claude-database-review` — no DB), all CI green every round. **Round 3 (final, round-cap):** bot = "No correctness bugs found." Only low/cosmetic/structural + re-raises. **GATE-4 Codex on the one "needs-fix-before-merge" flag** (`ReviewDocPanel:31` unvalidated localStorage cast) → **AGREE-DEFER-AND-MERGE** (verified pre-existing byte-identical, component is sole writer, no reachable invalid-value path; even found an unused `ReviewContent.tsx` referencing the key — typed writer, harmless). All round-3 new nits folded into the PR-1b cleanup bucket below. Merged per user authorization + round-cap.

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

**Branch:** `refactor/wave5-reviewdetail-core-seams` (PR-1b; cut from `main` @ `e4c248d`, 2026-06-28).
Commits so far: _(first commit = carry-forward docs + Session-3 archival, this session)_. Then: 1b.1 `useReviewSubmission`+R2-1 fix → 1b.2 `useSearchEscapeHatch`+`<ReviewSearchPanel>` → 1b.3 `<ReviewMetadataForm>` → 1b.4 `<ReviewDecisionPanel>`. PR-0 page gate (`review-detail-page`) must stay green after each.
**Last commit on main:** `e4c248d` (PR-1a, #553 MERGED). `ReviewDetail.tsx` = **1,120 lines**; all 6 PR-1a modules present.

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
  - **Round-3 additions (all low/cosmetic, behavior-neutral, deferred):**
    - **R3 localStorage validation** — `ReviewDocPanel.tsx:31` `viewMode` init casts `localStorage.getItem('reviewViewMode') as 'embed'|'text'` + `|| 'embed'` (only catches falsy). A truthy non-matching string would pass through → wrong layout. Pre-existing/byte-identical; GATE-4 Codex AGREE-DEFER (component is sole writer, no reachable invalid-value path today). Fix = validated read (`stored === 'embed' || stored === 'text' ? stored : 'embed'`).
    - **R3 `submissionType` prop too wide** — `SubmitterIntentBanner.tsx:6` types it `'new'|'update'|undefined`, but the call site can never pass `undefined` (`SubmissionDetail.submission_type` is `'new'|'update'`, and the `!submission` early-return precedes render). Narrow to `'new'|'update'` so the green-fallthrough means exactly `'new'`, not "anything non-update". (When narrowed, drop the JSDoc's "or unknown type" wording.)
    - **R3 redundant `as` casts** — `buildCandidateCards.ts:88,117–118,141–142` cast already-inferred literals (`null as IntDuplicateMatchType | null`, `"…" as string | undefined`, `undefined as string | undefined`). Drop them — TS infers from the `CandidateCard` return context.
    - **R3 pages→components type imports (mirror of F3)** — `buildCandidateCards.ts` imports `IntDuplicateMatchType` (`@/components/Internal`) + `LessonSearchResult` (`@/components/LessonSearchPicker`); this is the OTHER direction of the F3 violation. **Both collapse if the 5 domain shapes (`SimilarityWithLesson`, `SubmitterTargetLesson`, `CandidateCard`, `IntDuplicateMatchType`, `LessonSearchResult`) move to `@/types`** (e.g. `src/types/review.ts`) — also removes the defensive `SubmissionForCards` structural alias. This is the canonical fix for F3 + this item together.
    - **R3 narrow memo deps (optional)** — `ReviewDetail.tsx` `parsedContent`/`candidateCards` memos depend on the whole `submission`; could narrow to the fields read. NOTE: these are the ORIGINAL byte-identical dep arrays — narrowing is a (behavior-neutral) deviation, lower priority than the others.
    - **(aside)** Codex flagged an **unused `ReviewContent.tsx`** that also references `reviewViewMode` (not imported anywhere in `src/`, typed writer) — candidate for dead-file deletion, unrelated to PR-1b but worth noting.
  - All carried-forward/extraction-artifact style; kept byte-identical in PR-1a to preserve the pure-refactor contract. None block.
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

> Sessions 0–3 (scaffold → design-lock → PR-0 safety net merged `3258365`/#552 → PR-1a built + merged
> `e4c248d`/#553) moved to `2026-06-26-wave5-reviewer-admin-execution-status-archive.md` at PR-1b-cycle
> start (2026-06-28). Grep the archive for forensic detail; the durable carry-forward lives above.

> Session 3 (PR-1a built end-to-end + GATE 3 + 3 bot rounds + MERGED #553 `e4c248d`) moved to the archive
> at PR-1b-cycle start. Grep the archive for its forensic detail.

### Session 4 — 2026-06-28 — PR-1b start (branch cut + carry-forward + archival)

Major events:
- **Session-start ritual:** read kickoff + status + design doc end-to-end + impl plan PR-1b section; `npm run check` clean baseline; verified git matches (PR-1a `e4c248d` merged on main; `ReviewDetail.tsx` = 1,120 lines; all 6 PR-1a modules present; worktree dirty only with the 2 carry-forward docs + unrelated untracked `docs/plans/*.md`). User confirmed orientation.
- **Cut `refactor/wave5-reviewdetail-core-seams` from main** (`e4c248d`). First commit bundles the carry-forward docs (status + kickoff, PR-1a's post-merge edits) + the PR-1a-cycle session-log archival (ritual step 5: Session 3 → archive file). Untracked unrelated docs NOT staged.
- **NEXT:** dispatch PR-1b Task 1b.1 (`useReviewSubmission(id)` hook returning initial-form-state **+ the R2-1 data-integrity fix** + page-test-12 update) to a fresh-context executor; supervisor-verify + checkpoint after each of 1b.1–1b.4.

<!-- append PR-1b task + round outcomes below as they land -->
