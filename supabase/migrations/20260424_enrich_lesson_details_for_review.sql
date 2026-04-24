-- =====================================================
-- Migration: 20260424_enrich_lesson_details_for_review.sql
-- =====================================================
-- Description: Extend get_lesson_details_for_review to return metadata
-- facets (activity_type, thematic_categories, season_timing,
-- cultural_heritage, core_competencies, lesson_format) plus lesson
-- updated_at and a derived teacher_name (via original_submission_id).
-- These fields are used by the Phase 4 Group C duplicate-review UI:
--   - spec card "Submitted by" + "Updated" rows
--   - metadata comparison diff table
--
-- The permission-check overlay from 20251202_add_function_permission_checks
-- still guards this SECURITY DEFINER function.
--
-- Note: DROP FUNCTION first is required because the RETURNS TABLE signature
-- changes (PostgreSQL: "cannot change return type of existing function" when
-- using CREATE OR REPLACE with a different column list).

DROP FUNCTION IF EXISTS get_lesson_details_for_review(TEXT[]);

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
  -- Permission check: admins/reviewers/super_admins only
  IF NOT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin', 'reviewer')
  ) THEN
    RAISE EXCEPTION 'Permission denied: admin or reviewer role required';
  END IF;

  RETURN QUERY
  SELECT
    l.lesson_id,
    l.title,
    l.summary,
    COALESCE(LENGTH(l.content_text), 0) AS content_length,
    l.grade_levels,
    COALESCE(l.content_text LIKE '%[Table]%', false) AS has_table_format,
    COALESCE(LENGTH(TRIM(l.summary)) > 0, false) AS has_summary,
    l.file_link,
    LEFT(l.content_text, 200) AS content_preview,
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

COMMENT ON FUNCTION get_lesson_details_for_review IS
  'Get lesson details needed for the duplicate review UI (metadata facets + submitter + updated_at)';

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- CREATE OR REPLACE FUNCTION get_lesson_details_for_review(p_lesson_ids TEXT[])
-- RETURNS TABLE (
--   lesson_id TEXT, title TEXT, summary TEXT, content_length INT,
--   grade_levels TEXT[], has_table_format BOOLEAN, has_summary BOOLEAN,
--   file_link TEXT, content_preview TEXT
-- )
-- LANGUAGE plpgsql SECURITY DEFINER AS $$ ... (restore original body) $$;
