-- Test calling the function with just pagination parameters (like the React app does)
-- This should help us understand if the issue is with partial parameters

-- Test 1: Named parameters (like RPC would use)
SELECT COUNT(*) FROM search_lessons(
    page_size := 20,
    page_offset := 0
);

-- Test 2: What the function sees when we pass just two params
CREATE OR REPLACE FUNCTION debug_search_params(
    search_query TEXT DEFAULT NULL,
    filter_grade_levels TEXT[] DEFAULT NULL,
    page_size INT DEFAULT 20
) RETURNS TABLE (
    param_info TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT format(
        'search_query: %s (is null: %s), filter_grade_levels: %s (is null: %s), page_size: %s',
        search_query,
        search_query IS NULL,
        filter_grade_levels::text,
        filter_grade_levels IS NULL,
        page_size
    );
END;
$$ LANGUAGE plpgsql;

-- Call it different ways
SELECT * FROM debug_search_params();  -- No params
SELECT * FROM debug_search_params(page_size := 10);  -- Just page_size
SELECT * FROM debug_search_params(NULL, NULL, 10);  -- Explicit nulls