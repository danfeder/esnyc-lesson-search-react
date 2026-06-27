# Wave 5 — Reviewer/Admin Features — Implementation Plan

> ⚠️ **RE-SCOPED 2026-06-26 (Session 1, user-confirmed):** Wave 5 = **PR 0–2 only** (ReviewDetail test net → decompose → C107 speedup; frontend-only, no DB, no product decisions). **PR 3–6+ (the personalization cluster + the admin tail) are DEFERRED to a future wave** — only ~3 internal reviewers/admins have accounts and they never collide on submissions (design-doc scope banner + memory `project_user_base_accounts`). Concrete tasks are authored for **PR 0–2 only**; the PR 3–6+ sections below are retained verbatim as future-wave reference, not this build.

> **⚠️ SKELETON (design-lock mode).** The design doc
> (`2026-06-26-wave5-reviewer-admin-design.md`) ships as **Status: Draft** —
> strategy is locked, but 9 mechanism questions are open. **Session 1 is a
> design-lock session:** work the design doc's "Open design questions" list
> against the real code/data, lock the answers (respecting `[evidence-lockable]`
> vs `[user-verdict]` tags), flip the design Status to **Locked**, run **GATE
> 1B** on this plan once its concrete tasks exist, and only then dispatch build
> executors. **Do NOT write detailed task steps against the unlocked design** —
> the `<!-- TBD Session 1 -->` placeholders below get filled in once the answers
> are locked.

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to
> implement this plan task-by-task (after Session 1 locks it).

**Goal:** Decompose `src/pages/ReviewDetail.tsx` test-first, then ship the C107 data-loading speedup and the three personalization UIs (Bookmarks/Saved-Searches/Collections) on their existing backends, then the smaller reviewer/admin items — all reversible-first, DB work last.

**Architecture:** Test-first decomposition behind a page-level RTL safety net → frontend-only personalization UIs on already-applied, RLS-protected tables → product-decision-gated admin tail with migrations. Canonical WHY: `2026-06-26-wave5-reviewer-admin-design.md`.

**Tech Stack:** React 19 + TypeScript + Vite + Tailwind; Zustand; Supabase (PostgreSQL + RLS + Edge Functions); Vitest + React Testing Library; Playwright (E2E).

**Design reference:** `docs/plans/2026-06-26-wave5-reviewer-admin-design.md`. Read it before starting any task; re-read §4 (open questions) + §5/§6 before authoring tasks.

**Sub-skills to invoke (per phase):**
- `superpowers:test-driven-development` — every code-bearing task is test-first (PR 0 is *entirely* this).
- `superpowers:verification-before-completion` — run each task's Verify step before claiming done.
- `superpowers:requesting-code-review` — between PRs.
- `database-migrations` — before touching any file in `supabase/migrations/` (admin tail only).

**Per-PR ritual (mandatory, every PR):** canonical spec in the kickoff's PER-PR RITUAL section + the feedback memories it cites. Shape: pre-push reviewer-agent dispatch + GATE 3 Codex → baseline checks → push + `gh pr create` → wait for external bots → four-surface triage → rebuttal-pass every finding (GATE 4 Codex on real suggested changes) → consolidated fix-ups → per-round TEST-DB re-verify (DB rounds only) → round-cap after 2. Don't restate per-task; cite it.

**How to use this plan:**
- Each task (once authored) has: ID, file paths, anchor symbols, code snippets, test commands, commit message.
- Execute in order; PR 0 must merge before PR 1 (the gate); PR 3 before PR 5 (shared bookmark action).
- Verify every snippet against current code before applying — line numbers/imports/types drift. Small repo-conformance adaptations OK; product/design changes require stopping to ask.

## PR breakdown

