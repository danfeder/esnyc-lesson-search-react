-- =====================================================
-- Migration: 20260509000000_filter_drift_pr2_m4_normalize_trigger.sql
-- =====================================================
-- Description: Filter-drift PR-2 Migration 4 — install + enable
-- lessons_normalize_write trigger.
--
-- BEFORE INSERT OR UPDATE on lessons. Enforces column⇄metadata sync
-- with explicit precedence: column wins on disagreement. Proactively
-- coerces the two known drift shapes:
--   - lessonFormat: array ["x"] → scalar "x"
--   - academicIntegration: object {selected:[...], concepts:{...}}
--     → flat array [...] (with concepts rescued to top-level
--     metadata.academicConcepts BEFORE the flatten so the rich
--     per-subject content is preserved).
-- Other text[] filter fields (activity_type, cooking_methods,
-- thematic_categories, season_timing, location_requirements,
-- core_competencies, cultural_heritage, social_emotional_learning):
-- column⇄metadata sync only (probe 4 confirmed these keys are
-- array-only at rest across all 788 PROD rows; defensive
-- scalar→array coercion included for forward-compat).
--
-- Logs RAISE NOTICE on every actual coercion (silent when input is
-- already canonical — no NOTICE noise for normal writes through
-- complete_review_atomic post-M1 fix). Logs go to Supabase log
-- streams. (No audit table in this PR — design doc §10 captured
-- audit table as a possible PR-2-round-2 follow-up if log-only
-- proves insufficient.)
--
-- Sequencing: arrives last in PR-2 to a fully canonical table
-- (M1 writer fix → M2 backfill → M3 column hygiene → M4 trigger).
-- No DISABLE / session_replication_role='replica' dance needed.
-- After this migration lands, every future write to lessons
-- (RPC, MCP, manual SQL, scripts, future migrations) goes through
-- the trigger and produces canonical column⇄metadata pairs.
--
-- Idempotency:
--   - Helper function: CREATE OR REPLACE — safe to re-run.
--   - Trigger function: CREATE OR REPLACE — safe to re-run.
--   - Trigger: DROP TRIGGER IF EXISTS guards re-creation.
--   - Per-row logic: each comparison short-circuits when shapes
--     already match (no spurious NOTICE for canonical input).
--   - Concepts rescue: NOT-EXISTS guard means re-running on a row
--     that already has non-empty top-level academicConcepts is a
--     no-op.
--
-- Note on baseline: the baseline has handle_lessons_metadata_write()
-- (defined in 20251001_production_baseline_snapshot.sql:465) but
-- unattached to lessons. We define a NEW function lessons_normalize_write()
-- rather than reuse the baseline function — easier to audit and
-- rollback; baseline function stays as historical artifact.
--
-- Trigger naming: lessons_normalize_write_trg (table + function name +
-- _trg suffix per convention).
--
-- See:
--   - design doc §5 Migration 4 (filter-drift-repair-design.md)
--   - impl plan Task 2.7 (filter-drift-repair-implementation.md)
--   - status doc Session 9 (filter-drift-repair-execution-status.md)

-- =====================================================
-- CHANGES
-- =====================================================

-- Multiset-equality helper. Returns true iff p_meta is a JSON array AND
-- the multiset of its text-coerced elements equals the multiset of p_col's
-- elements (order-independent, duplicates preserved). Used by the trigger
-- function to decide whether meta needs rewriting to match the column.
--
-- Why multiset (not set): if column has duplicates (rare but possible),
-- meta should mirror them. array_agg(... ORDER BY value) without DISTINCT
-- preserves duplicates so the comparison is exact-multiset.
CREATE OR REPLACE FUNCTION public._meta_array_matches_column(p_meta jsonb, p_col text[])
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT
    jsonb_typeof(p_meta) = 'array'
    AND (
      SELECT COALESCE(array_agg(value ORDER BY value), ARRAY[]::text[])
      FROM jsonb_array_elements_text(p_meta)
    ) = (
      SELECT COALESCE(array_agg(v ORDER BY v), ARRAY[]::text[])
      FROM unnest(p_col) v
    );
$$;

COMMENT ON FUNCTION public._meta_array_matches_column(jsonb, text[]) IS
'Internal helper for lessons_normalize_write trigger. Returns true iff p_meta is a JSON array whose multiset of text-coerced elements equals p_col. Order-independent, duplicates preserved.';


