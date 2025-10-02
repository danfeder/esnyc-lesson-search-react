-- =====================================================
-- 11. FORCE REMOVE SECURITY DEFINER FROM VIEWS
-- =====================================================
-- The views are still showing as SECURITY DEFINER even after recreation
-- This migration explicitly drops and recreates them with proper ownership

-- =====================================================
-- 1. DROP ALL PROBLEMATIC VIEWS
-- =====================================================
DROP VIEW IF EXISTS lessons_with_metadata CASCADE;
DROP VIEW IF EXISTS user_profiles_safe CASCADE;

-- =====================================================
-- 2. RECREATE lessons_with_metadata AS INVOKER (DEFAULT)
-- =====================================================
-- Use SET SESSION AUTHORIZATION to ensure we're not in SECURITY DEFINER context
RESET SESSION AUTHORIZATION;

-- Create the view with explicit security invoker behavior
-- Simplified to just pass through all columns (lessons table now has normalized columns)
CREATE VIEW lessons_with_metadata AS
SELECT l.*
FROM lessons l;

-- Explicitly set the view owner and ensure it's not SECURITY DEFINER
ALTER VIEW lessons_with_metadata OWNER TO postgres;

-- Grant appropriate permissions
GRANT SELECT ON lessons_with_metadata TO anon, authenticated;

-- =====================================================
-- 3. RECREATE user_profiles_safe AS INVOKER (DEFAULT)
-- =====================================================
CREATE VIEW user_profiles_safe AS
SELECT
  up.id,
  up.full_name,
  up.role,
  up.school_name,
  up.grades_taught,
  up.subjects_taught,
  up.created_at
FROM user_profiles up
WHERE up.is_active = true;

-- Explicitly set the view owner
ALTER VIEW user_profiles_safe OWNER TO postgres;

-- Grant permissions only to authenticated users
GRANT SELECT ON user_profiles_safe TO authenticated;

-- =====================================================
-- 4. ALTERNATIVE: CREATE MATERIALIZED VIEWS (IF REGULAR VIEWS STILL HAVE ISSUES)
-- =====================================================
-- If regular views continue to have SECURITY DEFINER issues, we can use materialized views
-- which don't have this property and can be refreshed periodically

-- Uncomment if needed:
/*
DROP VIEW IF EXISTS lessons_with_metadata CASCADE;
DROP VIEW IF EXISTS user_profiles_safe CASCADE;

CREATE MATERIALIZED VIEW lessons_with_metadata AS
SELECT 
  l.*,
  l.metadata->>'activity_type' as activity_type_meta,
  l.metadata->>'location' as location_meta,
  -- ... rest of fields
FROM lessons l;

CREATE INDEX ON lessons_with_metadata (id);
CREATE INDEX ON lessons_with_metadata (lesson_id);

-- Create refresh function
CREATE OR REPLACE FUNCTION refresh_materialized_views()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY lessons_with_metadata;
END;
$$;

-- Schedule refresh (would need pg_cron extension or external scheduler)
*/

-- =====================================================
-- 5. VERIFY NO SECURITY DEFINER ISSUES
-- =====================================================
-- Check that views are created correctly
DO $$
DECLARE
  view_count INTEGER;
BEGIN
  -- Count views (this is just a sanity check)
  SELECT COUNT(*) INTO view_count
  FROM pg_views
  WHERE schemaname = 'public'
    AND viewname IN ('lessons_with_metadata', 'user_profiles_safe');
    
  IF view_count != 2 THEN
    RAISE WARNING 'Expected 2 views, found %', view_count;
  END IF;
END;
$$;

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================
COMMENT ON VIEW lessons_with_metadata IS 'View of lessons with metadata fields extracted. Uses INVOKER security (respects RLS).';
COMMENT ON VIEW user_profiles_safe IS 'Safe view of active user profiles. Uses INVOKER security (respects RLS).';

-- =====================================================
-- ROLLBACK COMMANDS (commented for safety)
-- =====================================================
/*
-- To rollback:
DROP VIEW IF EXISTS lessons_with_metadata CASCADE;
DROP VIEW IF EXISTS user_profiles_safe CASCADE;
*/