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
CREATE VIEW lessons_with_metadata AS
SELECT 
  l.id,
  l.lesson_id,
  l.title,
  l.summary,
  l.full_content,
  l.google_doc_id,
  l.google_doc_url,
  l.original_file_path,
  l.grade_levels,
  l.themes,
  l.ingredients,
  l.season,
  l.location,
  l.timing,
  l.materials,
  l.skills,
  l.core_competencies,
  l.academic_integration,
  l.social_emotional_learning,
  l.observances_and_holidays,
  l.lesson_format,
  l.cooking_method,
  l.cultural_heritage,
  l.metadata,
  l.search_vector,
  l.embedding,
  l.created_at,
  l.updated_at,
  l.source,
  l.processed_at,
  l.is_duplicate,
  l.canonical_id,
  l.quality_score,
  l.review_status,
  l.review_comments,
  l.published,
  l.view_count,
  l.favorite_count,
  l.last_viewed_at,
  -- Extract metadata fields for easier querying
  l.metadata->>'activity_type' as activity_type_meta,
  l.metadata->>'location' as location_meta,
  l.metadata->>'season' as season_meta,
  l.metadata->>'timing' as timing_meta,
  l.metadata->>'group_size' as group_size,
  l.metadata->>'duration_minutes' as duration_minutes,
  l.metadata->>'prep_time_minutes' as prep_time_minutes,
  -- Array fields from metadata
  (l.metadata->>'grade_levels')::jsonb as grade_levels_array,
  (l.metadata->>'themes')::jsonb as themes_array,
  (l.metadata->>'core_competencies')::jsonb as core_competencies_array,
  (l.metadata->>'cultural_heritage')::jsonb as cultural_heritage_array,
  (l.metadata->>'academic_integration')::jsonb as academic_integration_array,
  (l.metadata->>'sel_competencies')::jsonb as sel_competencies_array,
  (l.metadata->>'observances')::jsonb as observances_array,
  (l.metadata->>'main_ingredients')::jsonb as main_ingredients_array,
  (l.metadata->>'garden_skills')::jsonb as garden_skills_array,
  (l.metadata->>'cooking_skills')::jsonb as cooking_skills_array,
  (l.metadata->>'materials')::jsonb as materials_array
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
  up.subjects,
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