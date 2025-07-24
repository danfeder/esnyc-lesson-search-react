-- Setup Test Users for Lesson Submission Pipeline
-- Run this in Supabase SQL Editor after users have signed up

-- First, check existing users
SELECT 
  au.id,
  au.email,
  up.role,
  up.full_name,
  up.created_at
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE au.email IN ('teacher@example.com', 'reviewer@example.com', 'admin@example.com')
ORDER BY au.created_at DESC;

-- Update roles for test users (run after signup)
-- Make sure to update the IDs based on the query above

-- Set reviewer role
UPDATE user_profiles 
SET 
  role = 'reviewer',
  full_name = 'Test Reviewer'
WHERE email = 'reviewer@example.com';

-- Set admin role (if needed)
UPDATE user_profiles 
SET 
  role = 'admin',
  full_name = 'Test Admin'
WHERE email = 'admin@example.com';

-- Ensure teacher has correct role (should be default)
UPDATE user_profiles 
SET 
  role = 'teacher',
  full_name = 'Test Teacher'
WHERE email = 'teacher@example.com';

-- Verify the updates
SELECT 
  id,
  email,
  role,
  full_name
FROM user_profiles
WHERE email IN ('teacher@example.com', 'reviewer@example.com', 'admin@example.com');

-- Create some test submissions (optional - for testing review dashboard)
-- Replace teacher_id with actual ID from first query
/*
INSERT INTO lesson_submissions (
  teacher_id,
  google_doc_url,
  google_doc_id,
  submission_type,
  status,
  extracted_content,
  content_hash
) VALUES 
(
  'TEACHER_USER_ID_HERE',
  'https://docs.google.com/document/d/test-doc-1/edit',
  'test-doc-1',
  'new',
  'submitted',
  'Test Lesson: Garden Pizza Making\n\nThis is a test lesson about making pizza in the school garden.',
  'test-hash-1'
),
(
  'TEACHER_USER_ID_HERE',
  'https://docs.google.com/document/d/test-doc-2/edit',
  'test-doc-2',
  'update',
  'submitted',
  'Test Lesson: Composting Basics\n\nLearn the fundamentals of composting.',
  'test-hash-2'
);
*/