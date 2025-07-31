-- Complete Duplicate Resolution Setup
-- This migration sets up all required tables and functions for the duplicate resolution system
-- Date: 2025-01-31

-- Step 1: Drop existing functions that might have wrong signatures
DROP FUNCTION IF EXISTS resolve_duplicate_group(TEXT, TEXT, TEXT[], TEXT, FLOAT, BOOLEAN, TEXT);
DROP FUNCTION IF EXISTS resolve_duplicate_group(TEXT, TEXT, TEXT[], TEXT, NUMERIC, BOOLEAN, TEXT);

-- Step 2: Drop and recreate tables to ensure correct structure
-- Note: Using CASCADE will also drop dependent objects
DROP TABLE IF EXISTS duplicate_resolutions CASCADE;
DROP TABLE IF EXISTS canonical_lessons CASCADE;
DROP TABLE IF EXISTS lesson_archive CASCADE;

-- Step 3: Create lesson_archive table with correct structure matching current lessons table
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
  
  -- New granular metadata columns (matching what was added to lessons table)
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
  canonical_id TEXT REFERENCES lessons(lesson_id) ON DELETE SET NULL
);

-- Create indexes for archive table
CREATE INDEX idx_archive_canonical ON lesson_archive(canonical_id);
CREATE INDEX idx_archive_date ON lesson_archive(archived_at);
CREATE INDEX idx_archive_reason ON lesson_archive(archive_reason);

