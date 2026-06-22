-- =====================================================
-- Migration: 20260622010000_wave4_pr2_delete_ghosts_search_rpc.sql
-- =====================================================
-- Description: Wave 4 (data/corpus cleanup) PR 2 — the wave's single irreversible
--   step, isolated in its own blast radius.
--   Section C11a: snapshot the 3 ghost "Unknown" lesson rows into a dedicated
--                 service-role-only rollback table BEFORE deleting.
--   Section C11b: guarded, env-independent, idempotent hard-DELETE of those 3
--                 ghost rows from public.lessons.
--   Section C11c + C49: recreate search_lessons from the W1b baseline minus BOTH
--                 hardcoded 3-ID ghost-exclusion blocks (no longer needed — the
--                 rows are gone) AND minus the dead filter_lesson_format param
--                 (15-arg signature), then re-GRANT EXECUTE + NOTIFY pgrst.
--
-- Design doc: docs/plans/2026-06-22-wave4-data-corpus-cleanup-design.md (§4 Q8-Q10, §5 PR2, §6)
-- Implementation: docs/plans/2026-06-22-wave4-data-corpus-cleanup-implementation.md (Task 2.2)
-- Recreate baseline: supabase/migrations/20260620000000_search_lessons_w1b.sql
--
-- DATA SAFETY (Wave 4 ethos): snapshot-before-mutate, guarded, idempotent.
--   The DELETE is recoverable ONLY from public.wave4_c11_ghost_rollback. The
--   forward migration asserts the snapshot is complete BEFORE deleting, asserts
--   the guarded delete removed exactly the live ghost count (and never > 3), and
--   asserts 0 ghost rows remain. The .sql.rollback recreates the prior 16-arg RPC
--   (with re-GRANT + NOTIFY) and re-inserts the snapshot rows.
--
-- ENV-INDEPENDENT — DO NOT hardcode "3". 3 ghost rows live on TEST/PROD, 0 on
--   local. The guards self-adapt (local 0 live → all guards pass vacuously) and
--   are idempotent (a re-run finds 0 live → passes).
--
-- Schema-conformance (supervisor pre-flight verified via pg_constraint): public.lessons
--   has 43 columns, 0 generated, 0 identity. PK = id (lessons_pkey); lesson_id carries a
--   separate UNIQUE constraint (lessons_lesson_id_key) → `ON CONFLICT (lesson_id)` is valid,
--   and all FKs reference lessons.lesson_id. `LIKE ... INCLUDING ALL` + `INSERT ... SELECT *`
--   are safe (no generated-column trap). All 13 inbound reference probes = 0 on both DBs.
--   The ONLY ON DELETE CASCADE FKs into lessons.lesson_id are bookmarks.lesson_id and
--   canonical_lessons.duplicate_id (both 0 children on TEST+PROD) → the C11b CASCADE-child
--   guard below makes that precondition self-enforcing, so the parent-only snapshot is whole.

-- =====================================================
-- SECTION C11a — snapshot the 3 ghost rows BEFORE delete
-- =====================================================
-- Service-role-only: RLS enabled, NO policies (mirrors PR1 snapshot tables /
-- the pr6_retag_rollback precedent).
CREATE TABLE IF NOT EXISTS public.wave4_c11_ghost_rollback (LIKE public.lessons INCLUDING ALL);
ALTER TABLE public.wave4_c11_ghost_rollback ENABLE ROW LEVEL SECURITY;

INSERT INTO public.wave4_c11_ghost_rollback
SELECT * FROM public.lessons
WHERE lesson_id IN ('1l9KH63QBe2xhyH0zp6VIavtj0uKSRZtd','1lDjv2GUFzOC9pSWTpCVQW2ctWvvNmTPP4Jc1iAzrsaU','1nFbpkwlujk8fIO8RkeIcDoO2fuO83Iil2Srf8t5iqm8')
  AND title = 'Unknown'
  AND content_hash = '238f211fc9915924a2c8c1a8772039846ea736f0d3af04fa403d875d668e83ef'
  AND retired_at IS NULL
  AND original_submission_id IS NULL
