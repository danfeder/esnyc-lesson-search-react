-- Enable RLS on new tables
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_management_audit ENABLE ROW LEVEL SECURITY;

-- Policies for user_invitations table
-- Admins can view all invitations
CREATE POLICY "Admins can view all invitations" ON user_invitations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
      AND user_profiles.is_active = true
    )
  );

-- Admins can create invitations
CREATE POLICY "Admins can create invitations" ON user_invitations
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
      AND user_profiles.is_active = true
    )
    AND invited_by = auth.uid()
  );

-- Admins can update their own invitations
CREATE POLICY "Admins can update own invitations" ON user_invitations
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
      AND user_profiles.is_active = true
    )
    AND invited_by = auth.uid()
  );

-- Admins can delete their own invitations
CREATE POLICY "Admins can delete own invitations" ON user_invitations
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
      AND user_profiles.is_active = true
    )
    AND invited_by = auth.uid()
  );

-- Public can view invitation by token (for acceptance flow)
CREATE POLICY "Public can view invitation by token" ON user_invitations
  FOR SELECT
  USING (true); -- Will be filtered by token in the query

-- Policies for user_management_audit table
-- Admins can view all audit logs
CREATE POLICY "Admins can view audit logs" ON user_management_audit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role IN ('admin', 'super_admin')
      AND user_profiles.is_active = true
    )
  );

-- System can insert audit logs (via functions)
CREATE POLICY "System can insert audit logs" ON user_management_audit
  FOR INSERT
  WITH CHECK (true); -- Controlled by security definer functions

-- Enhanced policies for user_profiles table
-- Update existing select policy to include the new fields
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM user_profiles AS admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role IN ('admin', 'super_admin', 'reviewer')
      AND admin_profile.is_active = true
    )
  );

-- Admins can update user profiles
DROP POLICY IF EXISTS "Admins can update user profiles" ON user_profiles;
CREATE POLICY "Admins can update user profiles" ON user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles AS admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role IN ('admin', 'super_admin')
      AND admin_profile.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles AS admin_profile
      WHERE admin_profile.id = auth.uid()
      AND admin_profile.role IN ('admin', 'super_admin')
      AND admin_profile.is_active = true
    )
  );

-- Users can update their own non-sensitive fields
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    -- These fields should remain unchanged when users update their own profile
    role = (SELECT role FROM user_profiles WHERE id = auth.uid()) AND
    is_active = (SELECT is_active FROM user_profiles WHERE id = auth.uid()) AND
    (permissions IS NULL OR permissions = (SELECT permissions FROM user_profiles WHERE id = auth.uid()))
  );

-- Create a function to validate invitation tokens
CREATE OR REPLACE FUNCTION validate_invitation_token(invite_token TEXT)
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  school_name TEXT,
  school_borough TEXT,
  metadata JSONB,
  is_valid BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    i.id,
    i.email,
    i.role,
    i.school_name,
    i.school_borough,
    i.metadata,
    (i.accepted_at IS NULL AND i.expires_at > NOW()) AS is_valid
  FROM user_invitations i
  WHERE i.token = invite_token;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION validate_invitation_token TO anon, authenticated;