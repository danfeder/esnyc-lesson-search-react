# OQ6 evidence — v3 baseline failure gallery + eval/QA protocol sketches

- **Item:** E4 (impl-plan work-list item 4; feeds design OQ6 "Eval / QA spot-check protocol")
- **Date:** 2026-06-11
- **v3 codebase:** `/Users/danfeder/cCode/taggingv3/` (sibling of this repo under `/Users/danfeder/cCode/`)
- **v3 outputs inspected:** `taggingv3/tagged_output/final/consolidated_lessons.json` (831 entries), `taggingv3/tagged_output/batches/` (raw batch JSONs, 864 lessons pre-dedup), `taggingv3/tagged_output/tracking/confidence_analysis.json`
- **Database:** PROD `jxlxtzkmicfhchkhiojz` via `mcp__supabase-remote__execute_sql` (SELECT-only). All lesson bodies read from `lessons.content_text`; no Google Doc fetches.
- **Goal:** convert "v3 quality was mediocre" (user calibration 2026-05-13) into specific, citable failure examples, and sketch 2-3 candidate eval/QA protocols with a concrete "beats v3" definition.

---

## 1. Where taggingv3 lives and what it actually enforced

The exploration doc names the path verbatim (line 8): *"Anthropic SDK + Pydantic via Python adapter from `/Users/danfeder/cCode/taggingv3/gpt_tagger/`"*. Confirmed on disk: the pipeline is `gpt_tagger/` (lesson_processor.py, prompt_builder.py, models.py, validator.py, batch infrastructure, plus a tell-tale archaeology layer of one-off patches: `fix_low_confidence_lessons.py`, `fix_medium_confidence_lessons.py`, `fix_medium_confidence_lessons_v2.py`, `fix_flagged_lessons.py`, `fix_remaining_flagged.py`, `fix_worm_breakfast.py`).

### 1a. Enum enforcement: 3 of 17 fields, confirmed at source

`gpt_tagger/models.py` — the only `Literal`-constrained (generation-rejecting) fields:

- `models.py:41` — `gradeLevel: List[Literal["3K", "PK", "K", "1", "2", "3", "4", "5", "6", "7", "8", "High School"]]`
- `models.py:45` — `locationRequirements: List[Literal["Indoor", "Outdoor", "Both"]]`
- `models.py:51-55` — `lessonFormat: Literal["Standalone", "Multi-session unit", ...]`

`thematicCategories` and `socialEmotionalLearning` get post-hoc `field_validator` checks (`models.py:61-83`); everything else — `cookingSkills`, `gardenSkills`, `cookingMethods`, `mainIngredients`, `culturalHeritage`, `seasonTiming`, `academicIntegration`, `coreCompetencies` — is free `List[str]`.

Result at corpus scale (computed from `consolidated_lessons.json`):

