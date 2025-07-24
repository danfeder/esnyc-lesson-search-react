-- Test 1: Basic search
SELECT lesson_id, title, rank 
FROM search_lessons('tomato') 
LIMIT 5;

-- Test 2: Synonym search (should find butternut when searching for squash)
SELECT lesson_id, title, rank 
FROM search_lessons('squash') 
LIMIT 5;

-- Test 3: Cultural hierarchy (searching for "Asian" should find Chinese, Japanese, etc.)
SELECT lesson_id, title, metadata->'culturalHeritage' as cultures
FROM search_lessons(filter_cultures := ARRAY['Asian']::text[])
WHERE metadata->'culturalHeritage' ? 'Chinese' 
   OR metadata->'culturalHeritage' ? 'Japanese'
   OR metadata->'culturalHeritage' ? 'Korean'
LIMIT 5;

-- Test 4: Grade level filter
SELECT COUNT(*) as kindergarten_lessons
FROM search_lessons(filter_grade_levels := ARRAY['K']::text[]);

-- Test 5: Multiple filters combined
SELECT COUNT(*) as filtered_count
FROM search_lessons(
    filter_grade_levels := ARRAY['3', '4', '5']::text[],
    filter_location := ARRAY['Indoor']::text[],
    filter_seasons := ARRAY['Fall']::text[]
);