# Rung 8 — src/hooks/ audit (excl. useEnhancedAuth/useFacetCounts/useLessonById)

Run: 2026-07-03, main @ 0ed0d5d. Hunt: stale closures/dep arrays, races, error swallowing, dead options.
Files covered: useDebounce.ts, useLessonSearch.ts, useLessonStats.ts, useLessonSuggestions.ts, useMediaQuery.ts, useUrlSync.ts (+ urlParams.ts/searchStore.ts as their contracts).

## Findings

### F1 — useLessonSuggestions `limit: 0` is a dead option; smart-search coerces it to 20 and runs a full discarded search per keystroke
- **Where:** `src/hooks/useLessonSuggestions.ts:61` (`limit: 0` with comment "no need for paging here; we only need suggestions") vs `supabase/functions/smart-search/index.ts:125`:
  `const limit = Math.min(100, Math.max(1, Math.floor(Number(body.limit) || 20)));`
- **Defect:** `Number(0)` is falsy, so `0 || 20` → 20; `Math.max(1, …)` also forbids 0 by design. The hook's intent (skip result fetching, suggestions only) never reaches the server.
- **Failure scenario:** every debounced keystroke on SearchPage fires a suggestions request; smart-search executes the FULL lesson search with pagination (`applyPagination`, index.ts:164) and count query for 20 rows, serializes them, and the client throws the rows away (`useLessonSuggestions` reads only `suggestions`/`expandedQuery`). Pure wasted DB + edge + payload work on the hottest interactive path; no user-visible breakage, but the option is dead and misleading.
- **Verdict:** CONFIRMED (code read, both sides).

### F2 — useLessonSuggestions swallows edge-function errors AND caches the failure as a fresh SUCCESS for 5 minutes, with zero logging
- **Where:** `src/hooks/useLessonSuggestions.ts:65-68` (`if (error) { return { suggestions: [] }; }`) combined with `staleTime: 5 * 60 * 1000` at line 36.
- **Defect:** returning instead of throwing converts a transient `supabase.functions.invoke('smart-search')` failure (edge cold-start 5xx, network blip, CORS hiccup) into a successful query result. React Query caches `{suggestions: []}` as fresh for that queryKey for 5 minutes — its retry machinery only triggers on thrown errors, so there is no retry and no background refetch even after the network recovers. And there is no `logger.debug`/`logger.error` call, so the failure is invisible in dev tools and Sentry.
- **Failure scenario:** user types "tomato"; the first suggestions call hits an edge cold-start error → suggestions silently absent. User keeps the same query (or returns to it within 5 min) → still no suggestions despite the function being healthy again. Undiagnosable in the field because nothing is logged.
- **Suggested shape:** keep the UI quiet by throwing + `retry: 1` and letting the consumer ignore `isError` (or at minimum `logger.debug` the error and use a short `staleTime`/`gcTime` for the empty-fallback result).
- **Verdict:** CONFIRMED (code read; React Query v5 semantics).

## Non-findings / near-misses checked (so the next auditor doesn't re-chase them)

- **useUrlSync.ts** (140 lines) — the intricate one; came out clean. Chased hard:
  - Hypothesis: `parseSearchParams` (urlParams.ts:148) drops an ENTIRE array param when raw length > `MAX_PARAM_LENGTH` (1000), while `buildSearchParams` caps only item COUNT (50), not joined length — and `hydrateUrlState` is a FULL replace (`searchStore.ts:112-118`, `{...initialFilters, ...urlFilters}`). If reachable, the echo of our own write would fail the one-use token match and wipe the user's selections 300ms after selection. **Not reachable:** measured max joined length of every public filter's complete vocabulary — culturalHeritage (31 values incl. hierarchy children) = 355 chars; largest others: coreCompetencies 203, thematicCategories 96; all ≪ 1000. Only hand-crafted URLs can trip it, where dropping is intended. Note: the build-side comment's claimed invariant ("never emit a URL longer than it will accept on read", urlParams.ts:73-75) holds empirically, not structurally — if a future vocab grows a filter's full join past 1000 chars, the selection-wipe bug above goes live. Worth a one-line comment or a test asserting the vocab-join bound, but not a live bug.
  - Echo-token race matrix (write→echo, write→re-toggle inside debounce, Back-during-pending-write, StrictMode double-invoke, toggle-and-revert): all handled correctly by the one-use token + timer-clear in the URL→store effect (useUrlSync.ts:78-86) + `next === current` no-op guard (line 106).
  - Intentional dep-array omissions (lines 93, 126) are sound: `searchParams` read inside the store→URL effect can only be stale in scenarios where the URL→store effect has already cancelled the pending write.
- **useLessonSearch.ts** — queryKey uses raw `filters` while queryFn uses derived `cleanedQuery`/`effectiveGradeLevels`, but derivation is pure from `filters` so caching stays correct (as its comment claims). All 10 SearchFilters array fields ARE forwarded to the RPC — no dead filter options. `getNextPageParam` totalCount-from-last-page logic terminates correctly on an empty overshoot page. `enabled`/hydration gating consistent with useUrlSync.
- **useLessonStats.ts** — fetch-once-per-App-mount is fine for a stats widget; error path logs via `logger.error` and sets `error` state. No unmount guard, but React 18 makes post-unmount setState harmless and App-level mount makes it unreachable in practice. Not worth a fix.
- **useDebounce.ts / useMediaQuery.ts** — textbook-correct (cleanup present, `query` change resubscribes + re-syncs, jsdom-safe guard). No findings.
- **Search input debounce gap** ruled out: `useDebounce`'s only consumer is AdminUsers, but the public search box debounces inside `src/components/Layout/Header.tsx` before writing to the store (and useLessonSearch's `keepPreviousData` covers refetch flashes).
- **Skipped as already tracked:** facet-count mismatch (FP-01), anything in useEnhancedAuth/useFacetCounts/useLessonById (covered tonight), mobile/a11y.

