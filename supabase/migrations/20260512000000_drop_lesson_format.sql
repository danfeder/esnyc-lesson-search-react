-- =====================================================
-- Migration: 20260512000000_drop_lesson_format.sql
-- =====================================================
-- D3 — drop the lessonFormat field entirely from lessons. Coordinated
-- removal across view + 3 active RPCs + normalize trigger + 2 indexes +
-- JSONB key strip + column drop.
--
-- Plan reference: docs/plans/2026-05-03-metadata-rebuild-foundation-implementation.md
-- §1.3 (Task 1.3: lessonFormat removal — coordinated SQL migration).
-- Design reference: docs/plans/2026-05-03-metadata-rebuild-foundation-design.md §4 (D3).
-- Status doc: docs/plans/2026-05-03-metadata-rebuild-foundation-execution-status.md
-- (Gate A "Per-surface PR 1 task list" + Session 7 amendments below).
--
-- ----- Session 7 amendments to Gate A's RPC list (2026-05-04) -----
-- The Gate A surface list predicted 5 RPCs requiring redefinition. TEST DB +
-- migration-history audit (Session 7) found:
--   • archive_duplicate_lesson — current definition (20260209140001 cleanup)
--     does NOT reference lesson_format. Verified
--     pg_get_functiondef('public.archive_duplicate_lesson'::regproc) ~ 'lesson_format'
--     returns false on TEST DB. NO-OP for this migration.
--   • resolve_duplicate_group — function was DROPped in
--     20251205_add_archive_duplicate_lesson_function.sql line 190 (which
--     replaced it with archive_duplicate_lesson). Confirmed absent from both
--     TEST DB and PROD DB pg_proc on 2026-05-04. NO-OP for this migration.
-- Net active RPC redefinitions in this migration: 3
--   (search_lessons / complete_review_atomic / get_lesson_details_for_review).
--
-- ----- Compat-bridge pattern (one-release survival) -----
-- PostgREST returns hard PGRST202 404 for unknown RPC parameters. Netlify
-- caches JS bundles for 1 year (hash-immutable); TanStack Query caches
-- responses for 5 minutes. Stale browser tabs can still emit
-- filter_lesson_format after this migration deploys. To prevent
-- across-the-board breakage during the stale-tab decay window:
--   • search_lessons KEEPS the filter_lesson_format text DEFAULT NULL
--     parameter — the WHERE clause is removed but the parameter is accepted
--     and ignored.
--   • _alias_lesson_format(text) helper stays — drops with the parameter in
--     the Task 1.3a follow-up migration.
--   • lessons_with_metadata view KEEPS a lesson_format column projection,
--     hard-coded to NULL::text. Any consumer reading the view (edge
--     functions, scripts, third-party SQL) sees the column but always gets
--     NULL.
-- These three compat-bridge artifacts (parameter, helper, view projection)
-- are removed together in the Task 1.3a follow-up migration ≥ 24-48h after
-- the frontend deploy ships.
--
-- ----- Sequencing within this transaction -----
-- supabase migrations are wrapped in a single transaction by the CLI's
-- psql -1 invocation. Order matters: the column-dependent surfaces
-- (view, RPCs, trigger) are rewritten BEFORE the column drop so the drop
-- has nothing live referencing it. Within the trigger rewrite, only
-- section (B) — the lesson_format column⇄metadata sync — is removed; the
-- other 9 fields (academic_integration, activity_type, cooking_methods,
-- thematic_categories, season_timing, location_requirements,
-- core_competencies, cultural_heritage, social_emotional_learning, plus
-- the academicConcepts rescue) all stay byte-identical to 20260509000000.
--
-- ----- Coordinated changes (same commit, not in this file) -----
-- Edited together in this commit so `supabase db reset` continues to
-- succeed locally:
--   • supabase/seed.sql — sample-lesson INSERT column list edited to remove
--     lesson_format (1-line removal at line 71). Gate A bins this under
--     Task 1.3b but it is a verification dependency for Task 1.3 — without
--     this edit, db reset fails after the column drop.
--
-- The remainder of Task 1.3b (frontend + edge sweep, ~30 file surfaces) is
-- a separate session.
--
-- Forward-rollback: see sibling 20260512000000_drop_lesson_format.sql.rollback.

