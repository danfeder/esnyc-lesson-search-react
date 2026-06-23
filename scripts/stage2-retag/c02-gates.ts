/**
 * C02 4-gate scoring + the COMPUTED rules-baseline contestant (impl plan P1.6).
 *
 * This module is ADDITIVE to the shipped 13-field metadata-rebuild scoring in
 * `score-answer-key.ts` (`scoreContestant` / `evaluateGates` / `GateResults`):
 * it neither changes nor breaks those signatures. The C02 gates score ONLY the
 * two C02 fields (`cooking_skills`, `main_ingredients`) and drive the PILOT
 * GREENLIGHT decision for the cooking-skills/main-ingredients re-tag.
 *
 * The four gates (design §4 Q5, all thresholds LOCKED 2026-06-23):
 *   ① no clean-core regression — on the CLEAN-CORE subset, winner per-field
 *      micro-F1 >= rules-baseline per-field micro-F1, STRICT, for EACH field.
 *   ② beats rules on judgment rows — on the JUDGMENT-ROW subset, winner micro-F1
 *      >= rules-baseline micro-F1 + 0.05, PER-FIELD-INDEPENDENT, BOTH fields must
 *      pass, a tie (delta == 0) FAILS.
 *   ③ low false-positive on added specifics — aggregate (pooled) precision over
 *      the 46 main_ingredients SPECIFIC values >= 0.7; AND any specific with zero
 *      gold-key support (never-in-key) is predicted in <= 5% of rows. A singleton
 *      over-prediction COUNTS here (FP side of the singleton rule).
 *   ④ pantry-staple precision — Sweeteners precision >= 0.8, AND no never-stored
 *      literal (Salt / Oil / Soy sauce) survives in any prediction (B-lite).
 *
 * The clean-core/judgment-row label (design §4 Q6) is coupled to the gold key:
 * a lesson is judgment-row iff it carries a hard-case signal (vague cooking tag /
 * Herbs & Aromatics / orphan-drop food in its CURRENT tags) OR the gold key
 * assigns an "added specific" the deterministic floor over its current tags would
 * not have produced.
 *
 * The rules-baseline contestant has NO file loader — it is COMPUTED by running
 * the real deterministic floor (`predictMembership`, which reuses the normalize
 * R7/R8/R9 floor) over each lesson's CURRENT tags. Gate ② compares the LLM
 * winner against THIS rules-baseline, not v3.
 *
 * No new metric math: gates read the already-computed per-value
 * precision/fp/predictionCount + micro-F1 from `scripts/lib/evalMetrics` via
 * `scoreContestant`. Reporting only: no API calls, no DB access.
 */
import { computeMetrics } from '../lib/evalMetrics';
import { loadC02Manifest } from './vocab';
import {
  buildC02SamplerContext,
  classifyHardCase,
  mulberry32,
  predictMembership,
  type C02SamplerContext,
  type CorpusRecordForSampling,
} from './sample-answer-key';
import {
  extractFieldTokens,
  scoreContestant,
  type ContestantScore,
  type KeyRecord,
  type TaggedRecord,
} from './score-answer-key';
import { matchKey } from './normalize';

// ---------------------------------------------------------------------------
// Constants — the two C02 fields + the LOCKED Q5 thresholds
// ---------------------------------------------------------------------------

/** The two fields the C02 gates score (design §4: ONLY these two). */
export const C02_FIELDS = ['cooking_skills', 'main_ingredients'] as const;
export type C02Field = (typeof C02_FIELDS)[number];

/** Gate ② minimum micro-F1 delta over rules on judgment rows (a tie fails). */
export const GATE2_MIN_DELTA = 0.05;
/**
 * Float tolerance for the gate ② delta comparison. A mathematically-exact +0.05
 * delta (e.g. 0.95 − 0.90) renders as 0.04999999999999993 under IEEE-754 and
 * would be spuriously failed by a bare `>= 0.05`. The epsilon restores parity
 * with the documented "+0.05" while keeping the tie-fails intent intact: a tie
 * (delta 0) still fails, since 0 < GATE2_MIN_DELTA − GATE2_DELTA_EPS.
 */
