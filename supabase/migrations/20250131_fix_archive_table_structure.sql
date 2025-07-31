-- Migration: Fix archive table structure to match actual lessons table
-- Date: 2025-01-31
-- Description: Drops and recreates the lesson_archive table with correct columns

-- Drop the existing archive table
DROP TABLE IF EXISTS lesson_archive CASCADE;

-- Recreate archive table to mirror actual lessons table structure
CREATE TABLE lesson_archive (
  -- Mirror all columns from lessons table
  id UUID NOT NULL,
  lesson_id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  file_link TEXT NOT NULL,
  grade_levels TEXT[] NOT NULL DEFAULT '{}',
  metadata JSONB NOT NULL DEFAULT '{}',
  confidence JSONB NOT NULL DEFAULT '{}',
  search_vector tsvector,
  content_text TEXT,
  content_embedding vector(1536),
  content_hash VARCHAR(64),
  last_modified TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ,
  
  -- New granular metadata columns
  thematic_categories TEXT[],
  cultural_heritage TEXT[],
  observances_holidays TEXT[],
  location_requirements TEXT[],
  season_timing TEXT[],
  academic_integration TEXT[],
  social_emotional_learning TEXT[],
  cooking_methods TEXT[],
  main_ingredients TEXT[],
  cultural_responsiveness_features TEXT[],
  garden_skills TEXT[],
  cooking_skills TEXT[],
  core_competencies TEXT[],
  lesson_format TEXT,
  processing_notes TEXT,
  review_notes TEXT,
  flagged_for_review BOOLEAN DEFAULT FALSE,
  tags TEXT[],
  
  -- Archive-specific columns
  archived_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  archived_by UUID REFERENCES auth.users(id),
  archive_reason TEXT NOT NULL,
  canonical_id TEXT REFERENCES lessons(lesson_id),
  
  -- Indexes
  INDEX idx_archive_canonical (canonical_id),
  INDEX idx_archive_date (archived_at),
  INDEX idx_archive_reason (archive_reason)
);

-- Grant appropriate permissions
GRANT SELECT ON lesson_archive TO authenticated;
GRANT INSERT ON lesson_archive TO authenticated;

-- Comment on the table
COMMENT ON TABLE lesson_archive IS 'Archive of lessons that were removed as duplicates, with same structure as lessons table';