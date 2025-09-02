**ESYNYC Lesson Search — Architecture & Cleanup Guide (Code + Database)**

This document is a comprehensive analysis and action plan for simplifying, hardening, and de‑duplicating the codebase and Supabase usage. It is intentionally thorough and opinionated to serve as a working “bible” for cleanup and incremental refactors.

---

**Project Snapshot**

- Purpose: A modern React + Supabase app for searching and filtering 800+ ESYNYC lesson plans; with submission review, user management, and duplicate resolution.
- Frontend: React 19 + TypeScript + Vite, Tailwind, Zustand (UI state), React Query (data fetching).
- Backend: Supabase (Postgres + SQL functions), Edge Functions for smart search and ops, RLS enforced by policies.

---

**High‑Level Themes**

- Consolidate to One Source of Truth:
  - Code: One search pipeline, one data owner (React Query for results; Zustand for UI filters only), one filter definition module.
  - DB: One representation for filterable fields (columns), one search vector trigger, one search API.
- Delete Dead/Redundant Paths:
  - Remove Algolia code, indexes that aren’t used, duplicate/triplicate triggers, duplicate DB types, etc.
- Make Performance and Security Boring:
  - Slim RLS policies to fewer, more efficient rules; wrap auth calls to avoid per‑row evaluation; move extensions out of public; drop duplicate/unused indexes.
- Improve Developer UX:
  - Align types and names end‑to‑end; reduce special‑case code; clear separation of concerns; testable modules; explicit ownership.

---

**Progress Tracker (Working Section)**

This section is a living checklist to track cleanup progress. Do not remove prior content; append updates with dates as work proceeds.

- [x] Phase 0 — Guardrails & Prep (2025‑09‑01)
  - [x] Add feature flag to route search RPCs (`VITE_ENABLE_SEARCH_V2`)
    - Files updated: `.env.example`, `.env.staging.example`, `.env.production.example`
  - [x] Add RPC router helper and wire callers
    - New: `src/lib/search.ts` (`getSearchRpcName`, `isSearchV2Enabled`)
    - Updated callers: `src/hooks/useSupabaseSearch.ts`, `src/pages/SearchPage.tsx`
  - [x] Snapshot DB: tables/rows, indexes, and baseline query plans
    - New: `docs/db-baseline-2025-09-01.md`
    - Captured EXPLAIN ANALYZE for representative queries

- [x] Phase 1 — Frontend Search Consolidation
  - [x] Implement unified `useLessonSearch` with `useInfiniteQuery`
  - [x] Update `SearchPage` to use the unified hook for initial + load‑more
  - [x] Move results ownership to React Query (store keeps filters/view only)
  - [x] Follow‑ups (Phase 1B.2)
    - [x] Fix RPC param naming drift: send `filter_seasons` (not `filter_seasonTiming`) from hooks
    - [x] Fix suggestions season filter payload: send `seasons` to Edge Function (not `seasonTiming`)
    - [x] ScreenReaderAnnouncer reads total count from React Query (prop)
    - [ ] Remove legacy results fields from Zustand store (moved to Phase 3; blocked by legacy Algolia code and tests)
  - [ ] Add/adjust tests (paging, filters, suggestions)
    - [x] Paging (initial + load more) and error path
    - [x] Filter-change invalidation (Phase 1B)
    - [x] Cache-key isolation when page size changes (Phase 1B)
    - [x] Suggestions: click applies query and refetches (Phase 1B)
    - [x] Param naming asserts: RPC `filter_seasons` and suggestions `seasons` key
    - [x] Suggestions path unification (Phase 1C)

- [x] Phase 2 — Filter Definitions & Type Cleanups
  - [x] Consolidate filter options into `src/utils/filterDefinitions.ts`
    - [x] FilterModal sources options from `filterDefinitions`
    - [x] FilterSidebar sources options from `filterDefinitions`
    - [x] Cultural heritage intentionally remains on dedicated hierarchy config
  - [x] Treat `lessonFormat` as string consistently (UI/types/pills/announcer)
  - [x] Normalize display labels ⇄ DB values (Academic Integration to Title Case)

