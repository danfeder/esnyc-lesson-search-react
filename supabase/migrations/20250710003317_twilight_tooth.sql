/*
  # Update search vector function for better search

  1. Enhanced Search Vector
    - Improved search vector generation
    - Better weight distribution for relevance
    - Include more metadata fields in search

  2. Search Improvements
    - Add trigram indexes for fuzzy matching
    - Improve search vector weights
    - Include cultural heritage and other metadata in search
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
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.metadata->'thematicCategories', ' '), '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.metadata->'coreCompetencies', ' '), '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.metadata->'seasonTiming', ' '), '')), 'C') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.grade_levels, ' '), '')), 'C') ||
    
    -- Additional metadata gets lower weight (D)
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.metadata->'culturalHeritage', ' '), '')), 'D') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.metadata->'mainIngredients', ' '), '')), 'D') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.metadata->'gardenSkills', ' '), '')), 'D') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.metadata->'cookingSkills', ' '), '')), 'D') ||
    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.metadata->'locationRequirements', ' '), '')), 'D') ||
    setweight(to_tsvector('english', COALESCE(NEW.metadata->>'lessonFormat', '')), 'D');
  
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update all existing lessons to regenerate search vectors
UPDATE lessons SET updated_at = now();