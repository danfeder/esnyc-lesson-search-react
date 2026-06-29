# Search Eval — Gold Set Provenance & Build Spec (S0.2)

**Status:** product-owner-approved 2026-06-18. This doc is the authoritative spec for building `scripts/search-eval/queries.json`. Provenance matters (no usage logs ⇒ this doc is the defense against author bias). Scoring model = design §4 "Scoring families".

**Environment:** all gold derived from the **TEST** DB (`rxgajgmphciuaqzvwmox`), retired rows excluded (`retired_at IS NULL`). Searchable corpus = **745**. Pin a snapshot date (2026-06-18) + the counts below into a `_snapshot` header in queries.json.

## Build rules (for the queries.json build agent)
1. For each FROZEN query, run its **oracle SQL** against TEST (read-only) to get the current `{lesson_id, title}` pool.
2. **Cluster** the pool rows: group by NORMALIZED title = lowercased, trimmed, collapse internal whitespace, drop the vertical-tab char ``, map `&`→`and`, strip a trailing ` (1)`/` (2)` dup-suffix. Rows with the same normalized title (or in an explicit twin-pair below) form ONE cluster (twins → counted once).
3. **Assign** each cluster: `primary` if its normalized title is in the query's PRIMARY list, `acceptable` if in the ACCEPTABLE list, else **exclude** from gold. Match titles case-insensitively after normalization.
4. Emit each query entry per the schema in impl S0.1/S0.2. Each `*Clusters` value is `string[][]` (array of clusters, each an array of lesson_ids).
5. For PREDICATE / G3-ISOLATION / CONTROL / SENTINEL queries, use the SQL/spec given; isolation/control counts are re-measured live and pinned.
6. Tolerate zero-match titles by logging them (don't silently drop) — a primary title that returns no row is a build error to report, not swallow.

## Explicit twin-pairs (cluster these together even if normalization misses them)
- November Will It Decompose, Part II  ↔  November Will It Decompose, Part II (1)
- Bees & Blueberries  ↔  Bees and Blueberries
- Three Sisters and Companion Planting: a Seed Study (the two rows)
- Three Sisters Puppet Show (the two rows)
- Three Sisters Tacos  ↔  Three Sisters Tacos, 4th-PS 311 — NOT twins (distinct lessons); keep separate
- Compost Relay & Stew (the two rows)
- Worm Breakfast Recipe  ↔  Worm Breakfast
- Food Preservation (the two rows: populated + empty-summary)
- Butterflies (the two rows)

---

## FROZEN queries

### q05 `decay`, q06 `rotting food`, q07 `decomposition` — SHARED gold, scoring=frozen-recall (recall@10 + top1 + mrr vs PRIMARY)
Oracle SQL:
```sql
SELECT lesson_id, title FROM public.lessons WHERE retired_at IS NULL
AND (title ILIKE '%decompos%' OR summary ILIKE '%decompos%'
     OR EXISTS(SELECT 1 FROM jsonb_each(metadata->'academicConcepts') kv WHERE kv.value::text ILIKE '%decompos%'));
```
PRIMARY titles: `2nd Grade Decomposition Experiment Part 1`, `2nd Grade Decomposition Experiment Part 2`, `Decomposition Experiment`, `Decomposition Experiment Part 2`, `November Will It Decompose, Part II`, `Roly Poly Lunch`, `What's for Dinner?: Decomposition in the Garden`.
ACCEPTABLE titles: `Soil Is Where Food Begins!`, `Worm Breakfast Recipe`, `Roly Polys`, `Worm Study`, `Worm Structure and Function`, `Day in the Life of a Worm`.
(All compost/food-web/mushroom/garden-chore/salsa/noise rows → exclude.)
q06 also: `maxTotalCount` guard — pin live total_count of `rotting food` (~567 today) and set guard at that level (q06's job: a fix must surface decomposition lessons, NOT just flood).

### q13 `three sisters garden` — scoring=frozen-precision (precision@10 [primary+acceptable] + top1/mrr vs PRIMARY)
Oracle SQL:
```sql
SELECT lesson_id, title FROM public.lessons WHERE retired_at IS NULL
AND (title ILIKE '%three sister%' OR title ILIKE '%3 sister%'
     OR 'Three Sisters traditions' = ANY(cultural_heritage) OR content_text ILIKE '%three sisters%');
```
PRIMARY: every title containing "Three Sister(s)"/"3 Sister(s)"/"Three Sister Arepas" (the ~20 title rows) PLUS `BIODIVERSITY`.
ACCEPTABLE: `Lenape Farming Techniques`, `The Lenape Farmers and Skits`, `Thanksgiving in the Garden`, `Squanto's Ad Agency`, `Elementary Haudenosaunee Address Lesson`.
EXCLUDE: `Pesticides`, `Bean Dips`, `Staple Foods: Amaranth`.

### q15 `pollinators` — scoring=frozen-precision
Oracle SQL:
```sql
SELECT lesson_id, title FROM public.lessons WHERE retired_at IS NULL
AND (EXISTS(SELECT 1 FROM jsonb_each(metadata->'academicConcepts') kv WHERE kv.value::text ILIKE '%pollinat%')
     OR title ILIKE '%pollinat%' OR title ILIKE '%butterfl%' OR title ILIKE '%monarch%'
     OR title ILIKE '%bee %' OR title ILIKE '%bees%' OR title ILIKE '%honeybee%');
```
PRIMARY: `Bees & Blueberries`, `Bees & Pollination`, `Bees and Pollination`, `Elementary Introduction to Pollination`, `Introduction to Pollination`, `Pollinators, Our Garden, and Us`, `The Honeybee Man`, `Bats & Banana Pancakes`, `Edmond Albius and the Story of Vanilla`.
ACCEPTABLE: `Butterflies`, `Butterfly Release Party`, `Monarch Migration`, `The Mighty Monarch`, `The Very Hungry Pollinator`, `Bee Habitat`, `Flower Anatomy & Broccoli Salad`, `Beetles, Pests & Pollinators`, `Insects: Pests, Pollinators, & Proteins`, `Flies & Fruit`.
EXCLUDE everything else (garden-community lessons matched on "bee"/"bees", `Farm Workers & Pesticides`, `Seed Saving`, `Biodiversity & Monoculture`, `Blooming Trees & Fruit Salad`, `Guerilla Gardening for Birds`, `Insect Parts`, `Gardening & The Environment`, `Pesticides`, `Plant Life Cycle`).

### q14 `knife skills` — scoring=frozen-recall (teaching-only)
Oracle SQL:
```sql
SELECT lesson_id, title FROM public.lessons WHERE retired_at IS NULL
AND (title ILIKE '%knife%' OR summary ILIKE '%knife%'
     OR EXISTS(SELECT 1 FROM unnest(cooking_skills) cs WHERE cs ILIKE '%knife%'));
```
PRIMARY: `Introduction to Knife Skills`, `Pico de Gallo (Knife Skills)`, `Summer Veg Saute (Knife Cuts Part 2)`, `Eat the Rainbow: White`, `Eat the Rainbow: Yellow`, `Eat the Rainbow: Green`, `Eat the Rainbow: Rainbow Finale!`, `Potato Leek Soup`.
ACCEPTABLE: `Beet Ketchup`, `Summer Veggies/Orientation`.
EXCLUDE: all other cooking_skills-knife-tagged recipes (Aloo Gobi, Callaloo, Panzanella, Root Vegetable Curry, Shepherd Salad, Sweet and Sour Roots, Vegetable Whole Wheat Pasta, Harvest Soup, Family Meal Project, Fruit Kabobs, Mushroom Khao Soi, Salsa Toast(s), Expert's Guide: Harvesting, Food Preservation in the Kitchen, Callaloo variants).

### q16 `photosynthesis` — scoring=frozen-recall
Oracle SQL:
```sql
SELECT lesson_id, title FROM public.lessons WHERE retired_at IS NULL
AND (title ILIKE '%photosynth%' OR summary ILIKE '%photosynth%'
     OR EXISTS(SELECT 1 FROM jsonb_each(metadata->'academicConcepts') kv WHERE kv.value::text ILIKE '%photosynth%'));
```
PRIMARY: `Photosynthesis`, `Photosynthesis: Light Experiment Part 1`, `Photosynthesis: Light Experiment Part 2`.
ACCEPTABLE: `Food Web`, `Food Webs`.
EXCLUDE: `Sun Study`, `Leaf Study`, `Sunprints`, `Observing Indoor Edible Sprouts`, `Green Smoothie & Black Bean Brownies`.

### q08 `pickling` — scoring=frozen-recall (small pool)
Oracle SQL:
```sql
SELECT lesson_id, title FROM public.lessons WHERE retired_at IS NULL
AND (title ILIKE '%pickl%' OR title ILIKE '%ferment%' OR title ILIKE '%preserv%' OR title ILIKE '%kimchi%' OR title ILIKE '%sauerkraut%'
     OR summary ILIKE '%pickl%' OR summary ILIKE '%ferment%' OR summary ILIKE '%preserv%'
     OR EXISTS(SELECT 1 FROM unnest(cooking_methods) cm WHERE cm ILIKE '%ferment%' OR cm ILIKE '%pickl%' OR cm ILIKE '%preserv%'));
```
PRIMARY: `Daikon Pickles & Furikake`, `Pickle Lesson with Ms.Ingrit`, `Food Preservation in the Kitchen`.
ACCEPTABLE: `Food Preservation`, `Jam and Jelly: Fruit Preservation`, `Sandor Katz: Food Hero`, `Colonial Foods of New York`, `Bud Not Buddy/ Jam`.
EXCLUDE: `Kimchi Fried Rice`, `Whole Wheat Pizza`, `Monarch Migration`, `Soil Erosion`, `Three Sisters Succotash`.
(Decision: keep query name `pickling`; preservation-adjacent → acceptable tier.)

### q01 `compost lesson for 3rd grade` — scoring=frozen-recall, G2 grade-routed
Oracle SQL (grade-3 compost):
```sql
SELECT lesson_id, title FROM public.lessons WHERE retired_at IS NULL AND '3' = ANY(grade_levels)
AND (title ILIKE '%compost%' OR summary ILIKE '%compost%');
```
PRIMARY: `All About Compost`, `Compost Relay`, `Compost Relay & Stew`, `Summer @ 109: Worms & Compost`, `Worms and Compost`, `Trash Masters`.
EXCLUDE: `PS 109 Garden Jobs, 10/31-11/2, Plan A`.
G2 handling: `normalizedCall` = `{ search_query: "compost", filter_grade_levels: ["3"] }`. `maxTotalCount` guard — pin live total_count of raw `compost lesson for 3rd grade` (~744) as the baseline explosion marker; the S1 fix must drop it far below.

### q21 `compost` — scoring=frozen-precision (single-term control)
Oracle SQL:
```sql
SELECT lesson_id, title FROM public.lessons WHERE retired_at IS NULL
AND (title ILIKE '%compost%' OR summary ILIKE '%compost%');
```
PRIMARY: `All About Compost`, `Compost`, `Compost Relay`, `Compost Relay & Stew`, `Expert's Guide to Gardening: Compost`, `Summer @ 109: Worms & Compost`, `Worms and Compost`.
ACCEPTABLE: `Garden Tasks`, `Leaf Collecting`, `Soil Is Where Food Begins!`, `Worm Breakfast Recipe`, `Middle School Garden Tasks Lesson`, `Seasons/ Middle School Garden Tasks`.
`maxTotalCount` guard — pin live total_count of `compost` (~178); single-term compost must stay tight.

---

## G3-ISOLATION queries (scoring=g3-isolation: isolationHits@50 + firstRankOf + ranksOf for rank-movement; top-10 is secondary)
Isolation set = lessons carrying the tag but with ZERO lexical mention of the phrase in title/summary/content (only these move purely from typed-array indexing). Re-derive + pin the ids and counts. HUMAN-AUDIT note: tags are provenance, audited as relevance truth.

### q10 `responsible decision-making` (anchor SEL probe; baseline today 5/10 tagged in top-10)
```sql
SELECT lesson_id, title FROM public.lessons WHERE retired_at IS NULL
AND 'Responsible decision-making' = ANY(social_emotional_learning)
AND lower(coalesce(title,'')||' '||coalesce(summary,'')||' '||coalesce(content_text,'')) NOT LIKE '%responsible decision%';
```
(count ≈ 29; pin exact.)

### q11 `self management skills` (confounded today 9/10; isolation is the clean signal)
```sql
SELECT lesson_id, title FROM public.lessons WHERE retired_at IS NULL
AND 'Self-management' = ANY(social_emotional_learning)
AND lower(coalesce(title,'')||' '||coalesce(summary,'')||' '||coalesce(content_text,'')) NOT LIKE '%self-management%'
AND lower(coalesce(title,'')||' '||coalesce(summary,'')||' '||coalesce(content_text,'')) NOT LIKE '%self management%';
```
(count ≈ 42; pin exact.)

### q27 `social justice` (CC probe; saturated 10/10 lexically today; isolation = clean "would indexing CC help")
```sql
SELECT lesson_id, title FROM public.lessons WHERE retired_at IS NULL
AND 'Social Justice' = ANY(core_competencies)
AND lower(coalesce(title,'')||' '||coalesce(summary,'')||' '||coalesce(content_text,'')) NOT LIKE '%justice%';
```
(count ≈ 25; pin exact.) Add `maxTotalCount` guard (~653 today, over-broad).

### q31 `making good choices` (scoring=g3-isolation, LABELED combined G1+G3 — needs synonym bridge AND indexing; do NOT use to prove indexing alone)
Measurement set = same as q10 RDM isolation set.

---

## PREDICATE queries (scoring=predicate: evaluate the SQL predicate over the live top-10; pin sampled FP/FN at snapshot)
- q02 `garden lessons for kindergarten` — normalizedCall `{search_query:"garden", filter_grade_levels:["K"]}`; predicate: ≥7/10 of top-10 have `garden` in title/summary OR `Garden Skills` core_competency; maxTotalCount guard.
- q03 `worm composting for 2nd graders` — normalizedCall `{search_query:"worm composting", filter_grade_levels:["2"]}`; predicate: ≥7/10 top-10 about worms/compost (title/summary ILIKE worm|compost); maxTotalCount ~25.
- q04 `a lesson about seeds for first grade` — normalizedCall `{search_query:"seeds", filter_grade_levels:["1"]}`; predicate: ≥7/10 top-10 seeds (title/summary ILIKE seed).
- q09 `bugs that pollinate flowers` — CONTROL (must stay ≥8/10 pollinator-themed = in q15 primary∪acceptable). Not a G1 target.
- q12 `teamwork and cooperation` — scoring=frozen-recall, SMALL gold. Oracle: `SELECT lesson_id,title FROM lessons WHERE retired_at IS NULL AND (title ILIKE '%relay%' OR title ILIKE '%olympic%' OR title ILIKE '%team%' OR title ILIKE '%together%' OR title ILIKE '%community%' OR summary ILIKE '%work together%' OR summary ILIKE '%as a team%' OR summary ILIKE '%cooperat%' OR summary ILIKE '%collaborat%' OR summary ILIKE '%partner%')`. Build agent: surface the pool to the SUPERVISOR for a quick primary pick (genuinely collaborative-by-design lessons, e.g. Compost Relay, Plant Part Olympics) — do NOT auto-freeze; this is the one residual relevance call.
- q17 `seed saving` — predicate: ≥7/10 top-10 about seed saving (title/summary ILIKE 'seed' AND (ILIKE 'sav' OR 'collect' OR 'harvest')).
- q18 `taste test` — predicate: ≥7/10 top-10 tasting (title/summary ILIKE 'tast').
- q19 `pumpkin` — predicate: ≥7/10 top-10 pumpkin (title/summary/main_ingredients ILIKE 'pumpkin').
- q20 `cooking with tomatoes` — predicate: ≥6/10 top-10 tomato cooking (title/summary/main_ingredients ILIKE 'tomato').
- q24 `tomato` — predicate control: ≥6/10 top-10 tomato (title/summary/main_ingredients ILIKE 'tomato').
- q25 `salad` — predicate control: ≥6/10 top-10 salad (title/summary ILIKE 'salad').
- q26 `herbs` — predicate control: ≥6/10 top-10 herb(s) (title/summary/main_ingredients ILIKE 'herb' OR 'basil' OR 'mint' OR 'cilantro').
- q28 `mexican food` — predicate: ≥6/10 top-10 carry Mexican/Latin American `cultural_heritage` OR a Mexican-dish title; maxTotalCount guard. (cuisine/culture coverage.)
- q29 `apple` — predicate control: ≥6/10 top-10 apple (title/summary/main_ingredients ILIKE 'apple'); maxTotalCount sanity.
- q30 `food waste` — predicate: ≥6/10 top-10 about compost/decomposition/food-waste (title/summary ILIKE 'compost|decompos|food waste|food scrap|recycl').
- q36 `food waste decay` — predicate: >=7/10 top-10 about compost/decomposition/food-waste (title/summary ILIKE 'compost|decompos|food waste|food scrap|recycl'). maxTotalCount=100 (post-C41 flood-collapse target). C41 multi-term probe; user-confirmed 2026-06-29.
- q37 `food scraps decomposition` — predicate: >=7/10 top-10 about compost/decomposition/food-waste. maxTotalCount=100. C41 multi-term probe; user-confirmed 2026-06-29.
- q38 `worm compost food waste` — predicate: >=7/10 top-10 about worm/vermicompost/compost/food-waste. maxTotalCount=90. C41 multi-term probe; user-confirmed 2026-06-29.
- q40 `decompasition food waste` — predicate: >=4/10 (lenient) top-10 about compost/decomposition/food-waste. maxTotalCount=100. C41 typo recall-cliff canary (PR-D trigger if unmet); user-confirmed 2026-06-29.
- q41 `decay of food` — predicate: >=6/10 top-10 about compost/decomposition/food-waste (title/summary ILIKE 'compost|decompos|food waste|food scrap|recycl'). maxTotalCount=100. C41 stop-word-middle probe ('of' reaches SQL, dropped via numnode); user-confirmed 2026-06-29 (revised from 'compost for the garden' per GATE-3).

## CONTROL / SENTINEL
- q22 `compost worms soil` — scoring=SENTINEL (EXCLUDED from quality score). Pin today's top-10 lesson_ids as `snapshot.topIds` + total_count (~278). Report jaccard(current top-10, snapshot) + total_count delta; alarm if jaccard<0.8 or count outside ±10%.
- q23 `garden` — scoring=control-maxcount. Pin total_count (~586); maxTotalCount guard ~600 (catches accidental widening; OR→AND deferred so `garden` is expected to stay broad).

## ROBUSTNESS PACK
- q32 `compost lesson for third graders` — G2 grade-router variant of q01 (word "third graders"); normalizedCall `{search_query:"compost", filter_grade_levels:["3"]}`; same PRIMARY gold as q01; tests router on spelled-out ordinal.
- q33 `seeds grades K-2` — G2 grade-range variant; normalizedCall `{search_query:"seeds", filter_grade_levels:["K","1","2"]}`; predicate ≥7/10 seeds.
- q34 `decompasition` (typo) — scoring=frozen-recall vs the q05-07 decomposition PRIMARY; tests typo/synonym expansion. Pin baseline behavior.
- q35 `kimchi` — predicate: ≥5/10 top-10 about kimchi/Korean/fermentation (title/summary ILIKE 'kimchi' OR cultural_heritage Korean); extra-cuisine robustness.
