# C02 Session 1 — Q1 Discovery: Canonical VALUES Manifest + Parent Map + Freeze + Pantry Disposition

**Status:** RECONCILED to the locked §4 Q1 decisions (2026-06-23): B-lite pantry, 4 pre-added specifics, freeze-after-P3. This is the provisional source-of-truth for the P1.1 machine manifest (`c02-vocab.json`).
**Author:** Session 1 read-only discovery agent, 2026-06-23.
**Census source:** PROD (`mcp__supabase-remote__execute_sql`, read-only), `retired_at IS NULL`, `unnest()` per array element.

> **⚠️ CENSUS-NUMBERS CORRECTION (2026-06-23, Session 6).** The headline "121 distinct cooking_skills / 202 main_ingredients" below (§1, lines ~24–25) is **WRONG — it was computed against the TEST database, not PROD** as the line above claims. Proof: `121` equals TEST cooking_skills raw-distinct exactly (PROD = **122**), and the §1a per-value table's named entries sum to exactly **1,709** appearances = TEST exactly (PROD = **1,758**). The `202` matches no definition on either DB and the §1b table self-sums to 212, not 202. **Ground truth (reproducible on live PROD + the 2026-06-11 `oq2-smaller-fields-census.md` verbatim-SQL census): cooking_skills = 122 distinct / 1,758 appearances; main_ingredients = 230 distinct / 1,847 appearances; 764 live rows.** This does NOT change the canonical 93-value manifest (derived from the worksheet, not this census). The per-value lists below are TEST-sourced and so MISS a handful of PROD-only values — the C02 alias-floor was re-audited against live PROD (P2.1) and the clean folds the TEST list missed (Beans→Beans & legumes, Squash→Squash cucumbers & melons, Parmesan/Mozzarella cheese→Cheese, Sour Cream/Buttermilk/Condensed milk→Dairy, Peas→Beans & legumes, Lettuce→Leafy greens, Various seeds→Nuts & seeds, Beyond Sausage (pea protein)→Tofu & plant proteins, …) added to `c02-alias-map.json`. Floor coverage on live PROD = 92.4% cooking / 94.3% ingredients (designed band).
**Inputs reconciled:** worksheet (`2026-06-12-...worksheet-decided.md`) + C02 design §5 amendments + this census.

> This file holds the bulk. The structured return carries only the digest + recommendation.

---

## 0. Anchor verification (design-doc claims vs. current code)

All Q1-relevant anchors verified against current code — see the agent's `anchorChecks`. Highlights:
- `cooking_skills` / `main_ingredients` are confirmed **absent** from `MAIN_PASS_FIELDS` (`vocab.ts:36-49`) and from `Stage2RetagResult` (`schema.ts`), corroborating §3's "PR-6 run produced ZERO output for these two fields."
- `filterDefinitions.ts`: `mainIngredients` config L174 (kebab values, 39 options); `gardenSkills` L231-268 (Title-Case `value===label`, the closed-loop template); `cookingSkills` L271 (kebab values).
- Census headline differs slightly from the design doc §1's stale figures — see §1 below.

---

## 1. Raw census (PROD, `retired_at IS NULL`)

### Headline (this run, 2026-06-23)
- **cooking_skills:** **121 distinct values**, **1,756 appearances** (design §1 said 122 / 1,758 — drift of 1 value / 2 appearances; immaterial).
- **main_ingredients:** **202 distinct values**, **1,816 appearances** (design §1 said 230 / 1,847 — the 230 figure is stale; current is lower).

(The §1 "435 / 430 lessons" denominators were not re-derived here — not needed for the manifest.)

### 1a. cooking_skills — full distinct list (value · appearances)

