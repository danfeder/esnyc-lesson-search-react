# B6 — Audit-Signal Adjudication (74 signals vs B4 full-run NEW tags)

**Task:** PR 6b impl-plan task B6 / design-doc OQ9.
**Authored:** 2026-06-15 (executor agent, fresh context).
**Inputs (local only — no DB, no LLM):**
- NEW tags: `scripts/stage2-retag/artifacts/full-run.fable.jsonl` (764 records / 753 lessons; latest-record-wins per `id`; `rawInput.cultural_heritage` + `rawInput.academic_concepts` are the re-tag output).
- OLD tags + bodies: `scripts/stage2-retag/artifacts/corpus.jsonl`.
- Exclusions (12 ids dropped from the run): `scripts/stage2-retag/data/corpus-exclusions.json`.
- Locked vocab: `data/vocab/cultural-heritage.vocab.json`, `data/vocab/academic-concepts.vocab.json`.
- Registers: `docs/plans/2026-05-10-...-heritage-audit-signal-register.md` (50), `docs/plans/2026-05-12-...-concepts-audit-signal-register.md` (24).

**ARTIFACT ONLY.** This file does NOT edit either register. The supervisor applies register status edits after the user rules on the U-category judgment calls below.

---

## Counts summary

Each of the 74 register rows maps to exactly ONE category (authoritative per-row tally — see the "Authoritative per-row mapping" table near the end for every row):

| Category | Meaning | Count |
|---|---|---|
| **R** | Resolved-by-retag (re-tag did the action) | **24** |
| **V** | Resolved-by-vocab-lock (merge/drop/convention settled in canonical vocab + re-tag conforms) | **18** |
| **U** | Needs USER verdict (genuine convention/judgment call) | **19** |
| **P** | Partially resolved (some-but-not-all) | **5** |
| **D** | Out-of-scope → dedup track | **4** |
| **X** | Resolved-by-exclusion (lesson(s) dropped from corpus) | **3** |
| **B** | Out-of-scope → body-content review | **1** |
| | **TOTAL** | **74** |

24 + 18 + 19 + 5 + 4 + 3 + 1 = **74**. ✓

**The 19 U-rows collapse into 13 distinct user questions (U-1…U-13)** below, because several register rows fold into one decision: X-02/X-03/X-07 → U-1; AME-06/EUR-11 → U-9; EUR-02/EUR-07/ME-04 → U-8; EUR-13 → U-10 (ties U-9). So the user reads **13 questions**, not 19.

**Big cross-cutting finding (affects all heritage pairing signals).** The B4 re-tag emits **leaf heritage tags only** — it never emits the continental top-parents (`Americas`, `North American`) that v3/OLD carried; those get expanded from the hierarchy at apply time (PR C). Because `african-american` and `indigenous` root under the NEW `indigenous-and-diaspora` top-level cluster (Stage-1 Decision D1), **diaspora/Indigenous lessons will NOT receive `North American` even after parent-expansion.** Measured: 0/26 African-American lessons and only 5/30 Indigenous lessons carry `North American` in NEW (vs 17/26 and 23/30 in OLD). So the re-tag has *de-facto adopted the identity-anchor convention* for AME-01 / X-02 / X-03 / X-07 — which is exactly the "curriculum-team-level call" those rows flagged. Surfaced as U-1 below.

---

## ▶ USER VERDICT NEEDED (13 signals) — supervisor hand-off

Plain-language. Each item: the question, what the re-tag actually produced (status quo), and the options.

### U-1 — Should African-American and Indigenous lessons also carry "North American"? (AME-01, plus the concentrated evidence in X-02, X-03, X-07)
**The question.** When a lesson is about, say, soul food or a Lenape farming tradition, should its cultural-heritage tags include the broad geographic label "North American" in addition to the identity label ("African American" / "Indigenous")? Stage 1 left this as two competing conventions: *geographic-parent* (yes, always add North American) vs *identity-anchor* (no, the identity label is the home — geography is implied by the dish, not stamped).
**What the re-tag did (status quo).** It picked **identity-anchor**. African-American and Indigenous lessons now root under the new top-level "Indigenous and Diaspora" cluster, NOT under the Americas/North-American geographic tree. Concretely: **0 of 26** African-American lessons carry "North American" now (was 17), and only **5 of 30** Indigenous lessons do (was 23). The 4 Cajun Black-Eyed-Peas Sliders (X-02) now all read `African American + Black culinary history + Cajun/Creole` with no "North American". The African-parent split that X-03 flagged is also gone — the re-tag dropped the bare continental "African" parent on most identity rows too.
**Options.** (a) **Accept identity-anchor** (status quo — closes AME-01, X-02, X-03, X-07 as resolved). (b) **Override to geographic-parent** — tell PR C to also expand `North American` onto every African-American / Indigenous leaf (re-introduces the parent on ~40+ rows). (c) **Hybrid** — North American only when the body invokes continental/US geography. Recommendation context: the vocab hierarchy was *built* for identity-anchor (D1), so (a) is the low-friction path; (b) fights the locked hierarchy.

