-- Check if search vectors were generated
SELECT 
    COUNT(*) as total_lessons,
    COUNT(search_vector) as lessons_with_search_vector,
    COUNT(CASE WHEN search_vector IS NULL THEN 1 END) as lessons_without_search_vector
FROM lessons;

-- Check a sample lesson
SELECT 
    lesson_id,
    title,
    length(title) as title_length,
    search_vector IS NOT NULL as has_search_vector,
    search_vector
FROM lessons
LIMIT 5;

-- Test the search function directly
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

-- Check if the trigger exists
SELECT 
    tgname as trigger_name,
    proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON p.oid = t.tgfoid
WHERE tgrelid = 'lessons'::regclass
AND tgname = 'update_lessons_search_vector';

-- If no search vectors, update them manually
-- UPDATE lessons SET updated_at = NOW();