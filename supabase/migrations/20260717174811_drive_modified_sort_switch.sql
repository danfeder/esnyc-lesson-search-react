-- =====================================================
-- Migration: 20260717174811_drive_modified_sort_switch.sql
-- =====================================================
-- Description: Drive provenance PR-B — switch "Sort: Updated" to the ACTUAL
-- Drive modification time.
--
-- SEQUENCING (rollout doc 2026-07-17): this migration ships in PR-B, AFTER
-- the supervised historical backfill has populated drive_modified_at on the
-- active corpus. Shipping it earlier would sort an all-NULL column (NULLS
-- LAST -> title order) and make the "Updated" label meaningless.
--
-- WHAT CHANGES vs 20260717144705 (PR-A): search_lessons is recreated with the
-- IDENTICAL 16-arg signature and 15-column RETURNS; the ONLY differences are
--   * the 'modified' ORDER BY branch: sub.updated_at -> sub.drive_modified_at
--     DESC NULLS LAST (rows without readable Drive metadata sink last; NO
--     fallback to the application updated_at - that would make the label lie);
--   * the now-unreferenced `l.updated_at AS updated_at` ORDER-BY-only
--     exposure inside `sub` is removed (its sole consumer was the old sort).
-- Deterministic title/lesson_id tie-breakers unchanged.
--
-- Return type is UNCHANGED here, but DROP + CREATE (not CREATE OR REPLACE) is
-- kept for consistency with the PR-A definition and wrapped in one
-- BEGIN/COMMIT so the swap stays gap-free under the CLI's per-statement
-- autocommit. Grants re-issued; PostgREST notified.
--
-- DATA SAFETY: function definition only - no rows mutated.
-- =====================================================

BEGIN;

DROP FUNCTION IF EXISTS public.search_lessons(
  text, text[], text[], text[], text[], text[], text[], text[],
  text[], text[], text[], text[], text[], integer, integer, text
);

CREATE FUNCTION public.search_lessons(
  search_query            text    DEFAULT NULL,
  filter_grade_levels     text[]  DEFAULT NULL,
  filter_themes           text[]  DEFAULT NULL,
  filter_seasons          text[]  DEFAULT NULL,
  filter_competencies     text[]  DEFAULT NULL,
  filter_cultures         text[]  DEFAULT NULL,
  filter_location         text[]  DEFAULT NULL,
  filter_activity_type    text[]  DEFAULT NULL,
  filter_main_ingredients text[]  DEFAULT NULL,   -- Brief 5: direct-match ingredient filter (group OR specific)
  filter_academic         text[]  DEFAULT NULL,
  filter_sel              text[]  DEFAULT NULL,
  filter_cooking_method   text[]  DEFAULT NULL,
  filter_tags             text[]  DEFAULT NULL,
  page_size               integer DEFAULT 20,
  page_offset             integer DEFAULT 0,
  order_by                text    DEFAULT 'relevance'   -- C58: relevance | title | modified
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
  total_count  bigint,
  -- Drive provenance (public subset ONLY — drive_file_id and the sync/verified
  -- timestamps are deliberately not returned).
  drive_mime_type           text,
  drive_created_at          timestamptz,
  drive_modified_at         timestamptz,
  drive_creator_name        text,
  drive_creator_attribution text,
  drive_creator_source      text
)
LANGUAGE plpgsql
AS $$
DECLARE
  expanded_tsquery  tsquery;        -- C41: was `expanded_query text` (now a real tsquery)
  expanded_cultures text[];
  total_results     bigint;
  cnt_and           bigint;         -- C41 PR D: strict-AND result count for the relax decision
  K_relax constant int := 10;       -- C41 PR D: relax threshold (eval-tuned on TEST; cnt_and includes the trigram cushion)
  -- C58: normalize the sort key. The DEFAULT only covers an OMITTED arg; an
  -- explicit NULL / 'grade' / 'confidence' / unknown all collapse to relevance.
  sort_key text := CASE WHEN order_by IN ('title', 'modified') THEN order_by ELSE 'relevance' END;
