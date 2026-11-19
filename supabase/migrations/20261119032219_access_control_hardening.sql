-- =====================================================
-- Migration: access_control_hardening
-- =====================================================
-- Description: Tighten who can do what in the public schema, and add a
-- self-check so the tightening cannot silently regress.
--
--   1. Views obey row security: `security_invoker` on every public view, and
--      views are read-only for API roles. (Makes permanent a setting already
--      applied by hand to TEST and PRODUCTION on 2026-11-18.)
--   2. The anonymous API role holds no write privilege on any table or view,
--      now or for objects created later. Row security stays the main control;
--      this is the second layer underneath it.
--   3. Role checks require an ACTIVE account everywhere. Policies that
--      inlined a role list now call the shared helpers, which check
--      `is_active`. Helpers get a pinned search_path.
--   4. Users can only create a plain teacher profile for themselves, and can
--      only edit their own display fields.
--   5. Audit rows written from the API must name the caller as the actor, and
--      only admins write them. The profile-change trigger records the real
--      actor (NULL when there is no signed-in user) instead of guessing.
--   6. A teacher-created submission starts empty: status `submitted`, no
--      review, extraction, AI-draft or Drive fields.
--   7. `rls_posture_violations()` reports any table without row security, view
--      without security_invoker, anonymous write privilege, or SECURITY
--      DEFINER function without a pinned search_path. `npm run test:rls`
--      asserts it returns nothing.
--
-- Idempotent: safe to re-run. No data is changed.

BEGIN;

-- =====================================================
-- PRECONDITIONS (fail fast, before changing anything)
-- =====================================================
DO $$
DECLARE
  v_bad int;
BEGIN
  -- The policies below switch from `user_profiles.user_id = auth.uid()` to
  -- helpers keyed on `user_profiles.id = auth.uid()`. That is only equivalent
  -- if no profile has a user_id that differs from its id.
  SELECT count(*) INTO v_bad
    FROM public.user_profiles
   WHERE user_id IS NOT NULL AND user_id <> id;
  IF v_bad <> 0 THEN
    RAISE EXCEPTION 'access_control_hardening: % profile row(s) have user_id <> id; reconcile them before applying', v_bad;
  END IF;

  -- Helpers treat is_active NULL differently from each other. Refuse to
  -- guess: every staff row must say whether it is active.
  SELECT count(*) INTO v_bad
    FROM public.user_profiles
   WHERE role IN ('reviewer', 'admin', 'super_admin') AND is_active IS NULL;
  IF v_bad <> 0 THEN
    RAISE EXCEPTION 'access_control_hardening: % reviewer/admin row(s) have is_active IS NULL; set it explicitly first', v_bad;
  END IF;
END $$;

-- =====================================================
-- 1. VIEWS OBEY ROW SECURITY AND ARE READ-ONLY
-- =====================================================
-- NOTE for future migrations: `CREATE OR REPLACE VIEW` without
-- `WITH (security_invoker = true)` silently removes this option, and a newly
-- created view receives default grants. rls_posture_violations() (section 7)
-- and `npm run test:rls` catch both.
DO $$
DECLARE
  v record;
BEGIN
  FOR v IN
    SELECT c.oid::regclass AS rel
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind = 'v'
       AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('ALTER VIEW %s SET (security_invoker = true)', v.rel);
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON %s FROM anon, authenticated', v.rel);
  END LOOP;
END $$;

-- Nothing in the application reads user_profiles_safe; keep it, closed.
DO $$
BEGIN
  IF to_regclass('public.user_profiles_safe') IS NOT NULL THEN
    REVOKE ALL ON public.user_profiles_safe FROM anon, authenticated;
    COMMENT ON VIEW public.user_profiles_safe IS
      'Active user profiles (id, name, role, school). security_invoker: obeys user_profiles row security. No API role has access; unused by the application.';
  END IF;
END $$;

-- =====================================================
-- 2. NO WRITE PRIVILEGES FOR THE ANONYMOUS ROLE
-- =====================================================
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.oid::regclass AS rel
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm')
       AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = c.oid AND d.deptype = 'e')
  LOOP
    EXECUTE format('REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON %s FROM anon', t.rel);
  END LOOP;
END $$;