export const GATE2_DELTA_EPS = 1e-9;
/** Gate ③ pooled precision floor over the 46 added specifics. */
export const GATE3_PRECISION_FLOOR = 0.7;
/** Gate ③ ceiling on the prediction rate of a never-in-key specific. */
export const GATE3_ABSENT_RATE_CEILING = 0.05;
/** Gate ④ precision floor for the Sweeteners pantry-staple group. */
export const GATE4_SWEETENERS_PRECISION_FLOOR = 0.8;
/** Gate ④ the never-stored pantry literals (B-lite — must never survive). */
export const GATE4_NEVER_STORED_LITERALS = ['Salt', 'Oil', 'Soy sauce'] as const;
/** The pantry-staple group gate ④ scores precision on (Sugar folds here). */
export const GATE4_SWEETENERS_VALUE = 'Sweeteners';

// ---------------------------------------------------------------------------
// Corpus current-tags input
// ---------------------------------------------------------------------------

/**
 * A corpus row carrying a lesson's CURRENT (pre-retag) tags. Superset of what
 * the floor predictor + hard-case classifier need (`CorpusRecordForSampling`).
 */
export type CorpusCurrentTags = CorpusRecordForSampling;

/** Per-lesson clean-core/judgment-row label (design §4 Q6). */
export type LessonLabel = 'clean-core' | 'judgment-row';

// ---------------------------------------------------------------------------
// The 46 added specifics + Sweeteners (from the canonical manifest)
// ---------------------------------------------------------------------------

/** The 46 main_ingredients SPECIFIC values (the "added specifics" gate-③ set). */
export function addedSpecificValues(): string[] {
  return loadC02Manifest().mainIngredientsSpecifics.map((s) => s.value);
}

// ---------------------------------------------------------------------------
// labelLessons — clean-core vs judgment-row (Q6, gold-key-coupled)
// ---------------------------------------------------------------------------

/**
 * Classify every key lesson as 'clean-core' or 'judgment-row' (design §4 Q6).
 *
 * A lesson is judgment-row iff ANY of:
 *   (a) a hard-case signal in its CURRENT tags — a vague cooking tag, the
 *       Herbs & Aromatics catch-all, or an orphan/drop food (reuses the P1.5
 *       `classifyHardCase`); OR
 *   (b) the GOLD KEY assigns a main_ingredients SPECIFIC that the deterministic
 *       floor over the lesson's current tags would NOT have produced (an "added
 *       specific" — the judgment work the rules baseline is blind to).
 *
 * A lesson with no corpus current-tags row is treated as having empty current
 * tags (so only the gold-key added-specific test can mark it judgment-row).
 */
export function labelLessons(
  key: KeyRecord[],
  corpus: CorpusCurrentTags[],
  ctx: C02SamplerContext = buildC02SamplerContext()
): Map<string, LessonLabel> {
  const corpusById = new Map(corpus.map((r) => [r.id, r]));
  const specifics = new Set(addedSpecificValues());
  const labels = new Map<string, LessonLabel>();

  for (const keyRecord of key) {
    const current = corpusById.get(keyRecord.id);
    let label: LessonLabel = 'clean-core';

    // (a) hard-case signal in current tags.
    if (current && classifyHardCase(current, ctx) !== null) {
      label = 'judgment-row';
    }

    // (b) gold key assigns an added specific the floor wouldn't have produced.
    if (label === 'clean-core') {
      const floored = current
        ? new Set(predictMembership(current, ctx).ingredients)
        : new Set<string>();
      const goldIngredients = extractFieldTokens('main_ingredients', keyRecord);
      const addedSpecific = goldIngredients.some((v) => specifics.has(v) && !floored.has(v));
      if (addedSpecific) label = 'judgment-row';
    }

    labels.set(keyRecord.id, label);
  }

  return labels;
}

