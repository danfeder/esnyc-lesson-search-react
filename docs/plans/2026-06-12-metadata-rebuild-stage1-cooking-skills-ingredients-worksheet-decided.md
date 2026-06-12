# Lesson Library Tag Refresh — Cooking Skills & Main Ingredients — DECIDED

**Status:** DECIDED 2026-06-12 — all decisions made by the user (decision authority per
the PR 6 design's OQ8 lock) in an interactive walkthrough; the curriculum-team
send-out step was replaced by this session at the user's direction.
**Basis:** `~/cCode/pr6-overnight-2026-06-12/pr6f-mini-worksheet-draft.md` (overnight
draft, built from `docs/plans/pr6-stage2-retag-evidence/oq2-smaller-fields-census.md`).
**Consumes into:** the cooking_skills + main_ingredients re-tag pass (PR F rider, or
main pass if folded — see open follow-ups at the end).

---

# Part 1 — Cooking Skills: FINAL LIST (23 entries)

| Section | Entries |
|---|---|
| Everyday kitchen skills | Measuring · Mixing & stirring · Reading & following recipes · Kitchen & food safety · Tasting · Grating · Mashing · Blending & juicing · Seasoning & spice blending |
| Knife work | Knife skills |
| Stove & oven | Boiling & simmering · Sautéing & stir-frying · Steaming · Roasting · Baking · Grilling |
| Bigger projects | Dough making · Creating sauces & dressings · Pickling & preserving · Fermenting |
| Putting dishes together | Assembling dishes · Wrapping & rolling · Plating & garnishing |

Coverage notes (what each absorbing entry covers, for the re-tag prompt + alias map):

- **Knife skills** ← chopping, slicing, dicing, mincing, chiffonade, julienning,
  "Cutting Skills" (129), "Cutting" (15), "Knife skills" (4), "Cutting herbs",
  **and knife safety** ("Knife safety" 15).
- **Kitchen & food safety** ← oven safety, food safety, washing vegetables
  (knife safety now lives under Knife skills).
- **Reading & following recipes** ← "Recipe reading" (206), "Following directions" (88),
  "Following recipes", "following-recipes".
- **Dough making** ← bread making, kneading, rolling/shaping dough, pasta making,
  tortilla making.
- **Assembling dishes** ← assembling cold/hot dishes, salad assembly, wraps, filling,
  stuffing, forming patties.
- **Seasoning & spice blending** ← seasoning to taste, spice blending, mortar and
  pestle, grinding spices, muddling, marinating.
- **Blending & juicing** ← blending, using blender, juicing.
- **Tasting** ← tasting, observing cooking process.
- **Plating & garnishing** ← presentation, food presentation, decorating.
- Retired as too vague (replaced by real skills at re-read): "Basic Skills" (26),
  "Cooking Techniques" (26), "Stovetop cooking" (9), "Various techniques".
- Removed never-used options: Blanching, Kitchen organization (Julienning folds into
  Knife skills rather than being removed).
- No entries for tiny one-offs (Using scissors, Cracking eggs, Peeling, Spreading,
  Topping, Tearing, Shelling, Straining) — other tags on those lessons describe them.

## Decision table — as decided

| # | Proposal | Decision |
|---|---|---|
| 1 | Combine "Recipe reading" + "Following directions" → **Reading & following recipes** | **Agree** — verified all 88 "Following directions" uses sit on cooking lessons (66 cooking + 22 cooking/garden, 0 other), so nothing non-culinary is orphaned |
| 2 | One **Assembling dishes** (hot/cold captured by Cooking Methods) | **Agree** |
| 3 | No general entry; tag specific cuts | **CHANGED: the reverse** — ONE general **Knife skills** entry; the five specific cuts fold INTO it ("the specifics can get too messy") |
| 4 | Retire vague wordings (Basic Skills, Cooking Techniques, …) | **Agree** |
| 5 | Knife safety + Oven safety → Kitchen & food safety | **CHANGED:** Knife safety folds into **Knife skills**; **Kitchen & food safety** stays separate for oven/food safety + washing |
| 6a–6e | Add Grating, Mashing, Blending & juicing, Tasting, Seasoning & spice blending | **Agree — all five added** |
| 7 | Merge never-used Plating + Garnishing → **Plating & garnishing** | **Agree** |
| 8 | Fold Bread making → **Dough making** | **Agree** |
| 9 | Remove never-used Julienning, Blanching, Kitchen organization | **Agree** (Julienning folds into Knife skills per #3) |
| 10 | No entries for tiny one-off actions | **Agree** |

---

# Part 2 — Main Ingredients: FINAL SHAPE

## QUESTION A — list shape: **C. Two levels** ✅

Every lesson gets its group tags; when 1–3 ingredients clearly star in the recipe,
those specific-food tags are added too (borscht = "Root vegetables" + "Beets").
Both levels live in the same `main_ingredients` value set; filter-menu surfacing of
the two tiers is a filter-UI-track concern, not this track's.

## Groups — FINAL (24)

| Category | Groups |
|---|---|
| Vegetables | Alliums (onions, garlic) · Leafy greens · Root vegetables · Nightshades (tomatoes, eggplant) · Peppers · Cruciferous (broccoli, cabbage) · **Squash, cucumbers & melons** · **Mushrooms** *(new)* |
| Fruits | Berries · Citrus fruits · Tropical fruits · Apples & pears · Stone fruits · **Dried fruits** *(new)* |
| Staples & proteins | Grains & starches · Beans & legumes · Nuts & seeds · Eggs · Tofu & plant proteins · Dairy · Dairy alternatives |
| Flavor | Fresh herbs · Spices · **Sweeteners** *(new)* |

Group notes:
- **Squash, cucumbers & melons** (renamed from "Squash & pumpkins") — winter/summer
  squash, pumpkins, cucumbers, melons: one plant family, and the rename gives
  Cucumbers (19) and Melons a discoverable home with no "Other" catch-all.
- **Mushrooms** is its own group — fungi are genuinely distinct in cooking and teaching.
- **Beans & legumes** additionally covers green beans and snow peas.
- **Grains & starches** = wheat/flour, corn/masa, rice, oats, bread, pasta, noodles,
  tortillas, pita — **NOT potatoes** (moved to Root vegetables, user call).
- **Tropical fruits** includes Avocado (as a specific; loses its standalone slot).
- **Celery** and **Fennel** are group-less specifics (tagged when they star; no group
  lights up). "Other vegetables" was rejected — its contents distributed as above.
- Removed never-used group: **Melons** (lives on as a specific under Squash,
  cucumbers & melons).

## Specific-foods tier — starter 34 + always-available extras

26-entry ≥10-lesson starter list minus Mushrooms (now a group) = 25, **plus all nine
near-misses pulled up by the user** = **34**:

| Group | Specific foods (current lesson counts) |
|---|---|
| Alliums | Garlic (3) |
| Root vegetables | Carrots (15) · Sweet potatoes (10) · **Potatoes (38)** · Beets (3) |
| Nightshades | Tomatoes (9) |
| Peppers | Bell peppers (15) |
| Cruciferous | Cabbage (11) |
| Squash, cucumbers & melons | Winter squash (26) · Cucumbers (19) |
| Tropical fruits | Bananas (24) · Avocado (8) |
| Citrus fruits | Lemon (8) |
| Grains & starches | Wheat/flour (108) · Corn/masa (51) · Rice (36) · Oats (19) |
| Beans & legumes | Black beans (26) · Black-eyed peas (22) · Chickpeas (17) · Pinto beans (12) |
| Dairy | Yogurt (17) · Cheese (13) · Butter (10) · Milk (9) |
| Dairy alternatives | Coconut milk (8) |
| Nuts & seeds | Pumpkin seeds (7) · Sunflower seeds (6) |
| Fresh herbs | Cilantro (48) · Parsley (28) · Mint (14) |
| Spices | Ginger (32) · Cinnamon (12) |
| Sweeteners | Honey (16) |

Always-available below-cutoff specifics: Celery (group-less), Fennel (group-less),
Melons (under Squash, cucumbers & melons). The vocabulary is open to adding further
specifics as the re-tag reveals true counts (current counts reflect the old
inconsistent tagging).

## Decision table — as decided

| # | Proposal | Decision |
|---|---|---|
| 1 | Pantry staples (salt, oil, soy sauce, sugar) tagged only when the lesson is *about* them | **Agree** |
| 2 | "Various spices" → **Spices** | **Agree** |
| 3 | Keep **Peppers** as its own group | **Agree** |
| 4 | One squash group | **Agree** — final name **Squash, cucumbers & melons** per #9 |
| 5 | Add **Dried fruits** group | **Agree** |
| 6 | Add **Sweeteners** group (Honey a specific under it; row-1 featured rule applies) | **Agree** |
| 7 | Fold the seven grain/starch top-level slots into **Grains & starches** | **Agree** (after two-level clarification) — **with Potatoes relocated to Root vegetables** |
| 8 | One **Dairy** group; Milk/Cheese/Yogurt/Butter as specifics | **Agree** |
| 9 | Add "Other vegetables" | **CHANGED: distribute instead** — Cucumbers + Melons join the renamed squash group; **Mushrooms** becomes its own group; green beans + snow peas → Beans & legumes; Celery + Fennel = group-less specifics. No "Other" group |
| 10 | Remove never-used "Melons" | **Agree as amended** — removed as a *group*, kept as an available *specific* |

Placement judgment calls: Chives → Fresh herbs (**agree**) · Avocado → Tropical fruits
(**agree**, keeps its searchable tag) · Potatoes → **Root vegetables** (**changed**
from the draft's Grains & starches placement).

---

# Part 3 — QUESTION B — Guyanese: **Both** ✅

Guyanese lessons should be findable under **both Latin American and Caribbean**.

Implementation note (verified 2026-06-12): `data/vocab/cultural-heritage.vocab.json`
is single-parent (`guyanese → latin-american`, line ~238). Rather than schema surgery,
honor the verdict as: (a) keep the hierarchy parent `latin-american`; (b) encode a
re-tag prompt rule that Guyanese lessons ALSO carry the direct `caribbean` tag (the
one existing lesson is already dual-tagged this way, which is what makes it appear
under Caribbean browsing today); (c) defer any true multi-parent schema change to the
filter-UI track. This resolves the inherited `guyanese`-parent hand-off item.

---

## Open follow-ups out of this walkthrough

1. **Delivery to the curriculum team:** decided in-session by the user instead of the
   planned team send-out. Whether a filled copy still goes to the team as a
   confirm-or-object FYI = pending user call (recorded in the execution status doc).
2. **PR F shape:** with the vocab now locked without a team return-trip, whether the
   two fields fold into the main 12-field pass or stay a second pass = pending user
   call (affects PR A's built schema; recorded in the execution status doc).
3. **Generic "following directions" as a cross-activity classroom skill** — noted for
   any future SEL/competencies vocab pass; Cooking Skills is not its home.

## Provenance notes (from the draft's internal notes, kept for traceability)

- Data source: entirely `docs/plans/pr6-stage2-retag-evidence/oq2-smaller-fields-census.md`.
- Option-list counts verified against `src/utils/filterDefinitions.ts`: 27 cookingSkills,
  44 mainIngredients (the census §1 table's 28/45 is off by one each; the file is truth).
- Pure case/accent/plural/kebab twins were folded silently in the draft (no decision
  rows); singleton vague/meta wordings drop and get replaced by real tags at re-read.
- "Following directions" activity-type probe (PROD, 2026-06-12): 66 cooking + 22
  cooking/garden + 0 other.
