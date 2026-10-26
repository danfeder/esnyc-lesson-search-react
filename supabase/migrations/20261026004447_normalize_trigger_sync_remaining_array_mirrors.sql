-- =====================================================
-- Migration: 20261026004447_normalize_trigger_sync_remaining_array_mirrors.sql
-- =====================================================
-- Description: Extend the lessons_normalize_write() BEFORE INSERT OR UPDATE
--   trigger so the five remaining text[] column ⇄ metadata-mirror pairs are
--   kept in step on every write, exactly as sections (C)–(K) already do for
--   the other nine pairs:
--
--     observances_holidays             ⇄ metadata->'observancesHolidays'
--     main_ingredients                 ⇄ metadata->'mainIngredients'
--     garden_skills                    ⇄ metadata->'gardenSkills'
--     cooking_skills                   ⇄ metadata->'cookingSkills'
--     cultural_responsiveness_features ⇄ metadata->'culturalResponsivenessFeatures'
--
-- Why: complete_review_atomic's approve_update branch carries each column
--   forward (COALESCE to the existing value) when the review payload omits a
--   key, but rebuilds the metadata blob wholesale with '[]' for that key.
--   For the nine pairs the trigger already syncs, that mismatch is repaired on
--   the same write; for these five it persisted (PROD census 2026-10-22:
--   59 (lesson, field) pairs on 45 lessons, every one "column set, mirror []";
--   0 drift on the nine synced pairs). The public search RPC ships the stored
--   mirror for these five keys, so the UI showed no chips for them while the
--   column-driven filters still matched.
--
-- What changes: ONLY the function body — five sections (L)–(P) spliced in
--   before RETURN NEW, a textual copy of (D)–(K) with the field names swapped.
--   Everything else (sections (A), (V), (C)–(K)) is byte-identical to the
--   20260518000000 body. No table, column, constraint, grant, policy or
--   ownership change; the trigger binding (lessons_normalize_write_trg) is
--   untouched. Rows at rest are NOT modified here — the data repair is the
--   sibling migration that follows this one.
--
-- Semantics note (same as (D)–(K)): an EMPTY column with a NON-EMPTY mirror
--   array now derives the column from the mirror. PRE-ASSERT 5 proves no such
--   row exists at apply time (PROD census: 0), and the five column CHECK
--   constraints reject any off-vocabulary value loudly (fail-closed, like the
--   (V) validator).
--
-- BEGIN/COMMIT: supabase db push is per-statement autocommit, so the wrapper
--   is load-bearing — every DO-block assertion below can abort the whole file.
--
-- Rollback: 20261026004447_normalize_trigger_sync_remaining_array_mirrors.sql.rollback
--   (re-issues the 20260518000000 body and COMMENT). Rows re-synced by the
--   extended trigger stay correct after a rollback.
-- =====================================================

BEGIN;

-- The trigger fires on every lessons write; take the same lock the data
-- migrations in this repo take so no concurrent writer races the swap.
LOCK TABLE public.lessons IN SHARE ROW EXCLUSIVE MODE;

-- =====================================================
-- PRE-ASSERTS
-- =====================================================

-- PRE 1: the trigger is attached to lessons, enabled, and bound to
--        lessons_normalize_write().
DO $$
DECLARE
  v_enabled "char";
BEGIN
  SELECT t.tgenabled INTO v_enabled
  FROM pg_trigger t
  JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE t.tgrelid = 'public.lessons'::regclass
    AND t.tgname = 'lessons_normalize_write_trg'
    AND p.proname = 'lessons_normalize_write'
    AND NOT t.tgisinternal;
  IF v_enabled IS NULL THEN
    RAISE EXCEPTION 'PRE-ASSERT 1 FAILED: lessons_normalize_write_trg is not attached to public.lessons (or not bound to lessons_normalize_write)';
  END IF;
  IF v_enabled = 'D' THEN
    RAISE EXCEPTION 'PRE-ASSERT 1 FAILED: lessons_normalize_write_trg is disabled (tgenabled=%)', v_enabled;
  END IF;
END $$;

-- PRE 2: the helper the new sections call exists with the expected signature.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE pronamespace = 'public'::regnamespace
      AND proname = '_meta_array_matches_column'
      AND pg_get_function_identity_arguments(oid) = 'p_meta jsonb, p_col text[]'
  ) THEN
    RAISE EXCEPTION 'PRE-ASSERT 2 FAILED: public._meta_array_matches_column(jsonb, text[]) is missing';
  END IF;
END $$;

-- PRE 3: the live body is exactly the one this migration was written against
--        (the 20260518000000 body; whitespace-normalised md5). Any other hash
--        means the trigger changed under us — STOP and re-brief rather than
--        overwrite an unknown body.
DO $$
DECLARE
  v_md5 text;
