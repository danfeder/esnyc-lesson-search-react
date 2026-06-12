-- =====================================================
-- PR 5b — Concepts canonicalization verification probes (design doc §4.8)
-- =====================================================
-- Run via MCP at each tier: local (mcp__supabase__execute_sql), TEST
-- (mcp__supabase-test__execute_sql) BEFORE merge, PROD
-- (mcp__supabase-remote__execute_sql) after apply. Record results in
-- docs/plans/2026-06-11-pr5b-concepts-rehearsal-evidence.md.
--
-- Alias literals + canonical labels below are generated mechanically from
-- data/vocab/academic-concepts.vocab.json (and cross-checked 1:1 against the
-- migration's generator output) — never hand-typed. All probes scope live
-- rows only: retired_at IS NULL. Concepts has NO flat column — every probe
-- reads metadata->'academicConcepts' only. There is NO probe (d)
-- filter-reach analog (concepts is not a filter field); probe (d′)
-- subject-key integrity replaces it.
--
-- Expected values (TEST before-census, 2026-06-11) are inline per probe.

-- =====================================================
-- Probe (a) — live census + non-canonical survivor check
-- =====================================================
-- BEFORE: 663 rows / 208 distinct strings / 1912 appearances.
-- AFTER:  662 rows / 119 distinct strings / 1873 appearances
--         (1912 − 8 drop appearances − 31 fold-collision dedups;
--         rows 663 − 1 all-drop row whose academicConcepts key is removed;
--         distinct = all 119 canonical labels — every keep literal has ≥1
--         live appearance, so every canonical label survives with ≥1).

SELECT count(DISTINCT l.lesson_id) AS rows_with_concepts,
       count(DISTINCT v.val)       AS distinct_strings,
       count(*)                    AS appearances
FROM lessons l
CROSS JOIN LATERAL jsonb_each(l.metadata->'academicConcepts') s(subj, arr)
CROSS JOIN LATERAL jsonb_array_elements_text(
  CASE WHEN jsonb_typeof(s.arr) = 'array' THEN s.arr ELSE '[]'::jsonb END) v(val)
WHERE l.retired_at IS NULL
  AND jsonb_typeof(l.metadata->'academicConcepts') = 'object';

-- AFTER only: every surviving string must be one of the artifact's 119
-- canonical labels. Expect ZERO rows.
SELECT v.val, count(*)
FROM lessons l
CROSS JOIN LATERAL jsonb_each(l.metadata->'academicConcepts') s(subj, arr)
CROSS JOIN LATERAL jsonb_array_elements_text(
  CASE WHEN jsonb_typeof(s.arr) = 'array' THEN s.arr ELSE '[]'::jsonb END) v(val)
WHERE l.retired_at IS NULL
  AND jsonb_typeof(l.metadata->'academicConcepts') = 'object'
  AND v.val NOT IN (
    'Adaptations', 'Advertising', 'Advocacy', 'Animal Needs',
    'Animal Welfare', 'Argumentation', 'Bilingual Education', 'Biodiversity',
    'Cellular Respiration', 'Chemical Reactions', 'Circulatory System', 'Civil Rights Movement',
    'Climate', 'Climate Change', 'Colonialism''s Impact', 'Community Systems',
    'Companion Planting', 'Comparative Writing', 'Counting', 'Creative Writing',
    'Cultural Narratives', 'Cultural Traditions', 'Data Collection', 'Debate',
    'Decomposition', 'Descriptive Writing', 'Drawing', 'Ecosystems',
    'Engineering', 'Environmental Justice', 'Environmental Stewardship', 'Estimation',
    'Factory Farming', 'Farm Labor', 'Feedback Systems', 'Fermentation',
    'Figurative Language', 'Food Presentation', 'Food Processing', 'Food Webs',
    'Fractions', 'Garden Exploration', 'Geography', 'Germination',
    'Global Connections', 'Graphing', 'Habitats', 'Harvesting',
    'Healthy Choices', 'Historical Figures', 'History of the American West', 'Homeostasis',
    'How-to Writing', 'Hydration', 'Imaginary Play', 'Immigration Stories',
    'Indigenous Knowledge', 'Legumes', 'Letter Writing', 'Life Cycles',
    'Literary Elements', 'Measurement', 'Mechanical Energy', 'Microorganisms',
    'Movement', 'Music', 'Narrative Writing', 'Native American History',
    'Novel Connections', 'Nutrition Education', 'Observation', 'Opinion Writing',
    'Patterns', 'Performance', 'Persuasive Writing', 'Pests',
    'Phases of Matter', 'Photojournalism', 'Photosynthesis', 'Plant Growth',
    'Plant Identification', 'Plant Needs', 'Plant Parts', 'Plant Reproduction',
    'Planting', 'Poetry', 'Pollinators', 'Preservation',
    'Problem Solving', 'Public Speaking', 'Ratios', 'Read-Aloud',
    'Reading', 'Recipe Reading', 'Recipe Scaling', 'Research',
    'Root Vegetables', 'Scientific Method', 'Seasonality', 'Seed Dispersal',
    'Seeds', 'Sensory Details', 'Sensory Exploration', 'Sequencing',
    'Slavery', 'Social Justice Issues', 'Soil Science', 'Sorting and Categorization',
    'Sound', 'Spices', 'Storytelling', 'Thermal Energy',
    'Tool Use', 'Trade Routes', 'Visual Arts', 'Vocabulary Development',
    'Voting', 'Water Cycles', 'Writing'
  )
GROUP BY v.val;

-- =====================================================
-- Probe (b) — per-alias/drop appearance counts (metadata only)
-- =====================================================
-- BEFORE (TEST 2026-06-11): all 208 literals present, 1912 appearances —
-- full per-literal census recorded in the rehearsal evidence doc.
-- AFTER: ZERO rows (no alias or drop literal survives anywhere).

SELECT v.val AS literal, count(*) AS appearance_ct,
       count(DISTINCT l.lesson_id) AS row_ct
FROM lessons l
CROSS JOIN LATERAL jsonb_each(l.metadata->'academicConcepts') s(subj, arr)
CROSS JOIN LATERAL jsonb_array_elements_text(
  CASE WHEN jsonb_typeof(s.arr) = 'array' THEN s.arr ELSE '[]'::jsonb END) v(val)
WHERE l.retired_at IS NULL
  AND jsonb_typeof(l.metadata->'academicConcepts') = 'object'
  AND v.val IN (
    'Indigenous knowledge', 'Indigenous stories', 'Native American history', 'adaptation',
    'adaptations', 'advertising', 'advocacy', 'animal needs',
    'animal welfare', 'area', 'argumentation', 'argumentative writing',
    'beneficial insect identification', 'bilingual education', 'biodiversity', 'biography',
    'biography reading', 'biotic/abiotic factors', 'cardiovascular system', 'categorization',
    'cellular respiration', 'chemical reactions', 'circulatory system', 'civil rights movement',
    'climate', 'climate change', 'colonialism''s impact', 'coloring',
    'colors of plants', 'community', 'community activism', 'community building',
    'community systems', 'companion planting', 'comparative writing', 'consumers',
    'counting', 'craft activity', 'creative writing', 'cultural narratives',
    'cultural traditions', 'dance', 'data collection', 'debate',
    'decomposition', 'descriptive language', 'descriptive writing', 'design',
    'discussion', 'drawing', 'ecosystems', 'engineering',
    'environmental impact', 'environmental justice', 'environmental stewardship', 'erosion',
    'estimation', 'factory farming', 'family traditions', 'farm labor',
    'feedback systems', 'fermentation', 'figurative language', 'food marketing',
    'food memory', 'food presentation', 'food preservation', 'food processing',
    'food systems', 'food webs', 'fractions', 'garden exploration',
    'garden topics', 'general exploration', 'geography', 'germination',
    'global connections', 'graphing', 'growing cycles', 'growth patterns',
    'habitats', 'harvest', 'harvesting', 'healthy choices',
    'historical context', 'historical figures', 'history of the American West', 'holidays',
    'homeostasis', 'how-to writing', 'hydration', 'identifying plants',
    'imaginary play', 'immigration stories', 'informational text', 'informational writing',
    'instrument making', 'international food traditions', 'legumes', 'letter writing',
    'life cycles', 'literary elements', 'macromolecules', 'macronutrients',
    'map reading', 'measurement', 'mechanical energy', 'microbiome',
    'microorganisms', 'movement', 'music', 'narrative reading',
    'narrative writing', 'national and religious holidays', 'note-taking', 'novel connections',
    'nutrition', 'nutrition education', 'observation', 'opinion writing',
    'organizing ideas', 'painting', 'patterns', 'performance',
    'perimeter', 'persuasive writing', 'pests', 'phases of matter',
    'photojournalism', 'photosynthesis', 'plant ID', 'plant adaptation',
    'plant adaptations', 'plant and animal similarities', 'plant growth', 'plant identification',
    'plant needs', 'plant nutrition', 'plant parts', 'plant reproduction',
    'plant science', 'plant-based proteins', 'planting', 'poetry',
    'pollinators', 'preservation', 'problem solving', 'producers',
    'protein', 'public speaking', 'puppet making', 'puppetry',
    'ratios', 'read-aloud', 'reading', 'reading comprehension',
    'recipe reading', 'recipe scaling', 'recipe selection', 'recipe writing',
    'research', 'root vegetables', 'roots', 'scaling',
    'scientific claims', 'scientific method', 'seasonal change', 'seasonal changes',
    'seasonal cycles', 'seasonal eating', 'seasonality', 'seasons',
    'seed dispersal', 'seed starting', 'seeds', 'sensory details',
    'sensory exploration', 'sequencing', 'similes', 'simple machines',
    'slavery', 'social justice', 'social justice issues', 'soil',
    'soil science', 'song', 'sorting', 'sound',
    'spacing', 'spices', 'states of matter', 'storytelling',
    'tallying', 'taste', 'thermal energy', 'tool use',
    'trade routes', 'unit rates', 'visual arts', 'vocabulary development',
    'volume', 'voting', 'water cycles', 'weather',
    'weight', 'writing', 'writing claims', 'yeast'
  )
GROUP BY v.val
ORDER BY v.val;

-- =====================================================
-- Probe (c) — appearance conservation
-- =====================================================
-- after-sum == before-sum − drop appearances − fold-collision dedups
-- BEFORE: 1912. Drops: 8. Fold-collision dedups: 31
--   (31 dedups across 28 subject arrays / 28 lessons — full per-array detail in the rehearsal evidence doc).
-- AFTER expected: 1873.

SELECT count(*) AS appearances
FROM lessons l
CROSS JOIN LATERAL jsonb_each(l.metadata->'academicConcepts') s(subj, arr)
CROSS JOIN LATERAL jsonb_array_elements_text(
  CASE WHEN jsonb_typeof(s.arr) = 'array' THEN s.arr ELSE '[]'::jsonb END) v(val)
WHERE l.retired_at IS NULL
  AND jsonb_typeof(l.metadata->'academicConcepts') = 'object';

-- =====================================================
-- Probe (d′) — subject-key integrity (replaces 5a's filter-reach probe (d):
-- concepts is not a filter field)
-- =====================================================
-- Per-subject-key row counts must be UNCHANGED except keys that emptied.
-- BEFORE (TEST 2026-06-11): Arts 95 | Health 101 | Literacy/ELA 205 | Math 95 | Science 467 | Social Studies 253
-- AFTER expected:           Arts 95 | Health 101 | Literacy/ELA 205 | Math 95 | Science 465 | Social Studies 253
--   (2 Science keys empty: 1cH_8eRYyGYLfAMROmDowd8aPddx1tDMoUxTM0QBR42s — all-drop Science array ['garden topics','plant science'], other key survives; 1voTOBrqizCtSDbkVdDiEt3MUE51jtm1GTKtrM-4H18M — sole key Science = ['general exploration'], whole academicConcepts key removed)
-- Shape: zero empty arrays, zero empty objects, zero non-array subject
-- values, zero non-object academicConcepts values — before AND after.

SELECT s.subj, count(*) AS rows_with_key
FROM lessons l
CROSS JOIN LATERAL jsonb_each(l.metadata->'academicConcepts') s(subj, arr)
WHERE l.retired_at IS NULL
  AND jsonb_typeof(l.metadata->'academicConcepts') = 'object'
GROUP BY s.subj
ORDER BY s.subj;

-- Shape integrity (expect 0 / 0 / 0 / 0 before and after):
SELECT
  (SELECT count(*) FROM lessons l
   CROSS JOIN LATERAL jsonb_each(l.metadata->'academicConcepts') s(subj, arr)
   WHERE l.retired_at IS NULL
     AND jsonb_typeof(l.metadata->'academicConcepts') = 'object'
     AND jsonb_typeof(s.arr) <> 'array') AS non_array_subject_values,
  (SELECT count(*) FROM lessons l
   CROSS JOIN LATERAL jsonb_each(l.metadata->'academicConcepts') s(subj, arr)
   WHERE l.retired_at IS NULL
     AND jsonb_typeof(l.metadata->'academicConcepts') = 'object'
     AND s.arr = '[]'::jsonb) AS empty_subject_arrays,
  (SELECT count(*) FROM lessons l
   WHERE l.retired_at IS NULL
     AND l.metadata->'academicConcepts' = '{}'::jsonb) AS empty_objects,
  (SELECT count(*) FROM lessons l
   WHERE l.retired_at IS NULL
     AND l.metadata ? 'academicConcepts'
     AND jsonb_typeof(l.metadata->'academicConcepts') <> 'object') AS non_object_values;

-- AFTER only: the rows whose academicConcepts key must be GONE
-- (all-drop rows, lesson_ids verbatim from the TEST before-probe;
-- PROD: regenerate from the PROD before-probe). Expect has_concepts_key
-- = false for every row returned.
SELECT lesson_id, metadata ? 'academicConcepts' AS has_concepts_key
FROM lessons
WHERE lesson_id IN (
  '1voTOBrqizCtSDbkVdDiEt3MUE51jtm1GTKtrM-4H18M'
);

-- AFTER only: the row whose Science key must be GONE while its other key
-- survives canonicalized (lesson_id verbatim from the TEST before-probe;
-- PROD: regenerate from the PROD before-probe). TEST before-state:
--   {"Science": ["garden topics", "plant science"],
--    "Literacy/ELA": ["informational writing", "organizing ideas", "research"]}
-- Expect after: has_science_key = false; concepts =
--   {"Literacy/ELA": ["Informational Writing", "Research"]}
-- (both Science values are drops; 'organizing ideas' + 'research' fold-collide
-- to "Research", first-occurrence dedup — compare Literacy/ELA as a SET).
SELECT lesson_id,
       metadata->'academicConcepts' ? 'Science' AS has_science_key,
       metadata->'academicConcepts' AS concepts
FROM lessons
WHERE lesson_id = '1cH_8eRYyGYLfAMROmDowd8aPddx1tDMoUxTM0QBR42s';

-- =====================================================
-- Probe (e) — FTS smoke
-- =====================================================
-- (e1) Lessons tagged 'seasonal eating' before the rewrite must FTS-match
-- 'Seasonality' after (lesson_ids verbatim from TEST before-probe
-- 2026-06-11; PROD: regenerate from the PROD before-probe):
-- The 7 live TEST rows tagged 'seasonal eating' (before-probe 2026-06-11):
--   0B9X3sp9nlAgmVmZpaFd6clptWTA                  September Salsa Toasts
--   14J7Twqm1YFCToMB1DpIjtQhN_va2CH6r_iCJQSef5X0  Tomato Sauce with Summer Vegetables
--   1K0zdfgOhbMmfWLeSwPfpz3dJ0RM7fLrAilQ2Ebfjilk  Pumpkin Spice Muffins
--   1tVWgHidAxvsPRMW2aJXd6YcFP9w0kbK6uOj_nbpu-KM  Food Miles Game
--   1uV2W6gUUZMDDM4VlhghIJ9w4GoLHpd1_             Women's History Month: Alice Waters
--   1V2Xt4cB9K19aItujCO8lrshz1YDSW022Okln4jI0ij8  Introduction to Salad Project
--   1xdz4aJqRcHYaAluj-x3C0VoQRM3UNy-gERUvpuOuwcM  Sweet and Sour Roots, Two Ways
-- AFTER: every row returns fts_seasonality = true. (Stemming caveat: the
-- english stemmer may reduce both 'seasonality' and 'seasonal' to the same
-- lexeme, so e1 can pass pre-rewrite too — e2 below is the strong
-- only-passes-after signal.)

SELECT lesson_id, title,
  search_vector @@ plainto_tsquery('english', 'Seasonality') AS fts_seasonality
FROM lessons
WHERE lesson_id IN (
  '0B9X3sp9nlAgmVmZpaFd6clptWTA',
  '14J7Twqm1YFCToMB1DpIjtQhN_va2CH6r_iCJQSef5X0',
  '1K0zdfgOhbMmfWLeSwPfpz3dJ0RM7fLrAilQ2Ebfjilk',
  '1tVWgHidAxvsPRMW2aJXd6YcFP9w0kbK6uOj_nbpu-KM',
  '1uV2W6gUUZMDDM4VlhghIJ9w4GoLHpd1_',
  '1V2Xt4cB9K19aItujCO8lrshz1YDSW022Okln4jI0ij8',
  '1xdz4aJqRcHYaAluj-x3C0VoQRM3UNy-gERUvpuOuwcM'
)
ORDER BY lesson_id;

-- (e2) Lessons tagged 'sorting' or 'categorization' before the rewrite must
-- FTS-match 'Sorting and Categorization' after (plainto AND-joins
-- 'sort' & 'categor', so this only passes once the canonical label is in
-- the array — a true post-rewrite signal):
-- On TEST, 'sorting' and 'categorization' both live on the SAME single
-- lesson (its Math array carries both — it is also a fold-collision row,
-- so the two literals merge into ONE 'Sorting and Categorization' entry):
--   1eACw5KxzBWrZlqretq7FbjxnVm8jqXaf             All About Seeds
-- AFTER: every row returns fts_sorting_and_categorization = true.

SELECT lesson_id, title,
  search_vector @@ plainto_tsquery('english', 'Sorting and Categorization')
    AS fts_sorting_and_categorization
FROM lessons
WHERE lesson_id IN (
  '1eACw5KxzBWrZlqretq7FbjxnVm8jqXaf'
)
ORDER BY lesson_id;

-- =====================================================
-- Probe (f) — idempotency: re-run the rewrite UPDATE, expect UPDATE 0
-- =====================================================
-- Safe to run post-apply (matches zero rows once aliases + drops are gone).
-- This is the migration's section (2) statement verbatim.
-- NOTE: run via a write-capable path (local psql / migration rerun) — NOT
-- via the read-only probe pass. On TEST/PROD this is exercised as the
-- documented manual step, as in 5a.

WITH alias_map(alias, canonical) AS (
  VALUES
    ('Indigenous knowledge', 'Indigenous Knowledge'),
    ('Indigenous stories', 'Cultural Narratives'),
    ('Native American history', 'Native American History'),
    ('adaptation', 'Adaptations'),
    ('adaptations', 'Adaptations'),
    ('advertising', 'Advertising'),
    ('advocacy', 'Advocacy'),
    ('animal needs', 'Animal Needs'),
    ('animal welfare', 'Animal Welfare'),
    ('area', 'Measurement'),
    ('argumentation', 'Argumentation'),
    ('argumentative writing', 'Persuasive Writing'),
    ('beneficial insect identification', 'Pollinators'),
    ('bilingual education', 'Bilingual Education'),
    ('biodiversity', 'Biodiversity'),
    ('biography', 'Reading'),
    ('biography reading', 'Reading'),
    ('biotic/abiotic factors', 'Ecosystems'),
    ('cardiovascular system', 'Circulatory System'),
    ('categorization', 'Sorting and Categorization'),
    ('cellular respiration', 'Cellular Respiration'),
    ('chemical reactions', 'Chemical Reactions'),
    ('circulatory system', 'Circulatory System'),
    ('civil rights movement', 'Civil Rights Movement'),
    ('climate', 'Climate'),
    ('climate change', 'Climate Change'),
    ('colonialism''s impact', 'Colonialism''s Impact'),
    ('coloring', 'Visual Arts'),
    ('colors of plants', 'Plant Parts'),
    ('community', 'Community Systems'),
    ('community activism', 'Advocacy'),
    ('community building', 'Community Systems'),
    ('community systems', 'Community Systems'),
    ('companion planting', 'Companion Planting'),
    ('comparative writing', 'Comparative Writing'),
    ('consumers', 'Food Webs'),
    ('counting', 'Counting'),
    ('craft activity', 'Visual Arts'),
    ('creative writing', 'Creative Writing'),
    ('cultural narratives', 'Cultural Narratives'),
    ('cultural traditions', 'Cultural Traditions'),
    ('dance', 'Movement'),
    ('data collection', 'Data Collection'),
    ('debate', 'Debate'),
    ('decomposition', 'Decomposition'),
    ('descriptive language', 'Vocabulary Development'),
    ('descriptive writing', 'Descriptive Writing'),
    ('drawing', 'Drawing'),
    ('ecosystems', 'Ecosystems'),
    ('engineering', 'Engineering'),
    ('environmental impact', 'Environmental Justice'),
    ('environmental justice', 'Environmental Justice'),
    ('environmental stewardship', 'Environmental Stewardship'),
    ('erosion', 'Soil Science'),
    ('estimation', 'Estimation'),
    ('factory farming', 'Factory Farming'),
    ('family traditions', 'Cultural Traditions'),
    ('farm labor', 'Farm Labor'),
    ('feedback systems', 'Feedback Systems'),
    ('fermentation', 'Fermentation'),
    ('figurative language', 'Figurative Language'),
    ('food marketing', 'Advertising'),
    ('food memory', 'Cultural Narratives'),
    ('food presentation', 'Food Presentation'),
    ('food preservation', 'Preservation'),
    ('food processing', 'Food Processing'),
    ('food webs', 'Food Webs'),
    ('fractions', 'Fractions'),
    ('garden exploration', 'Garden Exploration'),
    ('geography', 'Geography'),
    ('germination', 'Germination'),
    ('global connections', 'Global Connections'),
    ('graphing', 'Graphing'),
    ('growing cycles', 'Plant Growth'),
    ('growth patterns', 'Plant Growth'),
    ('habitats', 'Habitats'),
    ('harvest', 'Harvesting'),
    ('harvesting', 'Harvesting'),
    ('healthy choices', 'Healthy Choices'),
    ('historical figures', 'Historical Figures'),
    ('history of the American West', 'History of the American West'),
    ('holidays', 'Cultural Traditions'),
    ('homeostasis', 'Homeostasis'),
    ('how-to writing', 'How-to Writing'),
    ('hydration', 'Hydration'),
    ('identifying plants', 'Plant Identification'),
    ('imaginary play', 'Imaginary Play'),
    ('immigration stories', 'Immigration Stories'),
    ('informational text', 'Reading'),
    ('informational writing', 'How-to Writing'),
    ('instrument making', 'Music'),
    ('international food traditions', 'Cultural Traditions'),
    ('legumes', 'Legumes'),
    ('letter writing', 'Letter Writing'),
    ('life cycles', 'Life Cycles'),
    ('literary elements', 'Literary Elements'),
    ('macromolecules', 'Nutrition Education'),
    ('macronutrients', 'Nutrition Education'),
    ('map reading', 'Geography'),
    ('measurement', 'Measurement'),
    ('mechanical energy', 'Mechanical Energy'),
    ('microbiome', 'Microorganisms'),
    ('microorganisms', 'Microorganisms'),
    ('movement', 'Movement'),
    ('music', 'Music'),
    ('narrative reading', 'Reading'),
    ('narrative writing', 'Narrative Writing'),
    ('national and religious holidays', 'Cultural Traditions'),
    ('note-taking', 'Research'),
    ('novel connections', 'Novel Connections'),
    ('nutrition', 'Nutrition Education'),
    ('nutrition education', 'Nutrition Education'),
    ('observation', 'Observation'),
    ('opinion writing', 'Opinion Writing'),
    ('organizing ideas', 'Research'),
    ('painting', 'Visual Arts'),
    ('patterns', 'Patterns'),
    ('performance', 'Performance'),
    ('perimeter', 'Measurement'),
    ('persuasive writing', 'Persuasive Writing'),
    ('pests', 'Pests'),
    ('phases of matter', 'Phases of Matter'),
    ('photojournalism', 'Photojournalism'),
    ('photosynthesis', 'Photosynthesis'),
    ('plant ID', 'Plant Identification'),
    ('plant adaptation', 'Adaptations'),
    ('plant adaptations', 'Adaptations'),
    ('plant and animal similarities', 'Life Cycles'),
    ('plant growth', 'Plant Growth'),
    ('plant identification', 'Plant Identification'),
    ('plant needs', 'Plant Needs'),
    ('plant nutrition', 'Plant Needs'),
    ('plant parts', 'Plant Parts'),
    ('plant reproduction', 'Plant Reproduction'),
    ('plant-based proteins', 'Nutrition Education'),
    ('planting', 'Planting'),
    ('poetry', 'Poetry'),
    ('pollinators', 'Pollinators'),
    ('preservation', 'Preservation'),
    ('problem solving', 'Problem Solving'),
    ('producers', 'Food Webs'),
    ('protein', 'Nutrition Education'),
    ('public speaking', 'Public Speaking'),
    ('puppet making', 'Visual Arts'),
    ('puppetry', 'Visual Arts'),
    ('ratios', 'Ratios'),
    ('read-aloud', 'Read-Aloud'),
    ('reading', 'Reading'),
    ('reading comprehension', 'Reading'),
    ('recipe reading', 'Recipe Reading'),
    ('recipe scaling', 'Recipe Scaling'),
    ('recipe selection', 'Recipe Reading'),
    ('recipe writing', 'How-to Writing'),
    ('research', 'Research'),
    ('root vegetables', 'Root Vegetables'),
    ('roots', 'Plant Parts'),
    ('scaling', 'Recipe Scaling'),
    ('scientific claims', 'Scientific Method'),
    ('scientific method', 'Scientific Method'),
    ('seasonal change', 'Seasonality'),
    ('seasonal changes', 'Seasonality'),
    ('seasonal cycles', 'Seasonality'),
    ('seasonal eating', 'Seasonality'),
    ('seasonality', 'Seasonality'),
    ('seasons', 'Seasonality'),
    ('seed dispersal', 'Seed Dispersal'),
    ('seed starting', 'Seeds'),
    ('seeds', 'Seeds'),
    ('sensory details', 'Sensory Details'),
    ('sensory exploration', 'Sensory Exploration'),
    ('sequencing', 'Sequencing'),
    ('similes', 'Figurative Language'),
    ('simple machines', 'Engineering'),
    ('slavery', 'Slavery'),
    ('social justice', 'Social Justice Issues'),
    ('social justice issues', 'Social Justice Issues'),
    ('soil', 'Soil Science'),
    ('soil science', 'Soil Science'),
    ('song', 'Music'),
    ('sorting', 'Sorting and Categorization'),
    ('sound', 'Sound'),
    ('spacing', 'Planting'),
    ('spices', 'Spices'),
    ('states of matter', 'Phases of Matter'),
    ('storytelling', 'Storytelling'),
    ('tallying', 'Counting'),
    ('taste', 'Sensory Exploration'),
    ('thermal energy', 'Thermal Energy'),
    ('tool use', 'Tool Use'),
    ('trade routes', 'Trade Routes'),
    ('unit rates', 'Ratios'),
    ('visual arts', 'Visual Arts'),
    ('vocabulary development', 'Vocabulary Development'),
    ('volume', 'Measurement'),
    ('voting', 'Voting'),
    ('water cycles', 'Water Cycles'),
    ('weather', 'Climate'),
    ('weight', 'Measurement'),
    ('writing', 'Writing'),
    ('writing claims', 'Persuasive Writing'),
    ('yeast', 'Fermentation')
),
drop_literals(literal) AS (
  VALUES
    ('design'),
    ('discussion'),
    ('food systems'),
    ('garden topics'),
    ('general exploration'),
    ('historical context'),
    ('plant science')
)
UPDATE public.lessons l
SET metadata = (
  SELECT CASE
           WHEN agg.new_obj IS NULL THEN l.metadata - 'academicConcepts'
           ELSE jsonb_set(l.metadata, '{academicConcepts}', agg.new_obj)
         END
  FROM (
    SELECT jsonb_object_agg(per_subject.subj, per_subject.new_arr) AS new_obj
    FROM (
      SELECT s.subj,
             CASE
               WHEN jsonb_typeof(s.arr) <> 'array' THEN s.arr  -- passthrough (none in corpus)
               ELSE (
                 SELECT jsonb_agg(mapped.val ORDER BY mapped.first_ord)
                 FROM (
                   SELECT COALESCE(m.canonical, u.val) AS val, min(u.ord) AS first_ord
                   FROM jsonb_array_elements_text(s.arr) WITH ORDINALITY u(val, ord)
                   LEFT JOIN alias_map m ON m.alias = u.val
                   WHERE u.val NOT IN (SELECT literal FROM drop_literals)
                   GROUP BY COALESCE(m.canonical, u.val)
                 ) mapped
               )
             END AS new_arr
      FROM jsonb_each(l.metadata->'academicConcepts') s(subj, arr)
    ) per_subject
    WHERE per_subject.new_arr IS NOT NULL  -- removes subject keys whose arrays emptied
  ) agg
)
WHERE l.retired_at IS NULL
  AND jsonb_typeof(l.metadata->'academicConcepts') = 'object'
  AND EXISTS (
    SELECT 1
    FROM jsonb_each(l.metadata->'academicConcepts') s(subj, arr)
    CROSS JOIN LATERAL jsonb_array_elements_text(
      CASE WHEN jsonb_typeof(s.arr) = 'array' THEN s.arr ELSE '[]'::jsonb END
    ) v(val)
    WHERE v.val IN (SELECT alias FROM alias_map)
       OR v.val IN (SELECT literal FROM drop_literals)
  );

-- =====================================================
-- Backup-table check
-- =====================================================
-- AFTER: row count equals the rows matched by the rewrite WHERE.
-- Expected: TEST 663 (before-census 2026-06-11 — every live row with
-- concepts matches: all 208 literals are alias∪drop members); PROD value
-- comes from the PROD before-census. RLS must be enabled with zero policies.

SELECT
  (SELECT count(*) FROM public.pr5b_concepts_rollback) AS rollback_rows,
  (SELECT c.relrowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'pr5b_concepts_rollback') AS rls_enabled,
  (SELECT count(*) FROM pg_policies p
   WHERE p.schemaname = 'public' AND p.tablename = 'pr5b_concepts_rollback') AS policy_count;
