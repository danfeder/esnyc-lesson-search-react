-- =====================================================
-- Migration: 20251201_duplicate_detection_revamp.sql
-- =====================================================
-- Description: Add SQL function for duplicate pair detection and table for group dismissals
-- Part of the deduplication revamp (Phase 1)

-- =====================================================
-- TABLE: duplicate_group_dismissals
-- =====================================================
-- Track "Keep All" decisions when a flagged group is dismissed without archiving

CREATE TABLE IF NOT EXISTS duplicate_group_dismissals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_ids TEXT[] NOT NULL,  -- All lesson IDs in the dismissed group
  dismissed_by UUID REFERENCES auth.users(id),
  dismissed_at TIMESTAMPTZ DEFAULT now(),
  detection_method TEXT CHECK (detection_method IN ('same_title', 'embedding', 'both')),
  notes TEXT
);

-- Add comment
COMMENT ON TABLE duplicate_group_dismissals IS 'Track dismissed duplicate groups where admin decided to keep all lessons';

-- Enable RLS
ALTER TABLE duplicate_group_dismissals ENABLE ROW LEVEL SECURITY;

-- RLS Policies - super_admin, admin, and reviewer can read/write
CREATE POLICY "Admins can view dismissed groups"
  ON duplicate_group_dismissals
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'reviewer')
    )
  );

CREATE POLICY "Admins can create dismissed groups"
  ON duplicate_group_dismissals
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('super_admin', 'admin', 'reviewer')
    )
  );

-- =====================================================
-- FUNCTION: find_duplicate_pairs
-- =====================================================
-- Finds all potential duplicate lesson pairs using:
-- 1. Same normalized title (case-insensitive, trimmed)
-- 2. OR embedding similarity >= 0.95

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
          -- High embedding similarity (only if both have embeddings)
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
      ELSE 3
    END,
    p.pair_similarity DESC NULLS LAST;
END;
$$;

COMMENT ON FUNCTION find_duplicate_pairs IS 'Find all potential duplicate lesson pairs based on title matching or embedding similarity >= 0.95';

-- =====================================================
-- FUNCTION: get_lesson_details_for_review
-- =====================================================
-- Get lesson details needed for duplicate review UI

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
  content_preview TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.lesson_id,
    l.title,
    l.summary,
    COALESCE(LENGTH(l.content_text), 0) as content_length,
    l.grade_levels,
    -- Check for table format (indicates lesson_* import with formatting issues)
    COALESCE(l.content_text LIKE '%[Table]%', false) as has_table_format,
    -- Check if summary exists and is not empty
    COALESCE(LENGTH(TRIM(l.summary)) > 0, false) as has_summary,
    l.file_link,
    -- First 200 characters of content
    LEFT(l.content_text, 200) as content_preview
  FROM lessons l
  WHERE l.lesson_id = ANY(p_lesson_ids);
END;
$$;

COMMENT ON FUNCTION get_lesson_details_for_review IS 'Get lesson details needed for the duplicate review UI';

-- =====================================================
-- FUNCTION: check_group_already_resolved
-- =====================================================
-- Check if a set of lesson IDs has already been resolved or dismissed

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
  -- First check duplicate_resolutions (for archived lessons)
  -- The canonical_lesson_id should be one of the lesson_ids
  IF EXISTS (
    SELECT 1 FROM duplicate_resolutions dr
    WHERE dr.canonical_lesson_id = ANY(p_lesson_ids)
  ) THEN
    RETURN QUERY
    SELECT
      true as is_resolved,
      'resolution' as resolution_type,
      MAX(dr.resolved_at) as resolved_at
    FROM duplicate_resolutions dr
    WHERE dr.canonical_lesson_id = ANY(p_lesson_ids);
    RETURN;
  END IF;

  -- Then check duplicate_group_dismissals (for "Keep All" decisions)
  IF EXISTS (
    SELECT 1 FROM duplicate_group_dismissals dgd
    WHERE dgd.lesson_ids @> p_lesson_ids
    AND dgd.lesson_ids <@ p_lesson_ids
  ) THEN
    RETURN QUERY
    SELECT
      true as is_resolved,
      'dismissal' as resolution_type,
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

COMMENT ON FUNCTION check_group_already_resolved IS 'Check if a group of lessons has already been resolved or dismissed';

-- =====================================================
-- INDEX for performance on lesson_ids array lookups
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_duplicate_group_dismissals_lesson_ids
  ON duplicate_group_dismissals USING GIN (lesson_ids);

-- =====================================================
-- ROLLBACK
-- =====================================================
-- DROP INDEX IF EXISTS idx_duplicate_group_dismissals_lesson_ids;
-- DROP FUNCTION IF EXISTS check_group_already_resolved(TEXT[]);
-- DROP FUNCTION IF EXISTS get_lesson_details_for_review(TEXT[]);
-- DROP FUNCTION IF EXISTS find_duplicate_pairs();
-- DROP POLICY IF EXISTS "Admins can create dismissed groups" ON duplicate_group_dismissals;
-- DROP POLICY IF EXISTS "Admins can view dismissed groups" ON duplicate_group_dismissals;
-- DROP TABLE IF EXISTS duplicate_group_dismissals;
