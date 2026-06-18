/**
 * Fresh ranking-metric module for the search eval harness (S0).
 *
 * These are RANKING metrics (rank / k / reciprocal-rank), computed per query
 * against a human-confirmed gold `lesson_id` set. This is deliberately NOT a
 * reuse of scripts/lib/evalMetrics.ts — that module computes multi-label
 * CLASSIFICATION metrics (precision/recall/F1 over a vocabulary) and has no
 * concept of rank or k, so it cannot express any of the functions below.
 *
 * Every function is PURE (no IO, no side effects) and must NEVER throw — every
 * degenerate input returns the documented sentinel value instead. All ids are
 * lesson_id strings (uuid) compared by exact string equality.
 */

/**
 * recall@k — the fraction of DISTINCT gold ids that appear among the first `k`
 * entries of `resultIds`.
 *
 *   = (distinct goldIds present in resultIds[0..k-1]) / goldIds.length
 *
 * Range [0, 1]. Edge cases:
 *   - goldIds empty            -> NaN  (caller treats as N/A; never throws)
 *   - k <= 0                   -> 0
 *   - resultIds shorter than k -> uses all available entries
 *   - duplicate RESULT ids are deduped so a repeated id cannot inflate the count
 *
 * The denominator is `goldIds.length` per spec (the raw count); the numerator
 * counts DISTINCT gold ids matched, so a result-side duplicate is harmless.
 */
export function hitRateAtK(resultIds: string[], goldIds: string[], k: number): number {
  if (goldIds.length === 0) return NaN;
  if (k <= 0) return 0;

  const goldSet = new Set(goldIds);
  const topK = resultIds.slice(0, k);

  const distinctHits = new Set<string>();
  for (const id of topK) {
    if (goldSet.has(id)) distinctHits.add(id);
  }

  return distinctHits.size / goldIds.length;
}

/**
 * top-1-relevant — whether the very first result is in the gold set.
 *
 *   = resultIds.length > 0 && goldIds.includes(resultIds[0])
 *
 * Catches the "irrelevant #1" failure mode that hit-rate@k can mask.
 * Empty results -> false; empty gold -> false.
 */
export function top1Relevant(resultIds: string[], goldIds: string[]): boolean {
  if (resultIds.length === 0 || goldIds.length === 0) return false;
  return goldIds.includes(resultIds[0]);
}

/**
 * Per-query reciprocal rank: the reciprocal of the 1-based rank of the FIRST
 * result id that is in the gold set; 0 if none is found.
 *
 *   for the first index i where goldIds.includes(resultIds[i]): 1 / (i + 1)
 *   else: 0
 *
 * NOTE: this is the per-QUERY reciprocal rank. The harness mean-aggregates this
 * value across all queries to obtain the corpus-level MRR (Mean Reciprocal
 * Rank); this function intentionally does not do that aggregation.
 *
 * Empty results -> 0; empty gold -> 0.
 */
export function mrr(resultIds: string[], goldIds: string[]): number {
  if (resultIds.length === 0 || goldIds.length === 0) return 0;

  const goldSet = new Set(goldIds);
  for (let i = 0; i < resultIds.length; i++) {
    if (goldSet.has(resultIds[i])) return 1 / (i + 1);
  }
  return 0;
}

/**
 * over-broad flag — whether a query returned more than `threshold` of the
 * corpus (a guard against the broadening this package is fixing).
 *
 *   = corpusSize > 0 && (totalCount / corpusSize) > threshold   (STRICT >)
 *
 * `threshold` is a fraction in (0, 1] (e.g. 0.5 = "returns more than 50% of the
 * corpus"). Exactly-at-threshold is NOT over-broad. corpusSize <= 0 -> false.
 */
export function overBroad(totalCount: number, corpusSize: number, threshold: number): boolean {
  if (corpusSize <= 0) return false;
  return totalCount / corpusSize > threshold;
}
