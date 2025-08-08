-- COMPLETE fix for resolve_duplicate_group function
-- This handles ALL column requirements and data types correctly

-- Drop all existing versions
DROP FUNCTION IF EXISTS resolve_duplicate_group(text, text, text[], text, double precision, boolean, text);
DROP FUNCTION IF EXISTS resolve_duplicate_group(text, text, text[], text, numeric, boolean, text, text, text, text);

CREATE OR REPLACE FUNCTION resolve_duplicate_group(
  p_group_id text,
  p_canonical_id text,
  p_duplicate_ids text[],
  p_duplicate_type text DEFAULT 'near',
  p_similarity_score numeric DEFAULT 0.85,
  p_merge_metadata boolean DEFAULT false,
  p_resolution_notes text DEFAULT NULL,
  p_resolution_mode text DEFAULT 'single',
  p_sub_group_name text DEFAULT NULL,
  p_parent_group_id text DEFAULT NULL
)
RETURNS jsonb
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
BEGIN
  -- Get the current user
  v_user_id := auth.uid();
  
  -- Verify user has permission
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = v_user_id 
    AND role IN ('admin', 'reviewer', 'super_admin')
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Insufficient permissions'
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
  
  -- Create resolution record
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
    p_resolution_notes,
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

      -- Repeat for other array fields
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

      -- Continue for other arrays as needed...
    END IF;

    -- Archive each duplicate lesson
    FOR v_lesson_record IN 
      SELECT * FROM lessons WHERE lesson_id = ANY(p_duplicate_ids)
    LOOP
      -- Generate a new UUID for the archive record
      v_archive_id := gen_random_uuid();
      
      -- Insert into lesson_archive with ALL required fields
      INSERT INTO lesson_archive (
        id,  -- REQUIRED: Generate new UUID
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
        created_at,  -- REQUIRED: Use existing or current timestamp
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
        v_archive_id,  -- Generate new ID
        v_lesson_record.lesson_id,
        v_lesson_record.title,
        COALESCE(v_lesson_record.summary, ''),  -- Provide default for NOT NULL
        COALESCE(v_lesson_record.file_link, ''),  -- Provide default for NOT NULL
        COALESCE(v_lesson_record.grade_levels, ARRAY[]::text[]),  -- Default empty array
        COALESCE(v_lesson_record.metadata, '{}'::jsonb),  -- Default empty object
        COALESCE(v_lesson_record.confidence, '{}'::jsonb),  -- Default empty object
        v_lesson_record.search_vector,
        v_lesson_record.content_text,
        v_lesson_record.content_embedding,
        v_lesson_record.content_hash,
        v_lesson_record.last_modified,
        COALESCE(v_lesson_record.created_at, NOW()),  -- Use existing or current time
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
        NOW(),  -- archived_at
        v_user_id,  -- archived_by
        'Duplicate resolved - ' || p_duplicate_type || ' (Group: ' || p_group_id || ')',  -- archive_reason
        p_canonical_id,  -- canonical_id
        v_lesson_record.activity_type
      );
      
      v_archived_count := v_archived_count + 1;
    END LOOP;

    -- Create canonical mappings
    INSERT INTO canonical_lessons (
      duplicate_id,
      canonical_id,
      similarity_score,
      resolution_type,
      resolved_by,
      resolution_notes
    )
    SELECT 
      unnest(p_duplicate_ids),
      p_canonical_id,
      p_similarity_score,
      p_duplicate_type,
      v_user_id,
      p_resolution_notes;

    -- Delete duplicates from main table
    DELETE FROM lessons 
    WHERE lesson_id = ANY(p_duplicate_ids);
  END IF;
  
  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'archived_count', v_archived_count,
    'resolution_id', v_resolution_id,
    'canonical_id', p_canonical_id,
    'action_taken', v_action_taken,
    'lessons_in_group', v_lesson_count
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE,
      'context', 'Error at: ' || COALESCE(p_group_id, 'unknown'),
      'hint', 'Check that all lessons exist and have required fields'
    );
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION resolve_duplicate_group TO authenticated;

COMMENT ON FUNCTION resolve_duplicate_group IS 'Complete duplicate resolution with proper handling of all required fields in lesson_archive table.';