- [ ] Phase 3 — Remove Algolia/Legacy Code
  - [ ] Remove hooks/types/client (`useAlgoliaSearch`, `lib/algolia.ts`, `types/algolia.ts`)
  - [ ] Remove facet helpers tied to Algolia (or rewire for SQL counts)
  - [ ] Remove scripts/docs referencing Algolia
  - [ ] Remove legacy results fields from Zustand store and any dependents (moved from Phase 1)

- [ ] Phase 4 — Database: New Search Function and Triggers
  - [ ] Implement `search_lessons_v2` using normalized columns only
  - [ ] Integrate synonyms + culture expansion (`expand_*` functions)
  - [ ] Keep only one search‑vector trigger (`update_lesson_search_vector`)
  - [ ] Switch frontend to v2 via feature flag; validate; retire v1

- [ ] Phase 5 — Index Hygiene
  - [ ] Drop duplicate trigram indexes (title/summary)
  - [ ] Drop unused JSON‑path indexes after v2 adoption
  - [ ] Add missing FK indexes flagged by advisors

- [ ] Phase 6 — RLS Policy Tuning
  - [ ] Replace per‑row `auth.*` calls with `select auth.*()` in policies
  - [ ] Merge overlapping permissive policies

- [ ] Phase 7 — Extensions and Views
  - [ ] Move `vector`, `pg_trgm`, `unaccent` to `extensions` schema
  - [ ] Remove or simplify `lessons_with_metadata`/`user_profiles_safe` if unneeded

- [ ] Phase 8 — Facet Counts (Optional)
  - [ ] Add SQL facet counts function and UI wiring

- [ ] Phase 9 — Logging & Error Boundaries
  - [ ] Keep one top‑level boundary, slim logger; remove extras

- [ ] Phase 10 — Duplicate DB Types and Cleanup
  - [ ] Keep only `src/lib/database.types.ts`; update imports; remove duplicate

Recent Notes
- 2025‑09‑01: Phase 0 completed. Added RPC switch, env flags, baseline DB snapshot + plans.
- 2025‑09‑01: Phase 1A merged; CI green after cache‑key + typing fixes.
- 2025‑09‑01: Phase 1B merged — invalidation, cache‑key, and suggestions integration tests landed. Branch deleted.
  - Addressed review feedback: shared test factories + smart-search suggestions mock integrated.
  - PR: https://github.com/danfeder/esnyc-lesson-search-react/pull/222
  - Follow-up branch: `feat/tests-consistency-phase-1b1` (tests-only consistency + suggestions error-path).
  - 2025‑09‑01: Phase 1B.2 merged — season param naming + announcer totals fixed; param asserts added.
    - PR: https://github.com/danfeder/esnyc-lesson-search-react/pull/226
 - 2025‑09‑01: Phase 1C suggestions path unified — `useLessonSuggestions` + SearchPage panel; SearchBar simplified.
 - 2025‑09‑01: Phase 2A merged — lessonFormat normalized to string in filters/UI.
   - PR: https://github.com/danfeder/esnyc-lesson-search-react/pull/225
 - 2025‑09‑02: Phase 2B merged — filter options consolidated to filterDefinitions; tests added; academicIntegration normalized.
   - PRs: https://github.com/danfeder/esnyc-lesson-search-react/pull/227, https://github.com/danfeder/esnyc-lesson-search-react/pull/228, https://github.com/danfeder/esnyc-lesson-search-react/pull/229

Next Planned Actions
- Phase 3: Remove Algolia/legacy code and then remove legacy results fields from the store.
  - Delete Algolia hooks/types/client and facet helpers; remove scripts/docs references.
    - [x] Remove hooks/types/client (`useAlgoliaSearch`, `lib/algolia.ts`, `types/algolia.ts`)
    - [x] Reword facet helpers to be generic (kept for future SQL counts)
    - [ ] Remove scripts/docs referencing Algolia (scripts/sync-to-algolia.js; package.json scripts)
  - Remove legacy results fields from Zustand store (moved from Phase 1) and update any dependents.
  - Keep Cultural Heritage hierarchy config as-is unless a future consolidation is desired.

