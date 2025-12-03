-- =====================================================
-- Migration: 20251202_add_function_permission_checks.sql
-- =====================================================
-- Description: Add role-based permission checks to duplicate detection functions
-- These functions use SECURITY DEFINER, so we add explicit role checks
-- to prevent unauthorized access.

-- =====================================================
-- HELPER: Check if user has admin/reviewer role
-- =====================================================
-- Reusable function to check permissions without causing recursion

CREATE OR REPLACE FUNCTION has_duplicate_review_permission()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  jwt_role TEXT;
BEGIN
  -- Get JWT role claim (returns null if not set)
  jwt_role := current_setting('request.jwt.claim.role', true);

  -- Allow service role (used by MCP tools and backend processes)
  IF jwt_role = 'service_role' THEN
    RETURN TRUE;
  END IF;

  -- Allow postgres superuser (used by local MCP and admin tools)
  IF current_user = 'postgres' THEN
    RETURN TRUE;
  END IF;

  -- Check for authenticated user with appropriate role
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'reviewer')
  );
END;
$$;

COMMENT ON FUNCTION has_duplicate_review_permission IS
'Check if current user has permission to access duplicate review functions';

-- =====================================================
-- UPDATE: find_duplicate_pairs with permission check
-- =====================================================

CREATE OR REPLACE FUNCTION find_duplicate_pairs()
RETURNS TABLE (
  id1 TEXT,
  id2 TEXT,
  title1 TEXT,
  title2 TEXT,
  detection_method TEXT,
  similarity DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Permission check
  IF NOT has_duplicate_review_permission() THEN
    RAISE EXCEPTION 'Permission denied: requires admin, reviewer, or super_admin role';
  END IF;

  RETURN QUERY
  WITH pairs AS (
    SELECT
      LEAST(l1.lesson_id, l2.lesson_id) as pair_id1,
      GREATEST(l1.lesson_id, l2.lesson_id) as pair_id2,
      CASE
        WHEN l1.lesson_id < l2.lesson_id THEN l1.title
        ELSE l2.title
      END as pair_title1,
      CASE
        WHEN l1.lesson_id < l2.lesson_id THEN l2.title
        ELSE l1.title
      END as pair_title2,
      CASE
        WHEN LOWER(TRIM(l1.title)) = LOWER(TRIM(l2.title))
             AND l1.content_embedding IS NOT NULL
             AND l2.content_embedding IS NOT NULL
             AND 1 - (l1.content_embedding <=> l2.content_embedding) >= 0.95
        THEN 'both'
        WHEN LOWER(TRIM(l1.title)) = LOWER(TRIM(l2.title))
        THEN 'same_title'
        ELSE 'embedding'
      END as pair_detection_method,
      CASE
        WHEN l1.content_embedding IS NOT NULL AND l2.content_embedding IS NOT NULL
        THEN 1 - (l1.content_embedding <=> l2.content_embedding)
        ELSE NULL
      END as pair_similarity
    FROM lessons l1
    CROSS JOIN lessons l2
    WHERE l1.lesson_id < l2.lesson_id
      AND l1.title != 'Unknown'
      AND l2.title != 'Unknown'
      AND (
        -- Same normalized title
        LOWER(TRIM(l1.title)) = LOWER(TRIM(l2.title))
        OR (
          -- High embedding similarity (>= 0.95)
          l1.content_embedding IS NOT NULL
          AND l2.content_embedding IS NOT NULL
          AND 1 - (l1.content_embedding <=> l2.content_embedding) >= 0.95
        )
      )
  )
  SELECT
    p.pair_id1 as id1,
    p.pair_id2 as id2,
    p.pair_title1 as title1,
    p.pair_title2 as title2,
    p.pair_detection_method as detection_method,
    p.pair_similarity as similarity
  FROM pairs p
  ORDER BY
    CASE p.pair_detection_method
      WHEN 'both' THEN 1
      WHEN 'same_title' THEN 2
      WHEN 'embedding' THEN 3
    END,
    p.pair_similarity DESC NULLS LAST;
END;
$$;

-- =====================================================
-- UPDATE: get_lesson_details_for_review with permission check
-- =====================================================

CREATE OR REPLACE FUNCTION get_lesson_details_for_review(p_lesson_ids TEXT[])
RETURNS TABLE (
  lesson_id TEXT,
  title TEXT,
  summary TEXT,
  content_length INTEGER,
  grade_levels TEXT[],
  has_table_format BOOLEAN,
  has_summary BOOLEAN,
  file_link TEXT,
  content_preview TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Permission check
  IF NOT has_duplicate_review_permission() THEN
    RAISE EXCEPTION 'Permission denied: requires admin, reviewer, or super_admin role';
  END IF;

  RETURN QUERY
  SELECT
    l.lesson_id,
    l.title,
    l.summary,
    COALESCE(LENGTH(l.content_text), 0)::INTEGER as content_length,
    l.grade_levels,
    (l.content_text LIKE '%|%|%')::BOOLEAN as has_table_format,
    (l.summary IS NOT NULL AND l.summary != '')::BOOLEAN as has_summary,
    l.file_link,
    LEFT(l.content_text, 500) as content_preview
  FROM lessons l
  WHERE l.lesson_id = ANY(p_lesson_ids);
END;
$$;

-- =====================================================
-- UPDATE: check_group_already_resolved with permission check
-- =====================================================

CREATE OR REPLACE FUNCTION check_group_already_resolved(p_lesson_ids TEXT[])
RETURNS TABLE (
  is_resolved BOOLEAN,
  resolution_type TEXT,
  resolved_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Permission check
  IF NOT has_duplicate_review_permission() THEN
    RAISE EXCEPTION 'Permission denied: requires admin, reviewer, or super_admin role';
  END IF;

  -- Check duplicate_resolutions first
  IF EXISTS (
    SELECT 1 FROM duplicate_resolutions dr
    WHERE dr.canonical_lesson_id = ANY(p_lesson_ids)
  ) THEN
    RETURN QUERY
    SELECT
      true as is_resolved,
      'archived'::TEXT as resolution_type,
      MAX(dr.created_at) as resolved_at
    FROM duplicate_resolutions dr
    WHERE dr.canonical_lesson_id = ANY(p_lesson_ids);
    RETURN;
  END IF;

  -- Check duplicate_group_dismissals
  IF EXISTS (
    SELECT 1 FROM duplicate_group_dismissals dgd
    WHERE dgd.lesson_ids @> p_lesson_ids
    AND dgd.lesson_ids <@ p_lesson_ids
  ) THEN
    RETURN QUERY
    SELECT
      true as is_resolved,
      'dismissed'::TEXT as resolution_type,
      MAX(dgd.dismissed_at) as resolved_at
    FROM duplicate_group_dismissals dgd
    WHERE dgd.lesson_ids @> p_lesson_ids
    AND dgd.lesson_ids <@ p_lesson_ids;
    RETURN;
  END IF;

  -- Not resolved
  RETURN QUERY SELECT false, NULL::TEXT, NULL::TIMESTAMPTZ;
END;
$$;

-- =====================================================
-- UPDATE: resolve_duplicate_group with permission check
-- =====================================================
-- This function already has a permission check, but it doesn't allow
-- service_role or postgres superuser access. Update to use the shared helper.

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
'Resolves a group of duplicate lessons. Updated to use shared permission helper for service_role/postgres access.';

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
-- Ensure authenticated users can call these functions
-- (The permission check inside handles authorization)

GRANT EXECUTE ON FUNCTION has_duplicate_review_permission() TO authenticated;
GRANT EXECUTE ON FUNCTION find_duplicate_pairs() TO authenticated;
GRANT EXECUTE ON FUNCTION get_lesson_details_for_review(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION check_group_already_resolved(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_duplicate_group(TEXT, TEXT, TEXT[], TEXT, NUMERIC, BOOLEAN, TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- =====================================================
-- ROLLBACK
-- =====================================================
-- To rollback, revert to the original functions from 20251201_duplicate_detection_revamp.sql
-- and 20251001_production_baseline_snapshot.sql
-- REVOKE EXECUTE ON FUNCTION has_duplicate_review_permission() FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION find_duplicate_pairs() FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION get_lesson_details_for_review(TEXT[]) FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION check_group_already_resolved(TEXT[]) FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION resolve_duplicate_group(TEXT, TEXT, TEXT[], TEXT, NUMERIC, BOOLEAN, TEXT, TEXT, TEXT, TEXT, JSONB) FROM authenticated;
-- DROP FUNCTION IF EXISTS has_duplicate_review_permission();
-- Then recreate original functions without permission checks (from baseline and 20251201 migration)
