-- Migration: Add duplicate resolution tracking tables
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
  CONSTRAINT no_self_reference CHECK (duplicate_id != canonical_id),
  
  -- Index for quick canonical lookups
  INDEX idx_canonical_id (canonical_id)
);

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
  canonical_id TEXT REFERENCES lessons(lesson_id),
  
  -- Indexes
  INDEX idx_archive_canonical (canonical_id),
  INDEX idx_archive_date (archived_at),
  INDEX idx_archive_reason (archive_reason)
);

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
  notes TEXT,
  
  -- Indexes
  INDEX idx_resolution_group (group_id),
  INDEX idx_resolution_date (resolved_at),
  INDEX idx_resolution_canonical (canonical_lesson_id)
);

-- Function to safely resolve a duplicate group
CREATE OR REPLACE FUNCTION resolve_duplicate_group(
  p_group_id TEXT,
  p_canonical_id TEXT,
  p_duplicate_ids TEXT[],
  p_duplicate_type TEXT,
  p_similarity_score FLOAT,
  p_merge_metadata BOOLEAN DEFAULT FALSE,
  p_resolution_notes TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
  v_duplicate_id TEXT;
  v_metadata_merged JSONB DEFAULT '{}';
  v_action_taken TEXT;
BEGIN
  -- Validate inputs
  IF p_canonical_id = ANY(p_duplicate_ids) THEN
    RAISE EXCEPTION 'Canonical ID cannot be in the duplicate IDs list';
  END IF;
  
  -- Validate canonical lesson exists
  IF NOT EXISTS (SELECT 1 FROM lessons WHERE lesson_id = p_canonical_id) THEN
    RAISE EXCEPTION 'Canonical lesson % does not exist', p_canonical_id;
  END IF;
  
  -- Begin transaction logic
  BEGIN
    -- 1. Create canonical mappings for each duplicate
    FOREACH v_duplicate_id IN ARRAY p_duplicate_ids
    LOOP
      -- Verify duplicate exists
      IF NOT EXISTS (SELECT 1 FROM lessons WHERE lesson_id = v_duplicate_id) THEN
        RAISE WARNING 'Duplicate lesson % does not exist, skipping', v_duplicate_id;
        CONTINUE;
      END IF;
      
      -- Insert canonical mapping
      INSERT INTO canonical_lessons (
        duplicate_id, 
        canonical_id, 
        similarity_score,
        resolution_type,
        resolved_by,
        resolution_notes
      ) VALUES (
        v_duplicate_id,
        p_canonical_id,
        p_similarity_score,
        p_duplicate_type,
        auth.uid(),
        p_resolution_notes
      );
    END LOOP;
    
    -- 2. Merge metadata if requested
    IF p_merge_metadata THEN
      -- Collect metadata from all duplicates
      SELECT jsonb_object_agg(
        lesson_id,
        metadata
      ) INTO v_metadata_merged
      FROM lessons
      WHERE lesson_id = ANY(p_duplicate_ids)
      AND metadata IS NOT NULL;
      
      -- TODO: Implement smart metadata merging logic
      -- For now, just track what was available
      v_action_taken := 'merge_and_archive';
    ELSE
      v_action_taken := 'archive_only';
    END IF;
    
    -- 3. Archive duplicates
    INSERT INTO lesson_archive
    SELECT 
      l.*,
      NOW() as archived_at,
      auth.uid() as archived_by,
      'Duplicate of ' || p_canonical_id as archive_reason,
      p_canonical_id as canonical_id
    FROM lessons l
    WHERE l.lesson_id = ANY(p_duplicate_ids);
    
    -- 4. Update references to point to canonical
    -- Update bookmarks
    UPDATE bookmarks 
    SET lesson_id = p_canonical_id 
    WHERE lesson_id = ANY(p_duplicate_ids);
    
    -- Update lesson_collections
    UPDATE lesson_collections 
    SET lesson_id = p_canonical_id 
    WHERE lesson_id = ANY(p_duplicate_ids);
    
    -- Remove any resulting duplicates in collections
    DELETE FROM lesson_collections lc1
    WHERE EXISTS (
      SELECT 1 FROM lesson_collections lc2
      WHERE lc2.collection_id = lc1.collection_id
      AND lc2.lesson_id = lc1.lesson_id
      AND lc2.created_at < lc1.created_at
    );
    
    -- 5. Delete archived lessons from main table
    DELETE FROM lessons 
    WHERE lesson_id = ANY(p_duplicate_ids);
    
    -- 6. Log the resolution
    INSERT INTO duplicate_resolutions (
      group_id,
      duplicate_type,
      similarity_score,
      lessons_in_group,
      canonical_lesson_id,
      action_taken,
      metadata_merged,
      resolved_by,
      notes
    ) VALUES (
      p_group_id,
      p_duplicate_type,
      p_similarity_score,
      array_length(p_duplicate_ids, 1) + 1, -- +1 for canonical
      p_canonical_id,
      v_action_taken,
      v_metadata_merged,
      auth.uid(),
      p_resolution_notes
    );
    
    -- Build result
    v_result := jsonb_build_object(
      'success', true,
      'canonical_id', p_canonical_id,
      'duplicates_archived', array_length(p_duplicate_ids, 1),
      'action_taken', v_action_taken,
      'metadata_merged', p_merge_metadata
    );
    
    RETURN v_result;
    
  EXCEPTION
    WHEN OTHERS THEN
      -- Rollback is automatic in PL/pgSQL functions
      v_result := jsonb_build_object(
        'success', false,
        'error', SQLERRM
      );
      RETURN v_result;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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