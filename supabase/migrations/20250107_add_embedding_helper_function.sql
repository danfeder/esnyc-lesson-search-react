-- Migration: Add helper function to get embedding as text for verification
-- This function allows us to compare embedding values before and after migration

CREATE OR REPLACE FUNCTION get_embedding_as_text(lesson_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
BEGIN
  SELECT content_embedding::text INTO result
  FROM lessons
  WHERE lesson_id = lesson_id_param;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated and anon users
GRANT EXECUTE ON FUNCTION get_embedding_as_text(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_embedding_as_text(UUID) TO anon;