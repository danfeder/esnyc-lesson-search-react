-- =====================================================
-- Migration: 20251205_add_archive_duplicate_lesson_function.sql
-- =====================================================
-- Description: Add simple archive_duplicate_lesson function for Phase 3.
-- This replaces the complex resolve_duplicate_group function with a
-- focused, single-purpose function.
--
-- Phase 3 of deduplication revamp: simplified resolution backend.

-- =====================================================
-- NEW FUNCTION: archive_duplicate_lesson
-- =====================================================
-- Simple function to archive a single lesson as a duplicate of another.
-- Does NOT write to duplicate_resolutions table (lesson_archive is sufficient).

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

  -- Insert into lesson_archive with all fields
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
    array_to_string(v_lesson_record.activity_type, ',') -- array → text cast
  );

  -- Delete from lessons table
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
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$;

COMMENT ON FUNCTION archive_duplicate_lesson IS
'Archives a single lesson as a duplicate of another. Part of Phase 3 deduplication revamp.';

-- =====================================================
-- DROP OLD FUNCTION: resolve_duplicate_group
-- =====================================================
-- The old function is replaced by archive_duplicate_lesson.
-- Dismissals ("Keep All") are handled separately via duplicate_group_dismissals table.

DROP FUNCTION IF EXISTS resolve_duplicate_group(
  TEXT, TEXT, TEXT[], TEXT, NUMERIC, BOOLEAN, TEXT, TEXT, TEXT, TEXT, JSONB
);

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- DROP FUNCTION IF EXISTS archive_duplicate_lesson(TEXT, TEXT);
-- Then restore resolve_duplicate_group from git history if needed.
