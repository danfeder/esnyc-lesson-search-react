/**
 * Unit tests for the fresh ranking-metric module used by the search eval
 * harness (S0). These are RANKING metrics (rank / k / reciprocal-rank), NOT
 * the multi-label classification metrics in scripts/lib/evalMetrics.ts — that
 * module has no rank/k concept and is deliberately NOT reused here.
 *
 * All ids are lesson_id strings (uuid). Every function is PURE and must NEVER
 * throw — degenerate inputs (empty gold, empty results, k<=0, corpus<=0) return
 * the documented sentinel value instead.
 */
import { describe, expect, it } from 'vitest';

import { hitRateAtK, mrr, overBroad, top1Relevant } from './metrics';

// ---------------------------------------------------------------------------
// hitRateAtK — recall@k
// ---------------------------------------------------------------------------

describe('hitRateAtK — recall@k', () => {
  it('counts distinct gold ids found among the first k results', () => {
    // 2 of 4 gold ids appear in the first 3 results -> 0.5
    const results = ['a', 'b', 'x', 'c'];
    const gold = ['b', 'c', 'd', 'e'];
    expect(hitRateAtK(results, gold, 3)).toBeCloseTo(1 / 4, 10); // only 'b' in first 3
  });

  it('returns 1 when every gold id is in the first k results', () => {
    expect(hitRateAtK(['g1', 'g2', 'z'], ['g1', 'g2'], 3)).toBeCloseTo(1, 10);
  });

  it('returns 0 when no gold id is in the first k results', () => {
    expect(hitRateAtK(['x', 'y', 'z'], ['a', 'b'], 3)).toBe(0);
  });

  it('only considers the FIRST k entries (a gold id past k does not count)', () => {
    // gold 'c' sits at index 3 (4th), outside k=3
    expect(hitRateAtK(['a', 'b', 'x', 'c'], ['c'], 3)).toBe(0);
    // widen k to include it
    expect(hitRateAtK(['a', 'b', 'x', 'c'], ['c'], 4)).toBeCloseTo(1, 10);
  });

  it('returns NaN when goldIds is empty (caller treats as N/A)', () => {
    expect(hitRateAtK(['a', 'b'], [], 10)).toBeNaN();
  });

  it('does not throw on empty goldIds', () => {
    expect(() => hitRateAtK(['a'], [], 5)).not.toThrow();
  });

  it('returns 0 when k <= 0', () => {
    expect(hitRateAtK(['a', 'b'], ['a'], 0)).toBe(0);
    expect(hitRateAtK(['a', 'b'], ['a'], -3)).toBe(0);
  });

  it('uses all available entries when results are shorter than k', () => {
    expect(hitRateAtK(['a', 'b'], ['a', 'b'], 10)).toBeCloseTo(1, 10);
  });

  it('returns 0 when results are empty (gold non-empty)', () => {
    expect(hitRateAtK([], ['a', 'b'], 10)).toBe(0);
  });

  it('does not let a duplicated result id inflate the count', () => {
    // 'a' appears twice in the first k; it must count as ONE distinct gold hit.
    // gold has 2 ids, only 'a' is present -> 1/2 = 0.5, never 1.
    expect(hitRateAtK(['a', 'a', 'a'], ['a', 'b'], 3)).toBeCloseTo(0.5, 10);
  });

  it('counts distinct gold hits over goldIds.length (per-spec denominator)', () => {
    // numerator = DISTINCT gold ids matched (1: 'a'); denominator = goldIds.length
    // per spec (2 here, a malformed dup gold list) -> 1/2 = 0.5.
    expect(hitRateAtK(['a', 'b'], ['a', 'a'], 2)).toBeCloseTo(0.5, 10);
  });
});

// ---------------------------------------------------------------------------
// top1Relevant
// ---------------------------------------------------------------------------

describe('top1Relevant', () => {
  it('is true when the first result is a gold id', () => {
    expect(top1Relevant(['a', 'b', 'c'], ['a', 'z'])).toBe(true);
  });

  it('is false when the first result is NOT a gold id (even if later ones are)', () => {
    expect(top1Relevant(['x', 'a', 'b'], ['a', 'b'])).toBe(false);
  });

  it('is false on empty results', () => {
    expect(top1Relevant([], ['a'])).toBe(false);
  });

  it('is false on empty gold', () => {
    expect(top1Relevant(['a'], [])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// mrr — per-query reciprocal rank
// ---------------------------------------------------------------------------

describe('mrr — per-query reciprocal rank', () => {
  it('is 1.0 when the first gold hit is at position 1', () => {
    expect(mrr(['a', 'b', 'c'], ['a'])).toBeCloseTo(1, 10);
  });

  it('is 0.5 when the first gold hit is at position 2', () => {
    expect(mrr(['x', 'a', 'b'], ['a'])).toBeCloseTo(0.5, 10);
  });

  it('is 1/3 when the first gold hit is at position 3', () => {
    expect(mrr(['x', 'y', 'a'], ['a'])).toBeCloseTo(1 / 3, 10);
  });

  it('uses the FIRST gold hit when multiple gold ids are present', () => {
    // 'b' at index 2 (rank 3) and 'a' at index 1 (rank 2); first hit is rank 2.
    expect(mrr(['x', 'a', 'b'], ['a', 'b'])).toBeCloseTo(0.5, 10);
  });

  it('is 0 when no gold id is found', () => {
    expect(mrr(['x', 'y', 'z'], ['a', 'b'])).toBe(0);
  });

  it('is 0 on empty results', () => {
    expect(mrr([], ['a'])).toBe(0);
  });

  it('is 0 on empty gold', () => {
    expect(mrr(['a'], [])).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// overBroad
// ---------------------------------------------------------------------------

describe('overBroad', () => {
  it('is true when totalCount / corpusSize is strictly above the threshold', () => {
    // 60 / 100 = 0.6 > 0.5
    expect(overBroad(60, 100, 0.5)).toBe(true);
  });

  it('is false when exactly at the threshold (strict greater-than boundary)', () => {
    // 50 / 100 = 0.5, NOT > 0.5
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
    // threshold 1.0: equal is not over-broad; strictly more is.
    expect(overBroad(100, 100, 1)).toBe(false);
    expect(overBroad(101, 100, 1)).toBe(true);
  });
});
