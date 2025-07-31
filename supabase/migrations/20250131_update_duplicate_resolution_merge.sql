-- Migration: Update duplicate resolution function with smart metadata merging
-- Date: 2025-01-31
-- Description: Implements actual metadata merging logic when resolving duplicates

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
  v_canonical_metadata JSONB;
  v_merged_arrays JSONB DEFAULT '{}';
  v_field_name TEXT;
  v_merged_array TEXT[];
  v_tags_array TEXT[];
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
      -- Get canonical lesson's current metadata
      SELECT metadata INTO v_canonical_metadata
      FROM lessons
      WHERE lesson_id = p_canonical_id;
      
      -- Initialize merged metadata with canonical's metadata
      v_merged_arrays := COALESCE(v_canonical_metadata, '{}'::jsonb);
      
      -- Array fields to merge
      FOR v_field_name IN SELECT unnest(ARRAY[
        'thematicCategories', 'seasonTiming', 'coreCompetencies', 
        'culturalHeritage', 'locationRequirements', 'activityType',
        'mainIngredients', 'skills', 'equipment', 'academicIntegration',
        'socialEmotionalLearning', 'observancesHolidays', 'culturalResponsivenessFeatures'
      ])
      LOOP
        -- Collect all values for this field from canonical and duplicates
        SELECT ARRAY(
          SELECT DISTINCT jsonb_array_elements_text(
            COALESCE(metadata->v_field_name, '[]'::jsonb)
          )
          FROM lessons
          WHERE lesson_id = p_canonical_id 
             OR lesson_id = ANY(p_duplicate_ids)
          ORDER BY 1
        ) INTO v_merged_array;
        
        -- Update the field if we have values
        IF array_length(v_merged_array, 1) > 0 THEN
          v_merged_arrays := jsonb_set(
            v_merged_arrays,
            ARRAY[v_field_name],
            to_jsonb(v_merged_array)
          );
        END IF;
      END LOOP;
      
      -- Handle single-value fields (lessonFormat, cookingMethods)
      -- Keep canonical's value if present, otherwise take first non-null from duplicates
      FOR v_field_name IN SELECT unnest(ARRAY['lessonFormat', 'cookingMethods'])
      LOOP
        IF v_merged_arrays->v_field_name IS NULL OR 
           v_merged_arrays->>v_field_name = '' THEN
          -- Find first non-null value from duplicates
          SELECT metadata->>v_field_name INTO v_merged_arrays
          FROM lessons
          WHERE lesson_id = ANY(p_duplicate_ids)
            AND metadata->v_field_name IS NOT NULL
            AND metadata->>v_field_name != ''
          LIMIT 1;
          
          -- Update if we found a value
          IF FOUND THEN
            v_merged_arrays := jsonb_set(
              v_merged_arrays,
              ARRAY[v_field_name],
              to_jsonb(v_merged_arrays)
            );
          END IF;
        END IF;
      END LOOP;
      
      -- Update the canonical lesson's metadata
      UPDATE lessons
      SET 
        metadata = v_merged_arrays,
        updated_at = NOW()
      WHERE lesson_id = p_canonical_id;
      
      -- Merge top-level text fields (except summary which we preserve)
      UPDATE lessons l1
      SET
        objectives = COALESCE(l1.objectives, (
          SELECT objectives FROM lessons 
          WHERE lesson_id = ANY(p_duplicate_ids) 
            AND objectives IS NOT NULL AND objectives != ''
          LIMIT 1
        )),
        materials = COALESCE(l1.materials, (
          SELECT materials FROM lessons 
          WHERE lesson_id = ANY(p_duplicate_ids)
            AND materials IS NOT NULL AND materials != ''
          LIMIT 1
        )),
        ingredients = COALESCE(l1.ingredients, (
          SELECT ingredients FROM lessons 
          WHERE lesson_id = ANY(p_duplicate_ids)
            AND ingredients IS NOT NULL AND ingredients != ''
          LIMIT 1
        )),
        procedure_steps = COALESCE(l1.procedure_steps, (
          SELECT procedure_steps FROM lessons 
          WHERE lesson_id = ANY(p_duplicate_ids)
            AND procedure_steps IS NOT NULL AND procedure_steps != ''
          LIMIT 1
        )),
        assessment = COALESCE(l1.assessment, (
          SELECT assessment FROM lessons 
          WHERE lesson_id = ANY(p_duplicate_ids)
            AND assessment IS NOT NULL AND assessment != ''
          LIMIT 1
        )),
        extensions = COALESCE(l1.extensions, (
          SELECT extensions FROM lessons 
          WHERE lesson_id = ANY(p_duplicate_ids)
            AND extensions IS NOT NULL AND extensions != ''
          LIMIT 1
        )),
        vocabulary = COALESCE(l1.vocabulary, (
          SELECT vocabulary FROM lessons 
          WHERE lesson_id = ANY(p_duplicate_ids)
            AND vocabulary IS NOT NULL AND vocabulary != ''
          LIMIT 1
        )),
        notes = COALESCE(l1.notes, (
          SELECT notes FROM lessons 
          WHERE lesson_id = ANY(p_duplicate_ids)
            AND notes IS NOT NULL AND notes != ''
          LIMIT 1
        )),
        updated_at = NOW()
      WHERE l1.lesson_id = p_canonical_id;
      
      -- Merge tags array
      SELECT ARRAY(
        SELECT DISTINCT unnest(tags)
        FROM lessons
        WHERE lesson_id = p_canonical_id 
           OR lesson_id = ANY(p_duplicate_ids)
        ORDER BY 1
      ) INTO v_tags_array;
      
      IF array_length(v_tags_array, 1) > 0 THEN
        UPDATE lessons
        SET 
          tags = v_tags_array,
          updated_at = NOW()
        WHERE lesson_id = p_canonical_id;
      END IF;
      
      -- Collect metadata that was merged for logging
      SELECT jsonb_object_agg(
        lesson_id,
        jsonb_build_object(
          'metadata', metadata,
          'tags', tags,
          'hadObjectives', objectives IS NOT NULL,
          'hadMaterials', materials IS NOT NULL
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
    
    -- Update lesson_collections
    UPDATE lesson_collections 
    SET lesson_id = p_canonical_id 
    WHERE lesson_id = ANY(p_duplicate_ids);
    
    -- Remove any resulting duplicates in collections
    DELETE FROM lesson_collections lc1
    WHERE EXISTS (
      SELECT 1 FROM lesson_collections lc2
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
COMMENT ON FUNCTION resolve_duplicate_group IS 'Resolves duplicate lessons by archiving duplicates and optionally merging their metadata into the canonical lesson. Preserves the canonical lesson summary while merging array fields and filling in missing text fields.';