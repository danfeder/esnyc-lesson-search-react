-- Check which tables have RLS enabled
SELECT 
  tablename,
  rowsecurity,
  CASE 
    WHEN rowsecurity THEN '✅ RLS Enabled'
    ELSE '❌ RLS Disabled'
  END as status
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'user_invitations', 'user_management_audit')
ORDER BY tablename;

-- Enable RLS on any tables that don't have it
-- (This is safe to run even if RLS is already enabled)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_management_audit ENABLE ROW LEVEL SECURITY;

-- Verify RLS is now enabled on all tables
SELECT 
  'RLS Status After Fix' as check_name,
  COUNT(*) as tables_with_rls,
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ All tables have RLS enabled'
    ELSE '❌ Some tables still missing RLS'
  END as status
FROM pg_tables 
WHERE tablename IN ('user_profiles', 'user_invitations', 'user_management_audit')
  AND rowsecurity = true;