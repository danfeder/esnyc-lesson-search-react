# PR 6b — Answer-key verification walkthrough: user rulings record

**Date:** 2026-06-12 (Session 7, interactive)
**Status:** IN PROGRESS — cluster rulings + heritage one-offs + pass rounds 1-3 (L1-L12) done; L13-L60 pending (waiting on header/filename sweep)
**Who:** USER = decision authority (OQ8 lock); supervisor presented evidence + recommendations.

These rulings are (a) corrections to the B2 pre-fill worksheet that produce
`answer-key.final.jsonl`, and (b) **policy seeds for the full-run prompt rules**
(B4) — each cross-batch ruling generalizes to the 767-lesson corpus.

## A. Cross-batch policy rulings

| # | Ruling | Detail / generalization |
|---|---|---|
| A1 | **CRF stamps: KEEP transcribed** (cell-primary) | All-features verbatim stamps in the CR cell stay as written (L3, L22, L33, L34, L37, L39, L54…). User overrode the discount-the-stamp recommendation. |
| A2 | **CRF inference allowed** when clearly demonstrated | No CR cell needed if the body concretely shows the practice (L1, L29, L40, L21). Weak cases (one warm-up question) stay empty (L12). |
| A3 | **SEL stamps: KEEP as written** (cell-primary extends to SEL) | All-5 CASEL stamps stay (L3, L39, …). Decided pass-round 1. |
| A4 | **Core competencies: evidence-based; CRF/SEL cells are special** | Doc-claimed competency cells do NOT auto-adopt (Plant Parts "kitchen skills" rejected — tasting-only). Zero-competency lessons allowed (L15). |
| A5 | **Religious-culture heritage: nearest regional value only with a regional anchor** | Eid Stuffed Dates → Middle Eastern (dates anchor); dishless Eid lesson stays empty (moot — L10 dropped). |
| A6 | **Ingredient-only inference banned for heritage** | Hummus "Middle Eastern" struck — body must name/work at the cultural level. Consistent with Pakistani-only + no-demographic-signal rules. |
| A7 | **Concepts vocab gaps → nearest-imperfect concept** | Keep subject findable; everyday phrases carry the precise topic. Fossil fuels → Environmental Stewardship; health talks → Healthy Choices; herbs-as-medicine → Health RESTORED + Healthy Choices. |
| A8 | **CCSS/standards citations are NOT grade claims** | Alignment refs ≠ audience. (One user per-lesson exception: L2 keeps grade 3.) |
| A9 | **Variation matrices ARE grade claims; vague band tokens don't expand** | K-1/2-3/4-5 rows count; "Older students" / "4th grade and up" / "age down for elementary" do not. |
| A10 | **R4 reconcile is PER-LESSON** | Cajun 3-5: drop Math+Arts concepts. Cajun 6-8: ADD Science subject AND drop Math+Arts. Blanket add-the-subject normalize rule confirmed wrong at least sometimes → B3 quantifies; runner rule revisit queued. |
| A11 | **Conditional/optional designed blocks COUNT** | "If time allows" Soil Lasagna keeps cooking; optional Weeding station ADDED to Roots. Optional teacher-background mentions also count for heritage when doc-claimed (Lenape → Tacos). |
| A12 | **Teacher-prepped tasting ≠ cooking, even mid-lesson** | Logos → academic only; cooking_methods emptied; Kitchen Skills competency dropped (follows A4 + tasting≠cooking). |
| A13 | **Topic arm only when nothing hands-on** | Lesson with no hands-on arm classifies by topic (Food Miles → garden). Hands-on lessons are typed by what students DO (Enchiladas DROPS garden; Tacos stays cooking-only). Garden-dependent competencies drop with it. |
| A14 | **Orientation bar** | First-session signals tag it; explicit recurring-class structure overrides familiarization wording (Garden Tasks stays untagged). |
| A15 | **Garden-skills bar: designed-and-practiced** | Incidental watering out; named-job/rotation watering in; worm-feeding counts as Composting; garden-material exception OK (I spy). |
| A16 | **Month→season: dated headers map** | "March" header → Spring, even without corroborating content. |
| A17 | **Cooking methods: culinary-knowledge inference OK** | Roux → stovetop fine (mechanical fact, unlike cultural inference). Unspecified heat ("while the food is cooking") → omit. Teacher-executed in-lesson recipe steps count. Ambiguous sauté-vs-roast → both. |
| A18 | **Integration bar: designed instruction in, incidental out** | The ~13 moderate-confidence keeps ratified (Applesauce Math, Peru SS, Carver-twin Historical Figures, Baleadas Geography, Similes Math…). |
| A19 | **Observances: doc-claimed ties count** | Looser than heritage on purpose — the field answers "what's this lesson FOR" (Compost Relay IP-Month + Earth Month keep; Rainsticks IP-Month keeps). |
| A20 | **SYSTEMIC — Drive filename + page header are pipeline inputs** | Grade/season claims live in filenames ("Indoors 3K/PK") and page headers (fall/spring) that `content_text` lacks. NEW B-task: capture both for all 767 corpus lessons + include in runner input; 59-lesson key sweep running now. |

