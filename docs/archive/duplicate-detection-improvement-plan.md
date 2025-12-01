# Duplicate Detection Improvement Plan

Last updated: 2025-08-31

## Summary & Goals

Improve duplicate detection accuracy and reviewer signal-to-noise by:
- Raising the bar for semantic matches and applying a combined-score floor
- Using richer metadata overlap across existing array fields
- Normalizing title similarity
- Storing and surfacing only the strongest matches to reviewers
- Tidying remaining exact-hash duplicates via the existing resolution RPC

Success criteria:
- Reduce “low” match noise in submission similarities
- Shift combined-score distribution upward (p50 ≥ ~0.45) without losing real duplicates
- Resolve/justify all remaining exact-hash duplicate groups

## Current Architecture (High-Level)

- Edge function `detect-duplicates`:
  - Exact: `content_hash` (SHA-256 of normalized `content_text`)
  - Semantic: `find_similar_lessons_by_embedding` (pgvector cosine)
  - Fallback (no embedding): title Jaccard + rudimentary metadata overlap
  - Persists to `submission_similarities`; returns top 10 to client
- Submission pipeline `process-submission`:
  - Extracts content, generates embeddings, calls `detect-duplicates`, stores hash + similarities
- Offline analysis:
  - `scripts/analyze-duplicates-v2.ts` (union-find, embeddings, Levenshtein); report in `public/reports`
  - `scripts/analyze-duplicates-v3.ts` (human-centric categorization, canonical scoring, sub-groups)
  - `scripts/auto-resolve-duplicates.ts` (optional exact-duplicate resolver using reports)
- Admin UI:
  - `AdminDuplicates` loads V3/V2 reports; flags resolved groups via `duplicate_resolutions`
  - `AdminDuplicateDetailV3` executes `resolve_duplicate_group` (supports split/keep-all/title edits)
- Database:
  - Functions: `find_lessons_by_hash`, `find_similar_lessons_by_embedding`, `resolve_duplicate_group`, `is_duplicate_lesson`
  - Indexes: ivfflat on `content_embedding`, BTREE on `content_hash` (+ composite)
  - View: `lessons_with_metadata` (granular arrays + extracted JSON arrays; RLS-respecting)

## Live DB Findings (Snapshot)

- Totals: `lessons=815`, `submissions=95`, `submission_similarities=117`, `lesson_archive=13`, `duplicate_resolutions=10`, `canonical_lessons=3`
- Hash health: `content_hash` present for all lessons; no `META_` hashes; `content_embedding` present for all lessons
- Exact duplicates: 13 groups with >1 lesson sharing the same `content_hash`
- Similarity distribution (from `submission_similarities`): `exact=2`, `high=2`, `medium=8`, `low=105`
- Combined-score stats (persisted): `avg≈0.31`, `p50≈0.293`, `p90≈0.354`, `max=1.0`
- Embedding threshold mismatch: DB function default is 0.5; edge `detect-duplicates` calls with 0.3 → floods low-value matches

## Issues Identified

1. Title similarity is simplistic (plain Jaccard, no normalization; weak on near-miss edits)
2. Metadata overlap underuses available signals (only grade/skills; ignores `thematic_categories`, `activity_type`, `cultural_heritage`, `season_timing`, `main_ingredients`, `cooking_methods`)
3. Semantic threshold too low in practice (0.3 via edge), producing many low matches
4. Fallback path (no embedding) samples a small set and does basic scoring → potential misses/noise
5. Reviewer UI surfaces many low matches; no default filtering
6. Limited tests for similarity helpers and combined scoring

## Plan

### Immediate Fixes

1. Raise semantic threshold and add a combined-score floor
   - Call `find_similar_lessons_by_embedding` with `similarity_threshold = 0.5`
   - Compute `combined_score` = weighted mix of `semantic`, `title`, `metadata`
   - Apply `combined_score >= 0.45–0.50` floor before persisting to `submission_similarities`
2. Store top-N only
   - Sort by `combined_score` and insert at most the top 10 per submission
3. Expand metadata overlap
   - Consider and normalize (lowercase, trim) these array fields:
     - `grade_levels`, `thematic_categories`, `activity_type`, `cultural_heritage`, `season_timing`, `main_ingredients`, `cooking_methods`
   - Use per-field Jaccard; form a weighted average metadata score