BEGIN
  SELECT md5(btrim(regexp_replace(prosrc, '\s+', ' ', 'g'))) INTO v_md5
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace
    AND proname = 'lessons_normalize_write';
  IF v_md5 IS DISTINCT FROM 'd9f809c60efb8659e8e98f1b0e504dfc' THEN
    RAISE EXCEPTION 'PRE-ASSERT 3 FAILED: lessons_normalize_write body md5 is % (expected d9f809c60efb8659e8e98f1b0e504dfc = the 20260518000000 body). The trigger changed since this migration was written; diff the live body before applying.', COALESCE(v_md5, 'NULL');
  END IF;
END $$;

-- PRE 4: the five column CHECK constraints exist (they are the fail-closed
--        vocabulary guard for the derive branch of each new section).
DO $$
DECLARE
  v_missing text;
BEGIN
  SELECT string_agg(n, ', ' ORDER BY n) INTO v_missing
  FROM unnest(ARRAY[
    'valid_observances_holidays',
    'valid_main_ingredients',
    'valid_garden_skills',
    'valid_cooking_skills',
    'valid_cultural_responsiveness_features'
  ]) AS n
  WHERE NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.lessons'::regclass
      AND conname = n
      AND contype = 'c'
  );
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'PRE-ASSERT 4 FAILED: missing CHECK constraint(s) on public.lessons: %', v_missing;
  END IF;
END $$;

-- PRE 5: no row has an EMPTY column with a NON-EMPTY mirror array for any of
--        the five pairs (the inverse shape — the derive branch would write
--        mirror values into the column). PROD census 2026-10-22: 0 rows.
DO $$
DECLARE
  v_count bigint;
  v_sample text;
BEGIN
  CREATE TEMP TABLE _pre5_inverse ON COMMIT DROP AS
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
  SELECT count(*) INTO v_count FROM _pre5_inverse;
  IF v_count > 0 THEN
    SELECT string_agg(lesson_id || ':' || key, ', ' ORDER BY lesson_id, key)
      INTO v_sample
    FROM (SELECT * FROM _pre5_inverse ORDER BY lesson_id, key LIMIT 10) s;
    RAISE EXCEPTION 'PRE-ASSERT 5 FAILED: % row(s) have an empty column with a non-empty metadata array on one of the five pairs (first 10: %). Re-census before applying.', v_count, v_sample;
  END IF;
END $$;

