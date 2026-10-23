-- =====================================================
-- Migration: 20261023194448_drop_unused_rpc_functions.sql
-- =====================================================
-- Description: drop two SQL functions that nothing calls.
--
--   Both have zero callers in src/, supabase/functions/, scripts/ and e2e/,
--   zero dependents in the database (no other function body, trigger,
--   policy, view or pg_depend row references them on TEST or PROD, probed
--   2026-10-21), and their only remaining repo references are the two
--   generated-type entries removed from src/types/database.types.ts in the
--   same PR.
--
--   - public.debug_user_email(uuid): one-off diagnostic helper
--     (archive/20250131_debug_user_email_issue.sql) carried into the
--     20251001 baseline. Never called by the application.
--   - public.publish_approved_submissions(integer): legacy batch publisher.
--     EXECUTE was already revoked from PUBLIC/anon/authenticated by
--     20260426000000_revoke_publish_approved_submissions.sql (PR #443),
--     whose header scheduled this follow-up drop after an observation
--     window. Its body also inserts into lessons.lesson_format, a column
--     removed by 20260512000000_drop_lesson_format.sql, so it can no longer
--     run successfully in any case.
--
-- Precedent: 20260703040000_drop_find_duplicate_pairs.sql.
--
-- Wrapped in BEGIN/COMMIT because `supabase db push` autocommits per
-- statement: if the post-assert below fails, both drops must roll back
-- together.
--
-- Rollback: full restore script in 20261023194448_drop_unused_rpc_functions.sql.rollback.

-- =====================================================
-- CHANGES
-- =====================================================

BEGIN;

-- Identity signatures as reported by pg_proc (one overload each).
DROP FUNCTION IF EXISTS public.debug_user_email(uuid);
DROP FUNCTION IF EXISTS public.publish_approved_submissions(integer);

-- Post-assert: neither name survives in any schema.
DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM pg_proc p
  WHERE p.proname IN ('debug_user_email', 'publish_approved_submissions');

  IF v_count <> 0 THEN
    RAISE EXCEPTION
      'post-assert failed: % function(s) named debug_user_email / publish_approved_submissions still present',
      v_count;
  END IF;
END
$$;

COMMIT;

-- =====================================================
-- ROLLBACK (see the .rollback file for the full script)
-- =====================================================
-- Re-run the CREATE OR REPLACE FUNCTION statements in
-- 20261023194448_drop_unused_rpc_functions.sql.rollback. The bodies there are
-- copied verbatim from the 20251001 baseline (lines 93-127 and 679-882),
-- followed by least-privilege grants (service_role only).