/** Partition a key into its clean-core and judgment-row subsets (Q6). */
export function partitionKey(
  key: KeyRecord[],
  corpus: CorpusCurrentTags[],
  ctx?: C02SamplerContext
): { cleanCore: KeyRecord[]; judgmentRow: KeyRecord[]; labels: Map<string, LessonLabel> } {
  const labels = labelLessons(key, corpus, ctx);
  const cleanCore: KeyRecord[] = [];
  const judgmentRow: KeyRecord[] = [];
  for (const keyRecord of key) {
    if (labels.get(keyRecord.id) === 'judgment-row') judgmentRow.push(keyRecord);
    else cleanCore.push(keyRecord);
  }
  return { cleanCore, judgmentRow, labels };
}

// ---------------------------------------------------------------------------
// computeRulesBaseline — the COMPUTED floor contestant (no LLM, no file)
// ---------------------------------------------------------------------------

/**
 * The rules-baseline contestant: for each corpus row, run the REAL deterministic
 * floor (`predictMembership` — the same R7/R8/R9 the normalizer uses) over its
 * CURRENT cooking_skills + main_ingredients tags, producing a synthetic
 * TaggedRecord with the floored canonical values. This is NOT loaded from a file
 * (the floor is computed); it is then scored via `scoreContestant` like any
 * contestant, and gate ② compares the winner against it.
 */
export function computeRulesBaseline(
  corpus: CorpusCurrentTags[],
  ctx: C02SamplerContext = buildC02SamplerContext()
): TaggedRecord[] {
  return corpus.map((record) => {
    const predicted = predictMembership(record, ctx);
    return {
      id: record.id,
      cooking_skills: predicted.cooking,
      main_ingredients: predicted.ingredients,
    };
  });
}

// ---------------------------------------------------------------------------
// Per-field micro-F1 over a chosen subset of key ids
// ---------------------------------------------------------------------------

/**
 * Per-field micro-F1 of a contestant over a key SUBSET. Reuses `computeMetrics`
 * (no new metric math) by re-running it on just the subset rows. A field with no
 * tokens in either truth or prediction yields micro-F1 = 0 (NaN coerced) so a
 * delta is always defined.
 */
function subsetFieldMicroF1(
  field: C02Field,
  contestantById: Map<string, TaggedRecord>,
  subset: KeyRecord[]
): number {
  const truth: string[][] = [];
  const predictions: string[][] = [];
  const vocab = new Set<string>();
  for (const keyRecord of subset) {
    const truthTokens = extractFieldTokens(field, keyRecord);
    const contestant = contestantById.get(keyRecord.id);
    const predTokens = contestant ? extractFieldTokens(field, contestant) : [];
    truth.push(truthTokens);
    predictions.push(predTokens);
    for (const t of truthTokens) vocab.add(t);
    for (const t of predTokens) vocab.add(t);
  }
  const metrics = computeMetrics(predictions, truth, [...vocab].sort());
  return Number.isNaN(metrics.micro.f1) ? 0 : metrics.micro.f1;
}

// ---------------------------------------------------------------------------
// Gate results
// ---------------------------------------------------------------------------

export interface Gate1Result {
  passed: boolean;
  /** Per clean-core field: winner vs rules micro-F1 (winner must be >= rules). */
  perField: Record<C02Field, { winner: number; rules: number }>;
  failingFields: Array<{ field: C02Field; winner: number; rules: number }>;
  cleanCoreCount: number;
}

export interface Gate2Result {
  passed: boolean;
  /** Per judgment-row field: winner/rules micro-F1 + delta (>= +0.05 to pass). */
  perField: Record<C02Field, { winner: number; rules: number; delta: number; passed: boolean }>;
  minDelta: number;
  judgmentRowCount: number;
}

