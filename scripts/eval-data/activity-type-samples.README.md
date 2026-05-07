# activity_type eval-gate samples

`activity-type-samples.json` (built from `activity-type-relabel-worksheet-v2.md` after the user fills it in) is the labeled hold-out for the activity_type prompt eval gate.

## Shape

Each entry conforms to the eval harness's `sampleSchema` (see `scripts/eval-llm-tagging-prompt.ts`):

```json
{ "id": "<submission_id>", "body": "<full extracted_content>", "truth": ["<canonical activity_type>", ...] }
```

`body` is the **full** `lesson_submissions.extracted_content` for the submission row. The harness sends this as the user message, mirroring how `process-submission` will pass submitter-extracted bodies to the prompt at submission time. (The CRF analog uses `lessons.content_text` instead because CRF's source set is the published-lesson corpus, not submissions; activity_type's source set is reviewer-tagged submissions, so submission body is the right surface.)

`truth` is an array of one or more canonical lowercase strings drawn from `src/types/generated/enums.json:activity_type`:

```
["cooking", "garden", "academic", "craft"]
```

Multi-label: a sample may have 1, 2, 3, or rarely 4 truth values. The Zod harness validates that every truth value is in vocabulary.

## How rows were selected

The 113 rows are every submission on TEST DB whose reviewer-supplied `submission_reviews.tagged_metadata.activityType` is non-null. Distribution under the pre-PR-1b 5-value scalar vocab:

| Old reviewer label | Count |
|---|---|
| `garden` | 67 |
| `cooking` | 33 |
| `academic` | 11 |
| `both` | 2 |
| `craft` | 0 |

All 113 rows are scalar (`jsonb_typeof = 'string'`); no fresh array-shape reviewer saves have landed since PR 1b shipped 2026-05-07.

The `craft` value did not exist in the reviewer's vocabulary when these were tagged (5-value vocab was `cooking / garden / both / academic / craft`, but the original v3 vocab pre-D2 only had `cooking / garden / both / academic`). Worksheet v1 (deprecated) tried to triage 26 craft-suspect candidates against the 5-value single-label vocab; v2 takes the simpler approach of relabeling all 113 against the post-PR-1b 4-value multi-label vocab.

## Eval-gate caveat — `craft` may have zero truth labels

If the user's relabeling produces zero `craft` rows in the 113 set, per-value craft recall is undefined (TP+FN=0). The harness applies a `maxPredictionRateForAbsentValues` ceiling instead — fails the gate if the LLM predicts craft on more than 10% of samples. See `activity-type-thresholds.json`.

If the user labels some samples as `craft`, regular precision/recall apply and the absent-values ceiling is dormant for that value. The threshold mechanism is deliberately general (any vocabulary value with truth_count = 0 in a given sample set) so it carries forward to future runs.

## Order

Rows are sorted by `extracted_title NULLS LAST, id` for determinism. `--limit N` slices alphabetically; not a stratified subsample.

## Regeneration SQL (run via `mcp__supabase-test__execute_sql` or psql against TEST DB)

```sql
SELECT
  ls.id::text AS submission_id,
  ls.extracted_title AS title,
  sr.tagged_metadata->>'activityType' AS old_label,
  ls.extracted_content AS body
FROM submission_reviews sr
JOIN lesson_submissions ls ON ls.id = sr.submission_id
WHERE sr.tagged_metadata ? 'activityType'
  AND sr.tagged_metadata->'activityType' IS NOT NULL
  AND sr.tagged_metadata->>'activityType' <> ''
ORDER BY ls.extracted_title NULLS LAST, ls.id;
```

The worksheet build chunked this query into 4 batches of 25-30 rows with summary + agenda window extracts (350 + 500 chars) for compactness; the full-body version above is what the samples.json will use.

## What's NOT in the worksheet

- **No reviewer-pre-distilled "synopsis" line.** v1 had a `Distilled:` line per row pre-written by Claude. v2 omits — instead exposes the body's Summary + Agenda excerpts via `<details>` blocks. Less Claude-side judgment baked in; more reviewer-side reasoning grounded in the actual lesson body.
- **No stratified ordering.** Alphabetic by title; the 113 rows are small enough that stratification across activity types isn't load-bearing for batch processing.
- **No held-out slice for inference-without-CR-cell testing.** activity_type's signal source is the agenda, which is present in 100% of submissions; the held-out concern that motivated CRF's deferred slice doesn't apply here.

## Usage

```bash
npx tsx scripts/eval-llm-tagging-prompt.ts \
  --prompt supabase/functions/process-submission/prompts/activity-type.md \
  --samples scripts/eval-data/activity-type-samples.json \
  --vocab scripts/eval-data/activity-type-vocab.json \
  --threshold-config scripts/eval-data/activity-type-thresholds.json \
  --output /tmp/activity-type-eval-result.json
```

To route through CLIProxyAPI (Claude Max extra-usage billing) instead of Console API, append:

```bash
  --base-url http://127.0.0.1:8317/api/provider/anthropic
```

Note the `cache_read=0` cost gotcha (see MEMORY.md): proxy adds ~3-4× per-call cost vs direct Console API. Per-prompt canonical run on 113 samples: ~$30 via proxy, ~$7 direct.
