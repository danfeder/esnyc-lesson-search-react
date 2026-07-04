-- =====================================================
-- Migration: 20260709000000_seed_search_synonyms_live_rows.sql
-- =====================================================
-- Description: Insurance seed for public.search_synonyms — captures the full live
-- production state (74 rows) as an idempotent, guarded INSERT so a local
-- `supabase db reset` or a `reset-test-db.yml` run no longer silently collapses the
-- table to the 14 migration-owned rows (13 from 20260522000000 + 1 from
-- 20260618120000; the 20251001 baseline is schema-only). Losing the other 60 rows
-- makes search behavior unreproducible locally and desyncs TEST from PROD — including
-- the `activity -> {activities,lesson,lessons,project,projects}` row that the FP-19
-- synonym-hint feature and its tests depend on.
--
-- Evidence: C3/FP4-SYN-06 (docs/plans/fp4-discovery/discovery-evidence.md).
-- Provenance of the 74 rows: docs/plans/fp4-briefs/brief-2-synonyms-census.md.
--
-- NO PRODUCTION BEHAVIOR CHANGE: all 74 rows already exist on PROD, so the guarded
-- INSERT no-ops there (and on TEST). On a fresh local reset the 14 owned rows already
-- exist from the earlier seed migrations, so this inserts only the remaining 60.
--
-- Idempotent everywhere: WHERE NOT EXISTS guards on the FULL (term, synonym_type,
-- synonyms) tuple — the real uniqueness key. Live PROD has 74 rows / 74 distinct full
-- tuples but only 68 distinct (term, synonym_type) pairs: six terms legitimately carry
-- two differently-scoped synonym rows (woman, christmas, easter, halloween, hispanic,
-- thanksgiving). Matching on the full tuple preserves those pairs and never duplicates.
--
-- All rows satisfy the existing search_synonyms_lexemes_no_whitespace CHECK (added by
-- 20260522000000) because they are transcribed verbatim from live PROD, which enforces
-- it. The VALUES block was generated programmatically via Postgres' own format('%L') /
-- quote_literal over the live table and cross-checked byte-for-byte (md5) against an
-- independent generator — do not hand-edit; regenerate from the census if the live
-- table ever changes.
--
-- Wrapped in BEGIN/COMMIT so the in-transaction post-asserts can roll the INSERT back
-- (supabase db push is autocommit per-statement otherwise). Touches only
-- search_synonyms — no lessons lock required.

BEGIN;

