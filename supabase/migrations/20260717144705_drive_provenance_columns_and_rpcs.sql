-- =====================================================
-- Migration: 20260717144705_drive_provenance_columns_and_rpcs.sql
-- =====================================================
-- Description: Google Drive provenance — dates + approved creator attribution.
-- Feature: trustworthy Drive provenance on the public lesson detail drawer
-- ("Created by …" / "Adapted by …", "Created …" / "Added to Drive …",
-- "Last updated …") and a Drive-true "Sort: Updated".
--
-- WHAT CHANGES
--   1. Nine additive, nullable drive_* columns on ALL THREE of
--      lesson_submissions, lessons, lesson_versions (file id, MIME, Drive
--      created/modified timestamps, metadata sync time, and the 4-field
--      creator tuple name/attribution/source/verified_at).
--   2. CHECK constraints on each table enforcing: attribution ∈
--      (created|adapted); source ∈ (drive_activity|reviewer_confirmed); the
--      creator tuple is all-null or all-non-null; a creator is only allowed on
--      the native Google Docs MIME; a stored name is trimmed, ≤120 chars, and
--      contains neither '@' nor an obvious URL. All columns start NULL on
--      every existing row, so the constraints validate trivially at add time.
--      DELIBERATELY NO drive_modified_at >= drive_created_at check — imported
--      files legitimately violate it (Drive "created" = uploaded-to-Drive,
--      while modification history can predate the upload).
--   3. Two partial indexes on active lessons: (a) drive_file_id (NON-unique —
--      7 active lesson rows legitimately share a file id today) for
--      backfill/refresh lookups; (b) drive_modified_at DESC for the new
--      "Sort: Updated" order.
--   4. complete_review_atomic — CREATE OR REPLACE, SIX-ARG SIGNATURE
--      UNCHANGED (grants preserved). Body is the 20260702000000 definition
--      verbatim plus ONLY the provenance additions:
--        * validates the reviewer's creator confirmation carried inside
--          p_metadata (driveCreatorAttribution: created|adapted|omit,
--          driveCreatorName). The SERVER derives drive_creator_source =
--          'reviewer_confirmed' and drive_creator_verified_at = now(); the
--          client can never set them. Invalid/absent/'omit' → all-null
--          creator columns (on approve_update too — safety over preserving a
--          stale attribution when the file link changes).
--        * a creator is accepted ONLY when the locked submission's
--          drive_mime_type is the native Google Docs MIME.
--        * approve_new copies the submission's drive file/date/MIME/sync
--          fields into the new lesson; approve_update REPLACES the lesson's
--          copies with the new locked submission's (consistent with file_link,
--          which is already replaced unconditionally).
--        * the lesson_versions snapshot archives all nine provenance columns
--          BEFORE approve_update overwrites the lesson.
--        * on approve_* the validated creator tuple is also persisted to the
--          submission row. needs_revision / reject never write creator data
--          to a lesson (no lesson write happens on those paths at all).
--   5. search_lessons — DROP + CREATE (same SIXTEEN-ARG signature; the RETURN
--      TABLE gains six public provenance columns, and a return-type change
--      forces DROP/CREATE — CREATE OR REPLACE cannot alter OUT columns).
--      Body is the 20260704000000 definition verbatim plus ONLY the six new
--      result columns: drive_mime_type, drive_created_at, drive_modified_at,
--      drive_creator_name, drive_creator_attribution, drive_creator_source
--      (drive_file_id and the sync/verified timestamps are deliberately NOT
--      exposed). The 'modified' sort DELIBERATELY stays on the application
--      updated_at in this PR-A migration — switching it to drive_modified_at
--      before the supervised backfill populates the column would sort an
--      all-NULL column (title order). PR-B's 20260717174811 migration makes
--      the switch after the backfill (rollout doc 2026-07-17). Grants
--      re-issued for the recreated signature; PostgREST notified.
--
-- ATOMICITY: the Supabase CLI applies migration statements in AUTOCOMMIT (no
-- per-file transaction wrapper), so the whole file runs inside ONE explicit
-- BEGIN/COMMIT — the search_lessons DROP→CREATE stays gap-free and a failure
-- anywhere rolls the entire migration back.
--
-- DATA SAFETY: additive columns + constraint/index creation + function
-- redefinitions only. No row data is read-modified-written; no rows mutated.
-- =====================================================

BEGIN;

-- =====================================================
-- 1. Additive drive_* columns (all nullable; all rows start NULL)
-- =====================================================

ALTER TABLE public.lesson_submissions
  ADD COLUMN IF NOT EXISTS drive_file_id             text,
  ADD COLUMN IF NOT EXISTS drive_mime_type           text,
  ADD COLUMN IF NOT EXISTS drive_created_at          timestamptz,
  ADD COLUMN IF NOT EXISTS drive_modified_at         timestamptz,
  ADD COLUMN IF NOT EXISTS drive_metadata_synced_at  timestamptz,
  ADD COLUMN IF NOT EXISTS drive_creator_name        text,
  ADD COLUMN IF NOT EXISTS drive_creator_attribution text,
  ADD COLUMN IF NOT EXISTS drive_creator_source      text,
  ADD COLUMN IF NOT EXISTS drive_creator_verified_at timestamptz;