| field | distinct values in v3 output | prompt's stated vocab |
|---|---|---|
| cookingSkills | **114** | 5 ("Basic Skills, Cutting Skills, Cooking Techniques, Advanced Skills, Presentation" — `prompt_builder.py:129-130`) |
| culturalHeritage | 66 | examples-only guidance |
| gardenSkills | 31 | 16 listed (`prompt_builder.py:127`) |
| seasonTiming | 8 | — |
| cookingMethods | 7 (incl. `"Stovetop (sautéing, boiling, simmering)"` — a copy-paste of the prompt's parenthetical) | 4 |

The cookingSkills field failed in **both directions**: the model usually ignored the 5-value vocab and invented values ("Rolling sushi", "Folding tamales", "Various techniques"); when it *did* use the listed values they are useless category headers ("Basic Skills", "Cutting Skills" — see 3 Sisters Tacos in §3).

### 1b. Silent tag fabrication was designed in

- `models.py:206` — invalid CR features are silently replaced: `return corrected_values if corrected_values else ["Promotes student-centered instruction"]` (a default CRF tag fabricated when the model's output was unusable).
- `models.py:213` — `cookingSkills` present but no `cookingMethods` → auto-add `self.cookingMethods = ["Basic prep only"]`.
- `models.py:225` — no skills at all → auto-add `self.gardenSkills = ["Observing plant parts"]`.
- `prompt_builder.py:183` — instructed fabrication: *"socialEmotionalLearning must ALWAYS have at least 1 selection - if unclear, use 'Self-awareness'"*.
- `prompt_builder.py:180-185` — per-lesson whack-a-mole patches hardcoded into the system prompt ("For the Bánh Mì lesson, use…", "For the Worm Breakfast Recipe lesson…", "For art lessons (like Sun Printing)…").

### 1c. No tasting≠cooking rule existed

The prompt's only cooking-exclusion guidance is compost (`prompt_builder.py:100`: "For compost/worm food lessons, do NOT tag with cookingMethods or cookingSkills"). Nothing tells the model a closing tasting isn't cooking — and §3 shows exactly that failure shipping at high confidence.

---

## 2. v3's confidence/flagging metadata — and why v3-flagged sampling is empty, not just biased

This is the load-bearing finding for OQ6's sampling design.

### 2a. Zero flagged lessons exist. Anywhere.

- `consolidated_lessons.json`: 831 lessons, `flaggedForReview: true` count = **0**.
- Raw batch outputs (`tagged_output/batches/batch_*.json`, 864 lessons pre-dedup): flagged count = **0**.
- `tracking/confidence_analysis.json`: `"flagged_for_review": 0`.

The flag mechanism (`models.py:128-135`) only fires below overall confidence 70, and the final corpus min is 75:

```json
"statistics": { "mean": 91.07, "median": 92.0, "min": 10, "max": 97, "std_dev": 4.64 }
```

(the two `10`s in the tracking distribution were subsequently hand-patched — see 2c; the shipped consolidated file's floor is 75, mean 91.4, with 733/831 lessons at ≥90).

### 2b. Per-category confidence is anti-correlated with the known failure fields

From `confidence_analysis.json` `category_averages`: the corpus's *most confident* categories are exactly where §3's failures live —

| category | avg confidence | known failure class |
|---|---|---|
| cookingMethods | 96.9 | Stovetop+"Basic prep only" incoherence (82 lessons), tasting-as-cooking |
| cookingSkills | 95.5 | 114-value drift, "Tasting" as a skill |
| gradeLevel | 94.8 | 64 lessons grade-smeared to ≥10 grades, **all 64 at gradeLevel confidence ≥90** |
| culturalHeritage | 86.6 (lowest) | — the *least* confident category is not where the documented judgment errors are |

And the six §3 confidently-wrong exemplars sit at overall confidence **88-92** — i.e. at/above the corpus mean. Confidence does not discriminate good tags from bad ones.

### 2c. The confidence floor was partly hand-authored ("confidence laundering")

`gpt_tagger/fix_low_confidence_lessons.py:11-42` contains a hardcoded `LESSON_FIXES` dict of fully hand-written tag payloads with hand-assigned `"confidence": 85`. Low-confidence model outputs were overwritten with manual tags carrying invented confidence numbers. The final file's tight 75-97 band is therefore not even an honest self-report.

### 2d. Consequence for the Stage 2 protocol

**A "sample v3-flagged lessons" bucket contains zero rows.** A "sample v3's low-confidence tail" bucket contains ~3 rows (the 75s). Any protocol that leans on v3's self-assessment samples nothing and would systematically miss every failure documented below — all of which v3 scored 88-95. Random and adversarial sampling are not nice-to-haves; they are the only buckets that contain the known failures. This empirically confirms design constraint 5 ("must probe confident-but-wrong cases").

---

## 3. Failure-example gallery

Eight lesson families judged per-field against PROD bodies (`lessons.content_text`). Verdicts: **strong** (tag clearly supported), **weak** (defensible but sloppy/incomplete), **confidently-wrong** (tag contradicted by body, confidence ≥85).

Retrieval pattern used throughout (verbatim IDs copied from v3 output / PROD results, per `feedback_verbatim_identifiers_in_probes.md`):

```sql
SELECT lesson_id, title, activity_type, grade_levels, cooking_methods, cooking_skills,
       garden_skills, core_competencies, location_requirements, length(content_text)
FROM lessons WHERE lesson_id IN (...);
-- body excerpts via LEFT(content_text, N) / SUBSTRING(content_text FROM pos FOR len)
```

### 3.1 Lotion & Agar Soap - MS — cosmetics tagged as cooking (confidently-wrong, the cleanest case)

- **lesson_id:** `1UOqNBD4kfdZth-hyfkGvYat_lVxgIscn` — live in PROD.
- **v3 tags:** `cookingSkills: ['Measuring (dry/liquid)', 'Mixing', 'Recipe reading']`, `cookingMethods: ['Basic prep only']`, `mainIngredients: ['Coconut oil', 'Shea butter', 'Peppermint oil', 'Agar agar']`, `coreCompetencies` includes "Kitchen Skills and Related Academic Content". Confidence: cookingSkills 95, cookingMethods 95, overall 88.
- **PROD today:** `activity_type: ["cooking"]`, `cooking_methods: ["basic-prep"]`, same cooking_skills.
- **Body disproof** (PROD `content_text`): summary line *"Students will create two cosmetics recipes & make connections to Dr. George Washington Carver"*; and explicitly: *"This is a vegan recipe (since many soaps contain animal fats) and is safe to use on our skin, but is NOT for eating."* No food is prepared or eaten anywhere in the lesson.
- **Verdict:** mainIngredients **confidently-wrong** (soap/lotion ingredients tagged as food ingredients); cookingSkills/cookingMethods/coreCompetencies/activity_type **confidently-wrong** as a set (this is the walkthrough's `craft` class). This is one of the "~5 cosmetics lessons → craft" backfills the design doc carries. Its K-variant sibling (`1f1FVc2FsYYwFtCFWDRA…`) has the same tag shape.

### 3.2 Dr. Carver Lotion-Making — craft+food hybrid flattened to cooking-only (weak)

- **lesson_id:** `1EeGQSd0L2YohAapYIjqZy9tT2EK0cEXVU6ugltSaNwg` — live in PROD, `activity_type: ["cooking"]`.
- **v3 tags:** `cookingSkills: ['Assembling cold dishes', 'Measuring (dry/liquid)', 'Following directions']`, `cookingMethods: ['Basic prep only']`, `mainIngredients: ['Black-eyed peas', 'Rice', 'Leafy greens', 'Various spices']`, grades K-5, overall 90.
- **Body:** *"follow a recipe similar to the one he innovated to make lotion. Students will also assemble and eat Hoppin' John burgers."* Body's opening-ritual splits sub-flows "3K-1" and "2-5".
- **Verdict:** the food tags are **defensible** (Hoppin' John is real food, eaten) — this distinguishes it from 3.1. But the lesson's headline activity (lotion-making) has no representation: no craft axis existed in the vocab, and v3 invented nothing to flag it. gradeLevel **weak**: body says 3K-1 + 2-5; v3 said K-5, dropping 3K/PK despite the literal "3K-1" header. A useful eval case because it requires *judgment* (hybrid lesson), not just rule-following.

### 3.3 Farm Workers & Pesticides — tasting-conflated `both` lineage + within-v3 duplicate inconsistency

- **lesson_id (PROD survivor):** `1B-4jTGPsOXmFJp-q-4JpMJ3e7Qw5I92aOxtgWHD6UNU`.
- **v3 tags:** cookingSkills/cookingMethods **empty** (correct!), gardenSkills `['Weeding','Watering techniques','Mulching','Composting']`, `locationRequirements: ['Both']`, overall 92-95.
- **PROD today:** `activity_type: ["cooking","garden"]` with `cooking_methods: []` and `cooking_skills: []` — an internally contradictory row.
- **Body:** garden + social-justice lesson; the only food contact is the Day-1 closing ritual: *"2. Share a seasonal tasting."*
- **Lineage note:** v3 emitted **no** activityType field at all — `activity_type` was derived downstream. One documented derivation path is a category error: `scripts/identify-and-restore-missing-lessons.ts:41-50` derives activity type **from locationRequirements** (`locationRequirements 'Both'` → `activityType ['both']`; `'Indoor'` → `['indoor']`). The 2026-05-18 migration (`20260518000000_activity_type_multi_select.sql`) then repointed 139 PROD `[both]` rows to `[cooking, garden]`. So this lesson's "cooking" label is two derivation hops from a v3 *location* tag. This is exactly one of the 3 walkthrough-documented `both`→`garden` fixes (with Plant Families `1tYdCp_VLcX…` and Roots `1dTMg_5AdKV…`, both verified in PROD with the same zero-cooking-tags + `["cooking","garden"]` contradiction; Roots' body: *"Finish with a tasting, ideally of an edible root."*).
- **Bonus within-v3 inconsistency:** the consolidated file contains TWO Farm Workers entries with byte-identical summaries but `lessonFormat: "Multi-session unit"` (id `17gJZlWz…`) vs `"Double period"` (id `1B-4jTGPsOXm…`), and differently-ordered themes.
- **Verdict:** v3 cooking fields **strong**, v3 lessonFormat **inconsistent across duplicates**; the shipping PROD activity_type is **wrong** via downstream derivation from v3 outputs. Eval-protocol lesson: Stage 2's QA must check the *derived/composite* fields against the body, not only the per-field LLM outputs.

### 3.4 Seed Dispersal ×3 — same-titled variants classified inconsistently + tasting-as-cooking

Three live PROD rows titled "Seed Dispersal", all seed-adaptation modeling lessons:

| lesson_id | v3 grades | v3 season | v3 cookSkills | v3 themes | PROD activity_type |
|---|---|---|---|---|---|
| `0BzCUl-9h7sgESGZ0MThTY0NBYVE` | 3 | Spring | [] | Plant Growth, Ecosystems, Garden Basics | `["garden"]` |
| `1X7HadA1WaR-hNBFIHvAUsFKborDGE5eT3Lhg5Dp9CEI` | 7, 8 | Winter | **['Tasting']** + cookMethods ['No-cook'] | Plant Growth, Ecosystems | **`["cooking","garden"]`** |
| `1_WlZmDJv8Ql-sCLlOyxr2qL4zeb1GQda` | 2, 3 | All Seasons | [] | Plant Growth, Garden Basics | `["garden"]` |

- **Body disproof for the 7-8 variant's cooking tag:** the lesson is stations-based seed-model engineering; the only food contact: *"Have students wash hands for tasting. \n\nTasting:\n\nToasted sunflower seeds"*. v3's own processing note even says it plainly: "includes a tasting of sunflower seeds" — and still tagged `cookingSkills: ['Tasting']` (a value not in any vocab) at cookingSkills confidence 90+, which downstream became a `cooking` activity label.
- Same content family → three different seasons, three theme sets, two location values (Both/Indoor/Indoor), and a cooking/garden split. All three at overall confidence 91-92.
- **Verdict:** seasonTiming/themes **inconsistent**; 7-8 variant cooking fields **confidently-wrong** (tasting≠cooking). This is the design doc's named "Seed Dispersal variants" backfill.

### 3.5 3 Sisters Tacos — grade-smear fabrication at 95 confidence (confidently-wrong)

- **lesson_id:** `1BQdTnCzvCWc7u6MA9ey1HFm-H1g-fXdcgGXFU_Fxzww` — live in PROD with `grade_levels: ["3K","PK","K","1","2","3","4","5","6","7","8"]`.
- **v3 tags:** all 11 grades, gradeLevel confidence **95**. Also `cookingMethods: ['Stovetop', 'Basic prep only']` (incoherent: "only" cannot co-occur with Stovetop) and `cookingSkills: ['Basic Skills', 'Cutting Skills', 'Cooking Techniques', 'Measuring (dry/liquid)', 'Recipe reading', 'Mixing']` — the first three being the prompt's category headers used as skills. `culturalHeritage: ['Lenape', 'Indigenous', 'Mexican', 'Latin American', 'Americas']` — 5 values with parent⊃child redundancy filling the max-5 cap.
- **Body disproof:** the full `content_text` (3,403 chars, read end-to-end) contains **no grade declaration at all** — it opens directly with the title ("3 Sisters Tacos\n\r\nSummary: Students will learn to make tortillas from scratch…"); the only grade-adjacent text is a task-card note "Upper grades / Lower grades". The lesson uses *"medium pot with lid, large sauté pan, burners"* and a *"demonstration squash for chopping station"*. v3 fabricated a 3K-(3-year-olds)-through-8th-grade span for a knife-and-burner lesson, at 95 confidence.
- **Verdict:** gradeLevel **confidently-wrong (fabricated)**; cookingMethods **internally incoherent**; cookingSkills **vocab-broken**; culturalHeritage **weak** (redundant hierarchy spam).

### 3.6 Pupusas & Curtido — the counter-case that defines a ground-truth policy question

- **lesson_id:** `19jKdVhI31juzrkZg6H4pZpWGzwzUZmeW` — live in PROD, also all-11-grades + stovetop.
- **Body:** the header literally reads *"3K-8th Grade\rFall/Winter/Spring/Summer\nHeat/No Heat"*.
- **Verdict:** v3's 3K-8 here is **faithful-to-source** — the source doc claims the span. Whether a stovetop lesson *should* carry 3K is a curriculum-policy question, not an extraction error.
- **Why this matters for OQ6:** the grade-smear class (64 lessons with ≥10 grades, every one at gradeLevel confidence ≥90) is two distinct sub-classes — (a) fabricated spans with no body basis (3.5) and (b) extracted spans the source doc really claims (3.6). The eval protocol must define ground truth per field: "what the body says" vs "what curriculum policy says is appropriate." For grades, the curriculum team should decide which one Stage 2 targets *before* labeling begins, or labelers will disagree with each other for protocol reasons rather than judgment reasons.

### 3.7 Planting in Patterns ×5 — same-titled inconsistency at scale + false self-report

The consolidated file contains **five** "Planting in Patterns" entries with materially different tags:

| v3 id (prefix) | lessonFormat | themes | SEL | coreComp |
|---|---|---|---|---|
| `0B-9rQRyZMNz…` | Multi-session unit | 3 themes | Relationship, Responsible d-m | Garden, SEL |
| `0BwC8Pf3ZwAX…` | Standalone | 3 themes | Relationship, Self-mgmt | Garden, CRE |
| `16wrSSDrz-2c…` | Multi-session unit | 3 themes | Relationship, Responsible d-m | Garden, SEL |
| `1FsfuHw8RzGJ…` | Multi-session unit | 2 themes | Relationship | Garden, CRE |
| `1l2xxZKHe1Vx…` (PROD survivor) | **Single period** | 2 themes | 3 values | Garden only |

The `0B-9rQ…` entry's processingNotes claim: *"Duplicate of earlier 'Planting in Patterns' lesson. Tagging is the same."* — **demonstrably false** (its format/SEL/coreComp differ from 3 of the 4 others; no two of the five agree on all fields). v3's self-reported processing notes cannot be trusted as audit metadata. Note the PROD survivor carries the minority "Single period" format judgment.

### 3.8 A strong example, for calibration fairness

v3 was not uniformly bad. "Farm Workers & Pesticides" cooking fields (empty — correct), "Plant Families" (`1tYdCp…`) gardenSkills `['Identifying plants','Observing plant parts','Weeding']` and themes — all body-supported and reasonable. Garden-only lessons with explicit ESYNYC-template SEL/CRF sections were generally tagged plausibly (e.g., "Planting in Patterns" individual entries are each internally defensible; the failure is *inconsistency across* them, plus downstream derivation). The mediocrity is concentrated in: judgment boundaries (tasting/cooking, craft/cooking), absent-evidence behavior (grade smear instead of abstention), free-text vocab discipline, and cross-variant consistency.

---

## 4. Corpus-scale quantification of the failure classes

Computed from `consolidated_lessons.json` (831 entries):

| failure pattern | count | confidence behavior |
|---|---|---|
| Grade smear: ≥10 of 11 grade values on one lesson | **64 lessons** | all 64 at gradeLevel confidence ≥90 |
| Incoherent `Stovetop` + `Basic prep only` cookingMethods | **82 lessons** | cookingMethods avg confidence 96.9 (corpus-highest) |
| cookingSkills vocabulary explosion | **114 distinct values** for a 5-value prompt vocab | cookingSkills avg confidence 95.5 |
| culturalHeritage free-text | 66 distinct values incl. parent+child redundancy | lowest avg confidence (86.6) — the one place v3 was *appropriately* less sure |
| flaggedForReview | **0 of 831** | flag threshold (<70) unreachable after hand-patching |

(PROD-side note: today's live corpus is 767 rows by `retired_at IS NULL` — the design's "~751" anticipates further drops; corpus-count reconciliation is E2/OQ5's domain, not this item's.)

---

## 5. Candidate eval/QA protocols for Stage 2

Plain-language sketches, written so the curriculum team can read them. All three share two facts established above: **v3's own "needs review" flags are empty (0 lessons), and its confidence scores are highest exactly where it was wrong** — so every protocol below builds its sample from random + targeted picks, never from v3's self-assessment. "Field" below means one tag category (grade levels, cooking methods, etc.).

A shared building block — **scoring v3 as if it were a contestant**: because v3's tags still sit on every legacy row, we can grade *both* v3's old tags *and* the new pipeline's tags against the same human answer key. That single trick converts "v3 was mediocre" into a per-field number and makes "beats v3" a strict comparison on identical lessons.

### Protocol A — "Answer key first" (gold-set eval gate, extends existing repo machinery)

- **What:** Before the bulk run, build a human answer key for a sample of lessons; gate the new pipeline on beating v3 against that key.
- **Sample:** ~60 lessons = ~40 stratified-random (proportional across garden/cooking/craft-suspect/academic and grade bands) + ~20 adversarial picks seeded from §3's classes: same-titled families (Seed Dispersal, Planting in Patterns, Farm Workers), cosmetics/craft suspects, lessons whose only food contact is a closing tasting, wide-grade-span recipes, plus heritage/CON open audit signals.
- **Who:** curriculum team fills a worksheet (the same pattern as the Stage 1 heritage/concepts worksheets and the activity-type relabel worksheet they've already completed); a Claude periphery agent pre-fills draft labels with body citations so each row is a check-and-correct, not a from-scratch read.
- **What gets measured:** per-field agreement with the answer key, scored by the **existing eval harness** (`scripts/eval-llm-tagging-prompt.ts` with per-field vocab/threshold JSONs in `scripts/eval-data/` — the precedent run cost ~$2 direct and cleared macroF1 0.887 for activity_type, 0.937 for CRF).
- **"Beats v3" =** on the same 60 lessons, the new pipeline's per-field F1 ≥ v3's per-field F1 for **every** re-tagged field, AND the new pipeline clears the existing absolute gate (macroF1 ≥ 0.7, per-value recall ≥ 0.5) on every field. v3 will fail several of these outright (it has no abstention on grades, no craft value, no tasting rule), so the bar is real but documented.
- **Cost/effort:** curriculum team labels 60 lessons once (worksheet, async); LLM passes are cents-to-dollars.

### Protocol B — "Spot-check after the run" (three-bucket human audit of the diff)

- **What:** After the bulk run produces its diff report (old tags → proposed tags), humans audit a sample of *changes and non-changes* before anything is applied to the live database.
- **Sample:** ~75-100 lessons in three buckets: (1) ~40 random across the corpus (catches confident-but-wrong in the *new* pipeline); (2) ~30 "biggest movers" — lessons where the new tags differ most from v3's (these are either v3's failures fixed or the new pipeline's failures introduced; either way the highest-information rows); (3) ~15-25 sibling-consistency probes — every same-titled family gets all its variants reviewed together as a set.
- **Who:** Claude periphery agent does a first pass on all 100 (verdict + body citation per field); curriculum team reviews only the rows the agent marks "uncertain" or "new tag looks wrong" plus a 20-row random subsample of agent-passed rows (to audit the auditor).
- **What gets measured:** human-judged correctness rate of new tags vs old tags on the same rows ("new right / old wrong", "both right", "new wrong / old right", "both wrong"), plus a hard consistency check: same-titled variants must agree on every field unless the body justifies divergence.
- **"Beats v3" =** "new wrong / old right" cases < "new right / old wrong" cases by at least 3:1, AND zero unexplained sibling-family disagreements, AND no field where the new pipeline introduces a *new* systematic error class.
- **Cost/effort:** no pre-run labeling; the human work happens once, on the diff, where it doubles as the apply-gate review the design already requires.

### Protocol C — "Blind head-to-head" (preference judging, lightest-weight)

- **What:** For a sample of lessons, show a judge the lesson body plus two anonymized tag sets (A = v3's, B = new pipeline's, order shuffled) and ask: which tag set describes this lesson better, or are they tied?
- **Sample:** ~50 lessons, half random, half adversarial (same seed list as Protocol A).
- **Who:** curriculum team for ~25 (the judgment-heavy ones: craft/cooking boundaries, grade appropriateness); a Claude periphery agent for the rest, with its verdicts spot-audited by the team on 10 overlapping rows to check agreement.
- **What gets measured:** win/tie/loss rate, plus free-text reasons (which feed prompt iteration).
- **"Beats v3" =** new pipeline wins ≥ 60% of non-tied comparisons and loses ≤ 10%.
- **Limitation (why it's not sufficient alone):** preference judging measures "better overall" but not per-field correctness — a tag set can win the vibe contest while still grade-smearing. No absolute floor, no per-field signal, weakest audit trail. Cheapest to run, best as a tie-breaker or quick prompt-iteration loop, not as the gate.

### Recommendation (also in structured output)

**A as the pre-run gate, B as the post-run apply-gate; skip C as a standalone.** A is the only protocol that produces an absolute, per-field, reusable yardstick — and the repo already owns the harness, the threshold pattern, the worksheet pattern, and the cost calibration to run it. B is already implied by the design's "reviewer spot-check before apply" lock, so shaping it as the three-bucket diff audit costs almost nothing extra. The two protocols catch different failure layers: A catches "the prompt/model is wrong in general" before $200-300 is spent on the bulk run; B catches "the run was wrong on specific rows" before PROD writes. C's preference-judging can be folded into A's worksheet as an optional "which is better" column if the team wants it, but it shouldn't be the definition of "beats v3" because it has no per-field floor.

One policy decision must precede labeling either way (from §3.6): for grade levels, decide whether ground truth is "what the source doc claims" or "what is age-appropriate for the activity" — the Pupusas case shows source docs themselves claim 3K-8 for stovetop lessons, and labelers need to know which question they're answering.

---

## Appendix: provenance of every number

- v3 path + structure: `ls /Users/danfeder/cCode/taggingv3/`, `ls gpt_tagger/`, `ls tagged_output/{final,batches,tracking}`.
- 831 entries / 0 flagged / confidence distribution: python over `tagged_output/final/consolidated_lessons.json`; raw-batch 864/0 over `tagged_output/batches/batch_*.json`; tracking stats verbatim from `tagged_output/tracking/confidence_analysis.json`.
- Enum/validator/prompt citations: `gpt_tagger/models.py` lines 41, 45, 51-55, 61-83, 95-111, 128-135, 206, 213, 225; `gpt_tagger/prompt_builder.py` lines 44-46, 95-100, 127-130, 145-151, 180-187, 216-225; `gpt_tagger/fix_low_confidence_lessons.py` lines 11-42.
- PROD rows: `mcp__supabase-remote__execute_sql` SELECTs on `lessons` by verbatim `lesson_id` (queries quoted in §3); body excerpts via `LEFT()`/`SUBSTRING()` on `content_text` only.
- activity_type lineage: `scripts/identify-and-restore-missing-lessons.ts:41-50`; `supabase/migrations/20260518000000_activity_type_multi_select.sql` header lines 4-6 (read-only).
- Eval-harness precedent: `scripts/eval-llm-tagging-prompt.ts`; `scripts/eval-data/activity-type-samples.README.md` (113 rows, macroF1 0.887, ~$2 direct cost, thresholds macroF1 ≥ 0.7 / per-value recall ≥ 0.5).
- Error-class definitions: `docs/plans/2026-06-11-metadata-rebuild-pr6-stage2-retag-design.md:11,13,23`; `docs/plans/2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md:166,188,816`; exploration doc Question 4 block (lines ~450-458).
