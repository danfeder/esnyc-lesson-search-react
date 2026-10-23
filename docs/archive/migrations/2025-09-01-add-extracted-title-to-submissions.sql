-- Add extracted_title to lesson_submissions to persist the document title

ALTER TABLE public.lesson_submissions
  ADD COLUMN IF NOT EXISTS extracted_title text;

-- Optional: backfill from extracted_content for existing rows
-- (picks first meaningful non-empty line, skipping separators and summary headers)
WITH derived AS (
  SELECT 
    s.id,
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
  FROM public.lesson_submissions s
  WHERE s.extracted_title IS NULL OR s.extracted_title = ''
)
UPDATE public.lesson_submissions s
SET extracted_title = d.new_title
FROM derived d
WHERE s.id = d.id AND d.new_title IS NOT NULL AND d.new_title <> '';

