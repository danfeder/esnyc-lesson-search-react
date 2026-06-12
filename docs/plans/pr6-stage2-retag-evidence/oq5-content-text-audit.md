# OQ5 evidence — `lessons.content_text` freshness + quality audit (PROD)

- **Item:** E2 (impl-plan work-list item 2; feeds design OQ5 "Body-source readiness")
- **Date:** 2026-06-11
- **Database:** PROD `jxlxtzkmicfhchkhiojz` via `mcp__supabase-remote__execute_sql` (SELECT-only)
- **Doc fetches:** `mcp__google-workspace__get_doc_content`, `user_google_email df@esynyc.org`

---

## 1. Schema + live-corpus definition

Query:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'lessons'
ORDER BY ordinal_position;
```

Relevant columns (44 total):

| column | type | nullable | role |
|---|---|---|---|
| `content_text` | text | YES | canonical body source |
| `content_hash` | varchar | YES | body hash (see §6 — unreliable on 3 ghost rows) |
| `file_link` | text | NO | Google Doc / Drive link |
| `created_at` / `updated_at` | timestamptz | YES | row timestamps (extraction age proxy) |
| `last_modified` | timestamptz | YES | source-doc modified time captured at import |
| `retired_at` / `retired_reason` | timestamptz / text | YES | PR 4 soft-retirement markers |

**Live-corpus definition used: `retired_at IS NULL`.** This is the user-confirmed definition from the PR 5 design (`docs/plans/2026-06-11-metadata-rebuild-pr5-canonicalization-design.md:126` — "Scope: live rows only (`retired_at IS NULL`) — user-confirmed 2026-06-11").

Counts:

```sql
SELECT COUNT(*) AS total_rows,
  COUNT(*) FILTER (WHERE retired_at IS NULL) AS live_rows,
  COUNT(*) FILTER (WHERE retired_at IS NOT NULL) AS retired_rows
FROM lessons;
-- total_rows=788, live_rows=767, retired_rows=21
```

**The live corpus is 767 rows, not ~751.** The design's "~751" was an estimate derived from the stale 2026-05-06 "772 rows" measurement minus the PR 4 retirements (772 − 21 = 751). Actual today: 788 total − 21 retired = **767 live**. All 767 live rows were created on or before 2026-04-27 (no new approvals since the May measurement):

```sql
SELECT date_trunc('month', created_at)::date AS created_month, COUNT(*) AS n
FROM lessons WHERE retired_at IS NULL GROUP BY 1 ORDER BY 1;
-- 2025-07: 657 | 2025-08: 23 | 2025-09: 81 | 2026-04: 6   (sum 767)
```

The 21 retired rows are exactly the PR 4 import-cleanup drops (all `retired_reason` values `import:*`: foodcorps_2017 ×11, pflp_2003 ×5, cas_food_justice / city_blossoms_botanical_artists / nyc_dep_watershed / nyc_doe_colonial_ny / oregon_doe_leaves ×1 each; all retired 2026-05-08). I could not reproduce any filter under which today's table yields 772 (no `canonical_id` dedup filter applies: 0 non-canonical dup rows live); the 772 figure should be treated as a stale measurement under a different/undocumented population. **Planning consequence: re-tag work-list, cost, and spot-check sampling should be sized for 767 lessons (~2% more than planned).**

---

## 2. Coverage

```sql
SELECT
  COUNT(*) FILTER (WHERE retired_at IS NULL AND content_text IS NULL) AS live_null_content,
  COUNT(*) FILTER (WHERE retired_at IS NULL AND content_text IS NOT NULL AND length(trim(content_text)) = 0) AS live_empty_content,
  COUNT(*) FILTER (WHERE retired_at IS NULL AND length(content_text) < 200) AS live_under_200,
  COUNT(*) FILTER (WHERE retired_at IS NULL AND length(content_text) < 500) AS live_under_500,
  COUNT(*) FILTER (WHERE retired_at IS NULL AND content_hash IS NULL) AS live_null_hash,
  COUNT(*) FILTER (WHERE retired_at IS NULL AND (file_link IS NULL OR file_link = '')) AS live_no_file_link
