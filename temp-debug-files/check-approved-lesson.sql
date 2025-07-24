-- Check if the approved lesson was created in the lessons table
SELECT 
  lesson_id,
  title,
  summary,
  grade_levels,
  metadata,
  original_submission_id,
  created_at
FROM lessons
WHERE original_submission_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;

-- Also check the specific submission that was just approved
SELECT 
  id,
  status,
  reviewed_at,
  reviewed_by
FROM lesson_submissions
WHERE status = 'approved'
ORDER BY reviewed_at DESC
LIMIT 5;