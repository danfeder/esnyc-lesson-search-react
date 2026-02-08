-- =====================================================
-- Migration: 20260208140001_cleanup_archive_function.sql
-- =====================================================
-- Description: Remove dead duplicate_pairs reference from archive_duplicate_lesson.
--   The function conditionally deletes from duplicate_pairs (with IF EXISTS check),
--   but the table doesn't exist in production. Remove the dead code to reduce confusion.

-- =====================================================
-- CHANGES
-- =====================================================

-- Re-create the function without the duplicate_pairs cleanup step
CREATE OR REPLACE FUNCTION archive_duplicate_lesson(
  p_lesson_id TEXT,
  p_canonical_id TEXT
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_lesson RECORD;
  v_result JSONB;
  v_archive_id UUID;
BEGIN
  -- Verify the caller has admin/reviewer permissions
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'reviewer', 'super_admin')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient permissions: requires admin or reviewer role'
    );
  END IF;

  -- Verify the lesson exists
  SELECT * INTO v_lesson FROM lessons WHERE lesson_id = p_lesson_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Lesson not found: %s', p_lesson_id)
    );
  END IF;

  -- Verify the canonical lesson exists (if specified)
  IF p_canonical_id IS NOT NULL AND p_canonical_id != '' THEN
    IF NOT EXISTS (SELECT 1 FROM lessons WHERE lesson_id = p_canonical_id) THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', format('Canonical lesson not found: %s', p_canonical_id)
      );
    END IF;
  END IF;

  -- STEP 1: Archive the lesson data (preserve before deletion)
  INSERT INTO lesson_archive (
    lesson_id,
    title,
    summary,
    file_link,
    grade_levels,
    metadata,
    confidence,
    content_text,
    last_modified,
    processing_notes,
    canonical_lesson_id,
    archived_by,
    archive_reason
  ) VALUES (
    v_lesson.lesson_id,
    v_lesson.title,
    v_lesson.summary,
    v_lesson.file_link,
    v_lesson.grade_levels,
    v_lesson.metadata,
    v_lesson.confidence,
    v_lesson.content_text,
    v_lesson.last_modified,
    v_lesson.processing_notes,
    p_canonical_id,
    auth.uid(),
    'duplicate_resolution'
  )
  RETURNING id INTO v_archive_id;

  -- STEP 2: Clean up duplicate_resolutions (has FK to lessons)
  DELETE FROM duplicate_resolutions
  WHERE duplicate_id = p_lesson_id OR canonical_id = p_lesson_id;

  -- STEP 3: Delete the lesson (LAST - only after all cleanup succeeds)
  DELETE FROM lessons WHERE lesson_id = p_lesson_id;

  v_result := jsonb_build_object(
    'success', true,
    'archived_lesson_id', p_lesson_id,
    'canonical_lesson_id', p_canonical_id,
    'archive_id', v_archive_id
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and return failure
    RAISE WARNING 'archive_duplicate_lesson failed: % %', SQLERRM, SQLSTATE;
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Archive failed: %s (state: %s)', SQLERRM, SQLSTATE),
      'lesson_id', p_lesson_id
    );
END;
$$;

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- To restore the previous version with duplicate_pairs cleanup,
-- see migration 20251208_fix_archive_delete_order.sql
