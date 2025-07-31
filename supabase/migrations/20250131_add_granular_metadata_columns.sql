-- Migration: Add granular metadata columns to lessons table
-- Date: 2025-01-31
-- Description: Ungroups metadata JSONB into proper columns for better performance and data integrity

-- Add array columns for multi-select fields
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS thematic_categories TEXT[],
ADD COLUMN IF NOT EXISTS cultural_heritage TEXT[],
ADD COLUMN IF NOT EXISTS observances_holidays TEXT[],
ADD COLUMN IF NOT EXISTS location_requirements TEXT[],
ADD COLUMN IF NOT EXISTS season_timing TEXT[],
ADD COLUMN IF NOT EXISTS academic_integration TEXT[],
ADD COLUMN IF NOT EXISTS social_emotional_learning TEXT[],
ADD COLUMN IF NOT EXISTS cooking_methods TEXT[],
ADD COLUMN IF NOT EXISTS main_ingredients TEXT[],
ADD COLUMN IF NOT EXISTS cultural_responsiveness_features TEXT[],
ADD COLUMN IF NOT EXISTS garden_skills TEXT[],
ADD COLUMN IF NOT EXISTS cooking_skills TEXT[],
ADD COLUMN IF NOT EXISTS core_competencies TEXT[];

-- Add text columns for single values and notes
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS lesson_format TEXT,
ADD COLUMN IF NOT EXISTS processing_notes TEXT,
ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Add boolean column
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS flagged_for_review BOOLEAN DEFAULT FALSE;

-- Add tags column for future use
ALTER TABLE lessons
ADD COLUMN IF NOT EXISTS tags TEXT[];

-- Create indexes for array columns using GIN for efficient array operations
CREATE INDEX IF NOT EXISTS idx_lessons_thematic_categories ON lessons USING gin(thematic_categories);
CREATE INDEX IF NOT EXISTS idx_lessons_cultural_heritage ON lessons USING gin(cultural_heritage);
CREATE INDEX IF NOT EXISTS idx_lessons_observances_holidays ON lessons USING gin(observances_holidays);
CREATE INDEX IF NOT EXISTS idx_lessons_location_requirements ON lessons USING gin(location_requirements);
CREATE INDEX IF NOT EXISTS idx_lessons_season_timing ON lessons USING gin(season_timing);
CREATE INDEX IF NOT EXISTS idx_lessons_academic_integration ON lessons USING gin(academic_integration);
CREATE INDEX IF NOT EXISTS idx_lessons_social_emotional_learning ON lessons USING gin(social_emotional_learning);
CREATE INDEX IF NOT EXISTS idx_lessons_cooking_methods ON lessons USING gin(cooking_methods);
CREATE INDEX IF NOT EXISTS idx_lessons_main_ingredients ON lessons USING gin(main_ingredients);
CREATE INDEX IF NOT EXISTS idx_lessons_garden_skills ON lessons USING gin(garden_skills);
CREATE INDEX IF NOT EXISTS idx_lessons_cooking_skills ON lessons USING gin(cooking_skills);
CREATE INDEX IF NOT EXISTS idx_lessons_core_competencies ON lessons USING gin(core_competencies);
CREATE INDEX IF NOT EXISTS idx_lessons_tags ON lessons USING gin(tags);

-- Create index for lesson format
CREATE INDEX IF NOT EXISTS idx_lessons_lesson_format ON lessons(lesson_format);

-- Create index for flagged lessons
CREATE INDEX IF NOT EXISTS idx_lessons_flagged ON lessons(flagged_for_review) WHERE flagged_for_review = TRUE;

-- Create index for processing notes (useful for finding duplicates)
CREATE INDEX IF NOT EXISTS idx_lessons_processing_notes ON lessons USING gin(to_tsvector('english', processing_notes));

