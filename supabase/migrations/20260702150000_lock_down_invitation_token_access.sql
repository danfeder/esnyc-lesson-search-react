-- =====================================================
-- Migration: 20260702150000_lock_down_invitation_token_access.sql
-- =====================================================
-- Description: Close the invitation-token enumeration hole (T3 security
-- finding 1 — see docs/plans/2026-07-02-t3-security-findings-handoff-for-fable.md §4).
--
-- The SELECT policy "Public can view valid invitation by token" had no
-- token-equality predicate:
--   USING (token IS NOT NULL AND expires_at > now() AND accepted_at IS NULL)
-- so the anon key (shipped in the frontend bundle) could enumerate EVERY
-- pending invitation — email, role, and token — with one REST call. The
-- client's .eq('token', …) was only a client-side filter, not access
-- control. With T3 making invitations the ONLY path to an account, token
-- secrecy is the entire security model, so pre-accept lookups must be
-- token-scoped: you present the exact token, you see that one row.
--
-- Changes:
--   1. Replace validate_invitation_token(text) — the existing SECURITY
--      DEFINER token-scoped lookup (already in the 20251001 baseline,
--      previously uncalled). Same name + argument so the frontend that
--      calls it degrades gracefully during the deploy window where the
--      new frontend is live but this migration is not yet applied.
--      DROP + CREATE because the return type gains accepted_at/expires_at
--      (lets the accept page distinguish "already accepted" from
--      "expired"). Also pins search_path (definer-function hygiene) and
--      tightens EXECUTE grants.
--   2. Drop the enumeration policy. Anon then has NO direct SELECT path
--      on user_invitations; admins keep "Admins can view all invitations".
--   3. Drop the "Users can accept their own invitation" UPDATE policy.
--      Acceptance runs server-side (service role) since T3/PR #573; the
--      policy's only effect now is to let any authenticated user with a
--      pending invitation for their email edit that row (incl. expires_at).

-- =====================================================
-- CHANGES
-- =====================================================

-- 1. Token-scoped lookup function (return type changes → DROP first)
DROP FUNCTION IF EXISTS public.validate_invitation_token(text);

CREATE FUNCTION public.validate_invitation_token(invite_token text)
RETURNS TABLE (
  id uuid,
  email text,
  role text,
  school_name text,
  school_borough text,
  metadata jsonb,
  is_valid boolean,
  accepted_at timestamptz,
  expires_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    i.id,
    i.email,
    i.role,
    i.school_name,
    i.school_borough,
    i.metadata,
    (i.accepted_at IS NULL AND i.expires_at > now()) AS is_valid,
    i.accepted_at,
    i.expires_at
  FROM public.user_invitations i
  WHERE i.token = invite_token;
$$;

COMMENT ON FUNCTION public.validate_invitation_token(text) IS
  'Token-scoped pre-accept invitation lookup for the AcceptInvitation page. '
  'Returns only the row matching the exact token (any status, so the UI can '
  'say WHY a link no longer works). This is the ONLY anon read path into '
  'user_invitations — the list-style public SELECT policy was dropped '
  '2026-07-02 because it allowed enumerating all pending tokens.';

REVOKE ALL ON FUNCTION public.validate_invitation_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.validate_invitation_token(text)
  TO anon, authenticated, service_role;

-- 2. The enumeration hole
DROP POLICY IF EXISTS "Public can view valid invitation by token" ON public.user_invitations;

-- 3. Dead client-side-accept UPDATE policy
DROP POLICY IF EXISTS "Users can accept their own invitation" ON public.user_invitations;

-- The RPC's return shape changed (DROP + CREATE above): make PostgREST pick
-- up the new signature immediately instead of serving stale cached metadata.
NOTIFY pgrst, 'reload schema';

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- DROP FUNCTION IF EXISTS public.validate_invitation_token(text);
-- CREATE OR REPLACE FUNCTION public.validate_invitation_token(invite_token text)
--   RETURNS TABLE(id uuid, email text, role text, school_name text,
--                 school_borough text, metadata jsonb, is_valid boolean)
--   LANGUAGE plpgsql SECURITY DEFINER AS $$
-- BEGIN
--   RETURN QUERY
--   SELECT i.id, i.email, i.role, i.school_name, i.school_borough, i.metadata,
--          (i.accepted_at IS NULL AND i.expires_at > NOW()) AS is_valid
--   FROM user_invitations i WHERE i.token = invite_token;
-- END; $$;
-- CREATE POLICY "Public can view valid invitation by token" ON public.user_invitations
--   FOR SELECT USING (token IS NOT NULL AND expires_at > now() AND accepted_at IS NULL);
-- CREATE POLICY "Users can accept their own invitation" ON public.user_invitations
--   FOR UPDATE
--   USING ((email = ((SELECT users.email FROM auth.users WHERE users.id = auth.uid()))::text)
--          AND accepted_at IS NULL AND expires_at > now())
--   WITH CHECK (email = ((SELECT users.email FROM auth.users WHERE users.id = auth.uid()))::text);
