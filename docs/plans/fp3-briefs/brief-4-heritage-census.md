# Brief 4 — Cultural Heritage census (provenance)

**Purpose:** derive the closed reviewer pick-list from the CURRENT distinct stored
heritage values so no existing lesson is invalidated (Brief 4, step 1). Read-only.

**Date:** 2026-07-03
**Database:** PRODUCTION `jxlxtzkmicfhchkhiojz` (via `mcp__supabase-remote__execute_sql`, SELECT only)

---

## Storage shape (schema probe)

- `lessons.cultural_heritage` → `text[]` (ARRAY of text). Stored values are **Title-Case
  display labels** (e.g. `"East Asian"`, `"Soul Food"`), NOT kebab slugs.
- `lessons.retired_at` (timestamptz) marks retired lessons; retired rows STAY in the table.
  Census covers **all** rows (active + retired) per the brief.
- `lesson_submissions` has exactly one metadata-bearing column: `ai_draft_metadata` (jsonb).
  **All 127 PROD submissions have `ai_draft_metadata IS NULL`** → the submission side
  contributes ZERO heritage values. (Verified: `non_null_meta = 0`, `has cultureHeritage key = 0`.)
  All reviewer-entered heritage therefore lives in `lessons.cultural_heritage`.

## Census SQL (lessons — active + retired)

```sql
SELECT
  ch.val AS stored_value,
  count(*) AS total_rows,
  count(*) FILTER (WHERE l.retired_at IS NULL) AS active_rows,
  count(*) FILTER (WHERE l.retired_at IS NOT NULL) AS retired_rows
FROM lessons l
CROSS JOIN LATERAL unnest(l.cultural_heritage) AS ch(val)
GROUP BY ch.val
ORDER BY ch.val;
```

## Submission-side probe SQL

```sql
SELECT
  count(*) AS total_subs,
  count(*) FILTER (WHERE ai_draft_metadata IS NOT NULL) AS non_null_meta,
  count(*) FILTER (WHERE ai_draft_metadata ? 'culturalHeritage') AS has_cultheritage_key
FROM lesson_submissions;
-- → { total_subs: 127, non_null_meta: 0, has_cultheritage_key: 0 }
```

## Raw result (71 distinct stored values)

| stored_value | total | active | retired |
|---|---|---|---|
| African | 27 | 25 | 2 |
| African American | 49 | 47 | 2 |
| Americas | 8 | 5 | 3 |
| Asian | 55 | 52 | 3 |
| Black culinary history | 30 | 29 | 1 |
| Brazilian | 2 | 2 | 0 |
| Cajun/Creole | 4 | 4 | 0 |
| Caribbean | 22 | 22 | 0 |
| Central American | 8 | 7 | 1 |
| Central Asian | 4 | 4 | 0 |
| Chinese | 28 | 26 | 2 |
| Cuban | 5 | 5 | 0 |
| Dominican | 6 | 6 | 0 |
| East African | 4 | 4 | 0 |
| East Asian | 33 | 32 | 1 |
| Eastern European | 5 | 4 | 1 |
| Ecuadorian | 3 | 3 | 0 |
| Egyptian | 9 | 9 | 0 |
| Ethiopian | 3 | 3 | 0 |
| European | 18 | 15 | 3 |
| French | 1 | 0 | 1 |
| Greek | 5 | 5 | 0 |
| Guyanese | 1 | 1 | 0 |
| Haudenosaunee | 4 | 4 | 0 |
| Honduran | 3 | 3 | 0 |
| Indian | 15 | 12 | 3 |
| Indigenous | 53 | 47 | 6 |
| Indigenous and Diaspora | 6 | 5 | 1 |
| Irish | 2 | 2 | 0 |
| Israeli | 2 | 1 | 1 |
| Italian | 18 | 17 | 1 |
| Jamaican | 7 | 7 | 0 |
| Japanese | 14 | 12 | 2 |
| Jordanian | 2 | 0 | 2 |
| Kenyan | 4 | 4 | 0 |
| Korean | 7 | 7 | 0 |
| Latin American | 61 | 52 | 9 |
| Lebanese | 3 | 1 | 2 |
| Lenape | 18 | 16 | 2 |
| Levantine | 10 | 8 | 2 |
| Malaysian | 1 | 1 | 0 |
| Mediterranean | 8 | 5 | 3 |
| Mexican | 41 | 35 | 6 |
| Middle Eastern | 29 | 25 | 4 |
| Moroccan | 1 | 1 | 0 |
| Nigerian | 2 | 2 | 0 |
| North African | 5 | 5 | 0 |
| North American | 8 | 6 | 2 |
| Pakistani | 9 | 8 | 1 |
| Palestinian | 6 | 3 | 3 |
| Persian | 3 | 3 | 0 |
| Peruvian | 3 | 3 | 0 |
| Polish | 2 | 2 | 0 |
| Puerto Rican | 6 | 6 | 0 |
| Russian | 1 | 1 | 0 |
| Salvadoran | 3 | 3 | 0 |
| Soul Food | 14 | 13 | 1 |
| South American | 10 | 8 | 2 |
| South Asian | 14 | 13 | 1 |
| Southeast Asian | 6 | 6 | 0 |
| Southern United States | 21 | 21 | 0 |
| Spanish | 7 | 4 | 3 |
| Sri Lankan | 1 | 1 | 0 |
| Syrian | 5 | 3 | 2 |
| Taiwanese | 1 | 1 | 0 |
| Three Sisters traditions | 26 | 23 | 3 |
| Ukrainian | 6 | 5 | 1 |
| Uzbek | 8 | 8 | 0 |
| Vietnamese | 1 | 1 | 0 |
| West African | 14 | 14 | 0 |
| Yemeni | 3 | 3 | 0 |

