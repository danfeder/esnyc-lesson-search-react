/**
 * Tests for the Stage 2 answer-key sampler + labeling worksheet (task B1, TDD).
 *
 * Coverage:
 *   - mulberry32 PRNG determinism (same seed → same stream)
 *   - body-length quartile boundaries + stratum keys
 *   - stratified sampling: determinism (same seed → same ids), total honored,
 *     proportional allocation, small/empty strata, adversarial exclusion
 *   - adversarial loading + validation (unknown id → hard error; no overlap)
 *   - sample-record assembly (provenance header + per-lesson fields)
 *   - worksheet rendering (structural assertions: vocab inlined, per-field
 *     slots, grades row, DRAFT/CONFIRMED columns, body NOT inlined)
 *   - worksheet → final.jsonl parse round-trip on a fixture
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { loadVocab, loadC02Manifest, c02MainIngredientsValues } from './vocab';
import {
  SAMPLER_VERSION,
  bodyLengthQuartiles,
  buildC02Sample,
  buildSampleRecords,
  loadAdversarial,
  loadCoverageKeywords,
  loadExclusions,
  mulberry32,
  parseArgs,
  parseFilledWorksheet,
  parseWorksheetToFinal,
  predictMembership,
  renderWorksheet,
  runC02,
  stratifiedSample,
  stratumKey,
  type CorpusRecordForSampling,
} from './sample-answer-key';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

function loadFixtureCorpus(): CorpusRecordForSampling[] {
  const text = readFileSync(
    path.join(MODULE_DIR, '__fixtures__/answer-key-corpus.fixture.jsonl'),
    'utf8'
  );
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as CorpusRecordForSampling);
}

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(12345);
    const b = mulberry32(12345);
    const streamA = [a(), a(), a(), a(), a()];
    const streamB = [b(), b(), b(), b(), b()];
    expect(streamA).toEqual(streamB);
  });

  it('produces different streams for different seeds', () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toEqual(b());
  });

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(99);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('bodyLengthQuartiles', () => {
  it('returns three ascending cut points', () => {
    const records: CorpusRecordForSampling[] = Array.from({ length: 100 }, (_, i) => ({
      id: `l${i}`,
      title: `t${i}`,
      content_text: 'x'.repeat(i + 1),
    })) as CorpusRecordForSampling[];
    const q = bodyLengthQuartiles(records);
    expect(q.q25).toBeLessThan(q.q50);
    expect(q.q50).toBeLessThan(q.q75);
  });

  it('handles a single record without throwing', () => {
    const q = bodyLengthQuartiles([
      { id: 'a', title: 'a', content_text: 'short' } as CorpusRecordForSampling,
    ]);
    expect(q.q25).toBeGreaterThan(0);
  });
});

describe('stratumKey', () => {
  const q = { q25: 10, q50: 20, q75: 30 };

  it('combines a sorted activity_type label with a body-length quartile', () => {
    const rec = {
      id: 'a',
      title: 'a',
      content_text: 'x'.repeat(5),
      activity_type: ['garden', 'cooking'],
    } as CorpusRecordForSampling;
    expect(stratumKey(rec, q)).toBe('cooking|garden::Q1');
  });

  it('labels an empty/null activity_type as (none)', () => {
    const rec = {
      id: 'a',
      title: 'a',
      content_text: 'x'.repeat(25),
      activity_type: [],
    } as CorpusRecordForSampling;
    expect(stratumKey(rec, q)).toBe('(none)::Q3');
  });

  it('assigns the top quartile for the longest bodies', () => {
    const rec = {
      id: 'a',
      title: 'a',
      content_text: 'x'.repeat(50),
      activity_type: ['cooking'],
    } as CorpusRecordForSampling;
    expect(stratumKey(rec, q)).toBe('cooking::Q4');
  });
});

describe('stratifiedSample', () => {
  const corpus = loadFixtureCorpus();

  it('is deterministic: same seed → same ids', () => {
    const a = stratifiedSample(corpus, 8, 424242, new Set());
    const b = stratifiedSample(corpus, 8, 424242, new Set());
    expect(a.map((r) => r.id)).toEqual(b.map((r) => r.id));
  });

  it('produces a different draw for a different seed', () => {
    const a = stratifiedSample(corpus, 8, 1, new Set()).map((r) => r.id);
    const b = stratifiedSample(corpus, 8, 2, new Set()).map((r) => r.id);
    expect(a).not.toEqual(b);
  });

  it('honors the requested total (when the corpus is large enough)', () => {
    const sample = stratifiedSample(corpus, 8, 7, new Set());
    expect(sample).toHaveLength(8);
  });

  it('never returns duplicate ids', () => {
    const sample = stratifiedSample(corpus, 10, 5, new Set());
    const ids = sample.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('excludes the adversarial ids from the draw', () => {
    const excluded = new Set([corpus[0].id, corpus[1].id]);
    const sample = stratifiedSample(corpus, 8, 9, excluded);
    for (const r of sample) {
      expect(excluded.has(r.id)).toBe(false);
    }
  });

  it('caps at the available (non-excluded) population when total exceeds it', () => {
    const tiny = corpus.slice(0, 3);
    const sample = stratifiedSample(tiny, 40, 3, new Set());
    expect(sample).toHaveLength(3);
  });
});

describe('loadAdversarial', () => {
  const corpus = loadFixtureCorpus();
  const corpusIds = new Set(corpus.map((r) => r.id));

  // These two cases read the gitignored artifacts/corpus.jsonl (real corpus id set);
  // skip in clean checkouts (CI) where the artifact is absent.
  const CORPUS_PATH = path.join(MODULE_DIR, 'artifacts/corpus.jsonl');
  const hasCorpus = existsSync(CORPUS_PATH);

  it.skipIf(!hasCorpus)('loads and validates against a corpus id set', () => {
    // The real adversarial file references real-corpus ids; validate it
    // against the REAL corpus id set so the checked-in file is exercised.
    const realCorpusIds = new Set(
      readFileSync(CORPUS_PATH, 'utf8')
        .split('\n')
        .filter((l) => l.trim() !== '')
        .map((l) => (JSON.parse(l) as { id: string }).id)
    );
    const entries = loadAdversarial(
      path.join(MODULE_DIR, 'data/answer-key-adversarial.json'),
      realCorpusIds
    );
    expect(entries.length).toBeGreaterThanOrEqual(20);
    for (const e of entries) {
      expect(realCorpusIds.has(e.id)).toBe(true);
      expect(e.title.length).toBeGreaterThan(0);
      expect(e.reason.length).toBeGreaterThan(0);
      expect(e.class.length).toBeGreaterThan(0);
    }
  });

  it.skipIf(!hasCorpus)('meets the required adversarial-class floors', () => {
    const realCorpusIds = new Set(
      readFileSync(CORPUS_PATH, 'utf8')
        .split('\n')
        .filter((l) => l.trim() !== '')
        .map((l) => (JSON.parse(l) as { id: string }).id)
    );
    const entries = loadAdversarial(
      path.join(MODULE_DIR, 'data/answer-key-adversarial.json'),
      realCorpusIds
    );
    const byClass = new Map<string, number>();
    for (const e of entries) byClass.set(e.class, (byClass.get(e.class) ?? 0) + 1);
    expect(byClass.get('heritage-ban') ?? 0).toBeGreaterThanOrEqual(2);
    expect(byClass.get('table-marker-body') ?? 0).toBeGreaterThanOrEqual(2);
    expect(byClass.get('r4-concepts-integration-conflict') ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('throws a hard error when an adversarial id is not in the corpus', () => {
    expect(() =>
      loadAdversarial(
        path.join(MODULE_DIR, '__fixtures__/answer-key-adversarial-badid.fixture.json'),
        corpusIds
      )
    ).toThrow(/not in the corpus/i);
  });
});

describe('buildSampleRecords', () => {
  const corpus = loadFixtureCorpus();

  it('emits a provenance header record first, then one record per lesson', () => {
    const adversarial = [
      { id: corpus[0].id, title: corpus[0].title, reason: 'r', class: 'test-class' },
    ];
    const random = stratifiedSample(corpus, 3, 11, new Set([corpus[0].id]));
    const records = buildSampleRecords({ random, adversarial, corpus, seed: 11 });
    expect(records[0].kind).toBe('header');
    const header = records[0] as Extract<(typeof records)[number], { kind: 'header' }>;
    expect(header.seed).toBe(11);
    expect(header.sampler_version).toBe(SAMPLER_VERSION);
    const lessonRecords = records.slice(1);
    expect(lessonRecords).toHaveLength(random.length + adversarial.length);
  });

  it('tags each lesson record with its bucket + carries body and current tags', () => {
    const adversarial = [
      { id: corpus[0].id, title: corpus[0].title, reason: 'r', class: 'test-class' },
    ];
    const random = stratifiedSample(corpus, 2, 21, new Set([corpus[0].id]));
    const records = buildSampleRecords({ random, adversarial, corpus, seed: 21 });
    const lessons = records.slice(1) as Extract<(typeof records)[number], { kind: 'lesson' }>[];
    const adv = lessons.find((r) => r.id === corpus[0].id);
    expect(adv?.bucket).toBe('adversarial');
    expect(adv?.adversarial_class).toBe('test-class');
    const rand = lessons.find((r) => r.bucket === 'random');
    expect(rand?.stratum).toBeTruthy();
    expect(rand?.content_text.length).toBeGreaterThan(0);
    // current tags object carries the re-tag fields
    expect(rand?.current_tags).toHaveProperty('activity_type');
  });
});

describe('renderWorksheet', () => {
  const corpus = loadFixtureCorpus();
  const vocab = loadVocab();

  function render(): string {
    const adversarial = [
      { id: corpus[0].id, title: corpus[0].title, reason: 'demo reason', class: 'demo-class' },
    ];
    const random = stratifiedSample(corpus, 2, 33, new Set([corpus[0].id]));
    const records = buildSampleRecords({ random, adversarial, corpus, seed: 33 });
    return renderWorksheet(records, vocab);
  }

  it('inlines each multi-value field vocab list once at the top', () => {
    const md = render();
    // The canonical vocab section appears before the first lesson section.
    const vocabIdx = md.indexOf('## Canonical vocabulary');
    const firstLessonIdx = md.indexOf('### Lesson 1');
    expect(vocabIdx).toBeGreaterThan(-1);
    expect(firstLessonIdx).toBeGreaterThan(vocabIdx);
    // A representative canonical value renders (rendered from the module, not
    // hand-copied): activity_type includes 'craft'.
    expect(md).toContain('craft');
  });

  it('renders a per-field label slot for the 12 re-tag fields plus a grades row', () => {
    const md = render();
    for (const field of vocab ? Object.values(vocab).map((v) => v.label) : []) {
      expect(md).toContain(field);
    }
    expect(md.toLowerCase()).toContain('grades the document');
  });

  it('exposes DRAFT and CONFIRMED slots and references the body by id (not inlined)', () => {
    const md = render();
    expect(md).toContain('DRAFT');
    expect(md).toContain('CONFIRMED');
    // Body is referenced by id, never inlined: the fixture body text must not
    // appear in the worksheet.
    expect(md).not.toContain(corpus[0].content_text);
  });

  it('labels each lesson section with id and bucket', () => {
    const md = render();
    expect(md).toContain(corpus[0].id);
    expect(md).toContain('adversarial');
    expect(md).toContain('random');
  });
});

describe('parseFilledWorksheet round-trip', () => {
  it('parses a filled worksheet back into final.jsonl records', () => {
    const filled = readFileSync(
      path.join(MODULE_DIR, '__fixtures__/answer-key-worksheet-filled.fixture.md'),
      'utf8'
    );
    const records = parseFilledWorksheet(filled);
    expect(records.length).toBeGreaterThanOrEqual(1);
    const first = records[0];
    expect(first.id).toBe('lesson-fixture-a');
    // CONFIRMED values win; multi-value fields parse to arrays.
    expect(first.activity_type).toEqual(['cooking', 'craft']);
    expect(first.grade_levels).toEqual(['K', '1']);
    // an empty CONFIRMED slot parses to an empty array
    expect(first.cultural_heritage).toEqual([]);
    // subject-keyed academic_concepts parses to an object
    expect(first.academic_concepts).toEqual({ Science: ['Plant Parts'] });
  });

  it('falls back to the DRAFT value when CONFIRMED is left blank', () => {
    const filled = readFileSync(
      path.join(MODULE_DIR, '__fixtures__/answer-key-worksheet-filled.fixture.md'),
      'utf8'
    );
    const records = parseFilledWorksheet(filled);
    const withFallback = records.find((r) => r.id === 'lesson-fixture-b');
    expect(withFallback).toBeDefined();
    // lesson-b leaves season_timing CONFIRMED blank but DRAFT = Fall
    expect(withFallback?.season_timing).toEqual(['Fall']);
  });
});

describe('parseWorksheetToFinal converter', () => {
  it('writes answer-key.final.jsonl from a filled worksheet', () => {
    const outDir = path.join(MODULE_DIR, '__fixtures__/.tmp-final');
    const { finalPath, recordCount } = parseWorksheetToFinal(
      path.join(MODULE_DIR, '__fixtures__/answer-key-worksheet-filled.fixture.md'),
      outDir
    );
    expect(recordCount).toBeGreaterThanOrEqual(2);
    const written = readFileSync(finalPath, 'utf8')
      .split('\n')
      .filter((l) => l.trim() !== '')
      .map((l) => JSON.parse(l) as { id: string });
    expect(written[0].id).toBe('lesson-fixture-a');
    rmSync(outDir, { recursive: true, force: true });
  });
});

describe('loadExclusions', () => {
  it('loads the checked-in fixture exclusions list', () => {
    const ids = loadExclusions(
      path.join(MODULE_DIR, '__fixtures__/answer-key-exclusions.fixture.json')
    );
    expect(ids.has('lesson-fixture-excluded')).toBe(true);
    expect(ids.size).toBe(1);
  });

  it('loads the real PR-6b exclusions list (3 user-verdict removals)', () => {
    const ids = loadExclusions(path.join(MODULE_DIR, 'data/answer-key-exclusions.json'));
    expect(ids.size).toBe(3);
    expect(ids.has('13vpumvgEgzO7jUWdEHamEjXWwOxvQ_KFHaeMVUKvQDo')).toBe(true);
    expect(ids.has('1Ufs0zXqshdkXE4J0V8fOPWxqi42T2IlFdsei0ESm7PE')).toBe(true);
    expect(ids.has('1q1icjk5Pgdtqp1EFwU7vNmd07SzrnWfeAYTYqIs59ag')).toBe(true);
  });
});

describe('parseFilledWorksheet exclusions', () => {
  it('skips excluded ids when an exclusion set is supplied', () => {
    const filled = readFileSync(
      path.join(MODULE_DIR, '__fixtures__/answer-key-worksheet-filled.fixture.md'),
      'utf8'
    );
    const excluded = new Set(['lesson-fixture-excluded']);
    const all = parseFilledWorksheet(filled);
    const kept = parseFilledWorksheet(filled, excluded);
    // The full parse sees all three; the excluded parse drops exactly one.
    expect(all.map((r) => r.id)).toContain('lesson-fixture-excluded');
    expect(kept.map((r) => r.id)).not.toContain('lesson-fixture-excluded');
    expect(kept).toHaveLength(all.length - 1);
  });

  it('is a no-op when no exclusion set is supplied (back-compat)', () => {
    const filled = readFileSync(
      path.join(MODULE_DIR, '__fixtures__/answer-key-worksheet-filled.fixture.md'),
      'utf8'
    );
    const records = parseFilledWorksheet(filled);
    expect(records.map((r) => r.id)).toContain('lesson-fixture-excluded');
  });
});

describe('parseWorksheetToFinal exclusions', () => {
  it('honors the exclusions file and reports skipped ids + final count', () => {
    const outDir = path.join(MODULE_DIR, '__fixtures__/.tmp-final-excl');
    const result = parseWorksheetToFinal(
      path.join(MODULE_DIR, '__fixtures__/answer-key-worksheet-filled.fixture.md'),
      outDir,
      path.join(MODULE_DIR, '__fixtures__/answer-key-exclusions.fixture.json')
    );
    // Fixture worksheet has 3 lessons; 1 is excluded → 2 survive.
    expect(result.recordCount).toBe(2);
    expect(result.skippedIds).toEqual(['lesson-fixture-excluded']);
    const written = readFileSync(result.finalPath, 'utf8')
      .split('\n')
      .filter((l) => l.trim() !== '')
      .map((l) => JSON.parse(l) as { id: string });
    expect(written.map((r) => r.id)).not.toContain('lesson-fixture-excluded');
    expect(written).toHaveLength(2);
    rmSync(outDir, { recursive: true, force: true });
  });
});

describe('parseArgs', () => {
  it('accepts --parse', () => {
    expect(parseArgs(['--parse', '/tmp/w.md']).parse).toBe('/tmp/w.md');
  });

  it('defaults seed + out-dir and never enables help', () => {
    const a = parseArgs([]);
    expect(a.help).toBe(false);
    expect(typeof a.seed).toBe('number');
    expect(a.outDir).toBeUndefined();
  });

  it('accepts --seed and --out-dir overrides', () => {
    const a = parseArgs(['--seed', '777', '--out-dir', '/tmp/x']);
    expect(a.seed).toBe(777);
    expect(a.outDir).toBe('/tmp/x');
  });

  it('parses --help', () => {
    expect(parseArgs(['--help']).help).toBe(true);
    expect(parseArgs(['-h']).help).toBe(true);
  });

  it('rejects an unknown flag', () => {
    expect(() => parseArgs(['--nope'])).toThrow(/unknown flag/i);
  });

  it('rejects a non-integer seed', () => {
    expect(() => parseArgs(['--seed', 'abc'])).toThrow(/integer/i);
  });
});

// ---------------------------------------------------------------------------
// C02 3-layer answer-key sampler (P1.5) — hard-case + set-cover + clean-core.
// The real on-disk corpus.jsonl lacks cooking_skills/main_ingredients (the
// export added them after that file was generated), so these tests use SYNTHETIC
// fixtures that carry the two arrays (grounding: execution-status Session 4).
// ---------------------------------------------------------------------------

const c02Manifest = loadC02Manifest();
const COOKING_VALUES = c02Manifest.cookingSkills;
const INGREDIENT_VALUES = c02MainIngredientsValues(c02Manifest);
const ALL_VALUE_COUNT = COOKING_VALUES.length + INGREDIENT_VALUES.length; // 93

let synthCounter = 0;
function synthRecord(
  over: Partial<CorpusRecordForSampling> & { id?: string }
): CorpusRecordForSampling {
  const id = over.id ?? `c02-synth-${synthCounter++}`;
  return {
    id,
    title: `Synthetic ${id}`,
    content_text: over.content_text ?? 'x'.repeat(200),
    activity_type: over.activity_type ?? ['cooking'],
    tags: null,
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
    cooking_skills: over.cooking_skills ?? [],
    main_ingredients: over.main_ingredients ?? [],
  } as CorpusRecordForSampling;
}

/**
 * A body string guaranteed NOT to match any coverage-keyword pattern (so a
 * lesson's coverage comes ONLY from its current tags unless we say otherwise).
 * Uses a vocabulary that no pattern in c02-coverage-keywords.json matches.
 */