## B. Heritage one-off verdicts (round 4-6)

- Rainsticks: South American KEPT (origin taught) · Pesto Pizza: EMPTY (one-liner) · Compost Relay: EMPTY (discussion beat in a compost lesson) — "taught as content vs mentioned" line confirmed.
- Lotion & Agar Soap MS + K: **ADD African American** (centering a Black historical figure counts).
- Dr. Carver Lotion-Making: **ADD Soul Food + Southern United States** (Hoppin' John taught as Black Southern foodway).
- Newly Freed Americans: as drafted (AfAm + Black culinary history + West African; no Southern US).
- Farm Workers & Pesticides: **ADD Mexican + Central American** (muralism taught AND practiced).
- Food of Peru: Peruvian only (chifa = one Q&A beat).
- Applesauce: **ADD North American** (the America line is taught content).
- Three Sister Arepas: **ADD Indigenous**; 3 Sisters Tacos: **ADD Lenape**.
- Baleadas: keep all three levels (Honduran + Central American + Latin American — HHM frame).
- Pupusas & Curtido: **DROP Spanish + Mexican** (→ Salvadoran + Latin American).
- Wild Soda: as drafted (Jamaican + Mexican + Caribbean; tag-row extras NOT mapped — body-support standard).
- Eid pair: Stuffed Dates + Middle Eastern; Celebrating Eid — see C1.

## C. Lesson-level outcomes, pass rounds 1-3 (L1-L12)

| L | Lesson | Outcome |
|---|---|---|
| L1 | Garden Tasks | CONFIRMED as drafted |
| L2 | All About the Garden | **grades KEEP [3]** — user per-lesson exception to A8 |
| L3 | Kuku Sabzi | CONFIRMED (CRF + SEL stamps stay per A1/A3) |
| L4 | Compost | CONFIRMED |
| L5 | Watersheds | CONFIRMED |
| L6 | Fossil Fuels | **+ Climate Change** (Science concept; user override of the agent's not-in-depth call) |
| L7 | Legend of the 3 sisters | CONFIRMED (3-level heritage incl. Lenape; gradeless) |
| L8 | Eid: Stuffed Dates | CONFIRMED (+ Middle Eastern per A5; Eid + Ramadan keep) |
| L9 | Similes | CONFIRMED (Math kept — students actively measure) |
| L10 | Celebrating Eid | **DROPPED FROM KEY — user verdict: incomplete lesson, DELETE from corpus** (follow-up logged; key = 59 lessons) |
| L11 | I spy…in the garden! | **grades → 3K, PK; season → Fall, Spring** (filename + page header — the A20 discovery case) |
| L12 | Herbs as Medicine | CONFIRMED with A7 applied (+ Health + Healthy Choices) |

## D. Pending cell changes from cluster rulings (apply at L13+ pass or at final apply)

- L13 Esquites: CRF named-feature kept as transcribed (A1). _Pass pending._
- L24 Applesauce: heritage + North American. L26 Hummus: heritage → EMPTY. L27 Arepas: + Indigenous.
- L37 Logos: → academic; − cooking_methods; − Kitchen Skills competency (A12).
- L39 Enchiladas: − garden; − Garden Skills competency (A13).
- L41/L42: + African American. L43: + Soul Food + Southern US. L44: + Mexican + Central American.
- L45 Roots: + Weeding (A11). L49 Tacos: + Lenape. L50 Pupusas: − Spanish − Mexican.
- L56/L57 Cajun twins: confirmed as drafted (A10).

## E. Follow-ups logged

1. **DELETE `lesson_…UKvQDo` (Celebrating Eid, L10)** from the corpus — incomplete lesson plan (user verdict). Goes to the cleanup track with the 23 imported drops; pre-delete FK checklist applies. Corpus 767 → 766.
2. **NEW B-task (pre-B3): filename + page-header capture** — fetch Drive filename + page header for all corpus lessons; include both in runner input; re-check key grades/seasons against the 59-lesson sweep.
3. DB `lessons.title` loses filename suffixes (e.g. "Indoors 3K/PK") — title-freshness audit candidate for the cleanup track.
