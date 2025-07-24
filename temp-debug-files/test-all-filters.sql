-- Test Suite for PostgreSQL Search Implementation
-- Run each section and verify the results

-- 1. Test Text Search with Synonyms
SELECT '=== TEST 1: Text Search with Synonyms ===' as test;
SELECT lesson_id, title, rank FROM search_lessons('squash') LIMIT 3;
-- Should find lessons with butternut, pumpkin, etc.

-- 2. Test Grade Level Filter
SELECT '=== TEST 2: Grade Level Filter ===' as test;
SELECT COUNT(*) as count, 'Kindergarten' as filter FROM search_lessons(filter_grade_levels := ARRAY['K']::text[])
UNION ALL
SELECT COUNT(*), 'Grades 3-5' FROM search_lessons(filter_grade_levels := ARRAY['3','4','5']::text[]);

-- 3. Test Location Filter (with our fix)
SELECT '=== TEST 3: Location Filter ===' as test;
SELECT COUNT(*) as count, 'Indoor' as location FROM search_lessons(filter_location := ARRAY['Indoor']::text[])
UNION ALL
SELECT COUNT(*), 'Outdoor' FROM search_lessons(filter_location := ARRAY['Outdoor']::text[])
UNION ALL
SELECT COUNT(*), 'Both' FROM search_lessons(filter_location := ARRAY['Both']::text[]);

-- 4. Test Season Filter
SELECT '=== TEST 4: Season Filter ===' as test;
SELECT COUNT(*) as count, 'Fall' as season FROM search_lessons(filter_seasons := ARRAY['Fall']::text[])
UNION ALL
SELECT COUNT(*), 'Spring' FROM search_lessons(filter_seasons := ARRAY['Spring']::text[]);

-- 5. Test Cultural Heritage Hierarchy
SELECT '=== TEST 5: Cultural Heritage Hierarchy ===' as test;
SELECT COUNT(*) as count, 'Asian (should include Chinese, Japanese, Korean)' as culture 
FROM search_lessons(filter_cultures := ARRAY['Asian']::text[]);

-- 6. Test Combined Filters
SELECT '=== TEST 6: Combined Filters ===' as test;
SELECT COUNT(*) as count, 'Indoor + Fall' as filters 
FROM search_lessons(
    filter_location := ARRAY['Indoor']::text[],
    filter_seasons := ARRAY['Fall']::text[]
)
UNION ALL
SELECT COUNT(*), 'Grades 3-5 + Indoor + Fall' 
FROM search_lessons(
    filter_grade_levels := ARRAY['3','4','5']::text[],
    filter_location := ARRAY['Indoor']::text[],
    filter_seasons := ARRAY['Fall']::text[]
);

-- 7. Test Search + Filters Combined
SELECT '=== TEST 7: Search + Filters ===' as test;
SELECT lesson_id, title, rank
FROM search_lessons(
    search_query := 'garden',
    filter_grade_levels := ARRAY['3','4','5']::text[]
)
LIMIT 5;

-- 8. Test Pagination
SELECT '=== TEST 8: Pagination ===' as test;
SELECT COUNT(*) as page1_count FROM search_lessons(page_size := 10, page_offset := 0)
UNION ALL
SELECT COUNT(*) as page2_count FROM search_lessons(page_size := 10, page_offset := 10);

-- 9. Verify Total Count is Correct
SELECT '=== TEST 9: Total Count ===' as test;
SELECT DISTINCT total_count, 'Should be 832' as expected
FROM search_lessons()
LIMIT 1;

-- 10. Sample Results to Verify Data Structure
SELECT '=== TEST 10: Sample Data Structure ===' as test;
SELECT 
    lesson_id,
    title,
    grade_levels,
    metadata->>'locationRequirements' as location,
    jsonb_pretty(metadata->'seasonTiming') as seasons
FROM search_lessons()
LIMIT 2;