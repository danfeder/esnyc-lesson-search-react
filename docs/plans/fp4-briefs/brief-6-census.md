# Brief 6 census — Heal 7 retired rows + VALIDATE both constraints

**Status: ⛔ STOPPED at Sequence step 1 (pre-probe). Two blockers; primary one is a
brief-invalidating TEST/PROD divergence → routed to Fable. No branch, no migration, no PR
created. This doc is uncommitted evidence for the redesign.**

Probed live 2026-07-04. PROD `jxlxtzkmicfhchkhiojz`, TEST `rxgajgmphciuaqzvwmox`.

---

## 0. Constraint definitions (parsed from live `pg_get_constraintdef`, both DBs byte-identical)

Both constraints `convalidated=false` on PROD **and** TEST.

- **`valid_cooking_skills`** — 23 canonical values: Measuring, Mixing & stirring, Reading &
  following recipes, Kitchen & food safety, Tasting, Grating, Mashing, Blending & juicing,
  Seasoning & spice blending, Knife skills, Boiling & simmering, Sautéing & stir-frying,
  Steaming, Roasting, Baking, Grilling, Dough making, Creating sauces & dressings, Pickling &
  preserving, Fermenting, Assembling dishes, Wrapping & rolling, Plating & garnishing.
- **`valid_main_ingredients`** — 70 canonical values: 24 parent groups (Alliums, Leafy
  greens, Root vegetables, Nightshades, Peppers, Cruciferous, Squash cucumbers & melons,
  Mushrooms, Berries, Citrus fruits, Tropical fruits, Apples & pears, Stone fruits, Dried
  fruits, Grains & starches, Beans & legumes, Nuts & seeds, Eggs, Tofu & plant proteins,
  Dairy, Dairy alternatives, Fresh herbs, Spices, Sweeteners) + 46 specifics (Garlic …
  Cocoa & chocolate). (Brief said "71"; live def has 70 — parsed the live def, per rules.)

SQL: `SELECT conname, convalidated, pg_get_constraintdef(oid) FROM pg_constraint WHERE
conname IN ('valid_cooking_skills','valid_main_ingredients');` (PROD & TEST identical.)

---

## 1. ⛔ BLOCKER A (primary, brief-invalidating): TEST has unhealed ACTIVE violators

Brief Sequence step 1 STOP condition, verbatim: *"If TEST has violators beyond these 7, or
any active violator exists on either DB, STOP."*

Violator census (`retired_at IS NULL/NOT NULL`, off-vocab element test against the parsed
canonical arrays):

| DB | cooking_skills active | cooking_skills retired | main_ingredients active | main_ingredients retired |
|----|----|----|----|----|
| **PROD** | **0** | 7 | **0** | 7 |
| **TEST** | **11** | 7 | **4** | 7 |

PROD retired violator ids for both constraints = exactly the brief's 7. ✅ matches brief.
TEST additionally has **15 distinct ACTIVE violator rows** the migration does not touch.

**Root cause (confirmed):** the 11 TEST active cooking_skills violators carry precisely the
FP3 Brief 5 "frozen" legacy tokens (`Simmering`, `Basic Skills`, `Assembling`, `Grinding`,
`Blending`, `Mixing/stirring`, `Sautéing`, `Chopping`, `Measuring (dry/liquid)`, `Following
directions`, `Recipe reading`, `Mixing`) and the 4 main_ingredients strays are FP3 B5's
(`Various spices`, `Basil`, `Avocados`). **FP3 Brief 5's active-row heal was applied directly
to PROD via `mcp__supabase-remote__execute_sql` (a data fix, NOT a migration — see
`docs/plans/fp3-briefs/brief-5-data-fix.sql` header and memory
`project_ingredient_parent_invariant_broken`), so TEST never received it.** TEST active rows
are in the pre-FP3-B5 state.

TEST active violator rows (11):