-- =====================================================
-- (1) Recreate lessons_with_metadata view with NULL::text AS lesson_format
--     compat bridge.
-- =====================================================
-- CREATE OR REPLACE VIEW restriction: same column names + same order +
-- same types; lesson_format stays at the same ordinal position with the
-- same text type, just sourced from a NULL literal instead of l.lesson_format.
CREATE OR REPLACE VIEW public.lessons_with_metadata AS
  SELECT
    l.id,
    l.lesson_id,
    l.title,
    l.summary,
    l.file_link,
    l.grade_levels,
    l.metadata,
    l.confidence,
    l.search_vector,
    l.created_at,
    l.updated_at,
    l.content_text,
    l.content_embedding,
    l.content_hash,
    l.canonical_id,
    l.version_number,
    l.has_versions,
    l.original_submission_id,
    l.last_modified,
    l.thematic_categories,
    l.cultural_heritage,
    l.observances_holidays,
    l.location_requirements,
    l.season_timing,
    l.academic_integration,
    l.social_emotional_learning,
    l.cooking_methods,
    l.main_ingredients,
    l.cultural_responsiveness_features,
    l.garden_skills,
    l.cooking_skills,
    l.core_competencies,
    NULL::text AS lesson_format,                       -- compat bridge; drops in Task 1.3a
    l.processing_notes,
    l.review_notes,
    l.flagged_for_review,
    l.tags,
    (l.metadata ->> 'activity_type'::text) AS activity_type_meta,
    (l.metadata ->> 'location'::text) AS location_meta,
    (l.metadata ->> 'season'::text) AS season_meta,
    (l.metadata ->> 'timing'::text) AS timing_meta,
    (l.metadata ->> 'group_size'::text) AS group_size_meta,
    (l.metadata ->> 'duration_minutes'::text) AS duration_minutes_meta,
    (l.metadata ->> 'prep_time_minutes'::text) AS prep_time_minutes_meta,
    ((l.metadata ->> 'grade_levels'::text))::jsonb AS grade_levels_array,
    ((l.metadata ->> 'themes'::text))::jsonb AS themes_array,
    ((l.metadata ->> 'core_competencies'::text))::jsonb AS core_competencies_array,
    ((l.metadata ->> 'cultural_heritage'::text))::jsonb AS cultural_heritage_array,
    ((l.metadata ->> 'academic_integration'::text))::jsonb AS academic_integration_array,
    ((l.metadata ->> 'sel_competencies'::text))::jsonb AS sel_competencies_array,
    ((l.metadata ->> 'observances'::text))::jsonb AS observances_array,
    ((l.metadata ->> 'main_ingredients'::text))::jsonb AS main_ingredients_array,
    ((l.metadata ->> 'garden_skills'::text))::jsonb AS garden_skills_array,
    ((l.metadata ->> 'cooking_skills'::text))::jsonb AS cooking_skills_array,
    ((l.metadata ->> 'materials'::text))::jsonb AS materials_array
  FROM public.lessons l;

COMMENT ON VIEW public.lessons_with_metadata IS
  'View of lessons with metadata fields extracted. Uses INVOKER security (respects RLS). lesson_format projection is a NULL::text compat bridge as of 20260512000000_drop_lesson_format.sql; the bridge drops in the Task 1.3a follow-up migration.';


-- =====================================================
-- (2a) Redefine search_lessons — CREATE OR REPLACE (signature unchanged).
--      KEEP filter_lesson_format param + _alias_lesson_format helper.
--      REMOVE the WHERE clause referencing _alias_lesson_format(...).
--      REMOVE the lessonFormat key from the per-field COALESCE metadata
--      overlay (column dropping; nothing to project from).
-- =====================================================
CREATE OR REPLACE FUNCTION public.search_lessons(
  search_query           text    DEFAULT NULL,
  filter_grade_levels    text[]  DEFAULT NULL,
  filter_themes          text[]  DEFAULT NULL,
  filter_seasons         text[]  DEFAULT NULL,
  filter_competencies    text[]  DEFAULT NULL,
  filter_cultures        text[]  DEFAULT NULL,
  filter_location        text[]  DEFAULT NULL,
  filter_activity_type   text[]  DEFAULT NULL,
  filter_lesson_format   text    DEFAULT NULL,         -- compat bridge; drops in Task 1.3a
  filter_academic        text[]  DEFAULT NULL,
  filter_sel             text[]  DEFAULT NULL,
  filter_cooking_method  text[]  DEFAULT NULL,
  page_size              integer DEFAULT 20,
  page_offset            integer DEFAULT 0
)
RETURNS TABLE (
  lesson_id    text,
  title        text,
  summary      text,
  file_link    text,
  grade_levels text[],
  metadata     jsonb,
  confidence   jsonb,
  rank         double precision,
  total_count  bigint
)
LANGUAGE plpgsql
AS $$
DECLARE
  expanded_query    text;
  expanded_cultures text[];
  total_results     bigint;
