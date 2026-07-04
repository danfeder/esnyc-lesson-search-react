# FP4 Brief 5 — Phase 2 rehearsal evidence (TEST) + PROD apply plan

**Status:** Data-fix built + rehearsed on TEST (clean pass, rolled back). **Awaiting owner
in-channel approval for the PROD apply gate.** No PROD write has been made.
**Prepared by:** Opus executor session, 2026-07-03.

- **Data-fix file (the reviewable apply artifact):** `docs/plans/fp4-briefs/brief-5-summary-data-fix.sql`
- **Rehearsal DB:** TEST `rxgajgmphciuaqzvwmox` (`mcp__supabase-test__execute_sql`)
- **PROD (apply target, owner-gated):** `jxlxtzkmicfhchkhiojz` (`mcp__supabase-remote__execute_sql`)
- **Approved scope:** `brief-5-summaries-review.md` — §2 (65 summaries), §3 (21 title fixes
  incl. rows 5 & 18 internal double-space collapses), OWNER DECISIONS #1–#4.

---

## 1. Construction (how the fix defends itself)

- **Summaries keyed by cleaned title, not by hand-typed ids.** The review doc identifies the
  65 rows by title (only the retire pair has explicit ids). Rather than transcribe 65 opaque
  `lesson_id`s, the UPDATE joins each approved summary to its row on the row's *cleaned* title.
  Verified pre-conditions (PROD): the 65 blank-active rows have **65 distinct** cleaned titles,
  so the join is strictly 1:1. Consequence: a summary always travels **with** its title, so
  mis-pairing is impossible; any slip in a join key simply fails to match → that row stays
  blank → caught by the `blanks_after = 0` post-assert (fail-safe, never silent-wrong).
  Join keys were copied **verbatim from a live PROD SELECT**, not retyped from the doc.
- **Title hygiene scoped to exactly the 21.** Census (both DBs): among active rows, the §3
  dirty-title predicate matches **22** rows = **21** blank rows carrying a control char (U+000B
  vertical-tab) **+ 1** non-blank row (`---`, matched via the all-dashes clause). `0` rows
  change-under-clean without a control char. So the `CASE WHEN title ~ '[control]'` guard
  retitles exactly the 21, using the owner-approved DB formula from §3 (no hand-typed titles;
  the `\s{2,}` collapse covers the rows 5 & 18 internal double-spaces).