-- Objects this role creates later (i.e. future migrations) start the same way.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON TABLES FROM anon;

-- =====================================================
-- 3. ROLE HELPERS: ACTIVE ACCOUNTS ONLY, PINNED search_path
-- =====================================================
-- Same names, arguments and return types as before, so every existing policy
-- that calls them keeps working. NULL handling of is_active is unchanged per
-- function (the precondition above guarantees no staff row is NULL).

CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles p
     WHERE p.id = auth.uid()
       AND p.role IN ('admin', 'super_admin')
       AND COALESCE(p.is_active, true)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles p
     WHERE p.id = $1
       AND p.role IN ('admin', 'super_admin')
       AND p.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_reviewer_or_above() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles p
     WHERE p.id = auth.uid()
       AND p.role IN ('reviewer', 'admin', 'super_admin')
       AND COALESCE(p.is_active, true)
  );
$$;

-- New: "the caller has a profile and it is active" (any role).
CREATE OR REPLACE FUNCTION public.is_active_user() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles p
     WHERE p.id = auth.uid()
       AND COALESCE(p.is_active, true)
  );
$$;
REVOKE ALL ON FUNCTION public.is_active_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO anon, authenticated, service_role;

-- Previously matched on user_profiles.user_id and ignored is_active.
CREATE OR REPLACE FUNCTION public.has_duplicate_review_permission() RETURNS boolean
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $$
BEGIN
  -- Backend callers: service role, or a direct database session.
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN TRUE;
  END IF;
  IF current_user = 'postgres' THEN
    RETURN TRUE;
  END IF;
  RETURN public.is_reviewer_or_above();
END;
$$;

-- Pin the search_path of the remaining SECURITY DEFINER functions without
-- touching their bodies.
DO $$
DECLARE
  f record;
BEGIN
  FOR f IN
    SELECT p.oid::regprocedure AS sig
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.prosecdef
       AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
       AND NOT EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%')
  LOOP
    EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_temp', f.sig);
  END LOOP;
END $$;

-- =====================================================
-- 4. POLICIES THAT INLINED A ROLE LIST -> SHARED HELPERS
-- =====================================================
-- Each policy keeps its name, command and target role. Only the predicate
-- changes: an inline `EXISTS (... role = ANY (...))` on user_profiles becomes
-- the matching helper, which also requires the account to be active.

-- lessons
DROP POLICY IF EXISTS "Admins and reviewers can insert lessons" ON public.lessons;
CREATE POLICY "Admins and reviewers can insert lessons" ON public.lessons
  FOR INSERT TO authenticated
  WITH CHECK (public.is_reviewer_or_above());

DROP POLICY IF EXISTS "Admins and reviewers can update lessons" ON public.lessons;
CREATE POLICY "Admins and reviewers can update lessons" ON public.lessons
  FOR UPDATE TO authenticated
  USING (public.is_reviewer_or_above())
  WITH CHECK (public.is_reviewer_or_above());

-- lesson_versions
DROP POLICY IF EXISTS "Admins and reviewers can create versions" ON public.lesson_versions;
CREATE POLICY "Admins and reviewers can create versions" ON public.lesson_versions
  FOR INSERT TO authenticated
  WITH CHECK (public.is_reviewer_or_above());

-- lesson_submissions
DROP POLICY IF EXISTS "Reviewers can view all submissions" ON public.lesson_submissions;
CREATE POLICY "Reviewers can view all submissions" ON public.lesson_submissions
  FOR SELECT TO authenticated
  USING (public.is_reviewer_or_above());

DROP POLICY IF EXISTS "Reviewers can update submissions" ON public.lesson_submissions;
CREATE POLICY "Reviewers can update submissions" ON public.lesson_submissions
  FOR UPDATE TO authenticated
  USING (public.is_reviewer_or_above())
  WITH CHECK (public.is_reviewer_or_above());

-- submission_reviews
DROP POLICY IF EXISTS "Reviewers can manage reviews" ON public.submission_reviews;
CREATE POLICY "Reviewers can manage reviews" ON public.submission_reviews
  FOR ALL TO authenticated
  USING (public.is_reviewer_or_above())
  WITH CHECK (public.is_reviewer_or_above());

