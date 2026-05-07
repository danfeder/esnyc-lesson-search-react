# Activity Type Relabel Worksheet — v2 (Multi-Label, 4-Value Vocab)

> **Status: ACTIVE.** This is the canonical worksheet for the activity_type eval-gate ground-truth set.
>
> Replaces v1 (`activity-type-relabel-worksheet.md`, deprecated 2026-05-06) which used the obsolete 5-value single-label format. v2 covers all 113 reviewer-tagged submissions in multi-label format against the 4-value vocab settled by D2.1 (`'both'` retired in PR 1b).

**Origin:** the 113 submissions on TEST DB whose `submission_reviews.tagged_metadata.activityType` is non-null. All 113 are scalar (pre-PR-1b shape); old-label distribution: garden 67 / cooking 33 / academic 11 / both 2.

## Vocabulary (4 values, multi-label)

| Value | What it means | Examples |
|---|---|---|
| `cooking` | Students prepare food: kitchen lesson, knife work, mixing, baking, assembling a recipe. | Empanadas + corn salad, hummus + pita, vegetable ramen, pumpkin muffins, applesauce. A short tasting at the end of a non-cooking lesson is **not** cooking. |
| `garden` | Hands-on horticulture: planting, harvesting, watering, soil mixing, garden tour with observation, plant-part investigation, composting. | Harvest potatoes, plant in recycled containers, garden bingo, plant-part scavenger, worm bin study. Pure indoor discussion *about* gardens is `academic`, not `garden`. |
| `academic` | Conceptual / discussion / reading: structured talk, read-aloud, debate, kinesthetic content games, worksheets, video viewing. | Lorax debate, food-miles card game, food-system discussion, museum-tour artifacts, Garden Jeopardy review. |
| `craft` | Make a tangible non-food object: collage, mural, puppet, sun print/cyanotype, decorated apron, painted plastic animal, butterfly cutout, potato-stamp print. | Anthotype, sun printing, mural painting, decorated valentines, butterflies, puppet pollinators. Brief drawing as a 5-min icebreaker does NOT qualify — craft must be a substantial agenda block. |

## How to fill in

For each entry, replace the empty `**New labels (multi-label):**` line with a comma-separated list of 1+ values from the vocabulary above. Examples:

- `cooking` — pure cooking lesson
- `garden, cooking` — harvest then cook the harvest
- `academic, cooking` — discuss food system + cook a recipe
- `garden, craft` — collect garden materials then make a craft
- `academic, craft` — read-aloud then a substantial closing art project
- `craft` — pure craft session
- `academic` — pure discussion / read-aloud / kinesthetic-game lesson

**Substantial-block rule:** a value applies only when its activity occupies a substantial agenda block — typically 10+ minutes, or the lesson's main production output. A 5-minute worksheet sketch inside a 45-minute garden lesson is not `craft`. A short tasting inside a discussion lesson is not `cooking`.

**Tie-breakers:**

- **Garden-source-for-craft** (sun prints, plant-pressed cards, edible-flower face collages): if both phases are substantial, use `garden, craft`. If garden collection is brief (5 min material-gathering) and the craft is the spine, use just `craft`.
- **Cooking with academic framing** (history of a dish + cook the dish): use `cooking, academic` only when both are sustained agenda blocks. Don't add `academic` for a one-line cultural intro to an otherwise pure cooking lesson.
- **Story / read-aloud**: read-aloud is `academic`. If followed by a substantial production block (puppet-making, mural-painting), add `craft`. If followed only by discussion or brief drawing, stay with just `academic`.
- **Story + tasting**: ignore the tasting if it's just a few minutes; just `academic`.
- **Craft inside a kitchen lesson** (decorate the muffin you just baked): the bar is "tangible non-food object." Decorating your own food is still cooking, not craft.
- **Old labels are advisory.** Reviewers labeled these against the pre-craft 5-value vocab; some craft-spine lessons were forced into garden/academic/cooking. Trust the agenda, not the old label.

## Eval-gate caveat — `craft` may have zero truth labels

If your relabeling produces zero `craft` rows in the 113-set, per-value craft recall is undefined. The harness applies a `maxPredictionRateForAbsentValues` ceiling instead — failing if the LLM predicts craft on more than 10% of samples (configurable in `activity-type-thresholds.json`). If you DO label some samples as `craft`, regular precision/recall apply and the absent-values ceiling is dormant for that value.

## Parsing convention

When you finish, the next session script will parse each entry's `**New labels (multi-label):**` line. Format:

```
**New labels (multi-label):** value1, value2
```

- Lowercase canonical values from the 4-value vocab only (`cooking`, `garden`, `academic`, `craft`).
- Comma-separated; whitespace around commas tolerated.
- One or more values per row; minimum 1, maximum 4.
- Optional inline comment after a `<!-- -->` block, e.g. `**New labels (multi-label):** garden, craft <!-- maybe also academic -->` (parser strips comments).

If you skip a row, leave the line empty — the parser will warn but won't fail. Unparsed rows are excluded from the eval-gate sample set.

---

## Entries (113)

### 1. 1. Meet The Food System--D22

- **ID:** `0d57d53c-5889-4f1d-8e9a-ddd9a627778e` — old label: `academic` — body: 5484 chars

<details><summary>Summary excerpt</summary>

Summary: | This unit will introduce students to the food system. Students will map out the food system, examining the seed-to-table process of making Takis. Students will taste the homemade version of a popular processed food or a simple plant-based food. |  [Table] Objectives: | Students will learn more about the food system and reflect on their

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (10 mins) | Opening ritual (10 mins): |  | Raise your hand if you've ever had Takis. | Today we will talk about all the steps that have to happen in order for you to eat a Taki. | These steps are part of something called THE FOOD SYSTEM. | Define a system: | A system is a set of things, people or animals that work together as one. | There are some systems you may already know. | An ecosystem - | consists of living/nonliving components that work together as a single unit to kee

</details>

**New labels (multi-label):** academic

---

### 2. 3. Farm Workers and Pesticides, 2-day lesson--D22

- **ID:** `dfd11c22-6145-432d-9024-41a2758da618` — old label: `garden` — body: 9908 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will read a story to learn about how pesticides negatively affect farm workers and learn about the activist work of Cesar Chavez. Students will then make a collective mural to show what they've learned about the connections between pollinators, farm workers, and themselves. |  [Table] Objectives: |  | Students will understand

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow, Day 1: ( | 45 minutes | ) | Opening ritual (10 minutes): | "Can someone tell me what we discussed last class, and what pesticides are? Remind students that pesticides are harmful chemicals that are used to kill bugs, but can have effects on the rest of the garden food web." | "Last time we mentioned briefly how pesticides don't only hurt the land, bugs, and animals, but they can hurt farm workers too. Today we are going to talk a little bit more about that and learn about a pe

</details>

**New labels (multi-label):** academic, craft

---

### 3. 3K-1 Indoor Garden Jobs

- **ID:** `2658b09e-aa74-4100-bffc-bfda9a303b13` — old label: `garden` — body: 5481 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will engage in a | n indoor garden job like soil mixing, seed saving, or seed starting. |  [Table] Objectives: |  | Students will be able to understand that there are many ways to help the garden, both inside and outside. [Table] Core Competencies: | Environmental and community stewardship, garden skills and related academic

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: ( | 45-50 minutes | ) | Opening ritual (10 mins) |  | Welcome students back to garden class. For K-1, go over expectations and petal points update: We are kind, safe, brave, and respectful.  Choose which petal point they are working towards this class.  This lesson especially emphasizes kindness when sharing and respect for others. | Remind students that all year, we've been learning what it means to be a gardener. Ask students some ways that they have learned to be a gardener

</details>

**New labels (multi-label):** garden

---

### 4. A Visit to Mashama Bailey's Restaurant 25-26

- **ID:** `63118947-6a84-4ef9-bcfd-a25ee185c66a` — old label: `cooking` — body: 6016 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will first watch a video about Chef Mashama Bailey and how her heritage has shaped her cooking, and then students will cook and eat one of her recipes. |  [Table] Objectives: |  | Students will make connections between their previous knowledge about African American foodways, the personal story of a present-day African America

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual: | Ask students to recall what they learned in the previous lesson, during the African American food museum exhibit. If this lesson does not follow the African American food museum lesson or if students need reminders, tell students that today you are learning about Black American culture and how much influence it has on American culture as a whole and American food in particular. | Explain that today we are going to watch a video about Chef Mashama Bailey, an

</details>

**New labels (multi-label):** cooking

---

### 5. African American Food Traditions 25-26

- **ID:** `5c602604-69f0-45b2-9745-6b8de097d45c` — old label: `academic` — body: 5576 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will participate in a "museum tour" to see artifacts that tell about African American contributions to American food culture. |  [Table] Objectives: |  | Students will learn about ingredients, dishes, and cooking techniques that were innovated by African American farmers and cooks and have become an essential part of American

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (45 minutes) | Opening ritual (15 minutes): | Show students the map of the world. Explain that here in the United States, our food is influenced by the many different food traditions from all over the world. Foods like empanadas, dumplings, and pasta were invented in other places, then brought over by immigrants. | Today, we are going to be learning about foods that were invented in America by African American farmers and cooks. People who are African American have heritage fr

</details>

**New labels (multi-label):** academic

---

### 6. Aguas Frescas