| lesson_id | title | off-vocab carried |
|---|---|---|
| 13vpumvgEgzO7jUWdEHamEjXWwOxvQ_KFHaeMVUKvQDo | Celebrating Eid | Simmering; Various spices |
| 1HWSlL8xio3QQkculHrVLA0EvEBSU4Th_tEZU4pXiD4Q | Nigeria / Red Bean Stew | Chopping; Various spices |
| 1jfFP2nKtAti3HQZzX2Fi9X72M8BZ02uX | Equivalent Ratios | Basic Skills; Recipe reading |
| 1q1icjk5Pgdtqp1EFwU7vNmd07SzrnWfeAYTYqIs59ag | Three Sister Arepas | Sautéing; Assembling |
| 1qFG6f3CdmVqjeTJ_Xfv_y2cITHd6beOeCycIZKV73mE | Italy / Pesto | Grinding; Basil; Various spices |
| 1QiqNPrXEpDXt7Hmc8uMC8hWCSNfhi3qacbIuVzqZxZA | Juneteenth and Cultural Awareness | Simmering |
| 1SDsLLHlfBqIHSxvVVQrbOk96hlOkxOse | Mindful Eating | Blending |
| 1Ufs0zXqshdkXE4J0V8fOPWxqi42T2IlFdsei0ESm7PE | Kitchen Lesson Plan Appendices | (cooking_skills clean — was this row healed? it only carries `Recipe reading`) |
| 1voTOBrqizCtSDbkVdDiEt3MUE51jtm1GTKtrM-4H18M | Soul Food Sunday | Following directions; Measuring (dry/liquid); Mixing/stirring |
| 1w0c7tESqksEPlQL-Fj1tpTL3i2ofmN_Agq-UwwqErBE | Sandor Katz: Food Hero | Mixing/stirring; Following directions |
| 1WOgtZT6tIQs4DQxVZxG9drU1BgNaFCBdt87NKJX01Fs | Honduras and Baleadas | Assembling; Avocados |

(`1Ufs…` carries `Recipe reading`, which IS off-vocab → it's the 11th cooking_skills
violator. `Mixing`/`Measuring` shown alongside are canonical.)

**Why this blocks the migration:** CI applies the migration to TEST on real data. The
migration heals only the 7 retired rows, then runs `VALIDATE CONSTRAINT` × 2. On TEST the 15
active violator rows remain off-vocab → `VALIDATE` raises → transaction aborts → CI red →
PR can never merge. The migration as briefed is only valid against PROD's already-healed
active corpus.

### Design fork for Fable (do NOT decide unilaterally; brief forbids widening the mutation)

- **Option 1 — mirror FP3 B5 onto TEST out-of-band.** Run `fp3-briefs/brief-5-data-fix.sql`
  against TEST via MCP first, so TEST's active rows match PROD; then this migration heals the
  7 retired rows and VALIDATEs identically on both. Keeps this migration exactly as briefed.
  Cost: a deliberate TEST data mutation + a manual pre-step CI won't do automatically; also
  begs whether TEST should carry FP3 B5 permanently vs. per-run.
- **Option 2 — fold the active-row heal into THIS migration** (self-contained, idempotent on
  any DB; no-op on PROD where active rows are already canonical). More correct for a
  migration (reproducible from scratch), but this **widens the mutation** — which the brief's
  STOP list explicitly forbids ("do NOT widen the mutation") and re-imports FP3 B5's frozen
  vocab decisions into a migration.
- **Option 3 — Fable's call.** Broader question this exposes: **FP3 B5 (and possibly other
  owner-gated PROD data fixes) live only on PROD, never in a migration → PROD/TEST vocab
  drift.** Any migration that VALIDATEs vocab constraints will keep tripping on TEST until
  that drift is reconciled. Fable may want a one-time "sync TEST to PROD vocab" migration/step
  as the real fix.

---

## 2. ⚠️ BLOCKER B (secondary): brief's parent-invariant post-assert is unimplementable under remap-only

