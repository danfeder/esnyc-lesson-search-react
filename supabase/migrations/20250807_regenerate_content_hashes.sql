-- Regenerate content hashes using actual content_text instead of metadata
-- This fixes the bug where hashes were based on metadata only

-- Create function to generate content hash from text
-- This matches the logic in the edge functions and scripts
CREATE OR REPLACE FUNCTION generate_content_hash(content TEXT)
RETURNS TEXT AS $$
BEGIN
  IF content IS NOT NULL AND LENGTH(TRIM(content)) > 0 THEN
    -- Normalize content: lowercase, single spaces, trim
    -- Use SHA256 hash encoded as hex
    RETURN encode(
      sha256(
        LOWER(
          REGEXP_REPLACE(TRIM(content), '\s+', ' ', 'g')
        )::bytea
      ), 
      'hex'
    );
  ELSE
    -- Return NULL for empty content (will be handled separately)
    RETURN NULL;
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Regenerate all content hashes
-- This will update all 832 lessons with proper content-based hashes
UPDATE lessons
SET content_hash = generate_content_hash(content_text)
WHERE content_text IS NOT NULL 
  AND LENGTH(TRIM(content_text)) > 0;

-- For any lessons without content (shouldn't be any), mark with META_ prefix
UPDATE lessons
SET content_hash = 'META_' || content_hash
WHERE (content_text IS NULL OR LENGTH(TRIM(content_text)) = 0)
  AND content_hash IS NOT NULL
  AND NOT content_hash LIKE 'META_%';

-- Verify the update
DO $$
DECLARE
  total_count INTEGER;
  updated_count INTEGER;
  meta_count INTEGER;
  duplicate_groups INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_count FROM lessons;
  SELECT COUNT(*) INTO updated_count FROM lessons WHERE content_hash IS NOT NULL;
  SELECT COUNT(*) INTO meta_count FROM lessons WHERE content_hash LIKE 'META_%';
  
  -- Count duplicate groups
  SELECT COUNT(*) INTO duplicate_groups
  FROM (
    SELECT content_hash
    FROM lessons
    WHERE content_hash IS NOT NULL
    GROUP BY content_hash
    HAVING COUNT(*) > 1
  ) t;
  
  RAISE NOTICE 'Content hash regeneration complete:';
  RAISE NOTICE '  Total lessons: %', total_count;
  RAISE NOTICE '  Lessons with new hashes: %', updated_count;
  RAISE NOTICE '  Metadata-only hashes: %', meta_count;
  RAISE NOTICE '  Duplicate hash groups: %', duplicate_groups;
END $$;

-- Add comment for documentation
COMMENT ON FUNCTION generate_content_hash(TEXT) IS 
  'Generates SHA256 hash from normalized content text. 
   Part of fix for hash generation bug where hashes were based on metadata only.
   Created in fix/content-hash-generation branch.';

-- Create index to improve hash lookup performance
DROP INDEX IF EXISTS idx_lessons_content_hash;
CREATE INDEX idx_lessons_content_hash ON lessons(content_hash) 
WHERE content_hash IS NOT NULL;