-- =====================================================
-- Migration: 20260629000000_c41_and_of_ors_term_combination.sql
-- =====================================================
-- Wave 6 — Search Depth, C41 ("deeper G2 server-side OR→AND term combination").
-- Design: docs/plans/2026-06-29-wave6-search-depth-design.md §3 (the build) + §4
--         (SQL specifics, GATE-A F1/F2/F3). Impl: 2026-06-29-wave6-search-depth-
--         implementation.md PR B Task B.2.
--
-- WHAT CHANGES
--   Today expand_search_with_synonyms flattens every token + every synonym into one
--   flat OR string ("food | foods | waste | decay | decomposition | …") and feeds it
--   to to_tsquery. A multi-word query like "food waste decay" therefore matches any
--   lesson hitting ANY one token — broad tokens like "food" flood out the lessons that
--   actually cover all the ideas. C41 rebuilds the combination as an AND-of-ORs:
--       "food waste decay" → (food | foods) & (waste) & (decay | decomposition)
--   built with PostgreSQL tsquery algebra — NOT string concatenation:
--     * each lexeme via plainto_tsquery('english', token)  (GATE-A F1: injection-safe;
--       plainto_tsquery treats input as plain text, so synonym values carrying tsquery
--       operators & | ! ( ) : * < > cannot inject or mis-parse — the no-whitespace
--       CHECK on search_synonyms does NOT forbid those metachars);
--     * per-term OR-group built with the `||` (tsquery OR) operator;
--     * groups AND-ed with the `&&` (tsquery AND) operator;
--     * numnode() drops any group whose lexemes all normalized away (stop-word-only
--       term), and returns NULL when nothing meaningful survives (never an empty `()`
--       that would error to_tsquery).
--   Single-term input → one group → (term | synonyms): identical to today.
--
-- WHY DROP+CREATE (not CREATE OR REPLACE) for the expander
--   The expander's RETURN TYPE changes text → tsquery. PostgreSQL forbids changing a
--   function's return type via CREATE OR REPLACE, so it MUST be DROP FUNCTION + CREATE
--   FUNCTION. DROP discards the function's grants, so EXECUTE is re-GRANTed below
--   (mirrors 20260620000000_search_lessons_w1b.sql:124). The ONLY live runtime caller
--   of expand_search_with_synonyms is search_lessons (pre-flight caller-grep, Task
--   B.1) — every other reference is a historical migration definition, the generated
--   types file, docs, the rollback, or archive/. No edge function calls it. So the
--   return-type change is safe.
--
--   search_lessons is redefined too (CREATE OR REPLACE — its external 15-arg signature
--   and RETURNS TABLE are UNCHANGED, so no frontend change and no PGRST202 split-deploy
--   window). It now consumes the tsquery directly (no re-parse of a stringified
--   tsquery) and guards the FTS predicate for the empty/NULL-tsquery case (GATE-A F2):
--   a non-empty raw query that resolves to all stop words (e.g. "the of and") must not
--   error — the guard short-circuits the FTS branch to false and lets the existing
--   trigram fallback carry, exactly as today.
--
-- ATOMICITY: Supabase wraps each migration file in a single transaction, so the naked
--   DROP-then-CREATE of the expander has no missing-function window. Do NOT add explicit
--   BEGIN/COMMIT (conflicts with the runner's wrapper).
--
-- DATA SAFETY: function definitions ONLY — no table data is read-modified-written, no
--   rows mutated, no schema/columns/RLS touched. Verified LOCAL-first (supabase db
--   reset + npm run test:rls + MCP SQL probes). Rollback in the sibling
--   20260629000000_c41_and_of_ors_term_combination.sql.rollback.
-- =====================================================


-- =====================================================
-- 1. expand_search_with_synonyms — AND-of-ORs via tsquery algebra (return text → tsquery)
-- =====================================================
-- Return-type change forbids CREATE OR REPLACE → DROP + CREATE.
DROP FUNCTION IF EXISTS public.expand_search_with_synonyms(text);

CREATE FUNCTION public.expand_search_with_synonyms(query_text text)
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

        -- Drop stop-word-only groups (numnode = 0); AND the survivors. `&&` = tsquery AND.
        IF group_q IS NOT NULL AND numnode(group_q) > 0 THEN
            result_q := CASE WHEN result_q IS NULL THEN group_q ELSE result_q && group_q END;
        END IF;
    END LOOP;

    RETURN result_q;   -- NULL when nothing meaningful survived (all stop words / empty)
END;
$$;

-- Re-GRANT (DROP discarded the old grants). Mirrors w1b:124. The GRANT identity is by
-- ARGUMENT type — still (text) — even though the return type changed.
GRANT EXECUTE ON FUNCTION public.expand_search_with_synonyms(text) TO anon, authenticated, service_role;


-- =====================================================
-- 2. search_lessons — consume the tsquery directly + empty-tsquery guard
-- =====================================================
-- CREATE OR REPLACE: the external 15-arg signature + RETURNS TABLE are UNCHANGED.
-- Body copied VERBATIM from 20260622010000_wave4_pr2_delete_ghosts_search_rpc.sql:159-344
-- with EXACTLY four surgical edits and nothing else:
--   1. DECLARE: `expanded_query text;` → `expanded_tsquery tsquery;`
--   2. The expander assignment (+ its ELSE NULL branch) targets expanded_tsquery.
--   3. BOTH FTS WHERE branches (count + results) guard for the empty/NULL tsquery:
--        l.search_vector @@ to_tsquery('english', expanded_query)
--      → (expanded_tsquery IS NOT NULL AND numnode(expanded_tsquery) > 0
--           AND l.search_vector @@ expanded_tsquery)
--      (the raw-text browse short-circuit + the trigram cushion stay verbatim).
--   4. The rank: ts_rank(l.search_vector, to_tsquery('english', expanded_query))
--      → ts_rank(l.search_vector, expanded_tsquery)  (the surrounding COALESCE(...,0)
--      is PRESERVED — it makes ts_rank(vector, NULL) safe for the empty-tsquery case).
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
-- CREATE OR REPLACE preserves grants, but re-issuing is explicit + matches the
-- wave4_pr2 convention.
GRANT EXECUTE ON FUNCTION public.search_lessons(text, text[], text[], text[], text[], text[], text[], text[], text[], text[], text[], text[], integer, integer, text) TO anon, authenticated, service_role;


-- Reload PostgREST's schema cache so the redefined functions are picked up immediately.
NOTIFY pgrst, 'reload schema';


-- =====================================================
-- ROLLBACK (executable restore is in the sibling
--   20260629000000_c41_and_of_ors_term_combination.sql.rollback)
-- =====================================================
-- Restores the prior text-returning expand_search_with_synonyms (w1b body) and the
-- prior to_tsquery-based search_lessons (wave4_pr2 body), re-GRANTs both, NOTIFY pgrst.
-- No data side effects (function definitions only).
