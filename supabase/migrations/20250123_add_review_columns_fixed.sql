-- First check what columns already exist
-- Run this query first to see current schema:
-- SELECT column_name FROM information_schema.columns WHERE table_name = 'submission_reviews';

-- Add missing columns to submission_reviews table
ALTER TABLE submission_reviews 
ADD COLUMN IF NOT EXISTS decision TEXT CHECK (decision IN ('approve_new', 'approve_update', 'reject', 'needs_revision')),
ADD COLUMN IF NOT EXISTS notes TEXT;

-- If tagged_metadata exists and metadata doesn't, rename it
-- Otherwise, just ensure metadata column exists
DO $$ 
BEGIN
    -- Check if tagged_metadata exists and metadata doesn't
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'submission_reviews' 
        AND column_name = 'tagged_metadata'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'submission_reviews' 
        AND column_name = 'metadata'
    ) THEN
        ALTER TABLE submission_reviews RENAME COLUMN tagged_metadata TO metadata;
    END IF;
END $$;