--------------------------------------------------------------------

Phase 1C — Suggestions Path Unification (Plan) — Status: Completed (2025‑09‑01)

Goals
- One clear suggestions pathway powered by React Query.
- Avoid fallback-heavy code in suggestions; keep UI logic simple and predictable.
- Do not reintroduce server results into the Zustand store.

Decision
- Introduce a dedicated hook `useLessonSuggestions` that calls the smart-search Edge Function and returns `{ suggestions: string[], expandedQuery?: string }`.
- Render suggestions from `SearchPage` (results area) only when `filters.query.trim()` is truthy AND `totalCount === 0` for the current results. This avoids coupling SearchBar to server results and prevents unnecessary state leakage back into the store.
- Deprecate `useSearch` (keep temporarily; remove in Phase 3 alongside other legacy paths).
- Remove the client-side `fallbackSearch` path for suggestions. On Edge Function error, show no suggestions (silent failure) and keep the UI clean.

Implementation Outline
- New: `src/hooks/useLessonSuggestions.ts`
  - Inputs: `{ filters, enabled?: boolean }`
  - Behavior: `enabled = !!filters.query?.trim()`; `staleTime = 5m`; `gcTime = 10m`
  - RPC: `supabase.functions.invoke('smart-search', { body: { query, filters } })`
  - Return: `{ suggestions, expandedQuery }`

- Update `src/pages/SearchPage.tsx`
  - Call `useLessonSuggestions({ filters, enabled: !!filters.query?.trim() })`.
  - Render suggestions panel under ResultsHeader when `totalCount === 0 && suggestions.length > 0`.
  - Keep Quick Searches UI unchanged in `SearchBar` (static chips).
  - Remove dynamic suggestions UI from `SearchBar` to centralize logic near results.

- Types & Flags
  - Optional feature flag: `VITE_ENABLE_SUGGESTIONS_V2` (on by default) in `.env.*` to allow rollback if needed.
  - Add a light TS type for Edge Function response to avoid `any`.

Testing (acceptance criteria)
- When no results are returned, suggestions appear with “No results found. Try these suggestions:”
- Clicking a suggestion sets `filters.query` and triggers a new search from page 0.
- When results exist, suggestions panel does not render.
- If the Edge Function fails, suggestions panel does not render (no console noise).
- Cache isolation: suggestions query key includes `filters.query` (sanitized) and filter selections.
- No interference with pagination; suggestions do not alter React Query pages.

Files to change
- New: `src/hooks/useLessonSuggestions.ts`
- Update: `src/pages/SearchPage.tsx` (render suggestions panel)
- Update: `src/components/Search/SearchBar.tsx` (remove dynamic suggestions block)
- Tests:
  - Update/keep: `src/__tests__/integration/lesson-search.suggestions.test.tsx` (still valid; panel now in results area)
  - Keep: `lesson-search.suggestions.error.test.tsx` (Edge Function failure covered)
  - Adjust SearchBar tests to focus on static quick suggestions only.

Rollout & Risks
- Small UI movement (suggestions panel from SearchBar → Results area). Functional behavior remains identical or clearer.
- Edge Function call remains; now isolated and typed; no heavy DB fallback.
======================================================================

**Architecture Overview**

- Frontend
  - App shell: `src/App.tsx` with routes; `src/main.tsx` setting Sentry boundary.
  - Search UI: `src/pages/SearchPage.tsx`; components under `src/components/Filters/*`, `src/components/Results/*`, `src/components/Search/SearchBar.tsx`.
  - State: `src/stores/searchStore.ts` for filters, some results; React Query in `src/hooks/useSupabaseSearch.ts` and `src/hooks/useSearch.ts`.
  - Error handling: Sentry (`src/lib/sentry.ts`) + multiple error boundaries in `src/components/Common/*Error*`.
  - Auth: `src/hooks/useEnhancedAuth.ts`, `src/components/Auth/ProtectedRoute.tsx`, `src/components/Auth/AuthModal.tsx`.

