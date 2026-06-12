#!/usr/bin/env npx tsx
/* eslint-disable no-console -- CLI script: console output is the operator UI */
/**
 * Stage 2 re-tag — task B3: answer-key scoring.
 *
 * Scores one or more CONTESTANTS against the human-verified answer key
 * (artifacts/answer-key.final.jsonl, 57 lessons) and emits a markdown
 * scorecard + a JSON sidecar. Contestants:
 *   - v3   = the current PROD tags, read straight off the corpus snapshot
 *            (`--v3-from-corpus <path>`; the corpus carries the SAME field
 *            names). v3 has no grade_levels → scored as the empty set there.
 *   - fable / o47 = run-retag output JSONL (`--run <label>=<path>`); the
 *            contestant tags live in each record's `rawInput`. The LATEST
 *            record per id wins (repair records supersede their main record),
 *            mirroring validate-output.ts.
 *
 * Scoring (reuses scripts/lib/evalMetrics — the F1/recall machinery is NOT
 * reimplemented here):
 *   - Each scored field becomes a multi-label problem over the 57 key lessons.
 *     For a field, every lesson contributes one prediction token-set and one
 *     truth token-set; the vocabulary is the union of tokens seen in either.
 *   - Per-field F1 = the MICRO F1 over value occurrences for that field
 *     (computeMetrics(...).micro.f1).
 *   - Per-value recall = computeMetrics(...).perValue[].recall (of the key rows
 *     carrying a value, the fraction the contestant also carries).
 *   - macroF1 = the mean of the defined per-field micro-F1s across all fields.
 *   - academic_concepts scores on per-subject framework values, flattened to
 *     "Subject: Value" tokens (tolerant of BOTH the answer-key/v3 plain
 *     string-array shape and the run-record {framework:[],…} shape).
 *   - grade_levels scores as a set of grade tokens.
 *   - A lesson MISSING from a contestant's records is scored as all-empty
 *     (every field → no prediction tokens), and counted in a coverage line.
 *
 * Gates (impl plan B3): for the winning model —
 *   1. per-field F1 >= v3 on EVERY field;
 *   2. macroF1 >= 0.7;
 *   3. per-value recall >= 0.5 (lists each failing value).
 *
 * Reporting only: no API calls, no DB access.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import { computeMetrics, type PerValueMetrics } from '../lib/evalMetrics';
import { RESULT_PROPERTIES } from './schema';
import {
  parseRunRecords,
  latestRecordById,
  requireFlagValue,
  warnIfOutsideArtifacts,
} from './run-retag';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS_DIR = path.join(MODULE_DIR, 'artifacts');
const DEFAULT_KEY_PATH = path.join(ARTIFACTS_DIR, 'answer-key.final.jsonl');
const DEFAULT_CORPUS_PATH = path.join(ARTIFACTS_DIR, 'corpus.jsonl');
const DEFAULT_OUTPUT_PATH = path.join(ARTIFACTS_DIR, 'answer-key-scorecard.md');

/** The 13 scored fields (same set the runner validates). */
export const SCORED_FIELDS = [...RESULT_PROPERTIES] as readonly string[];

/** Macro-F1 floor (B3 gate 2). */
export const MACRO_F1_FLOOR = 0.7;
/** Per-value recall floor (B3 gate 3). */
export const RECALL_FLOOR = 0.5;

// ---------------------------------------------------------------------------
// Record shapes
// ---------------------------------------------------------------------------

/** A tag-bearing record: the answer key, a v3 corpus row, or a run rawInput. */
export type TaggedRecord = Record<string, unknown> & { id: string };
/** Alias used by callers/tests for the answer-key rows specifically. */
export type KeyRecord = TaggedRecord;

// ---------------------------------------------------------------------------
// Token extraction (pure)
// ---------------------------------------------------------------------------

/** True for a plain (non-array) object. */
function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** The string elements of an array value (drops non-strings); [] otherwise. */
function stringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

/**
 * Per-subject framework values out of an academic_concepts value, tolerant of
 * BOTH shapes:
 *   - answer-key / v3 corpus:  { Subject: string[] }
 *   - run-record output:       { Subject: { framework: string[], … } }
 * Returns "Subject: Value" tokens. Subjects iterate in object-key order.
 */
