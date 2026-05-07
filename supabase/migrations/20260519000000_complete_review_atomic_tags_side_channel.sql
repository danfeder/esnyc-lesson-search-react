-- =====================================================
-- Migration: 20260519000000_complete_review_atomic_tags_side_channel.sql
-- =====================================================
-- Description: PR 2 Task 2.2c — extend complete_review_atomic with a
-- backend side-channel that writes lessons.tags directly from
-- lesson_submissions.ai_draft_metadata.tags. The reviewer does NOT see
-- or edit tags in PR 2 scope; the tags picker UI defers to Phase 2.
--
-- Renamed from 20260517000000 → 20260519000000 during the PR 2 rebase
-- (Session 38, post-PR-1b ship). Original 20260517000000 layered tags
-- side-channel onto 20260512000000_drop_lesson_format.sql's baseline
-- body. PR 1b shipped 20260518100000_complete_review_atomic_activity_type_multi.sql
-- which rebuilt complete_review_atomic with array-passthrough for
-- activity_type — overwriting any earlier body. Renaming this migration
-- to a later timestamp + re-folding both code paths (tags side-channel +
-- activity_type array passthrough) makes the final RPC body carry both
-- features.
--
-- Background: PR 1 added 4 new columns to lessons (tags, series_id,
-- part_number, crf_confirmed). None of the 4 flow through the existing
-- review-form mapper / complete_review_atomic surfaces:
--   - reviewFormPayloadSchema.ts doesn't model them
--   - lessonToReview / reviewToLesson mappers don't carry them
--   - complete_review_atomic INSERT/UPDATE doesn't write them
--
-- For 3 of the 4 (series_id / part_number / crf_confirmed) that gap is
-- intentional — manual / structural / backend-set. For tags it's a
-- real structural hole in the LLM-draft flow: PR 2 will populate
-- lesson_submissions.ai_draft_metadata.tags via Opus at submission
-- time, but with no flow path the draft would never reach lessons.tags.
--
-- Session 18 picked Option A (this side-channel) over Option B
-- (frontend tags picker added now — scope creep into Phase 2 UX) and
-- Option C (skip tags, leave the new "Lesson Type" sidebar filter
-- useless until Phase 2).
--
-- Pattern: mirrors the academicConcepts carry-forward in
-- 20260510000000_approve_update_concepts_carry_forward.sql.
--   - approve_new INSERT: tags =
--       _phase4_jsonb_text_array_or_null(v_ai_draft->'tags').
--       lessons.tags is nullable text[] (baseline 20251001) with no
--       default, and the valid_tags CHECK accepts NULL — so a missing
--       AI draft cleanly inserts NULL.
--   - approve_update UPDATE: carry-forward — preserve existing
--       non-empty tags (reviewer or earlier flow already populated),
--       else take LLM draft, else fall through existing-value (possibly
--       NULL → empty array).
--
-- Source baselines being merged:
--   * 20260518100000_complete_review_atomic_activity_type_multi.sql
--     (PR 1b — activity_type array passthrough; full body, copied here)
--   * tags side-channel changes from the prior PR 2 commit (originally
--     20260517000000_*; renamed here, body re-folded)
--
-- Function signature is UNCHANGED; CREATE OR REPLACE preserves grants.
-- No DROP needed.
--
-- Out of scope for this migration:
--   - lessons.metadata.tags JSONB key. The column is the canonical
--     store post-PR-1; metadata.tags is legacy and is already cleared
--     on every approve_update (the v_legacy_meta builder excludes it).
--   - Any flow for series_id / part_number / crf_confirmed. The same
--     structural pattern would extend to those columns if ever
--     LLM-drafted, but none are in PR 2 scope.
--
-- See:
--   - docs/plans/2026-05-03-metadata-rebuild-foundation-execution-status.md (Session 38 rebase)
--   - docs/plans/2026-05-03-metadata-rebuild-foundation-execution-status-archive.md §Sessions 18-21
--   - docs/plans/2026-05-03-metadata-rebuild-foundation-implementation.md §Task 2.2c
-- =====================================================


-- =====================================================
-- CHANGES
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
  v_ai_draft        jsonb;  -- tags side-channel source from lesson_submissions.ai_draft_metadata
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

  -- Pluck ai_draft_metadata for the tags side-channel.
  -- Tolerates NULL — submissions without an AI draft (today's cohort) keep
  -- working. Helper _phase4_jsonb_text_array_or_null accepts NULL inputs
  -- and returns NULL, which is a valid value for the nullable lessons.tags.
  v_ai_draft := v_submission.ai_draft_metadata;

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
      tags,                                        -- tags side-channel (this migration)
      metadata, content_text, content_hash, content_embedding,
      original_submission_id, processing_notes, created_at, updated_at
    ) VALUES (
      v_new_lesson_id,
      COALESCE(NULLIF(v_submission.extracted_title, ''), NULLIF(v_meta->>'title', ''), 'Untitled Lesson'),
      COALESCE(v_meta->>'summary', ''),
      v_submission.google_doc_url,
      _phase4_jsonb_text_array(v_meta->'gradeLevels'),
      -- activity_type: array passthrough (PR 1b D2.1 step 2). A JSON array
      -- `["cooking","garden"]` unwraps to {cooking,garden} via the helper;
      -- a scalar `"cooking"` still wraps to {cooking} via the helper's
      -- scalar branch.
      _phase4_jsonb_text_array(v_meta->'activityType'),
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
      _phase4_jsonb_text_array_or_null(v_ai_draft->'tags'),  -- tags side-channel (this migration)
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
      -- activity_type: array passthrough via or_null helper + COALESCE chain
      -- (PR 1b D2.1 step 2). Absent / null / [] keys fall through to
      -- v_existing.activity_type.
      activity_type = COALESCE(
        _phase4_jsonb_text_array_or_null(v_meta->'activityType'),
        v_existing.activity_type,
        ARRAY[]::text[]
      ),
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
      -- tags carry-forward from LLM draft (this migration).
      -- Preserve existing non-empty tags (reviewer / earlier flow already
      -- populated); else take the LLM draft from ai_draft_metadata; else
      -- fall through to v_existing.tags (NULL preserved — matches the INSERT
      -- path on line 263, which uses _phase4_jsonb_text_array_or_null and
      -- returns NULL when v_ai_draft.tags is absent). The valid_tags CHECK
      -- accepts NULL (see 20260515000000_metadata_value_validation.sql).
      -- Mirrors academicConcepts carry-forward but operates on the column
      -- directly (not metadata blob) since tags is canonical-on-column
      -- post-PR-1.
      tags = COALESCE(
        NULLIF(v_existing.tags, ARRAY[]::text[]),
        _phase4_jsonb_text_array_or_null(v_ai_draft->'tags'),
        v_existing.tags
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

NOTIFY pgrst, 'reload schema';

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- To revert: re-apply the complete_review_atomic body from
-- 20260518100000_complete_review_atomic_activity_type_multi.sql verbatim
-- (which carries the activity_type array passthrough but no tags
-- side-channel). CREATE OR REPLACE preserves grants; no GRANT
-- statements are needed in the rollback. Function signature is
-- unchanged, so no DROP needed.
--
-- Side effect of revert: any tags written to lessons.tags via this
-- side-channel before revert remain in place (the migration only
-- changes the writer, not at-rest data). Future approve_new
-- submissions after revert would not populate tags from the LLM
-- draft, leaving the column NULL/empty for new lessons.