ALTER TABLE public.lessons
  ADD COLUMN IF NOT EXISTS drive_file_id             text,
  ADD COLUMN IF NOT EXISTS drive_mime_type           text,
  ADD COLUMN IF NOT EXISTS drive_created_at          timestamptz,
  ADD COLUMN IF NOT EXISTS drive_modified_at         timestamptz,
  ADD COLUMN IF NOT EXISTS drive_metadata_synced_at  timestamptz,
  ADD COLUMN IF NOT EXISTS drive_creator_name        text,
  ADD COLUMN IF NOT EXISTS drive_creator_attribution text,
  ADD COLUMN IF NOT EXISTS drive_creator_source      text,
  ADD COLUMN IF NOT EXISTS drive_creator_verified_at timestamptz;

ALTER TABLE public.lesson_versions
  ADD COLUMN IF NOT EXISTS drive_file_id             text,
  ADD COLUMN IF NOT EXISTS drive_mime_type           text,
  ADD COLUMN IF NOT EXISTS drive_created_at          timestamptz,
  ADD COLUMN IF NOT EXISTS drive_modified_at         timestamptz,
  ADD COLUMN IF NOT EXISTS drive_metadata_synced_at  timestamptz,
  ADD COLUMN IF NOT EXISTS drive_creator_name        text,
  ADD COLUMN IF NOT EXISTS drive_creator_attribution text,
  ADD COLUMN IF NOT EXISTS drive_creator_source      text,
  ADD COLUMN IF NOT EXISTS drive_creator_verified_at timestamptz;

-- =====================================================
-- 2. CHECK constraints (identical set on all three tables).
--    DROP IF EXISTS + ADD keeps re-runs safe; every existing row has NULL in
--    all new columns, so each constraint validates trivially.
-- =====================================================

-- lesson_submissions
ALTER TABLE public.lesson_submissions
  DROP CONSTRAINT IF EXISTS lesson_submissions_drive_creator_attribution_valid,
  DROP CONSTRAINT IF EXISTS lesson_submissions_drive_creator_source_valid,
  DROP CONSTRAINT IF EXISTS lesson_submissions_drive_creator_tuple_all_or_none,
  DROP CONSTRAINT IF EXISTS lesson_submissions_drive_creator_native_doc_only,
  DROP CONSTRAINT IF EXISTS lesson_submissions_drive_creator_name_safe;
ALTER TABLE public.lesson_submissions
  ADD CONSTRAINT lesson_submissions_drive_creator_attribution_valid
    CHECK (drive_creator_attribution IS NULL
           OR drive_creator_attribution IN ('created', 'adapted')),
  ADD CONSTRAINT lesson_submissions_drive_creator_source_valid
    CHECK (drive_creator_source IS NULL
           OR drive_creator_source IN ('drive_activity', 'reviewer_confirmed')),
  ADD CONSTRAINT lesson_submissions_drive_creator_tuple_all_or_none
    CHECK (
      (drive_creator_name IS NULL AND drive_creator_attribution IS NULL
        AND drive_creator_source IS NULL AND drive_creator_verified_at IS NULL)
      OR
      (drive_creator_name IS NOT NULL AND drive_creator_attribution IS NOT NULL
        AND drive_creator_source IS NOT NULL AND drive_creator_verified_at IS NOT NULL)
    ),
  ADD CONSTRAINT lesson_submissions_drive_creator_native_doc_only
    CHECK (drive_creator_name IS NULL
           OR drive_mime_type = 'application/vnd.google-apps.document'),
  ADD CONSTRAINT lesson_submissions_drive_creator_name_safe
    CHECK (drive_creator_name IS NULL OR (
      drive_creator_name = btrim(drive_creator_name)
      -- btrim only strips ASCII spaces; also reject names padded with OTHER
      -- whitespace (tab/newline/…) so SQL parity with the app validator's
      -- trim()-based rule holds and a stored name always renders.
      AND drive_creator_name !~ '^[[:space:]]'
      AND drive_creator_name !~ '[[:space:]]$'
      -- no embedded control characters (newline/tab/C0/DEL) — one-line names
      AND drive_creator_name !~ '[[:cntrl:]]'
      AND length(drive_creator_name) BETWEEN 1 AND 120
      AND position('@' in drive_creator_name) = 0
      AND drive_creator_name !~* 'https?://'
      AND drive_creator_name !~* '(^|[[:space:]])www\.'
    ));

