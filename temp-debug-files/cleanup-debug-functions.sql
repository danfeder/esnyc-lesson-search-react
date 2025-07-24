-- Check for any debug/test functions we created
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname IN (
    'test_simple_search',
    'debug_search_params',
    'test_minimal_search',
    'search_lessons_debug',
    'debug_param_test'
)
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Drop any debug functions if they exist
DROP FUNCTION IF EXISTS test_simple_search();
DROP FUNCTION IF EXISTS debug_search_params(TEXT, TEXT[], INT);
DROP FUNCTION IF EXISTS test_minimal_search();
DROP FUNCTION IF EXISTS search_lessons_debug(TEXT, TEXT[], INT, INT);
DROP FUNCTION IF EXISTS debug_param_test(TEXT, TEXT[], INT);

-- Check the current state of our main functions
SELECT 
    proname as function_name,
    pronargs as num_args,
    proargtypes::regtype[] as arg_types
FROM pg_proc
WHERE proname IN (
    'search_lessons',
    'expand_search_with_synonyms',
    'expand_cultural_heritage'
)
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
ORDER BY proname;

-- Verify our tables are in good state
SELECT 
    'lessons' as table_name,
    (SELECT COUNT(*) FROM lessons) as row_count
UNION ALL
SELECT 
    'search_synonyms' as table_name,
    (SELECT COUNT(*) FROM search_synonyms) as row_count
UNION ALL
SELECT 
    'cultural_heritage_hierarchy' as table_name,
    (SELECT COUNT(*) FROM cultural_heritage_hierarchy) as row_count;