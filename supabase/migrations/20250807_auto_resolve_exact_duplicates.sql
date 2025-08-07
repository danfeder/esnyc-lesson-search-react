-- Function to automatically resolve exact duplicate groups
-- Selects the best canonical lesson based on:
-- 1. Highest canonical score
-- 2. If tied, highest completeness score  
-- 3. If still tied, most recent (last_modified date)

CREATE OR REPLACE FUNCTION public.auto_resolve_exact_duplicates(
  p_dry_run BOOLEAN DEFAULT TRUE,
  p_group_ids TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  group_id TEXT,
  duplicate_type TEXT,
  lessons_in_group INT,
  selected_canonical_id TEXT,
  selected_canonical_title TEXT,
  canonical_score NUMERIC,
  completeness_score NUMERIC,
  last_modified TIMESTAMP,
  duplicate_ids TEXT[],
  action_taken TEXT,
  reason TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_group RECORD;
  v_best_lesson RECORD;
  v_duplicate_ids TEXT[];
  v_resolution_result JSONB;
  v_user_id UUID;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Validate user has appropriate role
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles 
    WHERE id = v_user_id 
    AND role IN ('admin', 'reviewer')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'User does not have permission to auto-resolve duplicates';
  END IF;

  -- Load duplicate groups from JSON report
  -- Filter to only exact matches that haven't been resolved yet
  FOR v_group IN 
    WITH duplicate_groups AS (
      -- Parse the duplicate analysis JSON report
      SELECT 
        (group_data->>'groupId')::TEXT as group_id,
        (group_data->>'type')::TEXT as type,
        (group_data->>'similarityScore')::NUMERIC as similarity_score,
        jsonb_array_elements(group_data->'lessons') as lesson_data
      FROM (
        SELECT jsonb_array_elements(report_data->'groups') as group_data
        FROM (
          -- This would normally load from the JSON file
          -- For now, we'll use a placeholder that returns empty
          SELECT '{}'::jsonb as report_data
        ) t
      ) g
      WHERE (group_data->>'type') = 'exact'
        AND (p_group_ids IS NULL OR (group_data->>'groupId') = ANY(p_group_ids))
    ),
    grouped_lessons AS (
      SELECT 
        dg.group_id,
        dg.type,
        dg.similarity_score,
        COUNT(*) as lesson_count,
        array_agg(lesson_data->>'lessonId') as lesson_ids,
        array_agg(lesson_data) as lessons_data
      FROM duplicate_groups dg
      GROUP BY dg.group_id, dg.type, dg.similarity_score
    ),
    unresolved_groups AS (
      SELECT gl.*
      FROM grouped_lessons gl
      WHERE NOT EXISTS (
        SELECT 1 FROM duplicate_resolutions dr
        WHERE dr.group_id = gl.group_id
      )
    )
    SELECT * FROM unresolved_groups
  LOOP
    -- For each lesson in the group, get the full data from the database
    WITH lesson_scores AS (
      SELECT 
        l.lesson_id,
        l.title,
        l.last_modified,
        -- Calculate canonical score (0-1 scale)
        COALESCE(
          (
            -- Weighted average of different factors
            (CASE 
              WHEN l.last_modified IS NOT NULL THEN
                -- Recency score (0-1, newer is better)
                GREATEST(0, 1 - (EXTRACT(EPOCH FROM (NOW() - l.last_modified)) / (365 * 24 * 60 * 60))::NUMERIC / 5)
              ELSE 0.5
            END) * 0.15 +
            
            -- Completeness score (metadata fields)
            (CASE
              WHEN l.grade_levels IS NOT NULL AND array_length(l.grade_levels, 1) > 0 THEN 0.1 ELSE 0 END +
              CASE WHEN l.thematic_categories IS NOT NULL AND array_length(l.thematic_categories, 1) > 0 THEN 0.1 ELSE 0 END +
              CASE WHEN l.summary IS NOT NULL AND length(l.summary) > 10 THEN 0.1 ELSE 0 END +
              CASE WHEN l.main_ingredients IS NOT NULL AND array_length(l.main_ingredients, 1) > 0 THEN 0.1 ELSE 0 END +
              CASE WHEN l.cultural_heritage IS NOT NULL AND array_length(l.cultural_heritage, 1) > 0 THEN 0.1 ELSE 0 END +
              CASE WHEN l.season_timing IS NOT NULL AND array_length(l.season_timing, 1) > 0 THEN 0.1 ELSE 0 END +
              CASE WHEN l.academic_integration IS NOT NULL AND array_length(l.academic_integration, 1) > 0 THEN 0.1 ELSE 0 END +
              CASE WHEN l.social_emotional_learning IS NOT NULL AND array_length(l.social_emotional_learning, 1) > 0 THEN 0.1 ELSE 0 END +
              CASE WHEN l.content_text IS NOT NULL AND length(l.content_text) > 100 THEN 0.2 ELSE 0 END
            ) * 0.20 +
            
            -- Content quality indicators
            (CASE
              WHEN l.content_text IS NOT NULL THEN
                CASE 
                  WHEN l.content_text ~* 'objective|goal|learning' THEN 0.2
                  ELSE 0.1
                END
              ELSE 0
            END) * 0.35 +
            
            -- Has structured data
            (CASE WHEN l.metadata IS NOT NULL AND l.metadata != '{}'::jsonb THEN 0.2 ELSE 0 END) * 0.15 +
            
            -- Has processing notes (indicates it was reviewed)
            (CASE WHEN l.processing_notes IS NOT NULL THEN 0.1 ELSE 0 END) * 0.10 +
            
            -- File naming quality (not starting with random ID)
            (CASE 
              WHEN l.title !~ '^[0-9]' AND l.title !~ '^[A-Z0-9]{20,}' THEN 0.1 
              ELSE 0 
            END) * 0.05
          ), 0
        ) as canonical_score,
        
        -- Calculate completeness score separately (0-1 scale)
        (
          CASE WHEN l.grade_levels IS NOT NULL AND array_length(l.grade_levels, 1) > 0 THEN 1 ELSE 0 END +
          CASE WHEN l.thematic_categories IS NOT NULL AND array_length(l.thematic_categories, 1) > 0 THEN 1 ELSE 0 END +
          CASE WHEN l.summary IS NOT NULL AND length(l.summary) > 10 THEN 1 ELSE 0 END +
          CASE WHEN l.main_ingredients IS NOT NULL AND array_length(l.main_ingredients, 1) > 0 THEN 1 ELSE 0 END +
          CASE WHEN l.cultural_heritage IS NOT NULL AND array_length(l.cultural_heritage, 1) > 0 THEN 1 ELSE 0 END +
          CASE WHEN l.season_timing IS NOT NULL AND array_length(l.season_timing, 1) > 0 THEN 1 ELSE 0 END +
          CASE WHEN l.academic_integration IS NOT NULL AND array_length(l.academic_integration, 1) > 0 THEN 1 ELSE 0 END +
          CASE WHEN l.social_emotional_learning IS NOT NULL AND array_length(l.social_emotional_learning, 1) > 0 THEN 1 ELSE 0 END +
          CASE WHEN l.cooking_methods IS NOT NULL AND array_length(l.cooking_methods, 1) > 0 THEN 1 ELSE 0 END +
          CASE WHEN l.core_competencies IS NOT NULL AND array_length(l.core_competencies, 1) > 0 THEN 1 ELSE 0 END +
          CASE WHEN l.content_text IS NOT NULL AND length(l.content_text) > 100 THEN 1 ELSE 0 END
        )::NUMERIC / 11 as completeness_score
        
      FROM lessons l
      WHERE l.lesson_id = ANY(v_group.lesson_ids)
    )
    SELECT INTO v_best_lesson
      lesson_id,
      title,
      canonical_score,
      completeness_score,
      last_modified
    FROM lesson_scores
    ORDER BY 
      canonical_score DESC,
      completeness_score DESC,
      last_modified DESC NULLS LAST,
      lesson_id ASC  -- Tiebreaker for consistency
    LIMIT 1;
    
    -- Get the duplicate IDs (all except the canonical)
    SELECT array_agg(lesson_id) INTO v_duplicate_ids
    FROM unnest(v_group.lesson_ids) AS lesson_id
    WHERE lesson_id != v_best_lesson.lesson_id;
    
    -- Return the resolution decision
    RETURN QUERY
    SELECT 
      v_group.group_id,
      v_group.type,
      v_group.lesson_count::INT,
      v_best_lesson.lesson_id,
      v_best_lesson.title,
      v_best_lesson.canonical_score,
      v_best_lesson.completeness_score,
      v_best_lesson.last_modified,
      v_duplicate_ids,
      CASE 
        WHEN p_dry_run THEN 'DRY_RUN - Would resolve'
        ELSE 'RESOLVED'
      END,
      format('Selected based on canonical_score=%.3f, completeness=%.3f, modified=%s',
        v_best_lesson.canonical_score,
        v_best_lesson.completeness_score,
        COALESCE(v_best_lesson.last_modified::TEXT, 'unknown')
      );
    
    -- If not a dry run, actually resolve the duplicates
    IF NOT p_dry_run AND v_duplicate_ids IS NOT NULL AND array_length(v_duplicate_ids, 1) > 0 THEN
      -- Call the existing resolve_duplicate_group function
      SELECT resolve_duplicate_group(
        p_group_id := v_group.group_id,
        p_canonical_id := v_best_lesson.lesson_id,
        p_duplicate_ids := v_duplicate_ids,
        p_duplicate_type := v_group.type,
        p_similarity_score := v_group.similarity_score,
        p_merge_metadata := true,
        p_resolution_notes := format(
          'Auto-resolved exact duplicate. Selected %s (canonical_score=%.3f, completeness=%.3f) as canonical from %s total lessons',
          v_best_lesson.lesson_id,
          v_best_lesson.canonical_score,
          v_best_lesson.completeness_score,
          v_group.lesson_count
        )
      ) INTO v_resolution_result;
      
      -- Log if resolution failed
      IF v_resolution_result->>'success' != 'true' THEN
        RAISE WARNING 'Failed to auto-resolve group %: %', 
          v_group.group_id, 
          v_resolution_result->>'error';
      END IF;
    END IF;
    
  END LOOP;
  
  RETURN;
END;
$function$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.auto_resolve_exact_duplicates TO authenticated;

-- Add helpful comment
COMMENT ON FUNCTION public.auto_resolve_exact_duplicates IS 
'Automatically resolves exact duplicate groups by selecting the best canonical lesson based on scores.
Parameters:
- p_dry_run: If TRUE, only returns what would be done without making changes (default: TRUE)
- p_group_ids: Optional array of specific group IDs to process (default: NULL processes all)

Selection criteria:
1. Highest canonical score (weighted combination of recency, completeness, quality)
2. If tied, highest completeness score (percentage of metadata fields filled)
3. If still tied, most recent last_modified date
4. If still tied, lexicographically first lesson_id for consistency

Example usage:
-- Dry run to see what would be resolved
SELECT * FROM auto_resolve_exact_duplicates(true);

-- Actually resolve all exact duplicates
SELECT * FROM auto_resolve_exact_duplicates(false);

-- Resolve specific groups only
SELECT * FROM auto_resolve_exact_duplicates(false, ARRAY[''exact_1'', ''exact_2'']);';