Title: Phase 1C — Suggestions Path Unification

Summary
- Centralize suggestions into a dedicated React Query hook and render them from the results area when there are no results, reducing coupling and legacy code.

Decision
- Add `useLessonSuggestions` that calls the smart-search Edge Function and returns `{ suggestions, expandedQuery? }`.
- Render suggestions in `SearchPage` only when `filters.query` is non-empty AND current `totalCount === 0`.
- Deprecate `useSearch` (remove in Phase 3). Remove client-side fallback for suggestions.

Scope
- New: `src/hooks/useLessonSuggestions.ts`
- Update: `src/pages/SearchPage.tsx` (results area renders suggestions panel)
- Update: `src/components/Search/SearchBar.tsx` (remove dynamic suggestions block; keep quick searches)
- Types: add a small response type for smart-search
- Optional: env flag `VITE_ENABLE_SUGGESTIONS_V2`

Acceptance Criteria
- Suggestions appear only when no results for the current query; clicking a suggestion updates the query and refetches page 0.
- Suggestions are not shown if results exist.
- Edge Function error → suggestions hidden; no console noise.
- React Query cache keys include sanitized query + filters; no cross-contamination with list cache.

Test Plan
- Update integration tests to validate suggestions in the results area:
  - No results → suggestions shown; clicking refetches and renders new results.
  - Results exist → suggestions not shown.
  - Edge Function failure → no suggestions rendered (already covered by `lesson-search.suggestions.error.test.tsx`).
- Adjust SearchBar tests to focus on quick searches (static chips) and input behavior.

Risks
- Minor UI shift (panel location). Behavior clearer and more reliable. No production DB changes.

