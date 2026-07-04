-- =====================================================
-- Migration: 20260704000000_search_lessons_add_main_ingredients.sql
-- =====================================================
-- FP3 Brief 5 — promote Main Ingredients to a teacher-facing search filter.
-- Design: docs/plans/2026-07-03-fable-design-session.md §D-C;
--   docs/plans/fp3-briefs/brief-5-main-ingredients.md;
--   docs/plans/fp3-briefs/brief-5-INVARIANT-FORK-for-fable.md §4/§8 (build map,
--   Option A′ — group filter is a plain DIRECT MATCH, no group→children expansion).
--
-- WHAT CHANGES
--   search_lessons gains a 12th filter, `filter_main_ingredients text[]
--   DEFAULT NULL`, matched with a plain array-overlap (`&&`) clause — identical
--   in shape to the existing themes/competencies/etc. filters. A GROUP value
--   (e.g. 'Beans & legumes') matches lessons carrying that group tag verbatim;
--   the specific's parent group is guaranteed present in the same array (enforced
--   on save by refineMainIngredientParents; legacy rows healed by the Brief 5
--   owner-gated data fix), so NO expansion function is needed — unlike Cultural
--   Heritage. A SPECIFIC value (e.g. 'Black beans') matches lessons carrying that
--   specific. The clause is added in all THREE WHERE blocks (the C41 strict-AND
--   relax count, the total-count query, and the paginated page query) so the
--   relax decision, total_count, and the returned page stay mutually consistent.
--
-- SIGNATURE CHANGE → DROP + CREATE (not CREATE OR REPLACE)
--   Adding a parameter changes the external signature from 15-arg to 16-arg,
--   which is a NEW function identity — CREATE OR REPLACE would leave the old
--   15-arg overload in place ALONGSIDE the new one (PostgREST overload
--   ambiguity). So we DROP the 15-arg and CREATE the 16-arg. Both run inside ONE
--   explicit BEGIN/COMMIT: the Supabase CLI applies migration statements in
--   AUTOCOMMIT (no per-file transaction wrapper — see
--   20260629010000_c41_pr_d_two_pass_relax.sql:36-48), so without the guard the
--   DROP would commit on its own and leave a missing-function window before the
--   CREATE. The BEGIN/COMMIT makes DROP→CREATE atomic (gap-free).
--
-- SPLIT-DEPLOY NOTE (owner): the new param has DEFAULT NULL, so an OLD frontend
--   call (no filter_main_ingredients, named-arg RPC) still resolves to the new
--   16-arg function and behaves exactly as before. The only exposure is a user
--   actively selecting an ingredient in the gap between the Netlify deploy and
--   the PROD-migration approval → approve the migrate-production run promptly.
--
-- BODY IS THE 20260629010000 (C41 PR D) search_lessons VERBATIM with EXACTLY
--   two kinds of additions and nothing else: (1) the new param in the signature,
--   (2) the filter_main_ingredients `&&` clause in each of the three WHERE
--   blocks (placed right after the filter_activity_type clause). The two-pass
--   relax (cnt_and / K_relax), the F2 empty-tsquery guard, the trigram fallback,
--   the metadata reconstruction, the rank GREATEST(), and the ORDER BY are all
--   UNCHANGED.
--
-- DATA SAFETY: function definition ONLY — no table data read-modified-written,
--   no rows mutated, no schema/columns/RLS/indexes touched. `main_ingredients`
--   already exists on lessons (text[]). Verified LOCAL-first (supabase db reset +
--   npm run test:rls + MCP probes).
-- =====================================================

BEGIN;

-- Serialize against any concurrent search_lessons resolution during the swap; the
-- BEGIN/COMMIT already makes DROP→CREATE atomic, so this is defensive hygiene.
DROP FUNCTION IF EXISTS public.search_lessons(
  text, text[], text[], text[], text[], text[], text[], text[],
  text[], text[], text[], text[], integer, integer, text
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
  total_count  bigint
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
            -- C41: ts_rank consumes the tsquery directly; COALESCE keeps ts_rank(vector,
            -- NULL) → 0 safe for the empty-tsquery case (GATE-B — do NOT drop it).
            COALESCE(ts_rank(l.search_vector, expanded_tsquery), 0),
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
    CASE WHEN sort_key = 'modified'  THEN sub.updated_at END DESC NULLS LAST,
    sub.title ASC,
    sub.lesson_id ASC
  LIMIT page_size
  OFFSET page_offset;
END;
$$;

-- Re-issue GRANT for the NEW 16-arg signature (1×text + 12×text[] + 2×integer + 1×text).
GRANT EXECUTE ON FUNCTION public.search_lessons(text, text[], text[], text[], text[], text[], text[], text[], text[], text[], text[], text[], text[], integer, integer, text) TO anon, authenticated, service_role;

-- Reload PostgREST's schema cache so the redefined function is picked up immediately.
NOTIFY pgrst, 'reload schema';

COMMIT;

-- =====================================================
-- ROLLBACK (keep as comments)
-- =====================================================
-- Reverts to the 15-arg C41 PR D search_lessons (drops filter_main_ingredients).
-- Run inside BEGIN/COMMIT to stay gap-free:
--   BEGIN;
--   DROP FUNCTION IF EXISTS public.search_lessons(
--     text, text[], text[], text[], text[], text[], text[], text[],
--     text[], text[], text[], text[], text[], integer, integer, text);
--   -- then CREATE the 15-arg body verbatim from
--   -- 20260629010000_c41_pr_d_two_pass_relax.sql (no filter_main_ingredients param
--   -- or WHERE clause), re-GRANT the 15-arg signature, NOTIFY pgrst, COMMIT.
-- =====================================================
