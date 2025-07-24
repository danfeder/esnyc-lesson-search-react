-- Add missing columns to submission_reviews table
ALTER TABLE submission_reviews 
ADD COLUMN IF NOT EXISTS decision TEXT CHECK (decision IN ('approve_new', 'approve_update', 'reject', 'needs_revision')),
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Also ensure the metadata column name is consistent
-- The original schema had 'tagged_metadata' but the code expects 'metadata'
ALTER TABLE submission_reviews 
RENAME COLUMN tagged_metadata TO metadata;