-- First, let's see what data we actually have
-- Check grade levels
SELECT 
    unnest(grade_levels) as grade,
    COUNT(*) as count
FROM lessons
GROUP BY grade
ORDER BY grade;

-- Check locations
SELECT 
    metadata->>'locationRequirements' as location,
    COUNT(*) as count
FROM lessons
WHERE metadata->>'locationRequirements' IS NOT NULL
GROUP BY location;

-- Check seasons
SELECT 
    jsonb_array_elements_text(metadata->'seasonTiming') as season,
    COUNT(*) as count
FROM lessons
WHERE metadata->'seasonTiming' IS NOT NULL
GROUP BY season;

-- Test each filter individually
SELECT 'Grade 3-5' as filter, COUNT(*) as count
FROM search_lessons(filter_grade_levels := ARRAY['3', '4', '5']::text[])
UNION ALL
SELECT 'Indoor only' as filter, COUNT(*) as count
FROM search_lessons(filter_location := ARRAY['Indoor']::text[])
UNION ALL
SELECT 'Fall only' as filter, COUNT(*) as count
FROM search_lessons(filter_seasons := ARRAY['Fall']::text[]);

-- Check if location data exists in the format we expect
SELECT 
    lesson_id,
    title,
    metadata->>'locationRequirements' as location,
    metadata->'seasonTiming' as seasons,
    grade_levels
FROM lessons
LIMIT 5;