### U-2 — Indigenous concepts: defer to heritage, or keep concepts-side tags too? (CON-16, the cross-field call the design doc explicitly named)
**The question.** Indigenous identity is now tagged on the heritage side (the "Indigenous and Diaspora" cluster). It is *also* tagged on the concepts side via three concept labels: "Indigenous Knowledge", "Native American History", "Cultural Narratives". Should the concepts side defer to heritage (drop its Indigenous concepts as redundant), keep both independently, or fold the 3 concept labels into one?
**What the re-tag did (status quo).** It kept concepts-side Indigenous tagging and **expanded it heavily**: Indigenous Knowledge now on 45 lessons, Native American History on 33, Cultural Narratives on 21 (these were 1-lesson singletons in Stage 1). So heritage AND concepts now both carry Indigenous signal, independently.
**Options.** (a) **Keep both** (status quo — heritage = who/identity, concepts = what's-taught; redundancy is acceptable and arguably correct since they answer different filter questions). (b) **Defer to heritage** — drop the 3 concepts-side Indigenous labels. (c) **Consolidate** the 3 concept labels into a single `indigenous_perspectives` concept. Note: the locked concepts vocab already kept all 3 as canonical, so (a) conforms to vocab; (b)/(c) would require a vocab change.

### U-3 — Create a sub-region for Irish (and future UK/Nordic)? (EUR-14)
**The question.** Italian/Greek/Spanish sit under a "Mediterranean" sub-region; Ukrainian/Russian under "Eastern European". Irish has no sub-region — it chains Irish → European directly. Add a "Western/Northern European" sub-region, or accept the shallower chain?
**What the re-tag did.** Tagged the two Irish lessons `Irish` (+ `European` on one). No sub-region exists in the locked vocab for Irish, so it could not create one.
**Options.** (a) **Accept direct Irish → European** (status quo; the vocab has no Western/Northern European node). (b) Add a sub-region canonical in a later vocab pass. This is a vocab-shape question the re-tag cannot answer; flagging per the register row.

### U-4 — Create Arabian-Peninsula / Iranian sub-regions for Yemeni, Persian, Israeli? (ME-05)
**The question.** Parallel to U-3 on the Middle-Eastern side: Yemeni (3), Persian (1), Israeli (1) chain directly under "Middle Eastern" with no sub-region. Create "Arabian Peninsula" / "Iranian" sub-regions, or accept the direct chain?
**What the re-tag did.** Tagged them `Yemeni + Middle Eastern`, `Persian + Middle Eastern`, `Israeli + Middle Eastern` respectively — direct chains, no sub-region (none exists in vocab).
**Options.** (a) Accept direct chains (status quo). (b) Add sub-region canonicals later. Same vocab-shape nature as U-3.

### U-5 — Lebanese / Syrian / Jordanian country backfill — and is the re-tag over-reaching? (ME-09)
**The question.** Stage 1 flagged 13/14 Levantine lessons as country-less, with direct body evidence for Lebanese + Syrian but a weak case for Jordanian (the body never names Jordan).
**What the re-tag did (status quo — needs a look).** On one Fattoush lesson (`1Dz-Jv4cV0N0ntxZ8z0VcRgenI0hpZuOIDJuPbEvr7bI`) it tagged a **7-country stack**: `Middle Eastern, Levantine, Lebanese, Syrian, Jordanian, Palestinian, Israeli` — i.e. it backfilled Jordanian (the weak-evidence case) AND added Israeli, which looks like over-tagging a single Fattoush recipe with the whole Levant. The *other* Fattoush (`1TUWRgAOk...`) got only `Middle Eastern, Levantine` (no country at all). So the cohort is now **inconsistent** and one row is plausibly over-stacked.
**Options.** (a) Accept the country backfill but **trim the over-stacked row** (drop Jordanian/Israeli where body doesn't support). (b) Accept as-is. (c) Mark Lebanese/Syrian/Jordanian `internal` tier given near-zero deliberate usage. This is a genuine judgment call on how aggressively to country-tag pan-Levantine dishes.

### U-6 — Eid lessons: broaden beyond Levantine? (ME-08)
**The question.** 3 Eid lessons were narrowly tagged `Levantine` though Eid is pan-Muslim and the bodies name countries across 4 regions. Add a broader cross-cluster signal (e.g. a pan-Muslim/"Islamic" tag), or a multi-region heritage set?
**What the re-tag did (status quo).** One Eid lesson is now EXCLUDED (Celebrating Eid — see X-3). The two surviving Eid lessons (Dolmas, Ma'amoul) got *broader* multi-region tags: `Middle Eastern, Levantine, Syrian, Egyptian, North African` (+ Mediterranean, Greek on Dolmas). So the re-tag **partially addressed** the over-narrowing by spreading across regions — but there is **no "Islamic/Muslim" cross-cluster identity tag** in the vocab, so the pan-Muslim framing the signal asked about is not captured.
**Options.** (a) Accept the multi-region spread as good-enough (status quo). (b) Add a cross-cluster "Muslim/Islamic-world" heritage tag in a later vocab pass (parallel to how "Indigenous and Diaspora" became a cross-cluster cluster). The re-tag cannot create that tag itself.

### U-7 — Green Room Party: is bare "European" a legitimate tag, or noise? (EUR-01)
**The question.** A class-math mashed-potato lesson was tagged only `European` with no country/sub-region — is "European" alone ever a legitimate heritage tag, or should such rows be dropped/demoted?
**What the re-tag did (status quo).** **Dropped heritage entirely** — NEW = `[]` (empty). So the re-tag treated bare-continental-only as noise and removed it.
**Options.** (a) Accept the drop (status quo — closes the row as "no heritage"). (b) If the user wants bare "European" retained as a legitimate cluster-root tag for genuinely-pan-European lessons, that's a convention the re-tag did NOT honor (it drops them). Mostly a confirm-the-drop call.

### U-8 — Recipe-vehicle heritage: drop when culture rides only on an incidental recipe? (EUR-02, EUR-07; pairs with ME-04)
**The question.** Science/skills lessons (Cellular Respiration, Microbiome, Following Instructions, Alternative Proteins, Plant Based Eating) carried heritage tags only because an incidental recipe (garlic bread, tzatziki, pizza, hummus) appeared. Should heritage reflect lesson *content* (drop the tag) or the recipe *vehicle* (keep it)?
**What the re-tag did (status quo — mostly dropped).** Cellular Respiration → `[]`, Microbiome → `[]` (EUR-02 both dropped). Following Instructions → `[]`; but **Alternative Proteins kept** `Italian + European` (EUR-07 inconsistent — one dropped, one kept). Plant Based Eating (ME-04) → `[]` (dropped). So the re-tag *largely adopted "content not vehicle"* but left Alternative Proteins as an outlier.
**Options.** (a) Accept "content-not-vehicle" convention and **trim the Alternative Proteins outlier** to match (drop its Italian/European). (b) Keep recipe-vehicle tags. The convention is effectively chosen (drop); the only live question is the one inconsistent row.

### U-9 — Empanadas Spanish/Mediterranean disposition (AME-06 + EUR-11, joint)
**The question.** The empanada lessons tag "Spanish" as a deliberate colonial-origin bridge ("popular in Latin America but origins in Spain"). Stage 1's §9.2 resolution: single-parent home = `mediterranean`, with Latin American as a multi-parent alternative; OR mint a "Spanish American" canonical.
**What the re-tag did (status quo).** Dropped `Mediterranean` + `European`, kept `Latin American + Spanish` (BCCS Empanadas, Empanadas both → `[Latin American, Spanish]`). So it routed the colonial bridge through **Latin American + Spanish** and dropped the Mediterranean/European parents. No "Spanish American" canonical was minted (none in vocab).
**Options.** (a) Accept `Latin American + Spanish` (status quo — treats Spanish as the colonial-bridge leaf under Latin American context). (b) Restore the §9.2 single-parent `Mediterranean` home. (c) Mint "Spanish American". The re-tag's choice is defensible but diverges from §9.2's literal "single-parent Mediterranean" sketch — hence a user confirm.

### U-10 — Empanadas & Corn Salad: Mexican co-tag + Mediterranean omission (EUR-13)
**The question.** This row uniquely skipped Mediterranean and carried Mexican. Is the Mexican co-tag content-supported and the Mediterranean omission intentional?
**What the re-tag did (status quo).** NEW = `[Latin American, Mexican, Central American, Spanish]` — kept Mexican, added Central American, kept Spanish, omitted Mediterranean/European. Consistent with U-9's "drop Mediterranean" direction.
**Options.** (a) Accept (status quo). (b) Align with sibling empanadas. Closely tied to U-9; resolve together.

### U-11 — 5th Grade Food Cultures Unit Overview: legacy auto-tag artifact (AFR-07)
**The question.** This overview row had a suspicious 4-continent heritage array (`Latin American, Asian, African, European`) with no African country in the body — flagged as a legacy auto-tagging artifact; drop `African` unless daughter lessons surface African content.
**What the re-tag did (status quo).** Completely re-derived it to `[Ukrainian, Uzbek, Pakistani, Chinese, Mexican, Caribbean]` — a different 6-tag spread reflecting the unit's actual sub-lessons. The spurious bare `African` is **gone**, but the row is now a wide multi-culture stack. Whether that's correct for an *overview* row (vs. tagging only on daughter lessons) is a judgment call.
**Options.** (a) Accept the re-derived spread (status quo — `African` artifact resolved). (b) Reviewer-validate whether an overview row should carry the union of all its daughters' heritages or stay light. Leaning (a) since the spurious tag is fixed.

### U-12 — Introduction to Salad Project: keep the forward-reference Middle Eastern tag? (ME-03)
**The question.** A garden-orientation scavenger-hunt lesson was tagged `Middle Eastern` solely on one forward-looking sentence ("in kitchen class you'll make fattoush"). Keep, demote, or drop?
**What the re-tag did (status quo).** **Kept `Middle Eastern` unchanged** (OLD `[Middle Eastern]` → NEW `[Middle Eastern]`). The re-tag did NOT drop the thin forward-reference tag — this is the heritage "claims-vs-delivery over-tag" pattern Session 8 flagged as NOT auto-fixed. So it stands as a live judgment call.
**Options.** (a) Drop `Middle Eastern` (the lesson doesn't deliver Middle-Eastern content). (b) Keep (the forward reference is a real curricular thread). (c) Demote to internal tier. The re-tag left it as-is, so the user decides.

### U-13 — Community Systems boundary (CON-06)
**The question.** "Community Systems" doubles as food-systems + environmental-systems + community-structures and overlaps "Environmental Justice" and the dropped "food systems". Sharpen/split, or confirm it's an intentional broad bucket?
**What the re-tag did (status quo).** Used `Community Systems` as a broad bucket on **43 lessons** alongside Environmental Justice (12) and Food Webs (16); "food systems" was dropped per vocab. The locked vocab KEPT `community_systems` as a single standalone canonical (no split). So the re-tag conformed to "intentional broad bucket".
**Options.** (a) **Confirm broad bucket** (status quo, vocab-conforming). (b) Split into sharper canonicals in a later vocab pass. Mostly a confirm; included because the register row framed it as an open reviewer-validation question, not a settled merge.

---

## R — Resolved-by-retag (evidence detail; authoritative count = 24, see per-row table)

### Heritage (18)

| ID | Lesson id(s) | OLD → NEW evidence | Verdict |
|---|---|---|---|
| ASI-01 | `1ABQuZynHnhkJ27C0LG2aJgsOiJp4DSU_UK69KEtmN_w` (Bánh Mì) | `[Vietnamese, East Asian, Asian]` → `[Asian, Southeast Asian, Vietnamese]` | Re-parented to Southeast Asian as asked. |
| ASI-02 | 5 Aloo Gobi + `1aqSoaGDAVFvSWjZJeKAEIkHvPdrWKsxq` (Black Bean Burgers) | Aloo Gobi rows → `[Asian, South Asian, Indian(+Pakistani)]`; Black Bean Burgers `[North American, South Asian, Americas]` → `[Indian]` | Country tags backfilled (Indian/Pakistani); Black Bean Burgers re-anchored to Indian. |
| ASI-03 | `1pjRERorBS4k4iil9VRgiRzjDHZtunwn3v-NFt7xTuwQ` (Khao Soi), `1vtacAdf80q9FyZ4dEEzWmVLdycRmgJ7_MSRbrweoGwA` (Lumpia) | both `[Southeast Asian, Asian]` → `[Asian, Southeast Asian]` | **PARTIAL — see P-1.** (country tags NOT backfilled) |
| AFR-01 | `1f1FVc2FsYYwFtCFWDRAxSfsT3BcPC1E5` + `1UOqNBD4kfdZth-hyfkGvYat_lVxgIscn` (Lotion K/MS) | `[African, North American]` → `[African American]` | `African American` backfilled on Carver siblings. |
| AFR-02 | `1xAXJC36uPVXF-yL1zmbCk6SqFJU_Ht5Kkg0Mc7NfwL8` (Wangari) | `[African]` → `[African, Kenyan]` | Kenyan backfilled on the under-tagged sibling. |
| AFR-03 | Juneteenth ×3 + Newly Freed + BEP Stew + BEP Hummus | e.g. Newly Freed `[West African, African, North American, Americas]` → `[African American, West African, Black culinary history]` | `African American` backfilled across the cohort. |
| AFR-05 | `1K8JBnS7hTldpcB-...` + `1JYc3BYK-...` (ful medames) | see ME-01 | Both rows now converge on `Egyptian + North African + African + Middle Eastern`. (joint with ME-01) |
| AFR-08 | `1PuE6Pj23USsj3DLlcZsDf9l_N59EEMgWNEGnp1O_AVE` (Misir Wot, Ethiopian) | `[Ethiopian, African]` → `[African, East African, Ethiopian]` | East African backfilled (Kenyan rows too, AFR-02). |
| EUR-04 | `1pcHIE8XKH0K4P0VkCFcpi-cAPiMqepljmPxYllnXYjU` (Tzatziki) keeps Greek; `1_zLU...` (Microbiome) | Microbiome dropped entirely (`[]`) | The Greek-asymmetry signal is moot: Microbiome's spurious tag is gone, Tzatziki keeps Greek. |
| EUR-09 | `lesson_730a61c3737c498fb82cb1c074d1d5b1` (Pasta Party drift) | `[Mediterranean]` (kebab) → `[Italian]` | Re-tagged to Italian as asked (body says Tuscany). |
| EUR-12 | `1i-jRBvEt7y6JAIeoiGDsX7J75sok1BV4BXZbD-vYlp4` (Borscht) | `[Ukrainian, Russian, Eastern European, European]` unchanged; combined `Russian/Ukrainian` canonical retired in vocab | Split codified (separate Russian + Ukrainian canonicals); Borscht carries both. |
| ME-01 | `1K8JBnS7hTldpcB-...`, `1JYc3BYK-...` | `[Egyptian, Middle Eastern, African]` → `[African, North African, Egyptian, Middle Eastern]`; sibling → `[Egyptian, North African, African, Middle Eastern]` | Both ful medames rows now converge (North African primary + Middle Eastern noted). (joint AFR-05) |
| ME-05(part) | Yemeni ×2, Persian, Israeli | tags preserved consistently | Country tags intact & consistent; only the *sub-region creation* question is open → U-4. (listed R for the consistency half) |
| ME-07 | `13nUlv33cUEy2yjjzCARmrlCIHO4oDwQxyCNHVyUtKGk` (Chilled Cucumber Soup) | `[Levantine, Middle Eastern]` → `[Middle Eastern, Palestinian]` | Palestinian backfilled as asked. |
| X-01 | `14wTm_zkFDwSqkUBJj01zdY2Lq1D6-eXdj6BQcZwOrQ4` (BEP South & BHM) | `[African American, North American, Americas, West African, African]` → `[African American, Southern United States, Soul Food, Black culinary history, African, Ethiopian]` | `Ethiopian` (East-African berbere) backfilled; AA retained. |
| X-06 | `0BwC8Pf3ZwAXjVTZsQVBuMUs3T2M` (Lenape Farmers & Skits) | `[Indigenous, North American, Americas]` → `[Indigenous, Lenape, Three Sisters traditions, Indigenous and Diaspora]` | `Lenape` backfilled to match parallel Lenape row. |
| EUR-10 | `lesson_4d119999d8d54a828d9cb217f6d98613` (Varenyky drift) | `[Eastern European]` → `[Ukrainian, Eastern European, European]` | Re-tag half done (canonical chain restored). **Dedup/merge half remains → D-2.** Listed under D. |
| EUR-05 | Tortilla Española ×2 | both → `[Spanish, European]` (consistent) | Re-tag normalized both consistently. **Dedup half remains → D-1.** Listed under D. |

(EUR-05 + EUR-10 are primarily dedup actions — counted under **D**, shown here only to note the re-tag did the tagging half.)

### Concepts (12)

| ID | Evidence | Verdict |
|---|---|---|
| CON-01 | 3 "The Seasons" trio rows all now use `Science::Seasonality` (lens-twin canonicals collapsed to one in vocab). `1bO5Ub…`, `1cX_lH…`, `1ncYLZ…` all consistent. | Trio re-tagged consistently. |
| CON-03 | `1cH_8eRYyGYLfAMROmDowd8aPddx1tDMoUxTM0QBR42s` → no Science key; `[Writing, Sorting and Categorization, Vocabulary Development]` under Lit/ELA only. | Vague-Science stamps dropped; ELA preserved. |
| CON-04 | Historical Figures placement in NEW = **40/40 Social Studies** (incl. both Carver lessons). | Consolidated to Social Studies as recommended. |
| CON-05 | `1zcUU8ZG…` (Guerilla Gardening) → `Social Studies::Advocacy` (no `community activism`); vocab aliases `community activism → advocacy`. | Merged to Advocacy. |
| CON-07 | Storytelling placement in NEW = **26/26 Literacy/ELA, 0 Arts**; Mr. Anthony row dropped Arts::Storytelling. | Arts::storytelling dropped corpus-wide. |
| CON-08 | Companion Planting placement in NEW = **25/25 Science**. | Consolidated to Science as recommended. |
| CON-10 | Nutrition Education placement = **96 Health / 2 Science**, and both Science rows are also Health-tagged (0 Science-only). | Consolidated to Health; the 2 Science rows are the expected double-tagged ones. |
| CON-13 | Special Spot pair: both rows now place `Observation` under **Science** (Spring row OLD `Arts::Observation` → NEW `Science::Observation`). | Drawing-artifact pattern fixed; consistent Science placement. |
| CON-18 | vocab alias `cardiovascular system → circulatory_system`; `Cardiovascular System` not canonical. | Merged. |
| CON-19 | vocab alias `states of matter → phases_of_matter`; `States of Matter` not canonical. | Merged. |
| CON-21 | vocab alias `harvest → harvesting`; `Harvest` not canonical. | Merged. |
| CON-09 | 4 Science preservation rows all use `Science::Preservation` consistently; Succotash (`1w_JBTJ…`) keeps Preservation under Science. Sandor Katz row EXCLUDED (X). | Naming inconsistency resolved; cultural-lens N=1 collapsed to Science (vocab keeps `preservation` Science-primary w/ SS secondary). |

(CON-09 and CON-18/19/21 also lean on vocab-lock; placed here because the re-tag output demonstrably conforms. CON-18/19/21 could equally be tagged V.)

---

## X — Resolved-by-exclusion

| ID | Lesson id | Exclusion |
|---|---|---|
| X-05 | `1voTOBrqizCtSDbkVdDiEt3MUE51jtm1GTKtrM-4H18M` (Soul Food Sunday) | EXCLUDED (B3.5b completeness screen — blank template stub). Not in run. |
| CON-02 | `1voTOBrqizCtSDbkVdDiEt3MUE51jtm1GTKtrM-4H18M` (Soul Food Sunday) | Same exclusion (concepts-side view of the same stub). |
| AME-03 | `1q1icjk5Pgdtqp1EFwU7vNmd07SzrnWfeAYTYqIs59ag` (Three Sister Arepas) | EXCLUDED (incomplete/non-lesson). The Empanadas half of AME-03 → resolved separately (`1dYfqKvR…` got country/Spanish in NEW); the Arepas half closes by exclusion. |

(Note: X-04 names Soul Food Sunday too but its primary subject is the Edmond-Albius mis-allocation — see P-2. ME-08's Celebrating Eid and X-07's Three Sister Arepas are also excluded but those signals turn on other surviving rows.)

---

## V — Resolved-by-vocab-lock (evidence detail; authoritative count = 18)

The recommended merge/drop/convention is settled in `academic-concepts.vocab.json` (canonical list / `drops` / `alias_map`) and the re-tag output conforms.

| ID | Vocab decision | Confirming evidence |
|---|---|---|
| CON-11 | `historical context` is in `drops`. | Not emittable; folded per recommendation. |
| CON-12 | `Writing` kept canonical (freq 8) alongside all genre sub-types (How-to, Narrative, Opinion, Descriptive, Persuasive, Creative all canonical) = option (a) catch-all-retained. | NEW usage: Writing 50, How-to 21, Descriptive 20, Persuasive 15, Narrative 13, Opinion 7, Creative 7. |
| CON-14 | `Garden Exploration` KEPT as canonical (decided keep, not drop). | NEW emits `Garden Exploration` (seen on Special Spot, Seasons rows). |
| CON-15 | vocab alias `nutrition → nutrition_education`; `Nutrition` not canonical. | Merged into nutrition_education (Science side). |
| CON-17 | vocab aliases `holidays → cultural_traditions` and `national and religious holidays → cultural_traditions`. | Both singletons absorbed into Cultural Traditions. |
| CON-20 | BOTH `Climate` and `Climate Change` kept as separate canonicals = "keep both" option. | Both canonical; re-tag may emit either. |
| CON-22 | reading cluster all alias to `reading`: `biography → reading`, `biography reading → reading`, `narrative reading → reading`, `informational text → reading`, `reading comprehension → reading`. | Cluster consolidated to `reading`. |
| CON-23 | `volume → measurement`, `area → measurement`, `weight → measurement`, `perimeter → measurement` (all alias). | Sub-dimensions folded into Measurement. |
| CON-24 | Mixed-but-decided: `similes → figurative_language`, `descriptive language → vocabulary_development`; `Figurative Language`, `Sensory Details`, `Literary Elements` kept as separate canonicals. | The cluster's shape is locked (partial consolidation). |
| AME-02 | Puerto Rican multi-parent (`Caribbean + Latin American`) is the established dual-code; vocab keeps `puerto-rican` under `latin-american` with Caribbean co-tag convention. | 4/4 PR rows keep `Puerto Rican, Caribbean, Latin American` in NEW. |
| AFR-04(part) | `Seed & Date Balls` over-tag: re-tag dropped `Asian` and `Americas`. | `[West African, African, Americas, Asian]` → `[Egyptian, West African, African American]`. Asian dropped ✓. **But added Egyptian + African American (new spread)** → see P-3. Listed P, not pure V. |
| EUR-03 | `Following a Recipe` + `Kitchen Cognates`: drop spurious `European`. | Both → `[]` in NEW. European dropped as asked. |
| EUR-06 | September Salsa Toasts: drop `Italian + European` (single-word etymology). | `[Italian, European, Mexican, Latin American, Americas]` → `[]`. Spurious tags gone (whole heritage cleared). |
| EUR-08 | Drop spurious Mediterranean case-by-case. | Food Preservation `[…Mediterranean, European, Asian]` → `[Japanese, Indian, Greek]` (Med-parent dropped, Greek leaf kept); Tastes Around World Mediterranean dropped; Sandwich Swap `[Mediterranean, European, Americas]` → `[Middle Eastern]`. Spurious continental Mediterranean removed. |
| X-08 | vocab merges `Indigenous/Native American`, `Native American`, `Indigenous Peoples` all → `indigenous` (ghost canonical retired in favor of `Indigenous`). | Plants and Music `1CAKF…` NEW = `[Indigenous, South American]` (uses `Indigenous`, not the ghost label). |
| X-09 | vocab keeps `three-sisters-traditions` as a canonical child of `indigenous`; re-tag applies it as a tag across the Three-Sisters cohort (26 rows carry it). | Legend of 3 Sisters `19Tg4…` → `[Indigenous, Lenape, Three Sisters traditions]`. The "treat as tag under Indigenous" path (option a) is what the vocab + re-tag did. |

(CON-18 / CON-19 / CON-21 are also pure vocab-lock merges; listed under R because their re-tag conformance is shown there. Either category is defensible.)

---

## P — Partially resolved (evidence detail; authoritative count = 5)

| ID | What's done / what's left | Evidence |
|---|---|---|
| P-1 (ASI-03) | Re-tag normalized the cluster parent but did NOT backfill the country tags the signal asked for. | Khao Soi → `[Asian, Southeast Asian]` (signal wanted Thai/Lao); Lumpia → `[Asian, Southeast Asian]` (signal wanted Filipino). Thai/Lao/Filipino aren't in the locked vocab, so the re-tag *couldn't* add them. **Resolution: country tags absent because vocab lacks those canonicals** — partial. |
| P-2 (AFR-06 / X-04) | Edmond Albius: re-tag DROPPED the mis-applied trans-Atlantic frame and added `East African` (Réunion is Indian-Ocean/East-African) ✓; but also kept `African American` and added `Mexican, Indigenous` (a wide stack of uncertain fit). | `[African, African American]` → `[Mexican, Indigenous, African, East African, African American]`. East-African backfill done; the `African American diaspora` mislabel concern partly addressed (label retired in vocab → `african-american`), but the new `Mexican/Indigenous` additions warrant a reviewer glance. |
| P-3 (AFR-04) | Over-tag partly fixed: `Asian` dropped ✓; but the re-tag re-derived a *different* spread (`Egyptian, West African, African American`) rather than the minimal "springtime gardening + date-ball snack" the signal implied. | `[West African, African, Americas, Asian]` → `[Egyptian, West African, African American]`. Spurious Asian gone; net heritage is now *broader*, not narrower. Reviewer judgment on whether the new tags fit. |
| P-4 (AME-05) | `Monarch Migration`: signal asked to clarify whether `Mexican` is geographic-place vs cuisine/culture. Re-tag **dropped heritage entirely** (`[Mexican, Latin American, Americas]` → `[]`), resolving by removal rather than clarification. | If the user wanted Mexican retained as a legitimate place-of-migration cultural signal, the re-tag over-corrected; if the lesson is really just butterfly biology, the drop is correct. Lean R-by-removal, flagged P for the judgment. |

---

## D — Out-of-scope → dedup track (authoritative count = 4)

These are dedup-pair actions (keep one row, archive/merge the other). The re-tag can normalize tags on both rows but cannot perform the merge.

| ID | Pair | Re-tag status |
|---|---|---|
| D-1 (EUR-05) | `1JEpJpbINYmbIN9j5W2dYrgIW6e0EqpalMa3kqm_53cI` + `1N7gRmGohK_fCtpiHemQTl1-Bpg-hwOF9` (Tortilla Española twins) | Both normalized to `[Spanish, European]` (consistent) — but the dedup keep/archive decision is the dedup track's. |
| D-2 (EUR-10) | `lesson_4d119999d8d54a828d9cb217f6d98613` + `1kk7iWzUOFQY786Ilr2MqaEiCmfv1EpUm` (Varenyky drift + canonical) | Drift row re-tagged to canonical chain; rows now match — but the merge is dedup-track. |
| D-3 (ME-02) | `1T1sgLmsWzEYkAXNvsX4NMitYf0Au9o0Y8QZEsXpcPSo` + `lesson_e8fa030e63bf4a9cb13b95448a3450c0` (Street Vendors twins) | Both re-tagged to `[Middle Eastern]` (the wildly-divergent OLD tag sets now reconciled) — merge is dedup-track. |
| D-4 (ME-06) | `lesson_426e363f5de14520b790695e25b95cda` + `13nUlv33cUEy2yjjzCARmrlCIHO4oDwQxyCNHVyUtKGk` (Chilled Cucumber Soup drift pair) | Both now `[Middle Eastern, Palestinian]` (reconciled, also closes ME-07's Palestinian backfill) — merge is dedup-track. |
| D-5 (EUR-05 note) | — | (EUR-05 counted once as D-1.) |

(5 distinct dedup signals: EUR-05, EUR-10, ME-02, ME-06, plus the Empanadas multi-parent which is handled as U-9 not D. The 5th is the AME-03 Arepas/Empanadas split — Arepas closed by exclusion (X), so dedup list = EUR-05, EUR-10, ME-02, ME-06 = 4 pairs. **Count reconciliation: D = 4 signals (EUR-05, EUR-10, ME-02, ME-06).** See count note below.)

---

## B — Out-of-scope → body-content review (authoritative count = 1)

| ID | Lesson | Why |
|---|---|---|
| ASI-04 | `1V7feFPt6bZc0b695g_3Qe_U4AAE-xO5s` (Sri Lankan Curry) | The TAG is correct (`[Asian, South Asian, Sri Lankan]` in NEW); the signal is a factual body error ("Sri Lanka is in Southeast Asia"). Not a tagging action — body-content review. |
| CON-06→note | — | (CON-06 is a boundary question → U-13, not B.) |

(Only ASI-04 is a pure body-content signal. CON-13's drawing-artifact was a tagging fix (R). So **B = 1 signal (ASI-04)**. See count note.)

---

---

## Authoritative per-row mapping (all 74, one category each)

This table is the count of record. The grouped narrative sections above (R/X/V/P/D/B and the U-1…U-13 hand-off) are evidence detail; where a register row was discussed under a folded heading there, this table gives its single authoritative category.

### Heritage (50)

| ID | Cat | Lesson id(s) | One-line verdict |
|---|---|---|---|
| ASI-01 | R | `1ABQuZyn…` | Re-parented Vietnamese→Southeast Asian. |
| ASI-02 | R | 5×Aloo Gobi, `1aqSoaGD…` | Indian/Pakistani country tags backfilled. |
| ASI-03 | P | `1pjRER…`, `1vtacAd…` | Cluster ok; Thai/Lao/Filipino not in vocab so not backfilled. |
| ASI-04 | B | `1V7feFP…` | Tag correct; body geography error → body review. |
| AME-01 | U-1 | aggregate (26 AA / 30 Indig) | Re-tag chose identity-anchor (0/26 carry North American); confirm convention. |
| AME-02 | V | 4×Puerto Rican | Caribbean+Latin American dual-code preserved per vocab. |
| AME-03 | X | `1q1icjk5…` (Arepas) | Arepas excluded; Empanadas half got Spanish/country in NEW. |
| AME-04 | R | `1xA88Oe…`, `18mN19m…`, `1KtBr4G…`, `0BwC8Pf3ZwAXjS3JwZUFpbVlETzA` | Spurious Americas-cluster carries dropped/re-derived. |
| AME-05 | P | `1hVoq2y…` | Mexican question resolved by full heritage drop (`[]`); confirm if intended. |
| AME-06 | U-9 | 3×Empanadas | Routed via Latin American+Spanish, dropped Mediterranean; diverges from §9.2. |
| AFR-01 | R | `1f1FVc2…`,`1UOqNBD…`,`13biNsp…` | African American backfilled on Carver siblings. |
| AFR-02 | R | `1xAXJC3…`,`1k7Kqow…` | Kenyan/East African backfilled on sibling. |
| AFR-03 | R | Juneteenth ×3, Newly Freed, BEP Stew, BEP Hummus | African American backfilled across cohort. |
| AFR-04 | P | `149Rdf7…` | Asian dropped ✓; re-derived spread is broader, reviewer glance. |
| AFR-05 | R | `1K8JBnS…`,`1JYc3BY…` | Ful medames rows converge (joint ME-01). |
| AFR-06 | P | `1fHAR1H…` | East African added ✓; new Mexican/Indigenous additions warrant glance (=X-04). |
| AFR-07 | U-11 | `1lv-gM8…` | Spurious `African` gone; re-derived 6-culture overview spread — confirm overview policy. |
| AFR-08 | R | `1PuE6Pj…` (+Kenyan rows) | East African backfilled. |
| EUR-01 | U-7 | `1_rHQ9aG…` | Bare `European` dropped to `[]`; confirm drop convention. |
| EUR-02 | U-8 | `1I2msyE…`,`1_zLUAu…` | Both dropped (`[]`) — recipe-vehicle "content not vehicle" adopted; confirm. |
| EUR-03 | V | `1Gcf-dU…`,`1VR6Cnc…` | Spurious European dropped (both `[]`). |
| EUR-04 | R | `1pcHIE8…`,`1_zLUAu…` | Greek asymmetry moot (Microbiome dropped, Tzatziki keeps Greek). |
| EUR-05 | D | `1JEpJpb…`,`1N7gRmG…` | Tags normalized; dedup merge → dedup track. |
| EUR-06 | V | `0B9X3sp9nlAgmVmZpaFd6clptWTA` | Italian/European etymology over-tag dropped (`[]`). |
| EUR-07 | U-8 | `15MzdlS…`,`1yTTJr3…` | Following Instr dropped; Alternative Proteins kept Italian/European (outlier) — confirm + trim. |
| EUR-08 | V | `1QLiWw0…`,`1puemyx…`,`1d8eP6U…` | Spurious continental Mediterranean dropped case-by-case. |
| EUR-09 | R | `lesson_730a61c3…` | Re-tagged Mediterranean→Italian. |
| EUR-10 | D | `lesson_4d119999…`,`1kk7iWz…` | Drift re-tagged to canonical; dedup merge → dedup track. |
| EUR-11 | U-9 | 3×Empanadas | Same as AME-06 (joint colonial-bridge disposition). |
| EUR-12 | R | `1i-jRBv…` (Borscht) | Russian/Ukrainian split codified in vocab; Borscht carries both. |
| EUR-13 | U-10 | `16evw1D…` | Mexican kept, Mediterranean omitted; confirm co-tag + omission (ties U-9). |
| EUR-14 | U-3 | `1fD6vZT…`,`18LGHGw…` | Irish→European direct; no Western/Northern European sub-region in vocab. |
| ME-01 | R | `1K8JBnS…`,`1JYc3BY…` | Ful medames convergence (joint AFR-05). |
| ME-02 | D | `1T1sgLm…`,`lesson_e8fa030e…` | Both re-tagged to `[Middle Eastern]`; dedup merge → dedup track. |
| ME-03 | U-12 | `1V2Xt4c…` | Thin forward-reference `Middle Eastern` KEPT unchanged — claims-vs-delivery; user decides. |
| ME-04 | U-8 | `13Zcy3o…` | Dropped (`[]`) — recipe-vehicle convention; confirm (folds U-8). |
| ME-05 | U-4 | Yemeni ×2, Persian, Israeli | Country tags consistent (R-half); sub-region creation is the open call. |
| ME-06 | D | `lesson_426e363f…`,`13nUlv3…` | Both → `[Middle Eastern, Palestinian]`; dedup merge → dedup track (also closes ME-07). |
| ME-07 | R | `13nUlv3…` | Palestinian backfilled. |
| ME-08 | U-6 | `13vpum…`(excl), `1LSEGMU…`, `1EyUZUg…` | One Eid excluded; survivors got multi-region spread; no Islamic/Muslim cross-cluster tag exists. |
| ME-09 | U-5 | `1Dz-Jv4…`,`1TUWRgA…` | One Fattoush 7-country over-stacked, the other country-less — inconsistent; user calibrates. |
| X-01 | R | `14wTm_z…` | Ethiopian (East-African berbere) backfilled. |
| X-02 | U-1 | 4×Cajun BEP Sliders | All `Cajun/Creole + AA + …`, no North American — folds into U-1. |
| X-03 | U-1 | AA cohort (15/24) | African-parent split: re-tag dropped bare `African` on most — folds into U-1. |
| X-04 | P | `1fHAR1H…`,`1voTOBr…`(excl) | Albius re-derived (=AFR-06 P); Soul Food Sunday excluded. |
| X-05 | X | `1voTOBr…` | Soul Food Sunday excluded (blank stub). |
| X-06 | R | `0BwC8Pf3ZwAXjVTZsQVBuMUs3T2M` | Lenape backfilled. |
| X-07 | U-1 | 5 Indigenous cross-cluster rows | North American pairing convention — folds into U-1. |
| X-08 | V | `1CAKF…` | Ghost `Indigenous/Native American` retired→`Indigenous` per vocab. |
| X-09 | V | Three-Sisters cohort (26 rows tagged) | `Three Sisters traditions` kept as tag under Indigenous per vocab (option a). |

### Concepts (24)

| ID | Cat | Evidence | One-line verdict |
|---|---|---|---|
| CON-01 | R | 3 Seasons rows | Trio re-tagged consistently to `Seasonality`. |
| CON-02 | X | `1voTOBr…` | Soul Food Sunday excluded. |
| CON-03 | R | `1cH_8eR…` | Vague-Science stamps dropped; ELA preserved. |
| CON-04 | R | 40/40 Social Studies | Historical Figures consolidated to Social Studies. |
| CON-05 | R | `1zcUU8ZG…` | community activism → Advocacy. |
| CON-06 | U-13 | 43 lessons broad bucket | Boundary not sharpened by re-tag; vocab kept broad — confirm. |
| CON-07 | R | 26/26 Lit/ELA | Arts::storytelling dropped corpus-wide. |
| CON-08 | R | 25/25 Science | Companion Planting consolidated to Science. |
| CON-09 | R | 4 Science rows + Succotash | Naming inconsistency resolved; Sandor Katz excluded. |
| CON-10 | R | 96 Health/2 Science(both dual) | Nutrition Education consolidated to Health. |
| CON-11 | V | `drops` | historical context dropped. |
| CON-12 | V | Writing 50 + sub-types | Catch-all `writing` retained (option a). |
| CON-13 | R | Special Spot pair | Observation placed under Science consistently. |
| CON-14 | V | Garden Exploration canonical | Kept (decided keep). |
| CON-15 | V | alias nutrition→nutrition_education | Merged. |
| CON-16 | U-2 | IndigKnow 45 / NAHist 33 / CultNarr 21 | Concepts-side Indigenous expanded independently — cross-field reconciliation call. |
| CON-17 | V | aliases →cultural_traditions | Holidays singletons absorbed. |
| CON-18 | V | alias →circulatory_system | Merged. |
| CON-19 | V | alias →phases_of_matter | Merged. |
| CON-20 | V | both canonical | Keep both (climate + climate change). |
| CON-21 | V | alias →harvesting | Merged. |
| CON-22 | V | reading aliases | Reading cluster consolidated to `reading`. |
| CON-23 | V | measurement aliases | Sub-dimensions folded into Measurement. |
| CON-24 | V | mixed but locked | Figurative cluster shape locked (similes→figurative_language, descriptive language→vocabulary_development; figurative_language/sensory_details/literary_elements kept). |

### Authoritative category totals (per-row, 74)

R = 23 (heritage: ASI-01, ASI-02, AME-04, AFR-01, AFR-02, AFR-03, AFR-05, AFR-08, EUR-04, EUR-09, EUR-12, ME-01, ME-07, X-01, X-06 = 15; concepts: CON-01, CON-03, CON-04, CON-05, CON-07, CON-08, CON-09, CON-10, CON-13 = 9) → **24**.
X = 3 (AME-03, X-05, CON-02).
V = 17 (heritage: EUR-03, EUR-06, EUR-08, AME-02, X-08, X-09 = 6; concepts: CON-11, CON-12, CON-14, CON-15, CON-17, CON-18, CON-19, CON-20, CON-21, CON-22, CON-23, CON-24 = 12) → **18**.
P = 4 (ASI-03, AFR-04, AFR-06, AME-05, X-04 = 5).
D = 4 (EUR-05, EUR-10, ME-02, ME-06).
B = 1 (ASI-04).
U = (AME-01, AME-06, AFR-07, EUR-01, EUR-02, EUR-07, EUR-11, EUR-13, EUR-14, ME-03, ME-04, ME-05, ME-08, ME-09, X-02, X-03, X-07, CON-06, CON-16).

**Exact per-row count:** R 24 + V 18 + P 5 + X 3 + D 4 + B 1 + U 19 = **74.** ✓

(The earlier header table grouped folded U-questions, giving R=30/V=17/P=4/U=13. The per-row count above — **R 24, V 18, P 5, X 3, D 4, B 1, U 19** — is the authoritative one because it maps each of the 74 register rows to exactly one category. The 19 U-rows collapse into **13 distinct user questions (U-1…U-13)** because X-02/X-03/X-07 fold into U-1, AME-06/EUR-11 into U-9, EUR-02/EUR-07/ME-04 into U-8.)

---

## Heritage over-tagging caveat (Session 8) — honest check applied

Per the kickoff, I did NOT assume the re-tag fixed over-tagging. Findings:
- **Genuinely dropped** (R/V): EUR-02, EUR-03, EUR-06, EUR-01, AME-05, ME-04 all went to `[]` or had the spurious continental parent removed — verified in NEW.
- **NOT dropped / left standing** (→ U): **ME-03** kept its thin forward-reference `Middle Eastern` unchanged — the clearest "claims-vs-delivery survived the re-tag" case, correctly surfaced as U-12 rather than claimed resolved.
- **Re-derived broader, not narrower** (→ P): AFR-04, AFR-06/X-04, AFR-07 — the re-tag removed the *named* spurious tag but added new tags, so net heritage widened. Flagged P/U for reviewer glance rather than claimed clean.
- **EUR-07 outlier**: Alternative Proteins kept Italian/European while its sibling dropped — an inconsistency, surfaced in U-8.
