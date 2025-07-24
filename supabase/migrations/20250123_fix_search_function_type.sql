-- Fix type mismatch in search_lessons function
-- Change REAL to DOUBLE PRECISION for the rank column

DROP FUNCTION IF EXISTS search_lessons;

CREATE OR REPLACE FUNCTION search_lessons(
    search_query TEXT DEFAULT NULL,
    filter_grade_levels TEXT[] DEFAULT NULL,
    filter_themes TEXT[] DEFAULT NULL,
    filter_seasons TEXT[] DEFAULT NULL,
    filter_competencies TEXT[] DEFAULT NULL,
    filter_cultures TEXT[] DEFAULT NULL,
    filter_location TEXT[] DEFAULT NULL,
    filter_activity_type TEXT[] DEFAULT NULL,
    filter_lesson_format TEXT DEFAULT NULL,
    filter_academic TEXT[] DEFAULT NULL,
    filter_sel TEXT[] DEFAULT NULL,
    filter_cooking_method TEXT DEFAULT NULL,
    page_size INT DEFAULT 20,
    page_offset INT DEFAULT 0
) RETURNS TABLE (
    lesson_id TEXT,
    title TEXT,
    summary TEXT,
    file_link TEXT,
    grade_levels TEXT[],
    metadata JSONB,
    confidence JSONB,
    rank DOUBLE PRECISION,  -- Changed from REAL to DOUBLE PRECISION
    total_count BIGINT
) AS $$
DECLARE
    expanded_query TEXT;
    expanded_cultures TEXT[];
    base_query TEXT;
    count_query TEXT;
    total_results BIGINT;
BEGIN
    -- Expand query with synonyms
    IF search_query IS NOT NULL AND search_query != '' THEN
        expanded_query := expand_search_with_synonyms(search_query);
    END IF;
    
    -- Expand cultural heritage if needed
    IF filter_cultures IS NOT NULL THEN
        expanded_cultures := expand_cultural_heritage(filter_cultures);
    END IF;
    
    -- Count total results first
    SELECT COUNT(*) INTO total_results
    FROM lessons l
    WHERE 
        -- Text search or no search query
        (expanded_query IS NULL OR expanded_query = '' OR 
         l.search_vector @@ to_tsquery('english', expanded_query) OR
         -- Fallback to trigram search for better typo tolerance
         l.title % search_query OR l.summary % search_query)
        -- Grade levels filter
        AND (filter_grade_levels IS NULL OR l.grade_levels && filter_grade_levels)
        -- Thematic categories filter
        AND (filter_themes IS NULL OR 
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'thematicCategories') t 
                     WHERE t = ANY(filter_themes)))
        -- Season filter
        AND (filter_seasons IS NULL OR 
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'seasonTiming') s 
                     WHERE s = ANY(filter_seasons)))
        -- Core competencies filter
        AND (filter_competencies IS NULL OR 
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'coreCompetencies') c 
                     WHERE c = ANY(filter_competencies)))
        -- Cultural heritage filter (with hierarchy expansion)
        AND (expanded_cultures IS NULL OR 
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'culturalHeritage') c 
                     WHERE c = ANY(expanded_cultures)))
        -- Location filter
        AND (filter_location IS NULL OR 
             l.metadata->>'locationRequirements' = ANY(filter_location))
        -- Activity type filter
        AND (filter_activity_type IS NULL OR 
             l.metadata->>'activityType' = ANY(filter_activity_type))
        -- Lesson format filter
        AND (filter_lesson_format IS NULL OR 
             l.metadata->>'lessonFormat' = filter_lesson_format)
        -- Academic integration filter
        AND (filter_academic IS NULL OR 
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'academicIntegration'->'selected') a 
                     WHERE a = ANY(filter_academic)))
        -- SEL filter
        AND (filter_sel IS NULL OR 
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'socialEmotionalLearning') s 
                     WHERE s = ANY(filter_sel)))
        -- Cooking method filter
        AND (filter_cooking_method IS NULL OR 
             l.metadata->>'cookingMethods' = filter_cooking_method);
    
    -- Return results with pagination
    RETURN QUERY
    SELECT 
        l.lesson_id,
        l.title,
        l.summary,
        l.file_link,
        l.grade_levels,
        l.metadata,
        l.confidence,
        CASE 
            WHEN expanded_query IS NOT NULL AND expanded_query != '' THEN
                GREATEST(
                    ts_rank(l.search_vector, to_tsquery('english', expanded_query)),
                    similarity(l.title, search_query),
                    similarity(l.summary, search_query) * 0.8
                )::double precision
            ELSE 0::double precision
        END as rank,
        total_results
    FROM lessons l
    WHERE 
        -- Same WHERE conditions as count query
        (expanded_query IS NULL OR expanded_query = '' OR 
         l.search_vector @@ to_tsquery('english', expanded_query) OR
         l.title % search_query OR l.summary % search_query)
        AND (filter_grade_levels IS NULL OR l.grade_levels && filter_grade_levels)
        AND (filter_themes IS NULL OR 
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'thematicCategories') t 
                     WHERE t = ANY(filter_themes)))
        AND (filter_seasons IS NULL OR 
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'seasonTiming') s 
                     WHERE s = ANY(filter_seasons)))
        AND (filter_competencies IS NULL OR 
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'coreCompetencies') c 
                     WHERE c = ANY(filter_competencies)))
        AND (expanded_cultures IS NULL OR 
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'culturalHeritage') c 
                     WHERE c = ANY(expanded_cultures)))
        AND (filter_location IS NULL OR 
             l.metadata->>'locationRequirements' = ANY(filter_location))
        AND (filter_activity_type IS NULL OR 
             l.metadata->>'activityType' = ANY(filter_activity_type))
        AND (filter_lesson_format IS NULL OR 
             l.metadata->>'lessonFormat' = filter_lesson_format)
        AND (filter_academic IS NULL OR 
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'academicIntegration'->'selected') a 
                     WHERE a = ANY(filter_academic)))
        AND (filter_sel IS NULL OR 
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'socialEmotionalLearning') s 
                     WHERE s = ANY(filter_sel)))
        AND (filter_cooking_method IS NULL OR 
             l.metadata->>'cookingMethods' = filter_cooking_method)
    ORDER BY 
        rank DESC,
        COALESCE((l.confidence->>'overall')::float, 0) DESC,
        l.title ASC
    LIMIT page_size
    OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION search_lessons(TEXT, TEXT[], TEXT[], TEXT[], TEXT[], TEXT[], TEXT[], TEXT[], TEXT, TEXT[], TEXT[], TEXT, INT, INT) TO authenticated;