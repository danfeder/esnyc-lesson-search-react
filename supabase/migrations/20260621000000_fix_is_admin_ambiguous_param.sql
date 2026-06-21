-- =====================================================
-- Migration: 20260621000000_fix_is_admin_ambiguous_param.sql
-- =====================================================
-- Description: Fix C20 — disambiguate the `is_admin(uuid)` overload's body.
--
-- Bug: public.is_admin("user_id" uuid) declares a parameter named `user_id`
-- that collides with the `user_profiles.user_id` column. The body's
-- `WHERE id = user_id ...` predicate is therefore ambiguous and throws
-- `ERROR 42702: column reference "user_id" is ambiguous` at runtime under the
-- default `plpgsql.variable_conflict = error`. Dormant in PROD only because no
-- live authenticated path currently exercises the RLS policies that call this
-- overload (e.g. lesson_archive / canonical_lessons / cultural_heritage_hierarchy
-- / duplicate_resolutions / search_synonyms / user_management_audit, plus the
-- heritage policies re-created in 20260616000000_heritage_recursive_expansion.sql).
--
-- Fix: KEEP the parameter name `user_id` (CREATE OR REPLACE cannot rename an input
-- parameter — Postgres 42P13; DROP FUNCTION is unsafe because RLS policies depend on
-- is_admin and CASCADE would drop them). Remove the ambiguity by referencing the
-- parameter positionally as `$1` and fully qualifying the column as `user_profiles.id`.
-- The signature is unchanged (name / arg name / type / volatility / grants all
-- identical), so this is fully backward-compatible — all RLS policies call this
-- overload positionally and are unaffected. The no-arg is_admin() overload is left
-- untouched.
--
-- Issue: C20 (Wave 2 — Email + Security P1)

-- =====================================================
-- CHANGES
-- =====================================================

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_profiles.id = $1
    AND user_profiles.role IN ('admin', 'super_admin')
    AND user_profiles.is_active = true
  );
END;
$$;

-- Re-assert owner + grants defensively so this migration is self-contained
-- and matches the production baseline (20251001_production_baseline_snapshot.sql
-- lines 597 and 3374-3376). CREATE OR REPLACE preserves existing owner/grants,
-- but re-stating them keeps the migration idempotent and independent of prior state.
ALTER FUNCTION public.is_admin(user_id uuid) OWNER TO postgres;

GRANT ALL ON FUNCTION public.is_admin(user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.is_admin(user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_admin(user_id uuid) TO service_role;

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- Restores the prior (ambiguous, bug-carrying) body. Provided for completeness
-- only — the prior body throws 42702 at runtime; do not roll back without
-- re-introducing the bug. The signature/owner/grants are unchanged either way.
--
-- CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid) RETURNS boolean
--     LANGUAGE plpgsql SECURITY DEFINER
--     AS $$
-- BEGIN
--   RETURN EXISTS (
--     SELECT 1 FROM user_profiles
--     WHERE id = user_id
--     AND role IN ('admin', 'super_admin')
--     AND is_active = true
--   );
-- END;
-- $$;
