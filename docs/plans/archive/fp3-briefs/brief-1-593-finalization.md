# Brief 1 — Finalize PR #593 (true facet counts) for owner merge

**Executor:** fresh Opus session. **Read first:** this brief, then
`docs/plans/2026-07-03-fable-design-session.md` §D-A/D-B (the locked decisions).
**Do not re-litigate any decision.** Hand back: one-line status + PR link.

## Context (30 seconds)

PR #593 (`fix/fp01b-true-facet-counts`) fixes the lying filter badges by fetching the 10
facet columns once per session and counting the whole live corpus client-side. It was
HELD pending the owner's counts-convention decision — now made: **ship the standard
convention exactly as the branch builds it**, plus two small additions below. The branch
is CONFLICTING vs main (it shared hunks with merged #594/#592).

## Scope (exactly this)

1. **Rebase onto main; resolve conflicts.** Both-touched files:
   `src/pages/SearchPage.tsx`, `src/__tests__/integration/search-page.test.tsx`,
   `src/__tests__/integration/search-page-split-view.test.tsx`, `src/styles/internal.css`.
   Conflicts come from merged #594 (permalinks: SearchPage + tests) and #592 (CSS sweep).
   Resolution rule: keep BOTH features' behavior — #594's permalink wiring and this
   branch's counts wiring are additive.
2. **Add the approved explainer line** to the sidebar (small, gray, unobtrusive; bottom
   of the filter sidebar): exact copy `Numbers show how many lessons carry each tag.`
3. **Add zero-row dimming**: when counts are loaded and an option's count is 0, dim the
   row (reduced opacity via a CSS class on `.int-check` / grade pill). Constraints: row
   stays clickable; **a checked/active option never dims**; blank-while-loading behavior
   unchanged (D-4 in the branch comments).
4. **Optional riders (only if trivially clean):**
   - Remove the dead string branch in `IntSidebar.activeCountFor` (rung8b-filter-ui F4).
   - Add a code-comment pointer for the LATENT heritage predicate divergence
     (client normalizes stored heritage values via `aliasToSlug`; server matches
     verbatim labels — zero live rows affected today). Do NOT change matching behavior.
     Detail: `docs/plans/rung8-morning-burn/rung8-facet-parity.md` F1.

## Out of scope

Main Ingredients counts (Brief 5), any convention change, query-aware badges, location
checkbox relabel (Brief 2 — but note its FP-18 change depends on this PR's
`expandLocationSelection` staying intact).

## Verification (before handing to owner)

- `npm run check` + `npm run test:run` + `npm run build` green locally (all three, no
  skipping).
- On the deploy preview, spot-check badges against these PROD-verified numbers
  (2026-07-03; re-probe PROD read-only at execution time — small drift OK, 30× is not):
  Indoor **607** (indoor+both), Cooking **394**, Winter ~324, grade K **284**, grade 4
  **307**. With Garden checked: results 284; Cooking badge still 394; checking Cooking →
  623 results.
- Zero + dimming: pick Winter + a sparse theme to force a real 0; confirm `0` renders
  and the row dims; confirm a checked row does not dim.
- Full 4-surface bot triage on the PR (issues/PR comments + reviews + review comments);
  written rebuttal or fix per finding.

## Gate

Frontend-only; no PROD gate. **Owner merges** — post the one-line hand-back and stop.
