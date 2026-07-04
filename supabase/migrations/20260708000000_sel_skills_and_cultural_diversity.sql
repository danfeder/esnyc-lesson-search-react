-- =====================================================
-- Migration: 20260708000000_sel_skills_and_cultural_diversity.sql
-- =====================================================
-- Description:
--   FP5 Brief 1 (owner decisions 2026-07-04, record:
--   docs/plans/2026-07-04-owner-uiux-candidates.md §4). Two template-era vocab
--   changes, one transaction, one owner gate:
--     (A) SEL WIDEN — the reviewer/search "Social-Emotional" category adds 6
--         template-era skills (Bravery, Kindness, Respect, Collaboration, Pride,
--         Joy) to the 5 CASEL values. Additive superset → valid_social_emotional_learning
--         is dropped and re-added with the 11-value array; every existing row is a
--         subset of the old 5, so the re-add validates trivially. Category LABEL
--         renames to "Social-Emotional Skills" in the app; the KEY/COLUMN
--         social_emotional_learning is unchanged (no data write here).
--     (B) CULTURAL DIVERSITY RENAME — "Culturally Responsive Education" →
--         "Cultural Diversity" (owner: same concept, a rename not a re-tag).
--         Renames the 320 stored carriers (column core_competencies AND the JSONB
--         mirror metadata->'coreCompetencies') and swaps valid_core_competencies.
--         'Social-Emotional Intelligence' (a DIFFERENT Core Competency value) is KEPT.
--
-- HARD ORDERING (Fable-verified 2026-07-04 on PROD): FP4 Brief 6
--   (20260707000000) must already be live — 6 of the 7 grandfathered retired rows
--   carry the old value, and until Brief 6 healed their off-vocab
--   cooking_skills/main_ingredients + VALIDATEd valid_cooking_skills /
--   valid_main_ingredients, ANY UPDATE on those rows re-checks the NOT-VALID pair
--   against the whole row and ERRORS. Pre-assert (1a) below refuses to run unless
--   both are convalidated (VALIDATE only flips convalidated=true after a full scan
--   proved 0 violations, and the CHECK enforces on every write thereafter → 0
--   existing rows violate). If it fires, STOP and apply Brief 6 first.
--
-- LIVE PROD CENSUS (re-probed 2026-07-04, jxlxtzkmicfhchkhiojz — numbers drift,
--   every assert is data-driven; TEST is a stale snapshot with different counts):
--     * 785 total rows; 320 carry 'Culturally Responsive Education' in
--       core_competencies (276 active + 44 retired) and EXACTLY the same 320 carry
--       it in the metadata->'coreCompetencies' JSONB mirror (col==json, verified
--       symmetric: 0 col-only, 0 json-only).
--     * For all 785 rows to_jsonb(core_competencies) = metadata->'coreCompetencies'
--       exactly (order included) — the lessons_normalize_write trigger keeps them
--       column-canonical (block I: when the column is non-empty and the JSONB
--       mirror differs, it OVERWRITES the mirror with to_jsonb(column)). So the
--       dual-write below sets the JSONB to to_jsonb(new column): identical to what
--       the trigger would produce, drift = 0, and the trigger sees a match and
--       leaves it alone.
--     * search_vector does NOT index coreCompetencies (verified against the live
--       update_lesson_search_vector def) — the rename UPDATE touches metadata and
--       so fires the search-vector trigger, but recomputes to the SAME vector for
--       the 320 rows. No FTS refresh needed. (It DOES index social_emotional_learning,
--       but the SEL change is DDL-only — no row is written — so search_vector is
--       untouched there too.)
--     * NO updated_at auto-bump: neither trigger function references updated_at, and
--       this UPDATE does not SET it → the rename does not bump updated_at (rename ≠
--       content edit; matches the FP4 Brief 6 retire precedent).
--
-- GOTCHAS baked in:
--   * supabase db push is autocommit-per-statement → the BEGIN/COMMIT wrap is
--     MANDATORY so a failing post-assert rolls back the data rename AND both
--     constraint swaps.
--   * The old constraint forbids 'Cultural Diversity', so valid_core_competencies
--     must be DROPPED before the UPDATE and re-added AFTER (order: drop → update →
--     add). The re-add validates immediately (all rows now carry the new value or
--     other valid values).
--   * LOCK TABLE lessons IN SHARE ROW EXCLUSIVE MODE — serialize vs concurrent
--     reviewer saves.
--
-- LOCAL-RESET / CI: on a fresh `supabase db reset` the lessons table is nearly
--   empty; the constraints exist (created by earlier migrations that run first),
--   the rename UPDATE matches 0 rows, and every assert passes vacuously
--   (captured old count 0 == new count 0, counts unchanged). Brief 6
--   (20260707000000) runs before this file, so its VALIDATE makes the pre-assert
--   pass locally too.
--
-- See: docs/plans/fp5-briefs/brief-1-sel-skills-and-cultural-diversity.md,
--      docs/plans/2026-07-04-pre-wave-plan.md (chain step 2),
--      docs/plans/fp4-briefs/brief-6-validate-constraints.md (chain step 1).
-- =====================================================

