-- =====================================================
-- 03. SEARCH FUNCTIONALITY - Full-text and Vector Search
-- =====================================================
-- This migration consolidates all search-related functions,
-- indexes, and optimizations

-- =====================================================
-- SEARCH VECTOR CONFIGURATION
-- =====================================================

-- Create function to generate search vector with proper weights
CREATE OR REPLACE FUNCTION generate_search_vector(
  p_title TEXT,
  p_summary TEXT,
  p_ingredients JSONB,
  p_skills JSONB,
  p_themes JSONB,
  p_cultural_heritage JSONB
) RETURNS tsvector AS $$
DECLARE
  ingredients_text TEXT;
  skills_text TEXT;
  themes_text TEXT;
  cultural_text TEXT;
BEGIN
  -- Extract text from JSONB arrays
  ingredients_text := COALESCE(
    (SELECT string_agg(value::text, ' ') FROM jsonb_array_elements_text(p_ingredients)),
    ''
  );
  
  skills_text := COALESCE(
    (SELECT string_agg(value::text, ' ') FROM jsonb_array_elements_text(
      COALESCE(p_skills->'garden_skills', '[]'::jsonb) || 
      COALESCE(p_skills->'cooking_skills', '[]'::jsonb)
    )),
    ''
  );
  
  themes_text := COALESCE(
    (SELECT string_agg(value::text, ' ') FROM jsonb_array_elements_text(p_themes)),
    ''
  );
  
  cultural_text := COALESCE(
    (SELECT string_agg(value::text, ' ') FROM jsonb_array_elements_text(p_cultural_heritage)),
    ''
  );
  
  -- Generate weighted search vector
  RETURN 
    setweight(to_tsvector('english', COALESCE(p_title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(p_summary, '')), 'B') ||
    setweight(to_tsvector('english', ingredients_text), 'B') ||
    setweight(to_tsvector('english', skills_text), 'C') ||
    setweight(to_tsvector('english', themes_text), 'C') ||
    setweight(to_tsvector('english', cultural_text), 'C');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Update search vectors for existing lessons
UPDATE lessons 
SET search_vector = generate_search_vector(
  title, 
  summary, 
  ingredients, 
  skills,
  themes_and_topics,
  cultural_heritage
);

-- Create trigger to maintain search vector
CREATE OR REPLACE FUNCTION update_lesson_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := generate_search_vector(
    NEW.title,
    NEW.summary,
    NEW.ingredients,
    NEW.skills,
    NEW.themes_and_topics,
    NEW.cultural_heritage
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_lesson_search_vector_trigger ON lessons;
CREATE TRIGGER update_lesson_search_vector_trigger
  BEFORE INSERT OR UPDATE ON lessons
  FOR EACH ROW
  EXECUTE FUNCTION update_lesson_search_vector();

-- =====================================================
-- SEARCH INDEXES
-- =====================================================

-- GIN index for full-text search
CREATE INDEX IF NOT EXISTS idx_lessons_search_vector 
ON lessons USING gin(search_vector);

-- Indexes for filter performance
CREATE INDEX IF NOT EXISTS idx_lessons_location ON lessons(location);
CREATE INDEX IF NOT EXISTS idx_lessons_season ON lessons(season);
CREATE INDEX IF NOT EXISTS idx_lessons_grade_level ON lessons USING gin(grade_level);
CREATE INDEX IF NOT EXISTS idx_lessons_activity_type ON lessons USING gin(activity_type);
CREATE INDEX IF NOT EXISTS idx_lessons_themes ON lessons USING gin(themes_and_topics);
CREATE INDEX IF NOT EXISTS idx_lessons_core_competencies ON lessons USING gin(core_competencies);
CREATE INDEX IF NOT EXISTS idx_lessons_cultural_heritage ON lessons USING gin(cultural_heritage);
CREATE INDEX IF NOT EXISTS idx_lessons_academic_integration ON lessons USING gin(academic_integration);
CREATE INDEX IF NOT EXISTS idx_lessons_sel ON lessons USING gin(social_emotional_learning);

-- Indexes for granular boolean columns
CREATE INDEX IF NOT EXISTS idx_lessons_themes_bool ON lessons(
  theme_garden_basics,
  theme_plant_growth,
  theme_garden_communities,
  theme_ecosystems,
  theme_seed_to_table,
  theme_food_systems,
  theme_food_justice
);

CREATE INDEX IF NOT EXISTS idx_lessons_academic_bool ON lessons(
  academic_math,
  academic_science,
  academic_literacy_ela,
  academic_social_studies,
  academic_health,
  academic_arts
);

CREATE INDEX IF NOT EXISTS idx_lessons_sel_bool ON lessons(
  sel_self_awareness,
  sel_self_management,
  sel_social_awareness,
  sel_relationship_skills,
  sel_responsible_decision_making
);

CREATE INDEX IF NOT EXISTS idx_lessons_competency_bool ON lessons(
  competency_growing_food,
  competency_preparing_food,
  competency_healthy_choices,
  competency_nature_exploration,
  competency_community_building,
  competency_cultural_connections
);

-- Vector similarity index (if using embeddings)
CREATE INDEX IF NOT EXISTS idx_lessons_embedding 
ON lessons USING ivfflat (content_embedding vector_cosine_ops)
WITH (lists = 100);

-- Composite index for lesson format and cooking method filters
CREATE INDEX IF NOT EXISTS idx_lessons_format_method 
ON lessons(lesson_format, cooking_method);

-- =====================================================
-- MAIN SEARCH FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION search_lessons(
  search_query TEXT DEFAULT NULL,
  location_filter TEXT DEFAULT NULL,
  grade_levels TEXT[] DEFAULT NULL,
  activity_types TEXT[] DEFAULT NULL,
  seasons TEXT[] DEFAULT NULL,
  themes TEXT[] DEFAULT NULL,
  competencies TEXT[] DEFAULT NULL,
  cultural_heritage_filter TEXT[] DEFAULT NULL,
  academic_integration_filter TEXT[] DEFAULT NULL,
  sel_filter TEXT[] DEFAULT NULL,
  lesson_format_filter TEXT DEFAULT NULL,
  cooking_method_filter TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  summary TEXT,
  location TEXT,
  duration_in_minutes INTEGER,
  season TEXT,
  grade_level JSONB,
  activity_type JSONB,
  themes_and_topics JSONB,
  core_competencies JSONB,
  cultural_heritage JSONB,
  academic_integration JSONB,
  social_emotional_learning JSONB,
  lesson_format TEXT,
  cooking_method TEXT,
  ingredients JSONB,
  rank REAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id,
    l.title,
    l.summary,
    l.location,
    l.duration_in_minutes,
    l.season,
    l.grade_level,
    l.activity_type,
    l.themes_and_topics,
    l.core_competencies,
    l.cultural_heritage,
    l.academic_integration,
    l.social_emotional_learning,
    l.lesson_format,
    l.cooking_method,
    l.ingredients,
    CASE 
      WHEN search_query IS NOT NULL AND search_query != '' 
      THEN ts_rank(l.search_vector, websearch_to_tsquery('english', search_query))
      ELSE 0
    END as rank
  FROM lessons l
  WHERE 
    -- Text search
    (search_query IS NULL OR search_query = '' OR 
     l.search_vector @@ websearch_to_tsquery('english', search_query))
    
    -- Location filter
    AND (location_filter IS NULL OR 
         location_filter = 'All' OR 
         l.location = location_filter)
    
    -- Grade level filter
    AND (grade_levels IS NULL OR 
         grade_levels = '{}' OR 
         l.grade_level ?| grade_levels)
    
    -- Activity type filter
    AND (activity_types IS NULL OR 
         activity_types = '{}' OR 
         l.activity_type ?| activity_types)
    
    -- Season filter
    AND (seasons IS NULL OR 
         seasons = '{}' OR 
         l.season = ANY(seasons))
    
    -- Themes filter using boolean columns for performance
    AND (themes IS NULL OR themes = '{}' OR (
      ('Garden Basics' = ANY(themes) AND l.theme_garden_basics) OR
      ('Plant Growth' = ANY(themes) AND l.theme_plant_growth) OR
      ('Garden Communities' = ANY(themes) AND l.theme_garden_communities) OR
      ('Ecosystems' = ANY(themes) AND l.theme_ecosystems) OR
      ('Seed to Table' = ANY(themes) AND l.theme_seed_to_table) OR
      ('Food Systems' = ANY(themes) AND l.theme_food_systems) OR
      ('Food Justice' = ANY(themes) AND l.theme_food_justice)
    ))
    
    -- Core competencies filter using boolean columns
    AND (competencies IS NULL OR competencies = '{}' OR (
      ('Growing Food' = ANY(competencies) AND l.competency_growing_food) OR
      ('Preparing Food' = ANY(competencies) AND l.competency_preparing_food) OR
      ('Making Healthy Food Choices' = ANY(competencies) AND l.competency_healthy_choices) OR
      ('Exploring Nature' = ANY(competencies) AND l.competency_nature_exploration) OR
      ('Building Community' = ANY(competencies) AND l.competency_community_building) OR
      ('Making Cultural Connections' = ANY(competencies) AND l.competency_cultural_connections)
    ))
    
    -- Cultural heritage filter
    AND (cultural_heritage_filter IS NULL OR 
         cultural_heritage_filter = '{}' OR 
         l.cultural_heritage ?| cultural_heritage_filter)
    
    -- Academic integration filter using boolean columns
    AND (academic_integration_filter IS NULL OR academic_integration_filter = '{}' OR (
      ('Math' = ANY(academic_integration_filter) AND l.academic_math) OR
      ('Science' = ANY(academic_integration_filter) AND l.academic_science) OR
      ('Literacy/ELA' = ANY(academic_integration_filter) AND l.academic_literacy_ela) OR
      ('Social Studies' = ANY(academic_integration_filter) AND l.academic_social_studies) OR
      ('Health' = ANY(academic_integration_filter) AND l.academic_health) OR
      ('Arts' = ANY(academic_integration_filter) AND l.academic_arts)
    ))
    
    -- SEL filter using boolean columns
    AND (sel_filter IS NULL OR sel_filter = '{}' OR (
      ('Self-awareness' = ANY(sel_filter) AND l.sel_self_awareness) OR
      ('Self-management' = ANY(sel_filter) AND l.sel_self_management) OR
      ('Social awareness' = ANY(sel_filter) AND l.sel_social_awareness) OR
      ('Relationship skills' = ANY(sel_filter) AND l.sel_relationship_skills) OR
      ('Responsible decision making' = ANY(sel_filter) AND l.sel_responsible_decision_making)
    ))
    
    -- Lesson format filter
    AND (lesson_format_filter IS NULL OR 
         l.lesson_format = lesson_format_filter)
    
    -- Cooking method filter
    AND (cooking_method_filter IS NULL OR 
         l.cooking_method = cooking_method_filter)
  
  ORDER BY 
    CASE 
      WHEN search_query IS NOT NULL AND search_query != ''
      THEN ts_rank(l.search_vector, websearch_to_tsquery('english', search_query))
      ELSE 0
    END DESC,
    l.title ASC;
END;
$$;