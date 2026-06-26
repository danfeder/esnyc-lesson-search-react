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
    // P3.2 (D-P10c): the rollback table is C02-named for all runs now.
    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.c02_retag_rollback');
  });

  it('enables RLS with no policy on the rollback table (service-role only)', () => {
    expect(sql).toContain('ALTER TABLE public.c02_retag_rollback ENABLE ROW LEVEL SECURITY');
  });

  it('snapshots only changing rows, guarded against double-insert', () => {
    // ON CONFLICT DO NOTHING keeps re-runs from overwriting the original values.
    expect(sql).toContain('ON CONFLICT');
    expect(sql.toUpperCase()).toContain('INSERT INTO PUBLIC.C02_RETAG_ROLLBACK');
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

  it('loads the original 4 LOCKED corrections keyed by lesson id', () => {
    expect(corrections.has('1Dz-Jv4cV0N0ntxZ8z0VcRgenI0hpZuOIDJuPbEvr7bI')).toBe(true);
    expect(corrections.has('1yTTJr3D9B6iljmmqdqtWUf6WnpRm683_')).toBe(true);
    expect(corrections.has('1V2Xt4cB9K19aItujCO8lrshz1YDSW022Okln4jI0ij8')).toBe(true);
    expect(corrections.has('1VShcRmcQCpjPrrltCpytiHeuAgHuIb311EOIoSctnmU')).toBe(true);
  });

  it('loads the 7 C2 North-American-drop corrections (U-1 resolution)', () => {
    // The re-tag output left the generic 'North American' label alongside an
    // Indigenous-subtree label on these 7 lessons. Each carries a DROP of
    // 'North American' so the U-1 identity anchor holds (supervisor PROD-probe
    // finding 2026-06-16). 4 original + 7 = 11 total.
    expect(corrections.size).toBe(11);
    const northAmericanDropIds = [
      '12yRCn3m298kp_ID-baEGYsHYP48f2zfFrGYbFnzdpLM',
      '12ZjWQaqW6hOPDo16zi9PN3iG92jI4KLz',
      '16mgyKO8H_9s58p4mH1WuyCgswGKhti0h',
      '1ggAWmeMm2AZoGXadfQjPzKMgZcYbTOyCiqUXdf0ZWrk',
      '1zrWJ0unlwyo7hjeb9ZG2betTOIaitwzN',
      'lesson_03de6aa8ce094d0b9fd6518830e3eae7',
      'lesson_341634b793bd4fb69528013dbcd5d259',
    ];
    for (const id of northAmericanDropIds) {
      const correction = corrections.get(id);
      expect(correction, `missing correction for ${id}`).toBeDefined();
      expect(correction).toEqual({ drop: ['North American'] });
    }
  });

  it('the North-American drop keeps the Indigenous label, removing only the generic tag', () => {
    // Berry Rosehip Bars staged [Indigenous, North American, Indigenous and
    // Diaspora] → dropping 'North American' must keep both Indigenous labels.
    const berry = corrections.get('12yRCn3m298kp_ID-baEGYsHYP48f2zfFrGYbFnzdpLM')!;
    expect(
      applyHeritageCorrection(['Indigenous', 'North American', 'Indigenous and Diaspora'], berry)
    ).toEqual(['Indigenous', 'Indigenous and Diaspora']);
    // Three Sisters Soup staged [Indigenous, Three Sisters traditions, North
    // American] → keep the two Indigenous-subtree labels.
    const threeSisters = corrections.get('1zrWJ0unlwyo7hjeb9ZG2betTOIaitwzN')!;
    expect(
      applyHeritageCorrection(
        ['Indigenous', 'Three Sisters traditions', 'North American'],
        threeSisters
      )
    ).toEqual(['Indigenous', 'Three Sisters traditions']);
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

  it('a North-American drop stages the surviving Indigenous label, still CHANGED (U-1 resolution)', () => {
    // The C2 U-1 fix drops the generic 'North American' label from re-tagged
    // Indigenous lessons. lesson-soup's run heritage is ["Indigenous"]; dropping
    // 'North American' (absent here) leaves the Indigenous identity label intact
    // and the row stays changed (corpus ["Native American"] vs run ["Indigenous"]),
    // so the corrected heritage flows into the apply.
    const corrections = new Map<string, HeritageCorrection>([
      ['lesson-soup', { drop: ['North American'] }],
    ]);
    const r = staging(new Set(), corrections).find((x) => x.id === 'lesson-soup')!;
    expect(r.fields.cultural_heritage).toEqual(['Indigenous']);
    expect(r.fields.cultural_heritage).not.toContain('North American');
    expect(r.changed).toBe(true);
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

// ---------------------------------------------------------------------------
// P3.2 — D-P10: C02-only apply emitter + optimistic concurrency guard
// ---------------------------------------------------------------------------
//
// Synthetic, CI-safe C02 corpus + run (no gitignored dump). Mirrors the
// generate-diff-report.test C02 fixtures: the run records carry `finalC02`
// (the reconciled canonical arrays), so the emitter reads the per-field SHIP
// output (D-P6/D-P11), NOT `rawInput` (whose arrays are deliberately WRONG so
// any code reading them fails loudly). Values are canonical C02 vocab and one
// carries an apostrophe + ampersand (`Sautéing & stir-frying`) to exercise SQL
// escaping under the new write site.
//
//   c02-floored   flooredFields:['main_ingredients']; cooking finalC02 KEEP +
//                 ADD "Knife skills"; ingredients floored from [Tomatoes] →
//                 [Tomatoes, Nightshades] (parent-derived). BOTH C02 fields
//                 change. Used to assert flooredC02Fields flows to isEdgeCase.
//   c02-changed   clean; cooking finalC02 ADDs "Knife skills"; ingredients
//                 already [Tomatoes, Nightshades] (no floor change). Cooking
//                 ship-changes only.
//   c02-unchanged ship == today on both fields → NOT changed (skipped by apply).

function c02CorpusLine(
  id: string,
  title: string,
  cooking: string[],
  ingredients: string[]
): string {
  return JSON.stringify({
    id,
    title,
    content_text: 'A cooking lesson.',
    activity_type: ['cooking'],
    tags: ['Some Tag'],
    season_timing: ['Winter'],
    cultural_responsiveness_features: [],
    cultural_heritage: ['Italian'],
    academic_integration: [],
    social_emotional_learning: [],
    core_competencies: [],
    cooking_methods: ['stovetop'],
    observances_holidays: [],
    garden_skills: [],
    cooking_skills: cooking,
    main_ingredients: ingredients,
    academic_concepts: { Science: ['Plant Parts'] },
  });
}

function c02RunLine(
  id: string,
  finalC02: { cooking_skills: string[]; main_ingredients: string[] },
  extra: Record<string, unknown> = {}
): string {
  return JSON.stringify({
    id,
    phase: 'main',
    model: 'claude-opus-4-8',
    promptSchemaHash: 'hash-current',
    // rawInput on an anchored record is the raw KEEP/DROP/ADD DECISION object,
    // with DELIBERATELY WRONG arrays — any code reading it (instead of the ship
    // output) would stage garbage and a scope assertion below would fire.
    rawInput: {
      cooking_skills: { keep: ['WRONG-cooking'], add: [] },
      main_ingredients: { keep: ['WRONG-ingredient'], add: [] },
      // non-C02 fields present on rawInput must NOT reach a C02 apply:
      season_timing: ['Summer'],
      grade_levels: ['8'],
      academic_concepts: { Science: { framework: ['WRONG-Concept'] } },
    },
    llmDecisions: { cooking_skills: { keep: [], add: [] } },
    finalC02,
    zod: { passed: true, fieldErrors: null },
    usage: null,
    costUsd: null,
    latencyMs: null,
    error: null,
    stopReason: 'tool_use',
    bodyHash: 'h',
    strict: false,
    completedAt: '2026-06-25T00:00:00.000Z',
    ...extra,
  });
}

const c02CorpusText = [
  c02CorpusLine('c02-floored', 'Floored Salad', ['Sautéing & stir-frying'], ['Tomatoes']),
  c02CorpusLine(
    'c02-changed',
    'Ship Changed Stew',
    ['Sautéing & stir-frying'],
    ['Tomatoes', 'Nightshades']
  ),
  c02CorpusLine(
    'c02-unchanged',
    'Unchanged Roast',
    ['Sautéing & stir-frying'],
    ['Tomatoes', 'Nightshades']
  ),
].join('\n');

const c02RunText = [
  c02RunLine(
    'c02-floored',
    { cooking_skills: ['Sautéing & stir-frying', 'Knife skills'], main_ingredients: [] },
    { flooredFields: ['main_ingredients'] }
  ),
  c02RunLine('c02-changed', {
    cooking_skills: ['Sautéing & stir-frying', 'Knife skills'],
    main_ingredients: ['Tomatoes', 'Nightshades'],
  }),
  c02RunLine('c02-unchanged', {
    cooking_skills: ['Sautéing & stir-frying'],
    main_ingredients: ['Tomatoes', 'Nightshades'],
  }),
].join('\n');

const c02Corpus = parseCorpusRecords(c02CorpusText);
const c02RunRecords = parseRunRecords(c02RunText);

function c02Staging(): StagingRow[] {
  return buildStagingRows(c02Corpus, c02RunRecords, vocab);
}

function c02Row(id: string): StagingRow {
  const found = c02Staging().find((r) => r.id === id);
  if (!found) throw new Error(`no C02 staging row for ${id}`);
  return found;
}

/** The per-lesson UPDATE statement text for one id (from `UPDATE` to its `;`).
 *  Scans the "(2) Apply" section so the skipped-capture INSERT (which also
 *  mentions `l.lesson_id = '<id>'`) cannot be mistaken for the UPDATE. */
function c02UpdateStmt(id: string): string {
  const report = buildDiffReport(c02Corpus, c02RunRecords, vocab);
  const fullSql = buildApplyMigrationSql(c02Staging(), vocab, report);
  const applySection = fullSql.slice(fullSql.indexOf('-- (2) Apply'));
  const marker = `WHERE lesson_id = '${id}'`;
  const markerIdx = applySection.indexOf(marker);
  if (markerIdx < 0) throw new Error(`no UPDATE for ${id}`);
  const start = applySection.lastIndexOf('UPDATE public.lessons SET', markerIdx);
  if (start < 0) throw new Error(`no UPDATE for ${id}`);
  const end = applySection.indexOf(';', markerIdx);
  return applySection.slice(start, end + 1);
}

describe('buildStagingRows — C02 run threads the SHIP output (D-P6/D-P11)', () => {
  it('reads the two C02 fields from the ship output, NOT rawInput', () => {
    // c02-floored: cooking ship = floor ∪ LLM = [Sautéing & stir-frying, Knife
    // skills]; ingredients floor-only of [Tomatoes] = [Tomatoes, Nightshades].
    const r = c02Row('c02-floored');
    expect(r.fields.cooking_skills).toEqual(['Sautéing & stir-frying', 'Knife skills']);
    expect(r.fields.main_ingredients).toEqual(['Tomatoes', 'Nightshades']);
    // the WRONG rawInput arrays must never appear.
    expect(r.fields.cooking_skills).not.toContain('WRONG-cooking');
    expect(r.fields.main_ingredients).not.toContain('WRONG-ingredient');
  });

  it('marks a C02 row and records its floored C02 field(s)', () => {
    expect(c02Row('c02-floored').isC02).toBe(true);
    expect(c02Row('c02-floored').flooredC02Fields).toEqual(['main_ingredients']);
    expect(c02Row('c02-changed').flooredC02Fields ?? []).toEqual([]);
  });

  it('captures each row pre-apply C02 source arrays for the concurrency guard', () => {
    // currentFields holds the corpus pre-retag C02 values (the guard literals).
    const r = c02Row('c02-changed');
    expect(r.currentFields.cooking_skills).toEqual(['Sautéing & stir-frying']);
    expect(r.currentFields.main_ingredients).toEqual(['Tomatoes', 'Nightshades']);
  });
});

describe('comparedToStagingRow — C02 change detection counts ONLY the two C02 fields', () => {
  it('marks a row changed when a C02 field changes', () => {
    expect(c02Row('c02-floored').changed).toBe(true);
    expect(c02Row('c02-changed').changed).toBe(true);
  });

  it('marks a row UNCHANGED when both C02 fields equal today (other fields ignored)', () => {
    // c02-unchanged ships exactly today's cooking + ingredients; the run's
    // non-C02 rawInput (season Summer, grade 8, concepts) must NOT make it
    // "changed" — C02 change-detection is scoped to the two C02 fields.
    const r = c02Row('c02-unchanged');
    expect(r.changed).toBe(false);
    expect(r.changeMagnitude).toBe(0);
  });
});

describe('isEdgeCase — flooredC02Fields routes a C02 row to the weird bucket', () => {
  it('flags a row whose C02 field fell back to the floor', () => {
    expect(isEdgeCase(makeRow({ flooredC02Fields: ['main_ingredients'] }))).toBe(true);
  });

  it('does not flag a clean C02 row with no floored fields', () => {
    expect(isEdgeCase(makeRow({ flooredC02Fields: [] }))).toBe(false);
  });
});

describe('applyUpdate — C02-only write scope (D-P10a)', () => {
  it('writes ONLY the two C02 text[] columns + their two JSONB keys', () => {
    const stmt = c02UpdateStmt('c02-floored');
    // the two columns
    expect(stmt).toContain('cooking_skills = ');
    expect(stmt).toContain('main_ingredients = ');
    // the two JSONB keys
    expect(stmt).toContain('{cookingSkills}');
    expect(stmt).toContain('{mainIngredients}');
  });

  it('writes NO other flat column and NO grade_levels column', () => {
    const stmt = c02UpdateStmt('c02-floored');
    expect(stmt).not.toMatch(/\bseason_timing\s*=/);
    expect(stmt).not.toMatch(/\bcooking_methods\s*=/);
    expect(stmt).not.toMatch(/\bcultural_heritage\s*=/);
    expect(stmt).not.toMatch(/\bgrade_levels\s*=/);
  });

  it('writes NO other JSONB key (no gradeLevels, no academicConcepts, no other field key)', () => {
    const stmt = c02UpdateStmt('c02-floored');
    expect(stmt).not.toContain('{gradeLevels}');
    expect(stmt).not.toContain('{academicConcepts}');
    expect(stmt).not.toContain('{seasonTiming}');
    expect(stmt).not.toContain('{cookingMethods}');
  });

  it('uses the SHIP values, never the WRONG rawInput arrays', () => {
    const stmt = c02UpdateStmt('c02-floored');
    expect(stmt).toContain('Knife skills');
    expect(stmt).toContain('Nightshades');
    expect(stmt).not.toContain('WRONG-cooking');
    expect(stmt).not.toContain('WRONG-ingredient');
    expect(stmt).not.toContain('Summer');
  });

  it('escapes the apostrophe + ampersand value safely', () => {
    const stmt = c02UpdateStmt('c02-floored');
    // Sautéing & stir-frying carries no single quote, but assert it survives
    // verbatim inside a single-quoted text literal.
    expect(stmt).toContain(`'Sautéing & stir-frying'`);
  });
});

describe('applyUpdate — optimistic concurrency guard (D-P10b)', () => {
  it('matches the pre-apply C02 source arrays in the WHERE (order-insensitive, NULL-safe)', () => {
    const stmt = c02UpdateStmt('c02-changed');
    // coalesce(...) <@ ARRAY[...] AND coalesce(...) @> ARRAY[...] for BOTH cols.
    expect(stmt).toMatch(/coalesce\(\s*cooking_skills\s*,\s*'\{\}'::text\[\]\s*\)\s*<@/i);
    expect(stmt).toMatch(/coalesce\(\s*cooking_skills\s*,\s*'\{\}'::text\[\]\s*\)\s*@>/i);
    expect(stmt).toMatch(/coalesce\(\s*main_ingredients\s*,\s*'\{\}'::text\[\]\s*\)\s*<@/i);
    expect(stmt).toMatch(/coalesce\(\s*main_ingredients\s*,\s*'\{\}'::text\[\]\s*\)\s*@>/i);
    // the guard literals are the CURRENT corpus arrays, not the new ship values.
    expect(stmt).toContain(`'Sautéing & stir-frying'`);
    expect(stmt).toContain(`'Tomatoes'`);
  });

  it('emits a skipped-ID capture for rows whose current DB C02 values fail the guard', () => {
    const report = buildDiffReport(c02Corpus, c02RunRecords, vocab);
    const sql = buildApplyMigrationSql(c02Staging(), vocab, report);
    // A capture table + an INSERT … SELECT of target ids whose current C02
    // values no longer match the export-time guard.
    expect(sql).toContain('c02_retag_skipped');
    expect(sql.toUpperCase()).toContain('INSERT INTO PUBLIC.C02_RETAG_SKIPPED');
  });
});

describe('rollback snapshot — renamed table, still full-row (D-P10c)', () => {
  const report = buildDiffReport(c02Corpus, c02RunRecords, vocab);
  const sql = buildApplyMigrationSql(c02Staging(), vocab, report);

  it('uses the C02-named rollback table', () => {
    expect(sql).toContain('public.c02_retag_rollback');
    expect(sql).not.toContain('pr6_retag_rollback');
  });

  it('keeps the snapshot full-row (captures all columns + full metadata)', () => {
    // full-row forensic snapshot: the DDL still lists every flat column + a
    // metadata jsonb column, and the INSERT captures l.metadata.
    expect(sql).toContain('metadata jsonb');
    expect(sql).toContain('l.metadata');
  });

  it('enables RLS with no policies on the rollback table', () => {
    expect(sql).toContain('ALTER TABLE public.c02_retag_rollback ENABLE ROW LEVEL SECURITY');
  });
});

describe('buildApplyMigrationSql — C02 homogeneity guard (D-P10a data safety)', () => {
  const report = buildDiffReport(c02Corpus, c02RunRecords, vocab);

  it('refuses to emit when a C02 run carries a non-C02 changing row (would stomp the 15 other fields)', () => {
    // A C02 run is homogeneous by construction (every compared record carries
    // finalC02/llmDecisions). If a stray non-C02 changing row slipped in, the
    // per-row applyUpdate dispatch would emit a LEGACY all-fields UPDATE for it,
    // stomping the metadata rebuild. The guard must fail closed instead.
    const c02 = makeRow({
      id: 'c02-x',
      isC02: true,
      changed: true,
      fields: {
        cooking_skills: ['Sautéing & stir-frying'],
        main_ingredients: ['Tomatoes', 'Nightshades'],
      },
      currentFields: { cooking_skills: [], main_ingredients: [] },
    });
    const legacyStray = makeRow({
      id: 'legacy-y',
      isC02: false,
      changed: true,
      fields: { season_timing: ['Summer'] },
    });
    expect(() => buildApplyMigrationSql([c02, legacyStray], vocab, report)).toThrow(
      /non-C02 changing row/i
    );
  });

  it('emits normally for a homogeneous C02 run (every row isC02)', () => {
    expect(() => buildApplyMigrationSql(c02Staging(), vocab, report)).not.toThrow();
  });
});
