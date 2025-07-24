-- Disable RLS on submission_reviews table to allow reviewers to create reviews
ALTER TABLE submission_reviews DISABLE ROW LEVEL SECURITY;

-- Also check that all related tables have RLS disabled for testing
-- These should already be disabled from previous migrations:
-- ALTER TABLE lesson_submissions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;