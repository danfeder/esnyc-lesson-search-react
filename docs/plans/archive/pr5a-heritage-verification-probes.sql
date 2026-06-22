-- =====================================================
-- PR 5a — Heritage canonicalization verification probes (design doc §4.8)
-- =====================================================
-- Run via MCP at each tier: local (mcp__supabase__execute_sql), TEST
-- (mcp__supabase-test__execute_sql) BEFORE merge, PROD
-- (mcp__supabase-remote__execute_sql) after apply. Record results in
-- docs/plans/2026-06-11-pr5a-heritage-rehearsal-evidence.md.
--
-- Alias literals + canonical labels below are copied VERBATIM from
-- data/vocab/cultural-heritage.vocab.json via the generator output
-- (scripts/generate-heritage-rewrite-migration.py) — never hand-typed.
-- All probes scope live rows only: retired_at IS NULL.
--
-- Expected values (TEST before-census, 2026-06-11) are inline per probe.

-- =====================================================
-- Probe (a) — distinct-value census + non-canonical survivor check
-- =====================================================
-- BEFORE: 77 distinct / 916 appearances.
-- AFTER:  60 distinct / 916 appearances (77 − 17 alias literals; every
--         alias target already exists in the corpus, zero dedup collisions).

SELECT count(DISTINCT v) AS distinct_values, count(*) AS appearances
FROM lessons, unnest(cultural_heritage) v
WHERE retired_at IS NULL;

-- AFTER only: every surviving value must be one of the artifact's 71
-- canonical labels. Expect ZERO rows.
SELECT v, count(*)
FROM lessons, unnest(cultural_heritage) v
WHERE retired_at IS NULL
  AND v NOT IN (
    'Asian', 'East Asian', 'South Asian', 'Southeast Asian', 'Central Asian',
    'Chinese', 'Japanese', 'Indian', 'Pakistani', 'Uzbek', 'Korean',
    'Vietnamese', 'Sri Lankan', 'Malaysian', 'Taiwanese',
    'Americas', 'North American', 'Latin American', 'Caribbean', 'Mexican',
    'Puerto Rican', 'Salvadoran', 'Honduran', 'Cuban', 'Jamaican', 'Peruvian',
    'Brazilian', 'Ecuadorian', 'Guyanese', 'Central American', 'South American',
    'Southern United States', 'Dominican',
    'African', 'West African', 'North African', 'East African', 'Nigerian',
    'Egyptian', 'Kenyan', 'Ethiopian', 'Moroccan',
    'European', 'Mediterranean', 'Eastern European', 'Italian', 'Spanish',
    'Ukrainian', 'Greek', 'Irish', 'Russian', 'French', 'Polish',
    'Middle Eastern', 'Levantine', 'Yemeni', 'Persian', 'Palestinian',
    'Israeli', 'Lebanese', 'Syrian', 'Jordanian',
    'Indigenous and Diaspora', 'African American', 'Indigenous', 'Lenape',
    'Haudenosaunee', 'Soul Food', 'Three Sisters traditions',
    'Black culinary history', 'Cajun/Creole'
  )
GROUP BY v;

-- =====================================================
-- Probe (b) — per-alias counts (column AND metadata mirror)
-- =====================================================
-- BEFORE (TEST 2026-06-11): 42 appearances / 34 distinct rows:
--   African American diaspora 2 | Indigenous Peoples 1
--   Indigenous/Native American 1 | Native American 5
--   african 1 | americas 1 | asian 1 | caribbean 1 | east-asian 2
--   eastern-european 1 | european 1 | latin-american 4 | levantine 2
--   mediterranean 2 | middle-eastern 1 | north-american 13 | south-asian 3
-- AFTER: zero rows from BOTH queries.

SELECT m.alias, count(DISTINCT l.lesson_id) AS row_ct, count(*) AS appearance_ct
FROM lessons l
CROSS JOIN LATERAL unnest(l.cultural_heritage) v
JOIN (VALUES
    ('African American diaspora', 'African American'),
    ('Indigenous Peoples', 'Indigenous'),
    ('Indigenous/Native American', 'Indigenous'),
    ('Native American', 'Indigenous'),
    ('african', 'African'),
    ('americas', 'Americas'),
    ('asian', 'Asian'),
    ('caribbean', 'Caribbean'),
    ('east-asian', 'East Asian'),
    ('eastern-european', 'Eastern European'),
    ('european', 'European'),
    ('latin-american', 'Latin American'),
    ('levantine', 'Levantine'),
    ('mediterranean', 'Mediterranean'),
    ('middle-eastern', 'Middle Eastern'),
    ('north-american', 'North American'),
    ('south-asian', 'South Asian')
) m(alias, canonical) ON v = m.alias
WHERE l.retired_at IS NULL
GROUP BY m.alias
ORDER BY m.alias;

