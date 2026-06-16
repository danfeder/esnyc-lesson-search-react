/**
 * Unit tests for the answer-key scoring script (task B3).
 *
 * No network, no DB: pure scoring over small synthetic fixtures. Covered:
 * field token extraction (flat fields, grade_levels as a grade set,
 * academic_concepts subject→value flattening to "Subject: Value" tokens,
 * tolerant of BOTH the answer-key/v3 plain-string-array shape AND the
 * run-record {framework: []} shape), per-field micro-F1 + macro-F1 + per-value
 * recall via scripts/lib/evalMetrics, missing-lesson coverage (scored as
 * all-empty), the three B3 gates, and the markdown/JSON emission.
 */
import { describe, expect, it } from 'vitest';

import {
  SCORED_FIELDS,
  buildScorecardJson,
  evaluateGates,
  extractFieldTokens,
  renderScorecardMarkdown,
  scoreContestant,
  type KeyRecord,
} from './score-answer-key';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** Three key lessons exercising exact / partial / concept-flatten cases. */
const key: KeyRecord[] = [
  {
    id: 'L1',
    activity_type: ['garden'],
    tags: [],
    season_timing: [],
    cultural_responsiveness_features: [],
    cultural_heritage: [],
    academic_integration: ['Math', 'Science'],
    social_emotional_learning: [],
    core_competencies: ['Garden Skills and Related Academic Content'],
    cooking_methods: [],
    observances_holidays: [],
    garden_skills: ['Composting', 'Watering techniques'],
    academic_concepts: { Math: ['Sorting and Categorization'], Science: ['Sensory Exploration'] },
    grade_levels: ['K', '1', '2'],
  },
  {
    id: 'L2',
    activity_type: ['cooking'],
    tags: [],
    season_timing: ['Fall'],
    cultural_responsiveness_features: [],
    cultural_heritage: ['Mexican'],
    academic_integration: ['Math'],
    social_emotional_learning: [],
    core_competencies: [],
    cooking_methods: ['No-cook'],
    observances_holidays: [],
    garden_skills: [],
    academic_concepts: { Math: ['Fractions'] },
    grade_levels: ['3', '4'],
  },
  {
    id: 'L3',
    activity_type: ['garden'],
    tags: [],
    season_timing: [],
    cultural_responsiveness_features: [],
    cultural_heritage: [],
    academic_integration: [],
    social_emotional_learning: [],
    core_competencies: [],
    cooking_methods: [],
    observances_holidays: [],
    garden_skills: ['Composting'],
    academic_concepts: {},
    grade_levels: ['5'],
  },
];

/**
 * A contestant exercising: exact match (L1), partial overlap (L2 mislabels
 * season_timing + misses a garden_skill), missing lesson (L3 absent → scored
 * all-empty), and the run-record {framework: []} academic_concepts shape (L1).
 */
const contestant = [
  {
    id: 'L1',
    activity_type: ['garden'],
    tags: [],
    season_timing: [],
    cultural_responsiveness_features: [],
    cultural_heritage: [],
    academic_integration: ['Math', 'Science'],
    social_emotional_learning: [],
    core_competencies: ['Garden Skills and Related Academic Content'],
    cooking_methods: [],
    observances_holidays: [],
    garden_skills: ['Composting', 'Watering techniques'],
    // run-record shape: subject → { framework, everyday, synonym_pairs }
    academic_concepts: {
      Math: { framework: ['Sorting and Categorization'], everyday: [], synonym_pairs: [] },
      Science: { framework: ['Sensory Exploration'], everyday: [], synonym_pairs: [] },
    },
    grade_levels: ['K', '1', '2'],
  },
  {
    id: 'L2',
    activity_type: ['cooking'],
    tags: [],
    season_timing: ['Winter'], // WRONG (key: Fall) — FP + FN
    cultural_responsiveness_features: [],
    cultural_heritage: ['Mexican'],
    academic_integration: ['Math'],
    social_emotional_learning: [],
    core_competencies: [],
    cooking_methods: ['No-cook'],
    observances_holidays: [],
    garden_skills: [],
    academic_concepts: { Math: ['Fractions'] }, // plain-array shape tolerated
    grade_levels: ['3', '4'],
  },
  // L3 deliberately ABSENT → coverage gap, scored all-empty.
];

