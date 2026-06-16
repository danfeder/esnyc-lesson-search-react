#!/usr/bin/env npx tsx
/* eslint-disable no-console -- CLI script: console output is the operator UI */
/**
 * Stage 2 re-tag — task B5b: the apply-artifact emitter.
 *
 * Turns the B4 full-run output (artifacts/full-run.fable.jsonl) + the corpus
 * snapshot (artifacts/corpus.jsonl) into THREE local, review-only artifacts for
 * the user's Protocol-B apply gate. It WRITES NOTHING to any database and
 * creates NO file under supabase/migrations/ — the real apply migration is
 * PR C's job (impl plan C1). Everything here is text generation off local
 * JSONL/JSON.
 *
 * Artifacts emitted (all under scripts/stage2-retag/artifacts/ by default):
 *   (i)   staging data — the proposed new tags per lesson, as a CSV (human-
 *         readable) AND a SQL artifact that loads a `pr6_retag_staging` table.
 *   (ii)  a DRAFT apply migration (.sql TEXT artifact, NOT executed, NOT under
 *         supabase/migrations/) mirroring the PR-5 emitter precedent
 *         (20260611000000_pr5a_heritage_canonicalization.sql): snapshot every
 *         about-to-change row into `pr6_retag_rollback` FIRST (ON CONFLICT DO
 *         NOTHING), then apply per-lesson dual-write UPDATEs that set ABSOLUTE
 *         values (idempotent). Each normal field writes BOTH the lessons text[]
 *         column AND the matching camelCase metadata JSONB key (census-confirmed
 *         dual representation, design §4 OQ7). academic_concepts is the
 *         documented exception — column: null in vocab.ts — so it is written as
 *         the metadata->academicConcepts JSONB key ONLY (no text[] column).
 *   (iii) a plain-language spot-check worksheet (~50-100 lessons sampled
 *         deterministically across three buckets: changed-heavily /
 *         unchanged-or-light / weird-edge-case) for the user to review.
 *
 * Record selection reuses generate-diff-report's selectComparedLessons (latest
 * record per id wins, repair supersedes failed main, normalized rawInput,
 * corpus exclusions dropped) so the tags this emitter stages are byte-for-byte
 * the same "new" values the diff report shows the human.
 *
 * grade_levels: the run output carries a proposed grade_levels list (e.g.
 * ["K"]). It is STAGED for every lesson, but it does NOT drive change detection:
 * changeMagnitude deliberately excludes it (the corpus snapshot carries no
 * current grade to diff against), and only rows where changeMagnitude > 0 are
 * snapshotted + written by the draft apply. So the proposed grade is carried
 * into the draft apply ONLY for rows that otherwise change another field; a row
 * whose sole difference is grade is not written here. Authoritative grade
 * reconciliation is PR C's responsibility (design OQ6 — grades are the
 * source-doc claim, resolved at apply time), not this preview emitter's. With
 * no old-vs-new diff, the worksheet shows the proposed grades without a "from"
 * side, flagged as reviewed separately.
 *
 * NO API calls, NO DB access. Pure local file IO.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_CORPUS_EXCLUSIONS_PATH,
  loadCorpusExclusions,
  parseRunRecords,
  requireFlagValue,
  requireIntFlag,
  warnIfOutsideArtifacts,
  type RunRecord,
} from './run-retag';
import {
  buildDiffReport,
  parseCorpusRecords,
  selectComparedLessons,
  type ComparedLesson,
  type CorpusDiffRecord,
  type DiffReport,
} from './generate-diff-report';
import { MAIN_PASS_FIELDS, loadVocab, type FieldVocab, type Stage2Vocab } from './vocab';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS_DIR = path.join(MODULE_DIR, 'artifacts');
const DEFAULT_RUN_PATH = path.join(ARTIFACTS_DIR, 'full-run.fable.jsonl');
const DEFAULT_CORPUS_PATH = path.join(ARTIFACTS_DIR, 'corpus.jsonl');
const DEFAULT_STAGING_SQL_PATH = path.join(ARTIFACTS_DIR, 'pr6-retag-staging.sql');
const DEFAULT_STAGING_CSV_PATH = path.join(ARTIFACTS_DIR, 'pr6-retag-staging.csv');
const DEFAULT_MIGRATION_PATH = path.join(ARTIFACTS_DIR, 'pr6-retag-apply.draft.sql');
const DEFAULT_WORKSHEET_PATH = path.join(ARTIFACTS_DIR, 'pr6-retag-spot-check.md');

const ROLLBACK_TABLE = 'public.pr6_retag_rollback';
const STAGING_TABLE = 'public.pr6_retag_staging';

/** The 11 flat fields that have a lessons text[] column (everything but
 *  academic_concepts, which is column: null / JSONB-only). */
