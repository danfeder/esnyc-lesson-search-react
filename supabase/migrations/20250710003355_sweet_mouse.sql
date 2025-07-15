/*
  # Update search vector function for better full-text search

  1. Enhanced Search Vector Function
    - Improved handling of JSONB arrays
    - Better weight distribution for search relevance
    - More comprehensive field indexing
    - Proper type casting for PostgreSQL compatibility

  2. Search Vector Updates
    - Regenerate all existing search vectors
    - Include more metadata fields in search
*/

-- Update the search vector function to include more fields and better weights
CREATE OR REPLACE FUNCTION update_lesson_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := 
    -- Title gets highest weight (A)
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    
    -- Summary gets high weight (B)
    setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
    
    -- Core metadata gets medium weight (C)
    setweight(to_tsvector('english', COALESCE(
      array_to_string(
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(NEW.metadata->'thematicCategories', '[]'::jsonb))), 
        ' '
      ), '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(
      array_to_string(
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(NEW.metadata->'coreCompetencies', '[]'::jsonb))), 
        ' '
      ), '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(
      array_to_string(
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(NEW.metadata->'seasonTiming', '[]'::jsonb))), 
        ' '
      ), '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.grade_levels, ' '), '')), 'C') ||
    
    -- Additional metadata gets lower weight (D)
    setweight(to_tsvector('english', COALESCE(
      array_to_string(
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(NEW.metadata->'culturalHeritage', '[]'::jsonb))), 
        ' '
      ), '')), 'D') ||
    setweight(to_tsvector('english', COALESCE(
      array_to_string(
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(NEW.metadata->'mainIngredients', '[]'::jsonb))), 
        ' '
      ), '')), 'D') ||
    setweight(to_tsvector('english', COALESCE(
      array_to_string(
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(NEW.metadata->'gardenSkills', '[]'::jsonb))), 
        ' '
      ), '')), 'D') ||
    setweight(to_tsvector('english', COALESCE(
      array_to_string(
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(NEW.metadata->'cookingSkills', '[]'::jsonb))), 
        ' '
      ), '')), 'D') ||
    setweight(to_tsvector('english', COALESCE(
      array_to_string(
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(NEW.metadata->'locationRequirements', '[]'::jsonb))), 
        ' '
      ), '')), 'D') ||
    setweight(to_tsvector('english', COALESCE(NEW.metadata->>'lessonFormat', '')), 'D') ||
    
    -- Academic integration concepts (D weight)
    setweight(to_tsvector('english', COALESCE(
      array_to_string(
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(NEW.metadata->'academicIntegration'->'selected', '[]'::jsonb))), 
        ' '
      ), '')), 'D') ||
    
    -- Observances and holidays (D weight)
    setweight(to_tsvector('english', COALESCE(
      array_to_string(
        ARRAY(SELECT jsonb_array_elements_text(COALESCE(NEW.metadata->'observancesHolidays', '[]'::jsonb))), 
        ' '
      ), '')), 'D');
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update all existing lessons to regenerate search vectors with the new function
UPDATE lessons SET updated_at = now();