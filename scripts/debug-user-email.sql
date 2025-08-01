-- Debug query to check user email status
-- Replace the UUID with the actual user ID you're testing

-- Check if user exists in auth.users and has email
SELECT 
  'auth.users' as table_name,
  id,
  email,
  created_at,
  updated_at
FROM auth.users
WHERE id = '957e2ca9-a366-42eb-aef0-e5b79f74babe'

UNION ALL

-- Check if user exists in user_profiles
SELECT 
  'user_profiles' as table_name,
  id,
  email,
  created_at::timestamptz,
  updated_at::timestamptz
FROM user_profiles
WHERE id = '957e2ca9-a366-42eb-aef0-e5b79f74babe';

-- Also check what the RPC function returns
SELECT * FROM get_user_emails(ARRAY['957e2ca9-a366-42eb-aef0-e5b79f74babe'::uuid]);