## Diff vs canonical vocab (`data/vocab/cultural-heritage.vocab.json`)

- **Stored values missing from the vocab: 0.** Every one of the 71 stored values already
  exists as a canonical vocab entry (matched by label / `alias_map`). **Nothing needs to be
  added to the vocab; nothing is invalidated by adopting the vocab as the closed list.**
- **Perfect bijection:** census distinct set (71) === vocab canonical labels (71); 0 vocab
  entries have zero stored rows.
- **40 of the 71 stored values are `filter_ui_tier: 'internal'`** — present in the vocab but
  EXCLUDED from the search filter's option tree (`culturalHeritageOptions`, top+sub only).
  These include high-frequency values: Black culinary history (30), Three Sisters traditions
  (26), Southern United States (21), Soul Food (14), Egyptian (9)… A reviewer pick-list built
  from the *search* option tree would make all 40 unpickable = invalidate them. **Therefore the
  reviewer pick-list is generated from the FULL vocab (all tiers), not the search tree.**

## STOP-rule check

The brief's STOP rule: if the census surfaces junk values that obviously shouldn't join a
closed list, stop and surface to the owner. **No junk surfaced** — every stored value is a
clean canonical vocab entry. No escalation needed; proceeding with the closure.

---

## Addendum — third source: `submission_reviews.tagged_metadata` (added after code review)

Pre-push review flagged that the reviewer form's LOAD path, when a review is reopened,
restores the latest `submission_reviews.tagged_metadata` (jsonb) — a **third** heritage
source the initial census (lessons + `ai_draft_metadata`) did not cover. This jsonb column
historically stored the old `CreatableSelect`'s output. Because the closed enum uses
Title-Case labels, a reopened legacy row with an off-enum value would display but be
**rejected on re-save**. So this source needs the same STOP-rule rigor.

### SQL (PROD `jxlxtzkmicfhchkhiojz` AND TEST `rxgajgmphciuaqzvwmox`, read-only, ALL statuses)

```sql
SELECT ch.val AS heritage_value, count(*) AS occ,
       (ch.val ~ '^[a-z0-9]+(-[a-z0-9]+)*$') AS is_kebab_slug
FROM submission_reviews sr
CROSS JOIN LATERAL jsonb_array_elements_text(sr.tagged_metadata->'culturalHeritage') AS ch(val)
WHERE sr.tagged_metadata ? 'culturalHeritage'
GROUP BY ch.val ORDER BY is_kebab_slug DESC, ch.val;
```

### Raw result — 15 distinct values, **PROD and TEST identical**, ALL kebab slugs

`african`(1), `americas`(1), `asian`(1), `caribbean`(1), `central-asian`(1),
`east-asian`(5), `eastern-european`(1), `european`(1), `latin-american`(6), `levantine`(3),
`mediterranean`(2), `middle-eastern`(1), `nigerian`(1), `north-american`(14),
`south-asian`(3). All `is_kebab_slug = true`; **zero** Title-Case / hand-typed / free-text
values (despite the old control being a CreatableSelect — reviewers only ever picked presets).

### Verdict

- **Storage regime differs**: `tagged_metadata` stores KEBAB SLUGS (the old picker's
  `value`), unlike `lessons.cultural_heritage` (Title-Case labels).
- **0 unrecoverable**: every one of the 15 slugs is a canonical vocab key → recovers to its
  Title-Case label via `culturalHeritageSlugToLabel` (wired into `canonicalizeReviewMetadata`,
  which runs on both the load-restore and save paths). No junk; STOP-rule holds for this
  source too.
- **Fix**: reopening a legacy review row now restores e.g. `east-asian → "East Asian"`,
  displays correctly, and re-saves cleanly. See commit `c6f9ec0`.
