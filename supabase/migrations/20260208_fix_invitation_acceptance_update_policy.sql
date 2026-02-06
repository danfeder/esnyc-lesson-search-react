-- Fix: Allow newly registered users to mark their own invitation as accepted
--
-- The only UPDATE policy on user_invitations requires is_admin(), which means
-- a newly registered user accepting an invitation cannot set accepted_at.
-- This causes the invitation to remain in "pending" state after acceptance,
-- potentially allowing token reuse.
--
-- This policy allows authenticated users to update only their own invitation
-- (matched by email from auth.users), and only for pending, unexpired invitations.

CREATE POLICY "Users can accept their own invitation" ON user_invitations
FOR UPDATE
USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
  AND accepted_at IS NULL
  AND expires_at > now()
)
WITH CHECK (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);

-- Rollback:
-- DROP POLICY IF EXISTS "Users can accept their own invitation" ON user_invitations;