## Summary

2 confirmed findings, both in `useLessonSuggestions.ts` (one shared with `smart-search/index.ts`), both low-severity/quality-of-implementation: a dead `limit: 0` option causing wasted full-search work per suggestions request, and error-swallowing that caches transient failures as 5-minute successes with no logging. Everything else in the surface is clean, including the deliberately intricate useUrlSync loop guards.

## Verification (round 2)

Adversarial re-check of F1 + F2, 2026-07-03, main @ 0ed0d5d. Traced hook → `supabase.functions.invoke` semantics → `smart-search/index.ts` → `_shared/search-helpers.ts` → the sole consumer `src/pages/SearchPage.tsx:76-80,196-228`.

### F1 — CONFIRMED, with two corrections to the fix shape

- **Coercion math verified:** `src/hooks/useLessonSuggestions.ts:61` sends `limit: 0`; `supabase/functions/smart-search/index.ts:125` computes `Number(0)`→0 (falsy) → `0 || 20`→20; `Math.max(1, …)` independently forbids anything <1. `limit: 0` → 20 rows. Confirmed.
- **Wasted-work claim verified:** per debounced query change (300ms debounce in `Header.tsx:177` — "per debounced keystroke" is accurate; each change also fires the separate `search_lessons` RPC via useLessonSearch, so smart-search is pure duplicate work), smart-search runs the synonyms-table fetch (index.ts:151), the full `lessons_with_metadata` query with `count: 'exact'` + textSearch + all filters + `range(0,19)` (index.ts:129-166), serializes 20 full rows, and the hook reads only `suggestions`/`expandedQuery`. Confirmed.
- **Correction 1 — the discarded search is partially LOAD-BEARING server-side:** `suggestions` are only populated when `lessons.length === 0` (index.ts:177). "Make the server honor limit:0" is NOT a safe fix: `applyPagination` (search-helpers.ts:106-113) would emit `range(0, -1)` (invalid range → PostgREST error), and a 0-row fetch would make `lessons.length === 0` unconditionally true, changing suggestion semantics.
- **Correction 2 — the minimal correct fix is client-side `limit: 1`:** semantics are provably identical (count>0 ⇒ lessons.length=1≠0 ⇒ suggestions empty, same as today because the server only suggests on zero results; count=0 ⇒ suggestions returned), while row payload/serialization drops 20×. The `count: 'exact'` work is unavoidable without a server change; a real server fix would be a `suggestionsOnly` mode using a `head: true` count-only query. Round 1's framing ("the option is dead and misleading") stands; its implied fix ("skip result fetching") needs the above care.

### F2 — CONFIRMED, with the user-visible window narrowed (which actually sharpens it)

- **Mechanics verified:** `useLessonSuggestions.ts:65-68` returns `{ suggestions: [] }` instead of throwing → React Query success; `staleTime: 5*60*1000` (line 36) / `gcTime` 10min (line 37) cache it fresh; RQ retry/refetch-on-focus machinery only engages on thrown errors / stale data, so no retry and no background refetch for 5 min. No logger import exists in the file — zero observability. Confirmed.
- **All failure modes route through the swallow:** `supabase.functions.invoke` returns `{data: null, error}` for both non-2xx (`FunctionsHttpError` — incl. smart-search's own 500 catch-all at index.ts:195-206, reachable via e.g. tsquery-breaking special characters in the user's query since `buildSmartSearchQuery` interpolates raw terms into `term:*` parts) and network failures (`FunctionsFetchError`); it does not throw. So the swallow is total, not partial. Confirmed.
- **Scenario correction:** round 1's "user types tomato → suggestions silently absent" overstates visibility. The panel renders ONLY in the zero-results state (`SearchPage.tsx:196-200` gates on `!isPending && !isPlaceholderData && totalCount === 0 && hasQuery && suggestions.length > 0`, and the server only populates suggestions when its own search returns 0 rows, index.ts:177). For "tomato" (has results) the loss is invisible regardless of the error. **Sharper true statement:** the suggestions feature exists solely for the typo/no-results recovery moment, and this bug removes it exactly then — a user whose misspelled query hits an edge blip gets a bare "no results" with no recovery pills, cached for 5 min (same query + same 10 filter arrays in the queryKey; changing any filter mints a new key and escapes the cache).
- **Fix shape verified safe:** the sole consumer destructures only `data` (SearchPage.tsx:76), so throwing (+ explicit `retry: 1` — RQ v5 default retry is 3, worth pinning down) requires zero consumer changes; UI stays quiet on `isError` automatically.

**Verdict: both findings stand as CONFIRMED. F1's fix guidance amended (limit:1 client-side, or a real suggestionsOnly server mode — never "honor limit:0"); F2's failure scenario narrowed to the no-results recovery path, severity unchanged.**
