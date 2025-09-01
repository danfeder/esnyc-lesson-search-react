# Phase 1A: Unify Search via useInfiniteQuery + Initial Tests

## Summary
This PR is the first incremental step of the Architecture Cleanup plan. It unifies the frontend search pipeline around a single React Query `useInfiniteQuery` hook, refactors the SearchPage to use it for both initial results and pagination, and adds initial integration tests for paging and error handling.

## Changes
- Add `useLessonSearch` (useInfiniteQuery) in `src/hooks/useLessonSearch.ts`
- Refactor `src/pages/SearchPage.tsx` to use `useLessonSearch` for initial + load-more paths
  - Zustand retains only UI state (filters, view); results are owned by React Query
  - `InfiniteScrollTrigger` now calls `fetchNextPage`
- Add `src/__tests__/integration/lesson-search.infinite.test.tsx`
  - Covers initial page render, load more, and error display
- Update `docs/architecture-cleanup-guide.md` progress (Phase 1 items marked complete)
- Phase 0 preparatory changes already in tree:
  - RPC flag & helper: `VITE_ENABLE_SEARCH_V2` and `src/lib/search.ts`
  - DB baseline snapshot: `docs/db-baseline-2025-09-01.md`

## Not in this PR
- Removal of Algolia code (Phase 3)
- Single source of filter definitions & type cleanups (Phase 2)
- SQL `search_lessons_v2` (Phase 4)
- Additional tests: filter-change invalidation, suggestions integration

## How to test
1. `npm run test` – run the new integration tests.
2. Manual check in dev:
   - `npm run dev`
   - Open the app, perform a search, scroll to load more. Verify smooth paging.

## Rollout Notes
- No behavior changes to RPC names in this PR; calls are routed through `getSearchRpcName()` to maintain compatibility and prepare for v2.
- Subsequent PRs will handle filter/type consolidation and removal of Algolia remnants, then introduce `search_lessons_v2` and index/policy cleanup.

## Related Docs
- `docs/architecture-cleanup-guide.md` – Progress tracker updated.
- `docs/db-baseline-2025-09-01.md` – Baseline for future DB refactors.