// ---------------------------------------------------------------------------
// extractFieldTokens
// ---------------------------------------------------------------------------

describe('extractFieldTokens', () => {
  it('SCORED_FIELDS is the 13 result properties', () => {
    expect(SCORED_FIELDS).toContain('activity_type');
    expect(SCORED_FIELDS).toContain('grade_levels');
    expect(SCORED_FIELDS).toContain('academic_concepts');
    expect(SCORED_FIELDS).toHaveLength(13);
  });

  it('returns flat array values verbatim for flat enum fields', () => {
    expect(extractFieldTokens('activity_type', { activity_type: ['garden'] })).toEqual(['garden']);
    expect(
      extractFieldTokens('garden_skills', { garden_skills: ['Composting', 'Watering'] })
    ).toEqual(['Composting', 'Watering']);
  });

  it('treats grade_levels as a set of grade tokens', () => {
    expect(extractFieldTokens('grade_levels', { grade_levels: ['K', '1', '2'] })).toEqual([
      'K',
      '1',
      '2',
    ]);
  });

  it('returns [] for an absent field, null field, or non-array flat value', () => {
    expect(extractFieldTokens('tags', {})).toEqual([]);
    expect(extractFieldTokens('tags', { tags: null })).toEqual([]);
    expect(extractFieldTokens('grade_levels', {})).toEqual([]);
    expect(extractFieldTokens('activity_type', { activity_type: 'garden' })).toEqual([]);
  });

  it('drops non-string elements from a flat array', () => {
    expect(extractFieldTokens('tags', { tags: ['ok', 3, null, 'fine'] })).toEqual(['ok', 'fine']);
  });

  it('flattens academic_concepts plain-array shape to "Subject: Value" tokens', () => {
    expect(
      extractFieldTokens('academic_concepts', {
        academic_concepts: { Math: ['Fractions'], Science: ['Photosynthesis'] },
      })
    ).toEqual(['Math: Fractions', 'Science: Photosynthesis']);
  });

  it('flattens academic_concepts run-record {framework:[]} shape too', () => {
    expect(
      extractFieldTokens('academic_concepts', {
        academic_concepts: {
          Math: { framework: ['Fractions'], everyday: ['halves'], synonym_pairs: [] },
        },
      })
    ).toEqual(['Math: Fractions']);
  });

  it('returns [] for empty or absent academic_concepts', () => {
    expect(extractFieldTokens('academic_concepts', { academic_concepts: {} })).toEqual([]);
    expect(extractFieldTokens('academic_concepts', {})).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// scoreContestant
// ---------------------------------------------------------------------------

describe('scoreContestant', () => {
  const score = scoreContestant('test', key, contestant);

  it('reports coverage: lessons present vs missing (missing scored all-empty)', () => {
    expect(score.coverage.keyLessons).toBe(3);
    expect(score.coverage.present).toBe(2);
    expect(score.coverage.missing).toEqual(['L3']);
  });

  it('gives a perfect field F1 where every occurrence matches', () => {
    // activity_type: L1 garden, L2 cooking, L3(missing→empty vs key garden) →
    // garden has a FN on L3, so F1 < 1. Use cultural_heritage which is exact on
    // present lessons and empty on the missing one (no FN).
    const ch = score.fields.cultural_heritage;
    expect(ch.f1).toBeCloseTo(1, 10);
  });

  it('penalizes a mislabeled value (season_timing Winter vs Fall) with FP+FN', () => {
    const st = score.fields.season_timing;
    // key has Fall on L2 only; contestant predicted Winter on L2 → 0 TP, 1 FP, 1 FN.
    expect(st.f1).toBe(0);
  });

  it('penalizes a missing lesson as all-empty (garden FN on absent L3)', () => {
    // garden truth = L1, L3; contestant has L1 garden but L3 absent → 1 FN.
    const at = score.fields.activity_type;
    const garden = at.perValue.find((p) => p.value === 'garden');
    expect(garden?.fn).toBe(1);
    expect(garden?.recall).toBeCloseTo(0.5, 10);
  });

  it('scores academic_concepts on flattened "Subject: Value" tokens across shapes', () => {
    const ac = score.fields.academic_concepts;
    // key tokens: L1 {Math:Sorting…, Science:Sensory…}, L2 {Math:Fractions}, L3 {}
    // contestant matches all present ones; only L3's are missing (L3 has none) →
    // perfect on present lessons.
    expect(ac.f1).toBeCloseTo(1, 10);
    const frac = ac.perValue.find((p) => p.value === 'Math: Fractions');
    expect(frac?.tp).toBe(1);
  });

  it('macroF1 is the mean of defined per-field micro-F1s', () => {
    const defined = SCORED_FIELDS.map((f) => score.fields[f].f1).filter(
      (v): v is number => v !== null && !Number.isNaN(v)
    );
    const mean = defined.reduce((s, v) => s + v, 0) / defined.length;
    expect(score.macroF1).toBeCloseTo(mean, 10);
  });

  it('exposes per-value recall per field', () => {
    const at = score.fields.activity_type;
    const cooking = at.perValue.find((p) => p.value === 'cooking');
    expect(cooking?.recall).toBeCloseTo(1, 10); // L2 cooking matched
  });
});

// ---------------------------------------------------------------------------
// evaluateGates (the three B3 gates)
// ---------------------------------------------------------------------------

describe('evaluateGates', () => {
  const v3 = scoreContestant('v3', key, contestant);
  const winner = scoreContestant('winner', key, contestant);

  it('gate 1 PASSES when the winner per-field F1 >= v3 on every field', () => {
    const gates = evaluateGates(winner, v3);
    expect(gates.perFieldVsV3.passed).toBe(true);
    expect(gates.perFieldVsV3.failingFields).toEqual([]);
  });

  it('gate 1 FAILS and lists fields where the winner is below v3', () => {
    // Make a weaker winner: drop L1 cultural_heritage-adjacent — easier: mutate
    // one field's F1 by giving the winner a wrong activity_type on L1.
    const weakContestant = contestant.map((r) =>
      r.id === 'L1' ? { ...r, activity_type: ['cooking'] } : r
    );
    const weak = scoreContestant('weak', key, weakContestant);
    const gates = evaluateGates(weak, v3);
    expect(gates.perFieldVsV3.passed).toBe(false);
    expect(gates.perFieldVsV3.failingFields.map((f) => f.field)).toContain('activity_type');
  });

  it('gate 2 reports macroF1 vs the 0.7 floor', () => {
    const gates = evaluateGates(winner, v3);
    expect(gates.macroF1.value).toBeCloseTo(winner.macroF1, 10);
    expect(gates.macroF1.passed).toBe(winner.macroF1 >= 0.7);
  });

  it('gate 3 lists per-value recall failures below 0.5 (winning contestant)', () => {
    const gates = evaluateGates(winner, v3);
    // garden recall = 0.5 (>= floor, not a failure); nothing below 0.5 here.
    const belowHalf = gates.recall.failingValues.filter((f) => f.recall < 0.5);
    expect(belowHalf).toEqual(gates.recall.failingValues); // all listed are < 0.5
    expect(gates.recall.passed).toBe(gates.recall.failingValues.length === 0);
  });
});

// ---------------------------------------------------------------------------
// Emission
// ---------------------------------------------------------------------------

describe('scorecard emission', () => {
  const v3 = scoreContestant('v3', key, contestant);
  const fable = scoreContestant('fable', key, contestant);

  it('renders a markdown scorecard with a per-field table per contestant', () => {
    const md = renderScorecardMarkdown([v3, fable], 'fable', v3);
    expect(md).toContain('# Stage 2 re-tag — answer-key scorecard');
    expect(md).toContain('v3');
    expect(md).toContain('fable');
    expect(md).toContain('activity_type');
    expect(md).toContain('academic_concepts');
    // The three gates are each labeled and have a PASS/FAIL verdict.
    expect(md).toMatch(/Gate 1.*per-field F1/i);
    expect(md).toMatch(/Gate 2.*macro/i);
    expect(md).toMatch(/Gate 3.*recall/i);
    expect(md).toMatch(/PASS|FAIL/);
  });

  it('builds a JSON sidecar carrying the raw per-field numbers + gates', () => {
    const json = buildScorecardJson([v3, fable], 'fable', v3);
    expect(json.contestants.map((c) => c.label)).toEqual(['v3', 'fable']);
    expect(json.winningLabel).toBe('fable');
    expect(json.contestants[0].fields.activity_type.f1).toBe(v3.fields.activity_type.f1);
    expect(json.gates.perFieldVsV3).toBeDefined();
    expect(json.gates.macroF1).toBeDefined();
    expect(json.gates.recall).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Gate-3 amendment (user ruling 2026-06-12 Session 8): the recall floor only
// GATES values whose answer-key support (truthCount) is >= 2. Support-1
// singletons are NOT gated, but ARE reported in an informational section.
// ---------------------------------------------------------------------------

/**
 * Four key lessons over `garden_skills` exercising controlled support counts:
 *   - "Composting": L1 + L2  → support 2 (GATING)
 *   - "Mulching":   L1       → support 1 (singleton)
 *   - "Watering":   L3       → support 1 (singleton)
 *   - "Pruning":    L4       → support 1 (singleton)
 * Every other scored field is empty everywhere (so they contribute no values).
 */
function gardenOnlyKeyLesson(id: string, gardenSkills: string[]): KeyRecord {
  return {
    id,
    activity_type: [],
    tags: [],
    season_timing: [],
    cultural_responsiveness_features: [],
    cultural_heritage: [],
    academic_integration: [],
    social_emotional_learning: [],
    core_competencies: [],
    cooking_methods: [],
    observances_holidays: [],
    garden_skills: gardenSkills,
    academic_concepts: {},
    grade_levels: [],
  };
}

const gateKey: KeyRecord[] = [
  gardenOnlyKeyLesson('L1', ['Composting', 'Mulching']),
  gardenOnlyKeyLesson('L2', ['Composting']),
  gardenOnlyKeyLesson('L3', ['Watering']),
  gardenOnlyKeyLesson('L4', ['Pruning']),
];

/**
 * Contestant that:
 *   - misses "Composting" entirely (recall 0, support 2) → MUST fail Gate 3
 *   - hits singletons "Mulching" (L1) + "Pruning" (L4)
 *   - misses singleton "Watering" (L3, recall 0, support 1) → reported, NOT gated
 */
const gateContestantRecords = [
  gardenOnlyKeyLesson('L1', ['Mulching']),
  gardenOnlyKeyLesson('L2', []),
  gardenOnlyKeyLesson('L3', []),
  gardenOnlyKeyLesson('L4', ['Pruning']),
];

describe('Gate 3 amendment — recall floor gates support>=2 values only', () => {
  const gateV3 = scoreContestant('v3', gateKey, gateContestantRecords);
  const gateWinner = scoreContestant('winner', gateKey, gateContestantRecords);
  const gates = evaluateGates(gateWinner, gateV3);

  it('(a) a support-1 value with recall 0 does NOT fail Gate 3', () => {
    // "Watering" has support 1 and recall 0 in the contestant — it must NOT
    // appear among the gating recall failures.
    const watering = gates.recall.failingValues.find((f) => f.value === 'Watering');
    expect(watering).toBeUndefined();
  });

  it('(b) a support-2 value with recall < 0.5 DOES fail Gate 3', () => {
    const composting = gates.recall.failingValues.find((f) => f.value === 'Composting');
    expect(composting).toBeDefined();
    expect(composting?.recall).toBeLessThan(0.5);
    expect(gates.recall.passed).toBe(false);
  });

  it('every gating recall failure has answer-key support >= 2', () => {
    for (const f of gates.recall.failingValues) {
      expect(f.support).toBeGreaterThanOrEqual(2);
    }
  });

  it('(c) the singleton section reports hits and misses for the winner', () => {
    // 3 singletons total (Mulching, Watering, Pruning); 2 hit (Mulching, Pruning),
    // 1 missed (Watering on L3).
    expect(gates.singletons.total).toBe(3);
    expect(gates.singletons.hits).toBe(2);
    const wateringMiss = gates.singletons.misses.find((m) => m.value === 'Watering');
    expect(wateringMiss).toBeDefined();
    expect(wateringMiss?.field).toBe('garden_skills');
    expect(wateringMiss?.lessonId).toBe('L3');
    expect(gates.singletons.misses).toHaveLength(1);
  });

  it('renders the amended Gate 3 rule and a singleton section in the markdown', () => {
    const md = renderScorecardMarkdown([gateV3, gateWinner], 'winner', gateV3);
    // Gate section states the amended rule explicitly (support >= 2).
    expect(md).toMatch(/support\s*[>≥]=?\s*2/i);
    // A singleton informational section renders with the hit count + missed value.
    expect(md).toMatch(/singleton/i);
    expect(md).toContain('2/3');
    expect(md).toContain('Watering');
    expect(md).toContain('L3');
  });

  it('the JSON sidecar carries the singleton section', () => {
    const json = buildScorecardJson([gateV3, gateWinner], 'winner', gateV3);
    expect(json.gates.singletons.total).toBe(3);
    expect(json.gates.singletons.hits).toBe(2);
    expect(json.gates.singletons.misses[0].value).toBe('Watering');
  });
});

// ---------------------------------------------------------------------------
// valueKeyLessonIds invariant: a lesson contributes its id AT MOST ONCE per
// value, even when a key cell repeats a truth token (e.g. grade_levels
// ['K','K','1']). computeMetrics counts truthCount once per LESSON, so the
// documented invariant "Length === PerValueMetrics.truthCount" must hold.
// ---------------------------------------------------------------------------

describe('valueKeyLessonIds dedup (repeated token in a key cell)', () => {
  it('records a lesson id at most once per value when the key cell repeats a token', () => {
    const repeatedKey: KeyRecord[] = [
      {
        id: 'L1',
        activity_type: [],
        tags: [],
        season_timing: [],
        cultural_responsiveness_features: [],
        cultural_heritage: [],
        academic_integration: [],
        social_emotional_learning: [],
        core_competencies: [],
        cooking_methods: [],
        observances_holidays: [],
        garden_skills: [],
        academic_concepts: {},
        // The key cell repeats 'K' — one LESSON, two occurrences.
        grade_levels: ['K', 'K', '1'],
      },
    ];
    const score = scoreContestant('test', repeatedKey, repeatedKey);
    const grade = score.fields.grade_levels;
    const k = grade.perValue.find((p) => p.value === 'K');
    expect(k?.truthCount).toBe(1);
    // Invariant: valueKeyLessonIds[value].length === truthCount.
    expect(grade.valueKeyLessonIds['K']).toHaveLength(1);
    expect(grade.valueKeyLessonIds['K']).toEqual(['L1']);
  });
});
