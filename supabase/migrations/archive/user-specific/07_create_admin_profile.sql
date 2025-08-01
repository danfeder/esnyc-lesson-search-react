-- =====================================================
-- 07. CREATE ADMIN PROFILE - Set up initial admin user
-- =====================================================
-- This migration creates the admin profile for the existing auth user

-- First, disable RLS temporarily to allow the insert
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Insert or update the admin profile
INSERT INTO user_profiles (
  id,
  user_id,
  email,
  full_name,
  role,
  is_active,
  created_at,
  updated_at
)
VALUES (
  '94ec6e13-8a9c-4ead-ae5c-3ea1266ae0e3',
  '94ec6e13-8a9c-4ead-ae5c-3ea1266ae0e3',
  'df@esynyc.org',
  'Dan Feder',
  'admin',
  true,
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  role = 'admin',
  is_active = true,
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

-- Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON user_profiles TO authenticated;
GRANT ALL ON user_management_audit TO authenticated;

-- Ensure the user can insert their own profile on first login
-- Drop the policy first if it exists, then create it
DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;
CREATE POLICY "Users can create their own profile" ON user_profiles
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Log this admin creation
INSERT INTO user_management_audit (
  actor_id,
  action,
  target_user_id,
  metadata
) VALUES (
  '94ec6e13-8a9c-4ead-ae5c-3ea1266ae0e3',
  'user_activated',
  '94ec6e13-8a9c-4ead-ae5c-3ea1266ae0e3',
  jsonb_build_object(
    'role', 'admin',
    'created_by', 'migration',
    'reason', 'Initial admin setup'
  )
);

-- Comment explaining the migration
-- Creates initial admin profile for df@esynyc.org and fixes profile creation permissions