-- =====================================================
-- CHANGE: replace the function body (20260518000000 body + sections (L)–(P)).
-- =====================================================
CREATE OR REPLACE FUNCTION public.lessons_normalize_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_meta_value jsonb;
BEGIN
  -- Initialize NEW.metadata if NULL.
  IF NEW.metadata IS NULL THEN
    NEW.metadata := '{}'::jsonb;
  END IF;

  -- ============================================================
  -- (A) Concepts rescue (must run BEFORE academicIntegration flatten).
  --     Unchanged from 20260509000000.
  -- ============================================================
  IF jsonb_typeof(NEW.metadata->'academicIntegration') = 'object'
     AND jsonb_typeof(NEW.metadata->'academicIntegration'->'concepts') = 'object'
     AND NEW.metadata->'academicIntegration'->'concepts' <> '{}'::jsonb
     AND NOT (
       NEW.metadata ? 'academicConcepts'
       AND jsonb_typeof(NEW.metadata->'academicConcepts') = 'object'
       AND NEW.metadata->'academicConcepts' <> '{}'::jsonb
     )
  THEN
    NEW.metadata := jsonb_set(
      NEW.metadata,
      '{academicConcepts}',
      NEW.metadata->'academicIntegration'->'concepts'
    );
    RAISE NOTICE 'lessons_normalize_write rescued academicConcepts from object-shape academicIntegration; lesson_id=%', NEW.lesson_id;
  END IF;

  -- ============================================================
  -- (B) lesson_format sync block REMOVED — D3 (column dropped).
  -- ============================================================

  -- ============================================================
  -- (V) Value-validation on closed-enum metadata keys.
  --     CHANGED 20260518000000 (D2.1): activityType allowed list drops 'both'.
  --     Scope: 3 keys — activityType / tags / culturalResponsivenessFeatures.
  --     EXCLUDED: seasonTiming. ~213 drift rows on TEST as of 2026-05-05.
  --     Stage 1 worksheet round will settle canonical handling; trigger
  --     validation deferred.
  --     SOURCE: src/types/generated/enums.json (hand-synced).
  -- ============================================================
  PERFORM public._validate_meta_enum_values(
    NEW.metadata, 'activityType',
    ARRAY['cooking','garden','academic','craft']::text[],
    NEW.lesson_id
  );
  PERFORM public._validate_meta_enum_values(
    NEW.metadata, 'tags',
    ARRAY['orientation','bilingual_handouts']::text[],
    NEW.lesson_id
  );
  PERFORM public._validate_meta_enum_values(
    NEW.metadata, 'culturalResponsivenessFeatures',
    ARRAY[
      'Promotes positive perspectives on parents and families',
      'Communicates high expectations',
      'Encourages learning within the context of culture',
      'Promotes student-centered instruction',
      'Incorporates different individual and cultural learning styles',
      'Reshapes curriculum',
      'Positions teacher as facilitator'
    ]::text[],
    NEW.lesson_id
  );

  -- ============================================================
  -- (C) academic_integration (text[]) — column⇄metadata sync.
  -- ============================================================
  v_meta_value := NEW.metadata->'academicIntegration';
  IF jsonb_typeof(v_meta_value) = 'object' THEN
    v_meta_value := COALESCE(v_meta_value->'selected', '[]'::jsonb);
    IF jsonb_typeof(v_meta_value) <> 'array' THEN
      v_meta_value := '[]'::jsonb;
    END IF;
    NEW.metadata := jsonb_set(NEW.metadata, '{academicIntegration}', v_meta_value);
    RAISE NOTICE 'lessons_normalize_write coerced field=academicIntegration before_shape=object after_shape=array lesson_id=%', NEW.lesson_id;
  END IF;
  IF COALESCE(array_length(NEW.academic_integration, 1), 0) > 0 THEN
    IF NOT _meta_array_matches_column(v_meta_value, NEW.academic_integration) THEN
      NEW.metadata := jsonb_set(NEW.metadata, '{academicIntegration}', to_jsonb(NEW.academic_integration));
      RAISE NOTICE 'lessons_normalize_write coerced field=academicIntegration before_shape=% after_shape=array lesson_id=%',
        COALESCE(jsonb_typeof(v_meta_value), 'null'), NEW.lesson_id;
    END IF;
  ELSIF jsonb_typeof(v_meta_value) = 'array' AND jsonb_array_length(v_meta_value) > 0 THEN
    NEW.academic_integration := (
      SELECT array_agg(value)
      FROM jsonb_array_elements_text(v_meta_value)
    );
    RAISE NOTICE 'lessons_normalize_write derived column=academic_integration from meta array lesson_id=%', NEW.lesson_id;
  ELSIF jsonb_typeof(v_meta_value) = 'string' THEN
    NEW.academic_integration := ARRAY[v_meta_value #>> '{}'];
    NEW.metadata := jsonb_set(NEW.metadata, '{academicIntegration}', to_jsonb(NEW.academic_integration));
    RAISE NOTICE 'lessons_normalize_write coerced field=academicIntegration before_shape=string after_shape=array lesson_id=%', NEW.lesson_id;
  END IF;

  -- ============================================================
  -- (D) activity_type (text[]) — column⇄metadata sync.
  -- ============================================================
  v_meta_value := NEW.metadata->'activityType';
  IF COALESCE(array_length(NEW.activity_type, 1), 0) > 0 THEN
    IF NOT _meta_array_matches_column(v_meta_value, NEW.activity_type) THEN
      NEW.metadata := jsonb_set(NEW.metadata, '{activityType}', to_jsonb(NEW.activity_type));
      RAISE NOTICE 'lessons_normalize_write coerced field=activityType before_shape=% after_shape=array lesson_id=%',
        COALESCE(jsonb_typeof(v_meta_value), 'null'), NEW.lesson_id;
    END IF;
  ELSIF jsonb_typeof(v_meta_value) = 'array' AND jsonb_array_length(v_meta_value) > 0 THEN
    NEW.activity_type := (
      SELECT array_agg(value)
      FROM jsonb_array_elements_text(v_meta_value)
    );
    RAISE NOTICE 'lessons_normalize_write derived column=activity_type from meta array lesson_id=%', NEW.lesson_id;
  ELSIF jsonb_typeof(v_meta_value) = 'string' THEN
    NEW.activity_type := ARRAY[v_meta_value #>> '{}'];
    NEW.metadata := jsonb_set(NEW.metadata, '{activityType}', to_jsonb(NEW.activity_type));
    RAISE NOTICE 'lessons_normalize_write coerced field=activityType before_shape=string after_shape=array lesson_id=%', NEW.lesson_id;
  END IF;

  -- ============================================================
  -- (E) cooking_methods (text[]) — column⇄metadata sync.
  -- ============================================================
  v_meta_value := NEW.metadata->'cookingMethods';
  IF COALESCE(array_length(NEW.cooking_methods, 1), 0) > 0 THEN
    IF NOT _meta_array_matches_column(v_meta_value, NEW.cooking_methods) THEN
      NEW.metadata := jsonb_set(NEW.metadata, '{cookingMethods}', to_jsonb(NEW.cooking_methods));
      RAISE NOTICE 'lessons_normalize_write coerced field=cookingMethods before_shape=% after_shape=array lesson_id=%',
        COALESCE(jsonb_typeof(v_meta_value), 'null'), NEW.lesson_id;
    END IF;
  ELSIF jsonb_typeof(v_meta_value) = 'array' AND jsonb_array_length(v_meta_value) > 0 THEN
    NEW.cooking_methods := (
      SELECT array_agg(value)
      FROM jsonb_array_elements_text(v_meta_value)
    );
    RAISE NOTICE 'lessons_normalize_write derived column=cooking_methods from meta array lesson_id=%', NEW.lesson_id;
  ELSIF jsonb_typeof(v_meta_value) = 'string' THEN
    NEW.cooking_methods := ARRAY[v_meta_value #>> '{}'];
    NEW.metadata := jsonb_set(NEW.metadata, '{cookingMethods}', to_jsonb(NEW.cooking_methods));
    RAISE NOTICE 'lessons_normalize_write coerced field=cookingMethods before_shape=string after_shape=array lesson_id=%', NEW.lesson_id;
  END IF;

  -- ============================================================
  -- (F) thematic_categories (text[]) — column⇄metadata sync.
  -- ============================================================
  v_meta_value := NEW.metadata->'thematicCategories';
  IF COALESCE(array_length(NEW.thematic_categories, 1), 0) > 0 THEN
    IF NOT _meta_array_matches_column(v_meta_value, NEW.thematic_categories) THEN
      NEW.metadata := jsonb_set(NEW.metadata, '{thematicCategories}', to_jsonb(NEW.thematic_categories));
      RAISE NOTICE 'lessons_normalize_write coerced field=thematicCategories before_shape=% after_shape=array lesson_id=%',
        COALESCE(jsonb_typeof(v_meta_value), 'null'), NEW.lesson_id;
    END IF;
  ELSIF jsonb_typeof(v_meta_value) = 'array' AND jsonb_array_length(v_meta_value) > 0 THEN
    NEW.thematic_categories := (
      SELECT array_agg(value)
      FROM jsonb_array_elements_text(v_meta_value)
    );
    RAISE NOTICE 'lessons_normalize_write derived column=thematic_categories from meta array lesson_id=%', NEW.lesson_id;
  ELSIF jsonb_typeof(v_meta_value) = 'string' THEN
    NEW.thematic_categories := ARRAY[v_meta_value #>> '{}'];
    NEW.metadata := jsonb_set(NEW.metadata, '{thematicCategories}', to_jsonb(NEW.thematic_categories));
    RAISE NOTICE 'lessons_normalize_write coerced field=thematicCategories before_shape=string after_shape=array lesson_id=%', NEW.lesson_id;
  END IF;

  -- ============================================================
  -- (G) season_timing (text[]) — column⇄metadata sync.
  -- ============================================================
  v_meta_value := NEW.metadata->'seasonTiming';
  IF COALESCE(array_length(NEW.season_timing, 1), 0) > 0 THEN
    IF NOT _meta_array_matches_column(v_meta_value, NEW.season_timing) THEN
      NEW.metadata := jsonb_set(NEW.metadata, '{seasonTiming}', to_jsonb(NEW.season_timing));
      RAISE NOTICE 'lessons_normalize_write coerced field=seasonTiming before_shape=% after_shape=array lesson_id=%',
        COALESCE(jsonb_typeof(v_meta_value), 'null'), NEW.lesson_id;
    END IF;
  ELSIF jsonb_typeof(v_meta_value) = 'array' AND jsonb_array_length(v_meta_value) > 0 THEN
    NEW.season_timing := (
      SELECT array_agg(value)
      FROM jsonb_array_elements_text(v_meta_value)
    );
    RAISE NOTICE 'lessons_normalize_write derived column=season_timing from meta array lesson_id=%', NEW.lesson_id;
  ELSIF jsonb_typeof(v_meta_value) = 'string' THEN
    NEW.season_timing := ARRAY[v_meta_value #>> '{}'];
    NEW.metadata := jsonb_set(NEW.metadata, '{seasonTiming}', to_jsonb(NEW.season_timing));
    RAISE NOTICE 'lessons_normalize_write coerced field=seasonTiming before_shape=string after_shape=array lesson_id=%', NEW.lesson_id;
  END IF;

  -- ============================================================
  -- (H) location_requirements (text[]) — column⇄metadata sync.
  -- ============================================================
  v_meta_value := NEW.metadata->'locationRequirements';
  IF COALESCE(array_length(NEW.location_requirements, 1), 0) > 0 THEN
    IF NOT _meta_array_matches_column(v_meta_value, NEW.location_requirements) THEN
      NEW.metadata := jsonb_set(NEW.metadata, '{locationRequirements}', to_jsonb(NEW.location_requirements));
      RAISE NOTICE 'lessons_normalize_write coerced field=locationRequirements before_shape=% after_shape=array lesson_id=%',
        COALESCE(jsonb_typeof(v_meta_value), 'null'), NEW.lesson_id;
    END IF;
  ELSIF jsonb_typeof(v_meta_value) = 'array' AND jsonb_array_length(v_meta_value) > 0 THEN
    NEW.location_requirements := (
      SELECT array_agg(value)
      FROM jsonb_array_elements_text(v_meta_value)
    );
    RAISE NOTICE 'lessons_normalize_write derived column=location_requirements from meta array lesson_id=%', NEW.lesson_id;
  ELSIF jsonb_typeof(v_meta_value) = 'string' THEN
    NEW.location_requirements := ARRAY[v_meta_value #>> '{}'];
    NEW.metadata := jsonb_set(NEW.metadata, '{locationRequirements}', to_jsonb(NEW.location_requirements));
    RAISE NOTICE 'lessons_normalize_write coerced field=locationRequirements before_shape=string after_shape=array lesson_id=%', NEW.lesson_id;
  END IF;

  -- ============================================================
  -- (I) core_competencies (text[]) — column⇄metadata sync.
  -- ============================================================
  v_meta_value := NEW.metadata->'coreCompetencies';
  IF COALESCE(array_length(NEW.core_competencies, 1), 0) > 0 THEN
    IF NOT _meta_array_matches_column(v_meta_value, NEW.core_competencies) THEN
      NEW.metadata := jsonb_set(NEW.metadata, '{coreCompetencies}', to_jsonb(NEW.core_competencies));
      RAISE NOTICE 'lessons_normalize_write coerced field=coreCompetencies before_shape=% after_shape=array lesson_id=%',
        COALESCE(jsonb_typeof(v_meta_value), 'null'), NEW.lesson_id;
    END IF;
  ELSIF jsonb_typeof(v_meta_value) = 'array' AND jsonb_array_length(v_meta_value) > 0 THEN
    NEW.core_competencies := (
      SELECT array_agg(value)
      FROM jsonb_array_elements_text(v_meta_value)
    );
    RAISE NOTICE 'lessons_normalize_write derived column=core_competencies from meta array lesson_id=%', NEW.lesson_id;
  ELSIF jsonb_typeof(v_meta_value) = 'string' THEN
    NEW.core_competencies := ARRAY[v_meta_value #>> '{}'];
    NEW.metadata := jsonb_set(NEW.metadata, '{coreCompetencies}', to_jsonb(NEW.core_competencies));
    RAISE NOTICE 'lessons_normalize_write coerced field=coreCompetencies before_shape=string after_shape=array lesson_id=%', NEW.lesson_id;
  END IF;

  -- ============================================================
  -- (J) cultural_heritage (text[]) — column⇄metadata sync.
  -- ============================================================
  v_meta_value := NEW.metadata->'culturalHeritage';
  IF COALESCE(array_length(NEW.cultural_heritage, 1), 0) > 0 THEN
    IF NOT _meta_array_matches_column(v_meta_value, NEW.cultural_heritage) THEN
      NEW.metadata := jsonb_set(NEW.metadata, '{culturalHeritage}', to_jsonb(NEW.cultural_heritage));
      RAISE NOTICE 'lessons_normalize_write coerced field=culturalHeritage before_shape=% after_shape=array lesson_id=%',
        COALESCE(jsonb_typeof(v_meta_value), 'null'), NEW.lesson_id;
    END IF;
  ELSIF jsonb_typeof(v_meta_value) = 'array' AND jsonb_array_length(v_meta_value) > 0 THEN
    NEW.cultural_heritage := (
      SELECT array_agg(value)
      FROM jsonb_array_elements_text(v_meta_value)
    );
    RAISE NOTICE 'lessons_normalize_write derived column=cultural_heritage from meta array lesson_id=%', NEW.lesson_id;
  ELSIF jsonb_typeof(v_meta_value) = 'string' THEN
    NEW.cultural_heritage := ARRAY[v_meta_value #>> '{}'];
    NEW.metadata := jsonb_set(NEW.metadata, '{culturalHeritage}', to_jsonb(NEW.cultural_heritage));
    RAISE NOTICE 'lessons_normalize_write coerced field=culturalHeritage before_shape=string after_shape=array lesson_id=%', NEW.lesson_id;
  END IF;

  -- ============================================================
  -- (K) social_emotional_learning (text[]) — column⇄metadata sync.
  -- ============================================================
  v_meta_value := NEW.metadata->'socialEmotionalLearning';
  IF COALESCE(array_length(NEW.social_emotional_learning, 1), 0) > 0 THEN
    IF NOT _meta_array_matches_column(v_meta_value, NEW.social_emotional_learning) THEN
      NEW.metadata := jsonb_set(NEW.metadata, '{socialEmotionalLearning}', to_jsonb(NEW.social_emotional_learning));
      RAISE NOTICE 'lessons_normalize_write coerced field=socialEmotionalLearning before_shape=% after_shape=array lesson_id=%',
        COALESCE(jsonb_typeof(v_meta_value), 'null'), NEW.lesson_id;
    END IF;
  ELSIF jsonb_typeof(v_meta_value) = 'array' AND jsonb_array_length(v_meta_value) > 0 THEN
    NEW.social_emotional_learning := (
      SELECT array_agg(value)
      FROM jsonb_array_elements_text(v_meta_value)
    );
    RAISE NOTICE 'lessons_normalize_write derived column=social_emotional_learning from meta array lesson_id=%', NEW.lesson_id;
  ELSIF jsonb_typeof(v_meta_value) = 'string' THEN
    NEW.social_emotional_learning := ARRAY[v_meta_value #>> '{}'];
    NEW.metadata := jsonb_set(NEW.metadata, '{socialEmotionalLearning}', to_jsonb(NEW.social_emotional_learning));
    RAISE NOTICE 'lessons_normalize_write coerced field=socialEmotionalLearning before_shape=string after_shape=array lesson_id=%', NEW.lesson_id;
  END IF;

  -- ============================================================
  -- (L) observances_holidays (text[]) — column⇄metadata sync.
  --     ADDED 2026-10 (mirror-drift fix): same pattern as (D)–(K).
  --     Column wins when non-empty; an empty column takes a non-empty
  --     metadata array; a scalar is wrapped. Closes the approve_update
  --     asymmetry (column COALESCEs to the existing value while the
  --     metadata blob is rebuilt with '[]') for this field.
  -- ============================================================
  v_meta_value := NEW.metadata->'observancesHolidays';
  IF COALESCE(array_length(NEW.observances_holidays, 1), 0) > 0 THEN
    IF NOT _meta_array_matches_column(v_meta_value, NEW.observances_holidays) THEN
      NEW.metadata := jsonb_set(NEW.metadata, '{observancesHolidays}', to_jsonb(NEW.observances_holidays));
      RAISE NOTICE 'lessons_normalize_write coerced field=observancesHolidays before_shape=% after_shape=array lesson_id=%',
        COALESCE(jsonb_typeof(v_meta_value), 'null'), NEW.lesson_id;
    END IF;
  ELSIF jsonb_typeof(v_meta_value) = 'array' AND jsonb_array_length(v_meta_value) > 0 THEN
    NEW.observances_holidays := (
      SELECT array_agg(value)
      FROM jsonb_array_elements_text(v_meta_value)
    );
    RAISE NOTICE 'lessons_normalize_write derived column=observances_holidays from meta array lesson_id=%', NEW.lesson_id;
  ELSIF jsonb_typeof(v_meta_value) = 'string' THEN
    NEW.observances_holidays := ARRAY[v_meta_value #>> '{}'];
    NEW.metadata := jsonb_set(NEW.metadata, '{observancesHolidays}', to_jsonb(NEW.observances_holidays));
    RAISE NOTICE 'lessons_normalize_write coerced field=observancesHolidays before_shape=string after_shape=array lesson_id=%', NEW.lesson_id;
  END IF;

  -- ============================================================
  -- (M) main_ingredients (text[]) — column⇄metadata sync.
  --     ADDED 2026-10 (mirror-drift fix): same pattern as (D)–(K).
  --     Column wins when non-empty; an empty column takes a non-empty
  --     metadata array; a scalar is wrapped. Closes the approve_update
  --     asymmetry (column COALESCEs to the existing value while the
  --     metadata blob is rebuilt with '[]') for this field.
  -- ============================================================
  v_meta_value := NEW.metadata->'mainIngredients';
  IF COALESCE(array_length(NEW.main_ingredients, 1), 0) > 0 THEN
    IF NOT _meta_array_matches_column(v_meta_value, NEW.main_ingredients) THEN
      NEW.metadata := jsonb_set(NEW.metadata, '{mainIngredients}', to_jsonb(NEW.main_ingredients));
      RAISE NOTICE 'lessons_normalize_write coerced field=mainIngredients before_shape=% after_shape=array lesson_id=%',
        COALESCE(jsonb_typeof(v_meta_value), 'null'), NEW.lesson_id;
    END IF;
  ELSIF jsonb_typeof(v_meta_value) = 'array' AND jsonb_array_length(v_meta_value) > 0 THEN
    NEW.main_ingredients := (
      SELECT array_agg(value)
      FROM jsonb_array_elements_text(v_meta_value)
    );
    RAISE NOTICE 'lessons_normalize_write derived column=main_ingredients from meta array lesson_id=%', NEW.lesson_id;
  ELSIF jsonb_typeof(v_meta_value) = 'string' THEN
    NEW.main_ingredients := ARRAY[v_meta_value #>> '{}'];
    NEW.metadata := jsonb_set(NEW.metadata, '{mainIngredients}', to_jsonb(NEW.main_ingredients));
    RAISE NOTICE 'lessons_normalize_write coerced field=mainIngredients before_shape=string after_shape=array lesson_id=%', NEW.lesson_id;
  END IF;

  -- ============================================================
  -- (N) garden_skills (text[]) — column⇄metadata sync.
  --     ADDED 2026-10 (mirror-drift fix): same pattern as (D)–(K).
  --     Column wins when non-empty; an empty column takes a non-empty
  --     metadata array; a scalar is wrapped. Closes the approve_update
  --     asymmetry (column COALESCEs to the existing value while the
  --     metadata blob is rebuilt with '[]') for this field.
  -- ============================================================
  v_meta_value := NEW.metadata->'gardenSkills';
  IF COALESCE(array_length(NEW.garden_skills, 1), 0) > 0 THEN
    IF NOT _meta_array_matches_column(v_meta_value, NEW.garden_skills) THEN
      NEW.metadata := jsonb_set(NEW.metadata, '{gardenSkills}', to_jsonb(NEW.garden_skills));
      RAISE NOTICE 'lessons_normalize_write coerced field=gardenSkills before_shape=% after_shape=array lesson_id=%',
        COALESCE(jsonb_typeof(v_meta_value), 'null'), NEW.lesson_id;
    END IF;
  ELSIF jsonb_typeof(v_meta_value) = 'array' AND jsonb_array_length(v_meta_value) > 0 THEN
    NEW.garden_skills := (
      SELECT array_agg(value)
      FROM jsonb_array_elements_text(v_meta_value)
    );
    RAISE NOTICE 'lessons_normalize_write derived column=garden_skills from meta array lesson_id=%', NEW.lesson_id;
  ELSIF jsonb_typeof(v_meta_value) = 'string' THEN
    NEW.garden_skills := ARRAY[v_meta_value #>> '{}'];
    NEW.metadata := jsonb_set(NEW.metadata, '{gardenSkills}', to_jsonb(NEW.garden_skills));
    RAISE NOTICE 'lessons_normalize_write coerced field=gardenSkills before_shape=string after_shape=array lesson_id=%', NEW.lesson_id;
  END IF;

  -- ============================================================
  -- (O) cooking_skills (text[]) — column⇄metadata sync.
  --     ADDED 2026-10 (mirror-drift fix): same pattern as (D)–(K).
  --     Column wins when non-empty; an empty column takes a non-empty
  --     metadata array; a scalar is wrapped. Closes the approve_update
  --     asymmetry (column COALESCEs to the existing value while the
  --     metadata blob is rebuilt with '[]') for this field.
  -- ============================================================
  v_meta_value := NEW.metadata->'cookingSkills';
  IF COALESCE(array_length(NEW.cooking_skills, 1), 0) > 0 THEN
    IF NOT _meta_array_matches_column(v_meta_value, NEW.cooking_skills) THEN
      NEW.metadata := jsonb_set(NEW.metadata, '{cookingSkills}', to_jsonb(NEW.cooking_skills));
      RAISE NOTICE 'lessons_normalize_write coerced field=cookingSkills before_shape=% after_shape=array lesson_id=%',
        COALESCE(jsonb_typeof(v_meta_value), 'null'), NEW.lesson_id;
    END IF;
  ELSIF jsonb_typeof(v_meta_value) = 'array' AND jsonb_array_length(v_meta_value) > 0 THEN
    NEW.cooking_skills := (
      SELECT array_agg(value)
      FROM jsonb_array_elements_text(v_meta_value)
    );
    RAISE NOTICE 'lessons_normalize_write derived column=cooking_skills from meta array lesson_id=%', NEW.lesson_id;
  ELSIF jsonb_typeof(v_meta_value) = 'string' THEN
    NEW.cooking_skills := ARRAY[v_meta_value #>> '{}'];
    NEW.metadata := jsonb_set(NEW.metadata, '{cookingSkills}', to_jsonb(NEW.cooking_skills));
    RAISE NOTICE 'lessons_normalize_write coerced field=cookingSkills before_shape=string after_shape=array lesson_id=%', NEW.lesson_id;
  END IF;

  -- ============================================================
  -- (P) cultural_responsiveness_features (text[]) — column⇄metadata sync.
  --     ADDED 2026-10 (mirror-drift fix): same pattern as (D)–(K).
  --     Column wins when non-empty; an empty column takes a non-empty
  --     metadata array; a scalar is wrapped. Closes the approve_update
  --     asymmetry (column COALESCEs to the existing value while the
  --     metadata blob is rebuilt with '[]') for this field.
  -- ============================================================
  v_meta_value := NEW.metadata->'culturalResponsivenessFeatures';
  IF COALESCE(array_length(NEW.cultural_responsiveness_features, 1), 0) > 0 THEN
    IF NOT _meta_array_matches_column(v_meta_value, NEW.cultural_responsiveness_features) THEN
      NEW.metadata := jsonb_set(NEW.metadata, '{culturalResponsivenessFeatures}', to_jsonb(NEW.cultural_responsiveness_features));
      RAISE NOTICE 'lessons_normalize_write coerced field=culturalResponsivenessFeatures before_shape=% after_shape=array lesson_id=%',
        COALESCE(jsonb_typeof(v_meta_value), 'null'), NEW.lesson_id;
    END IF;
  ELSIF jsonb_typeof(v_meta_value) = 'array' AND jsonb_array_length(v_meta_value) > 0 THEN
    NEW.cultural_responsiveness_features := (
      SELECT array_agg(value)
      FROM jsonb_array_elements_text(v_meta_value)
    );
    RAISE NOTICE 'lessons_normalize_write derived column=cultural_responsiveness_features from meta array lesson_id=%', NEW.lesson_id;
  ELSIF jsonb_typeof(v_meta_value) = 'string' THEN
    NEW.cultural_responsiveness_features := ARRAY[v_meta_value #>> '{}'];
    NEW.metadata := jsonb_set(NEW.metadata, '{culturalResponsivenessFeatures}', to_jsonb(NEW.cultural_responsiveness_features));
    RAISE NOTICE 'lessons_normalize_write coerced field=culturalResponsivenessFeatures before_shape=string after_shape=array lesson_id=%', NEW.lesson_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.lessons_normalize_write() IS
'Trigger function: enforces column⇄metadata sync on lessons (column wins on disagreement). Coerces academicIntegration object→array with concepts rescue. Validates closed-enum metadata values for activityType / tags / culturalResponsivenessFeatures (RAISE EXCEPTION on drift). activityType allowed list reduced to 4 values in 20260518000000 (D2.1 retired ''both''). seasonTiming validation deferred to Stage 1. lesson_format sync (B) removed in 20260512000000_drop_lesson_format.sql (D3). Sections (L)–(P) added in 20261026004447 so observancesHolidays / mainIngredients / gardenSkills / cookingSkills / culturalResponsivenessFeatures are synced like the other nine pairs. Baseline 20260509000000.';

-- =====================================================
-- POST-ASSERTS
-- =====================================================

-- POST 1: all five new sync markers are present in the live body.
-- POST 2: the original sections are still present (nothing was lost).
DO $$
DECLARE
  v_src text;
  v_missing text;
BEGIN
  SELECT prosrc INTO v_src
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace
    AND proname = 'lessons_normalize_write';

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
    RAISE EXCEPTION 'POST-ASSERT 1 FAILED: new sync marker(s) missing from lessons_normalize_write: %', v_missing;
  END IF;

  SELECT string_agg(m, ', ') INTO v_missing
  FROM unnest(ARRAY[
    '{academicConcepts}',
    '_validate_meta_enum_values',
    'jsonb_set(NEW.metadata, ''{academicIntegration}''',
    'jsonb_set(NEW.metadata, ''{activityType}''',
    'jsonb_set(NEW.metadata, ''{cookingMethods}''',
    'jsonb_set(NEW.metadata, ''{thematicCategories}''',
    'jsonb_set(NEW.metadata, ''{seasonTiming}''',
    'jsonb_set(NEW.metadata, ''{locationRequirements}''',
    'jsonb_set(NEW.metadata, ''{coreCompetencies}''',
    'jsonb_set(NEW.metadata, ''{culturalHeritage}''',
    'jsonb_set(NEW.metadata, ''{socialEmotionalLearning}'''
  ]) AS m
  WHERE strpos(v_src, m) = 0;
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'POST-ASSERT 2 FAILED: original section marker(s) missing from lessons_normalize_write: %', v_missing;
  END IF;
END $$;

-- POST 3: the trigger is still attached, enabled and bound to this function.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_proc p ON p.oid = t.tgfoid
    WHERE t.tgrelid = 'public.lessons'::regclass
      AND t.tgname = 'lessons_normalize_write_trg'
      AND p.proname = 'lessons_normalize_write'
      AND t.tgenabled <> 'D'
  ) THEN
    RAISE EXCEPTION 'POST-ASSERT 3 FAILED: lessons_normalize_write_trg is no longer attached/enabled/bound to lessons_normalize_write';
  END IF;
END $$;

-- Defensive: no shape change, but a function swap may matter to PostgREST
-- consumers (same as 20260518000000).
NOTIFY pgrst, 'reload schema';

COMMIT;

-- Expected whitespace-normalised body md5 after apply (verify on local/TEST/PROD):
--   SELECT md5(btrim(regexp_replace(prosrc, '\s+', ' ', 'g')))
--   FROM pg_proc WHERE proname = 'lessons_normalize_write';
--   → 6fe7be5e17293a3be9fdc87712ca81f3
