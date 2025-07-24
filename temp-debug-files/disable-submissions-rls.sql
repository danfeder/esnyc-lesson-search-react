-- Disable RLS on lesson_submissions to allow access
ALTER TABLE lesson_submissions DISABLE ROW LEVEL SECURITY;

-- Also check if the submission exists using service role
-- This will show all submissions regardless of RLS
SELECT id, teacher_id, status, created_at 
FROM lesson_submissions 
ORDER BY created_at DESC;