| PR | Title | Contains | DB? | Notes |
|---|---|---|---|---|
| 0 | **ReviewDetail safety net** | Page-level RTL test (table-aware supabase mock + `functions.invoke`) + unit tests for `parseExtractedContent` / `reAddActivityTypeSuffix` (incl. legacy scalar/`both`). No refactor (only adds `export`). `buildCandidateCards` extraction+test is PR-1a. | no | Pure-additive. **Gate prerequisite for PR 1.** |
| 1 | **ReviewDetail decomposition** | Extract seams (§5) into components/hooks; tests stay green; no behavior change. | no | Behind PR 0. May split into 2 sub-PRs (open Q1). |
| 2 | **C107 parallel data-loading** | Serial→parallel in extracted `useReviewSubmission`. | no | Tested by PR 0's net; error semantics open Q8. |
| 3 | **C111 Bookmarks UI** | `useBookmarks` + auth-gated bookmark action across grid/list/detail result views + "My Bookmarks". | no\* | Establishes reusable action C113 reuses. |
| 4 | **C112 Saved Searches UI** | Save/restore `SearchFilters` as `saved_searches.filters` jsonb. | no\* | Reuses C114 serializer (open Q4). |
| 5 | **C113 Collections UI** | Named collections over `lesson_ids text[]`; sharing rung per open Q5; array mutation per open Q9. | no\* | After PR 3. |
| 6+ | **Admin tail** | C28 (computable KPIs; defer C27-gated KPI) · C22 assignee (migration+RPC+frontend, **split-deploy**) · C74/C78 override-view / claim-lock. | **yes** | Each gated on its product decision/migration. |

\* "no DB" pending Session-1 confirmation (open Q3 / Q9).

> **⏸ RE-SCOPE (2026-06-26):** Rows **0–2 are in Wave 5**; rows **3–6+ are DEFERRED** (future wave). The deferred rows stay as the design-of-record only.

---

## PR 0 — ReviewDetail safety net

**Branch:** `test/wave5-reviewdetail-safety-net` (confirm at authoring)

**What ships:** The page-level + helper tests that satisfy the standing "no refactor without page-level tests first" gate, pinning current ReviewDetail behavior before any structural change.

**Why this is its own PR:** It is the gate. PR 1 cannot start until this merges. Pure-additive, zero production-code change.

**Pre-flight: read these first (re-verify line numbers — drift since 2026-06-26):**
- `src/pages/ReviewDetail.tsx` (entire — the target)
- `src/__tests__/integration/search-page.test.tsx` (the local supabase + `functions.invoke` mock pattern to follow — global setup mocks `supabase.from` but has no `functions` member)
- `src/pages/reviewMetadataInit.test.ts`, `reviewMismatch.test.ts`, `reviewPreselect.test.ts` (the established helper-extraction test pattern)
- Design doc §4 Q2 (test strategy), §5 (seams + risks), §9 (testing strategy)

> These are **characterization tests** (pin CURRENT behavior) — they should go green against today's code immediately. Use `superpowers:test-driven-development` in spirit (write test → see it pass for the right reason). PR-0 changes **zero production logic** (only adds `export` keywords in Task 0.3).

