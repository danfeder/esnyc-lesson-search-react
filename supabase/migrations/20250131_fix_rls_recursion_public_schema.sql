-- Drop ALL existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

DROP POLICY IF EXISTS "Admins can view all invitations" ON user_invitations;
DROP POLICY IF EXISTS "Users can view own sent invitations" ON user_invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON user_invitations;
DROP POLICY IF EXISTS "Users can update own invitations" ON user_invitations;
DROP POLICY IF EXISTS "Users can delete own invitations" ON user_invitations;
DROP POLICY IF EXISTS "Public can view invitation by token" ON user_invitations;

DROP POLICY IF EXISTS "Admins can view audit logs" ON user_management_audit;
DROP POLICY IF EXISTS "System can insert audit logs" ON user_management_audit;

-- Create helper functions in public schema
CREATE OR REPLACE FUNCTION public.is_admin() 
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_active BOOLEAN;
BEGIN
  -- Get role directly without triggering RLS
  SELECT role, is_active INTO user_role, user_active
  FROM user_profiles
  WHERE id = auth.uid();
  
  RETURN user_role IN ('admin', 'super_admin') AND COALESCE(user_active, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_reviewer_or_above() 
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
  user_active BOOLEAN;
BEGIN
  SELECT role, is_active INTO user_role, user_active
  FROM user_profiles
  WHERE id = auth.uid();
  
  RETURN user_role IN ('reviewer', 'admin', 'super_admin') AND COALESCE(user_active, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now create simple policies using these functions

-- USER PROFILES POLICIES
CREATE POLICY "Anyone can view own profile" ON user_profiles
  FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Reviewers can view all profiles" ON user_profiles
  FOR SELECT
  USING (public.is_reviewer_or_above());

CREATE POLICY "Users can update own basic info" ON user_profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (
    id = auth.uid() AND
    -- Ensure sensitive fields don't change
    role = (SELECT role FROM user_profiles WHERE id = auth.uid()) AND
    is_active = (SELECT is_active FROM user_profiles WHERE id = auth.uid()) AND
    (permissions IS NULL OR permissions = (SELECT permissions FROM user_profiles WHERE id = auth.uid()))
  );

CREATE POLICY "Admins can update any profile" ON user_profiles
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- USER INVITATIONS POLICIES
CREATE POLICY "Public can view by token" ON user_invitations
  FOR SELECT
  USING (true); -- Will be filtered by token in query

CREATE POLICY "Admins can view all invitations" ON user_invitations
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "Users view own invitations" ON user_invitations
  FOR SELECT
  USING (invited_by = auth.uid());

CREATE POLICY "Admins can create invitations" ON user_invitations
  FOR INSERT
  WITH CHECK (public.is_admin() AND invited_by = auth.uid());

CREATE POLICY "Admins can update invitations" ON user_invitations
  FOR UPDATE
  USING (public.is_admin() AND invited_by = auth.uid())
  WITH CHECK (public.is_admin() AND invited_by = auth.uid());

CREATE POLICY "Admins can delete invitations" ON user_invitations
  FOR DELETE
  USING (public.is_admin() AND invited_by = auth.uid());

-- AUDIT LOG POLICIES
CREATE POLICY "Admins view audit logs" ON user_management_audit
  FOR SELECT
  USING (public.is_admin());

CREATE POLICY "System inserts audit logs" ON user_management_audit
  FOR INSERT
  WITH CHECK (true); -- Allow triggers to insert

-- Grant execute permissions on the new functions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_reviewer_or_above() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon;
GRANT EXECUTE ON FUNCTION public.is_reviewer_or_above() TO anon;