export interface Gate3Result {
  passed: boolean;
  /** Pooled precision over the 46 added specifics (sum tp / sum(tp+fp)). */
  addedSpecificPrecision: number | null;
  precisionFloor: number;
  /** Total tp / fp pooled over the added-specific values (singletons counted). */
  pooledTp: number;
  pooledFp: number;
  /** never-in-key specifics predicted above the absent-value rate ceiling. */
  absentValueViolations: Array<{ value: string; rate: number; predictionCount: number }>;
  absentRateCeiling: number;
}

export interface Gate4Result {
  passed: boolean;
  sweetenersPrecision: number | null;
  sweetenersPrecisionFloor: number;
  /** Any never-stored literal (Salt/Oil/Soy sauce) found in any prediction. */
  survivingNeverStored: string[];
}

export interface C02GateResults {
  gate1: Gate1Result;
  gate2: Gate2Result;
  gate3: Gate3Result;
  gate4: Gate4Result;
  /** All four gates passed → pilot greenlight (subject to user sign-off). */
  allPassed: boolean;
  /** Bootstrap CI on the gate-② micro-F1 delta (informational, non-gating). */
  gate2BootstrapCI: Record<C02Field, BootstrapDeltaCI>;
  labels: { cleanCore: number; judgmentRow: number };
}

// ---------------------------------------------------------------------------
// Gate ① — no clean-core regression
// ---------------------------------------------------------------------------

function evaluateGate1(
  winnerById: Map<string, TaggedRecord>,
  rulesById: Map<string, TaggedRecord>,
  cleanCore: KeyRecord[]
): Gate1Result {
  const perField = {} as Record<C02Field, { winner: number; rules: number }>;
  const failingFields: Array<{ field: C02Field; winner: number; rules: number }> = [];
  for (const field of C02_FIELDS) {
    const winner = subsetFieldMicroF1(field, winnerById, cleanCore);
    const rules = subsetFieldMicroF1(field, rulesById, cleanCore);
    perField[field] = { winner, rules };
    // STRICT: winner must be >= rules on each field.
    if (winner < rules) failingFields.push({ field, winner, rules });
  }
  return {
    passed: failingFields.length === 0,
    perField,
    failingFields,
    cleanCoreCount: cleanCore.length,
  };
}

// ---------------------------------------------------------------------------
// Gate ② — beats rules on judgment rows (+0.05, both fields, tie fails)
// ---------------------------------------------------------------------------

/**
 * Gate ② per-field pass test: winner must beat rules by at least +0.05 micro-F1.
 * Epsilon-tolerant (see GATE2_DELTA_EPS) so an exact +0.05 delta isn't lost to
 * float error; a tie (delta 0) still fails.
 */
export function gate2DeltaPasses(delta: number): boolean {
  return delta >= GATE2_MIN_DELTA - GATE2_DELTA_EPS;
}

function evaluateGate2(
  winnerById: Map<string, TaggedRecord>,
  rulesById: Map<string, TaggedRecord>,
  judgmentRow: KeyRecord[]
): Gate2Result {
  const perField = {} as Record<
    C02Field,
    { winner: number; rules: number; delta: number; passed: boolean }
  >;
  for (const field of C02_FIELDS) {
    const winner = subsetFieldMicroF1(field, winnerById, judgmentRow);
    const rules = subsetFieldMicroF1(field, rulesById, judgmentRow);
    const delta = winner - rules;
    // A tie (delta == 0) FAILS: require delta >= +0.05 (epsilon-tolerant so an
    // exact +0.05 isn't lost to float error — see gate2DeltaPasses).
    perField[field] = { winner, rules, delta, passed: gate2DeltaPasses(delta) };
  }
  // BOTH fields must pass.
  const passed = C02_FIELDS.every((f) => perField[f].passed);
  return { passed, perField, minDelta: GATE2_MIN_DELTA, judgmentRowCount: judgmentRow.length };
}

