-- =====================================================
-- Migration: 20261026004805_repair_array_mirror_drift.sql
-- =====================================================
-- Description: Data repair for the column ⇄ metadata-mirror drift on
--   public.lessons that the sibling migration
--   20261026004447_normalize_trigger_sync_remaining_array_mirrors.sql stops
--   from recurring. For each of the five pairs
--
--     observances_holidays             ⇄ metadata->'observancesHolidays'
--     main_ingredients                 ⇄ metadata->'mainIngredients'
--     garden_skills                    ⇄ metadata->'gardenSkills'
--     cooking_skills                   ⇄ metadata->'cookingSkills'
--     cultural_responsiveness_features ⇄ metadata->'culturalResponsivenessFeatures'
--
--   every row whose column is NON-EMPTY and whose mirror does not match it
--   gets the mirror re-copied from the column (column is the source of
--   truth; it is what the filters, facet counts and the search vector read).
--   This is exactly what the extended trigger does on the next ordinary
--   write of such a row — the migration only brings rows at rest forward.
--
-- Scope (PROD census 2026-10-22, 852 lessons): 59 (lesson, field) pairs on
--   45 lessons — observances 7, mainIngredients 1, cookingSkills 6,
--   gardenSkills 1, culturalResponsivenessFeatures 44 — every mirror
--   literally '[]'. TEST: 0 pairs. Provenance (ids, titles, column values,
--   updated_at per pair): scripts/mirror-drift/census-2026-10-22.prod.json.
--   The census is re-run with scripts/mirror-drift/mirror-census.sql.
--
-- Safe when the drift is already zero: the UPDATE then touches 0 rows and
--   every assertion still passes (TEST, and PROD rows that self-healed
--   through a later write). Re-running is an idempotent no-op.
--
-- Deliberately NOT done here: gradeLevels (complete_review_atomic never
--   writes that key; a design question, not drift) and tags (retired facet,
--   inert column). Not bumped: updated_at — the reviewed tags did not
--   change; a derived store is realigned. The search vector is recomputed
--   by its own trigger on the metadata write but reads only columns (+
--   academicConcepts), so it is asserted UNCHANGED.
--
-- BEGIN/COMMIT: supabase db push is per-statement autocommit, so the wrapper
--   is load-bearing — every DO-block assertion can abort the whole file.
--
-- Rollback: 20261026004805_repair_array_mirror_drift.sql.rollback — resets the
--   59 censused mirrors to '[]' (restores the drift by design) and refuses to
--   run while the extended trigger is live. Only meaningful after reverting
--   the sibling trigger migration.
-- =====================================================

BEGIN;

LOCK TABLE public.lessons IN SHARE ROW EXCLUSIVE MODE;

-- =====================================================
-- PRE-ASSERTS
-- =====================================================

-- PRE 0: run order — the extended trigger (sections (L)–(P)) is live,
--        attached and enabled, so the repair semantics equal the trigger's.
DO $$
DECLARE
  v_src text;
  v_missing text;
BEGIN
  SELECT p.prosrc INTO v_src
  FROM pg_trigger t
  JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE t.tgrelid = 'public.lessons'::regclass
    AND t.tgname = 'lessons_normalize_write_trg'
    AND p.proname = 'lessons_normalize_write'
    AND t.tgenabled <> 'D';
  IF v_src IS NULL THEN
    RAISE EXCEPTION 'PRE-ASSERT 0 FAILED: lessons_normalize_write_trg is not attached/enabled on public.lessons';
  END IF;
  SELECT string_agg(m, ', ') INTO v_missing
  FROM unnest(ARRAY[
    'jsonb_set(NEW.metadata, ''{observancesHolidays}''',
    'jsonb_set(NEW.metadata, ''{mainIngredients}''',
    'jsonb_set(NEW.metadata, ''{gardenSkills}''',
    'jsonb_set(NEW.metadata, ''{cookingSkills}''',
    'jsonb_set(NEW.metadata, ''{culturalResponsivenessFeatures}'''
  ]) AS m
  WHERE strpos(v_src, m) = 0;
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'PRE-ASSERT 0 FAILED: lessons_normalize_write lacks the sync section(s) for %. Apply 20261026004447_normalize_trigger_sync_remaining_array_mirrors.sql first.', v_missing;
  END IF;
END $$;

-- PRE 1: no row has the INVERSE shape (empty column, non-empty mirror
--        array) on any of the five pairs. Such a row is not repaired here
--        (the column would be derived from the mirror on its next write),
--        so its presence means the census moved — stop and look.
DO $$
DECLARE
  v_count bigint;
  v_sample text;
