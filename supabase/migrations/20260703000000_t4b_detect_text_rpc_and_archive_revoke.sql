-- =====================================================
-- Migration: 20260703000000_t4b_detect_text_rpc_and_archive_revoke.sql
-- =====================================================
-- Description: T4b detection-rewrite support (brief §A; design decisions D9/D10).
--   1. NEW RPC find_similar_lessons_text(p_title, p_content, p_exclude_lesson_id,
--      p_limit): pg_trgm title + content trigram similarity over LIVE
--      (retired_at IS NULL) lessons. Replaces the retired embedding leg of
--      detect-duplicates — the edge fn now scores candidates from this + the
--      content-hash leg + the existing TS metadata overlap. service_role ONLY.
--   2. REVOKE EXECUTE on archive_duplicate_lesson from authenticated, anon.
--      Its only callers (the admin Duplicates pages) are removed in this PR;
--      the function HARD-DELETES lessons while the old UI called it a reversible
--      "soft-delete" (D10). Two-stage retirement: revoke the browser roles now,
--      DROP the function post-launch. service_role keeps EXECUTE.
--
-- DDL-only (CREATE FUNCTION + REVOKE); no data mutation, so no BEGIN/COMMIT
-- txn wrapper is load-bearing here (cf. project_supabase_migration_autocommit,
-- which matters only for guarded snapshot→mutate→assert migrations).
--
-- pg_trgm 1.6 is installed in the `public` schema on LOCAL/TEST/PROD (verified
-- 2026-07-03). With SET search_path = '' the SECURITY DEFINER body must
-- schema-qualify every non-builtin, so similarity()/lessons are public.*;
-- lower()/GREATEST are pg_catalog builtins and always resolve.

-- =====================================================
-- CHANGES
-- =====================================================

-- 1. Text-similarity candidate RPC. Returns the top p_limit live candidates
--    ordered by GREATEST(title_sim, content_sim) DESC — a generous set; the
--    calling edge fn applies its own combined-score floor and bucket labels.
CREATE OR REPLACE FUNCTION public.find_similar_lessons_text(
  p_title text,
  p_content text,
  p_exclude_lesson_id text DEFAULT NULL,
  p_limit int DEFAULT 20
)
RETURNS TABLE (
  lesson_id text,
  title text,
  title_sim real,
  content_sim real
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    l.lesson_id,
    l.title,
    public.similarity(lower(l.title), lower(p_title)) AS title_sim,
    public.similarity(l.content_text, p_content) AS content_sim
  FROM public.lessons l
  WHERE l.retired_at IS NULL
    AND (p_exclude_lesson_id IS NULL OR l.lesson_id <> p_exclude_lesson_id)
  ORDER BY GREATEST(
      public.similarity(lower(l.title), lower(p_title)),
      public.similarity(l.content_text, p_content)
    ) DESC NULLS LAST
  LIMIT p_limit;
$$;

-- service_role ONLY. Revoke the implicit PUBLIC grant AND any Supabase
-- default-privilege grant to the browser roles, then grant service_role. This
-- RLS-bypassing SECURITY DEFINER fn must never be reachable from anon/auth.
REVOKE ALL ON FUNCTION public.find_similar_lessons_text(text, text, text, int) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.find_similar_lessons_text(text, text, text, int) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_similar_lessons_text(text, text, text, int) TO service_role;

-- 2. Two-stage retirement of the hard-deleting archive fn (D10).
--    DEVIATION FROM BRIEF §A.2 (documented): the brief specified only
--    `REVOKE EXECUTE ... FROM authenticated, anon`, but the live ACL carries
--    BOTH a PUBLIC EXECUTE grant AND explicit anon/authenticated grants
--    (proacl `{=X/postgres,postgres=X/postgres,anon=X/postgres,
--    authenticated=X/postgres,service_role=X/postgres}` — verified identical on
--    TEST and PROD 2026-07-03). The brief's named-role revoke alone would have
--    left the browser roles with EXECUTE inherited via PUBLIC, so both revokes
--    below are load-bearing: PUBLIC (kills the inherited grant) AND the named
--    roles (kills the explicit grants). The explicit service_role grant is
--    re-asserted after (the server path + the archive_duplicate_lesson RLS
--    tests keep working). Same D10 goal, correct mechanism. DROP deferred
--    post-launch.
REVOKE EXECUTE ON FUNCTION public.archive_duplicate_lesson(text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.archive_duplicate_lesson(text, text) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.archive_duplicate_lesson(text, text) TO service_role;

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- DROP FUNCTION IF EXISTS public.find_similar_lessons_text(text, text, text, int);
-- GRANT EXECUTE ON FUNCTION public.archive_duplicate_lesson(text, text) TO PUBLIC;
--   (restores the pre-revoke ACL, under which anon/authenticated inherited
--    EXECUTE via PUBLIC; the function's own role check still gated real callers.)
