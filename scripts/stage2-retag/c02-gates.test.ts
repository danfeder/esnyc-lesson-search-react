/**
 * Unit tests for the C02 4-gate scoring + computed rules-baseline (P1.6).
 *
 * No network, no DB: pure scoring over small synthetic fixtures. The C02 gate
 * logic is ADDITIVE to the shipped 13-field `evaluateGates` — these tests only
 * exercise the new C02-specific surface (`c02-gates.ts`). The existing
 * `score-answer-key.test.ts` proves the 13-field gates still pass unchanged.
 *
 * Design source of truth: design §4 Q5 (the 4 gates + thresholds + singleton
 * rule) and Q6 (the clean-core/judgment-row label coupling).
 */
import { describe, expect, it } from 'vitest';

import { type KeyRecord, type TaggedRecord } from './score-answer-key';
import {
  C02_FIELDS,
  GATE2_MIN_DELTA,
  gate2DeltaPasses,
  GATE3_PRECISION_FLOOR,
  GATE3_ABSENT_RATE_CEILING,
  GATE4_SWEETENERS_PRECISION_FLOOR,
  GATE4_NEVER_STORED_LITERALS,
  bootstrapGate2Delta,
  computeRulesBaseline,
  evaluateC02Gates,
  labelLessons,
  type C02GateResults,
  type CorpusCurrentTags,
} from './c02-gates';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

/** A minimal key/contestant row carrying only the two C02 fields. */
function row(id: string, cooking_skills: string[], main_ingredients: string[]): TaggedRecord {
  return { id, cooking_skills, main_ingredients };
}

/** A corpus current-tags row (what the lesson holds today). */
function corpusRow(
  id: string,
  cooking_skills: string[],
  main_ingredients: string[],
  content_text = 'body'
): CorpusCurrentTags {
  return { id, title: id, content_text, cooking_skills, main_ingredients };
}

// ---------------------------------------------------------------------------
// labelLessons — clean-core vs judgment-row (Q6)
// ---------------------------------------------------------------------------

describe('labelLessons (Q6 clean-core/judgment-row coupling)', () => {
  it('labels a vague-cooking-tag lesson as judgment-row', () => {
    const corpus = [corpusRow('V', ['Basic Skills'], ['Beets'])];
    const key: KeyRecord[] = [row('V', ['Knife skills'], ['Beets', 'Root vegetables'])];
    const labels = labelLessons(key, corpus);
    expect(labels.get('V')).toBe('judgment-row');
  });

  it('labels a Herbs & Aromatics lesson as judgment-row', () => {
    const corpus = [corpusRow('H', ['Mixing & stirring'], ['Herbs & Aromatics'])];
    const key: KeyRecord[] = [row('H', ['Mixing & stirring'], ['Fresh herbs'])];
    const labels = labelLessons(key, corpus);
    expect(labels.get('H')).toBe('judgment-row');
  });

  it('labels an added-specific-in-gold lesson as judgment-row', () => {
    // Current tags floor to the GROUP only; the gold key ADDS a specific the
    // floor would never have produced (Tahini under Nuts & seeds).
    const corpus = [corpusRow('A', ['Mixing & stirring'], ['Nuts & seeds'])];
    const key: KeyRecord[] = [row('A', ['Mixing & stirring'], ['Nuts & seeds', 'Tahini'])];
    const labels = labelLessons(key, corpus);
    expect(labels.get('A')).toBe('judgment-row');
  });

  it('labels a clean lesson (floor-reproducible gold, no hard-case signal) as clean-core', () => {
    // Gold == floor over current tags; no vague/herbs/orphan signal.
    const corpus = [corpusRow('C', ['Mixing & stirring'], ['Beets', 'Root vegetables'])];
    const key: KeyRecord[] = [row('C', ['Mixing & stirring'], ['Beets', 'Root vegetables'])];
    const labels = labelLessons(key, corpus);
    expect(labels.get('C')).toBe('clean-core');
  });
});

