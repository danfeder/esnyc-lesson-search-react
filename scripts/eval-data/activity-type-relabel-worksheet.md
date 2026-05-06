# Activity Type Relabel Worksheet — v1 DEPRECATED 2026-05-06

> **STATUS: DEPRECATED.** Superseded by D2.1 multi-select refinement decision (Session 27, 2026-05-06).
>
> This worksheet was built for a single-label format with the 5-value vocab including `'both'`. Mid-session investigation found 5+ multi-axis lessons in the 26-candidate set that single-label couldn't represent without forced mis-classification. User chose to switch `activity_type` to true multi-element array and retire `'both'` entirely.
>
> **What replaces this:** worksheet v2 at `scripts/eval-data/activity-type-relabel-worksheet-v2.md` (to be built post-PR-1b). v2 covers all 113 reviewer-tagged submissions × multi-label format against the 4-value vocab (`cooking / garden / academic / craft`).
>
> **Why preserved:** historical reference for the v1→v2 reasoning trail. Decision journal D2.1 + execution status Session 27 entry both reference this file.
>
> **DO NOT FILL THIS WORKSHEET IN.** It will not be parsed; the format is wrong post-D2.1.
>
> See `docs/plans/2026-04-30-metadata-rebuild-stakeholder-decisions-resolved.md` Decision 2.1 for the full rationale.

---

**Original v1 purpose (kept for reference below):** Re-tag 26 craft-suspect lessons against the (then) 5-value `activity_type` vocab, so the eval-gate ground-truth set isn't biased by the old 4-value vocab limit. Reviewers originally labeled these against the 4-value vocab (`craft` didn't exist) — a craft lesson would have been forced into `cooking`, `garden`, `both`, or `academic`.

**Source set:** the 113 reviewer-tagged submissions on TEST DB (`submission_reviews.tagged_metadata->>'activityType'`). The 26 candidates here flagged via title or body-content craft signals; the other 87 stay with their reviewer label.

## Vocabulary (5 values)

- `cooking` — primary activity is food preparation
- `garden` — primary activity is gardening / horticulture work
- `both` — substantial cooking AND substantial garden activity in one lesson
- `academic` — primary activity is conceptual / discussion / reading (not hands-on production)
- `craft` — primary activity is making tangible non-food objects (art / crafts / collage / mural / puppet / printmaking / decorating)

**Tie-breaker rules** (your call to refine):
- If the lesson is "X with a small craft sub-activity" → keep X. Craft must be a substantial agenda block, not 5-min worksheet drawing.
- If the lesson is "garden materials → craft project" (e.g., plant-pressing, sun prints) → `craft` (the spine is the art project; garden is the source).
- If the lesson is genuinely two-activity (e.g., collage + salad) → could be `craft` or `both` depending on which spine dominates. Use your judgment.
- If you're torn between two values, write your best call + a `<!-- maybe X -->` comment.

## How to fill in

For each lesson, write your call on the `**New label:**` line. Use one of: `cooking` / `garden` / `both` / `academic` / `craft`. If reviewer's old label is still right under the 5-value vocab, just paste it back.

---

## Section A: Title-suspect candidates (6)

These have craft-signaling words in the title.

### A1. Edible Flower Collages & Salad

- ID: `e1dcc4e3-3f34-4ade-821d-1d0c7e388667`
- Old reviewer label: **both**
- Distilled: collect garden materials → make a "Phenology Portrait" face-collage with petals/leaves → make edible flower salad. Title leads with "Collages." Three activities: garden source / collage craft / salad cooking.

<details><summary>Body excerpt</summary>

Summary: Students will collect a variety of natural textures and colors in the garden, explore the life cycles in plants and animals, and make an edible flower collage and salad.

Agenda: collect natural textures (5 min) → make Phenology Portrait of partner using collected materials (15 min) → make edible flower salad → tasting.
</details>

**New label:** 

---

### A2. Mural Painting 101: Beautifying the Garden

- ID: `9b06d703-d82c-4b27-8432-4e65fb7f1d89`
- Old reviewer label: **garden**
- Distilled: planning phase of mural-making in the garden. Discussion of murals as community art → brainstorm mural ideas/slogan → set up planning. The actual painting is in subsequent lessons. Lesson is about art, but this specific session is mostly discussion + planning.

<details><summary>Body excerpt</summary>

Summary: Students will learn about the importance of using art to take ownership of and take care of public spaces, and begin the process of painting a mural in their garden.

Agenda: discussion of murals + neighborhood/cultural significance + brainstorm mural ideas + plan the slogan/visual.
</details>

**New label:** 

---

### A3. Puppet Pollinators