function academicConceptTokens(value: unknown): string[] {
  if (!isPlainObject(value)) return [];
  const tokens: string[] = [];
  for (const [subject, subjectValue] of Object.entries(value)) {
    let values: string[];
    if (Array.isArray(subjectValue)) {
      values = stringArray(subjectValue);
    } else if (isPlainObject(subjectValue)) {
      values = stringArray(subjectValue.framework);
    } else {
      values = [];
    }
    for (const v of values) tokens.push(`${subject}: ${v}`);
  }
  return tokens;
}

/**
 * The scored token set for one field of one record. Flat fields (including
 * grade_levels) return their string-array values; academic_concepts flattens
 * subject→framework values to "Subject: Value" tokens. Absent / null / wrong-
 * shape values yield [].
 */
export function extractFieldTokens(field: string, record: Record<string, unknown>): string[] {
  if (field === 'academic_concepts') return academicConceptTokens(record.academic_concepts);
  return stringArray(record[field]);
}

// ---------------------------------------------------------------------------
// Scoring (reuses computeMetrics)
// ---------------------------------------------------------------------------

export interface FieldScore {
  field: string;
  /** Per-field F1 = micro F1 over value occurrences (null/NaN if no tokens). */
  f1: number | null;
  /** Per-value metrics (recall is the B3 gate-3 figure). */
  perValue: PerValueMetrics[];
}

export interface ContestantScore {
  label: string;
  macroF1: number;
  fields: Record<string, FieldScore>;
  coverage: {
    keyLessons: number;
    present: number;
    /** Key ids with NO record in this contestant (scored all-empty), sorted. */
    missing: string[];
  };
}

/**
 * Scores one contestant against the key. `contestantRecords` need not cover
 * every key lesson — a missing lesson contributes empty prediction token-sets
 * for every field (and is reported in coverage.missing).
 */
export function scoreContestant(
  label: string,
  key: KeyRecord[],
  contestantRecords: TaggedRecord[]
): ContestantScore {
  const byId = new Map(contestantRecords.map((r) => [r.id, r]));
  const present = key.filter((k) => byId.has(k.id)).length;
  const missing = key
    .filter((k) => !byId.has(k.id))
    .map((k) => k.id)
    .sort();

  const fields: Record<string, FieldScore> = {};
  const definedF1: number[] = [];
  for (const field of SCORED_FIELDS) {
    const truth: string[][] = [];
    const predictions: string[][] = [];
    const vocab = new Set<string>();
    for (const keyRecord of key) {
      const truthTokens = extractFieldTokens(field, keyRecord);
      const contestant = byId.get(keyRecord.id);
      const predTokens = contestant ? extractFieldTokens(field, contestant) : [];
      truth.push(truthTokens);
      predictions.push(predTokens);
      for (const t of truthTokens) vocab.add(t);
      for (const t of predTokens) vocab.add(t);
    }
    const metrics = computeMetrics(predictions, truth, [...vocab].sort());
    const f1 = Number.isNaN(metrics.micro.f1) ? null : metrics.micro.f1;
    if (f1 !== null) definedF1.push(f1);
    fields[field] = { field, f1, perValue: metrics.perValue };
  }

  const macroF1 =
    definedF1.length === 0 ? NaN : definedF1.reduce((s, v) => s + v, 0) / definedF1.length;
  return {
    label,
    macroF1,
    fields,
    coverage: { keyLessons: key.length, present, missing },
  };
}

// ---------------------------------------------------------------------------
// Gates (impl plan B3)
// ---------------------------------------------------------------------------

export interface GateResults {
  /** Gate 1: winner per-field F1 >= v3 on EVERY field. */
  perFieldVsV3: {
    passed: boolean;
    failingFields: Array<{ field: string; winner: number | null; v3: number | null }>;
  };
  /** Gate 2: macroF1 >= 0.7. */
  macroF1: { passed: boolean; value: number; floor: number };
  /** Gate 3: per-value recall >= 0.5 (failing values listed). */
  recall: {
    passed: boolean;
    floor: number;
    failingValues: Array<{ field: string; value: string; recall: number }>;
  };
}

