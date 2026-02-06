-- Fix: Drop overly permissive invitation SELECT policy
--
-- The "Public can view by token" policy uses USING(true), making ALL invitations
-- (including tokens) readable by anyone. Since PostgreSQL OR-combines multiple
-- SELECT policies on the same table, the stricter "Public can view valid invitation
-- by token" policy (which checks token IS NOT NULL, not expired, not accepted) is
-- effectively bypassed.
--
-- Dropping the permissive policy leaves only the restricted one, which properly
-- limits access to valid, unexpired, unaccepted invitations.

DROP POLICY IF EXISTS "Public can view by token" ON user_invitations;

-- Rollback:
-- CREATE POLICY "Public can view by token" ON "public"."user_invitations" FOR SELECT USING (true);