const FLAT_FIELDS = MAIN_PASS_FIELDS.filter(
  (field): field is Exclude<(typeof MAIN_PASS_FIELDS)[number], 'academic_concepts'> =>
    field !== 'academic_concepts'
);

// ---------------------------------------------------------------------------
// Staging row shape
// ---------------------------------------------------------------------------

export interface StagingRow {
  id: string;
  title: string;
  /** Flat field → proposed new values (the 11 text[] fields + grade_levels). */
  fields: Record<string, string[]>;
  /** Flat field → CURRENT corpus values (for old→new worksheet rendering;
   *  grade_levels has no current value so it is absent here). */
  currentFields: Record<string, string[]>;
  /** subject → proposed concept list (empty subjects dropped). The shape that
   *  lands at metadata->academicConcepts (NOT the framework/everyday object). */
  academicConcepts: Record<string, string[]>;
  /** subject → CURRENT corpus concept list (for old→new rendering). */
  currentConcepts: Record<string, string[]>;
  /** Proposed grade levels (no old-vs-new diff; reviewed separately). */
  gradeLevels: string[];
  /** True iff any flat field / concepts / grades differ from current corpus. */
  changed: boolean;
  /** Count of fields (incl. concepts + grades) that differ from current. Used
   *  only for spot-check bucketing (changed-heavily vs light). */
  changeMagnitude: number;
  /** Whether the source run record passed Zod (false routes to weird bucket). */
  zodPassed: boolean;
  /** The source record's phase — 'fallback' (a refusal rescued by the
   *  challenger model) is an edge-case signal worth a closer review. */
  phase: 'main' | 'repair' | 'fallback';
  /** How many code-enforced mechanical normalizations the runner applied to
   *  this record (non-zero is an edge-case signal). */
  normalizationCount: number;
}

// ---------------------------------------------------------------------------
// Run-record → new-value extraction (pure)
// ---------------------------------------------------------------------------

function newFlatValues(rawInput: Record<string, unknown>, field: string): string[] {
  const value = rawInput[field];
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

/**
 * Flattens the run output's academic_concepts
 * ({subject:{framework,everyday,synonym_pairs}}) to the DB metadata shape
 * (subject→framework-concept-list). Subjects whose framework list is empty are
 * dropped — they carry no concept and would only bloat the JSONB.
 */
export function flattenConcepts(rawInput: Record<string, unknown>): Record<string, string[]> {
  const concepts = rawInput.academic_concepts;
  if (typeof concepts !== 'object' || concepts === null) return {};
  const out: Record<string, string[]> = {};
  for (const [subject, value] of Object.entries(concepts as Record<string, unknown>)) {
    if (typeof value !== 'object' || value === null) continue;
    const framework = (value as Record<string, unknown>).framework;
    const list = Array.isArray(framework)
      ? framework.filter((entry): entry is string => typeof entry === 'string')
      : [];
    if (list.length > 0) out[subject] = list;
  }
  return out;
}

function setsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sa = new Set(a);
  return b.every((v) => sa.has(v));
}

function conceptsEqual(a: Record<string, string[]>, b: Record<string, string[]>): boolean {
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const key of keys) {
    if (!setsEqual(a[key] ?? [], b[key] ?? [])) return false;
  }
  return true;
}

/** Drops the framework/everyday/synonym wrapper from the corpus concepts shape
 *  — the corpus stores subject→list already, but null/missing normalize to {}
 *  and empty lists are dropped so the equality check matches flattenConcepts. */
function normalizeCorpusConcepts(raw: Record<string, string[]>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [subject, list] of Object.entries(raw)) {
    if (Array.isArray(list) && list.length > 0) out[subject] = list;
  }
  return out;
}

function comparedToStagingRow(
  lesson: ComparedLesson,
  source: { zodPassed: boolean; phase: 'main' | 'repair' | 'fallback'; normalizationCount: number }
): StagingRow {
  const fields: Record<string, string[]> = {};
  const currentFields: Record<string, string[]> = {};
  let changeMagnitude = 0;

  for (const field of FLAT_FIELDS) {
    const newValues = newFlatValues(lesson.rawInput, field);
    const oldValues = lesson.corpus.flat[field] ?? [];
    fields[field] = newValues;
    currentFields[field] = oldValues;
    if (!setsEqual(oldValues, newValues)) changeMagnitude++;
  }

  const gradeLevels = newFlatValues(lesson.rawInput, 'grade_levels');
  fields.grade_levels = gradeLevels;
  // grade_levels has no current corpus value, so it is NOT counted toward the
  // change magnitude (we cannot know if it changed). It is staged and carried
  // into the draft apply only for rows that ALSO change another field (apply
  // runs over changed = changeMagnitude > 0 rows); a row whose sole difference
  // is grade is not written here. Authoritative grade reconciliation is PR C's
  // job (design OQ6 — grade = source-doc claim, resolved at apply time).

  const academicConcepts = flattenConcepts(lesson.rawInput);
  const currentConcepts = normalizeCorpusConcepts(lesson.corpus.academicConcepts);
  if (!conceptsEqual(currentConcepts, academicConcepts)) changeMagnitude++;

  return {
    id: lesson.id,
    title: lesson.title,
    fields,
    currentFields,
    academicConcepts,
    currentConcepts,
    gradeLevels,
    changed: changeMagnitude > 0,
    changeMagnitude,
    zodPassed: source.zodPassed,
    phase: source.phase,
    normalizationCount: source.normalizationCount,
  };
}

