-- Test 1: Direct count
SELECT COUNT(*) as lesson_count FROM lessons;

-- Test 2: Simple function without filters
CREATE OR REPLACE FUNCTION test_simple_search()
RETURNS TABLE (
    lesson_id TEXT,
    title TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT l.lesson_id, l.title
    FROM lessons l
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Run the test
SELECT * FROM test_simple_search();

-- Test 3: Check what the main function sees
SELECT COUNT(*) FROM lessons l
WHERE 
    -- All these conditions should be true when filters are NULL
    (NULL IS NULL OR l.grade_levels && NULL::text[])
    AND (NULL IS NULL OR EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'thematicCategories') t WHERE t = ANY(NULL::text[])))
    AND true;  -- Should return all lessons

-- Clean up
DROP FUNCTION IF EXISTS test_simple_search();