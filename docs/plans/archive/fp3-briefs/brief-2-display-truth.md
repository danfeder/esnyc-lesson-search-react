# Brief 2 — Display truth: FP-16 + FP-17 + FP-18 + grades-sort fix

**Executor:** fresh Opus session. **Read first:** this brief;
`docs/plans/2026-07-03-fp2-handoff.md` "Approved build work" for the owner-approved
wording; decisions locked in `docs/plans/2026-07-03-fable-design-session.md`.
Hand back: one-line status + PR link. One PR preferred; two if the location change wants
isolation.

## Scope

### FP-16 — friendly labels in the lesson drawer (owner: YES)

- Map raw stored values through display labels (worst offenders: Cooking Methods shows
  `basic-prep`, `stovetop` — labels exist in `filterDefinitions.ts`). Sweep the drawer
  for other kebab-rendered fields while there.
- **Collapse heritage chains to the leaf**: drop any tag that is a broader ANCESTOR of
  another tag on the same lesson (owner saw a 3-deep "Asian, East Asian, Chinese" →
  show just "Chinese"). Ancestry data: `heritageAncestry.generated` /
  `heritageHierarchy.generated`. Display-only — stored data unchanged.
- Fix the drawer's heritage field label that reads just **"cultural"** → proper label.

### FP-17 — card badge derives from Activity Type (owner: YES)

The Cook/Grow card badge is currently computed from skills tags; derive it from the
`activity_type` field (the same field the filter uses), **falling back to skills only
when activity_type is empty**. Closes the "Craft activity → no badge at all" gap (craft
gets a badge). Keep existing badge visual language; extend for craft/academic as the
field dictates.

### FP-18 — Location as two checkboxes (owner: YES; purely cosmetic)

- Render **Indoor-friendly / Outdoor-friendly**; stop exposing stored `Both` as an
  option. Search already folds Both server-side (`_match_location`), and #593's counts
  fold it client-side — verified: both-checked == neither-checked == all 703 (0 active
  lessons have a blank location).
- `filterDefinitions.ts` is stakeholder-gated: this exact change is owner-approved
  (2026-07-03 walkthrough FP-18 + design session D-C). Touch only the location entry.
- Align the config's declared `type` with rendered reality (declared `'single'`, rendered
  multi — rung8b-filter-ui F2); update the CLAUDE.md line that calls Location the only
  single-select.
- Handle a stale persisted/URL `Both` selection gracefully (treat as no-op or drop on
  load; no crash, no phantom filter chip).

### Grades-label sort fix (rung8-lesson-detail F2 — CONFIRMED live)

`intGradesLabel` renders first–last of the stored array assuming it's sorted — live
lesson "Sunprints" renders "Grades 1–K". Sort through canonical order
(3K, PK, K, 1…8) before deriving the range; guard non-contiguous arrays sensibly
(the finding notes the contiguity assumption too — a list fallback is fine).

### Optional riders (only if trivially clean)

- Drawer close animation empties the panel mid-slide (rung8-lesson-detail F1, cosmetic).
- Missing `fileLink` leaves no way to open the lesson — degrade gracefully
  (rung8-lesson-detail F3).

## Out of scope

Any counts/badge-number work (Briefs 1/5), text-color tokens (Brief 3), reviewer form
fields (Brief 4).

## Verification

- `npm run check` + `npm run test:run` + `npm run build` green; tests added for the
  heritage-collapse rule (3-deep case) and the grades sort (Sunprints shape).
- Preview spot-checks: a cooking-methods lesson shows "Basic prep"; the 3-deep heritage
  lesson shows only the leaf; Location shows exactly two friendly checkboxes; a
  craft-only lesson wears a badge; Sunprints reads a sane grades label.
- Full 4-surface bot triage.

## Gate

Frontend-only; no PROD gate. **Owner merges.** Merge-order note: rebases trivially
around Briefs 1/3 — whatever merges second resolves small overlaps
(`internal.css`, drawer files).
