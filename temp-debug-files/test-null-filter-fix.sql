-- Test the NULL filter fix
-- First, let's check if search vectors exist
SELECT 
    COUNT(*) as total,
    COUNT(search_vector) as with_vector
FROM lessons;

-- Test simple query with all NULL parameters
SELECT COUNT(*) FROM search_lessons(
    search_query := NULL,
    filter_grade_levels := NULL,
    filter_themes := NULL,
    filter_seasons := NULL,
    filter_competencies := NULL,
    filter_cultures := NULL,
    filter_location := NULL,
    filter_activity_type := NULL,
    filter_lesson_format := NULL,
    filter_academic := NULL,
    filter_sel := NULL,
    filter_cooking_method := NULL,
    page_size := 20,
    page_offset := 0
);

-- Test the actual query used by the app (with empty arrays converted to NULL)
SELECT * FROM search_lessons(
    search_query := NULL,
    filter_grade_levels := NULL,
    filter_themes := NULL,
    filter_seasons := NULL,
    filter_competencies := NULL,
    filter_cultures := NULL,
    filter_location := NULL,
    filter_activity_type := NULL,
    filter_lesson_format := NULL,
    filter_academic := NULL,
    filter_sel := NULL,
    filter_cooking_method := NULL,
    page_size := 5,
    page_offset := 0
);