-- Migration: Add view for backwards compatibility
-- Date: 2025-01-31
-- Description: Creates a view that reconstructs the metadata object from granular columns

-- Create view that maintains backwards compatibility with frontend
CREATE OR REPLACE VIEW lessons_with_metadata AS
SELECT 
  id,
  lesson_id,
  title,
  summary,
  file_link,
  grade_levels,
  -- Reconstruct metadata object from granular columns
  jsonb_build_object(
    'thematicCategories', COALESCE(thematic_categories, ARRAY[]::text[]),
    'seasonTiming', COALESCE(season_timing, ARRAY[]::text[]),
    'coreCompetencies', COALESCE(core_competencies, ARRAY[]::text[]),
    'culturalHeritage', COALESCE(cultural_heritage, ARRAY[]::text[]),
    'locationRequirements', COALESCE(location_requirements, ARRAY[]::text[]),
    'activityType', COALESCE(metadata->>'activityType', '[]')::jsonb,
    'lessonFormat', COALESCE(lesson_format, metadata->>'lessonFormat'),
    'mainIngredients', COALESCE(main_ingredients, ARRAY[]::text[]),
    'skills', COALESCE(
      ARRAY(
        SELECT DISTINCT unnest(garden_skills || cooking_skills)
      ), 
      ARRAY[]::text[]
    ),
    'gardenSkills', COALESCE(garden_skills, ARRAY[]::text[]),
    'cookingSkills', COALESCE(cooking_skills, ARRAY[]::text[]),
    'cookingMethods', COALESCE(cooking_methods, ARRAY[]::text[]),
    'observancesHolidays', COALESCE(observances_holidays, ARRAY[]::text[]),
    'academicIntegration', COALESCE(academic_integration, ARRAY[]::text[]),
    'socialEmotionalLearning', COALESCE(social_emotional_learning, ARRAY[]::text[]),
    'culturalResponsivenessFeatures', COALESCE(cultural_responsiveness_features, ARRAY[]::text[]),
    -- Include any other fields that might still be in the metadata column
    'equipment', COALESCE(metadata->>'equipment', '[]')::jsonb,
    'duration', metadata->>'duration',
    'groupSize', metadata->>'groupSize',
    'dietaryConsiderations', COALESCE(metadata->>'dietaryConsiderations', '[]')::jsonb,
    'preparationTime', metadata->>'preparationTime',
    'materialsNeeded', COALESCE(metadata->>'materialsNeeded', '[]')::jsonb
  ) as metadata,
  confidence,
  search_vector,
  content_text,
  content_embedding,
  content_hash,
  last_modified,
  processing_notes,
  review_notes,
  flagged_for_review,
  tags,
  created_at,
  updated_at
FROM lessons;

-- Grant permissions on the view
GRANT SELECT ON lessons_with_metadata TO authenticated;
GRANT SELECT ON lessons_with_metadata TO anon;

-- Create function to handle inserts/updates through the view
CREATE OR REPLACE FUNCTION handle_lessons_metadata_write()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO lessons (
      lesson_id, title, summary, file_link, grade_levels,
      metadata, confidence, 
      thematic_categories, season_timing, core_competencies,
      cultural_heritage, location_requirements, lesson_format,
      main_ingredients, garden_skills, cooking_skills,
      cooking_methods, observances_holidays, academic_integration,
      social_emotional_learning, cultural_responsiveness_features,
      processing_notes, review_notes, flagged_for_review, tags
    ) VALUES (
      NEW.lesson_id, NEW.title, NEW.summary, NEW.file_link, NEW.grade_levels,
      NEW.metadata, NEW.confidence,
      -- Extract from metadata if provided
      COALESCE((NEW.metadata->>'thematicCategories')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'seasonTiming')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'coreCompetencies')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'culturalHeritage')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'locationRequirements')::text[], ARRAY[]::text[]),
      NEW.metadata->>'lessonFormat',
      COALESCE((NEW.metadata->>'mainIngredients')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'gardenSkills')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'cookingSkills')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'cookingMethods')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'observancesHolidays')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'academicIntegration')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'socialEmotionalLearning')::text[], ARRAY[]::text[]),
      COALESCE((NEW.metadata->>'culturalResponsivenessFeatures')::text[], ARRAY[]::text[]),
      NEW.processing_notes, NEW.review_notes, NEW.flagged_for_review, NEW.tags
    );
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE lessons SET
      title = NEW.title,
      summary = NEW.summary,
      file_link = NEW.file_link,
      grade_levels = NEW.grade_levels,
      metadata = NEW.metadata,
      confidence = NEW.confidence,
      -- Update granular columns from metadata
      thematic_categories = COALESCE((NEW.metadata->>'thematicCategories')::text[], thematic_categories),
      season_timing = COALESCE((NEW.metadata->>'seasonTiming')::text[], season_timing),
      core_competencies = COALESCE((NEW.metadata->>'coreCompetencies')::text[], core_competencies),
      cultural_heritage = COALESCE((NEW.metadata->>'culturalHeritage')::text[], cultural_heritage),
      location_requirements = COALESCE((NEW.metadata->>'locationRequirements')::text[], location_requirements),
      lesson_format = COALESCE(NEW.metadata->>'lessonFormat', lesson_format),
      main_ingredients = COALESCE((NEW.metadata->>'mainIngredients')::text[], main_ingredients),
      garden_skills = COALESCE((NEW.metadata->>'gardenSkills')::text[], garden_skills),
      cooking_skills = COALESCE((NEW.metadata->>'cookingSkills')::text[], cooking_skills),
      cooking_methods = COALESCE((NEW.metadata->>'cookingMethods')::text[], cooking_methods),
      observances_holidays = COALESCE((NEW.metadata->>'observancesHolidays')::text[], observances_holidays),
      academic_integration = COALESCE((NEW.metadata->>'academicIntegration')::text[], academic_integration),
      social_emotional_learning = COALESCE((NEW.metadata->>'socialEmotionalLearning')::text[], social_emotional_learning),
      cultural_responsiveness_features = COALESCE((NEW.metadata->>'culturalResponsivenessFeatures')::text[], cultural_responsiveness_features),
      processing_notes = NEW.processing_notes,
      review_notes = NEW.review_notes,
      flagged_for_review = NEW.flagged_for_review,
      tags = NEW.tags,
      updated_at = NOW()
    WHERE lesson_id = NEW.lesson_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Make the view updatable
CREATE TRIGGER lessons_metadata_write_trigger
INSTEAD OF INSERT OR UPDATE ON lessons_with_metadata
FOR EACH ROW EXECUTE FUNCTION handle_lessons_metadata_write();

-- Comment on the view
COMMENT ON VIEW lessons_with_metadata IS 'Backwards-compatible view that reconstructs metadata object from granular columns for frontend compatibility';