/**
 * Builds the staging rows from the corpus + run output. Reuses
 * selectComparedLessons so the staged values match the diff report exactly.
 * Lessons whose latest record had no usable output, or that are on the
 * exclusion list, are NOT staged (they get no apply).
 */
export function buildStagingRows(
  corpusRecords: CorpusDiffRecord[],
  runRecords: RunRecord[],
  _vocab: Stage2Vocab,
  excludedIds: Set<string> = new Set()
): StagingRow[] {
  const { compared } = selectComparedLessons(corpusRecords, runRecords, excludedIds);
  // selectComparedLessons drops the source-record provenance, so recover the
  // Zod flag, phase, and normalization count from the latest record per id
  // (later lines win — same selection rule).
  const latest = new Map<string, RunRecord>();
  for (const record of runRecords) latest.set(record.id, record);
  return compared.map((lesson) => {
    const record = latest.get(lesson.id);
    return comparedToStagingRow(lesson, {
      zodPassed: record?.zod.passed ?? false,
      phase: record?.phase ?? 'main',
      normalizationCount: record?.normalizations?.length ?? 0,
    });
  });
}

// ---------------------------------------------------------------------------
// SQL literal helpers (pure)
// ---------------------------------------------------------------------------

/** A single-quoted SQL text literal with embedded quotes doubled. */
export function sqlTextLiteral(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/** A typed text[] literal: ARRAY['a','b']::text[] (empty → ARRAY[]::text[]). */
export function sqlTextArrayLiteral(values: string[]): string {
  if (values.length === 0) return `ARRAY[]::text[]`;
  return `ARRAY[${values.map(sqlTextLiteral).join(',')}]::text[]`;
}

/** A jsonb literal: the JSON-serialized value as a single-quoted ::jsonb cast,
 *  with embedded single quotes doubled (JSON itself uses double quotes). */
export function sqlJsonbLiteral(value: unknown): string {
  const json = JSON.stringify(value);
  return `'${json.replace(/'/g, "''")}'::jsonb`;
}

// ---------------------------------------------------------------------------
// Staging CSV (pure)
// ---------------------------------------------------------------------------

/** CSV-escapes a single cell (wrap in quotes, double embedded quotes). */
function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Renders the staging rows as a human-readable CSV. Multi-value fields are
 * pipe-joined; academic_concepts is JSON; grade_levels is pipe-joined. One
 * header row + one line per staging lesson.
 */
export function renderStagingCsv(rows: StagingRow[], _vocab: Stage2Vocab): string {
  const columns = [
    'lesson_id',
    'title',
    ...FLAT_FIELDS,
    'academic_concepts',
    'grade_levels',
    'changed',
  ];
  const lines: string[] = [columns.map(csvCell).join(',')];
  for (const r of rows) {
    const cells: string[] = [
      r.id,
      r.title,
      ...FLAT_FIELDS.map((f) => (r.fields[f] ?? []).join('|')),
      JSON.stringify(r.academicConcepts),
      r.gradeLevels.join('|'),
      r.changed ? 'yes' : 'no',
    ];
    lines.push(cells.map(csvCell).join(','));
  }
  return `${lines.join('\n')}\n`;
}

// ---------------------------------------------------------------------------
// Staging SQL (pure) — loads a pr6_retag_staging table (review convenience)
// ---------------------------------------------------------------------------

/**
 * Renders a SQL artifact that (re)creates and populates a `pr6_retag_staging`
 * table holding every staged lesson's proposed values. This is a review/QA
 * convenience artifact — PR C's real migration applies from the staged data
 * (or inlines it). Idempotent: CREATE TABLE IF NOT EXISTS + TRUNCATE before
 * re-insert, so re-running yields the same table state.
 */
export function renderStagingSql(rows: StagingRow[], _vocab: Stage2Vocab): string {
  const lines: string[] = [];
  lines.push('-- Stage 2 re-tag — staging data (review/QA artifact, NOT a migration).');
  lines.push('-- Generated by scripts/stage2-retag/prepare-apply.ts. Do not hand-edit.');
  lines.push(`-- ${rows.length} staged lessons.`);
  lines.push('');
  lines.push(`CREATE TABLE IF NOT EXISTS ${STAGING_TABLE} (`);
  lines.push('  lesson_id text PRIMARY KEY,');
  lines.push('  title text,');
  for (const field of FLAT_FIELDS) lines.push(`  ${field} text[],`);
  lines.push('  grade_levels text[],');
  lines.push('  academic_concepts jsonb,');
  lines.push('  changed boolean');
  lines.push(');');
  lines.push(`ALTER TABLE ${STAGING_TABLE} ENABLE ROW LEVEL SECURITY;`);
  lines.push(`TRUNCATE ${STAGING_TABLE};`);
  lines.push('');

  const columns = [
    'lesson_id',
    'title',
    ...FLAT_FIELDS,
    'grade_levels',
    'academic_concepts',
    'changed',
  ];
  // A VALUES clause with zero tuples is invalid Postgres — guard the empty
  // case with a comment (mirrors the draft-migration builder's no-rows guard).
  if (rows.length === 0) {
    lines.push('-- (no staged rows)');
  } else {
    lines.push(`INSERT INTO ${STAGING_TABLE} (${columns.join(', ')}) VALUES`);
    const valueRows = rows.map((r) => {
      const cells = [
        sqlTextLiteral(r.id),
        sqlTextLiteral(r.title),
        ...FLAT_FIELDS.map((f) => sqlTextArrayLiteral(r.fields[f] ?? [])),
        sqlTextArrayLiteral(r.gradeLevels),
        sqlJsonbLiteral(r.academicConcepts),
        r.changed ? 'true' : 'false',
      ];
      return `  (${cells.join(', ')})`;
    });
    lines.push(`${valueRows.join(',\n')};`);
  }
  lines.push('');
  return `${lines.join('\n')}\n`;
}

// ---------------------------------------------------------------------------
// Draft apply migration (pure) — mirrors the PR-5 emitter precedent
// ---------------------------------------------------------------------------

/** The set of lessons that actually change (only these are snapshotted + updated). */
function changedRows(rows: StagingRow[]): StagingRow[] {
  return rows.filter((r) => r.changed);
}

function rollbackSnapshotDdl(): string[] {
  const lines: string[] = [];
  lines.push('-- =====================================================');
  lines.push('-- (1) Rollback snapshot — original values of every changing row');
  lines.push('-- =====================================================');
  lines.push(`CREATE TABLE IF NOT EXISTS ${ROLLBACK_TABLE} (`);
  lines.push('  lesson_id text PRIMARY KEY,');
  for (const field of FLAT_FIELDS) lines.push(`  ${field} text[],`);
  lines.push('  grade_levels text[],');
  lines.push('  metadata jsonb');
  lines.push(');');
  lines.push('-- Service-role-only: RLS enabled with NO policies.');
  lines.push(`ALTER TABLE ${ROLLBACK_TABLE} ENABLE ROW LEVEL SECURITY;`);
  lines.push('');
  return lines;
}

/**
 * The snapshot INSERT: for each changing lesson, capture its CURRENT column
 * values + full metadata jsonb. ON CONFLICT DO NOTHING so a re-run never
 * overwrites the original pre-apply values (idempotency, PR-5 precedent).
 */
function rollbackSnapshotInsert(rows: StagingRow[]): string[] {
  const lines: string[] = [];
  const cols = ['lesson_id', ...FLAT_FIELDS, 'grade_levels', 'metadata'];
  const selectCols = [
    'l.lesson_id',
    ...FLAT_FIELDS.map((f) => `l.${f}`),
    'l.grade_levels',
    'l.metadata',
  ];
  const ids = rows.map((r) => sqlTextLiteral(r.id)).join(', ');
  lines.push(`INSERT INTO ${ROLLBACK_TABLE} (${cols.join(', ')})`);
  lines.push(`SELECT ${selectCols.join(', ')}`);
  lines.push('FROM public.lessons l');
  lines.push(`WHERE l.lesson_id IN (${ids})`);
  lines.push('ON CONFLICT (lesson_id) DO NOTHING;');
  lines.push('');
  return lines;
}

/**
 * One dual-write UPDATE per changing lesson. Each sets ABSOLUTE new values
 * (idempotent re-apply). For every flat field: write BOTH the text[] column AND
 * jsonb_set the matching camelCase metadata key. academic_concepts (column:
 * null) is written as the metadata->academicConcepts JSONB key ONLY.
 *
 * All metadata key writes are chained through a single jsonb_set expression so
 * one UPDATE statement leaves the row fully canonical.
 */
function applyUpdate(row: StagingRow, vocab: Stage2Vocab): string[] {
  const setClauses: string[] = [];

  // Flat columns (11 enum fields + grade_levels).
  for (const field of FLAT_FIELDS) {
    setClauses.push(`  ${field} = ${sqlTextArrayLiteral(row.fields[field] ?? [])}`);
  }
  setClauses.push(`  grade_levels = ${sqlTextArrayLiteral(row.gradeLevels)}`);

  // metadata JSONB: chain jsonb_set for every camelCase key (the 11 flat fields'
  // keys + gradeLevels + academicConcepts). academic_concepts contributes ONLY
  // its JSONB key (no text[] column write above).
  let metaExpr = "COALESCE(metadata, '{}'::jsonb)";
  for (const field of FLAT_FIELDS) {
    const fieldVocab: FieldVocab = vocab[field];
    metaExpr = `jsonb_set(${metaExpr}, '{${fieldVocab.jsonbKey}}', ${sqlJsonbLiteral(
      row.fields[field] ?? []
    )}, true)`;
  }
  metaExpr = `jsonb_set(${metaExpr}, '{gradeLevels}', ${sqlJsonbLiteral(row.gradeLevels)}, true)`;
  metaExpr = `jsonb_set(${metaExpr}, '{${vocab.academic_concepts.jsonbKey}}', ${sqlJsonbLiteral(
    row.academicConcepts
  )}, true)`;
  setClauses.push(`  metadata = ${metaExpr}`);

  const lines: string[] = [];
  lines.push(`UPDATE public.lessons SET`);
  lines.push(`${setClauses.join(',\n')}`);
  lines.push(`WHERE lesson_id = ${sqlTextLiteral(row.id)};`);
  return lines;
}

/**
 * Builds the DRAFT apply migration text (mirrors PR-5's
 * 20260611000000_pr5a_heritage_canonicalization.sql shape): a header comment,
 * the rollback snapshot DDL + guarded INSERT of changing rows, then one
 * absolute-value dual-write UPDATE per changing lesson, plus a commented
 * rollback recipe. This is a TEXT ARTIFACT — never executed, never written
 * under supabase/migrations/. PR C authors the real, reviewed migration.
 */
export function buildApplyMigrationSql(
  rows: StagingRow[],
  vocab: Stage2Vocab,
  report: DiffReport
): string {
  const changing = changedRows(rows);
  const lines: string[] = [];

  lines.push('-- =====================================================');
  lines.push('-- DRAFT apply migration: pr6 stage-2 re-tag (PREVIEW ONLY)');
  lines.push('-- =====================================================');
  lines.push('-- GENERATED by scripts/stage2-retag/prepare-apply.ts — DRAFT preview of');
  lines.push("-- PR C's apply migration. NOT under supabase/migrations/, NEVER executed");
  lines.push('-- as-is. PR C authors the reviewed migration (database-migrations skill).');
  lines.push('--');
  lines.push(
    `-- Compared lessons: ${report.comparedLessons}; staged: ${rows.length}; ` +
      `changing (snapshotted + updated): ${changing.length}.`
  );
  lines.push('--');
  lines.push('-- Mechanism (design §4 OQ7): snapshot every changing row into');
  lines.push(`-- ${ROLLBACK_TABLE} FIRST (ON CONFLICT DO NOTHING — re-run safe), then`);
  lines.push('-- per-lesson dual-write UPDATEs that set ABSOLUTE values (idempotent).');
  lines.push('-- Every flat field writes BOTH the lessons text[] column AND its camelCase');
  lines.push('-- metadata JSONB key. academic_concepts is JSONB-only (vocab column: null)');
  lines.push('-- — written at metadata->academicConcepts, never a text[] column.');
  lines.push('-- CHECK constraints for the newly-locked small-field enums are added in');
  lines.push('-- PR C AFTER the data is canonical (ordering load-bearing) — NOT here.');
  lines.push('');

  lines.push(...rollbackSnapshotDdl());
  lines.push('-- =====================================================');
  lines.push('-- (1b) Snapshot the current values of every changing row');
  lines.push('-- =====================================================');
  if (changing.length === 0) {
    lines.push('-- (no changing rows)');
  } else {
    lines.push(...rollbackSnapshotInsert(changing));
  }

  lines.push('-- =====================================================');
  lines.push('-- (2) Apply: per-lesson dual-write UPDATEs (absolute values)');
  lines.push('-- =====================================================');
  if (changing.length === 0) {
    lines.push('-- (no changing rows)');
    lines.push('');
  } else {
    for (const row of changing) {
      lines.push(...applyUpdate(row, vocab));
      lines.push('');
    }
  }

  lines.push('-- =====================================================');
  lines.push('-- ROLLBACK (keep as comments)');
  lines.push('-- =====================================================');
  lines.push('-- Restore reads the snapshot table (forward migration). Restoring the');
  lines.push('-- columns + metadata is sufficient:');
  lines.push('--');
  lines.push('-- UPDATE public.lessons l SET');
  for (const field of FLAT_FIELDS) lines.push(`--   ${field} = r.${field},`);
  lines.push('--   grade_levels = r.grade_levels,');
  lines.push('--   metadata = r.metadata');
  lines.push(`-- FROM ${ROLLBACK_TABLE} r WHERE l.lesson_id = r.lesson_id;`);
  lines.push('--');
  lines.push(`-- DROP TABLE IF EXISTS ${ROLLBACK_TABLE};  -- after PR E cleanup`);
  return `${lines.join('\n')}\n`;
}

// ---------------------------------------------------------------------------
// Spot-check sampling (pure, deterministic)
// ---------------------------------------------------------------------------

export type SpotCheckBucket = 'changed-heavily' | 'unchanged-or-light' | 'weird-edge-case';

export interface SpotCheckSample {
  id: string;
  title: string;
  bucket: SpotCheckBucket;
  row: StagingRow;
}

export interface SpotCheckOptions {
  /** RNG seed (recorded in the worksheet so the sample is reproducible). */
  seed: number;
  /** Target sample count per bucket (the overall ~50-100 budget / 3). */
  perBucket: number;
}

/** Mulberry32 — a tiny deterministic PRNG (seed → repeatable [0,1) sequence). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic Fisher-Yates shuffle keyed off the seeded PRNG. */
function seededShuffle<T>(items: T[], rand: () => number): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * An "edge case" worth a closer look, beyond an ordinary clean re-tag:
 *   - the source record failed Zod (after the B4 gate this should be none, but
 *     it stays the strongest signal);
 *   - the lesson was rescued by the --fallback-model after a refusal
 *     (phase: 'fallback') — a model disagreement worth a human glance;
 *   - the runner applied one or more code-enforced mechanical normalizations
 *     (the deterministic rules edited the model's output).
 * These populate the weird-edge-case bucket even on a 100%-Zod-pass run.
 */
export function isEdgeCase(row: StagingRow): boolean {
  return !row.zodPassed || row.phase === 'fallback' || row.normalizationCount > 0;
}

/**
 * Buckets a staging row for spot-checking:
 *   - weird-edge-case: an edge-case signal fired (see isEdgeCase) — highest
 *     review priority.
 *   - changed-heavily: 3+ fields changed.
 *   - unchanged-or-light: 0-2 fields changed.
 * The edge-case signal wins over change magnitude so the trickiest lessons
 * always surface for review.
 */
function bucketOf(row: StagingRow): SpotCheckBucket {
  if (isEdgeCase(row)) return 'weird-edge-case';
  if (row.changeMagnitude >= 3) return 'changed-heavily';
  return 'unchanged-or-light';
}

const BUCKET_ORDER: SpotCheckBucket[] = [
  'changed-heavily',
  'unchanged-or-light',
  'weird-edge-case',
];

/**
 * Deterministically samples ~perBucket lessons from each of the three buckets
 * (a lesson appears in exactly one bucket). The `report` argument is accepted
 * for signature symmetry / future per-field weighting; bucketing is driven by
 * the staging rows. Selection is reproducible for a fixed seed.
 */
export function sampleSpotCheck(
  rows: StagingRow[],
  _report: DiffReport,
  options: SpotCheckOptions
): SpotCheckSample[] {
  const rand = mulberry32(options.seed);
  const byBucket = new Map<SpotCheckBucket, StagingRow[]>();
  for (const bucket of BUCKET_ORDER) byBucket.set(bucket, []);
  for (const row of rows) byBucket.get(bucketOf(row))!.push(row);

  const samples: SpotCheckSample[] = [];
  for (const bucket of BUCKET_ORDER) {
    const pool = byBucket.get(bucket)!;
    const picked = seededShuffle(pool, rand).slice(0, options.perBucket);
    for (const row of picked) {
      samples.push({ id: row.id, title: row.title, bucket, row });
    }
  }
  return samples;
}

// ---------------------------------------------------------------------------
// Spot-check worksheet rendering (pure, plain-language markdown)
// ---------------------------------------------------------------------------

const BUCKET_HEADINGS: Record<SpotCheckBucket, string> = {
  'changed-heavily': 'Lessons that change a lot',
  'unchanged-or-light': 'Lessons that barely change (or not at all)',
  'weird-edge-case': 'Weird / edge-case lessons (worth a closer look)',
};

const BUCKET_BLURBS: Record<SpotCheckBucket, string> = {
  'changed-heavily':
    'These lessons gain or lose three or more tag fields. Check that the new tags ' +
    'match what the lesson is actually about.',
  'unchanged-or-light':
    'These lessons keep most of their tags. Confirm nothing useful was dropped.',
  'weird-edge-case':
    'Something about these needed extra handling — a validation problem, a model ' +
    'refusal that the backup model rescued, or an automatic clean-up rule that edited ' +
    'the tags. Look closely; they are the most likely to need a fix before applying.',
};

function quote(value: string): string {
  return `"${value}"`;
}

function valueList(values: string[]): string {
  return values.length === 0 ? '_(none)_' : values.map(quote).join(', ');
}

/**
 * Renders the per-field lines for one sampled lesson. Changed flat fields show
 * `old → new`; unchanged fields with values are shown as a plain list so the
 * reviewer sees the full proposed tag set. academic_concepts and grade_levels
 * (no before/after) are shown as their proposed values.
 */
function renderSampleFieldLines(sample: SpotCheckSample, vocab: Stage2Vocab): string[] {
  const lines: string[] = [];
  const r = sample.row;
  for (const field of FLAT_FIELDS) {
    const newValues = r.fields[field] ?? [];
    const oldValues = r.currentFields[field] ?? [];
    if (newValues.length === 0 && oldValues.length === 0) continue;
    if (setsEqual(oldValues, newValues)) {
      lines.push(`  - **${vocab[field].label}:** ${valueList(newValues)}`);
    } else {
      lines.push(
        `  - **${vocab[field].label}:** ${valueList(oldValues)} → ${valueList(newValues)}`
      );
    }
  }
  const conceptSubjects = [
    ...new Set([...Object.keys(r.academicConcepts), ...Object.keys(r.currentConcepts)]),
  ].sort();
  if (conceptSubjects.length > 0) {
    const parts = conceptSubjects.map((s) => {
      const oldList = r.currentConcepts[s] ?? [];
      const newList = r.academicConcepts[s] ?? [];
      return setsEqual(oldList, newList)
        ? `${s}: ${valueList(newList)}`
        : `${s}: ${valueList(oldList)} → ${valueList(newList)}`;
    });
    lines.push(`  - **${vocab.academic_concepts.label}:** ${parts.join('; ')}`);
  }
  if (r.gradeLevels.length > 0) {
    lines.push(
      `  - **Grade Levels** (reviewed separately, no before/after): ${r.gradeLevels.join(', ')}`
    );
  }
  return lines;
}

/**
 * Renders the spot-check worksheet as plain-language markdown. One section per
 * bucket; each sampled lesson shows its proposed tags (the "→" old→new framing
 * lives in the diff report — here we show the final proposed tag set, which is
 * what gets applied). grade_levels is flagged as separately reviewed.
 */
export function renderSpotCheckWorksheet(
  samples: SpotCheckSample[],
  vocab: Stage2Vocab,
  options?: { seed?: number; total?: number }
): string {
  const lines: string[] = [];
  lines.push('# Stage 2 re-tag — spot-check worksheet');
  lines.push('');
  lines.push(
    'A sample of lessons to review before the new tags are applied. Nothing has been ' +
      'changed in the database yet — this is a preview. Each lesson below shows the tags ' +
      'the re-tagging run **proposes** to give it. For a full old-vs-new comparison of ' +
      'every lesson, see the diff report.'
  );
  lines.push('');
  if (options?.seed !== undefined) {
    lines.push(
      `Sample: ${samples.length} lessons (seed \`${options.seed}\`, reproducible). ` +
        'Grouped into three buckets so you see heavy changes, light changes, and the ' +
        'tricky edge cases.'
    );
    lines.push('');
  }

  for (const bucket of BUCKET_ORDER) {
    const inBucket = samples.filter((s) => s.bucket === bucket);
    lines.push(`## ${BUCKET_HEADINGS[bucket]} (${inBucket.length})`);
    lines.push('');
    lines.push(BUCKET_BLURBS[bucket]);
    lines.push('');
    if (inBucket.length === 0) {
      lines.push('_None in this sample._');
      lines.push('');
      continue;
    }
    for (const sample of inBucket) {
      lines.push(`- **${sample.title}** (\`${sample.id}\`)`);
      lines.push(...renderSampleFieldLines(sample, vocab));
    }
    lines.push('');
  }
  return `${lines.join('\n')}\n`;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export interface Args {
  run: string;
  corpus: string;
  exclusions: string;
  stagingSql: string;
  stagingCsv: string;
  migration: string;
  worksheet: string;
  diffReport?: string;
  seed: number;
  perBucket: number;
  help: boolean;
}

export function parseArgs(argv: string[]): Args {
  const args: Args = {
    run: DEFAULT_RUN_PATH,
    corpus: DEFAULT_CORPUS_PATH,
    exclusions: DEFAULT_CORPUS_EXCLUSIONS_PATH,
    stagingSql: DEFAULT_STAGING_SQL_PATH,
    stagingCsv: DEFAULT_STAGING_CSV_PATH,
    migration: DEFAULT_MIGRATION_PATH,
    worksheet: DEFAULT_WORKSHEET_PATH,
    seed: 20260612,
    perBucket: 30,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const next = argv[i + 1];
    switch (flag) {
      case '--run':
        args.run = requireFlagValue(flag, next);
        i++;
        break;
      case '--corpus':
        args.corpus = requireFlagValue(flag, next);
        i++;
        break;
      case '--exclusions':
        args.exclusions = requireFlagValue(flag, next);
        i++;
        break;
      case '--staging-sql':
        args.stagingSql = requireFlagValue(flag, next);
        i++;
        break;
      case '--staging-csv':
        args.stagingCsv = requireFlagValue(flag, next);
        i++;
        break;
      case '--migration':
        args.migration = requireFlagValue(flag, next);
        i++;
        break;
      case '--worksheet':
        args.worksheet = requireFlagValue(flag, next);
        i++;
        break;
      case '--seed':
        args.seed = requireIntFlag(flag, next, 0);
        i++;
        break;
      case '--per-bucket':
        args.perBucket = requireIntFlag(flag, next, 1);
        i++;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      default:
        throw new Error(`unknown flag: ${flag} (use --help for usage)`);
    }
  }
  return args;
}

const HELP = `
Stage 2 re-tag apply-artifact emitter (task B5b) — turns the full-run output
into apply-ready, review-only artifacts. WRITES NOTHING to any database and
creates NO migration file under supabase/migrations/.

Usage:
  npx tsx scripts/stage2-retag/prepare-apply.ts [flags]

Flags:
  --run <path>          run-output JSONL (default artifacts/full-run.fable.jsonl)
  --corpus <path>       corpus JSONL (default artifacts/corpus.jsonl)
  --exclusions <path>   corpus-exclusions JSON (default data/corpus-exclusions.json)
  --staging-sql <path>  staging-table SQL artifact (default artifacts/pr6-retag-staging.sql)
  --staging-csv <path>  staging CSV artifact (default artifacts/pr6-retag-staging.csv)
  --migration <path>    DRAFT apply migration text (default artifacts/pr6-retag-apply.draft.sql)
  --worksheet <path>    spot-check worksheet (default artifacts/pr6-retag-spot-check.md)
  --seed <n>            spot-check RNG seed (default 20260612)
  --per-bucket <n>      spot-check samples per bucket (default 30 → ~90 total)
  --help

Reporting only: no API calls, no DB access. The emitted .sql is a TEXT ARTIFACT,
never executed; the real migration is PR C's job.
`;

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }
  for (const out of [args.stagingSql, args.stagingCsv, args.migration, args.worksheet]) {
    warnIfOutsideArtifacts(out);
  }

  const vocab = loadVocab();
  const corpus = parseCorpusRecords(readFileSync(args.corpus, 'utf8'));
  const runRecords = parseRunRecords(readFileSync(args.run, 'utf8'));
  const excludedIds = new Set(loadCorpusExclusions(args.exclusions).map((entry) => entry.id));

  const rows = buildStagingRows(corpus, runRecords, vocab, excludedIds);
  const report = buildDiffReport(corpus, runRecords, vocab, excludedIds);
  const samples = sampleSpotCheck(rows, report, { seed: args.seed, perBucket: args.perBucket });

  for (const out of [args.stagingSql, args.stagingCsv, args.migration, args.worksheet]) {
    mkdirSync(path.dirname(out), { recursive: true });
  }
  writeFileSync(args.stagingSql, renderStagingSql(rows, vocab), 'utf8');
  writeFileSync(args.stagingCsv, renderStagingCsv(rows, vocab), 'utf8');
  writeFileSync(args.migration, buildApplyMigrationSql(rows, vocab, report), 'utf8');
  writeFileSync(
    args.worksheet,
    renderSpotCheckWorksheet(samples, vocab, { seed: args.seed, total: samples.length }),
    'utf8'
  );

  const changing = rows.filter((r) => r.changed).length;
  console.log(
    `prepare-apply: ${rows.length} staged lessons (${changing} changing), ` +
      `${samples.length} spot-check samples.\n` +
      `  staging SQL  → ${args.stagingSql}\n` +
      `  staging CSV  → ${args.stagingCsv}\n` +
      `  draft migration → ${args.migration}\n` +
      `  spot-check worksheet → ${args.worksheet}`
  );
}

const isDirectInvocation =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectInvocation) {
  try {
    main();
  } catch (error) {
    console.error('❌ prepare-apply failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