-- Step 4: Create canonical_lessons mapping table
CREATE TABLE canonical_lessons (
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

-- Create index for canonical lookups
CREATE INDEX idx_canonical_id ON canonical_lessons(canonical_id);

-- Step 5: Create duplicate_resolutions tracking table
CREATE TABLE duplicate_resolutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id TEXT NOT NULL,
  duplicate_type TEXT NOT NULL CHECK (duplicate_type IN ('exact', 'near', 'version', 'title', 'unknown')),
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

-- Step 6: Create the resolve_duplicate_group function with correct implementation
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
  v_archived_count INTEGER := 0;
  v_merged_metadata JSONB := NULL;
  v_duplicate_id TEXT;
  v_canonical_lesson RECORD;
  v_duplicate_lesson RECORD;
  -- Use the actual column names from the lessons table
  v_merged_grade_levels TEXT[];
  v_merged_thematic_categories TEXT[];
  v_merged_season_timing TEXT[];
  v_merged_observances_holidays TEXT[];
  v_merged_main_ingredients TEXT[];
  v_merged_garden_skills TEXT[];
  v_merged_cooking_skills TEXT[];
  v_merged_academic_integration TEXT[];
  v_merged_social_emotional_learning TEXT[];
  v_merged_cultural_heritage TEXT[];
  v_merged_location_requirements TEXT[];
  v_merged_cooking_methods TEXT[];
  v_merged_core_competencies TEXT[];
  v_merged_cultural_responsiveness_features TEXT[];
  v_merged_tags TEXT[];
  v_user_id UUID;
BEGIN
  -- Get the current user ID
  v_user_id := auth.uid();
  
  -- Validate inputs
  IF p_canonical_id = ANY(p_duplicate_ids) THEN
    RAISE EXCEPTION 'Canonical lesson ID cannot be in the duplicate IDs list';
  END IF;
  
  -- Get canonical lesson data
  SELECT * INTO v_canonical_lesson
  FROM lessons
  WHERE lesson_id = p_canonical_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Canonical lesson % not found', p_canonical_id;
  END IF;
  
  -- If merge_metadata is true, prepare the merged data
  IF p_merge_metadata THEN
    -- Initialize arrays with canonical lesson values
    v_merged_grade_levels := COALESCE(v_canonical_lesson.grade_levels, ARRAY[]::TEXT[]);
    v_merged_thematic_categories := COALESCE(v_canonical_lesson.thematic_categories, ARRAY[]::TEXT[]);
    v_merged_season_timing := COALESCE(v_canonical_lesson.season_timing, ARRAY[]::TEXT[]);
    v_merged_observances_holidays := COALESCE(v_canonical_lesson.observances_holidays, ARRAY[]::TEXT[]);
    v_merged_main_ingredients := COALESCE(v_canonical_lesson.main_ingredients, ARRAY[]::TEXT[]);
    v_merged_garden_skills := COALESCE(v_canonical_lesson.garden_skills, ARRAY[]::TEXT[]);
    v_merged_cooking_skills := COALESCE(v_canonical_lesson.cooking_skills, ARRAY[]::TEXT[]);
    v_merged_academic_integration := COALESCE(v_canonical_lesson.academic_integration, ARRAY[]::TEXT[]);
    v_merged_social_emotional_learning := COALESCE(v_canonical_lesson.social_emotional_learning, ARRAY[]::TEXT[]);
    v_merged_cultural_heritage := COALESCE(v_canonical_lesson.cultural_heritage, ARRAY[]::TEXT[]);
    v_merged_location_requirements := COALESCE(v_canonical_lesson.location_requirements, ARRAY[]::TEXT[]);
    v_merged_cooking_methods := COALESCE(v_canonical_lesson.cooking_methods, ARRAY[]::TEXT[]);
    v_merged_core_competencies := COALESCE(v_canonical_lesson.core_competencies, ARRAY[]::TEXT[]);
    v_merged_cultural_responsiveness_features := COALESCE(v_canonical_lesson.cultural_responsiveness_features, ARRAY[]::TEXT[]);
    v_merged_tags := COALESCE(v_canonical_lesson.tags, ARRAY[]::TEXT[]);
    
    -- Collect metadata from all duplicate lessons
    FOREACH v_duplicate_id IN ARRAY p_duplicate_ids
    LOOP
      SELECT * INTO v_duplicate_lesson
      FROM lessons
      WHERE lesson_id = v_duplicate_id;
      
      IF FOUND THEN
        -- Merge array fields
        v_merged_grade_levels := array(
          SELECT DISTINCT unnest(v_merged_grade_levels || COALESCE(v_duplicate_lesson.grade_levels, ARRAY[]::TEXT[]))
        );
        v_merged_thematic_categories := array(
          SELECT DISTINCT unnest(v_merged_thematic_categories || COALESCE(v_duplicate_lesson.thematic_categories, ARRAY[]::TEXT[]))
        );
        v_merged_season_timing := array(
          SELECT DISTINCT unnest(v_merged_season_timing || COALESCE(v_duplicate_lesson.season_timing, ARRAY[]::TEXT[]))
        );
        v_merged_observances_holidays := array(
          SELECT DISTINCT unnest(v_merged_observances_holidays || COALESCE(v_duplicate_lesson.observances_holidays, ARRAY[]::TEXT[]))
        );
        v_merged_main_ingredients := array(
          SELECT DISTINCT unnest(v_merged_main_ingredients || COALESCE(v_duplicate_lesson.main_ingredients, ARRAY[]::TEXT[]))
        );
        v_merged_garden_skills := array(
          SELECT DISTINCT unnest(v_merged_garden_skills || COALESCE(v_duplicate_lesson.garden_skills, ARRAY[]::TEXT[]))
        );
        v_merged_cooking_skills := array(
          SELECT DISTINCT unnest(v_merged_cooking_skills || COALESCE(v_duplicate_lesson.cooking_skills, ARRAY[]::TEXT[]))
        );
        v_merged_academic_integration := array(
          SELECT DISTINCT unnest(v_merged_academic_integration || COALESCE(v_duplicate_lesson.academic_integration, ARRAY[]::TEXT[]))
        );
        v_merged_social_emotional_learning := array(
          SELECT DISTINCT unnest(v_merged_social_emotional_learning || COALESCE(v_duplicate_lesson.social_emotional_learning, ARRAY[]::TEXT[]))
        );
        v_merged_cultural_heritage := array(
          SELECT DISTINCT unnest(v_merged_cultural_heritage || COALESCE(v_duplicate_lesson.cultural_heritage, ARRAY[]::TEXT[]))
        );
        v_merged_location_requirements := array(
          SELECT DISTINCT unnest(v_merged_location_requirements || COALESCE(v_duplicate_lesson.location_requirements, ARRAY[]::TEXT[]))
        );
        v_merged_cooking_methods := array(
          SELECT DISTINCT unnest(v_merged_cooking_methods || COALESCE(v_duplicate_lesson.cooking_methods, ARRAY[]::TEXT[]))
        );
        v_merged_core_competencies := array(
          SELECT DISTINCT unnest(v_merged_core_competencies || COALESCE(v_duplicate_lesson.core_competencies, ARRAY[]::TEXT[]))
        );
        v_merged_cultural_responsiveness_features := array(
          SELECT DISTINCT unnest(v_merged_cultural_responsiveness_features || COALESCE(v_duplicate_lesson.cultural_responsiveness_features, ARRAY[]::TEXT[]))
        );
        v_merged_tags := array(
          SELECT DISTINCT unnest(v_merged_tags || COALESCE(v_duplicate_lesson.tags, ARRAY[]::TEXT[]))
        );
      END IF;
    END LOOP;
    
    -- Update canonical lesson with merged metadata
    UPDATE lessons SET
      grade_levels = v_merged_grade_levels,
      thematic_categories = v_merged_thematic_categories,
      season_timing = v_merged_season_timing,
      observances_holidays = v_merged_observances_holidays,
      main_ingredients = v_merged_main_ingredients,
      garden_skills = v_merged_garden_skills,
      cooking_skills = v_merged_cooking_skills,
      academic_integration = v_merged_academic_integration,
      social_emotional_learning = v_merged_social_emotional_learning,
      cultural_heritage = v_merged_cultural_heritage,
      location_requirements = v_merged_location_requirements,
      cooking_methods = v_merged_cooking_methods,
      core_competencies = v_merged_core_competencies,
      cultural_responsiveness_features = v_merged_cultural_responsiveness_features,
      tags = v_merged_tags,
      updated_at = NOW()
    WHERE lesson_id = p_canonical_id;
    
    -- Store merged metadata for the resolution record
    v_merged_metadata := jsonb_build_object(
      'grade_levels', to_jsonb(v_merged_grade_levels),
      'thematic_categories', to_jsonb(v_merged_thematic_categories),
      'season_timing', to_jsonb(v_merged_season_timing),
      'observances_holidays', to_jsonb(v_merged_observances_holidays),
      'main_ingredients', to_jsonb(v_merged_main_ingredients),
      'garden_skills', to_jsonb(v_merged_garden_skills),
      'cooking_skills', to_jsonb(v_merged_cooking_skills),
      'academic_integration', to_jsonb(v_merged_academic_integration),
      'social_emotional_learning', to_jsonb(v_merged_social_emotional_learning),
      'cultural_heritage', to_jsonb(v_merged_cultural_heritage),
      'location_requirements', to_jsonb(v_merged_location_requirements),
      'cooking_methods', to_jsonb(v_merged_cooking_methods),
      'core_competencies', to_jsonb(v_merged_core_competencies),
      'cultural_responsiveness_features', to_jsonb(v_merged_cultural_responsiveness_features),
      'tags', to_jsonb(v_merged_tags)
    );
  END IF;
  
  -- Archive duplicate lessons
  FOREACH v_duplicate_id IN ARRAY p_duplicate_ids
  LOOP
    -- First check if lesson exists
    IF EXISTS (SELECT 1 FROM lessons WHERE lesson_id = v_duplicate_id) THEN
      -- Archive the lesson with all its data
      INSERT INTO lesson_archive (
        id,
        lesson_id,
        title,
        summary,
        file_link,
        grade_levels,
        metadata,
        confidence,
        search_vector,
        content_text,
        content_embedding,
        content_hash,
        last_modified,
        created_at,
        updated_at,
        -- Granular metadata columns
        thematic_categories,
        cultural_heritage,
        observances_holidays,
        location_requirements,
        season_timing,
        academic_integration,
        social_emotional_learning,
        cooking_methods,
        main_ingredients,
        cultural_responsiveness_features,
        garden_skills,
        cooking_skills,
        core_competencies,
        lesson_format,
        processing_notes,
        review_notes,
        flagged_for_review,
        tags,
        -- Archive-specific values
        archived_at,
        archived_by,
        archive_reason,
        canonical_id
      )
      SELECT 
        id,
        lesson_id,
        title,
        summary,
        file_link,
        grade_levels,
        metadata,
        confidence,
        search_vector,
        content_text,
        content_embedding,
        content_hash,
        last_modified,
        created_at,
        updated_at,
        -- Granular metadata columns
        thematic_categories,
        cultural_heritage,
        observances_holidays,
        location_requirements,
        season_timing,
        academic_integration,
        social_emotional_learning,
        cooking_methods,
        main_ingredients,
        cultural_responsiveness_features,
        garden_skills,
        cooking_skills,
        core_competencies,
        lesson_format,
        processing_notes,
        review_notes,
        flagged_for_review,
        tags,
        -- Archive-specific values
        NOW(),
        v_user_id,
        'duplicate_resolution',
        p_canonical_id
      FROM lessons
      WHERE lesson_id = v_duplicate_id;
      
      -- Add to canonical_lessons mapping
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
        v_user_id,
        p_resolution_notes
      );
      
      -- Delete from lessons table
      DELETE FROM lessons WHERE lesson_id = v_duplicate_id;
      
      v_archived_count := v_archived_count + 1;
    END IF;
  END LOOP;
  
  -- Record the resolution
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
    CASE WHEN p_merge_metadata THEN 'merge_and_archive' ELSE 'archive_only' END,
    v_merged_metadata,
    v_user_id,
    p_resolution_notes
  );
  
  -- Note: We don't update duplicate_groups table because it doesn't exist
  -- The frontend loads duplicate groups from a JSON file
  
  -- Return result
  v_result := jsonb_build_object(
    'success', true,
    'canonical_id', p_canonical_id,
    'archived_count', v_archived_count,
    'merge_metadata', p_merge_metadata,
    'metadata_merged', v_merged_metadata
  );
  
  RETURN v_result;
  