- ID: `dd2c3e79-6dbb-4863-b60b-6c37a1fcc2f7`
- Old reviewer label: **garden**
- Distilled: teach pollination concept (using bee puppet demo) + students design and make their own butterfly puppet. Both academic (pollination) and craft (puppet-making) are substantial.

<details><summary>Body excerpt</summary>

Summary: Students will learn about the basics of pollination, a crucial process that happens in the garden, and then create a simple butterfly puppet.

Agenda: 45-50 min. Opening (10 min). Teach pollination with bee-puppet demo. Make butterfly puppet with own design.
</details>

**New label:** 

---

### A4. Sun Printing

- ID: `14734df5-94ef-4eab-8a08-be4714f6ef6e`
- Old reviewer label: **garden**
- Distilled: walk garden to collect plant materials (leaves/flowers/sticks) → arrange on cyanotype paper → expose to sun → develop print. Spine is the printmaking craft; garden is the material source.

<details><summary>Body excerpt</summary>

Summary: Students will become familiar with what flowers, leaves and plant parts are in the garden, and use them to make cyanotypes or sun prints.

Agenda: collect garden materials (10 min) → arrange + sun-expose for cyanotype prints.
</details>

**New label:** 

---

### A5. Sun Printing/Cyanotype

- ID: `d06454bb-f85c-40c0-9cce-6c96d6e88882`
- Old reviewer label: **garden**
- Distilled: same as A4 — appears to be a slight variant of the same lesson plan. Walk garden → collect → cyanotype.

<details><summary>Body excerpt</summary>

Summary: Students will become familiar with what flowers, leaves and plant parts are in the garden, and use them to make cyanotypes or sun prints.

Agenda: collect garden materials → arrange + sun-expose. Same shape as A4.
</details>

**New label:** 

---

### A6. Three Sisters Puppet Show

- ID: `f6d80e5d-81cd-408c-83c2-5a33665a546f`
- Old reviewer label: **garden**
- Distilled: students WATCH a teacher-performed sock-puppet show about the Lenape Three Sisters legend → discussion → small drawing of own 3-sisters garden using markers/colored pencils. Students don't make puppets. The drawing is brief.

<details><summary>Body excerpt</summary>

Summary: Students will enjoy a puppet show to learn hear about the Lenape Legend of the 3 sisters.

Agenda: opening → puppet show (teacher performs) → discussion → students draw their own 3 sisters garden → tasting → closing ritual.
</details>

**New label:** 

---

## Section B: Body-only candidates (20)

These don't have craft words in the title but body-content has craft-activity phrases. Mix of real craft + false positives where craft is a 5-min sub-activity inside a bigger cooking/garden/academic lesson.

### B1. Black Panther Party and the Free Breakfast Program

- ID: `b02c47a5-03f0-4dfa-898f-d12dba9f3f28`
- Old reviewer label: **cooking**
- Distilled: learn about Black Panthers' free breakfast initiative as Civil Rights history + make a breakfast dish. History + cooking. No real craft component (body match probably from "Party" matching `art` regex).

<details><summary>Body excerpt</summary>

Summary: Students will learn about the Black Panther Party's free breakfast initiative as a means of resistance and change.

Agenda: discussion of Civil Rights Movement + Black Panthers + cooking a breakfast dish.
</details>

**New label:** 

---

### B2. Booker T. Whatley's CSA

- ID: `b8e97852-8ba3-438e-8218-bb68a3413a14`
- Old reviewer label: **garden**
- Distilled: learn about Booker T. Whatley's CSA model + students participate in their own class CSA + complete a garden task. History + garden. No craft.

<details><summary>Body excerpt</summary>

Summary: Students will learn about the teachings of Black professor and horticulturist Booker T. Whatley, and his pioneering of the CSA (Community Supported Agriculture) model in the US. Students will then participate in their own class-sized CSA program.

Agenda: discussion of CSA + reading about Whatley + small-group garden task.
</details>

**New label:** 

---

### B3. Bug Camouflage

- ID: `cd528c74-e22c-4636-838b-374ed46c4d5e`
- Old reviewer label: **garden**
- Distilled: learn about camouflage and animal adaptations + students PAINT plastic animals to match a chosen environment. Substantial paint-craft activity.

<details><summary>Body excerpt</summary>

Summary: Students will learn about camouflage, why it helps animals, and then create their own camouflage using paint and plastic animals.

Agenda: discuss bugs/camouflage → students paint plastic animals to match background.
</details>

**New label:** 

---

### B4. Butterflies

- ID: `790de2b4-b81e-47cd-8b02-11bb884dafa1`
- Old reviewer label: **garden**
- Distilled: read butterfly book + learn life cycle + students make + decorate their own butterflies + fly them around looking for flowers. Butterfly-making is a substantial agenda block.

