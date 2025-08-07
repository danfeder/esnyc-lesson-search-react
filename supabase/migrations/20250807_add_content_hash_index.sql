-- Add index on content_hash for faster duplicate detection
-- This significantly improves performance when checking for duplicate lessons

CREATE INDEX IF NOT EXISTS idx_lessons_content_hash 
ON lessons(content_hash) 
WHERE content_hash IS NOT NULL;

-- Also add index on lesson_submissions for duplicate checking
CREATE INDEX IF NOT EXISTS idx_lesson_submissions_content_hash 
ON lesson_submissions(content_hash) 
WHERE content_hash IS NOT NULL;

-- Add index for duplicate resolutions table (the table that actually exists)
CREATE INDEX IF NOT EXISTS idx_duplicate_resolutions_lesson_ids 
ON duplicate_resolutions(lesson_id_1, lesson_id_2);

CREATE INDEX IF NOT EXISTS idx_duplicate_resolutions_status
ON duplicate_resolutions(status)
WHERE status = 'pending';

-- ROLLBACK COMMANDS:
-- DROP INDEX IF EXISTS idx_lessons_content_hash;
-- DROP INDEX IF EXISTS idx_lesson_submissions_content_hash;
-- DROP INDEX IF EXISTS idx_duplicate_resolutions_lesson_ids;
-- DROP INDEX IF EXISTS idx_duplicate_resolutions_status;