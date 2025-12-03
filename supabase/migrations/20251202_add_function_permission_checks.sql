-- =====================================================
-- Migration: 20251202_add_function_permission_checks.sql
-- =====================================================
-- Description: Add role-based permission checks to duplicate detection functions
-- These functions use SECURITY DEFINER, so we add explicit role checks
-- to prevent unauthorized access.

-- =====================================================
-- HELPER: Check if user has admin/reviewer role
-- =====================================================
-- Reusable function to check permissions without causing recursion

CREATE OR REPLACE FUNCTION has_duplicate_review_permission()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  jwt_role TEXT;
BEGIN
  -- Get JWT role claim (returns null if not set)
  jwt_role := current_setting('request.jwt.claim.role', true);

  -- Allow service role (used by MCP tools and backend processes)
  IF jwt_role = 'service_role' THEN
    RETURN TRUE;
  END IF;

  -- Allow postgres superuser (used by local MCP and admin tools)
  IF current_user = 'postgres' THEN
    RETURN TRUE;
  END IF;

  -- Check for authenticated user with appropriate role
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid()
    AND role IN ('super_admin', 'admin', 'reviewer')
  );
END;
$$;

COMMENT ON FUNCTION has_duplicate_review_permission IS
'Check if current user has permission to access duplicate review functions';

-- =====================================================
-- UPDATE: find_duplicate_pairs with permission check
-- =====================================================