-- lessons
ALTER TABLE public.lessons
  DROP CONSTRAINT IF EXISTS lessons_drive_creator_attribution_valid,
  DROP CONSTRAINT IF EXISTS lessons_drive_creator_source_valid,
  DROP CONSTRAINT IF EXISTS lessons_drive_creator_tuple_all_or_none,
  DROP CONSTRAINT IF EXISTS lessons_drive_creator_native_doc_only,
  DROP CONSTRAINT IF EXISTS lessons_drive_creator_name_safe;
ALTER TABLE public.lessons
  ADD CONSTRAINT lessons_drive_creator_attribution_valid
    CHECK (drive_creator_attribution IS NULL
           OR drive_creator_attribution IN ('created', 'adapted')),
  ADD CONSTRAINT lessons_drive_creator_source_valid
    CHECK (drive_creator_source IS NULL
           OR drive_creator_source IN ('drive_activity', 'reviewer_confirmed')),
  ADD CONSTRAINT lessons_drive_creator_tuple_all_or_none
    CHECK (
      (drive_creator_name IS NULL AND drive_creator_attribution IS NULL
        AND drive_creator_source IS NULL AND drive_creator_verified_at IS NULL)
      OR
      (drive_creator_name IS NOT NULL AND drive_creator_attribution IS NOT NULL
        AND drive_creator_source IS NOT NULL AND drive_creator_verified_at IS NOT NULL)
    ),
  ADD CONSTRAINT lessons_drive_creator_native_doc_only
    CHECK (drive_creator_name IS NULL
           OR drive_mime_type = 'application/vnd.google-apps.document'),
  ADD CONSTRAINT lessons_drive_creator_name_safe
    CHECK (drive_creator_name IS NULL OR (
      drive_creator_name = btrim(drive_creator_name)
      -- btrim only strips ASCII spaces; also reject names padded with OTHER
      -- whitespace (tab/newline/…) so SQL parity with the app validator's
      -- trim()-based rule holds and a stored name always renders.
      AND drive_creator_name !~ '^[[:space:]]'
      AND drive_creator_name !~ '[[:space:]]$'
      -- no embedded control characters (newline/tab/C0/DEL) — one-line names
      AND drive_creator_name !~ '[[:cntrl:]]'
      AND length(drive_creator_name) BETWEEN 1 AND 120
      AND position('@' in drive_creator_name) = 0
      AND drive_creator_name !~* 'https?://'
      AND drive_creator_name !~* '(^|[[:space:]])www\.'
    ));

-- lesson_versions (archives only ever receive already-validated snapshots,
-- but the same constraints keep any future writer honest)
ALTER TABLE public.lesson_versions
  DROP CONSTRAINT IF EXISTS lesson_versions_drive_creator_attribution_valid,
  DROP CONSTRAINT IF EXISTS lesson_versions_drive_creator_source_valid,
  DROP CONSTRAINT IF EXISTS lesson_versions_drive_creator_tuple_all_or_none,
  DROP CONSTRAINT IF EXISTS lesson_versions_drive_creator_native_doc_only,
  DROP CONSTRAINT IF EXISTS lesson_versions_drive_creator_name_safe;
ALTER TABLE public.lesson_versions
  ADD CONSTRAINT lesson_versions_drive_creator_attribution_valid
    CHECK (drive_creator_attribution IS NULL
           OR drive_creator_attribution IN ('created', 'adapted')),
  ADD CONSTRAINT lesson_versions_drive_creator_source_valid
    CHECK (drive_creator_source IS NULL
           OR drive_creator_source IN ('drive_activity', 'reviewer_confirmed')),
  ADD CONSTRAINT lesson_versions_drive_creator_tuple_all_or_none
    CHECK (
      (drive_creator_name IS NULL AND drive_creator_attribution IS NULL
        AND drive_creator_source IS NULL AND drive_creator_verified_at IS NULL)
      OR
      (drive_creator_name IS NOT NULL AND drive_creator_attribution IS NOT NULL
        AND drive_creator_source IS NOT NULL AND drive_creator_verified_at IS NOT NULL)
    ),
  ADD CONSTRAINT lesson_versions_drive_creator_native_doc_only
    CHECK (drive_creator_name IS NULL
           OR drive_mime_type = 'application/vnd.google-apps.document'),
  ADD CONSTRAINT lesson_versions_drive_creator_name_safe
    CHECK (drive_creator_name IS NULL OR (
      drive_creator_name = btrim(drive_creator_name)
      -- btrim only strips ASCII spaces; also reject names padded with OTHER
      -- whitespace (tab/newline/…) so SQL parity with the app validator's
      -- trim()-based rule holds and a stored name always renders.
      AND drive_creator_name !~ '^[[:space:]]'
      AND drive_creator_name !~ '[[:space:]]$'
      -- no embedded control characters (newline/tab/C0/DEL) — one-line names
      AND drive_creator_name !~ '[[:cntrl:]]'
      AND length(drive_creator_name) BETWEEN 1 AND 120
      AND position('@' in drive_creator_name) = 0
      AND drive_creator_name !~* 'https?://'
      AND drive_creator_name !~* '(^|[[:space:]])www\.'
    ));

