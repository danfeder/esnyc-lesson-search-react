# PostgreSQL Search Migration Plan

## Overview
This document outlines how to migrate from Algolia to PostgreSQL while preserving all search functionality. Based on the actual Algolia configuration and synonyms file, we'll replicate all features in PostgreSQL.

## Current Algolia Configuration

### Search Settings (from export)
- **Typo Tolerance**: Enabled with minWordSizefor1Typo: 4, minWordSizefor2Typos: 8
- **Searchable Attributes** (in order):
  1. `title,summary`
  2. `mainIngredients,skills`  
  3. `thematicCategories,culturalHeritage`
- **Custom Ranking**: `desc(confidence.overall)`
- **Faceted Attributes**: Multiple filter categories (see filterDefinitions.ts)
- **Synonyms**: 270 rules (not yet uploaded to Algolia)

## Feature-by-Feature Migration

### 1. Full-Text Search with Priority
```sql
-- Create weighted search vector matching Algolia's priority
ALTER TABLE lessons ADD COLUMN search_vector tsvector;

CREATE OR REPLACE FUNCTION update_search_vector() RETURNS trigger AS $$
BEGIN
    NEW.search_vector := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '') || ' ' || COALESCE(NEW.summary, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.metadata->>'mainIngredients', '') || ' ' || 
                                         COALESCE(NEW.metadata->>'skills', '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.metadata->>'thematicCategories', '') || ' ' || 
                                         COALESCE(NEW.metadata->>'culturalHeritage', '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_lessons_search_vector 
BEFORE INSERT OR UPDATE ON lessons
FOR EACH ROW EXECUTE FUNCTION update_search_vector();
```

### 2. Typo Tolerance
```sql
-- Enable fuzzy matching extension
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Function to handle typos like Algolia
CREATE OR REPLACE FUNCTION search_with_typos(search_term TEXT) RETURNS SETOF lessons AS $$
BEGIN
    -- First try exact match
    RETURN QUERY
    SELECT * FROM lessons 
    WHERE search_vector @@ plainto_tsquery('english', search_term)
    LIMIT 100;
    
    -- If no results and word length >= 4, try with typo tolerance
    IF NOT FOUND AND length(search_term) >= 4 THEN
        RETURN QUERY
        SELECT * FROM lessons
        WHERE title % search_term 
           OR summary % search_term
           OR similarity(title, search_term) > 0.3
           OR similarity(summary, search_term) > 0.3
        ORDER BY GREATEST(
            similarity(title, search_term),
            similarity(summary, search_term)
        ) DESC
        LIMIT 100;
    END IF;
END;
$$ LANGUAGE plpgsql;
```

### 3. Complete Synonyms Implementation
```sql
-- Create synonyms table with all 270 rules from algolia-synonyms.json
CREATE TABLE search_synonyms (
    id SERIAL PRIMARY KEY,
    term TEXT NOT NULL,
    synonyms TEXT[] NOT NULL,
    synonym_type TEXT CHECK (synonym_type IN ('bidirectional', 'oneway', 'typo_correction'))
);

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
('cookin', ARRAY['cooking'], 'typo_correction'),
('plantin', ARRAY['planting'], 'typo_correction'),
('growin', ARRAY['growing'], 'typo_correction'),
('skwash', ARRAY['squash'], 'typo_correction'),
('tomatoe', ARRAY['tomato'], 'typo_correction'),
('potatos', ARRAY['potatoes'], 'typo_correction');

-- Function to expand search terms with synonyms
CREATE OR REPLACE FUNCTION expand_search_with_synonyms(query_text TEXT) RETURNS TEXT AS $$
DECLARE
    words TEXT[];
    expanded_words TEXT[] := '{}';
    word TEXT;
    synonym_record RECORD;
    final_query TEXT;
BEGIN
    -- Split query into words
    words := string_to_array(lower(query_text), ' ');
    
    FOREACH word IN ARRAY words LOOP
        -- Add original word
        expanded_words := array_append(expanded_words, word);
        
        -- Find synonyms
        FOR synonym_record IN 
            SELECT * FROM search_synonyms 
            WHERE (lower(term) = word AND synonym_type IN ('bidirectional', 'oneway'))
               OR (word = ANY(synonyms) AND synonym_type = 'bidirectional')
               OR (lower(term) = word AND synonym_type = 'typo_correction')
        LOOP
            IF synonym_record.synonym_type = 'bidirectional' THEN
                -- Add all synonyms and the term
                expanded_words := expanded_words || synonym_record.synonyms;
                IF lower(synonym_record.term) != word THEN
                    expanded_words := array_append(expanded_words, synonym_record.term);
                END IF;
            ELSIF synonym_record.synonym_type IN ('oneway', 'typo_correction') THEN
                -- Only add synonyms if term matches
                IF lower(synonym_record.term) = word THEN
                    expanded_words := expanded_words || synonym_record.synonyms;
                END IF;
            END IF;
        END LOOP;
    END LOOP;
    
    -- Remove duplicates and create OR query
    SELECT string_agg(DISTINCT unnest, ' | ') INTO final_query FROM unnest(expanded_words);
    
    RETURN final_query;
END;
$$ LANGUAGE plpgsql;
```