<details><summary>Body excerpt</summary>

Summary: Students will learn about the Butterfly Life Cycle... Students will make their own butterflies and fly them around the room looking for flowers.

Agenda: read aloud (10 min) → life-cycle review → make butterflies (10-20 min) → flight game.
</details>

**New label:** 

---

### B5. Empanadas & Corn Salad

- ID: `7548607e-cb58-4301-b1e5-977852a50426`
- Old reviewer label: **cooking**
- Distilled: kitchen lesson making empanadas + corn salad over 90 min. Pure cooking lesson. Body match likely noise.

<details><summary>Body excerpt</summary>

Summary: Students will make empanadas and corn salad.

Agenda: kitchen safety norms → discussion of empanada origins → make empanadas + corn salad.
</details>

**New label:** 

---

### B6. Food Waste

- ID: `3e4530a4-3a32-4130-b719-5c78edcb3215`
- Old reviewer label: **cooking**
- Distilled: discussion of food waste + trivia game + cook a recipe using food scraps. Cooking with academic framing. No craft.

<details><summary>Body excerpt</summary>

Summary: Students will learn about the impact of food waste on the environment.

Agenda: discussion of food scraps + cook recipe with food scraps + trivia.
</details>

**New label:** 

---

### B7. Garden Celebration: Culmination of Plant Parts and Seasons

- ID: `1f40b372-55ea-4d81-b36e-6df695e77109`
- Old reviewer label: **garden**
- Distilled: review seasons + plant parts + water the garden + tasting. Pure garden lesson with end-of-year celebration framing. No craft.

<details><summary>Body excerpt</summary>

Summary: Students will review their knowledge of seasons, plant parts, and celebration. Students will water the garden and enjoy a refreshing treat.

Agenda: discuss seasons → water garden → tasting.
</details>

**New label:** 

---

### B8. How Food Moves (Food Miles)

- ID: `be87e96a-1153-4320-b4c6-b8b0d3ac2d46`
- Old reviewer label: **garden**
- Distilled: kinesthetic team game with food-miles cards. Discussion of local vs imported food. No craft.

<details><summary>Body excerpt</summary>

Summary: Students will play a game in which they are assigned miles based on foods they choose. They will evaluate whether the winner of the game should be the team with the most or least miles.

Agenda: opening discussion → introduce food miles → team game with cards.
</details>

**New label:** 

---

### B9. Intro to Garden Class

- ID: `abc12ba0-b8d6-42c5-9a18-a7f2dffd201e`
- Old reviewer label: **garden**
- Distilled: set classroom expectations + draw imaginary plants on paper as a get-to-know-you activity + taste plant-seed snack. Drawing is small icebreaker.

<details><summary>Body excerpt</summary>

Agenda: set expectations (5 min) → draw imaginary plants on paper → exquisite-corpse-style activity → tasting plant-seed snack.
</details>

**New label:** 

---

### B10. Plant Life Cycle Exploration

- ID: `fc719f65-c54d-4093-96f4-dec556d13152`
- Old reviewer label: **garden**
- Distilled: explore the early-fall garden looking for plants in different life-cycle stages. Discussion + observation. No craft.

<details><summary>Body excerpt</summary>

Summary: Students will explore the early fall garden to look for plants in different stages of their life cycle.

Agenda: introduce life-cycle concept + garden exploration to identify life-cycle stages.
</details>

**New label:** 

---

### B11. Plant Part Investigation

- ID: `ebb60e07-2c80-4c87-b62e-5ddfab84184e`
- Old reviewer label: **garden**
- Distilled: students play "detective" using hand lenses + senses to identify plant parts (roots/leaves/stems/flowers). Investigation activity, no production. No craft.

<details><summary>Body excerpt</summary>

Summary: Students will identify different parts of a plant: roots, leaves, stems, and flowers.

Agenda: detective framing → plant-part investigation with hand lenses.
</details>

**New label:** 

---

### B12. Potato Exploration

- ID: `5beb9df1-9d50-45cc-b548-433cf3052cd5`
- Old reviewer label: **garden**
- Distilled: harvest potatoes from garden + make potato-paint prints (craft) + eat french fries (cooking). Three activities: garden harvest / craft printmaking / cooking. Title doesn't lead with craft.

<details><summary>Body excerpt</summary>

Summary: Students will harvest potatoes in the garden and learn how to use potatoes creatively through making potato paint prints and eating french fries.

Agenda: discuss potatoes → harvest in garden → potato-print craft → french fries tasting.
</details>

**New label:** 

---

### B13. Recycle Gardening

- ID: `7eb2a5d9-148b-4afe-a107-6c81d8c2f052`
- Old reviewer label: **garden**
- Distilled: plant seeds in recycled containers (cans, bottles). Hands-on garden activity. Container reuse may have small decorating, but spine is planting. No real craft.