Brief: *"…still post-assert the parent-invariant holds on the 7 rows (no specific without its
group)."* Under the brief's remap-only design (no parent backfill; backfill = forbidden
widening), that assert **fails** — the 7 retired rows carry pre-existing orphan specifics
that remap does not resolve:

| lesson_id | title | orphan specifics AFTER heal (parent still absent) |
|---|---|---|
| 15T4wU94xT3r-dRx-WJq9XD2-ySg2HKaz | Children's Aid Society | Black beans (→Beans & legumes), Cilantro (→Fresh herbs), Corn/masa (→Grains & starches), Potatoes (→Root vegetables), Tomatoes (→Nightshades), Wheat/flour (→Grains & starches) |
| 1Jbc2TvhQH-mzikeBiRoyCgR21EgQdbGq | Tortilla Time! | Corn/masa (→Grains & starches) |
| 1Y6tHYm3Hh2vLCBCDaM36_TO1EuM61ofd | Choose-Your-Own Flavor Popcorn | Cheese (→Dairy), Corn/masa (→Grains & starches) — (Honey resolves: Maple syrup→Sweeteners lands Sweeteners) |

These are **pre-existing** (retired rows were parked by FP3 B5; its parent-backfill only ran
on active rows). Remap targets are all parent groups, so remap introduces **no new** orphan —
but the absolute invariant was never true on these rows. The faithful post-assert is the
**relative** one ("no NEW orphan introduced"), which passes; the literal absolute one rolls
the migration back. Fable should choose: (a) relative post-assert (recommended — matches the
brief's own "no orphan can be introduced" reasoning and the remap-only scope), or (b) add
parent backfill (widens scope; contradicts brief), or (c) drop the parent-invariant assert
for retired rows entirely.

---

## 3. Completed pre-work (valid regardless of resolution — reusable by the next executor)

### 3a. All off-vocab tokens in the 7 rows map cleanly — no unmapped token, no STOP on the map
Every off-vocab `cooking_skills`/`main_ingredients` token across the 7 rows is covered by the
brief's mapping tables. Carrier STOP-checks pass: **`Pressing` appears only in Tortilla Time!**
(→ Dough making) and **`Steeping` only in Teas around the World** (→ Boiling & simmering).

### 3b. Hand-trace (old → healed, per row; map + drop + first-occurrence dedupe)

PROD and TEST arrays for the 7 rows are **byte-identical**, and each row's `metadata` JSONB
mirror (`cookingSkills`/`mainIngredients`) equals its column (no pre-existing drift on these
7 rows).

**15T4wU94… Children's Aid Society (retired)**
- cooking_skills: `[Chopping, Dicing, Measuring (dry/liquid), Recipe reading, Assembling cold dishes, Baking, Sautéing, Following directions]`
  → `[Knife skills, Measuring, Reading & following recipes, Assembling dishes, Baking, Sautéing & stir-frying]`
- main_ingredients: `[Black beans, Corn/masa, Tomatoes, Zucchini, Cilantro, Wheat/flour, Potatoes, Alliums]`
  → `[Black beans, Corn/masa, Tomatoes, Squash, cucumbers & melons, Cilantro, Wheat/flour, Potatoes, Alliums]`

**1Jbc2Tvh… Tortilla Time! (retired)**
- cooking_skills: `[Measuring (dry/liquid), Mixing, Pressing, Cooking Techniques, Recipe reading, Following directions]`
  → `[Measuring, Mixing & stirring, Dough making, Reading & following recipes]` (Cooking Techniques dropped)
- main_ingredients: `[Corn/masa, Salt, Water]` → `[Corn/masa]` (Salt, Water dropped)

**1kwWC4up… Green Sauce Around the World (retired)**
- cooking_skills: `[Chopping, Mixing/stirring, Using mortar and pestle, Creating sauces/dressings]`
  → `[Knife skills, Mixing & stirring, Blending & juicing, Creating sauces & dressings]`
- main_ingredients: `[Herbs & Aromatics, Leafy greens]` → `[Fresh herbs, Leafy greens]`

**1o4Ru6FV… Teas around the World (retired)**
- cooking_skills: `[Measuring, Steeping, Tasting]` → `[Measuring, Boiling & simmering, Tasting]`
- main_ingredients: `[Herbs & Aromatics]` → `[Fresh herbs]`

**1syFNS-F… Stone Soup (retired)**
- cooking_skills: `[Cutting Skills, Cooking Techniques, Measuring (dry/liquid), Recipe reading, Assembling hot dishes]`
  → `[Knife skills, Measuring, Reading & following recipes, Assembling dishes]` (Cooking Techniques dropped)
- main_ingredients: `[Root vegetables, Leafy greens, Beans, Alliums, Herbs & Aromatics]`
  → `[Root vegetables, Leafy greens, Beans & legumes, Alliums, Fresh herbs]`

**1tKktUwE… Rainbow Grain Salad (retired)**
- cooking_skills: `[Chopping, Knife safety, Measuring (dry/liquid), Mixing, Assembling cold dishes, Following directions]`
  → `[Knife skills, Measuring, Mixing & stirring, Assembling dishes, Reading & following recipes]`
- main_ingredients: `[Grains & Starches, Root vegetables, Leafy greens, Nightshades, Alliums, Herbs & Aromatics]`
  → `[Grains & starches, Root vegetables, Leafy greens, Nightshades, Alliums, Fresh herbs]`

**1Y6tHYm3… Choose-Your-Own Flavor Popcorn (retired)**
- cooking_skills: `[Measuring (dry/liquid), Mixing, Seasoning to taste, Following directions]`
  → `[Measuring, Mixing & stirring, Seasoning & spice blending, Reading & following recipes]`
- main_ingredients: `[Corn/masa, Herbs & Aromatics, Various spices, Cheese, Honey, Maple syrup]`
  → `[Corn/masa, Fresh herbs, Spices, Cheese, Honey, Sweeteners]`

---

## 4. What did NOT change (so the fork is precisely scoped)
- The heal logic for the 7 retired rows is correct and ready (§3b) — it just cannot ship
  through the CI-on-TEST pipeline until BLOCKER A is resolved.
- No PROD write occurred. No branch/migration/PR was created. Only this doc was written
  (uncommitted).

---

## 5. Fable verification + ruling (2026-07-04, coordination session)

Independent re-probes, all live:
- **PROD:** 0 active violators; exactly the brief's 7 retired rows violate BOTH constraints
  (full-corpus scan against the parsed live constraint defs). Both constraints
  `convalidated=false`.
- **TEST:** violator census = **11 distinct active rows** (11 cooking_skills, 4 of which
  also carry the main_ingredients strays — §1's "15 distinct" was double-counting; the §1
  table itself lists 11 rows) + the same 7 retired. ⛔ Blocker A CONFIRMED.
- **7-row parity:** md5 over (cooking_skills, main_ingredients, both JSONB mirror keys) is
  identical PROD↔TEST for all 7 ids. §3b old arrays spot-checked raw against PROD for
  Tortilla Time! + Popcorn — byte-exact. Blocker B's orphan analysis follows arithmetically
  from §3b + the mapping table. ⚠️ Blocker B CONFIRMED.
- **`brief-5-data-fix.sql`:** self-wrapped `BEGIN;`/`COMMIT;`, post-asserts data-driven
  (0/0/0/0) and scoped `retired_at IS NULL` throughout (greps at lines 77/265,
  127–239) — safe to apply to TEST as-is; leaves the 7 retired rows for this brief.

**Rulings (binding, recorded as the ADDENDUM in
`brief-6-validate-constraints.md`):** Blocker A → census Option 1, new Step 0 applies
`brief-5-data-fix.sql` verbatim to TEST, permanent (no rollback). Blocker B → replace the
absolute parent-invariant post-assert with byte-equality to §3b (columns + JSONB), no parent
backfill. Plus a local-reset vacuous-pass guard and a standing policy: PROD data fixes are
mirrored to TEST at ship time.
