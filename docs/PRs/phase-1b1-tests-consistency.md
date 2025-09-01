Title: Phase 1B.1 — Test Consistency + Suggestions Error Path

Summary
- Small follow-up to Phase 1B focused on testing consistency and one additional error-path:
  - Introduce `makeLesson` factory for app-level Lesson objects; use it in an older test
  - Add error-path integration test for smart-search suggestions failing (falls back cleanly)

Scope
- Tests only; no production code changes.
- Files changed/added:
  - `src/__tests__/helpers/factories.ts` (add `makeLesson`)
  - `src/__tests__/integration/search-flow.test.tsx` (use `makeLesson`)
  - `src/__tests__/integration/lesson-search.suggestions.error.test.tsx` (new)

Details
- Factories: Standardize test data shapes across UI/store tests and RPC-rows
- Suggestions error case: Mocks `supabase.functions.invoke` to return error and verifies no suggestions panel is rendered; confirms fallback path via `supabase.from('lessons_with_metadata').select` is executed

Test Plan
- `npm run test` or `pnpm test`
- Affected tests:
  - search-flow: uses app-level factory; behavior unchanged
  - suggestions.error: validates error path and UI state

Risks
- None; tests only. These changes reduce duplication and improve reliability.