-- =====================================================
-- 3. Partial indexes on active lessons
-- =====================================================

-- NON-unique by requirement: 7 active lesson rows currently share a Drive
-- file id, and that is legitimate (companion lessons in one doc).
CREATE INDEX IF NOT EXISTS idx_lessons_drive_file_id_active
  ON public.lessons (drive_file_id)
  WHERE retired_at IS NULL AND drive_file_id IS NOT NULL;

-- Supports the new "Sort: Updated" (drive_modified_at DESC NULLS LAST) over
-- the active corpus.
CREATE INDEX IF NOT EXISTS idx_lessons_drive_modified_at_active
  ON public.lessons (drive_modified_at DESC)
  WHERE retired_at IS NULL;

-- =====================================================
-- 4. complete_review_atomic — provenance propagation.
--    Six-arg signature UNCHANGED; CREATE OR REPLACE preserves grants.
--    Body = 20260702000000 verbatim + ONLY the provenance additions
--    (each marked "Drive provenance").
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
  -- Drive provenance: the reviewer-confirmed creator (validated below).
  v_creator_attr    text;
  v_creator_name    text;
  v_creator_valid   boolean := false;
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

  -- Drive provenance: validate the reviewer's creator confirmation, carried
  -- inside p_metadata as driveCreatorAttribution ('created'|'adapted'|'omit')
  -- + driveCreatorName. The tuple is accepted ONLY when the attribution is a
  -- publishable value, the (trimmed) name passes the public-name safety rules
  -- mirrored from the app/edge validators, and the LOCKED submission's file is
  -- a native Google Doc. Anything else — explicit 'omit', absent keys, an
  -- unsafe name, a non-native file — produces the all-null creator tuple.
  -- drive_creator_source / drive_creator_verified_at are SERVER-derived below;
  -- a client-supplied source/verified value is never read.
  v_creator_attr := NULLIF(v_meta->>'driveCreatorAttribution', '');
  v_creator_name := NULLIF(btrim(COALESCE(v_meta->>'driveCreatorName', '')), '');
  IF v_creator_attr IN ('created', 'adapted')
     AND v_creator_name IS NOT NULL
     -- btrim above only strips ASCII spaces; a name still padded with other
     -- whitespace (tab/newline/…) is rejected, matching the app validator.
     AND v_creator_name !~ '^[[:space:]]'
     AND v_creator_name !~ '[[:space:]]$'
     AND v_creator_name !~ '[[:cntrl:]]'
     AND length(v_creator_name) <= 120
     AND position('@' in v_creator_name) = 0
     AND v_creator_name !~* 'https?://'
     AND v_creator_name !~* '(^|[[:space:]])www\.'
     AND v_submission.drive_mime_type = 'application/vnd.google-apps.document'
  THEN
    v_creator_valid := true;
  ELSE
    v_creator_valid := false;
    v_creator_attr  := NULL;
    v_creator_name  := NULL;
  END IF;

  -- Build the canonical-shape metadata blob.
  --
  -- ONE SHAPE FIX vs prior (20260428000008, retained from 20260510000000):
  --   * academicIntegration: typeof-aware CASE → flat array.
  -- (lessonFormat shape fix removed — D3, key dropped from output.)
  -- (The driveCreator* keys are review-form-only inputs — deliberately NOT
  --  copied into the lesson metadata blob; they land in dedicated columns.)
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

  -- 2b. Drive provenance: persist the reviewer-confirmed creator tuple to the
  -- submission on the two PUBLISH decisions only. The tuple is all-null when
  -- the confirmation was absent/'omit'/invalid, deliberately overwriting any
  -- previous round's values. needs_revision / reject leave the submission's
  -- creator columns untouched (the reviewer's in-progress choice lives in
  -- submission_reviews.tagged_metadata for restore).
  IF p_decision IN ('approve_new', 'approve_update') THEN
    UPDATE public.lesson_submissions SET
      drive_creator_name        = v_creator_name,
      drive_creator_attribution = v_creator_attr,
      drive_creator_source      = CASE WHEN v_creator_valid THEN 'reviewer_confirmed' END,
      drive_creator_verified_at = CASE WHEN v_creator_valid THEN now() END
    WHERE id = p_submission_id;
  END IF;

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
      tags,                                        -- tags side-channel (20260519000000)
      -- Drive provenance: file/date/MIME/sync from the locked submission +
      -- the validated reviewer-confirmed creator tuple.
      drive_file_id, drive_mime_type, drive_created_at, drive_modified_at,
      drive_metadata_synced_at,
      drive_creator_name, drive_creator_attribution, drive_creator_source,
      drive_creator_verified_at,
      metadata, content_text, content_hash, content_embedding,
      original_submission_id, processing_notes, created_at, updated_at
    ) VALUES (
      v_new_lesson_id,
      -- Title precedence FLIPPED (T2b): reviewer-edited title wins over the raw
      -- extracted filename. (was: extracted_title → v_meta.title → placeholder)
      COALESCE(NULLIF(v_meta->>'title', ''), NULLIF(v_submission.extracted_title, ''), 'Untitled Lesson'),
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
      _phase4_jsonb_text_array_or_null(v_ai_draft->'tags'),  -- tags side-channel (20260519000000)
      -- Drive provenance values (see column list above).
      v_submission.drive_file_id,
      v_submission.drive_mime_type,
      v_submission.drive_created_at,
      v_submission.drive_modified_at,
      v_submission.drive_metadata_synced_at,
      v_creator_name,
      v_creator_attr,
      CASE WHEN v_creator_valid THEN 'reviewer_confirmed' END,
      CASE WHEN v_creator_valid THEN now() END,
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
      metadata, content_text, archived_from_submission_id, archived_by, archive_reason,
      -- Drive provenance: snapshot all nine columns BEFORE the lesson is
      -- overwritten below, so the pre-update provenance is recoverable.
      drive_file_id, drive_mime_type, drive_created_at, drive_modified_at,
      drive_metadata_synced_at,
      drive_creator_name, drive_creator_attribution, drive_creator_source,
      drive_creator_verified_at
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
      'Content update from new submission',
      v_existing.drive_file_id,
      v_existing.drive_mime_type,
      v_existing.drive_created_at,
      v_existing.drive_modified_at,
      v_existing.drive_metadata_synced_at,
      v_existing.drive_creator_name,
      v_existing.drive_creator_attribution,
      v_existing.drive_creator_source,
      v_existing.drive_creator_verified_at
    );

    UPDATE public.lessons SET
      -- Title precedence FLIPPED (T2b): reviewer-edited title wins over the raw
      -- extracted filename; falls back to the existing lesson's title (NOT a
      -- placeholder — never clobber an existing title on the merge path).
      title = COALESCE(NULLIF(v_meta->>'title', ''), NULLIF(v_submission.extracted_title, ''), v_existing.title),
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
      -- tags carry-forward from LLM draft (20260519000000).
      -- Preserve existing non-empty tags (reviewer / earlier flow already
      -- populated); else take the LLM draft from ai_draft_metadata; else
      -- fall through to v_existing.tags (NULL preserved — matches the INSERT
      -- path, which uses _phase4_jsonb_text_array_or_null and returns NULL when
      -- v_ai_draft.tags is absent). The valid_tags CHECK accepts NULL.
      tags = COALESCE(
        NULLIF(v_existing.tags, ARRAY[]::text[]),
        _phase4_jsonb_text_array_or_null(v_ai_draft->'tags'),
        v_existing.tags
      ),
      -- Drive provenance: the lesson now points at the NEW locked submission's
      -- doc (file_link above is already replaced unconditionally), so its Drive
      -- file/date/MIME/sync fields are REPLACED with the submission's — never
      -- mixed with the previous file's. The creator tuple is the freshly
      -- validated reviewer confirmation, or all-null when absent/'omit'/invalid
      -- (safety over preserving a stale attribution across a file change; the
      -- prior tuple survives in the lesson_versions snapshot above).
      drive_file_id             = v_submission.drive_file_id,
      drive_mime_type           = v_submission.drive_mime_type,
      drive_created_at          = v_submission.drive_created_at,
      drive_modified_at         = v_submission.drive_modified_at,
      drive_metadata_synced_at  = v_submission.drive_metadata_synced_at,
      drive_creator_name        = v_creator_name,
      drive_creator_attribution = v_creator_attr,
      drive_creator_source      = CASE WHEN v_creator_valid THEN 'reviewer_confirmed' END,
      drive_creator_verified_at = CASE WHEN v_creator_valid THEN now() END,
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
-- 5. search_lessons — six public provenance result columns; the 'modified'
--    sort DELIBERATELY stays on updated_at (PR-B's 20260717174811 swaps it
--    after the backfill). Signature (16 args) UNCHANGED; the RETURN TABLE
--    change forces DROP + CREATE inside this transaction (gap-free).
--    Body = 20260704000000 verbatim + ONLY the provenance additions
--    (each marked "Drive provenance").
-- =====================================================

