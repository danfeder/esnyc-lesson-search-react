-- This script will create a user profile for any existing auth users who don't have one
-- It's safe to run multiple times - it will only create profiles that don't exist

INSERT INTO user_profiles (id, user_id, role, is_active, created_at, updated_at)
SELECT 
  id,
  id as user_id,
  'teacher' as role,
  true as is_active,
  NOW() as created_at,
  NOW() as updated_at
FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles);

-- Show which users now have profiles
SELECT 
  u.email,
  p.role,
  p.is_active,
  CASE 
    WHEN p.created_at > NOW() - INTERVAL '1 minute' THEN 'Just created'
    ELSE 'Already existed'
  END as status
FROM auth.users u
LEFT JOIN user_profiles p ON u.id = p.id
ORDER BY u.created_at DESC;