const INERT_BODY = 'qqq zzz vvv inert filler text with no culinary keyword '.repeat(6);

/**
 * Build a synthetic corpus where EVERY canonical value appears as a current tag
 * on >=2 distinct DENSELY-tagged lessons — mirroring real lessons, which carry
 * many ingredients/skills at once, so ~40 multi-value lessons can cover all 186
 * (value × 2) slots well within the 70-lesson budget (single-tag lessons could
 * not). Deterministic. `excludeValue`, when set, omits that value's carriers so
 * a test can control its candidate count precisely.
 */
function buildFullCoverageCorpus(opts?: { excludeValue?: string }): CorpusRecordForSampling[] {
  const exclude = opts?.excludeValue;
  const records: CorpusRecordForSampling[] = [];
  const cooking = COOKING_VALUES.filter((v) => v !== exclude);
  const ingredients = INGREDIENT_VALUES.filter((v) => v !== exclude);

  // Pack values into dense "recipe" lessons, two passes (so every value lands on
  // >=2 distinct lessons). Chunk sizes are coprime-ish across passes so the same
  // value never pairs with the identical neighbors twice (closer to real data).
  const chunk = <T>(arr: T[], size: number, offset: number): T[][] => {
    const rotated = [...arr.slice(offset), ...arr.slice(0, offset)];
    const out: T[][] = [];
    for (let i = 0; i < rotated.length; i += size) out.push(rotated.slice(i, i + size));
    return out;
  };

  for (const pass of [0, 1]) {
    for (const group of chunk(cooking, 5, pass * 2)) {
      records.push(synthRecord({ cooking_skills: group, content_text: INERT_BODY }));
    }
    for (const group of chunk(ingredients, 6, pass * 3)) {
      records.push(synthRecord({ main_ingredients: group, content_text: INERT_BODY }));
    }
  }

  // Clean-core padding (no C02-relevant current tags, inert body) so the corpus
  // exceeds 70 and the clean-core layer has lessons to draw from.
  for (let i = 0; i < 120; i++) {
    records.push(
      synthRecord({
        activity_type: i % 2 === 0 ? ['cooking'] : ['garden'],
        content_text: INERT_BODY + 'y'.repeat((i % 4) * 40),
      })
    );
  }
  return records;
}

