# E1 — PROD census of the 8 smaller vocab fields (feeds design OQ2)

**Date:** 2026-06-11
**Database:** PRODUCTION (`jxlxtzkmicfhchkhiojz`), read-only SELECT via `mcp__supabase-remote__execute_sql`
**Evidence item:** impl-plan work-list item 1 (E1); feeds OQ2 (re-tag field scope: all-fields vs locked-vocab-only vs hybrid)

---

## Executive summary (plain language)

The eight "smaller" vocabulary fields are not equally messy — they fall into three clear tiers.

**Five fields are nearly clean already.** Academic subjects, social-emotional learning, core competencies, cooking methods, and observances/holidays each have a tiny vocabulary (5–17 distinct stored values) where ~90%+ of the data already matches one canonical form and the rest is a mechanical spelling twin (`Social Studies` vs `social-studies`). Each carries at most one genuine judgment call (one lesson tagged `Food Justice`; four lessons tagged `no-cook`; whether "End of year" and "End of year celebrations" are one thing or two). These could be locked as closed enums in a single Session-2 walkthrough — no worksheet needed.

**One field needs a light review.** Garden skills has 47 stored values against a 22-option configured list; almost all map mechanically, but two off-list values have real usage ("Stewardship tasks" on 35 lessons, "sensory-exploration" on 28) plus six one-off strays. That's a ~15-minute add-or-fold decision list, not a full worksheet.