// ---------------------------------------------------------------------------
// computeRulesBaseline — the real floor over current tags (no LLM)
// ---------------------------------------------------------------------------

describe('computeRulesBaseline (the COMPUTED floor contestant)', () => {
  it('reflects the real alias-floor: ["Mixing"] -> ["Mixing & stirring"]', () => {
    const corpus = [corpusRow('M', ['Mixing'], [])];
    const baseline = computeRulesBaseline(corpus);
    const rec = baseline.find((r) => r.id === 'M');
    expect(rec?.cooking_skills).toEqual(['Mixing & stirring']);
  });

  it('appends the parent group for an emitted specific (R9 reconcile)', () => {
    const corpus = [corpusRow('P', [], ['Beets'])];
    const baseline = computeRulesBaseline(corpus);
    const rec = baseline.find((r) => r.id === 'P');
    expect(rec?.main_ingredients).toContain('Beets');
    expect(rec?.main_ingredients).toContain('Root vegetables');
  });
});

// ---------------------------------------------------------------------------
// Gate 1 — no clean-core regression (strict, per-field)
// ---------------------------------------------------------------------------

describe('Gate 1 — no clean-core regression', () => {
  // One clean-core lesson; gold = ['Beets','Root vegetables'] + ['Mixing & stirring'].
  const corpus = [corpusRow('C', ['Mixing & stirring'], ['Beets', 'Root vegetables'])];
  const key: KeyRecord[] = [row('C', ['Mixing & stirring'], ['Beets', 'Root vegetables'])];

  it('PASSES when the winner matches the rules-baseline on clean-core', () => {
    const rules = computeRulesBaseline(corpus);
    const winner = [row('C', ['Mixing & stirring'], ['Beets', 'Root vegetables'])];
    const res = evaluateC02Gates(winner, rules, key, corpus);
    expect(res.gate1.passed).toBe(true);
  });

  it('FAILS when the winner regresses below the rules-baseline on a clean-core field', () => {
    const rules = computeRulesBaseline(corpus);
    // Winner drops the correct ingredients on the clean-core row -> lower F1.
    const winner = [row('C', ['Mixing & stirring'], [])];
    const res = evaluateC02Gates(winner, rules, key, corpus);
    expect(res.gate1.passed).toBe(false);
    expect(res.gate1.failingFields.map((f) => f.field)).toContain('main_ingredients');
  });

  it('FAILS when the clean-core stratum is empty (no-regression unverifiable on 0 rows)', () => {
    // Every key row is a judgment row (vague cooking tag + Herbs & Aromatics
    // current tag), so the clean-core partition is empty. Gate ① must fail
    // closed rather than vacuously pass on a 0-vs-0 micro-F1 comparison.
    const jCorpus = [corpusRow('J', ['Basic Skills'], ['Herbs & Aromatics'])];
    const jKey: KeyRecord[] = [row('J', ['Knife skills'], ['Fresh herbs'])];
    const jWinner = [row('J', ['Knife skills'], ['Fresh herbs'])];
    const res = evaluateC02Gates(jWinner, computeRulesBaseline(jCorpus), jKey, jCorpus);
    expect(res.gate1.cleanCoreCount).toBe(0);
    expect(res.gate1.passed).toBe(false);
  });

  it('FAILS when the clean-core carries no gold C02 tags at all (measures nothing)', () => {
    // A clean-core row exists but its gold tags are empty in both fields, so the
    // regression check is 0-vs-0 (vacuous). Gate ① must fail closed even though
    // cleanCoreCount > 0.
    const eCorpus = [corpusRow('E', [], [])];
    const eKey: KeyRecord[] = [row('E', [], [])];
    const eWinner = [row('E', [], [])];
    const res = evaluateC02Gates(eWinner, computeRulesBaseline(eCorpus), eKey, eCorpus);
    expect(res.gate1.cleanCoreCount).toBe(1);
    expect(res.gate1.passed).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Gate 2 — beats rules on judgment rows (+0.05, both fields, tie fails)
// ---------------------------------------------------------------------------

describe('Gate 2 — beats rules on judgment rows', () => {
  // A judgment row: current tags = Herbs & Aromatics; gold splits to Fresh herbs +
  // an added cooking skill the floor can't produce.
  const corpus = [
    corpusRow('J', ['Basic Skills'], ['Herbs & Aromatics']),
    corpusRow('J2', ['Basic Skills'], ['Herbs & Aromatics']),
  ];
  const key: KeyRecord[] = [
    row('J', ['Knife skills'], ['Fresh herbs']),
    row('J2', ['Knife skills'], ['Fresh herbs']),
  ];

  it('PASSES when the winner beats rules by >= +0.05 on BOTH fields', () => {
    const rules = computeRulesBaseline(corpus); // floor cannot produce the gold values
    const winner = [
      row('J', ['Knife skills'], ['Fresh herbs']),
      row('J2', ['Knife skills'], ['Fresh herbs']),
    ];
    const res = evaluateC02Gates(winner, rules, key, corpus);
    expect(res.gate2.passed).toBe(true);
    expect(res.gate2.perField.cooking_skills.delta).toBeGreaterThanOrEqual(GATE2_MIN_DELTA);
    expect(res.gate2.perField.main_ingredients.delta).toBeGreaterThanOrEqual(GATE2_MIN_DELTA);
  });

  it('FAILS on a tie (winner delta exactly 0 on a field)', () => {
    // Make the winner score IDENTICALLY to the rules baseline on the judgment
    // rows -> delta == 0 -> must fail (a tie fails).
    const rules = computeRulesBaseline(corpus);
    const rulesById = new Map(rules.map((r) => [r.id, r]));
    const winner = key.map((k) => {
      const r = rulesById.get(k.id)!;
      return row(k.id, r.cooking_skills as string[], r.main_ingredients as string[]);
    });
    const res = evaluateC02Gates(winner, rules, key, corpus);
    expect(res.gate2.passed).toBe(false);
  });

  it('FAILS when only one field beats rules (both must pass)', () => {
    const rules = computeRulesBaseline(corpus);
    const rulesById = new Map(rules.map((r) => [r.id, r]));
    // Winner beats rules on main_ingredients but ties rules on cooking_skills.
    const winner = key.map((k) => {
      const r = rulesById.get(k.id)!;
      return row(k.id, r.cooking_skills as string[], k.main_ingredients as string[]);
    });
    const res = evaluateC02Gates(winner, rules, key, corpus);
    expect(res.gate2.passed).toBe(false);
  });

  it('passes a mathematically-exact +0.05 delta despite IEEE-754 error, tie still fails', () => {
    // These differences are mathematically +0.05 but render < 0.05 in float;
    // a bare `delta >= 0.05` would spuriously fail them.
    expect(0.95 - 0.9).toBeLessThan(GATE2_MIN_DELTA);
    expect(0.85 - 0.8).toBeLessThan(GATE2_MIN_DELTA);
    expect(gate2DeltaPasses(0.95 - 0.9)).toBe(true);
    expect(gate2DeltaPasses(0.85 - 0.8)).toBe(true);
    expect(gate2DeltaPasses(0.55 - 0.5)).toBe(true);
    // The tie-fails intent is preserved, and genuinely-below deltas still fail.
    expect(gate2DeltaPasses(0)).toBe(false);
    expect(gate2DeltaPasses(0.04)).toBe(false);
    expect(gate2DeltaPasses(0.0499)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Gate 3 — low false-positive on added specifics
// ---------------------------------------------------------------------------

describe('Gate 3 — low false-positive on added specifics', () => {
  // Two lessons whose gold carries a real specific (Tahini) supported in the key.
  const corpus = [
    corpusRow('T1', [], ['Nuts & seeds']),
    corpusRow('T2', [], ['Nuts & seeds']),
    corpusRow('T3', [], ['Nuts & seeds']),
  ];
  const key: KeyRecord[] = [
    row('T1', [], ['Nuts & seeds', 'Tahini']),
    row('T2', [], ['Nuts & seeds', 'Tahini']),
    row('T3', [], ['Nuts & seeds']),
  ];

  it('PASSES when added-specific precision is high and absent-specifics are rarely predicted', () => {
    const winner = [
      row('T1', [], ['Nuts & seeds', 'Tahini']),
      row('T2', [], ['Nuts & seeds', 'Tahini']),
      row('T3', [], ['Nuts & seeds']),
    ];
    const res = evaluateC02Gates(winner, computeRulesBaseline(corpus), key, corpus);
    expect(res.gate3.passed).toBe(true);
    expect(res.gate3.addedSpecificPrecision).toBeGreaterThanOrEqual(GATE3_PRECISION_FLOOR);
  });

  it('FAILS when the winner predicts ZERO added specifics (must attempt the two-level tier)', () => {
    // Winner emits only the group tag, never the added specific (Tahini) the gold
    // key carries -> null precision. Gate ③ must fail closed, not pass vacuously:
    // a model that never attempts specifics defeats the two-level objective and
    // would slip through (gates ①/② use aggregate F1, not specifics recall).
    const winner = [
      row('T1', [], ['Nuts & seeds']),
      row('T2', [], ['Nuts & seeds']),
      row('T3', [], ['Nuts & seeds']),
    ];
    const res = evaluateC02Gates(winner, computeRulesBaseline(corpus), key, corpus);
    expect(res.gate3.passed).toBe(false);
    expect(res.gate3.addedSpecificPrecision).toBeNull();
  });

  it('FAILS via a SINGLETON over-prediction: one wrong specific drags precision below 0.7', () => {
    // Winner predicts Tahini correctly twice (tp=2) but ALSO predicts a single
    // wrong "Sunflower butter" once (fp=1) where the key never carries it.
    // Pooled precision over added specifics = 2/(2+1) = 0.667 < 0.7 -> FAIL,
    // and a singleton FP must COUNT (singleton rule, FP side).
    const winner = [
      row('T1', [], ['Nuts & seeds', 'Tahini']),
      row('T2', [], ['Nuts & seeds', 'Tahini', 'Sunflower butter']),
      row('T3', [], ['Nuts & seeds']),
    ];
    const res = evaluateC02Gates(winner, computeRulesBaseline(corpus), key, corpus);
    expect(res.gate3.passed).toBe(false);
    expect(res.gate3.addedSpecificPrecision).toBeLessThan(GATE3_PRECISION_FLOOR);
  });

  it('FAILS when a never-in-key specific is predicted above the absent-value rate ceiling', () => {
    // "Peanut butter" never appears in the key (truthCount 0) but the winner
    // predicts it on 2 of 3 rows -> rate 0.667 > 5% ceiling -> FAIL.
    const winner = [
      row('T1', [], ['Nuts & seeds', 'Tahini', 'Peanut butter']),
      row('T2', [], ['Nuts & seeds', 'Tahini', 'Peanut butter']),
      row('T3', [], ['Nuts & seeds']),
    ];
    const res: C02GateResults = evaluateC02Gates(winner, computeRulesBaseline(corpus), key, corpus);
    expect(res.gate3.passed).toBe(false);
    expect(res.gate3.absentValueViolations.length).toBeGreaterThan(0);
    expect(res.gate3.absentRateCeiling).toBe(GATE3_ABSENT_RATE_CEILING);
    // The violating value's rate genuinely exceeds the ceiling.
    expect(res.gate3.absentValueViolations[0].rate).toBeGreaterThan(GATE3_ABSENT_RATE_CEILING);
  });
});

// ---------------------------------------------------------------------------
// Gate 4 — pantry-staple precision (Sweeteners >= 0.8 + no never-stored literal)
// ---------------------------------------------------------------------------

describe('Gate 4 — pantry-staple precision', () => {
  const corpus = [
    corpusRow('S1', [], ['Sweeteners']),
    corpusRow('S2', [], ['Sweeteners']),
    corpusRow('S3', [], ['Sweeteners']),
    corpusRow('S4', [], ['Sweeteners']),
    corpusRow('S5', [], []),
  ];
  const key: KeyRecord[] = [
    row('S1', [], ['Sweeteners']),
    row('S2', [], ['Sweeteners']),
    row('S3', [], ['Sweeteners']),
    row('S4', [], ['Sweeteners']),
    row('S5', [], []),
  ];

  it('PASSES when Sweeteners precision >= 0.8 and no never-stored literal survives', () => {
    const winner = [
      row('S1', [], ['Sweeteners']),
      row('S2', [], ['Sweeteners']),
      row('S3', [], ['Sweeteners']),
      row('S4', [], ['Sweeteners']),
      row('S5', [], []),
    ];
    const res = evaluateC02Gates(winner, computeRulesBaseline(corpus), key, corpus);
    expect(res.gate4.passed).toBe(true);
    expect(res.gate4.sweetenersPrecision).toBeGreaterThanOrEqual(GATE4_SWEETENERS_PRECISION_FLOOR);
  });

  it('FAILS when the winner never predicts Sweeteners (null precision = vacuous, fail closed)', () => {
    // The set-cover gold guarantees Sweeteners >= 2x; a winner predicting none
    // has null Sweeteners precision -> must fail closed, mirroring gate ③.
    const winner = [
      row('S1', [], []),
      row('S2', [], []),
      row('S3', [], []),
      row('S4', [], []),
      row('S5', [], []),
    ];
    const res = evaluateC02Gates(winner, computeRulesBaseline(corpus), key, corpus);
    expect(res.gate4.passed).toBe(false);
    expect(res.gate4.survivingNeverStored).toEqual([]); // fails on precision, not a literal
  });

  it('FAILS when Sweeteners precision drops below 0.8', () => {
    // 4 true + 2 false predictions -> precision 4/6 = 0.667 < 0.8.
    const winner = [
      row('S1', [], ['Sweeteners']),
      row('S2', [], ['Sweeteners']),
      row('S3', [], ['Sweeteners']),
      row('S4', [], ['Sweeteners']),
      row('S5', [], ['Sweeteners']),
    ];
    // add one more wrong prediction by re-using a different row absent in truth
    const corpus2 = [...corpus, corpusRow('S6', [], [])];
    const key2: KeyRecord[] = [...key, row('S6', [], [])];
    const winner2 = [...winner, row('S6', [], ['Sweeteners'])];
    const res = evaluateC02Gates(winner2, computeRulesBaseline(corpus2), key2, corpus2);
    expect(res.gate4.passed).toBe(false);
    expect(res.gate4.sweetenersPrecision).toBeLessThan(GATE4_SWEETENERS_PRECISION_FLOOR);
  });

  it('FAILS when a never-stored literal (Salt) survives in any prediction', () => {
    const winner = [
      row('S1', [], ['Sweeteners']),
      row('S2', [], ['Sweeteners']),
      row('S3', [], ['Sweeteners']),
      row('S4', [], ['Sweeteners']),
      row('S5', [], ['Salt']),
    ];
    const res = evaluateC02Gates(winner, computeRulesBaseline(corpus), key, corpus);
    expect(res.gate4.passed).toBe(false);
    expect(res.gate4.survivingNeverStored).toContain('Salt');
  });

  it('FAILS on a case/space variant of a never-stored literal (case-insensitive)', () => {
    const winner = [
      row('S1', [], ['Sweeteners']),
      row('S2', [], ['Sweeteners']),
      row('S3', [], ['Sweeteners']),
      row('S4', [], ['Sweeteners']),
      row('S5', [], ['salt']), // lowercase variant must still be caught by gate 4
    ];
    const res = evaluateC02Gates(winner, computeRulesBaseline(corpus), key, corpus);
    expect(res.gate4.passed).toBe(false);
    expect(res.gate4.survivingNeverStored).toContain('salt');
  });

  it('exposes the locked never-stored literal set (Salt / Oil / Soy sauce)', () => {
    expect(GATE4_NEVER_STORED_LITERALS).toEqual(['Salt', 'Oil', 'Soy sauce']);
  });
});

// ---------------------------------------------------------------------------
// Bootstrap CI (informational, deterministic, seeded)
// ---------------------------------------------------------------------------

describe('bootstrapGate2Delta (informational, non-gating, deterministic)', () => {
  // Six judgment rows with HETEROGENEOUS per-row winner correctness so the
  // resampled delta actually varies across draws (otherwise the CI is degenerate
  // and a seed change can't move it — the test would be vacuous).
  const corpus = [
    corpusRow('J1', ['Basic Skills'], ['Herbs & Aromatics']),
    corpusRow('J2', ['Basic Skills'], ['Herbs & Aromatics']),
    corpusRow('J3', ['Basic Skills'], ['Herbs & Aromatics']),
    corpusRow('J4', ['Basic Skills'], ['Herbs & Aromatics']),
    corpusRow('J5', ['Basic Skills'], ['Herbs & Aromatics']),
    corpusRow('J6', ['Basic Skills'], ['Herbs & Aromatics']),
  ];
  const key: KeyRecord[] = corpus.map((c) => row(c.id, ['Knife skills'], ['Fresh herbs']));
  // Winner gets J1-J3 right (delta 1) but J4-J6 wrong (delta 0 — predicts a
  // value neither the gold nor the floor carries), so different resamples give
  // different micro-F1 deltas.
  const winner = [
    row('J1', ['Knife skills'], ['Fresh herbs']),
    row('J2', ['Knife skills'], ['Fresh herbs']),
    row('J3', ['Knife skills'], ['Fresh herbs']),
    row('J4', ['Sautéing & stir-frying'], ['Beans & legumes']),
    row('J5', ['Sautéing & stir-frying'], ['Beans & legumes']),
    row('J6', ['Sautéing & stir-frying'], ['Beans & legumes']),
  ];
  const rules = computeRulesBaseline(corpus);

  it('is deterministic under a fixed seed (same seed -> identical CI)', () => {
    const a = bootstrapGate2Delta(winner, rules, key, corpus, {
      field: 'main_ingredients',
      iterations: 200,
      seed: 12345,
    });
    const b = bootstrapGate2Delta(winner, rules, key, corpus, {
      field: 'main_ingredients',
      iterations: 200,
      seed: 12345,
    });
    expect(a).toEqual(b);
  });

  it('produces a NON-degenerate CI that brackets the point delta (proves it resamples)', () => {
    // A non-resampling stub would return [pointDelta, pointDelta]. With
    // heterogeneous per-row deltas the percentile interval must STRICTLY spread
    // around the point estimate — lower < pointDelta < upper.
    const ci = bootstrapGate2Delta(winner, rules, key, corpus, {
      field: 'main_ingredients',
      iterations: 500,
      seed: 7,
    });
    expect(ci.lower).toBeLessThan(ci.pointDelta);
    expect(ci.upper).toBeGreaterThan(ci.pointDelta);
  });

  it('shifts the CI when the resampling seed changes the draw distribution', () => {
    // Across a spread of seeds the percentile bounds are not all identical (the
    // draws genuinely vary). A fixed/no-op resampler would give one constant CI.
    const seeds = [1, 2, 3, 4, 5, 6, 7, 8];
    const bounds = seeds.map((seed) => {
      const ci = bootstrapGate2Delta(winner, rules, key, corpus, {
        field: 'main_ingredients',
        iterations: 200,
        seed,
      });
      return `${ci.lower}:${ci.upper}`;
    });
    expect(new Set(bounds).size).toBeGreaterThan(1);
  });
});

// ---------------------------------------------------------------------------
// Sanity: the two C02 fields are exactly cooking_skills + main_ingredients.
// ---------------------------------------------------------------------------

describe('C02_FIELDS', () => {
  it('scores ONLY the two C02 fields', () => {
    expect(C02_FIELDS).toEqual(['cooking_skills', 'main_ingredients']);
  });
});