FROM lessons;
-- live_null_content=0, live_empty_content=0, live_under_200=0,
-- live_under_500=3, live_null_hash=0, live_no_file_link=0
```

**Coverage is 100%: 767/767 live rows have non-null, non-empty `content_text` ≥ 273 chars.** Three rows are under 500 chars:

```sql
SELECT lesson_id, title, length(content_text) AS len, left(content_text, 300) AS excerpt
FROM lessons WHERE retired_at IS NULL AND length(content_text) < 500 ORDER BY len;
```

| lesson_id | title | len | nature |
|---|---|---|---|
| `1l9KH63QBe2xhyH0zp6VIavtj0uKSRZtd` | Unknown | 273 | ghost — body is literally `"Unknown\n\nError processing lesson\n\nGrade Levels: K\n\nThemes: Garden Basics\n…"` (a synthesized metadata stamp, no lesson content). file_link is a `drive.google.com/file/d/...` (not a Doc). |
| `1nFbpkwlujk8fIO8RkeIcDoO2fuO83Iil2Srf8t5iqm8` | Unknown | 273 | ghost — byte-identical body to the row above. |
| `1n8wS0X-dXAw9sfQuLFgsMg_kNvACph3cT4yd9p2i1eg` | Who's Who in the Food System | 462 | **extraction failure on a real lesson** — body is title + summary + `"Objectives:\n[Objectives not available]\nThemes: Not specified"`, but the live Google Doc has a full ~3,300-char lesson body (verified §8.6). |

These are 2 of the 3 known "broken Unknown" ghost rows (memory: metadata cleanup candidates). The third ghost, `1lDjv2GUFzOC9pSWTpCVQW2ctWvvNmTPP4Jc1iAzrsaU` (title "Unknown", 2,442 chars), actually carries a real lesson body — it opens `"High School Indoor Spring African American Foodways: Black-Eyed Pea Salad Summary: Students will cook and eat black-eyed pea salad…"` — so its *body* is usable even though its title and hash are broken (§6).

---

## 3. Length distribution

```sql
SELECT min(length(content_text)) AS min_len,
  percentile_cont(0.05) WITHIN GROUP (ORDER BY length(content_text))::int AS p5,
  percentile_cont(0.25) WITHIN GROUP (ORDER BY length(content_text))::int AS p25,
  percentile_cont(0.5)  WITHIN GROUP (ORDER BY length(content_text))::int AS median,
  percentile_cont(0.75) WITHIN GROUP (ORDER BY length(content_text))::int AS p75,
  percentile_cont(0.95) WITHIN GROUP (ORDER BY length(content_text))::int AS p95,
  max(length(content_text)) AS max_len,
  avg(length(content_text))::int AS mean_len
FROM lessons WHERE retired_at IS NULL;
```

| min | p5 | p25 | median | p75 | p95 | max | mean |
|---|---|---|---|---|---|---|---|
| 273 | 1,792 | 2,755 | 3,781 | 5,062 | 8,627 | 20,477 | 4,294 |

Histogram (1,000-char buckets):

```sql
SELECT width_bucket(length(content_text), 0, 21000, 21) AS bucket,
  (width_bucket(length(content_text), 0, 21000, 21)-1)*1000 AS bucket_min,
  COUNT(*) AS n
FROM lessons WHERE retired_at IS NULL GROUP BY 1 ORDER BY 1;
```

| chars | n | | chars | n |
|---|---|---|---|---|
| 0–999 | 5 | | 7,000–7,999 | 20 |
| 1,000–1,999 | 55 | | 8,000–8,999 | 17 |
| 2,000–2,999 | 168 | | 9,000–9,999 | 10 |
| 3,000–3,999 | 193 | | 10,000–10,999 | 8 |
| 4,000–4,999 | 142 | | 11,000–12,999 | 7 |
| 5,000–5,999 | 86 | | 13,000–15,999 | 8 |
| 6,000–6,999 | 46 | | 18,000–20,999 | 2 |

**No truncation signature.** The distribution is a smooth right-skewed curve with no cliff at any round byte size (no pile-up at 4,096 / 8,192 / 10,000 etc.). Exact-length repeat probe:

```sql
SELECT length(content_text) AS len, COUNT(*) AS n
FROM lessons WHERE retired_at IS NULL
GROUP BY 1 HAVING COUNT(*) > 1 ORDER BY n DESC, len DESC LIMIT 15;
-- top repeats: len 5043 ×3, 4731 ×3, 4037 ×3, then ×2s — all explained by
-- genuinely duplicated lesson bodies (near-duplicate lessons), not truncation.
```

Per-regime lengths (the corpus has two body-shape regimes, see §5):

```sql
SELECT CASE WHEN content_text LIKE '---%' THEN 'submission-era (--- prefix)'
            ELSE 'legacy import' END AS regime,
  COUNT(*) AS n, min(length(content_text)) AS min_len,
  percentile_cont(0.5) WITHIN GROUP (ORDER BY length(content_text))::int AS median_len,
  max(length(content_text)) AS max_len