- Backend (Supabase)
  - Tables: `public.lessons`, `lesson_submissions`, `submission_reviews`, `duplicate_resolutions`, `user_profiles`, `user_invitations`, `lesson_archive`, etc.
  - Views: `public.lessons_with_metadata`, `public.user_profiles_safe`.
  - Indexes: Many GIN/BTree indexes on both JSON metadata and normalized array columns; duplicate trigram indexes.
  - Search: SQL function `public.search_lessons`; Edge Function `supabase/functions/smart-search` for synonyms/misspellings and suggestions.
  - RLS: Policies across all public tables; helper functions (`is_admin`, `has_role`, `is_reviewer_or_above`).
  - Triggers: Multiple triggers updating `lessons.search_vector`.

======================================================================

**Codebase Review (Findings + Recommendations)**

1) One App, Two Active Search Pipelines (+ a Ghost)
- Findings:
  - Pipeline A: `useSupabaseSearch.ts` calls SQL RPC `search_lessons` to fetch results (used by `SearchPage`).
  - Pipeline B: `useSearch.ts` calls Edge Function `smart-search` (synonym/misspelling expansion + results + suggestions). It falls back to a client‑side filter path if errors occur.
  - Ghost: Old Algolia pipeline remains in code (`src/hooks/useAlgoliaSearch.ts`, `src/lib/algolia.ts`, `src/types/algolia.ts`, `src/utils/facetHelpers.ts`) and scripts.
- Why this hurts:
  - More codepaths → higher risk of bugs, duplicated logic, inconsistent behavior (e.g., facet counts).
  - Confusing ownership: Results sometimes come from SQL, sometimes from Edge, sometimes from client‑side fallback.
- Recommendation:
  - Consolidate to one pipeline. Prefer SQL RPC for results + suggestions since you already have `expand_search_with_synonyms` and `expand_cultural_heritage` functions. Move suggestion generation fully into SQL (or keep the Edge Function but make it call the SQL function). The frontend should call a single hook that uses React Query `useInfiniteQuery` for paging.

2) Results State Stored Twice (Zustand + React Query)
- Findings:
  - Zustand store holds filters and results; React Query hooks also fetch/own results.
  - “Load more” path composes a different query than the initial page load (manual RPC vs hook), increasing drift risk.
- Why this hurts:
  - Two “sources of truth” for the same server data leads to out‑of‑sync bugs and complicated re-renders.
- Recommendation:
  - Let Zustand own only UI state (filters, sort, page size). Let React Query own all server results and pagination via `useInfiniteQuery`. This simplifies `SearchPage.tsx`: feed filters into one query hook; render, and call `fetchNextPage` for “load more.”

3) Filter Definitions Duplicated Across Files
- Findings:
  - `src/utils/filterDefinitions.ts` and `src/utils/filterConstants.ts` both define options/labels; components also hard-code lists.
- Why this hurts:
  - Changing a label/option requires touching multiple places; risk of mismatch.
- Recommendation:
  - Keep a single “filter definitions” source (e.g., `filterDefinitions.ts`) and consume it across UI components. Consider exporting both the data and helper functions.

4) Type Inconsistencies (lessonFormat and friends)
- Findings:
  - `SearchFilters.lessonFormat` is a string; some components treat it like an array. `ScreenReaderAnnouncer` accesses `lessonFormat[0]`. `FilterPills` includes `lessonFormat` among array-based filters.
- Why this hurts:
  - Subtle UI bugs; confusing UX; extra complexity in selection components.
- Recommendation:
  - Decide if the field is single‑select (string) or multi‑select (string[]). Given the UI, keep it single‑select string. Fix all references accordingly.

5) “Virtualized” Cultural Heritage Filter Isn’t Virtualized Yet
- Findings:
  - `VirtualizedCulturalHeritageFilter.tsx` is scaffolded for virtualization, but currently renders a standard list.
- Why this hurts:
  - Adds complexity without benefit; misleads maintainers.
