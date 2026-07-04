# FP4 Brief 3 — Close-lesson filter revert fix (M)

Read `docs/plans/fp4-briefs/README.md` (standing rules) first. Evidence: **C5/FP4-SP-01**
in `docs/plans/fp4-discovery/discovery-evidence.md` — Fable re-traced the mechanism in code
2026-07-03 and confirms it.

## The bug (real, new)

Desktop split view (≥1100px): open a lesson → the sidebar stays interactive → toggle a
facet or change sort → results update → close the lesson → **the change silently reverts**.

Mechanism: `handleOpenLesson` PUSHes `/lesson/:id` (entry2). While open, the store→URL
debounced write (`useUrlSync.ts:168-171`) uses `replace:true`, landing changes on entry2.
`handleCloseLesson` (`SearchPage.tsx:227-233`) does `navigate(-1)` → pops to pre-open
entry1, whose old URL full-replaces the store (`hydrateUrlState`, searchStore.ts:130-136).
The change is lost whether the debounce fired or not. This is NOT the (already fixed)
toggle-then-open case — no flush() placement can cure it, because `navigate(-1)` discards
the entry the change was written to.

## Design ruling (Fable, locked — do not re-open)

Close = "dismiss the overlay, keep my current filter context." Hybrid implementation so the
common case is byte-identical to today:

1. **Capture at open:** `handleOpenLesson` already builds the pushed search from live
   filters (`SearchPage.tsx:217`). Also carry that canonical string on the pushed entry's
   history state, e.g. `state: { fromSearch: …, openedSearch: <string> }`.
2. **At close**, compute `current = buildSearchParams(filters, viewState.sortBy).toString()`:
   - `cameFromSearch && current === openedSearch` → `navigate(-1)` exactly as today
     (unchanged history shape for the open→close-without-touching-anything case).
   - `cameFromSearch && current !== openedSearch` → `navigate({pathname:'/', search:
     current}, { replace: true })` — replaces the LESSON entry with the live-context list
     entry. Pre-open entry1 stays one Back-press below, so browser Back = "undo my filter
     change", the same semantics as any other filter change.
   - **Deep-link branch** (`!cameFromSearch`): keep the replace shape but build from
     `current` (live canonical) instead of `location.search`, which can be debounce-stale.
     Fresh-tab safety (no history to pop) is preserved — this branch never navigates -1.
3. No `flush()` needed in close — we navigate to the canonical state explicitly; landing on
   a URL equal to canonical store state makes the URL→store hydrate a no-op. Verify that
   equivalence in tests rather than assuming it.

## Tests (extend the existing suites — `useUrlSync*.test.tsx`, `search-page.permalink.test.tsx`)

1. Open → toggle facet → close: toggle survives, URL is `/?…&facet`, list refetches with it.
2. Open → close untouched: history popped exactly as today (assert via history index/length).
3. Open → toggle → close → browser Back: returns to pre-open filter state.
4. Deep-link landing → close: replaces to list carrying live filters; no navigate(-1).
5. Sort-change-while-open variant of (1).

## Caution

The `useUrlSync` history code is intricate and has bitten before (the B3 unmount-flush
clobber was caught only by an adversarial pre-push review). **Run a
`feature-dev:code-reviewer` pass on the diff BEFORE pushing**, prompt it specifically at
history-entry shapes, the debounce cancel-on-pop path (`useUrlSync.ts:121-124`), and the
loop-guard (`lastWrittenRef`) interaction with the new close navigation.

`npm run check` + `npm run test:run` before the PR. Frontend-only; owner merges.

## STOP conditions

Any history behavior you cannot make match the ruling without touching `useUrlSync`'s
URL→store hydrate contract; any new cross-route regression like the B3 clobber; any design
fork. "STOP = write the hand-back and END YOUR TURN; design forks route to Fable; the owner
only answers explicit approvals (data fix / merge / gates)."