BEGIN
  CREATE TEMP TABLE _pre1_inverse ON COMMIT DROP AS
    SELECT l.lesson_id, p.key
    FROM public.lessons l
    CROSS JOIN LATERAL (VALUES
      ('observancesHolidays',            l.observances_holidays),
      ('mainIngredients',                l.main_ingredients),
      ('gardenSkills',                   l.garden_skills),
      ('cookingSkills',                  l.cooking_skills),
      ('culturalResponsivenessFeatures', l.cultural_responsiveness_features)
    ) AS p(key, col)
    WHERE COALESCE(array_length(p.col, 1), 0) = 0
      AND jsonb_typeof(l.metadata->p.key) = 'array'
      AND jsonb_array_length(l.metadata->p.key) > 0;
  SELECT count(*) INTO v_count FROM _pre1_inverse;
  IF v_count > 0 THEN
    SELECT string_agg(lesson_id || ':' || key, ', ' ORDER BY lesson_id, key)
      INTO v_sample
    FROM (SELECT * FROM _pre1_inverse ORDER BY lesson_id, key LIMIT 10) s;
    RAISE EXCEPTION 'PRE-ASSERT 1 FAILED: % row(s) have an empty column with a non-empty metadata array (first 10: %). Re-census before applying.', v_count, v_sample;
  END IF;
END $$;

-- =====================================================
-- SNAPSHOT + TARGET LIST
-- =====================================================

CREATE TEMP TABLE _mirror_repair_before ON COMMIT DROP AS
SELECT * FROM public.lessons;

