# Rung 8 — Facet predicate parity (PR #593 `fix/fp01b-true-facet-counts` @ b9797ac vs `search_lessons` SQL)

Status: COMPLETE (within budget). Scope: `matchesFacetSelection`/`matchesPrepared` in
`src/utils/facetCounts.ts` (branch) vs the WHERE clauses of
`supabase/migrations/20260629010000_c41_pr_d_two_pass_relax.sql:233-312` and the helper
functions they call. Method: line-by-line predicate diff per category + 2 read-only PROD
probes (2026-07-03) for the one data-dependent divergence.

## Findings

### F1 (LATENT, mechanism CONFIRMED, zero live rows today): heritage badge predicate is strictly LOOSER than the server on the STORED side

- **Client**: `heritageSlugSet` (branch `src/utils/facetCounts.ts:182-195`) normalizes every
  STORED `cultural_heritage` value through `aliasToSlug` — which contains an identity entry
  for every canonical kebab SLUG plus alias labels (`'African American diaspora'`,
  `'Indigenous/Native American'`, `'Indigenous Peoples'`; see
  `src/utils/heritageAncestry.generated.ts:14-46` on the branch) — then expands up the tree.
- **Server**: the lesson side is a verbatim, case-sensitive label overlap:
  `l.cultural_heritage && expanded_cultures`
  (`20260629010000_c41_pr_d_two_pass_relax.sql:295-296`), where `expand_cultural_heritage`
  returns hierarchy **LABELS only** for the selection's subtree
  (`20260616000000_heritage_recursive_expansion.sql:204-250`; a known slug input is consumed
  by the `h.key = ANY` seed and is NOT in the output, so the slug form itself never reaches
  the `&&`).
- **Failure scenario**: a lesson whose stored value is a canonical slug (`'chinese'`) or an
  alias form (`'Indigenous/Native American'`) is COUNTED in the Cultural Heritage badge
  (client normalizes it) but NEVER RETURNED by clicking that filter (server matches labels
  verbatim). Badge says N, click returns N-k.
- **Data reality (PROD probe 2026-07-03, non-retired rows)**: `SELECT ... unnest(cultural_heritage) v ... HAVING NOT EXISTS (SELECT 1 FROM cultural_heritage_hierarchy h WHERE h.label = v)` → **0 rows**. Every stored heritage value today is an exact hierarchy
  label, so there is NO live divergence. Also verified: hierarchy table = 71 nodes / 71
  distinct labels / 6 roots, matching the client's generated 71-node maps (no dup-label
  ambiguity in the up-vs-down expansion equivalence).
- **Why still worth a line in the PR**: the module's own doc comment
  (`facetCounts.ts:164-167`) asserts stored values may be "already-canonical slugs" and
  treats them as matching — that specific claim is where the client twin is looser than the
  SQL. Any future import/re-tag that writes slug- or alias-form heritage values silently
  re-opens an FP-01-class badge≠click gap for this one category. Cheapest guard: either
  drop the slug/alias leniency from `heritageSlugSet` (verbatim-label lookup only, mirroring
  the SQL exactly) or note the invariant "lessons.cultural_heritage stores hierarchy labels
  verbatim" wherever heritage data fixes are made. Severity: LOW today (latent), data-fix
  away from MEDIUM.

## Categories checked and CONFIRMED parity (no findings)

| Category | Client (branch facetCounts.ts) | SQL twin | Verdict |
|---|---|---|---|
| gradeLevels / thematicCategories / seasonTiming / coreCompetencies / academicIntegration / socialEmotionalLearning | verbatim case-sensitive `overlaps()` (:277-318) | verbatim `&&` (20260629010000:287-306) | identical, incl. case + whitespace: both sides fail identically on drifted data (kebab themes = FP-02, already tracked; badge stays consistent with click) |
| location | lowercase both sides + Indoor/Outdoor→+both filter expansion (:253-261, 299-302) | `_match_location` (20260620000000:137-161) — same table | identical |
| activityType | filter slug→{slug,noun} via maps (:82-91, 305-312) | `_alias_activity_type` (20260513000000:37-57) — same 4 pairs, case-sensitive, unknown passthrough both sides | identical; stray stored `'both'` matched by NEITHER side (parity holds) |
| culturalHeritage (selection side) | UI sends slugs; client checks slug ∈ up-expanded set | seed `h.key = ANY` covers ALL 71 slugs even where `_alias_cultural_heritage`'s hardcoded CASE (20260505000000:105+) is stale — keys ARE the slugs | identical (stored side = F1 above) |
| cookingMethods | lowercase both sides (:324-327) | `_match_cooking_methods` (20260505000000:159-183) | identical for reachable inputs; SQL's `'basic prep only'` alias branch unreachable — UI option values are kebab (`filterDefinitions.ts:163-167`: basic-prep/stovetop/oven) |
| NULL columns / empty stored arrays | coalesced to `[]` → no match | `NULL && x` → NULL → excluded; `{} && x` → false | identical |
| empty selection | `selected.length === 0` → unrestricted (:274) | `filter IS NULL OR array_length(...) IS NULL` guard (`array_length('{}')` IS NULL) | identical, incl. empty-array arg |
| liveness gate | hook `.is('retired_at', null)` (useFacetCounts.ts) | `AND l.retired_at IS NULL` — the RPC's only liveness clause | identical |
| tags | not a badge category | RPC has `filter_tags` clause, but `SearchFilters` has no `tags` key and `useLessonSearch.ts` never sends it | unreachable, no divergence |
| free-text query | deliberately excluded from badge universe (module doc, D-2) | FTS + pg_trgm + C41 two-pass relax | by-design difference, documented in-code — not a parity defect |

Non-issues considered and dropped: JS `toLowerCase()` vs PG `lower()` non-ASCII edge (all
reachable vocab is ASCII); `academicValues` `{selected}` tolerant accessor is dead code on
this path (hook reads the text[] column, not metadata JSONB — and the RPC filters columns,
so column-source is the correct parity choice); fetch cap 1000 has a logged tripwire.

## Bottom line

The parity layer is genuinely tight — 9 of 10 categories are twin-exact by construction.
The single asymmetry is the heritage stored-side normalization (F1), and PROD data is
currently 100% clean under it, so it is latent, not live.