-- submission_similarities
DROP POLICY IF EXISTS "Reviewers can view similarities" ON public.submission_similarities;
CREATE POLICY "Reviewers can view similarities" ON public.submission_similarities
  FOR SELECT TO authenticated
  USING (public.is_reviewer_or_above());

-- duplicate_group_dismissals
DROP POLICY IF EXISTS "Admins can view dismissed groups" ON public.duplicate_group_dismissals;
CREATE POLICY "Admins can view dismissed groups" ON public.duplicate_group_dismissals
  FOR SELECT TO public
  USING (public.is_reviewer_or_above());

DROP POLICY IF EXISTS "Admins can create dismissed groups" ON public.duplicate_group_dismissals;
CREATE POLICY "Admins can create dismissed groups" ON public.duplicate_group_dismissals
  FOR INSERT TO public
  WITH CHECK (public.is_reviewer_or_above());

DROP POLICY IF EXISTS "Admins can update dismissed groups" ON public.duplicate_group_dismissals;
CREATE POLICY "Admins can update dismissed groups" ON public.duplicate_group_dismissals
  FOR UPDATE TO public
  USING (public.is_reviewer_or_above())
  WITH CHECK (public.is_reviewer_or_above());

DROP POLICY IF EXISTS "Admins can delete dismissed groups" ON public.duplicate_group_dismissals;
CREATE POLICY "Admins can delete dismissed groups" ON public.duplicate_group_dismissals
  FOR DELETE TO public
  USING (public.is_reviewer_or_above());

-- schools
DROP POLICY IF EXISTS "Admins can create schools" ON public.schools;
CREATE POLICY "Admins can create schools" ON public.schools
  FOR INSERT TO public
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can update schools" ON public.schools;
CREATE POLICY "Admins can update schools" ON public.schools
  FOR UPDATE TO public
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Super admins can delete schools" ON public.schools;
CREATE POLICY "Super admins can delete schools" ON public.schools
  FOR DELETE TO public
  USING (public.has_role(auth.uid(), 'super_admin'));

-- user_schools
DROP POLICY IF EXISTS "Admins can create user-school relationships" ON public.user_schools;
CREATE POLICY "Admins can create user-school relationships" ON public.user_schools
  FOR INSERT TO public
  WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "Admins can delete user-school relationships" ON public.user_schools;
CREATE POLICY "Admins can delete user-school relationships" ON public.user_schools
  FOR DELETE TO public
  USING (public.is_admin());

-- lesson_archive
DROP POLICY IF EXISTS "Super admins can delete from archive" ON public.lesson_archive;
CREATE POLICY "Super admins can delete from archive" ON public.lesson_archive
  FOR DELETE TO public
  USING (public.has_role(auth.uid(), 'super_admin'));

-- =====================================================
-- 5. PROFILES: SELF-SERVICE IS LIMITED TO DISPLAY FIELDS
-- =====================================================

-- 5a. A user may create only their own, plain teacher profile. Accounts with
--     any other role are created server-side by the invitation flow (service
--     role), so the former "matching pending invitation" branch is gone.
DROP POLICY IF EXISTS "Users can create their own profile" ON public.user_profiles;
CREATE POLICY "Users can create their own profile" ON public.user_profiles
  FOR INSERT TO public
  WITH CHECK (
    auth.uid() = id
    AND role = 'teacher'
    AND (user_id IS NULL OR user_id = id)
    AND COALESCE(is_active, true)
    AND (permissions IS NULL OR permissions = '{}'::jsonb)
    AND (email IS NULL OR lower(email) = lower(auth.jwt() ->> 'email'))
    AND invited_by IS NULL
    AND notes IS NULL
  );

