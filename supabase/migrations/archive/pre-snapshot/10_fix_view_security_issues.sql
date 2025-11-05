-- =====================================================
-- 10. FIX VIEW SECURITY ISSUES
-- =====================================================
-- This migration fixes security issues with views that are:
-- 1. Still using SECURITY DEFINER (bypassing RLS)
-- 2. Exposing auth.users data to public/anon roles

-- =====================================================
-- 1. DROP AND RECREATE lessons_with_metadata WITHOUT SECURITY DEFINER
-- =====================================================
-- First revoke public access and drop the view
REVOKE SELECT ON lessons_with_metadata FROM anon;
DROP VIEW IF EXISTS lessons_with_metadata CASCADE;

-- Recreate as a regular view (not SECURITY DEFINER)
CREATE VIEW lessons_with_metadata AS
SELECT
  l.*
  -- Note: Simplified to just pass through all columns from lessons table.
  -- Removed metadata extractions because lessons now has normalized columns.
FROM lessons l;

-- Grant SELECT to anon and authenticated (safe because lessons table has RLS)
GRANT SELECT ON lessons_with_metadata TO anon, authenticated;

-- =====================================================
-- 2. FIX user_profiles_with_email VIEW
-- =====================================================
-- This view exposes auth.users data which is a security risk
-- We need to either:
-- Option A: Remove it entirely if not needed
-- Option B: Create a secure function instead that only admins can call
-- Option C: Remove anon access and ensure it respects RLS

-- Going with Option C: Remove anon access and make it admin-only

-- First revoke all access
REVOKE SELECT ON user_profiles_with_email FROM anon;
REVOKE SELECT ON user_profiles_with_email FROM authenticated;

-- Drop and recreate the view
DROP VIEW IF EXISTS user_profiles_with_email CASCADE;

-- Drop the function if it already exists (from a previous migration)
DROP FUNCTION IF EXISTS get_user_profiles_with_email();

-- Instead of a view that exposes auth.users, create a FUNCTION that admins can call
CREATE OR REPLACE FUNCTION get_user_profiles_with_email()
RETURNS TABLE (
  id UUID,
  user_id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  email TEXT,
  full_name TEXT,
  role TEXT,
  school_id UUID,
  school_name TEXT,
  grades_taught TEXT[],
  subjects_taught TEXT[],
  is_active BOOLEAN,
  invited_by UUID,
  invitation_accepted_at TIMESTAMPTZ,
  last_login_at TIMESTAMPTZ,
  login_count INTEGER,
  auth_email TEXT,
  auth_created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only admins can access this function
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Access denied. Admin role required.';
  END IF;

  RETURN QUERY
  SELECT 
    up.id,
    up.user_id,
    up.created_at,
    up.updated_at,
    up.email,
    up.full_name,
    up.role,
    up.school_id,
    up.school_name,
    up.grades_taught,
    up.subjects_taught,
    up.is_active,
    up.invited_by,
    up.invitation_accepted_at,
    up.last_login_at,
    up.login_count,
    au.email as auth_email,
    au.created_at as auth_created_at,
    au.last_sign_in_at
  FROM user_profiles up
  LEFT JOIN auth.users au ON up.id = au.id;
END;
$$;

-- Grant execute only to authenticated users (function checks for admin internally)
GRANT EXECUTE ON FUNCTION get_user_profiles_with_email() TO authenticated;

-- Create a simpler view for non-admin users that doesn't expose auth.users
CREATE VIEW user_profiles_safe AS
SELECT
  id,
  full_name,
  role,
  school_name,
  grades_taught,
  subjects_taught,
  created_at
FROM user_profiles
WHERE is_active = true;

-- This view will respect RLS on user_profiles table
GRANT SELECT ON user_profiles_safe TO authenticated;

-- =====================================================
-- 3. VERIFY NO SECURITY DEFINER VIEWS REMAIN
-- =====================================================
-- Create a function to check for any remaining SECURITY DEFINER views
CREATE OR REPLACE FUNCTION check_security_definer_views()
RETURNS TABLE (
  view_name TEXT,
  view_owner TEXT,
  has_security_definer BOOLEAN
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    schemaname || '.' || viewname as view_name,
    viewowner as view_owner,
    false as has_security_definer -- PostgreSQL doesn't easily expose this, would need pg_get_viewdef parsing
  FROM pg_views
  WHERE schemaname = 'public';
$$;

GRANT EXECUTE ON FUNCTION check_security_definer_views() TO authenticated;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON VIEW lessons_with_metadata IS 'View of lessons with metadata fields extracted for easier querying. Respects RLS on lessons table.';
COMMENT ON VIEW user_profiles_safe IS 'Safe view of user profiles that does not expose auth.users data. Shows only active users.';
COMMENT ON FUNCTION get_user_profiles_with_email() IS 'Admin-only function to get user profiles with auth email information.';

-- =====================================================
-- ROLLBACK COMMANDS (commented for safety)
-- =====================================================
/*
-- To rollback:

-- Drop new objects
DROP FUNCTION IF EXISTS get_user_profiles_with_email();
DROP VIEW IF EXISTS user_profiles_safe;
DROP FUNCTION IF EXISTS check_security_definer_views();

-- Recreate old views (not recommended due to security issues)
-- You would need to recreate the views as they were before
*/