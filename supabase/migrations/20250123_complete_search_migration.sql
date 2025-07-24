-- ============================================
-- Complete PostgreSQL Search Migration
-- Replaces Algolia with native PostgreSQL search
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- For typo tolerance
CREATE EXTENSION IF NOT EXISTS unaccent; -- For accent-insensitive search

-- ============================================
-- 1. Add search vector column and trigger
-- ============================================

-- Add tsvector column for full-text search
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to generate search vector with weighted fields
CREATE OR REPLACE FUNCTION update_search_vector() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.summary, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.metadata->>'mainIngredients', '') || ' ' || 
                                         COALESCE(NEW.metadata->>'skills', '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.metadata->>'thematicCategories', '') || ' ' || 
                                         COALESCE(NEW.metadata->>'culturalHeritage', '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(NEW.content_text, '')), 'D');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update search vector
DROP TRIGGER IF EXISTS update_lessons_search_vector ON lessons;
CREATE TRIGGER update_lessons_search_vector 
BEFORE INSERT OR UPDATE ON lessons
FOR EACH ROW EXECUTE FUNCTION update_search_vector();

-- Update existing records
UPDATE lessons SET search_vector = search_vector WHERE search_vector IS NULL;

-- ============================================
-- 2. Create synonyms table and data
-- ============================================

-- Drop existing tables if they exist
DROP TABLE IF EXISTS search_synonyms CASCADE;

-- Create synonyms table
CREATE TABLE search_synonyms (
    id SERIAL PRIMARY KEY,
    term TEXT NOT NULL,
    synonyms TEXT[] NOT NULL,
    synonym_type TEXT CHECK (synonym_type IN ('bidirectional', 'oneway', 'typo_correction'))
);

-- Create index for fast synonym lookups
CREATE INDEX idx_synonyms_term ON search_synonyms(lower(term));
CREATE INDEX idx_synonyms_array ON search_synonyms USING GIN(synonyms);

-- Insert bidirectional synonyms (regular synonyms)
INSERT INTO search_synonyms (term, synonyms, synonym_type) VALUES
-- Gender terms
('woman', ARRAY['women', 'female', 'lady', 'ladies'], 'bidirectional'),
('man', ARRAY['men', 'male', 'gentleman', 'gentlemen'], 'bidirectional'),
('child', ARRAY['children', 'kid', 'kids', 'student', 'students'], 'bidirectional'),

-- Food terms
('vegetable', ARRAY['vegetables', 'veggie', 'veggies', 'veg'], 'bidirectional'),
('herb', ARRAY['herbs', 'spice', 'spices', 'seasoning', 'seasonings'], 'bidirectional'),
('squash', ARRAY['butternut', 'acorn', 'pumpkin', 'kabocha', 'delicata'], 'bidirectional'),
('greens', ARRAY['kale', 'spinach', 'lettuce', 'chard', 'collards', 'arugula'], 'bidirectional'),
('roots', ARRAY['carrot', 'potato', 'beet', 'turnip', 'radish'], 'bidirectional'),

-- Activity terms
('cooking', ARRAY['cook', 'culinary', 'kitchen', 'baking', 'bake'], 'bidirectional'),
('garden', ARRAY['gardening', 'planting', 'plant', 'growing', 'grow', 'cultivation'], 'bidirectional'),
('harvest', ARRAY['harvesting', 'picking', 'gathering', 'collecting'], 'bidirectional'),
('recipe', ARRAY['recipes', 'instructions', 'directions'], 'bidirectional'),

-- Grade levels
('3', ARRAY['3rd', 'third', 'three'], 'bidirectional'),
('4', ARRAY['4th', 'fourth', 'four'], 'bidirectional'),
('5', ARRAY['5th', 'fifth', 'five'], 'bidirectional'),
('6', ARRAY['6th', 'sixth', 'six'], 'bidirectional'),
('7', ARRAY['7th', 'seventh', 'seven'], 'bidirectional'),
('8', ARRAY['8th', 'eighth', 'eight'], 'bidirectional'),
('k', ARRAY['kindergarten', 'kinder'], 'bidirectional'),
('pk', ARRAY['prek', 'prekindergarten', '3k', '4k'], 'bidirectional'),

-- School terms
('elementary', ARRAY['elem', 'primary'], 'bidirectional'),
('middle', ARRAY['ms', 'intermediate'], 'bidirectional'),

-- Seasons
('fall', ARRAY['autumn', 'september', 'october', 'november'], 'bidirectional'),
('winter', ARRAY['december', 'january', 'february'], 'bidirectional'),
('spring', ARRAY['march', 'april', 'may'], 'bidirectional'),
('summer', ARRAY['june', 'july', 'august'], 'bidirectional'),

-- Holidays (bidirectional version)
('thanksgiving', ARRAY['gratitude', 'harvest'], 'bidirectional'),

-- Other terms
('healthy', ARRAY['healthful', 'nutritious', 'wholesome'], 'bidirectional'),
('quick', ARRAY['fast', 'easy', 'simple'], 'bidirectional'),
('nutrition', ARRAY['nutrients', 'dietary', 'diet', 'eating'], 'bidirectional'),
('activity', ARRAY['activities', 'lesson', 'lessons', 'project', 'projects'], 'bidirectional');

-- Insert one-way synonyms (hierarchical)
INSERT INTO search_synonyms (term, synonyms, synonym_type) VALUES
('asian', ARRAY['chinese', 'japanese', 'korean', 'vietnamese', 'thai', 'indian', 'filipino'], 'oneway'),
('hispanic', ARRAY['latino', 'latina', 'latinx', 'mexican', 'spanish', 'caribbean'], 'oneway'),
('latin', ARRAY['latino', 'latina', 'latinx', 'mexican', 'spanish', 'caribbean'], 'oneway'),
('mediterranean', ARRAY['italian', 'greek', 'spanish', 'turkish', 'moroccan'], 'oneway'),
('african', ARRAY['ethiopian', 'nigerian', 'moroccan'], 'oneway'),
('citrus', ARRAY['orange', 'lemon', 'lime', 'grapefruit', 'tangerine'], 'oneway'),
('berries', ARRAY['strawberry', 'blueberry', 'raspberry', 'blackberry', 'cranberry'], 'oneway'),
('thanksgiving', ARRAY['harvest', 'turkey', 'gratitude', 'cranberry', 'pumpkin'], 'oneway'),
('christmas', ARRAY['holiday', 'gingerbread'], 'oneway'),
('halloween', ARRAY['pumpkin', 'october'], 'oneway'),
('valentine', ARRAY['love', 'heart', 'february'], 'oneway'),
('easter', ARRAY['eggs', 'april', 'bunny'], 'oneway');

-- Insert typo corrections
INSERT INTO search_synonyms (term, synonyms, synonym_type) VALUES
('pumkin', ARRAY['pumpkin'], 'typo_correction'),
('vegitable', ARRAY['vegetable'], 'typo_correction'),
('vegitables', ARRAY['vegetables'], 'typo_correction'),
('reciepe', ARRAY['recipe'], 'typo_correction'),
('reciepes', ARRAY['recipes'], 'typo_correction'),
('kindergarden', ARRAY['kindergarten'], 'typo_correction'),
('elementry', ARRAY['elementary'], 'typo_correction'),
('nutrtion', ARRAY['nutrition'], 'typo_correction'),
('healty', ARRAY['healthy'], 'typo_correction'),
('womens', ARRAY['women''s'], 'typo_correction'),
('childrens', ARRAY['children''s'], 'typo_correction'),
('cookin', ARRAY['cooking'], 'typo_correction'),
('plantin', ARRAY['planting'], 'typo_correction'),
('growin', ARRAY['growing'], 'typo_correction'),
('skwash', ARRAY['squash'], 'typo_correction'),
('tomatoe', ARRAY['tomato'], 'typo_correction'),
('potatos', ARRAY['potatoes'], 'typo_correction');

-- ============================================
-- 3. Cultural Heritage Hierarchy
-- ============================================

-- Drop existing table if it exists
DROP TABLE IF EXISTS cultural_heritage_hierarchy CASCADE;

-- Create cultural heritage hierarchy
CREATE TABLE cultural_heritage_hierarchy (
    id SERIAL PRIMARY KEY,
    parent TEXT NOT NULL,
    children TEXT[] NOT NULL
);

-- Insert hierarchy data from one-way synonyms
INSERT INTO cultural_heritage_hierarchy (parent, children) VALUES
('Asian', ARRAY['Chinese', 'Japanese', 'Korean', 'Vietnamese', 'Thai', 'Indian', 'Filipino']),
('Latin American', ARRAY['Mexican', 'Puerto Rican', 'Dominican', 'Cuban', 'Central American', 'South American']),
('European', ARRAY['Italian', 'French', 'Spanish', 'German', 'Greek', 'Eastern European']),
('African', ARRAY['West African', 'East African', 'North African', 'Ethiopian', 'Nigerian', 'Moroccan']),
('Middle Eastern', ARRAY['Turkish', 'Lebanese', 'Israeli', 'Persian']),
('Mediterranean', ARRAY['Italian', 'Greek', 'Spanish', 'Turkish', 'Moroccan']);

-- ============================================
-- 4. Search Functions
-- ============================================

-- Function to expand search terms with synonyms
CREATE OR REPLACE FUNCTION expand_search_with_synonyms(query_text TEXT) RETURNS TEXT AS $$
DECLARE
    words TEXT[];
    expanded_words TEXT[] := '{}';
    word TEXT;
    synonym_record RECORD;
    final_query TEXT;
BEGIN
    -- Handle empty query
    IF query_text IS NULL OR query_text = '' THEN
        RETURN NULL;
    END IF;
    
    -- Split query into words
    words := string_to_array(lower(trim(query_text)), ' ');
    
    FOREACH word IN ARRAY words LOOP
        -- Skip empty words
        CONTINUE WHEN word = '';
        
        -- Add original word
        expanded_words := array_append(expanded_words, word);
        
        -- Find synonyms
        FOR synonym_record IN 
            SELECT * FROM search_synonyms 
            WHERE (lower(term) = word AND synonym_type IN ('bidirectional', 'oneway', 'typo_correction'))
               OR (word = ANY(array(SELECT lower(unnest(synonyms)))) AND synonym_type = 'bidirectional')
        LOOP
            IF synonym_record.synonym_type = 'bidirectional' THEN
                -- Add all synonyms and the term
                expanded_words := expanded_words || array(SELECT lower(unnest(synonym_record.synonyms)));
                IF lower(synonym_record.term) != word THEN
                    expanded_words := array_append(expanded_words, lower(synonym_record.term));
                END IF;
            ELSIF synonym_record.synonym_type IN ('oneway', 'typo_correction') THEN
                -- Only add synonyms if term matches
                IF lower(synonym_record.term) = word THEN
                    expanded_words := expanded_words || array(SELECT lower(unnest(synonym_record.synonyms)));
                END IF;
            END IF;
        END LOOP;
    END LOOP;
    
    -- Remove duplicates and create OR query
    SELECT string_agg(DISTINCT unnest, ' | ') INTO final_query FROM unnest(expanded_words);
    
    RETURN final_query;
END;
$$ LANGUAGE plpgsql;

-- Function to expand cultural heritage selections
CREATE OR REPLACE FUNCTION expand_cultural_heritage(cultures TEXT[]) RETURNS TEXT[] AS $$
DECLARE
    expanded TEXT[] := cultures;
    hierarchy_record RECORD;
BEGIN
    -- Add child cultures for any parent cultures selected
    FOR hierarchy_record IN 
        SELECT * FROM cultural_heritage_hierarchy 
        WHERE parent = ANY(cultures)
    LOOP
        expanded := expanded || hierarchy_record.children;
    END LOOP;
    
    -- Remove duplicates
    RETURN ARRAY(SELECT DISTINCT unnest(expanded));
END;
$$ LANGUAGE plpgsql;

-- Main search function
CREATE OR REPLACE FUNCTION search_lessons(
    search_query TEXT DEFAULT NULL,
    filter_grade_levels TEXT[] DEFAULT NULL,
    filter_themes TEXT[] DEFAULT NULL,
    filter_seasons TEXT[] DEFAULT NULL,
    filter_competencies TEXT[] DEFAULT NULL,
    filter_cultures TEXT[] DEFAULT NULL,
    filter_location TEXT[] DEFAULT NULL,
    filter_activity_type TEXT[] DEFAULT NULL,
    filter_lesson_format TEXT DEFAULT NULL,
    filter_academic TEXT[] DEFAULT NULL,
    filter_sel TEXT[] DEFAULT NULL,
    filter_cooking_method TEXT DEFAULT NULL,
    page_size INT DEFAULT 20,
    page_offset INT DEFAULT 0
) RETURNS TABLE (
    lesson_id TEXT,
    title TEXT,
    summary TEXT,
    file_link TEXT,
    grade_levels TEXT[],
    metadata JSONB,
    confidence JSONB,
    rank REAL,
    total_count BIGINT
) AS $$
DECLARE
    expanded_query TEXT;
    expanded_cultures TEXT[];
    base_query TEXT;
    count_query TEXT;
    total_results BIGINT;
BEGIN
    -- Expand query with synonyms
    IF search_query IS NOT NULL AND search_query != '' THEN
        expanded_query := expand_search_with_synonyms(search_query);
    END IF;
    
    -- Expand cultural heritage if needed
    IF filter_cultures IS NOT NULL THEN
        expanded_cultures := expand_cultural_heritage(filter_cultures);
    END IF;
    
    -- Count total results first
    SELECT COUNT(*) INTO total_results
    FROM lessons l
    WHERE 
        -- Text search or no search query
        (expanded_query IS NULL OR expanded_query = '' OR 
         l.search_vector @@ to_tsquery('english', expanded_query) OR
         -- Fallback to trigram search for better typo tolerance
         l.title % search_query OR l.summary % search_query)
        -- Grade levels filter
        AND (filter_grade_levels IS NULL OR l.grade_levels && filter_grade_levels)
        -- Thematic categories filter
        AND (filter_themes IS NULL OR 
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'thematicCategories') t 
                     WHERE t = ANY(filter_themes)))
        -- Season filter
        AND (filter_seasons IS NULL OR 
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'seasonTiming') s 
                     WHERE s = ANY(filter_seasons)))
        -- Core competencies filter
        AND (filter_competencies IS NULL OR 
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'coreCompetencies') c 
                     WHERE c = ANY(filter_competencies)))
        -- Cultural heritage filter (with hierarchy expansion)
        AND (expanded_cultures IS NULL OR 
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'culturalHeritage') c 
                     WHERE c = ANY(expanded_cultures)))
        -- Location filter
        AND (filter_location IS NULL OR 
             l.metadata->>'locationRequirements' = ANY(filter_location))
        -- Activity type filter
        AND (filter_activity_type IS NULL OR 
             l.metadata->>'activityType' = ANY(filter_activity_type))
        -- Lesson format filter
        AND (filter_lesson_format IS NULL OR 
             l.metadata->>'lessonFormat' = filter_lesson_format)
        -- Academic integration filter
        AND (filter_academic IS NULL OR 
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'academicIntegration'->'selected') a 
                     WHERE a = ANY(filter_academic)))
        -- SEL filter
        AND (filter_sel IS NULL OR 
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'socialEmotionalLearning') s 
                     WHERE s = ANY(filter_sel)))
        -- Cooking method filter
        AND (filter_cooking_method IS NULL OR 
             l.metadata->>'cookingMethods' = filter_cooking_method);
    
    -- Return results with pagination
    RETURN QUERY
    SELECT 
        l.lesson_id,
        l.title,
        l.summary,
        l.file_link,
        l.grade_levels,
        l.metadata,
        l.confidence,
        CASE 
            WHEN expanded_query IS NOT NULL AND expanded_query != '' THEN
                GREATEST(
                    ts_rank(l.search_vector, to_tsquery('english', expanded_query)),
                    similarity(l.title, search_query),
                    similarity(l.summary, search_query) * 0.8
                )
            ELSE 0
        END as rank,
        total_results
    FROM lessons l
    WHERE 
        -- Same WHERE conditions as count query
        (expanded_query IS NULL OR expanded_query = '' OR 
         l.search_vector @@ to_tsquery('english', expanded_query) OR
         l.title % search_query OR l.summary % search_query)
        AND (filter_grade_levels IS NULL OR l.grade_levels && filter_grade_levels)
        AND (filter_themes IS NULL OR 
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'thematicCategories') t 
                     WHERE t = ANY(filter_themes)))
        AND (filter_seasons IS NULL OR 
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'seasonTiming') s 
                     WHERE s = ANY(filter_seasons)))
        AND (filter_competencies IS NULL OR 
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'coreCompetencies') c 
                     WHERE c = ANY(filter_competencies)))
        AND (expanded_cultures IS NULL OR 
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'culturalHeritage') c 
                     WHERE c = ANY(expanded_cultures)))
        AND (filter_location IS NULL OR 
             l.metadata->>'locationRequirements' = ANY(filter_location))
        AND (filter_activity_type IS NULL OR 
             l.metadata->>'activityType' = ANY(filter_activity_type))
        AND (filter_lesson_format IS NULL OR 
             l.metadata->>'lessonFormat' = filter_lesson_format)
        AND (filter_academic IS NULL OR 
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'academicIntegration'->'selected') a 
                     WHERE a = ANY(filter_academic)))
        AND (filter_sel IS NULL OR 
             EXISTS (SELECT 1 FROM jsonb_array_elements_text(l.metadata->'socialEmotionalLearning') s 
                     WHERE s = ANY(filter_sel)))
        AND (filter_cooking_method IS NULL OR 
             l.metadata->>'cookingMethods' = filter_cooking_method)
    ORDER BY 
        rank DESC,
        COALESCE((l.confidence->>'overall')::float, 0) DESC,
        l.title ASC
    LIMIT page_size
    OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 5. Create all necessary indexes
