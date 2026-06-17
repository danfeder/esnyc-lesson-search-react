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
  applyHeritageCorrection,
  loadHeritageCorrections,
  buildGradeDiff,
  renderGradeDiffMarkdown,
  type StagingRow,
  type HeritageCorrection,
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

function staging(
  excluded: Set<string> = new Set(),
  corrections: Map<string, HeritageCorrection> = new Map()
): StagingRow[] {
  return buildStagingRows(corpus, runRecords, vocab, excluded, corrections);
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

  it('guards the zero-row case instead of emitting a malformed VALUES;', () => {
    const sql = renderStagingSql([], vocab);
    // A dangling INSERT ... VALUES followed only by a semicolon is invalid
    // Postgres. It must NOT appear; a guard comment must take its place.
    expect(sql).not.toMatch(/VALUES\s*;/);
    expect(sql).toContain('-- (no staged rows)');
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

// ---------------------------------------------------------------------------
// C2.1 — Heritage corrections (the 4 LOCKED targeted drops/sets)
// ---------------------------------------------------------------------------

describe('applyHeritageCorrection', () => {
  it('DROPs the listed values, keeping the rest in order (U-5 Fattoush)', () => {
    const run = [
      'Middle Eastern',
      'Levantine',
      'Lebanese',
      'Syrian',
      'Jordanian',
      'Palestinian',
      'Israeli',
    ];
    expect(applyHeritageCorrection(run, { drop: ['Israeli', 'Jordanian'] })).toEqual([
      'Middle Eastern',
      'Levantine',
      'Lebanese',
      'Syrian',
      'Palestinian',
    ]);
  });

  it('DROPs a single value, keeping the other three (Arroz con Gandules)', () => {
    const run = ['Puerto Rican', 'Caribbean', 'Latin American', 'South Asian'];
    expect(applyHeritageCorrection(run, { drop: ['South Asian'] })).toEqual([
      'Puerto Rican',
      'Caribbean',
      'Latin American',
    ]);
  });

  it('SETs the value to the empty array (U-8 Alternative Proteins)', () => {
    expect(applyHeritageCorrection(['Italian', 'European'], { set: [] })).toEqual([]);
  });

  it('SETs the value to the empty array (U-12 Intro to Salad Project)', () => {
    expect(applyHeritageCorrection(['Middle Eastern'], { set: [] })).toEqual([]);
  });

  it('is a no-op for a drop value that is absent (idempotent / defensive)', () => {
    expect(applyHeritageCorrection(['Mexican'], { drop: ['South Asian'] })).toEqual(['Mexican']);
  });
});

describe('loadHeritageCorrections (committed manifest)', () => {
  const manifestPath = path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    'data',
    'heritage-corrections.json'
  );
  const corrections = loadHeritageCorrections(manifestPath);

  it('loads the 4 LOCKED corrections keyed by lesson id', () => {
    expect(corrections.size).toBe(4);
    expect(corrections.has('1Dz-Jv4cV0N0ntxZ8z0VcRgenI0hpZuOIDJuPbEvr7bI')).toBe(true);
    expect(corrections.has('1yTTJr3D9B6iljmmqdqtWUf6WnpRm683_')).toBe(true);
    expect(corrections.has('1V2Xt4cB9K19aItujCO8lrshz1YDSW022Okln4jI0ij8')).toBe(true);
    expect(corrections.has('1VShcRmcQCpjPrrltCpytiHeuAgHuIb311EOIoSctnmU')).toBe(true);
  });

  it('U-5 Fattoush drops Israeli + Jordanian', () => {
    const fattoush = corrections.get('1Dz-Jv4cV0N0ntxZ8z0VcRgenI0hpZuOIDJuPbEvr7bI')!;
    expect(
      applyHeritageCorrection(
        [
          'Middle Eastern',
          'Levantine',
          'Lebanese',
          'Syrian',
          'Jordanian',
          'Palestinian',
          'Israeli',
        ],
        fattoush
      )
    ).toEqual(['Middle Eastern', 'Levantine', 'Lebanese', 'Syrian', 'Palestinian']);
  });

  it('U-8 + U-12 clear heritage to empty', () => {
    const u8 = corrections.get('1yTTJr3D9B6iljmmqdqtWUf6WnpRm683_')!;
    const u12 = corrections.get('1V2Xt4cB9K19aItujCO8lrshz1YDSW022Okln4jI0ij8')!;
    expect(applyHeritageCorrection(['Italian', 'European'], u8)).toEqual([]);
    expect(applyHeritageCorrection(['Middle Eastern'], u12)).toEqual([]);
  });

  it('Arroz drops South Asian, keeping the other three', () => {
    const arroz = corrections.get('1VShcRmcQCpjPrrltCpytiHeuAgHuIb311EOIoSctnmU')!;
    expect(
      applyHeritageCorrection(['Puerto Rican', 'Caribbean', 'Latin American', 'South Asian'], arroz)
    ).toEqual(['Puerto Rican', 'Caribbean', 'Latin American']);
  });
});

describe('buildStagingRows with heritage corrections', () => {
  it('applies a DROP to a staged lesson before change detection', () => {
    // lesson-soup's run heritage is ["Indigenous"]; drop it → [].
    const corrections = new Map<string, HeritageCorrection>([
      ['lesson-soup', { drop: ['Indigenous'] }],
    ]);
    const r = staging(new Set(), corrections).find((x) => x.id === 'lesson-soup')!;
    expect(r.fields.cultural_heritage).toEqual([]);
  });

  it('applies a SET to a staged lesson', () => {
    const corrections = new Map<string, HeritageCorrection>([
      ['lesson-soup', { set: ['Mexican'] }],
    ]);
    const r = staging(new Set(), corrections).find((x) => x.id === 'lesson-soup')!;
    expect(r.fields.cultural_heritage).toEqual(['Mexican']);
  });

  it('a drop-to-empty change keeps the row staged as CHANGED (drop-only detection fires)', () => {
    // lesson-soup's CURRENT corpus heritage is ["Native American"] and the run
    // proposes ["Indigenous"]. Dropping the run's "Indigenous" → [] is STILL a
    // change vs the corpus ["Native American"], so the row must stay changed and
    // be staged for the apply (else U-8/U-12 silently vanish from the apply).
    const corrections = new Map<string, HeritageCorrection>([
      ['lesson-soup', { drop: ['Indigenous'] }],
    ]);
    const r = staging(new Set(), corrections).find((x) => x.id === 'lesson-soup')!;
    expect(r.fields.cultural_heritage).toEqual([]);
    expect(r.changed).toBe(true);
  });

  it('the corrected heritage flows identically into staging SQL + draft migration', () => {
    const corrections = new Map<string, HeritageCorrection>([
      ['lesson-soup', { drop: ['Indigenous'] }],
    ]);
    const rows = staging(new Set(), corrections);
    const report = buildDiffReport(corpus, runRecords, vocab);
    const sql = renderStagingSql(rows, vocab);
    const migration = buildApplyMigrationSql(rows, vocab, report);
    // lesson-soup's heritage column must NOT carry the dropped 'Indigenous'
    // anywhere downstream. (Other lessons retain their own heritage.)
    const soupSql = sql.split('\n').find((l) => l.includes('lesson-soup'))!;
    expect(soupSql).not.toContain("'Indigenous'");
    // The draft migration's UPDATE for lesson-soup also must not carry it.
    const soupUpdateIdx = migration.indexOf("WHERE lesson_id = 'lesson-soup'");
    const soupBlock = migration.slice(Math.max(0, soupUpdateIdx - 2000), soupUpdateIdx);
    expect(soupBlock).not.toContain(`'Indigenous'`);
  });
});

// ---------------------------------------------------------------------------
// C2.1 — Grade guard (DATA SAFETY: never blank an existing grade)
// ---------------------------------------------------------------------------

describe('applyUpdate grade guard', () => {
  const report = buildDiffReport(corpus, runRecords, vocab);

  it('writes grade_levels (column + metadata gradeLevels) when grades are non-empty', () => {
    // lesson-roots has grade_levels ["PK"] → both writes present.
    const r = row('lesson-roots');
    expect(r.gradeLevels).toEqual(['PK']);
    const sql = buildApplyMigrationSql([r], vocab, report);
    expect(sql).toContain('grade_levels =');
    expect(sql).toContain('gradeLevels');
  });

  it('OMITs both grade writes for a row whose staged grade is empty', () => {
    // Force an empty-grade staging row that still changes another field, so the
    // apply runs over it. The grade guard must preserve the existing PROD grade
    // by writing NOTHING for grade_levels / gradeLevels on that row.
    const emptyGradeRow: StagingRow = makeRow({
      id: 'empty-grade',
      gradeLevels: [],
      changed: true,
      fields: { season_timing: ['Winter'] },
    });
    const sql = buildApplyMigrationSql([emptyGradeRow], vocab, report);
    // Scope to the per-row UPDATE statement (the rollback DDL + commented-out
    // rollback recipe legitimately mention grade_levels / r.grade_levels — those
    // are the snapshot column + restore template, not a per-row write).
    const updateStart = sql.indexOf('UPDATE public.lessons SET');
    const updateEnd = sql.indexOf(';', updateStart);
    const updateStmt = sql.slice(updateStart, updateEnd + 1);
    // No grade_levels column assignment, no gradeLevels jsonb_set in the UPDATE.
    expect(updateStmt).not.toMatch(/grade_levels\s*=/);
    expect(updateStmt).not.toContain('gradeLevels');
    // But it still wrote the changing field (so the row is not dropped).
    expect(updateStmt).toContain('season_timing =');
  });

  it('NEVER emits an empty grade_levels clause across the full fixture run', () => {
    // Across the whole staged set, an `ARRAY[]::text[]` assigned to grade_levels
    // (or a gradeLevels jsonb_set with an empty array) must never appear — that
    // is exactly the blank-the-grade bug the guard prevents.
    const sql = buildApplyMigrationSql(staging(), vocab, report);
    expect(sql).not.toContain('grade_levels = ARRAY[]::text[]');
    expect(sql).not.toContain("'{gradeLevels}', '[]'::jsonb");
  });
});

// ---------------------------------------------------------------------------
// C2.1 — Grade diff review artifact (before/after Protocol-B surface)
// ---------------------------------------------------------------------------

describe('buildGradeDiff', () => {
  // before census: lesson-roots currently has no grades on PROD (changes to PK);
  // lesson-soup currently has ["K"] but the run staged none (preserved).
  const before = new Map<string, string[]>([
    ['lesson-roots', []],
    ['lesson-soup', ['K']],
    ['lesson-weird', ['1', '2']],
  ]);

  it('lists a row whose grade is written as a CHANGE when before != after', () => {
    const rows = staging();
    const diff = buildGradeDiff(rows, before);
    const rootsChange = diff.changes.find((c) => c.id === 'lesson-roots');
    expect(rootsChange).toBeDefined();
    expect(rootsChange!.before).toEqual([]);
    expect(rootsChange!.after).toEqual(['PK']);
  });

  it('classifies an empty-staged-grade row as PRESERVED, never as a write', () => {
    // Build a staging set where lesson-soup has empty staged grades.
    const soup = makeRow({ id: 'lesson-soup', gradeLevels: [], changed: true });
    const diff = buildGradeDiff([soup], before);
    expect(diff.preserved.map((p) => p.id)).toContain('lesson-soup');
    expect(diff.changes.map((c) => c.id)).not.toContain('lesson-soup');
    // its preserved 'before' is the existing PROD value, untouched.
    expect(diff.preserved.find((p) => p.id === 'lesson-soup')!.before).toEqual(['K']);
  });

  it('does NOT list a written row whose before == after as a change', () => {
    // lesson-roots staged ["PK"]; if before already ["PK"], it is a no-op write.
    const beforeSame = new Map<string, string[]>([['lesson-roots', ['PK']]]);
    const diff = buildGradeDiff([row('lesson-roots')], beforeSame);
    expect(diff.changes.map((c) => c.id)).not.toContain('lesson-roots');
    expect(diff.unchanged.map((u) => u.id)).toContain('lesson-roots');
  });
});

describe('renderGradeDiffMarkdown', () => {
  const before = new Map<string, string[]>([
    ['lesson-roots', []],
    ['lesson-weird', ['1', '2']],
  ]);

  it('is plain-language markdown with before → after for each change', () => {
    const diff = buildGradeDiff(staging(), before);
    const md = renderGradeDiffMarkdown(diff);
    expect(md).toContain('# ');
    expect(md.toLowerCase()).toContain('grade');
    expect(md).toContain('→');
    // the count of written grade changes is reported.
    expect(md).toContain(String(diff.changes.length));
  });
});
