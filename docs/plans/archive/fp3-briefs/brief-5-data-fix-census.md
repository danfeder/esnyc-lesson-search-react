# Brief 5 — combined data fix: census + TEST rehearsal provenance (2026-07-04)

Provenance for the owner-gated PROD data fix (`brief-5-data-fix.sql`). All PROD
queries read-only. Databases: PROD `jxlxtzkmicfhchkhiojz`, TEST `rxgajgmphciuaqzvwmox`.

## 1. Full 11-row `cooking_skills` census (the "frozen" set)

Per fork §8, censused the FULL 11 active `valid_cooking_skills` violators (§7c's list
came from only 8). **12 distinct off-vocab values** — PROD and TEST identical
(same per-lesson counts):

| off-vocab value | n active lessons | → canonical (owner §8, + executor addition) |
|---|---|---|
| Assembling | 2 | Assembling dishes |
| Basic Skills | 1 | (DROP) |
| **Blending** | **1** | **Blending & juicing** ← NEW (not in §8's 8-row list) |
| Chopping | 1 | Knife skills |
| Following directions | 2 | Reading & following recipes |
| Grinding | 1 | Blending & juicing |
| Measuring (dry/liquid) | 1 | Measuring |
| Mixing | 5 | Mixing & stirring |
| Mixing/stirring | 2 | Mixing & stirring |
| Recipe reading | 3 | Reading & following recipes |
| Sautéing | 1 | Sautéing & stir-frying |
| Simmering | 2 | Boiling & simmering |

**`Blending` → `Blending & juicing`** is the one value beyond §8's table. It has an
obvious canonical home (the canonical value literally begins with "Blending", and the
owner already mapped the adjacent `Grinding` to `Blending & juicing`), so per §8's
"obvious target → map and record" rule it is mapped, not escalated. No value required a
STOP.

Affected set: **11 distinct active lessons** = the 11 `cooking_skills` violators. The 7
invariant-violating rows and the 4 stray-carrying rows are both ⊂ this 11 (every one of
them also has off-vocab `cooking_skills`), so the 11 frozen rows are the complete union.
`~12` in the kickoff was an estimate; the exact count is 11.

## 2. Constraint facts (PROD, `pg_constraint`)

Both `valid_cooking_skills` and `valid_main_ingredients` are `<@` (contained-by) CHECKs,
`convalidated = false` (NOT VALID) — confirms fork §7: any UPDATE re-validates the WHOLE
row against BOTH, so a row's cooking_skills AND main_ingredients must both land canonical
in a single write. The canonical arrays in both CHECK defs match
`COOKING_SKILLS_VALUES` / `MAIN_INGREDIENTS_VALUES` (`lessonMetadata.zod.ts`) byte-for-byte.

## 3. Pre-fix state (both DBs)

| DB | invariant violations | strays | active cs off-vocab | total / active / submissions |
|---|---|---|---|---|
| PROD | 7 | 4 | 11 | 785 / 703 / 127 |
| TEST | 7 | 4 | 11 | 763 / 685 / 130 |

## 4. TEST rehearsal (rollback-based, 2026-07-04)

Ran the file's exact combined UPDATE inside a transaction, forced rollback via a terminal
`RAISE` (the only way to restore the unhealed baseline — the NOT-VALID CHECKs forbid
writing the dirty originals back after a commit).

- **ids_captured = 11, rows_updated = 11** (exactly the frozen set).
- **After: invariant = 0, strays = 0, cs_offvocab = 0** (all three healed, library-wide).
- All 11 healed arrays verified against a hand-trace — exact match. Spot-checks:
  - Honduras and Baleadas: `mi` → `[Pinto beans, Wheat/flour, Dairy, Avocado, Beans & legumes, Grains & starches, Tropical fruits]` (stray `Avocados`→`Avocado` then parent `Tropical fruits` appended — proves stray-remap-before-backfill ordering).
  - Celebrating Eid: `mi` → `[Rice, Chickpeas, Spices, Beans & legumes, Grains & starches]`; `cs` → `[Measuring, Boiling & simmering, Mixing & stirring]`.
  - Mindful Eating: `cs` → `[Blending & juicing, Measuring, Reading & following recipes]` (the new `Blending` mapping); `mi` unchanged (Bananas' parent Tropical fruits already present).
- **TEST baseline restored** post-rollback: 7 / 4 / 763 / 685 / 130 (re-verified).

## 5. PROD pre-apply probe (to post on the PR before requesting the owner data gate)

Run on PROD immediately before apply; expect target rows = 11 and pre-state 7 / 4 / 11.
After owner-approved apply, the same probes must read invariant = 0, strays = 0,
active cs off-vocab = 0.

## 6. Amendment: metadata JSONB mirror sync (Fable verify session, 2026-07-04)

The Fable verification pass found a gap: the fix healed only the **columns**, but the
lesson drawer (`IntLessonDetail`) displays `mainIngredients`/`cookingSkills` from the
**metadata JSONB**, and neither the `lessons_normalize_write` trigger nor the search
RPC's metadata reconstruction covers those two keys (they were reviewer-only fields
until Brief 5). JSONB↔column drift is **0 library-wide today on both DBs** (verified
2026-07-04, incl. the symmetric missing-key case), so the unamended fix would have
made the 11 healed rows the only drifted rows — their drawers would keep showing the
legacy tags the filter no longer matches.

**Amendment** (same single per-row write): the UPDATE now computes each row's healed
arrays once (`computed` CTE) and writes them to the columns **and**
`metadata->'cookingSkills'` / `metadata->'mainIngredients'`. The post-assert gains a
4th check: active JSONB↔column drift on the two mirrored keys = 0 (pre-verified 0 on
both DBs, so an unrelated drifted row cannot abort the fix).

**Re-rehearsal on TEST (2026-07-04, rollback-based, same forced-`RAISE` method):**
- Post-assert passed: invariant = 0, strays = 0, cs off-vocab = 0, **jsonb_drift = 0**.
- Spot-checks matched §4's hand-trace byte-for-byte, now in BOTH representations:
  - Honduras and Baleadas: `mi` → `[Pinto beans, Wheat/flour, Dairy, Avocado, Beans & legumes, Grains & starches, Tropical fruits]`, `metadata->mainIngredients` identical; `cs` → `[Mashing, Assembling dishes]`, `metadata->cookingSkills` identical.
  - Mindful Eating: `cs` → `[Blending & juicing, Measuring, Reading & following recipes]`, JSONB identical.
  - Celebrating Eid: `mi` → `[Rice, Chickpeas, Spices, Beans & legumes, Grains & starches]`.
- **TEST baseline restored** post-rollback: 763 / 685 / 130, cs off-vocab 11, strays 4,
  Honduras back to its dirty original (`… Avocados`, no parent groups).

Post-apply PROD probes now read: invariant = 0, strays = 0, active cs off-vocab = 0,
**and JSONB↔column drift on the two keys = 0**.
