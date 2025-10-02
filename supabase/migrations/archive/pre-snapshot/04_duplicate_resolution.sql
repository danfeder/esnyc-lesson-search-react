-- =====================================================
-- 04. DUPLICATE RESOLUTION - Detection and Management
-- =====================================================
-- This migration consolidates all duplicate detection
-- and resolution functionality

-- =====================================================
-- DUPLICATE PAIRS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS duplicate_pairs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Lesson References
  lesson1_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  lesson2_id UUID NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  
  -- Similarity Metrics
  similarity_score NUMERIC(5,4) NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
  title_similarity NUMERIC(5,4),
  content_similarity NUMERIC(5,4),
  embedding_similarity NUMERIC(5,4),
  
  -- Resolution Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'merged', 'dismissed')),
  resolution_notes TEXT,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  
  -- Analysis Details
  similarity_details JSONB DEFAULT '{}',

  -- Ensure different lessons (inline CHECK constraint is OK)
  CONSTRAINT different_lessons CHECK (lesson1_id != lesson2_id)
);

-- Ensure unique pairs (prevent duplicates like A-B and B-A)
-- Must be a separate index because it uses functions
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_lesson_pair
ON duplicate_pairs (
  LEAST(lesson1_id, lesson2_id),
  GREATEST(lesson1_id, lesson2_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_duplicate_pairs_status ON duplicate_pairs(status);
CREATE INDEX IF NOT EXISTS idx_duplicate_pairs_similarity ON duplicate_pairs(similarity_score DESC);
CREATE INDEX IF NOT EXISTS idx_duplicate_pairs_lesson1 ON duplicate_pairs(lesson1_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_pairs_lesson2 ON duplicate_pairs(lesson2_id);

-- =====================================================
-- DUPLICATE RESOLUTION ARCHIVE TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS duplicate_resolution_archive (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Resolution Details
  duplicate_pair_id UUID NOT NULL,
  primary_lesson_id UUID NOT NULL,
  archived_lesson_id UUID NOT NULL,
  merged_by UUID NOT NULL REFERENCES auth.users(id),
  
  -- Preserved Data
  archived_lesson_data JSONB NOT NULL,
  merge_details JSONB DEFAULT '{}',
  
  -- Metadata
  resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_resolution_archive_primary ON duplicate_resolution_archive(primary_lesson_id);
CREATE INDEX IF NOT EXISTS idx_resolution_archive_archived ON duplicate_resolution_archive(archived_lesson_id);

-- =====================================================
-- DUPLICATE DETECTION FUNCTIONS
-- =====================================================

-- Function to calculate text similarity
CREATE OR REPLACE FUNCTION calculate_text_similarity(text1 TEXT, text2 TEXT)
RETURNS NUMERIC AS $$
BEGIN
  IF text1 IS NULL OR text2 IS NULL THEN
    RETURN 0;
  END IF;
  
  RETURN similarity(lower(text1), lower(text2));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to detect potential duplicates for a lesson
CREATE OR REPLACE FUNCTION find_potential_duplicates(
  p_lesson_id UUID,
  p_threshold NUMERIC DEFAULT 0.7
)
RETURNS TABLE (
  lesson_id UUID,
  title TEXT,
  similarity_score NUMERIC,
  title_similarity NUMERIC,
  content_similarity NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH target_lesson AS (
    SELECT * FROM lessons WHERE id = p_lesson_id
  )
  SELECT 
    l.id as lesson_id,
    l.title,
    -- Overall similarity score (weighted average)
    (
      COALESCE(calculate_text_similarity(t.title, l.title), 0) * 0.4 +
      COALESCE(calculate_text_similarity(t.summary, l.summary), 0) * 0.3 +
      COALESCE(calculate_text_similarity(t.big_idea, l.big_idea), 0) * 0.15 +
      COALESCE(calculate_text_similarity(t.essential_question, l.essential_question), 0) * 0.15
    )::NUMERIC(5,4) as similarity_score,
    calculate_text_similarity(t.title, l.title) as title_similarity,
    calculate_text_similarity(t.summary, l.summary) as content_similarity
  FROM lessons l, target_lesson t
  WHERE l.id != p_lesson_id
    AND (
      calculate_text_similarity(t.title, l.title) > p_threshold
      OR calculate_text_similarity(t.summary, l.summary) > p_threshold
    )
  ORDER BY similarity_score DESC;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DUPLICATE RESOLUTION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION resolve_duplicate_pair(
  p_duplicate_pair_id UUID,
  p_primary_lesson_id UUID,
  p_resolution_notes TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_pair duplicate_pairs;
  v_archived_lesson_id UUID;
  v_archived_lesson lessons;
  v_result JSONB;
BEGIN
  -- Get the duplicate pair
  SELECT * INTO v_pair FROM duplicate_pairs WHERE id = p_duplicate_pair_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Duplicate pair not found';
  END IF;
  
  IF v_pair.status != 'pending' THEN
    RAISE EXCEPTION 'Duplicate pair has already been resolved';
  END IF;
  
  -- Determine which lesson to archive
  IF p_primary_lesson_id = v_pair.lesson1_id THEN
    v_archived_lesson_id := v_pair.lesson2_id;
  ELSIF p_primary_lesson_id = v_pair.lesson2_id THEN
    v_archived_lesson_id := v_pair.lesson1_id;
  ELSE
    RAISE EXCEPTION 'Primary lesson ID must be one of the lessons in the duplicate pair';
  END IF;
  
  -- Get the lesson to be archived
  SELECT * INTO v_archived_lesson FROM lessons WHERE id = v_archived_lesson_id;
  
  -- Archive the duplicate lesson data
  INSERT INTO duplicate_resolution_archive (
    duplicate_pair_id,
    primary_lesson_id,
    archived_lesson_id,
    merged_by,
    archived_lesson_data,
    resolution_notes
  ) VALUES (
    p_duplicate_pair_id,
    p_primary_lesson_id,
    v_archived_lesson_id,
    auth.uid(),
    to_jsonb(v_archived_lesson),
    p_resolution_notes
  );
  
  -- Update the duplicate pair status
  UPDATE duplicate_pairs
  SET 
    status = 'merged',
    resolved_by = auth.uid(),
    resolved_at = NOW(),
    resolution_notes = p_resolution_notes
  WHERE id = p_duplicate_pair_id;
  
  -- Delete the archived lesson
  DELETE FROM lessons WHERE id = v_archived_lesson_id;
  
  -- Return result
  v_result := jsonb_build_object(
    'success', true,
    'primary_lesson_id', p_primary_lesson_id,
    'archived_lesson_id', v_archived_lesson_id,
    'message', 'Duplicate successfully resolved'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- BATCH DUPLICATE DETECTION
-- =====================================================

CREATE OR REPLACE FUNCTION detect_all_duplicates(
  p_threshold NUMERIC DEFAULT 0.7,
  p_limit INTEGER DEFAULT 100
)
RETURNS TABLE (
  lesson1_id UUID,
  lesson1_title TEXT,
  lesson2_id UUID,
  lesson2_title TEXT,
  similarity_score NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH similarity_pairs AS (
    SELECT 
      l1.id as lesson1_id,
      l1.title as lesson1_title,
      l2.id as lesson2_id,
      l2.title as lesson2_title,
      (
        COALESCE(calculate_text_similarity(l1.title, l2.title), 0) * 0.4 +
        COALESCE(calculate_text_similarity(l1.summary, l2.summary), 0) * 0.3 +
        COALESCE(calculate_text_similarity(l1.big_idea, l2.big_idea), 0) * 0.15 +
        COALESCE(calculate_text_similarity(l1.essential_question, l2.essential_question), 0) * 0.15
      )::NUMERIC(5,4) as similarity_score
    FROM lessons l1
    CROSS JOIN lessons l2
    WHERE l1.id < l2.id  -- Ensure we only get each pair once
      AND (
        calculate_text_similarity(l1.title, l2.title) > p_threshold
        OR calculate_text_similarity(l1.summary, l2.summary) > p_threshold
      )
  )
  SELECT * FROM similarity_pairs
  WHERE similarity_score > p_threshold
  ORDER BY similarity_score DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ROLLBACK INSTRUCTIONS (commented for safety)
-- =====================================================
-- To rollback this migration, run the following commands:
-- 
-- -- Drop functions
-- DROP FUNCTION IF EXISTS find_duplicate_lessons(numeric, integer);
-- DROP FUNCTION IF EXISTS calculate_text_similarity(text, text);
-- DROP FUNCTION IF EXISTS find_similar_lessons(uuid, numeric, integer);
-- DROP FUNCTION IF EXISTS merge_duplicate_lessons(uuid, uuid[]);
-- 
-- -- Drop indexes
-- DROP INDEX IF EXISTS idx_duplicate_resolutions_canonical;
-- DROP INDEX IF EXISTS idx_duplicate_resolutions_duplicate;
-- DROP INDEX IF EXISTS idx_submissions_lesson_id;
-- DROP INDEX IF EXISTS idx_submission_similarities_submission;
-- DROP INDEX IF EXISTS idx_lesson_similarities_lesson;
-- 
-- -- Drop tables
-- DROP TABLE IF EXISTS duplicate_resolutions CASCADE;
-- DROP TABLE IF EXISTS submission_similarities CASCADE;
-- DROP TABLE IF EXISTS lesson_similarities CASCADE;
-- 
-- -- Drop columns added to existing tables
-- ALTER TABLE lesson_submissions DROP COLUMN IF EXISTS existing_lesson_id;
-- ALTER TABLE lesson_submissions DROP COLUMN IF EXISTS similarity_score;
-- 
-- =====================================================