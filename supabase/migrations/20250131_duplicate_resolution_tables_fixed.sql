-- Migration: Add duplicate resolution tracking tables (FIXED)
-- Date: 2025-01-31
-- Description: Creates tables to track duplicate lesson resolution and archival

-- Table to track canonical lesson mappings
CREATE TABLE IF NOT EXISTS canonical_lessons (
  duplicate_id TEXT PRIMARY KEY REFERENCES lessons(lesson_id) ON DELETE CASCADE,
  canonical_id TEXT NOT NULL REFERENCES lessons(lesson_id),
  similarity_score FLOAT NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
  resolution_type TEXT NOT NULL CHECK (resolution_type IN ('exact', 'near', 'version', 'title')),
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ DEFAULT NOW(),
  resolution_notes TEXT,
  
  -- Ensure a lesson can't be its own canonical
  CONSTRAINT no_self_reference CHECK (duplicate_id != canonical_id)
);

-- Create index for quick canonical lookups
CREATE INDEX idx_canonical_id ON canonical_lessons(canonical_id);

-- Archive table for removed duplicate lessons
CREATE TABLE IF NOT EXISTS lesson_archive (
  -- Mirror all columns from lessons table
  lesson_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT,
  objectives TEXT,
  materials TEXT,
  ingredients TEXT,
  procedure_steps TEXT,
  assessment TEXT,
  extensions TEXT,
  vocabulary TEXT,
  notes TEXT,
  metadata JSONB,
  tags TEXT[],
  content_hash TEXT,
  content_embedding vector(1536),
  search_vector tsvector,
  raw_text TEXT,
  processing_notes TEXT,
  confidence JSONB,
  original_source TEXT,
  last_modified TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ,
  
  -- Archive-specific columns
  archived_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  archived_by UUID REFERENCES auth.users(id),
  archive_reason TEXT NOT NULL,
  canonical_id TEXT REFERENCES lessons(lesson_id)
);

-- Create indexes for archive table
CREATE INDEX idx_archive_canonical ON lesson_archive(canonical_id);
CREATE INDEX idx_archive_date ON lesson_archive(archived_at);
CREATE INDEX idx_archive_reason ON lesson_archive(archive_reason);

-- Table to track resolution decisions and actions
CREATE TABLE IF NOT EXISTS duplicate_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id TEXT NOT NULL,
  duplicate_type TEXT NOT NULL CHECK (duplicate_type IN ('exact', 'near', 'version', 'title')),
  similarity_score FLOAT NOT NULL,
  lessons_in_group INTEGER NOT NULL CHECK (lessons_in_group >= 2),
  canonical_lesson_id TEXT NOT NULL REFERENCES lessons(lesson_id),
  action_taken TEXT NOT NULL CHECK (action_taken IN ('merge_metadata', 'archive_only', 'merge_and_archive')),
  metadata_merged JSONB,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ DEFAULT NOW(),
  notes TEXT
);

-- Create indexes for resolutions table
CREATE INDEX idx_resolution_group ON duplicate_resolutions(group_id);
CREATE INDEX idx_resolution_date ON duplicate_resolutions(resolved_at);
CREATE INDEX idx_resolution_canonical ON duplicate_resolutions(canonical_lesson_id);

-- Function to check if a lesson has been resolved as a duplicate
CREATE OR REPLACE FUNCTION is_duplicate_lesson(p_lesson_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM canonical_lessons 
    WHERE duplicate_id = p_lesson_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get canonical ID for a lesson
CREATE OR REPLACE FUNCTION get_canonical_lesson_id(p_lesson_id TEXT)
RETURNS TEXT AS $$
DECLARE
  v_canonical_id TEXT;
BEGIN
  -- Check if this lesson is marked as a duplicate
  SELECT canonical_id INTO v_canonical_id
  FROM canonical_lessons
  WHERE duplicate_id = p_lesson_id;
  
  -- If found, return the canonical ID
  IF v_canonical_id IS NOT NULL THEN
    RETURN v_canonical_id;
  END IF;
  
  -- Otherwise, the lesson itself is canonical
  RETURN p_lesson_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant appropriate permissions
GRANT SELECT ON canonical_lessons TO authenticated;
GRANT SELECT ON lesson_archive TO authenticated;
GRANT SELECT ON duplicate_resolutions TO authenticated;

-- Only admins/reviewers can modify these tables
GRANT INSERT, UPDATE, DELETE ON canonical_lessons TO authenticated;
GRANT INSERT ON lesson_archive TO authenticated;
GRANT INSERT ON duplicate_resolutions TO authenticated;

-- Comment on tables
COMMENT ON TABLE canonical_lessons IS 'Tracks which lessons are duplicates and their canonical versions';
COMMENT ON TABLE lesson_archive IS 'Archive of lessons that were removed as duplicates';
COMMENT ON TABLE duplicate_resolutions IS 'Log of duplicate resolution actions taken by admins';