BEGIN
  -- Synonym expansion for FTS (C41: now returns a tsquery, or NULL/empty)
  IF search_query IS NOT NULL AND search_query <> '' THEN
    expanded_tsquery := expand_search_with_synonyms(search_query);
  ELSE
    expanded_tsquery := NULL;
  END IF;

  -- Cultural heritage: alias FIRST, then expand to children.
  IF filter_cultures IS NOT NULL AND array_length(filter_cultures, 1) > 0 THEN
    expanded_cultures := expand_cultural_heritage(_alias_cultural_heritage(filter_cultures));
  ELSE
    expanded_cultures := NULL;
  END IF;

  -- C41 PR D: two-pass relax ("safety net"). Strict AND-of-ORs (mig 20260629000000)
  -- can leave a near-empty result set when not every term co-occurs (the eval recall
  -- cliff, e.g. "teamwork and cooperation" -> 0). Count the strict-AND result set WITH
  -- the user active filters; if it is below K_relax, swap expanded_tsquery to the
  -- loose-OR companion for the rest of the function (total count + page + rank).
  -- Per-query all-AND OR all-OR, never a mix, so total_count and pagination stay
  -- consistent. Deliberate recall-over-precision for otherwise-near-empty queries. At
  -- THIS point expanded_tsquery is still the strict-AND tsquery, so cnt_and measures the
  -- strict-AND set; any reassignment happens after. The WHERE below is IDENTICAL to the
  -- total-count and page WHERE clauses (same expanded_tsquery / expanded_cultures /
  -- filter args).
  IF search_query IS NOT NULL AND search_query <> '' AND expanded_tsquery IS NOT NULL THEN
    SELECT COUNT(*) INTO cnt_and
    FROM lessons l
    WHERE
      (search_query IS NULL OR search_query = '' OR (
        -- C41/GATE-A F2: guard the FTS branch for the empty/NULL tsquery (a non-empty
        -- all-stop-word query resolves to NULL/empty and must not error to_tsquery).
        (expanded_tsquery IS NOT NULL AND numnode(expanded_tsquery) > 0
           AND l.search_vector @@ expanded_tsquery) OR
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
      -- Brief 5: plain direct-match ingredient filter (group OR specific matched verbatim;
      -- no expansion — the specific's parent group rides along by the enforced invariant).
      AND (filter_main_ingredients IS NULL OR array_length(filter_main_ingredients, 1) IS NULL OR
           l.main_ingredients && filter_main_ingredients)
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

    IF cnt_and < K_relax THEN
      expanded_tsquery := expand_search_with_synonyms_or(search_query);
    END IF;
  END IF;

  -- Total count (count and result queries share WHERE)
  SELECT COUNT(*) INTO total_results
  FROM lessons l
  WHERE
    (search_query IS NULL OR search_query = '' OR (
      -- C41/GATE-A F2: guard the FTS branch for the empty/NULL tsquery (a non-empty
      -- all-stop-word query resolves to NULL/empty and must not error to_tsquery).
      (expanded_tsquery IS NOT NULL AND numnode(expanded_tsquery) > 0
         AND l.search_vector @@ expanded_tsquery) OR
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
    -- Brief 5: plain direct-match ingredient filter (group OR specific).
    AND (filter_main_ingredients IS NULL OR array_length(filter_main_ingredients, 1) IS NULL OR
         l.main_ingredients && filter_main_ingredients)
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
  -- ranked SELECT is wrapped in subquery `sub`, and the outer query selects
  -- only the RETURNS columns and orders on sub.* . LIMIT/OFFSET stay on the
  -- OUTER query. (The old `l.updated_at AS updated_at` ORDER-BY-only exposure
  -- is gone — the 'modified' sort now uses drive_modified_at, which IS a
  -- returned column. Drive provenance.)
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
    sub.total_count,
    sub.drive_mime_type,
    sub.drive_created_at,
    sub.drive_modified_at,
    sub.drive_creator_name,
    sub.drive_creator_attribution,
    sub.drive_creator_source
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
            -- C41: ts_rank consumes the tsquery directly; COALESCE keeps ts_rank(vector,
            -- NULL) → 0 safe for the empty-tsquery case (GATE-B — do NOT drop it).
            COALESCE(ts_rank(l.search_vector, expanded_tsquery), 0),
            COALESCE(similarity(l.title,   search_query), 0),
            COALESCE(similarity(l.summary, search_query), 0) * 0.8
          )::double precision
        ELSE 0::double precision
      END AS rank,
      total_results AS total_count,
      -- Drive provenance (public subset).
      l.drive_mime_type,
      l.drive_created_at,
      l.drive_modified_at,
      l.drive_creator_name,
      l.drive_creator_attribution,
      l.drive_creator_source
    FROM lessons l
    WHERE
      (search_query IS NULL OR search_query = '' OR (
        (expanded_tsquery IS NOT NULL AND numnode(expanded_tsquery) > 0
           AND l.search_vector @@ expanded_tsquery) OR
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
      -- Brief 5: plain direct-match ingredient filter (group OR specific).
      AND (filter_main_ingredients IS NULL OR array_length(filter_main_ingredients, 1) IS NULL OR
           l.main_ingredients && filter_main_ingredients)
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
    -- Drive provenance: 'Sort: Updated' now means the ACTUAL Drive modification
    -- time. NULLS LAST (rows without readable Drive metadata sink to the end);
    -- NO fallback to the application updated_at — that would silently make the
    -- label lie.
    CASE WHEN sort_key = 'modified'  THEN sub.drive_modified_at END DESC NULLS LAST,
    sub.title ASC,
    sub.lesson_id ASC
  LIMIT page_size
  OFFSET page_offset;
END;
$$;

-- Re-issue GRANT for the recreated 16-arg signature (1×text + 12×text[] + 2×integer + 1×text).
GRANT EXECUTE ON FUNCTION public.search_lessons(text, text[], text[], text[], text[], text[], text[], text[], text[], text[], text[], text[], text[], integer, integer, text) TO anon, authenticated, service_role;

-- Reload PostgREST's schema cache so the redefined function is picked up immediately.
NOTIFY pgrst, 'reload schema';

COMMIT;

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- Re-apply the search_lessons definition from
-- 20260717144705_drive_provenance_columns_and_rpcs.sql verbatim (updated_at
-- 'modified' sort + the l.updated_at ORDER-BY-only exposure) inside
-- BEGIN/COMMIT, re-GRANT the 16-arg signature, NOTIFY pgrst.
-- =====================================================
