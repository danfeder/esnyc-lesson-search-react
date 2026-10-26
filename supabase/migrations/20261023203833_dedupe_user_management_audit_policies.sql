-- =====================================================
-- Migration: 20261023203833_dedupe_user_management_audit_policies.sql
-- =====================================================
-- Description: Remove two redundant permissive policies on public.user_management_audit
--   (refactor-audit Tier 5 item 5). Permissive policies for the same command are
--   OR-combined, so the looser twin of each pair was the one in force:
--   - SELECT: "Admins view audit logs" (is_admin(), treats NULL is_active as active)
--     duplicates "Admins can view all audit logs" (is_admin(auth.uid()), is_active = true).
--     Pre-assert: no admin row has is_active IS NULL, so dropping the looser twin changes
--     nothing for any existing account.
--   - INSERT: "System inserts audit logs" (WITH CHECK true) duplicates
--     "System can insert audit logs" (auth.uid() IS NOT NULL). Every writer is either an
--     authenticated admin page, a service-role edge function, or a SECURITY DEFINER
--     trigger owned by postgres — none needs the unconditional policy.
--
-- BEGIN/COMMIT so the guards can abort the file. No data touched.
-- Rollback in comments at the bottom (verbatim baseline definitions).

BEGIN;

DO $$
DECLARE
  v_null_admins int;
  v_keep_select text;
  v_drop_select text;
  v_keep_insert text;
  v_drop_insert text;
BEGIN
  SELECT count(*) INTO v_null_admins
    FROM public.user_profiles
   WHERE role IN ('admin', 'super_admin') AND is_active IS NULL;
  IF v_null_admins <> 0 THEN
    RAISE EXCEPTION 'audit policy dedupe: % admin row(s) have is_active IS NULL; is_admin(uuid) would treat them as inactive — fix the data first', v_null_admins;
  END IF;

  SELECT pg_get_expr(polqual, polrelid) INTO v_keep_select FROM pg_policy
   WHERE polrelid = 'public.user_management_audit'::regclass AND polname = 'Admins can view all audit logs';
  SELECT pg_get_expr(polqual, polrelid) INTO v_drop_select FROM pg_policy
   WHERE polrelid = 'public.user_management_audit'::regclass AND polname = 'Admins view audit logs';
  SELECT pg_get_expr(polwithcheck, polrelid) INTO v_keep_insert FROM pg_policy
   WHERE polrelid = 'public.user_management_audit'::regclass AND polname = 'System can insert audit logs';
  SELECT pg_get_expr(polwithcheck, polrelid) INTO v_drop_insert FROM pg_policy
   WHERE polrelid = 'public.user_management_audit'::regclass AND polname = 'System inserts audit logs';

  IF v_keep_select IS DISTINCT FROM 'is_admin(auth.uid())' THEN
    RAISE EXCEPTION 'audit policy dedupe: kept SELECT policy missing or changed (%)', v_keep_select;
  END IF;
  IF v_drop_select IS DISTINCT FROM 'is_admin()' THEN
    RAISE EXCEPTION 'audit policy dedupe: SELECT policy to drop missing or changed (%)', v_drop_select;
  END IF;
  IF v_keep_insert IS DISTINCT FROM '(auth.uid() IS NOT NULL)' THEN                                  -- R-M4b
    RAISE EXCEPTION 'audit policy dedupe: kept INSERT policy missing or changed (%)', v_keep_insert;  -- R-M4b
  END IF;                                                                                             -- R-M4b
  IF v_drop_insert IS DISTINCT FROM 'true' THEN                                                       -- R-M4b
    RAISE EXCEPTION 'audit policy dedupe: INSERT policy to drop missing or changed (%)', v_drop_insert; -- R-M4b
  END IF;                                                                                             -- R-M4b
END $$;

DROP POLICY IF EXISTS "Admins view audit logs"    ON public.user_management_audit;  -- is_admin() twin
DROP POLICY IF EXISTS "System inserts audit logs" ON public.user_management_audit;  -- R-M4b: WITH CHECK (true) twin

DO $$
DECLARE
  v_names text;
BEGIN
  SELECT string_agg(polname, ', ' ORDER BY polname) INTO v_names
    FROM pg_policy WHERE polrelid = 'public.user_management_audit'::regclass;
  IF v_names IS DISTINCT FROM 'Admins can view all audit logs, System can insert audit logs, Users can view own audit logs' THEN
    RAISE EXCEPTION 'audit policy dedupe: unexpected policy set after drop: %', v_names;
  END IF;
END $$;

COMMIT;

-- =====================================================
-- ROLLBACK (keep as comments) — verbatim baseline 20251001 lines 3063 and 3157
-- =====================================================
-- CREATE POLICY "Admins view audit logs" ON "public"."user_management_audit" FOR SELECT USING ("public"."is_admin"());
-- CREATE POLICY "System inserts audit logs" ON "public"."user_management_audit" FOR INSERT WITH CHECK (true);
