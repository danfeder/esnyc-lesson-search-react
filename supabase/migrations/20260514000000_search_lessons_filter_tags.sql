-- =====================================================
-- Migration: 20260514000000_search_lessons_filter_tags.sql
-- =====================================================
-- Description:
--   PR 1 Task 1.4b — add `filter_tags text[] DEFAULT NULL` parameter to
--   `public.search_lessons` so the new sidebar "Lesson Type" tag filter can
--   actually filter results end-to-end. Closed enum is currently
--   {orientation, bilingual_handouts}; vocabulary is locked in canonical
--   Zod scaffold (Task 1.0) and enforced by a SQL CHECK in Task 1.6.
--
--   `lessons.tags` is empty in PROD/TEST today (Task 1.1 audit:
--   752 NULL + 20 empty + 0 populated = 772). Filter therefore matches
--   nothing today; activates when PR 2's submission-time LLM auto-tag
--   pipeline starts populating the column.
--
-- Why DROP+CREATE (not CREATE OR REPLACE):
--   Adding a parameter changes the function's identity; PostgreSQL's
--   `CREATE OR REPLACE FUNCTION` forbids signature changes. Same DROP+CREATE
--   pattern as the cooking_methods text→text[] change at
--   `20260505000000_filter_drift_pr1_column_based_search_lessons.sql:193-208`.
--
-- What's preserved verbatim from `20260512000000_drop_lesson_format.sql`:
--   - The full body of search_lessons (synonym expansion, cultural-heritage
--     alias-then-expand, count query, paginated result query, per-field
--     COALESCE metadata reconstruction, ORDER BY, pagination).
--   - `filter_lesson_format text DEFAULT NULL` compat-bridge parameter
--     (drops in Task 1.3a follow-up; do NOT remove here).
--   - All 12 existing filter clauses (grade_levels, themes, seasons,
--     competencies, cultures, location, activity_type via
--     `_alias_activity_type`, academic, sel, cooking_method via
--     `_match_cooking_methods`).
--
-- What's NEW vs `20260512000000`:
--   1. Signature appends `filter_tags text[] DEFAULT NULL` after
--      `filter_cooking_method` and before `page_size` — i.e., grouped with
--      the other filter params, before pagination params.
--   2. WHERE clause adds the standard array-overlap pattern in BOTH the
--      count query and the paginated result query:
--          AND (filter_tags IS NULL OR array_length(filter_tags, 1) IS NULL
--               OR l.tags && filter_tags)
--   3. GRANT EXECUTE re-issued with the new 15-arg type list (since
--      identity changed).
--   4. Final `NOTIFY pgrst, 'reload schema'` so PostgREST picks up the
--      new signature immediately.
--
-- =====================================================
-- DROP + CREATE search_lessons (signature change: +filter_tags text[])
-- =====================================================
-- Verbatim identity arguments captured from
-- `20260512000000_drop_lesson_format.sql:148-163`.
-- No CASCADE: nothing in this codebase calls search_lessons positionally.
-- If a future dependent appears between draft and apply, the DROP will fail
-- loudly (intended).
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
  filter_lesson_format   text    DEFAULT NULL,         -- compat bridge; drops in Task 1.3a
  filter_academic        text[]  DEFAULT NULL,
  filter_sel             text[]  DEFAULT NULL,
  filter_cooking_method  text[]  DEFAULT NULL,
  filter_tags            text[]  DEFAULT NULL,         -- NEW (Task 1.4b)
  page_size              integer DEFAULT 20,
  page_offset            integer DEFAULT 0
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
    AND (filter_location IS NULL OR array_length(filter_location, 1) IS NULL OR
         l.location_requirements && filter_location)
    AND (filter_activity_type IS NULL OR array_length(filter_activity_type, 1) IS NULL OR
         l.activity_type && _alias_activity_type(filter_activity_type))
    -- (filter_lesson_format WHERE clause removed — D3 lessonFormat field dropped.
    --  Parameter retained as a compat bridge; ignored by this body.)
    AND (filter_academic IS NULL OR array_length(filter_academic, 1) IS NULL OR
         l.academic_integration && filter_academic)
    AND (filter_sel IS NULL OR array_length(filter_sel, 1) IS NULL OR
         l.social_emotional_learning && filter_sel)
    AND (filter_cooking_method IS NULL OR array_length(filter_cooking_method, 1) IS NULL OR
         _match_cooking_methods(l.cooking_methods, filter_cooking_method))
    -- NEW (Task 1.4b): tag-overlap filter for the sidebar "Lesson Type"
    -- section. Closed enum {orientation, bilingual_handouts}; CHECK
    -- constraint installed in Task 1.6.
    AND (filter_tags IS NULL OR array_length(filter_tags, 1) IS NULL OR
         l.tags && filter_tags);

  -- Paginated result rows
  RETURN QUERY
  SELECT
    l.lesson_id,
    l.title,
    l.summary,
    l.file_link,
    l.grade_levels,
    -- Per-field COALESCE metadata reconstruction. Same as 20260512000000.
    --
    -- COLUMNS INCLUDED (post-D3):
    --   thematic_categories, season_timing, location_requirements,
    --   core_competencies, cultural_heritage, activity_type,
    --   cooking_methods, academic_integration, social_emotional_learning
    COALESCE(l.metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
      'thematicCategories',      CASE WHEN COALESCE(array_length(l.thematic_categories, 1), 0) > 0       THEN to_jsonb(l.thematic_categories)       END,
      'seasonTiming',            CASE WHEN COALESCE(array_length(l.season_timing, 1), 0) > 0             THEN to_jsonb(l.season_timing)             END,
      'locationRequirements',    CASE WHEN COALESCE(array_length(l.location_requirements, 1), 0) > 0     THEN to_jsonb(l.location_requirements)     END,
      'coreCompetencies',        CASE WHEN COALESCE(array_length(l.core_competencies, 1), 0) > 0         THEN to_jsonb(l.core_competencies)         END,
      'culturalHeritage',        CASE WHEN COALESCE(array_length(l.cultural_heritage, 1), 0) > 0         THEN to_jsonb(l.cultural_heritage)         END,
      -- 'lessonFormat' overlay key removed — D3.
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
    total_results
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
    AND (filter_location IS NULL OR array_length(filter_location, 1) IS NULL OR
         l.location_requirements && filter_location)
    AND (filter_activity_type IS NULL OR array_length(filter_activity_type, 1) IS NULL OR
         l.activity_type && _alias_activity_type(filter_activity_type))
    -- (filter_lesson_format WHERE clause removed — D3.)
    AND (filter_academic IS NULL OR array_length(filter_academic, 1) IS NULL OR
         l.academic_integration && filter_academic)
    AND (filter_sel IS NULL OR array_length(filter_sel, 1) IS NULL OR
         l.social_emotional_learning && filter_sel)
    AND (filter_cooking_method IS NULL OR array_length(filter_cooking_method, 1) IS NULL OR
         _match_cooking_methods(l.cooking_methods, filter_cooking_method))
    -- NEW (Task 1.4b): tag-overlap filter.
    AND (filter_tags IS NULL OR array_length(filter_tags, 1) IS NULL OR
         l.tags && filter_tags)
  ORDER BY
    rank DESC,
    COALESCE((l.confidence->>'overall')::float, 0) DESC,
    l.title ASC
  LIMIT page_size
  OFFSET page_offset;
END;
$$;


-- =====================================================
-- Re-issue GRANT (DROP discarded the old grant; CREATE creates a new
-- function identity which has no inherited grants).
-- =====================================================
GRANT EXECUTE ON FUNCTION public.search_lessons(
  text, text[], text[], text[], text[], text[], text[], text[], text, text[], text[], text[], text[], integer, integer
) TO anon, authenticated, service_role;


-- Force PostgREST to reload its schema cache so the new signature is picked
-- up immediately. Supabase will auto-reload eventually, but explicit is safer.
NOTIFY pgrst, 'reload schema';


-- =====================================================
-- ROLLBACK (kept as comments)
-- =====================================================
-- To revert: drop the new 15-arg function and re-apply
-- `20260512000000_drop_lesson_format.sql` Stage (2a) — that file's
-- CREATE OR REPLACE will then re-establish the prior 14-arg search_lessons
-- with its body byte-identical to pre-Task-1.4b state.
--
-- DROP FUNCTION IF EXISTS public.search_lessons(
--   text, text[], text[], text[], text[], text[], text[], text[],
--   text, text[], text[], text[], text[], integer, integer
-- );
-- -- Then re-run `20260512000000_drop_lesson_format.sql`.
-- NOTIFY pgrst, 'reload schema';