describe('loadCoverageKeywords', () => {
  it('loads the committed coverage-keyword patterns incl. the grounding seeds', () => {
    const kw = loadCoverageKeywords();
    // The grounding-required seeds (execution-status Session 4 / design §4 Q4).
    expect(kw.has('Grilling')).toBe(true);
    expect(kw.has('Fermenting')).toBe(true);
    expect(kw.has('Wrapping & rolling')).toBe(true);
    expect(kw.has('Melons')).toBe(true);
    expect(kw.has('Stone fruits')).toBe(true);
    expect(kw.has('Peanut butter')).toBe(true);
    expect(kw.has('Fennel')).toBe(true);
    // A pattern matches the body case-insensitively.
    expect(kw.get('Grilling')!.test('We will GRILL the corn')).toBe(true);
    expect(kw.get('Melons')!.test('slice the watermelon')).toBe(true);
    expect(kw.get('Grilling')!.test('no relevant body here')).toBe(false);
  });

  it('only maps real canonical values (no stray keys)', () => {
    const kw = loadCoverageKeywords();
    const canon = new Set([...COOKING_VALUES, ...INGREDIENT_VALUES]);
    for (const key of kw.keys()) {
      expect(canon.has(key)).toBe(true);
    }
  });
});

describe('predictMembership (reuses the real C02 floor)', () => {
  it('folds a current cooking_skills alias to its canonical', () => {
    // "Mixing" folds to "Mixing & stirring" via the case-insensitive floor.
    const rec = synthRecord({ cooking_skills: ['Mixing'] });
    const pred = predictMembership(rec);
    expect(pred.cooking).toContain('Mixing & stirring');
  });

  it('predicts a specific AND its parent group (R9 parent-reconcile)', () => {
    const rec = synthRecord({ main_ingredients: ['Tomatoes'] });
    const pred = predictMembership(rec);
    expect(pred.ingredients).toContain('Tomatoes');
    expect(pred.ingredients).toContain('Nightshades');
  });

  it('keeps a canonical group as itself and de-dupes', () => {
    const rec = synthRecord({ main_ingredients: ['Nightshades', 'Tomatoes', 'Tomatoes'] });
    const pred = predictMembership(rec);
    // de-duped, parent present once.
    expect(pred.ingredients.filter((v) => v === 'Nightshades')).toHaveLength(1);
  });

  it('returns empty arrays for a clean-core lesson with no C02 tags', () => {
    const rec = synthRecord({ cooking_skills: [], main_ingredients: [] });
    const pred = predictMembership(rec);
    expect(pred.cooking).toEqual([]);
    expect(pred.ingredients).toEqual([]);
  });
});

