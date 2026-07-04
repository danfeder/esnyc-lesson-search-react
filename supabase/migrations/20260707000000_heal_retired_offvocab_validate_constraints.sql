-- =====================================================
-- Migration: 20260707000000_heal_retired_offvocab_validate_constraints.sql
-- =====================================================
-- Description:
--   FP4 Brief 6 — Heal the 7 grandfathered RETIRED lessons that still carry
--   legacy off-vocab cooking_skills / main_ingredients, then promote BOTH
--   NOT-VALID CHECK constraints to fully VALID, atomically, in one migration.
--
--   Constraints installed NOT VALID by 20260626000000_c02_enforce_check.sql
--   (they enforce on future writes but skip the pre-existing rows). At that time
--   18 rows were grandfathered: 11 live corpus-exclusion rows + 7 retired
--   lessons. The 11 live rows were healed on PROD by the FP3 Brief 5 owner-gated
--   data fix (docs/plans/fp3-briefs/brief-5-data-fix.sql, applied via MCP), and
--   mirrored onto TEST as Step 0 of this brief (see census). Only the 7 retired
--   rows remain off-vocab. This migration heals them and VALIDATEs both
--   constraints in a single transaction so VALIDATE can never run against
--   unhealed data.
--
-- DESIGN RULING (Fable, locked — brief-6-validate-constraints.md + ADDENDUM):
--   ONE self-contained migration, ONE owner gate (the standard PROD migration
--   approval). Deliberately carries a scoped data mutation inside a migration
--   because VALIDATE requires the heal atomically. Mutation is scoped to the 7
--   explicit lesson_ids below, both columns AND both JSONB mirror keys in the
--   same write per row.
--
-- THE 7 ROWS (lesson_ids verbatim; re-probed live on PROD + TEST 2026-07-04,
--   byte-identical across both DBs including the metadata JSONB mirrors):
--     15T4wU94xT3r-dRx-WJq9XD2-ySg2HKaz              Children's Aid Society: Food Justice Program
--     1Jbc2TvhQH-mzikeBiRoyCgR21EgQdbGq              Tortilla Time!
--     1kwWC4upXrmfxeOgu2OCwFOcKoowZZuwW              Green Sauce Around the World
--     1o4Ru6FVLFcC766HrQNta0BiZ_1MNl1qlWf8dk362Skw   Teas around the World
--     1syFNS-FUiVWUvkZRhfyxfXc0ukDrwnkO              Stone Soup
--     1tKktUwEqYymTjYXXmVBOc2RR7tH5HHUy              Rainbow Grain Salad
--     1Y6tHYm3Hh2vLCBCDaM36_TO1EuM61ofd              Choose-Your-Own Flavor Popcorn
--
-- HEAL MAP (Fable ruling; every old token validated against the live rows — census §3b):
--   cooking_skills: Chopping/Dicing/Cutting Skills/Knife safety -> Knife skills;
--     Measuring (dry/liquid) -> Measuring; Recipe reading/Following directions ->
--     Reading & following recipes; Assembling cold/hot dishes -> Assembling dishes;
--     Sautéing -> Sautéing & stir-frying; Mixing/Mixing/stirring -> Mixing & stirring;
--     Pressing -> Dough making (carrier = Tortilla Time! only); Cooking Techniques -> DROP;
--     Using mortar and pestle -> Blending & juicing; Creating sauces/dressings ->
--     Creating sauces & dressings; Steeping -> Boiling & simmering (carrier = Teas only);
--     Seasoning to taste -> Seasoning & spice blending. (Baking, Measuring, Tasting pass through.)
--   main_ingredients: Zucchini -> Squash, cucumbers & melons; Herbs & Aromatics ->
--     Fresh herbs; Beans -> Beans & legumes; Grains & Starches -> Grains & starches;
--     Various spices -> Spices; Maple syrup -> Sweeteners; Salt/Water -> DROP.
--   Per row: map -> drop empties -> first-occurrence de-dupe. NO parent backfill
--   (ADDENDUM Blocker B: 3 rows carry pre-existing orphan specifics that are out of
--   scope; the post-assert is byte-equality to the healed arrays, not the absolute
--   parent-invariant). The healed arrays are spelled out literally below.
--
-- GOTCHAS baked in (all have bitten before):
--   * supabase db push is autocommit-per-statement -> the BEGIN/COMMIT wrap is
--     MANDATORY (a failing post-assert must roll back the heal AND the VALIDATE).
--   * Any UPDATE re-checks BOTH NOT-VALID CHECKs against the whole NEW row, so
--     cooking_skills AND main_ingredients must land canonical in the SAME write.
--   * metadata->'cookingSkills' / ->'mainIngredients' are NOT synced from the
--     columns by the lessons_normalize_write trigger or the search RPC (verified:
--     the trigger manages 9 OTHER keys, never these two) -> jsonb_set both keys in
--     the same UPDATE. Verified 2026-07-04: the 7 rows have ZERO column<->metadata
--     drift on the trigger's 9 managed keys, so this write has zero collateral.
--
-- LOCAL-RESET / CI GUARD (ADDENDUM #3): the 7 rows do not exist on a fresh
--   supabase db reset (empty lessons table) or after a TEST reset. Universal
--   asserts (0 violating rows for both constraints; convalidated = true x2) always
--   run; the per-row byte-equality and updated-row-count asserts are scoped to the
--   ids actually present (7 on TEST/PROD, 0 locally -> vacuously pass). VALIDATE on
--   an empty/already-canonical table is a no-op that flips convalidated to true.
--
-- DATA SAFETY:
--   * BEGIN/COMMIT wrap + post-asserts that RAISE (roll back) on any mismatch.
--   * LOCK TABLE lessons IN SHARE ROW EXCLUSIVE MODE — serialize vs concurrent
--     reviewer saves.
--   * Scoped to 7 explicit ids; active corpus untouched (already canonical).
--
-- Rollback: see the commented ROLLBACK block at the foot of this file (drop both
--   constraints, restore the 7 rows' OLD arrays + JSONB mirrors, re-add both
--   constraints NOT VALID). Old arrays preserved there for audit.
--
-- See: docs/plans/fp4-briefs/brief-6-validate-constraints.md (+ ADDENDUM),
--      docs/plans/fp4-briefs/brief-6-census.md (live evidence + hand-trace §3b),
--      docs/plans/2026-07-04-pre-wave-plan.md (chain step 1).
-- =====================================================

BEGIN;

LOCK TABLE public.lessons IN SHARE ROW EXCLUSIVE MODE;

-- ---------------------------------------------------------------------------
-- (1) HEAL the 7 retired rows + assert updated-row-count and byte-equality.
--     RETURNING compares the actually-stored (post-BEFORE-trigger) values to the
--     intended healed arrays, so a silent trigger rewrite would fail the assert.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_present int;
  v_updated int;
  v_byteeq  int;
BEGIN
  SELECT count(*) INTO v_present
  FROM public.lessons
  WHERE lesson_id = ANY (ARRAY[
    '15T4wU94xT3r-dRx-WJq9XD2-ySg2HKaz',
    '1Jbc2TvhQH-mzikeBiRoyCgR21EgQdbGq',
    '1kwWC4upXrmfxeOgu2OCwFOcKoowZZuwW',
    '1o4Ru6FVLFcC766HrQNta0BiZ_1MNl1qlWf8dk362Skw',
    '1syFNS-FUiVWUvkZRhfyxfXc0ukDrwnkO',
    '1tKktUwEqYymTjYXXmVBOc2RR7tH5HHUy',
    '1Y6tHYm3Hh2vLCBCDaM36_TO1EuM61ofd'
  ]);

  WITH heal(lesson_id, cs, mi) AS (VALUES
    ('15T4wU94xT3r-dRx-WJq9XD2-ySg2HKaz'::text,
       ARRAY['Knife skills','Measuring','Reading & following recipes','Assembling dishes','Baking','Sautéing & stir-frying']::text[],
       ARRAY['Black beans','Corn/masa','Tomatoes','Squash, cucumbers & melons','Cilantro','Wheat/flour','Potatoes','Alliums']::text[]),
    ('1Jbc2TvhQH-mzikeBiRoyCgR21EgQdbGq',
       ARRAY['Measuring','Mixing & stirring','Dough making','Reading & following recipes']::text[],
       ARRAY['Corn/masa']::text[]),
    ('1kwWC4upXrmfxeOgu2OCwFOcKoowZZuwW',
       ARRAY['Knife skills','Mixing & stirring','Blending & juicing','Creating sauces & dressings']::text[],
       ARRAY['Fresh herbs','Leafy greens']::text[]),
    ('1o4Ru6FVLFcC766HrQNta0BiZ_1MNl1qlWf8dk362Skw',
       ARRAY['Measuring','Boiling & simmering','Tasting']::text[],
       ARRAY['Fresh herbs']::text[]),
    ('1syFNS-FUiVWUvkZRhfyxfXc0ukDrwnkO',
       ARRAY['Knife skills','Measuring','Reading & following recipes','Assembling dishes']::text[],
       ARRAY['Root vegetables','Leafy greens','Beans & legumes','Alliums','Fresh herbs']::text[]),
    ('1tKktUwEqYymTjYXXmVBOc2RR7tH5HHUy',
       ARRAY['Knife skills','Measuring','Mixing & stirring','Assembling dishes','Reading & following recipes']::text[],
       ARRAY['Grains & starches','Root vegetables','Leafy greens','Nightshades','Alliums','Fresh herbs']::text[]),
    ('1Y6tHYm3Hh2vLCBCDaM36_TO1EuM61ofd',
       ARRAY['Measuring','Mixing & stirring','Seasoning & spice blending','Reading & following recipes']::text[],
       ARRAY['Corn/masa','Fresh herbs','Spices','Cheese','Honey','Sweeteners']::text[])
  ),
  u AS (
    UPDATE public.lessons l
    SET
      cooking_skills   = h.cs,
      main_ingredients = h.mi,
      metadata = jsonb_set(
        jsonb_set(COALESCE(l.metadata, '{}'::jsonb), '{cookingSkills}', to_jsonb(h.cs)),
        '{mainIngredients}', to_jsonb(h.mi)
      )
    FROM heal h
    WHERE l.lesson_id = h.lesson_id
    RETURNING (
      l.cooking_skills = h.cs
      AND l.main_ingredients = h.mi
      AND l.metadata->'cookingSkills'   = to_jsonb(h.cs)
      AND l.metadata->'mainIngredients' = to_jsonb(h.mi)
    ) AS ok
  )
  SELECT count(*), count(*) FILTER (WHERE ok) INTO v_updated, v_byteeq FROM u;

  IF v_updated <> v_present THEN
    RAISE EXCEPTION 'Brief-6 heal: updated % rows but % of the 7 target ids are present (scope drift)', v_updated, v_present;
  END IF;
  IF v_byteeq <> v_updated THEN
    RAISE EXCEPTION 'Brief-6 heal: byte-equality failed on % of % healed rows (unexpected trigger/write interference)', v_updated - v_byteeq, v_updated;
  END IF;

  RAISE NOTICE 'Brief-6 heal: % of 7 target rows present and healed byte-exact (0 locally is expected).', v_updated;
END $$;

-- ---------------------------------------------------------------------------
-- (2) UNIVERSAL pre-VALIDATE assert: no row (any status) is off-vocab for either
--     constraint. Always runs; on TEST/PROD this is 0 after the heal, locally 0
--     against the empty table. Gives a precise message before VALIDATE enforces.
--     Canonical arrays are byte-identical to 20260626000000_c02_enforce_check.sql.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_cs_bad int;
  v_mi_bad int;
BEGIN
  SELECT count(*) INTO v_cs_bad
  FROM public.lessons l
  WHERE l.cooking_skills IS NOT NULL
    AND NOT (l.cooking_skills <@ ARRAY[
      'Measuring','Mixing & stirring','Reading & following recipes','Kitchen & food safety',
      'Tasting','Grating','Mashing','Blending & juicing','Seasoning & spice blending',
      'Knife skills','Boiling & simmering','Sautéing & stir-frying','Steaming','Roasting',
      'Baking','Grilling','Dough making','Creating sauces & dressings','Pickling & preserving',
      'Fermenting','Assembling dishes','Wrapping & rolling','Plating & garnishing'
    ]::text[]);

  SELECT count(*) INTO v_mi_bad
  FROM public.lessons l
  WHERE l.main_ingredients IS NOT NULL
    AND NOT (l.main_ingredients <@ ARRAY[
      'Alliums','Leafy greens','Root vegetables','Nightshades','Peppers','Cruciferous',
      'Squash, cucumbers & melons','Mushrooms','Berries','Citrus fruits','Tropical fruits',
      'Apples & pears','Stone fruits','Dried fruits','Grains & starches','Beans & legumes',
      'Nuts & seeds','Eggs','Tofu & plant proteins','Dairy','Dairy alternatives','Fresh herbs',
      'Spices','Sweeteners','Garlic','Carrots','Sweet potatoes','Potatoes','Beets','Tomatoes',
      'Bell peppers','Cabbage','Winter squash','Cucumbers','Melons','Bananas','Avocado','Coconut',
      'Lemon','Oranges','Lime','Apples','Wheat/flour','Corn/masa','Rice','Oats','Black beans',
      'Black-eyed peas','Chickpeas','Pinto beans','Pumpkin seeds','Sunflower seeds','Sunflower butter',
      'Tahini','Peanut butter','Yogurt','Cheese','Butter','Milk','Coconut milk','Cilantro','Parsley',
      'Mint','Ginger','Cinnamon','Honey','Celery','Fennel','Seaweed (nori)','Cocoa & chocolate'
    ]::text[]);

  IF v_cs_bad <> 0 OR v_mi_bad <> 0 THEN
    RAISE EXCEPTION 'Brief-6: off-vocab rows remain before VALIDATE — cooking_skills=% main_ingredients=% (census missed something; do NOT widen the mutation)', v_cs_bad, v_mi_bad;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- (3) Promote both NOT-VALID constraints to fully VALID (full-table scan).
-- ---------------------------------------------------------------------------
ALTER TABLE public.lessons VALIDATE CONSTRAINT valid_cooking_skills;
ALTER TABLE public.lessons VALIDATE CONSTRAINT valid_main_ingredients;

-- ---------------------------------------------------------------------------
-- (4) UNIVERSAL post-VALIDATE assert: both constraints are now convalidated.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_validated int;
BEGIN
  SELECT count(*) INTO v_validated
  FROM pg_constraint
  WHERE conname IN ('valid_cooking_skills','valid_main_ingredients')
    AND conrelid = 'public.lessons'::regclass
    AND convalidated;

  IF v_validated <> 2 THEN
    RAISE EXCEPTION 'Brief-6: expected 2 validated constraints, found % convalidated', v_validated;
  END IF;
END $$;

COMMIT;

-- =====================================================
-- ROLLBACK (keep as comments; the migration mutates 7 rows and validates 2
-- constraints — a true rollback must un-validate BOTH constraints before
-- restoring the OLD off-vocab arrays, else the restore violates the now-VALID
-- CHECK. Old arrays captured live 2026-07-04, byte-identical PROD + TEST.)
-- =====================================================
-- BEGIN;
-- LOCK TABLE public.lessons IN SHARE ROW EXCLUSIVE MODE;
-- ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS valid_cooking_skills;
-- ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS valid_main_ingredients;
-- WITH old(lesson_id, cs, mi) AS (VALUES
--   ('15T4wU94xT3r-dRx-WJq9XD2-ySg2HKaz'::text,
--      ARRAY['Chopping','Dicing','Measuring (dry/liquid)','Recipe reading','Assembling cold dishes','Baking','Sautéing','Following directions']::text[],
--      ARRAY['Black beans','Corn/masa','Tomatoes','Zucchini','Cilantro','Wheat/flour','Potatoes','Alliums']::text[]),
--   ('1Jbc2TvhQH-mzikeBiRoyCgR21EgQdbGq',
--      ARRAY['Measuring (dry/liquid)','Mixing','Pressing','Cooking Techniques','Recipe reading','Following directions']::text[],
--      ARRAY['Corn/masa','Salt','Water']::text[]),
--   ('1kwWC4upXrmfxeOgu2OCwFOcKoowZZuwW',
--      ARRAY['Chopping','Mixing/stirring','Using mortar and pestle','Creating sauces/dressings']::text[],
--      ARRAY['Herbs & Aromatics','Leafy greens']::text[]),
--   ('1o4Ru6FVLFcC766HrQNta0BiZ_1MNl1qlWf8dk362Skw',
--      ARRAY['Measuring','Steeping','Tasting']::text[],
--      ARRAY['Herbs & Aromatics']::text[]),
--   ('1syFNS-FUiVWUvkZRhfyxfXc0ukDrwnkO',
--      ARRAY['Cutting Skills','Cooking Techniques','Measuring (dry/liquid)','Recipe reading','Assembling hot dishes']::text[],
--      ARRAY['Root vegetables','Leafy greens','Beans','Alliums','Herbs & Aromatics']::text[]),
--   ('1tKktUwEqYymTjYXXmVBOc2RR7tH5HHUy',
--      ARRAY['Chopping','Knife safety','Measuring (dry/liquid)','Mixing','Assembling cold dishes','Following directions']::text[],
--      ARRAY['Grains & Starches','Root vegetables','Leafy greens','Nightshades','Alliums','Herbs & Aromatics']::text[]),
--   ('1Y6tHYm3Hh2vLCBCDaM36_TO1EuM61ofd',
--      ARRAY['Measuring (dry/liquid)','Mixing','Seasoning to taste','Following directions']::text[],
--      ARRAY['Corn/masa','Herbs & Aromatics','Various spices','Cheese','Honey','Maple syrup']::text[])
-- )
-- UPDATE public.lessons l SET
--   cooking_skills = o.cs, main_ingredients = o.mi,
--   metadata = jsonb_set(jsonb_set(COALESCE(l.metadata,'{}'::jsonb),'{cookingSkills}',to_jsonb(o.cs)),'{mainIngredients}',to_jsonb(o.mi))
-- FROM old o WHERE l.lesson_id = o.lesson_id;
-- -- Re-add both constraints NOT VALID (see 20260626000000_c02_enforce_check.sql for the full canonical arrays).
-- COMMIT;
