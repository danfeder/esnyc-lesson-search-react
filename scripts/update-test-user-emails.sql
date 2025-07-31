-- Script to add emails to test users that exist only in user_profiles
-- Run this after applying the migration that adds email column to user_profiles

-- First, check which users don't have auth.users records
SELECT 
  p.id,
  p.full_name,
  p.email,
  p.role,
  CASE 
    WHEN u.id IS NULL THEN 'Test User (No Auth)'
    ELSE 'Has Auth Record'
  END as status
FROM user_profiles p
LEFT JOIN auth.users u ON p.id = u.id
ORDER BY p.created_at DESC;

-- Update specific test user with email
-- Uncomment and modify as needed:
/*
UPDATE user_profiles 
SET email = 'test1@example.com'
WHERE id = '957e2ca9-a366-42eb-aef0-e5b79f74babe';

UPDATE user_profiles 
SET email = 'test2@example.com'
WHERE id = 'another-test-user-id';
*/

-- Or update all test users (without auth records) with a generic email
/*
UPDATE user_profiles p
SET email = CONCAT('test-user-', p.id::text, '@example.com')
WHERE NOT EXISTS (
  SELECT 1 FROM auth.users u WHERE u.id = p.id
) AND p.email IS NULL;
*/