// ---------------------------------------------------------------------------
// Gate ③ — low false-positive on added specifics
// ---------------------------------------------------------------------------

function evaluateGate3(winner: ContestantScore): Gate3Result {
  const specifics = new Set(addedSpecificValues());
  const ingredientScore = winner.fields.main_ingredients;
  const perValue = ingredientScore?.perValue ?? [];

  // Pooled precision over the added-specific values only (singleton FPs counted).
  let pooledTp = 0;
  let pooledFp = 0;
  const absentValueViolations: Array<{ value: string; rate: number; predictionCount: number }> = [];
  for (const pv of perValue) {
    if (!specifics.has(pv.value)) continue;
    pooledTp += pv.tp;
    pooledFp += pv.fp;
    // Absent-value rate: a never-in-key specific (truthCount 0) predicted above
    // the ceiling fails. sampleCount === number of key lessons scored.
    if (pv.truthCount === 0 && pv.predictionCount > 0) {
      // sampleCount is implicit in scoreContestant (one row per key lesson); the
      // rate denominator is the full key size carried on the score.
      const sampleCount = winner.coverage.keyLessons;
      const rate = sampleCount > 0 ? pv.predictionCount / sampleCount : 0;
      if (rate > GATE3_ABSENT_RATE_CEILING) {
        absentValueViolations.push({ value: pv.value, rate, predictionCount: pv.predictionCount });
      }
    }
  }

  // Gate ③ is a PRECISION gate (design §4 Q5): zero added-specifics predicted
  // ⇒ no false positives ⇒ null precision ⇒ pass (the conservative reading of a
  // precision gate). NOTE for the P2 greenlight tuning: this means a model that
  // predicts ONLY group tags (never the two-level specifics) clears ③ vacuously
  // — recall on added specifics is left to gates ①/②'s judgment-row F1. If the
  // pilot shows a contestant gaming this, re-tune here (e.g. require
  // `addedSpecificPrecision !== null`). Q5 locks thresholds as re-tunable at the
  // pilot, so the behavior is intentionally left as-is for P1.
  const addedSpecificPrecision =
    pooledTp + pooledFp === 0 ? null : pooledTp / (pooledTp + pooledFp);
  const precisionOk =
    addedSpecificPrecision === null || addedSpecificPrecision >= GATE3_PRECISION_FLOOR;
  const passed = precisionOk && absentValueViolations.length === 0;

  return {
    passed,
    addedSpecificPrecision,
    precisionFloor: GATE3_PRECISION_FLOOR,
    pooledTp,
    pooledFp,
    absentValueViolations,
    absentRateCeiling: GATE3_ABSENT_RATE_CEILING,
  };
}

// ---------------------------------------------------------------------------
// Gate ④ — pantry-staple precision
// ---------------------------------------------------------------------------

function evaluateGate4(winner: ContestantScore, winnerRecords: TaggedRecord[]): Gate4Result {
  const ingredientScore = winner.fields.main_ingredients;
  const sweetenersPv = ingredientScore?.perValue.find((pv) => pv.value === GATE4_SWEETENERS_VALUE);
  const sweetenersPrecision = sweetenersPv?.precision ?? null;
  const precisionOk =
    sweetenersPrecision === null || sweetenersPrecision >= GATE4_SWEETENERS_PRECISION_FLOOR;

  // No never-stored literal (Salt/Oil/Soy sauce) may survive in ANY prediction.
  // Compare on matchKey (NFC.trim().toLowerCase()) so a casing/spacing variant
  // (`salt`, ` Oil `, `soy sauce`) can't slip the literal past gate ④; the
  // offending token is reported as-emitted.
  const neverStored = new Set<string>(GATE4_NEVER_STORED_LITERALS.map(matchKey));
  const surviving = new Set<string>();
  for (const record of winnerRecords) {
    for (const field of C02_FIELDS) {
      for (const tok of extractFieldTokens(field, record)) {
        if (neverStored.has(matchKey(tok))) surviving.add(tok);
      }
    }
  }
  const survivingNeverStored = [...surviving].sort();

  return {
    passed: precisionOk && survivingNeverStored.length === 0,
    sweetenersPrecision,
    sweetenersPrecisionFloor: GATE4_SWEETENERS_PRECISION_FLOOR,
    survivingNeverStored,
  };
}