-- Metadata-mirror variant (AFTER: zero rows).
SELECT mv AS alias, count(*) AS appearance_ct
FROM lessons l
CROSS JOIN LATERAL jsonb_array_elements_text(l.metadata->'culturalHeritage') mv
WHERE l.retired_at IS NULL
  AND jsonb_typeof(l.metadata->'culturalHeritage') = 'array'
  AND mv IN (
    'African American diaspora', 'Indigenous Peoples', 'Indigenous/Native American',
    'Native American', 'african', 'americas', 'asian', 'caribbean', 'east-asian',
    'eastern-european', 'european', 'latin-american', 'levantine', 'mediterranean',
    'middle-eastern', 'north-american', 'south-asian'
  )
GROUP BY mv
ORDER BY mv;

-- =====================================================
-- Probe (c) — appearance conservation + column⇄metadata mirror integrity
-- =====================================================
-- BEFORE: 916 appearances; expected dedup collisions 0 (no live row carries
--         both an alias and its target).
-- AFTER:  916 appearances; set_mismatch must be 0.
-- NOTE (TEST after-probe 2026-06-11): the mirror check is SET equality, not
-- byte equality. The §J trigger (_meta_array_matches_column) compares
-- order-insensitively, and 5 live rows carry pre-existing order-only
-- column⇄metadata differences (same value sets, none touched by this
-- rewrite — none in pr5a_heritage_rollback). Byte-equality flags those 5;
-- set-equality is the real invariant.

SELECT
  (SELECT count(*) FROM lessons, unnest(cultural_heritage) v WHERE retired_at IS NULL) AS appearances,
  (SELECT count(*) FROM lessons l
   WHERE l.retired_at IS NULL
     AND COALESCE(array_length(l.cultural_heritage, 1), 0) > 0
     AND (jsonb_typeof(l.metadata->'culturalHeritage') IS DISTINCT FROM 'array'
          OR (SELECT array_agg(x ORDER BY x) FROM unnest(l.cultural_heritage) x)
             IS DISTINCT FROM
             (SELECT array_agg(y ORDER BY y)
              FROM jsonb_array_elements_text(l.metadata->'culturalHeritage') y))) AS set_mismatch;

