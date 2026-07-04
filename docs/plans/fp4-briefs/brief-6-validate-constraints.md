# FP4 Brief 6 — Heal 7 retired lessons + VALIDATE both constraints (L)

Read `docs/plans/fp4-briefs/README.md` (standing rules) first. Evidence: **C4/FP4-DB-01**
in `docs/plans/fp4-discovery/discovery-evidence.md` (Fable re-probed 2026-07-03: both
constraints `convalidated=false`; violators = the same **7 retired lessons** for both;
**0 active** violators). This closes the Brief-5 parked item and the residual of
`project_ingredient_parent_invariant_broken`.

## The 7 rows (lesson_ids verbatim — re-probe before acting)

`15T4wU94xT3r-dRx-WJq9XD2-ySg2HKaz` (Children's Aid Society: Food Justice Program),
`1Jbc2TvhQH-mzikeBiRoyCgR21EgQdbGq` (Tortilla Time!),
`1kwWC4upXrmfxeOgu2OCwFOcKoowZZuwW` (Green Sauce Around the World),
`1o4Ru6FVLFcC766HrQNta0BiZ_1MNl1qlWf8dk362Skw` (Teas around the World),
`1syFNS-FUiVWUvkZRhfyxfXc0ukDrwnkO` (Stone Soup),
`1tKktUwEqYymTjYXXmVBOc2RR7tH5HHUy` (Rainbow Grain Salad),
`1Y6tHYm3Hh2vLCBCDaM36_TO1EuM61ofd` (Choose-Your-Own Flavor Popcorn).

## Design ruling (Fable, locked): ONE self-contained migration

Heal + VALIDATE in a single transaction, in a single migration file
(`supabase/migrations/20260707000000_heal_retired_offvocab_validate_constraints.sql`; bump
the date if taken — never same-day suffixes). Rationale: ordering-proof (the VALIDATE can
never run against unhealed data), CI rehearses it on TEST automatically, and the owner gets
ONE gate (the standard PROD migration approval) instead of a data-fix gate plus a migration
gate. This deliberately carries a data mutation inside a migration — sanctioned here because
VALIDATE requires the heal atomically; keep the mutation scoped to the 7 explicit ids.

Migration shape: `BEGIN;` → `LOCK TABLE lessons IN SHARE ROW EXCLUSIVE MODE;` → one UPDATE
per row (or one UPDATE with a VALUES join) covering **both columns AND both JSONB mirror
keys in the same write** → post-asserts → `VALIDATE CONSTRAINT` × 2 → assert
`convalidated=true` for both → `COMMIT;`.

**Gotchas baked in (all have bitten before):**
- `supabase db push` is autocommit-per-statement → the BEGIN/COMMIT wrap is mandatory.
- Any UPDATE re-checks BOTH `NOT VALID` CHECKs against the whole row → cooking_skills and
  main_ingredients must land canonical in the SAME write per row.
- `mainIngredients` / `cookingSkills` are NOT synced to `metadata` JSONB by the trigger or
  the RPC → `jsonb_set` both keys in the same UPDATE (pattern:
  `docs/plans/fp3-briefs/brief-5-data-fix.sql`). Post-assert JSONB↔column drift = 0 on the
  7 rows.

## Mapping table (Fable ruling — validate each against the actual rows; STOP on any value not listed)

cooking_skills (canonical vocab = the 23 values in the live constraint def — parse it, don't
trust a doc):

| old token | maps to |
|---|---|
| Assembling cold dishes | Assembling dishes |
| Assembling hot dishes | Assembling dishes |
| Chopping | Knife skills |
| Cooking Techniques | DROP (carries no information) |
| Creating sauces/dressings | Creating sauces & dressings |
| Cutting Skills | Knife skills |
| Dicing | Knife skills |
| Following directions | Reading & following recipes |
| Knife safety | Knife skills |
| Measuring (dry/liquid) | Measuring |
| Mixing | Mixing & stirring |
| Mixing/stirring | Mixing & stirring |
| Pressing | Dough making — verify the carrier is Tortilla Time!; if another lesson carries it, STOP |
| Recipe reading | Reading & following recipes |
| Sautéing | Sautéing & stir-frying |
| Seasoning to taste | Seasoning & spice blending |
| Steeping | Boiling & simmering — verify the carrier is Teas around the World; else STOP |
| Using mortar and pestle | Blending & juicing (precedent: owner mapped `Grinding` there in FP3 B5 §8) |

main_ingredients (canonical vocab = the 71 values in the live constraint def):

| old token | maps to |
|---|---|
| Beans | Beans & legumes |
| Grains & Starches | Grains & starches (case fix) |
| Herbs & Aromatics | Fresh herbs |
| Maple syrup | Sweeteners |
| Salt | DROP |
| Various spices | Spices (FP3 B5 precedent) |
| Water | DROP |
| Zucchini | Squash, cucumbers & melons |

After remap: dedupe (keep first-occurrence order); all ingredient targets are parent groups,
so no orphan-specific can be introduced — still post-assert the parent-invariant holds on
the 7 rows (no specific without its group).

## Sequence

1. Pre-probe PROD **and TEST**: violator counts by constraint, split active/retired, and the
   full old arrays for the 7 rows (commit as `brief-6-census.md` with SQL + raw output +
   which DB). If TEST has violators beyond these 7, or any active violator exists on either
   DB, STOP.
2. Hand-trace each healed array in the census doc (old → new, per row) — this is the review
   artifact.
3. Migration through the pipeline: local `supabase db reset` + `npm run test:rls` (2 known
   pre-existing failures only) → PR → CI applies to TEST → verify on TEST with real data:
   both constraints `convalidated=true`, 0 violators, JSONB drift 0, spot-check 2 rows
   byte-equal to the hand-trace. Re-verify each review round.
4. Owner merges; owner approves the PROD migration run. Post-apply PROD probes: same
   asserts; active corpus 703 untouched; then confirm `search_lessons` results unaffected
   (retired rows are excluded from search — say so with a probe).

## STOP conditions

Any old token in the live rows not in the tables above; any active violator **after
Step 0 below**; TEST/PROD divergence in the 7 rows' arrays; VALIDATE failing after the heal
(means the census missed something — do NOT widen the mutation). "STOP = write the hand-back
and END YOUR TURN; design forks route to Fable; the owner only answers explicit approvals
(data fix / merge / gates)."

## ADDENDUM — Fable ruling 2026-07-04 (supersedes conflicting lines above)

A first executor correctly STOPPED at Sequence step 1 (evidence:
`docs/plans/fp4-briefs/brief-6-census.md`, in the tree uncommitted — re-probe, apply the
corrections below, commit it on your branch). Fable independently re-verified both blockers
live on 2026-07-04 (census §5). Rulings:

**1. Blocker A (TEST active violators) → mirror FP3 B5 onto TEST (census Option 1).**
New **Step 0**, before Sequence step 1: apply `docs/plans/fp3-briefs/brief-5-data-fix.sql`
**verbatim, unedited,** to TEST via `mcp__supabase-test__execute_sql` (the file self-wraps
`BEGIN;`/`COMMIT;` and self-asserts 0/0/0/0 scoped to active rows — the same file PROD
received 2026-07-04, owner-gated). Do NOT roll back this time: TEST keeps it, permanently
matching PROD. Post-probe: TEST active violators = 0 for both constraints; retired
violators = exactly the brief's 7. If the file errors on TEST, STOP — do not modify it.
Rejected alternatives: folding the active heal into this migration re-touches 11 live PROD
lessons that are already correct (widens the owner's one gate for zero benefit); a generic
TEST-sync mechanism is overkill — the drift IS exactly FP3 B5 (Fable-verified: TEST's 11
active violators = precisely the FP3 B5 heal set; the 7 retired rows are byte-identical
PROD↔TEST including JSONB mirrors).

**2. Blocker B (parent-invariant post-assert) → byte-equality replaces the absolute
invariant.** The literal "parent-invariant holds on the 7 rows" is unimplementable
remap-only (3 rows carry PRE-existing orphan specifics — census §2 — invisible on retired
rows and out of scope to fix). Instead post-assert: each healed row's `cooking_skills`,
`main_ingredients`, `metadata->'cookingSkills'`, `metadata->'mainIngredients'` equal the
census §3b healed arrays **exactly** (Fable spot-verified §3b old arrays against live PROD).
This is stronger than "no new orphan" and stable: the 7 rows are frozen (any UPDATE fails
the NOT VALID re-check) so they cannot drift before the PROD apply. Do NOT backfill parents.

**3. Local-reset guard.** The migration must pass on databases where the 7 rows don't exist
(local `supabase db reset`, CI resets): universal asserts always run (0 violating rows for
both constraints; `convalidated=true` × 2); per-row byte-equality asserts only for the ids
actually present; also assert updated-row-count = count of the 7 ids present (7 on
TEST/PROD, 0 locally).

**4. Corrections of record** (fix in the census doc when committing): TEST active violators
= **11 distinct rows** (11 cooking_skills violators, 4 of which also carry the
main_ingredients strays — "15" was double-counting); canonical main_ingredients vocab =
**70** values (brief's "71" was wrong; census already parsed the live def correctly).

**5. Standing policy (new, all future work):** any owner-gated PROD data fix must be
mirrored onto TEST at ship time — this whole blocker existed because FP3 B5 shipped
PROD-only.
