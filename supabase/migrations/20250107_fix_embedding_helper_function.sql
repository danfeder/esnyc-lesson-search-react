-- Fix: Update helper function to accept text lesson_id instead of UUID

DROP FUNCTION IF EXISTS get_embedding_as_text(UUID);

CREATE OR REPLACE FUNCTION get_embedding_as_text(lesson_id_param TEXT)
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
GRANT EXECUTE ON FUNCTION get_embedding_as_text(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_embedding_as_text(TEXT) TO anon;