BEGIN
  -- Synonym expansion for FTS
  IF search_query IS NOT NULL AND search_query <> '' THEN
    expanded_query := expand_search_with_synonyms(search_query);
  ELSE
    expanded_query := NULL;
  END IF;

  -- Cultural heritage: alias FIRST, then expand to children.
  IF filter_cultures IS NOT NULL AND array_length(filter_cultures, 1) > 0 THEN
    expanded_cultures := expand_cultural_heritage(_alias_cultural_heritage(filter_cultures));
  ELSE
    expanded_cultures := NULL;
  END IF;

  -- Total count (count and result queries share WHERE)
  SELECT COUNT(*) INTO total_results
  FROM lessons l
  WHERE
    (search_query IS NULL OR search_query = '' OR (
      l.search_vector @@ to_tsquery('english', expanded_query) OR
      l.title   % search_query OR
      l.summary % search_query
    ))
    AND (filter_grade_levels IS NULL OR array_length(filter_grade_levels, 1) IS NULL OR
         l.grade_levels && filter_grade_levels)
    AND (filter_themes IS NULL OR array_length(filter_themes, 1) IS NULL OR
         l.thematic_categories && filter_themes)
    AND (filter_seasons IS NULL OR array_length(filter_seasons, 1) IS NULL OR
         l.season_timing && filter_seasons)
    AND (filter_competencies IS NULL OR array_length(filter_competencies, 1) IS NULL OR
         l.core_competencies && filter_competencies)
    AND (expanded_cultures IS NULL OR array_length(expanded_cultures, 1) IS NULL OR
         l.cultural_heritage && expanded_cultures)
    AND (filter_location IS NULL OR array_length(filter_location, 1) IS NULL OR
         l.location_requirements && filter_location)
    AND (filter_activity_type IS NULL OR array_length(filter_activity_type, 1) IS NULL OR
         l.activity_type && _alias_activity_type(filter_activity_type))
    -- (filter_lesson_format WHERE clause removed — D3 lessonFormat field dropped.
    --  Parameter retained as a compat bridge; ignored by this body.)
    AND (filter_academic IS NULL OR array_length(filter_academic, 1) IS NULL OR
         l.academic_integration && filter_academic)
    AND (filter_sel IS NULL OR array_length(filter_sel, 1) IS NULL OR
         l.social_emotional_learning && filter_sel)
    AND (filter_cooking_method IS NULL OR array_length(filter_cooking_method, 1) IS NULL OR
         _match_cooking_methods(l.cooking_methods, filter_cooking_method));

  -- Paginated result rows
  RETURN QUERY
  SELECT
    l.lesson_id,
    l.title,
    l.summary,
    l.file_link,
    l.grade_levels,
    -- Per-field COALESCE metadata reconstruction. Same as 20260505000000 with
    -- the lessonFormat overlay key removed (D3 — column dropping; nothing
    -- to project from). academicConcepts sibling-key rescue retained.
    --
    -- COLUMNS INCLUDED (post-D3):
    --   thematic_categories, season_timing, location_requirements,
    --   core_competencies, cultural_heritage, activity_type,
    --   cooking_methods, academic_integration, social_emotional_learning
    COALESCE(l.metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
      'thematicCategories',      CASE WHEN COALESCE(array_length(l.thematic_categories, 1), 0) > 0       THEN to_jsonb(l.thematic_categories)       END,
      'seasonTiming',            CASE WHEN COALESCE(array_length(l.season_timing, 1), 0) > 0             THEN to_jsonb(l.season_timing)             END,
      'locationRequirements',    CASE WHEN COALESCE(array_length(l.location_requirements, 1), 0) > 0     THEN to_jsonb(l.location_requirements)     END,
      'coreCompetencies',        CASE WHEN COALESCE(array_length(l.core_competencies, 1), 0) > 0         THEN to_jsonb(l.core_competencies)         END,
      'culturalHeritage',        CASE WHEN COALESCE(array_length(l.cultural_heritage, 1), 0) > 0         THEN to_jsonb(l.cultural_heritage)         END,
      -- 'lessonFormat' overlay key removed — D3.
      'activityType',            CASE WHEN COALESCE(array_length(l.activity_type, 1), 0) > 0             THEN to_jsonb(l.activity_type)             END,
      'cookingMethods',          CASE WHEN COALESCE(array_length(l.cooking_methods, 1), 0) > 0           THEN to_jsonb(l.cooking_methods)           END,
      'academicIntegration',     CASE WHEN COALESCE(array_length(l.academic_integration, 1), 0) > 0      THEN to_jsonb(l.academic_integration)      END,
      'socialEmotionalLearning', CASE WHEN COALESCE(array_length(l.social_emotional_learning, 1), 0) > 0 THEN to_jsonb(l.social_emotional_learning) END,
      'academicConcepts',        CASE
                                   WHEN jsonb_typeof(l.metadata->'academicIntegration') = 'object'
                                    AND l.metadata->'academicIntegration' ? 'concepts'
                                   THEN l.metadata->'academicIntegration'->'concepts'
                                 END
    )) AS metadata,
    l.confidence,
    CASE
      WHEN search_query IS NOT NULL AND search_query <> '' THEN
        GREATEST(
          COALESCE(ts_rank(l.search_vector, to_tsquery('english', expanded_query)), 0),
          COALESCE(similarity(l.title,   search_query), 0),
          COALESCE(similarity(l.summary, search_query), 0) * 0.8
        )::double precision
      ELSE 0::double precision
    END AS rank,
    total_results
  FROM lessons l
  WHERE
    (search_query IS NULL OR search_query = '' OR (
      l.search_vector @@ to_tsquery('english', expanded_query) OR
      l.title   % search_query OR
      l.summary % search_query
    ))
    AND (filter_grade_levels IS NULL OR array_length(filter_grade_levels, 1) IS NULL OR
         l.grade_levels && filter_grade_levels)
    AND (filter_themes IS NULL OR array_length(filter_themes, 1) IS NULL OR
         l.thematic_categories && filter_themes)
    AND (filter_seasons IS NULL OR array_length(filter_seasons, 1) IS NULL OR
         l.season_timing && filter_seasons)
    AND (filter_competencies IS NULL OR array_length(filter_competencies, 1) IS NULL OR
         l.core_competencies && filter_competencies)
    AND (expanded_cultures IS NULL OR array_length(expanded_cultures, 1) IS NULL OR
         l.cultural_heritage && expanded_cultures)
    AND (filter_location IS NULL OR array_length(filter_location, 1) IS NULL OR
         l.location_requirements && filter_location)
    AND (filter_activity_type IS NULL OR array_length(filter_activity_type, 1) IS NULL OR
         l.activity_type && _alias_activity_type(filter_activity_type))
    -- (filter_lesson_format WHERE clause removed — D3.)
    AND (filter_academic IS NULL OR array_length(filter_academic, 1) IS NULL OR
         l.academic_integration && filter_academic)
    AND (filter_sel IS NULL OR array_length(filter_sel, 1) IS NULL OR
         l.social_emotional_learning && filter_sel)
    AND (filter_cooking_method IS NULL OR array_length(filter_cooking_method, 1) IS NULL OR
         _match_cooking_methods(l.cooking_methods, filter_cooking_method))
  ORDER BY
    rank DESC,
    COALESCE((l.confidence->>'overall')::float, 0) DESC,
    l.title ASC
  LIMIT page_size
  OFFSET page_offset;
