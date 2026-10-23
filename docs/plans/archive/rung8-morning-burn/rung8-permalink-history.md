# Rung 8 — PR #594 feat/d2-lesson-permalinks — history/URL semantics hunt

Status: COMPLETE (branch `origin/feat/d2-lesson-permalinks`, head `9700988`)
Scope: navigation sequences NOT covered by the PR's tests (`search-page.permalink.test.tsx` covers: deep-link fast path, by-id fallback, not-found, error+retry, open-push/close, browser-Back close, split click-through on deep-link landing, no-refetch seam). None of its tests change a filter or sort while a lesson is open, none exercise the `/search` alias, none race the urlSync debounce against open.

## Finding 1 (main) — urlSync's `setSearchParams` drops `location.state`, silently destroying the `fromSearch` mark whenever filters/sort change while a lesson is open

- **Where:** `src/hooks/useUrlSync.ts:126` — `setSearchParams(buildSearchParams(filters, sortBy), { replace: true })` passes no `state`, so React Router replaces the current history entry with `state: undefined`. Consumed at `src/pages/SearchPage.tsx` (`cameFromSearch` read of `location.state.fromSearch`, and `handleCloseLesson` branching on it — the D2 §2b block).
- **Failure sequence (split view, the desktop default surface — sidebar stays interactive while the pane is open):**
  1. On `/?q=x`, click lesson A → push `/lesson/A?q=x` with `state={fromSearch:true}`.
  2. Toggle any facet (or sort) in the sidebar → 300ms later urlSync replaces the entry to `/lesson/A?q=x&facet=y` **with state wiped** → `cameFromSearch` is now `false`.
  3. Click Close → takes the deep-link branch: `navigate({pathname:'/',search},{replace:true})` instead of `navigate(-1)`.
- **Concrete damage:** the entry the code pushed is never popped; history becomes `[/?q=x (stale filters), /?q=x&facet=y]`. Pressing Back from the closed list now *re-applies the pre-toggle filters* (urlSync URL→store hydration reverts the user's facet change) instead of leaving the search — exactly the "history garbage" the D2 §2b comment claims close avoids. Corollary symptom: if the session started on the `/search` alias, close also silently flips the pathname to `/`.
- **Coverage gap:** no test changes a filter/sort while `/lesson/:id` is open. The "close returns to /" test (`search-page.permalink.test.tsx:219`) only exercises the unpolluted push→pop path.
- **Fix shape:** propagate state through urlSync writes — `setSearchParams(next, { replace: true, state: location.state })` (or read `fromSearch` from the current `window.history.state` at close time instead of relying on entry state surviving all replaces).

## Finding 2 — pending urlSync debounce fires ON the pushed `/lesson/:id` entry: stale permalink search string + same state-wipe with no explicit "filter change while open"

- **Where:** `src/pages/SearchPage.tsx` `handleOpenLesson` (uses `location.search` at click time) vs `src/hooks/useUrlSync.ts:118-128` (300ms debounce, timer only cancelled when `searchParams` changes — a pathname-only push keeps the same `location.search` string, so React Router's memoized `searchParams` object doesn't change and the URL→store effect that clears the pending timer never re-runs; the pre-push timer survives).
- **Failure sequence (any view):** toggle a facet → within 300ms click a lesson.
  1. Push goes to `/lesson/A?<OLD search string>` — the address bar / "copy link" briefly carries pre-toggle filters (minor).
  2. The surviving debounce then `setSearchParams`-replaces that entry to the new filter string **and wipes `fromSearch` (Finding 1)** — so a user who merely clicked quickly, never touching anything while the drawer was open, still gets the degraded close semantics (replace-to-`/` + stale-filter entry left under them, Back reverts their toggle).
- **Coverage gap:** all tests open lessons with the URL already settled; nothing races the debounce window.

## Finding 3 — filtering the open lesson OUT of the results flips the open pane to a spurious "Loading lesson" (and can flip it to an error) for content already on screen

- **Where:** `src/pages/SearchPage.tsx` D2 §2c block — `lessonFromResults = lessons.find(...)`, `useLessonById(..., { enabled: !!routeLessonId && !lessonFromResults && !isPending })`, `paneStatus` derivation. Interacts with `useLessonSearch.ts:161` `placeholderData: keepPreviousData` (so `isPending` stays false on refetch).
- **Failure sequence (split view):** open lesson A via click (fast path — by-id query never ran, so no cached `['lesson', A]` data) → while A's details are displayed, change the query/facets so A is excluded from the new results → new page lands → `lessonFromResults` becomes null → `openedLesson` null → `paneStatus='loading'` → the fully-rendered detail pane is replaced by the loading spinner and a by-id network fetch fires for a lesson that was just on screen; it re-renders after the round-trip. If that fetch fails (offline blip), an already-viewed lesson turns into the error pane.
- **Coverage gap:** tests cover deep-link loading and by-id error, but never open-from-results followed by a result-set change; nothing pins "an open lesson stays rendered when it drops out of the list."
- **Fix shape:** keep the last resolved `openedLesson` for the current `routeLessonId` (ref/`useMemo` latch) or seed the `['lesson', id]` query cache from `lessonFromResults` at open time.

## Checked and NOT filed (clean)

- `/search` alias route exists on the branch (`src/App.tsx:106`) and shares the SearchPage element; store→URL writes keep the `/search` pathname (setSearchParams preserves pathname). Alias-pathname flip on close only occurs via Finding 1's state loss or a deliberate deep-link close (by design → `/`).
- Back/Forward zigzag (`/` → push A → Back → Forward → close): entry state survives history traversal and reload (`history.state.usr`), `navigate(-1)` lands correctly.
- Split click-through A→B→C replace-chain propagates `fromSearch` correctly, including the deep-link-landing `false` case (pinned by the PR's own test at line 275).
- `encodeURIComponent(lesson.lessonId)` vs decoded `params.lessonId` comparison — React Router decodes params, IDs match.
- urlSync one-use echo token vs the pushed navigation: pathname-only push doesn't re-fire URL→store (memoized on `location.search`), so no spurious hydration (pinned by the PR's seam test).
- `useLessonById` mirrors public visibility (`retired_at IS NULL`) — retired lessons don't resurrect via permalink.