<details><summary>Body excerpt</summary>

Summary: Students will learn the basic necessities to grow food and plants in an urban setting and get to plant seeds in recycled containers.

Agenda: discussion of urban planting → introduce recycled containers → plant seeds.
</details>

**New label:** 

---

### B14. School Lunch Heroes 4th/5th

- ID: `96b1306d-c01d-44e1-a530-11d20a2052ea`
- Old reviewer label: **academic**
- Distilled: learn about school food workers + complete coloring/writing worksheets + DECORATE APRONS to give to cafeteria staff. Two craft components (coloring sheet + apron decoration) but lesson framing is community-stewardship/academic.

<details><summary>Body excerpt</summary>

Summary: Students learn about school food workers, what a day in the life of a school food worker is like, complete a coloring and writing worksheets on school food workers to display in the school, and decorate aprons to give to their school cafeteria staff.

Agenda: discussion of cafeteria workers + video + coloring/writing worksheet + decorate aprons.
</details>

**New label:** 

---

### B15. The Honeybee Man K-1

- ID: `2f5e5d72-1056-450f-bd1a-d68359733ba8`
- Old reviewer label: **garden**
- Distilled: read "The Honeybee Man" book + art activity to learn how bees help plants. Substantial art block.

<details><summary>Body excerpt</summary>

Summary: Students will read a story, then do an art activity to learn about how bees help fruits to grow.

Agenda: read aloud (15 min) → discussion → art project to show bees help plants.
</details>

**New label:** 

---

### B16. The Lorax Debate

- ID: `f508c9d6-7913-43b3-8067-a6057b24f9b5`
- Old reviewer label: **academic**
- Distilled: read The Lorax + structured debate about advocacy/activism. Body match likely just "draw" sub-activity. Spine is academic.

<details><summary>Body excerpt</summary>

Summary: Students will read Dr. Seuss' The Lorax and learn about the importance of advocacy and standing up for what they believe in.

Agenda: read aloud → debate exercise → discussion.
</details>

**New label:** 

---

### B17. The Ugly Vegetables

- ID: `b7fb8796-90ee-4da1-bcd9-1cdf244e6f07`
- Old reviewer label: **academic**
- Distilled: read "The Ugly Vegetables" + art activity to share with classmates. Story is the spine; art activity is substantial closing block.

<details><summary>Body excerpt</summary>

Summary: Students will read a story about a community that shares what they grow and do an art activity to share with their classmates.

Agenda: opening discussion of community → guided read-aloud → art activity to share with class.
</details>

**New label:** 

---

### B18. Uzbek-Korean Carrot Salad Lesson Plan

- ID: `86570c1c-6ea9-4ed7-9357-df8d9725af0b`
- Old reviewer label: **cooking**
- Distilled: learn about diasporic Korean/Uzbek cuisine + make carrot salad. Pure cooking with cultural framing. No craft.

<details><summary>Body excerpt</summary>

Summary: Students will learn about the history of diasporic Korean cuisine in Uzbekistan, and make a carrot salad.

Agenda: discussion of Korean diaspora/Uzbek cuisine → make carrot salad.
</details>

**New label:** 

---

### B19. Who Lives in the Garden?

- ID: `398cdb9f-8bf2-45a4-9eff-000a226a235b`
- Old reviewer label: **garden**
- Distilled: garden tour + read book OR watch teacher puppet show + short garden processing task. Students don't make crafts; they consume the puppet show as content.

<details><summary>Body excerpt</summary>

Summary: Students will be introduced to the plants and animals that live in the garden by participating in a garden tour, listening to a book read aloud or a puppet show, and finishing with a short garden processing task.

Agenda: garden tour → read aloud OR teacher puppet show → garden task.
</details>

**New label:** 

---

### B20. Worms K-1

- ID: `79c7720b-1b03-4d9f-9970-83d6430d106d`
- Old reviewer label: **garden**
- Distilled: meet real worms + learn what worms do + worm-dance gesture activity. Pure garden lesson. No craft.

<details><summary>Body excerpt</summary>

Agenda: introduce worm with clue game → worm dance → meet real worms in compost bin.
</details>

**New label:** 

---

## After you fill in

Tell me when done. I'll parse the worksheet, build the final ground-truth file at `scripts/eval-data/activity-type-samples.json` (113 rows = 26 with your new labels + 87 with original reviewer labels), and we'll move to Step 2 (sample assembly + prompt drafting).

If any of the 87 non-flagged lessons should also be re-tagged (e.g., if the heuristic missed a craft signal), let me know and I'll pull the lesson body for review.