Measuring (dry/liquid) 223 · Recipe reading 206 · Mixing 180 · Cutting Skills 129 · Chopping 113 · Following directions 88 · Assembling cold dishes 86 · Measuring 75 · Baking 38 · Assembling 35 · Sautéing 35 · Grating 27 · Basic Skills 26 · Cooking Techniques 26 · Mashing 25 · Assembling hot dishes 22 · chopping 20 · Blending 19 · following-recipes 19 · Tasting 19 · measuring 18 · mixing 17 · Dicing 16 · Cutting 15 · Knife safety 15 · Stirring 15 · Boiling 11 · Rolling 11 · Sauteing 10 · Stovetop cooking 9 · Kneading 7 · baking 6 · Folding 6 · Presentation 6 · Rolling dough 6 · Seasoning to taste 6 · Simmering 6 · Using mortar and pestle 6 · boiling 5 · Chiffonade 5 · Oven roasting 5 · Roasting 5 · Steaming 5 · Using scissors 5 · Cracking eggs 4 · Juicing 4 · Knife skills 4 · Salad assembly 4 · Seasoning 4 · Stir-frying 4 · dicing 3 · Dressing making 3 · Filling 3 · Forming patties 3 · Frying 3 · Mixing/stirring 3 · Oven safety 3 · Peeling 3 · slicing 3 · Slicing 3 · Spreading 3 · Whisking 3 · Dough making 2 · dough-making 2 · Folding dumplings 2 · Measuring (dry) 2 · Muddling 2 · Oven baking 2 · Oven use 2 · Sauce making 2 · Shaping dough 2 · Spice blending 2 · Topping 2 · [+ 50 singletons: Assembling wraps, Assembly, Bread making, Cooking, Cooking rice, Creating sauces/dressings, Cutting herbs, Decorating, Dividing recipes, fermenting, Filling and folding dumplings, Filling and sealing dumplings, Filling dumplings, Filling pasta, Folding tamales, Food presentation, food-safety, Grinding, Grinding spices, Heating, Kneading dough, Making spice blends, Marinating, Menu planning, mincing, Observing cooking process, Packing jars, Pasta making, pickling, Pickling, Recipe development, Recipe writing, Rolling sushi, sauteing, Serving, Shelling, Smashing, Stovetop frying, Straining, Stuffing, Tearing, Tool identification, Tortilla making, Using blender, Using kitchen tools, Using leftovers, Various techniques, Washing vegetables, wrapping-rolling]

### 1b. main_ingredients — full distinct list (value · appearances)

Alliums 192 · Wheat/flour 108 · Leafy greens 92 · Root vegetables 86 · Various spices 82 · Nightshades 63 · Berries 55 · Corn/masa 51 · Cilantro 48 · **Herbs & Aromatics 48** · Potatoes 38 · Rice 36 · Ginger 32 · Parsley 28 · Eggs 27 · Tropical fruits 27 · Black beans 26 · Winter squash 26 · Bananas 24 · Black-eyed peas 22 · Dairy 21 · Cruciferous 20 · Cucumbers 19 · Oats 19 · Chickpeas 17 · Yogurt 17 · Fruits 16 · Honey 16 · Bell peppers 15 · Carrots 15 · Apples 14 · Mint 14 · Cheese 13 · Cinnamon 12 · Pinto beans 12 · Seeds 12 · Cabbage 11 · Mushrooms 11 · Butter 10 · Sweet potatoes 10 · Milk 9 · Olive oil 9 · Tomatoes 9 · Coconut milk 8 · Lemon 8 · **Sugar 8** · alliums 7 · Avocado 7 · Coconut 7 · Oranges 7 · Pumpkin seeds 7 · berries 6 · Citrus 6 · Lime 6 · Sunflower seeds 6 · Tofu 6 · Basil 5 · Chives 5 · corn-masa 5 · Dried fruit 5 · Grains & Starches 5 · Green onions 5 · leafy-greens 5 · Legumes 5 · Peppers 5 · root-vegetables 5 · Agar agar 4 · carrots 4 · Celery 4 · Citrus fruits 4 · Dairy (milk) 4 · Dates 4 · Dill 4 · Dried fruits 4 · Nuts/seeds 4 · Plantains 4 · Raisins 4 · Scallions 4 · wheat-flour 4 · apples 3 · beans 3 · Chocolate 3 · cilantro 3 · Coconut flakes 3 · Cranberries 3 · cucumbers 3 · Garlic 3 · ginger 3 · Lentils 3 · Maple syrup 3 · nightshades 3 · Pears 3 · Pigeon peas (gandules) 3 · Pita bread 3 · Seaweed 3 · **Soy sauce 3** · Vanilla 3 · Beans 2 · Broccoli 2 · Chia seeds 2 · Cocoa 2 · Coconut oil 2 · Cucumber 2 · Dried cherries 2 · Dried cranberries 2 · Granola 2 · Green beans 2 · Herbs 2 · Lemons 2 · Noodles 2 · Nori 2 · Nori (seaweed) 2 · Nuts 2 · Nuts/Seeds 2 · oats 2 · **Oil 2** · Parmesan 2 · pasta 2 · Peppermint oil 2 · potatoes 2 · Pumpkin puree 2 · Rice noodles 2 · Rose hips 2 · Rosemary 2 · Sage 2 · **Salt 2** · Shea butter 2 · Soybeans 2 · Spices 2 · Sprouts 2 · Sunflower butter 2 · Tahini 2 · Thyme 2 · Tortillas 2 · [+ ~78 singletons listed in §4 orphan tail]

