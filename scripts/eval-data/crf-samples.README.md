# CRF eval-gate samples

`crf-samples.json` is the labeled hold-out for the cultural-responsiveness-features (CRF) prompt eval gate.

## Shape

Each entry conforms to the eval harness's `sampleSchema` (see `scripts/eval-llm-tagging-prompt.ts`):

```json
{ "id": "<lesson_id>", "body": "<full content_text>", "truth": ["<canonical feature>", ...] }
```

`body` is the **full** `lessons.content_text` — mirrors how `process-submission` will pass lesson bodies to the prompt at submission time.

Truth labels are the verbatim canonical Title-Case strings from `src/types/generated/enums.json:cultural_responsiveness_features` (7 features).

## How rows were selected (Session 23)

The 353 rows are the "clean" subset of the corpus where every feature in `lessons.cultural_responsiveness_features` ALSO appears (case-insensitive substring) in the body's Cultural-Responsiveness cell. This filter automatically excludes rows where the column was augmented by the v3 GPT-4.1 batch tagging beyond what the body actually says.

Distribution across feature counts: **n=1→90, n=2→68, n=3→83, n≥4→112** (4=59, 5=18, 6=6, 7=29).

Per-feature row counts (sum > 353 because rows can have multiple features):

| Feature | Count | Coverage |
|---|---|---|
| Reshapes curriculum | 218 | 62% |
| Communicates high expectations | 212 | 60% |
| Promotes student-centered instruction | 172 | 49% |
| Encourages learning within the context of culture | 139 | 39% |
| Incorporates different individual and cultural learning styles | 139 | 39% |
| Positions teacher as facilitator | 112 | 32% |
| Promotes positive perspectives on parents and families | 48 | 14% |

All 7 features have ≥48 rows of support, so per-feature precision/recall is meaningful.

## Order

Rows are sorted by `lesson_id` for determinism. **There is no stratified ordering** — `--limit N` slices the alphabetic prefix, not a stratified sample. If a stratified subsample is needed in the future, regenerate with stratified ordering.

## Regeneration SQL (run via `mcp__supabase-test__execute_sql` or psql against TEST DB)

```sql
WITH crf_lessons AS (
  SELECT
    lesson_id,
    cultural_responsiveness_features AS truth_features,
    content_text,
    substring(
      content_text
      FROM position('cultural responsiveness' IN lower(content_text))
      FOR 600
    ) AS cr_cell_window
  FROM lessons
  WHERE cultural_responsiveness_features IS NOT NULL
    AND array_length(cultural_responsiveness_features, 1) >= 1
    AND content_text IS NOT NULL
    AND lower(content_text) LIKE '%cultural responsiveness%'
),
clean AS (
  SELECT lesson_id, truth_features, content_text
  FROM crf_lessons
  WHERE NOT EXISTS (
    SELECT 1
    FROM unnest(truth_features) AS f(feature_name)
    WHERE position(lower(f.feature_name) IN lower(cr_cell_window)) = 0
  )
)
SELECT lesson_id AS id, content_text AS body, truth_features AS truth
FROM clean
ORDER BY lesson_id;
```

## What's NOT in v1

- **Stamp-stripped held-out slice.** Session 23 contemplated setting aside ~20 rows with the CR cell scrubbed (header retained, value emptied) to test pure body-inference. Deferred to v2 — extraction quality on the 333+ rows with cells intact is the primary gate; inference fallback is informational and can be added if reviewers want signal beyond bulk extraction.
- **Stratification across feature counts / features.** The file order is alphabetic; `--limit` is not a stratified subsample.

## Usage

```bash
npx tsx scripts/eval-llm-tagging-prompt.ts \
  --prompt supabase/functions/process-submission/prompts/cultural-responsiveness-features.md \
  --samples scripts/eval-data/crf-samples.json \
  --vocab scripts/eval-data/crf-vocab.json \
  --threshold-config scripts/eval-data/crf-thresholds.json \
  --output /tmp/crf-eval-result.json
```