WITH live_rows(term, synonyms, synonym_type) AS (
  VALUES
    ('3', ARRAY['3rd', 'third', 'three']::text[], 'bidirectional'),
    ('4', ARRAY['4th', 'fourth', 'four']::text[], 'bidirectional'),
    ('5', ARRAY['5th', 'fifth', 'five']::text[], 'bidirectional'),
    ('6', ARRAY['6th', 'sixth', 'six']::text[], 'bidirectional'),
    ('7', ARRAY['7th', 'seventh', 'seven']::text[], 'bidirectional'),
    ('8', ARRAY['8th', 'eighth', 'eight']::text[], 'bidirectional'),
    ('activity', ARRAY['activities', 'lesson', 'lessons', 'project', 'projects']::text[], 'bidirectional'),
    ('african', ARRAY['ethiopian', 'nigerian', 'moroccan']::text[], 'oneway'),
    ('asian', ARRAY['chinese', 'japanese', 'korean', 'vietnamese', 'thai', 'indian', 'filipino']::text[], 'oneway'),
    ('berries', ARRAY['strawberry', 'blueberry', 'raspberry', 'blackberry', 'cranberry']::text[], 'oneway'),
    ('child', ARRAY['children', 'kid', 'kids', 'student', 'students']::text[], 'bidirectional'),
    ('childrens', ARRAY['children''s']::text[], 'typo_correction'),
    ('christmas', ARRAY['holiday', 'gingerbread']::text[], 'oneway'),
    ('christmas', ARRAY['winter', 'celebration', 'december']::text[], 'oneway'),
    ('citrus', ARRAY['orange', 'lemon', 'lime', 'grapefruit', 'tangerine']::text[], 'oneway'),
    ('cookin', ARRAY['cooking']::text[], 'typo_correction'),
    ('cooking', ARRAY['cook', 'culinary', 'kitchen', 'baking', 'bake']::text[], 'bidirectional'),
    ('decay', ARRAY['decomposition']::text[], 'oneway'),
    ('easter', ARRAY['eggs', 'april', 'bunny']::text[], 'oneway'),
    ('easter', ARRAY['spring', 'celebration']::text[], 'oneway'),
    ('elementary', ARRAY['elem', 'primary']::text[], 'bidirectional'),
    ('elementry', ARRAY['elementary']::text[], 'typo_correction'),
    ('fall', ARRAY['autumn', 'september', 'october', 'november']::text[], 'bidirectional'),
    ('garden', ARRAY['gardening', 'planting', 'plant', 'growing', 'grow', 'cultivation']::text[], 'bidirectional'),
    ('greens', ARRAY['kale', 'spinach', 'lettuce', 'chard', 'collards', 'arugula']::text[], 'bidirectional'),
    ('growin', ARRAY['growing']::text[], 'typo_correction'),
    ('halloween', ARRAY['fall', 'celebration']::text[], 'oneway'),
    ('halloween', ARRAY['pumpkin', 'october']::text[], 'oneway'),
    ('harvest', ARRAY['harvesting', 'picking', 'gathering', 'collecting']::text[], 'bidirectional'),
    ('healthy', ARRAY['healthful', 'nutritious', 'wholesome']::text[], 'bidirectional'),
    ('healty', ARRAY['healthy']::text[], 'typo_correction'),
    ('herb', ARRAY['herbs', 'spice', 'spices', 'seasoning', 'seasonings']::text[], 'bidirectional'),
    ('hispanic', ARRAY['latin', 'american']::text[], 'oneway'),
    ('hispanic', ARRAY['latino', 'latina', 'latinx', 'mexican', 'spanish', 'caribbean']::text[], 'oneway'),
    ('k', ARRAY['kindergarten', 'kinder']::text[], 'bidirectional'),
    ('kindergarden', ARRAY['kindergarten']::text[], 'typo_correction'),
    ('latin', ARRAY['latino', 'latina', 'latinx', 'mexican', 'spanish', 'caribbean']::text[], 'oneway'),
    ('latino', ARRAY['hispanic', 'latina', 'latinx', 'latin', 'american', 'spanish']::text[], 'oneway'),
    ('man', ARRAY['men', 'male', 'gentleman', 'gentlemen']::text[], 'bidirectional'),
    ('mediterranean', ARRAY['italian', 'greek', 'spanish', 'turkish', 'moroccan']::text[], 'oneway'),
    ('middel', ARRAY['middle']::text[], 'typo_correction'),
    ('middle', ARRAY['ms', 'intermediate']::text[], 'bidirectional'),
    ('nutrition', ARRAY['nutrients', 'dietary', 'diet', 'eating']::text[], 'bidirectional'),
    ('nutrtion', ARRAY['nutrition']::text[], 'typo_correction'),
    ('pk', ARRAY['prek', 'prekindergarten', '3k', '4k']::text[], 'bidirectional'),
    ('plantin', ARRAY['planting']::text[], 'typo_correction'),
    ('potatos', ARRAY['potatoes']::text[], 'typo_correction'),
    ('pumkin', ARRAY['pumpkin']::text[], 'typo_correction'),
    ('quick', ARRAY['fast', 'easy', 'simple']::text[], 'bidirectional'),
    ('reciepe', ARRAY['recipe']::text[], 'typo_correction'),
    ('reciepes', ARRAY['recipes']::text[], 'typo_correction'),
    ('recipe', ARRAY['recipes', 'instructions', 'directions']::text[], 'bidirectional'),
    ('recipie', ARRAY['recipe']::text[], 'typo_correction'),
    ('recipies', ARRAY['recipes']::text[], 'typo_correction'),
    ('roots', ARRAY['carrot', 'potato', 'beet', 'turnip', 'radish']::text[], 'bidirectional'),
    ('skwash', ARRAY['squash']::text[], 'typo_correction'),
    ('spring', ARRAY['march', 'april', 'may']::text[], 'bidirectional'),
    ('squash', ARRAY['butternut', 'acorn', 'pumpkin', 'kabocha', 'delicata']::text[], 'bidirectional'),
    ('summer', ARRAY['june', 'july', 'august']::text[], 'bidirectional'),
    ('thanksgiving', ARRAY['gratitude', 'harvest']::text[], 'bidirectional'),
    ('thanksgiving', ARRAY['harvest', 'festival']::text[], 'oneway'),
    ('thanksgiving', ARRAY['harvest', 'turkey', 'gratitude', 'cranberry', 'pumpkin']::text[], 'oneway'),
    ('tomatoe', ARRAY['tomato']::text[], 'typo_correction'),
    ('valentine', ARRAY['love', 'heart', 'february']::text[], 'oneway'),
    ('vegatable', ARRAY['vegetable']::text[], 'typo_correction'),
    ('vegatables', ARRAY['vegetables']::text[], 'typo_correction'),
    ('vegetable', ARRAY['vegetables', 'veggie', 'veggies', 'veg']::text[], 'bidirectional'),
    ('vegitable', ARRAY['vegetable']::text[], 'typo_correction'),
    ('vegitables', ARRAY['vegetables']::text[], 'typo_correction'),
    ('winter', ARRAY['december', 'january', 'february']::text[], 'bidirectional'),
    ('woman', ARRAY['girls', 'women''s', 'girl']::text[], 'bidirectional'),
    ('woman', ARRAY['women', 'female', 'lady', 'ladies']::text[], 'bidirectional'),
    ('womans', ARRAY['woman''s']::text[], 'typo_correction'),
    ('womens', ARRAY['women''s']::text[], 'typo_correction')
)
INSERT INTO search_synonyms (term, synonyms, synonym_type)
SELECT n.term, n.synonyms, n.synonym_type
FROM live_rows n
WHERE NOT EXISTS (
  SELECT 1
  FROM search_synonyms s
  WHERE s.term = n.term
    AND s.synonym_type = n.synonym_type
    AND s.synonyms = n.synonyms
);

