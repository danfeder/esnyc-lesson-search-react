-- Check if the anon role has permission to execute the function
SELECT 
    p.proname as function_name,
    pg_catalog.has_function_privilege('anon', p.oid, 'EXECUTE') as anon_can_execute,
    pg_catalog.has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_can_execute
FROM pg_proc p
WHERE p.proname = 'search_lessons';

-- Check if anon role can read lessons table
SELECT 
    has_table_privilege('anon', 'lessons', 'SELECT') as anon_can_select,
    has_table_privilege('authenticated', 'lessons', 'SELECT') as auth_can_select;

-- Check RLS policies on lessons table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'lessons';

-- Check if RLS is enabled
SELECT 
    relname,
    relrowsecurity
FROM pg_class
WHERE relname = 'lessons';