describe('buildC02Sample — coverage guarantee', () => {
  it('covers every one of the 93 canonical values >=2x', () => {
    const corpus = buildFullCoverageCorpus();
    const result = buildC02Sample(corpus, { seed: 4242 });
    expect(result.warnings).toEqual([]);
    for (const v of COOKING_VALUES) {
      expect(result.coverage.cooking[v] ?? 0).toBeGreaterThanOrEqual(2);
    }
    for (const v of INGREDIENT_VALUES) {
      expect(result.coverage.ingredients[v] ?? 0).toBeGreaterThanOrEqual(2);
    }
    expect(ALL_VALUE_COUNT).toBe(93);
  });

  it('uses BOTH a floor carrier and a keyword-only candidate to reach 2 for a value with exactly one of each', () => {
    // Full dense coverage for the other 92 values, with Grilling REMOVED from
    // every carrier, then add exactly: one Grilling floor carrier (current tag,
    // inert body) + one Grilling keyword-only candidate (body matches /grill/,
    // no current tag). Neither alone reaches 2 → the set-cover must pick BOTH.
    const base = buildFullCoverageCorpus({ excludeValue: 'Grilling' });
    const floorCarrier = synthRecord({
      id: 'grill-floor',
      cooking_skills: ['Grilling'],
      content_text: INERT_BODY,
    });
    const keywordOnly = synthRecord({
      id: 'grill-keyword',
      cooking_skills: [],
      content_text: 'today we grill the vegetables over the open flame '.repeat(6),
    });
    const corpus = [floorCarrier, keywordOnly, ...base];
    const result = buildC02Sample(corpus, { seed: 7 });
    const chosenIds = new Set(result.selected.map((s) => s.id));
    // Both must be selected — neither alone reaches 2.
    expect(chosenIds.has('grill-floor')).toBe(true);
    expect(chosenIds.has('grill-keyword')).toBe(true);
    expect(result.coverage.cooking['Grilling']).toBeGreaterThanOrEqual(2);
    expect(result.warnings).toEqual([]);
  });
});

