-- =====================================================
-- Migration: 20260629010000_c41_pr_d_two_pass_relax.sql
-- =====================================================
-- Wave 6 — Search Depth, C41 PR D ("two-pass relax" safety net).
-- Design: docs/plans/2026-06-29-wave6-search-depth-design.md §3 (the design
--   pre-authorizes this eval-triggered fallback) + §7 (PR D row). Execution spec:
--   2026-06-29-wave6-search-depth-execution-status.md "PR D DESIGN" block.
-- Builds directly on top of migration 1
--   (20260629000000_c41_and_of_ors_term_combination.sql, the strict-AND-of-ORs change).
--
-- WHAT CHANGES
--   Migration 1's strict AND-of-ORs can leave a near-empty result set when the user's
--   terms do not all co-occur (the measured eval recall cliff: "teamwork and cooperation"
--   → 0 results). PR D adds a SECOND, looser expander and a per-query relax decision:
--     * NEW public.expand_search_with_synonyms_or(text) RETURNS tsquery — the OR-of-ORs
--       companion. Identical per-group synonym logic to migration 1's strict-AND expander,
--       but the surviving groups are OR-combined (||) instead of AND-combined (&&). This
--       reproduces the pre-C41 flat-OR behavior (every token / synonym OR'd together).
--     * search_lessons gains a two-pass relax: it counts the strict-AND result set (with
--       the user's active filters); if that count is below K_relax it swaps the effective
--       tsquery to the loose-OR companion for the rest of the function (total count + page
--       + rank). Per-query it is all-AND OR all-OR — never a mix — so total_count and
--       pagination stay internally consistent. Deliberate recall-over-precision for
--       otherwise-near-empty queries.
--
-- ADDITIVE + GAP-FREE
--   This migration uses CREATE OR REPLACE ONLY — there is NO DROP/CREATE anywhere:
--     * the OR companion is a brand-new function name, so CREATE OR REPLACE simply
--       creates it (idempotent on re-run);
--     * search_lessons keeps its 15-arg external signature + RETURNS TABLE unchanged, so
--       CREATE OR REPLACE suffices (no return-type change, no frontend change, no PGRST202
--       split-deploy window).
--   Because nothing is dropped, there is NO missing-function window even for a fraction of
--   a statement — the migration is gap-free by construction.
--
-- CORRECTION TO MIGRATION 1's ATOMICITY COMMENT
--   Migration 1 (20260629000000_*:46-48) claims "Supabase wraps each migration file in a
--   single transaction, so the naked DROP-then-CREATE of the expander has no
--   missing-function window." That claim is FALSE: the Supabase CLI applies migration
--   statements in AUTOCOMMIT (extended protocol) — there is NO per-file transaction
--   wrapper. The authoritative in-repo source is
--   supabase/migrations/20260625000000_c02_retag_apply.sql:59-63, where c02 had to add its
--   OWN explicit BEGIN/COMMIT precisely because the CLI does not wrap a migration file in a
--   transaction. Migration 1's DROP-then-CREATE of the expander therefore did have a
--   (here-negligible, ~3-user internal site) missing-function window between the DROP and
--   the CREATE. Migration 1's .sql is already pushed + applied to TEST and must NOT be
--   edited (database-migrations skill). PR D's mig 2 avoids the issue STRUCTURALLY: it
--   drops nothing, so the question of a transaction wrapper does not arise.
--
-- DATA SAFETY: function definitions ONLY — no table data is read-modified-written, no rows
--   mutated, no schema / columns / RLS / indexes touched. Verified LOCAL-first (supabase db
--   reset + npm run test:rls + MCP SQL probes). Rollback restores the migration-1 strict-AND
--   state — see the sibling 20260629010000_c41_pr_d_two_pass_relax.sql.rollback.
-- =====================================================


-- =====================================================
-- 1. expand_search_with_synonyms_or — OR-of-ORs companion (the loose-OR fallback)
-- =====================================================
-- Brand-new function name → CREATE OR REPLACE is gap-free + idempotent on re-run (no DROP).
-- Body is migration 1's strict-AND expander VERBATIM (20260629000000_*:63-136) with ONLY
-- three changes:
--   (a) function name expand_search_with_synonyms → expand_search_with_synonyms_or;
--   (b) the group-combine operator && (tsquery AND) → || (tsquery OR), so surviving groups
--       are OR-combined — this reproduces the pre-C41 flat-OR (every token / synonym OR'd);
--   (c) the AND-of-ORs comments → OR-of-ORs comments.
-- Everything else is identical: same operator-strip regex, same synonym-lookup branching,
-- same per-group || OR-building, same numnode(group_q) > 0 drop of stop-word-only groups,
-- same RETURN result_q (NULL when nothing survives).
CREATE OR REPLACE FUNCTION public.expand_search_with_synonyms_or(query_text text)
RETURNS tsquery
LANGUAGE plpgsql
STABLE                                    -- deliberate (design §3): reads search_synonyms,
                                          -- deterministic within a statement. Original was
                                          -- unmarked (=VOLATILE); STABLE is the safe tightening.
AS $$
DECLARE
    words          TEXT[];
    word           TEXT;
    group_words    TEXT[];
    gw             TEXT;
    synonym_record RECORD;
    group_q        tsquery;
    result_q       tsquery := NULL;
BEGIN
    -- Handle empty query
    IF query_text IS NULL OR query_text = '' THEN
        RETURN NULL;
    END IF;

    -- VERBATIM from w1b (20260620000000:83-85): strip tsquery operators + quotes to
    -- spaces BEFORE splitting, so a mid-word operator/quote (e.g. the apostrophe in
    -- "mother's") becomes a token separator instead of an internal space; split on ANY
    -- whitespace run. Empty tokens are skipped by the CONTINUE guard below.
    words := regexp_split_to_array(
               regexp_replace(lower(trim(query_text)), '[&|!():*<>''"]', ' ', 'g'),
               '\s+');

    FOREACH word IN ARRAY words LOOP
        -- Skip empty words (consecutive separators / stripped-to-empty tokens)
        CONTINUE WHEN word = '';

        -- Per-term group = the word + its synonyms. Synonym-lookup branching is VERBATIM
        -- from w1b (20260620000000:94-112), changed ONLY to accumulate into the per-term
        -- `group_words` array instead of a single global `expanded_words` array.
        group_words := ARRAY[word];
        FOR synonym_record IN
            SELECT * FROM search_synonyms
            WHERE (lower(term) = word AND synonym_type IN ('bidirectional', 'oneway', 'typo_correction'))
               OR (word = ANY(array(SELECT lower(unnest(synonyms)))) AND synonym_type = 'bidirectional')
        LOOP
            IF synonym_record.synonym_type = 'bidirectional' THEN
                -- Add all synonyms and the term
                group_words := group_words || array(SELECT lower(unnest(synonym_record.synonyms)));
                IF lower(synonym_record.term) != word THEN
                    group_words := array_append(group_words, lower(synonym_record.term));
                END IF;
            ELSIF synonym_record.synonym_type IN ('oneway', 'typo_correction') THEN
                -- Only add synonyms if term matches
                IF lower(synonym_record.term) = word THEN
                    group_words := group_words || array(SELECT lower(unnest(synonym_record.synonyms)));
                END IF;
            END IF;
        END LOOP;

        -- Build the group's OR-tsquery from DISTINCT non-empty lexemes. plainto_tsquery
        -- = injection-safe single lexeme (or '' for a stop word). `||` = tsquery OR.
        group_q := NULL;
        FOR gw IN SELECT DISTINCT u FROM unnest(group_words) AS u WHERE u <> '' LOOP
            group_q := CASE WHEN group_q IS NULL
                            THEN plainto_tsquery('english', gw)
                            ELSE group_q || plainto_tsquery('english', gw) END;
        END LOOP;

        -- Drop stop-word-only groups (numnode = 0); OR the survivors. `||` = tsquery OR.
        -- PR D: this is the ONLY change vs migration 1's strict-AND expander — the
        -- cross-group combine is || (OR), not && (AND). OR-of-ORs = the loose flat-OR that
        -- reproduces the pre-C41 behavior.
        IF group_q IS NOT NULL AND numnode(group_q) > 0 THEN
            result_q := CASE WHEN result_q IS NULL THEN group_q ELSE result_q || group_q END;
        END IF;
    END LOOP;

    RETURN result_q;   -- NULL when nothing meaningful survived (all stop words / empty)
END;
$$;

GRANT EXECUTE ON FUNCTION public.expand_search_with_synonyms_or(text) TO anon, authenticated, service_role;


-- =====================================================
-- 2. search_lessons — two-pass relax (strict-AND first, loose-OR fallback when near-empty)
-- =====================================================
-- CREATE OR REPLACE: the external 15-arg signature + RETURNS TABLE are UNCHANGED.
-- Body is migration 1's search_lessons (20260629000000_*:159-350) VERBATIM with EXACTLY
-- these additions and nothing else:
--   1. DECLARE: add `cnt_and bigint;` and `K_relax constant int := 10;`.
--   2. After the cultural-heritage expansion and BEFORE the total-count query, a relax
--      block: count the strict-AND result set (WHERE predicate-identical to the existing
--      total-count + page WHEREs); if cnt_and < K_relax, reassign expanded_tsquery to the
--      loose-OR companion.
-- The existing total-count query, the paginated RETURN QUERY, the rank GREATEST(...),
-- the ORDER BY, and ALL filter clauses are UNCHANGED — they reference expanded_tsquery,
-- which by then is possibly the OR form. The F2 empty-tsquery guard, the trigram fallback,
-- and the COALESCE around ts_rank are all left intact.
CREATE OR REPLACE FUNCTION public.search_lessons(
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
  order_by               text    DEFAULT 'relevance'   -- C58: relevance | title | modified
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


-- Re-issue GRANT verbatim (15-arg type list: 1×text + 11×text[] + 2×integer + 1×text).
-- CREATE OR REPLACE preserves grants, but re-issuing is explicit + matches the convention.
GRANT EXECUTE ON FUNCTION public.search_lessons(text, text[], text[], text[], text[], text[], text[], text[], text[], text[], text[], text[], integer, integer, text) TO anon, authenticated, service_role;


-- Reload PostgREST's schema cache so the redefined functions are picked up immediately.
NOTIFY pgrst, 'reload schema';


-- =====================================================
-- ROLLBACK (executable restore is in the sibling
--   20260629010000_c41_pr_d_two_pass_relax.sql.rollback)
-- =====================================================
-- Reverts PR D to the migration-1 strict-AND state: DROP the OR companion, CREATE OR
-- REPLACE search_lessons back to migration 1's strict-AND body (no relax block,
-- no cnt_and/K_relax), re-GRANT, NOTIFY pgrst. No data side effects (function defs only).
-- NOTE: this reverts to migration 1's strict-AND, NOT to the pre-C41 flat-OR — that
-- deeper revert is migration 1's own .sql.rollback.
