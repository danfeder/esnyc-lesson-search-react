-- =====================================================
-- Migration: 20260510000000_approve_update_concepts_carry_forward.sql
-- =====================================================
-- Description: Carry forward an existing lesson's
-- metadata.academicConcepts when a reviewer's approve_update doesn't
-- supply one. PR-2 M1 (20260506000000) introduced concepts rescue at
-- write time and PR-2 M2 (20260507000000) backfilled ~690 PROD rows
-- with rich per-subject concepts content. The deployed approve_update
-- branch replaces the entire metadata blob with v_legacy_meta (built
-- only from p_metadata), so any approve_update whose form input lacks
-- academicConcepts (today's reality — no concepts editor in the
-- reviewer UI) silently wipes the row's existing concepts.
--
-- Surfaced by claude-review round-2 on PR #472 (filter-drift PR-2):
--   F1 Informational, recommendation "Approve with note to track."
--   PR-2 *creates* the surface — pre-PR-2 there was no academicConcepts
--   key; post-PR-2 ~690 rows have populated concepts that can now be
--   lost on update. Recoverable from lesson_versions archive but the
--   live row UI loses the data.
--
-- Fix: in the approve_update branch, after SELECT * INTO v_existing,
-- carry forward v_existing.metadata->'academicConcepts' onto
-- v_legacy_meta when:
--   1. v_legacy_meta does not already have an academicConcepts key
--      (so caller-supplied input always wins), AND
--   2. v_existing.metadata has a non-empty object-shape
--      academicConcepts key (matches the "key present iff data
--      present" semantic from M1/M2/M4).
--
-- This is the targeted "Option A" from the MEMORY.md follow-up entry
-- ("carry forward v_existing.metadata->'academicConcepts' in
-- complete_review_atomic approve_update branch when caller doesn't
-- supply it"). Option B (have complete-review edge function always
-- include existing academicConcepts in input) was not chosen — the
-- DB-layer fix is simpler, doesn't require an edge function deploy,
-- and protects against any future caller of approve_update that
-- doesn't include the key (MCP scripts, manual SQL, etc.).
--
-- Side note: this migration only carries forward academicConcepts.
-- Other top-level metadata keys NOT derived from p_metadata
-- (theoretically any future addition not modeled in v_legacy_meta)
-- would have the same vulnerability. There are no such keys today; if
-- new ones are added, this carry-forward block would need extending.
--
-- Function signature is UNCHANGED — CREATE OR REPLACE preserves grants.
-- No DROP needed.
--
-- See:
--   - 20260506000000_filter_drift_pr2_m1_writer_fix.sql (the body this
--     supersedes; only the approve_update branch is modified — the
--     v_legacy_meta builder + approve_new branch are byte-identical)
--   - PR #472 round-2 issuecomment-4349240876 (claude-review F1)
--   - MEMORY.md "Open hygiene follow-ups" academicConcepts entry

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

  -- Idempotency guard (preserved from 20260428000008): refuse re-entry
  -- on terminal statuses.
  IF v_submission.status IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Submission % already completed (status: %)',
      p_submission_id, v_submission.status
      USING ERRCODE = '55000'; -- object_not_in_prerequisite_state
  END IF;

  -- Build the canonical-shape metadata blob.
  --
  -- TWO SHAPE FIXES vs prior (20260428000008):
  --   * lessonFormat: now to_jsonb(scalar text) → JSON STRING (was
  --     jsonb_build_array(text) → single-element ARRAY).
  --   * academicIntegration: now typeof-aware CASE → flat array (was
  --     pass-through COALESCE of whatever shape the caller sent).
  --
  -- Other keys are unchanged from 20260428000008's builder.
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
           THEN to_jsonb(v_meta->>'lessonFormat')              -- BUG-A FIX: scalar, not array
           ELSE 'null'::jsonb END,
    'academicIntegration',
      CASE jsonb_typeof(v_meta->'academicIntegration')          -- BUG-B FIX (mirror): flat array
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

  -- academicConcepts rescue (key present iff data present).
  --
  -- Object-shape AI form: `{selected: [...], concepts: {Subject: [...]}}`
  -- — the concepts object carries per-subject content the basic
  -- unwrap would discard. 690 PROD rows have non-empty concepts; we
  -- preserve them as a top-level metadata sibling. PR-2 M2 backfill
  -- moves the at-rest cohort to the same top-level key with the same
  -- empty-{} skip rule, so writer + backfill produce identical shape.
  IF jsonb_typeof(v_meta->'academicIntegration') = 'object'
     AND jsonb_typeof(v_meta->'academicIntegration'->'concepts') = 'object'
     AND v_meta->'academicIntegration'->'concepts' <> '{}'::jsonb
  THEN
    v_legacy_meta := v_legacy_meta
      || jsonb_build_object('academicConcepts', v_meta->'academicIntegration'->'concepts');
  END IF;

  -- Forward-compat: caller passed academicConcepts as a sibling key
  -- directly (post-PR-2 form). Overrides the rescue if both are
  -- present.
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
      _phase4_jsonb_text_array(                                   -- BUG-B FIX: typeof-aware unwrap
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

    -- ===== NEW (this migration): academicConcepts carry-forward =====
    --
    -- The metadata = v_legacy_meta assignment below replaces the entire
    -- existing row's metadata blob. v_legacy_meta is built from
    -- p_metadata only — so any top-level key not derived from
    -- p_metadata (today, only academicConcepts) gets dropped on update.
    --
    -- Carry forward the existing row's academicConcepts iff:
    --   1. v_legacy_meta does not already have an academicConcepts key
    --      (the rescue + forward-compat blocks above already
    --      populated it from p_metadata, so caller input wins), AND
    --   2. v_existing.metadata has a non-empty object-shape
    --      academicConcepts key (matches the "key present iff data
    --      present" semantic from M1 rescue + M2 backfill + M4
    --      trigger).
    --
    -- This protects ~690 PROD rows that PR-2 backfilled with rich
    -- per-subject concepts. Without this block, a reviewer approving
    -- ANY edit (e.g., a typo fix in the title) silently wipes
    -- concepts because today's reviewer UI doesn't expose a concepts
    -- editor and so doesn't echo the field back in p_metadata.
    --
    -- If a future reviewer UI adds explicit concepts management with
    -- a "clear concepts" affordance, that UI should send
    -- academicConcepts: {} (empty object) in p_metadata. The current
    -- M1 forward-compat block treats empty-{} as "no concepts" and
    -- skips the rescue. Combined with this carry-forward's check
    -- "v_legacy_meta does not already have the key" — empty-{} from
    -- the input does not produce a key in v_legacy_meta, so this
    -- block would still carry forward. To support clearing concepts,
    -- the future UI would need to send a non-empty sentinel or this
    -- block would need a sentinel-aware variant. Out of scope today
    -- since no reviewer UI can clear concepts.
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
      lesson_format = COALESCE(NULLIF(v_meta->>'lessonFormat', ''), v_existing.lesson_format),
      academic_integration = COALESCE(
        _phase4_jsonb_text_array_or_null(                         -- BUG-B FIX: typeof-aware unwrap
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
-- ROLLBACK (keep as comments)
-- =====================================================
-- To revert: re-apply the complete_review_atomic body from
-- 20260506000000_filter_drift_pr2_m1_writer_fix.sql verbatim. CREATE
-- OR REPLACE preserves grants, so no GRANT statements are needed in
-- the rollback. The function signature is unchanged, so no DROP
-- needed either.
--
-- Side effect of revert: every approve_update that doesn't restate
-- academicConcepts in its input resumes silently wiping the existing
-- row's concepts. Affected rows are recoverable from the
-- lesson_versions archive (the version row created earlier in the
-- approve_update branch preserves the pre-update metadata snapshot)
-- but the live row's metadata loses the data and requires manual
-- restoration.
