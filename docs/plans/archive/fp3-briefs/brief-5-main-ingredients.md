# Brief 5 — Promote Main Ingredients to a teacher-facing search filter (owner: YES, 2026-07-03)

**Executor:** fresh Opus session. **RUN LAST** — after Brief 1 (#593) is merged (this
builds on its facetCounts machinery) and ideally after Brief 2 (shared sidebar files).
**Read first:** this brief; `docs/plans/2026-07-03-fable-design-session.md` §D-C;
`supabase/migrations/CLAUDE.md` + the `database-migrations` skill before ANY migration
file. Hand back: one-line status + PR link + gate status.

## Decision summary (locked)

Main Ingredients moves from reviewer-only metadata (`METADATA_CONFIGS`) to a search
filter: sidebar position **#3, right after Activity Type**, starts collapsed, rendered
as a **group→specific tree like Cultural Heritage** (24 groups + 46 specifics,
`INGREDIENT_PARENT_MAP` in `src/types/lessonMetadata.zod.ts`). 397/703 active lessons
tagged. Counts follow Brief 1's convention (standard meaning, 0+dim, hint line covers it).

## Scope

### 1. Invariant probe first (read-only, PROD + TEST)

The C02 harness auto-adds a specific's parent group, so group-level filtering should be
a **direct match** (no expansion needed). VERIFY on live data before relying on it:
count active lessons carrying a specific whose `INGREDIENT_PARENT_MAP` group is absent
from the same array. If violations exist, surface the count + plan (backfill data fix vs
client-side expansion) before building. Commit the probe + result.

### 2. Stray-tag cleanup (PROD data mutation — owner-gated)

4 active lessons carry 3 off-vocab values (verified 2026-07-03):
`Avocados`→`Avocado` (Honduras and Baleadas), `Basil`→`Fresh herbs` (Italy / Pesto),
`Various spices`→`Spices` (Eid / Italy Pesto / Nigeria Red Bean Stew — 3 lessons).
Rehearse on TEST first; guarded migration (wrap `BEGIN;`/`COMMIT;` — db push is
autocommit-per-statement) or MCP data fix per the data-change rules; dedupe if the
target value already exists on the row. **PROD apply = owner approval, always.**

### 3. Search RPC (schema change → migration pipeline)

Add a `filter_main_ingredients text[]` parameter to `search_lessons` with an overlap
(`&&`) WHERE clause, following the existing filter clauses' shape (see
`20260629010000_c41_pr_d_two_pass_relax.sql:287-310`). New migration file via
`/new-migration`; **check the current head slot and pick a later same-day slot
carefully** (digits-before-underscore sort gotcha; prefer next-day date if in doubt).
Local `supabase db reset` + `npm run test:rls` green; TEST-DB verification with real
data after CI applies (e.g. `Root vegetables` returns ~139, a specific like `Carrots`
returns its tagged set).

### 4. Frontend wiring

- `filterDefinitions.ts` (stakeholder file — this exact change is owner-approved):
  move `mainIngredients` from `METADATA_CONFIGS` into `FILTER_CONFIGS` with the tree
  options (groups with `children` specifics — reuse `INGREDIENT_PARENT_MAP` or generate
  statically). Keep the reviewer form working (it reads the same config via
  `ALL_FIELD_CONFIGS`; verify no regression).
- Sidebar: new section at position #3 modeled on `IntCulturalHeritageSection`
  (collapsed by default). NOTE the simpler semantics vs heritage: checking a group does
  NOT need client-side child expansion IF the §1 invariant holds — the group tag is on
  the lesson. Document whichever semantics ship in the component header.
- Store/URL: add to `SearchFilters`, `urlParams` (mind the outbound/inbound cap
  asymmetry noted in `rung8b-utils.md` F5), reset `currentPage` to 1 on change (store
  rule), Clear-all includes it.
- Facet counts: extend Brief 1's machinery — add the column to the slim fetch,
  `FacetFilterKey`, predicate (direct overlap; SQL-twin citation comment), badge
  rendering in the new section.
- Opportunistic rider: drop the dead exports in `filterDefinitions.ts`
  (rung8b-utils F3) while in the file.

## Out of scope

Reviewer-side ingredient UX changes (beyond keeping it working), any other vocab edits,
query-aware counts.

## Verification

- Full local gates: `npm run check` + `npm run test:run` + `npm run build` +
  `supabase db reset` + `npm run test:rls`.
- TEST DB (per-round, after CI applies the migration): RPC filters correctly for a group
  and a specific; counts match direct SQL; baseline restored (763/685/130, 0 markers).
- Preview drive: tree renders at #3; checking `Root vegetables` narrows results and the
  toolbar total matches the badge; URL round-trips the selection; reviewer form still
  saves ingredients.
- Full 4-surface bot triage.

## Gates (owner)

1. PROD migration approval for the RPC change (merge → migrate-production workflow).
2. PROD data-fix approval for the stray-tag cleanup (§2).
Post the pre-apply probes on the PR before requesting either gate. Pull up
`reference_ci_flakes` memory before the PROD migration.
