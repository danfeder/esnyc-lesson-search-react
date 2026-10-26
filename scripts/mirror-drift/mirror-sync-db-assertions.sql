-- =====================================================
-- Mirror-sync DB assertions (LOCAL ONLY).
-- =====================================================
-- Deterministic SQL-level tests for migration
-- 20261026004447_normalize_trigger_sync_remaining_array_mirrors.sql — the
-- lessons_normalize_write() sections (L)–(P) that keep the five remaining
-- text[] column ⇄ metadata-mirror pairs in step:
--   observances_holidays ⇄ observancesHolidays, main_ingredients ⇄
--   mainIngredients, garden_skills ⇄ gardenSkills, cooking_skills ⇄
--   cookingSkills, cultural_responsiveness_features ⇄
--   culturalResponsivenessFeatures.
--
-- Run against the LOCAL stack only, after `supabase db reset`:
--   psql postgresql://postgres:postgres@127.0.0.1:54322/postgres \
--     -v ON_ERROR_STOP=1 -f scripts/mirror-drift/mirror-sync-db-assertions.sql
-- (no psql on the machine? `docker exec -i supabase_db_esynyc-lessonsearch-v2 \
--   psql -U postgres -d postgres -v ON_ERROR_STOP=1 -f - < scripts/mirror-drift/mirror-sync-db-assertions.sql`)
--
-- The whole file runs in ONE transaction and ends with ROLLBACK — it never
-- persists anything. Every assertion RAISEs on failure (ON_ERROR_STOP makes
-- psql exit nonzero). Synthetic ids only (mdtest_*). Needs one seeded
-- auth.users row (the local seed has 3).
--
-- Assertion 4 is the regression test for the production failure: an
-- approve_update whose review payload omits the five keys used to leave the
-- column carried forward but the mirror reset to '[]'. It fails on the
-- 20260518000000 trigger body and passes on the extended one.
-- =====================================================

BEGIN;

-- ---------------------------------------------------------------
-- Setup: a reviewer id (any seeded auth user) + a vocab sanity check.
-- ---------------------------------------------------------------
CREATE TEMP TABLE _t_ctx ON COMMIT DROP AS
SELECT (SELECT id FROM auth.users LIMIT 1) AS reviewer_id;

DO $$
BEGIN
  IF (SELECT reviewer_id FROM _t_ctx) IS NULL THEN
    RAISE EXCEPTION 'SETUP FAILED: no seeded auth user — run supabase db reset first';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE t.tgrelid = 'public.lessons'::regclass
      AND t.tgname = 'lessons_normalize_write_trg'
      AND p.proname = 'lessons_normalize_write'
      AND t.tgenabled <> 'D'
  ) THEN
    RAISE EXCEPTION 'SETUP FAILED: lessons_normalize_write_trg is not attached/enabled';
  END IF;
END $$;

