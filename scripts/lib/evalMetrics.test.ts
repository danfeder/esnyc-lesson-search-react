import { describe, it, expect } from 'vitest';
import { computeMetrics, evaluateThresholds } from './evalMetrics';

describe('computeMetrics', () => {
  it('returns 1.0 across all values for perfect predictions', () => {
    const result = computeMetrics(
      [
        ['A', 'B'],
        ['A'],
        ['B', 'C'],
      ],
      [
        ['A', 'B'],
        ['A'],
        ['B', 'C'],
      ],
      ['A', 'B', 'C']
    );
    for (const pv of result.perValue) {
      expect(pv.precision).toBe(1);
      expect(pv.recall).toBe(1);
      expect(pv.f1).toBe(1);
    }
    expect(result.macro.f1).toBe(1);
    expect(result.micro.f1).toBe(1);
    expect(result.sampleCount).toBe(3);
  });

  it('computes TP/FP/FN per vocabulary value for multi-label intersection', () => {
    const result = computeMetrics([['A', 'C']], [['A', 'B']], ['A', 'B', 'C']);
    const a = result.perValue.find((p) => p.value === 'A')!;
    const b = result.perValue.find((p) => p.value === 'B')!;
    const c = result.perValue.find((p) => p.value === 'C')!;
    expect(a).toMatchObject({ tp: 1, fp: 0, fn: 0 });
    expect(b).toMatchObject({ tp: 0, fp: 0, fn: 1 });
    expect(c).toMatchObject({ tp: 0, fp: 1, fn: 0 });
  });

  it('returns null precision when value never predicted', () => {
    const result = computeMetrics([['A']], [['C']], ['A', 'C']);
    const c = result.perValue.find((p) => p.value === 'C')!;
    expect(c.tp).toBe(0);
    expect(c.fp).toBe(0);
    expect(c.fn).toBe(1);
    expect(c.precision).toBeNull();
    expect(c.recall).toBe(0);
    expect(c.f1).toBeNull();
  });

  it('returns null recall when value never appears in truth', () => {
    const result = computeMetrics([['B']], [['A']], ['A', 'B']);
    const b = result.perValue.find((p) => p.value === 'B')!;
    expect(b.tp).toBe(0);
    expect(b.fp).toBe(1);
    expect(b.fn).toBe(0);
    expect(b.precision).toBe(0);
    expect(b.recall).toBeNull();
    expect(b.f1).toBeNull();
  });

  it('returns null both when value absent from both truth and predictions', () => {
    const result = computeMetrics([['A']], [['A']], ['A', 'B']);
    const b = result.perValue.find((p) => p.value === 'B')!;
    expect(b.tp).toBe(0);
    expect(b.fp).toBe(0);
    expect(b.fn).toBe(0);
    expect(b.precision).toBeNull();
    expect(b.recall).toBeNull();
    expect(b.f1).toBeNull();
  });

  it('macro-averages exclude null per-value metrics', () => {
    // 'B' has no support → null F1, excluded from macro
    const result = computeMetrics([['A']], [['A']], ['A', 'B']);
    expect(result.macro.f1).toBe(1);
  });

  it('treats single-label as 1-element arrays', () => {
    const result = computeMetrics(
      [['cooking'], ['garden'], ['both'], ['craft'], ['craft']],
      [['cooking'], ['garden'], ['both'], ['academic'], ['craft']],
      ['cooking', 'garden', 'both', 'academic', 'craft']
    );
    const academic = result.perValue.find((p) => p.value === 'academic')!;
    const craft = result.perValue.find((p) => p.value === 'craft')!;
    expect(academic).toMatchObject({ tp: 0, fp: 0, fn: 1, precision: null, recall: 0 });
    expect(craft).toMatchObject({ tp: 1, fp: 1, fn: 0 });
    expect(craft.precision).toBeCloseTo(0.5);
    expect(craft.recall).toBe(1);
  });

  it('throws when predictions and truth have different lengths', () => {
    expect(() => computeMetrics([['A']], [['A'], ['B']], ['A', 'B'])).toThrow(/length/i);
  });

  it('handles empty input arrays', () => {
    const result = computeMetrics([], [], ['A', 'B']);
    expect(result.sampleCount).toBe(0);
    for (const pv of result.perValue) {
      expect(pv).toMatchObject({ tp: 0, fp: 0, fn: 0, precision: null, recall: null, f1: null });
    }
    expect(result.macro.f1).toBeNaN();
  });

  it('reports truthCount and predictionCount per value', () => {
    const result = computeMetrics(
      [['A'], ['A', 'B'], ['B']],
      [['A'], ['A'], ['B']],
      ['A', 'B']
    );
    const a = result.perValue.find((p) => p.value === 'A')!;
    const b = result.perValue.find((p) => p.value === 'B')!;
    expect(a.truthCount).toBe(2);
    expect(a.predictionCount).toBe(2);
    expect(b.truthCount).toBe(1);
    expect(b.predictionCount).toBe(2);
  });

  it('computes micro-average over aggregated TP/FP/FN', () => {
    // 1 sample: truth=[A,B,C], pred=[A,B,D]
    // A: TP, B: TP, C: FN (in truth, not pred), D: FP (in pred, not truth)
    // Aggregate: TP=2, FP=1, FN=1 → P=2/3, R=2/3, F1=2/3
    const result = computeMetrics([['A', 'B', 'D']], [['A', 'B', 'C']], ['A', 'B', 'C', 'D']);
    expect(result.micro.precision).toBeCloseTo(2 / 3);
    expect(result.micro.recall).toBeCloseTo(2 / 3);
    expect(result.micro.f1).toBeCloseTo(2 / 3);
  });
});

