# Wave 5 — Reviewer/Admin Features — Implementation Plan

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
| 0 | **ReviewDetail safety net** | Page-level RTL test (mocked supabase + `functions.invoke`) + unit tests for `parseExtractedContent` / `reAddActivityTypeSuffix` (incl. legacy scalar/`both`) / `buildCandidateCards`. No refactor. | no | Pure-additive. **Gate prerequisite for PR 1.** |
| 1 | **ReviewDetail decomposition** | Extract seams (§5) into components/hooks; tests stay green; no behavior change. | no | Behind PR 0. May split into 2 sub-PRs (open Q1). |
| 2 | **C107 parallel data-loading** | Serial→parallel in extracted `useReviewSubmission`. | no | Tested by PR 0's net; error semantics open Q8. |
| 3 | **C111 Bookmarks UI** | `useBookmarks` + auth-gated bookmark action across grid/list/detail result views + "My Bookmarks". | no\* | Establishes reusable action C113 reuses. |
| 4 | **C112 Saved Searches UI** | Save/restore `SearchFilters` as `saved_searches.filters` jsonb. | no\* | Reuses C114 serializer (open Q4). |
| 5 | **C113 Collections UI** | Named collections over `lesson_ids text[]`; sharing rung per open Q5; array mutation per open Q9. | no\* | After PR 3. |
| 6+ | **Admin tail** | C28 (computable KPIs; defer C27-gated KPI) · C22 assignee (migration+RPC+frontend, **split-deploy**) · C74/C78 override-view / claim-lock. | **yes** | Each gated on its product decision/migration. |

\* "no DB" pending Session-1 confirmation (open Q3 / Q9).

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

### Task 0.1: <!-- TBD Session 1 — page-level RTL test scope locked from Q2 -->
### Task 0.2: <!-- TBD Session 1 — pure-helper unit suites (parseExtractedContent, reAddActivityTypeSuffix incl. legacy branches, buildCandidateCards) -->

---

## PR 1 — ReviewDetail decomposition

**Branch:** <!-- TBD Session 1 (single PR vs 2 sub-PRs — open Q1) -->

**What ships:** Extraction of the §5 seams into components/hooks with no behavior change; PR-0 tests stay green throughout.

**Pre-flight:**
- Design doc §5 (seam table + the 9 decomposition risks — every risk must be covered by a PR-0 test before its seam moves)
- `src/pages/ReviewDetail.tsx` + the already-extracted helper pattern

### Task 1.x: <!-- TBD Session 1 — ordered seam extractions per locked Q1 grouping -->

---

## PR 2 — C107 parallel data-loading

**Branch:** <!-- TBD Session 1 -->

**What ships:** Serial→parallel rewrite of the fetch graph inside the extracted `useReviewSubmission` hook (design §5.bis); behavior-asserting tests unchanged.

**Pre-flight:** Design doc §5.bis + open Q8 (error semantics + exact parallel shape).

### Task 2.x: <!-- TBD Session 1 -->

---

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
