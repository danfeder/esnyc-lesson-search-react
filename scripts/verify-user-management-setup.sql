-- Verification script for user management system setup
-- Run this in Supabase SQL Editor to check if all migrations were successful

-- 1. Check enhanced user_profiles columns
SELECT 
  'user_profiles columns' as check_name,
  COUNT(*) as columns_found,
  CASE 
    WHEN COUNT(*) >= 10 THEN '✅ PASS'
    ELSE '❌ FAIL - Missing columns'
  END as status
FROM information_schema.columns 
WHERE table_name = 'user_profiles' 
  AND column_name IN (
    'invited_by', 'invited_at', 'accepted_at', 'is_active', 
    'school_name', 'school_borough', 'grades_taught', 
    'subjects_taught', 'notes', 'permissions'
  );

-- 2. Check user_invitations table exists
SELECT 
  'user_invitations table' as check_name,
  COUNT(*) as found,
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ PASS'
    ELSE '❌ FAIL - Table not found'
  END as status
FROM information_schema.tables 
WHERE table_name = 'user_invitations';

-- 3. Check user_management_audit table exists
SELECT 
  'user_management_audit table' as check_name,
  COUNT(*) as found,
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ PASS'
    ELSE '❌ FAIL - Table not found'
  END as status
FROM information_schema.tables 
WHERE table_name = 'user_management_audit';

-- 4. Check indexes on user_profiles
SELECT 
  'user_profiles indexes' as check_name,
  COUNT(*) as indexes_found,
  CASE 
    WHEN COUNT(*) >= 3 THEN '✅ PASS'
    ELSE '❌ FAIL - Missing indexes'
  END as status
FROM pg_indexes 
WHERE tablename = 'user_profiles' 
  AND indexname IN (
    'idx_user_profiles_role', 
    'idx_user_profiles_is_active',
    'idx_user_profiles_school_borough'
  );

-- 5. Check unique constraint on invitations
SELECT 
  'unique_pending_invitation index' as check_name,
  COUNT(*) as found,
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ PASS'
    ELSE '❌ FAIL - Unique constraint not found'
  END as status
FROM pg_indexes 
WHERE indexname = 'unique_pending_invitation_per_email';

-- 6. Check RLS is enabled
SELECT 
  'RLS enabled on tables' as check_name,
  COUNT(*) as tables_with_rls,
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ PASS'
    ELSE '❌ FAIL - RLS not enabled on all tables'
  END as status
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'user_invitations', 'user_management_audit')
  AND rowsecurity = true;

-- 7. Check RLS policies exist
SELECT 
  'RLS policies' as check_name,
  COUNT(*) as policies_found,
  CASE 
    WHEN COUNT(*) >= 8 THEN '✅ PASS'
    ELSE '❌ FAIL - Missing RLS policies'
  END as status
FROM pg_policies 
WHERE tablename IN ('user_profiles', 'user_invitations', 'user_management_audit');

-- 8. Check trigger exists
SELECT 
  'audit trigger' as check_name,
  COUNT(*) as found,
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ PASS'
    ELSE '❌ FAIL - Audit trigger not found'
  END as status
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_log_user_profile_changes';

-- 9. Check function exists
SELECT 
  'validate_invitation_token function' as check_name,
  COUNT(*) as found,
  CASE 
    WHEN COUNT(*) = 1 THEN '✅ PASS'
    ELSE '❌ FAIL - Function not found'
  END as status
FROM information_schema.routines 
WHERE routine_name = 'validate_invitation_token';

-- 10. Summary of all checks
WITH check_summary AS (
  SELECT 
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_name = 'user_profiles' 
     AND column_name IN ('invited_by', 'invited_at', 'accepted_at', 'is_active', 
                         'school_name', 'school_borough', 'grades_taught', 
                         'subjects_taught', 'notes', 'permissions')) as profile_columns,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'user_invitations') as invitations_table,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'user_management_audit') as audit_table,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'user_profiles' 
     AND indexname IN ('idx_user_profiles_role', 'idx_user_profiles_is_active', 'idx_user_profiles_school_borough')) as profile_indexes,
    (SELECT COUNT(*) FROM pg_indexes WHERE indexname = 'unique_pending_invitation_per_email') as unique_index,
    (SELECT COUNT(*) FROM pg_tables WHERE tablename IN ('user_profiles', 'user_invitations', 'user_management_audit') 
     AND rowsecurity = true) as rls_enabled,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename IN ('user_profiles', 'user_invitations', 'user_management_audit')) as policies,
    (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_name = 'trigger_log_user_profile_changes') as trigger_exists,
    (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = 'validate_invitation_token') as function_exists
)
SELECT 
  'OVERALL SUMMARY' as check_name,
  CASE 
    WHEN profile_columns >= 10 
     AND invitations_table = 1 
     AND audit_table = 1 
     AND profile_indexes >= 3 
     AND unique_index = 1 
     AND rls_enabled = 3 
     AND policies >= 8 
     AND trigger_exists = 1 
     AND function_exists = 1
    THEN '🎉 ALL CHECKS PASSED!'
    ELSE '⚠️  Some checks failed - see details above'
  END as status,
  CONCAT(
    'Tables: ', invitations_table + audit_table, '/2, ',
    'Columns: ', profile_columns, '/10, ',
    'RLS: ', rls_enabled, '/3, ',
    'Policies: ', policies, '/8+'
  ) as details
FROM check_summary;