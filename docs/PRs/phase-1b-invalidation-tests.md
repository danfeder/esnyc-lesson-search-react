Title: Phase 1B — Search Invalidation + Cache-Key Tests

Summary
- Add integration tests to ensure the unified `useLessonSearch` + `SearchPage` correctly:
  - Resets pagination to page 0 and refetches when filters change.
  - Uses distinct React Query cache keys when `resultsPerPage` changes (page size), refetching with `page_offset = 0`.

Scope
- Tests only; no production logic changes.
- Files added:
  - `src/__tests__/integration/lesson-search.invalidation.test.tsx`
  - `src/__tests__/helpers/factories.ts` (shared test factories)

Test Plan
- Filter-change invalidation:
  1) Render `SearchPage` with `resultsPerPage = 2`, return 2 items.
  2) Trigger load-more (moves to offset 2).
  3) Call `useSearchStore.getState().setFilters({ gradeLevels: ['5'] })`.
  4) Expect a new RPC call with `page_offset = 0` and `filter_grade_levels = ['5']`; verify new results render.

- Cache-key isolation (page size):
  1) Render `SearchPage` with `resultsPerPage = 2`, return 2 items.
  2) Change view state to `resultsPerPage = 3`.
  3) Expect a new RPC call with `page_size = 3` and `page_offset = 0`; verify 3 results render.

How to Run
- `npm run test` (or `pnpm test`) — uses Vitest + RTL.
- Tests mock `supabase.rpc` via `@/lib/supabase`.

Changelog (since PR opened)
- Added shared factories for consistent, typed mock data.
- Switched suggestions test to mock `supabase.functions.invoke` (smart-search) rather than overriding `useSearch`.
- Fixed Prettier/ESLint formatting flagged by CI.

Risks
- None to production code; tests assume `getSearchRpcName()` returns `'search_lessons'`.

Checklist
- [x] Tests added and pass locally
- [ ] CI green
- [ ] PR reviewed and merged
