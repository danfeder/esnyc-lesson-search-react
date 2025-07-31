-- Fix array handling in resolve_duplicate_group function
DROP FUNCTION IF EXISTS resolve_duplicate_group(TEXT, TEXT, TEXT[], TEXT, FLOAT, BOOLEAN, TEXT);

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
  v_archived_count INTEGER := 0;
  v_merged_metadata JSONB := NULL;
  v_duplicate_id TEXT;
  v_canonical_lesson RECORD;
  v_duplicate_lesson RECORD;
  v_merged_grade_levels TEXT[];
  v_merged_thematic_categories TEXT[];
  v_merged_seasons TEXT[];
  v_merged_observances TEXT[];
  v_merged_main_ingredients TEXT[];
  v_merged_garden_skills TEXT[];
  v_merged_cooking_skills TEXT[];
  v_merged_academic_subjects TEXT[];
  v_merged_sel_competencies TEXT[];
  v_merged_cultural_regions TEXT[];
  v_merged_cultural_countries TEXT[];
  v_user_id UUID;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Get canonical lesson data
  SELECT * INTO v_canonical_lesson
  FROM lessons
  WHERE lesson_id = p_canonical_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Canonical lesson % not found', p_canonical_id;
  END IF;
  
  -- If merge_metadata is true, prepare the merged data
  IF p_merge_metadata THEN
    -- Initialize arrays with canonical lesson values (these are already arrays, no casting needed)
    v_merged_grade_levels := COALESCE(v_canonical_lesson.grade_levels, ARRAY[]::TEXT[]);
    v_merged_thematic_categories := COALESCE(v_canonical_lesson.thematic_categories, ARRAY[]::TEXT[]);
    v_merged_seasons := COALESCE(v_canonical_lesson.seasons, ARRAY[]::TEXT[]);
    v_merged_observances := COALESCE(v_canonical_lesson.observances, ARRAY[]::TEXT[]);
    v_merged_main_ingredients := COALESCE(v_canonical_lesson.main_ingredients, ARRAY[]::TEXT[]);
    v_merged_garden_skills := COALESCE(v_canonical_lesson.garden_skills, ARRAY[]::TEXT[]);
    v_merged_cooking_skills := COALESCE(v_canonical_lesson.cooking_skills, ARRAY[]::TEXT[]);
    v_merged_academic_subjects := COALESCE(v_canonical_lesson.academic_subjects, ARRAY[]::TEXT[]);
    v_merged_sel_competencies := COALESCE(v_canonical_lesson.sel_competencies, ARRAY[]::TEXT[]);
    v_merged_cultural_regions := COALESCE(v_canonical_lesson.cultural_regions, ARRAY[]::TEXT[]);
    v_merged_cultural_countries := COALESCE(v_canonical_lesson.cultural_countries, ARRAY[]::TEXT[]);
    
    -- Collect metadata from all duplicate lessons
    FOREACH v_duplicate_id IN ARRAY p_duplicate_ids
    LOOP
      SELECT * INTO v_duplicate_lesson
      FROM lessons
      WHERE lesson_id = v_duplicate_id;
      
      IF FOUND THEN
        -- Merge array fields (no casting needed, they're already arrays)
        v_merged_grade_levels := array(SELECT DISTINCT unnest(v_merged_grade_levels || COALESCE(v_duplicate_lesson.grade_levels, ARRAY[]::TEXT[])));
        v_merged_thematic_categories := array(SELECT DISTINCT unnest(v_merged_thematic_categories || COALESCE(v_duplicate_lesson.thematic_categories, ARRAY[]::TEXT[])));
        v_merged_seasons := array(SELECT DISTINCT unnest(v_merged_seasons || COALESCE(v_duplicate_lesson.seasons, ARRAY[]::TEXT[])));
        v_merged_observances := array(SELECT DISTINCT unnest(v_merged_observances || COALESCE(v_duplicate_lesson.observances, ARRAY[]::TEXT[])));
        v_merged_main_ingredients := array(SELECT DISTINCT unnest(v_merged_main_ingredients || COALESCE(v_duplicate_lesson.main_ingredients, ARRAY[]::TEXT[])));
        v_merged_garden_skills := array(SELECT DISTINCT unnest(v_merged_garden_skills || COALESCE(v_duplicate_lesson.garden_skills, ARRAY[]::TEXT[])));
        v_merged_cooking_skills := array(SELECT DISTINCT unnest(v_merged_cooking_skills || COALESCE(v_duplicate_lesson.cooking_skills, ARRAY[]::TEXT[])));
        v_merged_academic_subjects := array(SELECT DISTINCT unnest(v_merged_academic_subjects || COALESCE(v_duplicate_lesson.academic_subjects, ARRAY[]::TEXT[])));
        v_merged_sel_competencies := array(SELECT DISTINCT unnest(v_merged_sel_competencies || COALESCE(v_duplicate_lesson.sel_competencies, ARRAY[]::TEXT[])));
        v_merged_cultural_regions := array(SELECT DISTINCT unnest(v_merged_cultural_regions || COALESCE(v_duplicate_lesson.cultural_regions, ARRAY[]::TEXT[])));
        v_merged_cultural_countries := array(SELECT DISTINCT unnest(v_merged_cultural_countries || COALESCE(v_duplicate_lesson.cultural_countries, ARRAY[]::TEXT[])));
      END IF;
    END LOOP;
    
    -- Update canonical lesson with merged metadata
    UPDATE lessons SET
      grade_levels = v_merged_grade_levels,
      thematic_categories = v_merged_thematic_categories,
      seasons = v_merged_seasons,
      observances = v_merged_observances,
      main_ingredients = v_merged_main_ingredients,
      garden_skills = v_merged_garden_skills,
      cooking_skills = v_merged_cooking_skills,
      academic_subjects = v_merged_academic_subjects,
      sel_competencies = v_merged_sel_competencies,
      cultural_regions = v_merged_cultural_regions,
      cultural_countries = v_merged_cultural_countries,
      updated_at = NOW()
    WHERE lesson_id = p_canonical_id;
    
    -- Store merged metadata for the resolution record
    v_merged_metadata := jsonb_build_object(
      'grade_levels', to_jsonb(v_merged_grade_levels),
      'thematic_categories', to_jsonb(v_merged_thematic_categories),
      'seasons', to_jsonb(v_merged_seasons),
      'observances', to_jsonb(v_merged_observances),
      'main_ingredients', to_jsonb(v_merged_main_ingredients),
      'garden_skills', to_jsonb(v_merged_garden_skills),
      'cooking_skills', to_jsonb(v_merged_cooking_skills),
      'academic_subjects', to_jsonb(v_merged_academic_subjects),
      'sel_competencies', to_jsonb(v_merged_sel_competencies),
      'cultural_regions', to_jsonb(v_merged_cultural_regions),
      'cultural_countries', to_jsonb(v_merged_cultural_countries)
    );
  END IF;
  
  -- Archive duplicate lessons
  FOREACH v_duplicate_id IN ARRAY p_duplicate_ids
  LOOP
    -- Archive the lesson
    INSERT INTO lesson_archive (
      lesson_id,
      canonical_id,
      archive_reason,
      archived_data,
      archived_by
    )
    SELECT 
      lesson_id,
      p_canonical_id,
      'duplicate_resolution',
      row_to_json(l.*),
      v_user_id
    FROM lessons l
    WHERE l.lesson_id = v_duplicate_id;
    
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
  
  -- Update duplicate group status
  UPDATE duplicate_groups
  SET 
    status = 'resolved',
    resolved_at = NOW(),
    resolved_by = v_user_id
  WHERE group_id = p_group_id;
  
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
    -- Return error result
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;