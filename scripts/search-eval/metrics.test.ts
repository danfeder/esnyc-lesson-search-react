/**
 * Unit tests for the cluster-aware ranking-metric module used by the search
 * eval harness (S0, upgraded scoring model). These are RANKING metrics (rank /
 * k / reciprocal-rank / set-overlap), NOT the multi-label classification
 * metrics in scripts/lib/evalMetrics.ts — that module has no rank/k concept and
 * is deliberately NOT reused here.
 *
 * Gold is two-tier and CLUSTER-aware: each gold entry is a cluster (string[]) of
 * equivalent lesson_ids (exact-duplicate twins → one cluster; either twin
 * satisfies it). `string[][]` is a list of such clusters; a singleton `[id]` is
 * the normal (non-twin) case and behaves like the old flat-id model.
 *
 * All ids are lesson_id strings (uuid). Every function is PURE and must NEVER
 * throw — degenerate inputs (empty gold, empty results, k<=0, corpus<=0) return
 * the documented sentinel value instead.
 */
import { describe, expect, it } from 'vitest';

import {
  duplicateFloodCount,
  firstRankOf,
  isolationHitsAtK,
  jaccard,
  mrr,
  overBroad,
  precisionAtK,
  rankMovement,
  ranksOf,
  recallAtK,
  top1Relevant,
} from './metrics';

// ---------------------------------------------------------------------------
// recallAtK — cluster-aware recall@k (generalizes the old hitRateAtK)
// ---------------------------------------------------------------------------

describe('recallAtK — cluster-aware recall@k', () => {
  it('counts clusters with >=1 id found among the first k results', () => {
    // gold cluster 'c' is at index 3 (outside k=3), so only cluster 'b' of the
    // 4 gold clusters appears in the first 3 results -> 1/4 = 0.25
    const results = ['a', 'b', 'x', 'c'];
    const gold = [['b'], ['c'], ['d'], ['e']];
    expect(recallAtK(results, gold, 3)).toBeCloseTo(1 / 4, 10);
  });

  it('returns 1 when every gold cluster is represented in the first k results', () => {
    expect(recallAtK(['g1', 'g2', 'z'], [['g1'], ['g2']], 3)).toBeCloseTo(1, 10);
  });

  it('returns 0 when no gold cluster is in the first k results', () => {
    expect(recallAtK(['x', 'y', 'z'], [['a'], ['b']], 3)).toBe(0);
  });

  it('only considers the FIRST k entries (a gold id past k does not count)', () => {
    expect(recallAtK(['a', 'b', 'x', 'c'], [['c']], 3)).toBe(0);
    expect(recallAtK(['a', 'b', 'x', 'c'], [['c']], 4)).toBeCloseTo(1, 10);
  });

  it('returns NaN when goldClusters is empty (caller treats as N/A)', () => {
    expect(recallAtK(['a', 'b'], [], 10)).toBeNaN();
  });

  it('does not throw on empty goldClusters', () => {
    expect(() => recallAtK(['a'], [], 5)).not.toThrow();
  });

  it('returns 0 when k <= 0', () => {
    expect(recallAtK(['a', 'b'], [['a']], 0)).toBe(0);
    expect(recallAtK(['a', 'b'], [['a']], -3)).toBe(0);
  });

  it('uses all available entries when results are shorter than k', () => {
    expect(recallAtK(['a', 'b'], [['a'], ['b']], 10)).toBeCloseTo(1, 10);
  });

  it('returns 0 when results are empty (gold non-empty)', () => {
    expect(recallAtK([], [['a'], ['b']], 10)).toBe(0);
  });

  // --- singleton equivalence: behaves like the old flat hitRateAtK ---
  it('singleton clusters behave like the old flat hitRateAtK', () => {
    // old: hitRateAtK(['a','b','x','c'], ['b','c','d','e'], 3) === 1/4
    expect(recallAtK(['a', 'b', 'x', 'c'], [['b'], ['c'], ['d'], ['e']], 3)).toBeCloseTo(
      1 / 4,
      10,
    );
  });

  // --- twin equivalence: either twin satisfies its cluster, counted once ---
  it('counts a twin-bearing cluster exactly once even if both twins are in top-k', () => {
    // cluster ['a1','a2'] are content twins; both appear in top-k. Two gold
    // clusters total -> the twin cluster + the 'b' cluster -> 2/2 = 1, NOT >1.
    expect(recallAtK(['a1', 'a2', 'b'], [['a1', 'a2'], ['b']], 3)).toBeCloseTo(1, 10);
  });

  it('a single satisfied twin satisfies its whole cluster', () => {
    // only 'a2' present (not 'a1'); the cluster is still satisfied.
    // 1 of 2 clusters satisfied -> 0.5
    expect(recallAtK(['a2', 'z'], [['a1', 'a2'], ['b']], 2)).toBeCloseTo(0.5, 10);
  });

  it('does not let a duplicated result id inflate the count', () => {
    // 'a' appears 3x in the first k; its cluster counts ONCE. 1 of 2 clusters
    // satisfied -> 0.5, never 1.
    expect(recallAtK(['a', 'a', 'a'], [['a'], ['b']], 3)).toBeCloseTo(0.5, 10);
  });
});

