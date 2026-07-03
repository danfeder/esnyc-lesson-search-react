# Brief 4 — Close the reviewer Cultural Heritage field (owner reversal, 2026-07-03)

**Executor:** fresh Opus session. **Read first:** this brief; the owner's decision +
build notes in `docs/plans/2026-07-03-fp2-walkthrough-script.md` (Session 2 checklist,
"Heritage field" row). Hand back: one-line status + PR link.

## Context

Every other reviewer vocabulary is a closed pick-list; Cultural Heritage still lets a
reviewer type brand-new values (left open for the in-flight heritage worksheet). The
owner reversed that: **close it NOW** — "it ends up a closed list regardless, and I can
add values in the DB/code anyway." The Stage-1 worksheet
(`docs/plans/heritage-worksheet-form/`) stays in flight; its merge/split/drop outcomes
apply later **via code**, not reviewer typing.

## Scope

1. **Census first (read-only)**: pull the CURRENT distinct `cultural_heritage` values
   from PROD `lessons` (active + retired) **and** `lesson_submissions` metadata. Diff
   against the canonical vocab (`data/vocab/cultural-heritage.vocab.json` /
   `heritageHierarchy.generated`). Commit the census (SQL + raw result + which DB) per
   the provenance rule.
2. **Nothing gets invalidated**: any stored value missing from the vocab joins the
   closed list (add to the vocab source + regenerate the hierarchy via
   `scripts/heritage/generate-heritage-hierarchy.ts` if that's where the reviewer
   options come from — investigate how the reviewer control sources options before
   wiring).
3. **Close the control**: the reviewer form's Cultural Heritage field becomes a closed
   pick-list (no free-text creation). Preserve the existing parent/child hierarchy in
   the picker. Mirror the pattern of the other closed fields (e.g. observancesHolidays:
   `type 'multiple'`, non-creatable).
4. **New-value path**: reviewers needing an unlisted value ask the maintainer (owner) to
   add it in code. Add one line to the relevant CLAUDE.md or reviewer-facing doc noting
   this.
5. **UI-level closure only** — do NOT add a DB CHECK constraint in this brief (the
   worksheet will reshape the vocab; a premature CHECK makes that harder).

## Constraints

- `filterDefinitions.ts` semantics are stakeholder-gated: this change is owner-approved
  (decision captured 2026-07-03). Keep the SEARCH filter behavior (hierarchical
  expansion) untouched — this brief is about the REVIEWER control only.
- If the census surfaces surprises (e.g. junk values that obviously shouldn't join a
  closed list), STOP and surface them to the owner instead of improvising the list.

## Verification

- `npm run check` + `npm run test:run` green; a test pinning "reviewer control offers
  exactly the closed list and rejects free text".
- TEST-DB drive: open a submission's review screen on the preview, confirm the field is
  a pick-list containing a known stored value and no free-text entry; save a review
  round-trips an existing value unchanged. Restore the TEST baseline after
  (763/685/130, 0 markers).
- Full 4-surface bot triage.

## Gate

Frontend + possibly vocab-file changes; no PROD schema gate expected. **Owner merges.**