// ---------------------------------------------------------------------------
// Bootstrap CI on the gate-② delta (informational, non-gating, seeded)
// ---------------------------------------------------------------------------

export interface BootstrapDeltaCI {
  /** Full-sample (no-resample) winner-minus-rules micro-F1 delta. */
  pointDelta: number;
  /** 2.5th percentile of the resampled deltas. */
  lower: number;
  /** 97.5th percentile of the resampled deltas. */
  upper: number;
  iterations: number;
  seed: number;
}

/**
 * A deterministic, seeded bootstrap CI on the gate-② micro-F1 delta (winner −
 * rules) over the JUDGMENT-ROW subset for one field. INFORMATIONAL / NON-GATING.
 * Resamples judgment rows with replacement `iterations` times (seeded
 * `mulberry32`, never Math.random) and reports the 95% percentile interval.
 */
export function bootstrapGate2Delta(
  winnerRecords: TaggedRecord[],
  rulesRecords: TaggedRecord[],
  key: KeyRecord[],
  corpus: CorpusCurrentTags[],
  options: { field: C02Field; iterations?: number; seed?: number; ctx?: C02SamplerContext }
): BootstrapDeltaCI {
  const iterations = options.iterations ?? 1000;
  const seed = options.seed ?? 20260623;
  const { judgmentRow } = partitionKey(key, corpus, options.ctx);
  const winnerById = new Map(winnerRecords.map((r) => [r.id, r]));
  const rulesById = new Map(rulesRecords.map((r) => [r.id, r]));

  const deltaOf = (subset: KeyRecord[]): number =>
    subsetFieldMicroF1(options.field, winnerById, subset) -
    subsetFieldMicroF1(options.field, rulesById, subset);

  const pointDelta = deltaOf(judgmentRow);

  const rng = mulberry32(seed);
  const deltas: number[] = [];
  const n = judgmentRow.length;
  if (n === 0) {
    return { pointDelta, lower: pointDelta, upper: pointDelta, iterations, seed };
  }
  for (let it = 0; it < iterations; it++) {
    const sample: KeyRecord[] = [];
    for (let i = 0; i < n; i++) {
      const idx = Math.floor(rng() * n);
      sample.push(judgmentRow[idx]);
    }
    deltas.push(deltaOf(sample));
  }
  deltas.sort((a, b) => a - b);
  const lower = percentile(deltas, 0.025);
  const upper = percentile(deltas, 0.975);
  return { pointDelta, lower, upper, iterations, seed };
}

/** Nearest-rank percentile of a SORTED array. */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return NaN;
  const rank = Math.min(sorted.length - 1, Math.max(0, Math.ceil(p * sorted.length) - 1));
  return sorted[rank];
}

// ---------------------------------------------------------------------------
// evaluateC02Gates — the entry point
// ---------------------------------------------------------------------------

/**
 * Evaluate all four C02 gates over RAW contestant records.
 *
 * `winnerRecords` / `rulesRecords` are the per-lesson C02 token records (the LLM
 * winner's tags and the COMPUTED rules-baseline from `computeRulesBaseline`);
 * `key` is the gold answer key; `corpus` carries each lesson's CURRENT tags (for
 * the clean-core/judgment-row label). Both contestants are scored internally via
 * `scoreContestant` (no metric math is re-implemented). Gate ② compares the
 * winner against the RULES baseline, not v3.
 *
 * Raw records (not just scores) are required because gates ①/② recompute
 * micro-F1 over key SUBSETS (clean-core / judgment-row) and gate ④ scans the raw
 * predictions for surviving never-stored literals — neither is recoverable from
 * a whole-key ContestantScore.
 */