// ---------------------------------------------------------------------------
// precisionAtK — distinct relevant clusters in top-k / k (dedup-aware)
// ---------------------------------------------------------------------------

describe('precisionAtK — distinct relevant clusters / k', () => {
  it('counts DISTINCT relevant clusters among the first k over k', () => {
    // top-3 = a,b,x ; relevant clusters [a],[b] -> 2 distinct relevant / 3
    expect(precisionAtK(['a', 'b', 'x'], [['a'], ['b']], 3)).toBeCloseTo(2 / 3, 10);
  });

  it('dedup-aware: two twins of ONE relevant cluster in top-k count as 1, not 2', () => {
    // top-3 = a1,a2,x ; a1 and a2 are twins of the SAME relevant cluster.
    // distinct relevant clusters = 1 -> 1/3, not 2/3.
    expect(precisionAtK(['a1', 'a2', 'x'], [['a1', 'a2']], 3)).toBeCloseTo(1 / 3, 10);
  });

  it('denominator is k even when results are shorter than k', () => {
    // only 'a' present, relevant; k=10 -> 1/10
    expect(precisionAtK(['a'], [['a']], 10)).toBeCloseTo(1 / 10, 10);
  });

  it('returns 1 when all k slots are distinct relevant clusters', () => {
    expect(precisionAtK(['a', 'b', 'c'], [['a'], ['b'], ['c']], 3)).toBeCloseTo(1, 10);
  });

  it('returns 0 when none of the top-k are relevant', () => {
    expect(precisionAtK(['x', 'y', 'z'], [['a'], ['b']], 3)).toBe(0);
  });

  it('only considers the first k entries', () => {
    // 'b' is relevant but sits at index 3 (outside k=3) -> only 'a' counts -> 1/3
    expect(precisionAtK(['a', 'x', 'y', 'b'], [['a'], ['b']], 3)).toBeCloseTo(1 / 3, 10);
  });

  it('returns 0 when k <= 0', () => {
    expect(precisionAtK(['a', 'b'], [['a']], 0)).toBe(0);
    expect(precisionAtK(['a', 'b'], [['a']], -2)).toBe(0);
  });

  it('returns 0 when relevantClusters is empty', () => {
    expect(precisionAtK(['a', 'b'], [], 3)).toBe(0);
  });

  it('does not throw on empty inputs', () => {
    expect(() => precisionAtK([], [], 0)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// top1Relevant — result #1 belongs to a primary cluster
// ---------------------------------------------------------------------------

describe('top1Relevant', () => {
  it('is true when the first result is in a primary cluster', () => {
    expect(top1Relevant(['a', 'b', 'c'], [['a'], ['z']])).toBe(true);
  });

  it('is true when the first result is a TWIN in a primary cluster', () => {
    // 'a2' is a twin member of the primary cluster ['a1','a2']
    expect(top1Relevant(['a2', 'b'], [['a1', 'a2']])).toBe(true);
  });

  it('is false when the first result is NOT in a primary cluster (even if later ones are)', () => {
    expect(top1Relevant(['x', 'a', 'b'], [['a'], ['b']])).toBe(false);
  });

  it('is false on empty results', () => {
    expect(top1Relevant([], [['a']])).toBe(false);
  });

  it('is false on empty primaryClusters', () => {
    expect(top1Relevant(['a'], [])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// mrr — reciprocal rank of the first primary-cluster hit
// ---------------------------------------------------------------------------

describe('mrr — per-query reciprocal rank vs primary clusters', () => {
  it('is 1.0 when the first primary hit is at position 1', () => {
    expect(mrr(['a', 'b', 'c'], [['a']])).toBeCloseTo(1, 10);
  });

  it('is 0.5 when the first primary hit is at position 2', () => {
    expect(mrr(['x', 'a', 'b'], [['a']])).toBeCloseTo(0.5, 10);
  });

  it('is 1/3 when the first primary hit is at position 3', () => {
    expect(mrr(['x', 'y', 'a'], [['a']])).toBeCloseTo(1 / 3, 10);
  });

  it('uses the FIRST primary hit when multiple primary clusters are present', () => {
    // 'a' at index 1 (rank 2), 'b' at index 2 (rank 3); first hit is rank 2.
    expect(mrr(['x', 'a', 'b'], [['a'], ['b']])).toBeCloseTo(0.5, 10);
  });

  it('treats a TWIN at rank 1 as a primary-cluster hit (1.0)', () => {
    expect(mrr(['a2', 'x'], [['a1', 'a2']])).toBeCloseTo(1, 10);
  });

  it('is 0 when no primary id is found', () => {
    expect(mrr(['x', 'y', 'z'], [['a'], ['b']])).toBe(0);
  });

  it('is 0 on empty results', () => {
    expect(mrr([], [['a']])).toBe(0);
  });

  it('is 0 on empty primaryClusters', () => {
    expect(mrr(['a'], [])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// duplicateFloodCount — count of 2nd+ copies of any content cluster in top-k
// ---------------------------------------------------------------------------

describe('duplicateFloodCount', () => {
  // identity key: each id is its own content cluster
  const identity = (id: string) => id;

  it('returns 0 when every top-k slot is a distinct content cluster', () => {
    expect(duplicateFloodCount(['a', 'b', 'c'], 3, identity)).toBe(0);
  });

  it('counts the 2nd+ copies of one content cluster (3 copies -> 2)', () => {
    // a,a,a in top-k: first 'a' is the first occurrence; the 2nd and 3rd are
    // floods -> count 2.
    expect(duplicateFloodCount(['a', 'a', 'a'], 3, identity)).toBe(2);
  });

  it('uses clusterKeyOf so different ids of the SAME content cluster flood', () => {
    // a1 and a2 map to the same content-hash key 'A'; b is its own key.
    const keyOf = (id: string) => (id === 'a1' || id === 'a2' ? 'A' : id);
    // top-3 = a1,a2,b -> a2 is a 2nd copy of cluster 'A' -> count 1.
    expect(duplicateFloodCount(['a1', 'a2', 'b'], 3, keyOf)).toBe(1);
  });

  it('only considers the first k slots', () => {
    // the duplicate 'a' sits at index 3 (outside k=3) -> no flood within k.
    expect(duplicateFloodCount(['a', 'b', 'c', 'a'], 3, identity)).toBe(0);
    // widen k to include it -> 1 flood.
    expect(duplicateFloodCount(['a', 'b', 'c', 'a'], 4, identity)).toBe(1);
  });

  it('returns 0 when k <= 0', () => {
    expect(duplicateFloodCount(['a', 'a'], 0, identity)).toBe(0);
    expect(duplicateFloodCount(['a', 'a'], -1, identity)).toBe(0);
  });

  it('does not throw on empty results', () => {
    expect(() => duplicateFloodCount([], 5, identity)).not.toThrow();
    expect(duplicateFloodCount([], 5, identity)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// isolationHitsAtK — # distinct isolation lessons in top-k (G3)
// ---------------------------------------------------------------------------

describe('isolationHitsAtK', () => {
  it('counts distinct isolation ids appearing in the first k', () => {
    const top = ['x', 'iso1', 'y', 'iso2'];
    expect(isolationHitsAtK(top, ['iso1', 'iso2', 'iso3'], 50)).toBe(2);
  });

  it('does not count isolation ids that fall beyond k (k=50 boundary)', () => {
    // Build 60 results: iso ids at positions 10 (within 50) and 55 (beyond 50).
    const top = Array.from({ length: 60 }, (_, i) => {
      if (i === 10) return 'isoEarly';
      if (i === 55) return 'isoLate';
      return `f${i}`;
    });
    expect(isolationHitsAtK(top, ['isoEarly', 'isoLate'], 50)).toBe(1);
  });

  it('counts an isolation id only once even if it repeats in top-k', () => {
    expect(isolationHitsAtK(['iso1', 'iso1', 'x'], ['iso1'], 50)).toBe(1);
  });

  it('returns 0 when no isolation id is present', () => {
    expect(isolationHitsAtK(['a', 'b'], ['iso1'], 50)).toBe(0);
  });

  it('returns 0 when k <= 0', () => {
    expect(isolationHitsAtK(['iso1'], ['iso1'], 0)).toBe(0);
    expect(isolationHitsAtK(['iso1'], ['iso1'], -5)).toBe(0);
  });

  it('does not throw on empty inputs', () => {
    expect(() => isolationHitsAtK([], [], 50)).not.toThrow();
    expect(isolationHitsAtK([], [], 50)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// firstRankOf — 1-based rank of the first target id, or null
// ---------------------------------------------------------------------------

describe('firstRankOf', () => {
  it('returns the 1-based rank of the first target id', () => {
    expect(firstRankOf(['a', 'b', 'c'], ['c', 'b'])).toBe(2); // 'b' at index 1 -> rank 2
  });

  it('returns 1 when the first result is a target', () => {
    expect(firstRankOf(['t', 'a', 'b'], ['t'])).toBe(1);
  });

  it('returns null when no target id is present', () => {
    expect(firstRankOf(['a', 'b', 'c'], ['z'])).toBeNull();
  });

  it('returns null on empty results', () => {
    expect(firstRankOf([], ['a'])).toBeNull();
  });

  it('returns null on empty targets', () => {
    expect(firstRankOf(['a', 'b'], [])).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// ranksOf — per-target 1-based ranks (input order), null if absent
// ---------------------------------------------------------------------------

describe('ranksOf', () => {
  it('returns the 1-based rank of each target in input order', () => {
    // targets b,c -> b at index 1 (rank 2), c at index 2 (rank 3)
    expect(ranksOf(['a', 'b', 'c'], ['b', 'c'])).toEqual([2, 3]);
  });

  it('returns null for targets that are absent, preserving order', () => {
    // targets z (absent), a (rank 1), q (absent)
    expect(ranksOf(['a', 'b', 'c'], ['z', 'a', 'q'])).toEqual([null, 1, null]);
  });

  it('uses the FIRST occurrence rank for a repeated id', () => {
    expect(ranksOf(['a', 'b', 'a'], ['a'])).toEqual([1]);
  });

  it('returns an empty array for empty targets', () => {
    expect(ranksOf(['a', 'b'], [])).toEqual([]);
  });

  it('returns all-null for non-empty targets against empty results', () => {
    expect(ranksOf([], ['a', 'b'])).toEqual([null, null]);
  });
});

// ---------------------------------------------------------------------------
// jaccard — set overlap (q22 sentinel)
// ---------------------------------------------------------------------------

describe('jaccard', () => {
  it('is 1 for identical sets', () => {
    expect(jaccard(['a', 'b', 'c'], ['c', 'b', 'a'])).toBeCloseTo(1, 10);
  });

  it('is 0 for disjoint sets', () => {
    expect(jaccard(['a', 'b'], ['c', 'd'])).toBe(0);
  });

  it('computes partial overlap with set semantics', () => {
    // A={a,b,c}, B={b,c,d}; intersection {b,c}=2, union {a,b,c,d}=4 -> 0.5
    expect(jaccard(['a', 'b', 'c'], ['b', 'c', 'd'])).toBeCloseTo(0.5, 10);
  });

  it('dedupes inputs before computing (duplicates do not change the result)', () => {
    // A={a,b}, B={b}; intersection {b}=1, union {a,b}=2 -> 0.5
    expect(jaccard(['a', 'a', 'b'], ['b', 'b'])).toBeCloseTo(0.5, 10);
  });

  it('returns 1 when the union is empty (both empty)', () => {
    expect(jaccard([], [])).toBeCloseTo(1, 10);
  });

  it('is 0 when one set is empty and the other is not', () => {
    expect(jaccard(['a'], [])).toBe(0);
    expect(jaccard([], ['a'])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// overBroad — UNCHANGED
// ---------------------------------------------------------------------------

describe('overBroad', () => {
  it('is true when totalCount / corpusSize is strictly above the threshold', () => {
    expect(overBroad(60, 100, 0.5)).toBe(true);
  });

  it('is false when exactly at the threshold (strict greater-than boundary)', () => {
    expect(overBroad(50, 100, 0.5)).toBe(false);
  });

  it('is true just above the threshold boundary', () => {
    expect(overBroad(51, 100, 0.5)).toBe(true);
  });

  it('is false below the threshold', () => {
    expect(overBroad(10, 100, 0.5)).toBe(false);
  });

  it('is false when corpusSize <= 0', () => {
    expect(overBroad(10, 0, 0.5)).toBe(false);
    expect(overBroad(10, -5, 0.5)).toBe(false);
  });

  it('is true at the upper threshold of 1.0 only when count exceeds corpus', () => {
    expect(overBroad(100, 100, 1)).toBe(false);
    expect(overBroad(101, 100, 1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// rankMovement — baseline->current movement of G3 isolation lessons
// (the absent->ranked case is the primary S2 success signal; it must register)
// ---------------------------------------------------------------------------
describe('rankMovement', () => {
  const BEYOND = 51; // PAGE_SIZE + 1 sentinel for "absent from the fetched window"

  it('counts absent->ranked as a positive move (the primary G3/S2 success case)', () => {
    // baseline: absent (null); current: rank 30 -> moved up by (51 - 30) = 21.
    const mv = rankMovement([30], [null], BEYOND);
    expect(mv.median).toBe(21);
    expect(mv.best).toBe(21);
  });

  it('counts ranked->absent as a negative move (regression)', () => {
    // baseline rank 10; current absent -> (10 - 51) = -41.
    const mv = rankMovement([null], [10], BEYOND);
    expect(mv.median).toBe(-41);
    expect(mv.best).toBe(-41);
  });

  it('computes ranked->ranked movement directly (positive = moved up)', () => {
    // 40 -> 5 = +35 ; 3 -> 8 = -5. median of [-5, 35] = 15 ; best = 35.
    const mv = rankMovement([5, 8], [40, 3], BEYOND);
    expect(mv.median).toBe(15);
    expect(mv.best).toBe(35);
  });

  it('skips targets absent in BOTH runs (no signal, no median dilution)', () => {
    // only the 2nd target moves (null->20); the 1st (null->null) is skipped.
    const mv = rankMovement([null, 20], [null, null], BEYOND);
    expect(mv.median).toBe(31); // 51 - 20, computed over a single contributing delta
    expect(mv.best).toBe(31);
  });

  it('returns nulls when every target is absent in both runs', () => {
    const mv = rankMovement([null, null], [null, null], BEYOND);
    expect(mv.median).toBeNull();
    expect(mv.best).toBeNull();
  });

  it('returns nulls on a length mismatch (no comparable baseline)', () => {
    const mv = rankMovement([1, 2, 3], [1, 2], BEYOND);
    expect(mv.median).toBeNull();
    expect(mv.best).toBeNull();
  });

  it('reports zero movement when ranks are identical (stable engine)', () => {
    const mv = rankMovement([5, 12, null], [5, 12, null], BEYOND);
    expect(mv.median).toBe(0); // [0, 0] over the two ranked targets; both-null skipped
    expect(mv.best).toBe(0);
  });
});