FROM lessons WHERE retired_at IS NULL GROUP BY 1;
-- legacy import:              n=672, min=273,  median=3516, max=20477
-- submission-era (--- prefix): n=95,  min=2662, median=5270, max=12667
```

---

## 4. Corruption probes

```sql
SELECT
  COUNT(*) FILTER (WHERE content_text ~ '[\x01-\x08\x0B\x0C\x0E-\x1F]') AS ctrl_chars,
  COUNT(*) FILTER (WHERE strpos(content_text, chr(65533)) > 0) AS u_fffd,
  COUNT(*) FILTER (WHERE strpos(content_text, chr(92) || 'n') > 0) AS literal_backslash_n,
  COUNT(*) FILTER (WHERE content_text ILIKE '%&nbsp;%') AS nbsp_entity,
  COUNT(*) FILTER (WHERE content_text ~* '</?(p|div|span|br|table|td|tr|li|ul|ol|h[1-6]|b|i|strong|em)( [^>]*)?/?>') AS html_tags,
  COUNT(*) FILTER (WHERE content_text ~* '&(amp|lt|gt|quot|#\d+);') AS other_entities
FROM lessons WHERE retired_at IS NULL;
-- ctrl_chars=48, u_fffd=0, literal_backslash_n=0, nbsp_entity=0,
-- html_tags=0, other_entities=0
```

(Note: U+0000 cannot exist in PostgreSQL `text`, so the x00 case is impossible by construction.)

### 4.1 Control characters — 48 rows, all benign vertical tabs

```sql
-- which control chars?
SELECT COUNT(*) FILTER (WHERE content_text ~ '[\x01-\x08]') AS has_x01_x08,
  COUNT(*) FILTER (WHERE content_text ~ '\x0B') AS has_vt_x0b,
  COUNT(*) FILTER (WHERE content_text ~ '\x0C') AS has_ff_x0c,
  COUNT(*) FILTER (WHERE content_text ~ '[\x0E-\x1F]') AS has_x0e_x1f,
  COUNT(*) AS total
FROM (SELECT content_text FROM lessons
      WHERE retired_at IS NULL AND content_text ~ '[\x01-\x08\x0B\x0C\x0E-\x1F]') o;
-- has_x01_x08=0, has_vt_x0b=48, has_ff_x0c=0, has_x0e_x1f=0, total=48
```

All 48 offenders contain **exactly one U+000B (vertical tab) each** (`SUM`=48, `MAX` per row=1) — the classic Google Docs soft-line-break (Shift+Enter) artifact, sitting at the end of the title line. Sample excerpt (VT rendered as `<VT>`):

> `---\n\n\nStreet Vendors/"Chicken"   Over Rice<VT>\n\n\n[Table]\nSummary: | Students |  | will learn about the history of mobile street vending…`
> (`lesson_e8fa030e63bf4a9cb13b95448a3450c0`; same pattern in `lesson_730a61c3737c498fb82cb1c074d1d5b1` "Pasta Party", `lesson_78fb31393f1e4d629bfdf735ebd97694` "Potato Exploration", etc. Several of these rows also carry the VT inside `title` itself.)

Harmless for an LLM reader (renders as whitespace); strip `chr(11)` in the bulk runner's export step for hygiene.

### 4.2 Other whitespace/shape artifacts (informational, not corruption)

```sql
SELECT
  COUNT(*) FILTER (WHERE strpos(content_text, chr(13)) > 0) AS rows_with_cr,
  COUNT(*) FILTER (WHERE strpos(content_text, '[Table]') > 0) AS rows_with_table_marker,
  COUNT(*) FILTER (WHERE content_text LIKE '---%') AS rows_starting_dashes,
  COUNT(*) FILTER (WHERE strpos(content_text, chr(9)) > 0) AS rows_with_tab