BEGIN;

LOCK TABLE public.lessons IN SHARE ROW EXCLUSIVE MODE;

-- Capture the pre-state so the post-asserts can compare against it (a temp table
-- persists across the statements of this transaction; DO-block locals do not).
CREATE TEMP TABLE _b1_census ON COMMIT DROP AS
SELECT
  (SELECT count(*) FROM public.lessons
     WHERE 'Culturally Responsive Education' = ANY (core_competencies))                      AS cre_col,
  (SELECT count(*) FROM public.lessons
     WHERE metadata->'coreCompetencies' @> '"Culturally Responsive Education"'::jsonb)        AS cre_json,
  (SELECT count(*) FROM public.lessons)                                                       AS total_rows,
  (SELECT count(*) FROM public.lessons WHERE retired_at IS NULL)                              AS active_rows;

-- ---------------------------------------------------------------------------
-- (1) PRE-ASSERTS (all data-driven; RAISE EXCEPTION rolls the whole txn back).
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_cre_col       int;
  v_cre_json      int;
  v_notvalid_ok   int;
BEGIN
  SELECT cre_col, cre_json INTO v_cre_col, v_cre_json FROM _b1_census;

  -- (1a) Brief-6 ordering guard: both former NOT-VALID constraints must be
  -- convalidated (⟺ 0 existing rows violate them ⟺ the CRE-carrying retired rows
  -- won't error on the rename UPDATE's whole-row re-check).
  SELECT count(*) INTO v_notvalid_ok
  FROM pg_constraint
  WHERE conrelid = 'public.lessons'::regclass
    AND conname IN ('valid_cooking_skills', 'valid_main_ingredients')
    AND convalidated;
  IF v_notvalid_ok <> 2 THEN
    RAISE EXCEPTION
      'FP5-B1 pre-assert: valid_cooking_skills/valid_main_ingredients not both convalidated (found %). FP4 Brief 6 (20260707000000) must be applied first — STOP.',
      v_notvalid_ok;
  END IF;

  -- (1b) Column carriers must equal JSONB-mirror carriers for the old value.
  IF v_cre_col <> v_cre_json THEN
    RAISE EXCEPTION
      'FP5-B1 pre-assert: old-value carriers differ across representations — column=% JSONB=% (dual-representation drift; investigate before renaming).',
      v_cre_col, v_cre_json;
  END IF;

  RAISE NOTICE 'FP5-B1 pre-assert OK: % carriers (column==JSONB); total=%, active=%.',
    v_cre_col, (SELECT total_rows FROM _b1_census), (SELECT active_rows FROM _b1_census);
END $$;

-- ---------------------------------------------------------------------------
-- (2) SEL WIDEN — 5 CASEL values + 6 template-era skills. Additive superset,
--     so the re-add validates trivially (no NOT VALID needed). No data write.
--     Array is byte-identical to SOCIAL_EMOTIONAL_LEARNING_VALUES in
--     src/types/lessonMetadata.zod.ts + the edge mirror.
-- ---------------------------------------------------------------------------
ALTER TABLE public.lessons DROP CONSTRAINT valid_social_emotional_learning;
ALTER TABLE public.lessons ADD CONSTRAINT valid_social_emotional_learning CHECK (
  social_emotional_learning IS NULL
  OR social_emotional_learning <@ ARRAY[
    'Relationship skills',
    'Self-awareness',
    'Responsible decision-making',
    'Self-management',
    'Social awareness',
    'Bravery',
    'Kindness',
    'Respect',
    'Collaboration',
    'Pride',
    'Joy'
  ]::text[]
);

-- ---------------------------------------------------------------------------
-- (3) CULTURAL DIVERSITY RENAME — drop the old CHECK, rename the 320 carriers in
--     BOTH representations (single per-row write; JSONB set to to_jsonb(new
--     column) = trigger-canonical, drift = 0), then re-add the CHECK with the new
--     value. New array is byte-identical to CORE_COMPETENCIES_VALUES in
--     src/types/lessonMetadata.zod.ts + the edge mirror.
-- ---------------------------------------------------------------------------
ALTER TABLE public.lessons DROP CONSTRAINT valid_core_competencies;

UPDATE public.lessons
SET
  core_competencies =
    array_replace(core_competencies, 'Culturally Responsive Education', 'Cultural Diversity'),
  metadata = jsonb_set(
    metadata,
    '{coreCompetencies}',
    to_jsonb(
      array_replace(core_competencies, 'Culturally Responsive Education', 'Cultural Diversity')
    )
  )
WHERE 'Culturally Responsive Education' = ANY (core_competencies);

ALTER TABLE public.lessons ADD CONSTRAINT valid_core_competencies CHECK (
  core_competencies IS NULL
  OR core_competencies <@ ARRAY[
    'Environmental and Community Stewardship',
    'Social Justice',
    'Social-Emotional Intelligence',
    'Garden Skills and Related Academic Content',
    'Kitchen Skills and Related Academic Content',
    'Cultural Diversity'
  ]::text[]
);