-- ============================================

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_lessons_search_vector ON lessons USING GIN(search_vector);

-- Trigram indexes for typo tolerance
CREATE INDEX IF NOT EXISTS idx_lessons_title_trgm ON lessons USING GIN(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_lessons_summary_trgm ON lessons USING GIN(summary gin_trgm_ops);

-- Array indexes for filtering
CREATE INDEX IF NOT EXISTS idx_lessons_grade_levels ON lessons USING GIN(grade_levels);

-- JSONB indexes for metadata filtering
CREATE INDEX IF NOT EXISTS idx_lessons_themes ON lessons USING GIN((metadata->'thematicCategories'));
CREATE INDEX IF NOT EXISTS idx_lessons_seasons ON lessons USING GIN((metadata->'seasonTiming'));
CREATE INDEX IF NOT EXISTS idx_lessons_competencies ON lessons USING GIN((metadata->'coreCompetencies'));
CREATE INDEX IF NOT EXISTS idx_lessons_cultures ON lessons USING GIN((metadata->'culturalHeritage'));
CREATE INDEX IF NOT EXISTS idx_lessons_academic ON lessons USING GIN((metadata->'academicIntegration'->'selected'));
CREATE INDEX IF NOT EXISTS idx_lessons_sel ON lessons USING GIN((metadata->'socialEmotionalLearning'));

-- B-tree indexes for exact matches and sorting
CREATE INDEX IF NOT EXISTS idx_lessons_location ON lessons((metadata->>'locationRequirements'));
CREATE INDEX IF NOT EXISTS idx_lessons_activity_type ON lessons((metadata->>'activityType'));
CREATE INDEX IF NOT EXISTS idx_lessons_format ON lessons((metadata->>'lessonFormat'));
CREATE INDEX IF NOT EXISTS idx_lessons_cooking ON lessons((metadata->>'cookingMethods'));
CREATE INDEX IF NOT EXISTS idx_lessons_confidence ON lessons(((confidence->>'overall')::float));

-- ============================================
-- 6. Update all existing lessons to generate search vectors
-- ============================================

-- This will trigger the search vector generation for all existing lessons
UPDATE lessons SET updated_at = NOW() WHERE search_vector IS NULL;

-- ============================================
-- 7. Grant necessary permissions
-- ============================================

-- Grant usage on search functions to authenticated users
GRANT EXECUTE ON FUNCTION expand_search_with_synonyms(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION expand_cultural_heritage(TEXT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION search_lessons(TEXT, TEXT[], TEXT[], TEXT[], TEXT[], TEXT[], TEXT[], TEXT[], TEXT, TEXT[], TEXT[], TEXT, INT, INT) TO authenticated;

-- Grant read access to helper tables
GRANT SELECT ON search_synonyms TO authenticated;
GRANT SELECT ON cultural_heritage_hierarchy TO authenticated;