### Task 0.1 — Table-aware supabase mock + review-submission fixtures (test infra)
**Files (new):** `src/__tests__/helpers/supabaseReviewMock.ts`, `src/__tests__/helpers/reviewFixtures.ts`
- `makeReviewSupabaseMock(tableData: Record<string, { data: unknown; error: unknown }>)` → returns an object whose `from(table)` yields a **thenable chainable builder**: every chain method (`select/eq/in/order/limit/neq`) returns the SAME builder. **⚠️ Dual terminal shape (GATE-1B fix — a naive impl breaks):** the load path consumes results in TWO shapes — `.single()` (object) for `lesson_submissions` (L311) + `user_profiles` (L398) + the off-list `lessons_with_metadata` (L367); and a bare `await` (array) for `submission_similarities` (L324, `.order()` terminal) + `submission_reviews` (L391, `.limit(1)`) + the candidate `lessons_with_metadata` (L333, `.in()`). So: configure each table's `data` as the **array** form, have **`.single()`/`.maybeSingle()` UNWRAP** (`Array.isArray(data) ? data[0] : data`), and have the bare-`then` resolve the configured value as-is. `lessons_with_metadata` is queried BOTH ways (candidate `.in()` array at L333 AND off-list `.eq().single()` at L367) — the 6 page behaviors below drive only the candidate (array) path, so configure it as the candidate array; if a later behavior needs the off-list target, key the handler on `{table, terminal}` instead. Unknown tables default to `{data:null,error:null}`. Precedent: the single-table chainable mock in `src/components/LessonSearchPicker.test.tsx` (the global `src/__tests__/setup.ts` mock is NOT table-aware and has no `functions`/`rpc`). **Dispatch-by-table (not a `mockResolvedValueOnce` queue) is what lets the page test assert final state regardless of fetch order** — so C107/PR-2 can't break it. (Caveat: it ignores query *args*, so it can't catch a dependency-violating reorder — see PR-2 manual smoke.)
- **Three fixtures**, each a per-table map. **Use the REAL column names** (GATE-1B fix — `metadata` is a trap): `submission_reviews` rows carry **`tagged_metadata`** (read at L417/L441, NOT `metadata`) + `decision` + `notes` + `created_at`; `lesson_submissions` rows carry `teacher_id` (for #6), `original_lesson_id` + `submission_type` (drive restore-vs-preselect + the intent banner) + `ai_draft_metadata` (preselect seed) + the doc/title fields.
  - `modernFixture` — array `activityType`, canonical vocab, all required fields, a restored `submission_reviews` row with a supported decision (drives the **restore** branch).
  - `legacyFixture` — scalar `activityType:'both'`, `decision:'reject'`, pre-canonical slugs, a restored review row (drives restore + the legacy regime).
  - `noReviewUpdateFixture` (GATE-1B add) — an **update** submission (`submission_type:'update'`) with **`original_lesson_id: null`** and **NO `submission_reviews` row** (empty array) → drives the **preselect** branch + the **auto-expand** search effect + the **amber** intent banner.
**Verify:** `npm run check` (infra consumed by 0.2; no standalone test).
**Commit:** `test(wave5): table-aware supabase mock + review-submission fixtures (dual-shape terminals)`

### Task 0.2 — ReviewDetail page-level RTL characterization test (THE GATE)
**File (new):** `src/__tests__/integration/review-detail-page.test.tsx`
- Local `vi.mock('@/lib/supabase', () => ({ supabase: { from: <makeReviewSupabaseMock(...)>, functions: { invoke: (...a) => functionsInvokeMock(...a) } } }))`; module-scope `const functionsInvokeMock = vi.fn().mockResolvedValue({ data: { success: true }, error: null })`, reset in `beforeEach`. (Mirror the local-override pattern in `src/__tests__/integration/search-page.test.tsx`.)
- Render `<ReviewDetail/>` **directly** under `<MemoryRouter initialEntries={['/review/sub-123']}><Routes><Route path="/review/:id" element={<ReviewDetail/>}/><Route path="/review" element={<div>Dashboard</div>}/></Routes></MemoryRouter>` — **no ProtectedRoute, no auth mock, no QueryClientProvider** (ReviewDetail imports no auth hook and is not react-query).
- **Behaviors — assert FINAL STATE, not call order. Each pins a seam/risk that PR-1 moves [seam tag].** PR-0 MUST cover all of these before the corresponding seam is extracted (design §5: "must be covered by PR-0 tests before any move"):
  1. **Modern restore load→render** (`modernFixture`): metadata controls + progress bar + intent banner + decision radios present. [render; restore branch 1b.1; metadata form 1b.3]
  2. **Legacy fixture** (scalar `'both'` + `decision:'reject'`): NO error-boundary fallback (proves the `.map`-on-scalar landmine handled) + `cooking-only`/`garden-only` pills selected + `legacyDecisionWarning` banner. [risks 3, 5]
  3. **Edit→Save**: `functionsInvokeMock` called with `'complete-review'` + a body whose `metadata.activityType` is canonicalized (`-only` stripped) + nav to `/review` (Dashboard sentinel). [save flow 1b.4; activityType round-trip risk 3]
  4. **Validation block**: clear a required field → Save → validation banner + `functionsInvokeMock` NOT called. [reviewValidation 1a.5]
  5. **Save-error**: `functionsInvokeMock.mockResolvedValueOnce({ data: null, error: { message: 'boom' } })` → `saveError` banner + NO nav.
  6. **No-review preselect** (`noReviewUpdateFixture`) — GATE-1B add: preselect wiring sets the decision (update path) and does NOT carry a restored `selectedDuplicate`; the search panel **auto-opens** (`needsSearch`); the **amber** `(update, null-target)` intent banner shows. [restore-vs-preselect risk 2; auto-expand risk 4; intent banner 1a.4]
  7. **Search-hatch manual-close persists** — GATE-1B add: from the auto-opened state (fixture 6), simulate manual close → it STAYS closed across a re-render (until `submission.id` changes). [search-hatch effect ordering risk 4 / 1b.2]
  8. **Doc/Text view toggle** — GATE-1B add: toggle to Text → text view renders; assert the `reviewViewMode` value persists to `localStorage`. [ReviewDocPanel 1a.3]
  9. **Closed-enum label semantics** — GATE-1B add: assert one **config-label** select (e.g. `cookingSkills`) renders its config-resolved label AND one **raw-label** select (e.g. `culturalResponsivenessFeatures`) renders its raw `label:v` — pins the do-NOT-over-DRY distinction. [risk 7 / 1b.3]
  - **SubmitterIntentBanner 4-state coverage** — GATE-1B add: across the fixtures, ensure all four branches are reached — blue (happy update, target in list) / green (genuine new) / amber (update,null — behavior 6) / **yellow degraded-update** (update + target id present + failed `lessons_with_metadata` lookup; add a minimal fixture if not otherwise reached). Pins the "never fall through to green on a degraded update" invariant before 1a.4. [1a.4]
**Verify:** `npm run test:run -- review-detail-page`
**Commit:** `test(wave5): ReviewDetail page-level RTL safety net (restore/preselect/legacy/save/search-hatch/view-toggle/enum)`

### Task 0.3 — Pure-helper unit suites (export-in-place, NO relocation)
**Files:** `src/pages/ReviewDetail.tsx` (add `export` only), `src/pages/reviewDetailHelpers.test.ts` (new)
- Add `export` to the module-scope helpers `reAddActivityTypeSuffix`, `parseExtractedContent`, `normalizeMatchType`, `selectOptionsFromConfig`, `flattenHeritageOptions`, `ZOD_FIELD_TO_LABEL` (L96–200, currently unexported). Import them in the test from `@/pages/ReviewDetail` (the relocation to `reviewDetailHelpers.ts` is PR-1a).
- Priority order: `reAddActivityTypeSuffix` (scalar `'cooking'`/`'garden'`/`'both'`/array/empty/null — the crash landmine), `parseExtractedContent`, then `normalizeMatchType`/`selectOptionsFromConfig`/`flattenHeritageOptions`. `toEqual` assertions, no mocks (mirror `reviewMetadataInit.test.ts`).
- **`buildCandidateCards` is NOT here** — it's an inline `useMemo`; its extraction + 4-case unit test is **PR-1a Task 1a.2**, and its branches are already covered by 0.2's page test.
**Verify:** `npm run test:run -- reviewDetailHelpers && npm run check`
**Commit:** `test(wave5): unit suites for ReviewDetail pure helpers (legacy activityType branches, parseExtractedContent, …)`

---

> **Q1 LOCKED → PR-1 ships as TWO PRs:** PR-1a (easy seams) then PR-1b (risky core). PR-0 must be merged before PR-1a. Every task: **no behavior change**, PR-0 tests stay green throughout (run `review-detail-page` after each extraction). Re-verify all line anchors against current code before extracting — they're 2026-06-26 anchors. Use `superpowers:test-driven-development` for the new helper unit tests (1a.2, 1a.5).

## PR 1a — ReviewDetail decomposition (easy seams)

**Branch:** `refactor/wave5-reviewdetail-easy-seams`

**What ships:** The low-risk, mostly-mechanical extractions. No behavior change.

**Pre-flight:** Design §5 seam table + risks 3/7; `src/pages/ReviewDetail.tsx`; the existing `reviewMetadataInit.ts` / `reviewMismatch.ts` / `reviewPreselect.ts` extract-then-test pattern.

### Task 1a.1 — Relocate pure helpers → `src/pages/reviewDetailHelpers.ts`
Move the 6 helpers (exported in-place by PR-0 Task 0.3, L96–200) into the new module; import them back into `ReviewDetail.tsx`; repoint `reviewDetailHelpers.test.ts` import from `@/pages/ReviewDetail` → `@/pages/reviewDetailHelpers`; drop the now-redundant `ReviewDetail` re-exports.
**Verify:** `npm run test:run -- reviewDetailHelpers review-detail-page && npm run check` · **Commit:** `refactor(wave5): extract ReviewDetail pure helpers to reviewDetailHelpers.ts`

### Task 1a.2 — Extract `buildCandidateCards()` + 4-case unit test
Move the `candidateCards` `useMemo` body (L621–694, plus the `topDuplicates` input L606–609) into a pure `buildCandidateCards(args)` in `reviewDetailHelpers.ts` (or a sibling `buildCandidateCards.ts`); ReviewDetail's `useMemo` just calls it. **Co-locate the supporting types** it needs (`SimilarityWithLesson`, `SubmitterTargetLesson`, the card-arg shape) into the helper module and import them back into `ReviewDetail.tsx` — do NOT have the helper import types from `ReviewDetail` (circular). It also calls `normalizeMatchType` (already relocated in 1a.1) → import that from the helper module. Add `buildCandidateCards.test.ts` covering all 4 cases (target-in-list / off-list-prepend / no-target / reviewer-searched-append). **TDD:** write the 4-case test against the extracted signature first.
**Verify:** `npm run test:run -- buildCandidateCards review-detail-page` · **Commit:** `refactor(wave5): extract buildCandidateCards() + 4-case unit test`

### Task 1a.3 — Extract `<ReviewDocPanel>`
Lift the MIDDLE doc panel JSX (L1164–1207) + the `viewMode` `useState`/`handleSetViewMode` + localStorage (L237–250) into `src/components/Review/ReviewDocPanel.tsx`. Either own the localStorage `viewMode` internally or take it as props (prefer internal — it's self-contained).
**Verify:** `npm run test:run -- review-detail-page && npm run check` · **Commit:** `refactor(wave5): extract <ReviewDocPanel>`

### Task 1a.4 — Extract `<SubmitterIntentBanner>` + `<TitleMismatchWarning>`
Lift the 4-state intent IIFE (L1215–1279) and the title-mismatch IIFE (L1319–1334) into pure presentational components (props = the submission fields they read). **Preserve the "degraded-update never falls through to the green genuine-new branch" invariant** (the page test pins it).
**Verify:** `npm run test:run -- review-detail-page` · **Commit:** `refactor(wave5): extract <SubmitterIntentBanner> + <TitleMismatchWarning>`

### Task 1a.5 — Extract `reviewValidation.ts` + unit test
Lift `validateRequiredFields` (L261–279), `fieldProgress` (L281–306), and the `showCookingFields`/`showGardenFields` derivations (L252–259) into `src/pages/reviewValidation.ts` (pure of `metadata`). Add `reviewValidation.test.ts` covering the cooking/garden conditional required-field branches + progress counts. **TDD** the new tests.
**Verify:** `npm run test:run -- reviewValidation review-detail-page && npm run check` · **Commit:** `refactor(wave5): extract reviewValidation.ts + unit test`

---

## PR 1b — ReviewDetail decomposition (core / risky seams)

**Branch:** `refactor/wave5-reviewdetail-core-seams` (after PR-1a merges)

**What ships:** The high-regression cohesive extractions. No behavior change; PR-0 page test green throughout.

**Pre-flight:** Design §5 risks 2/4/6/7 + §5.bis (the data hook is C107's landing site); `src/pages/ReviewDetail.tsx`.

### Task 1b.1 — Extract `useReviewSubmission(id)` data hook (returns initial-form-state)
Lift `loadSubmission` (L308–492) + its load effect (L494–496) into `src/pages/useReviewSubmission.ts`. **The hook returns a computed initial-form-state object** — `{ submission, loading, initialMetadata, initialDecision, initialNotes, initialSelectedDuplicate, legacyDecisionWarning }` capturing the restore-vs-preselect seed (L428–486) — NOT the 13 setters. The page consumes it (one effect that seeds its `useState` when the object arrives). **Preserve the restore-vs-preselect mutual-exclusion + "don't clobber restored review" invariant verbatim** (risk 2; `selectedDuplicate` is preselect-only, explicitly NOT restored). Do NOT change fetch ordering here (that's PR-2).
**Verify:** `npm run test:run -- review-detail-page && npm run check` · **Commit:** `refactor(wave5): extract useReviewSubmission(id) data hook (returns initial-form-state)`

### Task 1b.2 — Extract `useSearchEscapeHatch` + `<ReviewSearchPanel>`
Move the two effects (L726–739) into the hook **preserving declaration order (reset-first L726–729 then auto-expand L737–739) + dep arrays verbatim** (risk 4 — one-directional open was a round-1 bug); move the search panel JSX (L1338–1377) + its derivations (L699–705) into `<ReviewSearchPanel>`.
**Verify:** `npm run test:run -- review-detail-page` · **Commit:** `refactor(wave5): extract useSearchEscapeHatch + <ReviewSearchPanel> (effect order preserved)`

### Task 1b.3 — Extract `<ReviewMetadataForm>` (LEFT column)
Lift L850–1162 into `src/components/Review/ReviewMetadataForm.tsx` with a `metadata`/`onChange` props surface. **Do NOT over-DRY the 5 closed-enum react-selects** — `mainIngredients`/`cookingSkills`/`gardenSkills` use config-lookup labels while `observancesHolidays`/`culturalResponsivenessFeatures` use raw `label:v`; keep them distinct (risk 7 — the closed-enum Zod/DB-CHECK contract from C02).
**Verify:** `npm run test:run -- review-detail-page && npm run check` · **Commit:** `refactor(wave5): extract <ReviewMetadataForm> (LEFT column)`

### Task 1b.4 — Extract `<ReviewDecisionPanel>` (RIGHT column)
Lift L1209–1478 into `src/components/Review/ReviewDecisionPanel.tsx`, composing the already-extracted banner/cards/mismatch/search sub-seams + the decision radios (L1379–1423) / note textarea (L1425–1439) / saveError banner (L1441–1445) / `IntDecisionBar` (L1447–1471). The save orchestration (`handleSaveReview`) can stay in the page or move with the panel as a thin `onSave` prop — keep the `functions.invoke('complete-review')` payload identical.
**Verify:** `npm run test:run -- review-detail-page && npm run check` · **Commit:** `refactor(wave5): extract <ReviewDecisionPanel> (RIGHT column)`

---

## PR 2 — C107 parallel data-loading

**Branch:** <!-- TBD Session 1 -->

**What ships:** Serial→parallel rewrite of the fetch graph inside the extracted `useReviewSubmission` hook (design §5.bis); behavior-asserting tests unchanged.

**Pre-flight:** Design §5.bis + the **Q8 LOCKED** answer in §4 (error semantics corrected + the 3-wave shape).

### Task 2.1 — Parallelize the fetch graph in `useReviewSubmission` (3-wave Promise.all)
Rewrite the serial fetch graph (now inside the extracted hook) to the locked shape:
- **Wave A:** `const [submissionRes, similRes, reviewsRes] = await Promise.all([#1 lesson_submissions, #2 submission_similarities, #5 latest submission_reviews])` — all id-only. **Then re-apply #1's post-resolve guards** on `submissionRes`: `if (submissionError) throw submissionError` and `if (!submissionData) { setLoading(false); return }` — `Promise.all` does NOT surface these post-await destructure checks, so they MUST run on the resolved batch or #1 failures fall through silently.
- **Wave B:** `const [lessonsRes, profileRes] = await Promise.all([#3 lessons_with_metadata-for-similar-ids, #6 user_profiles-teacher])` — keep #3 inside its `if (similarities && similarities.length > 0)` guard; #6 needs `submissionData.teacher_id` from Wave A.
- **Wave C:** conditional `await #4` (off-list submitter-target lesson) — keep its `if (submitterTargetId && !targetInRenderedTopFive)` guard; needs #1's `original_lesson_id` + `renderedTopFive` built from #3.
- **Preserve each await's existing error discipline verbatim:** #1 throws; #3/#4 `logger.error`+guard (no throw); #2/#5/#6 ignore errors / degrade to defaults. Keep `setSubmission` + the restore-vs-preselect seed AFTER Wave C.
- **Error semantics (Q8 LOCKED):** use `Promise.all` (NOT `allSettled`) — it preserves today's behavior (a true network reject → the same outer try/catch → swallowed `logger.error` → `finally setLoading(false)` → "Submission not found" UI; it does NOT reach `ReviewErrorBoundary`). Query/RLS errors still resolve as `{data:null,error}` and degrade exactly as today. No behavior change — only latency (6 serial round-trips → 3 worst-case, 2 if #4 doesn't fire).
**Verify:** `npm run test:run -- review-detail-page && npm run check` (the PR-0 page test asserts FINAL STATE, so it must pass unchanged). **⚠️ The mock ignores query args, so the automated net validates only final state, NOT fetch-dependency ordering** (e.g. it would not catch #3 firing before #2's ids resolve) — so the **manual smoke is load-bearing for PR-2**: reviewer opens a submission with similarities → candidate cards + teacher name render correctly; reopen a legacy approved submission → no clobber/crash; confirm the off-list submitter-target path (#4) still renders when it fires. Optionally eyeball the network panel to confirm the 3-wave batching.
**Commit:** `perf(wave5): C107 — parallelize ReviewDetail data load (3-wave Promise.all)`

---

## ⏸ DEFERRED to a future wave — PR 3 through PR 6+

> The sections below (PR 3 Bookmarks, PR 4 Saved Searches, PR 5 Collections, PR 6+ Admin tail) are **NOT part of re-scoped Wave 5** (2026-06-26). They are retained verbatim as the design-of-record for a future wave — built when general-user login rolls out (personalization) or if the admin tail is ever prioritized. **Do not author or execute these in this wave.** Pre-flight reads + the §4 question material (Q3/Q4/Q5/Q9/Q6/Q7) carry forward when that wave starts.

## PR 3 — C111 Bookmarks UI

**Branch:** <!-- TBD Session 1 -->

**What ships:** `useBookmarks` hook (toggle/upsert against `bookmarks` `UNIQUE(user_id,lesson_id)`), an auth-gated bookmark action wired into the grid/list/detail result views, and a "My Bookmarks" view.

**Pre-flight:**
- Design doc §6 (bookmarks shape + RLS + the "no `LessonCard`" multi-view reality)
- `src/components/Internal/` (IntCardGrid / IntListRow / IntLessonDrawer / IntSplitDetail) + `src/pages/SearchPage.tsx` — the real result-render surfaces + bookmark insertion points (Session-1 discovery)
- `src/hooks/useEnhancedAuth.ts` — auth gating
- Design doc §4 Q3 (confirm no migration)

### Task 3.x: <!-- TBD Session 1 -->

---

## PR 4 — C112 Saved Searches UI

**Branch:** <!-- TBD Session 1 -->

**What ships:** Save the current `SearchFilters` to `saved_searches.filters` (jsonb) + restore into the store.

**Pre-flight:**
- Design doc §6 + §4 Q4
- `src/utils/urlParams.ts` (`buildSearchParams`/`parseSearchParams`) + `src/hooks/useUrlSync.ts` (the C114 serializer) + the filter store

### Task 4.x: <!-- TBD Session 1 -->

---

## PR 5 — C113 Collections UI

**Branch:** <!-- TBD Session 1 -->

**What ships:** Named collections over `lesson_ids text[]`; sharing rung per Q5; add/remove mechanism per Q9; reuses PR-3's bookmark-action surface.

**Pre-flight:**
- Design doc §6 + §4 Q5 (sharing rung) + Q9 (array mutation / migration tradeoff)
- PR-3's bookmark-action implementation

### Task 5.x: <!-- TBD Session 1 -->

---

## PR 6+ — Admin tail (each gated)

**Branches:** per item; C22/C74/C78 DB items follow `database-migrations` + the split-deploy rule (design §7).

**Pre-flight:**
- Design doc §7 + §4 Q6 (tail scope) / Q7 (C22 assignee product decision)
- `reference_ci_flakes` (additive-RPC split-PR, edge-deploy 3-signal verify) before any migration/RPC/edge work
- The admin pages these touch (AdminAnalytics, the submission-review surfaces) — identify at authoring

### Task 6.x: <!-- TBD — authored only after Q6/Q7 lock; do not pre-spec migrations against an undecided product shape -->

---

## Test plan

> Concrete assertions get authored with the tasks (Session 1+). Shape from design §9:

### Unit
- `reviewDetailHelpers` (`parseExtractedContent`, `reAddActivityTypeSuffix` incl. legacy scalar/`both`, `normalizeMatchType`, `flattenHeritageOptions`, `selectOptionsFromConfig`), `buildCandidateCards` (4 cases), `reviewValidation` (cooking/garden branches), personalization hooks (toggle/array/error paths).

### Integration / page-level (the gate)
- ReviewDetail page-level RTL: load→render→edit→save, **behavior not call-sequence**, legacy + modern fixtures (per Q2).

### E2E
- Existing Playwright suite green across decomposition; minimal authenticated happy-path for personalization if the suite supports it (confirm Session 1).

### RLS
- Spine: `npm run test:rls` unchanged; **add cross-user isolation smoke** for the first authenticated writes to bookmarks/saved_searches/lesson_collections. Admin tail: extend `test:rls` for new policies/columns.

### Manual smoke
- Reviewer opens submission → all metadata controls render, save succeeds (post-decompose + post-C107); reopen a **legacy approved** submission → no clobber, no scalar-`.map` crash; bookmark toggle persists across reload; saved search restores filters; collection add/remove updates membership; cross-user isolation holds.
