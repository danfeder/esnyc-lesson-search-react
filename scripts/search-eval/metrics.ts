/**
 * Cluster-aware ranking-metric module for the search eval harness (S0, upgraded
 * scoring model).
 *
 * These are RANKING metrics (rank / k / reciprocal-rank / set-overlap), computed
 * per query against a human-confirmed, two-tier, CLUSTER-aware gold set. This is
 * deliberately NOT a reuse of scripts/lib/evalMetrics.ts — that module computes
 * multi-label CLASSIFICATION metrics (precision/recall/F1 over a vocabulary) and
 * has no concept of rank or k, so it cannot express any of the functions below.
 *
 * Gold model: each gold entry is a CLUSTER (string[]) of equivalent lesson_ids —
 * exact-duplicate twins collapse into one cluster, and *either* twin satisfies
 * it. This prevents duplicate-flooding from inflating recall and prevents future
 * de-dup from breaking the gold. A `string[][]` is a list of such clusters; a
 * singleton `[id]` is the normal (non-twin) case and behaves like a flat id.
 * Gold is two-tier: `primaryClusters` (bullseye; counted) vs the wider
 * relevant pool (primary ∪ acceptable) used for precision.
 *
 * Every function is PURE (no IO, no side effects) and must NEVER throw — every
 * degenerate input returns the documented sentinel value instead. All ids are
 * lesson_id strings (uuid) compared by exact string equality.
 */

/**
 * Build a flat membership Set from a list of clusters. An id is "in a cluster
 * set" iff any cluster contains it.
 */
function membersOf(clusters: string[][]): Set<string> {
  const set = new Set<string>();
  for (const cluster of clusters) {
    for (const id of cluster) set.add(id);
  }
  return set;
}

/**
 * recall@k — cluster-aware. The fraction of gold CLUSTERS that have at least one
 * member among the first `k` entries of `topIds`.
 *
 *   = (# clusters with >=1 id among topIds[0..k-1]) / goldClusters.length
 *
 * A cluster counts AT MOST once, so duplicate result ids and twin members of the
 * same cluster cannot inflate the count. Generalizes the former flat-id
 * hitRateAtK: with singleton clusters it reproduces the old behavior exactly.
 *
 * Range [0, 1]. Edge cases:
 *   - goldClusters empty       -> NaN  (caller treats as N/A; never throws)
 *   - k <= 0                   -> 0
 *   - topIds shorter than k    -> uses all available entries
 */
export function recallAtK(topIds: string[], goldClusters: string[][], k: number): number {
  if (goldClusters.length === 0) return NaN;
  if (k <= 0) return 0;

  const topK = new Set(topIds.slice(0, k));

  let hit = 0;
  for (const cluster of goldClusters) {
    if (cluster.some((id) => topK.has(id))) hit += 1;
  }

  return hit / goldClusters.length;
}

/**
 * precision@k — dedup-aware. The number of DISTINCT relevant clusters
 * represented among the first `k` entries of `topIds`, divided by `k`.
 *
 *   = (# distinct relevant clusters in topIds[0..k-1]) / k
 *
 * Two twins of the SAME relevant cluster in the top-k count as ONE, so duplicate
 * flooding cannot inflate precision. The denominator is always `k` (not the
 * number of results), matching the standard precision@k definition.
 *
 * `relevantClusters` is the union of primary and acceptable clusters.
 *
 * Edge cases:
 *   - k <= 0                   -> 0
 *   - relevantClusters empty   -> 0
 *   - topIds shorter than k    -> still divides by k
 */
export function precisionAtK(topIds: string[], relevantClusters: string[][], k: number): number {
  if (k <= 0) return 0;
  if (relevantClusters.length === 0) return 0;

  const topK = new Set(topIds.slice(0, k));

  let distinct = 0;
  for (const cluster of relevantClusters) {
    if (cluster.some((id) => topK.has(id))) distinct += 1;
  }

  return distinct / k;
}

/**
 * top-1-relevant — whether the very first result belongs to a primary cluster.
 *
 *   = topIds.length > 0 && topIds[0] is a member of some primary cluster
 *
 * Catches the "irrelevant #1" failure mode that recall@k can mask. A twin member
 * of a primary cluster at rank 1 counts. Empty results -> false; empty
 * primaryClusters -> false.
 */
export function top1Relevant(topIds: string[], primaryClusters: string[][]): boolean {
  if (topIds.length === 0 || primaryClusters.length === 0) return false;
  return membersOf(primaryClusters).has(topIds[0]);
}

