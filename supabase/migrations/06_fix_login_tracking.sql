-- =====================================================
-- 06. FIX LOGIN TRACKING - Remove problematic auth trigger
-- =====================================================
-- This migration fixes the "Database error granting user" issue
-- by removing the login tracking trigger on auth.users table

-- First, ensure the is_admin function exists (required for RLS policies)
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

-- Drop the problematic trigger that's causing login failures
-- Note: We can't directly modify auth.users, but we can drop triggers we created
DO $$
BEGIN
  -- Check if the trigger exists and drop it
  IF EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'on_user_login' 
    AND tgrelid = 'auth.users'::regclass
  ) THEN
    EXECUTE 'DROP TRIGGER on_user_login ON auth.users';
  END IF;
  
  -- Drop the associated function if it exists
  DROP FUNCTION IF EXISTS log_user_login() CASCADE;
END $$;

-- Ensure the user_management_audit table exists with proper structure
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
  metadata JSONB DEFAULT '{}'
);

-- Recreate indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_audit_actor_created ON user_management_audit(actor_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_target_created ON user_management_audit(target_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action_created ON user_management_audit(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_login_actions 
  ON user_management_audit(action, created_at DESC) 
  WHERE action = 'login';

-- Re-enable RLS
ALTER TABLE user_management_audit ENABLE ROW LEVEL SECURITY;

-- Recreate RLS policies (drop first to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own audit logs" ON user_management_audit;
DROP POLICY IF EXISTS "Admins can view all audit logs" ON user_management_audit;
DROP POLICY IF EXISTS "System can insert audit logs" ON user_management_audit;

CREATE POLICY "Users can view own audit logs" ON user_management_audit
  FOR SELECT
  USING (
    actor_id = auth.uid() OR 
    target_user_id = auth.uid()
  );

CREATE POLICY "Admins can view all audit logs" ON user_management_audit
  FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "System can insert audit logs" ON user_management_audit
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Create a safer login tracking mechanism that doesn't interfere with auth
-- This function can be called manually from the application after successful login
CREATE OR REPLACE FUNCTION track_user_login(p_user_id UUID)
RETURNS void AS $$
BEGIN
  INSERT INTO user_management_audit (
    actor_id,
    action,
    target_user_id,
    metadata
  ) VALUES (
    p_user_id,
    'login',
    p_user_id,
    jsonb_build_object(
      'login_at', NOW(),
      'source', 'manual_tracking'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION track_user_login(UUID) TO authenticated;

-- Add comment explaining the fix
COMMENT ON TABLE user_management_audit IS 'Audit table for user management actions. Login tracking is now done manually via track_user_login() function instead of auth.users trigger to avoid authentication errors.';

-- =====================================================
-- ROLLBACK INSTRUCTIONS (commented for safety)
-- =====================================================
-- To rollback this migration, run the following commands:
-- 
-- -- Remove comment
-- COMMENT ON TABLE user_management_audit IS NULL;
-- 
-- -- Revoke grant
-- REVOKE EXECUTE ON FUNCTION track_user_login(UUID) FROM authenticated;
-- 
-- -- Drop the manual tracking function
-- DROP FUNCTION IF EXISTS track_user_login(UUID);
-- 
-- -- Drop the policy for profile creation
-- DROP POLICY IF EXISTS "Users can create their own profile on first login" ON user_profiles;
-- 
-- -- Recreate the original trigger (ONLY if you have fixed the auth issue):
-- -- CREATE OR REPLACE FUNCTION log_user_login()
-- -- RETURNS trigger AS $$
-- -- BEGIN
-- --   IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
-- --     INSERT INTO user_management_audit (
-- --       action_type,
-- --       user_id,
-- --       details
-- --     ) VALUES (
-- --       'login',
-- --       NEW.id,
-- --       jsonb_build_object(
-- --         'login_at', NEW.last_sign_in_at,
-- --         'email', NEW.email
-- --       )
-- --     );
-- --   END IF;
-- --   RETURN NEW;
-- -- END;
-- -- $$ LANGUAGE plpgsql SECURITY DEFINER;
-- -- 
-- -- CREATE TRIGGER on_user_login
-- --   AFTER UPDATE OF last_sign_in_at ON auth.users
-- --   FOR EACH ROW
-- --   EXECUTE FUNCTION log_user_login();
-- 
-- -- Note: The original trigger is commented out because it was causing 
-- -- authentication errors. Only restore it if you have a fix for the 
-- -- underlying auth.users access issue.
-- 
-- =====================================================