/** Compares a (defined) winner F1 against v3: winner must be >= v3. A null
 *  winner F1 is treated as 0 vs a defined v3; both-null is not a failure. */
function fieldBelowV3(winner: number | null, v3: number | null): boolean {
  if (v3 === null) return false; // no v3 baseline for this field → nothing to beat
  const w = winner ?? 0;
  return w < v3;
}

export function evaluateGates(winner: ContestantScore, v3: ContestantScore): GateResults {
  const failingFields: Array<{ field: string; winner: number | null; v3: number | null }> = [];
  for (const field of SCORED_FIELDS) {
    const w = winner.fields[field]?.f1 ?? null;
    const baseline = v3.fields[field]?.f1 ?? null;
    if (fieldBelowV3(w, baseline)) failingFields.push({ field, winner: w, v3: baseline });
  }

  const failingValues: Array<{ field: string; value: string; recall: number }> = [];
  for (const field of SCORED_FIELDS) {
    for (const pv of winner.fields[field]?.perValue ?? []) {
      if (pv.recall !== null && pv.recall < RECALL_FLOOR) {
        failingValues.push({ field, value: pv.value, recall: pv.recall });
      }
    }
  }

  const macroPassed = !Number.isNaN(winner.macroF1) && winner.macroF1 >= MACRO_F1_FLOOR;
  return {
    perFieldVsV3: { passed: failingFields.length === 0, failingFields },
    macroF1: { passed: macroPassed, value: winner.macroF1, floor: MACRO_F1_FLOOR },
    recall: { passed: failingValues.length === 0, floor: RECALL_FLOOR, failingValues },
  };
}

// ---------------------------------------------------------------------------
// Emission — JSON sidecar
// ---------------------------------------------------------------------------

export interface ScorecardJson {
  generatedAt: string;
  keyLessons: number;
  winningLabel: string;
  contestants: ContestantScore[];
  gates: GateResults;
}

export function buildScorecardJson(
  contestants: ContestantScore[],
  winningLabel: string,
  v3: ContestantScore
): ScorecardJson {
  const winner = contestants.find((c) => c.label === winningLabel);
  if (!winner) throw new Error(`winning label "${winningLabel}" is not among the contestants`);
  return {
    generatedAt: new Date().toISOString(),
    keyLessons: v3.coverage.keyLessons,
    winningLabel,
    contestants,
    gates: evaluateGates(winner, v3),
  };
}

// ---------------------------------------------------------------------------
// Emission — markdown
// ---------------------------------------------------------------------------

function fmt(v: number | null): string {
  if (v === null || Number.isNaN(v)) return '—';
  return v.toFixed(3);
}

