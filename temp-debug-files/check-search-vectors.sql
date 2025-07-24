-- Check if search vectors exist
SELECT 
    COUNT(*) as total_lessons,
    COUNT(search_vector) as lessons_with_vector,
    COUNT(CASE WHEN search_vector IS NULL THEN 1 END) as lessons_without_vector
FROM lessons;

-- Check a few examples
SELECT 
    lesson_id,
    title,
    search_vector IS NOT NULL as has_vector,
    metadata IS NOT NULL as has_metadata,
    grade_levels IS NOT NULL as has_grades
FROM lessons
LIMIT 5;

-- Check if the trigger exists and is working
SELECT 
    tgname as trigger_name,
    tgenabled as is_enabled
FROM pg_trigger
WHERE tgrelid = 'lessons'::regclass
AND tgname = 'update_lessons_search_vector';

-- If search vectors are missing, update them manually
-- This will trigger the search vector generation
UPDATE lessons 
SET updated_at = NOW()
WHERE search_vector IS NULL;

-- Check again after update
SELECT 
    COUNT(*) as total_lessons,
    COUNT(search_vector) as lessons_with_vector
FROM lessons;