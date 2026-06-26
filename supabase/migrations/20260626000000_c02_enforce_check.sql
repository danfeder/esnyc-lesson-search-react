-- =====================================================
-- Migration: 20260626000000_c02_enforce_check.sql
-- =====================================================
-- Description:
--   C02 — Cooking Skills & Main Ingredients re-tag ENFORCEMENT (P4b). Installs
--   two table-wide CHECK constraints on the lessons text[] columns —
--   valid_cooking_skills and valid_main_ingredients — that reject any value
--   outside the frozen canonical vocabulary. This is the DB-layer half of the
--   enforcement lockdown; the app-layer half (closed reviewer dropdowns + Zod
--   enums + specific->group superRefine across all 4 schemas + the edge mirror)
--   shipped and DEPLOYED to PROD in P4a (PR #547), so the expand/contract
--   sequencing guard (design §4 Q9 / §7) is satisfied: data canonical (P3) ->
--   closed write surface deployed (P4a) -> CHECK (this migration).
--
--   The constraint vocab is BYTE-IDENTICAL to enums.json["cooking_skills"] (23)
--   and enums.json["main_ingredients"] (70) — the single generated registry that
--   the P4a Zod *_VALUES consts and the frozen manifest
--   scripts/stage2-retag/data/c02-vocab.json all agree on. Do not hand-edit a
--   value here; change the manifest + regenerate enums.json + re-derive.
--
-- WHY "NOT VALID" (user verdict 2026-06-26, design §4 Q9 re-opened on new census
-- evidence):
--   Both constraints are added NOT VALID. Postgres then ENFORCES them on every
--   future INSERT/UPDATE (the enforcement goal — block re-pollution of these two
--   fields) but does NOT scan/validate the pre-existing rows. This is required
--   because P3's apply scoped deliberately to LIVE, in-scope lessons only, so a
--   small set of rows that P3 never re-tagged still hold legacy off-vocab values
--   and a plain (validating) ADD CONSTRAINT would fail. Read-only PROD drift
--   census (2026-06-26) = 18 such rows, all out of P3's scope by design:
--     * 11 LIVE corpus-exclusion non-lessons (all in
--       scripts/stage2-retag/data/corpus-exclusions.json; slated for deletion on
--       the separate cleanup track) — e.g. cooking 'Simmering'/'Mixing',
--       ingredient 'Various spices'.
--     * 7 RETIRED lessons (retired_at IS NOT NULL; never in P3's live-only scope)
--       — e.g. 'Herbs & Aromatics', 'Cutting Skills', 'Grains & Starches'.
--   These 18 rows are intentionally GRANDFATHERED. The live, in-scope corpus is
--   already fully canonical (P3 PROD verify: 752/752, 0 off-vocab). A future
--   `ALTER TABLE public.lessons VALIDATE CONSTRAINT valid_cooking_skills;`
--   (+ valid_main_ingredients) can promote both to fully VALID once the
--   corpus-exclusion deletion track removes the 11 live rows and the 7 retired
--   rows are handled — that is a SEPARATE follow-up, not this migration.
--
--   OPERATIONAL NOTE for the cleanup track (GATE 2 Codex LOW): NOT VALID still
--   enforces on UPDATE, so the 18 rows are grandfathered only while untouched. A
--   future write that touches one of them must either hard-DELETE the row or
--   canonicalize (or null/empty) its cooking_skills/main_ingredients in the SAME
--   statement — a partial UPDATE that leaves an off-vocab value in place will be
--   rejected. (The closed P4a reviewer surface only emits canonical values, so a
--   normal reviewer edit writes canonical C02 arrays and passes; the only hazard
--   is a direct/partial SQL update on one of the 18.)
--
--   Empty array '{}' satisfies the CHECK (empty set <@ anything = TRUE); NULL is
--   allowed explicitly. So canonical, empty, and NULL all pass; only a genuine
--   off-vocab value is rejected on a future write.
--
-- DATA SAFETY:
--   Pure additive DDL — ZERO data mutation (no UPDATE, no snapshot table, no
--   pre-CHECK cleanup). Idempotent: each constraint is guarded by a pg_constraint
--   existence check, so re-running is a no-op. Re-runnable on a DB that already
--   has either constraint.
--
-- SOURCES (hand-synced from the generated registry):
--   src/types/generated/enums.json   (keys "cooking_skills", "main_ingredients")
--   src/types/lessonMetadata.zod.ts  (COOKING_SKILLS_VALUES / MAIN_INGREDIENTS_VALUES)
--   scripts/stage2-retag/data/c02-vocab.json  (frozen manifest)
--
-- Rollback: sibling 20260626000000_c02_enforce_check.sql.rollback
--           (DROP CONSTRAINT only — nothing to restore, this migration mutates
--            no data).
--
-- See:
--   docs/plans/2026-06-22-c02-cooking-ingredients-retag-design.md §7 + §4 Q9
--   docs/plans/2026-06-22-c02-cooking-ingredients-retag-implementation.md P4b
--   Precedent: 20260515000000_metadata_value_validation.sql (closed-enum CHECKs),
--              20260617000000_pr6c2_retag_apply.sql (valid_garden_skills)
-- =====================================================


-- =====================================================
-- CHECK constraints on the two C02 text[] columns.
-- Idempotent via DO blocks (pg_constraint existence check). Added NOT VALID
-- (enforce on future writes; grandfather the 18 out-of-scope legacy rows).
-- =====================================================
DO $$
BEGIN
  -- SOURCE: enums.json["cooking_skills"]
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valid_cooking_skills'
      AND conrelid = 'public.lessons'::regclass
  ) THEN
    ALTER TABLE public.lessons
      ADD CONSTRAINT valid_cooking_skills
      CHECK (
        cooking_skills IS NULL
        OR cooking_skills <@ ARRAY[
          'Measuring',
          'Mixing & stirring',
          'Reading & following recipes',
          'Kitchen & food safety',
          'Tasting',
          'Grating',
          'Mashing',
          'Blending & juicing',
          'Seasoning & spice blending',
          'Knife skills',
          'Boiling & simmering',
          'Sautéing & stir-frying',
          'Steaming',
          'Roasting',
          'Baking',
          'Grilling',
          'Dough making',
          'Creating sauces & dressings',
          'Pickling & preserving',
          'Fermenting',
          'Assembling dishes',
          'Wrapping & rolling',
          'Plating & garnishing'
        ]::text[]
      )
      NOT VALID;
  END IF;

  -- SOURCE: enums.json["main_ingredients"]
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valid_main_ingredients'
      AND conrelid = 'public.lessons'::regclass
  ) THEN
    ALTER TABLE public.lessons
      ADD CONSTRAINT valid_main_ingredients
      CHECK (
        main_ingredients IS NULL
        OR main_ingredients <@ ARRAY[
          'Alliums',
          'Leafy greens',
          'Root vegetables',
          'Nightshades',
          'Peppers',
          'Cruciferous',
          'Squash, cucumbers & melons',
          'Mushrooms',
          'Berries',
          'Citrus fruits',
          'Tropical fruits',
          'Apples & pears',
          'Stone fruits',
          'Dried fruits',
          'Grains & starches',
          'Beans & legumes',
          'Nuts & seeds',
          'Eggs',
          'Tofu & plant proteins',
          'Dairy',
          'Dairy alternatives',
          'Fresh herbs',
          'Spices',
          'Sweeteners',
          'Garlic',
          'Carrots',
          'Sweet potatoes',
          'Potatoes',
          'Beets',
          'Tomatoes',
          'Bell peppers',
          'Cabbage',
          'Winter squash',
          'Cucumbers',
          'Melons',
          'Bananas',
          'Avocado',
          'Coconut',
          'Lemon',
          'Oranges',
          'Lime',
          'Apples',
          'Wheat/flour',
          'Corn/masa',
          'Rice',
          'Oats',
          'Black beans',
          'Black-eyed peas',
          'Chickpeas',
          'Pinto beans',
          'Pumpkin seeds',
          'Sunflower seeds',
          'Sunflower butter',
          'Tahini',
          'Peanut butter',
          'Yogurt',
          'Cheese',
          'Butter',
          'Milk',
          'Coconut milk',
          'Cilantro',
          'Parsley',
          'Mint',
          'Ginger',
          'Cinnamon',
          'Honey',
          'Celery',
          'Fennel',
          'Seaweed (nori)',
          'Cocoa & chocolate'
        ]::text[]
      )
      NOT VALID;
  END IF;
END $$;