-- =====================================================
-- Probe (d) — zero-orphan filter check (RPC expansion path)
-- =====================================================
-- Every filterDefinitions.ts heritage slug must reach the SAME row count
-- after as before (kebab-tagged rows stay reachable via their Title Case
-- twins, which sit in the same expansion; the 4 semantic-merge literals and
-- their targets appear in NO expansion — verified TEST 2026-06-11) — with
-- ONE explained exception: 'european' gains +1 (54 → 55). The row tagged
-- only kebab 'eastern-european' (lesson_4d119999d8d54a828d9cb217f6d98613)
-- was reachable via the eastern-european slug but NOT via its PARENT
-- 'european' (the parent expansion lacks the child's kebab variant); after
-- the rewrite it carries 'Eastern European' and correctly surfaces under
-- the parent. Strict improvement; no slug loses reach.
-- BEFORE (TEST 2026-06-11):
--   african 42 | americas 171 | asian 64 | caribbean 18 | central-asian 4
--   east-asian 37 | eastern-european 4 | ethiopian 1 | european 54
--   latin-american 81 | levantine 16 | mediterranean 44 | middle-eastern 24
--   nigerian 2 | north-american 96 | south-asian 18 | southeast-asian 5
--   west-african 15

SELECT slug,
  (SELECT count(*) FROM lessons l
   WHERE l.retired_at IS NULL
     AND l.cultural_heritage && public.expand_cultural_heritage(public._alias_cultural_heritage(ARRAY[slug]))) AS reachable_rows
FROM unnest(ARRAY[
  'asian','east-asian','southeast-asian','south-asian','central-asian',
  'americas','latin-american','caribbean','north-american',
  'african','west-african','ethiopian','nigerian',
  'european','eastern-european','mediterranean',
  'middle-eastern','levantine'
]) slug
ORDER BY slug;

-- =====================================================
-- Probe (e) — FTS smoke: ex-'Native American' lessons match 'Indigenous'
-- =====================================================
-- The 5 live TEST rows tagged 'Native American' before the rewrite
-- (lesson_ids verbatim from TEST before-probe 2026-06-11):
--   0BxEc0RZeYtCicXRsbXUyaDNKSEU            Thanksgiving in the Garden
--   12ZjWQaqW6hOPDo16zi9PN3iG92jI4KLz       Blue Corn Cookies
--   1dYfqKvRGyB45l5D-3KEN9Fx6-lFsNckvakBtMQq614k  Three Sisters Empanadas
--   1ggAWmeMm2AZoGXadfQjPzKMgZcYbTOyCiqUXdf0ZWrk  Fry Bread & Stories
--   1xaMyZf2OTGpX2GAD8-qgYADXHw1vTevByfs1bJ55lNs  All About Corn
-- AFTER: all 5 rows return fts_indigenous = true. (PROD: regenerate the
-- id list from the PROD before-probe, not from this TEST list.)

SELECT lesson_id, title,
  search_vector @@ plainto_tsquery('english', 'Indigenous') AS fts_indigenous
FROM lessons
WHERE lesson_id IN (
  '0BxEc0RZeYtCicXRsbXUyaDNKSEU',
  '12ZjWQaqW6hOPDo16zi9PN3iG92jI4KLz',
  '1dYfqKvRGyB45l5D-3KEN9Fx6-lFsNckvakBtMQq614k',
  '1ggAWmeMm2AZoGXadfQjPzKMgZcYbTOyCiqUXdf0ZWrk',
  '1xaMyZf2OTGpX2GAD8-qgYADXHw1vTevByfs1bJ55lNs'
)
ORDER BY lesson_id;

-- =====================================================
-- Probe (f) — idempotency: re-run the rewrite UPDATE, expect UPDATE 0
-- =====================================================
-- Safe to run post-apply (matches zero rows once aliases are gone).
-- This is the migration's section (2) statement verbatim.

WITH alias_map(alias, canonical) AS (
  VALUES
    ('African American diaspora', 'African American'),
    ('Indigenous Peoples', 'Indigenous'),
    ('Indigenous/Native American', 'Indigenous'),
    ('Native American', 'Indigenous'),
    ('african', 'African'),
    ('americas', 'Americas'),
    ('asian', 'Asian'),
    ('caribbean', 'Caribbean'),
    ('east-asian', 'East Asian'),
    ('eastern-european', 'Eastern European'),
    ('european', 'European'),
    ('latin-american', 'Latin American'),
    ('levantine', 'Levantine'),
    ('mediterranean', 'Mediterranean'),
    ('middle-eastern', 'Middle Eastern'),
    ('north-american', 'North American'),
    ('south-asian', 'South Asian')
)
UPDATE public.lessons l
SET cultural_heritage = (
  SELECT array_agg(val ORDER BY first_ord)
  FROM (
    SELECT COALESCE(m.canonical, u.val) AS val, min(u.ord) AS first_ord
    FROM unnest(l.cultural_heritage) WITH ORDINALITY u(val, ord)
    LEFT JOIN alias_map m ON m.alias = u.val
    GROUP BY COALESCE(m.canonical, u.val)
  ) mapped
)
WHERE l.retired_at IS NULL
  AND EXISTS (
    SELECT 1
    FROM unnest(l.cultural_heritage) v
    JOIN alias_map m ON v = m.alias
  );

-- =====================================================
-- Backup-table check
-- =====================================================
-- AFTER: row count equals the rows matched by the rewrite WHERE.
-- Expected: TEST 34 (before-census 2026-06-11); PROD value comes from the
-- PROD before-census. RLS must be enabled with zero policies.

SELECT
  (SELECT count(*) FROM public.pr5a_heritage_rollback) AS rollback_rows,
  (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'pr5a_heritage_rollback') AS rls_enabled,
  (SELECT count(*) FROM pg_policies p
   WHERE p.schemaname = 'public' AND p.tablename = 'pr5a_heritage_rollback') AS policy_count;
