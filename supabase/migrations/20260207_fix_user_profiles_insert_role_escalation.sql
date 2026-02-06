-- Fix: Prevent role escalation via user_profiles INSERT
--
-- The existing "Users can create their own profile" policy only checks
-- auth.uid() = id, allowing any authenticated user to self-assign admin
-- or reviewer roles. This tightens it so:
--   - Self-registering users can only create profiles with 'teacher' role
--   - Users accepting invitations can only claim the role assigned in their
--     pending invitation (matched by email and role)
--
-- The unique_pending_invitation_per_email index ensures at most one
-- pending invitation per email, preventing ambiguity.

DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;

CREATE POLICY "Users can create their own profile" ON user_profiles
FOR INSERT WITH CHECK (
  auth.uid() = id
  AND (
    -- Self-registration: only teacher role allowed
    role = 'teacher'
    -- Invitation-based: must match a valid pending invitation
    OR EXISTS (
      SELECT 1 FROM user_invitations ui
      WHERE ui.email = user_profiles.email
        AND ui.role = user_profiles.role
        AND ui.accepted_at IS NULL
        AND ui.expires_at > now()
    )
  )
);

-- Rollback:
-- DROP POLICY IF EXISTS "Users can create their own profile" ON user_profiles;
-- CREATE POLICY "Users can create their own profile" ON "public"."user_profiles"
--   FOR INSERT WITH CHECK (("auth"."uid"() = "id"));
