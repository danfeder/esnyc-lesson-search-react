-- Check Duplicate Resolution Results
-- Run these queries in your Supabase SQL editor to see what happened

-- 1. Check the resolution record - what was resolved
SELECT 
  dr.*,
  l.title as canonical_lesson_title
FROM duplicate_resolutions dr
JOIN lessons l ON l.lesson_id = dr.canonical_lesson_id
ORDER BY dr.resolved_at DESC;

-- 2. Check archived lessons - what got moved to archive
SELECT 
  la.lesson_id,
  la.title,
  la.canonical_id,
  la.archive_reason,
  la.archived_at,
  cl.title as canonical_lesson_title
FROM lesson_archive la
LEFT JOIN lessons cl ON cl.lesson_id = la.canonical_id
WHERE la.archive_reason = 'duplicate_resolution'
ORDER BY la.archived_at DESC;

-- 3. Check canonical mappings - see the duplicate-to-canonical relationships
SELECT 
  cm.duplicate_id,
  dl.title as duplicate_title,
  cm.canonical_id,
  cl.title as canonical_title,
  cm.similarity_score,
  cm.resolution_type,
  cm.resolved_at
FROM canonical_lessons cm
LEFT JOIN lesson_archive dl ON dl.lesson_id = cm.duplicate_id
LEFT JOIN lessons cl ON cl.lesson_id = cm.canonical_id
ORDER BY cm.resolved_at DESC;

-- 4. Check if metadata was merged - compare before/after for canonical lesson
-- Replace 'YOUR_CANONICAL_LESSON_ID' with the actual canonical lesson ID
SELECT 
  lesson_id,
  title,
  -- Array fields that might have been merged
  array_length(grade_levels, 1) as grade_levels_count,
  array_length(thematic_categories, 1) as thematic_categories_count,
  array_length(season_timing, 1) as season_timing_count,
  array_length(main_ingredients, 1) as main_ingredients_count,
  array_length(academic_integration, 1) as academic_integration_count,
  updated_at
FROM lessons
WHERE lesson_id = 'YOUR_CANONICAL_LESSON_ID';

-- 5. See the actual merged metadata from the resolution record
SELECT 
  group_id,
  canonical_lesson_id,
  action_taken,
  jsonb_pretty(metadata_merged) as merged_metadata,
  resolved_at
FROM duplicate_resolutions
WHERE metadata_merged IS NOT NULL
ORDER BY resolved_at DESC
LIMIT 5;

-- 6. Summary statistics
SELECT 
  COUNT(DISTINCT group_id) as total_groups_resolved,
  COUNT(DISTINCT canonical_lesson_id) as unique_canonical_lessons,
  SUM(lessons_in_group - 1) as total_duplicates_archived,
  COUNT(CASE WHEN action_taken = 'merge_and_archive' THEN 1 END) as merged_resolutions,
  COUNT(CASE WHEN action_taken = 'archive_only' THEN 1 END) as archive_only_resolutions
FROM duplicate_resolutions;

-- 7. Check for any lessons that no longer exist (were successfully archived)
-- This should return no results if the archiving worked correctly
SELECT duplicate_id 
FROM canonical_lessons 
WHERE duplicate_id IN (
  SELECT lesson_id FROM lessons
);