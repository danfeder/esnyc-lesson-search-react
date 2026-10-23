-- One-time backfill: derive lesson titles from submission extracted_content
-- Updates only rows with title='Untitled Lesson' and a linked submission.

WITH derived AS (
  SELECT 
    l.lesson_id,
    (
      SELECT ln
      FROM (
        SELECT btrim(x) AS ln
        FROM regexp_split_to_table(s.extracted_content, E'\r?\n') AS x
      ) t
      WHERE ln <> ''
        AND ln <> '---'
        AND ln !~ '^\[.*\]'
        AND ln !~* '^summary\s*:'
      LIMIT 1
    ) AS new_title
  FROM lessons l
  JOIN lesson_submissions s ON s.id = l.original_submission_id
  WHERE l.title = 'Untitled Lesson'
)
UPDATE lessons l
SET title = d.new_title
FROM derived d
WHERE l.lesson_id = d.lesson_id
  AND d.new_title IS NOT NULL
  AND d.new_title <> '';

-- Verify:
--   SELECT lesson_id, title FROM lessons WHERE original_submission_id IS NOT NULL AND title='Untitled Lesson' LIMIT 20;

