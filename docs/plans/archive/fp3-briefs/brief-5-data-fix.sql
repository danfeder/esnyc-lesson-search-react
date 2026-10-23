-- =====================================================
-- Brief 5 — Main Ingredients: COMBINED owner-gated PROD data fix (A′)
-- =====================================================
-- Supersedes the earlier ingredient-only version (which was BLOCKED because every
-- UPDATE to these rows re-validates the WHOLE row against BOTH `NOT VALID` CHECK
-- constraints — `valid_cooking_skills` AND `valid_main_ingredients` — so you cannot
-- write one column while the other is still off-vocab). Owner decision 2026-07-04
-- (fork doc §8): Option A′ — heal the data. Heal ALL 11 active "frozen" lessons in
-- ONE combined per-row write so the row lands fully canonical in a single UPDATE.
--
-- This is a DATA change (row content), NOT a schema migration. Applied via MCP
-- (mcp__supabase-remote__execute_sql) to PRODUCTION *before* the Brief 5 feature PR
-- merges — owner approval required in-channel, every time. Applying it pre-feature
-- is harmless to the live app (nothing filters on ingredients yet; the drawer just
-- shows corrected tags) and it closes the invariant "under-match window": with the
-- 7 legacy rows healed, a plain direct-match group filter (Option A) is exact.
--
-- SCOPE (verified live 2026-07-04 on PROD jxlxtzkmicfhchkhiojz AND TEST
-- rxgajgmphciuaqzvwmox — IDENTICAL affected set + counts on both):
--   * 11 active lessons carry off-vocab `cooking_skills` (the frozen set).
--   * Of those 11: 7 violate the main_ingredients specific→parent invariant, and
--     4 carry a stray off-vocab main_ingredients value. Both subsets ⊂ the 11, so
--     the 11 frozen rows are the complete union — exactly 11 distinct rows touched.
--   * 7 retired frozen rows + a later `VALIDATE CONSTRAINT` pass are PARKED (§8).
--
-- WHAT IT DOES — one UPDATE, one write per row, four coordinated transforms
-- (RHS is computed entirely from the OLD row, so nesting stray-remap inside the
-- backfill is correct and needs no intermediate write):
--   (a) cooking_skills: remap each legacy value through the owner-decided map
--       (fork doc §8); 'Basic Skills' is DROPPED; order-preserving de-dupe.
--   (b) main_ingredients strays: Avocados→Avocado, Basil→Fresh herbs,
--       Various spices→Spices; order-preserving de-dupe.
--   (c) main_ingredients parent backfill: append each specific's missing parent
--       GROUP (INGREDIENT_PARENT_MAP), computed on the post-(b) array so
--       Avocado's new "Tropical fruits" requirement is honored. APPEND-ONLY.
--   (d) metadata JSONB mirror [Fable-verify addition 2026-07-04]: set
--       metadata->'cookingSkills' and metadata->'mainIngredients' to the SAME
--       healed arrays. The lesson drawer (IntLessonDetail) displays these two
--       fields from the metadata JSONB, and NEITHER the lessons_normalize_write
--       trigger NOR the search RPC's metadata reconstruction covers them (both
--       were reviewer-only fields until Brief 5). JSONB↔column drift is 0
--       library-wide today (verified PROD+TEST 2026-07-04); without (d) the 11
--       healed rows would become the only drifted rows and their drawers would
--       keep showing the legacy tags the filter no longer matches.
--
-- OWNER-DECIDED cooking_skills MAP (fork doc §8) + one executor addition:
--   Basic Skills           -> (DROP)
--   Following directions    -> Reading & following recipes
--   Grinding                -> Blending & juicing
--   Blending                -> Blending & juicing   [ADDED by executor 2026-07-04:
--       the full 11-row census surfaced "Blending" (1 lesson, "Mindful Eating")
--       beyond §8's 8-row list; obvious canonical home — the canonical value
--       literally begins with "Blending" and the owner already mapped the adjacent
--       "Grinding" here. Recorded per §8's "obvious target -> map and record" rule.]
--   Assembling              -> Assembling dishes
--   Chopping                -> Knife skills
--   Measuring (dry/liquid)  -> Measuring
--   Mixing                  -> Mixing & stirring
--   Mixing/stirring         -> Mixing & stirring
--   Recipe reading          -> Reading & following recipes
--   Sautéing                -> Sautéing & stir-frying
--   Simmering               -> Boiling & simmering
--
-- SAFETY:
--   * BEGIN/COMMIT — MCP/supabase execute is autocommit-per-statement; the guard
--     wrap makes the post-assert able to roll the whole thing back on failure.
--   * LOCK TABLE lessons IN SHARE ROW EXCLUSIVE MODE — serialize vs concurrent
--     reviewer saves (~3-15 user internal tool; contention negligible, correct
--     hygiene for a lessons mutation).
--   * `targets` gate touches ONLY rows that actually need a fix (no library-wide
--     no-op rewrite); retired rows excluded.
--   * Post-assert: active invariant violations = 0 AND active strays = 0 AND active
--     off-vocab cooking_skills = 0 AND active JSONB↔column drift on the two
--     mirrored keys = 0, else RAISE (rolls back, PROD unchanged).
-- =====================================================

BEGIN;

LOCK TABLE lessons IN SHARE ROW EXCLUSIVE MODE;

WITH
-- Owner-decided cooking_skills legacy→canonical map. canon = NULL means DROP.
cs_map(legacy, canon) AS (VALUES
  ('Basic Skills'::text,          NULL::text),
  ('Following directions',        'Reading & following recipes'),
  ('Grinding',                    'Blending & juicing'),
  ('Blending',                    'Blending & juicing'),
  ('Assembling',                  'Assembling dishes'),
  ('Chopping',                    'Knife skills'),
  ('Measuring (dry/liquid)',      'Measuring'),
  ('Mixing',                      'Mixing & stirring'),
  ('Mixing/stirring',             'Mixing & stirring'),
  ('Recipe reading',              'Reading & following recipes'),
  ('Sautéing',                    'Sautéing & stir-frying'),
  ('Simmering',                   'Boiling & simmering')
),
-- main_ingredients stray off-vocab → canonical map.
mi_stray(legacy, canon) AS (VALUES
  ('Avocados'::text, 'Avocado'::text),
  ('Basil',          'Fresh herbs'),
  ('Various spices', 'Spices')
),
-- 42 non-null specific→parent pairs from INGREDIENT_PARENT_MAP
-- (src/types/lessonMetadata.zod.ts:273-320). The 4 null-parent specifics
-- (Celery, Fennel, Seaweed (nori), Cocoa & chocolate) are intentionally absent.
parent_map(specific, parent) AS (VALUES
  ('Garlic','Alliums'),('Carrots','Root vegetables'),('Sweet potatoes','Root vegetables'),
  ('Potatoes','Root vegetables'),('Beets','Root vegetables'),('Tomatoes','Nightshades'),
  ('Bell peppers','Peppers'),('Cabbage','Cruciferous'),('Winter squash','Squash, cucumbers & melons'),
  ('Cucumbers','Squash, cucumbers & melons'),('Melons','Squash, cucumbers & melons'),
  ('Bananas','Tropical fruits'),('Avocado','Tropical fruits'),('Coconut','Tropical fruits'),
  ('Lemon','Citrus fruits'),('Oranges','Citrus fruits'),('Lime','Citrus fruits'),
  ('Apples','Apples & pears'),('Wheat/flour','Grains & starches'),('Corn/masa','Grains & starches'),
  ('Rice','Grains & starches'),('Oats','Grains & starches'),('Black beans','Beans & legumes'),
  ('Black-eyed peas','Beans & legumes'),('Chickpeas','Beans & legumes'),('Pinto beans','Beans & legumes'),
  ('Pumpkin seeds','Nuts & seeds'),('Sunflower seeds','Nuts & seeds'),('Sunflower butter','Nuts & seeds'),
  ('Tahini','Nuts & seeds'),('Peanut butter','Nuts & seeds'),('Yogurt','Dairy'),('Cheese','Dairy'),
  ('Butter','Dairy'),('Milk','Dairy'),('Coconut milk','Dairy alternatives'),('Cilantro','Fresh herbs'),
  ('Parsley','Fresh herbs'),('Mint','Fresh herbs'),('Ginger','Spices'),('Cinnamon','Spices'),
  ('Honey','Sweeteners')
),
-- The 11 frozen rows: active lessons that carry an off-vocab cooking_skills value
-- (superset) OR a stray OR an unbacked specific. All three subsets ⊂ this set.
targets AS (
  SELECT l.lesson_id
  FROM lessons l
  WHERE l.retired_at IS NULL
    AND (
      EXISTS (SELECT 1 FROM unnest(l.cooking_skills) v JOIN cs_map m ON m.legacy = v)
      OR l.main_ingredients && ARRAY['Avocados','Basil','Various spices']
      OR EXISTS (SELECT 1 FROM unnest(l.main_ingredients) v
                 JOIN parent_map pm ON pm.specific = v
                 WHERE NOT (pm.parent = ANY(l.main_ingredients)))
    )
),
-- Healed arrays computed ONCE per target row (entirely from the OLD row), then
-- written to the columns AND the metadata JSONB mirror in the same single UPDATE.
computed AS (
  SELECT
    l.lesson_id,
    -- (a) cooking_skills: map through cs_map, DROP NULL targets, order-preserving de-dupe.
    (
      SELECT COALESCE(array_agg(v ORDER BY ord), ARRAY[]::text[])
      FROM (
        SELECT v, min(ord) AS ord
        FROM (
          SELECT CASE WHEN m.legacy IS NOT NULL THEN m.canon ELSE x.val END AS v, x.ord
          FROM unnest(l.cooking_skills) WITH ORDINALITY AS x(val, ord)
          LEFT JOIN cs_map m ON m.legacy = x.val
        ) mapped
        WHERE v IS NOT NULL            -- drops 'Basic Skills' (canon NULL)
        GROUP BY v
      ) d
    ) AS new_cs,
    -- (b)+(c) main_ingredients: stray-remap+de-dupe, then append missing parent groups.
    (
      WITH remapped AS (
        SELECT COALESCE(array_agg(v ORDER BY ord), ARRAY[]::text[]) AS arr
        FROM (
          SELECT v, min(ord) AS ord
          FROM (
            SELECT CASE WHEN s.legacy IS NOT NULL THEN s.canon ELSE x.val END AS v, x.ord
            FROM unnest(l.main_ingredients) WITH ORDINALITY AS x(val, ord)
            LEFT JOIN mi_stray s ON s.legacy = x.val
          ) m0
          GROUP BY v
        ) d
      )
      SELECT r.arr || COALESCE(
        (SELECT array_agg(p ORDER BY p)
         FROM (SELECT DISTINCT pm.parent AS p
               FROM parent_map pm
               WHERE pm.specific = ANY(r.arr)
                 AND NOT (pm.parent = ANY(r.arr))) pp),
        ARRAY[]::text[])
      FROM remapped r
    ) AS new_mi
  FROM lessons l
  WHERE l.lesson_id IN (SELECT lesson_id FROM targets)
)
UPDATE lessons l
SET
  cooking_skills   = c.new_cs,
  main_ingredients = c.new_mi,
  -- (d) metadata JSONB mirror — same healed arrays, same single write.
  metadata = jsonb_set(
    jsonb_set(COALESCE(l.metadata, '{}'::jsonb), '{cookingSkills}', to_jsonb(c.new_cs)),
    '{mainIngredients}', to_jsonb(c.new_mi)
  )
FROM computed c
WHERE l.lesson_id = c.lesson_id;

-- ---------------------------------------------------------------------------
-- POST-ASSERT — all four checks clean on active rows, else roll back.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_violations int;
  v_strays     int;
  v_cs_offvocab int;
  v_jsonb_drift int;
BEGIN
  WITH parent_map(specific, parent) AS (VALUES
    ('Garlic','Alliums'),('Carrots','Root vegetables'),('Sweet potatoes','Root vegetables'),
    ('Potatoes','Root vegetables'),('Beets','Root vegetables'),('Tomatoes','Nightshades'),
    ('Bell peppers','Peppers'),('Cabbage','Cruciferous'),('Winter squash','Squash, cucumbers & melons'),
    ('Cucumbers','Squash, cucumbers & melons'),('Melons','Squash, cucumbers & melons'),
    ('Bananas','Tropical fruits'),('Avocado','Tropical fruits'),('Coconut','Tropical fruits'),
    ('Lemon','Citrus fruits'),('Oranges','Citrus fruits'),('Lime','Citrus fruits'),
    ('Apples','Apples & pears'),('Wheat/flour','Grains & starches'),('Corn/masa','Grains & starches'),
    ('Rice','Grains & starches'),('Oats','Grains & starches'),('Black beans','Beans & legumes'),
    ('Black-eyed peas','Beans & legumes'),('Chickpeas','Beans & legumes'),('Pinto beans','Beans & legumes'),
    ('Pumpkin seeds','Nuts & seeds'),('Sunflower seeds','Nuts & seeds'),('Sunflower butter','Nuts & seeds'),
    ('Tahini','Nuts & seeds'),('Peanut butter','Nuts & seeds'),('Yogurt','Dairy'),('Cheese','Dairy'),
    ('Butter','Dairy'),('Milk','Dairy'),('Coconut milk','Dairy alternatives'),('Cilantro','Fresh herbs'),
    ('Parsley','Fresh herbs'),('Mint','Fresh herbs'),('Ginger','Spices'),('Cinnamon','Spices'),
    ('Honey','Sweeteners')),
  canon(v) AS (VALUES
    ('Measuring'),('Mixing & stirring'),('Reading & following recipes'),('Kitchen & food safety'),
    ('Tasting'),('Grating'),('Mashing'),('Blending & juicing'),('Seasoning & spice blending'),
    ('Knife skills'),('Boiling & simmering'),('Sautéing & stir-frying'),('Steaming'),('Roasting'),
    ('Baking'),('Grilling'),('Dough making'),('Creating sauces & dressings'),('Pickling & preserving'),
    ('Fermenting'),('Assembling dishes'),('Wrapping & rolling'),('Plating & garnishing'))
  SELECT
    (SELECT count(DISTINCT l.lesson_id)
       FROM lessons l JOIN parent_map pm ON pm.specific = ANY(l.main_ingredients)
       WHERE l.retired_at IS NULL AND NOT (pm.parent = ANY(l.main_ingredients))),
    (SELECT count(DISTINCT l.lesson_id)
       FROM lessons l, unnest(l.main_ingredients) val
       WHERE l.retired_at IS NULL AND val IN ('Avocados','Basil','Various spices')),
    (SELECT count(DISTINCT l.lesson_id)
       FROM lessons l, unnest(l.cooking_skills) cs
       WHERE l.retired_at IS NULL AND cs NOT IN (SELECT v FROM canon)),
    -- (d) JSONB mirror sync: no active row may disagree between the column and
    -- metadata->'mainIngredients' / ->'cookingSkills' (order-insensitive; a
    -- missing/non-array JSONB key is treated as empty, matching an empty column).
    (SELECT count(*)
       FROM lessons l
       WHERE l.retired_at IS NULL
         AND (
           (SELECT COALESCE(array_agg(x ORDER BY x), ARRAY[]::text[])
              FROM jsonb_array_elements_text(
                CASE WHEN jsonb_typeof(l.metadata->'mainIngredients') = 'array'
                     THEN l.metadata->'mainIngredients' ELSE '[]'::jsonb END) x)
           IS DISTINCT FROM
           (SELECT COALESCE(array_agg(x ORDER BY x), ARRAY[]::text[])
              FROM unnest(l.main_ingredients) x)
           OR
           (SELECT COALESCE(array_agg(x ORDER BY x), ARRAY[]::text[])
              FROM jsonb_array_elements_text(
                CASE WHEN jsonb_typeof(l.metadata->'cookingSkills') = 'array'
                     THEN l.metadata->'cookingSkills' ELSE '[]'::jsonb END) x)
           IS DISTINCT FROM
           (SELECT COALESCE(array_agg(x ORDER BY x), ARRAY[]::text[])
              FROM unnest(l.cooking_skills) x)
         ))
  INTO v_violations, v_strays, v_cs_offvocab, v_jsonb_drift;

  IF v_violations <> 0 OR v_strays <> 0 OR v_cs_offvocab <> 0 OR v_jsonb_drift <> 0 THEN
    RAISE EXCEPTION 'Brief-5 data fix post-assert FAILED: invariant=% strays=% cooking_skills_offvocab=% jsonb_drift=% (rolling back)',
      v_violations, v_strays, v_cs_offvocab, v_jsonb_drift;
  END IF;
END $$;

COMMIT;
