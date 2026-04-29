-- =====================================================
-- Migration: 20260505000000_filter_drift_pr1_column_based_search_lessons.sql
-- =====================================================
-- Description:
--   Filter Metadata Drift Repair, PR-1 — Column-based search_lessons + alias tolerance.
--
--   Rewrites the search_lessons RPC to filter on the normalized text/text[]
--   columns instead of JSONB metadata paths. Result rows now have metadata
--   reconstructed per-field from the columns via COALESCE overlay so frontend
--   facet counts can't drift from RPC behavior. Adds four alias helpers
--   (_alias_lesson_format / _alias_activity_type / _alias_cultural_heritage
--   / _match_cooking_methods) so the UI's drift-era vocabulary still matches
--   the corpus's mixed-vocabulary values until PR-3 (deferred) canonicalizes.
--
--   Signature change: filter_cooking_method text -> text[]. Postgres can't
--   CREATE OR REPLACE across signature changes, so this migration DROPs and
--   CREATEs. No CASCADE: pg_depend probe (TEST DB, 2026-04-29) returned no
--   dependents.
--
--   Defensive only: widens matches, never narrows. No data side effects.
--   The PR-1 alias helpers stay in the database indefinitely (PR-3 was
--   deferred 2026-04-29; their "remove in PR-3" semantics no longer apply).
--
-- Design reference: docs/plans/2026-04-28-filter-metadata-drift-repair-design.md
--   §3 — partial metadata reconstruction contract (per-field COALESCE rationale)
--   §4 — PR-1 scope, filter mapping table, alias-tolerance details
--
-- Implementation reference:
--   docs/plans/2026-04-28-filter-metadata-drift-repair-implementation.md
--   Task 1.2 — including academicConcepts rescue clause (preserves the 690
--   rows of rich metadata.academicIntegration.concepts data; Session 0c found
--   the bare design-doc snippet would have destroyed it).
-- =====================================================


-- =====================================================
-- HELPER FUNCTIONS (alias tolerance — transitional in concept,
-- but PR-3 was deferred 2026-04-29 so these stay indefinitely)
-- =====================================================

-- _alias_lesson_format(p_value text) -> text[]
-- UI sends slug values from filterDefinitions.ts:lessonFormat. Corpus has
-- mixed Title-Case-with-spaces (471 'Single period', 150 'Standalone', etc.)
-- and a few stragglers (63 'standalone' lowercase, 1 array-shape outlier).
-- This helper expands a slug input to slug + Title-Case so column equality
-- matches both. Unknown inputs pass through.
CREATE OR REPLACE FUNCTION public._alias_lesson_format(p_value text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE PARALLEL SAFE
AS $$
  SELECT CASE p_value
    WHEN 'standalone'        THEN ARRAY['standalone', 'Standalone']
    WHEN 'multi-session'     THEN ARRAY['multi-session', 'Multi-session unit']
    WHEN 'double-period'     THEN ARRAY['double-period', 'Double period']
    WHEN 'single-period'     THEN ARRAY['single-period', 'Single period']
    WHEN 'co-taught'         THEN ARRAY['co-taught', 'Co-taught']
    WHEN 'remote-virtual'    THEN ARRAY['remote-virtual', 'Remote/virtual adapted']
    WHEN 'mobile-education'  THEN ARRAY['mobile-education', 'Mobile education format']
    ELSE ARRAY[p_value]
  END;
$$;

GRANT EXECUTE ON FUNCTION public._alias_lesson_format(text) TO anon, authenticated, service_role;


-- _alias_activity_type(p_values text[]) -> text[]
-- UI sends '-only'-suffixed slugs ('cooking-only', 'garden-only',
-- 'academic-only') from filterDefinitions.ts:activityType. Corpus has bare
-- nouns ('cooking' 293, 'garden' 275, 'academic' 57, 'both' 133). Expand
-- each '-only' input to slug + bare noun. ('both' has no UI/DB mismatch.)
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
          ELSE ARRAY[x]
        END
      ) AS v
    ) AS expanded
  );
$$;

GRANT EXECUTE ON FUNCTION public._alias_activity_type(text[]) TO anon, authenticated, service_role;