-- Update search vector function to include new columns
CREATE OR REPLACE FUNCTION generate_lesson_search_vector(
  p_title TEXT,
  p_summary TEXT,
  p_main_ingredients TEXT[],
  p_garden_skills TEXT[],
  p_cooking_skills TEXT[],
  p_thematic_categories TEXT[],
  p_cultural_heritage TEXT[],
  p_observances_holidays TEXT[],
  p_tags TEXT[],
  p_content_text TEXT
) RETURNS tsvector AS $$
BEGIN
  RETURN 
    setweight(to_tsvector('english', COALESCE(p_title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(p_summary, '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(p_main_ingredients, ' '), '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(p_observances_holidays, ' '), '')), 'B') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(p_tags, ' '), '')), 'B') ||
    setweight(to_tsvector('english', 
      COALESCE(array_to_string(p_garden_skills, ' '), '') || ' ' ||
      COALESCE(array_to_string(p_cooking_skills, ' '), '') || ' ' ||
      COALESCE(array_to_string(p_thematic_categories, ' '), '') || ' ' ||
      COALESCE(array_to_string(p_cultural_heritage, ' '), '')
    ), 'C') ||
    setweight(to_tsvector('english', COALESCE(p_content_text, '')), 'D');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update trigger function to use new columns
CREATE OR REPLACE FUNCTION update_lesson_search_vector() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := generate_lesson_search_vector(
    NEW.title,
    NEW.summary,
    NEW.main_ingredients,
    NEW.garden_skills,
    NEW.cooking_skills,
    NEW.thematic_categories,
    NEW.cultural_heritage,
    NEW.observances_holidays,
    NEW.tags,
    NEW.content_text
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger to include new columns
DROP TRIGGER IF EXISTS update_lesson_search_vector_trigger ON lessons;
CREATE TRIGGER update_lesson_search_vector_trigger 
  BEFORE INSERT OR UPDATE OF title, summary, main_ingredients, garden_skills, cooking_skills,
    thematic_categories, cultural_heritage, observances_holidays, tags, content_text
  ON lessons 
  FOR EACH ROW 
  EXECUTE FUNCTION update_lesson_search_vector();

-- Add comments on new columns
COMMENT ON COLUMN lessons.thematic_categories IS 'Thematic categories for the lesson';
COMMENT ON COLUMN lessons.cultural_heritage IS 'Cultural heritage regions or cuisines featured';
COMMENT ON COLUMN lessons.observances_holidays IS 'Holidays or observances the lesson relates to';
COMMENT ON COLUMN lessons.location_requirements IS 'Where the lesson can be conducted (Indoor/Outdoor/Both)';
COMMENT ON COLUMN lessons.season_timing IS 'Seasons when the lesson is appropriate';
COMMENT ON COLUMN lessons.academic_integration IS 'Academic subjects integrated into the lesson';
COMMENT ON COLUMN lessons.social_emotional_learning IS 'SEL competencies addressed';
COMMENT ON COLUMN lessons.cooking_methods IS 'Cooking methods used in the lesson';
COMMENT ON COLUMN lessons.main_ingredients IS 'Main ingredients used in the lesson';
COMMENT ON COLUMN lessons.cultural_responsiveness_features IS 'Culturally responsive teaching features';
COMMENT ON COLUMN lessons.garden_skills IS 'Garden skills taught or practiced';
COMMENT ON COLUMN lessons.cooking_skills IS 'Cooking skills taught or practiced';
COMMENT ON COLUMN lessons.core_competencies IS 'ESNYC core competencies addressed';
COMMENT ON COLUMN lessons.lesson_format IS 'Format of the lesson (single period, multi-session, etc.)';
COMMENT ON COLUMN lessons.processing_notes IS 'Notes from data import/processing';
COMMENT ON COLUMN lessons.review_notes IS 'Notes from content review';
COMMENT ON COLUMN lessons.flagged_for_review IS 'Whether the lesson needs review';
COMMENT ON COLUMN lessons.tags IS 'Additional tags for categorization';

-- Note: After this migration, run the data migration script to populate these columns from existing metadata