- **Retire replicates the existing shape.** Probed the 82 retired rows: retire = set
  `retired_at` + `retired_reason` (a `dedup:<slug>` string); `updated_at` is **not** bumped
  (retired rows still carry their old import `updated_at`). The `---` retire uses
  `retired_reason = 'dedup:welcome-exploration-byte-identical-of-cc0a5c'` (honest `dedup:`
  provenance referencing the surviving twin `cc0a5c…`). No `canonical_lessons` /
  `duplicate_resolutions` row (owner decision #3, byte-identical copy). Guarded by
  `retired_at IS NULL` → idempotent.
- **Atomic + guarded.** One `BEGIN … COMMIT` transaction, `LOCK TABLE lessons IN SHARE ROW
  EXCLUSIVE MODE`, pre-flight + post-assert `DO` blocks that `RAISE` (abort → rollback) on any
  deviation. Asserts are **data-driven** (`blanks_after = 0`, active drops by exactly 1) so the
  single file is valid on TEST (58 blanks) and PROD (65 blanks) unchanged.

## 2. TEST ≠ PROD data divergence (important, expected)

TEST is a smaller/older CI snapshot: **685 active / 58 blank** vs PROD **703 active / 65 blank**.
TEST's 58 blank titles are a strict **subset** of PROD's 65 (the 7 PROD-only rows: *All About
Lanternflies lesson, Bees, Empanadas & Corn Salad, Food Justice Advocates: Food Scarcity, Food
Waste, NEW Place Based: Native Plants in Our Garden, Puppet Pollinators*). So on TEST the join
fills 58 and leaves 0 blanks; the 7 unmatched approved rows are inert. The `---`+twin pair and
all 21 dirty-title rows are present on TEST. The brief's numeric asserts (703→702) are therefore
verified on TEST at **685→684** and re-asserted at **703→702 on PROD** at apply time.

## 3. Rehearsal fidelity

The rehearsed SQL is the committed apply file with the final `COMMIT;` replaced by a diagnostic
`SELECT` + `ROLLBACK;`. Proven byte-identical body:

```
$ perl -0pe 's/COMMIT;\s*$//' brief-5-summary-data-fix.sql > _body_a.sql
$ head -n <body-lines> rehearsal.sql > _body_b.sql
$ diff _body_a.sql _body_b.sql  →  BODIES IDENTICAL
```

## 4. Rehearsal result — TEST, inside `BEGIN … ROLLBACK` (clean pass)

Raw diagnostic row (single `execute_sql` batch on TEST):

```
summaries_matched     = 58        (TEST has 58 blanks; all matched — expected)
retired_count         = 1
blanks_after          = 0         ✓ 0 blank-active summaries remain
active_after          = 684       ✓ 685 → 684 (retire −1)
dirty_active_after    = 0         ✓ §3 dirty-title probe returns 0 active rows
dashdash_retired      = true      ✓ ---  retired
dashdash_reason       = dedup:welcome-exploration-byte-identical-of-cc0a5c
twin_summary          = "Students are welcomed to the garden, go over garden rules, and
                         participate in garden chores acting as different characters."  ✓ row 62
butterflies_byteequal = true      ✓ tightened string (owner #1) byte-equal
butterflies_searchable= true      ✓ search_vector refreshed (matches to_tsquery 'pollinators')
jam_byteequal         = true      ✓ Note-dropped string (owner #2) byte-equal
squirrels_byteequal   = true      ✓ curly ’ preserved
corn_title_after      = "Corn Mush and Wojapi Berry Sauce (Slideshow images and cornbread
                         recipe may be restricted use)"   ✓ vtab gone, "recipe may" collapsed
street_title_after    = "Street Vendors/"Chicken" Over Rice"   ✓ vtab gone, triple-space collapsed
```

- **No RAISE** from `lessons_normalize_write_trg` (fires on every write incl. the retire) or
  from `update_lesson_search_vector_trigger`; both pre/post `DO` guards passed.
- **Transcription cross-check (`summary_lengths`):** `char_length` of **all 63** non-tweaked
  summaries equals the review-doc §2 `Chars` column **exactly**; the 2 tweaked rows differ
  exactly as intended — Butterflies **296→167**, Jam and Jelly **461→269**. Combined with the 3
  byte-equal spot-checks, transcription of all 65 is confirmed faithful to the approved doc.
- **Rollback restored baseline:** post-rollback TEST probe = `active 685 / blank 58 / --- active
  / twin blank`. ✓

## 5. NOT-VALID gotcha — re-probe immediately before ANY apply

`valid_cooking_skills` / `valid_main_ingredients` are `NOT VALID` CHECKs → an UPDATE re-validates
the **whole** row. Among the **66** touched rows (65 blank-active + the `---` retire), violators
on PROD 2026-07-03 = **cooking 0, ingredient 0**. **This must be re-run on PROD in the same step
as the apply; if either > 0, STOP.** (Probe is embedded in the apply pre-check below.)

## 6. PROD apply plan (owner-gated — NOT yet run)

Immediately before applying, re-run pre-probes on PROD and require:
`blank-active = 65`, `66-row violators cooking 0 / ingredient 0`, `distinct clean titles = 65`.
Then run `brief-5-summary-data-fix.sql` verbatim on PROD (one transaction; the file's own
pre/post `DO` guards abort on any deviation). Post-apply asserts (mirror of rehearsal, PROD
numbers): `blanks_after = 0`, `active 703 → 702`, `--- retired`, `dirty_active = 0`, twin carries
row-62 summary, 3 spot-checks byte-equal, `search_vector` refreshed on updated rows
(trigger-maintained — one cheap `@@ to_tsquery` probe).

**Notes (per brief — do NOT fix here):**
- **FTS includes `summary`** (`update_lesson_search_vector_trigger` weights `summary` at B).
  The extracted words already lived in `content_text` (weight D), so these lessons were already
  findable; populating `summary` **promotes** them to weight B. The tsvector is trigger-
  maintained and refreshes automatically on the UPDATE — no manual reindex. (Rehearsal confirmed
  `butterflies_searchable = true`.)
- **`content_embedding` is NOT regenerated** by this change — deferred campaign item **C2.4**.
  Expected; not fixed here.

## 7. STOP / hand-back

Rehearsal clean on TEST, rolled back, baseline restored. **Awaiting explicit owner in-channel
approval to apply to PROD.** On approval: re-run §5/§6 pre-probes, apply the committed file,
run the PROD post-asserts, and record them here.
