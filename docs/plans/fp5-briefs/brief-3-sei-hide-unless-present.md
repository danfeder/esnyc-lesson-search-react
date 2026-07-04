# FP5 Brief 3 — Hide "Social-Emotional Intelligence" from fresh reviewer picks (S)

Read the standing rules in `docs/plans/fp4-briefs/README.md` first (STOP rule verbatim:
"STOP = write the hand-back and END YOUR TURN; design forks route to Fable; the owner
only answers explicit approvals (data fix / merge / gates).")

## Why (owner decision 2026-07-04, follow-on to candidates doc §4 / FP5 brief 1)

The 2026 template dropped "Social-Emotional Intelligence" as a Core Competency; owner:
new lessons never pick it. Today that rule lives only in the reviewer runbook — the
form still offers the checkbox. Owner wants the UI to enforce it: **a reviewer must
not be offered SEI for a lesson that doesn't already carry it.**

Live facts (Fable-probed PROD 2026-07-04): **388 active / 431 total** lessons carry
'Social-Emotional Intelligence' in `core_competencies` — so the VALUE must stay legal
everywhere. This brief changes ONLY which pills the reviewer form renders.

## Scope — ONE behavior change, reviewer form only

In the Core Competencies group of the review metadata form
(`src/components/Review/ReviewMetadataForm.tsx` + wherever its option list is derived):

- **Exclude `'Social-Emotional Intelligence'` from the rendered options UNLESS the
  review's LOADED metadata already includes it.**
- ⚠️ "Already includes it" = judged from the metadata **as initially loaded** for this
  review (restored review / initial form state), NOT from the live selection — if a
  reviewer unticks it, the pill must stay visible for the rest of the session so they
  can re-tick (no vanishing-checkbox undo trap).
- When shown, it behaves like any other pill (toggleable; normal save path).
- NO changes to: `filterDefinitions.ts` (public search facet keeps SEI — 55% of the
  library is findable by it), Zod schemas / edge mirror / enums.json, the DB
  constraint, `canonicalizeReviewMetadata`, the prefill parser (it already never
  emits SEI).

### Docs ride-alongs (same PR)
- `docs/plans/2026-07-04-wave-reviewer-runbook.md`: replace the "Don't pick
  'Social-Emotional Intelligence'" bullet with a one-liner: it no longer appears for
  new lessons; it's a legacy tag old lessons carry.
- `src/pages/CLAUDE.md` review-flow note (added FP5 B2): adjust the SEI sentence to
  match the new behavior.

## Tests

- New-lesson review (no SEI in loaded metadata): Core Competencies renders 5 pills,
  SEI absent.
- Reopened review whose loaded metadata carries SEI: 6 pills, SEI present + pressed;
  untick → pill remains visible and can be re-ticked; save after untick drops the
  value, save untouched preserves it.
- Sweep CASE-INSENSITIVELY incl. `e2e/` for anything asserting the Core Competencies
  option list/count (the review form sentence-cases group accessible names —
  'Core competencies'; a stale E2E expectation burned 3 CI cycles on FP5 B1).

## Out of scope

Re-tagging the 388/431 carrier lessons; any vocab/DB change; the public search facet;
anything else in the review form.

## Verify

`npm run check` + `npm run test:run` (never bare `npm run test`). Live-drive the
deploy preview: a fresh submission's review shows 5 competency pills; (if a TEST row
with SEI is reachable) a reopened SEI carrier shows 6 with SEI ticked. Gates: owner
merge only — frontend auto-deploys with the merge; NO edge deploy, NO migration.

## Hand-back

One-line status + file path(s). Surprises → hand-back; design forks → Fable.