---

## 2. DRAFT MANIFEST

### 2a. cooking_skills — CLOSED value set (23, Title-Case `value===label`)

Per §5: the worksheet's 23, with **"Frying" / "Stovetop frying" folded into `Sautéing & stir-frying`** via alias map (no 24th skill).

```
1.  Measuring
2.  Mixing & stirring
3.  Reading & following recipes
4.  Kitchen & food safety
5.  Tasting
6.  Grating
7.  Mashing
8.  Blending & juicing
9.  Seasoning & spice blending
10. Knife skills
11. Boiling & simmering
12. Sautéing & stir-frying
13. Steaming
14. Roasting
15. Baking
16. Grilling
17. Dough making
18. Creating sauces & dressings
19. Pickling & preserving
20. Fermenting
21. Assembling dishes
22. Wrapping & rolling
23. Plating & garnishing
```

cooking_skills has **no two-level tier** — flat closed set, ~94% floor-able. The "Frying"/"Stovetop frying" rows (3+1 appearances) are the only §5 amendment; the re-read assigns the real technique (most likely → `Sautéing & stir-frying`).

### 2b. main_ingredients — CLOSED value set: 24 groups ∪ specifics

**24 GROUPS** (worksheet Part 2 + §5; group-less specifics carried in the specifics list, not here):

```
G1.  Alliums
G2.  Leafy greens
G3.  Root vegetables
G4.  Nightshades
G5.  Peppers
G6.  Cruciferous
G7.  Squash, cucumbers & melons
G8.  Mushrooms
G9.  Berries
G10. Citrus fruits
G11. Tropical fruits
G12. Apples & pears
G13. Stone fruits
G14. Dried fruits
G15. Grains & starches
G16. Beans & legumes
G17. Nuts & seeds
G18. Eggs
G19. Tofu & plant proteins
G20. Dairy
G21. Dairy alternatives
G22. Fresh herbs
G23. Spices
G24. Sweeteners
```

**SPECIFICS** (two-level; each maps to a group OR is group-less = `null` parent). Worksheet starter 34 + §5 amendments (5 new + 1 remap). See parent map §2c.

### 2c. SPECIFIC → GROUP PARENT MAP (the source of truth for the §7 superRefine)

`null` parent = group-less specific (lights up no group when tagged alone). **Confirmed group-less (4):** Celery, Fennel (worksheet) + Seaweed (nori), Cocoa & chocolate (§5 C02 additions). *(Melons is parented under `Squash, cucumbers & melons` per the worksheet — corrected 2026-06-23, Session 2.)*

| Specific | Parent group |
|---|---|
| Garlic | Alliums |
| Carrots | Root vegetables |
| Sweet potatoes | Root vegetables |
| Potatoes | Root vegetables *(moved from Grains, user call)* |
| Beets | Root vegetables |
| Tomatoes | Nightshades |
| Bell peppers | Peppers |
| Cabbage | Cruciferous |
| Winter squash | Squash, cucumbers & melons |
| Cucumbers | Squash, cucumbers & melons |
| Melons | Squash, cucumbers & melons *(corrected 2026-06-23 Session 2: worksheet parents it here, not group-less)* |
| Bananas | Tropical fruits |
| Avocado | Tropical fruits |
| Lemon | Citrus fruits |
| Wheat/flour | Grains & starches |
| Corn/masa | Grains & starches |
| Rice | Grains & starches |
| Oats | Grains & starches |
| Black beans | Beans & legumes |
| Black-eyed peas | Beans & legumes |
| Chickpeas | Beans & legumes |
| Pinto beans | Beans & legumes |
| Yogurt | Dairy |
| Cheese | Dairy |
| Butter | Dairy |
| Milk | Dairy |
| Coconut milk | Dairy alternatives |
| Pumpkin seeds | Nuts & seeds |
| Sunflower seeds | Nuts & seeds |
| **Sunflower butter** | **Nuts & seeds** *(§5 new)* |
| **Tahini** | **Nuts & seeds** *(§5 new)* |
| **Peanut butter** | **Nuts & seeds** *(§5 new)* |
| Cilantro | Fresh herbs |
| Parsley | Fresh herbs |
| Mint | Fresh herbs |
| Ginger | Spices |
| Cinnamon | Spices |
| Honey | Sweeteners |
| **Celery** | **`null` (group-less)** |
| **Fennel** | **`null` (group-less)** |
| **Seaweed (nori)** | **`null` (group-less)** *(§5 new; merges Nori / Nori (seaweed) / Seaweed)* |
| **Cocoa & chocolate** | **`null` (group-less)** *(§5 new; merges Chocolate / Cocoa / Cocoa powder)* |
| **Apples** | **Apples & pears** *(§4 Q1 pre-add — count 14)* |
| **Coconut** | **Tropical fruits** *(§4 Q1 pre-add — count 7)* |
| **Oranges** | **Citrus fruits** *(§4 Q1 pre-add — count 7)* |
| **Lime** | **Citrus fruits** *(§4 Q1 pre-add — count 6)* |

