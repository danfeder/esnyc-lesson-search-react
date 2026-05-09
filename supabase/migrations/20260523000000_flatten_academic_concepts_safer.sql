-- =====================================================
-- Migration: 20260523000000_flatten_academic_concepts_safer.sql
-- =====================================================
-- Description: PR 3a round 1 fix-up — harden _flatten_academic_concepts
-- against non-object academicConcepts shapes (Codex P2 on PR #479).
--
-- Issue: Codex review on PR #479 (head 4595235) flagged that
-- _flatten_academic_concepts (created in 20260521000000) is unsafe for
-- JSON `null`, arrays, strings, and other non-object JSON values:
--
--   SELECT COALESCE(string_agg(part, ' '), '')
--   FROM (
--     SELECT key AS part FROM jsonb_each(COALESCE(p_concepts, '{}'::jsonb))
--     ...
--   ) parts;
--
-- COALESCE handles SQL NULL fine — `COALESCE(NULL, '{}'::jsonb)` returns
-- `'{}'`, which jsonb_each accepts. But COALESCE does NOT convert JSON
-- null to SQL null: `COALESCE('null'::jsonb, '{}'::jsonb)` returns
-- `'null'::jsonb`, and `jsonb_each('null'::jsonb)` errors with
-- "cannot deconstruct a non-object". Same applies to JSON arrays /
-- strings / numbers.
--
-- Current corpus shape: TEST + PROD audited 2026-05-08 — academicConcepts
-- is uniformly `object` (684 TEST / 697 PROD) or absent (88 TEST / 91
-- PROD). Zero rows trigger the latent bug today. But the helper is now
-- in the FTS trigger path; any future write that produces a non-object
-- shape would error the trigger and block the write. Belt-and-braces
-- defensive harden against that hypothetical.
--
-- Approach: replace the bare COALESCE wrapper with a CASE that explicitly
-- checks `jsonb_typeof(...) = 'object'`. Any non-object value (JSON null,
-- array, string, number, SQL NULL via the CASE NULL = 'object' fall-through)
-- becomes an empty object before jsonb_each sees it. CREATE OR REPLACE
-- is idempotent; signature unchanged so the existing trigger keeps using
-- the new body without re-installation.
--
-- Side effects: none. The trigger function update_lesson_search_vector()
-- references _flatten_academic_concepts by signature; PostgreSQL resolves
-- the function body at row-write time, so the next trigger fire after
-- this migration applies picks up the safer body automatically.
--
-- See:
--   docs/plans/2026-05-03-metadata-rebuild-foundation-execution-status.md
--     (Session 56 — PR 3a ritual round 1)
--   supabase/migrations/20260521000000_search_vector_with_concepts.sql:50-66
--     (original helper body)
--   PR #479 Codex review issue comment IC_kwDOPNJP0c8AAAABBukHEg (the P2)
-- =====================================================


-- =====================================================
-- (1) Replace _flatten_academic_concepts with shape-guarded body
-- =====================================================

CREATE OR REPLACE FUNCTION public._flatten_academic_concepts(p_concepts jsonb)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(string_agg(part, ' '), '')
  FROM (
    -- Subject keys (e.g., "Science", "Social Studies")
    SELECT key AS part
    FROM jsonb_each(
      CASE WHEN jsonb_typeof(p_concepts) = 'object' THEN p_concepts ELSE '{}'::jsonb END
    )
    UNION ALL
    -- Concept values inside each subject's array
    SELECT jsonb_array_elements_text(value) AS part
    FROM jsonb_each(
      CASE WHEN jsonb_typeof(p_concepts) = 'object' THEN p_concepts ELSE '{}'::jsonb END
    )
    WHERE jsonb_typeof(value) = 'array'
  ) parts;
$$;


-- =====================================================
-- ROLLBACK (kept as comments)
-- =====================================================
-- -- Restore the original (less-defensive) body from 20260521000000.
-- CREATE OR REPLACE FUNCTION public._flatten_academic_concepts(p_concepts jsonb)
-- RETURNS text
-- LANGUAGE sql
-- IMMUTABLE
-- AS $$
--   SELECT COALESCE(string_agg(part, ' '), '')
--   FROM (
--     SELECT key AS part
--     FROM jsonb_each(COALESCE(p_concepts, '{}'::jsonb))
--     UNION ALL
--     SELECT jsonb_array_elements_text(value) AS part
--     FROM jsonb_each(COALESCE(p_concepts, '{}'::jsonb))
--     WHERE jsonb_typeof(value) = 'array'
--   ) parts;
-- $$;