- Recommendation:
  - Either finish with `@tanstack/react-virtual` or simplify to a standard list. Pick based on actual list size/perf profile.

6) Logging + Error Boundaries Are Heavy
- Findings:
  - `src/lib/sentry.ts` is thorough; `src/utils/logger.ts` adds redaction/sanitization; multiple error boundaries exist.
- Why this can be overkill:
  - More code paths and wrappers; higher learning curve; minimal end‑user benefit beyond a single top-level boundary + Sentry.
- Recommendation:
  - Keep Sentry and a single top‑level ErrorBoundary (already in `main.tsx`). Use a slim logger; remove extra layers unless a specific compliance need exists.

7) Duplicate Generated DB Types
- Findings:
  - `src/lib/database.types.ts` and `src/types/database.types.ts` are identical.
- Why this hurts:
  - Potential for divergence, confusion on which to import.
- Recommendation:
  - Keep one (suggest `src/lib/database.types.ts`). Update imports.

8) Legacy Algolia Artifacts Everywhere
- Findings:
  - Algolia hooks/types/client code and facet helpers; scripts to sync; UI references to facet counts.
- Why this hurts:
  - Dead weight; facet counts show zeros (since SQL path doesn’t supply them).
- Recommendation:
  - Remove all Algolia code. If facet counts are desired, implement them via SQL (see DB plan below).

9) Tests
- Findings:
  - UI tests cover SearchBar and some integration around filters; skipped tests acknowledge Headless UI modal quirks.
- Recommendations:
  - After consolidating search to `useInfiniteQuery`, add targeted integration tests around paging, filter interactions, and “no results + suggestions.”

======================================================================

**Database Review (Findings + Recommendations)**

1) Parallel Data Models (Columns + JSON) for the Same Fields
- Findings:
  - `lessons` stores normalized columns (arrays like `season_timing`, `core_competencies`, `cultural_heritage`, etc.) AND a `metadata` JSON with similar fields (often with different names or shapes).
  - The `lessons_with_metadata` view selects both columns and JSON derivatives (e.g., `activity_type_meta`, `location_meta`, etc.).
  - The `search_lessons` SQL function mostly filters on JSON paths (`metadata->...`) rather than the normalized columns.
- Why this hurts:
  - Double writes, double indexing, ambiguous query paths, more code to maintain. Increases write time and disk usage; errors creep in when the two copies diverge.
- Recommendation:
  - Standardize on normalized columns for filters. Update `search_lessons` to query the normalized arrays (`season_timing`, `core_competencies`, `cultural_heritage`, `activity_type`, `lesson_format`, `academic_integration`, `social_emotional_learning`, `cooking_methods`, etc.). Remove JSON-based filter conditions once migrated. This enables you to drop many JSON indexes flagged as unused.

2) Overlapping Search Vector Triggers
- Findings:
  - Triggers: `trigger_update_lesson_search_vector`, `update_lesson_search_vector_trigger`, and `update_lessons_search_vector`; functions `update_lesson_search_vector` and `update_search_vector`.
- Why this hurts:
  - Multiple triggers writing the same column increases risk of conflicts or extra work; complicates debugging and maintenance.
- Recommendation:
  - Keep one trigger + one function: `update_lesson_search_vector` calling `generate_lesson_search_vector` (clean, uses normalized arrays). Drop `update_search_vector` and its trigger(s).

3) Index Bloat, Duplicates, and Unused Indexes
- Findings:
  - Duplicate trigram indexes: `idx_lessons_title` and `idx_lessons_title_trgm` are identical; same for `summary`.
  - Many JSON-based indexes flagged “unused” by advisors. Also unused indexes on normalized fields that may never be queried directly.
- Why this hurts:
  - Slower writes, larger bloat, longer VACUUM/ANALYZE, more mental overhead.
- Recommendations:
  - Remove duplicate trigram indexes; keep one per field.
  - After migrating `search_lessons` to normalized arrays, drop JSON-path indexes on `metadata` (themes, cultures, SEL, etc.). Keep only the indexes used by the new query plan.
  - Add missing btree indexes on foreign keys flagged by the advisor (e.g., `resolved_by` on several tables).

