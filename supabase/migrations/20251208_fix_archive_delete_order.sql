-- =====================================================
-- Migration: 20251208_fix_archive_delete_order.sql
-- =====================================================
-- Description: Fix DELETE operation order in archive_duplicate_lesson
--
-- Code review feedback: DELETE from lessons should be LAST to prevent
-- data loss if subsequent operations fail.
--
-- New order (safest):
-- 1. INSERT into lesson_archive
-- 2. DELETE from duplicate_resolutions (FK cleanup)
-- 3. DELETE from duplicate_pairs (housekeeping)
-- 4. DELETE from lessons (LAST - only after all cleanup succeeds)
--
-- Note: All operations are atomic due to the EXCEPTION handler which
-- rolls back on any failure.

CREATE OR REPLACE FUNCTION archive_duplicate_lesson(
  p_lesson_id TEXT,
  p_canonical_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_lesson_record record;
  v_archive_id uuid;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();

  -- Verify user has permission (admin, reviewer, or super_admin)
  IF NOT has_duplicate_review_permission() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Permission denied: requires admin, reviewer, or super_admin role'
    );
  END IF;

  -- Verify lesson to archive exists
  SELECT * INTO v_lesson_record FROM lessons WHERE lesson_id = p_lesson_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Lesson not found: ' || p_lesson_id
    );
  END IF;

  -- Verify canonical lesson exists
  IF NOT EXISTS (SELECT 1 FROM lessons WHERE lesson_id = p_canonical_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Canonical lesson not found: ' || p_canonical_id
    );
  END IF;

  -- Prevent archiving a lesson to itself
  IF p_lesson_id = p_canonical_id THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot archive a lesson as a duplicate of itself'
    );
  END IF;

  -- Generate a new UUID for the archive record
  v_archive_id := gen_random_uuid();

  -- STEP 1: Insert into lesson_archive (preserve the data first)
  INSERT INTO lesson_archive (
    id,
    lesson_id,
    title,
    summary,
    file_link,
    grade_levels,
    metadata,
    confidence,
    search_vector,
    content_text,
    content_embedding,
    content_hash,
    last_modified,
    created_at,
    updated_at,
    thematic_categories,
    cultural_heritage,
    observances_holidays,
    location_requirements,
    season_timing,
    academic_integration,
    social_emotional_learning,
    cooking_methods,
    main_ingredients,
    cultural_responsiveness_features,
    garden_skills,
    cooking_skills,
    core_competencies,
    lesson_format,
    processing_notes,
    review_notes,
    flagged_for_review,
    tags,
    archived_at,
    archived_by,
    archive_reason,
    canonical_id,
    version_number,
    has_versions,
    original_submission_id,
    activity_type
  ) VALUES (
    v_archive_id,
    v_lesson_record.lesson_id,
    v_lesson_record.title,
    COALESCE(v_lesson_record.summary, ''),
    COALESCE(v_lesson_record.file_link, ''),
    COALESCE(v_lesson_record.grade_levels, ARRAY[]::text[]),
    COALESCE(v_lesson_record.metadata, '{}'::jsonb),
    COALESCE(v_lesson_record.confidence, '{}'::jsonb),
    v_lesson_record.search_vector,
    v_lesson_record.content_text,
    v_lesson_record.content_embedding,
    v_lesson_record.content_hash,
    v_lesson_record.last_modified,
    COALESCE(v_lesson_record.created_at, now()),
    v_lesson_record.updated_at,
    v_lesson_record.thematic_categories,
    v_lesson_record.cultural_heritage,
    v_lesson_record.observances_holidays,
    v_lesson_record.location_requirements,
    v_lesson_record.season_timing,
    v_lesson_record.academic_integration,
    v_lesson_record.social_emotional_learning,
    v_lesson_record.cooking_methods,
    v_lesson_record.main_ingredients,
    v_lesson_record.cultural_responsiveness_features,
    v_lesson_record.garden_skills,
    v_lesson_record.cooking_skills,
    v_lesson_record.core_competencies,
    v_lesson_record.lesson_format,
    v_lesson_record.processing_notes,
    v_lesson_record.review_notes,
    v_lesson_record.flagged_for_review,
    v_lesson_record.tags,
    now(),                                              -- archived_at
    v_user_id,                                          -- archived_by
    'Archived as duplicate of ' || p_canonical_id,     -- archive_reason
    p_canonical_id,                                     -- canonical_id
    v_lesson_record.version_number,
    v_lesson_record.has_versions,
    v_lesson_record.original_submission_id,
    COALESCE(array_to_string(v_lesson_record.activity_type, ','), '') -- array to text with NULL handling
  );

  -- STEP 2: Clean up duplicate_resolutions FK references
  -- This table has FK constraint: canonical_lesson_id -> lessons.lesson_id
  -- Must be cleaned BEFORE deleting from lessons to avoid FK violation
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'duplicate_resolutions') THEN
    DELETE FROM duplicate_resolutions
    WHERE canonical_lesson_id = p_lesson_id;
  END IF;

  -- STEP 3: Clean up duplicate_pairs references
  -- No FK constraint, but clean before lessons delete for safety
  -- Table may not exist in all environments
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'duplicate_pairs') THEN
    DELETE FROM duplicate_pairs
    WHERE id1 = p_lesson_id OR id2 = p_lesson_id;
  END IF;

  -- STEP 4: Delete from lessons table LAST
  -- Only after archive is saved and all cleanup is complete
  DELETE FROM lessons WHERE lesson_id = p_lesson_id;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'archived_lesson_id', p_lesson_id,
    'canonical_id', p_canonical_id,
    'archive_id', v_archive_id
  );

EXCEPTION
  WHEN OTHERS THEN
    -- All operations are atomic - any failure rolls back everything
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- Restore function from 20251207_fix_archive_fk_constraints.sql
