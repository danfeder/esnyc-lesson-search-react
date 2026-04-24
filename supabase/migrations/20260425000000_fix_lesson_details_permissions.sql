-- =====================================================
-- Migration: 20260425000000_fix_lesson_details_permissions.sql
-- =====================================================
-- Description: Fix get_lesson_details_for_review. The drop-and-recreate
-- in 20260424_enrich_lesson_details_for_review.sql lost the
-- GRANT EXECUTE to authenticated and bypassed has_duplicate_review_permission()
-- (which carries the service_role + postgres bypass branches needed by
-- MCP test verification and Edge Functions). It also silently reverted
-- the stronger has_table_format / has_summary / content_preview logic
-- introduced in 20251202_add_function_permission_checks.sql.
--
-- This migration:
--   - re-issues GRANT EXECUTE TO authenticated
--   - restores the shared permission helper call (matching 20251202 exactly)
--   - reverts has_table_format to LIKE '%|%|%' (markdown table heuristic)
--   - reverts has_summary to the null-and-nonempty check
--   - restores the 500-char content_preview window
--
-- Naming note: filename uses 20260425000000_ rather than 20260424_…
-- because YYYYMMDD_ files sort AFTER YYYYMMDDHHMMSS_ files in ASCII
-- (underscore > digit), and we need this to run after 20260424_.

CREATE OR REPLACE FUNCTION get_lesson_details_for_review(p_lesson_ids TEXT[])
RETURNS TABLE (
  lesson_id TEXT,
  title TEXT,
  summary TEXT,
  content_length INT,
  grade_levels TEXT[],
  has_table_format BOOLEAN,
  has_summary BOOLEAN,
  file_link TEXT,
  content_preview TEXT,
  activity_type TEXT[],
  thematic_categories TEXT[],
  season_timing TEXT[],
  cultural_heritage TEXT[],
  core_competencies TEXT[],
  lesson_format TEXT,
  updated_at TIMESTAMPTZ,
  teacher_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Permission check (shared helper allows service_role + postgres bypass)
  IF NOT has_duplicate_review_permission() THEN
    RAISE EXCEPTION 'Permission denied: requires admin, reviewer, or super_admin role';
  END IF;

  RETURN QUERY
  SELECT
    l.lesson_id,
    l.title,
    l.summary,
    COALESCE(LENGTH(l.content_text), 0)::INTEGER AS content_length,
    l.grade_levels,
    (l.content_text LIKE '%|%|%')::BOOLEAN AS has_table_format,
    (l.summary IS NOT NULL AND l.summary != '')::BOOLEAN AS has_summary,
    l.file_link,
    LEFT(l.content_text, 500) AS content_preview,
    l.activity_type,
    l.thematic_categories,
    l.season_timing,
    l.cultural_heritage,
    l.core_competencies,
    l.lesson_format,
    l.updated_at,
    up.full_name AS teacher_name
  FROM lessons l
  LEFT JOIN lesson_submissions s ON s.id = l.original_submission_id
  LEFT JOIN user_profiles up ON up.id = s.teacher_id
  WHERE l.lesson_id = ANY(p_lesson_ids);
END;
$$;

GRANT EXECUTE ON FUNCTION get_lesson_details_for_review(TEXT[]) TO authenticated;

COMMENT ON FUNCTION get_lesson_details_for_review IS
  'Get lesson details needed for the duplicate review UI (metadata facets + submitter + updated_at). Permission-gated via has_duplicate_review_permission().';

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- Rolling back THIS migration restores the 20260424 body, which
-- re-introduces the B1 (no GRANT) + B2 (no service_role/postgres bypass)
-- regression. For a full rollback to the 20251202 state, also follow the
-- rollback in 20251202_add_function_permission_checks.sql.
--
-- CREATE OR REPLACE FUNCTION get_lesson_details_for_review(p_lesson_ids TEXT[])
-- RETURNS TABLE (
--   lesson_id TEXT, title TEXT, summary TEXT, content_length INT,
--   grade_levels TEXT[], has_table_format BOOLEAN, has_summary BOOLEAN,
--   file_link TEXT, content_preview TEXT, activity_type TEXT[],
--   thematic_categories TEXT[], season_timing TEXT[], cultural_heritage TEXT[],
--   core_competencies TEXT[], lesson_format TEXT, updated_at TIMESTAMPTZ,
--   teacher_name TEXT
-- ) LANGUAGE plpgsql SECURITY DEFINER AS $$
-- BEGIN
--   IF NOT EXISTS (
--     SELECT 1 FROM user_profiles
--     WHERE id = auth.uid()
--       AND role IN ('admin', 'super_admin', 'reviewer')
--   ) THEN
--     RAISE EXCEPTION 'Permission denied: admin or reviewer role required';
--   END IF;
--   RETURN QUERY
--   SELECT
--     l.lesson_id, l.title, l.summary,
--     COALESCE(LENGTH(l.content_text), 0) AS content_length,
--     l.grade_levels,
--     COALESCE(l.content_text LIKE '%[Table]%', false) AS has_table_format,
--     COALESCE(LENGTH(TRIM(l.summary)) > 0, false) AS has_summary,
--     l.file_link, LEFT(l.content_text, 200) AS content_preview,
--     l.activity_type, l.thematic_categories, l.season_timing,
--     l.cultural_heritage, l.core_competencies, l.lesson_format,
--     l.updated_at, up.full_name AS teacher_name
--   FROM lessons l
--   LEFT JOIN lesson_submissions s ON s.id = l.original_submission_id
--   LEFT JOIN user_profiles up ON up.id = s.teacher_id
--   WHERE l.lesson_id = ANY(p_lesson_ids);
-- END;
-- $$;
-- (No need to REVOKE — the new GRANT here is idempotent and matches 20251202.)