**Specifics count:** 37 worksheet (34-row table + 3 always-available Celery/Fennel/Melons) + 5 §5-new (Sunflower butter, Tahini, Peanut butter, Seaweed (nori), Cocoa & chocolate) + **4 §4-Q1 user-pre-added (Apples, Coconut, Oranges, Lime)** = **46 specifics** (Hummus is a *remap* into the existing `Chickpeas` specific, not a new value). **Provisional closed set = 24 groups + 46 specifics = 70 main_ingredients values** (pantry B-lite adds no literals; any re-tag-discovered additions land before the end-of-P3 freeze).

> NOTE (CORRECTED 2026-06-23 Session 2, user-confirmed): the worksheet header reads *"Specific-foods tier — starter 34 + always-available extras"* — its 34-row table EXCLUDES Celery/Fennel/Melons, which are listed as 3 separate always-available extras (worksheet L121-122). So worksheet specifics = 34 + 3 = **37**; + 5 §5-new + 4 §4-Q1 pre-added = **46 specifics / 70** total provisional main_ingredients values. (The earlier "43/67" dropped those 3 always-available extras — arithmetic slip.) **`Melons` is parented under `Squash, cucumbers & melons`** per the worksheet's repeated intent (the group was renamed to give Melons "a discoverable home", worksheet L84-86/94-95/122), NOT group-less — group-less specifics = **4** (Celery, Fennel, Seaweed (nori), Cocoa & chocolate). The provisional set is frozen at the end of P3.

### 2d. FREEZE decision (recommendation)

The worksheet explicitly leaves the door open: *"The vocabulary is open to adding further specifics as the re-tag reveals true counts."* A byte-identical **closed** DB CHECK / Zod enum **cannot** ship against an open-ended list.

**Recommendation: FREEZE AFTER RE-TAG DISCOVERY, BEFORE ENFORCEMENT.** Concretely:
1. Ship the manifest above as the **provisional** closed set into the harness vocab (P1) so the LLM emits only in-vocab values.
2. The full-run pilot + apply (P2/P3) surface any genuinely-missing high-frequency food the corpus demands (e.g. if "Plantains" (4) or "Coconut" (7) earn a slot). Add those to the manifest **then**.
3. **Freeze the manifest at the end of P3** (post-apply, pre-enforcement). P4's Zod enums + DB CHECKs derive byte-identically from the frozen manifest.

Rationale: enforcement (closed CHECK) is the *last* phase by design (§7/§8 P4), so the freeze naturally lands after discovery without blocking anything. The harness can run against a provisional list; only the CHECK demands a frozen one.

### 2e. PANTRY-STAPLE disposition (Salt / Oil / Soy sauce / Sugar) — recommendation

