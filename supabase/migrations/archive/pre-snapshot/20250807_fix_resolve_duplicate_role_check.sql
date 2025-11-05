-- Fix the resolve_duplicate_group function to use the correct role column
-- The user_profiles table has a direct 'role' column, not metadata->>'role'

CREATE OR REPLACE FUNCTION public.resolve_duplicate_group(
  p_group_id TEXT,
  p_canonical_id TEXT,
  p_duplicate_ids TEXT[],
  p_duplicate_type TEXT,
  p_similarity_score DOUBLE PRECISION,
  p_merge_metadata BOOLEAN DEFAULT FALSE,
  p_resolution_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_result JSONB;
  v_archived_count INTEGER := 0;
  v_merged_metadata JSONB := NULL;
  v_duplicate_id TEXT;
  v_canonical_lesson RECORD;
  v_duplicate_lesson RECORD;
  -- Use the actual column names from the lessons table
  v_merged_grade_levels TEXT[];
  v_merged_thematic_categories TEXT[];
  v_merged_season_timing TEXT[];
  v_merged_observances_holidays TEXT[];
  v_merged_main_ingredients TEXT[];
  v_merged_garden_skills TEXT[];
  v_merged_cooking_skills TEXT[];
  v_merged_academic_integration TEXT[];
  v_merged_social_emotional_learning TEXT[];
  v_merged_cultural_heritage TEXT[];
  v_merged_location_requirements TEXT[];
  v_merged_cooking_methods TEXT[];
  v_merged_core_competencies TEXT[];
  v_merged_cultural_responsiveness_features TEXT[];
  v_merged_tags TEXT[];
  v_user_id UUID;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- SERVER-SIDE VALIDATION
  -- Validate user is authenticated
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User must be authenticated to resolve duplicates';
  END IF;
  
  -- Validate user has appropriate role
  -- FIX: Use the direct 'role' column instead of metadata->>'role'
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = v_user_id 
    AND role IN ('admin', 'reviewer')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'User does not have permission to resolve duplicates';
  END IF;
  
  -- Validate inputs
  IF p_group_id IS NULL OR trim(p_group_id) = '' THEN
    RAISE EXCEPTION 'Group ID is required';
  END IF;
  
  IF p_canonical_id IS NULL OR trim(p_canonical_id) = '' THEN
    RAISE EXCEPTION 'Canonical lesson ID is required';
  END IF;
  
  IF p_duplicate_ids IS NULL OR array_length(p_duplicate_ids, 1) = 0 THEN
    RAISE EXCEPTION 'At least one duplicate ID is required';
  END IF;
  
  -- Validate duplicate type
  IF p_duplicate_type NOT IN ('exact', 'near', 'version', 'title', 'unknown') THEN
    RAISE EXCEPTION 'Invalid duplicate type: %', p_duplicate_type;
  END IF;
  
  -- Validate similarity score
  IF p_similarity_score < 0 OR p_similarity_score > 1 THEN
    RAISE EXCEPTION 'Similarity score must be between 0 and 1';
  END IF;
  
  -- Validate canonical ID is not in duplicate list
  IF p_canonical_id = ANY(p_duplicate_ids) THEN
    RAISE EXCEPTION 'Canonical lesson ID cannot be in the duplicate IDs list';
  END IF;
  
  -- Validate all lesson IDs exist
  IF NOT EXISTS (SELECT 1 FROM lessons WHERE lesson_id = p_canonical_id) THEN
    RAISE EXCEPTION 'Canonical lesson % not found', p_canonical_id;
  END IF;
  
  FOREACH v_duplicate_id IN ARRAY p_duplicate_ids
  LOOP
    IF NOT EXISTS (SELECT 1 FROM lessons WHERE lesson_id = v_duplicate_id) THEN
      RAISE EXCEPTION 'Duplicate lesson % not found', v_duplicate_id;
    END IF;
  END LOOP;
  
  -- Validate no lesson is already archived
  FOREACH v_duplicate_id IN ARRAY p_duplicate_ids
  LOOP
    IF EXISTS (SELECT 1 FROM lesson_archive WHERE lesson_id = v_duplicate_id) THEN
      RAISE EXCEPTION 'Lesson % is already archived', v_duplicate_id;
    END IF;
  END LOOP;
  
  -- Get canonical lesson data
  SELECT * INTO v_canonical_lesson
  FROM lessons
  WHERE lesson_id = p_canonical_id;
  
  -- If merge_metadata is true, prepare the merged data
  IF p_merge_metadata THEN
    -- Initialize arrays with canonical lesson values
    v_merged_grade_levels := COALESCE(v_canonical_lesson.grade_levels, ARRAY[]::TEXT[]);
    v_merged_thematic_categories := COALESCE(v_canonical_lesson.thematic_categories, ARRAY[]::TEXT[]);
    v_merged_season_timing := COALESCE(v_canonical_lesson.season_timing, ARRAY[]::TEXT[]);
    v_merged_observances_holidays := COALESCE(v_canonical_lesson.observances_holidays, ARRAY[]::TEXT[]);
    v_merged_main_ingredients := COALESCE(v_canonical_lesson.main_ingredients, ARRAY[]::TEXT[]);
    v_merged_garden_skills := COALESCE(v_canonical_lesson.garden_skills, ARRAY[]::TEXT[]);
    v_merged_cooking_skills := COALESCE(v_canonical_lesson.cooking_skills, ARRAY[]::TEXT[]);
    v_merged_academic_integration := COALESCE(v_canonical_lesson.academic_integration, ARRAY[]::TEXT[]);
    v_merged_social_emotional_learning := COALESCE(v_canonical_lesson.social_emotional_learning, ARRAY[]::TEXT[]);
    v_merged_cultural_heritage := COALESCE(v_canonical_lesson.cultural_heritage, ARRAY[]::TEXT[]);
    v_merged_location_requirements := COALESCE(v_canonical_lesson.location_requirements, ARRAY[]::TEXT[]);
    v_merged_cooking_methods := COALESCE(v_canonical_lesson.cooking_methods, ARRAY[]::TEXT[]);
    v_merged_core_competencies := COALESCE(v_canonical_lesson.core_competencies, ARRAY[]::TEXT[]);
    v_merged_cultural_responsiveness_features := COALESCE(v_canonical_lesson.cultural_responsiveness_features, ARRAY[]::TEXT[]);
    v_merged_tags := COALESCE(v_canonical_lesson.tags, ARRAY[]::TEXT[]);
    
    -- Collect metadata from all duplicate lessons
    FOREACH v_duplicate_id IN ARRAY p_duplicate_ids
    LOOP
      SELECT * INTO v_duplicate_lesson
      FROM lessons
      WHERE lesson_id = v_duplicate_id;
      
      IF FOUND THEN
        -- Merge array fields
        v_merged_grade_levels := array(
          SELECT DISTINCT unnest(v_merged_grade_levels || COALESCE(v_duplicate_lesson.grade_levels, ARRAY[]::TEXT[]))
        );
        v_merged_thematic_categories := array(
          SELECT DISTINCT unnest(v_merged_thematic_categories || COALESCE(v_duplicate_lesson.thematic_categories, ARRAY[]::TEXT[]))
        );
        v_merged_season_timing := array(
          SELECT DISTINCT unnest(v_merged_season_timing || COALESCE(v_duplicate_lesson.season_timing, ARRAY[]::TEXT[]))
        );
        v_merged_observances_holidays := array(
          SELECT DISTINCT unnest(v_merged_observances_holidays || COALESCE(v_duplicate_lesson.observances_holidays, ARRAY[]::TEXT[]))
        );
        v_merged_main_ingredients := array(
          SELECT DISTINCT unnest(v_merged_main_ingredients || COALESCE(v_duplicate_lesson.main_ingredients, ARRAY[]::TEXT[]))
        );
        v_merged_garden_skills := array(
          SELECT DISTINCT unnest(v_merged_garden_skills || COALESCE(v_duplicate_lesson.garden_skills, ARRAY[]::TEXT[]))
        );
        v_merged_cooking_skills := array(
          SELECT DISTINCT unnest(v_merged_cooking_skills || COALESCE(v_duplicate_lesson.cooking_skills, ARRAY[]::TEXT[]))
        );
        v_merged_academic_integration := array(
          SELECT DISTINCT unnest(v_merged_academic_integration || COALESCE(v_duplicate_lesson.academic_integration, ARRAY[]::TEXT[]))
        );
        v_merged_social_emotional_learning := array(
          SELECT DISTINCT unnest(v_merged_social_emotional_learning || COALESCE(v_duplicate_lesson.social_emotional_learning, ARRAY[]::TEXT[]))
        );
        v_merged_cultural_heritage := array(
          SELECT DISTINCT unnest(v_merged_cultural_heritage || COALESCE(v_duplicate_lesson.cultural_heritage, ARRAY[]::TEXT[]))
        );
        v_merged_location_requirements := array(
          SELECT DISTINCT unnest(v_merged_location_requirements || COALESCE(v_duplicate_lesson.location_requirements, ARRAY[]::TEXT[]))
        );
        v_merged_cooking_methods := array(
          SELECT DISTINCT unnest(v_merged_cooking_methods || COALESCE(v_duplicate_lesson.cooking_methods, ARRAY[]::TEXT[]))
        );
        v_merged_core_competencies := array(
          SELECT DISTINCT unnest(v_merged_core_competencies || COALESCE(v_duplicate_lesson.core_competencies, ARRAY[]::TEXT[]))
        );
        v_merged_cultural_responsiveness_features := array(
          SELECT DISTINCT unnest(v_merged_cultural_responsiveness_features || COALESCE(v_duplicate_lesson.cultural_responsiveness_features, ARRAY[]::TEXT[]))
        );
        v_merged_tags := array(
          SELECT DISTINCT unnest(v_merged_tags || COALESCE(v_duplicate_lesson.tags, ARRAY[]::TEXT[]))
        );
      END IF;
    END LOOP;
    
    -- Update canonical lesson with merged metadata
    UPDATE lessons SET
      grade_levels = v_merged_grade_levels,
      thematic_categories = v_merged_thematic_categories,
      season_timing = v_merged_season_timing,
      observances_holidays = v_merged_observances_holidays,
      main_ingredients = v_merged_main_ingredients,
      garden_skills = v_merged_garden_skills,
      cooking_skills = v_merged_cooking_skills,
      academic_integration = v_merged_academic_integration,
      social_emotional_learning = v_merged_social_emotional_learning,
      cultural_heritage = v_merged_cultural_heritage,
      location_requirements = v_merged_location_requirements,
      cooking_methods = v_merged_cooking_methods,
      core_competencies = v_merged_core_competencies,
      cultural_responsiveness_features = v_merged_cultural_responsiveness_features,
      tags = v_merged_tags,
      updated_at = NOW()
    WHERE lesson_id = p_canonical_id;
    
    -- Store merged metadata for the resolution record
    v_merged_metadata := jsonb_build_object(
      'grade_levels', to_jsonb(v_merged_grade_levels),
      'thematic_categories', to_jsonb(v_merged_thematic_categories),
      'season_timing', to_jsonb(v_merged_season_timing),
      'observances_holidays', to_jsonb(v_merged_observances_holidays),
      'main_ingredients', to_jsonb(v_merged_main_ingredients),
      'garden_skills', to_jsonb(v_merged_garden_skills),
      'cooking_skills', to_jsonb(v_merged_cooking_skills),
      'academic_integration', to_jsonb(v_merged_academic_integration),
      'social_emotional_learning', to_jsonb(v_merged_social_emotional_learning),
      'cultural_heritage', to_jsonb(v_merged_cultural_heritage),
      'location_requirements', to_jsonb(v_merged_location_requirements),
      'cooking_methods', to_jsonb(v_merged_cooking_methods),
      'core_competencies', to_jsonb(v_merged_core_competencies),
      'cultural_responsiveness_features', to_jsonb(v_merged_cultural_responsiveness_features),
      'tags', to_jsonb(v_merged_tags)
    );
  END IF;
  
  -- Archive duplicate lessons
  FOREACH v_duplicate_id IN ARRAY p_duplicate_ids
  LOOP
    -- Archive the lesson with all its data
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
      -- Granular metadata columns
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
      -- Archive-specific values
      archived_at,
      archived_by,
      archive_reason,
      canonical_id
    )
    SELECT 
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
      -- Granular metadata columns
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
      -- Archive-specific values
      NOW(),
      v_user_id,
      'duplicate_resolution',
      p_canonical_id
    FROM lessons
    WHERE lesson_id = v_duplicate_id;
    
    -- Add to canonical_lessons mapping
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
      v_user_id,
      p_resolution_notes
    );
    
    -- Delete from lessons table
    DELETE FROM lessons WHERE lesson_id = v_duplicate_id;
    
    v_archived_count := v_archived_count + 1;
  END LOOP;
  
  -- Record the resolution
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
    CASE WHEN p_merge_metadata THEN 'merge_and_archive' ELSE 'archive_only' END,
    v_merged_metadata,
    v_user_id,
    p_resolution_notes
  );
  
  -- Return result
  v_result := jsonb_build_object(
    'success', true,
    'canonical_id', p_canonical_id,
    'archived_count', v_archived_count,
    'merge_metadata', p_merge_metadata,
    'metadata_merged', v_merged_metadata
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error result with details
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE,
      'hint', CASE 
        WHEN SQLERRM LIKE '%does not have permission%' THEN 'Ensure user has admin or reviewer role'
        WHEN SQLERRM LIKE '%must be authenticated%' THEN 'User must be logged in'
        WHEN SQLERRM LIKE '%not found%' THEN 'Check that all lesson IDs exist'
        WHEN SQLERRM LIKE '%already archived%' THEN 'One or more lessons are already archived'
        ELSE 'Check input parameters'
      END
    );
END;
$function$;