-- A (lesson, key) pair is a target when the column is non-empty and the
-- mirror is not the same multiset (the trigger's own helper decides).
CREATE TEMP TABLE _mirror_repair_targets ON COMMIT DROP AS
SELECT l.lesson_id, l.title, p.key, p.col, l.metadata->p.key AS mirror_before
FROM public.lessons l
CROSS JOIN LATERAL (VALUES
  ('observancesHolidays',            l.observances_holidays),
  ('mainIngredients',                l.main_ingredients),
  ('gardenSkills',                   l.garden_skills),
  ('cookingSkills',                  l.cooking_skills),
  ('culturalResponsivenessFeatures', l.cultural_responsiveness_features)
) AS p(key, col)
WHERE COALESCE(array_length(p.col, 1), 0) > 0
  AND NOT public._meta_array_matches_column(l.metadata->p.key, p.col);

-- PRE 2: every target mirror is absent, JSON null, or a JSON array (the
--        censused shape is '[]'). A string/object/number mirror is not a
--        shape this repair was written for — stop and look.
DO $$
DECLARE
  v_bad text;
BEGIN
  SELECT string_agg(lesson_id || ':' || key || ' (' || jsonb_typeof(mirror_before) || ')', ', ')
    INTO v_bad
  FROM _mirror_repair_targets
  WHERE mirror_before IS NOT NULL
    AND jsonb_typeof(mirror_before) NOT IN ('null', 'array');
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'PRE-ASSERT 2 FAILED: unexpected mirror shape on %', v_bad;
  END IF;
END $$;

-- Echo what will change (visible in the db push / CI log).
DO $$
DECLARE
  r record;
  v_pairs bigint;
  v_lessons bigint;
BEGIN
  SELECT count(*), count(DISTINCT lesson_id) INTO v_pairs, v_lessons FROM _mirror_repair_targets;
  RAISE NOTICE 'mirror repair: % drifted (lesson, field) pair(s) on % lesson(s)', v_pairs, v_lessons;
  FOR r IN
    SELECT lesson_id, title, key, col, mirror_before
    FROM _mirror_repair_targets
    ORDER BY key, lesson_id
  LOOP
    RAISE NOTICE 'mirror repair: % | % | % | column=% | mirror_before=%',
      r.lesson_id, r.title, r.key, r.col, COALESCE(r.mirror_before::text, 'absent');
  END LOOP;
END $$;

-- =====================================================
-- CHANGE: copy each drifted column into its mirror (one UPDATE per lesson,
--         only the drifted keys of that lesson; updated_at NOT bumped).
--         The extended trigger fires on this UPDATE and finds nothing left
--         to do for the five pairs.
-- =====================================================
UPDATE public.lessons l
SET metadata = COALESCE(l.metadata, '{}'::jsonb) || d.patch
FROM (
  SELECT lesson_id, jsonb_object_agg(key, to_jsonb(col)) AS patch
  FROM _mirror_repair_targets
  GROUP BY lesson_id
) d
WHERE l.lesson_id = d.lesson_id;

-- =====================================================
-- POST-ASSERTS
-- =====================================================

-- POST A: table-wide zero drift on the five pairs (by the trigger's helper).
DO $$
DECLARE
  v_count bigint;
  v_sample text;
BEGIN
  CREATE TEMP TABLE _post_a_drift ON COMMIT DROP AS
    SELECT l.lesson_id, p.key
    FROM public.lessons l
    CROSS JOIN LATERAL (VALUES
      ('observancesHolidays',            l.observances_holidays),
      ('mainIngredients',                l.main_ingredients),
      ('gardenSkills',                   l.garden_skills),
      ('cookingSkills',                  l.cooking_skills),
      ('culturalResponsivenessFeatures', l.cultural_responsiveness_features)
    ) AS p(key, col)
    WHERE COALESCE(array_length(p.col, 1), 0) > 0
      AND NOT public._meta_array_matches_column(l.metadata->p.key, p.col);
  SELECT count(*) INTO v_count FROM _post_a_drift;
  IF v_count > 0 THEN
    SELECT string_agg(lesson_id || ':' || key, ', ' ORDER BY lesson_id, key)
      INTO v_sample
    FROM (SELECT * FROM _post_a_drift ORDER BY lesson_id, key LIMIT 10) s;
    RAISE EXCEPTION 'POST-ASSERT A FAILED: % pair(s) still drifted after repair (first 10: %)', v_count, v_sample;
  END IF;
END $$;

-- POST B: nothing else moved. For EVERY row: every column other than
--         metadata is byte-identical to the snapshot (so the five columns,
--         updated_at and search_vector are unchanged), and metadata minus
--         the five keys is identical. For NON-target rows metadata is
--         identical in full.
DO $$
DECLARE
  v_count bigint;
  v_sample text;
  v_keys text[] := ARRAY[
    'observancesHolidays', 'mainIngredients', 'gardenSkills',
    'cookingSkills', 'culturalResponsivenessFeatures'
  ];
BEGIN
  SELECT count(*), string_agg(lesson_id, ', ') INTO v_count, v_sample
  FROM (
    SELECT a.lesson_id
    FROM public.lessons a
    JOIN _mirror_repair_before b ON b.lesson_id = a.lesson_id
    WHERE (to_jsonb(a) - 'metadata') IS DISTINCT FROM (to_jsonb(b) - 'metadata')
    LIMIT 10
  ) s;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'POST-ASSERT B FAILED: a non-metadata column changed on % row(s) (first 10: %)', v_count, v_sample;
  END IF;

  SELECT count(*), string_agg(lesson_id, ', ') INTO v_count, v_sample
  FROM (
    SELECT a.lesson_id
    FROM public.lessons a
    JOIN _mirror_repair_before b ON b.lesson_id = a.lesson_id
    WHERE (a.metadata - v_keys) IS DISTINCT FROM (COALESCE(b.metadata, '{}'::jsonb) - v_keys)
    LIMIT 10
  ) s;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'POST-ASSERT B FAILED: a metadata key outside the five pairs changed on % row(s) (first 10: %)', v_count, v_sample;
  END IF;

  SELECT count(*), string_agg(lesson_id, ', ') INTO v_count, v_sample
  FROM (
    SELECT a.lesson_id
    FROM public.lessons a
    JOIN _mirror_repair_before b ON b.lesson_id = a.lesson_id
    WHERE a.lesson_id NOT IN (SELECT lesson_id FROM _mirror_repair_targets)
      AND a.metadata IS DISTINCT FROM b.metadata
    LIMIT 10
  ) s;
  IF v_count > 0 THEN
    RAISE EXCEPTION 'POST-ASSERT B FAILED: metadata changed on % non-target row(s) (first: %)', v_count, v_sample;
  END IF;
END $$;

-- POST C: row count unchanged; every target mirror now equals its column.
DO $$
DECLARE
  v_before bigint;
  v_after bigint;
  v_bad bigint;
BEGIN
  SELECT count(*) INTO v_before FROM _mirror_repair_before;
  SELECT count(*) INTO v_after FROM public.lessons;
  IF v_before <> v_after THEN
    RAISE EXCEPTION 'POST-ASSERT C FAILED: lessons row count moved % -> %', v_before, v_after;
  END IF;
  SELECT count(*) INTO v_bad
  FROM _mirror_repair_targets t
  JOIN public.lessons l ON l.lesson_id = t.lesson_id
  WHERE l.metadata->t.key IS DISTINCT FROM to_jsonb(t.col);
  IF v_bad > 0 THEN
    RAISE EXCEPTION 'POST-ASSERT C FAILED: % target mirror(s) do not equal their column after repair', v_bad;
  END IF;
  RAISE NOTICE 'mirror repair: done — % lesson(s) repaired, % row(s) in lessons, zero drift on the five pairs',
    (SELECT count(DISTINCT lesson_id) FROM _mirror_repair_targets), v_after;
END $$;

COMMIT;