ON CONFLICT (lesson_id) DO NOTHING;

-- Snapshot-completeness guard (Codex C11-HIGH): no LIVE ghost row may be left un-snapshotted.
-- Env-independent + idempotent: local 0 live → vacuously passes; re-run (0 live) → passes.
DO $$
DECLARE n_missing int;
BEGIN
  SELECT count(*) INTO n_missing
  FROM public.lessons l
  WHERE l.lesson_id IN ('1l9KH63QBe2xhyH0zp6VIavtj0uKSRZtd','1lDjv2GUFzOC9pSWTpCVQW2ctWvvNmTPP4Jc1iAzrsaU','1nFbpkwlujk8fIO8RkeIcDoO2fuO83Iil2Srf8t5iqm8')
    AND l.title = 'Unknown'
    AND l.content_hash = '238f211fc9915924a2c8c1a8772039846ea736f0d3af04fa403d875d668e83ef'
    AND l.retired_at IS NULL
    AND l.original_submission_id IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.wave4_c11_ghost_rollback s WHERE s.lesson_id = l.lesson_id);
  IF n_missing <> 0 THEN
    RAISE EXCEPTION 'C11 snapshot incomplete: % live ghost row(s) not captured — aborting before DELETE', n_missing;
  END IF;
END $$;

-- =====================================================
-- SECTION C11b — guarded, env-independent, idempotent hard-DELETE
-- =====================================================
DO $$
DECLARE n_live_before int; n_del int; n_remain int; n_cascade int;
BEGIN
  -- Make the CASCADE-child guard atomic w.r.t. concurrent child writes (Codex GATE-4):
  -- SHARE MODE blocks concurrent INSERT/UPDATE/DELETE on these two tables for the rest of
  -- this transaction, so no cascade-child row can commit between the count below and the
  -- parent DELETE (closes the guard's TOCTOU window). Negligible cost on a controlled,
  -- approval-gated, milliseconds-long migration; neither table has long-running writers.
  LOCK TABLE public.bookmarks, public.canonical_lessons IN SHARE MODE;

  -- CASCADE-child guard (Codex C11-HIGH): the ONLY ON DELETE CASCADE FKs into
  -- lessons.lesson_id are bookmarks.lesson_id and canonical_lessons.duplicate_id
  -- (verified via pg_constraint). The rollback restores PARENT rows only, so any
  -- cascade-deleted child would be UNRECOVERABLE. Assert 0 such children for the 3
  -- ghost IDs BEFORE deleting — turns a silent cascade-loss into a fail-loud abort.
  -- (Pre-flight verified 0 on TEST+PROD; this self-protects against any drift.)
  SELECT (SELECT count(*) FROM public.bookmarks
            WHERE lesson_id IN ('1l9KH63QBe2xhyH0zp6VIavtj0uKSRZtd','1lDjv2GUFzOC9pSWTpCVQW2ctWvvNmTPP4Jc1iAzrsaU','1nFbpkwlujk8fIO8RkeIcDoO2fuO83Iil2Srf8t5iqm8'))
       + (SELECT count(*) FROM public.canonical_lessons
            WHERE duplicate_id IN ('1l9KH63QBe2xhyH0zp6VIavtj0uKSRZtd','1lDjv2GUFzOC9pSWTpCVQW2ctWvvNmTPP4Jc1iAzrsaU','1nFbpkwlujk8fIO8RkeIcDoO2fuO83Iil2Srf8t5iqm8'))
    INTO n_cascade;
  IF n_cascade <> 0 THEN
    RAISE EXCEPTION 'C11 aborting: % CASCADE-child row(s) reference the ghost IDs (would be unrecoverably cascade-deleted)', n_cascade;
  END IF;

  SELECT count(*) INTO n_live_before
  FROM public.lessons
  WHERE lesson_id IN ('1l9KH63QBe2xhyH0zp6VIavtj0uKSRZtd','1lDjv2GUFzOC9pSWTpCVQW2ctWvvNmTPP4Jc1iAzrsaU','1nFbpkwlujk8fIO8RkeIcDoO2fuO83Iil2Srf8t5iqm8')
    AND title = 'Unknown'
    AND content_hash = '238f211fc9915924a2c8c1a8772039846ea736f0d3af04fa403d875d668e83ef'
    AND retired_at IS NULL
    AND original_submission_id IS NULL;

  -- Snapshot-driven DELETE (Codex C11-MED, mirrors PR1's accepted pattern): JOIN to the
  -- snapshot so the mutation set can NEVER exceed the snapshotted set (closes the
  -- snapshot→delete TOCTOU — a ghost appearing after the snapshot would not be deleted and
  -- would trip the n_del<>n_live_before assert). Identity predicates on l retained as the
  -- guarded-delete safety.
  DELETE FROM public.lessons l
  USING public.wave4_c11_ghost_rollback s
  WHERE l.lesson_id = s.lesson_id
    AND l.lesson_id IN ('1l9KH63QBe2xhyH0zp6VIavtj0uKSRZtd','1lDjv2GUFzOC9pSWTpCVQW2ctWvvNmTPP4Jc1iAzrsaU','1nFbpkwlujk8fIO8RkeIcDoO2fuO83Iil2Srf8t5iqm8')
    AND l.title = 'Unknown'
    AND l.content_hash = '238f211fc9915924a2c8c1a8772039846ea736f0d3af04fa403d875d668e83ef'
    AND l.retired_at IS NULL
    AND l.original_submission_id IS NULL;
  GET DIAGNOSTICS n_del = ROW_COUNT;

  IF n_del <> n_live_before THEN
    RAISE EXCEPTION 'C11 guarded delete removed % rows but % live ghosts existed pre-delete — aborting', n_del, n_live_before;
  END IF;
  IF n_del > 3 THEN
    RAISE EXCEPTION 'C11 guarded delete removed % rows (> 3 ghost IDs) — aborting', n_del;
  END IF;

  SELECT count(*) INTO n_remain
  FROM public.lessons
  WHERE lesson_id IN ('1l9KH63QBe2xhyH0zp6VIavtj0uKSRZtd','1lDjv2GUFzOC9pSWTpCVQW2ctWvvNmTPP4Jc1iAzrsaU','1nFbpkwlujk8fIO8RkeIcDoO2fuO83Iil2Srf8t5iqm8')
    AND title = 'Unknown'
    AND content_hash = '238f211fc9915924a2c8c1a8772039846ea736f0d3af04fa403d875d668e83ef';
  IF n_remain <> 0 THEN
    RAISE EXCEPTION 'C11 post-condition failed: % ghost row(s) remain after delete', n_remain;
  END IF;

  RAISE NOTICE 'C11: hard-deleted % ghost row(s) (env-adaptive: 3 on TEST/PROD, 0 on local)', n_del;
END $$;

-- =====================================================
-- SECTION C11c + C49 — recreate search_lessons (remove BOTH ghost-exclusion
--   blocks + drop the dead filter_lesson_format param)
-- =====================================================
-- Forward DROP targets the LIVE 16-arg signature (incl. order_by, post-C58) —
-- NOT w1b's line-175 15-arg DROP (that pre-C58 form would silently no-op and
-- leave a duplicate overload). Type-only form.
DROP FUNCTION IF EXISTS public.search_lessons(text, text[], text[], text[], text[], text[], text[], text[], text, text[], text[], text[], text[], integer, integer, text);


-- Recreated VERBATIM from the w1b CREATE (20260620000000_search_lessons_w1b.sql:194-392)
-- with EXACTLY three surgical edits and nothing else:
--   1. removed the `filter_lesson_format text DEFAULT NULL` signature line (C49) → 15 params, order_by stays LAST.
--   2. removed the COUNT-path C11 ghost-exclusion block (the rows are gone).
--   3. removed the RESULT-path C11 ghost-exclusion block.
CREATE FUNCTION public.search_lessons(
  search_query           text    DEFAULT NULL,
  filter_grade_levels    text[]  DEFAULT NULL,
  filter_themes          text[]  DEFAULT NULL,
  filter_seasons         text[]  DEFAULT NULL,
  filter_competencies    text[]  DEFAULT NULL,
  filter_cultures        text[]  DEFAULT NULL,
  filter_location        text[]  DEFAULT NULL,
  filter_activity_type   text[]  DEFAULT NULL,
  filter_academic        text[]  DEFAULT NULL,
  filter_sel             text[]  DEFAULT NULL,
  filter_cooking_method  text[]  DEFAULT NULL,
  filter_tags            text[]  DEFAULT NULL,
  page_size              integer DEFAULT 20,
  page_offset            integer DEFAULT 0,
  order_by               text    DEFAULT 'relevance'   -- NEW (C58): relevance | title | modified
)
RETURNS TABLE (
  lesson_id    text,
  title        text,
  summary      text,
  file_link    text,
  grade_levels text[],
  metadata     jsonb,
  confidence   jsonb,
  rank         double precision,
  total_count  bigint
)
LANGUAGE plpgsql
AS $$
DECLARE
  expanded_query    text;
  expanded_cultures text[];
  total_results     bigint;
  -- C58: normalize the sort key. The DEFAULT only covers an OMITTED arg; an
  -- explicit NULL / 'grade' / 'confidence' / unknown all collapse to relevance.
  sort_key text := CASE WHEN order_by IN ('title', 'modified') THEN order_by ELSE 'relevance' END;
BEGIN
  -- Synonym expansion for FTS
  IF search_query IS NOT NULL AND search_query <> '' THEN
    expanded_query := expand_search_with_synonyms(search_query);
  ELSE
    expanded_query := NULL;
  END IF;

  -- Cultural heritage: alias FIRST, then expand to children.
  IF filter_cultures IS NOT NULL AND array_length(filter_cultures, 1) > 0 THEN
    expanded_cultures := expand_cultural_heritage(_alias_cultural_heritage(filter_cultures));
  ELSE
    expanded_cultures := NULL;
  END IF;

  -- Total count (count and result queries share WHERE)
  SELECT COUNT(*) INTO total_results
  FROM lessons l
  WHERE
    (search_query IS NULL OR search_query = '' OR (
      l.search_vector @@ to_tsquery('english', expanded_query) OR
      l.title   % search_query OR
      l.summary % search_query
    ))
    AND (filter_grade_levels IS NULL OR array_length(filter_grade_levels, 1) IS NULL OR
         l.grade_levels && filter_grade_levels)
    AND (filter_themes IS NULL OR array_length(filter_themes, 1) IS NULL OR
         l.thematic_categories && filter_themes)
    AND (filter_seasons IS NULL OR array_length(filter_seasons, 1) IS NULL OR
         l.season_timing && filter_seasons)
    AND (filter_competencies IS NULL OR array_length(filter_competencies, 1) IS NULL OR
         l.core_competencies && filter_competencies)
    AND (expanded_cultures IS NULL OR array_length(expanded_cultures, 1) IS NULL OR
         l.cultural_heritage && expanded_cultures)
    -- location-Both (was: l.location_requirements && filter_location)
    AND (filter_location IS NULL OR array_length(filter_location, 1) IS NULL OR
         public._match_location(l.location_requirements, filter_location))
    AND (filter_activity_type IS NULL OR array_length(filter_activity_type, 1) IS NULL OR
         l.activity_type && _alias_activity_type(filter_activity_type))
    -- (filter_lesson_format WHERE clause removed — D3 lessonFormat field dropped.)
    AND (filter_academic IS NULL OR array_length(filter_academic, 1) IS NULL OR
         l.academic_integration && filter_academic)
    AND (filter_sel IS NULL OR array_length(filter_sel, 1) IS NULL OR
         l.social_emotional_learning && filter_sel)
    AND (filter_cooking_method IS NULL OR array_length(filter_cooking_method, 1) IS NULL OR
         _match_cooking_methods(l.cooking_methods, filter_cooking_method))
    AND (filter_tags IS NULL OR array_length(filter_tags, 1) IS NULL OR
         l.tags && filter_tags)
    -- exclude soft-retired imports (PR 4)
    AND l.retired_at IS NULL;

  -- Paginated result rows.
  -- C58: the conditional ORDER BY references the `rank` value, but Postgres
  -- cannot resolve the output alias inside a CASE expression. So the filtered/
  -- ranked SELECT is wrapped in subquery `sub` (which also exposes l.updated_at,
  -- not in RETURNS), and the outer query selects only the RETURNS columns and
  -- orders on sub.* . LIMIT/OFFSET stay on the OUTER query.
  RETURN QUERY
  SELECT
    sub.lesson_id,
    sub.title,
    sub.summary,
    sub.file_link,
    sub.grade_levels,
    sub.metadata,
    sub.confidence,
    sub.rank,
    sub.total_count
  FROM (
    SELECT
      l.lesson_id,
      l.title,
      l.summary,
      l.file_link,
      l.grade_levels,
      -- Per-field COALESCE metadata reconstruction. Same as 20260520020000.
      COALESCE(l.metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
        'thematicCategories',      CASE WHEN COALESCE(array_length(l.thematic_categories, 1), 0) > 0       THEN to_jsonb(l.thematic_categories)       END,
        'seasonTiming',            CASE WHEN COALESCE(array_length(l.season_timing, 1), 0) > 0             THEN to_jsonb(l.season_timing)             END,
        'locationRequirements',    CASE WHEN COALESCE(array_length(l.location_requirements, 1), 0) > 0     THEN to_jsonb(l.location_requirements)     END,
        'coreCompetencies',        CASE WHEN COALESCE(array_length(l.core_competencies, 1), 0) > 0         THEN to_jsonb(l.core_competencies)         END,
        'culturalHeritage',        CASE WHEN COALESCE(array_length(l.cultural_heritage, 1), 0) > 0         THEN to_jsonb(l.cultural_heritage)         END,
        'activityType',            CASE WHEN COALESCE(array_length(l.activity_type, 1), 0) > 0             THEN to_jsonb(l.activity_type)             END,
        'cookingMethods',          CASE WHEN COALESCE(array_length(l.cooking_methods, 1), 0) > 0           THEN to_jsonb(l.cooking_methods)           END,
        'academicIntegration',     CASE WHEN COALESCE(array_length(l.academic_integration, 1), 0) > 0      THEN to_jsonb(l.academic_integration)      END,
        'socialEmotionalLearning', CASE WHEN COALESCE(array_length(l.social_emotional_learning, 1), 0) > 0 THEN to_jsonb(l.social_emotional_learning) END,
        'academicConcepts',        CASE
                                     WHEN jsonb_typeof(l.metadata->'academicIntegration') = 'object'
                                      AND l.metadata->'academicIntegration' ? 'concepts'
                                     THEN l.metadata->'academicIntegration'->'concepts'
                                   END
      )) AS metadata,
      l.confidence,
      CASE
        WHEN search_query IS NOT NULL AND search_query <> '' THEN
          GREATEST(
            COALESCE(ts_rank(l.search_vector, to_tsquery('english', expanded_query)), 0),
            COALESCE(similarity(l.title,   search_query), 0),
            COALESCE(similarity(l.summary, search_query), 0) * 0.8
          )::double precision
        ELSE 0::double precision
      END AS rank,
      total_results AS total_count,
      l.updated_at AS updated_at        -- exposed for ORDER BY only; not in RETURNS
    FROM lessons l
    WHERE
      (search_query IS NULL OR search_query = '' OR (
        l.search_vector @@ to_tsquery('english', expanded_query) OR
        l.title   % search_query OR
        l.summary % search_query
      ))
      AND (filter_grade_levels IS NULL OR array_length(filter_grade_levels, 1) IS NULL OR
           l.grade_levels && filter_grade_levels)
      AND (filter_themes IS NULL OR array_length(filter_themes, 1) IS NULL OR
           l.thematic_categories && filter_themes)
      AND (filter_seasons IS NULL OR array_length(filter_seasons, 1) IS NULL OR
           l.season_timing && filter_seasons)
      AND (filter_competencies IS NULL OR array_length(filter_competencies, 1) IS NULL OR
           l.core_competencies && filter_competencies)
      AND (expanded_cultures IS NULL OR array_length(expanded_cultures, 1) IS NULL OR
           l.cultural_heritage && expanded_cultures)
      -- location-Both (was: l.location_requirements && filter_location)
      AND (filter_location IS NULL OR array_length(filter_location, 1) IS NULL OR
           public._match_location(l.location_requirements, filter_location))
      AND (filter_activity_type IS NULL OR array_length(filter_activity_type, 1) IS NULL OR
           l.activity_type && _alias_activity_type(filter_activity_type))
      -- (filter_lesson_format WHERE clause removed — D3.)
      AND (filter_academic IS NULL OR array_length(filter_academic, 1) IS NULL OR
           l.academic_integration && filter_academic)
      AND (filter_sel IS NULL OR array_length(filter_sel, 1) IS NULL OR
           l.social_emotional_learning && filter_sel)
      AND (filter_cooking_method IS NULL OR array_length(filter_cooking_method, 1) IS NULL OR
           _match_cooking_methods(l.cooking_methods, filter_cooking_method))
      AND (filter_tags IS NULL OR array_length(filter_tags, 1) IS NULL OR
           l.tags && filter_tags)
      -- exclude soft-retired imports (PR 4)
      AND l.retired_at IS NULL
  ) sub
  ORDER BY
    CASE WHEN sort_key = 'relevance' THEN sub.rank END DESC NULLS LAST,
    CASE WHEN sort_key = 'relevance' THEN COALESCE((sub.confidence->>'overall')::float, 0) END DESC NULLS LAST,
    CASE WHEN sort_key = 'title'     THEN sub.title END ASC NULLS LAST,
    CASE WHEN sort_key = 'modified'  THEN sub.updated_at END DESC NULLS LAST,
    sub.title ASC,
    sub.lesson_id ASC
  LIMIT page_size
  OFFSET page_offset;