CREATE OR REPLACE FUNCTION find_duplicate_pairs()
RETURNS TABLE (
  id1 TEXT,
  id2 TEXT,
  title1 TEXT,
  title2 TEXT,
  detection_method TEXT,
  similarity DOUBLE PRECISION
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Permission check
  IF NOT has_duplicate_review_permission() THEN
    RAISE EXCEPTION 'Permission denied: requires admin, reviewer, or super_admin role';
  END IF;

  RETURN QUERY
  WITH pairs AS (
    SELECT
      LEAST(l1.lesson_id, l2.lesson_id) as pair_id1,
      GREATEST(l1.lesson_id, l2.lesson_id) as pair_id2,
      CASE
        WHEN l1.lesson_id < l2.lesson_id THEN l1.title
        ELSE l2.title
      END as pair_title1,
      CASE
        WHEN l1.lesson_id < l2.lesson_id THEN l2.title
        ELSE l1.title
      END as pair_title2,
      CASE
        WHEN LOWER(TRIM(l1.title)) = LOWER(TRIM(l2.title))
             AND l1.content_embedding IS NOT NULL
             AND l2.content_embedding IS NOT NULL
             AND 1 - (l1.content_embedding <=> l2.content_embedding) >= 0.95
        THEN 'both'
        WHEN LOWER(TRIM(l1.title)) = LOWER(TRIM(l2.title))
        THEN 'same_title'
        ELSE 'embedding'
      END as pair_detection_method,
      CASE
        WHEN l1.content_embedding IS NOT NULL AND l2.content_embedding IS NOT NULL
        THEN 1 - (l1.content_embedding <=> l2.content_embedding)
        ELSE NULL
      END as pair_similarity
    FROM lessons l1
    CROSS JOIN lessons l2
    WHERE l1.lesson_id < l2.lesson_id
      AND l1.title != 'Unknown'
      AND l2.title != 'Unknown'
      AND (
        -- Same normalized title
        LOWER(TRIM(l1.title)) = LOWER(TRIM(l2.title))
        OR (
          -- High embedding similarity (>= 0.95)
          l1.content_embedding IS NOT NULL
          AND l2.content_embedding IS NOT NULL
          AND 1 - (l1.content_embedding <=> l2.content_embedding) >= 0.95
        )
      )
  )
  SELECT
    p.pair_id1 as id1,
    p.pair_id2 as id2,
    p.pair_title1 as title1,
    p.pair_title2 as title2,
    p.pair_detection_method as detection_method,
    p.pair_similarity as similarity
  FROM pairs p
  ORDER BY
    CASE p.pair_detection_method
      WHEN 'both' THEN 1
      WHEN 'same_title' THEN 2
      WHEN 'embedding' THEN 3
    END,
    p.pair_similarity DESC NULLS LAST;
END;
$$;

-- =====================================================
-- UPDATE: get_lesson_details_for_review with permission check
-- =====================================================

CREATE OR REPLACE FUNCTION get_lesson_details_for_review(p_lesson_ids TEXT[])
RETURNS TABLE (
  lesson_id TEXT,
  title TEXT,
  summary TEXT,
  content_length INTEGER,
  grade_levels TEXT[],
  has_table_format BOOLEAN,
  has_summary BOOLEAN,
  file_link TEXT,
  content_preview TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Permission check
  IF NOT has_duplicate_review_permission() THEN
    RAISE EXCEPTION 'Permission denied: requires admin, reviewer, or super_admin role';
  END IF;

  RETURN QUERY
  SELECT
    l.lesson_id,
    l.title,
    l.summary,
    COALESCE(LENGTH(l.content_text), 0)::INTEGER as content_length,
    l.grade_levels,
    (l.content_text LIKE '%|%|%')::BOOLEAN as has_table_format,
    (l.summary IS NOT NULL AND l.summary != '')::BOOLEAN as has_summary,
    l.file_link,
    LEFT(l.content_text, 500) as content_preview
  FROM lessons l
  WHERE l.lesson_id = ANY(p_lesson_ids);
END;
$$;

-- =====================================================
-- UPDATE: check_group_already_resolved with permission check
-- =====================================================

CREATE OR REPLACE FUNCTION check_group_already_resolved(p_lesson_ids TEXT[])
RETURNS TABLE (
  is_resolved BOOLEAN,
  resolution_type TEXT,
  resolved_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Permission check
  IF NOT has_duplicate_review_permission() THEN
    RAISE EXCEPTION 'Permission denied: requires admin, reviewer, or super_admin role';
  END IF;

  -- Check duplicate_resolutions first
  IF EXISTS (
    SELECT 1 FROM duplicate_resolutions dr
    WHERE dr.canonical_lesson_id = ANY(p_lesson_ids)
  ) THEN
    RETURN QUERY
    SELECT
      true as is_resolved,
      'archived'::TEXT as resolution_type,
      MAX(dr.created_at) as resolved_at
    FROM duplicate_resolutions dr
    WHERE dr.canonical_lesson_id = ANY(p_lesson_ids);
    RETURN;
  END IF;

  -- Check duplicate_group_dismissals
  IF EXISTS (
    SELECT 1 FROM duplicate_group_dismissals dgd
    WHERE dgd.lesson_ids @> p_lesson_ids
    AND dgd.lesson_ids <@ p_lesson_ids
  ) THEN
    RETURN QUERY
    SELECT
      true as is_resolved,
      'dismissed'::TEXT as resolution_type,
      MAX(dgd.dismissed_at) as resolved_at
    FROM duplicate_group_dismissals dgd
    WHERE dgd.lesson_ids @> p_lesson_ids
    AND dgd.lesson_ids <@ p_lesson_ids;
    RETURN;
  END IF;

  -- Not resolved
  RETURN QUERY SELECT false, NULL::TEXT, NULL::TIMESTAMPTZ;
END;
$$;

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
-- Ensure authenticated users can call these functions
-- (The permission check inside handles authorization)

GRANT EXECUTE ON FUNCTION has_duplicate_review_permission() TO authenticated;
GRANT EXECUTE ON FUNCTION find_duplicate_pairs() TO authenticated;
GRANT EXECUTE ON FUNCTION get_lesson_details_for_review(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION check_group_already_resolved(TEXT[]) TO authenticated;

-- =====================================================
-- ROLLBACK
-- =====================================================
-- To rollback, revert to the original functions from 20251201_duplicate_detection_revamp.sql
-- REVOKE EXECUTE ON FUNCTION has_duplicate_review_permission() FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION find_duplicate_pairs() FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION get_lesson_details_for_review(TEXT[]) FROM authenticated;
-- REVOKE EXECUTE ON FUNCTION check_group_already_resolved(TEXT[]) FROM authenticated;
-- DROP FUNCTION IF EXISTS has_duplicate_review_permission();
-- Then recreate original functions without permission checks