END;
$$;
-- (No DROP+CREATE — signature unchanged from 20260505000000; CREATE OR
--  REPLACE preserves grants. _alias_lesson_format helper stays.)


-- =====================================================
-- (2b) Redefine complete_review_atomic — CREATE OR REPLACE (signature unchanged).
--      Drop the lessonFormat v_legacy_meta key, the lesson_format column ref
--      and value from the approve_new INSERT, and the lesson_format ref from
--      the approve_update UPDATE. Otherwise byte-identical to
--      20260510000000.
-- =====================================================
CREATE OR REPLACE FUNCTION public.complete_review_atomic(
  p_submission_id      uuid,
  p_reviewer_id        uuid,
  p_decision           text,
  p_metadata           jsonb,
  p_notes              text,
  p_selected_lesson_id text DEFAULT NULL
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_new_status      text;
  v_revision_reason text;
  v_new_lesson_id   text;
  v_submission      public.lesson_submissions%ROWTYPE;
  v_existing        public.lessons%ROWTYPE;
  v_meta            jsonb := COALESCE(p_metadata, '{}'::jsonb);
  v_notes           text  := COALESCE(p_notes, '');
  v_legacy_meta     jsonb;
BEGIN
  IF p_decision NOT IN ('approve_new', 'approve_update', 'needs_revision', 'reject') THEN
    RAISE EXCEPTION 'Invalid decision: %', p_decision USING ERRCODE = '22023';
  END IF;

  IF p_decision = 'approve_update' AND p_selected_lesson_id IS NULL THEN
    RAISE EXCEPTION 'approve_update requires p_selected_lesson_id' USING ERRCODE = '22023';
  END IF;

  v_new_status := CASE p_decision
    WHEN 'approve_new'    THEN 'approved'
    WHEN 'approve_update' THEN 'approved'
    WHEN 'needs_revision' THEN 'needs_revision'
    WHEN 'reject'         THEN 'rejected'
  END;

  v_revision_reason := CASE p_decision
    WHEN 'needs_revision' THEN v_notes
    WHEN 'reject'         THEN v_notes
    ELSE NULL
  END;

  SELECT * INTO v_submission
  FROM public.lesson_submissions
  WHERE id = p_submission_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Submission not found: %', p_submission_id USING ERRCODE = 'P0002';
  END IF;

  -- Idempotency guard (preserved from 20260428000008).
  IF v_submission.status IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Submission % already completed (status: %)',
      p_submission_id, v_submission.status
      USING ERRCODE = '55000';
  END IF;

  -- Build the canonical-shape metadata blob.
  --
  -- ONE SHAPE FIX vs prior (20260428000008, retained from 20260510000000):
  --   * academicIntegration: typeof-aware CASE → flat array.
  -- (lessonFormat shape fix removed — D3, key dropped from output.)
  v_legacy_meta := jsonb_build_object(
    'thematicCategories',             COALESCE(v_meta->'themes', '[]'::jsonb),
    'seasonTiming',                   COALESCE(v_meta->'season', '[]'::jsonb),
    'coreCompetencies',               COALESCE(v_meta->'coreCompetencies', '[]'::jsonb),
    'culturalHeritage',               COALESCE(v_meta->'culturalHeritage', '[]'::jsonb),
    'locationRequirements',
      CASE WHEN v_meta ? 'location' AND COALESCE(v_meta->>'location', '') <> ''
           THEN jsonb_build_array(v_meta->>'location')
           ELSE '[]'::jsonb END,
    -- 'lessonFormat' v_legacy_meta key removed — D3.
    'academicIntegration',
      CASE jsonb_typeof(v_meta->'academicIntegration')
        WHEN 'array'  THEN v_meta->'academicIntegration'
        WHEN 'object' THEN COALESCE(v_meta->'academicIntegration'->'selected', '[]'::jsonb)
        ELSE '[]'::jsonb
      END,
    'socialEmotionalLearning',        COALESCE(v_meta->'socialEmotionalLearning', '[]'::jsonb),
    'cookingMethods',                 COALESCE(v_meta->'cookingMethods', '[]'::jsonb),
    'mainIngredients',                COALESCE(v_meta->'mainIngredients', '[]'::jsonb),
    'gardenSkills',                   COALESCE(v_meta->'gardenSkills', '[]'::jsonb),
    'cookingSkills',                  COALESCE(v_meta->'cookingSkills', '[]'::jsonb),
    'observancesHolidays',            COALESCE(v_meta->'observancesHolidays', '[]'::jsonb),
    'culturalResponsivenessFeatures', COALESCE(v_meta->'culturalResponsivenessFeatures', '[]'::jsonb)
  );

  -- academicConcepts rescue (object-shape AI form). Unchanged from 20260510000000.
  IF jsonb_typeof(v_meta->'academicIntegration') = 'object'
     AND jsonb_typeof(v_meta->'academicIntegration'->'concepts') = 'object'
     AND v_meta->'academicIntegration'->'concepts' <> '{}'::jsonb
  THEN
    v_legacy_meta := v_legacy_meta
      || jsonb_build_object('academicConcepts', v_meta->'academicIntegration'->'concepts');
  END IF;

  -- Forward-compat: caller-supplied academicConcepts sibling. Unchanged.
  IF v_meta ? 'academicConcepts'
     AND jsonb_typeof(v_meta->'academicConcepts') = 'object'
     AND v_meta->'academicConcepts' <> '{}'::jsonb
  THEN
    v_legacy_meta := v_legacy_meta
      || jsonb_build_object('academicConcepts', v_meta->'academicConcepts');
  END IF;

  -- 1. UPSERT the review.
  INSERT INTO public.submission_reviews (
    submission_id, reviewer_id, decision, notes, tagged_metadata, review_completed_at
  ) VALUES (
    p_submission_id, p_reviewer_id, p_decision, v_notes, v_meta, now()
  )
  ON CONFLICT (submission_id) DO UPDATE SET
    reviewer_id         = EXCLUDED.reviewer_id,
    decision            = EXCLUDED.decision,
    notes               = EXCLUDED.notes,
    tagged_metadata     = EXCLUDED.tagged_metadata,
    review_completed_at = EXCLUDED.review_completed_at;

  -- 2. UPDATE the submission.
  UPDATE public.lesson_submissions SET
    status                    = v_new_status,
    reviewed_at               = now(),
    reviewed_by               = p_reviewer_id,
    reviewer_id               = p_reviewer_id,
    reviewer_notes            = v_notes,
    revision_requested_reason = v_revision_reason,
    review_completed_at       = now(),
    updated_at                = now()
  WHERE id = p_submission_id;

  -- 3. Lessons write (only for approve_*).
  IF p_decision = 'approve_new' THEN
    v_new_lesson_id := 'lesson_' || replace(gen_random_uuid()::text, '-', '');

    INSERT INTO public.lessons (
      lesson_id, title, summary, file_link,
      grade_levels, activity_type, thematic_categories, season_timing,
      core_competencies, cultural_heritage, location_requirements,
      -- lesson_format column reference removed — D3.
      academic_integration, social_emotional_learning, cooking_methods,
      main_ingredients, garden_skills, cooking_skills, observances_holidays,
      cultural_responsiveness_features,
      metadata, content_text, content_hash, content_embedding,
      original_submission_id, processing_notes, created_at, updated_at
    ) VALUES (
      v_new_lesson_id,
      COALESCE(NULLIF(v_submission.extracted_title, ''), NULLIF(v_meta->>'title', ''), 'Untitled Lesson'),
      COALESCE(v_meta->>'summary', ''),
      v_submission.google_doc_url,
      _phase4_jsonb_text_array(v_meta->'gradeLevels'),
      CASE WHEN v_meta ? 'activityType' AND COALESCE(v_meta->>'activityType', '') <> ''
           THEN ARRAY[v_meta->>'activityType']
           ELSE ARRAY[]::text[] END,
      _phase4_jsonb_text_array(v_meta->'themes'),
      _phase4_jsonb_text_array(v_meta->'season'),
      _phase4_jsonb_text_array(v_meta->'coreCompetencies'),
      _phase4_jsonb_text_array(v_meta->'culturalHeritage'),
      CASE WHEN v_meta ? 'location' AND COALESCE(v_meta->>'location', '') <> ''
           THEN ARRAY[v_meta->>'location']
           ELSE ARRAY[]::text[] END,
      -- NULLIF(v_meta->>'lessonFormat', '') removed — D3, column dropped.
      _phase4_jsonb_text_array(
        CASE jsonb_typeof(v_meta->'academicIntegration')
          WHEN 'object' THEN COALESCE(v_meta->'academicIntegration'->'selected', '[]'::jsonb)
          ELSE v_meta->'academicIntegration'
        END
      ),
      _phase4_jsonb_text_array(v_meta->'socialEmotionalLearning'),
      _phase4_jsonb_text_array(v_meta->'cookingMethods'),
      _phase4_jsonb_text_array(v_meta->'mainIngredients'),
      _phase4_jsonb_text_array(v_meta->'gardenSkills'),
      _phase4_jsonb_text_array(v_meta->'cookingSkills'),
      _phase4_jsonb_text_array(v_meta->'observancesHolidays'),
      _phase4_jsonb_text_array(v_meta->'culturalResponsivenessFeatures'),
      v_legacy_meta,
      COALESCE(v_submission.extracted_content, ''),
      v_submission.content_hash,
      v_submission.content_embedding,
      p_submission_id,
      COALESCE(v_meta->>'processingNotes', ''),
      now(),
      now()
    );

    RETURN v_new_lesson_id;

  ELSIF p_decision = 'approve_update' THEN
    SELECT * INTO v_existing
    FROM public.lessons
    WHERE lesson_id = p_selected_lesson_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Selected lesson not found: %', p_selected_lesson_id USING ERRCODE = 'P0002';
    END IF;

    -- academicConcepts carry-forward (introduced 20260510000000). Unchanged.
    IF NOT (v_legacy_meta ? 'academicConcepts')
       AND v_existing.metadata ? 'academicConcepts'
       AND jsonb_typeof(v_existing.metadata->'academicConcepts') = 'object'
       AND v_existing.metadata->'academicConcepts' <> '{}'::jsonb
    THEN
      v_legacy_meta := v_legacy_meta
        || jsonb_build_object('academicConcepts', v_existing.metadata->'academicConcepts');
    END IF;

    INSERT INTO public.lesson_versions (
      lesson_id, version_number, title, summary, file_link, grade_levels,
      metadata, content_text, archived_from_submission_id, archived_by, archive_reason
    ) VALUES (
      v_existing.lesson_id,
      COALESCE(v_existing.version_number, 1),
      COALESCE(v_existing.title, ''),
      COALESCE(v_existing.summary, ''),
      COALESCE(v_existing.file_link, ''),
      COALESCE(v_existing.grade_levels, ARRAY[]::text[]),
      v_existing.metadata,
      v_existing.content_text,
      p_submission_id,
      p_reviewer_id,
      'Content update from new submission'
    );

    UPDATE public.lessons SET
      title = COALESCE(NULLIF(v_submission.extracted_title, ''), v_existing.title),
      summary = COALESCE(NULLIF(v_meta->>'summary', ''), v_existing.summary),
      file_link = v_submission.google_doc_url,
      grade_levels = COALESCE(
        _phase4_jsonb_text_array_or_null(v_meta->'gradeLevels'),
        v_existing.grade_levels,
        ARRAY[]::text[]
      ),
      activity_type = CASE
        WHEN v_meta ? 'activityType' AND COALESCE(v_meta->>'activityType', '') <> ''
          THEN ARRAY[v_meta->>'activityType']
        ELSE COALESCE(v_existing.activity_type, ARRAY[]::text[])
      END,
      thematic_categories = COALESCE(
        _phase4_jsonb_text_array_or_null(v_meta->'themes'),
        v_existing.thematic_categories,
        ARRAY[]::text[]
      ),
      season_timing = COALESCE(
        _phase4_jsonb_text_array_or_null(v_meta->'season'),
        v_existing.season_timing,
        ARRAY[]::text[]
      ),
      core_competencies = COALESCE(
        _phase4_jsonb_text_array_or_null(v_meta->'coreCompetencies'),
        v_existing.core_competencies,
        ARRAY[]::text[]
      ),
      cultural_heritage = COALESCE(
        _phase4_jsonb_text_array_or_null(v_meta->'culturalHeritage'),
        v_existing.cultural_heritage,
        ARRAY[]::text[]
      ),
      location_requirements = CASE
        WHEN v_meta ? 'location' AND COALESCE(v_meta->>'location', '') <> ''
          THEN ARRAY[v_meta->>'location']
        ELSE COALESCE(v_existing.location_requirements, ARRAY[]::text[])
      END,
      -- lesson_format = COALESCE(...) removed — D3, column dropped.
      academic_integration = COALESCE(
        _phase4_jsonb_text_array_or_null(
          CASE jsonb_typeof(v_meta->'academicIntegration')
            WHEN 'object' THEN COALESCE(v_meta->'academicIntegration'->'selected', '[]'::jsonb)
            ELSE v_meta->'academicIntegration'
          END
        ),
        v_existing.academic_integration,
        ARRAY[]::text[]
      ),
      social_emotional_learning = COALESCE(
        _phase4_jsonb_text_array_or_null(v_meta->'socialEmotionalLearning'),
        v_existing.social_emotional_learning,
        ARRAY[]::text[]
      ),
      cooking_methods = COALESCE(
        _phase4_jsonb_text_array_or_null(v_meta->'cookingMethods'),
        v_existing.cooking_methods,
        ARRAY[]::text[]
      ),
      main_ingredients = COALESCE(
        _phase4_jsonb_text_array_or_null(v_meta->'mainIngredients'),
        v_existing.main_ingredients,
        ARRAY[]::text[]
      ),
      garden_skills = COALESCE(
        _phase4_jsonb_text_array_or_null(v_meta->'gardenSkills'),
        v_existing.garden_skills,
        ARRAY[]::text[]
      ),
      cooking_skills = COALESCE(
        _phase4_jsonb_text_array_or_null(v_meta->'cookingSkills'),
        v_existing.cooking_skills,
        ARRAY[]::text[]
      ),
      observances_holidays = COALESCE(
        _phase4_jsonb_text_array_or_null(v_meta->'observancesHolidays'),
        v_existing.observances_holidays,
        ARRAY[]::text[]
      ),
      cultural_responsiveness_features = COALESCE(
        _phase4_jsonb_text_array_or_null(v_meta->'culturalResponsivenessFeatures'),
        v_existing.cultural_responsiveness_features,
        ARRAY[]::text[]
      ),
      metadata = v_legacy_meta,
      content_text = COALESCE(v_submission.extracted_content, ''),
      content_hash = v_submission.content_hash,
      content_embedding = v_submission.content_embedding,
      version_number = COALESCE(v_existing.version_number, 1) + 1,
      has_versions = true,
      processing_notes = COALESCE(v_meta->>'processingNotes', ''),
      updated_at = now()
    WHERE lesson_id = p_selected_lesson_id;

    RETURN p_selected_lesson_id;
  END IF;

  RETURN NULL;
END;
$$;


-- =====================================================
-- (2c) DROP + CREATE get_lesson_details_for_review.
--      RETURNS TABLE shape changes (drops lesson_format TEXT), so DROP+CREATE
--      is required (CREATE OR REPLACE forbids signature changes including
--      RETURNS TABLE column removal).
-- =====================================================
DROP FUNCTION IF EXISTS public.get_lesson_details_for_review(TEXT[]);

CREATE FUNCTION public.get_lesson_details_for_review(p_lesson_ids TEXT[])
RETURNS TABLE (
  lesson_id TEXT,
  title TEXT,
  summary TEXT,
  content_length INT,
  grade_levels TEXT[],
  has_table_format BOOLEAN,
  has_summary BOOLEAN,
  file_link TEXT,
  content_preview TEXT,
  activity_type TEXT[],
  thematic_categories TEXT[],
  season_timing TEXT[],
  cultural_heritage TEXT[],
  core_competencies TEXT[],
  -- lesson_format TEXT removed — D3.
  updated_at TIMESTAMPTZ,
  teacher_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Permission check (shared helper allows service_role + postgres bypass).
  IF NOT has_duplicate_review_permission() THEN
    RAISE EXCEPTION 'Permission denied: requires admin, reviewer, or super_admin role';
  END IF;

  RETURN QUERY
  SELECT
    l.lesson_id,
    l.title,
    l.summary,
    COALESCE(LENGTH(l.content_text), 0)::INTEGER AS content_length,
    l.grade_levels,
    (l.content_text LIKE '%|%|%')::BOOLEAN AS has_table_format,
    (l.summary IS NOT NULL AND l.summary != '')::BOOLEAN AS has_summary,
    l.file_link,
    LEFT(l.content_text, 500) AS content_preview,
    l.activity_type,
    l.thematic_categories,
    l.season_timing,
    l.cultural_heritage,
    l.core_competencies,
    -- l.lesson_format removed — D3.
    l.updated_at,
    up.full_name AS teacher_name
  FROM lessons l
  LEFT JOIN lesson_submissions s ON s.id = l.original_submission_id
  LEFT JOIN user_profiles up ON up.id = s.teacher_id
  WHERE l.lesson_id = ANY(p_lesson_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_lesson_details_for_review(TEXT[]) TO authenticated;

COMMENT ON FUNCTION public.get_lesson_details_for_review IS
  'Get lesson details needed for the duplicate review UI (metadata facets + submitter + updated_at). Permission-gated via has_duplicate_review_permission(). RETURNS TABLE shape changed 20260512000000_drop_lesson_format.sql to remove lesson_format TEXT column.';


-- =====================================================
-- (3) Rewrite lessons_normalize_write trigger function — drop section (B)
--     (the lesson_format column⇄metadata sync block). Other 9 fields and
--     concepts rescue stay byte-identical to 20260509000000.
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
'Trigger function: enforces column⇄metadata sync on lessons (column wins on disagreement). Coerces academicIntegration object→array with concepts rescue to top-level academicConcepts. Logs RAISE NOTICE on every coercion. lesson_format sync block (B) removed in 20260512000000_drop_lesson_format.sql (D3 — column dropped).';


-- =====================================================
-- (4) Drop indexes
-- =====================================================
DROP INDEX IF EXISTS public.idx_lessons_format;            -- baseline:2558 (JSON-path on metadata->>'lessonFormat')
DROP INDEX IF EXISTS public.idx_lessons_lesson_format;     -- baseline:2582 (column-based on lesson_format)


-- =====================================================
-- (5) Strip JSONB key 'lessonFormat' across all rows.
--     The trigger fires per row but its lessonFormat handling has been
--     removed in step (3) above, so no rebound coercion happens.
-- =====================================================
UPDATE public.lessons
   SET metadata = metadata - 'lessonFormat'
 WHERE metadata ? 'lessonFormat';


-- =====================================================
-- (6) Drop column lessons.lesson_format.
--     All dependent surfaces (view, RPCs, trigger) have been recreated
--     in earlier stages without column references.
-- =====================================================
ALTER TABLE public.lessons DROP COLUMN IF EXISTS lesson_format;


-- =====================================================
-- (7) Verify-only no-op for legacy handle_lessons_metadata_write_trg.
--     Session 5 confirmed NOT attached on TEST DB (only
--     lessons_normalize_write_trg + update_lesson_search_vector_trigger).
--     Session 7 reconfirmed locally. If somehow attached on PROD,
--     defensively detach.
-- =====================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'handle_lessons_metadata_write_trg'
      AND NOT tgisinternal
  ) THEN
    RAISE NOTICE 'handle_lessons_metadata_write_trg unexpectedly attached. Detaching...';
    DROP TRIGGER IF EXISTS handle_lessons_metadata_write_trg ON public.lessons;
  END IF;
END $$;


-- =====================================================
-- (8) Document the lesson_archive.lesson_format historical-archive decision.
--     Per Gate A: archive table preserves historical metadata; only the
--     source side (lessons.lesson_format) is dropping. Existing archive
--     rows keep their lesson_format values; new archives inserted via
--     archive_duplicate_lesson don't populate the column (the function
--     already excluded it as of 20260209140001 cleanup).
-- =====================================================
COMMENT ON COLUMN public.lesson_archive.lesson_format IS
  'Historical archive — kept post-foundation-phase PR 1 even though source-table lessons.lesson_format was dropped 20260512000000_drop_lesson_format.sql. Per Gate A decision: archive table preserves historical metadata. New archives via archive_duplicate_lesson don''t populate this column (the cleanup at 20260209140001 already excluded it).';


-- Force PostgREST to reload its schema cache so the
-- get_lesson_details_for_review RETURNS TABLE shape change is picked up.
NOTIFY pgrst, 'reload schema';


-- =====================================================
-- ROLLBACK
-- =====================================================
-- See sibling forward-rollback file:
--   supabase/migrations/20260512000000_drop_lesson_format.sql.rollback
--
-- Rollback restores the column nullable, recreates the 2 indexes, and
-- restores the view / 3 RPCs / trigger to their pre-D3 form. The JSONB
-- 'lessonFormat' key cannot be restored without an external snapshot —
-- accepted (per impl plan §1.3 forward-rollback note).
