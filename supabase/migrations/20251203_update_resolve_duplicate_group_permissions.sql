-- =====================================================
-- Migration: 20251203_update_resolve_duplicate_group_permissions.sql
-- =====================================================
-- Description: Update resolve_duplicate_group to use shared permission helper
-- This allows service_role and postgres superuser access for MCP tools.
-- The previous version only checked user_profiles directly.

CREATE OR REPLACE FUNCTION resolve_duplicate_group(
  p_group_id TEXT,
  p_canonical_id TEXT,
  p_duplicate_ids TEXT[],
  p_duplicate_type TEXT DEFAULT 'near',
  p_similarity_score NUMERIC DEFAULT 0.85,
  p_merge_metadata BOOLEAN DEFAULT false,
  p_resolution_notes TEXT DEFAULT NULL,
  p_resolution_mode TEXT DEFAULT 'single',
  p_sub_group_name TEXT DEFAULT NULL,
  p_parent_group_id TEXT DEFAULT NULL,
  p_title_updates JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_resolution_id uuid;
  v_archived_count integer := 0;
  v_lesson_count integer;
  v_action_taken text;
  v_lesson_record record;
  v_archive_id uuid;
  v_title_update_key text;
  v_new_title text;
  v_old_title text;
  v_updated_titles jsonb := '[]'::jsonb;
  v_title_update_record jsonb;
BEGIN
  -- Get the current user
  v_user_id := auth.uid();

  -- Verify user has permission (using shared helper for consistency)
  -- This allows service_role and postgres superuser access for MCP tools
  IF NOT has_duplicate_review_permission() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Permission denied: requires admin, reviewer, or super_admin role'
    );
  END IF;

  -- Validate canonical lesson exists
  IF NOT EXISTS (SELECT 1 FROM lessons WHERE lesson_id = p_canonical_id) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Canonical lesson not found: ' || p_canonical_id
    );
  END IF;

  -- Validate all duplicate lessons exist
  IF p_duplicate_ids IS NOT NULL THEN
    FOR i IN 1..array_length(p_duplicate_ids, 1) LOOP
      IF NOT EXISTS (SELECT 1 FROM lessons WHERE lesson_id = p_duplicate_ids[i]) THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Duplicate lesson not found: ' || p_duplicate_ids[i]
        );
      END IF;
    END LOOP;
  END IF;

  -- Apply title updates if provided
  IF p_title_updates IS NOT NULL THEN
    FOR v_title_update_key IN SELECT jsonb_object_keys(p_title_updates)
    LOOP
      v_new_title := p_title_updates ->> v_title_update_key;

      -- Validate title is not empty and within reasonable length
      IF v_new_title IS NULL OR length(trim(v_new_title)) = 0 THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Invalid title for lesson ' || v_title_update_key || ': Title cannot be empty'
        );
      END IF;

      IF length(v_new_title) > 500 THEN
        RETURN jsonb_build_object(
          'success', false,
          'error', 'Invalid title for lesson ' || v_title_update_key || ': Title exceeds 500 characters'
        );
      END IF;

      -- Get the old title first
      SELECT title INTO v_old_title
      FROM lessons
      WHERE lesson_id = v_title_update_key;

      -- Update the title in the lessons table
      UPDATE lessons
      SET
        title = v_new_title,
        updated_at = now(),
        processing_notes = COALESCE(processing_notes, '') ||
          E'\n[' || now()::text || '] Title updated during duplicate resolution by user ' || v_user_id::text ||
          '. Original title: "' || COALESCE(v_old_title, 'unknown') || '"'
      WHERE lesson_id = v_title_update_key;

      -- Track the title update
      v_title_update_record := jsonb_build_object(
        'lesson_id', v_title_update_key,
        'old_title', v_old_title,
        'new_title', v_new_title
      );
      v_updated_titles := v_updated_titles || v_title_update_record;
    END LOOP;
  END IF;

  -- Calculate lessons in group
  v_lesson_count := 1;
  IF p_duplicate_ids IS NOT NULL THEN
    v_lesson_count := v_lesson_count + array_length(p_duplicate_ids, 1);
  END IF;

  -- Determine action taken
  v_action_taken := CASE
    WHEN p_resolution_mode = 'keep_all' THEN 'keep_all'
    WHEN p_resolution_mode = 'split' THEN 'split_group'
    WHEN p_merge_metadata THEN 'merge_and_archive'
    ELSE 'archive_only'
  END;

  -- Create resolution record with title updates tracked
  INSERT INTO duplicate_resolutions (
    group_id,
    canonical_lesson_id,
    duplicate_type,
    similarity_score,
    lessons_in_group,
    action_taken,
    notes,
    resolved_by,
    resolution_mode,
    sub_group_name,
    parent_group_id,
    metadata_merged
  ) VALUES (
    p_group_id,
    p_canonical_id,
    p_duplicate_type,
    p_similarity_score::double precision,
    v_lesson_count,
    v_action_taken,
    COALESCE(p_resolution_notes, '') ||
      CASE
        WHEN jsonb_array_length(v_updated_titles) > 0
        THEN E'\nTitle updates: ' || v_updated_titles::text
        ELSE ''
      END,
    v_user_id,
    COALESCE(p_resolution_mode, 'single'),
    p_sub_group_name,
    p_parent_group_id,
    NULL
  )
  RETURNING id INTO v_resolution_id;

  -- Process duplicates if not keeping all
  IF p_resolution_mode != 'keep_all' AND p_duplicate_ids IS NOT NULL AND array_length(p_duplicate_ids, 1) > 0 THEN

    -- Handle metadata merging
    IF p_merge_metadata THEN
      -- Merge array fields from all duplicates into canonical
      WITH merged_arrays AS (
        SELECT
          array_agg(DISTINCT elem) FILTER (WHERE elem IS NOT NULL) as merged
        FROM (
          SELECT unnest(grade_levels) as elem FROM lessons WHERE lesson_id = p_canonical_id
          UNION
          SELECT unnest(grade_levels) FROM lessons WHERE lesson_id = ANY(p_duplicate_ids)
        ) t
      )
      UPDATE lessons
      SET grade_levels = COALESCE((SELECT merged FROM merged_arrays), ARRAY[]::text[])
      WHERE lesson_id = p_canonical_id;

      -- Repeat for thematic_categories
      WITH merged_arrays AS (
        SELECT
          array_agg(DISTINCT elem) FILTER (WHERE elem IS NOT NULL) as merged
        FROM (
          SELECT unnest(thematic_categories) as elem FROM lessons WHERE lesson_id = p_canonical_id
          UNION
          SELECT unnest(thematic_categories) FROM lessons WHERE lesson_id = ANY(p_duplicate_ids)
        ) t
      )
      UPDATE lessons
      SET thematic_categories = COALESCE((SELECT merged FROM merged_arrays), ARRAY[]::text[])
      WHERE lesson_id = p_canonical_id;
    END IF;

    -- Archive each duplicate lesson
    FOR v_lesson_record IN
      SELECT * FROM lessons WHERE lesson_id = ANY(p_duplicate_ids)
    LOOP
      -- Generate a new UUID for the archive record
      v_archive_id := gen_random_uuid();

      -- Insert into lesson_archive with ALL required fields
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
        now(),
        v_user_id,
        'Duplicate resolution: ' || p_duplicate_type || ' duplicate of ' || p_canonical_id ||
          ' (group: ' || p_group_id || ')',
        p_canonical_id,
        v_lesson_record.activity_type
      );

      v_archived_count := v_archived_count + 1;
    END LOOP;

    -- Delete the duplicate lessons from main table
    DELETE FROM lessons WHERE lesson_id = ANY(p_duplicate_ids);
  END IF;

  -- Return success with details
  RETURN jsonb_build_object(
    'success', true,
    'resolution_id', v_resolution_id,
    'archived_count', v_archived_count,
    'canonical_id', p_canonical_id,
    'action_taken', v_action_taken,
    'title_updates', v_updated_titles
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

COMMENT ON FUNCTION resolve_duplicate_group IS
'Resolves a group of duplicate lessons. Uses shared permission helper for service_role/postgres access.';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
-- The function already has GRANT from the baseline, but re-grant to be explicit
GRANT EXECUTE ON FUNCTION resolve_duplicate_group(TEXT, TEXT, TEXT[], TEXT, NUMERIC, BOOLEAN, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- =====================================================
-- ROLLBACK
-- =====================================================
-- To rollback, restore original function from 20251001_production_baseline_snapshot.sql