4) Views and “Security Definer” Concerns
- Findings:
  - Advisors flag `lessons_with_metadata` and `user_profiles_safe` as “Security Definer View.” The raw definitions look like plain views; the linter is (over)protective. Either way, the big need is to not rely on a view that glues JSON and columns in a confusing way.
- Recommendation:
  - If possible, remove `lessons_with_metadata` and query directly from `lessons`. If you must keep it (compatibility), make sure it’s a normal view and used only for read convenience.

5) RLS Policies: Thorough but Costly
- Findings:
  - Many policies call `auth.*` per row and/or have multiple permissive policies for a role/action (e.g., `user_invitations`, `user_management_audit`, `lesson_submissions`, `user_profiles`).
- Why this hurts:
  - Per-row function evaluation reduces performance. Multiple permissive policies increase evaluation work and complexity.
- Recommendations:
  - Wrap calls as `(select auth.uid())` and `(select auth.role())` in policies to avoid re-evaluation. Merge overlapping permissive policies where feasible.
  - Add missing FK indexes to speed up RLS joins (e.g., on `reviewer_id`, `resolved_by`, `archived_by`).

6) Extensions Installed in `public`
- Findings:
  - `vector`, `pg_trgm`, `unaccent` installed in `public`.
- Why this hurts:
  - Best practice is to install extensions in a dedicated schema (e.g., `extensions`) to reduce risk and improve security posture.
- Recommendation:
  - Move extensions to the `extensions` schema and update search_path or explicit schema references.

7) Smart Search Placement (Synonyms + Hierarchy)
- Findings:
  - SQL functions exist to expand synonyms (`expand_search_with_synonyms`) and cultural hierarchy (`expand_cultural_heritage`).
  - Edge Function `smart-search` also performs expansion and OR logic.
- Recommendation:
  - Centralize synonyms and cultural expansion in the SQL `search_lessons` (or a `search_lessons_v2`) to keep the logic close to data + leverage indexes consistently. The Edge Function can be simplified or removed.

8) Facet Counts
- Findings:
  - The frontend still expects facet counts (a legacy of Algolia). Your SQL path doesn’t provide them.
- Recommendation:
  - If you want counts, add a companion SQL function (e.g., `search_facets(filters)`), or generate counts in the main RPC as an extra result set. For performance, consider a materialized view if counts will be reused across queries (or compute on the filtered scope per call for accuracy).

======================================================================

**Additional Improvements Worth Considering**

- Data Normalization/Quality:
  - Enforce a domain on `cooking_methods` and `activity_type` (e.g., via CHECK constraints); normalize “No‑cook vs Basic prep only” final decision. You have recent migrations addressing casing and consolidation; finalize and enforce at DB level.
  - Align naming across frontend constants and DB values exactly (e.g., `Garden Basics`, `Plant Growth`), to reduce mapping code.

- Performance Telemetry:
  - With `pg_stat_statements` enabled, track `search_lessons` query plans after migration and index trims; adjust GIN indexes accordingly.

- Generated Columns:
  - If you find any derived fields repeatedly computed at query time, consider generated columns (e.g., pre‑tokenized search text) to reduce function complexity. Balance with simplicity.

- Security Hygiene:
  - Make sure SQL functions with `SECURITY DEFINER` explicitly set `search_path` to a safe value; advisors flagged mutable search_path warnings. Add `SET search_path = pg_catalog, public, ...` at function start where appropriate.

======================================================================

**Execution Plan (Phased, With Recommendations Per Item)**

Phase 0 — Guardrails & Prep
- Add a feature flag to route all search calls to a new “v2” function without removing old code yet.
- Snapshot DB indexes and analyze current query plans (duration, rows, cache).

Phase 1 — Frontend Search Consolidation
- Implement one search hook using React Query `useInfiniteQuery`, e.g., `useLessonSearch`.
  - Inputs: filters from Zustand (UI only), page size.
  - Output: pages of `Lesson[]`, `totalCount`, `fetchNextPage`.
