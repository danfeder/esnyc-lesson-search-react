-- =====================================================
-- Migration: 20261023203830_drop_zero_caller_rpcs_batch2.sql
-- =====================================================
-- Description: Drop nine app-facing RPC functions that have no callers
--   (refactor-audit Tier 5 item 2; precedents 20260703040000_drop_find_duplicate_pairs.sql
--   and 20261023194448_drop_unused_rpc_functions.sql).
--
--   Caller census 2026-10-23 against main @ 5c491f0:
--   - Zero references in src/, supabase/functions/, scripts/, e2e/, .github/ other than
--     the generated entries in src/types/database.types.ts (regenerated in this PR).
--   - Zero references inside live SQL on PROD (probed 2026-10-21/22): no other pg_proc
--     body, view, policy or trigger names any of them; pg_depend dependents = 0 for all
--     nine.
--   - Five are SECURITY DEFINER with EXECUTE granted to anon/authenticated by default
--     privileges; none is reachable from the app.
--
-- BEGIN/COMMIT: supabase db push is per-statement autocommit, so the guard block below
-- must be able to abort the whole file. No table data is touched; no lessons lock needed.
--
-- Rollback: full restore script (live PROD bodies captured with pg_get_functiondef on
-- 2026-10-21, plus COMMENTs and GRANTs) in
-- 20261023203830_drop_zero_caller_rpcs_batch2.sql.rollback.

BEGIN;

-- Pre-assert: nothing in the live schema still references a target function.
-- (A plain DROP FUNCTION without CASCADE already fails on a pg_depend dependent; this
-- also catches a *textual* reference inside another function body, which pg_depend
-- does not track.)
DO $$
DECLARE
  v_refs text;
BEGIN
  WITH names(fn) AS (
    VALUES ('get_user_profiles_with_email'), ('get_user_activity_metrics'), ('track_user_login'),
           ('check_security_definer_views'), ('verify_rls_enabled'),
           ('is_duplicate_lesson'), ('is_lesson_archived'), ('get_canonical_lesson_id'),
           ('check_group_already_resolved')
  )
  SELECT string_agg(kind || ':' || referrer || '->' || fn, ', ')
    INTO v_refs
  FROM (
    SELECT 'function' AS kind, p.proname::text AS referrer, names.fn
      FROM pg_proc p CROSS JOIN names
     WHERE p.pronamespace = 'public'::regnamespace
       AND p.proname <> names.fn
       AND p.prosrc ILIKE '%' || names.fn || '%'
    UNION ALL
    SELECT 'view', c.relname::text, names.fn
      FROM pg_class c CROSS JOIN names
     WHERE c.relnamespace = 'public'::regnamespace AND c.relkind IN ('v', 'm')
       AND pg_get_viewdef(c.oid) ILIKE '%' || names.fn || '%'
    UNION ALL
    SELECT 'policy', pol.polname::text, names.fn
      FROM pg_policy pol CROSS JOIN names
     WHERE coalesce(pg_get_expr(pol.polqual, pol.polrelid), '') ILIKE '%' || names.fn || '%'
        OR coalesce(pg_get_expr(pol.polwithcheck, pol.polrelid), '') ILIKE '%' || names.fn || '%'
    UNION ALL
    SELECT 'trigger', t.tgname::text, names.fn
      FROM pg_trigger t JOIN pg_proc p ON p.oid = t.tgfoid CROSS JOIN names
     WHERE NOT t.tgisinternal AND p.proname = names.fn
  ) r;

  IF v_refs IS NOT NULL THEN
    RAISE EXCEPTION 'drop_zero_caller_rpcs_batch2: live schema still references a target function: %', v_refs;
  END IF;
END $$;

-- (a) user-management trio — baseline 20251001 lines 329-372, 421-462, 1360-1384
DROP FUNCTION IF EXISTS public.get_user_profiles_with_email();
DROP FUNCTION IF EXISTS public.get_user_activity_metrics(uuid, integer);
DROP FUNCTION IF EXISTS public.track_user_login(uuid);

-- (b) schema-introspection duo — baseline lines 78-92, 1489-1529
DROP FUNCTION IF EXISTS public.check_security_definer_views();
DROP FUNCTION IF EXISTS public.verify_rls_enabled();

-- (c) retired-dedup quartet — baseline lines 287-311, 600-629; 20251202 lines 175-232
DROP FUNCTION IF EXISTS public.is_duplicate_lesson(text);
DROP FUNCTION IF EXISTS public.is_lesson_archived(text);
DROP FUNCTION IF EXISTS public.get_canonical_lesson_id(text);
DROP FUNCTION IF EXISTS public.check_group_already_resolved(text[]);

-- Post-assert: all nine gone.
DO $$
DECLARE
  v_left int;
BEGIN
  SELECT count(*) INTO v_left
    FROM pg_proc
   WHERE pronamespace = 'public'::regnamespace
     AND proname IN ('get_user_profiles_with_email', 'get_user_activity_metrics', 'track_user_login',
                     'check_security_definer_views', 'verify_rls_enabled', 'is_duplicate_lesson',
                     'is_lesson_archived', 'get_canonical_lesson_id', 'check_group_already_resolved');
  IF v_left <> 0 THEN
    RAISE EXCEPTION 'drop_zero_caller_rpcs_batch2: % target function(s) still present after drop', v_left;
  END IF;
END $$;

COMMIT;

-- =====================================================
-- ROLLBACK (see the .rollback file for the full script)
-- =====================================================
-- Re-run 20261023203830_drop_zero_caller_rpcs_batch2.sql.rollback. It restores the LIVE
-- pre-drop bodies (for check_group_already_resolved that is the 20251202
-- permission-checked version, not the 20251201 original).
