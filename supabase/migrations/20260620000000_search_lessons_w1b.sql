-- =====================================================
-- Migration: 20260620000000_search_lessons_w1b.sql
-- =====================================================
-- Theme B — Wave 1b ("W1b-search-rpc"). Rebuilds the public search path.
-- Design: docs/plans/2026-06-20-theme-b-public-ux-design.md §4 Q1–Q5 (LOCKED),
--         §6 (migration shape). Spec: 2026-06-20-theme-b-public-ux-implementation.md
--         Task 3.1.
--
-- Four fixes, in order:
--   1. C136 — `expand_search_with_synonyms` crashes when the query contains
--      tsquery operators (`&`, `|`, `(`, `)`, `:`, `*`, `<`, `>`) or quotes;
--      to_tsquery() raises and the whole RPC 500s. Fix: strip those chars to
--      spaces BEFORE splitting into words, so a mid-word operator (e.g. the
--      apostrophe in "mother's") becomes a token separator instead of leaving
--      an internal space that would make to_tsquery raise. CREATE OR REPLACE
--      (no signature change); the function is public — its grants are preserved
--      by replace and re-issued below for explicitness.
--   2. location-Both — new IMMUTABLE `_match_location` helper mirroring
--      `_match_cooking_methods`. Selecting Indoor/Outdoor now also matches
--      `Both`-tagged lessons; selecting Both matches only Both (locked
--      semantics, design §4 Q4).
--   3. C58 — real server-side sort via a new `order_by text DEFAULT 'relevance'`
--      param (relevance / title / modified only; grade/confidence/unknown/NULL
--      all collapse to relevance). The param changes the signature 15→16, so
--      this is a DROP + CREATE (CREATE OR REPLACE cannot change a signature),
--      following the `20260514000000` precedent.
--   4. C11 — exclude the 3 exact "Unknown" ghost lesson_ids from both the count
--      and result WHERE; append `lesson_id ASC` as a deterministic tiebreaker so
--      empty-query browse order is stable run-to-run (this only HIDES them from
--      search — no deletion; that is a separate Wave-4 data task).
--
-- C84 (tags exposure) is intentionally DEFERRED out of W1b (design §4 Q5):
--   RETURNS TABLE is UNCHANGED; no `tags` column is added. The tags *filter*
--   keeps working (`l.tags && filter_tags`).
--
-- Atomicity: Supabase wraps each migration file in a single transaction, so the
--   naked DROP-then-CREATE has no missing-function window. Do NOT add explicit
--   BEGIN/COMMIT (conflicts with the runner's wrapper).
--
-- DATA SAFETY: this is the single hottest public RPC. No data is mutated here —
--   only function definitions. Verified LOCAL-first.
-- =====================================================


-- =====================================================
-- 1. C136 — sanitize tsquery operators + quotes inside expand_search_with_synonyms
-- =====================================================
-- Body is the production baseline (20251001:161-212) verbatim, except the split
-- step now strips tsquery operators AND quotes to spaces BEFORE splitting into
-- words. The char class (`'` is doubled to `''` inside this SQL literal) maps
-- every operator/quote — at a word boundary ("herbs & spices") OR embedded
-- mid-word ("mother's", "herbs&spices") — to a token separator, so every token
-- is a single lexeme and the ` | `-joined result is always a valid to_tsquery()
-- input. (Stripping per-word and replacing with a space, as a first cut did,
-- left "mother's" as the two-lexeme string "mother s" → to_tsquery syntax
-- error.) Stripping `*` intentionally disables tsquery prefix syntax — public
-- input is plain text, not tsquery. The WHERE's trigram fallback (`l.title % q`)
-- still matches the raw string, so no recall is lost.
CREATE OR REPLACE FUNCTION public.expand_search_with_synonyms(query_text text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
    words TEXT[];
    expanded_words TEXT[] := '{}';
    word TEXT;
    synonym_record RECORD;
    final_query TEXT;
BEGIN
    -- Handle empty query
    IF query_text IS NULL OR query_text = '' THEN
        RETURN NULL;
    END IF;

    -- C136: strip tsquery operators and quotes to spaces BEFORE splitting, so a
    -- mid-word operator/quote (e.g. the apostrophe in "mother's") becomes a token
    -- separator instead of an internal space that would make to_tsquery() raise.
    -- Split on ANY whitespace run (regexp_split_to_array '\s+', not just ' ') so a
    -- pasted tab/newline/CR also separates tokens rather than surviving inside one
    -- (a stray tab would otherwise yield a two-lexeme tsquery token -> syntax
    -- error). Empty tokens from leading/trailing/repeated separators are skipped
    -- by the CONTINUE guard below.
    words := regexp_split_to_array(
               regexp_replace(lower(trim(query_text)), '[&|!():*<>''"]', ' ', 'g'),
               '\s+');

    FOREACH word IN ARRAY words LOOP
        -- Skip empty words (consecutive separators / stripped-to-empty tokens)
        CONTINUE WHEN word = '';

        -- Add original word
        expanded_words := array_append(expanded_words, word);

        -- Find synonyms
        FOR synonym_record IN
            SELECT * FROM search_synonyms
            WHERE (lower(term) = word AND synonym_type IN ('bidirectional', 'oneway', 'typo_correction'))
               OR (word = ANY(array(SELECT lower(unnest(synonyms)))) AND synonym_type = 'bidirectional')
        LOOP
            IF synonym_record.synonym_type = 'bidirectional' THEN
                -- Add all synonyms and the term
                expanded_words := expanded_words || array(SELECT lower(unnest(synonym_record.synonyms)));
                IF lower(synonym_record.term) != word THEN
                    expanded_words := array_append(expanded_words, lower(synonym_record.term));
                END IF;
            ELSIF synonym_record.synonym_type IN ('oneway', 'typo_correction') THEN
                -- Only add synonyms if term matches
                IF lower(synonym_record.term) = word THEN
                    expanded_words := expanded_words || array(SELECT lower(unnest(synonym_record.synonyms)));
                END IF;
            END IF;
        END LOOP;
    END LOOP;

    -- Remove duplicates and create OR query
    SELECT string_agg(DISTINCT unnest, ' | ') INTO final_query FROM unnest(expanded_words);

    RETURN final_query;
END;
$$;

-- Re-issue grants explicitly (CREATE OR REPLACE preserves them, but be explicit;
-- mirrors the baseline grants at 20251001:3302-3304).
GRANT EXECUTE ON FUNCTION public.expand_search_with_synonyms(text) TO anon, authenticated, service_role;


-- =====================================================
-- 2. location-Both — new IMMUTABLE _match_location helper
-- =====================================================
-- Mirrors _match_cooking_methods (20260505000000:159-183) exactly. Expands the
-- FILTER side: Indoor→{indoor,both}, Outdoor→{outdoor,both}, Both→{both}, else
-- verbatim lowercase. EXISTS-overlap of the lesson's lowercased locations against
-- the expanded set. NOTE: like _match_cooking_methods, an empty/NULL filter makes
-- this return FALSE (no match), not match-all; the caller supplies match-all via
-- its guard (`filter_location IS NULL OR array_length(...) IS NULL OR ...`) so
-- this helper is never reached with an empty filter from search_lessons.
CREATE OR REPLACE FUNCTION public._match_location(p_l_locations text[], p_filter_locations text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE PARALLEL SAFE
AS $$
  WITH expanded_filter AS (
    SELECT DISTINCT v
    FROM unnest(coalesce(p_filter_locations, ARRAY[]::text[])) x,
    LATERAL (
      SELECT unnest(
        CASE lower(x)
          WHEN 'indoor'  THEN ARRAY['indoor', 'both']
          WHEN 'outdoor' THEN ARRAY['outdoor', 'both']
          WHEN 'both'    THEN ARRAY['both']
          ELSE ARRAY[lower(x)]
        END
      ) AS v
    ) e
  )
  SELECT EXISTS (
    SELECT 1
    FROM unnest(coalesce(p_l_locations, ARRAY[]::text[])) c
    WHERE lower(c) = ANY(SELECT v FROM expanded_filter)
  );
$$;

GRANT EXECUTE ON FUNCTION public._match_location(text[], text[]) TO anon, authenticated, service_role;


-- =====================================================
-- 3 + 4. C58 (order_by) + C11 (ghost exclusion) — DROP + CREATE search_lessons
-- =====================================================
-- Verbatim 15-arg identity signature confirmed via
-- pg_get_function_identity_arguments (TEST 2026-06-20; LOCAL 2026-06-20):
--   text, text[], text[], text[], text[], text[], text[], text[], text,
--   text[], text[], text[], text[], integer, integer
-- No CASCADE: nothing calls search_lessons positionally; a future dependent
-- would make the DROP fail loudly (intended).
DROP FUNCTION IF EXISTS public.search_lessons(
  search_query           text,
  filter_grade_levels    text[],
  filter_themes          text[],
  filter_seasons         text[],
  filter_competencies    text[],
  filter_cultures        text[],
  filter_location        text[],
  filter_activity_type   text[],
  filter_lesson_format   text,
  filter_academic        text[],
  filter_sel             text[],
  filter_cooking_method  text[],
  filter_tags            text[],
  page_size              integer,
  page_offset            integer
);


CREATE FUNCTION public.search_lessons(
  search_query           text    DEFAULT NULL,
  filter_grade_levels    text[]  DEFAULT NULL,
  filter_themes          text[]  DEFAULT NULL,
  filter_seasons         text[]  DEFAULT NULL,
  filter_competencies    text[]  DEFAULT NULL,
  filter_cultures        text[]  DEFAULT NULL,
  filter_location        text[]  DEFAULT NULL,
  filter_activity_type   text[]  DEFAULT NULL,
  filter_lesson_format   text    DEFAULT NULL,         -- compat bridge; drops in Task 1.3a (kept as-is)
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
    AND l.retired_at IS NULL
    -- C11: exclude the 3 exact "Unknown" ghost rows
    AND l.lesson_id <> ALL (ARRAY[
      '1l9KH63QBe2xhyH0zp6VIavtj0uKSRZtd',
      '1lDjv2GUFzOC9pSWTpCVQW2ctWvvNmTPP4Jc1iAzrsaU',
      '1nFbpkwlujk8fIO8RkeIcDoO2fuO83Iil2Srf8t5iqm8'
    ]::text[]);

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
      -- C11: exclude the 3 exact "Unknown" ghost rows
      AND l.lesson_id <> ALL (ARRAY[
        '1l9KH63QBe2xhyH0zp6VIavtj0uKSRZtd',
        '1lDjv2GUFzOC9pSWTpCVQW2ctWvvNmTPP4Jc1iAzrsaU',
        '1nFbpkwlujk8fIO8RkeIcDoO2fuO83Iil2Srf8t5iqm8'
      ]::text[])
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
-- identity with no inherited grants). Mirrors 20260514000000:245 + service_role.
GRANT EXECUTE ON FUNCTION public.search_lessons(
  text, text[], text[], text[], text[], text[], text[], text[], text,
  text[], text[], text[], text[], integer, integer, text
) TO anon, authenticated, service_role;


-- Force PostgREST to reload its schema cache so the new 16-arg signature is
-- picked up immediately.
NOTIFY pgrst, 'reload schema';


-- =====================================================
-- ROLLBACK (kept as comments)
-- =====================================================
-- To fully revert this migration:
--
-- 1. Drop the new 16-arg search_lessons.
-- DROP FUNCTION IF EXISTS public.search_lessons(
--   text, text[], text[], text[], text[], text[], text[], text[], text,
--   text[], text[], text[], text[], integer, integer, text
-- );
--
-- 2. Re-apply the prior 15-arg search_lessons body from
--    20260520020000_search_lessons_filter_retired.sql (re-run its CREATE OR
--    REPLACE block verbatim, then re-GRANT EXECUTE with the 15-arg type list:
--    text, text[], text[], text[], text[], text[], text[], text[], text,
--    text[], text[], text[], text[], integer, integer
--    TO anon, authenticated, service_role).
--
-- 3. Restore the baseline expand_search_with_synonyms body from
--    20251001_production_baseline_snapshot.sql:161-212 (re-run its CREATE OR
--    REPLACE block verbatim — i.e. without the C136 sanitize line).
--
-- 4. Drop the location helper.
-- DROP FUNCTION IF EXISTS public._match_location(text[], text[]);
--
-- NOTIFY pgrst, 'reload schema';
