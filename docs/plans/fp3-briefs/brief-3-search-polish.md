# Brief 3 — Search-page polish + honest copy (FP-19, FP-12/13, FP-08, chooser, Clear-all, hook/urlSync follow-ups)

**Executor:** fresh Opus session. **Read first:** this brief; decisions in
`docs/plans/2026-07-03-fable-design-session.md` (§D-E for Clear-all); finding detail in
`docs/plans/rung8-morning-burn/` (`rung8-hooks.md`, `rung8-permalink-history.md`,
`rung8-stores.md` F3, `rung8b-filter-ui.md` F1). Hand back: one-line status + PR link(s).
Ship as **1–3 small PRs grouped by file overlap** (suggested: ① copy/tokens/404,
② SearchPage+hooks, ③ urlSync) — executor's call.

## Scope

### FP-19 — search transparency (owner: YES)

- **"Including matches for…" synonym hint**: when the engine expanded the query
  (synonyms/related terms), show a quiet hint naming the extra terms. The expansion is
  already returned by `smart-search` (`expandedQuery`); today nothing on screen uses it.
  Keep it one line, dismiss-free, plain language.
- **"No more results to load" noise**: suppress the footer when the full result set fits
  without pagination (owner saw it under 5 results). Already queued; no decision needed.

### FP-12 / FP-13 — dead ends (owner: YES)

- Real **404 page** for unknown routes (incl. stale bookmarks to deleted admin pages):
  friendly copy + link back to search. Catch-all route in `src/App.tsx`.
- **Search error card**: replace raw technical text with a plain-language message + a
  **Retry** button (`SearchPage` error state).

### FP-08 — darken the light-gray text tokens (owner: YES)

Darken the 2–3 offending color tokens app-wide (computed ratios in
`docs/plans/fp1-audit/audit-mobile-a11y.md` F4+F5). Named instances: card grades line,
"No more results to load" footer, sidebar counts, and the submission-form share hint
("Anyone with the link (Viewer)") — the worst case. Token change only; no layout edits.

### Chooser reassurance line (owner: YES)

On the New-vs-Update chooser (`SubmissionPage`), add:
`Not sure? Pick either — a reviewer checks everything.` Copy-only.

### Clear-all fix (owner decision D-E, 2026-07-03)

The Filters panel's "Clear all" currently also wipes the typed search query and sort
(rung8b-filter-ui F1). Change it to clear **filters only** — query + sort survive.

### Rides — same files, confirmed findings

- `useLessonSuggestions` (rung8-hooks F1/F2): the `limit: 0` option is dead (server
  coerces to 20 → a full discarded search per keystroke) — send the smallest honest
  request the server allows, or add a true suggestions-only path if trivial; and stop
  caching invoke-errors as 5-minute successes (throw + `retry: 1`, or log via
  `logger` + short staleTime). Keep the UI silent on suggestion errors.
- urlSync/permalink follow-ups (rung8-permalink-history F1/F2/F3): `setSearchParams`
  drops `location.state` (kills `fromSearch`) on filter change while a lesson is open;
  the pending debounce fires on the pushed `/lesson/:id` entry; filtering the open
  lesson out of results flips the pane to a spurious "Loading lesson". Fix all three.
- searchStore debounce cancelled on unmount → last filter toggle silently reverts on
  Back (rung8-stores F3): flush instead of cancel.

## Out of scope

Facet counts (Brief 1/5), drawer/labels (Brief 2), admin fail-open screens (parked),
logger redaction bug (parked).

## Verification

- `npm run check` + `npm run test:run` + `npm run build` green; regression tests for the
  Clear-all semantics, the suggestions error path, and at least F1 of the urlSync trio.
- Preview drive: search `tomato` → synonym hint appears when expansion happened; bad URL
  → 404 page; simulated search failure → friendly card + working Retry; chooser shows
  the new line; Clear-all keeps the typed query.
- Full 4-surface bot triage per PR.

## Gate

Frontend-only; no PROD gate. **Owner merges.**