-- 5b. Non-admins may not change identity, access or admin-owned columns on
--     their own row. A policy WITH CHECK cannot compare against the old row
--     for every column cleanly, so this is a trigger.
CREATE OR REPLACE FUNCTION public.guard_user_profile_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $$
BEGIN
  -- No signed-in user: service role, migrations, direct SQL. Not restricted here.
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  -- Active admins manage profiles.
  IF public.is_admin() THEN
    RETURN NEW;
  END IF;
  IF NEW.id          IS DISTINCT FROM OLD.id
     OR NEW.user_id     IS DISTINCT FROM OLD.user_id
     OR NEW.role        IS DISTINCT FROM OLD.role
     OR NEW.is_active   IS DISTINCT FROM OLD.is_active
     OR NEW.permissions IS DISTINCT FROM OLD.permissions
     OR NEW.email       IS DISTINCT FROM OLD.email
     OR NEW.invited_by  IS DISTINCT FROM OLD.invited_by
     OR NEW.invited_at  IS DISTINCT FROM OLD.invited_at
     OR NEW.accepted_at IS DISTINCT FROM OLD.accepted_at
     OR NEW.notes       IS DISTINCT FROM OLD.notes
  THEN
    RAISE EXCEPTION 'Only an administrator can change this profile field'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_user_profile_update() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trigger_guard_user_profile_update ON public.user_profiles;
CREATE TRIGGER trigger_guard_user_profile_update
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_user_profile_update();

-- New and updated rows must keep user_id in step with id. NOT VALID: existing
-- rows are not re-checked (the precondition above already verified them).
ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_user_id_matches_id;
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_user_id_matches_id
  CHECK (user_id IS NULL OR user_id = id) NOT VALID;

-- =====================================================
-- 6. AUDIT LOG: THE ACTOR IS WHO ACTUALLY ACTED
-- =====================================================

-- 6a. API inserts: admins only, and only naming themselves.
DROP POLICY IF EXISTS "System can insert audit logs" ON public.user_management_audit;
CREATE POLICY "System can insert audit logs" ON public.user_management_audit
  FOR INSERT TO public
  WITH CHECK (public.is_admin() AND actor_id = auth.uid());

-- 6b. The profile-change trigger used COALESCE(auth.uid(), NEW.id) as actor.
--     With no signed-in user (service role, SQL editor) that recorded the
--     profile's owner as the one who changed it, and failed outright when the
--     profile had no auth.users row. Record the real actor, NULL when there is
--     none, and say where the change came from.
ALTER TABLE public.user_management_audit ALTER COLUMN actor_id DROP NOT NULL;

CREATE OR REPLACE FUNCTION public.log_user_profile_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = public, pg_temp
    AS $$
BEGIN
  IF OLD IS DISTINCT FROM NEW THEN
    INSERT INTO public.user_management_audit (
      actor_id, action, target_user_id, old_values, new_values, metadata, created_at
    ) VALUES (
      auth.uid(),
      'user_profile_updated',
      NEW.id,
      to_jsonb(OLD),
      to_jsonb(NEW),
      jsonb_build_object('source', COALESCE(auth.role(), 'direct_sql')),
      now()
    );
  END IF;
  RETURN NEW;
END;
$$;

-- =====================================================
-- 7. SUBMISSIONS: A TEACHER-CREATED ROW STARTS EMPTY
-- =====================================================
-- process-submission inserts {teacher_id, google_doc_url, google_doc_id,
-- submission_type, original_lesson_id, status: 'submitted'} as the teacher and
-- fills everything else with the service role. Nothing else may be set by the
-- client, and the teacher must have an active profile.
DROP POLICY IF EXISTS "Teachers can create submissions" ON public.lesson_submissions;
CREATE POLICY "Teachers can create submissions" ON public.lesson_submissions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = teacher_id
    AND public.is_active_user()
    AND status = 'submitted'
    AND reviewer_id IS NULL
    AND reviewed_by IS NULL
    AND reviewed_at IS NULL
    AND review_started_at IS NULL
    AND review_completed_at IS NULL
    AND reviewer_notes IS NULL
    AND revision_requested_reason IS NULL
    AND extracted_content IS NULL
    AND extracted_title IS NULL
    AND content_hash IS NULL
    AND content_embedding IS NULL
    AND ai_draft_metadata IS NULL
    AND ai_draft_generated_at IS NULL
    AND ai_draft_model IS NULL
    AND drive_file_id IS NULL
    AND drive_mime_type IS NULL
    AND drive_created_at IS NULL
    AND drive_modified_at IS NULL
    AND drive_metadata_synced_at IS NULL
    AND drive_creator_name IS NULL
    AND drive_creator_attribution IS NULL
    AND drive_creator_source IS NULL
    AND drive_creator_verified_at IS NULL
  );

