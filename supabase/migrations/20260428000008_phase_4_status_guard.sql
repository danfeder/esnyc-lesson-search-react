-- =====================================================
-- Migration: 20260428000008_phase_4_status_guard.sql
-- =====================================================
-- Description: Idempotency guard on complete_review_atomic. Without this,
-- if the RPC succeeds but the client never sees the response (network
-- drop, edge-function timeout that completes after the proxy gives up,
-- reviewer double-click before the first call finishes), a retry would:
--   - approve_new:    INSERT a SECOND lessons row with a fresh
--                     lesson_id (gen_random_uuid). Same submission,
--                     two visible lessons with identical content.
--   - approve_update: INSERT a SECOND lesson_versions row archiving the
--                     already-replaced state, then UPDATE the lesson
--                     with the same values (no-op).
--
-- Both are the same class of orphan/duplicate problem the Tier-1 work
-- is fixing — Phase 4 closes the partial-failure pathway but, without
-- this guard, opens a retry-creates-duplicate pathway. Identified during
-- PR #449 round-2 bot review (claude-review BLOCKING finding).
--
-- The guard rejects re-entry on terminal statuses (approved, rejected).
-- Non-terminal statuses (submitted, in_review, needs_revision) are still
-- writable so the legitimate "reviewer changes mind, flips
-- needs_revision back to approve_new" flow keeps working through the
-- UPSERT path.
--
-- ERRCODE 55000 (object_not_in_prerequisite_state) is the standard PG
-- code for "wrong state to perform this operation" and propagates
-- through PostgREST as a 500 with a useful message.

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

  -- Idempotency guard: refuse re-entry on terminal statuses. The UPSERT
  -- on submission_reviews + UPDATE on lesson_submissions are idempotent
  -- on their own, but the lessons INSERT (approve_new) and
  -- lesson_versions INSERT (approve_update) are NOT — both would create
  -- new rows on retry. The 'needs_revision' status is intentionally
  -- excluded so a reviewer flipping their mind (needs_revision →
  -- approve_new) can still progress through the UPSERT path.
  IF v_submission.status IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Submission % already completed (status: %)',
      p_submission_id, v_submission.status
      USING ERRCODE = '55000'; -- object_not_in_prerequisite_state
  END IF;

  v_legacy_meta := jsonb_build_object(
    'thematicCategories',             COALESCE(v_meta->'themes', '[]'::jsonb),
    'seasonTiming',                   COALESCE(v_meta->'season', '[]'::jsonb),
    'coreCompetencies',               COALESCE(v_meta->'coreCompetencies', '[]'::jsonb),
    'culturalHeritage',               COALESCE(v_meta->'culturalHeritage', '[]'::jsonb),
    'locationRequirements',
      CASE WHEN v_meta ? 'location' AND COALESCE(v_meta->>'location', '') <> ''
           THEN jsonb_build_array(v_meta->>'location')
           ELSE '[]'::jsonb END,
    'lessonFormat',
      CASE WHEN v_meta ? 'lessonFormat' AND COALESCE(v_meta->>'lessonFormat', '') <> ''
           THEN jsonb_build_array(v_meta->>'lessonFormat')
           ELSE '[]'::jsonb END,
    'academicIntegration',            COALESCE(v_meta->'academicIntegration', '[]'::jsonb),
    'socialEmotionalLearning',        COALESCE(v_meta->'socialEmotionalLearning', '[]'::jsonb),
    'cookingMethods',                 COALESCE(v_meta->'cookingMethods', '[]'::jsonb),
    'mainIngredients',                COALESCE(v_meta->'mainIngredients', '[]'::jsonb),
    'gardenSkills',                   COALESCE(v_meta->'gardenSkills', '[]'::jsonb),
    'cookingSkills',                  COALESCE(v_meta->'cookingSkills', '[]'::jsonb),
    'observancesHolidays',            COALESCE(v_meta->'observancesHolidays', '[]'::jsonb),
    'culturalResponsivenessFeatures', COALESCE(v_meta->'culturalResponsivenessFeatures', '[]'::jsonb)
  );

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

  IF p_decision = 'approve_new' THEN
    v_new_lesson_id := 'lesson_' || replace(gen_random_uuid()::text, '-', '');

    INSERT INTO public.lessons (
      lesson_id, title, summary, file_link,
      grade_levels, activity_type, thematic_categories, season_timing,
      core_competencies, cultural_heritage, location_requirements, lesson_format,
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
      NULLIF(v_meta->>'lessonFormat', ''),
      _phase4_jsonb_text_array(v_meta->'academicIntegration'),
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
      lesson_format = COALESCE(NULLIF(v_meta->>'lessonFormat', ''), v_existing.lesson_format),
      academic_integration = COALESCE(
        _phase4_jsonb_text_array_or_null(v_meta->'academicIntegration'),
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