-- A helper used by several assertions: does every one of the five pairs on
-- a given lesson match (empty column ⇔ empty/absent mirror; otherwise the
-- trigger's own multiset comparison)?
CREATE FUNCTION pg_temp._mdtest_in_sync(p_lesson_id text) RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT bool_and(
    CASE
      WHEN COALESCE(array_length(p.col, 1), 0) > 0
        THEN public._meta_array_matches_column(l.metadata->p.key, p.col)
      ELSE COALESCE(jsonb_typeof(l.metadata->p.key), 'null') IN ('null')
           OR (jsonb_typeof(l.metadata->p.key) = 'array' AND jsonb_array_length(l.metadata->p.key) = 0)
    END
  )
  FROM public.lessons l
  CROSS JOIN LATERAL (VALUES
    ('observancesHolidays',            l.observances_holidays),
    ('mainIngredients',                l.main_ingredients),
    ('gardenSkills',                   l.garden_skills),
    ('cookingSkills',                  l.cooking_skills),
    ('culturalResponsivenessFeatures', l.cultural_responsiveness_features)
  ) AS p(key, col)
  WHERE l.lesson_id = p_lesson_id;
$$;

-- ---------------------------------------------------------------
-- 1. INSERT with the five columns set and every mirror '[]' → mirrors
--    synced from the columns; unrelated keys untouched.
-- ---------------------------------------------------------------
DO $$
DECLARE
  l public.lessons%ROWTYPE;
BEGIN
  INSERT INTO public.lessons (lesson_id, title, summary, file_link, grade_levels,
    observances_holidays, main_ingredients, garden_skills, cooking_skills,
    cultural_responsiveness_features, metadata)
  VALUES ('mdtest_1', 'Mirror test 1', 's', '#', ARRAY['3'],
    ARRAY['Beginning of year'],
    ARRAY['Potatoes', 'Root vegetables'],
    ARRAY['Sensory exploration'],
    ARRAY['Roasting', 'Measuring'],
    ARRAY['Reshapes curriculum', 'Communicates high expectations'],
    '{"observancesHolidays":[],"mainIngredients":[],"gardenSkills":[],"cookingSkills":[],"culturalResponsivenessFeatures":[],"activityType":["garden"],"keepMe":"untouched"}'::jsonb);

  SELECT * INTO l FROM public.lessons WHERE lesson_id = 'mdtest_1';
  IF l.metadata->'observancesHolidays' IS DISTINCT FROM '["Beginning of year"]'::jsonb
     OR l.metadata->'mainIngredients' IS DISTINCT FROM '["Potatoes","Root vegetables"]'::jsonb
     OR l.metadata->'gardenSkills' IS DISTINCT FROM '["Sensory exploration"]'::jsonb
     OR l.metadata->'cookingSkills' IS DISTINCT FROM '["Roasting","Measuring"]'::jsonb
     OR l.metadata->'culturalResponsivenessFeatures' IS DISTINCT FROM '["Reshapes curriculum","Communicates high expectations"]'::jsonb THEN
    RAISE EXCEPTION 'ASSERT 1 FAILED: mirrors not synced from columns on INSERT: %', l.metadata;
  END IF;
  IF l.metadata->'activityType' IS DISTINCT FROM '["garden"]'::jsonb
     OR l.metadata->>'keepMe' IS DISTINCT FROM 'untouched' THEN
    RAISE EXCEPTION 'ASSERT 1 FAILED: unrelated metadata keys changed: %', l.metadata;
  END IF;
  RAISE NOTICE 'PASS 1: INSERT syncs the five mirrors from their columns';
END $$;

-- ---------------------------------------------------------------
-- 2. UPDATE of a column alone → its mirror follows (other mirrors stay).
-- ---------------------------------------------------------------
DO $$
DECLARE
  l public.lessons%ROWTYPE;
BEGIN
  UPDATE public.lessons
  SET observances_holidays = ARRAY['Earth Month'],
      cooking_skills = ARRAY['Tasting']
  WHERE lesson_id = 'mdtest_1';

  SELECT * INTO l FROM public.lessons WHERE lesson_id = 'mdtest_1';
  IF l.metadata->'observancesHolidays' IS DISTINCT FROM '["Earth Month"]'::jsonb
     OR l.metadata->'cookingSkills' IS DISTINCT FROM '["Tasting"]'::jsonb THEN
    RAISE EXCEPTION 'ASSERT 2 FAILED: mirror did not follow a column-only UPDATE: %', l.metadata;
  END IF;
  IF l.metadata->'mainIngredients' IS DISTINCT FROM '["Potatoes","Root vegetables"]'::jsonb
     OR l.metadata->'gardenSkills' IS DISTINCT FROM '["Sensory exploration"]'::jsonb THEN
    RAISE EXCEPTION 'ASSERT 2 FAILED: an untouched pair moved: %', l.metadata;
  END IF;
  RAISE NOTICE 'PASS 2: column-only UPDATE updates the mirror';
END $$;

-- ---------------------------------------------------------------
-- 3. Empty column + non-empty mirror array → column derived from the
--    mirror (the (D)–(K) derive branch, now for the five pairs too).
-- ---------------------------------------------------------------
DO $$
DECLARE
  l public.lessons%ROWTYPE;
BEGIN
  INSERT INTO public.lessons (lesson_id, title, summary, file_link, grade_levels, metadata)
  VALUES ('mdtest_2', 'Mirror test 2', 's', '#', ARRAY['K'],
    '{"gardenSkills":["Tool use and maintenance","Sensory exploration"],"culturalResponsivenessFeatures":["Positions teacher as facilitator"]}'::jsonb);

  SELECT * INTO l FROM public.lessons WHERE lesson_id = 'mdtest_2';
  IF l.garden_skills IS DISTINCT FROM ARRAY['Tool use and maintenance', 'Sensory exploration']
     OR l.cultural_responsiveness_features IS DISTINCT FROM ARRAY['Positions teacher as facilitator'] THEN
    RAISE EXCEPTION 'ASSERT 3 FAILED: column not derived from a non-empty mirror: garden_skills=% crf=%',
      l.garden_skills, l.cultural_responsiveness_features;
  END IF;
  IF COALESCE(array_length(l.observances_holidays, 1), 0) <> 0
     OR COALESCE(array_length(l.main_ingredients, 1), 0) <> 0
     OR COALESCE(array_length(l.cooking_skills, 1), 0) <> 0 THEN
    RAISE EXCEPTION 'ASSERT 3 FAILED: a column with no mirror was populated';
  END IF;
  RAISE NOTICE 'PASS 3: empty column takes a non-empty mirror array';
END $$;

-- ---------------------------------------------------------------
-- 4. REGRESSION: complete_review_atomic approve_update with a payload that
--    OMITS the five keys. The RPC carries each column forward but rebuilds
--    the metadata blob with '[]' — the trigger must re-sync on that write.
--    (Submission shape mirrors production: submission_type 'new', reviewer
--    picks "update existing lesson" at review time.)
-- ---------------------------------------------------------------
DO $$
DECLARE
  v_reviewer uuid := (SELECT reviewer_id FROM _t_ctx);
  v_sub uuid;
  v_ret text;
  l public.lessons%ROWTYPE;
BEGIN
  INSERT INTO public.lesson_submissions (teacher_id, google_doc_url, google_doc_id, status,
    extracted_title, extracted_content, submission_type)
  VALUES (v_reviewer, 'https://docs.google.com/document/d/MDTEST-UPD-1/edit', 'MDTEST-UPD-1', 'submitted',
    'Mirror test 1 (resubmitted)', 'new content', 'new')
  RETURNING id INTO v_sub;

  v_ret := public.complete_review_atomic(
    v_sub, v_reviewer, 'approve_update',
    '{"title":"Mirror test 1 (resubmitted)","summary":"s2"}'::jsonb,
    '', 'mdtest_1');
  IF v_ret IS DISTINCT FROM 'mdtest_1' THEN
    RAISE EXCEPTION 'ASSERT 4 FAILED: approve_update returned %', v_ret;
  END IF;

  SELECT * INTO l FROM public.lessons WHERE lesson_id = 'mdtest_1';
  -- columns carried forward (unchanged RPC behaviour)
  IF l.observances_holidays IS DISTINCT FROM ARRAY['Earth Month']
     OR l.main_ingredients IS DISTINCT FROM ARRAY['Potatoes', 'Root vegetables']
     OR l.garden_skills IS DISTINCT FROM ARRAY['Sensory exploration']
     OR l.cooking_skills IS DISTINCT FROM ARRAY['Tasting']
     OR l.cultural_responsiveness_features IS DISTINCT FROM ARRAY['Reshapes curriculum', 'Communicates high expectations'] THEN
    RAISE EXCEPTION 'ASSERT 4 FAILED: approve_update did not carry the columns forward';
  END IF;
  -- mirrors must equal the columns (this is the production failure)
  IF l.metadata->'observancesHolidays' IS DISTINCT FROM '["Earth Month"]'::jsonb
     OR l.metadata->'mainIngredients' IS DISTINCT FROM '["Potatoes","Root vegetables"]'::jsonb
     OR l.metadata->'gardenSkills' IS DISTINCT FROM '["Sensory exploration"]'::jsonb
     OR l.metadata->'cookingSkills' IS DISTINCT FROM '["Tasting"]'::jsonb
     OR l.metadata->'culturalResponsivenessFeatures' IS DISTINCT FROM '["Reshapes curriculum","Communicates high expectations"]'::jsonb THEN
    RAISE EXCEPTION 'ASSERT 4 FAILED (REGRESSION): approve_update with omitted keys left column ≠ mirror: %', l.metadata;
  END IF;
  IF NOT pg_temp._mdtest_in_sync('mdtest_1') THEN
    RAISE EXCEPTION 'ASSERT 4 FAILED: mdtest_1 not in sync after approve_update';
  END IF;
  RAISE NOTICE 'PASS 4: approve_update with omitted keys keeps column == mirror (regression)';
END $$;

-- ---------------------------------------------------------------
-- 5. approve_update with EXPLICIT values → both stores take the payload.
-- ---------------------------------------------------------------
DO $$
DECLARE
  v_reviewer uuid := (SELECT reviewer_id FROM _t_ctx);
  v_sub uuid;
  l public.lessons%ROWTYPE;
BEGIN
  INSERT INTO public.lesson_submissions (teacher_id, google_doc_url, google_doc_id, status,
    extracted_title, extracted_content, submission_type)
  VALUES (v_reviewer, 'https://docs.google.com/document/d/MDTEST-UPD-2/edit', 'MDTEST-UPD-2', 'submitted',
    'Mirror test 1 (explicit)', 'newer content', 'new')
  RETURNING id INTO v_sub;

  PERFORM public.complete_review_atomic(
    v_sub, v_reviewer, 'approve_update',
    '{"title":"Mirror test 1 (explicit)","summary":"s3","observancesHolidays":["Indigenous Peoples'' Month"],"mainIngredients":["Potatoes"],"gardenSkills":["Tool use and maintenance"],"cookingSkills":["Roasting"],"culturalResponsivenessFeatures":["Promotes student-centered instruction"]}'::jsonb,
    '', 'mdtest_1');

  SELECT * INTO l FROM public.lessons WHERE lesson_id = 'mdtest_1';
  IF l.observances_holidays IS DISTINCT FROM ARRAY['Indigenous Peoples'' Month']
     OR l.main_ingredients IS DISTINCT FROM ARRAY['Potatoes']
     OR l.garden_skills IS DISTINCT FROM ARRAY['Tool use and maintenance']
     OR l.cooking_skills IS DISTINCT FROM ARRAY['Roasting']
     OR l.cultural_responsiveness_features IS DISTINCT FROM ARRAY['Promotes student-centered instruction'] THEN
    RAISE EXCEPTION 'ASSERT 5 FAILED: columns did not take the explicit payload';
  END IF;
  IF l.metadata->'observancesHolidays' IS DISTINCT FROM '["Indigenous Peoples'' Month"]'::jsonb
     OR l.metadata->'mainIngredients' IS DISTINCT FROM '["Potatoes"]'::jsonb
     OR l.metadata->'gardenSkills' IS DISTINCT FROM '["Tool use and maintenance"]'::jsonb
     OR l.metadata->'cookingSkills' IS DISTINCT FROM '["Roasting"]'::jsonb
     OR l.metadata->'culturalResponsivenessFeatures' IS DISTINCT FROM '["Promotes student-centered instruction"]'::jsonb THEN
    RAISE EXCEPTION 'ASSERT 5 FAILED: mirrors did not take the explicit payload: %', l.metadata;
  END IF;
  RAISE NOTICE 'PASS 5: approve_update with explicit values writes both stores';
END $$;

-- ---------------------------------------------------------------
-- 6. approve_new with no keys → empty columns and '[]' mirrors (unchanged
--    symmetric behaviour; nothing is invented).
-- ---------------------------------------------------------------
DO $$
DECLARE
  v_reviewer uuid := (SELECT reviewer_id FROM _t_ctx);
  v_sub uuid;
  v_lesson_id text;
  l public.lessons%ROWTYPE;
BEGIN
  INSERT INTO public.lesson_submissions (teacher_id, google_doc_url, google_doc_id, status,
    extracted_title, extracted_content, submission_type)
  VALUES (v_reviewer, 'https://docs.google.com/document/d/MDTEST-NEW-1/edit', 'MDTEST-NEW-1', 'submitted',
    'Mirror test new', 'content', 'new')
  RETURNING id INTO v_sub;

  v_lesson_id := public.complete_review_atomic(
    v_sub, v_reviewer, 'approve_new',
    '{"title":"Mirror test new","summary":"s"}'::jsonb,
    '');

  SELECT * INTO l FROM public.lessons WHERE lesson_id = v_lesson_id;
  IF COALESCE(array_length(l.observances_holidays, 1), 0) <> 0
     OR COALESCE(array_length(l.main_ingredients, 1), 0) <> 0
     OR COALESCE(array_length(l.garden_skills, 1), 0) <> 0
     OR COALESCE(array_length(l.cooking_skills, 1), 0) <> 0
     OR COALESCE(array_length(l.cultural_responsiveness_features, 1), 0) <> 0 THEN
    RAISE EXCEPTION 'ASSERT 6 FAILED: approve_new populated a column from nothing';
  END IF;
  IF l.metadata->'observancesHolidays' IS DISTINCT FROM '[]'::jsonb
     OR l.metadata->'mainIngredients' IS DISTINCT FROM '[]'::jsonb
     OR l.metadata->'gardenSkills' IS DISTINCT FROM '[]'::jsonb
     OR l.metadata->'cookingSkills' IS DISTINCT FROM '[]'::jsonb
     OR l.metadata->'culturalResponsivenessFeatures' IS DISTINCT FROM '[]'::jsonb THEN
    RAISE EXCEPTION 'ASSERT 6 FAILED: approve_new mirrors are not []: %', l.metadata;
  END IF;
  -- keep the new lesson under the mdtest_ prefix for assertion 8
  UPDATE public.lessons SET lesson_id = 'mdtest_3' WHERE lesson_id = v_lesson_id;
  RAISE NOTICE 'PASS 6: approve_new with no keys stays empty/[]';
END $$;

-- ---------------------------------------------------------------
-- 7. Off-vocabulary values are still rejected by the column CHECKs — both
--    a direct column write and a value arriving through the derive branch
--    (mirror → column). The trigger never bypasses the vocabulary guard.
-- ---------------------------------------------------------------
DO $$
BEGIN
  BEGIN
    UPDATE public.lessons
    SET observances_holidays = ARRAY['Not A Real Observance']
    WHERE lesson_id = 'mdtest_2';
    RAISE EXCEPTION 'ASSERT 7a FAILED: off-vocabulary column value accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.lessons
    SET metadata = jsonb_set(metadata, '{mainIngredients}', '["Not A Real Ingredient"]'::jsonb)
    WHERE lesson_id = 'mdtest_2';   -- main_ingredients column is empty → derive branch
    RAISE EXCEPTION 'ASSERT 7b FAILED: off-vocabulary mirror value derived into the column';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  RAISE NOTICE 'PASS 7: column CHECKs still reject off-vocabulary values';
END $$;

-- ---------------------------------------------------------------
-- 8. Zero drift across every fixture row (and the seed rows, which the
--    reset already pushed through the trigger).
-- ---------------------------------------------------------------
DO $$
DECLARE
  v_bad text;
BEGIN
  SELECT string_agg(lesson_id, ', ') INTO v_bad
  FROM public.lessons
  WHERE NOT pg_temp._mdtest_in_sync(lesson_id);
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'ASSERT 8 FAILED: drifted rows: %', v_bad;
  END IF;
  IF (SELECT count(*) FROM public.lessons WHERE lesson_id LIKE 'mdtest\_%') <> 3 THEN
    RAISE EXCEPTION 'ASSERT 8 FAILED: expected 3 fixture rows';
  END IF;
  RAISE NOTICE 'PASS 8: zero drift across fixtures';
END $$;

ROLLBACK;
