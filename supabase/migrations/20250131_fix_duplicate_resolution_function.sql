-- Migration: Fix duplicate resolution function for correct schema
-- Date: 2025-01-31
-- Description: Updates the function to work with actual lessons table columns

-- Function to safely resolve a duplicate group with smart metadata merging
CREATE OR REPLACE FUNCTION resolve_duplicate_group(
  p_group_id TEXT,
  p_canonical_id TEXT,
  p_duplicate_ids TEXT[],
  p_duplicate_type TEXT,
  p_similarity_score FLOAT,
  p_merge_metadata BOOLEAN DEFAULT FALSE,
  p_resolution_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_duplicate_id TEXT;
  v_metadata_merged JSONB DEFAULT '{}';
  v_action_taken TEXT;
  v_canonical_lesson RECORD;
  v_merged_array TEXT[];
  v_single_value TEXT;
BEGIN
  -- Validate inputs
  IF p_canonical_id = ANY(p_duplicate_ids) THEN
    RAISE EXCEPTION 'Canonical ID cannot be in the duplicate IDs list';
  END IF;
  
  -- Validate canonical lesson exists
  IF NOT EXISTS (SELECT 1 FROM lessons WHERE lesson_id = p_canonical_id) THEN
    RAISE EXCEPTION 'Canonical lesson % does not exist', p_canonical_id;
  END IF;
  
  -- Begin transaction logic
  BEGIN
    -- 1. Create canonical mappings for each duplicate
    FOREACH v_duplicate_id IN ARRAY p_duplicate_ids
    LOOP
      -- Verify duplicate exists
      IF NOT EXISTS (SELECT 1 FROM lessons WHERE lesson_id = v_duplicate_id) THEN
        RAISE WARNING 'Duplicate lesson % does not exist, skipping', v_duplicate_id;
        CONTINUE;
      END IF;
      
      -- Insert canonical mapping
      INSERT INTO canonical_lessons (
        duplicate_id, 
        canonical_id, 
        similarity_score,
        resolution_type,
        resolved_by,
        resolution_notes
      ) VALUES (
        v_duplicate_id,
        p_canonical_id,
        p_similarity_score,
        p_duplicate_type,
        auth.uid(),
        p_resolution_notes
      );
    END LOOP;
    
    -- 2. Merge metadata if requested
    IF p_merge_metadata THEN
      -- Get canonical lesson data
      SELECT * INTO v_canonical_lesson
      FROM lessons
      WHERE lesson_id = p_canonical_id;
      
      -- Merge array fields
      -- Thematic Categories
      SELECT ARRAY(
        SELECT DISTINCT unnest(thematic_categories)
        FROM lessons
        WHERE lesson_id = p_canonical_id OR lesson_id = ANY(p_duplicate_ids)
        ORDER BY 1
      ) INTO v_merged_array;
      IF array_length(v_merged_array, 1) > 0 THEN
        UPDATE lessons SET thematic_categories = v_merged_array WHERE lesson_id = p_canonical_id;
      END IF;
      
      -- Cultural Heritage
      SELECT ARRAY(
        SELECT DISTINCT unnest(cultural_heritage)
        FROM lessons
        WHERE lesson_id = p_canonical_id OR lesson_id = ANY(p_duplicate_ids)
        ORDER BY 1
      ) INTO v_merged_array;
      IF array_length(v_merged_array, 1) > 0 THEN
        UPDATE lessons SET cultural_heritage = v_merged_array WHERE lesson_id = p_canonical_id;
      END IF;
      
      -- Observances/Holidays
      SELECT ARRAY(
        SELECT DISTINCT unnest(observances_holidays)
        FROM lessons
        WHERE lesson_id = p_canonical_id OR lesson_id = ANY(p_duplicate_ids)
        ORDER BY 1
      ) INTO v_merged_array;
      IF array_length(v_merged_array, 1) > 0 THEN
        UPDATE lessons SET observances_holidays = v_merged_array WHERE lesson_id = p_canonical_id;
      END IF;
      
      -- Location Requirements
      SELECT ARRAY(
        SELECT DISTINCT unnest(location_requirements)
        FROM lessons
        WHERE lesson_id = p_canonical_id OR lesson_id = ANY(p_duplicate_ids)
        ORDER BY 1
      ) INTO v_merged_array;
      IF array_length(v_merged_array, 1) > 0 THEN
        UPDATE lessons SET location_requirements = v_merged_array WHERE lesson_id = p_canonical_id;
      END IF;
      
      -- Season Timing
      SELECT ARRAY(
        SELECT DISTINCT unnest(season_timing)
        FROM lessons
        WHERE lesson_id = p_canonical_id OR lesson_id = ANY(p_duplicate_ids)
        ORDER BY 1
      ) INTO v_merged_array;
      IF array_length(v_merged_array, 1) > 0 THEN
        UPDATE lessons SET season_timing = v_merged_array WHERE lesson_id = p_canonical_id;
      END IF;
      
      -- Academic Integration
      SELECT ARRAY(
        SELECT DISTINCT unnest(academic_integration)
        FROM lessons
        WHERE lesson_id = p_canonical_id OR lesson_id = ANY(p_duplicate_ids)
        ORDER BY 1
      ) INTO v_merged_array;
      IF array_length(v_merged_array, 1) > 0 THEN
        UPDATE lessons SET academic_integration = v_merged_array WHERE lesson_id = p_canonical_id;
      END IF;
      
      -- Social Emotional Learning
      SELECT ARRAY(
        SELECT DISTINCT unnest(social_emotional_learning)
        FROM lessons
        WHERE lesson_id = p_canonical_id OR lesson_id = ANY(p_duplicate_ids)
        ORDER BY 1
      ) INTO v_merged_array;
      IF array_length(v_merged_array, 1) > 0 THEN
        UPDATE lessons SET social_emotional_learning = v_merged_array WHERE lesson_id = p_canonical_id;
      END IF;
      
      -- Cooking Methods
      SELECT ARRAY(
        SELECT DISTINCT unnest(cooking_methods)
        FROM lessons
        WHERE lesson_id = p_canonical_id OR lesson_id = ANY(p_duplicate_ids)
        ORDER BY 1
      ) INTO v_merged_array;
      IF array_length(v_merged_array, 1) > 0 THEN
        UPDATE lessons SET cooking_methods = v_merged_array WHERE lesson_id = p_canonical_id;
      END IF;
      
      -- Main Ingredients
      SELECT ARRAY(
        SELECT DISTINCT unnest(main_ingredients)
        FROM lessons
        WHERE lesson_id = p_canonical_id OR lesson_id = ANY(p_duplicate_ids)
        ORDER BY 1
      ) INTO v_merged_array;
      IF array_length(v_merged_array, 1) > 0 THEN
        UPDATE lessons SET main_ingredients = v_merged_array WHERE lesson_id = p_canonical_id;
      END IF;
      
      -- Garden Skills
      SELECT ARRAY(
        SELECT DISTINCT unnest(garden_skills)
        FROM lessons
        WHERE lesson_id = p_canonical_id OR lesson_id = ANY(p_duplicate_ids)
        ORDER BY 1
      ) INTO v_merged_array;
      IF array_length(v_merged_array, 1) > 0 THEN
        UPDATE lessons SET garden_skills = v_merged_array WHERE lesson_id = p_canonical_id;
      END IF;
      
      -- Cooking Skills
      SELECT ARRAY(
        SELECT DISTINCT unnest(cooking_skills)
        FROM lessons
        WHERE lesson_id = p_canonical_id OR lesson_id = ANY(p_duplicate_ids)
        ORDER BY 1
      ) INTO v_merged_array;
      IF array_length(v_merged_array, 1) > 0 THEN
        UPDATE lessons SET cooking_skills = v_merged_array WHERE lesson_id = p_canonical_id;
      END IF;
      
      -- Core Competencies
      SELECT ARRAY(
        SELECT DISTINCT unnest(core_competencies)
        FROM lessons
        WHERE lesson_id = p_canonical_id OR lesson_id = ANY(p_duplicate_ids)
        ORDER BY 1
      ) INTO v_merged_array;
      IF array_length(v_merged_array, 1) > 0 THEN
        UPDATE lessons SET core_competencies = v_merged_array WHERE lesson_id = p_canonical_id;
      END IF;
      
      -- Cultural Responsiveness Features
      SELECT ARRAY(
        SELECT DISTINCT unnest(cultural_responsiveness_features)
        FROM lessons
        WHERE lesson_id = p_canonical_id OR lesson_id = ANY(p_duplicate_ids)
        ORDER BY 1
      ) INTO v_merged_array;
      IF array_length(v_merged_array, 1) > 0 THEN
        UPDATE lessons SET cultural_responsiveness_features = v_merged_array WHERE lesson_id = p_canonical_id;
      END IF;
      
      -- Tags
      SELECT ARRAY(
        SELECT DISTINCT unnest(tags)
        FROM lessons
        WHERE lesson_id = p_canonical_id OR lesson_id = ANY(p_duplicate_ids)
        ORDER BY 1
      ) INTO v_merged_array;
      IF array_length(v_merged_array, 1) > 0 THEN
        UPDATE lessons SET tags = v_merged_array WHERE lesson_id = p_canonical_id;
      END IF;
      
      -- Handle single-value field (lesson_format)
      -- Keep canonical's value if present, otherwise take first non-null from duplicates
      IF v_canonical_lesson.lesson_format IS NULL OR v_canonical_lesson.lesson_format = '' THEN
        SELECT lesson_format INTO v_single_value
        FROM lessons
        WHERE lesson_id = ANY(p_duplicate_ids)
          AND lesson_format IS NOT NULL
          AND lesson_format != ''
        LIMIT 1;
        
        IF v_single_value IS NOT NULL THEN
          UPDATE lessons SET lesson_format = v_single_value WHERE lesson_id = p_canonical_id;
        END IF;
      END IF;
      
      -- Update the updated_at timestamp
      UPDATE lessons SET updated_at = NOW() WHERE lesson_id = p_canonical_id;
      
      -- Collect metadata that was merged for logging
      SELECT jsonb_object_agg(
        lesson_id,
        jsonb_build_object(
          'thematic_categories', thematic_categories,
          'main_ingredients', main_ingredients,
          'lesson_format', lesson_format
        )
      ) INTO v_metadata_merged
      FROM lessons
      WHERE lesson_id = ANY(p_duplicate_ids);
      
      v_action_taken := 'merge_and_archive';
    ELSE
      v_action_taken := 'archive_only';
    END IF;
    
    -- 3. Archive duplicates
    INSERT INTO lesson_archive
    SELECT 
      l.*,
      NOW() as archived_at,
      auth.uid() as archived_by,
      'Duplicate of ' || p_canonical_id as archive_reason,
      p_canonical_id as canonical_id
    FROM lessons l
    WHERE l.lesson_id = ANY(p_duplicate_ids);
    
    -- 4. Update references to point to canonical
    -- Update bookmarks
    UPDATE bookmarks 
    SET lesson_id = p_canonical_id 
    WHERE lesson_id = ANY(p_duplicate_ids);
    
    -- Update lesson_collection_items
    UPDATE lesson_collection_items 
    SET lesson_id = p_canonical_id 
    WHERE lesson_id = ANY(p_duplicate_ids);
    
    -- Remove any resulting duplicates in collections
    DELETE FROM lesson_collection_items lc1
    WHERE EXISTS (
      SELECT 1 FROM lesson_collection_items lc2
      WHERE lc2.collection_id = lc1.collection_id
      AND lc2.lesson_id = lc1.lesson_id
      AND lc2.created_at < lc1.created_at
    );
    
    -- 5. Delete archived lessons from main table
    DELETE FROM lessons 
    WHERE lesson_id = ANY(p_duplicate_ids);
    
    -- 6. Log the resolution
    INSERT INTO duplicate_resolutions (
      group_id,
      duplicate_type,
      similarity_score,
      lessons_in_group,
      canonical_lesson_id,
      action_taken,
      metadata_merged,
      resolved_by,
      notes
    ) VALUES (
      p_group_id,
      p_duplicate_type,
      p_similarity_score,
      array_length(p_duplicate_ids, 1) + 1, -- +1 for canonical
      p_canonical_id,
      v_action_taken,
      v_metadata_merged,
      auth.uid(),
      p_resolution_notes
    );
    
    -- Build result
    v_result := jsonb_build_object(
      'success', true,
      'canonical_id', p_canonical_id,
      'duplicates_archived', array_length(p_duplicate_ids, 1),
      'action_taken', v_action_taken,
      'metadata_merged', p_merge_metadata
    );
    
    RETURN v_result;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback is automatic in PL/pgSQL functions
      v_result := jsonb_build_object(
        'success', false,
        'error', SQLERRM
      );
      RETURN v_result;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on the updated function
COMMENT ON FUNCTION resolve_duplicate_group IS 'Resolves duplicate lessons by archiving duplicates and optionally merging their metadata into the canonical lesson. Works with granular metadata columns.';