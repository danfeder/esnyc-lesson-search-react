-- =====================================================
-- Migration: 20260518000000_activity_type_multi_select.sql
-- =====================================================
-- Description: D2.1 step 1 — retire 'both' value from activity_type
--              vocabulary. Repoint the 135 [both] rows on TEST (139 on
--              PROD) to [cooking, garden]. Drop 'both' from
--              valid_activity_type CHECK + lessons_normalize_write
--              trigger value-validation list.
--
-- Why: D2 originally locked 5-value SINGLE-select on n=1 evidence (the
-- Dr. Carver Lotion-Making lesson). Mid-Task-2.4 ground-truth resolution
-- in Session 27 surfaced ~5/26 = 19% multi-axis lessons in the reviewer-
-- tagged subset, extrapolating to ~30+ in the 772-row corpus. User chose
-- Option B-1: true multi-element array, retire 'both' entirely. Decision
-- D2.1 in 2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md.
--
-- Scope: TEST has 134 array-shape + 1 string-shape rows = 135 [both] in
-- lessons.activity_type / lessons.metadata->'activityType' (verified
-- 2026-05-06 — 0 rows where column != [both] but metadata mentions
-- 'both'). PROD shape unverified pre-PR-merge; SAFE because UPDATE WHERE
-- clauses are no-op on rows that don't match. Out-of-scope: 2 historical
-- submission_reviews.tagged_metadata rows on already-approved completed
-- submissions (display-only artifact, no save path) — Task 1b.1 impl
-- plan limits scope to lessons table.

-- =====================================================
-- (1) Repoint data
-- =====================================================

-- (1a) Update lessons.activity_type column from [both] -> [cooking, garden].
-- The lessons_normalize_write trigger's section (D) auto-syncs the JSONB
-- key (metadata->'activityType') to match: _meta_array_matches_column
-- returns false for non-array shapes and for array-shapes that diverge
-- from the column, triggering jsonb_set to to_jsonb(NEW.activity_type) =
-- '["cooking","garden"]'.
UPDATE public.lessons
SET activity_type = ARRAY['cooking','garden']::text[]
WHERE activity_type = ARRAY['both']::text[];

-- (1b) Defensive belt-and-braces for any rows where metadata->'activityType'
-- still mentions 'both' after step (1a) — covers the string-shape case
-- and any edge case where the trigger's auto-sync did not fire (e.g.,
-- column was NULL pre-migration). Idempotent — no-op once rows are
-- canonicalized.
UPDATE public.lessons
SET metadata = jsonb_set(metadata, '{activityType}', '["cooking","garden"]'::jsonb)
WHERE metadata->'activityType' IN ('["both"]'::jsonb, '"both"'::jsonb);

-- =====================================================
-- (2) Drop 'both' from valid_activity_type CHECK constraint.
--     Idempotent via DROP IF EXISTS + ADD (ADD has no IF NOT EXISTS in
--     PostgreSQL; the unconditional DROP guarantees a clean slot).
-- =====================================================
ALTER TABLE public.lessons
  DROP CONSTRAINT IF EXISTS valid_activity_type;

ALTER TABLE public.lessons
  ADD CONSTRAINT valid_activity_type
  CHECK (
    activity_type IS NULL
    OR activity_type <@ ARRAY['cooking','garden','academic','craft']::text[]
  );

-- =====================================================
-- (3) Replace lessons_normalize_write — drop 'both' from activityType
--     allowed-values list (was the only delta vs. 20260515000000 line
--     238). Body byte-identical otherwise; (V)-section comment updated
--     to reflect D2.1 retirement.
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

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.lessons_normalize_write() IS
'Trigger function: enforces column⇄metadata sync on lessons (column wins on disagreement). Coerces academicIntegration object→array with concepts rescue. Validates closed-enum metadata values for activityType / tags / culturalResponsivenessFeatures (RAISE EXCEPTION on drift). activityType allowed list reduced to 4 values in 20260518000000 (D2.1 retired ''both''). seasonTiming validation deferred to Stage 1. lesson_format sync (B) removed in 20260512000000_drop_lesson_format.sql (D3). Baseline 20260509000000.';

-- =====================================================
-- (4) NOTIFY pgrst (defensive — no shape change but constraint + trigger
--     reload may matter to PostgREST consumers).
-- =====================================================
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- ROLLBACK (see sibling 20260518000000_activity_type_multi_select.sql.rollback)
-- =====================================================
