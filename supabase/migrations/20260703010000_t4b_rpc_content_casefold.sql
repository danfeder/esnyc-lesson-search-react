-- =====================================================
-- Migration: 20260703010000_t4b_rpc_content_casefold.sql
-- =====================================================
-- T4b follow-up (PR #578 bot review): case-fold BOTH similarity legs in
-- find_similar_lessons_text. The first cut (20260703000000) lower()ed the
-- title leg but compared content_text case-sensitively — pg_trgm trigrams are
-- case-sensitive, so two otherwise-identical lesson bodies differing only in
-- capitalization (a re-typed copy, a template with different heading case)
-- under-scored on the HEAVIEST-weighted leg of the combined score
-- (W_CONTENT = 0.45 in detect-duplicates). lower() on both sides makes the
-- two legs consistent.
--
-- New file rather than an edit: 20260703000000 is already pushed + applied to
-- TEST — pushed migrations are never edited. CREATE OR REPLACE preserves the
-- existing ACL (PUBLIC/anon/authenticated revoked, service_role-only EXECUTE,
-- set by 20260703000000), so no grant statements are repeated here.

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
    public.similarity(lower(l.content_text), lower(p_content)) AS content_sim
  FROM public.lessons l
  WHERE l.retired_at IS NULL
    AND (p_exclude_lesson_id IS NULL OR l.lesson_id <> p_exclude_lesson_id)
  ORDER BY GREATEST(
      public.similarity(lower(l.title), lower(p_title)),
      public.similarity(lower(l.content_text), lower(p_content))
    ) DESC NULLS LAST
  LIMIT p_limit;
$$;

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- Re-run the CREATE OR REPLACE FUNCTION block from
-- 20260703000000_t4b_detect_text_rpc_and_archive_revoke.sql (the
-- case-sensitive-content version). ACL is unaffected either way.
