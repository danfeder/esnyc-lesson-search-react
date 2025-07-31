-- Migration: Fix duplicate resolution function archive insert
-- Date: 2025-01-31
-- Description: Fixes the INSERT statement in resolve_duplicate_group function to match actual table structure

-- Drop existing function first (with its specific signature)
DROP FUNCTION IF EXISTS resolve_duplicate_group(TEXT, TEXT, TEXT[], TEXT, NUMERIC, BOOLEAN, TEXT);

-- Recreate the function with proper INSERT statement
CREATE OR REPLACE FUNCTION resolve_duplicate_group(
  p_group_id TEXT,
  p_canonical_id TEXT,
  p_duplicate_ids TEXT[],
  p_duplicate_type TEXT DEFAULT 'unknown',
  p_similarity_score NUMERIC DEFAULT NULL,
  p_merge_metadata BOOLEAN DEFAULT FALSE,
  p_resolution_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_resolution_id UUID;
  v_merged_arrays JSONB;
  v_key TEXT;
  v_canonical_array JSONB;
  v_dup_array JSONB;
  v_merged_items JSONB;
  v_lesson RECORD;
BEGIN
  -- Validate inputs
  IF p_canonical_id = ANY(p_duplicate_ids) THEN
    RAISE EXCEPTION 'Canonical ID cannot be in the duplicate IDs array';
  END IF;
  
  -- 1. Add to canonical_lessons table
  INSERT INTO canonical_lessons (lesson_id, made_canonical_at, made_canonical_by)
  VALUES (p_canonical_id, NOW(), auth.uid())
  ON CONFLICT (lesson_id) DO NOTHING;
  
  -- 2. Merge metadata if requested
  IF p_merge_metadata THEN
    -- First merge the granular array columns
    UPDATE lessons l1
    SET
      thematic_categories = ARRAY(
        SELECT DISTINCT unnest(
          l1.thematic_categories || 
          COALESCE(
            (SELECT array_agg(DISTINCT elem)
             FROM lessons l2, unnest(l2.thematic_categories) elem
             WHERE l2.lesson_id = ANY(p_duplicate_ids)),
            ARRAY[]::text[]
          )
        )
      ),
      cultural_heritage = ARRAY(
        SELECT DISTINCT unnest(
          l1.cultural_heritage || 
          COALESCE(
            (SELECT array_agg(DISTINCT elem)
             FROM lessons l2, unnest(l2.cultural_heritage) elem
             WHERE l2.lesson_id = ANY(p_duplicate_ids)),
            ARRAY[]::text[]
          )
        )
      ),
      observances_holidays = ARRAY(
        SELECT DISTINCT unnest(
          l1.observances_holidays || 
          COALESCE(
            (SELECT array_agg(DISTINCT elem)
             FROM lessons l2, unnest(l2.observances_holidays) elem
             WHERE l2.lesson_id = ANY(p_duplicate_ids)),
            ARRAY[]::text[]
          )
        )
      ),
      location_requirements = ARRAY(
        SELECT DISTINCT unnest(
          l1.location_requirements || 
          COALESCE(
            (SELECT array_agg(DISTINCT elem)
             FROM lessons l2, unnest(l2.location_requirements) elem
             WHERE l2.lesson_id = ANY(p_duplicate_ids)),
            ARRAY[]::text[]
          )
        )
      ),
      season_timing = ARRAY(
        SELECT DISTINCT unnest(
          l1.season_timing || 
          COALESCE(
            (SELECT array_agg(DISTINCT elem)
             FROM lessons l2, unnest(l2.season_timing) elem
             WHERE l2.lesson_id = ANY(p_duplicate_ids)),
            ARRAY[]::text[]
          )
        )
      ),
      academic_integration = ARRAY(
        SELECT DISTINCT unnest(
          l1.academic_integration || 
          COALESCE(
            (SELECT array_agg(DISTINCT elem)
             FROM lessons l2, unnest(l2.academic_integration) elem
             WHERE l2.lesson_id = ANY(p_duplicate_ids)),
            ARRAY[]::text[]
          )
        )
      ),
      social_emotional_learning = ARRAY(
        SELECT DISTINCT unnest(
          l1.social_emotional_learning || 
          COALESCE(
            (SELECT array_agg(DISTINCT elem)
             FROM lessons l2, unnest(l2.social_emotional_learning) elem
             WHERE l2.lesson_id = ANY(p_duplicate_ids)),
            ARRAY[]::text[]
          )
        )
      ),
      cooking_methods = ARRAY(
        SELECT DISTINCT unnest(
          l1.cooking_methods || 
          COALESCE(
            (SELECT array_agg(DISTINCT elem)
             FROM lessons l2, unnest(l2.cooking_methods) elem
             WHERE l2.lesson_id = ANY(p_duplicate_ids)),
            ARRAY[]::text[]
          )
        )
      ),
      main_ingredients = ARRAY(
        SELECT DISTINCT unnest(
          l1.main_ingredients || 
          COALESCE(
            (SELECT array_agg(DISTINCT elem)
             FROM lessons l2, unnest(l2.main_ingredients) elem
             WHERE l2.lesson_id = ANY(p_duplicate_ids)),
            ARRAY[]::text[]
          )
        )
      ),
      garden_skills = ARRAY(
        SELECT DISTINCT unnest(
          l1.garden_skills || 
          COALESCE(
            (SELECT array_agg(DISTINCT elem)
             FROM lessons l2, unnest(l2.garden_skills) elem
             WHERE l2.lesson_id = ANY(p_duplicate_ids)),
            ARRAY[]::text[]
          )
        )
      ),
      cooking_skills = ARRAY(
        SELECT DISTINCT unnest(
          l1.cooking_skills || 
          COALESCE(
            (SELECT array_agg(DISTINCT elem)
             FROM lessons l2, unnest(l2.cooking_skills) elem
             WHERE l2.lesson_id = ANY(p_duplicate_ids)),
            ARRAY[]::text[]
          )
        )
      ),
      core_competencies = ARRAY(
        SELECT DISTINCT unnest(
          l1.core_competencies || 
          COALESCE(
            (SELECT array_agg(DISTINCT elem)
             FROM lessons l2, unnest(l2.core_competencies) elem
             WHERE l2.lesson_id = ANY(p_duplicate_ids)),
            ARRAY[]::text[]
          )
        )
      ),
      -- Update lesson format to the first non-null value from duplicates if canonical doesn't have one
      lesson_format = COALESCE(l1.lesson_format, (
        SELECT lesson_format FROM lessons 
        WHERE lesson_id = ANY(p_duplicate_ids) 
          AND lesson_format IS NOT NULL AND lesson_format != ''
        LIMIT 1
      )),
      -- Append any processing notes
      processing_notes = CASE 
        WHEN l1.processing_notes IS NULL OR l1.processing_notes = '' 
        THEN (SELECT string_agg(processing_notes, '; ')
              FROM lessons 
              WHERE lesson_id = ANY(p_duplicate_ids) 
                AND processing_notes IS NOT NULL AND processing_notes != '')
        ELSE l1.processing_notes || '; ' || 
             COALESCE((SELECT string_agg(processing_notes, '; ')
                       FROM lessons 
                       WHERE lesson_id = ANY(p_duplicate_ids) 
                         AND processing_notes IS NOT NULL AND processing_notes != ''), '')
      END,
      updated_at = NOW()
    WHERE lesson_id = p_canonical_id;
    
    -- Now merge any remaining metadata fields that might be in the JSONB
    -- Get canonical lesson's metadata
    SELECT metadata INTO v_merged_arrays
    FROM lessons WHERE lesson_id = p_canonical_id;
    
    -- Merge arrays from all duplicates
    FOR v_lesson IN 
      SELECT metadata 
      FROM lessons 
      WHERE lesson_id = ANY(p_duplicate_ids)
    LOOP
      -- For each key in the duplicate's metadata
      FOR v_key IN SELECT * FROM jsonb_object_keys(v_lesson.metadata) LOOP
        -- Get the arrays
        v_canonical_array := v_merged_arrays->v_key;
        v_dup_array := v_lesson.metadata->v_key;
        
        -- If both are arrays, merge them
        IF jsonb_typeof(v_canonical_array) = 'array' AND jsonb_typeof(v_dup_array) = 'array' THEN
          -- Combine and deduplicate
          SELECT jsonb_agg(DISTINCT value) INTO v_merged_items
          FROM (
            SELECT jsonb_array_elements(v_canonical_array) AS value
            UNION
            SELECT jsonb_array_elements(v_dup_array) AS value
          ) t;
          
          v_merged_arrays := jsonb_set(v_merged_arrays, ARRAY[v_key], v_merged_items);
        ELSIF v_canonical_array IS NULL THEN
          -- If canonical doesn't have this key, take the duplicate's value
          v_merged_arrays := jsonb_set(v_merged_arrays, ARRAY[v_key], v_dup_array);
        END IF;
      END LOOP;
    END LOOP;
    
    -- Update the canonical lesson's metadata
    UPDATE lessons
    SET 
      metadata = v_merged_arrays,
      updated_at = NOW()
    WHERE lesson_id = p_canonical_id;
  END IF;
  
  -- 3. Archive duplicates - properly list columns explicitly
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
    -- Archive-specific columns
    archived_at,
    archived_by,
    archive_reason,
    canonical_id
  )
  SELECT 
    l.id,
    l.lesson_id,
    l.title,
    l.summary,
    l.file_link,
    l.grade_levels,
    l.metadata,
    l.confidence,
    l.search_vector,
    l.content_text,
    l.content_embedding,
    l.content_hash,
    l.last_modified,
    l.created_at,
    l.updated_at,
    l.thematic_categories,
    l.cultural_heritage,
    l.observances_holidays,
    l.location_requirements,
    l.season_timing,
    l.academic_integration,
    l.social_emotional_learning,
    l.cooking_methods,
    l.main_ingredients,
    l.cultural_responsiveness_features,
    l.garden_skills,
    l.cooking_skills,
    l.core_competencies,
    l.lesson_format,
    l.processing_notes,
    l.review_notes,
    l.flagged_for_review,
    l.tags,
    -- Archive-specific values
    NOW(),
    auth.uid(),
    'Duplicate of ' || p_canonical_id,
    p_canonical_id
  FROM lessons l
  WHERE l.lesson_id = ANY(p_duplicate_ids);
  
  -- 4. Update references to point to canonical
  -- Update any submissions that referenced the duplicates
  UPDATE lesson_submissions
  SET original_lesson_id = p_canonical_id
  WHERE original_lesson_id = ANY(p_duplicate_ids);
  
  -- 5. Delete the duplicate lessons
  DELETE FROM lessons WHERE lesson_id = ANY(p_duplicate_ids);
  
  -- 6. Record the resolution
  INSERT INTO duplicate_resolutions (
    group_id,
    canonical_lesson_id,
    duplicate_lesson_ids,
    duplicate_type,
    similarity_score,
    metadata_merged,
    resolution_notes,
    resolved_by,
    resolved_at
  ) VALUES (
    p_group_id,
    p_canonical_id,
    p_duplicate_ids,
    p_duplicate_type,
    p_similarity_score,
    p_merge_metadata,
    p_resolution_notes,
    auth.uid(),
    NOW()
  ) RETURNING id INTO v_resolution_id;
  
  -- 7. Return result
  v_result := jsonb_build_object(
    'success', true,
    'resolution_id', v_resolution_id,
    'canonical_id', p_canonical_id,
    'archived_count', array_length(p_duplicate_ids, 1),
    'metadata_merged', p_merge_metadata
  );
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION resolve_duplicate_group TO authenticated;