- Update `SearchPage.tsx` to use this hook for initial and “load more.”
- Remove results from Zustand store; keep only filters, sort, pagination config.
- Keep “suggestions” in this same hook: either from SQL RPC (preferred) or, temporarily, from Edge Function. Unify responses (`{ lessons, totalCount, suggestions? }`).

Phase 2 — Filter Definitions & Type Cleanups
- Single source for all filter options/labels: consolidate to `src/utils/filterDefinitions.ts`.
- Fix `lessonFormat` to be string everywhere (UI, types, pills, announcer).
- Normalize enums across code and DB (case and wording).
- Optionally add a small mapping util: display label -> canonical DB value (if they differ).

Phase 3 — Remove Algolia/Legacy Code
- Delete `src/hooks/useAlgoliaSearch.ts`, `src/lib/algolia.ts`, `src/types/algolia.ts`, `src/utils/facetHelpers.ts` (unless you keep facets helper for SQL responses).
- Remove NPM scripts that sync to Algolia and unused docs (or mark archived).
- Remove Algolia mentions in README and code comments.

Phase 4 — Database: New Search Function and Triggers
- Create `search_lessons_v2`:
  - Accept filters for all 11 categories (arrays for multi‑selects; strings for single‑select).
  - Perform synonyms and culture expansion via `expand_search_with_synonyms` and `expand_cultural_heritage`.
  - Filter using normalized columns (not JSON).
  - Order by relevance (`ts_rank`) then `confidence->overall` then title; apply pagination; return `total_count`.
- Update frontend to call `search_lessons_v2`. Keep old function around for a short migration window if necessary.
- Triggers:
  - Keep `update_lesson_search_vector` + `generate_lesson_search_vector`.
  - Drop `update_search_vector` function and its trigger(s).

Phase 5 — Index Hygiene
- Drop duplicate trigram indexes (`idx_lessons_title_trgm` OR `idx_lessons_title`, and same for summary).
- Drop JSON-based indexes flagged as unused once RPC queries no longer touch `metadata->…`.
- Add missing FK indexes for advisor warnings (e.g., `duplicate_resolutions.resolved_by`, `lesson_archive.archived_by`, `lesson_submissions.reviewer_id`, etc.).
- Re‑run advisors; ensure no critical lints remain.

Phase 6 — RLS Policy Tuning
- Change policies to use `(select auth.uid())` and `(select auth.role())` in WHERE/with_check to avoid per-row re-evaluation.
- Merge multiple permissive policies for the same role/action when logically possible, reducing the number of checks.
- Verify behavior for:
  - Teachers: own submissions/collections/bookmarks.
  - Reviewers/Admins: view/update submissions; manage duplicates.
  - Public: read-only lesson search.

Phase 7 — Extensions and Views
- Move `vector`, `pg_trgm`, `unaccent` to `extensions` schema; update search path or fully-qualified references.
- Remove `lessons_with_metadata` view if unnecessary; otherwise document its use as a pure read convenience (not for RLS bypass).
- Remove `user_profiles_safe` if duplicative; ensure any need is met via standard `user_profiles` with proper RLS.

Phase 8 — Facet Counts (Optional)
- If desired, add `search_facets(filters)`:
  - Compute counts for each facet within the filtered scope (excluding that category when computing its own counts for a true “drilldown” feel).
  - Return a lightweight counts object keyed by facet name.
- Integrate counts into the UI (replace Algolia-style zeros).

Phase 9 — Logging & Error Boundaries
- Keep Sentry initialization in `src/lib/sentry.ts` and top-level boundary in `src/main.tsx`.
- Remove extra error boundaries unless they provide unique UX.
- Slim logger: preserve minimal redaction and Sentry breadcrumb capture; remove deep-sanitization if not required.

Phase 10 — Duplicate DB Types and Cleanup
- Keep only `src/lib/database.types.ts`. Update imports and remove the duplicate copy.
- Clean up leftover `CLAUDE.md` files if redundant; keep docs that add real value.

