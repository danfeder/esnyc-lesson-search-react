-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For typo tolerance
CREATE EXTENSION IF NOT EXISTS unaccent; -- For accent-insensitive search

-- Add tsvector column for full-text search
ALTER TABLE lessons 
ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to generate search vector
CREATE OR REPLACE FUNCTION lessons_search_vector_trigger() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.summary, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.content_text, '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.metadata->>'observancesHolidays', '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.metadata->>'mainIngredients', '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update search vector
CREATE TRIGGER lessons_search_vector_update
BEFORE INSERT OR UPDATE ON lessons
FOR EACH ROW
EXECUTE FUNCTION lessons_search_vector_trigger();

-- Update existing records
UPDATE lessons SET search_vector = search_vector WHERE search_vector IS NULL;

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_lessons_search_vector ON lessons USING GIN(search_vector);

-- Create trigram index for fuzzy matching
CREATE INDEX IF NOT EXISTS idx_lessons_title_trgm ON lessons USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_lessons_summary_trgm ON lessons USING GIN(summary gin_trgm_ops);

-- Create synonym mapping table
CREATE TABLE IF NOT EXISTS search_synonyms (
    id SERIAL PRIMARY KEY,
    term TEXT NOT NULL,
    synonyms TEXT[] NOT NULL
);

-- Add common ingredient synonyms
INSERT INTO search_synonyms (term, synonyms) VALUES
    ('winter squash', ARRAY['butternut', 'butternut squash', 'pumpkin', 'acorn squash', 'kabocha']),
    ('greens', ARRAY['lettuce', 'spinach', 'kale', 'chard', 'collards', 'arugula']),
    ('herbs', ARRAY['basil', 'cilantro', 'parsley', 'mint', 'oregano', 'thyme']),
    ('citrus', ARRAY['lemon', 'lime', 'orange', 'grapefruit']),
    ('beans', ARRAY['black beans', 'kidney beans', 'chickpeas', 'lentils', 'pinto beans']);

-- Create cultural heritage hierarchy
CREATE TABLE IF NOT EXISTS cultural_heritage_hierarchy (
    id SERIAL PRIMARY KEY,
    parent TEXT NOT NULL,
    children TEXT[] NOT NULL
);

INSERT INTO cultural_heritage_hierarchy (parent, children) VALUES
    ('Asian', ARRAY['Chinese', 'Japanese', 'Korean', 'Thai', 'Vietnamese', 'Indian']),
    ('Latin American', ARRAY['Mexican', 'Puerto Rican', 'Dominican', 'Cuban', 'Central American', 'South American']),
    ('European', ARRAY['Italian', 'French', 'Spanish', 'German', 'Greek', 'Eastern European']),
    ('African', ARRAY['West African', 'East African', 'North African']),
    ('Middle Eastern', ARRAY['Turkish', 'Lebanese', 'Israeli', 'Persian']);