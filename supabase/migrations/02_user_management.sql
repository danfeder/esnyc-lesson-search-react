-- =====================================================
-- 02. USER MANAGEMENT - Authentication and Authorization
-- =====================================================
-- This migration consolidates all user management related
-- tables, functions, and features

-- =====================================================
-- USER INVITATIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Invitation Details
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('teacher', 'reviewer', 'admin')),
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  token TEXT UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  
  -- School Information
  school_name TEXT,
  school_borough TEXT,
  
  -- Status
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  
  -- Additional Data
  message TEXT,
  metadata JSONB DEFAULT '{}',
  
  -- Ensure only one pending invitation per email
  CONSTRAINT unique_pending_invitation_per_email UNIQUE (email, accepted_at)
);

-- Create partial unique index for pending invitations
CREATE UNIQUE INDEX IF NOT EXISTS unique_pending_invitation_per_email 
ON user_invitations (email) 
WHERE accepted_at IS NULL;

-- Index for cleanup of expired invitations
CREATE INDEX IF NOT EXISTS idx_invitations_expired 
ON user_invitations(expires_at) 
WHERE accepted_at IS NULL;

-- =====================================================
-- USER MANAGEMENT AUDIT TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS user_management_audit (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Audit Information
  actor_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  target_user_id UUID REFERENCES auth.users(id),
  target_email TEXT,
  
  -- Change Tracking
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}',
  
  -- Add index for performance
  INDEX idx_audit_actor_created (actor_id, created_at DESC),
  INDEX idx_audit_target_created (target_user_id, created_at DESC),
  INDEX idx_audit_action_created (action, created_at DESC)
);

-- Create indexes if they don't exist (for idempotency)
CREATE INDEX IF NOT EXISTS idx_audit_actor_created ON user_management_audit(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_target_created ON user_management_audit(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action_created ON user_management_audit(action, created_at DESC);

-- Special index for login tracking
CREATE INDEX IF NOT EXISTS idx_audit_login_actions 
ON user_management_audit(action, created_at DESC) 
WHERE action = 'login';

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to check if a user is an admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = user_id
    AND role IN ('admin', 'super_admin')
    AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a user has a specific role
CREATE OR REPLACE FUNCTION has_role(user_id UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM user_profiles
  WHERE id = user_id AND is_active = true;
  
  -- Role hierarchy: super_admin > admin > reviewer > teacher
  RETURN CASE
    WHEN required_role = 'teacher' THEN user_role IS NOT NULL
    WHEN required_role = 'reviewer' THEN user_role IN ('reviewer', 'admin', 'super_admin')
    WHEN required_role = 'admin' THEN user_role IN ('admin', 'super_admin')
    WHEN required_role = 'super_admin' THEN user_role = 'super_admin'
    ELSE false
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user emails (for admin use)
CREATE OR REPLACE FUNCTION get_user_emails(user_ids UUID[])
RETURNS TABLE(id UUID, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only allow admins to use this function
  IF NOT is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;
  
  RETURN QUERY
  SELECT au.id, au.email::TEXT
  FROM auth.users au
  WHERE au.id = ANY(user_ids);
END;
$$;

-- Function to log user activity
CREATE OR REPLACE FUNCTION log_user_activity()
RETURNS TRIGGER AS $$
BEGIN
  -- Log profile updates
  IF TG_OP = 'UPDATE' AND TG_TABLE_NAME = 'user_profiles' THEN
    INSERT INTO user_management_audit (
      actor_id,
      action,
      target_user_id,
      old_values,
      new_values
    ) VALUES (
      auth.uid(),
      'profile_updated',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply activity logging trigger
CREATE TRIGGER log_user_profile_changes
  AFTER UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION log_user_activity();

-- =====================================================
-- VIEWS
-- =====================================================

-- Create a secure view for user profiles with emails
CREATE OR REPLACE VIEW user_profiles_with_emails AS
SELECT 
  up.*,
  au.email as auth_email,
  au.last_sign_in_at
FROM user_profiles up
LEFT JOIN auth.users au ON up.id = au.id;

-- Grant access to authenticated users to view their own profile
GRANT SELECT ON user_profiles_with_emails TO authenticated;

-- =====================================================
-- ROLLBACK INSTRUCTIONS (commented for safety)
-- =====================================================
-- To rollback this migration, run the following commands:
-- 
-- -- Revoke grants
-- REVOKE SELECT ON user_profiles_with_emails FROM authenticated;
-- 
-- -- Drop views
-- DROP VIEW IF EXISTS user_profiles_with_emails CASCADE;
-- 
-- -- Drop policies
-- DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON user_profiles;
-- DROP POLICY IF EXISTS "Users can view their own full profile" ON user_profiles;
-- DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
-- DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
-- DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
-- DROP POLICY IF EXISTS "Admins can update any profile" ON user_profiles;
-- DROP POLICY IF EXISTS "Admins can delete profiles" ON user_profiles;
-- 
-- -- Drop functions
-- DROP FUNCTION IF EXISTS get_user_role(uuid);
-- DROP FUNCTION IF EXISTS get_user_permissions(uuid);
-- DROP FUNCTION IF EXISTS handle_new_user();
-- DROP FUNCTION IF EXISTS check_user_permissions(uuid, text);
-- DROP FUNCTION IF EXISTS check_is_admin(uuid);
-- 
-- -- Drop triggers
-- DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
-- 
-- -- Disable RLS (if you want to completely revert)
-- ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
-- 
-- =====================================================