EXCEPTION
  WHEN OTHERS THEN
    -- Return error result with details
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'detail', SQLSTATE,
      'hint', CASE 
        WHEN SQLERRM LIKE '%column%does not exist%' THEN 'Column name mismatch - check table structure'
        WHEN SQLERRM LIKE '%malformed array literal%' THEN 'Array handling error - check data types'
        WHEN SQLERRM LIKE '%relation%does not exist%' THEN 'Missing table - check migrations'
        ELSE 'Unexpected error'
      END
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 7: Grant appropriate permissions
GRANT SELECT ON lesson_archive TO authenticated;
GRANT INSERT ON lesson_archive TO authenticated;
GRANT SELECT ON canonical_lessons TO authenticated;
GRANT INSERT ON canonical_lessons TO authenticated;
GRANT SELECT ON duplicate_resolutions TO authenticated;
GRANT INSERT ON duplicate_resolutions TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_duplicate_group TO authenticated;

-- Step 8: Add helpful comments
COMMENT ON TABLE lesson_archive IS 'Archive of lessons that were removed as duplicates, preserving all data';
COMMENT ON TABLE canonical_lessons IS 'Mapping of duplicate lessons to their canonical versions';
COMMENT ON TABLE duplicate_resolutions IS 'Audit trail of duplicate resolution actions';
COMMENT ON FUNCTION resolve_duplicate_group IS 'Resolves duplicate lessons by archiving non-canonical versions and optionally merging metadata';

-- Step 9: Create helper function to check if a lesson is archived
CREATE OR REPLACE FUNCTION is_lesson_archived(p_lesson_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM lesson_archive 
    WHERE lesson_id = p_lesson_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

GRANT EXECUTE ON FUNCTION is_lesson_archived TO authenticated;