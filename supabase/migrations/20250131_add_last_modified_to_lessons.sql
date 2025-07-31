-- Add last_modified column to lessons table if it doesn't exist
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS last_modified TIMESTAMPTZ;

-- Add comment
COMMENT ON COLUMN lessons.last_modified IS 'Last modified date from the original Google Doc';

-- Create an index for sorting by last modified
CREATE INDEX IF NOT EXISTS idx_lessons_last_modified ON lessons(last_modified DESC NULLS LAST);