describe('buildC02Sample — WARN path for an under-covered value', () => {
  it('lands an unreachable value on the WARN list and does not crash', () => {
    // Full dense coverage for everything EXCEPT Grilling, for which only ONE
    // candidate exists anywhere (one floor carrier, inert body so no keyword
    // candidate). Grilling cannot reach 2 → it must WARN, in isolation.
    const base = buildFullCoverageCorpus({ excludeValue: 'Grilling' });
    const lone = synthRecord({
      id: 'lonely-grill',
      cooking_skills: ['Grilling'],
      content_text: INERT_BODY,
    });
    const corpus = [lone, ...base];
    const result = buildC02Sample(corpus, { seed: 99 });
    expect(result.warnings.some((w) => w.includes('Grilling'))).toBe(true);
    // The under-covered value reached at most 1, and the sampler still reports
    // honest coverage (never silently claims 2).
    expect(result.coverage.cooking['Grilling'] ?? 0).toBeLessThan(2);
    // Every OTHER value still reached >=2 (the WARN is isolated).
    for (const v of COOKING_VALUES) {
      if (v === 'Grilling') continue;
      expect(result.coverage.cooking[v] ?? 0).toBeGreaterThanOrEqual(2);
    }
  });
});

describe('buildC02Sample — determinism', () => {
  it('same seed -> identical selected id set + layer assignment', () => {
    const corpus = buildFullCoverageCorpus();
    const a = buildC02Sample(corpus, { seed: 314 });
    const b = buildC02Sample(corpus, { seed: 314 });
    expect(a.selected.map((s) => `${s.id}:${s.layer}`)).toEqual(
      b.selected.map((s) => `${s.id}:${s.layer}`)
    );
  });

  it('a different seed may produce a different selection', () => {
    const corpus = buildFullCoverageCorpus();
    const a = buildC02Sample(corpus, { seed: 1 }).selected.map((s) => s.id);
    const b = buildC02Sample(corpus, { seed: 2 }).selected.map((s) => s.id);
    // Not guaranteed different in general, but with this corpus the clean-core
    // draw differs across seeds.
    expect(a).not.toEqual(b);
  });
});