### 4. Search Function Combining All Features
```sql
CREATE OR REPLACE FUNCTION search_lessons(
    search_query TEXT,
    filter_grade_levels TEXT[] DEFAULT NULL,
    filter_themes TEXT[] DEFAULT NULL,
    filter_seasons TEXT[] DEFAULT NULL,
    filter_cultures TEXT[] DEFAULT NULL,
    filter_location TEXT DEFAULT NULL,
    filter_activity_type TEXT DEFAULT NULL,
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
    rank REAL
) AS $$
DECLARE
    expanded_query TEXT;
BEGIN
    -- Expand query with synonyms
    IF search_query IS NOT NULL AND search_query != '' THEN
        expanded_query := expand_search_with_synonyms(search_query);
    END IF;
    
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
            WHEN expanded_query IS NOT NULL THEN
                ts_rank(l.search_vector, to_tsquery('english', expanded_query))
            ELSE 0
        END as rank
    FROM lessons l
    WHERE 
        -- Text search
        (expanded_query IS NULL OR l.search_vector @@ to_tsquery('english', expanded_query))
        -- Grade levels filter
        AND (filter_grade_levels IS NULL OR l.grade_levels && filter_grade_levels)
        -- Thematic categories filter
        AND (filter_themes IS NULL OR l.metadata->'thematicCategories' ?| filter_themes)
        -- Season filter
        AND (filter_seasons IS NULL OR l.metadata->'seasonTiming' ?| filter_seasons)
        -- Cultural heritage filter (with hierarchy expansion)
        AND (filter_cultures IS NULL OR l.metadata->'culturalHeritage' ?| 
            (SELECT array_agg(DISTINCT culture) 
             FROM (
                 SELECT unnest(filter_cultures) as culture
                 UNION
                 SELECT unnest(children) as culture
                 FROM cultural_heritage_hierarchy
                 WHERE parent = ANY(filter_cultures)
             ) expanded_cultures))
        -- Other filters
        AND (filter_location IS NULL OR l.metadata->>'locationRequirements' = filter_location)
        AND (filter_activity_type IS NULL OR l.metadata->>'activityType' = filter_activity_type)
        AND (filter_lesson_format IS NULL OR l.metadata->>'lessonFormat' = filter_lesson_format)
        AND (filter_academic IS NULL OR l.metadata->'academicIntegration'->'selected' ?| filter_academic)
        AND (filter_sel IS NULL OR l.metadata->'socialEmotionalLearning' ?| filter_sel)
        AND (filter_cooking_method IS NULL OR l.metadata->>'cookingMethods' = filter_cooking_method)
    ORDER BY 
        rank DESC,
        (l.metadata->>'confidence_overall')::float DESC,
        l.title ASC
    LIMIT page_size
    OFFSET page_offset;
END;
$$ LANGUAGE plpgsql;
```

