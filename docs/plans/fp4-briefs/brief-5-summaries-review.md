# FP4 Brief 5 — Summary backfill review (Phase 1 deliverable)

**Status:** Phase 1 complete — **awaiting owner review.** No writes of any kind were made.
**Prepared by:** Opus executor session, 2026-07-03.
**Evidence base:** `C4/FP4-DB-02` (discovery-evidence.md:776) + the live-drive `---` note (discovery-evidence.md:138).
**Provenance DB:** PROD `jxlxtzkmicfhchkhiojz`, read-only SELECTs via `mcp__supabase-remote__execute_sql`.

---

## Headline for the owner (plain language)

- **65 active lessons have an empty summary line.** Good news: **all 65 already contain a
  written summary inside the lesson plan itself** (the standard ESYNYC lesson template has a
  "Summary:" cell). So **every one is EXTRACTED from the lesson's own words — none had to be
  invented.** That matches your instruction exactly ("taken from the lesson text whenever
  possible").
- **14 of the 65 got a tiny cleanup** (documented per row): fixing an OCR-style space inside a
  word like "Stu dents" → "Students", or adding a missing period. Two are flagged ⚠️ for your
  eye (a run-on and one that carries a logistics note).
- **Title hygiene: 22 titles need attention.** 21 carry an invisible control character (a
  vertical-tab) — proposed fix is a clean trim. The 22nd is the lesson literally titled
  `---`, which turns out to be an **exact byte-for-byte duplicate** of another live lesson —
  so that one is a *deduplication decision for you + Fable*, not a plain title fix (details
  in §4).
- Nothing here needs a schema change. This is a data-only fix (Phase 2), owner-gated.

---

## 1. Census + provenance (re-probed on PROD 2026-07-03)

### 1a. Blank-summary count — CONFIRMED 65 active (matches brief)

```sql
SELECT CASE WHEN retired_at IS NULL THEN 'active' ELSE 'retired' END AS status,
       count(*) total_rows,
       count(*) FILTER (WHERE summary IS NULL) null_summary,
       count(*) FILTER (WHERE summary IS NOT NULL AND btrim(summary)='') empty_after_trim
FROM lessons GROUP BY 1 ORDER BY 1;
```
```
active : total_rows=703, null_summary=0, empty_after_trim=65   ← in scope
retired: total_rows=82,  null_summary=0, empty_after_trim=21   ← OUT of scope
```

### 1b. `metadata` JSONB has NO `summary` key on any row — column is the only representation

```sql
SELECT count(*) total_rows, count(*) FILTER (WHERE metadata ? 'summary') has_summary_key,
       count(*) FILTER (WHERE metadata IS NULL) null_metadata FROM lessons;
```
```
total_rows=785, has_summary_key=0, null_metadata=0
```
→ Confirms the brief: do **not** touch `metadata` for summary. The column-vs-JSONB mirror
gotcha does not apply here.

### 1c. Extraction hit-rate — all 65 have an extractable "Summary:" cell

```sql
-- across the 65 blank rows
count(*)=65, has_summary_marker=65, has_objectives_marker=65,
has_overview_marker=0, has_description_marker=0, content_under_200=0
```
→ Every one of the 65 uses the ESYNYC lesson-plan table and has a populated `Summary:` cell.
**Result: 65 EXTRACTED, 0 DRAFTED, 0 SKIPPED-needs-owner.**

The extracted text was taken as the content between the `Summary:` label and the first
`[Table]` section marker in `content_text`, then whitespace-collapsed. (Raw extraction cached
at session scratch; final approved strings will be written verbatim into the Phase-2 SQL.)

---

## 2. Proposed summaries — the 65 (all EXTRACTED, sorted A–Z by title)

Register was matched to ~12 existing populated summaries (short, plain, student-outcome voice,
e.g. "Students will…"; 60–300 chars). Curriculum-facing, no jargon, no marketing voice.

<!-- BEGIN summary table -->
| # | Lesson title | Proposed summary (EXTRACTED) | Chars | Notes |
|---|---|---|---|---|
| 1 | All About Lanternflies lesson | Students will learn about lanternflies, an invasive insect in the garden, and how to protect the garden from these pests. | 121 |  |
| 2 | All About Pumpkins | Students will learn all about the pumpkin plant, and mix and eat roasted pumpkin seeds. | 87 |  |
| 3 | All About Squirrels | Students play a game to learn about squirrels, a common visitor to the garden, and the squirrel’s role in seed dispersal. | 121 |  |
| 4 | Anthotype | Students will learn about how plants can be used for crafts and to take a picture without a camera. They will make their own anthotype. | 135 |  |
| 5 | Bees | Students make a bee puppet while learning about the life of a bee. | 66 |  |
| 6 | Bees and Blueberries | Students will learn about bees as pollinators and make blueberry muffins, plant native plants in a pollinator garden, and/or make lip balm. | 139 |  |
| 7 | Beet Valentines | Students learn about beets, try a beet tasting, and make Valentine’s Day cards using beets. | 91 |  |
| 8 | Berry Rosehip Bars | Students bake bars with berries and rosehips and learn about foods native to North America. | 91 |  |
| 9 | Black Panther Party and the Free Breakfast Program | Students will learn about the Black Panther Party’s free breakfast initiative as a means of resistance and change. | 114 |  |
| 10 | Booker T. Whatley’s CSA (Photos of Booker T. Whatley may be restricted use) | Students will learn about the teachings of Black professor and horticulturist Booker T. Whatley, and his pioneering of the CSA (Community Supported Agriculture) model in the US. Students will then participate in their own class-sized CSA program. | 246 |  |
| 11 | Butterflies | Students will learn about the Butterfly Life Cycle and a little bit about butterflies generally (what do they eat, where do they live), Students will learn (surface level) about Butterflies as pollinators, Students will make their own butterflies and fly them around the room looking for flowers. | 296 | ⚠️ verbatim run-on (comma-spliced "Students will…" clauses); owner may wish to tighten |
| 12 | Chilled Cucumber and Tahini Soup with Spicy Pumpkin Seeds | Students make a cold cucumber soup using summer vegetables and herbs while learning about Palestinian culture. | 110 |  |
| 13 | Compost Relay & Stew | Students will learn about compost, participate in a compost relay by measuring and adding different ingredients that go into compost, and make a compost “stew” with edible ingredients that represent materials that go into compost. | 230 |  |
| 14 | Corn Mush and Wojapi Berry Sauce (Slideshow images and cornbread recipe may be restricted use) | Students will learn about corn mush and wojapi, a popular Native American dish. | 79 |  |
| 15 | Decomposition Experiment | Students will prepare items to go in a decomposition experiment and fill out a worksheet with their predictions. | 112 |  |
| 16 | Decomposition Experiment Part 2 | Students will observe the results of their decomposition experiment and compare these results with their original hypotheses. | 125 |  |
| 17 | Dr. Carver and Calendula | Students will learn about Dr. Carver and make their own salve. | 62 | light-clean: "abo ut"→"about"; added final period |
| 18 | Eid: Stuffed Dates | Students will learn about the importance of Eid and make stuffed dates. | 71 | light-clean: added final period |
| 19 | Empanadas | Students will prepare and taste empanadas. | 42 |  |
| 20 | Empanadas & Corn Salad | Students will make empanadas and corn salad. | 44 |  |
| 21 | Fall Fruit vs. Summer Fruit | Students will compare summer fruits and vegetables with fall fruits and vegetables and discuss why certain things grow at certain times. | 136 |  |
| 22 | Food Justice Advocates: Food Scarcity | Students learn about the concepts of food justice and advocacy generally and about food insecurity in particular, and consider what actions they can take against food insecurity. They make and eat a healthy fruit snack and brainstorm ideas for a TikTok advocating for policies to end food insecurity. | 300 |  |
| 23 | Food Origins Scavenger Hunt (check images for copyright) | Students explore the garden using a scavenger hunt that directs them to find the geographic origins of different plants. | 120 |  |
| 24 | Food Safety | Students will learn about the “food safety chain” and how we keep food safe in our food system. Students will ultimately focus on how they can safely handle food at home with the “4 Steps to Food Safety”. They will practice these steps with a recipe in class. | 259 | light-clean: added final period |
| 25 | Food Waste | Students will learn about the impact of food waste on the environment. | 70 |  |
| 26 | Garden Intro: Bingo | Students will go over garden norms and be introduced to the garden community through a bingo game. | 98 |  |
| 27 | Garden Jeopardy | Students engage in a Jeopardy-style game to review their garden knowledge. | 74 | light-clean: "Stu dents"→"Students" |
| 28 | Gardening & The Environment | Students will get a (re)introduction to the school garden and learn about the various ways gardening is beneficial for the environment. | 135 |  |
| 29 | Gingerbread Cookies | Students will practice baking skills to make gingerbread cookies and share about how they celebrate the holidays. | 113 |  |
| 30 | Growing Indoor Edible Sprouts | Students plant “soil sprouts” as a first step toward growing microgreens for their seed-to-table salad unit. | 108 |  |
| 31 | Haudenosaunee | Students will read/listen to the Haudenosaunee Thanksgiving Address, partake in a garden job related to Native teachings, and do a gratitude activity related to the Thanksgiving address. | 186 |  |
| 32 | Healing with Roses (Instructions and article may be restricted use) | Students will make a rose glycerite tincture (glycerite is a sweet syrupy plant-based extract) and rose infused honey to understand the healing properties of roses, physically, emotionally and spiritually. | 205 |  |
| 33 | Hoppin' John Burgers | Students will learn about ingredients as they relate to African American history then use those ingredients to make Hoppin’ John burgers. | 137 |  |
| 34 | How Food Moves (Food Miles) | Students will play a game in which they are assigned miles based on foods they choose. They will evaluate whether the winner of the game should be the team with the most or least miles based on their discussion of the impact of each kind of food. | 246 |  |
| 35 | Imperfect Foods | Students will learn about “ugly” produce and make a delicious dish using “ugly” produce. | 88 | light-clean: added final period |
| 36 | Insect Detectives | Students will build familiarity around insects by completing an insect scavenger hunt in the garden. | 100 |  |
| 37 | Interconnection & Native American Traditions | Students will read about Native American history, traditions, and environmental stewardship, then practice environmental stewardship in the garden while being mindful of the interconnected relationships between people, plants, and animals. | 239 | light-clean: "read a bout"→"read about" |
| 38 | Intro to Garden Class | Students go over expectations and goals for the year then go over plant parts by creating their own “exquisite plants”. | 119 | light-clean: "Stu dents"→"Students" |
| 39 | Jam and Jelly: Fruit Preservation | Students will learn about preservation of food, specifically how berries and fruits can be preserved through the canning process to make jam/jelly. Students will watch a video, read a book, and spend the rest of the class making personal jars of jam/jelly to take home. Note: This lesson requires a follow-up class for a tasting of the completed jam or you will need to pass out the completed jam to students’ classes to take home and taste at home after class. | 461 | ⚠️ verbatim; ends with a teacher-logistics "Note:" sentence — owner may drop it for a shorter card |
| 40 | Leaf Collecting | Students talk about fall in the garden and collect leaves to put in compost or to use as mulch. | 95 |  |
| 41 | Measuring Championships (King Arthur material is restricted use) | Students will practice techniques for measuring dry ingredients using cup measures by playing a competitive teams-based game. | 125 |  |
| 42 | Mobile Education: Mexican Street Corn Salad (Esquites) | Students will be welcomed or welcomed back to ESYNYC programming, go over class expectations, learn about Mexican culture and food traditions and make Esquites: Mexican corn salad. | 180 |  |
| 43 | Mural Painting 101: Beautifying the Garden | Students will learn about the importance of using art to take ownership of and take care of public spaces, and begin the process of painting a mural in their garden. | 165 |  |
| 44 | Mushroom Cultivation | Students will learn more about how mushrooms are grown, through discussion and video, then inoculate their own mushroom bags using cardboard and mushroom spawn. | 160 |  |
| 45 | Natural Dyeing | Students will create their own dyed fabrics using natural materials from the garden and kitchen. | 96 |  |
| 46 | NEW Place Based: Native Plants in Our Garden | Students will learn about plants and animals living in Manahatta. | 65 | light-clean: added final period |
| 47 | Our Garden Community | Students will read a story about the members of a garden community, then make their own illustrations about what plants, animals, and people are part of a garden community. | 172 |  |
| 48 | Pasta Party | Classes that have earned enough petal points will celebrate with a pasta-themed party. | 86 |  |
| 49 | Plant Part Investigation | Students will identify different parts of a plant: roots, leaves, stems, and flowers. | 85 |  |
| 50 | Plant Part Scavenger | Students will use visuals, song, and drawing to learn the six major parts of a plant. | 85 |  |
| 51 | Plants as Medicine | Students will make a tea bag of aromatic herbs to understand how plants have been used as medicine. | 99 |  |
| 52 | Puppet Pollinators | Students will learn about the basics of pollination, a crucial process that happens in the garden, and then create a simple butterfly puppet. | 141 |  |
| 53 | Rainsticks | Students will explore the relationship between plants and music and make some plant-based musical instruments. | 110 |  |
| 54 | Recycle Gardening | Students will learn the basic necessities to grow food and plants in an urban setting and get to plant seeds in recycled containers. | 132 | light-clean: "S tudents"→"Students" |
| 55 | Scallion Pancake - AAPI: Yachaejeon Vegetable Pancake | Students will learn about a popular Korean food Yachaejeon (Vegetable Pancake) to celebrate AAPI month. | 103 | light-clean: added final period |
| 56 | School and Garden Communities | Students will sing a song about the different members of our garden community and do a garden job to understand that they as students are important members of the garden community. | 180 |  |
| 57 | Sensory Scavenger Hunt and | Students are welcomed to the garden and taught garden expectations. Students will explore the garden on their own. | 114 | title ends with a dangling "and" — see §5 (out of scope for this brief) |
| 58 | Street Vendors/"Chicken" Over Rice | Students will learn about the history of mobile street vending, create a model food truck business, and prepare an ESYNYC take on NYC’s classic halal cart “chicken over rice.” | 175 |  |
| 59 | Sun Printing/Cyanotype | Students will become familiar with what flowers, leaves and plant parts are in the garden, and use them to make cyanotypes or sun prints. | 137 |  |
| 60 | Three Sisters and Companion Planting: a Seed Study | Students will learn about the 3 Sisters, companion planting, and Indigenous heritage month. Students will observe and sort 3 sisters seeds. | 139 |  |
| 61 | Three Sisters Puppet Show | Students will enjoy a puppet show to hear about the Lenape Legend of the 3 sisters. | 83 | light-clean: source typo "learn hear about"→"hear about"; added final period |
| 62 | Welcome and Exploration: How humans work in the garden | Students are welcomed to the garden, go over garden rules, and participate in garden chores acting as different characters. | 123 | see §4 — this lesson is the exact duplicate that the `---` row copies |
| 63 | Wild Soda | Students will learn about wild yeast and make and taste some wild sodas. | 72 |  |
| 64 | Worms and Compost | Students will examine the worm bin, discuss the importance of healthy soil, and complete a worm-related worksheet. | 114 |  |
| 65 | Worms K-1 | Students will study worms in an indoor worm bin, draw what they see, and do the worm dance. | 91 | light-clean: "stud ents"→"Students" (fixes lowercase start); added final period |
<!-- END summary table -->

### Light-cleaning policy (what "lightly trimmed" meant here)

Only the 14 rows with a Note were touched. Three kinds of edit, each disclosed per row:
1. **OCR-style split words** (6 rows): "Stu dents"→"Students", "abo ut"→"about",
   "read a bout"→"read about", "S tudents"→"Students", "stud ents"→"Students". These are
   plainly extraction artifacts in `content_text`; fixing them keeps the text faithful.
2. **Missing final period** (added to 7 rows) so the card reads like the existing summaries,
   all of which end in a period.
3. **One source typo** ("learn hear about"→"hear about", row 61).
Everything else is verbatim from the lesson's own Summary cell (whitespace-collapsed only).

**Two ⚠️ rows for your call** (left verbatim; not blocking):
- **#11 Butterflies** — a comma-spliced run-on. Faithful but clunky. A tightened option:
  *"Students learn about the butterfly life cycle and about butterflies as pollinators, then
  make their own butterflies and 'fly' them around the room looking for flowers."*
- **#39 Jam and Jelly** — extracted summary includes a trailing teacher-logistics "Note:".
  A shorter card option is to keep only the first two sentences (drop the final "Note:"
  sentence). Your call.

---

## 3. Title hygiene — 21 control-character titles (proposed clean forms)

All 21 are also in the 65-blank set above, so one UPDATE fixes summary + title together.
`␋` marks an invisible **vertical-tab (U+000B)** control char. Proposed rule: replace control
chars with a space, collapse any resulting/adjacent multi-space run, and trim the ends.

| # | Raw title (`␋` = vertical-tab) | Proposed clean title |
|---|---|---|
| 1 | `Bees and Blueberries␋` | Bees and Blueberries |
| 2 | `Beet Valentines␋` | Beet Valentines |
| 3 | `Booker T. Whatley’s CSA␋(Photos of Booker T. Whatley may be restricted use)` | Booker T. Whatley’s CSA (Photos of Booker T. Whatley may be restricted use) |
| 4 | `Butterflies␋` | Butterflies |
| 5 | `Corn Mush and Wojapi Berry Sauce␋(Slideshow images and cornbread recipe␣␣may be restricted use)` | Corn Mush and Wojapi Berry Sauce (Slideshow images and cornbread recipe may be restricted use) |
| 6 | `Food Origins Scavenger Hunt␋(check images for copyright)` | Food Origins Scavenger Hunt (check images for copyright) |
| 7 | `Garden Jeopardy␋` | Garden Jeopardy |
| 8 | `Gardening & The Environment␋` | Gardening & The Environment |
| 9 | `Growing Indoor Edible Sprouts ␋` | Growing Indoor Edible Sprouts |
| 10 | `Healing with Roses␋(Instructions and article may be restricted use)` | Healing with Roses (Instructions and article may be restricted use) |
| 11 | `Intro to Garden Class␋` | Intro to Garden Class |
| 12 | `Jam and Jelly: Fruit Preservation␋` | Jam and Jelly: Fruit Preservation |
| 13 | `Measuring Championships␋(King Arthur material is restricted use)` | Measuring Championships (King Arthur material is restricted use) |
| 14 | `Mushroom Cultivation␋` | Mushroom Cultivation |
| 15 | `Pasta Party␋` | Pasta Party |
| 16 | `Recycle Gardening␣␣␋` | Recycle Gardening |
| 17 | `Scallion Pancake - AAPI: Yachaejeon Vegetable Pancake␋` | Scallion Pancake - AAPI: Yachaejeon Vegetable Pancake |
| 18 | `Street Vendors/"Chicken"␣␣␣Over Rice␋` | Street Vendors/"Chicken" Over Rice |
| 19 | `Wild Soda␋` | Wild Soda |
| 20 | `Worms and Compost␋` | Worms and Compost |
| 21 | `Worms K-1␋` | Worms K-1 |

Notes:
- Rows **3, 5, 6, 10, 13**: the vertical-tab sits *between* the title and a parenthetical
  restricted-use note, so it is replaced with a **single space** (not just stripped).
- Rows **5 and 18**: also collapse a pre-existing internal double/triple space
  ("recipe␣␣may" → "recipe may"; `"Chicken"␣␣␣Over` → `"Chicken" Over`). If you'd rather leave
  those internal spaces untouched, say so and I'll only strip the control char.

**Provenance** (proposed = DB-computed, not hand-typed):
```sql
SELECT lesson_id, title AS raw_title,
       btrim(regexp_replace(regexp_replace(title, '[[:cntrl:]]+', ' ', 'g'), '\s{2,}', ' ', 'g')) AS proposed_title
FROM lessons
WHERE retired_at IS NULL
  AND (title <> btrim(title) OR title ~ '[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]'
       OR btrim(title, E' \t\n\r\x0B\x0C-') = '');
-- returned 22 rows: the 21 above + the `---` row (see §4)
```

---

## 4. The `---` lesson — a DEDUP decision, not a title fix (routes to owner + Fable)

The active lesson titled literally `---` (`lesson_1753316245157_flurdiez2`) is **an exact,
byte-for-byte duplicate** of another live lesson:

```sql
SELECT lesson_id, title, length(content_text) clen, md5(content_text) content_md5
FROM lessons
WHERE lesson_id IN ('lesson_1753316245157_flurdiez2','lesson_cc0a5cb454f04aa0aaa5a30a33dac44b');
```
```
lesson_1753316245157_flurdiez2                title="---"                                              clen=4597  md5=aaac635a46707c0bee88c7383b120fb4
lesson_cc0a5cb454f04aa0aaa5a30a33dac44b       title="Welcome and Exploration: How humans work in the garden"  clen=4597  md5=aaac635a46707c0bee88c7383b120fb4
```
Same `content_text` (identical md5), same grades `[4,5,6,7,8]`, same activity types
`[garden,cooking]`, same summary text. The `---` row's own content H1 reads
"Welcome and Exploration: How humans work in the garden".

**Why this is a fork, not a fix:** the honest content-derived title for `---` *is*
"Welcome and Exploration: How humans work in the garden" — but writing that would create two
live lessons with an identical title **and** identical content. The real question is a
deduplication one (retire one of the two? merge? keep both under disambiguated titles?), which
is **out of scope for this brief** (dedup is a design decision).

Per the standing process rule, I am **not** deciding this and **not** writing a title for
`---` in the Phase-2 fix. **Options for you + Fable:**
- **(A)** Treat as a duplicate → retire/merge one of the two (needs the dedup workflow; out of
  this brief's scope).
- **(B)** Keep both but give `---` a real, *disambiguated* title (e.g. append a section/date/
  variant marker) — tell me the exact string and I'll include it in Phase 2.
- **(C)** Give `---` the same title as its twin and accept the collision (not recommended).

Extra note (no action asked): the `---` row's **stored summary** carries stray table-pipe
artifacts — `"| Students are welcomed to the garden, … different characters. |"`. If you pick
(B), I can strip the leading/trailing `| ` in the same pass; flagging it so it isn't missed.

---

## 5. Out-of-scope observations (flagged, not fixed)

- **`Sensory Scavenger Hunt and`** (`lesson_df09326b…`, row 57): the title ends with a dangling
  "and" — looks truncated. It has no control char / edge whitespace, so it is **outside this
  brief's title-hygiene scope** (which is `---` + control/whitespace). Flagging for a future
  title-quality pass; not proposing a fix here (a real title is a content/editorial call).

---

## 6. Phase-2 preparation notes (read-only findings; for the owner-gated data fix)

- **No schema change.** Single data UPDATE over the approved rows only, ids verbatim.
- **NOT-VALID CHECK gotcha — currently clear, must re-probe at apply time.** Any UPDATE
  re-validates `valid_cooking_skills` + `valid_main_ingredients` against the whole row.
  Among the 65 target rows **right now**: `cooking_violators=0, ingredient_violators=0`
  (re-probed 2026-07-03; consistent with Brief 5's heal). **Phase 2 must re-run this
  immediately before applying** — if any target row would trip either check, STOP.
- **Second trigger to watch in rehearsal:** `lessons_normalize_write_trg` fires on every write
  and re-validates the metadata enums `activityType` / `tags` /
  `culturalResponsivenessFeatures`. The TEST rehearsal (real UPDATE inside a rollback txn)
  exercises this; no pre-failure expected, but watch for a RAISE.
- **FTS / findability (brief's hand-back question):** the search vector **does index
  `summary`** — `update_lesson_search_vector_trigger` builds
  `setweight(to_tsvector('english', COALESCE(NEW.summary,'')), 'B')`. Because the extracted
  text already lives in `content_text` (weight `D`), these lessons were *already* findable by
  those words; populating `summary` **promotes them to weight B (higher relevance)** rather
  than making them net-new findable. The vector is a trigger-maintained column and refreshes
  automatically on the UPDATE — **no manual reindex needed.**
- **Embeddings:** `content_embedding` is **NOT** regenerated by this change (deferred campaign
  item C2.4) — noting per brief, not fixing.
- **The `---` title is excluded** from the Phase-2 fix pending the §4 decision.

---

## Hand-back / STOP

Phase 1 done — review doc produced, **no writes of any kind.** Awaiting owner (with Fable)
review of §2 (65 summaries), §3 (21 title fixes), and a §4 decision on the `---` duplicate.
On explicit approval I'll build `brief-5-summary-data-fix.sql` (single UPDATE, approved rows
only, ids verbatim), rehearse on TEST with a rollback + post-asserts, and hand back for the
owner-gated PROD apply.

---

## OWNER DECISIONS (2026-07-03, via Fable ranking session — Phase 2 is GO)

Fable independently re-verified the load-bearing claims before these were asked (own md5
probe: pair = 1 distinct hash; dirty-title probe: exactly 22; raw `Summary:` cells for rows
2/27/39 match the proposals; FTS weight-B confirmed at
`20260521000000_search_vector_with_concepts.sql:84`). All held.

1. **#11 Butterflies → TIGHTENED version approved.** Use exactly:
   *"Students learn about the butterfly life cycle and about butterflies as pollinators,
   then make their own butterflies and 'fly' them around the room looking for flowers."*
2. **#39 Jam and Jelly → DROP the trailing "Note:" sentence.** Use exactly the first two
   sentences: *"Students will learn about preservation of food, specifically how berries
   and fruits can be preserved through the canning process to make jam/jelly. Students will
   watch a video, read a book, and spend the rest of the class making personal jars of
   jam/jelly to take home."*
3. **`---` duplicate → RETIRE `lesson_1753316245157_flurdiez2`** (Option A). Not a delete —
   set it retired exactly the way the existing 82 retired rows are shaped (probe one retired
   row first and replicate its field pattern, e.g. any companion reason/timestamp fields).
   No `canonical_lessons`/`duplicate_resolutions` entry needed for a byte-identical copy —
   deliberate minimal-moving-parts call. Its twin
   `lesson_cc0a5cb454f04aa0aaa5a30a33dac44b` stays active and receives summary row 62 from
   this batch. The `---` pipe-artifact summary becomes moot (row leaves search). Include the
   retire in the same TEST-rehearsed, owner-gated Phase-2 data fix.
4. **Full list APPROVED** — all 65 summaries (with tweaks 1–2), all 21 title fixes
   including the two internal double-space collapses (rows 5 and 18 of §3).

**Phase-2 reminders (from the brief, still binding):** re-probe NOT-VALID violators on the
66 touched rows (65 + the retire) immediately before apply; watch
`lessons_normalize_write_trg` in rehearsal; single data fix file
`brief-5-summary-data-fix.sql`, ids verbatim from this doc; TEST rollback rehearsal with
post-asserts (0 blanks among the 65, titles clean, `---` retired, active count 703→702);
PROD apply only on explicit owner approval in-channel; post-apply probes mirror rehearsal.
