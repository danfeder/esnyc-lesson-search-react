/**
 * Pure-function metric computation for the LLM-tagging eval gate harness.
 *
 * Multi-label internal model: every sample's prediction and truth is a string set
 * (encoded as `string[]`). Single-label problems use 1-element arrays.
 *
 * `precision` is `null` when a value is never predicted (TP+FP=0).
 * `recall` is `null` when a value never appears in truth (TP+FN=0).
 * `f1` is `null` when either precision or recall is null.
 * Macro averages are means over only the values with non-null metrics; NaN if
 * none are defined (e.g., empty input).
 */

export type LabelSet = string[];

export interface PerValueMetrics {
  value: string;
  truthCount: number;
  predictionCount: number;
  tp: number;
  fp: number;
  fn: number;
  precision: number | null;
  recall: number | null;
  f1: number | null;
}

export interface MacroMetrics {
  precision: number;
  recall: number;
  f1: number;
}

export interface MicroMetrics {
  precision: number;
  recall: number;
  f1: number;
}

export interface MetricsResult {
  perValue: PerValueMetrics[];
  macro: MacroMetrics;
  micro: MicroMetrics;
  sampleCount: number;
}

export function computeMetrics(
  predictions: LabelSet[],
  truth: LabelSet[],
  vocabulary: string[]
): MetricsResult {
  if (predictions.length !== truth.length) {
    throw new Error(
      `predictions and truth must have equal length (got ${predictions.length} vs ${truth.length})`
    );
  }

  const perValue: PerValueMetrics[] = vocabulary.map((value) => {
    let tp = 0;
    let fp = 0;
    let fn = 0;
    let truthCount = 0;
    let predictionCount = 0;

    for (let i = 0; i < truth.length; i++) {
      const inTruth = truth[i].includes(value);
      const inPred = predictions[i].includes(value);
      if (inTruth) truthCount++;
      if (inPred) predictionCount++;
      if (inTruth && inPred) tp++;
      else if (inPred) fp++;
      else if (inTruth) fn++;
    }

    const precision = tp + fp === 0 ? null : tp / (tp + fp);
    const recall = tp + fn === 0 ? null : tp / (tp + fn);
    const f1 =
      precision === null || recall === null
        ? null
        : precision + recall === 0
          ? 0
          : (2 * (precision * recall)) / (precision + recall);

    return { value, truthCount, predictionCount, tp, fp, fn, precision, recall, f1 };
  });

  const macro = computeMacro(perValue);

  const totalTp = perValue.reduce((s, p) => s + p.tp, 0);
  const totalFp = perValue.reduce((s, p) => s + p.fp, 0);
  const totalFn = perValue.reduce((s, p) => s + p.fn, 0);
  const micro = computeMicro(totalTp, totalFp, totalFn);

  return { perValue, macro, micro, sampleCount: truth.length };
}

function computeMacro(perValue: PerValueMetrics[]): MacroMetrics {
  return {
    precision: averageDefined(perValue.map((p) => p.precision)),
    recall: averageDefined(perValue.map((p) => p.recall)),
    f1: averageDefined(perValue.map((p) => p.f1)),
  };
}

function averageDefined(values: (number | null)[]): number {
  const defined = values.filter((v): v is number => v !== null);
  if (defined.length === 0) return NaN;
  return defined.reduce((s, v) => s + v, 0) / defined.length;
}

function computeMicro(tp: number, fp: number, fn: number): MicroMetrics {
  if (tp + fp + fn === 0) {
    return { precision: NaN, recall: NaN, f1: NaN };
  }
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * (precision * recall)) / (precision + recall);
  return { precision, recall, f1 };
}

export interface ThresholdConfig {
  macroF1?: number;
  microF1?: number;
  minRecallPerValue?: number;
  minPrecisionPerValue?: number;
  // Ceiling on predictionCount / sampleCount for any vocabulary value with
  // truthCount === 0. Used when a sample set lacks ground-truth coverage of a
  // value (e.g. activity_type's `craft` against the pre-PR-1b 113-row set):
  // recall is undefined, but a runaway false-positive rate is still a fail.
  maxPredictionRateForAbsentValues?: number;
}

export interface ThresholdResult {
  passed: boolean;
  failures: string[];
}

export function evaluateThresholds(
  result: MetricsResult,
  thresholds: ThresholdConfig
): ThresholdResult {
  const failures: string[] = [];

  if (thresholds.macroF1 !== undefined) {
    const v = result.macro.f1;
    if (Number.isNaN(v) || v < thresholds.macroF1) {
      failures.push(`macro F1 ${formatMetric(v)} below floor ${thresholds.macroF1}`);
    }
  }
  if (thresholds.microF1 !== undefined) {
    const v = result.micro.f1;
    if (Number.isNaN(v) || v < thresholds.microF1) {
      failures.push(`micro F1 ${formatMetric(v)} below floor ${thresholds.microF1}`);
    }
  }
  if (thresholds.minRecallPerValue !== undefined) {
    const floor = thresholds.minRecallPerValue;
    for (const pv of result.perValue) {
      if (pv.recall !== null && pv.recall < floor) {
        failures.push(`recall ${pv.recall.toFixed(3)} for "${pv.value}" below floor ${floor}`);
      }
    }
  }
  if (thresholds.minPrecisionPerValue !== undefined) {
    const floor = thresholds.minPrecisionPerValue;
    for (const pv of result.perValue) {
      if (pv.precision !== null && pv.precision < floor) {
        failures.push(`precision ${pv.precision.toFixed(3)} for "${pv.value}" below floor ${floor}`);
      }
    }
  }
  if (thresholds.maxPredictionRateForAbsentValues !== undefined) {
    const ceiling = thresholds.maxPredictionRateForAbsentValues;
    for (const pv of result.perValue) {
      if (pv.truthCount === 0 && result.sampleCount > 0) {
        const rate = pv.predictionCount / result.sampleCount;
        if (rate > ceiling) {
          failures.push(
            `prediction rate ${rate.toFixed(3)} for "${pv.value}" exceeds ceiling ${ceiling} when value is absent from truth (${pv.predictionCount} of ${result.sampleCount} samples)`
          );
        }
      }
    }
  }

  return { passed: failures.length === 0, failures };
}

function formatMetric(v: number): string {
  return Number.isNaN(v) ? 'NaN' : v.toFixed(3);
}