CREATE OR REPLACE FUNCTION public.lessons_normalize_write()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_meta_value jsonb;
BEGIN
  -- Initialize NEW.metadata if NULL so jsonb_set / ?-operator are safe.
  IF NEW.metadata IS NULL THEN
    NEW.metadata := '{}'::jsonb;
  END IF;

  -- ============================================================
  -- (A) Concepts rescue (must run BEFORE academicIntegration flatten).
  --
  -- If incoming meta has object-shape AI with non-empty `concepts`
  -- AND top-level `academicConcepts` is not already populated,
  -- copy `concepts` to top-level `academicConcepts` so the
  -- subsequent flatten in (C) doesn't destroy the per-subject
  -- content. ~690 PROD rows pre-M2 had rich concepts; M2 already
  -- rescued the at-rest cohort. This trigger handles the steady-
  -- state forward path: any future write that arrives in the
  -- legacy object-shape gets concepts preserved.
  --
  -- Idempotent: NOT-EXISTS guard means re-running on a row that
  -- already has non-empty top-level academicConcepts is a no-op.
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
  -- (B) lesson_format (text scalar) — column⇄metadata sync.
  --     Drift coercion: array ["x"] → scalar "x".
  -- ============================================================
  v_meta_value := NEW.metadata->'lessonFormat';
  IF NEW.lesson_format IS NOT NULL AND NEW.lesson_format <> '' THEN
    -- Column populated. Force meta to matching scalar.
    IF v_meta_value IS DISTINCT FROM to_jsonb(NEW.lesson_format) THEN
      NEW.metadata := jsonb_set(NEW.metadata, '{lessonFormat}', to_jsonb(NEW.lesson_format));
      RAISE NOTICE 'lessons_normalize_write coerced field=lessonFormat before_shape=% after_shape=string lesson_id=%',
        COALESCE(jsonb_typeof(v_meta_value), 'null'), NEW.lesson_id;
    END IF;
  ELSIF jsonb_typeof(v_meta_value) = 'array' AND jsonb_array_length(v_meta_value) > 0 THEN
    -- Column empty + meta has array → derive column from first element + coerce meta to scalar.
    NEW.lesson_format := v_meta_value->>0;
    NEW.metadata := jsonb_set(NEW.metadata, '{lessonFormat}', to_jsonb(NEW.lesson_format));
    RAISE NOTICE 'lessons_normalize_write coerced field=lessonFormat before_shape=array after_shape=string lesson_id=%', NEW.lesson_id;
  ELSIF jsonb_typeof(v_meta_value) = 'string' THEN
    -- Column empty + meta has scalar → derive column. Meta unchanged.
    NEW.lesson_format := v_meta_value #>> '{}';
    RAISE NOTICE 'lessons_normalize_write derived column=lesson_format from meta scalar lesson_id=%', NEW.lesson_id;
  END IF;

  -- ============================================================
  -- (C) academic_integration (text[]) — column⇄metadata sync.
  --     Drift coercion: object {selected:[...], concepts:{...}}
  --     → flat array [...]. Concepts already rescued in (A).
  -- ============================================================
  v_meta_value := NEW.metadata->'academicIntegration';
  -- (C.1) Flatten object-shape AI to flat array using `selected` (or empty).
  IF jsonb_typeof(v_meta_value) = 'object' THEN
    v_meta_value := COALESCE(v_meta_value->'selected', '[]'::jsonb);
    -- Defensive: if `selected` is non-array (rare drift), coerce to empty array.
    IF jsonb_typeof(v_meta_value) <> 'array' THEN
      v_meta_value := '[]'::jsonb;
    END IF;
    NEW.metadata := jsonb_set(NEW.metadata, '{academicIntegration}', v_meta_value);
    RAISE NOTICE 'lessons_normalize_write coerced field=academicIntegration before_shape=object after_shape=array lesson_id=%', NEW.lesson_id;
  END IF;
  -- (C.2) Now sync against column.
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
'Trigger function: enforces column⇄metadata sync on lessons (column wins on disagreement). Coerces known drift shapes (lessonFormat array→scalar, academicIntegration object→array with concepts rescue to top-level academicConcepts). Logs RAISE NOTICE on every coercion. See filter-drift design doc §5 Migration 4.';


-- Drop any prior trigger of the same name (idempotent re-apply) and create.
DROP TRIGGER IF EXISTS lessons_normalize_write_trg ON public.lessons;

CREATE TRIGGER lessons_normalize_write_trg
  BEFORE INSERT OR UPDATE ON public.lessons
  FOR EACH ROW
  EXECUTE FUNCTION public.lessons_normalize_write();

COMMENT ON TRIGGER lessons_normalize_write_trg ON public.lessons IS
'BEFORE INSERT OR UPDATE: enforces canonical column⇄metadata pairs on every write to lessons (RPC, MCP, manual SQL). Installed by PR-2 M4 after the table was made fully canonical by M1+M2+M3. See filter-drift design doc §5 Migration 4.';

-- =====================================================
-- ROLLBACK (kept as comments only)
-- =====================================================
-- Two-step rollback if the trigger needs to be removed urgently:
--   1. Disable: ALTER TABLE public.lessons DISABLE TRIGGER lessons_normalize_write_trg;
--      (existing rows untouched; future writes bypass the trigger)
--   2. Remove: DROP TRIGGER IF EXISTS lessons_normalize_write_trg ON public.lessons;
--              DROP FUNCTION IF EXISTS public.lessons_normalize_write();
--              DROP FUNCTION IF EXISTS public._meta_array_matches_column(jsonb, text[]);
--
-- After this trigger is rolled back, future writes from
-- complete_review_atomic still produce canonical output (M1 writer
-- fix is independent), but direct SQL or MCP writes that bypass
-- complete_review_atomic could re-introduce drift. Drift won't
-- regrow from the historical cohort (M2+M3 are one-way fixes).