**Two fields genuinely need worksheets.** Cooking skills (122 distinct values; the *most-used* values aren't even on the configured 28-option list; 93% of tagged lessons carry at least one off-list value) and main ingredients (230 distinct values mixing category-level terms like "Alliums" with specific foods like "Garlic", plus ~96 one-off freeform entries; an unresolved category-vs-ingredient design question). These are concepts-worksheet-scale problems.

Two corpus-level findings worth noting: (1) the **live corpus is 767 lessons, not ~751** — the design doc's estimate was built on a stale 772-row total; the actual table holds 788 rows minus 21 retired PR-4 import drops; (2) the kebab-case drift is almost entirely confined to the ~105 submission-era rows (88 of 105 carry kebab values vs 7 of 662 legacy rows), confirming the three-regimes model as a *value*-convention split for these fields — the JSONB *key names and shapes* for all 8 fields are uniform (camelCase, arrays).

---

## 1. Field-name mapping (design name → schema)

Sources: `src/types/lessonMetadata.zod.ts` (canonical Zod scaffold), `src/types/generated/enums.json`, `src/utils/filterDefinitions.ts`, PROD `information_schema.columns`.

| # | Design-doc name | `lessons` column (text[]) | `metadata` JSONB key | In `enums.json`? | UI vocab source |
|---|---|---|---|---|---|
| 1 | cooking_skills | `cooking_skills` | `cookingSkills` (array) | No (open) | `METADATA_CONFIGS.cookingSkills` — 28 options (filterDefinitions.ts:303) |
| 2 | garden_skills | `garden_skills` | `gardenSkills` (array) | No (open) | `METADATA_CONFIGS.gardenSkills` — 22 options (filterDefinitions.ts:269) |
| 3 | social-emotional learning | `social_emotional_learning` | `socialEmotionalLearning` (array) | No (open) | `FILTER_CONFIGS.socialEmotionalLearning` — 5 options (filterDefinitions.ts:185) |
| 4 | core_competencies | `core_competencies` | `coreCompetencies` (array) | No (open) | `FILTER_CONFIGS.coreCompetencies` — 6 options (filterDefinitions.ts:102) |
| 5 | cooking_methods | `cooking_methods` | `cookingMethods` (array) | No (open) | `FILTER_CONFIGS.cookingMethods` — 3 options (filterDefinitions.ts:197) |
| 6 | main_ingredients | `main_ingredients` | `mainIngredients` (array) | No (open) | `METADATA_CONFIGS.mainIngredients` — 45 options (filterDefinitions.ts:212) |
| 7 | observances/holidays | `observances_holidays` | `observancesHolidays` (array) | No (open) | `METADATA_CONFIGS.observancesHolidays` — 17 suggestions, type `creatable` (filterDefinitions.ts:343) |
| 8 | academic subjects | `academic_integration` | `academicIntegration` (array) + `academicConcepts` (object keyed by subject) | No (open) | `FILTER_CONFIGS.academicIntegration` — 6 options (filterDefinitions.ts:172) |

Notes:
- All 8 exist BOTH as dedicated `lessons` text[] columns and as camelCase keys inside `metadata` JSONB (column list query in §2).
- `enums.json` contains only the 4 PR-1 locked enums (`activity_type`, `tags`, `season_timing`, `cultural_responsiveness_features`). None of the 8 target fields has a closed enum yet — `lessonMetadata.zod.ts:95-108` keeps them as open `z.array(z.string())` "until Stage 1 worksheets close them in PR 5+".
- The Zod schema allows an object shape for `academicIntegration` (`{concepts, selected}`, lessonMetadata.zod.ts:75-80) but **zero live rows use it** — all 759 live `academicIntegration` keys are plain arrays (§3).

## 2. Live-corpus definition

```sql
SELECT column_name, data_type, udt_name FROM information_schema.columns
WHERE table_schema='public' AND table_name='lessons' ORDER BY ordinal_position;
```
→ 44 columns, including `retired_at timestamptz` / `retired_reason text` (the soft-delete mechanism) and dedicated text[] columns for all 8 target fields.

```sql
SELECT count(*) FILTER (WHERE retired_at IS NULL) AS live,
       count(*) FILTER (WHERE retired_at IS NOT NULL) AS retired,
       count(*) AS total FROM lessons;
```
| live | retired | total |
|---|---|---|
| **767** | 21 | 788 |

```sql
SELECT retired_reason, count(*) AS rows, min(retired_at)::date AS first, max(retired_at)::date AS last
FROM lessons WHERE retired_at IS NOT NULL GROUP BY retired_reason ORDER BY count(*) DESC;
```
| retired_reason | rows | first | last |
|---|---|---|---|
| import:foodcorps_2017 | 11 | 2026-05-08 | 2026-05-08 |
| import:pflp_2003 | 5 | 2026-05-08 | 2026-05-08 |
| import:cas_food_justice | 1 | 2026-05-08 | 2026-05-08 |
| import:nyc_doe_colonial_ny | 1 | 2026-05-08 | 2026-05-08 |
| import:oregon_doe_leaves | 1 | 2026-05-08 | 2026-05-08 |
| import:nyc_dep_watershed | 1 | 2026-05-08 | 2026-05-08 |
| import:city_blossoms_botanical_artists | 1 | 2026-05-08 | 2026-05-08 |

**Definition used throughout this census: live corpus = `lessons WHERE retired_at IS NULL` = 767 rows.**

**Discrepancy vs the design doc's "~751":** the estimate was 772 (stale 2026-05-06 total) − 21 drops = 751. The actual table total is 788; no rows were created after 2026-04-27:

```sql
SELECT count(*) FILTER (WHERE created_at >= '2026-05-06') AS created_since_may6,
       min(created_at) FILTER (WHERE created_at >= '2026-05-06') AS earliest_new,
       max(created_at) AS latest FROM lessons WHERE retired_at IS NULL;
-- → created_since_may6: 0, latest: 2026-04-27 22:33:46+00

SELECT created_at::date AS d, count(*) FROM lessons GROUP BY 1 ORDER BY 1 DESC;
-- → 2026-04-27: 6 | 2025-09-01: 81 | 2025-08-07: 23 | 2025-07-24: 1 | 2025-07-10: 677  (Σ = 788)
```
So 767 is stable (no inserts in 6+ weeks); the 16-row gap lives in the historical "772" figure, not in new data. **Implementation plan should update ~751 → 767.** This does not contradict the locked decision (full live post-PR-4 corpus; the number was explicitly approximate).

## 3. Three-regimes hazard: key-variant + shape discovery

```sql
SELECT k AS metadata_key, count(*) AS rows_with_key
FROM lessons, LATERAL jsonb_object_keys(metadata) AS k
WHERE retired_at IS NULL GROUP BY k ORDER BY k;
```
| metadata_key | rows | | metadata_key | rows |
|---|---|---|---|---|
| academicConcepts | 675 | | gradeLevels | 81 |
| academicIntegration | 759 | | locationRequirements | 767 |
| activityType | 764 | | mainIngredients | 710 |
| cookingMethods | 711 | | observancesHolidays | 698 |
| cookingSkills | 710 | | seasonTiming | 764 |
| coreCompetencies | 767 | | socialEmotionalLearning | 767 |
| culturalHeritage | 710 | | thematicCategories | 767 |
| culturalResponsivenessFeatures | 685 | | gradeLevel | 676 |
| gardenSkills | 737 | | | |

**Finding:** the only key-name split in live metadata is `gradeLevel` (676) vs `gradeLevels` (81) — *not one of the 8 target fields*. All 8 target fields use exactly one camelCase key each. No snake_case JSONB variants exist.

```sql
SELECT k AS key, jsonb_typeof(metadata->k) AS shape, count(*) AS rows
FROM lessons, unnest(ARRAY['cookingSkills','gardenSkills','socialEmotionalLearning','coreCompetencies','cookingMethods','mainIngredients','observancesHolidays','academicIntegration','academicConcepts']) AS k
WHERE retired_at IS NULL AND metadata ? k GROUP BY 1,2 ORDER BY 1,2;
```
| key | shape | rows |
|---|---|---|
| academicConcepts | object | 675 |
| academicIntegration | array | 759 |
| cookingMethods | array | 711 |
| cookingSkills | array | 710 |
| coreCompetencies | array | 767 |
| gardenSkills | array | 737 |
| mainIngredients | array | 710 |
| observancesHolidays | array | 698 |
| socialEmotionalLearning | array | 767 |

**Shapes are 100% uniform** — every present key is an array (object for `academicConcepts`, as designed). No scalar-vs-array splits; the `academicIntegration` object regime is extinct in live rows. For these 8 fields, the three-regimes problem survives only as a **value-convention split** (kebab-case vs Title Case), strongly correlated with row provenance:

```sql
SELECT (original_submission_id IS NOT NULL) AS submission_era, count(*) AS rows,
  count(*) FILTER (WHERE social_emotional_learning && ARRAY['self-management','relationship-skills','social-awareness','self-awareness','responsible-decision-making']) AS sel_kebab_rows,
  count(*) FILTER (WHERE core_competencies && ARRAY['garden-skills','kitchen-skills','environmental-stewardship','culturally-responsive','social-justice','social-emotional']) AS cc_kebab_rows,
  count(*) FILTER (WHERE academic_integration && ARRAY['science','social-studies','arts','literacy-ela','health','math']) AS ai_kebab_rows
FROM lessons WHERE retired_at IS NULL GROUP BY 1;
```
| submission_era | rows | sel_kebab | cc_kebab | ai_kebab |
|---|---|---|---|---|
| false (legacy) | 662 | 7 | 7 | 6 |
| true (submission-era) | 105 | **88** | **88** | **79** |

## 4. Column vs JSONB sync

The text[] columns are the search surface (live `search_lessons` RPC filters on `l.cooking_methods` etc. — see §5.4); metadata JSONB is the historical store. Sync check:

```sql
SELECT f.field,
  count(*) FILTER (WHERE to_jsonb(f.col) IS DISTINCT FROM f.jsb) AS col_jsonb_mismatch,
  count(*) FILTER (WHERE f.col IS NOT NULL AND array_length(f.col,1) > 0) AS col_nonempty,
  count(*) FILTER (WHERE jsonb_typeof(f.jsb)='array' AND jsonb_array_length(f.jsb) > 0) AS jsonb_nonempty
FROM lessons l, LATERAL (VALUES
  ('cooking_skills', l.cooking_skills, l.metadata->'cookingSkills'),
  ('garden_skills', l.garden_skills, l.metadata->'gardenSkills'),
  ('social_emotional_learning', l.social_emotional_learning, l.metadata->'socialEmotionalLearning'),
  ('core_competencies', l.core_competencies, l.metadata->'coreCompetencies'),
  ('cooking_methods', l.cooking_methods, l.metadata->'cookingMethods'),
  ('main_ingredients', l.main_ingredients, l.metadata->'mainIngredients'),
  ('observances_holidays', l.observances_holidays, l.metadata->'observancesHolidays'),
  ('academic_integration', l.academic_integration, l.metadata->'academicIntegration')
) AS f(field, col, jsb)
WHERE l.retired_at IS NULL GROUP BY f.field ORDER BY f.field;
```
| field | raw mismatch | col nonempty | jsonb nonempty |
|---|---|---|---|
| academic_integration | 19 | 754 | 754 |
| cooking_methods | 56 | 434 | 434 |
| cooking_skills | 65 | 435 | 433 |
| core_competencies | 8 | 767 | 767 |
| garden_skills | 44 | 411 | 413 |
| main_ingredients | 65 | 430 | 428 |
| observances_holidays | 72 | 124 | 123 |
| social_emotional_learning | 8 | 767 | 767 |

Re-run comparing **value sets** (order/duplicate-insensitive):

```sql
SELECT f.field,
  count(*) FILTER (WHERE to_jsonb(f.col) IS DISTINCT FROM f.jsb) AS raw_mismatch,
  count(*) FILTER (
    WHERE (SELECT array_agg(DISTINCT x ORDER BY x) FROM unnest(f.col) x)
    IS DISTINCT FROM
    (CASE WHEN jsonb_typeof(f.jsb)='array' THEN (SELECT array_agg(DISTINCT v ORDER BY v) FROM jsonb_array_elements_text(f.jsb) v) ELSE NULL END)
  ) AS value_set_mismatch
FROM lessons l, LATERAL (VALUES /* same 8-field VALUES list as above */ ...) AS f(field, col, jsb)
WHERE l.retired_at IS NULL GROUP BY f.field ORDER BY f.field;
```
| field | raw_mismatch | value_set_mismatch |
|---|---|---|
| academic_integration | 19 | **0** |
| cooking_methods | 56 | **0** |
| cooking_skills | 65 | **3** |
| core_competencies | 8 | **0** |
| garden_skills | 44 | **5** |
| main_ingredients | 65 | **3** |
| observances_holidays | 72 | **1** |
| social_emotional_learning | 8 | **0** |

**Only 12 row-field pairs in the whole corpus have genuinely different values between column and JSONB** — everything else is element ordering. The 12 (full row detail from the census query, columns truncated to 60-char titles):

| field | lesson_id | title | column | jsonb |
|---|---|---|---|---|
| cooking_skills | 1bO5UbLgXj5Puo2h-KXm31-0rmWIr4hItroTNYpIwta8 | The Seasons: Spring | {Assembling cold dishes} | [] |
| cooking_skills | 1cX_lHizAQAD-XccT95OugIwfmcCXIWsI35hk4ewmF1c | The Seasons: Fall | {Assembling cold dishes} | [] |
| cooking_skills | 1Gg9cS6HdfQtR07EWyy1l_L3Z4DuIhxAFNS12fiJsC6o | Fruit Kabobs with Yogurt Dressing and Trail Mix | adds "Cutting Skills" | (5 of 6 values) |
| garden_skills | 0BwC8Pf3ZwAXjLXYwc3FQbS1ZMHc | Soil Is Where Food Begins! | adds Mulching | (2 of 3) |
| garden_skills | 1l2xxZKHe1VxKG9RovqhaqrVjoz1VOnsy-pObtCqqGV4 | Planting in Patterns | adds Observing plant parts | (3 of 4) |
| garden_skills | 1NF_sOLKR8um-3T9Eck-_i6j-GEwv0X58TqqJk2Qu350 | Expert's Guide to Gardening: Seed Starting | NULL | ["Planting","Garden planning"] |
| garden_skills | 1vY0gOo9IooV6W9uAVYskU1G0byTHEfzIPHnFMGPKQQo | Bees and Pollination | adds Observing plant parts | (2 of 3) |
| garden_skills | 1YyZtfvujMDeYYtAEYDHfh-Z-BO1SxpeV_6FZinilSts | Expert's Guide to Gardening: Transplanting | NULL | ["Transplanting","Observing plant parts"] |
| main_ingredients | 1bO5UbLgXj5Puo2h-KXm31-0rmWIr4hItroTNYpIwta8 | The Seasons: Spring | {Seeds} | [] |
| main_ingredients | 1cX_lHizAQAD-XccT95OugIwfmcCXIWsI35hk4ewmF1c | The Seasons: Fall | {Berries} | [] |
| main_ingredients | 1Gg9cS6HdfQtR07EWyy1l_L3Z4DuIhxAFNS12fiJsC6o | Fruit Kabobs with Yogurt Dressing... | 11 values | 7 values |
| observances_holidays | 10cWBpxz46T0K1L_kndimGdmI-9ZhTBZP | Rainbow Scavenger Hunt | {Beginning of year} | [] |

**Census source decision:** all value censuses below run on the **text[] columns** (the search surface). Given 0–5 set-mismatched rows per field, JSONB censuses would differ by at most a handful of appearances. The re-tag apply step must write both representations (or define one as derived) — same dual-write reality PR 5 handled for concepts.

## 5. Per-field censuses

Coverage denominator = 767 live rows throughout.

### 5.1 academic_integration (subjects) — 12 distinct, 1,355 appearances, coverage 754/767 (98.3%)

```sql
SELECT v AS value, count(*) AS lessons FROM lessons, unnest(academic_integration) v
WHERE retired_at IS NULL GROUP BY v ORDER BY count(*) DESC, v;
```
| value | lessons | | value | lessons |
|---|---|---|---|---|
| Science | 472 | | science | 48 |
| Social Studies | 256 | | social-studies | 42 |
| Literacy/ELA | 210 | | arts | 13 |
| Health | 105 | | literacy-ela | 10 |
| Math | 102 | | health | 1 |
| Arts | 95 | | math | 1 |

**Drift:** exactly the 6 UI-canonical values (1,240 appearances, 91.5%) + their 6 kebab/lowercase twins (115 appearances, 8.5%). Every drift value maps 1:1 mechanically. Rows with ≥1 non-canonical value: **85/754 (11.3%)**. Zero freeform values, zero near-dupes, zero semantic decisions.

**Companion structure `academicConcepts`** (object keyed by subject; inner values = concepts, governed by the locked PR-5 vocabulary, out of E1 scope):

```sql
SELECT k AS subject_key, count(*) AS lessons FROM lessons, jsonb_object_keys(metadata->'academicConcepts') k
WHERE retired_at IS NULL AND jsonb_typeof(metadata->'academicConcepts')='object'
GROUP BY k ORDER BY count(*) DESC, k;
```
| subject_key | lessons |
|---|---|
| Science | 475 |
| Social Studies | 259 |
| Literacy/ELA | 209 |
| Health | 105 |
| Math | 100 |
| Arts | 96 |

Subject keys are **already 100% canonical** (exactly the 6 UI values, zero variants) across all 675 rows.

### 5.2 social_emotional_learning — 10 distinct, 1,822 appearances, coverage 767/767 (100%)

```sql
SELECT v AS value, count(*) AS lessons FROM lessons, unnest(social_emotional_learning) v
WHERE retired_at IS NULL GROUP BY v ORDER BY count(*) DESC, v;
```
| value | lessons | | value | lessons |
|---|---|---|---|---|
| Relationship skills | 474 | | self-management | 81 |
| Self-awareness | 324 | | relationship-skills | 38 |
| Responsible decision-making | 317 | | social-awareness | 28 |
| Self-management | 309 | | self-awareness | 23 |
| Social awareness | 224 | | responsible-decision-making | 4 |

**Drift:** the 5 CASEL UI values (1,648 appearances, 90.5%) + 5 kebab twins (174, 9.5%). 1:1 mechanical. Rows with ≥1 non-canonical: **95/767 (12.4%)**. Zero semantic decisions.

### 5.3 core_competencies — 13 distinct, 1,771 appearances, coverage 767/767 (100%)

```sql
SELECT v AS value, count(*) AS lessons FROM lessons, unnest(core_competencies) v
WHERE retired_at IS NULL GROUP BY v ORDER BY count(*) DESC, v;
```
| value | lessons | | value | lessons |
|---|---|---|---|---|
| Culturally Responsive Education | 508 | | garden-skills | 65 |
| Kitchen Skills and Related Academic Content | 391 | | environmental-stewardship | 35 |
| Garden Skills and Related Academic Content | 350 | | kitchen-skills | 32 |
| Social-Emotional Intelligence | 242 | | culturally-responsive | 18 |
| Environmental and Community Stewardship | 72 | | social-justice | 13 |
| Social Justice | 39 | | social-emotional | 5 |
| Food Justice | 1 | | | |

**Drift:** the 6 UI values (1,602 appearances, 90.5%) + 6 kebab *abbreviations* (168, 9.5%) + one stray `Food Justice` (1 lesson). The kebab forms are deterministic but NOT derivable by case-folding (`environmental-stewardship` → "Environmental and Community Stewardship") — needs an explicit 6-entry mapping table, still purely mechanical. **One semantic micro-decision:** fold `Food Justice` → `Social Justice` (or drop). Rows with ≥1 non-canonical: **96/767 (12.5%)**.

### 5.4 cooking_methods — 5 distinct, 481 appearances, coverage 434/767 (56.6%)

```sql
SELECT v AS value, count(*) AS lessons FROM lessons, unnest(cooking_methods) v
WHERE retired_at IS NULL GROUP BY v ORDER BY count(*) DESC, v;
```
| value | lessons |
|---|---|
| basic-prep | 188 |
| stovetop | 175 |
| oven | 105 |
| basic-prep-only | 9 |
| no-cook | 4 |

**Drift:** the stored vocabulary is entirely kebab; the UI config values (`Basic prep only`, `Stovetop`, `Oven`) match **0 stored appearances**. Rows with ≥1 value outside the UI config: **434/434 (100%)** — the whole field lives in a different convention than its config. This currently works only because the live PROD RPC routes through a compat shim:

```sql
SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname='_match_cooking_methods';
```
```
CASE lower(x)
  WHEN 'basic prep only' THEN ARRAY['basic prep only', 'basic-prep', 'basic-prep-only']
  ELSE ARRAY[lower(x)]
END
... WHERE lower(c) = ANY(...)
```
(invoked from `search_lessons`: `_match_cooking_methods(l.cooking_methods, filter_cooking_method)`)

So the shim lowercases everything and folds the `basic-prep`/`basic-prep-only` near-dupe — **but `no-cook` (4 lessons) is unreachable from the UI's 3 filter options**: those lessons can never match the Cooking Methods filter. Real vocabulary ≈ 3 concepts + 2 fold/decide values (`basic-prep-only` → `basic-prep` is mechanical; `no-cook` is one semantic micro-decision — distinct value or fold into basic-prep). Canonicalizing the stored values would let the shim retire.

### 5.5 observances_holidays — 17 distinct, 136 appearances, coverage 124/767 (16.2%; sparse by design)

```sql
SELECT v AS value, count(*) AS lessons FROM lessons, unnest(observances_holidays) v
WHERE retired_at IS NULL GROUP BY v ORDER BY count(*) DESC, v;
```
| value | lessons | | value | lessons |
|---|---|---|---|---|
| Black History Month | 34 | | Juneteenth | 4 |
| Indigenous Peoples' Month | 26 | | Women's History Month | 4 |
| End of year celebrations | 15 | | Eid | 3 |
| Lunar New Year | 13 | | Beginning of year | 2 |
| AAPI Heritage Month | 8 | | Earth month | 2 |
| Thanksgiving | 8 | | School Food Hero Day | 2 |
| Hispanic/Latinx Heritage Month | 6 | | End of year | 1 |
| Ramadan | 6 | | New Year | 1 |
| | | | Pride | 1 |

**Drift:** rows with ≥1 value outside the 17-entry UI suggestion list: **2/124 (1.6%)** — both are `Earth month` (lowercase m) vs suggested `Earth Month`. Cleanest field in the set. Two notes for the lock decision: (a) the suggestion list itself contains the near-dupe pair `End of year` / `End of year celebrations` (both used: 1 + 15) — decide one-or-two; (b) the field is `type: 'creatable'` in the UI (reviewers can invent values) — closing it to an enum is a small product decision, not just data cleanup.

### 5.6 garden_skills — 47 distinct, 888 appearances, coverage 411/767 (53.6%), 18 singleton values

```sql
SELECT v AS value, count(*) AS lessons FROM lessons, unnest(garden_skills) v
WHERE retired_at IS NULL GROUP BY v ORDER BY count(*) DESC, v;
```
Full census (47 values):

| value | lessons | | value | lessons |
|---|---|---|---|---|
| Identifying plants | 146 | | Companion planting | 10 |
| Observing plant parts | 133 | | Mulching | 10 |
| Harvesting | 109 | | planting | 10 |
| Planting | 64 | | seed-starting | 8 |
| Composting | 57 | | watering-techniques | 6 |
| Soil preparation and care | 41 | | Pest identification | 5 |
| Watering techniques | 40 | | transplanting | 5 |
| **Stewardship tasks** | **35** | | beneficial-insect-id | 4 |
| **sensory-exploration** | **28** | | Cover cropping | 4 |
| Beneficial insect identification | 25 | | weeding | 4 |
| Seed saving | 25 | | pollinator-observation | 3 |
| Weeding | 24 | | observing-plant-parts | 2 |
| Garden planning | 23 | | pest-identification | 2 |
| Tool use and maintenance | 20 | | | |
| composting | 15 | | | |
| harvesting | 12 | | | |

Singletons (18): companion-planting, Digging, Feeding worms, Garden exploration, garden-exploration, garden-planning, Leaf collection, Measuring, mulching, Pollinator observation, preservation, Preservation, Seed starting, seed-saving, soil-preparation, Sorting, Sorting seeds, Transplanting.

**Drift:** dominant regime = the UI option **labels** (Title Case, 740 appearances ≈ 83%); kebab UI **values** = 78 appearances ≈ 9%; off-vocab = 70 appearances ≈ 8%. Rows with ≥1 value outside (UI values ∪ labels): **67/411 (16.3%)**. Off-vocab content: 2 values with real usage — `Stewardship tasks` (35) and `sensory-exploration` (28) — plus ~7 one-off strays (Digging, Feeding worms, Leaf collection, Measuring, Sorting, Sorting seeds, bare `Preservation`). One UI option (`crop-rotation`) has **zero** usage in any form. Mapping 47 → ~22-24 canonical is mostly mechanical; the add-or-fold list is ~9 entries, 2 of which matter.

### 5.7 cooking_skills — 122 distinct, 1,758 appearances, coverage 435/767 (56.7%), 49 singleton values

```sql
SELECT v AS value, count(*) AS lessons FROM lessons, unnest(cooking_skills) v
WHERE retired_at IS NULL GROUP BY v ORDER BY count(*) DESC, v;
```
Values with ≥2 lessons (73 values):

| value | n | | value | n | | value | n |
|---|---|---|---|---|---|---|---|
| Measuring (dry/liquid) | 223 | | measuring | 18 | | boiling | 5 |
| Recipe reading | 206 | | mixing | 17 | | Chiffonade | 5 |
| Mixing | 180 | | Dicing | 16 | | Oven roasting | 5 |
| Cutting Skills | 129 | | Cutting | 15 | | Roasting | 5 |
| Chopping | 113 | | Knife safety | 15 | | Steaming | 5 |
| Following directions | 88 | | Stirring | 15 | | Using scissors | 5 |
| Assembling cold dishes | 86 | | Boiling | 11 | | Cracking eggs | 4 |
| Measuring | 75 | | Rolling | 11 | | Juicing | 4 |
| Baking | 38 | | Sauteing | 10 | | Knife skills | 4 |
| Assembling | 35 | | Stovetop cooking | 9 | | Salad assembly | 4 |
| Sautéing | 35 | | Kneading | 7 | | Seasoning | 4 |
| Grating | 27 | | baking | 6 | | Stir-frying | 4 |
| Basic Skills | 26 | | Folding | 6 | | dicing | 3 |
| Cooking Techniques | 26 | | Presentation | 6 | | Dressing making | 3 |
| Mashing | 25 | | Rolling dough | 6 | | Filling | 3 |
| Assembling hot dishes | 22 | | Seasoning to taste | 6 | | Forming patties | 3 |
| chopping | 20 | | Simmering | 6 | | Frying | 3 |
| Blending | 19 | | Using mortar and pestle | 6 | | Mixing/stirring | 3 |
| following-recipes | 19 | | | | | Oven safety | 3 |
| Tasting | 19 | | | | | Peeling | 3 |

…plus (3 lessons each): slicing, Slicing, Spreading, Whisking; (2 each): Dough making, dough-making, Folding dumplings, Measuring (dry), Muddling, Oven baking, Oven use, Sauce making, Shaping dough, Spice blending, Topping.

Singletons (49): Assembling wraps, Assembly, Bread making, Cooking, Cooking rice, Creating sauces/dressings, Cutting herbs, Decorating, Dividing recipes, fermenting, Filling and folding dumplings, Filling and sealing dumplings, Filling dumplings, Filling pasta, Folding tamales, Food presentation, food-safety, Grinding, Grinding spices, Heating, Kneading dough, Making spice blends, Marinating, Menu planning, mincing, Observing cooking process, Packing jars, Pasta making, pickling, Pickling, Recipe development, Recipe writing, Rolling sushi, sauteing, Serving, Shelling, Smashing, Stovetop frying, Straining, Stuffing, Tearing, Tool identification, Tortilla making, Using blender, Using kitchen tools, Using leftovers, Various techniques, Washing vegetables, wrapping-rolling.

**Drift:** this is the concepts-style mess. The **highest-frequency values are not on the 28-option UI list at all** — `Measuring (dry/liquid)` (223), `Recipe reading` (206), `Cutting Skills` (129, a category header used as a value), `Following directions` (88), `Assembling cold dishes` (86). Only ≈24% of appearances fall inside the UI vocab (values ∪ labels); rows with ≥1 off-vocab value: **406/435 (93.3%)**. Shapes of drift: case twins (Sauteing/Sautéing/sauteing), granularity explosions (5 dumpling-filling variants; Kneading vs Kneading dough vs Shaping dough), category-headers-as-values (Basic Skills, Cooking Techniques, Cutting Skills), freeform prose (Various techniques, Using leftovers, Observing cooking process). The real concept count is plausibly ~30-40, but deciding the canonical list and the 122→canonical mapping is genuine curriculum-team work. (Matches the standing memory estimate: "123 distinct values for ~30 real concepts.")

### 5.8 main_ingredients — 230 distinct, 1,847 appearances, coverage 430/767 (56.1%), 96 singleton values

```sql
SELECT v AS value, count(*) AS lessons FROM lessons, unnest(main_ingredients) v
WHERE retired_at IS NULL GROUP BY v ORDER BY count(*) DESC, v;
```
Top of distribution (≥10 lessons):

| value | n | | value | n |
|---|---|---|---|---|
| Alliums | 192 | | Black beans | 26 |
| Wheat/flour | 108 | | Winter squash | 26 |
| Leafy greens | 92 | | Bananas | 24 |
| Root vegetables | 86 | | Black-eyed peas | 22 |
| Various spices | 82 | | Dairy | 21 |
| Nightshades | 63 | | Cruciferous | 20 |
| Berries | 55 | | Cucumbers | 19 |
| Corn/masa | 51 | | Oats | 19 |
| Cilantro | 48 | | Chickpeas | 17 |
| Herbs & Aromatics | 48 | | Yogurt | 17 |
| Potatoes | 38 | | Fruits | 16 |
| Rice | 36 | | Honey | 16 |
| Ginger | 32 | | Bell peppers | 15 |
| Parsley | 28 | | Carrots | 15 |
| Eggs | 27 | | Apples | 14 |
| Tropical fruits | 27 | | Mint | 14 |
| | | | Cheese | 13 |
| | | | Cinnamon | 12 |
| | | | Pinto beans | 12 |
| | | | Seeds | 12 |
| | | | Cabbage | 11 |
| | | | Mushrooms | 11 |
| | | | Butter | 10 |
| | | | Sweet potatoes | 10 |

Mid-tail (2–9 lessons, 110 values — full list): Milk 9, Olive oil 9, Tomatoes 9, Coconut milk 8, Lemon 8, Sugar 8, alliums 7, Avocado 7, Coconut 7, Oranges 7, Pumpkin seeds 7, berries 6, Citrus 6, Lime 6, Sunflower seeds 6, Tofu 6, Basil 5, Chives 5, corn-masa 5, Dried fruit 5, Grains & Starches 5, Green onions 5, leafy-greens 5, Legumes 5, Peppers 5, root-vegetables 5, Agar agar 4, carrots 4, Celery 4, Citrus fruits 4, Dairy (milk) 4, Dates 4, Dill 4, Dried fruits 4, Nuts/seeds 4, Plantains 4, Raisins 4, Scallions 4, wheat-flour 4, apples 3, beans 3, Chocolate 3, cilantro 3, Coconut flakes 3, Cranberries 3, cucumbers 3, Garlic 3, ginger 3, Lentils 3, Maple syrup 3, nightshades 3, Pears 3, Pigeon peas (gandules) 3, Pita bread 3, Seaweed 3, Soy sauce 3, Vanilla 3, Beans 2, Broccoli 2, Chia seeds 2, Cocoa 2, Coconut oil 2, Cucumber 2, Dried cherries 2, Dried cranberries 2, Granola 2, Green beans 2, Herbs 2, Lemons 2, Noodles 2, Nori 2, Nori (seaweed) 2, Nuts 2, Nuts/Seeds 2, oats 2, Oil 2, Parmesan 2, pasta 2, Peppermint oil 2, potatoes 2, Pumpkin puree 2, Rice noodles 2, Rose hips 2, Rosemary 2, Sage 2, Salt 2, Shea butter 2, Soybeans 2, Spices 2, Sprouts 2, Sunflower butter 2, Tahini 2, Thyme 2, Tortillas 2.

Singletons (96): Almonds, Applesauce, Avocados, bananas, Beet juice, beets, Beets, Beyond Sausage (pea protein), Bok choy, Bread, Buttermilk, Carrot, Cauliflower, Cereal/grains, cheese, Cocoa powder, Coconut sugar, Condensed milk, Cumin, Dairy (cheese, sour cream), Dairy (cheese, yogurt, sour cream), Dried bananas, Edible flower petals, Eggplant, Fennel, Flaxseed, Fruit, Granola with fruit and nuts, Grape leaves, Grapes, Greek Yogurt, Green bell pepper, Green onion, herbs-aromatics, Hibiscus, Hummus, Ice cream, Jalapeno, Jam, Jellies, Jelly, Jicama, Kidney beans, Kimchi, Kiwis, Lavender, Lettuce, Limes, Mahleb, Mango, Marshmallows, Molasses, Mozzarella cheese, Nutmeg, Oat milk, Oregano, Parmesan cheese, Peaches, Peanut butter, Peas, Pepita seeds, peppers, Pineapple, Pita, Pomegranate, Pomegranate Seeds, Popcorn, Popping corn, Pumpkin, Radish, Red beans, rice, Rice paper, Rice vinegar, Rose petals, Rosehips, seeds, Semolina flour, Sesame oil, Snow peas, Sour Cream, Soy Sauce, Squash, stone-fruits, Strawberries, Summer squash, Sun butter, Sunbutter, Tea, Various seeds, Vegetables, Water, Whole wheat flour, Whole wheat wraps, winter-squash, yogurt.

Rows with ≥1 value outside the 45-option UI vocab (values ∪ labels):

```sql
SELECT count(*) AS rows_nonempty,
  count(*) FILTER (WHERE EXISTS (SELECT 1 FROM unnest(main_ingredients) x
    WHERE NOT (x = ANY(ARRAY[/* 44 kebab values ∪ 44 labels from METADATA_CONFIGS.mainIngredients */])))) AS rows_with_noncanonical
FROM lessons WHERE retired_at IS NULL AND main_ingredients IS NOT NULL AND array_length(main_ingredients,1) > 0;
-- → rows_nonempty: 430, rows_with_noncanonical: 349
```
**349/430 (81.2%).**

**Drift:** the messiest field, and the only one with an unresolved *design* question baked into the data: the UI vocab is **category-level** (alliums, leafy-greens, stone-fruits) while the dominant tagging practice mixes category terms (Alliums 192) with **specific foods** (Cilantro 48, Garlic 3, Green onions 5, Scallions 4 — all of which are also "Alliums"/"Herbs"), pantry staples (Salt, Sugar, Oil, Water), brand/prose entries (Beyond Sausage (pea protein), Granola with fruit and nuts, Dairy (cheese, yogurt, sour cream)), and case/plural twins (Cucumber/Cucumbers, Lemon/Lemons, Sunbutter/Sun butter, Rosehips/Rose hips, Soy sauce/Soy Sauce, Nuts/seeds vs Nuts/Seeds). Before any enum can exist, someone must decide the level of abstraction (category vs ingredient vs both-tiered). That is a worksheet + design decision, the largest of the 8.

### Drift-stats verification query (fields 1–5, 7; verbatim)

```sql
SELECT f.field, count(*) AS rows_nonempty,
  count(*) FILTER (WHERE EXISTS (SELECT 1 FROM unnest(f.col) x WHERE NOT (x = ANY(f.canon)))) AS rows_with_noncanonical
FROM lessons l, LATERAL (VALUES
  ('academic_integration', l.academic_integration, ARRAY['Math','Science','Literacy/ELA','Social Studies','Health','Arts']),
  ('social_emotional_learning', l.social_emotional_learning, ARRAY['Relationship skills','Self-awareness','Responsible decision-making','Self-management','Social awareness']),
  ('core_competencies', l.core_competencies, ARRAY['Environmental and Community Stewardship','Social Justice','Social-Emotional Intelligence','Garden Skills and Related Academic Content','Kitchen Skills and Related Academic Content','Culturally Responsive Education']),
  ('cooking_methods', l.cooking_methods, ARRAY['Basic prep only','Stovetop','Oven']),
  ('observances_holidays', l.observances_holidays, ARRAY['AAPI Heritage Month','Black History Month','Hispanic/Latinx Heritage Month','Indigenous Peoples'' Month','Women''s History Month','Pride','Earth Month','Thanksgiving','Lunar New Year','New Year','Ramadan','Eid','Juneteenth','School Food Hero Day','Beginning of year','End of year','End of year celebrations']),
  ('garden_skills', l.garden_skills, ARRAY[/* 22 kebab values ∪ 22 labels from METADATA_CONFIGS.gardenSkills */]),
  ('cooking_skills', l.cooking_skills, ARRAY[/* 27 kebab values ∪ 27 labels from METADATA_CONFIGS.cookingSkills */])
) AS f(field, col, canon)
WHERE l.retired_at IS NULL AND f.col IS NOT NULL AND array_length(f.col,1) > 0
GROUP BY f.field ORDER BY f.field;
```
| field | rows_nonempty | rows_with_noncanonical |
|---|---|---|
| academic_integration | 754 | 85 |
| cooking_methods | 434 | 434 |
| cooking_skills | 435 | 406 |
| core_competencies | 767 | 96 |
| garden_skills | 411 | 67 |
| observances_holidays | 124 | 2 |
| social_emotional_learning | 767 | 95 |

Singleton counts:
```sql
SELECT 'cooking_skills' AS field, count(*) AS singleton_values FROM (SELECT v FROM lessons, unnest(cooking_skills) v WHERE retired_at IS NULL GROUP BY v HAVING count(*)=1) t
UNION ALL SELECT 'garden_skills', count(*) FROM (SELECT v FROM lessons, unnest(garden_skills) v WHERE retired_at IS NULL GROUP BY v HAVING count(*)=1) t
UNION ALL SELECT 'main_ingredients', count(*) FROM (SELECT v FROM lessons, unnest(main_ingredients) v WHERE retired_at IS NULL GROUP BY v HAVING count(*)=1) t;
-- → cooking_skills: 49 | garden_skills: 18 | main_ingredients: 96
```

Distinct-count summary:
```sql
SELECT 'cooking_skills' AS field, count(DISTINCT v) AS distinct_vals, count(*) AS appearances FROM lessons, unnest(cooking_skills) v WHERE retired_at IS NULL
UNION ALL SELECT 'garden_skills', count(DISTINCT v), count(*) FROM lessons, unnest(garden_skills) v WHERE retired_at IS NULL
UNION ALL SELECT 'social_emotional_learning', count(DISTINCT v), count(*) FROM lessons, unnest(social_emotional_learning) v WHERE retired_at IS NULL
UNION ALL SELECT 'core_competencies', count(DISTINCT v), count(*) FROM lessons, unnest(core_competencies) v WHERE retired_at IS NULL
UNION ALL SELECT 'cooking_methods', count(DISTINCT v), count(*) FROM lessons, unnest(cooking_methods) v WHERE retired_at IS NULL
UNION ALL SELECT 'main_ingredients', count(DISTINCT v), count(*) FROM lessons, unnest(main_ingredients) v WHERE retired_at IS NULL
UNION ALL SELECT 'observances_holidays', count(DISTINCT v), count(*) FROM lessons, unnest(observances_holidays) v WHERE retired_at IS NULL
UNION ALL SELECT 'academic_integration', count(DISTINCT v), count(*) FROM lessons, unnest(academic_integration) v WHERE retired_at IS NULL
ORDER BY 1;
```
| field | distinct | appearances |
|---|---|---|
| academic_integration | 12 | 1,355 |
| cooking_methods | 5 | 481 |
| cooking_skills | 122 | 1,758 |
| core_competencies | 13 | 1,771 |
| garden_skills | 47 | 888 |
| main_ingredients | 230 | 1,847 |
| observances_holidays | 17 | 136 |
| social_emotional_learning | 10 | 1,822 |

## 6. Per-field drift summary

| Field | Distinct | Target canon size | Coverage (rows) | Rows w/ ≥1 off-canon value | Drift shape | Semantic decisions needed | Tier |
|---|---|---|---|---|---|---|---|
| academic_integration | 12 | 6 | 754/767 (98%) | 85 (11%) | 6 kebab twins only | 0 | **A — enum-enforce now** |
| academicConcepts keys | 6 | 6 | 675/767 (88%) | 0 | none | 0 | **A — already clean** |
| social_emotional_learning | 10 | 5 | 767/767 (100%) | 95 (12%) | 5 kebab twins only | 0 | **A — enum-enforce now** |
| core_competencies | 13 | 6 | 767/767 (100%) | 96 (13%) | 6 kebab abbreviations + 1 stray | 1 (`Food Justice`, 1 row) | **A — enum-enforce now** |
| cooking_methods | 5 | 3–4 | 434/767 (57%) | 434 vs UI config (100%); 13 vs de-facto kebab canon | whole field kebab; RPC shim papers over it; `no-cook` unreachable from UI | 1 (`no-cook`: keep or fold) | **A — enum-enforce now** (+ retire shim) |
| observances_holidays | 17 | ~16–17 | 124/767 (16%) | 2 (2%) | 1 case variant | 1–2 (`End of year` pair; creatable→closed?) | **A/B — 10-min decision list** |
| garden_skills | 47 | ~22–24 | 411/767 (54%) | 67 (16%) | label-vs-kebab dual regime + 2 real new values + 7 strays | ~9 add-or-fold (2 with mass: Stewardship tasks 35, sensory-exploration 28) | **B — light worksheet (hour-scale)** |
| cooking_skills | 122 | ~30–40 (TBD) | 435/767 (57%) | 406 (93%) | top values off-list; category-headers-as-values; granularity explosion; 49 singletons | full canonical-list design | **C — real worksheet** |
| main_ingredients | 230 | TBD (level-of-abstraction undecided) | 430/767 (56%) | 349 (81%) | category vs specific-food mix; prose/brand entries; case/plural twins; 96 singletons | full worksheet + abstraction-level design decision | **C — real worksheet + design call** |

## 7. What this implies for OQ2

OQ2's options: (a) complete Stage-1 worksheets for all smaller fields, then one all-fields re-tag; (b) re-tag only the already-locked vocab fields now, second pass later; (c) hybrid.

The census says the worksheet burden is **not spread across 8 fields — it is concentrated in 2** (cooking_skills, main_ingredients), with garden_skills as a light third. Five of the eight need no worksheet at all: their full value lists fit on one screen (5–17 values), ~90%+ of data already matches a single canonical form, and the open decisions total **three single-value judgment calls** (`Food Justice` → fold?, `no-cook` → keep or fold?, `End of year` vs `End of year celebrations`) plus one product call (close the creatable observances field or not). Those could be locked inside the Session-2 walkthrough itself in ~15 minutes, which would let the re-tag cover 6 locked fields + 5 newly-locked small fields (+ garden_skills if the ~9-entry add-or-fold list is also walked through) in one pass — leaving only cooking_skills and main_ingredients for a real Stage-1 worksheet cycle and either a deferred second-pass re-tag or inclusion if the worksheets land in time.

Pure option (a) makes the whole re-tag wait on the two genuinely hard worksheets; pure option (b) leaves five nearly-free enum locks unbanked. The numbers favor (c): lock the cheap five (or six) in-session, worksheet the hard two.

Secondary findings the PR-6 plan should absorb:
1. **Live corpus = 767, not ~751** (`retired_at IS NULL`; 788 total − 21 `import:*` retirements; zero inserts since 2026-04-27). Update the plan's row-count references.
2. **Re-tag apply must dual-write** columns + metadata JSONB (or formally derive one from the other). Today they agree on value-sets everywhere except 12 row-field pairs (§4 table — useful spot-check seeds).
3. **Key names/shapes are NOT a problem for these 8 fields** — single camelCase key each, uniform array shape. The three-regimes hazard here is purely value-convention (kebab vs Title Case), concentrated in the ~105 submission-era rows. (The `gradeLevel`/`gradeLevels` split is real but belongs to a different field.)
4. **`_match_cooking_methods` shim retirement** is a natural PR-6 follow-on once cooking_methods is canonicalized; the 4 `no-cook` lessons are currently unreachable through the UI filter.
5. **Whichever canonical form is chosen (kebab values vs Title-Case labels) must be chosen per-field deliberately**: garden/cooking skills + ingredients are stored ~85% in *label* form while the UI configs define kebab *values*; SEL/competencies/subjects are stored ~90% in label form too; cooking_methods is stored 100% in kebab. There is no single corpus-wide convention to inherit.
