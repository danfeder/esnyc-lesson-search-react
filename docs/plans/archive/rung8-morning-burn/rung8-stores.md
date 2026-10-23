# Rung 8 — src/stores/ (Zustand) findings

Run: 2026-07-03, read-only, main post-merge. Surface = `src/stores/` (single store: `searchStore.ts`, 216 lines) + its URL-sync counterpart. Audience calibration applied (15-person desktop internal tool).

Checked and CLEAN (for the record): URL serializer covers all 11 filter fields + sort (`src/utils/urlParams.ts:37-47` — no field can silently drop out of the URL); no `useSearchStore.setState/getState` bypasses anywhere in src; every filter-mutating action (setFilters/addFilter/removeFilter/toggleFilter/hydrateUrlState) resets `currentPage` — zero violations of the CLAUDE.md reset rule; the one-use written-token loop guard in `useUrlSync.ts:83-89` is correct (echo consumed, later identical external nav still hydrates); persist `partialize` correctly excludes filters/query/pagination.

## Findings (ranked)

### F1 — `viewState.currentPage` is a dead state field: written by 6 call sites, read by ZERO
- **Evidence:** Defined at `src/types/index.ts:65`, initialized `src/stores/searchStore.ts:76`. Written in setFilters (:93), hydrateUrlState (:117), addFilter (:130), removeFilter (:146), toggleFilter (:165), and `src/pages/SearchPage.tsx:138`. A full-src grep finds **no read** of `viewState.currentPage` anywhere — SearchPage selects only `sortBy`/`view`/`density`; pagination is React Query infinite scroll via `pageParam` (`src/hooks/useLessonSearch.ts:119,144`).
- **Failure scenario:** Not a runtime bug — it's maintenance hazard. The store CLAUDE.md rule ("setFilters must reset currentPage to 1", `src/stores/CLAUDE.md:31`) and the C58 comment block (`src/pages/SearchPage.tsx:131-137`, which itself admits the write only serves "any future paginated consumer") force every future action author to maintain a no-op invariant, and reviewers to flag "violations" of a rule with no observable effect. Test file spends assertions on it too (`searchStore.test.ts`).
- **Fix shape:** either delete `currentPage` from `ViewState` + all writes + the CLAUDE.md rule, or keep it and add one line to the rule saying it's currently unread (infinite scroll). Deleting is ~30 lines of pure removal.
- **Severity:** low (hygiene/dead-code), but it's the exact "dead state fields" target of this hunt.

### F2 — persisted layout state has no `version`/validation: stale localStorage unions rehydrate unchecked
- **Evidence:** persist config `src/stores/searchStore.ts:172-210` (key `esy-search-ui`) has no `version`/`migrate`; the custom `merge` (:200-209) spreads `persisted.viewState` over defaults with zero validation that `view ∈ {'list','grid','split'}` (`src/types/index.ts:60`) or `density ∈ {'comfy','compact','ultra'}` (:61).
- **Failure scenario:** any past/future rename of a `ResultView`/`ResultDensity` member (or a hand-edited/corrupt `esy-search-ui` blob) rehydrates an invalid value forever — it never self-heals because partialize keeps re-persisting it. Concrete: persisted `view:'table'` → `SearchPage.tsx:100-105` computes `isSplit=false`, `isGrid=false` → silently falls into the list branch while `data-view="table"` matches no CSS and the view switcher highlights nothing; persisted bad `density` → `data-density` matches no CSS, density switcher shows no active option. User-visible as "my layout buttons look broken" with no error.
- **Fix shape:** 3-line whitelist in `merge` (accept persisted value only if in the union, else default), or `version: 1` + migrate.
- **Severity:** low today (values have been stable; internal tool), but this is the classic partialize-staleness trap and the guard is 3 lines.

### F3 — 300ms store→URL debounce is cancelled on unmount: last filter toggle silently reverts on Back
- **Evidence:** `src/hooks/useUrlSync.ts:121-125` arms a 300ms debounce for store→URL writes; the unmount cleanup (:130-137) cancels a pending write without flushing it. `hydrateUrlState` (`src/stores/searchStore.ts:112-118`) is a FULL replace on the way back in.
- **Failure scenario (deterministic):** user toggles a filter and clicks a lesson card within 300ms → SearchPage unmounts → pending URL write cancelled → lesson detail → browser Back → search URL is the pre-toggle one → URL→store effect (`useUrlSync.ts:74-94`) full-replace-hydrates → the toggle the user made is silently gone and results refetch without it. Same applies to the query text if the last keystroke was <300ms before navigating.
- **Fix shape:** flush (not cancel) the pending write in the unmount cleanup — call the same `setSearchParams(buildSearchParams(filters, sortBy), { replace: true })` before clearing the timer (needs a ref to latest filters/sortBy), or shrink to sessionStorage-free flush-on-unmount.
- **Severity:** low-medium — narrow 300ms window, but it's real state loss on a core flow (filter → open lesson → Back) and Back is exactly the path this machinery exists to protect.

### F4 (minor) — `removeFilter` lacks the no-op guard `addFilter` has: absent-value removal still churns state
- **Evidence:** `addFilter` (`src/stores/searchStore.ts:121-135`) checks `!currentValues.includes(value)` before producing new state; `removeFilter` (:137-151) unconditionally builds a new filters object + new array + currentPage reset even when `value` isn't present. `toggleFilter` is fine (toggle semantics).
- **Failure scenario:** a stale pill / double-click dispatching `removeFilter` for an already-removed value forces a store write → SearchPage re-render → store→URL effect pass. No refetch (React Query hashes the key structurally, `useLessonSearch.ts:108`), so impact is render churn only.
- **Fix shape:** mirror addFilter's guard: `if (!currentValues.includes(value)) return state;`.
- **Severity:** trivial; symmetry/hygiene.

## Explicitly considered, not filed
- Sort-change page reset: `setViewState` doesn't auto-reset, but the only sortBy caller (`SearchPage.tsx:138`) passes `currentPage: 1` explicitly — and the field is dead anyway (F1).
- Echo-vs-pending-write race (`useUrlSync.ts:78-81` clears a pending B-write when A's echo lands): traced the ordering — React flushes the echo effect before the next user event can arm B, so the "B write cancelled forever" interleaving is not reachable in practice.
- `IntDataTable` density union mismatch (`'default'` vs store `'comfy'`): admin-pages-only component, not fed from searchStore — out of surface.
- toggle/add/remove called with `key='query'` (a string, not array): `Array.isArray` guard makes it a silent no-op; type allows it but no caller does it.
