# Heritage Filter Rebuild — Backward-Compat Verification (C1.9, the apply gate)

**Captured:** 2026-06-16
**Task:** PR C1.9 — prove the rebuilt recursive heritage filter returns **same-or-greater** results than the OLD live filter (C1.0 baseline) for every option, on **current PROD data**, read-only.
**Source of NEW counts:** the REAL deployed-locally `expand_cultural_heritage(_alias_cultural_heritage(ARRAY[key]))` path (C1.2 applied locally) → label-sets → counted READ-ONLY against PROD.
**Match path (faithful to `search_lessons`):** `lessons.cultural_heritage && <expanded labels> AND retired_at IS NULL`.
**Sanity anchors match the baseline exactly:** PROD = 767 live / 788 total / 339 with heritage.

## Gate verdict: PASS — with one documented correction (USER-APPROVED 2026-06-16, Session 16)

> **Adjudication:** the executor correctly STOPPED on the single −1 per the "any decrease ⇒ stop" hard boundary and escalated. The supervisor independently re-verified the root cause against live PROD (the dropped lesson is `Moroccan Carrot Salad, Two Ways`, tagged `[Moroccan, North African, African]`, no Mediterranean-proper tag, still surfaced under african/north-african, not retired). The user reviewed and **approved recording the gate as PASS with this one noted Moroccan-under-Mediterranean correction** — it is a vocab-aligned fix (locked §16 vocab homes Moroccan under North African, not Mediterranean), not filter narrowing; the lesson remains discoverable under its correct heritage. Original escalation summary retained below for the record.

### Original run summary (29 heals/same + 1 numeric −1 that is a *correction, not a loss*)

- **21 HEAL** (new > old) — including 13 previously-broken options that returned 0 today (the slug-vs-label footgun) now healing: chinese 0→15, japanese 0→10, mexican 0→38, italian 0→25, african-american 0→27, indigenous 0→31, indigenous-and-diaspora 0→58, etc. The keystone heals all land (Asian 65→74, Americas 172→199).
- **9 SAME** (new == old): central-asian, north-american, latin-american, african, west-african, eastern-european, levantine — already fully-expanded today, unchanged.
- **1 numeric DECREASE**: `mediterranean` **45 → 44 (−1)**.

**Why this is NOT a true regression / lesson loss (but is escalated per the hard boundary):**
The OLD 6-row flat `cultural_heritage_hierarchy` table cross-parented **Moroccan** under BOTH `Mediterranean` and `African` (and carried a phantom `Turkish` found nowhere in the vocab). The NEW vocab.json single-source-of-truth tree parents **Moroccan** correctly under `north-african → african` only (NOT Mediterranean) and has **zero** `Turkish` nodes. The single affected lesson —

> **"Moroccan Carrot Salad, Two Ways"** (`1LyuuuF-GNwUfVIgxrR_3NQLCEbD59GkfFN145WeTk3Q`), tagged `[Moroccan, North African, African]`

— is **not removed from the filter system**. It still surfaces under `african` (43→43) and `north-african` (0→3, it is one of those 3). The −1 is the correction of a factually-wrong OLD cross-parenting (a Moroccan dish is North African, not Mediterranean), re-homing the lesson to its correct subtree.

The design doc (§2) explicitly flags the OLD 6-row table as the *least-correct* of the four hierarchy sources, with "phantom German/Turkish found nowhere else." vocab.json (the SoT) deliberately does not place Moroccan under Mediterranean.

**Per the C1.9 hard boundary — any per-option decrease ⇒ STOP and report — this is surfaced to the supervisor for adjudication rather than silently classified PASS.** No migration was adjusted; nothing was "fixed."

## Full comparison (31 options)

| Option (slug) | Tier | OLD (C1.0) | NEW (PROD) | Δ | Class |
|---|---|---:|---:|---:|---|
| asian | top | 65 | 74 | +9 | HEAL |
| east-asian | sub | 40 | 42 | +2 | HEAL |
| south-asian | sub | 18 | 19 | +1 | HEAL |
| southeast-asian | sub | 5 | 6 | +1 | HEAL |
| central-asian | sub | 4 | 4 | 0 | SAME |
| chinese | sub | 0 | 15 | +15 | HEAL |
| japanese | sub | 0 | 10 | +10 | HEAL |
| indian | sub | 0 | 7 | +7 | HEAL |
| pakistani | sub | 0 | 4 | +4 | HEAL |
| uzbek | sub | 0 | 4 | +4 | HEAL |
| korean | sub | 0 | 3 | +3 | HEAL |
| americas | top | 172 | 199 | +27 | HEAL |
| north-american | top | 97 | 97 | 0 | SAME |
| latin-american | top | 82 | 82 | 0 | SAME |
| caribbean | sub | 18 | 19 | +1 | HEAL |
| mexican | sub | 0 | 38 | +38 | HEAL |
| puerto-rican | sub | 0 | 4 | +4 | HEAL |
| african | top | 43 | 43 | 0 | SAME |
| west-african | sub | 15 | 15 | 0 | SAME |
| north-african | sub | 0 | 3 | +3 | HEAL |
| east-african | sub | 0 | 4 | +4 | HEAL |
| european | top | 57 | 61 | +4 | HEAL |
| **mediterranean** | top | **45** | **44** | **−1** | **DECREASE (correction — see above)** |
| eastern-european | sub | 4 | 4 | 0 | SAME |
| italian | sub | 0 | 25 | +25 | HEAL |
| middle-eastern | top | 27 | 29 | +2 | HEAL |
| levantine | top | 19 | 19 | 0 | SAME |
| indigenous-and-diaspora | top | 0 | 58 | +58 | HEAL |
| african-american | top | 0 | 27 | +27 | HEAL |
| indigenous | top | 0 | 31 | +31 | HEAL |
| lenape | sub | 0 | 7 | +7 | HEAL |

## Method / faithfulness evidence

- **NEW label-sets** came from the real local function (C1.2 applied: 71-row `(key,label,parent_key)` table + `WITH RECURSIVE` `expand_cultural_heritage`). Verified locally: `hierarchy_row_count=71`, new-shape cols present, old-shape cols absent, function body contains `WITH RECURSIVE` + `parent_key`.
- **Drift cross-check:** for asian / african-american / indigenous-and-diaspora / levantine / north-american, an independent `WITH RECURSIVE` CTE over the seed table produced label-sets identical to the function (`sets_match = true` for all 5).
- **PROD counts** were SELECT-only against `mcp__supabase-remote`, using `cultural_heritage && <labels> AND retired_at IS NULL` — the exact path the C1.0 baseline used (verified against the live `search_lessons` def in the baseline artifact).
- **Zero PROD writes.** No `apply_migration`, no DDL/DML on any database.

## Sample NEW expansions (from the real local function)

```
asian                   -> {Asian, East Asian, Chinese, Japanese, Korean, Taiwanese, South Asian, Indian,
                            Pakistani, Sri Lankan, Southeast Asian, Vietnamese, Malaysian, Central Asian, Uzbek}  (15)
african-american        -> {African American, Black culinary history, Soul Food}                                  (3)
indigenous-and-diaspora -> {Indigenous and Diaspora, African American, Black culinary history, Soul Food,
                            Indigenous, Lenape, Haudenosaunee, Three Sisters traditions, Cajun/Creole}             (9)
```