END;
$$;


-- Re-issue GRANT (DROP discarded the old grant; CREATE makes a new function
-- identity with no inherited grants). NEW 15-arg type list (16-arg minus the
-- 9th `text` filter_lesson_format): 1×text + 11×text[] + 2×integer + 1×text.
GRANT EXECUTE ON FUNCTION public.search_lessons(text, text[], text[], text[], text[], text[], text[], text[], text[], text[], text[], text[], integer, integer, text) TO anon, authenticated, service_role;


-- Force PostgREST to reload its schema cache so the new 15-arg signature is
-- picked up immediately.
NOTIFY pgrst, 'reload schema';


-- =====================================================
-- ROLLBACK (keep as comments — full executable restore is in the sibling
-- 20260622010000_wave4_pr2_delete_ghosts_search_rpc.sql.rollback)
-- =====================================================
-- C11c: recreate the prior 16-arg search_lessons (WITH filter_lesson_format AND
--       both ghost-exclusion blocks) from the w1b baseline, re-GRANT EXECUTE
--       (16-arg type list) + NOTIFY pgrst, 'reload schema'.
-- C11a/b: restore the deleted parent rows via
--       INSERT INTO public.lessons SELECT * FROM public.wave4_c11_ghost_rollback.
-- The snapshot table public.wave4_c11_ghost_rollback is left in place as the
-- recovery artifact (a future cleanup migration drops it once PROD-stable).
-- NOTE: deleted rows are recoverable ONLY from this snapshot.