-- Post-apply invariants — any violation rolls back the whole transaction.
DO $$
DECLARE
  v_total    integer;
  v_distinct integer;
  v_activity integer;
BEGIN
  SELECT count(*), count(DISTINCT (term, synonyms, synonym_type))
    INTO v_total, v_distinct
    FROM search_synonyms;

  -- 1) Table must hold at least the full live snapshot.
  IF v_total < 74 THEN
    RAISE EXCEPTION 'search_synonyms seed: expected >= 74 rows, found %', v_total;
  END IF;

  -- 2) No exact-duplicate (term, synonyms, synonym_type) rows introduced.
  IF v_total <> v_distinct THEN
    RAISE EXCEPTION 'search_synonyms seed: % duplicate full-tuple row(s) present (total=%, distinct=%)',
      v_total - v_distinct, v_total, v_distinct;
  END IF;

  -- 3) The FP-19-critical activity row is present with its exact synonym set.
  SELECT count(*) INTO v_activity
    FROM search_synonyms
    WHERE term = 'activity'
      AND synonym_type = 'bidirectional'
      AND synonyms = ARRAY['activities', 'lesson', 'lessons', 'project', 'projects']::text[];
  IF v_activity <> 1 THEN
    RAISE EXCEPTION 'search_synonyms seed: expected exactly 1 activity row, found %', v_activity;
  END IF;
END $$;

COMMIT;

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- This is an insurance seed: it only ever INSERTs rows already live on PROD, guarded so
-- it never duplicates. There is no safe automatic rollback — deleting "the rows this
-- added" could remove legitimate live synonym data on any environment where they
-- pre-existed. If a revert is ever required, do it as a targeted, reviewed data fix.