export function evaluateC02Gates(
  winnerRecords: TaggedRecord[],
  rulesRecords: TaggedRecord[],
  key: KeyRecord[],
  corpus: CorpusCurrentTags[],
  options?: { ctx?: C02SamplerContext; bootstrapIterations?: number; bootstrapSeed?: number }
): C02GateResults {
  const ctx = options?.ctx ?? buildC02SamplerContext();
  const { cleanCore, judgmentRow, labels } = partitionKey(key, corpus, ctx);

  // Score the winner over the FULL key for the per-value gates ③/④ (no new
  // metric math — `scoreContestant` reuses `computeMetrics`).
  const winner = scoreContestant('winner', key, winnerRecords);

  const winnerById = new Map(winnerRecords.map((r) => [r.id, r]));
  const rulesById = new Map(rulesRecords.map((r) => [r.id, r]));

  const gate1 = evaluateGate1(winnerById, rulesById, cleanCore);
  const gate2 = evaluateGate2(winnerById, rulesById, judgmentRow);
  const gate3 = evaluateGate3(winner);
  const gate4 = evaluateGate4(winner, winnerRecords);

  const gate2BootstrapCI = {} as Record<C02Field, BootstrapDeltaCI>;
  for (const field of C02_FIELDS) {
    gate2BootstrapCI[field] = bootstrapGate2Delta(winnerRecords, rulesRecords, key, corpus, {
      field,
      iterations: options?.bootstrapIterations ?? 1000,
      seed: options?.bootstrapSeed ?? 20260623,
      ctx,
    });
  }

  let cleanCount = 0;
  let judgmentCount = 0;
  for (const v of labels.values()) {
    if (v === 'judgment-row') judgmentCount++;
    else cleanCount++;
  }

  return {
    gate1,
    gate2,
    gate3,
    gate4,
    allPassed: gate1.passed && gate2.passed && gate3.passed && gate4.passed,
    gate2BootstrapCI,
    labels: { cleanCore: cleanCount, judgmentRow: judgmentCount },
  };
}

// ---------------------------------------------------------------------------
// Emission — JSON sidecar + markdown C02 scorecard
// ---------------------------------------------------------------------------

export interface C02ScorecardJson {
  generatedAt: string;
  keyLessons: number;
  winningLabel: string;
  gates: C02GateResults;
}

/** The JSON sidecar object for the C02 gate scorecard. */
export function buildC02ScorecardJson(
  winningLabel: string,
  key: KeyRecord[],
  gates: C02GateResults
): C02ScorecardJson {
  return {
    generatedAt: new Date().toISOString(),
    keyLessons: key.length,
    winningLabel,
    gates,
  };
}

function fmtNum(v: number | null): string {
  if (v === null || Number.isNaN(v)) return '—';
  return v.toFixed(3);
}

/**
 * Render the C02 4-gate scorecard as markdown (reuses the existing artifact-write
 * pattern in the CLI). Reporting only — drives the pilot greenlight discussion.
 */