/**
 * Per-query reciprocal rank: the reciprocal of the 1-based rank of the FIRST
 * result id that belongs to a primary cluster; 0 if none is found.
 *
 *   for the first index i where topIds[i] is in some primary cluster: 1 / (i + 1)
 *   else: 0
 *
 * A twin member of a primary cluster counts. NOTE: this is the per-QUERY
 * reciprocal rank; the harness mean-aggregates it across queries to obtain the
 * corpus-level MRR (Mean Reciprocal Rank); this function does not aggregate.
 *
 * Empty results -> 0; empty primaryClusters -> 0.
 */
export function mrr(topIds: string[], primaryClusters: string[][]): number {
  if (topIds.length === 0 || primaryClusters.length === 0) return 0;

  const primary = membersOf(primaryClusters);
  for (let i = 0; i < topIds.length; i++) {
    if (primary.has(topIds[i])) return 1 / (i + 1);
  }
  return 0;
}

/**
 * duplicate-flood count — among the first `k` entries of `topIds`, the count of
 * slots whose content cluster (per `clusterKeyOf`) was ALREADY seen earlier in
 * the top-k. The first occurrence of each content cluster is NOT counted; every
 * 2nd+ copy IS. A UX alarm for the same content flooding the top results.
 *
 *   e.g. 3 copies of one content cluster in top-k -> count 2.
 *
 * `clusterKeyOf` maps an id to its content-hash key (supplied by the harness);
 * two distinct ids that share a content cluster therefore collide and the later
 * one is counted as a flood.
 *
 * Edge cases:
 *   - k <= 0                   -> 0
 *   - topIds shorter than k    -> uses all available entries
 */
export function duplicateFloodCount(
  topIds: string[],
  k: number,
  clusterKeyOf: (id: string) => string,
): number {
  if (k <= 0) return 0;

  const seen = new Set<string>();
  let floods = 0;
  for (const id of topIds.slice(0, k)) {
    const key = clusterKeyOf(id);
    if (seen.has(key)) floods += 1;
    else seen.add(key);
  }
  return floods;
}

/**
 * isolation-hits@k — the number of DISTINCT `isolationIds` that appear among the
 * first `k` entries of `topIds`. Used for G3 (typed-field indexing) where the
 * isolation set is the tag-but-no-lexical-mention lessons that can only move once
 * the typed array is indexed; the harness runs this at k=50.
 *
 * A repeated isolation id in the top-k counts once. Edge cases:
 *   - k <= 0                   -> 0
 *   - topIds shorter than k    -> uses all available entries
 */
export function isolationHitsAtK(topIds: string[], isolationIds: string[], k: number): number {
  if (k <= 0) return 0;

  const isoSet = new Set(isolationIds);
  const hits = new Set<string>();
  for (const id of topIds.slice(0, k)) {
    if (isoSet.has(id)) hits.add(id);
  }
  return hits.size;
}

/**
 * first-rank-of — the 1-based rank of the first `topIds` entry that is in
 * `targetIds`, or `null` if none is present (rank = index + 1).
 *
 * Used for the G3 first-isolation rank/MRR. Empty results or empty targets ->
 * null.
 */
export function firstRankOf(topIds: string[], targetIds: string[]): number | null {
  const targetSet = new Set(targetIds);
  for (let i = 0; i < topIds.length; i++) {
    if (targetSet.has(topIds[i])) return i + 1;
  }
  return null;
}

/**
 * ranks-of — for each id in `targetIds` (in input order), its 1-based rank in
 * `topIds`, or `null` if absent. The first occurrence of an id in `topIds`
 * determines its rank. Used for median/best rank-movement across baseline→after
 * runs (G3).
 *
 * Output length always equals `targetIds.length`; empty targets -> [].
 */
export function ranksOf(topIds: string[], targetIds: string[]): (number | null)[] {
  // Precompute first-occurrence rank for each id for O(n + m) behavior.
  const rankByid = new Map<string, number>();
  for (let i = 0; i < topIds.length; i++) {
    if (!rankByid.has(topIds[i])) rankByid.set(topIds[i], i + 1);
  }
  return targetIds.map((id) => rankByid.get(id) ?? null);
}

/**
 * jaccard — set-overlap similarity of two id lists using set semantics (inputs
 * are deduped first).
 *
 *   = |A ∩ B| / |A ∪ B|
 *
 * Used for the q22 stability sentinel (top-10 vs a stored snapshot). When the
 * union is empty (both inputs empty) -> 1 (two empty sets are identical).
 */
export function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);

  const union = new Set<string>(setA);
  for (const id of setB) union.add(id);
  if (union.size === 0) return 1;

  let intersection = 0;
  for (const id of setA) {
    if (setB.has(id)) intersection += 1;
  }

  return intersection / union.size;
}

/**
 * over-broad flag — whether a query returned more than `threshold` of the
 * corpus (a guard against the broadening this package is fixing). UNCHANGED.
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