export function renderScorecardMarkdown(
  contestants: ContestantScore[],
  winningLabel: string,
  v3: ContestantScore
): string {
  const winner = contestants.find((c) => c.label === winningLabel);
  if (!winner) throw new Error(`winning label "${winningLabel}" is not among the contestants`);
  const gates = evaluateGates(winner, v3);
  const lines: string[] = [];

  lines.push('# Stage 2 re-tag — answer-key scorecard');
  lines.push('');
  lines.push(`Key lessons: ${v3.coverage.keyLessons}. Winning model: \`${winningLabel}\`.`);
  lines.push('');

  // Coverage
  lines.push('## Coverage');
  lines.push('');
  lines.push('| Contestant | Lessons present | Missing (scored all-empty) |');
  lines.push('| --- | --- | --- |');
  for (const c of contestants) {
    const missing = c.coverage.missing.length === 0 ? '—' : `${c.coverage.missing.length}`;
    lines.push(`| \`${c.label}\` | ${c.coverage.present}/${c.coverage.keyLessons} | ${missing} |`);
  }
  lines.push('');

  // Per-field F1 table (one column per contestant) + macroF1 row.
  lines.push('## Per-field F1 (micro over value occurrences)');
  lines.push('');
  lines.push(`| Field | ${contestants.map((c) => `\`${c.label}\``).join(' | ')} |`);
  lines.push(`| --- | ${contestants.map(() => '---').join(' | ')} |`);
  for (const field of SCORED_FIELDS) {
    const cells = contestants.map((c) => fmt(c.fields[field]?.f1 ?? null));
    lines.push(`| ${field} | ${cells.join(' | ')} |`);
  }
  lines.push(`| **macroF1** | ${contestants.map((c) => `**${fmt(c.macroF1)}**`).join(' | ')} |`);
  lines.push('');

  // Gates
  lines.push('## Gates (winning model)');
  lines.push('');

  lines.push(
    `### Gate 1 — winning per-field F1 ≥ v3 on EVERY field: ${gates.perFieldVsV3.passed ? 'PASS' : 'FAIL'}`
  );
  lines.push('');
  if (gates.perFieldVsV3.failingFields.length === 0) {
    lines.push(`\`${winningLabel}\` meets or beats v3 on all ${SCORED_FIELDS.length} fields.`);
  } else {
    lines.push('Fields where the winner is below v3:');
    lines.push('');
    lines.push('| Field | winner F1 | v3 F1 |');
    lines.push('| --- | --- | --- |');
    for (const f of gates.perFieldVsV3.failingFields) {
      lines.push(`| ${f.field} | ${fmt(f.winner)} | ${fmt(f.v3)} |`);
    }
  }
  lines.push('');

  lines.push(`### Gate 2 — macroF1 ≥ ${MACRO_F1_FLOOR}: ${gates.macroF1.passed ? 'PASS' : 'FAIL'}`);
  lines.push('');
  lines.push(
    `\`${winningLabel}\` macroF1 = ${fmt(gates.macroF1.value)} (floor ${MACRO_F1_FLOOR}).`
  );
  lines.push('');

  lines.push(
    `### Gate 3 — per-value recall ≥ ${RECALL_FLOOR}: ${gates.recall.passed ? 'PASS' : 'FAIL'}`
  );
  lines.push('');
  if (gates.recall.failingValues.length === 0) {
    lines.push(`No value falls below the ${RECALL_FLOOR} recall floor.`);
  } else {
    lines.push(
      `${gates.recall.failingValues.length} value(s) below the ${RECALL_FLOOR} recall floor:`
    );
    lines.push('');
    lines.push('| Field | Value | recall |');
    lines.push('| --- | --- | --- |');
    for (const f of gates.recall.failingValues) {
      lines.push(`| ${f.field} | ${f.value} | ${f.recall.toFixed(3)} |`);
    }
  }
  lines.push('');

  return `${lines.join('\n')}\n`;
}

// ---------------------------------------------------------------------------
// Loading (filesystem)
// ---------------------------------------------------------------------------

const keyLineSchema = z.object({ id: z.string().min(1) }).passthrough();

/** Parses the answer-key JSONL (or any tagged JSONL) into records. */
export function parseTaggedJsonl(jsonlText: string): TaggedRecord[] {
  const records: TaggedRecord[] = [];
  for (const line of jsonlText.split('\n')) {
    if (line.trim() === '') continue;
    records.push(keyLineSchema.parse(JSON.parse(line)) as TaggedRecord);
  }
  return records;
}

/**
 * Extracts v3 contestant records (current PROD tags) from the corpus snapshot:
 * each corpus row already carries the scored field names. content_text/title
 * ride along harmlessly (only SCORED_FIELDS are read).
 */
export function loadV3FromCorpus(corpusJsonl: string): TaggedRecord[] {
  return parseTaggedJsonl(corpusJsonl);
}

/**
 * Extracts contestant records from a run-output JSONL: the LATEST record per id
 * wins (repair supersedes main), and the scored tags live in `rawInput`.
 * Records whose rawInput is not a plain object contribute no tags (id present,
 * empty token-sets everywhere — scored like a wrong-but-present answer).
 */
