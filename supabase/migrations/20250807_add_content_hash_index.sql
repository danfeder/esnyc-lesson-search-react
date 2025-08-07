-- Indexes for content_hash and duplicate detection performance
-- Note: Most of these indexes already exist, but we're using IF NOT EXISTS for safety

-- The idx_lessons_hash index already exists on lessons(content_hash)
-- But let's ensure it has the optimal configuration
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'lessons' 
    AND indexname = 'idx_lessons_hash'
  ) THEN
    CREATE INDEX idx_lessons_hash 
    ON lessons(content_hash) 
    WHERE content_hash IS NOT NULL;
  END IF;
END $$;

-- The idx_submissions_hash index already exists on lesson_submissions(content_hash)
-- Ensure it exists with proper configuration
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' 
    AND tablename = 'lesson_submissions' 
    AND indexname = 'idx_submissions_hash'
  ) THEN
    CREATE INDEX idx_submissions_hash 
    ON lesson_submissions(content_hash)
    WHERE content_hash IS NOT NULL;
  END IF;
END $$;

-- The duplicate_resolutions indexes already exist:
-- - idx_resolution_group on group_id
-- - idx_resolution_canonical on canonical_lesson_id
-- These are already optimal, so no action needed

-- Create a composite index for duplicate detection queries if it doesn't exist
CREATE INDEX IF NOT EXISTS idx_lessons_hash_id 
ON lessons(content_hash, lesson_id) 
WHERE content_hash IS NOT NULL;

-- ROLLBACK COMMANDS:
-- DROP INDEX IF EXISTS idx_lessons_hash_id;