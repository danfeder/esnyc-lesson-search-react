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

The 113 rows are every submission on TEST DB whose reviewer-supplied `submission_reviews.tagged_metadata.activityType` is non-null. Distribution under the pre-PR-1b 5-value scalar vocab vs. post-relabel multi-label distribution:

| Value | Pre-relabel old vocab (single-label) | Post-relabel new vocab (multi-label, count truth-occurrences) |
|---|---|---|
| `garden` | 67 | 68 |
| `cooking` | 33 | 34 |
| `academic` | 11 | 11 |
| `craft` | 0 | 13 |
| `both` | 2 | (retired; expressed as `cooking, garden`) |

12 of 113 rows (10.6%) carry 2+ labels in the post-relabel set; the rest are single-label. Total truth occurrences: 126. Total body chars: 652,580 (avg 5,775; min 2,662; max 16,941).

All 113 rows are scalar (`jsonb_typeof = 'string'`) in the TEST DB tagged_metadata column; no fresh array-shape reviewer saves have landed since PR 1b shipped 2026-05-07.

The `craft` value did not exist in the reviewer's vocabulary when these were tagged (5-value vocab was `cooking / garden / both / academic / craft`, but the original v3 vocab pre-D2 only had `cooking / garden / both / academic`). Worksheet v1 (deprecated) tried to triage 26 craft-suspect candidates against the 5-value single-label vocab; v2 takes the simpler approach of relabeling all 113 against the post-PR-1b 4-value multi-label vocab.

## Eval-gate guardrails — actual state after relabeling

`craft` ended up with 13 truth labels (not zero), so per-value craft precision/recall applies normally. The `maxPredictionRateForAbsentValues=0.10` guardrail in `activity-type-thresholds.json` is **dormant** for craft on this sample set (it only fires when a vocab value has `truthCount === 0`).

The guardrail is deliberately general — any future eval run where a vocab value has zero truth labels will trigger it (e.g., a tags eval where neither `orientation` nor `bilingual_handouts` shows up in the user's labeling). The mechanism carries forward unchanged.

The remaining active thresholds for the canonical run:
- `macroF1 >= 0.7` (CRF reference cleared at 0.937)
- `minRecallPerValue >= 0.5` (per-value floor — the most likely failure path is craft if the prompt over-predicts; secondary risk is academic at truth count 11, where a few misses move the needle).

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

The worksheet build chunked the same row set into 4 batches of 25-30 rows with summary + agenda window extracts (350 + 500 chars) for compactness; the full-body version above is what samples.json uses.

## How samples.json was built

After the user fills in worksheet labels, samples.json is regenerated via:

```bash
# 1. Pull full bodies from TEST DB (write to a tmp JSON, format: [{ id, body }])
# Run via mcp__supabase-test__execute_sql with the regeneration SQL above
# (without the title + old_label columns), then save the result rows to
# /tmp/activity-type-bodies.json. The 113-row payload is ~700KB and exceeds
# the inline MCP cap; the persisted-output file path is returned in the
# error message — extract the bodies array from the JSON-wrapped result.

# 2. Run the build script — merges worksheet labels with bodies dump
npx tsx scripts/build-activity-type-samples.ts \
  --worksheet scripts/eval-data/activity-type-relabel-worksheet-v2.md \
  --bodies    /tmp/activity-type-bodies.json \
  --vocab     scripts/eval-data/activity-type-vocab.json \
  --output    scripts/eval-data/activity-type-samples.json
```

The build script validates: every worksheet ID has a body in the bodies dump; every truth label is in vocab; no entry has an empty/missing label line. Exit 0 on success; exit 1 + per-error report on validation failure.

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
