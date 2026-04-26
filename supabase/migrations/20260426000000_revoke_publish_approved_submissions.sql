-- Phase 1b Stage 1 of the lesson-submission Tier-1 lock-down.
--
-- publish_approved_submissions() is SECURITY DEFINER and broadly granted to
-- anon, authenticated, and service_role, but called by NOTHING in src/,
-- supabase/functions/, or scripts/. Its semantics also publish prior
-- approve_update submissions as fresh duplicates of the lessons they were
-- meant to update, because its orphan-finder query does not filter
-- submission_type != 'update'. Running it would create silent data damage.
--
-- This migration revokes EXECUTE from PUBLIC, anon, and authenticated to
-- close the public-facing hazard surface. service_role retains EXECUTE so a
-- privileged break-glass path remains if Stage 2 (DROP) turns out to be
-- premature. If no permission-denied errors surface in production logs over
-- a 1-2 week observation window, a follow-up migration will DROP the
-- function entirely.
--
-- Reversal: GRANT EXECUTE ON FUNCTION public.publish_approved_submissions(integer)
--   TO authenticated;  -- (and anon if needed)

REVOKE EXECUTE ON FUNCTION public.publish_approved_submissions(integer)
  FROM PUBLIC, anon, authenticated;
