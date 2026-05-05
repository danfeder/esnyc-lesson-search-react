-- =====================================================
-- Migration: 20260515000000_metadata_value_validation.sql
-- =====================================================
-- Description: PR 1 Task 1.6 — value-validation guardrails for closed-enum
-- metadata. Two layers:
--   (1) CHECK constraints on three text[] columns (activity_type, tags,
--       cultural_responsiveness_features). Column-side hard rejection.
--   (2) lessons_normalize_write trigger extended with new helper
--       _validate_meta_enum_values() — RAISE EXCEPTION on bad values in
--       metadata-embedded enum keys (activityType, tags,
--       culturalResponsivenessFeatures).
--
-- Pre-CHECK cleanup: 1 row of CRF drift on TEST + PROD ('Communication
-- of high expectations' singular typo) replaced with the canonical value
-- 'Communicates high expectations' on column AND metadata sides BEFORE
-- the CHECK installs (otherwise ADD CONSTRAINT would fail). Idempotent
-- via array_replace + value-existence guards.
--
-- NOT IN SCOPE (Task 1.6 audit, 2026-05-05):
--   - season_timing column already protected by valid_seasons CHECK
--     (baseline 20251001). No new column CHECK needed.
--   - seasonTiming metadata key has ~213 drift rows on TEST (mix of
--     'All Seasons', 'year-round', 'Beginning of year', case-mixed
--     'fall'/'winter', 'Black History Month', etc.). Trigger value-
--     validation for this key deferred to Stage 1 worksheet round —
--     enforcement now would block reviewer saves on ~213 legacy rows.
--
-- SOURCES (hand-synced from canonical Zod schema):
--   src/types/generated/enums.json
--   src/types/lessonMetadata.zod.ts
--
-- See:
--   docs/plans/2026-05-03-metadata-rebuild-foundation-design.md §5
--   docs/plans/2026-05-03-metadata-rebuild-foundation-implementation.md §1.6
--   docs/plans/2026-05-03-metadata-rebuild-foundation-validator-architecture.md
-- =====================================================


-- =====================================================
-- (1) Pre-CHECK CRF drift cleanup (idempotent)
-- =====================================================
-- Column side. array_replace returns the array unchanged when value not present.
UPDATE public.lessons
SET cultural_responsiveness_features = array_replace(
  cultural_responsiveness_features,
  'Communication of high expectations',
  'Communicates high expectations'
)
WHERE 'Communication of high expectations' = ANY(cultural_responsiveness_features);

-- Metadata side. Rebuild the JSON array element-by-element with CASE replacement.
UPDATE public.lessons
SET metadata = jsonb_set(
  metadata,
  '{culturalResponsivenessFeatures}',
  (
    SELECT jsonb_agg(
      CASE WHEN val = 'Communication of high expectations'
        THEN to_jsonb('Communicates high expectations'::text)
        ELSE to_jsonb(val)
      END
    )
    FROM jsonb_array_elements_text(metadata->'culturalResponsivenessFeatures') AS val
  )
)
WHERE jsonb_typeof(metadata->'culturalResponsivenessFeatures') = 'array'
  AND metadata->'culturalResponsivenessFeatures' @> '"Communication of high expectations"'::jsonb;


-- =====================================================
-- (2) CHECK constraints on closed-enum text[] columns
--     Idempotent via DO blocks (pg_constraint existence check).
-- =====================================================
DO $$
BEGIN
  -- SOURCE: enums.json["activity_type"]
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valid_activity_type'
      AND conrelid = 'public.lessons'::regclass
  ) THEN
    ALTER TABLE public.lessons
      ADD CONSTRAINT valid_activity_type
      CHECK (
        activity_type IS NULL
        OR activity_type <@ ARRAY['cooking','garden','both','academic','craft']::text[]
      );
  END IF;

  -- SOURCE: enums.json["tags"]
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valid_tags'
      AND conrelid = 'public.lessons'::regclass
  ) THEN
    ALTER TABLE public.lessons
      ADD CONSTRAINT valid_tags
      CHECK (
        tags IS NULL
        OR tags <@ ARRAY['orientation','bilingual_handouts']::text[]
      );
  END IF;

  -- SOURCE: enums.json["cultural_responsiveness_features"]
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valid_cultural_responsiveness_features'
      AND conrelid = 'public.lessons'::regclass
  ) THEN
    ALTER TABLE public.lessons
      ADD CONSTRAINT valid_cultural_responsiveness_features
      CHECK (
        cultural_responsiveness_features IS NULL
        OR cultural_responsiveness_features <@ ARRAY[
          'Promotes positive perspectives on parents and families',
          'Communicates high expectations',
          'Encourages learning within the context of culture',
          'Promotes student-centered instruction',
          'Incorporates different individual and cultural learning styles',
          'Reshapes curriculum',
          'Positions teacher as facilitator'
        ]::text[]
      );
  END IF;