describe('evaluateThresholds', () => {
  const perfectResult = computeMetrics([['A'], ['B']], [['A'], ['B']], ['A', 'B']);

  it('returns passed=true with empty thresholds', () => {
    const r = evaluateThresholds(perfectResult, {});
    expect(r.passed).toBe(true);
    expect(r.failures).toHaveLength(0);
  });

  it('passes when macro F1 meets the floor', () => {
    const r = evaluateThresholds(perfectResult, { macroF1: 0.7 });
    expect(r.passed).toBe(true);
  });

  it('fails when macro F1 below the floor', () => {
    const halfRight = computeMetrics([['A'], ['A']], [['A'], ['B']], ['A', 'B']);
    const r = evaluateThresholds(halfRight, { macroF1: 0.99 });
    expect(r.passed).toBe(false);
    expect(r.failures.some((f) => /macro F1/i.test(f))).toBe(true);
  });

  it('fails when per-value recall below floor and names the failing values', () => {
    const result = computeMetrics([['A'], ['A']], [['A'], ['B']], ['A', 'B']);
    const r = evaluateThresholds(result, { minRecallPerValue: 0.5 });
    expect(r.passed).toBe(false);
    expect(r.failures.some((f) => f.includes('B'))).toBe(true);
  });

  it('skips values with null recall when checking minRecallPerValue', () => {
    const result = computeMetrics([['A']], [['A']], ['A', 'B']);
    const r = evaluateThresholds(result, { minRecallPerValue: 0.5 });
    expect(r.passed).toBe(true);
  });

  it('fails when per-value precision below floor', () => {
    // 'B' predicted twice, never in truth → precision=0
    const result = computeMetrics([['A', 'B'], ['B']], [['A'], ['A']], ['A', 'B']);
    const r = evaluateThresholds(result, { minPrecisionPerValue: 0.5 });
    expect(r.passed).toBe(false);
    expect(r.failures.some((f) => f.includes('B'))).toBe(true);
  });

  describe('maxPredictionRateForAbsentValues', () => {
    it('fails when an absent-from-truth value is predicted above the ceiling', () => {
      // 'craft' never in truth; predicted on 2 of 4 samples = 0.5
      const result = computeMetrics(
        [['cooking'], ['cooking', 'craft'], ['garden'], ['craft']],
        [['cooking'], ['cooking'], ['garden'], ['cooking']],
        ['cooking', 'garden', 'craft']
      );
      const r = evaluateThresholds(result, { maxPredictionRateForAbsentValues: 0.1 });
      expect(r.passed).toBe(false);
      expect(r.failures.some((f) => f.includes('craft'))).toBe(true);
      expect(r.failures.some((f) => /2 of 4/i.test(f))).toBe(true);
    });

    it('passes when an absent-from-truth value is predicted at or below the ceiling', () => {
      // 'craft' never in truth; predicted on 1 of 10 samples = 0.1, equals ceiling
      const truth = Array.from({ length: 10 }, () => ['cooking']);
      const preds = Array.from({ length: 10 }, (_, i) => (i === 0 ? ['craft'] : ['cooking']));
      const result = computeMetrics(preds, truth, ['cooking', 'craft']);
      const r = evaluateThresholds(result, { maxPredictionRateForAbsentValues: 0.1 });
      expect(r.passed).toBe(true);
    });

    it('does not apply when the value has truth-set support (regular precision/recall apply)', () => {
      // 'craft' has truth support; predicted twice, both correct.
      // Ceiling of 0.01 would fire if the rule mistakenly applied to truth-supported values.
      const result = computeMetrics(
        [['craft'], ['craft'], ['cooking']],
        [['craft'], ['craft'], ['cooking']],
        ['cooking', 'craft']
      );
      const r = evaluateThresholds(result, { maxPredictionRateForAbsentValues: 0.01 });
      expect(r.passed).toBe(true);
    });

    it('does not divide by zero on empty input', () => {
      const result = computeMetrics([], [], ['craft']);
      const r = evaluateThresholds(result, { maxPredictionRateForAbsentValues: 0.1 });
      expect(r.passed).toBe(true);
    });
  });
});
