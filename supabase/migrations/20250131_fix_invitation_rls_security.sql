-- Fix overly permissive RLS policy for user_invitations table
-- This migration tightens the security of the invitation viewing policy

-- Drop the old overly permissive policy
DROP POLICY IF EXISTS "Public can view invitation by token" ON user_invitations;

-- Create a more restrictive policy that properly validates the invitation
CREATE POLICY "Public can view valid invitation by token" ON user_invitations
  FOR SELECT
  USING (
    -- Only allow viewing if:
    -- 1. Token is not null (invitation has been created)
    -- 2. Invitation hasn't expired
    -- 3. Invitation hasn't been accepted yet
    token IS NOT NULL 
    AND expires_at > NOW() 
    AND accepted_at IS NULL
  );

-- Add comment explaining the security improvement
COMMENT ON POLICY "Public can view valid invitation by token" ON user_invitations IS 
'Allows public viewing of invitations only when they have a valid token, have not expired, and have not been accepted. This prevents enumeration attacks and ensures only valid invitations can be viewed.';