-- ---------------------------------------------------------------------------
-- (4) POST-ASSERTS.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  c_cre       int;
  c_total     int;
  c_active    int;
  v_old_col   int;
  v_old_json  int;
  v_new_col   int;
  v_new_json  int;
  v_total     int;
  v_active    int;
  v_validated int;
  v_drift     int;
BEGIN
  SELECT cre_col, total_rows, active_rows INTO c_cre, c_total, c_active FROM _b1_census;

  SELECT
    count(*) FILTER (WHERE 'Culturally Responsive Education' = ANY (core_competencies)),
    count(*) FILTER (WHERE metadata->'coreCompetencies' @> '"Culturally Responsive Education"'::jsonb),
    count(*) FILTER (WHERE 'Cultural Diversity' = ANY (core_competencies)),
    count(*) FILTER (WHERE metadata->'coreCompetencies' @> '"Cultural Diversity"'::jsonb),
    count(*),
    count(*) FILTER (WHERE retired_at IS NULL)
  INTO v_old_col, v_old_json, v_new_col, v_new_json, v_total, v_active
  FROM public.lessons;

  -- Old value fully gone from both representations.
  IF v_old_col <> 0 OR v_old_json <> 0 THEN
    RAISE EXCEPTION 'FP5-B1 post-assert: old value still present — column=% JSONB=%.', v_old_col, v_old_json;
  END IF;

  -- New value present on exactly the captured carrier count, in both representations.
  IF v_new_col <> c_cre OR v_new_json <> c_cre THEN
    RAISE EXCEPTION
      'FP5-B1 post-assert: new-value carriers column=% JSONB=% <> captured old count %.',
      v_new_col, v_new_json, c_cre;
  END IF;

  -- No rows created/destroyed.
  IF v_total <> c_total OR v_active <> c_active THEN
    RAISE EXCEPTION 'FP5-B1 post-assert: row counts changed — total %→%, active %→%.',
      c_total, v_total, c_active, v_active;
  END IF;

  -- Column ⟷ JSONB drift is zero across the WHOLE table (trigger invariant held).
  SELECT count(*) INTO v_drift
  FROM public.lessons
  WHERE to_jsonb(core_competencies) IS DISTINCT FROM metadata->'coreCompetencies';
  IF v_drift <> 0 THEN
    RAISE EXCEPTION 'FP5-B1 post-assert: % rows drifted between core_competencies column and JSONB mirror.', v_drift;
  END IF;

  -- Both constraints present and validated.
  SELECT count(*) INTO v_validated
  FROM pg_constraint
  WHERE conrelid = 'public.lessons'::regclass
    AND conname IN ('valid_core_competencies', 'valid_social_emotional_learning')
    AND convalidated;
  IF v_validated <> 2 THEN
    RAISE EXCEPTION 'FP5-B1 post-assert: expected 2 validated constraints (core_competencies + SEL), found %.', v_validated;
  END IF;

  RAISE NOTICE
    'FP5-B1 OK: renamed % rows CRE→Cultural Diversity (column+JSONB), SEL widened to 11, both constraints validated, counts unchanged (total=%, active=%).',
    c_cre, v_total, v_active;
END $$;

COMMIT;

-- =====================================================
-- ROLLBACK (keep as comments; the migration renames 320 rows and swaps two
-- constraints — a true rollback must un-swap valid_core_competencies BEFORE
-- restoring the old value, else the restore violates the now-current CHECK. SEL
-- is a pure superset widen; narrowing it back is only safe if no row has adopted
-- one of the 6 new values since apply — check first.)
-- =====================================================
-- BEGIN;
-- LOCK TABLE public.lessons IN SHARE ROW EXCLUSIVE MODE;
-- -- (B) undo the Cultural Diversity rename.
-- ALTER TABLE public.lessons DROP CONSTRAINT valid_core_competencies;
-- UPDATE public.lessons
-- SET core_competencies = array_replace(core_competencies, 'Cultural Diversity', 'Culturally Responsive Education'),
--     metadata = jsonb_set(metadata, '{coreCompetencies}',
--       to_jsonb(array_replace(core_competencies, 'Cultural Diversity', 'Culturally Responsive Education')))
-- WHERE 'Cultural Diversity' = ANY (core_competencies);
-- ALTER TABLE public.lessons ADD CONSTRAINT valid_core_competencies CHECK (
--   core_competencies IS NULL OR core_competencies <@ ARRAY[
--     'Environmental and Community Stewardship','Social Justice','Social-Emotional Intelligence',
--     'Garden Skills and Related Academic Content','Kitchen Skills and Related Academic Content',
--     'Culturally Responsive Education']::text[]);
-- -- (A) undo the SEL widen (only if no row adopted Bravery/Kindness/Respect/Collaboration/Pride/Joy).
-- ALTER TABLE public.lessons DROP CONSTRAINT valid_social_emotional_learning;
-- ALTER TABLE public.lessons ADD CONSTRAINT valid_social_emotional_learning CHECK (
--   social_emotional_learning IS NULL OR social_emotional_learning <@ ARRAY[
--     'Relationship skills','Self-awareness','Responsible decision-making','Self-management','Social awareness']::text[]);
-- COMMIT;