FROM lessons WHERE retired_at IS NULL;
-- rows_with_cr=368, rows_with_table_marker=95, rows_starting_dashes=95, rows_with_tab=157
```

- **368 rows contain `\r`** — bare carriage returns inside the legacy header block (e.g. opening `"K-12th Grade\rFall\nNo Heat…"`). Whitespace-equivalent; harmless.
- **95 rows (the submission-era regime) start with `---` and flatten Doc tables as `[Table]` markers with pipe-delimited cells** (e.g. `"[Table]\nSummary: | Students |  | will learn about…"`). Readable by an LLM but stylistically different from the 672 legacy-regime bodies — worth one line in the re-tag prompt ("bodies may contain `[Table]` markers and `|` cell separators").
- **No metadata-stamp-only bodies beyond the 3 known-bad rows**: `"Error processing lesson"` appears in exactly 2 live rows; `"Grade Levels:"`-style stamp headers appear in only 9 rows (the 3 known-bad + 6 with legitimate in-body occurrences); `"[Objectives not available]"` in exactly 1.

### 4.3 Repeated-boilerplate probe

```sql
SELECT left(content_text, 60) AS opening, COUNT(*) AS n
FROM lessons WHERE retired_at IS NULL
GROUP BY 1 HAVING COUNT(*) > 1 ORDER BY n DESC LIMIT 10;
```

Top repeated openings (`"May/ June Pre-K - 5th Grade…"` ×4, `"Grade 3k, pk\nSeason Fall…"` ×4, `"K-12th Grade\rFall\nNo Heat\n\n\nHarvest Salsa…"` ×3, …) are all genuine near-duplicate lesson families (e.g. the Harvest Salsa cluster), not injected boilerplate. No template-stamp signature beyond the 3 known-bad rows.

---

## 5. Identical bodies + hash integrity

```sql
SELECT content_hash, COUNT(*) AS n, array_agg(lesson_id) AS lesson_ids, array_agg(title) AS titles
FROM lessons WHERE retired_at IS NULL
GROUP BY content_hash HAVING COUNT(*) > 1 ORDER BY n DESC;
```

| content_hash (prefix) | n | rows |
|---|---|---|
| `238f211fc9915924…` | 3 | the three "Unknown" ghosts — `1lDjv2GUFzOC9pSWTpCVQW2ctWvvNmTPP4Jc1iAzrsaU` (2,442 chars, real Black-Eyed-Pea-Salad body), `1nFbpkwlujk8fIO8RkeIcDoO2fuO83Iil2Srf8t5iqm8` (273), `1l9KH63QBe2xhyH0zp6VIavtj0uKSRZtd` (273) |
| `29d5690810d57e43…` | 2 | the two Fattoush rows `1vDebvrcoPdDcoooLnpF64P3ade4l8ZRqVkfSlEAyYts` + `1YeRlyncgM-gMS-Aica2Fk7wjBsRN9-K6`, both 1,008 chars — the known same-dish dedup case |

**`content_hash` is provably wrong on the ghost trio**: `1lDjv2GUFzOC…` has 2,442 chars of distinct content yet shares the hash of the two 273-char stubs (the known "only cross-hash collision in corpus"). Consequence for the re-tag: **do not use `content_hash` for change-detection or dedup logic in the bulk runner on these rows**; everywhere else hashes are unique per body.

---

## 6. Extraction age (timestamps)

```sql
SELECT date_trunc('month', updated_at)::date AS updated_month, COUNT(*) AS n
FROM lessons WHERE retired_at IS NULL GROUP BY 1 ORDER BY 1;
-- 2025-07: 629 | 2025-08: 43 | 2025-09: 82 | 2026-04: 13
```

`content_text` was extracted at import/approval time: 672 legacy rows in 2025-07/08, 82 submission-era rows ~2025-09, 13 in 2026-04. `updated_at` was NOT bumped by the PR 5 metadata rewrites (2026-06-11), so it is a usable extraction-age proxy. **Bodies are 8–11 months old**; freshness vs. the live Docs is tested in §8. `last_modified` is the source doc's modified time captured at import (range seen in sample: 2020-03 to 2024-09) — it does NOT tell you whether a doc changed after extraction.

---

## 7. file_link inventory

```sql
SELECT
  COUNT(*) FILTER (WHERE file_link LIKE 'https://docs.google.com/document/%') AS gdoc_links,
  COUNT(*) FILTER (WHERE file_link LIKE 'https://drive.google.com/%') AS drive_links,
  COUNT(*) FILTER (WHERE file_link NOT LIKE 'https://docs.google.com/document/%'
                     AND file_link NOT LIKE 'https://drive.google.com/%') AS other_links
