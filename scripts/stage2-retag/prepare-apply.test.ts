/**
 * Unit tests for prepare-apply.ts (PR B task B5b) — the apply-artifact emitter.
 *
 * Turns the full-run output + corpus snapshot into three local, review-only
 * artifacts (no DB access, no migration file): staging data (SQL + CSV), a
 * DRAFT apply migration (.sql text, snapshot-then-dual-write, idempotent), and
 * a plain-language spot-check worksheet (~50-100 lessons across three buckets).
 *
 * Shares the committed __fixtures__/ corpus + run-output pair with
 * generate-diff-report.test.ts / validate-output.test.ts. After record
 * selection the comparable lessons are: lesson-roots, lesson-soup (latest =
 * repair record, cooking_methods stovetop), lesson-weird (latest = repair,
 * Zod-failed but has output). lesson-missing / lesson-errored are dropped
 * (no usable output); lesson-ghost has no corpus row.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  buildStagingRows,
  renderStagingCsv,
  renderStagingSql,
  buildApplyMigrationSql,
  sampleSpotCheck,
  isEdgeCase,
  renderSpotCheckWorksheet,
  sqlTextLiteral,
  sqlTextArrayLiteral,
  sqlJsonbLiteral,
  parseArgs,
  type StagingRow,
} from './prepare-apply';
import { buildDiffReport, parseCorpusRecords } from './generate-diff-report';
import { parseRunRecords } from './run-retag';
import { loadVocab } from './vocab';

const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '__fixtures__');
const corpusText = readFileSync(path.join(FIXTURES_DIR, 'corpus.fixture.jsonl'), 'utf8');
const runText = readFileSync(path.join(FIXTURES_DIR, 'run-output.fixture.jsonl'), 'utf8');

const vocab = loadVocab();
const corpus = parseCorpusRecords(corpusText);
const runRecords = parseRunRecords(runText);

function staging(excluded: Set<string> = new Set()): StagingRow[] {
  return buildStagingRows(corpus, runRecords, vocab, excluded);
}

function row(id: string, excluded: Set<string> = new Set()): StagingRow {
  const found = staging(excluded).find((r) => r.id === id);
  if (!found) throw new Error(`no staging row for ${id}`);
  return found;
}

// ---------------------------------------------------------------------------
// SQL literal helpers
// ---------------------------------------------------------------------------

describe('sqlTextLiteral', () => {
  it('wraps a plain string in single quotes', () => {
    expect(sqlTextLiteral('Winter')).toBe(`'Winter'`);
  });

  it('doubles embedded single quotes', () => {
    expect(sqlTextLiteral("O'Brien")).toBe(`'O''Brien'`);
  });
});

describe('sqlTextArrayLiteral', () => {
  it('renders an empty array as a typed empty array', () => {
    expect(sqlTextArrayLiteral([])).toBe(`ARRAY[]::text[]`);
  });

  it('renders values as a quoted text[] constructor', () => {
    expect(sqlTextArrayLiteral(['Winter', 'Fall'])).toBe(`ARRAY['Winter','Fall']::text[]`);
  });

  it('escapes quotes inside array values', () => {
    expect(sqlTextArrayLiteral(["O'Brien"])).toBe(`ARRAY['O''Brien']::text[]`);
  });
});

describe('sqlJsonbLiteral', () => {
  it('renders an object as a quoted jsonb cast', () => {
    expect(sqlJsonbLiteral({ Science: ['Plant Parts'] })).toBe(
      `'{"Science":["Plant Parts"]}'::jsonb`
    );
  });

  it('escapes single quotes inside JSON string values', () => {
    expect(sqlJsonbLiteral({ a: ["O'B"] })).toBe(`'{"a":["O''B"]}'::jsonb`);
  });
});

// ---------------------------------------------------------------------------
// Staging rows
// ---------------------------------------------------------------------------

describe('buildStagingRows', () => {
  it('produces one row per compared lesson, dropping no-output lessons', () => {
    const rows = staging();
    const ids = rows.map((r) => r.id).sort();
    expect(ids).toEqual(['lesson-roots', 'lesson-soup', 'lesson-weird']);
  });

  it('drops excluded ids before building rows', () => {
    const rows = staging(new Set(['lesson-soup']));
    expect(rows.map((r) => r.id).sort()).toEqual(['lesson-roots', 'lesson-weird']);
  });

  it('carries the latest (repair) record values, not the failed main record', () => {
    // lesson-soup's main record had cooking_methods ["stovetop cooking"]; the
    // later repair record corrected it to ["stovetop"].
    expect(row('lesson-soup').fields.cooking_methods).toEqual(['stovetop']);
  });

  it('exposes every flat field plus grade_levels', () => {
    const r = row('lesson-roots');
    expect(r.fields.season_timing).toEqual(['Winter']);
    expect(r.fields.garden_skills).toEqual(['Observing plant parts', 'Identifying plants']);
    expect(r.gradeLevels).toEqual(['PK']);
  });

  it('flattens academic_concepts run shape to the subject→framework-list JSONB shape', () => {
    // Run output stores {subject:{framework,everyday,synonym_pairs}}; the DB
    // metadata->academicConcepts is subject→list (the framework concepts).
    expect(row('lesson-roots').academicConcepts).toEqual({
      Science: ['Plant Parts', 'Life Cycles'],
    });
  });

  it('omits subjects whose framework list is empty', () => {
    expect(row('lesson-soup').academicConcepts).toEqual({
      'Social Studies': ['Cultural Traditions'],
    });
  });

  it('records whether the lesson changed vs its current corpus values', () => {
    // lesson-roots changes (season casing + garden add + concepts); a row whose
    // new values equal current would be marked unchanged.
    expect(row('lesson-roots').changed).toBe(true);
  });

  it('records the Zod status of the source record', () => {
    expect(row('lesson-roots').zodPassed).toBe(true);
    expect(row('lesson-weird').zodPassed).toBe(false);
  });

  it('records the source record phase and normalization count', () => {
    // lesson-soup's latest record is a repair record with no normalizations.
    expect(row('lesson-soup').phase).toBe('repair');
    expect(row('lesson-roots').phase).toBe('main');
    expect(row('lesson-roots').normalizationCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Edge-case flagging (bucketing for the weird bucket)
// ---------------------------------------------------------------------------

function makeRow(overrides: Partial<StagingRow>): StagingRow {
  return {
    id: 'x',
    title: 'X',
    fields: {},
    currentFields: {},
    academicConcepts: {},
    currentConcepts: {},
    gradeLevels: [],
    changed: true,
    changeMagnitude: 1,
    zodPassed: true,
    phase: 'main',
    normalizationCount: 0,
    ...overrides,
  };
}

describe('isEdgeCase', () => {
  it('flags a Zod-failed row', () => {
    expect(isEdgeCase(makeRow({ zodPassed: false }))).toBe(true);
  });

  it('flags a fallback-rescued row (refusal → challenger model)', () => {
    expect(isEdgeCase(makeRow({ phase: 'fallback' }))).toBe(true);
  });

  it('flags a row that had code normalizations applied', () => {
    expect(isEdgeCase(makeRow({ normalizationCount: 2 }))).toBe(true);
  });

  it('does not flag an ordinary clean main-pass row', () => {
    expect(isEdgeCase(makeRow({}))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Staging CSV
// ---------------------------------------------------------------------------

describe('renderStagingCsv', () => {
  it('has a header row naming every applied field', () => {
    const csv = renderStagingCsv(staging(), vocab);
    const header = csv.split('\n')[0];
    expect(header).toContain('lesson_id');
    expect(header).toContain('season_timing');
    expect(header).toContain('academic_concepts');
    expect(header).toContain('grade_levels');
  });

  it('emits one data line per staging row', () => {
    const csv = renderStagingCsv(staging(), vocab).trimEnd();
    expect(csv.split('\n').length).toBe(1 + staging().length);
  });

  it('quotes fields and joins multi-values with a pipe', () => {
    const csv = renderStagingCsv([row('lesson-roots')], vocab);
    expect(csv).toContain('Observing plant parts|Identifying plants');
  });
});

// ---------------------------------------------------------------------------
// Staging SQL
// ---------------------------------------------------------------------------

describe('renderStagingSql', () => {
  it('creates the staging table idempotently', () => {
    const sql = renderStagingSql(staging(), vocab);
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.pr6_retag_staging');
  });

  it('inserts one row per staging lesson with the lesson_id', () => {
    const sql = renderStagingSql(staging(), vocab);
    expect(sql).toContain(`'lesson-roots'`);
    expect(sql).toContain(`'lesson-soup'`);
    expect(sql).toContain(`'lesson-weird'`);
  });
});

// ---------------------------------------------------------------------------
// Draft apply migration
// ---------------------------------------------------------------------------

describe('buildApplyMigrationSql', () => {
  const report = buildDiffReport(corpus, runRecords, vocab);
  const sql = buildApplyMigrationSql(staging(), vocab, report);

  it('creates the rollback snapshot table idempotently', () => {
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.pr6_retag_rollback');
  });

  it('enables RLS with no policy on the rollback table (service-role only)', () => {
    expect(sql).toContain('ALTER TABLE public.pr6_retag_rollback ENABLE ROW LEVEL SECURITY');
  });

  it('snapshots only changing rows, guarded against double-insert', () => {
    // ON CONFLICT DO NOTHING keeps re-runs from overwriting the original values.
    expect(sql).toContain('ON CONFLICT');
    expect(sql.toUpperCase()).toContain('INSERT INTO PUBLIC.PR6_RETAG_ROLLBACK');
  });

  it('dual-writes a normal field: BOTH the text[] column and its JSONB key', () => {
    // season_timing → column season_timing + metadata->seasonTiming.
    expect(sql).toContain('season_timing =');
    expect(sql).toContain('seasonTiming');
  });

  it('writes academic_concepts as JSONB ONLY — never as a text[] column', () => {
    // academic_concepts has column: null (vocab documented exception).
    expect(sql).toContain('academicConcepts');
    // No "academic_concepts =" column assignment anywhere.
    expect(sql).not.toMatch(/\bacademic_concepts\s*=/);
  });

  it('sets each lesson row to absolute values (idempotent re-apply)', () => {
    // A row's UPDATE keys off its lesson_id and sets the full new value.
    expect(sql).toContain(`'lesson-roots'`);
    expect(sql).toContain('UPDATE public.lessons');
  });

  it('writes grade_levels (column + metadata gradeLevels)', () => {
    expect(sql).toContain('grade_levels =');
    expect(sql).toContain('gradeLevels');
  });
});

// ---------------------------------------------------------------------------
// Spot-check sampling
// ---------------------------------------------------------------------------

describe('sampleSpotCheck', () => {
  const report = buildDiffReport(corpus, runRecords, vocab);

  it('is deterministic for a fixed seed', () => {
    const a = sampleSpotCheck(staging(), report, { seed: 42, perBucket: 2 });
    const b = sampleSpotCheck(staging(), report, { seed: 42, perBucket: 2 });
    expect(a.map((s) => s.id)).toEqual(b.map((s) => s.id));
  });

  it('changes its selection when the seed changes', () => {
    const big = Array.from(
      { length: 30 },
      (_, i): StagingRow => ({
        id: `L${i}`,
        title: `Lesson ${i}`,
        fields: Object.fromEntries(
          Object.values(vocab)
            .filter((v) => v.column !== null)
            .map((v) => [v.field, i % 2 === 0 ? [v.values[0]] : []])
        ) as StagingRow['fields'],
        currentFields: {},
        academicConcepts: {},
        currentConcepts: {},
        gradeLevels: [],
        changed: i % 3 !== 0,
        changeMagnitude: i % 5,
        zodPassed: true,
        phase: 'main',
        normalizationCount: 0,
      })
    );
    const a = sampleSpotCheck(big, report, { seed: 1, perBucket: 5 });
    const b = sampleSpotCheck(big, report, { seed: 2, perBucket: 5 });
    expect(a.map((s) => s.id)).not.toEqual(b.map((s) => s.id));
  });

  it('represents the weird bucket when only normalization/fallback edge cases exist', () => {
    // No Zod failures (the B4 gate guarantees 100% Zod-pass), but rows with
    // normalizations or a fallback rescue still belong in the weird bucket.
    const rows: StagingRow[] = [
      makeRow({ id: 'clean', changeMagnitude: 4 }),
      makeRow({ id: 'normalized', normalizationCount: 1, changeMagnitude: 0 }),
      makeRow({ id: 'rescued', phase: 'fallback', changeMagnitude: 0 }),
    ];
    const samples = sampleSpotCheck(rows, report, { seed: 3, perBucket: 10 });
    const weird = samples
      .filter((s) => s.bucket === 'weird-edge-case')
      .map((s) => s.id)
      .sort();
    expect(weird).toEqual(['normalized', 'rescued']);
  });

  it('labels each sample with its bucket', () => {
    const samples = sampleSpotCheck(staging(), report, { seed: 7, perBucket: 10 });
    const buckets = new Set(samples.map((s) => s.bucket));
    for (const b of buckets) {
      expect(['changed-heavily', 'unchanged-or-light', 'weird-edge-case']).toContain(b);
    }
  });

  it('routes a Zod-failed row into the weird-edge-case bucket', () => {
    const samples = sampleSpotCheck(staging(), report, { seed: 7, perBucket: 10 });
    const weird = samples.find((s) => s.id === 'lesson-weird');
    expect(weird?.bucket).toBe('weird-edge-case');
  });

  it('never samples the same lesson into two buckets', () => {
    const samples = sampleSpotCheck(staging(), report, { seed: 7, perBucket: 10 });
    const ids = samples.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ---------------------------------------------------------------------------
// Spot-check worksheet rendering
// ---------------------------------------------------------------------------

describe('renderSpotCheckWorksheet', () => {
  const report = buildDiffReport(corpus, runRecords, vocab);
  const samples = sampleSpotCheck(staging(), report, { seed: 7, perBucket: 10 });
  const md = renderSpotCheckWorksheet(samples, vocab);

  it('is plain-language markdown with a heading and bucket sections', () => {
    expect(md).toContain('# ');
    expect(md.toLowerCase()).toContain('spot-check');
  });

  it('lists each sampled lesson by title and id', () => {
    expect(md).toContain('lesson-roots');
    expect(md).toContain('Roots and Shoots');
  });

  it('shows old → new for at least one changed field', () => {
    expect(md).toContain('→');
  });
});

// ---------------------------------------------------------------------------
// CLI arg parsing
// ---------------------------------------------------------------------------

describe('parseArgs', () => {
  it('defaults all artifact paths under the artifacts dir', () => {
    const args = parseArgs([]);
    expect(args.run).toContain('artifacts');
    expect(args.corpus).toContain('artifacts');
    expect(args.stagingSql).toContain('artifacts');
    expect(args.migration).toContain('artifacts');
    expect(args.worksheet).toContain('artifacts');
  });

  it('rejects an unknown flag', () => {
    expect(() => parseArgs(['--nope'])).toThrow(/unknown flag/);
  });

  it('accepts a numeric seed and per-bucket count', () => {
    const args = parseArgs(['--seed', '99', '--per-bucket', '25']);
    expect(args.seed).toBe(99);
    expect(args.perBucket).toBe(25);
  });
});
