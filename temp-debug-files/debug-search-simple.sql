-- 1. Check if search vectors were generated
SELECT 
    COUNT(*) as total_lessons,
    COUNT(search_vector) as lessons_with_search_vector,
    COUNT(CASE WHEN search_vector IS NULL THEN 1 END) as lessons_without_search_vector
FROM lessons;

-- 2. Check if lessons exist at all
SELECT COUNT(*) as total_count FROM lessons;

-- 3. Check a sample lesson
SELECT 
    lesson_id,
    title,
    search_vector IS NOT NULL as has_search_vector
FROM lessons
LIMIT 5;

-- 4. Test the search function with minimal parameters
SELECT COUNT(*) FROM search_lessons();

-- 5. If the above returns 0, let's check what's happening in the function
-- Try a direct query without the function
SELECT COUNT(*) 
FROM lessons l
WHERE true;  -- No filters, should return all lessons