DROP FUNCTION IF EXISTS public.search_lessons(
  text, text[], text[], text[], text[], text[], text[], text[],
  text[], text[], text[], text[], text[], integer, integer, text
);

CREATE FUNCTION public.search_lessons(
  search_query            text    DEFAULT NULL,
  filter_grade_levels     text[]  DEFAULT NULL,
  filter_themes           text[]  DEFAULT NULL,
  filter_seasons          text[]  DEFAULT NULL,
  filter_competencies     text[]  DEFAULT NULL,
  filter_cultures         text[]  DEFAULT NULL,
  filter_location         text[]  DEFAULT NULL,
  filter_activity_type    text[]  DEFAULT NULL,
  filter_main_ingredients text[]  DEFAULT NULL,   -- Brief 5: direct-match ingredient filter (group OR specific)
  filter_academic         text[]  DEFAULT NULL,
  filter_sel              text[]  DEFAULT NULL,
  filter_cooking_method   text[]  DEFAULT NULL,
  filter_tags             text[]  DEFAULT NULL,
  page_size               integer DEFAULT 20,
  page_offset             integer DEFAULT 0,
  order_by                text    DEFAULT 'relevance'   -- C58: relevance | title | modified
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
  total_count  bigint,
  -- Drive provenance (public subset ONLY — drive_file_id and the sync/verified
  -- timestamps are deliberately not returned).
  drive_mime_type           text,
  drive_created_at          timestamptz,
  drive_modified_at         timestamptz,
  drive_creator_name        text,
  drive_creator_attribution text,
  drive_creator_source      text
)
LANGUAGE plpgsql
AS $$
DECLARE
  expanded_tsquery  tsquery;        -- C41: was `expanded_query text` (now a real tsquery)
  expanded_cultures text[];
  total_results     bigint;
  cnt_and           bigint;         -- C41 PR D: strict-AND result count for the relax decision
  K_relax constant int := 10;       -- C41 PR D: relax threshold (eval-tuned on TEST; cnt_and includes the trigram cushion)
  -- C58: normalize the sort key. The DEFAULT only covers an OMITTED arg; an
  -- explicit NULL / 'grade' / 'confidence' / unknown all collapse to relevance.
  sort_key text := CASE WHEN order_by IN ('title', 'modified') THEN order_by ELSE 'relevance' END;