export function renderC02Scorecard(
  winningLabel: string,
  key: KeyRecord[],
  gates: C02GateResults
): string {
  const lines: string[] = [];
  lines.push('# C02 re-tag — 4-gate pilot scorecard');
  lines.push('');
  lines.push(
    `Key lessons: ${key.length} (${gates.labels.cleanCore} clean-core / ` +
      `${gates.labels.judgmentRow} judgment-row). Winning model: \`${winningLabel}\`.`
  );
  lines.push('');
  lines.push(
    `**GREENLIGHT: ${gates.allPassed ? 'ALL FOUR GATES PASS' : 'BLOCKED — a gate failed'}.**`
  );
  lines.push('');

  // Gate 1
  lines.push(`## Gate ① — no clean-core regression: ${gates.gate1.passed ? 'PASS' : 'FAIL'}`);
  lines.push('');
  lines.push(
    'Winner per-field micro-F1 must be ≥ the rules-baseline on the clean-core slice (strict, each field).'
  );
  lines.push('');
  lines.push('| Field | winner | rules |');
  lines.push('| --- | --- | --- |');
  for (const field of C02_FIELDS) {
    const pf = gates.gate1.perField[field];
    lines.push(`| ${field} | ${fmtNum(pf.winner)} | ${fmtNum(pf.rules)} |`);
  }
  lines.push('');

  // Gate 2
  lines.push(
    `## Gate ② — beats rules on judgment rows (+${GATE2_MIN_DELTA}, both fields, tie fails): ${gates.gate2.passed ? 'PASS' : 'FAIL'}`
  );
  lines.push('');
  lines.push('| Field | winner | rules | delta | pass | bootstrap 95% CI |');
  lines.push('| --- | --- | --- | --- | --- | --- |');
  for (const field of C02_FIELDS) {
    const pf = gates.gate2.perField[field];
    const ci = gates.gate2BootstrapCI[field];
    lines.push(
      `| ${field} | ${fmtNum(pf.winner)} | ${fmtNum(pf.rules)} | ${fmtNum(pf.delta)} | ` +
        `${pf.passed ? 'PASS' : 'FAIL'} | [${fmtNum(ci.lower)}, ${fmtNum(ci.upper)}] |`
    );
  }
  lines.push('');
  lines.push('_Bootstrap CI on the gate-② delta is informational / non-gating._');
  lines.push('');

  // Gate 3
  lines.push(
    `## Gate ③ — low false-positive on added specifics (precision ≥ ${GATE3_PRECISION_FLOOR}, absent-rate ≤ ${GATE3_ABSENT_RATE_CEILING}): ${gates.gate3.passed ? 'PASS' : 'FAIL'}`
  );
  lines.push('');
  lines.push(
    `Pooled precision over the ${addedSpecificValues().length} added specifics = ` +
      `${fmtNum(gates.gate3.addedSpecificPrecision)} (tp ${gates.gate3.pooledTp} / fp ${gates.gate3.pooledFp}; singleton FPs counted).`
  );
  lines.push('');
  if (gates.gate3.absentValueViolations.length === 0) {
    lines.push('No never-in-key specific exceeds the absent-value prediction-rate ceiling.');
  } else {
    lines.push('Never-in-key specifics predicted above the ceiling:');
    lines.push('');
    lines.push('| Specific | rate | predictions |');
    lines.push('| --- | --- | --- |');
    for (const v of gates.gate3.absentValueViolations) {
      lines.push(`| ${v.value} | ${v.rate.toFixed(3)} | ${v.predictionCount} |`);
    }
  }
  lines.push('');

  // Gate 4
  lines.push(
    `## Gate ④ — pantry-staple precision (Sweeteners ≥ ${GATE4_SWEETENERS_PRECISION_FLOOR}, no never-stored literal survives): ${gates.gate4.passed ? 'PASS' : 'FAIL'}`
  );
  lines.push('');
  lines.push(`Sweeteners precision = ${fmtNum(gates.gate4.sweetenersPrecision)}.`);
  lines.push('');
  if (gates.gate4.survivingNeverStored.length === 0) {
    lines.push(
      `No never-stored literal (${GATE4_NEVER_STORED_LITERALS.join(' / ')}) survives in any prediction.`
    );
  } else {
    lines.push(
      `⚠️ never-stored literal(s) survived: ${gates.gate4.survivingNeverStored.join(', ')}.`
    );
  }
  lines.push('');

  return `${lines.join('\n')}\n`;
}