FROM lessons WHERE retired_at IS NULL;
-- gdoc_links=761, drive_links=6, other_links=0
```

The 6 `drive.google.com/file/d/...` rows (not directly Doc-API-fetchable; relevant only if a fallback re-extraction is ever needed):
`1l9KH63QBe2xhyH0zp6VIavtj0uKSRZtd` (Unknown ghost, 273), `0B9EfSSxhDrssMll3UUpoandwYWM` (Seed to Table Process, 2,752), `0BzCUl-9h7sgELW96MDR3dkZ3MlE` (Signs of Spring, 3,972), `0BwC8Pf3ZwAXjN04xRGEwcl9Cd0k` (The Summer Garden, 5,429), `0BwC8Pf3ZwAXjMmRRd0xWTUQ0U1U` (Squanto's Ad Agency, 12,512), `0BwC8Pf3ZwAXjNnhsOUZNLVRIUE0` (Aloo Gobi 3rd-5th, 18,871). All but the ghost have healthy bodies.

---

## 8. Staleness spot-check — 5 random Doc-linked rows vs live Google Docs

Sample selection (deterministic, seeded):

```sql
SELECT lesson_id, title, length(content_text) AS len, file_link, last_modified::date,
       left(content_text, 200) AS head,
       substring(content_text FROM GREATEST(length(content_text)/2, 1) FOR 200) AS mid
