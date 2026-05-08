-- =====================================================
-- Migration: 20260520020000_search_lessons_filter_retired.sql
-- =====================================================
-- Description:
--   PR 4 follow-up — add `AND l.retired_at IS NULL` to the WHERE clauses of
--   `public.search_lessons` so soft-retired imports (added by sibling migration
--   `20260520000000_corpus_cleanup_retire_imports.sql`) are excluded from
--   user-facing search results.
--
--   This is the SQL surface in PR 4's per-consumer-filter approach for
--   soft-retirement. Companion edits to the other 7 consumer surfaces
--   (smart-search, search-lessons, useLessonStats, LessonSearchPicker,
--   process-submission, generate-embeddings, regenerate-all-embeddings)
--   land as TS edits in the same PR cycle.
--
--   `lessons_with_metadata` view is intentionally NOT changed: detect-duplicates
--   + ReviewDetail similar-lessons + ReviewDashboard queue badges + the
--   `get_lesson_details_for_review` RPC all read from `lessons` (or the view)
--   and need to keep seeing retired rows so reviewers catch a future
--   re-submission of a retired import. Per-consumer filter preserves that
--   asymmetry; baking the filter into the view would not.
--
-- Why CREATE OR REPLACE (not DROP+CREATE):
--   Body-only change. The 15-argument signature established at
--   `20260514000000_search_lessons_filter_tags.sql:72-88` is preserved exactly.
--   No GRANT re-issue needed — CREATE OR REPLACE preserves the existing
--   grants on the same function identity.
--
-- What's NEW vs `20260514000000`:
--   In BOTH the count query and the paginated result query, append:
--       AND l.retired_at IS NULL
--   immediately after the `filter_tags` overlap clause.
--
-- =====================================================
-- CREATE OR REPLACE search_lessons (body-only change: +retired_at filter)
-- =====================================================
CREATE OR REPLACE FUNCTION public.search_lessons(
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
  filter_tags            text[]  DEFAULT NULL,
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
    AND (filter_tags IS NULL OR array_length(filter_tags, 1) IS NULL OR
         l.tags && filter_tags)
    -- NEW (PR 4): exclude soft-retired imports from user-facing search.
    AND l.retired_at IS NULL;

  -- Paginated result rows
  RETURN QUERY
  SELECT
    l.lesson_id,
    l.title,
    l.summary,
    l.file_link,
    l.grade_levels,
    -- Per-field COALESCE metadata reconstruction. Same as 20260514000000.
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
    AND (filter_tags IS NULL OR array_length(filter_tags, 1) IS NULL OR
         l.tags && filter_tags)
    -- NEW (PR 4): exclude soft-retired imports from user-facing search.
    AND l.retired_at IS NULL
  ORDER BY
    rank DESC,
    COALESCE((l.confidence->>'overall')::float, 0) DESC,
    l.title ASC
  LIMIT page_size
  OFFSET page_offset;
END;
$$;


-- Force PostgREST to reload its schema cache so the new body is picked up
-- immediately. Body-only changes don't strictly require this, but explicit is
-- safer and matches the precedent set by `20260514000000`.
NOTIFY pgrst, 'reload schema';


-- =====================================================
-- VERIFICATION (informational)
-- =====================================================
-- Expected post-apply behavior:
--   SELECT count(*) FROM (SELECT * FROM search_lessons() LIMIT 1000) sub;  -- 767 (live)
--   -- vs raw `lessons` row count 788 (live + 21 retired)
--   --
--   SELECT * FROM search_lessons('Stone Soup');  -- returns ZERO rows (Stone Soup retired)
--   --
--   SELECT * FROM search_lessons('Plant');  -- returns no PFLP/FoodCorps imports

-- =====================================================
-- ROLLBACK (kept as comments)
-- =====================================================
-- To revert: re-apply `20260514000000_search_lessons_filter_tags.sql` Stage
-- (CREATE) — that file's CREATE will re-establish the prior body byte-identical
-- to pre-PR-4 state. CREATE OR REPLACE on the same signature is the
-- mechanism; no DROP needed.
--
--   -- Re-run the CREATE block from `20260514000000_search_lessons_filter_tags.sql`
--   -- (preserves the same signature; body reverts to without the retired_at filter).
--   NOTIFY pgrst, 'reload schema';