4. Title normalization & scoring
   - Lowercase, strip punctuation, stopword removal
   - Use a token-based similarity (still fast) for better resilience (e.g., token set ratio, or Jaro–Winkler alternative)

### Reviewer & Admin UX

5. Reviewer surfacing
   - `ReviewDashboard`: fetch `submission_similarities` for each submission; show exact/high/medium by default; hide “low” behind an expander
   - Sort by `combined_score`; show top 3 inline
6. Exact-duplicate cleanup
   - Use `resolve_duplicate_group` to clear remaining hash-identical groups
   - Process:
     - Generate a dry-run list of groups (see SQL below)
     - Resolve automatically where safe (or review in `AdminDuplicateDetailV3`)

### Reliability & Safety

7. Tests
   - Unit: title similarity normalization + scoring; metadata overlap across fields
   - Integration: `detect-duplicates` combined scoring path with mocked RPC responses
8. Observability
   - Log match counts per tier (exact/high/medium/low), top-N persisted, and summary stats (p50/p90 combined-score) to tune thresholds over time
9. Documentation
   - Update README/ops notes with thresholds, field weights, and rollback guidance

## Targets / Acceptance Criteria

- Reduce “low” matches in `submission_similarities` (target: < 25% of persisted rows)
- combined-score distribution improves: `p50 ≥ ~0.45`, `p90 ≥ ~0.60` (calibrated after baseline)
- 0 unresolved exact-hash groups (either resolved or explicitly preserved with rationale)

## Implementation Touchpoints

- `supabase/functions/detect-duplicates/index.ts`
  - Pass `similarity_threshold = 0.5`
  - Expand `calculateMetadataOverlap` to include the arrays listed above (pull from `lessons_with_metadata`)
  - Normalize title inputs; switch similarity function
  - Add `combined_score` floor; cap to top 10
- `src/pages/ReviewDashboard.tsx`
  - Query `submission_similarities` (and join lesson titles as needed)
  - Default-view exact/high/medium only; show “low” via expander
- Admin exacts
  - Use `resolve_duplicate_group` for remaining exact-hash groups; preserve titles via the `p_title_updates` parameter if needed
- Optional (offline)
  - Continue using `scripts/analyze-duplicates-v3.ts` for batch analytics and categorization reports

## SQL Snippets (Reference)

Top exact hash groups (live DB):

```sql
SELECT content_hash, COUNT(*) AS cnt
FROM lessons
WHERE content_hash IS NOT NULL
GROUP BY content_hash
HAVING COUNT(*) > 1
ORDER BY cnt DESC
LIMIT 25;
```

Similarity distribution (persisted):

```sql
SELECT 
  COUNT(*) FILTER (WHERE match_type='exact') AS exact,
  COUNT(*) FILTER (WHERE match_type='high')  AS high,
  COUNT(*) FILTER (WHERE match_type='medium') AS medium,
  COUNT(*) FILTER (WHERE match_type='low')   AS low
FROM submission_similarities;
```

Combined-score distribution:

```sql
SELECT 
  MIN(combined_score) AS min,
  MAX(combined_score) AS max,
  AVG(combined_score) AS avg,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY combined_score) AS p50,
  PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY combined_score) AS p90
FROM submission_similarities
WHERE combined_score IS NOT NULL;
```

## Rollout & Validation

1. Implement Immediate Fixes in a branch → deploy to staging
2. Submit a few representative test docs; record:
   - Match-type distribution
   - Combined-score stats (min/max/avg/p50/p90)
3. Adjust floor/weights (one iteration) to hit targets
4. Roll out to production
5. Resolve exact-hash groups (batched, with audit via `duplicate_resolutions`)
6. Monitor over the next week; re-tune if reviewer noise reappears

## Risks & Mitigations

- Too-aggressive thresholds could miss real near-duplicates
  - Mitigation: start with conservative floor (~0.45) and review metrics; tune incrementally
- Metadata overlap weighting might overfit to certain fields
  - Mitigation: cap individual field influence; favor diversity across signals
- Reviewer workload spikes if many groups are surfaced simultaneously
  - Mitigation: show high/medium by default; batch exact-hash cleanups first

## Open Questions

- Preferred field weights for metadata overlap (equal vs emphasis on `activity_type`/`thematic_categories`)?
- Should we keep a small “gray” zone (e.g., 0.40–0.45) hidden by default but retrievable?
- Any organizational constraints around auto-resolving exacts beyond content identity?