export function loadRunContestant(runJsonl: string): TaggedRecord[] {
  const latest = latestRecordById(parseRunRecords(runJsonl));
  const records: TaggedRecord[] = [];
  for (const [id, record] of latest) {
    const raw = record.rawInput;
    const tags = isPlainObject(raw) ? raw : {};
    records.push({ ...tags, id });
  }
  return records;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface RunSpec {
  label: string;
  path: string;
}

interface Args {
  key: string;
  runs: RunSpec[];
  v3FromCorpus?: string;
  output: string;
  help: boolean;
}

/** Parses a `label=path` --run value. */
export function parseRunSpec(value: string): RunSpec {
  const eq = value.indexOf('=');
  if (eq <= 0) {
    throw new Error(`--run expects <label>=<path>, got: ${value}`);
  }
  return { label: value.slice(0, eq), path: value.slice(eq + 1) };
}

export function parseArgs(argv: string[]): Args {
  const args: Args = { key: DEFAULT_KEY_PATH, runs: [], output: DEFAULT_OUTPUT_PATH, help: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const next = argv[i + 1];
    switch (flag) {
      case '--key':
        args.key = requireFlagValue(flag, next);
        i++;
        break;
      case '--run':
        args.runs.push(parseRunSpec(requireFlagValue(flag, next)));
        i++;
        break;
      case '--v3-from-corpus':
        args.v3FromCorpus = requireFlagValue(flag, next);
        i++;
        break;
      case '--output':
        args.output = requireFlagValue(flag, next);
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
Stage 2 re-tag — answer-key scoring (task B3).

Usage:
  npx tsx scripts/stage2-retag/score-answer-key.ts \\
    --key <path> --run <label>=<path> [--run <label>=<path> ...] \\
    [--v3-from-corpus <path>] --output <path>

Flags:
  --key <path>             answer key JSONL (default scripts/stage2-retag/artifacts/answer-key.final.jsonl)
  --run <label>=<path>     a contestant run-output JSONL (repeatable). The label
                           names the column (e.g. fable, o47). The LATEST record
                           per id wins; tags read from rawInput.
  --v3-from-corpus <path>  read the v3 contestant (current PROD tags) straight
                           off the corpus snapshot (default corpus.jsonl). v3 is
                           the baseline for gate 1.
  --output <path>          markdown scorecard (default
                           scripts/stage2-retag/artifacts/answer-key-scorecard.md);
                           a JSON sidecar is written alongside with a .json suffix.
  --help

Gates (winning model = the first --run label, or v3 if no runs): per-field F1 ≥
v3 everywhere; macroF1 ≥ ${MACRO_F1_FLOOR}; per-value recall ≥ ${RECALL_FLOOR}.
Reporting only: no API calls, no DB access.
`;

/** The JSON sidecar path for a markdown output path (swap/append .json). */
export function jsonSidecarPath(markdownPath: string): string {
  return markdownPath.replace(/\.md$/i, '') + '.json';
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }
  warnIfOutsideArtifacts(args.output);

  const key = parseTaggedJsonl(readFileSync(args.key, 'utf8'));

  const contestants: ContestantScore[] = [];
  // v3 first (the gate-1 baseline), if provided.
  const v3Path = args.v3FromCorpus ?? DEFAULT_CORPUS_PATH;
  const v3 = scoreContestant('v3', key, loadV3FromCorpus(readFileSync(v3Path, 'utf8')));
  contestants.push(v3);

  for (const run of args.runs) {
    contestants.push(
      scoreContestant(run.label, key, loadRunContestant(readFileSync(run.path, 'utf8')))
    );
  }

  // Winning model = the first run label (the contestant under test); falls back
  // to v3 when no runs were supplied (still produces a v3-only scorecard).
  const winningLabel = args.runs.length > 0 ? args.runs[0].label : 'v3';

  const markdown = renderScorecardMarkdown(contestants, winningLabel, v3);
  const json = buildScorecardJson(contestants, winningLabel, v3);

  mkdirSync(path.dirname(args.output), { recursive: true });
  writeFileSync(args.output, markdown, 'utf8');
  const sidecar = jsonSidecarPath(args.output);
  writeFileSync(sidecar, `${JSON.stringify(json, null, 2)}\n`, 'utf8');

  console.log(markdown);
  console.log(`Markdown scorecard → ${args.output}`);
  console.log(`JSON sidecar       → ${sidecar}`);
}

const isDirectInvocation =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectInvocation) {
  try {
    main();
  } catch (error) {
    console.error('❌ Scoring failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
