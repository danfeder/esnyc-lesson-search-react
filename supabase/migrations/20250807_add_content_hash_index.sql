-- Add index on content_hash for faster duplicate detection
-- This significantly improves performance when checking for duplicate lessons

CREATE INDEX IF NOT EXISTS idx_lessons_content_hash 
ON lessons(content_hash) 
WHERE content_hash IS NOT NULL;

-- Also add index on lesson_submissions for duplicate checking
CREATE INDEX IF NOT EXISTS idx_lesson_submissions_content_hash 
ON lesson_submissions(content_hash) 
WHERE content_hash IS NOT NULL;

-- Add indexes for duplicate resolutions table
CREATE INDEX IF NOT EXISTS idx_duplicate_resolutions_group_id 
ON duplicate_resolutions(group_id);

CREATE INDEX IF NOT EXISTS idx_duplicate_resolutions_canonical 
ON duplicate_resolutions(canonical_lesson_id);

-- ROLLBACK COMMANDS:
-- DROP INDEX IF EXISTS idx_lessons_content_hash;
-- DROP INDEX IF EXISTS idx_lesson_submissions_content_hash;
-- DROP INDEX IF EXISTS idx_duplicate_resolutions_group_id;
-- DROP INDEX IF EXISTS idx_duplicate_resolutions_canonical;