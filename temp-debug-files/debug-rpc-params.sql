-- Create a simple debug function to understand parameter passing
CREATE OR REPLACE FUNCTION debug_param_test(
    param1 TEXT DEFAULT NULL,
    param2 TEXT[] DEFAULT NULL,
    param3 INT DEFAULT 20
) RETURNS TABLE (
    p1_value TEXT,
    p1_is_null BOOLEAN,
    p2_value TEXT[],
    p2_is_null BOOLEAN,
    p2_length INT,
    p3_value INT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        param1,
        param1 IS NULL,
        param2,
        param2 IS NULL,
        array_length(param2, 1),
        param3;
END;
$$ LANGUAGE plpgsql;

-- Test 1: No parameters (should use defaults)
SELECT * FROM debug_param_test();

-- Test 2: Only last parameter (what happens to others?)
SELECT * FROM debug_param_test(param3 := 10);

-- Test 3: Explicit nulls
SELECT * FROM debug_param_test(NULL, NULL, 10);

-- Now let's create a minimal version of search_lessons to debug
CREATE OR REPLACE FUNCTION search_lessons_debug(
    search_query TEXT DEFAULT NULL,
    filter_grade_levels TEXT[] DEFAULT NULL,
    page_size INT DEFAULT 20,
    page_offset INT DEFAULT 0
) RETURNS TABLE (
    debug_info TEXT,
    lesson_count BIGINT
) AS $$
DECLARE
    total_results BIGINT;
BEGIN
    -- Count with explicit NULL checks
    SELECT COUNT(*) INTO total_results
    FROM lessons l
    WHERE 
        (search_query IS NULL) 
        AND (filter_grade_levels IS NULL);
    
    RETURN QUERY
    SELECT 
        format('search_query is null: %s, filter is null: %s, page_size: %s', 
               search_query IS NULL, 
               filter_grade_levels IS NULL,
               page_size),
        total_results;
END;
$$ LANGUAGE plpgsql;

-- Test the debug function
SELECT * FROM search_lessons_debug();
SELECT * FROM search_lessons_debug(NULL, NULL, 20, 0);
SELECT * FROM search_lessons_debug(page_size := 20, page_offset := 0);