FROM lessons
WHERE retired_at IS NULL AND file_link LIKE 'https://docs.google.com/document/%'
ORDER BY md5(lesson_id || 'oq5-audit-seed')
LIMIT 5;
```

Each doc fetched via `mcp__google-workspace__get_doc_content` (`user_google_email df@esynyc.org`); head + mid passages of `content_text` compared verbatim against the returned doc text.

| # | lesson_id | title | len | verdict | notes |
|---|---|---|---|---|---|
| 1 | `1-IyPn1ouYMWzgGvWT6Bz9gKD2rk1-8yyaCe8oSa-ew8` | Healthy Eating | 1,861 | **fresh** | Doc title matches; summary line and mid passage ("Engaging activity: Students will work in groups to prepare empanada filling and fill their own empanadas.") match verbatim. content_text carries an extra leading `"8th Grade\nFall\nIndoor"` block (doc header captured at extraction; not in Doc body API output) + trailing ESYNYC copyright footer — both benign. |
| 2 | `1dHaRJiE9FINj3Jud0L_qMrKuFibtDimhZ0f_ssl_VMI` | Colonial Foods of New York | 2,615 | **fresh** | Doc (native, titled "4th Grade Colonial Foods of New York Lesson.docx") matches head ("Students will do a reading about three ways of preserving food in colonial New York…") and mid ("Go over the definition of the world “preserve.”" — shared typo "world" confirms verbatim capture). |
| 3 | `1LO4p1z6TBKdq_ViV9yPH42ZD7_sJhSEU` | The Water Cycle | 3,344 | **fresh** | Office .docx in Drive ("Water as Snow_ 3K-2nd Grades.docx"). Summary + mid passage ("…glue circles on their squares / Add glue and seeds/beans, strings, ribbons, etc.…") match. (The MCP's own .docx extraction shows mid-word space artifacts, e.g. "Stud ents" — artifact of today's fetch path, NOT present in content_text, which is cleaner.) |
| 4 | `1Z8WgKLhGh_MEMnB5NcnFzBN4OpLGal6UTEdyNLCFaLo` | Evergreen Introduction Scavenger Hunt | 3,089 | **fresh** | Head + mid match; content_text tail ends with the doc's literal final worksheet line `👀👋🐰👃` — full-document capture confirmed end-to-end. |
| 5 | `1CE324nZDL2kz_4P5TwDuvoX7Zx_NMwUz` | Leaf Collecting | 3,045 | **fresh** | Office .docx ("PK Leaf Collecting.docx"). Head + mid ("…these leaves are going to be food for worms, and the worms are going to turn it into soil…") match verbatim; modern-template sections (Tags, Garden Connection) present in both. Minor section-ordering differences attributable to extraction method, not content drift. |

**Result: 5/5 fresh.** No drift, no mismatch in the random sample.

### 8.6 Extra (non-sample) check — the thin "Who's Who" row

Fetched `1n8wS0X-dXAw9sfQuLFgsMg_kNvACph3cT4yd9p2i1eg` directly because of its 462-char body. The live Doc contains a **full ~3,300-char lesson** (Objectives, CR, SEL, full Agenda/Class Flow, Materials, worksheet) — yet `content_text` says `"Objectives:\n[Objectives not available]\nThemes: Not specified"`. Doc `last_modified` captured at import was 2023-05-30, i.e. the content predates the 2025-08 extraction — so this is an **import-time extraction failure**, not later doc drift. Verdict: **mismatched (under-extracted); the only real live lesson whose body is materially wrong.**

---

## 9. BODY-SOURCE READINESS STATEMENT

`lessons.content_text` is **ready to serve as the re-tag's single body source for 764 of the 767 live rows**. Coverage is 100% (zero null/empty), the length distribution is a smooth curve with no truncation cliff, there is zero mojibake (no U+FFFD), zero escape/HTML artifacts, and the only control characters are 48 single vertical tabs (Google Docs soft line breaks — strip `chr(11)`, and optionally normalize `\r`, at export for hygiene). A seeded random 5-doc comparison against the live Google Docs came back 5/5 fresh with verbatim passage matches (one capture verified to the doc's literal last line), so the 2025-07/09 extraction has not drifted from the source docs. Three rows must be handled specially (below), one row has a usable body under a broken title, and `content_hash` must not be trusted on the ghost trio. The live corpus is **767 rows, not the planned ~751** — size the work list, cost estimate, and spot-check sample accordingly.

## 10. Fallback recommendation for known-bad rows

| lesson_id | title | problem | recommended handling |
|---|---|---|---|
| `1l9KH63QBe2xhyH0zp6VIavtj0uKSRZtd` | Unknown | 273-char "Error processing lesson" stub; file_link is a Drive file, not a Doc | **EXCLUDE from re-tag** (no body to read). Already a known cleanup candidate (ghost trio); route to the metadata-cleanup track rather than fabricating tags. |
| `1nFbpkwlujk8fIO8RkeIcDoO2fuO83Iil2Srf8t5iqm8` | Unknown | identical 273-char stub | **EXCLUDE from re-tag**; same cleanup routing. |
| `1n8wS0X-dXAw9sfQuLFgsMg_kNvACph3cT4yd9p2i1eg` | Who's Who in the Food System | 462-char under-extraction; live Doc has full ~3,300-char body | **Re-extract from the Doc before (or as part of) the re-tag run** — the content exists and was fetched successfully today; alternatively EXCLUDE + route to manual tagging. Do not re-tag from the current stub. |
| `1lDjv2GUFzOC9pSWTpCVQW2ctWvvNmTPP4Jc1iAzrsaU` | Unknown | broken title + colliding `content_hash`, but body is a real 2,442-char lesson ("African American Foodways: Black-Eyed Pea Salad") | **INCLUDE in re-tag** (body is sound); flag the row to the ghost-trio cleanup for title/hash repair; never key change-detection on its hash. |

Operational notes for the bulk runner: strip `chr(11)` and normalize `\r` at export; expect 95 submission-era bodies with `---` prefix + `[Table]`/pipe table-flattening; do not use `content_hash` for anything on the ghost trio.