======================================================================

**Risks, Validation, and Rollback**

- Risks:
  - Search behavior changes (result ordering or counts) when moving from JSON paths to normalized columns if values differ.
  - Dropping indexes could impact performance if a hidden dependency exists.
  - RLS policy changes can lock out legitimate operations if conditions are mistyped.

- Validation Steps:
  - Before/after snapshots: Run a representative set of searches and log result counts and timings (same filters).
  - Use `EXPLAIN ANALYZE` for `search_lessons_v2` to verify index usage and response times.
  - Run e2e flows: Teacher submission, Reviewer dashboard, Duplicate management.
  - Re-run Supabase advisors (security + performance) and ensure no ERROR-level issues remain.

- Rollback:
  - Keep `search_lessons` in place until `search_lessons_v2` is proven; maintain a feature flag toggling endpoints.
  - For indexes, drop in stages with a rollback script to re‑create if needed.
  - For RLS, change policies incrementally; test with seeded users (teacher, reviewer, admin).

======================================================================

**Acceptance Criteria**

- Frontend:
  - A single hook (`useLessonSearch`) drives initial results + pagination via `useInfiniteQuery`.
  - Zustand stores only filters/view state; results are not kept in the store.
  - Filters + types are consistent (e.g., `lessonFormat` as string) and defined in one file.
  - Algolia code and references removed; facet counts (if present) come from SQL.

- Backend:
  - `search_lessons_v2` returns correct results quickly using normalized columns; `search_lessons` retired.
  - Only one search vector trigger remains; search weight configuration uses array columns.
  - Duplicate and unused indexes removed; missing FK indexes added.
  - RLS policies avoid per‑row auth calls and reduce overlapping permissive policies.
  - Extensions moved out of `public`; views simplified or removed.

- Observability:
  - Sentry remains functional; logging is minimal and consistent.
  - `pg_stat_statements` indicates stable query performance post‑refactor.

======================================================================

**Appendix: Concrete Implementation Notes**

- Frontend Hook Shape (pseudo-code)
  - `useLessonSearch({ filters, pageSize })`:
    - Uses `useInfiniteQuery` with key `['lessons', filters, pageSize]`.
    - `getNextPageParam`: compute offset; call `search_lessons_v2(filters, page_size, page_offset)`.
    - Return `data.pages.flatMap(p => p.lessons)`, `totalCount` from first page, `fetchNextPage`, `hasNextPage`.

- Facet Counts Strategy
  - For each category, run `COUNT(*) GROUP BY value` on the filtered scope (excluding that category when computing its own counts for a true “drilldown” feel). Consider return shape:
    - `{ gradeLevels: { '3': n, '4': m, ... }, thematicCategories: { ... }, ... }`

- SQL Function Notes
  - Use `websearch_to_tsquery` or `plainto_tsquery` for user input; apply `unaccent` if needed.
  - Ensure `generate_lesson_search_vector` weights are sane: title A, summary B, tags/skills C, content_text D.
  - Avoid mixing JSON and columns; trust the normalized columns for filtering and rely on `search_vector` for text relevance.

- Index Notes
  - Keep:
    - GIN on `search_vector`
    - GIN on arrays you actually filter with: `grade_levels`, `season_timing`, `core_competencies`, `cultural_heritage`, `academic_integration`, `social_emotional_learning`, `cooking_methods`, `tags`, `garden_skills`, `cooking_skills`
    - Trigram GIN on `title`, `summary` (a single index each)
  - Drop:
    - JSON-path indexes on `metadata->...` once not used.
    - Duplicate trigram indexes.
    - Any advisor-flagged unused indexes that won’t be used by new queries.
  - Add:
    - Missing FK indexes flagged by advisors (on `resolved_by`, `archived_by`, `reviewer_id`, etc.).

- RLS Policy Template
  - Replace policy conditions like `auth.uid() = user_id` with `(select auth.uid()) = user_id`.
  - Merge policies per table/role/action where possible to reduce the count of permissive policies.