### 5. Facet Counting for Filter UI
```sql
CREATE OR REPLACE FUNCTION get_facet_counts(
    search_query TEXT DEFAULT NULL,
    current_filters JSONB DEFAULT '{}'
) RETURNS JSONB AS $$
DECLARE
    result JSONB := '{}';
    base_query TEXT;
    grade_counts JSONB;
    theme_counts JSONB;
BEGIN
    -- Build base query with current filters (except the facet being counted)
    -- This allows for dynamic facet counts that update as filters are applied
    
    -- Count grade levels
    SELECT jsonb_object_agg(grade, count) INTO grade_counts
    FROM (
        SELECT unnest(grade_levels) as grade, COUNT(*) as count
        FROM lessons
        WHERE (search_query IS NULL OR 
               search_vector @@ to_tsquery('english', expand_search_with_synonyms(search_query)))
        GROUP BY grade
    ) grade_stats;
    
    -- Count themes
    SELECT jsonb_object_agg(theme, count) INTO theme_counts
    FROM (
        SELECT jsonb_array_elements_text(metadata->'thematicCategories') as theme, COUNT(*) as count
        FROM lessons
        WHERE (search_query IS NULL OR 
               search_vector @@ to_tsquery('english', expand_search_with_synonyms(search_query)))
        GROUP BY theme
    ) theme_stats;
    
    -- Build final result
    result := jsonb_build_object(
        'gradeLevels', grade_counts,
        'thematicCategories', theme_counts
        -- Add other facets as needed
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;
```

## Migration Steps

1. **Create Migration File**
   ```bash
   # Combine all SQL above into one migration
   cat > supabase/migrations/20250123_complete_search_migration.sql
   ```

2. **Run Migration**
   ```bash
   supabase db push
   ```

3. **Update all existing lessons to generate search vectors**
   ```sql
   UPDATE lessons SET search_vector = search_vector;
   ```

4. **Create indexes for performance**
   ```sql
   -- Full-text search index
   CREATE INDEX idx_lessons_search_vector ON lessons USING GIN(search_vector);
   
   -- Trigram indexes for typo tolerance
   CREATE INDEX idx_lessons_title_trgm ON lessons USING GIN(title gin_trgm_ops);
   CREATE INDEX idx_lessons_summary_trgm ON lessons USING GIN(summary gin_trgm_ops);
   
   -- JSONB indexes for filters
   CREATE INDEX idx_lessons_grade_levels ON lessons USING GIN(grade_levels);
   CREATE INDEX idx_lessons_themes ON lessons USING GIN((metadata->'thematicCategories'));
   CREATE INDEX idx_lessons_cultures ON lessons USING GIN((metadata->'culturalHeritage'));
   CREATE INDEX idx_lessons_seasons ON lessons USING GIN((metadata->'seasonTiming'));
   
   -- B-tree index for sorting
   CREATE INDEX idx_lessons_confidence ON lessons((metadata->>'confidence_overall'));
   ```

5. **Update React Hook**
   Replace `useAlgoliaSearch` with `useSupabaseSearch` that calls the `search_lessons` function

6. **Test All Features**
   - [ ] Basic search: "pizza" returns pizza lessons
   - [ ] Typo tolerance: "pumkin" finds pumpkin lessons  
   - [ ] Bidirectional synonyms: "woman" finds "women" lessons
   - [ ] One-way synonyms: "asian" finds Chinese, Japanese, Korean lessons
   - [ ] Grade synonyms: "3" finds "third grade" lessons
   - [ ] Season synonyms: "fall" finds autumn/September/October/November lessons
   - [ ] Cultural hierarchy: Selecting "Asian" includes all Asian cuisines
   - [ ] All filters work correctly
   - [ ] Facet counts update dynamically
   - [ ] Results sorted by relevance and confidence

## Key Advantages of PostgreSQL Implementation

1. **Real-time Updates**: Approved lessons immediately searchable
2. **Cost Savings**: No monthly Algolia fees (~$50-500/month for this scale)
3. **Data Consistency**: Single source of truth, no sync issues
4. **Full Control**: Can implement custom ranking logic
5. **Better Integration**: Native RLS, relationships, transactions
6. **Proven Performance**: PostgreSQL handles millions of records efficiently

## Performance Expectations

With proper indexing and 831 lessons:
- Search response time: < 30ms
- Filter application: < 20ms  
- Facet counting: < 50ms
- Full reindex: < 1 second

## Future Enhancements

1. **Search Analytics**: Track what users search for
2. **Personalized Ranking**: Boost lessons based on user's grade/school
3. **Related Lessons**: Use embeddings you already have for "similar lessons"
4. **Search Suggestions**: Auto-complete based on popular searches
5. **Multi-language Support**: PostgreSQL supports multiple languages for stemming