BEGIN
  -- Synonym expansion for FTS (C41: now returns a tsquery, or NULL/empty)
  IF search_query IS NOT NULL AND search_query <> '' THEN
    expanded_tsquery := expand_search_with_synonyms(search_query);
  ELSE
    expanded_tsquery := NULL;
  END IF;

  -- Cultural heritage: alias FIRST, then expand to children.
  IF filter_cultures IS NOT NULL AND array_length(filter_cultures, 1) > 0 THEN
    expanded_cultures := expand_cultural_heritage(_alias_cultural_heritage(filter_cultures));
  ELSE
    expanded_cultures := NULL;
  END IF;

  -- C41 PR D: two-pass relax ("safety net"). Strict AND-of-ORs (mig 20260629000000)
  -- can leave a near-empty result set when not every term co-occurs (the eval recall
  -- cliff, e.g. "teamwork and cooperation" -> 0). Count the strict-AND result set WITH
  -- the user active filters; if it is below K_relax, swap expanded_tsquery to the
  -- loose-OR companion for the rest of the function (total count + page + rank).
  -- Per-query all-AND OR all-OR, never a mix, so total_count and pagination stay
  -- consistent. Deliberate recall-over-precision for otherwise-near-empty queries. At
  -- THIS point expanded_tsquery is still the strict-AND tsquery, so cnt_and measures the
  -- strict-AND set; any reassignment happens after. The WHERE below is IDENTICAL to the
  -- total-count and page WHERE clauses (same expanded_tsquery / expanded_cultures /
  -- filter args).
  IF search_query IS NOT NULL AND search_query <> '' AND expanded_tsquery IS NOT NULL THEN
    SELECT COUNT(*) INTO cnt_and
    FROM lessons l
    WHERE
      (search_query IS NULL OR search_query = '' OR (
        -- C41/GATE-A F2: guard the FTS branch for the empty/NULL tsquery (a non-empty
        -- all-stop-word query resolves to NULL/empty and must not error to_tsquery).
        (expanded_tsquery IS NOT NULL AND numnode(expanded_tsquery) > 0
           AND l.search_vector @@ expanded_tsquery) OR
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
      -- location-Both (was: l.location_requirements && filter_location)
      AND (filter_location IS NULL OR array_length(filter_location, 1) IS NULL OR
           public._match_location(l.location_requirements, filter_location))
      AND (filter_activity_type IS NULL OR array_length(filter_activity_type, 1) IS NULL OR
           l.activity_type && _alias_activity_type(filter_activity_type))
      -- Brief 5: plain direct-match ingredient filter (group OR specific matched verbatim;
      -- no expansion — the specific's parent group rides along by the enforced invariant).
      AND (filter_main_ingredients IS NULL OR array_length(filter_main_ingredients, 1) IS NULL OR
           l.main_ingredients && filter_main_ingredients)
      -- (filter_lesson_format WHERE clause removed — D3 lessonFormat field dropped.)
      AND (filter_academic IS NULL OR array_length(filter_academic, 1) IS NULL OR
           l.academic_integration && filter_academic)
      AND (filter_sel IS NULL OR array_length(filter_sel, 1) IS NULL OR
           l.social_emotional_learning && filter_sel)
      AND (filter_cooking_method IS NULL OR array_length(filter_cooking_method, 1) IS NULL OR
           _match_cooking_methods(l.cooking_methods, filter_cooking_method))
      AND (filter_tags IS NULL OR array_length(filter_tags, 1) IS NULL OR
           l.tags && filter_tags)
      -- exclude soft-retired imports (PR 4)
      AND l.retired_at IS NULL;

    IF cnt_and < K_relax THEN
      expanded_tsquery := expand_search_with_synonyms_or(search_query);
    END IF;
  END IF;

  -- Total count (count and result queries share WHERE)
  SELECT COUNT(*) INTO total_results
  FROM lessons l
  WHERE
    (search_query IS NULL OR search_query = '' OR (
      -- C41/GATE-A F2: guard the FTS branch for the empty/NULL tsquery (a non-empty
      -- all-stop-word query resolves to NULL/empty and must not error to_tsquery).
      (expanded_tsquery IS NOT NULL AND numnode(expanded_tsquery) > 0
         AND l.search_vector @@ expanded_tsquery) OR
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
    -- location-Both (was: l.location_requirements && filter_location)
    AND (filter_location IS NULL OR array_length(filter_location, 1) IS NULL OR
         public._match_location(l.location_requirements, filter_location))
    AND (filter_activity_type IS NULL OR array_length(filter_activity_type, 1) IS NULL OR
         l.activity_type && _alias_activity_type(filter_activity_type))
    -- Brief 5: plain direct-match ingredient filter (group OR specific).
    AND (filter_main_ingredients IS NULL OR array_length(filter_main_ingredients, 1) IS NULL OR
         l.main_ingredients && filter_main_ingredients)
    -- (filter_lesson_format WHERE clause removed — D3 lessonFormat field dropped.)
    AND (filter_academic IS NULL OR array_length(filter_academic, 1) IS NULL OR
         l.academic_integration && filter_academic)
    AND (filter_sel IS NULL OR array_length(filter_sel, 1) IS NULL OR
         l.social_emotional_learning && filter_sel)
    AND (filter_cooking_method IS NULL OR array_length(filter_cooking_method, 1) IS NULL OR
         _match_cooking_methods(l.cooking_methods, filter_cooking_method))
    AND (filter_tags IS NULL OR array_length(filter_tags, 1) IS NULL OR
         l.tags && filter_tags)
    -- exclude soft-retired imports (PR 4)
    AND l.retired_at IS NULL;

  -- Paginated result rows.
  -- C58: the conditional ORDER BY references the `rank` value, but Postgres
  -- cannot resolve the output alias inside a CASE expression. So the filtered/
  -- ranked SELECT is wrapped in subquery `sub`, and the outer query selects
  -- only the RETURNS columns and orders on sub.* . LIMIT/OFFSET stay on the
  -- OUTER query. (`l.updated_at` stays exposed inside `sub` for the 'modified'
  -- sort until PR-B/20260717174811 switches that sort to drive_modified_at
  -- after the backfill populates it. Drive provenance.)
  RETURN QUERY
  SELECT
    sub.lesson_id,
    sub.title,
    sub.summary,
    sub.file_link,
    sub.grade_levels,
    sub.metadata,
    sub.confidence,
    sub.rank,
    sub.total_count,
    sub.drive_mime_type,
    sub.drive_created_at,
    sub.drive_modified_at,
    sub.drive_creator_name,
    sub.drive_creator_attribution,
    sub.drive_creator_source
  FROM (
    SELECT
      l.lesson_id,
      l.title,
      l.summary,
      l.file_link,
      l.grade_levels,
      -- Per-field COALESCE metadata reconstruction. Same as 20260520020000.
      COALESCE(l.metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
        'thematicCategories',      CASE WHEN COALESCE(array_length(l.thematic_categories, 1), 0) > 0       THEN to_jsonb(l.thematic_categories)       END,
        'seasonTiming',            CASE WHEN COALESCE(array_length(l.season_timing, 1), 0) > 0             THEN to_jsonb(l.season_timing)             END,
        'locationRequirements',    CASE WHEN COALESCE(array_length(l.location_requirements, 1), 0) > 0     THEN to_jsonb(l.location_requirements)     END,
        'coreCompetencies',        CASE WHEN COALESCE(array_length(l.core_competencies, 1), 0) > 0         THEN to_jsonb(l.core_competencies)         END,
        'culturalHeritage',        CASE WHEN COALESCE(array_length(l.cultural_heritage, 1), 0) > 0         THEN to_jsonb(l.cultural_heritage)         END,
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
            -- C41: ts_rank consumes the tsquery directly; COALESCE keeps ts_rank(vector,
            -- NULL) → 0 safe for the empty-tsquery case (GATE-B — do NOT drop it).
            COALESCE(ts_rank(l.search_vector, expanded_tsquery), 0),
            COALESCE(similarity(l.title,   search_query), 0),
            COALESCE(similarity(l.summary, search_query), 0) * 0.8
          )::double precision
        ELSE 0::double precision
      END AS rank,
      total_results AS total_count,
      l.updated_at AS updated_at,       -- exposed for ORDER BY only; not in RETURNS (PR-B retires this)
      -- Drive provenance (public subset).
      l.drive_mime_type,
      l.drive_created_at,
      l.drive_modified_at,
      l.drive_creator_name,
      l.drive_creator_attribution,
      l.drive_creator_source
    FROM lessons l
    WHERE
      (search_query IS NULL OR search_query = '' OR (
        (expanded_tsquery IS NOT NULL AND numnode(expanded_tsquery) > 0
           AND l.search_vector @@ expanded_tsquery) OR
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
      -- location-Both (was: l.location_requirements && filter_location)
      AND (filter_location IS NULL OR array_length(filter_location, 1) IS NULL OR
           public._match_location(l.location_requirements, filter_location))
      AND (filter_activity_type IS NULL OR array_length(filter_activity_type, 1) IS NULL OR
           l.activity_type && _alias_activity_type(filter_activity_type))
      -- Brief 5: plain direct-match ingredient filter (group OR specific).
      AND (filter_main_ingredients IS NULL OR array_length(filter_main_ingredients, 1) IS NULL OR
           l.main_ingredients && filter_main_ingredients)
      -- (filter_lesson_format WHERE clause removed — D3.)
      AND (filter_academic IS NULL OR array_length(filter_academic, 1) IS NULL OR
           l.academic_integration && filter_academic)
      AND (filter_sel IS NULL OR array_length(filter_sel, 1) IS NULL OR
           l.social_emotional_learning && filter_sel)
      AND (filter_cooking_method IS NULL OR array_length(filter_cooking_method, 1) IS NULL OR
           _match_cooking_methods(l.cooking_methods, filter_cooking_method))
      AND (filter_tags IS NULL OR array_length(filter_tags, 1) IS NULL OR
           l.tags && filter_tags)
      -- exclude soft-retired imports (PR 4)
      AND l.retired_at IS NULL
  ) sub
  ORDER BY
    CASE WHEN sort_key = 'relevance' THEN sub.rank END DESC NULLS LAST,
    CASE WHEN sort_key = 'relevance' THEN COALESCE((sub.confidence->>'overall')::float, 0) END DESC NULLS LAST,
    CASE WHEN sort_key = 'title'     THEN sub.title END ASC NULLS LAST,
    -- PR-A keeps the pre-provenance 'modified' sort (application updated_at).
    -- PR-B (20260717174811, post-backfill) switches it to drive_modified_at —
    -- switching before the corpus is backfilled would sort an all-NULL column.
    CASE WHEN sort_key = 'modified'  THEN sub.updated_at END DESC NULLS LAST,
    sub.title ASC,
    sub.lesson_id ASC
  LIMIT page_size
  OFFSET page_offset;
END;
$$;

-- Re-issue GRANT for the recreated 16-arg signature (1×text + 12×text[] + 2×integer + 1×text).
GRANT EXECUTE ON FUNCTION public.search_lessons(text, text[], text[], text[], text[], text[], text[], text[], text[], text[], text[], text[], text[], integer, integer, text) TO anon, authenticated, service_role;

-- Reload PostgREST's schema cache so the redefined functions are picked up immediately.
NOTIFY pgrst, 'reload schema';

COMMIT;

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- Run inside BEGIN/COMMIT to stay gap-free:
--   BEGIN;
--   -- 1. Restore the 9-column search_lessons: DROP the 16-arg function and
--   --    re-CREATE the body verbatim from
--   --    20260704000000_search_lessons_add_main_ingredients.sql (9-col RETURNS,
--   --    updated_at modified sort), then re-GRANT the 16-arg signature and
--   --    NOTIFY pgrst.
--   -- 2. Restore complete_review_atomic verbatim from
--   --    20260702000000_complete_review_atomic_reviewer_title.sql
--   --    (CREATE OR REPLACE; signature unchanged, grants preserved).
--   -- 3. DROP INDEX IF EXISTS idx_lessons_drive_file_id_active;
--   --    DROP INDEX IF EXISTS idx_lessons_drive_modified_at_active;
--   -- 4. For each of lesson_submissions / lessons / lesson_versions:
--   --    ALTER TABLE ... DROP CONSTRAINT IF EXISTS <table>_drive_creator_attribution_valid,
--   --      DROP CONSTRAINT IF EXISTS <table>_drive_creator_source_valid,
--   --      DROP CONSTRAINT IF EXISTS <table>_drive_creator_tuple_all_or_none,
--   --      DROP CONSTRAINT IF EXISTS <table>_drive_creator_native_doc_only,
--   --      DROP CONSTRAINT IF EXISTS <table>_drive_creator_name_safe;
--   --    ALTER TABLE ... DROP COLUMN IF EXISTS drive_file_id, ... (all nine drive_* columns);
--   COMMIT;
-- Side effect of revert: any provenance data written after this migration is
-- lost with the dropped columns.
-- =====================================================