-- _alias_cultural_heritage(p_values text[]) -> text[]
-- UI sends slug values from filterDefinitions.ts:culturalHeritage. Corpus is
-- mostly Title-Case-with-spaces, plus stragglers in slug form (e.g. 13
-- 'north-american' rows, 4 'latin-american'). The cultural_heritage_hierarchy
-- table is keyed on Title-Case parents only (verified 2026-04-29:
-- expand_cultural_heritage(['asian']) returns ['asian'] alone, while
-- expand_cultural_heritage(['Asian']) returns the 8 children + 'Asian').
-- So this alias must run BEFORE expand_cultural_heritage to inject the
-- Title-Case parent that the hierarchy table actually knows.
CREATE OR REPLACE FUNCTION public._alias_cultural_heritage(p_values text[])
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
          -- Top-level
          WHEN 'asian'             THEN ARRAY['asian', 'Asian']
          WHEN 'americas'          THEN ARRAY['americas', 'Americas']
          WHEN 'african'           THEN ARRAY['african', 'African']
          WHEN 'european'          THEN ARRAY['european', 'European']
          WHEN 'middle-eastern'    THEN ARRAY['middle-eastern', 'Middle Eastern']
          -- Asian children
          WHEN 'east-asian'        THEN ARRAY['east-asian', 'East Asian']
          WHEN 'southeast-asian'   THEN ARRAY['southeast-asian', 'Southeast Asian']
          WHEN 'south-asian'       THEN ARRAY['south-asian', 'South Asian']
          WHEN 'central-asian'     THEN ARRAY['central-asian', 'Central Asian']
          -- Americas children
          WHEN 'latin-american'    THEN ARRAY['latin-american', 'Latin American']
          WHEN 'caribbean'         THEN ARRAY['caribbean', 'Caribbean']
          WHEN 'north-american'    THEN ARRAY['north-american', 'North American']
          -- African children
          WHEN 'west-african'      THEN ARRAY['west-african', 'West African']
          WHEN 'ethiopian'         THEN ARRAY['ethiopian', 'Ethiopian']
          WHEN 'nigerian'          THEN ARRAY['nigerian', 'Nigerian']
          -- European children
          WHEN 'eastern-european'  THEN ARRAY['eastern-european', 'Eastern European']
          WHEN 'mediterranean'     THEN ARRAY['mediterranean', 'Mediterranean']
          -- Middle Eastern children
          WHEN 'levantine'         THEN ARRAY['levantine', 'Levantine']
          ELSE ARRAY[x]
        END
      ) AS v
    ) AS expanded
  );
$$;

GRANT EXECUTE ON FUNCTION public._alias_cultural_heritage(text[]) TO anon, authenticated, service_role;


