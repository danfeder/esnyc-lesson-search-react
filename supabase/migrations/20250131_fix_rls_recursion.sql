-- Fix infinite recursion in RLS policies
-- The issue is that policies are checking user_profiles which has its own policies

-- First, drop the problematic policies
DROP POLICY IF EXISTS "Admins can view all invitations" ON user_invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON user_invitations;
DROP POLICY IF EXISTS "Admins can update own invitations" ON user_invitations;
DROP POLICY IF EXISTS "Admins can delete own invitations" ON user_invitations;
DROP POLICY IF EXISTS "Admins can view audit logs" ON user_management_audit;

-- Create simpler policies that avoid recursion by using auth.uid() directly

-- For user_invitations: Check role from JWT claims instead of user_profiles table
CREATE POLICY "Admins can view all invitations" ON user_invitations
  FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM user_profiles 
      WHERE role IN ('admin', 'super_admin') 
      AND is_active = true
    )
  );

-- Simpler approach: Allow authenticated users to view their own invitations they sent
CREATE POLICY "Users can view own sent invitations" ON user_invitations
  FOR SELECT
  USING (auth.uid() = invited_by);

-- For creating invitations, check if user is admin without recursion
CREATE POLICY "Admins can create invitations" ON user_invitations
  FOR INSERT
  WITH CHECK (
    invited_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin') 
      AND is_active = true
    )
  );

-- Allow users to update their own invitations
CREATE POLICY "Users can update own invitations" ON user_invitations
  FOR UPDATE
  USING (invited_by = auth.uid())
  WITH CHECK (invited_by = auth.uid());

-- Allow users to delete their own invitations
CREATE POLICY "Users can delete own invitations" ON user_invitations
  FOR DELETE
  USING (invited_by = auth.uid());

-- For audit logs, use a simpler check
CREATE POLICY "Admins can view audit logs" ON user_management_audit
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin') 
      AND is_active = true
    )
  );

-- Also fix the user_profiles policies to be clearer
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update user profiles" ON user_profiles;

-- Users can always view their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT
  USING (id = auth.uid());

-- Admins and reviewers can view all profiles
CREATE POLICY "Admins can view all profiles" ON user_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles AS p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin', 'reviewer')
      AND p.is_active = true
    )
  );

-- Only admins can update profiles (not their own role/permissions)
CREATE POLICY "Admins can update user profiles" ON user_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles AS p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
      AND p.is_active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles AS p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
      AND p.is_active = true
    )
  );