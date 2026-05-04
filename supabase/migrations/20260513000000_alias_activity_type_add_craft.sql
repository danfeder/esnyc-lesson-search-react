-- =====================================================
-- Migration: 20260513000000_alias_activity_type_add_craft.sql
-- =====================================================
-- Description:
--   PR-1 Task 1.4a — Activity Type filter expansion (D2: 4 corpus values → 5).
--
--   Adds a fifth branch to the `_alias_activity_type` translator helper so the
--   new sidebar slug 'craft-only' (added in src/utils/filterDefinitions.ts in
--   the same commit) matches both the slug itself AND the bare-noun corpus
--   value 'craft'. The pattern mirrors the three pre-existing branches:
--     'cooking-only'   → ['cooking-only', 'cooking']
--     'garden-only'    → ['garden-only', 'garden']
--     'academic-only'  → ['academic-only', 'academic']
--     'craft-only'     → ['craft-only', 'craft']  <-- new in this migration
--   'both' continues to fall through ELSE (no slug-vs-corpus mismatch).
--
--   Signature unchanged (text[] → text[]); CREATE OR REPLACE handles in-place
--   redefinition idempotently. Permissions persist across CREATE OR REPLACE
--   per Postgres semantics, but the GRANT is re-issued defensively (no-op if
--   already granted).
--
--   Corpus state at migration time (verified on TEST DB 2026-05-04 during
--   Task 1.1): the `activity_type` column has 0 rows currently using 'craft'
--   — the new value is for forward-tagging via PR 2's LLM auto-tag pipeline
--   and Stage 2 corpus re-tag. No data migration is required.
--
-- Design reference:
--   docs/plans/2026-05-03-metadata-rebuild-foundation-design.md §4 (D2)
--   docs/plans/2026-05-03-metadata-rebuild-foundation-implementation.md §1.4a
-- =====================================================


-- =====================================================
-- CHANGES
-- =====================================================

CREATE OR REPLACE FUNCTION public._alias_activity_type(p_values text[])
RETURNS text[]
LANGUAGE sql
IMMUTABLE PARALLEL SAFE
AS $$
  SELECT ARRAY(
    SELECT DISTINCT v
    FROM unnest(coalesce(p_values, ARRAY[]::text[])) AS x,
    LATERAL (
      SELECT unnest(
        CASE x
          WHEN 'cooking-only'   THEN ARRAY['cooking-only', 'cooking']
          WHEN 'garden-only'    THEN ARRAY['garden-only', 'garden']
          WHEN 'academic-only'  THEN ARRAY['academic-only', 'academic']
          WHEN 'craft-only'     THEN ARRAY['craft-only', 'craft']
          ELSE ARRAY[x]
        END
      ) AS v
    ) AS expanded
  );
$$;

GRANT EXECUTE ON FUNCTION public._alias_activity_type(text[]) TO anon, authenticated, service_role;


-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- Restore the pre-Task-1.4a definition by removing the 'craft-only' branch:
--
-- CREATE OR REPLACE FUNCTION public._alias_activity_type(p_values text[])
-- RETURNS text[]
-- LANGUAGE sql
-- IMMUTABLE PARALLEL SAFE
-- AS $$
--   SELECT ARRAY(
--     SELECT DISTINCT v
--     FROM unnest(coalesce(p_values, ARRAY[]::text[])) AS x,
--     LATERAL (
--       SELECT unnest(
--         CASE x
--           WHEN 'cooking-only'   THEN ARRAY['cooking-only', 'cooking']
--           WHEN 'garden-only'    THEN ARRAY['garden-only', 'garden']
--           WHEN 'academic-only'  THEN ARRAY['academic-only', 'academic']
--           ELSE ARRAY[x]
--         END
--       ) AS v
--     ) AS expanded
--   );
-- $$;
