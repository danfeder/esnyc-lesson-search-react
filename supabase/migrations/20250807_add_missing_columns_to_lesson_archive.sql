-- Add missing columns to lesson_archive table to match lessons table structure
-- This ensures we can properly archive all lesson data without losing information

ALTER TABLE lesson_archive
ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS has_versions BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS original_submission_id UUID,
ADD COLUMN IF NOT EXISTS activity_type TEXT;

-- Add comments to explain the columns
COMMENT ON COLUMN lesson_archive.version_number IS 'Version number of the lesson if it has multiple versions';
COMMENT ON COLUMN lesson_archive.has_versions IS 'Whether this lesson has multiple versions';
COMMENT ON COLUMN lesson_archive.original_submission_id IS 'ID of the original submission this lesson came from';
COMMENT ON COLUMN lesson_archive.activity_type IS 'Type of activity (e.g., garden, cooking, classroom)';

-- Add a new column for script/system archival tracking
ALTER TABLE lesson_archive
ADD COLUMN IF NOT EXISTS archived_by_system TEXT;

COMMENT ON COLUMN lesson_archive.archived_by_system IS 'System or script that performed the archival (e.g., auto-resolution-script)';