describe('buildC02Sample — layer sizes', () => {
  it('selects exactly 70 on a corpus larger than 70', () => {
    const corpus = buildFullCoverageCorpus();
    const result = buildC02Sample(corpus, { seed: 55 });
    expect(result.selected).toHaveLength(70);
    const layers = result.selected.map((s) => s.layer);
    const counts = {
      hard: layers.filter((l) => l === 'hard-case').length,
      coverage: layers.filter((l) => l === 'coverage').length,
      clean: layers.filter((l) => l === 'clean-core').length,
    };
    expect(counts.hard + counts.coverage + counts.clean).toBe(70);
    // hard-case is capped at <= 20.
    expect(counts.hard).toBeLessThanOrEqual(20);
    expect(result.layerSizes.hardCase).toBe(counts.hard);
    expect(result.layerSizes.coverage).toBe(counts.coverage);
    expect(result.layerSizes.cleanCore).toBe(counts.clean);
  });

  it('takes the whole corpus when it is smaller than 70', () => {
    const small = buildFullCoverageCorpus().slice(0, 40);
    const result = buildC02Sample(small, { seed: 5 });
    expect(result.selected.length).toBeLessThanOrEqual(40);
    // every selected id is unique
    const ids = result.selected.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('buildC02Sample — hard-case classes', () => {
  it('picks vague cooking tags, the Herbs & Aromatics catch-all, and orphan/drop foods', () => {
    const vague = synthRecord({ id: 'hc-vague', cooking_skills: ['Basic Skills'] });
    const herbs = synthRecord({ id: 'hc-herbs', main_ingredients: ['Herbs & Aromatics'] });
    const orphan = synthRecord({ id: 'hc-orphan', main_ingredients: ['Lavender'] }); // in drops
    const fill = buildFullCoverageCorpus();
    const corpus = [vague, herbs, orphan, ...fill];
    const result = buildC02Sample(corpus, { seed: 22 });
    const byId = new Map(result.selected.map((s) => [s.id, s]));
    expect(byId.get('hc-vague')?.layer).toBe('hard-case');
    expect(byId.get('hc-vague')?.hardCaseClass).toBe('vague-cooking');
    expect(byId.get('hc-herbs')?.layer).toBe('hard-case');
    expect(byId.get('hc-herbs')?.hardCaseClass).toBe('herbs-aromatics');
    expect(byId.get('hc-orphan')?.layer).toBe('hard-case');
    expect(byId.get('hc-orphan')?.hardCaseClass).toBe('orphan-food');
  });
});

describe('parseArgs --c02', () => {
  it('defaults c02 to false', () => {
    expect(parseArgs([]).c02).toBe(false);
  });

  it('enables c02 mode with --c02', () => {
    expect(parseArgs(['--c02']).c02).toBe(true);
  });

  it('combines --c02 with --seed', () => {
    const a = parseArgs(['--c02', '--seed', '4242']);
    expect(a.c02).toBe(true);
    expect(a.seed).toBe(4242);
  });
});

describe('runC02 artifact writing', () => {
  it('writes the c02 sample JSONL + manifest with layer sizes and coverage', () => {
    const outDir = path.join(MODULE_DIR, '__fixtures__/.tmp-c02');
    const corpusPath = path.join(outDir, 'corpus.jsonl');
    // Build a dense full-coverage corpus and persist it as the C02 mode corpus.
    const corpus = buildFullCoverageCorpus();
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(outDir, { recursive: true });
    writeFileSync(corpusPath, corpus.map((r) => JSON.stringify(r)).join('\n') + '\n');

    const result = runC02({ seed: 4242, outDir, corpusPath });
    expect(result.selectedCount).toBe(70);
    expect(result.warningCount).toBe(0);
    expect(
      result.layerSizes.hardCase + result.layerSizes.coverage + result.layerSizes.cleanCore
    ).toBe(70);

    const written = readFileSync(result.samplePath, 'utf8')
      .split('\n')
      .filter((l) => l.trim() !== '')
      .map((l) => JSON.parse(l) as { id: string; layer: string });
    expect(written).toHaveLength(70);
    expect(new Set(written.map((w) => w.layer))).toEqual(new Set(['coverage', 'clean-core']));

    const manifest = JSON.parse(readFileSync(result.manifestPath, 'utf8')) as {
      coverage: { cooking: Record<string, number>; ingredients: Record<string, number> };
      warnings: string[];
    };
    expect(manifest.warnings).toEqual([]);
    for (const v of COOKING_VALUES) {
      expect(manifest.coverage.cooking[v] ?? 0).toBeGreaterThanOrEqual(2);
    }
    rmSync(outDir, { recursive: true, force: true });
  });
});