-- _match_cooking_methods(p_l_methods text[], p_filter_methods text[]) -> boolean
-- UI sends Title-Case from filterDefinitions.ts:cookingMethods ('Stovetop',
-- 'Oven', 'Basic prep only'). Column has lowercase ('stovetop' 174, 'oven'
-- 104, 'basic-prep' 189, 'basic-prep-only' 6, 'no-cook' 2). Pure case-insensitive
-- match handles 'Stovetop'/'Oven', but 'Basic prep only' (UI value) would not
-- match 'basic-prep' or 'basic-prep-only' (DB values) on case-fold alone — the
-- slug has hyphens and missing 'only' suffix variants. Explicit slug-form alias
-- list bridges that gap. Avoids the lower(text[]::text)::text[] round-trip
-- which would break on commas/quotes inside element strings.
CREATE OR REPLACE FUNCTION public._match_cooking_methods(p_l_methods text[], p_filter_methods text[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE PARALLEL SAFE
AS $$
  WITH expanded_filter AS (
    SELECT DISTINCT v
    FROM unnest(coalesce(p_filter_methods, ARRAY[]::text[])) x,
    LATERAL (
      SELECT unnest(
        CASE lower(x)
          WHEN 'basic prep only' THEN ARRAY['basic prep only', 'basic-prep', 'basic-prep-only']
          ELSE ARRAY[lower(x)]
        END
      ) AS v
    ) e
  )
  SELECT EXISTS (
    SELECT 1
    FROM unnest(coalesce(p_l_methods, ARRAY[]::text[])) c
    WHERE lower(c) = ANY(SELECT v FROM expanded_filter)
  );
$$;

GRANT EXECUTE ON FUNCTION public._match_cooking_methods(text[], text[]) TO anon, authenticated, service_role;


-- =====================================================
-- DROP and CREATE search_lessons (signature change)
-- =====================================================
-- Verbatim identity arguments captured 2026-04-29 via
-- pg_get_function_identity_arguments. No CASCADE: pg_depend probe returned
-- empty. If a future dependent appears between draft and apply, the DROP
-- will fail loudly (intended).
DROP FUNCTION public.search_lessons(
  search_query text,
  filter_grade_levels text[],
  filter_themes text[],
  filter_seasons text[],
  filter_competencies text[],
  filter_cultures text[],
  filter_location text[],
  filter_activity_type text[],
  filter_lesson_format text,
  filter_academic text[],
  filter_sel text[],
  filter_cooking_method text,
  page_size integer,
  page_offset integer
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
  filter_lesson_format   text    DEFAULT NULL,
  filter_academic        text[]  DEFAULT NULL,
  filter_sel             text[]  DEFAULT NULL,
  filter_cooking_method  text[]  DEFAULT NULL,   -- NEW: was text (scalar) → text[] (array)
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

  -- Cultural heritage: alias FIRST (to inject Title-Case parents the
  -- hierarchy table knows), then expand to children.
  IF filter_cultures IS NOT NULL AND array_length(filter_cultures, 1) > 0 THEN
    expanded_cultures := expand_cultural_heritage(_alias_cultural_heritage(filter_cultures));
  ELSE
    expanded_cultures := NULL;
  END IF;

  -- Total count (count and result queries share WHERE)
  SELECT COUNT(*) INTO total_results
  FROM lessons l
  WHERE
    -- Text search
    (search_query IS NULL OR search_query = '' OR (
      l.search_vector @@ to_tsquery('english', expanded_query) OR
      l.title   % search_query OR
      l.summary % search_query
    ))
    -- Grade levels (already column-based)
    AND (filter_grade_levels IS NULL OR array_length(filter_grade_levels, 1) IS NULL OR
         l.grade_levels && filter_grade_levels)
    -- Thematic categories (column)
    AND (filter_themes IS NULL OR array_length(filter_themes, 1) IS NULL OR
         l.thematic_categories && filter_themes)
    -- Season & timing (column)
    AND (filter_seasons IS NULL OR array_length(filter_seasons, 1) IS NULL OR
         l.season_timing && filter_seasons)
    -- Core competencies (column)
    AND (filter_competencies IS NULL OR array_length(filter_competencies, 1) IS NULL OR
         l.core_competencies && filter_competencies)
    -- Cultural heritage (column, against alias-then-hierarchy-expanded values)
    AND (expanded_cultures IS NULL OR array_length(expanded_cultures, 1) IS NULL OR
         l.cultural_heritage && expanded_cultures)
    -- Location (column)
    AND (filter_location IS NULL OR array_length(filter_location, 1) IS NULL OR
         l.location_requirements && filter_location)
    -- Activity type (column, with -only/-bare alias expansion)
    AND (filter_activity_type IS NULL OR array_length(filter_activity_type, 1) IS NULL OR
         l.activity_type && _alias_activity_type(filter_activity_type))
    -- Lesson format (column scalar, with slug ↔ Title-Case alias)
    AND (filter_lesson_format IS NULL OR filter_lesson_format = '' OR
         l.lesson_format = ANY(_alias_lesson_format(filter_lesson_format)))
    -- Academic integration (column flat array — was object-shape in metadata)
    AND (filter_academic IS NULL OR array_length(filter_academic, 1) IS NULL OR
         l.academic_integration && filter_academic)
    -- Social-emotional learning (column)
    AND (filter_sel IS NULL OR array_length(filter_sel, 1) IS NULL OR
         l.social_emotional_learning && filter_sel)
    -- Cooking methods (now text[] param; case-insensitive + slug alias)
    AND (filter_cooking_method IS NULL OR array_length(filter_cooking_method, 1) IS NULL OR
         _match_cooking_methods(l.cooking_methods, filter_cooking_method));

  -- Paginated result rows
  RETURN QUERY
  SELECT
    l.lesson_id,
    l.title,
    l.summary,
    l.file_link,
    l.grade_levels,
    -- Per-field COALESCE metadata reconstruction. The original metadata is
    -- preserved for non-filter-relevant keys (mainIngredients, skills,
    -- equipment, duration, groupSize, gradeLevel, gardenSkills, cookingSkills,
    -- observancesHolidays, culturalResponsivenessFeatures); filter-relevant
    -- keys are replaced with column-derived values when the column has data.
    -- Naive `||` would erase originals where the column is NULL because
    -- to_jsonb(NULL::text[]) is JSON null; jsonb_strip_nulls drops the keys
    -- whose CASE returned NULL so the overlay only overwrites where the
    -- column has real data.
    --
    -- COLUMNS INCLUDED (update this list alongside any new filter-relevant
    -- column added in future migrations):
    --   thematic_categories, season_timing, location_requirements,
    --   core_competencies, cultural_heritage, lesson_format, activity_type,
    --   cooking_methods, academic_integration, social_emotional_learning
    --
    -- BONUS: academicConcepts sibling-key rescue. Approximately 690 rows have
    -- rich metadata.academicIntegration.concepts data (per-subject content
    -- like {"Science": ["plant parts", "life cycles"]}) that the overlay
    -- would otherwise hide once academicIntegration is overwritten with the
    -- column-derived flat array. Promote concepts to top-level result-row
    -- key academicConcepts (verified absent in current corpus, no collision).
    -- After PR-2 M2 lands and rescues concepts at rest, this CASE keeps
    -- firing on the (then-zero) object-shape rows — defensive, harmless.
    COALESCE(l.metadata, '{}'::jsonb) || jsonb_strip_nulls(jsonb_build_object(
      'thematicCategories',      CASE WHEN COALESCE(array_length(l.thematic_categories, 1), 0) > 0       THEN to_jsonb(l.thematic_categories)       END,
      'seasonTiming',            CASE WHEN COALESCE(array_length(l.season_timing, 1), 0) > 0             THEN to_jsonb(l.season_timing)             END,
      'locationRequirements',    CASE WHEN COALESCE(array_length(l.location_requirements, 1), 0) > 0     THEN to_jsonb(l.location_requirements)     END,
      'coreCompetencies',        CASE WHEN COALESCE(array_length(l.core_competencies, 1), 0) > 0         THEN to_jsonb(l.core_competencies)         END,
      'culturalHeritage',        CASE WHEN COALESCE(array_length(l.cultural_heritage, 1), 0) > 0         THEN to_jsonb(l.cultural_heritage)         END,
      'lessonFormat',            CASE WHEN l.lesson_format IS NOT NULL AND l.lesson_format <> ''        THEN to_jsonb(l.lesson_format)             END,
      'activityType',            CASE WHEN COALESCE(array_length(l.activity_type, 1), 0) > 0             THEN to_jsonb(l.activity_type)             END,
      'cookingMethods',          CASE WHEN COALESCE(array_length(l.cooking_methods, 1), 0) > 0           THEN to_jsonb(l.cooking_methods)           END,
      'academicIntegration',     CASE WHEN COALESCE(array_length(l.academic_integration, 1), 0) > 0      THEN to_jsonb(l.academic_integration)      END,
      'socialEmotionalLearning', CASE WHEN COALESCE(array_length(l.social_emotional_learning, 1), 0) > 0 THEN to_jsonb(l.social_emotional_learning) END,
      -- academicConcepts: rescue rich object-shape concepts data to a sibling
      -- key so the academicIntegration column-overlay doesn't hide it.
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
    AND (filter_lesson_format IS NULL OR filter_lesson_format = '' OR
         l.lesson_format = ANY(_alias_lesson_format(filter_lesson_format)))
    AND (filter_academic IS NULL OR array_length(filter_academic, 1) IS NULL OR
         l.academic_integration && filter_academic)
    AND (filter_sel IS NULL OR array_length(filter_sel, 1) IS NULL OR
         l.social_emotional_learning && filter_sel)
    AND (filter_cooking_method IS NULL OR array_length(filter_cooking_method, 1) IS NULL OR
         _match_cooking_methods(l.cooking_methods, filter_cooking_method))
  ORDER BY
    rank DESC,
    COALESCE((l.confidence->>'overall')::float, 0) DESC,
    l.title ASC
  LIMIT page_size
  OFFSET page_offset;
END;
$$;


GRANT EXECUTE ON FUNCTION public.search_lessons(
  text, text[], text[], text[], text[], text[], text[], text[], text, text[], text[], text[], integer, integer
) TO anon, authenticated, service_role;


-- Force PostgREST to reload its schema cache so the new signature is picked
-- up immediately. Supabase will auto-reload eventually, but explicit is safer.
NOTIFY pgrst, 'reload schema';


-- =====================================================
-- ROLLBACK
-- =====================================================
-- DROP FUNCTION IF EXISTS public.search_lessons(
--   text, text[], text[], text[], text[], text[], text[], text[],
--   text, text[], text[], text[], integer, integer
-- );
-- DROP FUNCTION IF EXISTS public._alias_lesson_format(text);
-- DROP FUNCTION IF EXISTS public._alias_activity_type(text[]);
-- DROP FUNCTION IF EXISTS public._alias_cultural_heritage(text[]);
-- DROP FUNCTION IF EXISTS public._match_cooking_methods(text[], text[]);
--
-- Then re-apply the prior search_lessons body from the baseline at
-- supabase/migrations/20251001_production_baseline_snapshot.sql:1198-1357
-- (verbatim signature: search_query text, filter_grade_levels text[], ...,
--  filter_cooking_method text, page_size integer, page_offset integer).
