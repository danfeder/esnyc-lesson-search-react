-- =====================================================
-- 08. CREATE DUPLICATE_RESOLUTIONS TABLE
-- =====================================================
-- This migration creates the duplicate_resolutions table
-- that was missing from the original migrations but
-- referenced in migration 09_fix_all_rls_issues.sql

-- Create the duplicate_resolutions table
CREATE TABLE IF NOT EXISTS duplicate_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id TEXT NOT NULL,
  duplicate_type TEXT NOT NULL CHECK (duplicate_type IN ('exact', 'near', 'version', 'title', 'unknown')),
  similarity_score DOUBLE PRECISION NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
  lessons_in_group INTEGER NOT NULL CHECK (lessons_in_group >= 2),
  canonical_lesson_id TEXT NOT NULL,
  action_taken TEXT NOT NULL CHECK (action_taken IN ('merge_and_archive', 'archive_only', 'keep_both')),
  metadata_merged JSONB,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_duplicate_resolutions_group_id ON duplicate_resolutions(group_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_resolutions_canonical ON duplicate_resolutions(canonical_lesson_id);
CREATE INDEX IF NOT EXISTS idx_duplicate_resolutions_resolved_by ON duplicate_resolutions(resolved_by);
CREATE INDEX IF NOT EXISTS idx_duplicate_resolutions_resolved_at ON duplicate_resolutions(resolved_at DESC);

-- Add comment for documentation
COMMENT ON TABLE duplicate_resolutions IS 'Record of duplicate resolution decisions made by reviewers/admins';
COMMENT ON COLUMN duplicate_resolutions.group_id IS 'Identifier for the group of duplicate lessons';
COMMENT ON COLUMN duplicate_resolutions.duplicate_type IS 'Type of duplication detected (exact, near, version, title, unknown)';
COMMENT ON COLUMN duplicate_resolutions.similarity_score IS 'Similarity score between 0 and 1';
COMMENT ON COLUMN duplicate_resolutions.lessons_in_group IS 'Number of lessons in the duplicate group';
COMMENT ON COLUMN duplicate_resolutions.canonical_lesson_id IS 'ID of the lesson chosen as canonical';
COMMENT ON COLUMN duplicate_resolutions.action_taken IS 'Action taken to resolve duplicates';
COMMENT ON COLUMN duplicate_resolutions.metadata_merged IS 'JSON object containing merged metadata if applicable';
COMMENT ON COLUMN duplicate_resolutions.resolved_by IS 'User who resolved the duplicates';
COMMENT ON COLUMN duplicate_resolutions.resolved_at IS 'Timestamp when resolution occurred';
COMMENT ON COLUMN duplicate_resolutions.notes IS 'Additional notes about the resolution';

-- Note: RLS will be enabled in migration 09_fix_all_rls_issues.sql
-- which already contains the policies for this table

-- =====================================================
-- ROLLBACK COMMANDS (commented for safety)
-- =====================================================
-- DROP INDEX IF EXISTS idx_duplicate_resolutions_resolved_at;
-- DROP INDEX IF EXISTS idx_duplicate_resolutions_resolved_by;
-- DROP INDEX IF EXISTS idx_duplicate_resolutions_canonical;
-- DROP INDEX IF EXISTS idx_duplicate_resolutions_group_id;
-- DROP TABLE IF EXISTS duplicate_resolutions;