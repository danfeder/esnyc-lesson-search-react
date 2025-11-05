-- =====================================================
-- 09. FIX ALL RLS SECURITY ISSUES
-- =====================================================
-- This migration fixes ALL RLS issues reported by Supabase Security Advisor
-- Addresses tables that have policies but RLS not enabled
-- And tables that have no RLS at all

-- =====================================================
-- 0. ENSURE HELPER FUNCTIONS EXIST
-- =====================================================
-- These functions are needed for RLS policies to work

-- Function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id
    AND role IN ('admin', 'super_admin')
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user has a specific role
CREATE OR REPLACE FUNCTION has_role(user_id UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = user_id AND is_active = true;
  
  -- Role hierarchy: super_admin > admin > reviewer > teacher
  RETURN CASE
    WHEN required_role = 'teacher' THEN user_role IS NOT NULL
    WHEN required_role = 'reviewer' THEN user_role IN ('reviewer', 'admin', 'super_admin')
    WHEN required_role = 'admin' THEN user_role IN ('admin', 'super_admin')
    WHEN required_role = 'super_admin' THEN user_role = 'super_admin'
    ELSE false
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 1. FIX TABLES WITH POLICIES BUT RLS DISABLED
-- =====================================================
-- These tables already have policies defined but RLS is not enabled

-- Enable RLS on lessons (has policies but RLS disabled)
ALTER TABLE lessons ENABLE ROW LEVEL SECURITY;

-- Enable RLS on lesson_submissions (has policies but RLS disabled)  
ALTER TABLE lesson_submissions ENABLE ROW LEVEL SECURITY;

-- Enable RLS on submission_reviews (has policies but RLS disabled)
ALTER TABLE submission_reviews ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 2. ENABLE RLS ON TABLES WITHOUT ANY PROTECTION
-- =====================================================

-- Note: Commented out tables that don't exist in active migrations
-- (They were in archived migrations from 20250123)

-- Enable RLS on search_synonyms
-- ALTER TABLE search_synonyms ENABLE ROW LEVEL SECURITY;

-- Enable RLS on cultural_heritage_hierarchy
-- ALTER TABLE cultural_heritage_hierarchy ENABLE ROW LEVEL SECURITY;

-- Enable RLS on lesson_archive
-- ALTER TABLE lesson_archive ENABLE ROW LEVEL SECURITY;

-- Enable RLS on canonical_lessons
-- ALTER TABLE canonical_lessons ENABLE ROW LEVEL SECURITY;

-- Enable RLS on duplicate_resolutions (this one exists)
ALTER TABLE duplicate_resolutions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. ADD POLICIES FOR NEWLY PROTECTED TABLES
-- =====================================================

-- SEARCH_SYNONYMS POLICIES (COMMENTED - TABLE DOESN'T EXIST)
-- Public read-only access (synonyms are public configuration)
-- CREATE POLICY "Public can view synonyms" ON search_synonyms
--   FOR SELECT
--   USING (true);

-- Only admins can manage synonyms
-- CREATE POLICY "Admins can insert synonyms" ON search_synonyms
--   FOR INSERT
--   WITH CHECK (is_admin(auth.uid()));

-- CREATE POLICY "Admins can update synonyms" ON search_synonyms
--   FOR UPDATE
--   USING (is_admin(auth.uid()))
--   WITH CHECK (is_admin(auth.uid()));

-- CREATE POLICY "Admins can delete synonyms" ON search_synonyms
--   FOR DELETE
--   USING (is_admin(auth.uid()));

-- CULTURAL_HERITAGE_HIERARCHY POLICIES (COMMENTED - TABLE DOESN'T EXIST)
-- Public read-only access (hierarchy is public configuration)
-- CREATE POLICY "Public can view cultural hierarchy" ON cultural_heritage_hierarchy
--   FOR SELECT
--   USING (true);

-- Only admins can manage hierarchy
-- CREATE POLICY "Admins can insert hierarchy" ON cultural_heritage_hierarchy
--   FOR INSERT
--   WITH CHECK (is_admin(auth.uid()));

-- CREATE POLICY "Admins can update hierarchy" ON cultural_heritage_hierarchy
--   FOR UPDATE
--   USING (is_admin(auth.uid()))
--   WITH CHECK (is_admin(auth.uid()));

-- CREATE POLICY "Admins can delete hierarchy" ON cultural_heritage_hierarchy
--   FOR DELETE
--   USING (is_admin(auth.uid()));

-- LESSON_ARCHIVE POLICIES (COMMENTED - TABLE DOESN'T EXIST)
-- Only admins can view archived lessons
-- CREATE POLICY "Admins can view lesson archive" ON lesson_archive
--   FOR SELECT
--   USING (is_admin(auth.uid()));

-- System/admin operations only
-- CREATE POLICY "Admins can insert to archive" ON lesson_archive
--   FOR INSERT
--   WITH CHECK (is_admin(auth.uid()));

-- Archive should be immutable - no updates
-- No update policy

-- Only super admins can delete from archive
-- CREATE POLICY "Super admins can delete from archive" ON lesson_archive
--   FOR DELETE
--   USING (
--     EXISTS (
--       SELECT 1 FROM user_profiles
--       WHERE id = auth.uid()
--       AND role = 'super_admin'
--     )
--   );

-- CANONICAL_LESSONS POLICIES (COMMENTED - TABLE DOESN'T EXIST)
-- Public can view canonical lessons
-- CREATE POLICY "Public can view canonical lessons" ON canonical_lessons
--   FOR SELECT
--   USING (true);

-- Only admins can manage canonical lessons
-- CREATE POLICY "Admins can insert canonical lessons" ON canonical_lessons
--   FOR INSERT
--   WITH CHECK (is_admin(auth.uid()));

-- CREATE POLICY "Admins can update canonical lessons" ON canonical_lessons
--   FOR UPDATE
--   USING (is_admin(auth.uid()))
--   WITH CHECK (is_admin(auth.uid()));

-- CREATE POLICY "Admins can delete canonical lessons" ON canonical_lessons
--   FOR DELETE
--   USING (is_admin(auth.uid()));

-- DUPLICATE_RESOLUTIONS POLICIES
-- Reviewers can view resolutions
CREATE POLICY "Reviewers can view duplicate resolutions" ON duplicate_resolutions
  FOR SELECT
  USING (has_role(auth.uid(), 'reviewer'));

-- Only admins can create resolutions
CREATE POLICY "Admins can insert resolutions" ON duplicate_resolutions
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

-- Only admins can update resolutions
CREATE POLICY "Admins can update resolutions" ON duplicate_resolutions
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Resolutions should not be deleted, only archived
-- No delete policy

-- =====================================================
-- 4. FIX SECURITY DEFINER VIEWS
-- =====================================================
-- Views with SECURITY DEFINER bypass RLS which is dangerous

-- Drop and recreate lessons_with_metadata view without SECURITY DEFINER
DROP VIEW IF EXISTS lessons_with_metadata CASCADE;

CREATE VIEW lessons_with_metadata AS
SELECT
  l.*
  -- Note: Removed metadata extractions because lessons table now has normalized columns
  -- for all filterable fields. The l.* wildcard already includes everything needed.
  -- metadata JSONB is still accessible via l.metadata for any remaining legacy fields.
FROM lessons l;

-- Grant appropriate permissions
GRANT SELECT ON lessons_with_metadata TO anon, authenticated;

-- Drop and recreate user_profiles_with_email view without SECURITY DEFINER
DROP VIEW IF EXISTS user_profiles_with_email CASCADE;

CREATE VIEW user_profiles_with_email AS
SELECT 
  up.*,
  au.email as auth_email,
  au.created_at as auth_created_at,
  au.last_sign_in_at
FROM user_profiles up
LEFT JOIN auth.users au ON up.id = au.id;

-- This view will now respect RLS policies on user_profiles
-- Only admins should be able to see all profiles with emails
GRANT SELECT ON user_profiles_with_email TO authenticated;

-- =====================================================
-- 5. VERIFY ALL TABLES NOW HAVE RLS
-- =====================================================
-- Create or replace the test function to verify our fixes

CREATE OR REPLACE FUNCTION verify_rls_enabled()
RETURNS TABLE(
  table_name TEXT,
  rls_enabled BOOLEAN,
  policy_count INTEGER,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH table_policies AS (
    SELECT 
      t.schemaname,
      t.tablename,
      t.rowsecurity,
      COUNT(pol.polname) as pol_count
    FROM pg_tables t
    LEFT JOIN pg_policies pol ON pol.schemaname = t.schemaname AND pol.tablename = t.tablename
    WHERE t.schemaname = 'public'
      AND t.tablename NOT IN ('schema_migrations', 'spatial_ref_sys')
    GROUP BY t.schemaname, t.tablename, t.rowsecurity
  )
  SELECT 
    schemaname || '.' || tablename,
    rowsecurity,
    pol_count::INTEGER,
    CASE 
      WHEN NOT rowsecurity THEN 'ERROR: RLS DISABLED'
      WHEN pol_count = 0 THEN 'WARNING: No policies'
      ELSE 'OK'
    END as status
  FROM table_policies
  ORDER BY 
    CASE 
      WHEN NOT rowsecurity THEN 1
      WHEN pol_count = 0 THEN 2
      ELSE 3
    END,
    tablename;
END;
$$;

-- Grant execute to authenticated users for testing
GRANT EXECUTE ON FUNCTION verify_rls_enabled() TO authenticated;

-- =====================================================
-- 6. ADD COMMENTS FOR DOCUMENTATION
-- =====================================================

-- COMMENT ON TABLE search_synonyms IS 'Search synonym configuration for improving search results';
-- COMMENT ON TABLE cultural_heritage_hierarchy IS 'Hierarchical structure of cultural heritage categories';
-- COMMENT ON TABLE lesson_archive IS 'Archive of deleted or replaced lessons for audit trail';
-- COMMENT ON TABLE canonical_lessons IS 'Canonical version of lessons after duplicate resolution';
COMMENT ON TABLE duplicate_resolutions IS 'Record of duplicate resolution decisions';

-- =====================================================
-- ROLLBACK COMMANDS (commented for safety)
-- =====================================================
/*
-- Rollback RLS enablement (DANGEROUS - only for testing)
ALTER TABLE search_synonyms DISABLE ROW LEVEL SECURITY;
ALTER TABLE cultural_heritage_hierarchy DISABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_archive DISABLE ROW LEVEL SECURITY;
ALTER TABLE canonical_lessons DISABLE ROW LEVEL SECURITY;
ALTER TABLE duplicate_resolutions DISABLE ROW LEVEL SECURITY;

-- Drop new policies
DROP POLICY IF EXISTS "Public can view synonyms" ON search_synonyms;
DROP POLICY IF EXISTS "Admins can insert synonyms" ON search_synonyms;
DROP POLICY IF EXISTS "Admins can update synonyms" ON search_synonyms;
DROP POLICY IF EXISTS "Admins can delete synonyms" ON search_synonyms;

DROP POLICY IF EXISTS "Public can view cultural hierarchy" ON cultural_heritage_hierarchy;
DROP POLICY IF EXISTS "Admins can insert hierarchy" ON cultural_heritage_hierarchy;
DROP POLICY IF EXISTS "Admins can update hierarchy" ON cultural_heritage_hierarchy;
DROP POLICY IF EXISTS "Admins can delete hierarchy" ON cultural_heritage_hierarchy;

DROP POLICY IF EXISTS "Admins can view lesson archive" ON lesson_archive;
DROP POLICY IF EXISTS "Admins can insert to archive" ON lesson_archive;
DROP POLICY IF EXISTS "Super admins can delete from archive" ON lesson_archive;

DROP POLICY IF EXISTS "Public can view canonical lessons" ON canonical_lessons;
DROP POLICY IF EXISTS "Admins can insert canonical lessons" ON canonical_lessons;
DROP POLICY IF EXISTS "Admins can update canonical lessons" ON canonical_lessons;
DROP POLICY IF EXISTS "Admins can delete canonical lessons" ON canonical_lessons;

DROP POLICY IF EXISTS "Reviewers can view duplicate resolutions" ON duplicate_resolutions;
DROP POLICY IF EXISTS "Admins can insert resolutions" ON duplicate_resolutions;
DROP POLICY IF EXISTS "Admins can update resolutions" ON duplicate_resolutions;

-- Drop verification function
DROP FUNCTION IF EXISTS verify_rls_enabled();

-- Recreate views with SECURITY DEFINER (not recommended)
DROP VIEW IF EXISTS lessons_with_metadata CASCADE;
DROP VIEW IF EXISTS user_profiles_with_email CASCADE;

-- Would need to recreate with SECURITY DEFINER here
*/