END $$;


-- =====================================================
-- (3) Helper function: _validate_meta_enum_values
--     Validates that metadata.<key> contains only canonical-enum values.
--     Hard-fails via RAISE EXCEPTION on the first bad value found.
--     Handles both string-scalar and text-array shapes; no-op on null/absent.
-- =====================================================
CREATE OR REPLACE FUNCTION public._validate_meta_enum_values(
  p_meta jsonb,
  p_key text,
  p_allowed text[],
  p_lesson_id text
) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_meta_value jsonb;
  v_invalid_value text;
BEGIN
  v_meta_value := p_meta->p_key;
  IF v_meta_value IS NULL OR v_meta_value = 'null'::jsonb THEN
    RETURN;
  END IF;

  IF jsonb_typeof(v_meta_value) = 'string' THEN
    IF NOT ((v_meta_value #>> '{}') = ANY(p_allowed)) THEN
      RAISE EXCEPTION 'Invalid value "%" for metadata.%; expected one of %',
        v_meta_value #>> '{}', p_key, array_to_string(p_allowed, ', ')
        USING HINT = format('Lesson lesson_id=%s', COALESCE(p_lesson_id, 'NULL'));
    END IF;
  ELSIF jsonb_typeof(v_meta_value) = 'array' THEN
    SELECT v.value INTO v_invalid_value
    FROM jsonb_array_elements_text(v_meta_value) AS v(value)
    WHERE NOT (v.value = ANY(p_allowed))
    LIMIT 1;
    IF v_invalid_value IS NOT NULL THEN
      RAISE EXCEPTION 'Invalid value "%" for metadata.%; expected one of %',
        v_invalid_value, p_key, array_to_string(p_allowed, ', ')
        USING HINT = format('Lesson lesson_id=%s', COALESCE(p_lesson_id, 'NULL'));
    END IF;
  END IF;
END;
$$;

COMMENT ON FUNCTION public._validate_meta_enum_values(jsonb, text, text[], text) IS
'Trigger helper: validates that metadata.<key> contains only canonical-enum values. Hard-fails via RAISE EXCEPTION on bad value. Hand-synced from src/types/generated/enums.json. Added in 20260515000000_metadata_value_validation.sql (PR 1 Task 1.6).';


-- =====================================================
-- (4) Trigger function: lessons_normalize_write
--     CREATE OR REPLACE — body byte-identical to 20260512000000 EXCEPT
--     for the new (V) value-validation section between (A) rescue and
--     (C) academic_integration sync. Section labels (C)..(K) preserved.
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
  --     Section labels (C)..(K) below preserve their letters from
  --     20260509000000 to keep cross-references stable.
  -- ============================================================

  -- ============================================================
  -- (V) NEW (Task 1.6): Value-validation on closed-enum metadata keys.
  --     Hard-fail (RAISE EXCEPTION) when a metadata-embedded value
  --     doesn't match the canonical enum. Runs BEFORE the (C)..(K)
  --     sync sections — drift in metadata is rejected before sync
  --     attempts derive a column from it (cleaner error message than
  --     letting CHECK fire downstream).
  --
  --     Scope: 3 keys — activityType / tags / culturalResponsivenessFeatures.
  --     EXCLUDED: seasonTiming. ~213 drift rows on TEST as of 2026-05-05
  --     (mix of 'All Seasons', 'year-round', 'Beginning of year', case-
  --     mixed 'fall'/'winter', 'Black History Month'). Stage 1 worksheet
  --     round will settle canonical handling; trigger validation deferred.
  --
  --     SOURCE: src/types/generated/enums.json (hand-synced).
  -- ============================================================
  PERFORM public._validate_meta_enum_values(
    NEW.metadata, 'activityType',
    ARRAY['cooking','garden','both','academic','craft']::text[],
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
'Trigger function: enforces column⇄metadata sync on lessons (column wins on disagreement). Coerces academicIntegration object→array with concepts rescue. Validates closed-enum metadata values for activityType / tags / culturalResponsivenessFeatures (RAISE EXCEPTION on drift) — Task 1.6 (V) section. seasonTiming validation deferred to Stage 1. lesson_format sync (B) removed in 20260512000000_drop_lesson_format.sql (D3). Baseline 20260509000000.';


-- =====================================================
-- (5) NOTIFY pgrst (defensive — no schema-shape changes; consumers may
-- rely on pg_constraint / pg_proc reload after CHECK + trigger updates).
-- =====================================================
NOTIFY pgrst, 'reload schema';


-- =====================================================
-- ROLLBACK (see sibling 20260515000000_metadata_value_validation.sql.rollback)
-- =====================================================