- **ID:** `ab06dde4-d656-47b8-8b91-c31f0c216be8` — old label: `cooking` — body: 5623 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn a bit about Agua Fresca and make and taste different agua fresca flavors. |  [Table] Objectives: |  | Students will know what Agua Fresca is and where it comes from, Students will be able to prepare their fruits safely, Students will use the smoothie bike, if there is one, to blend up the drink, Students will work t

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component: | Welcome students to class | Introduce Agua Fresca - ask students if they've tried it before - if so what flavors have they tried, if they know where it's a very popular drink (Mexico, Caribbean, Central America), etc. What do they think the difference will be between aguas frescas and a fruity water such as infused water (which my students made a few weeks earlier during a sugar

</details>

**New labels (multi-label):** cooking

---

### 7. All About Birds

- **ID:** `adee2e57-7476-4016-aa93-e560659d6124` — old label: `garden` — body: 3977 chars

<details><summary>Summary excerpt</summary>

Summary: | Students play a game to learn about birds and create helpful habitat for birds in the garden. |  [Table] Objectives: |  | Students will be able to identify features of birds. [Table] Core Competencies: | Environmental and community stewardship, garden skills and related academic content [Table] Cultural Responsiveness: | incorporat

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand-outs and include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson. |  | Opening ritual (15 minutes): | Tell students that we are going to learn all about birds today. Ask students to tell you what they already know about birds. If they tell you that birds have feathers, emphasize that feathers are what makes birds unique -- only birds have feathers. | Show | pictures | of birds. | Play a

</details>

**New labels (multi-label):** garden

---

### 8. All About Compost 25-26

- **ID:** `f625e179-86ce-4d43-a59a-19f0bfd2e689` — old label: `garden` — body: 4639 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will be introduced to what compost is, and its use in the garden. |  [Table] Objectives: |  | Peppa Pig will teach the youngest students (3K-PK) all about the wonders of compost while older students will read "Compost Stew". |  | Students will be able to identify what compost is, how it's used and how it helps our garden. |  |

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Compost Stew |  |  | Opening ritual (5 min) | Welcome and sing good morning gardeners, go over plans for today and buzz over to the kitchen |  | Engaging Activity (Peppa Pig) - 20 min | 3K-Pre-K | Raise your hand if you like Peppa Pig. Who is she? | Take responses from students. | Today Peppa Pig will teach us all about compost. |  | Show video. | What color was grandad's compost in the Peppa Pig video? | Black/Brown! | What was living in grandad's compost? | Worms! | Let's

</details>

**New labels (multi-label):** garden

---

### 9. All About Lanternflies lesson

- **ID:** `0369743c-8b6c-4037-a90e-790c2cbcef52` — old label: `garden` — body: 4738 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn about lanternflies, an invasive insect in the garden, and how to protect the garden from these pests. |  [Table] Objectives: |  | Students will be able to identify some key facts about the spotted lanternfly, and apply a simple soap pesticide safely and correctly. [Table] Core Competencies: | Environmental and com

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: ( | 45-50 minutes | ) | Opening ritual | (10 min) | Welcome back to class everyone!  As students enter, circulate and ask students how they are doing today.  Signal to class with bell or clapping ritual to start class, and go over expectations and petal points update: We are kind, safe, brave, and respectful.  Choose which petal point they are working towards this class.  This lesson especially emphasizes kindness around living things and safety when using tools in the garden.

</details>

**New labels (multi-label):** garden

---

### 10. All About Pumpkins

- **ID:** `7021a6bd-22a6-415e-ac00-5d85e7c9b183` — old label: `academic` — body: 6415 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn all about the pumpkin plant, and mix and eat roasted pumpkin seeds. |  [Table] Objectives: |  | Students will learn the different parts of a pumpkin plant. Students will observe pumpkin using four of their five senses, and then make a simple recipe for roasted pumpkin seeds to eat. [Table] Core Competencies: | Lis

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: ( | 45-50 minutes | ) | Welcome back to class everyone!  As students enter, circulate and ask students how they are doing today.  Signal to class with a bell or clapping ritual to start class, and go over expectations and petal points update: We are kind, safe, brave, and respectful.  Choose which petal point they are working towards this class.  This lesson especially emphasizes kindness when sharing and bravery when trying new things.  (10 minutes) | Today we will be learnin

</details>

**New labels (multi-label):** garden

---

### 11. All About Roly Polys lesson

- **ID:** `975fdda2-c43d-4add-9513-0d980c6feda6` — old label: `garden` — body: 6152 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn about roly polys (also known as pillbugs), and their role in our garden's ecosystem. |  [Table] Objectives: |  | Students will be able to identify key features of roly polys.  Students will have greater familiarity with their garden's ecosystem, making them better environmental stewards. [Table] Core Competencies:

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: ( | 45-50 minutes | ) | Opening ritual: | (15 minutes) | Welcome back to class everyone!  As students enter, circulate and ask students how they are doing today.  Signal to class with bell or clapping ritual to start class, and go over expectations and petal points update: We are kind, safe, brave, and respectful.  Choose which petal point they are working towards this class.  This lesson especially emphasizes kindness around living things and safety around insects. | Show a p

</details>

**New labels (multi-label):** garden

---

### 12. All About Squirrels

- **ID:** `1f51179b-839f-4a39-826e-27ac293dc221` — old label: `garden` — body: 6359 chars

<details><summary>Summary excerpt</summary>

Summary: | Students play a game to learn about squirrels, a common visitor to the garden, and the squirrel's role in seed dispersal. [Table] Objectives: | Students will be able to identify key features of squirrels and the foods they eat. [Table] Core Competencies: | Environmental and community stewardship, garden skills and related academic co

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow (45-50 minutes): | Opening ritual (15 minutes): | Welcome students back to class.  Play a | name game | , or bring out puppet box and introduce the garden puppets (bird, roly poly, bee, squirrel). | Today, we are going to learn all about squirrels. | Bring out the squirrel puppet and ask: Does anyone remember what squirrels eat, from our last lesson?  Squirrels eat ACORNS and SEEDS.  Where do acorns come from? (Answer: trees!) | Option 1: Gather students in a circle and read al

</details>

**New labels (multi-label):** garden

---

### 13. Anthotype

- **ID:** `c2e54f9a-d657-4231-96f6-96008717bac8` — old label: `garden` — body: 3867 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn about how plants can be used for crafts and to take a picture without a camera. They will make their own anthotype. [Table] Objectives: |  | Students will be able to make their own craft using only plants [Table] Core Competencies: | List all that apply: | Environmental and community stewardship, social justice, g

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . | How are we doing? Show me with your thumbs…Today we are going to learn how to take a photo with plants! How do we normally take photos? It's easy right? We point our camera, click, and we have it digitally. The way we will take a photo today will require a bit more effort because we are using plants. (2min) |  |

</details>

**New labels (multi-label):** garden

---

### 14. Applesauce

- **ID:** `68ce56c5-e3f0-40be-be07-35e9f3be84eb` — old label: `cooking` — body: 6796 chars

<details><summary>Summary excerpt</summary>

Summary: | Students make applesauce and taste different varieties of apples. [Table] Objectives: | Students will be able to explain the ingredients used to make applesauce. |  [Table] Core Competencies: | Kitchen skills and related academic content, cultural diversity. |  [Table] Cultural Responsiveness | : | Promotes student-centered instruc

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual (5 minutes): | Introduce the applesauce recipe. | Go over ingredients and make sure there are no allergies. | Ask students to raise their hands if they like apples. Ask them how does an apple grow? In a tree? On the ground? In the ground? | Show | pictures of apple trees | and explain that apples grow on trees in apple trees, and that there are many apple orchards in upstate New York. Ask students if they have ever been apple picking? What is their favorite ty

</details>

**New labels (multi-label):** cooking

---

### 15. Applesauce lesson plan

- **ID:** `ea271d13-78db-437c-aa9f-594ce567f90c` — old label: `cooking` — body: 6787 chars

<details><summary>Summary excerpt</summary>

Summary: | Students make applesauce and taste different varieties of apples. [Table] Objectives: | Students will be able to explain the ingredients used to make applesauce. |  [Table] Core Competencies: | Kitchen skills and related academic content, cultural diversity. |  [Table] Cultural Responsiveness | : | Promotes student-centered instruc

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual (5 minutes): | Introduce the applesauce recipe. | Go over ingredients and make sure there are no allergies. | Ask students to raise their hands if they like apples. Ask them how does an apple grow? In a tree? On the ground? In the ground? | Show | pictures of apple trees | and explain that apples grow on apple trees, and that there are many apple orchards in upstate New York. Ask students if they have ever been apple picking? What is their favorite type of app

</details>

**New labels (multi-label):** cooking

---

### 16. Baking Intro: Pumpkin Muffins

- **ID:** `eefb9230-b65e-45f0-a99c-6f5136dbd4f2` — old label: `cooking` — body: 2662 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will be introduced to baking and follow a recipe for pumpkin muffins. They will do math and reading related to the recipe while they bake. |  [Table] Objectives: |  | Students will be able to follow a baking recipe and describe the process of making muffins. |  [Table] Cultural Responsiveness: | communicates high expectation

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual: | Ask students if they have ever baked anything before. What did they bake? Can anyone come up with their own definition of the word "baking"? | Baking means cooking with dry heat such as an oven. Often things that are baked are breads or pastries, but many foods can be baked. | Today we are baking muffins using an ingredient that is really popular in the Fall. Can anyone guess what ingredient it is? (Pumpkins!) | Show seasonings: cinnamon, ginger, nutmeg, cl

</details>

**New labels (multi-label):** cooking

---

### 17. Bees

- **ID:** `4e4f3ae3-4c51-4439-87ee-f20d2ec94921` — old label: `garden` — body: 4277 chars

<details><summary>Summary excerpt</summary>

Summary: | Students make a bee puppet while learning about the life of a bee. |  [Table] Objectives: |  | Students will learn where bees live and the role of bees in the garden. [Table] Core Competencies: | Environmental and community stewardship, garden skills and related academic content |  [Table] Cultural Responsiveness | : | Reshapes cur

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson (10 minutes) | . | Today we are going to talk about an insect that has wings and flies from flower to flower collecting nectar to make honey. | Here | is a picture of it! Can you guess what the insect is?  That's right, it's the bee! | Did you know that bees visit flowers to collect nectar?  Can we say nectar?  Nectar

</details>

**New labels (multi-label):** garden

---

### 18. Bees and Blueberries

- **ID:** `b5d4f940-d4d5-409d-b900-1d42f0cde9fd` — old label: `cooking` — body: 7073 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn about bees as pollinators and make blueberry muffins, plant native plants in a pollinator garden, and/or make lip balm. |  [Table] Objectives: |  | Students will be able to explain the importance of native bees in our ecosystem and colony collapse. [Table] Core Competencies: | List all that apply: | Environmental

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . (5 min) | Welcome back to kitchen class; besides thanking gardeners and cooks, who else helps us enjoy the food we eat? (Truckers, delivery drivers, farmers, butchers, bakers, factory workers, grocery store workers, dishwashers, BEES) | Today, we will make blueberry muffins and learn about how bees help to feed us.

</details>

**New labels (multi-label):** cooking, garden, craft

---

### 19. Beet Valentines

- **ID:** `7be27770-1509-4d55-ba2d-cce80bc75caa` — old label: `garden` — body: 3845 chars

<details><summary>Summary excerpt</summary>

Summary: | Students learn about beets, try a beet tasting, and make Valentine's Day cards using beets. |  [Table] Objectives: |  | Students will be able to identify beets and understand how they grow underground. Students will be able to express their love and gratitude through art. [Table] Core Competencies: | List all that apply: Environmenta

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . (5 min) | Good morning everyone! Who can tell me what holiday is on February 14th? I will give you a hint, it has to do with the color red and hearts! | What is Valentine's Day all about? Who are some people, plants, or animals you love? |  | Engaging activity: (30 min) |  | Raise your hand if you have ever made a

</details>

**New labels (multi-label):** craft

---

### 20. Berry Rosehip Bars

- **ID:** `3ab7057f-263f-4eb7-8185-08de4bd59853` — old label: `cooking` — body: 6653 chars

<details><summary>Summary excerpt</summary>

Summary: | Students bake bars with berries and rosehips and learn about foods native to North America. |  [Table] Objectives: |  | Students will be able to measure dry and wet ingredients and identify fruits that come from North America. [Table] Core Competencies: | Kitchen skills and related academic content, multicultural education |  [Tabl

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual (5 minutes): |  | Review community expectations, "Be kind, be safe, be respectful, be brave." | "We have been learning this month about Native American people, their cultures, and their food traditions." Remind students that Native American people were the first people on the American continent, arriving thousands of years before European colonists. Have students share what they remember from previous lessons. | "Native American people grew food on their farms

</details>

**New labels (multi-label):** cooking

---

### 21. Black Panther Party and the Free Breakfast Program

- **ID:** `b02c47a5-03f0-4dfa-898f-d12dba9f3f28` — old label: `cooking` — body: 10845 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn about the Black Panther Party's free breakfast initiative as a means of resistance and change. |  [Table] Objectives: | Students will learn about | the Black Panther Party and make a breakfast dish. [Table] Core Competencies: | Environmental and community stewardship, social justice, multicultural education. |

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: ( | 45 minutes) |  | Opening ritual (20 minutes): |  | Welcome students to class. Wash hands and take seats. How is everyone feeling today? Show me with your thumbs. | "We've been talking in garden and kitchen class about ways that people have used food and gardens to make the world a better place. Today we are talking about one of the ways that food was important in the Civil Right Movement." | Solicit student knowledge about the Civil Rights Movement. | What does equality me

</details>

**New labels (multi-label):** cooking

---

### 22. Booker T. Whatley's CSA (Photos of Booker T. Whatley may be restricted use)

- **ID:** `b8e97852-8ba3-438e-8218-bb68a3413a14` — old label: `garden` — body: 6465 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will | learn about the teachings of Black professor and horticulturist Booker T. Whatley, and his pioneering of the CSA (Community Supported Agriculture) model in the US.  Students will then participate in their own class-sized CSA program. |  [Table] Objectives: |  | Students will be able to explain the importance of Booker T

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Welcome students back to class, and go over our 4 rules for garden: We are kind, we are safe, we are brave, we are respectful.  Emphasize that today we are going to focus especially on kindness and/or respect.  (5 minutes) | "This year we have been learning about how humans and nature have a relationship. Today we are going to learn about one individual who helped more people connect with farms and benefit from fre

</details>

**New labels (multi-label):** garden

---

### 23. Bug Camouflage

- **ID:** `cd528c74-e22c-4636-838b-374ed46c4d5e` — old label: `garden` — body: 8019 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn about camouflage, why it helps animals, and then create their own camouflage using paint and plastic animals. |  [Table] Objectives: | Students will be able to understand how bugs and animals have adapted to protect themselves from predators and will use their creativity and imagination to create an art project that

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: |  | Opening ritual (15 min): | Welcome students back to garden class. Ask students how they are feeling and ask them to show you with their thumbs. | Remind students that we have been learning about how animals and plants interact with the environment. "Raise your hand if you like bugs. What is your favorite bug? Why or why not? What do they do to help the garden and the environment? What about animals? What is your favorite animal? What about your favorite animal that you ha

</details>

**New labels (multi-label):** garden

---

### 24. Butterflies

- **ID:** `790de2b4-b81e-47cd-8b02-11bb884dafa1` — old label: `garden` — body: 6921 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn about the Butterfly Life Cycle and a little bit about butterflies generally (what do they eat, where do they live), Students will learn (surface level) about Butterflies as pollinators, Students will make their own butterflies and fly them around the room looking for flowers. |  [Table] Objectives: |  | Students wil

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . | 5 mins: | Welcome students to class - how is everyone feeling? | Today we're going to be learning all about butterflies and how they grow - and you'll all get to make a butterfly to keep! Butterflies are very helpful insects. They help all the plants in our garden to grow. Raise your hand if you think being helpf

</details>

**New labels (multi-label):** garden

---

### 25. Chilled Cucumber and Tahini Soup with Spicy Pumpkin Seeds

- **ID:** `1b4618d1-403e-4892-9a53-e0afe8ed33d5` — old label: `cooking` — body: 6188 chars

<details><summary>Summary excerpt</summary>

Summary: | Students make a cold cucumber soup using summer vegetables and herbs while learning about Palestinian culture. |  [Table] Objectives: |  | Students will practice kitchen skills such as cutting with a knife, cutting with scissors, and measuring. Students will make a recipe featuring ingredients used in Palestinian cooking. [Table] Cor

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow |  |  | Opening Ritual | (10 minutes) |  | "Today we are making a recipe using some ingredients that grow in our summer garden." Show cucumber, tomato, and herbs. | "We are also going to be using another ingredient, called sesame." Pass around cups of sesame seeds at each small group. Ask students to discuss in small groups if they have seen or eaten sesame seeds before. | "Sesame seeds are a very ancient food. People have been eating sesame seeds for thousands of years. Sesame

</details>

**New labels (multi-label):** cooking

---

### 26. Compost Relay & Stew

- **ID:** `67052aba-bfa5-48db-b41b-1a99c140a0cb` — old label: `garden` — body: 9015 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn about compost, participate in a compost relay by measuring and adding different ingredients that go into compost, and make a compost "stew" with edible ingredients that represent materials that go into compost. |  [Table] Objectives: |  | Students will understand what happens to their kitchen scraps when they put th

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual (5 minutes): | How is everyone feeling today? Show me with your thumbs. |  | Opening Circle | Hello everyone! Today we will be talking about compost. What is compost? What have you learned about compost? Has anyone composted at school, in the garden or at home? What are some things we put in the compost? Point out whether the things they suggest are greens or browns. Where are some things you cannot compost? Why would you compos

</details>

**New labels (multi-label):** garden

---

### 27. Corn Mush and Wojapi Berry Sauce (Slideshow images and cornbread recipe may be restricted use)

- **ID:** `0f650d12-c17c-4f7e-952a-2210756ac618` — old label: `cooking` — body: 5593 chars

<details><summary>Summary excerpt</summary>

Summary: Students will | learn about corn mush and wojapi, a popular Native American dish. |  [Table] Objectives: |  | Students will work together to correctly follow a recipe with measurements in small groups. [Table] Core Competencies: | Social justice, kitchen skills and related academic content, cultural diversity |  [Table] Cultural Resp

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: ( | 45-50 minutes | ) | Welcome back to class everyone!  As students enter, circulate and ask students how they are doing today.  Signal to class with bell or clapping ritual to start class, and go over expectations and petal points update: We are kind, safe, brave, and respectful.  Choose which petal point they are working towards this class.  This lesson especially emphasizes kindness when sharing and respect for others.  (5-10 minutes) |  | Today, we are going to make a Nat

</details>

**New labels (multi-label):** cooking

---

### 28. Decomposition Experiment

- **ID:** `13599027-50de-43a4-a8aa-2d4a86f04831` — old label: `garden` — body: 6686 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will prepare items to go in a decomposition experiment and fill out a worksheet with their predictions. |  [Table] Objectives: |  | Students will be able to make hypotheses and test them through an experiment in which they will learn about what items can and cannot decompose. |  [Table] Core Competencies: | Environmental and

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow (45-50 minutes): | Opening ritual: | Welcome back to class everyone!  As students enter, circulate and ask students how they are doing today.  Signal to class with bell or clapping ritual to start class, and go over expectations and petal points update: We are kind, safe, brave, and respectful.  Choose which petal point they are working towards this class.  This lesson especially emphasizes kindness when working in a group and bravery when trying new things.  (15 minutes) |  |

</details>

**New labels (multi-label):** garden

---

### 29. Decomposition Experiment Part 2

- **ID:** `f949b401-b52f-40fc-919f-921b574ff04a` — old label: `garden` — body: 7323 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will observe the results of their decomposition experiment and compare these results with their original hypotheses. |  [Table] Objectives: |  | Students will be able to complete the steps of the scientific process. Students will learn what items can decompose and what items cannot. |  [Table] Core Competencies: | Environmen

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow (45-50 minutes): | Opening ritual (15 minutes): | Welcome back to class everyone!  As students enter, circulate and ask students how they are doing today.  Signal to class with bell or clapping ritual to start class, and go over expectations and petal points update: We are kind, safe, brave, and respectful.  Choose which petal point they are working towards this class.  This lesson especially emphasizes braveness when trying new things and respect of the classroom space when ma

</details>

**New labels (multi-label):** garden

---

### 30. Dr. Carver and Calendula

- **ID:** `6325a2f8-1d4e-44a9-aaa6-ff09f220ce10` — old label: `garden` — body: 4871 chars

<details><summary>Summary excerpt</summary>

Summary: Students will learn abo | ut Dr. Carver and make their own salve |  [Table] Objectives: |  | Students will be able to know the importance of Dr. Carver and be able to make their own salve [Table] Core Competencies: | List all that apply: | Environmental and community stewardship, social justice, garden skills and related academic conte

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . | Greet Students, welcome back to the classroom! | How is everyone feeling today (thumbs down to thumbs up) | Explain to students that they will get to learn about a new friend, George Washington Carver. Show picture. Dr. Carver was a scientist and a really smart man. He was an: *act out together for younger kids* 

</details>

**New labels (multi-label):** craft

---

### 31. Edible Flower Collages & Salad

- **ID:** `e1dcc4e3-3f34-4ade-821d-1d0c7e388667` — old label: `both` — body: 5967 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will collect a variety of natural textures and colors in the garden, explore the life cycles in plants and animals, and make an edible flower collage and salad. |  [Table] Objectives: |  | Students will be able to identify what plants and flowers are edible and in season. [Table] Core Competencies: | Environmental and commun

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flo | w: |  | Opening ritual: (10 min) |  | Welcome students back to garden and kitchen class and review class expectations, "Be kind, be safe, be respectful, be brave." | "Can everyone say the word 'phenology'? Phenology is the timing of life cycle events in plants and animals. Plants, flowers, fruits and vegetables have different times of the year when they are planted, grown, harvested, die and go to seed - like the life cycle of a baby or any other living thing." Show them a | p

</details>

**New labels (multi-label):** garden, craft

---

### 32. Eid: Stuffed Dates

- **ID:** `f2c19899-276e-4a46-8794-c5107feaa0fc` — old label: `cooking` — body: 4691 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn about the importance of Eid and make stuffed dates |  |  [Table] Objectives: |  | Students will be able to…understand the importance of Eid and be hands on by making stuffed dates |  [Table] Core Competencies: | List all that apply: | Environmental and community stewardship, kitchen skills and related academic con

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . | When we celebrate a holiday like Thanksgiving, Christmas, or your birthday what are some things you may see, do, or even smell…? A lot of the time when there is a holiday we eat! For your birthday we have a birthday cake, for thanksgiving some people eat pie and so we are going to learn about food that may be eat

</details>

**New labels (multi-label):** cooking

---

### 33. Elementary Pollinator Unit Lesson 3: Pesticides

- **ID:** `1ce2b88a-d0e9-4924-8914-5ba55145396b` — old label: `garden` — body: 6769 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will engage in a food web activity to understand how pesticide use affects many species and then discuss what some alternatives to pesticide use are. |  [Table] Objectives: |  | Students will understand that pesticide use is harmful to the land, pollinators, food plants, farm workers, and more. [Table] Cultural Responsivenes

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual: | Start by asking students what they discussed last time (biodiversity and monoculture). Have them explain why monoculture is harmful to pollinators. If the previous lesson in the unit was not taught, or if review would be helpful, explain the concepts of diversity and monoculture with | pictures | . | Remind students that a garden with many types of plants is better for pollinators, and we need pollinators in order to have gardens and food. | Biodiversity: h

</details>

**New labels (multi-label):** garden

---

### 34. Empanadas

- **ID:** `19bc06bf-d09d-42f2-b2cd-4064b7b65950` — old label: `cooking` — body: 5039 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will | prepare and taste empanadas. [Table] Objectives: | Students will work together to follow a recipe for empanadas. |  [Table] Core Competencies: | kitchen skills and related academic content, cultural diversity, [Table] Cultural Responsiveness: | Students learn about Latin American cuisine by making empanadas. Student

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: |  | Opening ritual: (5 mins) | Welcome students back to garden and kitchen class and review class expectations, "Be kind, be safe, be respectful, be brave." | Today we are going to be practicing working together while making a vegetarian empanada. Empanadas are a popular food in Latin America but have origins in Spain, there are many different ingredients that can be used for empanada filling. Some popular fillings include beef, chicken, potatoes and beans. | Point out Latin

</details>

**New labels (multi-label):** cooking

---

### 35. Empanadas & Corn Salad

- **ID:** `7548607e-cb58-4301-b1e5-977852a50426` — old label: `cooking` — body: 10616 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will | make empanadas and corn salad. |  [Table] Objectives: |  | Students will practice kitchen skills to make a two-part recipe. Students will become familiar with Latin American cuisine. [Table] Cultural Responsiveness: | This lesson positions the teacher as facilitator by giving students the tools and scaffolding to make

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: ( | 90 minutes) |  | Opening ritual (15 minutes): | Welcome students back to the kitchen. Remind students of our safety norms: | Touch only your own tools and ingredients. | Always walk in the kitchen classroom. | Use a bear claw and a sawing motion when cutting. | Use all tools only for their intended job, not for playing. | Be responsible for cleaning up your own space. | Wait for everyone to eat all together. | Stay away from the oven. It will be on during class today! | Ex

</details>

**New labels (multi-label):** cooking

---

### 36. Fall Fruit vs. Summer Fruit

- **ID:** `28c8ef86-f2af-40eb-9dfb-7164f4cab28a` — old label: `academic` — body: 3902 chars

<details><summary>Summary excerpt</summary>

Summary: |  | Students will compare summer fruits and vegetables with fall fruits and vegetables and discuss why certain things grow at certain times. |  [Table] Objectives: |  | Students will understand the differences that some fruits grow during the summer season and other things that grow during the fall season, and will start to understand s

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow |  | Opening Ritual | (10 minutes) | Welcome group. Ask someone to share what season we are in. How do we know this? Discuss some signs of the fall. Write them up on the board. | Ask how fall is different from summer? Remind them this was the season before. | There are fruits and vegetables that only grow in the summer and some that grow in the fall. Ex. Strawberries grow in the summer and sweet potatoes grow in the fall | Explain that things that grow in our garden during the

</details>

**New labels (multi-label):** garden, academic

---

### 37. Food Justice Advocates: Food Scarcity

- **ID:** `4c2bacdb-7018-4ff2-badb-3701c8c974c0` — old label: `academic` — body: 4504 chars

<details><summary>Summary excerpt</summary>

Summary: | Students learn about the concepts of food justice and advocacy generally and about food insecurity in particular, and consider what actions they can take against food insecurity. They make and eat a healthy fruit snack and brainstorm ideas for a TikTok advocating for policies to end food insecurity. |  [Table] Objectives: |  | Students

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . | Welcome back to class. This year, we've been talking about ways that you can make a difference–by gardening, by cutting down on food waste. | Today we're going to talk more about ways you can make things better–for your neighbors, your city and your country. |  | Engaging activity 1: | The first thing I want you

</details>

**New labels (multi-label):** cooking, academic

---

### 38. Food Origins Scavenger Hunt (check images for copyright)

- **ID:** `e63356f5-1d74-48ed-a8bb-6da914e8f6e3` — old label: `garden` — body: 4828 chars

<details><summary>Summary excerpt</summary>

Summary: | Students explore the garden using a scavenger hunt that directs them to find the geographic origins of different plants. |  [Table] Objectives: | Students will be able to understand the historical geography of foods from the garden and see how humans impacted farming and food around the world. |  [Table] Core Competencies: | Environm

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual: | Welcome students. Go over norms for garden behavior, getting students' input on what it means to show respect to all the elements of the garden—plants, animals, soil, water, tools, people. Remind students that during our activity today, we are going to practice being safe in the garden with our bodies and kind to living things. | Start by asking students what they know about world maps (how many continents are there, what are the names of the continents etc

</details>

**New labels (multi-label):** garden

---

### 39. Food Preservation

- **ID:** `6cb032a2-4df2-4a6a-a18f-6d7589e502a8` — old label: `cooking` — body: 5141 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn about food preservation methods and participate in a hands-on garden activity to preserve food from the garden. |  [Table] Objectives: |  | Students will be able to…. describe the importance of food preservation and name some methods by which food is preserved. |  |  [Table] Core Competencies: | List all that appl

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . | "Last time, we learned that sometimes food comes a very long distance to get to us when it's not growing in New York. Another way we can eat food when it's not growing in New York is preserving it, or saving it for later. People all across the world throughout history have grown food during the warmer months, the

</details>

**New labels (multi-label):** cooking

---

### 40. Food Safety

- **ID:** `bcaa463b-5e73-4721-8065-ec51627485c8` — old label: `cooking` — body: 4493 chars

<details><summary>Summary excerpt</summary>

Summary: | Students | will learn about the "food safety chain" and how we keep food safe in our food system. Students will ultimately focus on how they can safely handle food at home with the "4 Steps to Food Safety". They will practice these steps with a recipe in class |  [Table] Objectives: |  | Students will review what they know about food s

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow |  | Opening Ritual (10 minutes) | Welcome students back to the kitchen classroom. Ask students what they know about the food system (recall from last year - who's who in the food system). Show illustration of food safety chain (or share | the handout | ). Have students read each part's responsibility for keeping food safe. |  | Engaging Activity (30 min) | Part A (5 min) | Transition to home cooking by asking them a question like "When was the last time you ate at a restaurant

</details>

**New labels (multi-label):** cooking

---

### 41. Food Waste

- **ID:** `3e4530a4-3a32-4130-b719-5c78edcb3215` — old label: `cooking` — body: 4161 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn about the impact of food waste on the environment. |  [Table] Objectives: |  | Students will play a game of trivia and prepare a recipe to highlight ways in which they can reduce their own food waste. [Table] Core Competencies: | Environmental and community stewardship, social justice, garden and kitchen skills (a

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual (10 min) | Welcome students back to class. Tell them to think about the last thing they made together in kitchen class (pick a dish where you used vegetables/fruits). | Ask "can you remember if there were any parts of those ingredients [name specific vegetables/fruits] that we didn't use?" (provide an example if needed). Next, ask "what do you think we did with those extras ['scraps']?" Together, sta

</details>

**New labels (multi-label):** cooking

---

### 42. Foods From Around the World: Introduction

- **ID:** `88435aa8-6d6f-4c90-8dc3-c83276a253af` — old label: `academic` — body: 4835 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will watch a video and share their own food memory story to begin a unit studying the unique food cultures of New York City. [Table] Objectives: | Students will be able to make connections between their personal experiences and others and will practice writing and speaking. |  [Table] Core Competencies: |  | List all that ap

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand-outs and include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . (10 minutes) | Explain that we are beginning a series of cooking lessons in which we are going to study some of the unique cultures from around the world that are also in New York. | Show the video. Ask students to share what was surprising to them or what they had a connection to. (You can show the whole video, or just

</details>

**New labels (multi-label):** academic

---

### 43. Garden Celebration: Culmination of Plant Parts and Seasons

- **ID:** `1f40b372-55ea-4d81-b36e-6df695e77109` — old label: `garden` — body: 4861 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will review th | eir knowledge of seasons, plant parts, and celebration. Students will water the garden and enjoy a refreshing treat. |  [Table] Objectives: |  | Students will be able to understand seasons/ what season they are currently in, students will be able to identify what a plant needs to grow, identify plant parts, re

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . | (10 mins) |  | Hello everyone, welcome back to garden class! I am so excited because today is going to be a celebration! Celebrating means that we are happy about something and want to enjoy and talk about it together. | Raise your hand if you want to tell a friend or teacher when you feel happy about something! | Today we are celebrating the change of seasons from spring

</details>

**New labels (multi-label):** garden

---

### 44. Garden Intro: Bingo

- **ID:** `05cac96a-24cb-43a1-b395-acaaf8e8f438` — old label: `garden` — body: 5531 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will go over garden norms and be introduced to the garden community through a bingo game. |  [Table] Objectives: |  | Students will be able to follow class expectations for being in the garden. Students will be able to identify important parts of the garden and members of the garden community. |  [Table] Core Competencies: |

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual: | Introduce yourself as the kitchen and garden teacher.  Remind students that you teach kitchen lessons indoors, and garden lessons in the garden. | Ask for a raise of hands if any students have been out to the garden before, or passed by the garden on their way to school.  What have they noticed growing in the garden?  Who else lives in the garden besides the plants? | Tell students that now that they go to school here, they are an important part of the gard

</details>

**New labels (multi-label):** garden

---

### 45. Garden Jeopardy

- **ID:** `8ac864bb-3db5-48a8-8058-76279e6d36c6` — old label: `academic` — body: 3969 chars

<details><summary>Summary excerpt</summary>

Summary: Stu | dents engage in a Jeopardy-style game to review their garden knowledge. |  [Table] Objectives: |  | Students will be able to work in teams to answer garden-related questions. [Table] Core Competencies: | List all that apply: | Environmental and community stewardship, garden skills and related academic content |  [Table] Cultura

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . | Introduction. (5 minutes) |  | Seat students into groups and welcome them back. | Ask everyone how their summer was and select some students to share their favorite thing they did during break. |  | Activity overview. (5 minutes) | Explain that today we are going to review what we've learned about the garden so f

</details>

**New labels (multi-label):** garden

---

### 46. Garden Jobs

- **ID:** `2a274916-62ba-4704-a0e4-464f3f8719ff` — old label: `garden` — body: 3772 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will participate in a garden job that contributes meaningfully to the health and growth of the garden. |  [Table] Objectives: |  | Students will be able to explain the garden job that they did and why that job is important to the garden's well-being. |  [Table] Cultural Responsiveness: | promotes student-centered instruction

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual: | Tell the class that today they will taking care of their garden and therefore doing something good for the earth. | Introduce students to the garden job that they will be doing today. Ask students to tell you about what information they already know about the garden job and why it's important. | Explain clearly why the garden job helps the garden. For older students, explain how helping the garden is good for the earth. | Give students specific instructions

</details>

**New labels (multi-label):** garden

---

### 47. Gardening & The Environment

- **ID:** `f961f02f-2b53-47d1-a498-3f4c4f375311` — old label: `garden` — body: 5270 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will get a (re)introduction to the school garden and learn about the various ways gardening is beneficial for the environment. |  [Table] Objectives: |  | Students will be able to explore their school garden to experience and reflect on the benefits of gardening on a community and environmental level. [Table] Core Competenci

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow |  | Opening Ritual | (10 minutes) | Welcome to the Garden (or greenhouse/classroom)! Does anyone remember what are the main things we do during class here? Sometimes we will cook and other times we will head outside to our school garden. Today we will be talking more about gardening. Gardening can impact us in many ways, in smaller ways on an individual level but also in much bigger ways - like the entire planet. What are some ways you think gardening helps our environment and

</details>

**New labels (multi-label):** garden

---

### 48. Gingerbread Cookies

- **ID:** `ffcbccb7-f5d2-497c-8ac7-0c78b243555d` — old label: `cooking` — body: 5742 chars

<details><summary>Summary excerpt</summary>

Summary: |  | Students will practice baking skills to make gingerbread cookies and share about how they celebrate the holidays. |  [Table] Objectives: |  | Students will be able to read and follow a baking recipe, discuss holiday food traditions, celebrate with seasonal flavors. |  [Table] Core Competencies: | List all that apply: kitchen skill

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual: | Ask students if they know what a tradition is. Ask if anyone would like to share some of their family traditions for the holidays | Introduce gingerbread cookies as a holiday tradition | Introduce ingredients, pass around whole cinnamon sticks and ginger to show where spices come from, define molasses | Before telling students more about molasses, have them each taste a little bit. Encourage them to make their own observations. How does it taste? Smell? Wha

</details>

**New labels (multi-label):** cooking

---

### 49. Green "Acai" Bowls (Mobile Education)

- **ID:** `16603243-0eed-4cc8-886f-f9c37d25276f` — old label: `cooking` — body: 5558 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn how to make a healthy breakfast, snack or dessert–a smoothie bowl in the style of an acai bowl. They will learn about the Brazilian origins of acai. |  [Table] Objectives: |  | Students will be excited about and know how to make a healthy breakfast, snack or dessert. They will get creative decorating their acai bowl

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual: | Welcome students. (5 minutes) | Go over class expectations to be safe, responsible, respectful and adventurous. Give all students hand sanitizer and remind them how to be clean and safe with their bodies and the tools. | Ask if anyone has ever had a smoothie. If yes, what kinds of smoothies do they like? | Has anyone ever had a smoothie bowl? What about an acai (pronounced Ah-sah-ee) bowl? | Use | these pictures | to talk about the origins of acai bowls. |

</details>

**New labels (multi-label):** cooking

---

### 50. Growing Indoor Edible Sprouts

- **ID:** `c4ede9b8-fdf5-4d3a-a9ae-0d812ef587c5` — old label: `garden` — body: 5459 chars

<details><summary>Summary excerpt</summary>

Summary: | Students plant "soil sprouts" as a first step toward growing microgreens for their seed-to-table salad unit. |  [Table] Objectives: |  | Students will be able to plant seeds and know what plants need to survive. [Table] Core Competencies: | Environmental and community stewardship, Garden skills and related academic content. [Table]

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: |  | Opening ritual (5 minutes): | Welcome students to class. "Even though we are indoors, we can still do some gardening today. Does anyone have plants at home that grow indoors? What do they need to be taken care of?" Give students time to respond. | Tell students that they will be doing a special kind of planting today. This is a way to grow seeds quickly, in a small indoor space! You can go over all the steps ahead of time, or go through each step together as you do the pl

</details>

**New labels (multi-label):** garden

---

### 51. Haudenosaunee

- **ID:** `82b101e4-e254-471b-9f58-4454fa46cd0e` — old label: `garden` — body: 5406 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will read/listen to the Haudenosaunee Thanksgiving Address, partake in a garden job related to Native teachings, and do a gratitude activity related to the Thanksgiving address. |  [Table] Objectives: |  | Students will learn about Indigenous peoples' reciprocal relationship to the environment. [Table] Core Competencies: | E

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual (10 minutes): | The teacher explains that today's class will be about Native Americans, or Indigenous People. What have you all learned about Indigenous People? Does anyone know what indigenous people in New York are called? Lenape! | Explain that thousands of years ago, New York City looked very different. "There were no big buildings or subways or parks, but instead hills and forests. The land of New York City belonged to the Lenni Lenape people, and for tho

</details>

**New labels (multi-label):** garden

---

### 52. Healing with Roses (Instructions and article may be restricted use)

- **ID:** `3b1b7d97-b80d-495a-9527-c66a6ce1071d` — old label: `cooking` — body: 7052 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will | make a rose glycerite tincture (glycerite is a sweet syrupy plant-based extract) and rose infused honey to understand the healing properties of roses, physically, emotionally and spiritually. |  [Table] Objectives: |  | Students will be able to recognize the healing elements of roses through making two rose based soluti

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual: (10 min) |  | Welcome students back to garden and kitchen class and review class expectations, "Be kind, be safe, be respectful, be brave." |  | "Raise your hands if you have heard the word herbalism. Does anyone want to tell us what you know about herbalism? Does anyone/anyone's family members practice herbalism?" | Let a few students share. Tell them that herbalism is when people use plants for medicinal or therapeutic purposes, often as an alternative to W

</details>

**New labels (multi-label):** craft

---

### 53. Hoppin' John Burgers

- **ID:** `3eef0f33-9dcf-4dc2-bec0-2874e6f49df0` — old label: `cooking` — body: 6204 chars

<details><summary>Summary excerpt</summary>

Summary: |  | Students will learn about ingredients as they relate to African American history then use those ingredients to make Hoppin' John burgers. |  [Table] Objectives: |  | Students will be able to make a twist on a traditional African American dish and learn about the history of its ingredients. [Table] Core Competencies: | kitchen skil

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson.(15 minutes): |  | Welcome students. Today, we are going to be learning about a dish that was invented in America by African American farmers and cooks. People who are African American have heritage from the continent of Africa. In the Introduction Slides, show the world map and highlight the continent of Africa. | Explain that first, we will be making a variation of a recipe ca

</details>

**New labels (multi-label):** cooking

---

### 54. How Food Moves (Food Miles)

- **ID:** `be87e96a-1153-4320-b4c6-b8b0d3ac2d46` — old label: `garden` — body: 5238 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will play a game in which they are assigned miles based on foods they choose.  They will evaluate whether the winner of the game should be the team with the most or least miles based on their discussion of the impact of each kind of food. |  |  [Table] Objectives: |  | Students will identify parts of the world that their food

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow |  | Opening ritual (10 min) |  | Pose a question to the students about a fruit or vegetable that is out of season and why it's not in the garden right now. "For example, right now if I go look in the garden right now I won't find any strawberries. Why not?" Take students' ideas. | "The grocery store does have strawberries though! If it's too cold to grow strawberries here then how does the grocery store have strawberries?" Take students' ideas. |  | Engaging activity | Introdu

</details>

**New labels (multi-label):** academic

---

### 55. Hummus and Pita

- **ID:** `fa480029-d8bf-489c-b8de-34face593b97` — old label: `cooking` — body: 16941 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will read a story by a Palestinian author about olive trees in Palestine and how hummus is an important food in Palestinian culture since the main ingredients (chickpeas, olive oil, sesame) are native plants in that region and indigenous Palestinian people have stewarded this land, cared for these native plants and survived on t

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual (10 minutes): | Introduce Palestine & olive trees - | We are going to be learning about foods that are native to Palestine and important to Palestinian culture and tradition (olives/olive oil, chickpeas) and then we will make hummus, a Palestinian food. | Emphasize that hummus is a food enjoyed in many different countries in the Middle East, like Lebanon, Saudi Arabia, Iran, Iraq, Egypt, and more. | "Today we are going to focus on one country that eats hummus

</details>

**New labels (multi-label):** cooking

---

### 56. I spy…in the garden!

- **ID:** `459d5037-4298-4c92-8923-8a3f2a44da99` — old label: `garden` — body: 4037 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will explore plant parts in the garden on trays, and use their senses to identify plant parts. |  [Table] Objectives: |  | Students will build confidence in exploring the natural world using their senses, and learn about the different plant parts.  Students will be able to correctly identify each plant part. [Table] Core Com

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand-outs and include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson. |  | ( | 15 minutes | ) |  | Welcome students back to class.  Last time, we learned what a gardener | wears | .  What does a gardener wear in the garden? | Today, we are going to explore some plant parts from the garden. Can anyone name a plant part?  Prompt by showing a few items from the trays and ask for answers for wha

</details>

**New labels (multi-label):** garden

---

### 57. Imperfect Foods

- **ID:** `60727711-ef2e-4516-9a1c-f3ef74e33b76` — old label: `both` — body: 5024 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn about "ugly" produce and make a delicious dish using "ugly" produce |  [Table] Objectives: |  | Students will be able to understand what is on the outside doesn't matter its what is on the inside that counts [Table] Core Competencies: | Environmental and community stewardship, garden skills, kitchen skills and rel

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . |  | Opening Ritual | (5 min) | "Hello, how are we doing? With your thumbs, show me how you feel today and we will see how we feel at the end of class." (1-2 min) | Today we are going to learn how to be environmental stewards and reduce waste! (1-2 min) |  | Engaging Activity | Hand out imperfect produce! (Can be f

</details>

**New labels (multi-label):** cooking, garden

---

### 58. Insect Detectives

- **ID:** `6a002ff8-2c72-4561-9b50-a584ee5c940f` — old label: `garden` — body: 6018 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will build familiarity around insects by completing an insect scavenger hunt in the garden. |  [Table] Objectives: | Students will be able to correctly identify insects that live in the garden and practice safety and curiosity around insects. [Table] Core Competencies: | Environmental and community stewardship, garden skills

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Welcome students back to the garden.  Ask students if they have seen anything exciting growing in the garden yet this spring, or something they are excited to see growing.  Go over expectations for the garden: We are Kind, We are Safe, We are Brave, We are Respectful. Give students a petal point to focus on this period (this lesson works especially well for brave and safe).  (5 minutes) | Today, we are going to learn about insect habitats | . (10 minutes) | Can someone tell

</details>

**New labels (multi-label):** garden

---

### 59. Interconnection & Native American Traditions

- **ID:** `7bb14554-025b-4b71-a0d3-e7b05cf0f47a` — old label: `garden` — body: 4757 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will read a | bout Native American history, traditions, and environmental stewardship, then practice environmental stewardship in the garden while being mindful of the interconnected relationships between people, plants, and animals. |  [Table] Objectives: | Students will | have a greater understanding and appreciation of the

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual (10 minutes): |  | The teacher introduces that today the class will be focused on Native Americans / Indigenous People. Students begin sharing what they already know about Native Americans / Indigenous People. The teacher affirms and corrects students' knowledge. | Explain that in class, we will be talking about the Native Americans who lived in the past, but also about the experiences of Native Americans over time and in the present. Write the word "interconn

</details>

**New labels (multi-label):** garden

---

### 60. Intro to Garden Class

- **ID:** `abc12ba0-b8d6-42c5-9a18-a7f2dffd201e` — old label: `garden` — body: 4368 chars

<details><summary>Summary excerpt</summary>

Summary: Stu | dents go over expectations and goals for the year then go over plant parts by creating their own "exquisite plants". |  [Table] Objectives: |  | Students will be able to name the classroom expectations and provide examples of each. Students will be able to name the different plant parts and know what they look like. [Table] Core

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . (5 minutes) | Welcome everyone. Today, we're going to set some expectations for the class, and decide what some of our goals are whenever we are together.  We are then going to do an activity where we draw our own imaginary plants on paper.  Afterwards, we will get a chance to taste a snack made from a plant seed.

</details>

**New labels (multi-label):** garden

---

### 61. Jam and Jelly: Fruit Preservation

- **ID:** `18d2893b-28a2-4349-b8a6-12cdd4ab4d31` — old label: `cooking` — body: 10505 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn about preservation of food, specifically how berries and fruits can be preserved through the canning process to make jam/jelly. Students will watch a video, read a book, and spend the rest of the class making personal jars of jam/jelly to take home. | Note: This lesson requires a follow-up class for a tasting of the c

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual (5 minutes): |  | Hi everyone, welcome back to cooking class. How are you feeling today? Show me with your thumbs. |  | Raise your hand if you like eating jam/jelly. What flavor of jam or jelly do you like? Strawberry jam? Blueberry jam? What's your favorite fruit? Do you think that would taste good as a jam? How do you eat your jam or jelly? On toast? In a sandwich? | Has anyone ever made jam/jelly before? Do you remember what you did to make it? | Give stude

</details>

**New labels (multi-label):** cooking

---

### 62. Juneteenth Lesson

- **ID:** `505ac241-4c7b-42a7-8361-c4a38aa4a7cc` — old label: `cooking` — body: 3894 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will discuss Juneteenth, why many people eat red foods for Juneteenth, and make a red fruit salad (and fruit punch for upper grades) |  [Table] Objectives: |  | Students will be able to explain why eating red foods is associated with Juneteenth. Students will make and taste one or two red foods. Students will be able to prepar

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component: | Welcome students to class. Engage them in a conversation about Juneteenth: | Who knows what holiday is coming up? Who's heard of Juneteenth? What does Juneteenth celebrate? Does anyone know where the practice of eating red foods on Juneteenth comes from? | Juneteenth commemorates the day the last enslaved people in the United States (in Texas) were informed of their freedom. | T

</details>

**New labels (multi-label):** cooking

---

### 63. Ladybugs (3K-1st Grade) 25-26

- **ID:** `dba7d09d-69e2-4450-baab-03e62e2810f6` — old label: `garden` — body: 3760 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will read a story about ladybugs, make ladybug hats, and go on an aphid scavenger hunt. Students use stories to notice and celebrate physical differences. |  [Table] Objectives: |  | Students will be able to describe characteristics of ladybugs and will understand that ladybugs help the garden. [Table] Core Competencies: | E

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow | Opening ritual (10 minutes) | Explain that we are going to learn about a garden animal. "It is red, it has polka dots, and it eats a bug that eats our plants." Ask students if they have a guess. Tell students we are learning about ladybugs today. | Read a ladybug story book, such as | Am I Really Different? | by Evelien van Dort. | In the story, ask students to empathize with the ladybug who is teased for only having one spot. "How do you think she feels?" | Afterwards, have

</details>

**New labels (multi-label):** garden

---

### 64. Leaf Collecting

- **ID:** `34b26c4d-a2a9-44b3-93f3-f3fb7558cfd6` — old label: `garden` — body: 4177 chars

<details><summary>Summary excerpt</summary>

Summary: | Students talk about fall in the garden and collect leaves to put in compost or to use as mulch. |  [Table] Objectives: |  | Students will be able to identify how the garden changes with the changes in the seasons. |  [Table] Core Competencies: | Garden skills and related academic content [Table] Cultural Responsiveness: | This less

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual: | Ask students if they know what season it is. Ask them to observe how the garden has changed since summertime. Emphasize changes such as leaves changing color, leaves falling, temperatures cooling, and animals hibernating. | "Our job as gardeners is really important when the seasons change. The garden needs us to help get it ready for the next season. Today we will be helping the garden get ready for winter!" | Explain to students that since the leaves are f

</details>

**New labels (multi-label):** garden

---

### 65. Lunar New Year Lesson 25-26

- **ID:** `dd355cf1-d60a-4ac1-8dd6-a2e274912dc1` — old label: `cooking` — body: 5641 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn how to make hand pulled noodles that are supposed to signify the length of your life depending on how long the noodles are. Students will learn about the Lunar New Year and how they use the Lunar calendar. |  [Table] Objectives: |  | Students will be able to understand the importance of the Lunar New Year, what is c

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow |  |  | Opening Ritual |  | We are going to learn about the Lunar New Year and make Hand Pulled Noodles today! In China they celebrate the New Year in February! | Why do they celebrate in February and not January? | (They can talk to a partner and try to answer this) Well they use a calendar based off the the MOON that is why they call it the LUNAR New Year. Our calendar is based off the SUN, we use the sun to clock 365 days it takes to rotate the earth. Each year the Lunar New

</details>

**New labels (multi-label):** cooking

---

### 66. Measuring Championships (King Arthur material is restricted use)

- **ID:** `993fa262-43f9-4429-8711-819dd4d7be24` — old label: `cooking` — body: 6304 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will practice techniques for measuring dry ingredients using cup measures by playing a competitive teams-based game. |  [Table] Objectives: |  | Students will be able to correctly identify basic dry ingredients and correctly measure ingredients within a certain time frame. [Table] Core Competencies: | kitchen skills and rela

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | .(15 minutes) | Welcome students back to class.  Go over the 4 rules for garden class, and point out which petal point they will be trying to get today (or whatever other classroom management technique you have!)  This lesson works especially well for students to practice being kind to one another while playing a com

</details>

**New labels (multi-label):** cooking

---

### 67. Mobile Education: Mexican Street Corn Salad (Esquites)

- **ID:** `29a3bf42-2662-45aa-ad48-cf73bd6a4fdf` — old label: `cooking` — body: 5871 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will be welcomed or welcomed back to ESYNYC programming, go over class expectations, learn about Mexican culture and food traditions and make Esquites: Mexican corn salad. |  [Table] Fresh Direct Shopping list: | This | is for three classes with 24 students each (six groups of four students). Please adjust accordingly. |  [T

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: |  | Opening ritual: | Welcome students |  | Welcome to Edible! How are we feeling today? With your thumb you can say great, just okay, not that great. | We are going to make a salad called esquites. It is made from corn! Give me a thumbs up if you have had corn before. Give me a thumbs up if you like corn. Give me a thumbs up if you have had esquites. |  | Go over expectations |  | In order for us to learn and have the opportunity to come to the kitchen classroom we have some

</details>

**New labels (multi-label):** cooking

---

### 68. Mural Painting 101: Beautifying the Garden

- **ID:** `9b06d703-d82c-4b27-8432-4e65fb7f1d89` — old label: `garden` — body: 12667 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn about the importance | of using art to take ownership of and take care of public spaces, and begin the process of painting a mural in their garden. |  [Table] Objectives: |  | Students will be able to recognize the garden as a community and public space, and share their ideas and dreams for an artistic vision that r

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual: (10 min) |  | Welcome students back to garden and kitchen class and review class expectations, "Be kind, be safe, be respectful, be brave." | "Today we are going to be working on an art project, we're going to be painting a mural. Raise your hand if you are an artist/like making art. What type of art do you like to make? Raise your hand if you know what a mural is. Does anyone want to share what a mural is? What is your favorite mural you have seen in your ne

</details>

**New labels (multi-label):** garden, craft

---

### 69. Mushroom Cultivation

- **ID:** `9dcd0f21-2219-4a3b-a0d1-4b93787b5fa2` — old label: `garden` — body: 5265 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn more about how mushrooms are grown, through discussion and video, then inoculate their own mushroom bags using cardboard and mushroom spawn. |  [Table] Objectives: |  | Students will be able to describe how mushrooms differ from plants in their needs and life cycle. [Table] Core Competencies: | Environmental and c

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . | Opening ritual: | Begin by telling students that we will be growing something today that we can eat, but it's not a plant or an animal. See if students can guess what it is. Ask students to tell you what they already know about mushrooms, and write their ideas on the board. | Show the following | video | about Te

</details>

**New labels (multi-label):** garden

---

### 70. Natural Dyeing

- **ID:** `9422e1b0-82a3-48a4-b1ec-1253d7cec032` — old label: `garden` — body: 6033 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will create their own dyed fabrics using natural materials from the garden and kitchen. |  [Table] Objectives: |  | Students will be able to….understand how plant materials can be used to create dyes on fabrics. [Table] Core Competencies: | List all that apply: | Environmental and community stewardship, garden skills and rel

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . (10min) | Begin by asking students what we use plants for. Students may say things like food, building materials, clothing, etc. | Explain that another way plants have been used over time is to make color for things like clothing, hair, or makeup. Explain that today we will be using plants to dye some fabric. | Pas

</details>

**New labels (multi-label):** craft

---

### 71. NEW Place Based: Native Plants in Our Garden

- **ID:** `ae8f00b4-a4ea-4601-85f3-9b720d0ced89` — old label: `garden` — body: 5328 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn about plants and animals living in Manahatta |  [Table] Objectives: |  | Students will be able to learn about plants and animals from this part of the world and see some plants in real life growing in our garden. They will understand the meaning of the word "native" and how it relates to their identities. [Table]

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . (10-15 min) | Lets close our eyes and ask yourself how you are feeling, without sharing out loud tell yourself how you are feeling. At the end of the class we will do the same thing and hopefully if you aren't feeling amazing we will change that during this class. | Does anyone remember who the Lenepe are? We talke

</details>

**New labels (multi-label):** garden

---

### 72. Our Garden Community

- **ID:** `969d9441-8aa0-4ca4-be8b-640f3e07da5c` — old label: `garden` — body: 4023 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will read a story about the members of a garden community, then make their own illustrations about what plants, animals, and people are part of a garden community. [Table] Objectives: | Students will be able to name plants, animals, and people that are part of a garden community and describe how they interact with one another.

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . (5-10 min) | Begin by introducing or reintroducing the word "community:" a group of people that work together. You may think of an example of another type of community, such as a school, and its members. Together with students, identify the people who are members of a school community and what jobs they do (i.e. th

</details>

**New labels (multi-label):** garden

---

### 73. Our Little Garden Harvest Lesson

- **ID:** `63435667-2556-465a-8314-4809b7c6b308` — old label: `garden` — body: 5123 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn about harvesting and the importance of working together in the garden and kitchen.  Students will reflect on the tasks they've done this spring that helped get the garden ready for harvest, and participate in a garden tasting. |  [Table] Objectives: |  | Students will understand the importance of harvesting as part

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: ( | 50 minutes | ) | Opening ritual (15 minutes) | . | Welcome back to class everyone!  As class walks to the garden, ask students how they are doing today.  Signal to class with bell or clapping ritual to start class, and go over expectations and petal points update: We are kind, safe, brave, and respectful.  We are kind to each other, safe around bees (hug yourself tight), brave when trying new tastes or new tools, and respectful of the space (around woodchips, around plants

</details>

**New labels (multi-label):** garden

---

### 74. Pasta Party

- **ID:** `8890d554-d789-45f4-8d1c-1b725b2c5e41` — old label: `cooking` — body: 5483 chars

<details><summary>Summary excerpt</summary>

Summary: Classes that have earned enough petal points | will celebrate with a pasta-themed party. |  [Table] Objectives: |  | Students will be able to identify the ingredients in an eggless pasta dough, and successfully knead and roll pasta according to verbal instructions. [Table] Core Competencies: | kitchen skills and related academic conten

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (45-50 minutes) | Welcome back to class everyone!  As students enter, circulate and ask students how they are doing today.  Signal to class with a bell or clapping ritual to start class, and go over expectations and petal points update: we have earned enough petals for a pasta party!  Congratulations.  What petals did you get to win this party?  We are kind, safe, brave, and respectful.  (10 minutes) |  | Today, we are going to make homemade pasta for our party.  Who here has

</details>

**New labels (multi-label):** cooking

---

### 75. Plant Life Cycle Exploration

- **ID:** `fc719f65-c54d-4093-96f4-dec556d13152` — old label: `garden` — body: 4421 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will explore the early fall garden to look for plants in different stages of their life cycle. |  [Table] Objectives: |  | Students will be able to describe the life cycle of a plant. [Table] Core Competencies: | Garden skills and related academic content |  [Table] Cultural Responsiveness | : | This lesson promotes studen

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual (15 minutes): |  | Welcome students back to the garden. "This year, we are going to focus on becoming true garden experts. We are going to get really good at knowing how plants grow and how we, as gardeners, can help take care of them. Today we are going to focus on learning about an entire plant's life cycle." |  | Ask if students know what the word "life cycle" means. "A cycle is made up of events which go in a circle. A cycle keeps going over and over again

</details>

**New labels (multi-label):** garden

---

### 76. Plant Part Investigation

- **ID:** `ebb60e07-2c80-4c87-b62e-5ddfab84184e` — old label: `garden` — body: 6797 chars

<details><summary>Summary excerpt</summary>

Summary: |  | Students will identify different parts of a plant: roots, leaves, stems, and flowers. |  [Table] Objectives: |  | Students will understand what all plants have in common. [Table] Core Competencies: |  | Environmental and community stewardship, garden skills and related academic content |  | CCSS: ELA, Writing 7: Participate in sha

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow |  | Opening | (5 minutes) | Today you are going to be detectives. You are going to use your senses to investigate different plant parts and try to guess which part is which. | You will get to use three of your senses—sight, smell and touch. AND, because you are detectives, you will get to use some special detective equipment—these hand lenses. | Hold up a plant with roots visible. | Before we begin, let's remind ourselves about plants.  All plants have several different parts,

</details>

**New labels (multi-label):** garden

---

### 77. Plant Part Scavenger

- **ID:** `6ef39b3e-30f2-4818-9f53-60aac37f6ffe` — old label: `garden` — body: 4207 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will | use visuals, song, and drawing to learn the six major parts of a plant. |  [Table] Objectives: | Students will be able t | o name the most important parts of a plant. |  [Table] Core Competencies: | Garden skills and related academic content [Table] Cultural Responsiveness: | This lesson reshapes the curriculum by i

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual: | "How is everyone feeling today?" Thumb check or 5 fingers. | "This year in garden class, we are going to be learning all about plants. The more we know about plants, the better we will be at taking care of them! We're going to be plant experts this year and then practice what we learn when we take care of the garden." | Draw on the board a picture of several plants with roots, stems, leaves, flowers, fruits, and seeds visible. Ask students to name the parts

</details>

**New labels (multi-label):** garden

---

### 78. Plants and Music

- **ID:** `9678404d-fdcc-4448-b835-46f3713fd54a` — old label: `garden` — body: 6435 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will explore the relationship between plants and music and make some plant-based musical instruments. |  [Table] Objectives: |  | Students will be able to understand more about the relationship between plants and people throughout history and participate in the cultural tradition of making music from plants. [Table] Core Com

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow (45-50 minutes): | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . (10 minutes) |  | Welcome back to class everyone!  As students come in, have Andean flute music (or other example) playing in the background. Ask students if they can identify any of the sounds they hear, how the music makes them feel, or what other music they like to listen to and why. | Signal to class with bell or clapping ritual to start class, and go ove

</details>

**New labels (multi-label):** garden, craft

---

### 79. Plants as Medicine

- **ID:** `1122f444-cd92-4ae0-bbd2-f77dbf2985ae` — old label: `garden` — body: 4406 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will make a tea bag of aromatic herbs to understand how plants have been used as medicine. [Table] Objectives: |  | Students will understand that plants, specifically herbs, have healing properties and can be used as medicine. [Table] Core Competencies: | Kitchen skills and related academic content, multicultural education,

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual (10 minutes): | "We've been talking in garden class about all the ways that nature helps us as people. Today we are going to learn about one more special way that plants help us." | "We haven't always had doctors and hospitals. How did people heal or get better from being sick without doctors and hospitals? They used plants as medicine. People have used plants as medicine in cultures around the world for thousands of years. One way this is done is by making te

</details>

**New labels (multi-label):** garden

---

### 80. Potato Exploration

- **ID:** `5beb9df1-9d50-45cc-b548-433cf3052cd5` — old label: `garden` — body: 10001 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will harvest potatoes in the garden and learn how to use potatoes creatively through making potato paint prints and eating french fries. |  [Table] Objectives: |  | Students will be able to identify that potatoes are originally from South America/the Americas, potatoes grow in the soil, and generally that food grows from plant

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) |  | Opening ritual: |  | (5 min) | Welcome students back to garden and kitchen class and review class expectations, "Be kind, be safe, be respectful, be brave." |  | "Today we are going to be talking about potatoes! Raise your hand high if you have ever eaten a potato. Does anyone want to share your favorite type of potato? What is a potato recipe that you eat with your family?" | Give a few students a chance to sha

</details>

**New labels (multi-label):** garden

---

### 81. Puppet Pollinators

- **ID:** `dd2c3e79-6dbb-4863-b60b-6c37a1fcc2f7` — old label: `garden` — body: 5794 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn about the basics of pollination, a crucial process that happens in the garden, and then create a simple butterfly puppet. |  [Table] Objectives: |  | Students will understand the fundamental processes of pollination, and identify some key pollinators that exist in the garden. [Table] Core Competencies: | Environme

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: ( | 45-50 minutes | ) | Opening ritual (10 minutes): | Welcome back to class everyone!  As students enter, circulate and ask students how they are doing today.  Signal to class with bell or clapping ritual to start class, and go over expectations and petal points update: We are kind, safe, brave, and respectful.  Choose which petal point they are working towards this class.  This lesson especially emphasizes safety around insects in the garden. |  | Today, we're going to learn

</details>

**New labels (multi-label):** garden, craft

---

### 82. Rainsticks

- **ID:** `12f22a4f-f352-40ce-a18e-f4d441197245` — old label: `garden` — body: 6367 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will explore the relationship between plants and music and make some plant-based musical instruments. |  [Table] Objectives: |  | Students will be able to construct a simple rain stick and use it as an instrument to make music in the garden. [Table] Core Competencies: | garden skills and related academic content, cultural di

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow (45 | -50 minutes) | : | Opening ritual (10 minutes): |  | Welcome students back to class.  As students come in, have plant music playing in the background. The garden sounds a little different than last time we visited, let's go check it out to see what's new. | Remind students that in the garden, we use our walking feet.  Make sure you have both of your walking feet on! | In the garden, we use our eyes to see.  Show me how you use your eyes (demonstrate by holding your hands

</details>

**New labels (multi-label):** garden, craft

---

### 83. Recycle Gardening

- **ID:** `7eb2a5d9-148b-4afe-a107-6c81d8c2f052` — old label: `garden` — body: 5449 chars

<details><summary>Summary excerpt</summary>

Summary: | S | tudents | will learn | the basic necessities to grow food | and plants in an urban setting and get to plant seeds in recycled containers. [Table] Objectives: |  | Students will be able to understand what plants need to grow and identify containers to grow plants in which can be found daily in NYC. Students will plant seeds/pot plan

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: |  | Opening ritual (10 minutes): | Raise your hand if you are growing plants/flowers/herbs at home? What are you growing them in - raised beds, containers, coffee cans, etc.? How can we grow plants in NYC even if we do not have access to a community/school garden? How does it feel to take care of a plant every day? | How can we be respectful of the garden space/classroom when planting today? | What are some things that plants need to grow? |  | Water, sun, soil, air, SPACE |

</details>

**New labels (multi-label):** garden

---

### 84. Roly Poly Lunch

- **ID:** `4a2e3163-9eb7-41a1-922f-dde96d554d4f` — old label: `garden` — body: 5204 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn about roly | polys (also known as pillbugs), and their role as decomposers in the garden. |  [Table] Objectives: |  | Students will be able to identify the roly poly and the various kinds of food it eats from the garden. [Table] Core Competencies: | Environmental and community stewardship, garden skills and relate

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | (50 minutes | ) |  | Introduction: Welcome students back to class by sitting in a circle on the carpet or in the garden.  Sing an intro | song | , or greet students individually as they find their seats. | Ask students:  what season is it?  Comment on the weather outside, and what the garden looks like.  (3 minutes) |  | Today, we're going to learn about roly polys!  Make a rolling motion with your arms and ask the class to copy you.  Everyone say "Roly Poly!" | The roly pol

</details>

**New labels (multi-label):** garden

---

### 85. Roots

- **ID:** `9743d489-87f1-4b17-a0b0-8f8879f3a0f7` — old label: `garden` — body: 4541 chars

<details><summary>Summary excerpt</summary>

Summary: | Students do a root dance, examine different kinds of roots, and pull roots out of the garden. |  [Table] Objectives: |  | Students will be able to explain what roots look like and what roots do. [Table] Core Competencies: | List all that apply: | Garden skills and related academic content |  [Table] Cultural Responsiveness | : Are

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . (10 min) | Ask students, what do you do when you are thirsty? Where does the water go? | Explain that today we are learning about a part of the plant, the root. | Teach students a "root dance." | Have students all stand up and bend over, fingers pointed towards the ground. Tell students that they are plants, and yo

</details>

**New labels (multi-label):** garden

---

### 86. Scallion Pancake - AAPI: Yachaejeon Vegetable Pancake

- **ID:** `a4ca3572-2a56-42d8-b969-0e93275be764` — old label: `cooking` — body: 5702 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn about a popular Korean food Yachaejeon (Vegetable Pancake) to celebrate AAPI month [Table] Objectives: |  | Students will be able to….measure, chop, and mix together a vegetable pancake working together and make a dipping sauce to go with it. |  [Table] Core Competencies: | List all that apply: | Environmental and

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . | How are we doing today? Show me with a thumbs up, side, or down. If you aren't having the best day hopefully you feel a little better after today's class. (1 min) | Start out playing a | song | from BTS. Ask students if they know the band and know where they are from? Talk about how we are going to make a dish th

</details>

**New labels (multi-label):** cooking

---

### 87. School and Garden Communities

- **ID:** `d85a066a-90fa-4f7e-82ba-82554935ec2e` — old label: `garden` — body: 4840 chars

<details><summary>Summary excerpt</summary>

Summary: | Students | will sing a song about | the | different members of our garden community | and do a garden job to understand that they as students are important members of the garden community. |  [Table] Objectives: |  | Students will be able to understand that the garden has many different people and animals who help it grow and thrive, j

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow | : | Introduction (10 min) | Welcome students back to the garden! Ask students what they know about the community. "What does community mean?" |  | Ask students to give an example of community - either their classroom or the entire school. | Some examples of community are classrooms, the school, the neighborhood, our mosque or church. | As a group, ask students who different members of the school community are? | Teachers, students, principals, school aides, custodians, kitche

</details>

**New labels (multi-label):** garden

---

### 88. School Lunch Heroes 4th/5th

- **ID:** `96b1306d-c01d-44e1-a530-11d20a2052ea` — old label: `academic` — body: 8071 chars

<details><summary>Summary excerpt</summary>

Summary: | Students learn about school food workers, what a day in the life of a school food worker is like, complete a coloring and writing worksheets on school food workers to display in the school, and decorate aprons to give to their school cafeteria staff. |  [Table] Objectives: |  | Students will be able to: | Identify the responsibilities

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual (15 minutes): | Welcome the students and ask them to give you a thumbs up/down to show how they are feeling. (5 minutes) | Today we're going to learn about a very special group of people in this school. I like to call them school lunch heroes because they are the workers in the cafeteria who make lunch for all <insert school enrollment> students each and every day! Isn't that amazing? | Does anyone have family members that work in food service? This could be i

</details>

**New labels (multi-label):** academic

---

### 89. Sensory Scavenger Hunt and

- **ID:** `2fb74347-a1c5-428b-869a-f4d26f73676f` — old label: `garden` — body: 4472 chars

<details><summary>Summary excerpt</summary>

Summary: |  | Students | are welcomed to the garden and taught garden expectations. Students will |  | explore the garden on their own. |  [Table] Objectives: |  | Students learn garden rules and reinforce their understanding of the five senses through guided exploration of the garden. |  [Table] Core Competencies: | garden skills and related a

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow (45 minutes): |  | Opening ritual (15 minutes): | Welcome students. Ask students if they can name the five senses. | Go over each of the five senses doing gestures to act out each one (shaking out your hands for touch, tapping your nose for smell etc.). | Ask students to make predictions for each of their senses about what they will see out in the garden (what things can we touch or feel in the garden, what things will we hear in the garden). | Talk about how the garden is like

</details>

**New labels (multi-label):** garden

---

### 90. Street Vendors / "Chicken" Over Rice

- **ID:** `a41bdacf-0c12-476a-8d19-055a7750b5dd` — old label: `cooking` — body: 6416 chars

<details><summary>Summary excerpt</summary>

Summary: | Students |  | will learn about the history of mobile street vending, create a model food truck business, and prepare an ESYNYC take on NYC's classic halal cart "chicken over rice." |  [Table] Objectives: |  | Students will be able to learn about the long and unique history of food carts/trucks, hear about current street vending activis

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: ( | 45-50 minutes | ) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson (10 minutes) | . | Welcome back to class everyone!  As students enter, circulate and ask students how they are doing today.  Signal to class with bell or clapping ritual to start class, and go over expectations and/or petal points update: We are kind, safe, brave, and respectful.  Choose which petal point they are working towards this class.  This lesson es

</details>

**New labels (multi-label):** cooking

---

### 91. Sun Printing

- **ID:** `14734df5-94ef-4eab-8a08-be4714f6ef6e` — old label: `garden` — body: 8574 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will become familiar with what flowers, leaves and plant parts are in the garden, and use them to make cyanotypes or sun prints. |  [Table] Objectives: |  | Students will be able to walk carefully and safely around the garden, be respectful of living plants growing in the garden, and arrange their collected plant parts in an a

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual: (10 min) |  | Welcome students back to garden and kitchen class and review class expectations, "Be kind, be safe, be respectful, be brave." | "Today we are going to be doing a really fun art project, called sun printing or cyanotyping. Can everyone repeat the word, cyanotype? This is an art project you can do in any outdoor space, like a park, the beach, or your backyard. The most important thing yo

</details>

**New labels (multi-label):** garden, craft

---

### 92. Sun Printing/Cyanotype

- **ID:** `d06454bb-f85c-40c0-9cce-6c96d6e88882` — old label: `garden` — body: 8533 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will become familiar with what flowers, leaves and plant parts are in the garden, and use them to make cyanotypes or sun prints. |  [Table] Objectives: |  | Students will be able to….walk carefully and safely around the garden, be respectful of living plants growing in the garden, and arrange their collected plant parts in an

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . | Opening ritual: (10 min) | Welcome students back to garden and kitchen class and review class expectations, "Be kind, be safe, be respectful, be brave." | "Today we are going to be doing a really fun art project, called sun printing or cyanotyping. Can everyone repeat the word, cyanotype? This is an art project y

</details>

**New labels (multi-label):** garden, craft

---

### 93. The Apple Story

- **ID:** `5a803328-907d-4765-9649-61463415f350` — old label: `academic` — body: 2750 chars

<details><summary>Summary excerpt</summary>

Summary: | Students read a story about apples and then illustrate the different steps of the apple's journey to our table. |  [Table] Objectives: |  | Students will be able to explain some of the steps that food takes to get to us. |  [Table] Cultural Responsiveness: | incorporates different individual and cultural learning styles [Table] Soc

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual: | Ask students to show you with their thumbs how they are feeling. | Begin class with a tasting, either apple chips or apple slices. | Ask students to share what they have noticed about the garden and the outdoors. Ask: "Are plants growing right now? Why not?" | Show students an apple or draw an apple on the board. Ask students if they have seen apples at the store. Ask: "If I can get an apple from the store, where could that apple be coming from?" Students m

</details>

**New labels (multi-label):** academic

---

### 94. The Garden in the Fall

- **ID:** `a76f0960-118a-4c72-b50e-8150f007db73` — old label: `garden` — body: 4787 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn about different signs of the Fall season that can be seen in the school garden and some things that grow in the garden in the Fall. |  [Table] Objectives: |  | Students will be able to identify signs of fall in the garden. [Table] Core Competencies: | garden skills and related academic content, social-emotional le

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) |  |  | Welcome students to the garden (5-8 mins) | How is everyone feeling today? | Review rules/expectations for existing in garden space: | raise your hand if you feel ready to be safe in the garden today? Who's excited to be in the garden today? | Last time we were here, we learned about leaves in the garden. Leaves are a very important part of the season we are in right now! | Introduce activity: | Does anyone k

</details>

**New labels (multi-label):** garden

---

### 95. The Honeybee Man K-1

- **ID:** `2f5e5d72-1056-450f-bd1a-d68359733ba8` — old label: `garden` — body: 4738 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will read a story, then do an art activity to learn about how bees help fruits to grow. |  [Table] Objectives: |  | Students will be able to describe the relationships between honeybees, people, and flowering plants. [Table] Core Competencies: | Environmental and community stewardship, garden skills and related academic cont

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual (15 minutes): |  | "All year, we've been learning about how important relationships are in our school garden. Today we are going to learn about the relationship between people, plants, and a garden insect: bees." | Have students turn and talk to a neighbor about how they feel about bees: scared, curious, nervous, happy? Empathize with students' feelings, then explain that we are going to read a story that might change our ideas about bees. | Read | The Honeybe

</details>

**New labels (multi-label):** garden

---

### 96. The Lorax Debate

- **ID:** `f508c9d6-7913-43b3-8067-a6057b24f9b5` — old label: `academic` — body: 8201 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will read Dr. Seuss' | The Lorax | and learn about the importance of advocacy and standing up for what they believe in. [Table] Objectives: | Students will understand the importance of advocacy and become more confident speaking in front of large groups. |  [Table] Core Competencies: | Environmental and community stewardship

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening (5 minutes): |  | Welcome to class! How is everyone feeling today? Show me with your thumbs. | Raise your hand if you have read a Dr. Suess book before. Which book was it? What do you remember learning from it? |  | Raise your hand if you have read | The Lorax | before or seen the movie. What do you remember about this book? What did you learn from reading it? | Emphasize that children's books can be fun, silly and colorful but also have important lessons for how to

</details>

**New labels (multi-label):** academic

---

### 97. The Ugly Vegetables

- **ID:** `b7fb8796-90ee-4da1-bcd9-1cdf244e6f07` — old label: `academic` — body: 4450 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will read a story about a community that shares what they grow and do an art activity to share with their classmates. |  [Table] Objectives: |  | Students will be able to understand that part of the garden community is sharing what you grow with others. [Table] Core Competencies: | Environmental and community stewardship, mu

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand-outs and include estimated time) | Opening ritual (5 mins) |  | Ask students to remind you what 'community' means. | "Community is a group of people who come together. We've been learning about community this year, can you give an example of some types of communities? (school, garden, neighborhood, classroom). What communities are you a part of?" | "A big part of being in a community is helping others! We are going to read a story about a girl and her ga

</details>

**New labels (multi-label):** academic

---

### 98. Three Sisters and Companion Planting: a Seed Study

- **ID:** `a98c3fac-fed4-4c6d-bd42-d9b06b58a9d0` — old label: `garden` — body: 6169 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn about the | 3 Sisters, companion planting, and Indigenous heritage month. Students will observe and sort 3 sisters seeds. |  [Table] Objectives: |  | Students will be able to understand the concept of companion planting, identify different types of seeds, and discuss their ideas collaboratively. [Table] Core Compe

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual | (15 mins) |  | "How is everyone feeling today?" Thumb check or 5 fingers. | Hello everyone, welcome back to garden class! Last time we were in the garden, we were looking at pollinators and the plants they like. Today, we are going to be exploring different plants, known as the Three Sisters. Raise your hand if you have a sibling! Raise your hand if you know of the 3 Sisters. | Ask if anyone knows

</details>

**New labels (multi-label):** garden

---

### 99. Three Sisters Puppet Show

- **ID:** `f6d80e5d-81cd-408c-83c2-5a33665a546f` — old label: `garden` — body: 3336 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will enjoy a puppet show to learn hear about the Lenape Legend of the 3 sisters [Table] Objectives: | Students will be able to recognize who the 3 sisters are and the significance they play in the garden. Students will be able to see that when we work together, good things happen! |  [Table] Core Competencies: | List all tha

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: |  | Opening Ritual | "How is everyone feeling today?" Thumb check or 5 fingers. | " | Today we are going to have some friends come in and tell us a tale about the 3 Sisters! Does anyone know who the 3 sisters are? Awesome! If you don't know, you will know by the end of today's class. We are going to listen to the story to learn more!" | "I need everyone to stay where they are and close their eyes nice and tight. Our friends really want to meet us but they are really really sh

</details>

**New labels (multi-label):** garden

---

### 100. Uzbek-Korean Carrot Salad Lesson Plan

- **ID:** `86570c1c-6ea9-4ed7-9357-df8d9725af0b` — old label: `cooking` — body: 6942 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn about the history of diasporic Korean cuisine in Uzbekistan, and make a carrot salad.  In double periods, students will also learn about Navruz Bayrami, a celebration of spring in Uzbekistan. [Table] Objectives: |  | Students will understand how Korean refugees influenced the cuisine in Uzbekistan and beyond.  Stude

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow | (45-50 minutes) | : | Opening ritual (10 minutes): | Welcome back to class everyone!  As students enter, circulate and ask students how they are doing today.  Signal to class with bell or clapping ritual to start class, and go over expectations and petal points update: We are kind, safe, brave, and respectful.  Choose which petal point they are working towards this class.  This lesson especially emphasizes safety with tools and bravery when trying new things. | Today, we are

</details>

**New labels (multi-label):** cooking

---

### 101. Varenyky

- **ID:** `c0de7cf0-bc99-484f-a29c-4ac934d006b9` — old label: `cooking` — body: 3762 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn about Ukraine and vareniki and will discuss the similarities of pocket foods found in the cultures. |  [Table] Objectives: |  | Students will be able to….compare and contrast different pocket foods from around the world. Students will be able to finely chop vegetables and fold dumplings. |  |  [Table] Core Compete

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual: | Introduce today's recipe. | Show the world map and ask students to identify Ukraine. If students volunteer, have them share about food in Ukraine. If not many students volunteer to talk about Ukraine, we will then prompt a conversation about pocket foods (dumplings), such as the pupusas made during the previous lesson. With this conversation in mind, students will be prepared to make comparisons i

</details>

**New labels (multi-label):** cooking

---

### 102. Vegetable Ramen

- **ID:** `85aad1c9-8d8c-4ffe-9ee3-0cbb84e88be1` — old label: `cooking` — body: 3735 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will explore the history and cultural significance of noodles by cooking up this savory vegetable ramen dish. [Table] Objectives: |  | Students will be able: | To make Ramen with fresh vegetable toppings. | To understand that noodles come from China and are eaten all over the world | To understand some of the components of a h

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual: (15-20 minutes) |  |  | Opening circle/discussion: |  | Welcome to class! For many of you this is your first time in the Green Room. When you are in the Green Room you might be cooking or gardening but there are always the same rules we need to remember: | Be Safe - listen for instructions, use tools safely | Be Responsible - clean up after ourselves, use our professional behavior | Be Respectful - be kind, track the speaker, "Don't yuck my yum" | Be Adventur

</details>

**New labels (multi-label):** cooking

---

### 103. Welcome & Garden Exploration: Gardening for All

- **ID:** `55f4d24b-ce66-4cec-8b7f-45f670f1330c` — old label: `garden` — body: 4477 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will get an introduction to the school garden and learn about the many ways gardening benefits people. |  [Table] Objectives: |  | Students will be able to explore their school garden to experience and reflect on the benefits of gardening on an individual and community level. [Table] Core Competencies: | Garden skills and re

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: |  | Opening Ritual | (5 minutes) | Welcome to our school garden (or classroom/greenhouse, if starting inside)! Here is where we learn with and about food. Part of that includes going outside to the garden where you will learn how to grow and care for different plants. Has anyone ever gardened before? | There are a lot of reasons why we garden. It is a great form of exercise, a way to relieve stress, and helps us have pride in something we grew ourselves. | Today we are going

</details>

**New labels (multi-label):** garden

---

### 104. Welcome and Exploration: How humans work in the garden

- **ID:** `6d2ff0d5-1b98-4648-9229-3e71ee3b5b54` — old label: `garden` — body: 4597 chars

<details><summary>Summary excerpt</summary>

Summary: | Students are welcomed to the garden, go over garden rules, and participate in garden chores acting as different characters. |  [Table] Objectives: |  | Students will be able to learn new garden skills and accomplish garden tasks. Students will learn more about garden careers and experiences in the real world. [Table] Core Competencie

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . (5-10) |  | Welcome back to the garden, how does it feel to be outside? What are you excited to do in the garden this year? | With a partner, turn to them and try to come up with jobs people could do that involve being outside most of the time. Let them share their answers, | You could become a gardener or farmer i

</details>

**New labels (multi-label):** garden

---

### 105. Welcome and Exploration: How humans work in the garden (duplicate submission)

- **ID:** `7559d5dc-0429-460b-8268-ecee153223c1` — old label: `garden` — body: 4597 chars

> Note: identical title to entry 104 above; second submission of the same lesson plan. Body is byte-identical (4597 chars). Label both consistently.

<details><summary>Summary excerpt</summary>

Summary: | Students are welcomed to the garden, go over garden rules, and participate in garden chores acting as different characters. |  [Table] Objectives: |  | Students will be able to learn new garden skills and accomplish garden tasks. Students will learn more about garden careers and experiences in the real world. [Table] Core Competencie

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . (5-10) |  | Welcome back to the garden, how does it feel to be outside? What are you excited to do in the garden this year? | With a partner, turn to them and try to come up with jobs people could do that involve being outside most of the time. Let them share their answers, | You could become a gardener or farmer i

</details>

**New labels (multi-label):** garden

---

### 106. What does a gardener do?

- **ID:** `6d5ad028-306c-4a0c-b5cf-6235163155be` — old label: `garden` — body: 5043 chars

<details><summary>Summary excerpt</summary>

Summary: | Students are introduced to the concept of a gardener, listen to a read-aloud about someone working in the garden, and then experience themselves as gardeners by doing a garden job. |  [Table] Objectives: |  | Students will be able to….understand the definition of a gardener and complete a light gardening task that builds on their skill

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . | Welcome students back to class. Ask how they are feeling? (Thumbs up, side, down). | The garden looks a little different than last time we visited, let's go check it out to see what's ne | w.  (15 minutes) | Remind students that in the garden, we use our walking feet.  Make sure you have both of your walking feet

</details>

**New labels (multi-label):** garden

---

### 107. What does a gardener wear?

- **ID:** `77732361-145a-4751-ab10-8d87d6752006` — old label: `garden` — body: 4169 chars

<details><summary>Summary excerpt</summary>

Summary: This is part three in a | series about the role of gardeners.  Students will learn about what gardeners wear when they are working in the garden.  This lesson aligns with the 'clothing unit', a unit of study in standard curriculum for 3K/PK. |  [Table] Objectives: |  | Students will be able to correctly identify the clothing that gardene

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: ( | 45 mins | ) |  | Welcome students back to class.  Last time, we learned what a gardener | does | .  What did we do for the garden last class? (5 minutes) | Today, we are going to learn about what a gardener wears (10 minutes). | Show students a bin of clothes a gardener could wear (a hat, some gloves, an apron, some boots).  One at a time, pull out each item of clothing and ask the group:  what is this?  Why do we wear this in the garden?  Bonus points: Put on each item on

</details>

**New labels (multi-label):** garden

---

### 108. Who Lives in the Garden?

- **ID:** `398cdb9f-8bf2-45a4-9eff-000a226a235b` — old label: `garden` — body: 5416 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will be introduced to the plants and animals that live in the garden by participating in a garden tour, listening to a book read aloud or a puppet show, and finishing with a short garden processing task. |  [Table] Objectives: |  | Students will be able to list some of the plants, birds, and mammals that live in the school gar

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . | Welcome students back to class.  If in PK, ask if they remember coming to the garden last year.  The garden was growing all summer, let's go take a look and see what's new! | (5 minutes) | Remind students that in the garden, we use our walking feet.  Make sure you have both of your walking feet on! | In the garde

</details>

**New labels (multi-label):** garden

---

### 109. Wild Soda

- **ID:** `54011e2a-6310-4dac-9234-16ca055897ba` — old label: `cooking` — body: 7742 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn about wild yeast and make and taste some wild sodas. |  [Table] Objectives: |  | Students will be able to understand more about microbiomes, probiotics, and fermentation. They will learn to make wild soda as a medicinal and healthy alternative to soda. [Table] Core Competencies: | List all that apply: | Garden ski

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand-outs and include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . (5 min) | Welcome back! Does anyone want to share their favorite drinks with the class? | Today we're going to be talking about soda! I'm sure you've heard before that soda is unhealthy for you - this is true because soda contains much more sugar than your body can process normally and it doesn't have any positive nutri

</details>

**New labels (multi-label):** cooking

---

### 110. Worm Breakfast

- **ID:** `2dfed7dc-1ac3-4c8b-9293-f7b4913fd6b2` — old label: `garden` — body: 5306 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will learn about a basic definition for compost, and what materials can go into the compost bin.  Then, they will follow a recipe for a worm breakfast dish. |  [Table] Objectives: |  | Students will be able to identify what materials can go into a compost bin and follow a written recipe for a healthy compost. [Table] Core Co

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . | Welcome students back to class.  Go over the 4 rules for garden class, and point out which petal point they will be trying to get today (or whatever other classroom management technique you have!)  This lesson works especially well for students to practice being kind to one another while sharing. | Have students

</details>

**New labels (multi-label):** garden

---

### 111. Worm Study

- **ID:** `339be78c-f191-4861-8958-7a6a09dae597` — old label: `garden` — body: 4611 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will study worms in an indoor worm bin, draw what they see, and do the worm dance. |  [Table] Objectives: |  | Students will learn what worms need to thrive in a worm bin and will understand that worms play an important role in the garden. |  [Table] Cultural Responsiveness: | This lesson incorporates different individual an

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: | Opening ritual: | Today we are going to be meeting one of the animals that lives in the garden. Give students clues about worms (i.e. this animal doesn't have any legs, this animal is very wiggly). We are learning about worms! | Teach students with worm dance about what worms do in the garden. | Munch, munch! | (hand up, making eating gesture) | Wiggle, wiggle! | (wiggle your whole body) | Poop, poop! | (knees bending on the words) | Soil! | (arms up, big happy gesture) | Ta

</details>

**New labels (multi-label):** garden

---

### 112. Worms and Compost

- **ID:** `f081b0ae-fbbf-424b-b762-6297a5b6af98` — old label: `garden` — body: 4190 chars

<details><summary>Summary excerpt</summary>

Summary: | Students will examine the worm bin, discuss the importance of healthy soil, and complete a worm-related worksheet. |  [Table] Objectives: |  | Students will demonstrate their knowledge of soil and compost. [Table] Core Competencies: | Garden skills and related academic content |  [Table] Cultural Responsiveness | : | This lesson co

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow |  |  | Opening Ritual (10 min) | Welcome students to the garden and introduce or review expectations and norms. | Today will be all about compost. Ask students what they already know about compost--where have they heard that word before?  What belongs in the compost bin?  What doesn't belong?  Show or discuss examples. | Explain that things that can go into the compost break down.  Show students compost from bins 1, 2, and 3. | Do you notice anything living in the compost?  Th

</details>

**New labels (multi-label):** garden

---

### 113. Worms K-1

- **ID:** `79c7720b-1b03-4d9f-9970-83d6430d106d` — old label: `garden` — body: 4851 chars

<details><summary>Summary excerpt</summary>

Summary: stud | ents will study worms in an indoor worm bin, draw what they see, and do the worm dance |  [Table] Objectives: |  | Students will be able to learn what worms need to thrive in a worm bin and understand that worms play an important role in the garden [Table] Core Competencies: | List all that apply: | Environmental and community s

</details>

<details><summary>Agenda excerpt</summary>

Agenda/Class Flow: (link to relevant hand | -outs and | include estimated time) | Opening ritual with SEL component AND with emphasis on yearly theme/connection to previous lesson | . | Opening ritual: | "We're going to meet a very important animal that lives in the soil. Let's see if you can guess who it is!" (Clues: this animal has no legs, it lives underground, it wiggles and squirms, it eats old leaves and food scraps, its poop helps plants grow) | Today we are learning about worms! | Teach stud

</details>

**New labels (multi-label):** garden

---

## After you fill in

Tell me when done. I'll parse the worksheet, build the final ground-truth file at `scripts/eval-data/activity-type-samples.json` (113 rows = each entry's submission_id + body + your multi-label list), and run the harness canonical eval (per-prompt cost ~$30 via CLIProxyAPI proxy, or ~$7 direct if Console-API'd).

If any non-flagged lessons should be re-pulled with longer body (the excerpts here are 350+500 chars; full bodies are 3-17 KB), let me know — I'll run a follow-up MCP query with `--limit 1 --offset N` and longer windows.