Census presence (these are NOT in the worksheet's groups or specifics today): **Salt 2 · Oil 2 (+ Olive oil 9, Coconut oil 2, Sesame oil 1, Coconut sugar 1) · Soy sauce 3 (+ Soy Sauce 1) · Sugar 8 (+ Maple syrup 3, Molasses 1, Coconut sugar 1)**.

Worksheet decision-table #1: *"tagged only when the lesson is about them."* §5 leaves the exact disposition to this manifest. Three options:

| Option | What it means | Pros | Cons |
|---|---|---|---|
| **A. Never-stored (drop all four)** | Salt/Oil/Soy sauce/Sugar are dropped at re-tag; no canonical value, no enum/CHECK entry | Cleanest closed set; staples are background to nearly every recipe → low discovery value; avoids a "Salt" filter that matches 200 lessons | Loses the ~8 "lesson is *about* sugar/salt" cases the worksheet wanted to keep; "about-them" intent unrealized |
| **B. Map-to-group where one exists; drop the rest** | **Sugar → Sweeteners** (group exists); Soy sauce → (no clean group; drop or → Spices?); Salt → (no group; drop); Oil → (no group; drop) | Honors worksheet for Sugar via existing Sweeteners group; partial intent preserved | Asymmetric/confusing (only Sugar survives); Soy sauce/Salt/Oil have no natural group → still dropped |
| **C. Four canonical group-less literals** | Add `Salt`, `Oil`, `Soy sauce`, `Sugar` as 4 group-less specifics (`null` parent), tagged only when the lesson is about them | Fully honors worksheet decision-table #1; "about-them" cases keep a tag; consistent treatment | Adds 4 low-discovery values to the closed set; risk reviewers over-tag (mitigated by the dropdown + the "about-them" guidance in the prompt) |

**RECOMMENDATION: Option B-lite → Sugar maps to the existing `Sweeteners` group; Salt / Oil / Soy sauce are DROPPED (never-stored).** Rationale: Sweeteners already exists as a group and `Sugar 8 + Maple syrup 3 + Molasses 1 + Coconut sugar 1 + Honey 16` cleanly populate it (Honey is already a Sweeteners specific) — so Sugar is genuinely a group member, not a special pantry case. Salt/Oil/Soy sauce have **no** natural group, near-zero discovery value, and appear almost always as background → drop. This keeps the closed set lean (no 4 orphan literals) while honoring the one staple (sugar) that maps to a real group. Wire to Q5 gate ④ as **precision on the Sweeteners/Sugar assignment + a "no Salt/Oil/Soy sauce literal survives" check.**

> If the user prefers maximal worksheet fidelity, **Option C** is the fallback (4 group-less literals). Decision needed: **B-lite (recommended) vs C.**

---

## 3. Specific oil/sugar mapping detail (for the floor alias map)

These census rows fold as follows under the B-lite recommendation:
- **Sugar 8, Coconut sugar 1, Molasses 1, Maple syrup 3 → group `Sweeteners`** (Honey already a Sweeteners specific). Vanilla 3 → `Spices` (per §5).
- **Olive oil 9, Oil 2, Coconut oil 2, Sesame oil 1 → DROP** (never-stored; background fat).
- **Soy sauce 3, Soy Sauce 1, Rice vinegar 1 → DROP** (condiments; no group).
- **Salt 2 → DROP.**

(If Option C chosen instead, Salt/Oil/Soy sauce become group-less literals and these rows map to them.)

---

## 4. ORPHAN TAIL — census values NOT covered by worksheet/amendments (drop/remap calls needed)

§5 says "Everything else in the orphan tail is drop-or-remap, handled by the re-read." Listing them here so the manifest is complete and the user can sanity-check the disposition. Grouped by recommended action (the re-read executes; user confirms the policy):

### 4a. REMAP to a group (the LLM/floor assigns the parent group; specific dropped or kept if starred)
- **Fruits 16, Fruit 1, Vegetables 1, Citrus 6, Citrus fruits 4** → these are group-level near-synonyms: Citrus/Citrus fruits → `Citrus fruits` (group); generic "Fruits"/"Vegetables" → re-read assigns the real group(s).
- **Oranges 7, Lime 6, Lemons 2, Limes 1 → `Citrus fruits`** (Lemon is the only citrus *specific*; oranges/limes have no specific slot → group only, or add specifics at freeze).
- **Apples 14 → `Apples & pears` group**; **Pears 3 → `Apples & pears`**; Apples is currently a top-level value but the worksheet group is "Apples & pears" with no Apples specific — re-read tags the group (consider Apples/Pears as freeze-candidate specifics given counts).
- **Coconut 7, Coconut flakes 3 → Tropical fruits (or Dairy alternatives for coconut milk)** — judgment per lesson.
- **Plantains 4 → Tropical fruits** (starch-fruit; user call — could be a freeze-candidate specific at 4).
- **Dried fruit 5, Dried fruits 4, Raisins 4, Dates 4, Dried cherries 2, Dried cranberries 2, Cranberries 3, Dried bananas 1 → `Dried fruits` group** (Raisins/Dates are freeze-candidate specifics; Cranberries fresh → Berries).
- **Legumes 5, Beans 3/2, Lentils 3, Soybeans 2, Pigeon peas (gandules) 3, Kidney beans 1, Red beans 1, Peas 1, Snow peas 1, Green beans 2 → `Beans & legumes`** (Lentils is a freeze-candidate specific at 3; green beans/snow peas explicitly → Beans & legumes per worksheet).
- **Seeds 12, Nuts 2, Nuts/seeds 4, Nuts/Seeds 2, Chia seeds 2, Flaxseed 1, Almonds 1, Pepita seeds 1, Various seeds 1 → `Nuts & seeds`** (Chia/flax freeze-candidate specifics).
- **Dairy 21, Dairy (milk) 4, Dairy (cheese, sour cream) 1, Dairy (cheese, yogurt, sour cream) 1, Parmesan 2, Parmesan cheese 1, Mozzarella cheese 1, Greek Yogurt 1, Sour Cream 1, Condensed milk 1, Buttermilk 1 → `Dairy` (+ Cheese/Yogurt/Milk/Butter specifics where they star).
- **Oat milk 1 → `Dairy alternatives`.**
- **Tomatoes 9 (specific, OK), Eggplant 1, Jalapeno 1, Green bell pepper 1 → Nightshades/Peppers** (Eggplant → Nightshades; Jalapeno/Green bell pepper → Peppers/Bell peppers).
- **Green onions 5, Green onion 1, Scallions 4, Chives 5, Garlic 3 → `Alliums`** (Chives → Fresh herbs per worksheet placement note; Garlic is the Alliums specific).
- **Broccoli 2, Cauliflower 1, Bok choy 1 → `Cruciferous`** (Cabbage is the specific).
- **Summer squash 1, Squash 1, Pumpkin 1, Pumpkin puree 2, Zucchini(—) → `Squash, cucumbers & melons`** (Winter squash specific).
- **Lettuce 1, Sprouts 2, Grape leaves 1, Radish 1, Jicama 1 → Leafy greens / Root vegetables** per item.
- **Basil 5, Dill 4, Sage 2, Thyme 2, Rosemary 2, Oregano 1, Herbs 2, herbs-aromatics 1, Herbs & Aromatics 48 → `Fresh herbs`** (the big `Herbs & Aromatics` split: Fresh herbs vs Alliums — the §3 judgment work; cilantro/parsley/mint already specifics).
- **Various spices 82, Spices 2, Cumin 1, Nutmeg 1, Mahleb 1, Hibiscus 1 → `Spices`** (Ginger/Cinnamon specifics; Vanilla → Spices per §5).
- **Strawberries 1, Grapes 1, Kiwis 1, Peaches 1, Pomegranate 1, Pomegranate Seeds 1, Mango 1, Pineapple 1, Rose hips 2, Rosehips 1 → Berries / Stone fruits / Tropical fruits** per item.
- **Wheat/flour-family: Bread 1, Tortillas 2, Pita bread 3, Pita 1, Noodles 2, Rice noodles 2, Whole wheat flour 1, Whole wheat wraps 1, Semolina flour 1, Cereal/grains 1, Grains & Starches 5, Popcorn 1, Popping corn 1 → `Grains & starches`.**
- **Hummus 1 → re-map to `Chickpeas` specific (§5).**
- **Kimchi 1 → Cabbage/Cruciferous (§5).** **Beyond Sausage (pea protein) 1 → Tofu & plant proteins (§5).** **Tofu 6 → Tofu & plant proteins.**
- **Nori 2, Nori (seaweed) 2, Seaweed 3 → `Seaweed (nori)` group-less specific (§5).**
- **Chocolate 3, Cocoa 2, Cocoa powder 1 → `Cocoa & chocolate` group-less specific (§5).**
- **Beet juice 1, beets 1, Beets 1, Carrot 1, carrots 4 → Root vegetables (Carrots/Beets specifics).**

### 4b. DROP (cosmetic / craft / composite noise — §5 names these explicitly)
- **Cosmetic/craft (§5 "dropped"):** Shea butter 2, Lavender 1, Rose petals 1, Peppermint oil 2, Edible flower petals 1, Rosehips/Rose hips (if craft) — **drop.**
- **Composites (§5 "dropped or folded"):** Ice cream 1, Marshmallows 1, Jelly 1, Jellies 1, Jam 1, Granola 2, Granola with fruit and nuts 1, Applesauce 1, Agar agar 4 — **drop** (Agar agar = gelling agent, no group).
- **Beverages / misc non-food:** Tea 1, Water 1, Hibiscus 1 (or → Spices), Rice paper 1 (wrapper), Rice vinegar 1 (condiment) — **drop.**

### 4c. KEBAB / CASE TWINS (deterministic floor folds — not orphans, just normalization)
`alliums 7, berries 6, leafy-greens 5, root-vegetables 5, corn-masa 5, wheat-flour 4, carrots 4, apples 3, cilantro 3, ginger 3, nightshades 3, cucumbers 3, oats 2, pasta 2, potatoes 2, rice 1, seeds 1, beets 1, bananas 1, cheese 1, yogurt 1, peppers 1, winter-squash 1, stone-fruits 1` and cooking_skills' `chopping 20, measuring 18, mixing 17, dicing 3, slicing 3, baking 6, boiling 5, sauteing 1, following-recipes 19, dough-making 2, food-safety 1, fermenting 1, pickling 1, wrapping-rolling 1, mincing 1` → all fold to their Title-Case canonical via the alias-map floor (Q3). These are the ~92-94% deterministic core.

---

## 5. KEY DECISIONS — RESOLVED 2026-06-23

**User verdicts (design §4 Q1):** (1) Pantry = **B-lite** (Sugar→Sweeteners; drop Salt/Oil/Soy sauce). (2) Freeze = **after re-tag discovery, end of P3**. (3) Roster = **24 groups + 46 specifics = 70** provisional *(corrected from 43/67 in Session 2 — the original count dropped the 3 always-available worksheet extras; see §2c NOTE)*. (4) Pre-add the 4 high-count specifics (**Apples, Coconut, Oranges, Lime**); the rest (Plantains/Lentils/Pears/Raisins/Dates) left to post-run discovery. (5) Casing = **Title-Case `value===label`**. The numbered list below is the original open-question framing, now settled.


1. **Pantry disposition (§2e):** confirm **B-lite** (Sugar → Sweeteners group; Salt/Oil/Soy sauce dropped) vs **Option C** (4 group-less literals).
2. **Freeze policy (§2d):** confirm freeze-after-discovery (provisional set into harness now; freeze at end of P3 before P4 enforcement).
3. **Specifics roster count (§2c NOTE):** confirm the closed set = **24 groups + 39 specifics = 63 values** (reconcile the worksheet "34" reading — whether Celery/Fennel/Melons are inside or outside the 34).
4. **Freeze-candidate specifics (§4a):** the re-tag will reveal counts for Plantains (4), Lentils (3), Pears (3), Raisins/Dates (4 each), Oranges (7), Lime (6), Coconut (7), Apples (14) — confirm whether any are *pre-added* as specifics now vs left to post-run discovery.
5. **Casing (defers to Q8 but Q1 must agree):** manifest written in **Title-Case `value===label`** (mirrors gardenSkills `filterDefinitions.ts:231-268`). The closed value set above is byte-source for the Zod VALUES + DB CHECK arrays + dropdown options.

---

## 6. Contradiction / concern flags

- **None of §3/§5/§7 locked decisions are contradicted by disk.** The census confirms (a) the two-level specifics tier is largely unpopulated in legacy data (most worksheet specifics appear only via group tags, not as distinct specific values — corroborates §3 "must be *added* by reading"); (b) `Herbs & Aromatics` 48 is a real conflated catch-all needing the Fresh-herbs/Alliums split; (c) the vague tags `Basic Skills 26` / `Cooking Techniques 26` / `Stovetop cooking 9` are present and must be replaced by real skills.
- **Minor stale-figure note (not a contradiction):** design §1's "230 distinct main_ingredients" is now **202** and "122 cooking_skills" is now **121** — the corpus shifted slightly since the 2026-06-22 census. The manifest is built from the live 2026-06-23 census, so it's current. Flag for the impl-plan author so they don't re-cite 230/122.