-- =====================================================
-- 8. SELF-CHECK
-- =====================================================
-- Returns one row per problem; an empty result means the access-control
-- posture is intact. Service role only. Asserted by `npm run test:rls`.
CREATE OR REPLACE FUNCTION public.rls_posture_violations()
    RETURNS TABLE (object_name text, problem text)
    LANGUAGE sql STABLE
    SET search_path = ''
    AS $$
  WITH rels AS (
    SELECT c.oid, c.relkind, c.relrowsecurity, c.reloptions, c.oid::regclass::text AS name
      FROM pg_catalog.pg_class c
      JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm')
       AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_depend d WHERE d.objid = c.oid AND d.deptype = 'e')
  )
  SELECT name, 'table without row level security'
    FROM rels WHERE relkind IN ('r', 'p') AND NOT relrowsecurity
  UNION ALL
  SELECT name, 'view without security_invoker'
    FROM rels
   WHERE relkind = 'v'
     AND NOT (COALESCE(reloptions, '{}') && ARRAY['security_invoker=true', 'security_invoker=on', 'security_invoker=1'])
  UNION ALL
  SELECT name, 'anon holds a write privilege'
    FROM rels
   WHERE pg_catalog.has_table_privilege('anon', oid, 'INSERT')
      OR pg_catalog.has_table_privilege('anon', oid, 'UPDATE')
      OR pg_catalog.has_table_privilege('anon', oid, 'DELETE')
      OR pg_catalog.has_table_privilege('anon', oid, 'TRUNCATE')
  UNION ALL
  SELECT name, 'authenticated holds a write privilege on a view'
    FROM rels
   WHERE relkind = 'v'
     AND (pg_catalog.has_table_privilege('authenticated', oid, 'INSERT')
       OR pg_catalog.has_table_privilege('authenticated', oid, 'UPDATE')
       OR pg_catalog.has_table_privilege('authenticated', oid, 'DELETE'))
  UNION ALL
  SELECT p.oid::regprocedure::text, 'SECURITY DEFINER function without a pinned search_path'
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.prosecdef
     AND NOT EXISTS (SELECT 1 FROM pg_catalog.pg_depend d WHERE d.objid = p.oid AND d.deptype = 'e')
     AND NOT EXISTS (SELECT 1 FROM unnest(COALESCE(p.proconfig, '{}')) c WHERE c LIKE 'search_path=%')
  ORDER BY 1, 2;
$$;
REVOKE ALL ON FUNCTION public.rls_posture_violations() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rls_posture_violations() TO service_role;

-- =====================================================
-- POSTCONDITION
-- =====================================================
DO $$
DECLARE
  v_problems text;
BEGIN
  SELECT string_agg(object_name || ': ' || problem, '; ')
    INTO v_problems
    FROM public.rls_posture_violations();
  IF v_problems IS NOT NULL THEN
    RAISE EXCEPTION 'access_control_hardening: posture check failed after applying: %', v_problems;
  END IF;
END $$;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- This migration only tightens access. To undo a specific part:
--   Views:      ALTER VIEW public.lessons_with_metadata RESET (security_invoker);
--               GRANT ALL ON public.lessons_with_metadata, public.user_profiles_safe TO anon, authenticated;
--   Anon:       GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
--               ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
--   Helpers:    restore the bodies from 20251001_production_baseline_snapshot.sql and
--               20260621000000_fix_is_admin_ambiguous_param.sql; DROP FUNCTION public.is_active_user();
--   Policies:   restore the inline predicates from 20251001_production_baseline_snapshot.sql
--               (lessons, lesson_versions, lesson_submissions, submission_reviews,
--               submission_similarities, duplicate_group_dismissals, schools, user_schools,
--               lesson_archive, user_profiles INSERT) and from
--               20261023203833_dedupe_user_management_audit_policies.sql (audit INSERT).
--   Profiles:   DROP TRIGGER trigger_guard_user_profile_update ON public.user_profiles;
--               DROP FUNCTION public.guard_user_profile_update();
--               ALTER TABLE public.user_profiles DROP CONSTRAINT user_profiles_user_id_matches_id;
--   Audit:      restore log_user_profile_changes() from the baseline; then, only if no row has
--               a NULL actor: ALTER TABLE public.user_management_audit ALTER COLUMN actor_id SET NOT NULL;
--   Self-check: DROP FUNCTION public.rls_posture_violations();
