-- =====================================================
-- Mirror-drift census (READ-ONLY; TEST / PROD / local).
-- =====================================================
-- Set-wise comparison of every lessons text[] column against its
-- metadata-mirror key. A missing / null / non-array mirror counts as [] and
-- is also reported separately (mirror_not_array). "retired" = retired_at
-- IS NOT NULL. Run via `mcp__supabase-test__execute_sql` /
-- `mcp__supabase-remote__execute_sql` (SELECT only) or psql.
--
-- Expected after the two 2026-10-26 migrations: no rows for the five
-- in-scope pairs (observancesHolidays, mainIngredients, gardenSkills,
-- cookingSkills, culturalResponsivenessFeatures) and for the nine pairs the
-- trigger already synced. gradeLevels and tags are reported for information
-- only — they are out of scope (see census-2026-10-22.prod.json "_about").
--
-- Query 1: summary per pair (one row per pair with ≥1 drifted lesson).
-- Query 2: the drifted (lesson, field) rows for the five in-scope pairs.
-- =====================================================

-- Query 1 — summary
WITH pairs AS (
  SELECT l.lesson_id, l.retired_at, p.col_name, p.key, p.col, l.metadata->p.key AS mirror
  FROM public.lessons l
  CROSS JOIN LATERAL (VALUES
    ('academic_integration',             'academicIntegration',            l.academic_integration),
    ('activity_type',                    'activityType',                   l.activity_type),
    ('cooking_methods',                  'cookingMethods',                 l.cooking_methods),
    ('thematic_categories',              'thematicCategories',             l.thematic_categories),
    ('season_timing',                    'seasonTiming',                   l.season_timing),
    ('location_requirements',            'locationRequirements',           l.location_requirements),
    ('core_competencies',                'coreCompetencies',               l.core_competencies),
    ('cultural_heritage',                'culturalHeritage',               l.cultural_heritage),
    ('social_emotional_learning',        'socialEmotionalLearning',        l.social_emotional_learning),
    ('observances_holidays',             'observancesHolidays',            l.observances_holidays),
    ('main_ingredients',                 'mainIngredients',                l.main_ingredients),
    ('garden_skills',                    'gardenSkills',                   l.garden_skills),
    ('cooking_skills',                   'cookingSkills',                  l.cooking_skills),
    ('cultural_responsiveness_features', 'culturalResponsivenessFeatures', l.cultural_responsiveness_features),
    ('grade_levels',                     'gradeLevels',                    l.grade_levels),
    ('tags',                             'tags',                           l.tags)
  ) AS p(col_name, key, col)
),
cmp AS (
  SELECT lesson_id, retired_at, col_name, key,
    (SELECT COALESCE(array_agg(DISTINCT v ORDER BY v), ARRAY[]::text[]) FROM unnest(col) v) AS col_set,
    (SELECT COALESCE(array_agg(DISTINCT value ORDER BY value), ARRAY[]::text[])
       FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(mirror) = 'array' THEN mirror ELSE '[]'::jsonb END)) AS mirror_set,
    COALESCE(jsonb_typeof(mirror), 'missing') <> 'array' AS mirror_not_array
  FROM pairs
)
SELECT col_name || ' ⇄ ' || key AS pair,
       count(*) FILTER (WHERE col_set <> mirror_set) AS drifted,
       count(*) FILTER (WHERE col_set <> mirror_set AND retired_at IS NOT NULL) AS retired_among_them,
       count(*) FILTER (WHERE col_set <> mirror_set AND mirror_not_array) AS mirror_not_array,
       count(*) FILTER (WHERE col_set <> mirror_set AND cardinality(col_set) = 0 AND cardinality(mirror_set) > 0) AS inverse_shape
FROM cmp
GROUP BY col_name, key
HAVING count(*) FILTER (WHERE col_set <> mirror_set) > 0
ORDER BY pair;

-- Query 2 — the in-scope drifted rows (expected: none after the repair)
SELECT l.lesson_id, l.title, p.key, p.col AS column_value, l.metadata->p.key AS mirror, l.updated_at, l.retired_at
FROM public.lessons l
CROSS JOIN LATERAL (VALUES
  ('observancesHolidays',            l.observances_holidays),
  ('mainIngredients',                l.main_ingredients),
  ('gardenSkills',                   l.garden_skills),
  ('cookingSkills',                  l.cooking_skills),
  ('culturalResponsivenessFeatures', l.cultural_responsiveness_features)
) AS p(key, col)
WHERE (SELECT COALESCE(array_agg(DISTINCT v ORDER BY v), ARRAY[]::text[]) FROM unnest(p.col) v)
   <> (SELECT COALESCE(array_agg(DISTINCT value ORDER BY value), ARRAY[]::text[])
         FROM jsonb_array_elements_text(CASE WHEN jsonb_typeof(l.metadata->p.key) = 'array' THEN l.metadata->p.key ELSE '[]'::jsonb END))
ORDER BY p.key, l.updated_at;
