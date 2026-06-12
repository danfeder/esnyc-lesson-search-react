#!/usr/bin/env npx tsx
/* eslint-disable no-console -- CLI script: console output is the operator UI */
/**
 * Stage 2 re-tag — task A7: run-level output validation summary.
 *
 * Reads a run-output JSONL (produced by run-retag.ts) plus the corpus export
 * (corpus.jsonl) and produces a run-level summary:
 *
 *   - records seen / missing vs the corpus (and run ids not in the corpus);
 *   - Zod pass/fail per field, from each lesson's LATEST record (later lines
 *     win — repair records supersede their failed main-pass records);
 *   - repair-pass outcomes (records now passing vs still failing; per-field
 *     attempt/success/failure tallies from the repairs provenance maps);
 *   - usage + cost totals across ALL records (every API call costs money,
 *     superseded or not);
 *   - an error inventory grouped by error message.
 *
 * Output: a machine-readable JSON summary (--summary-out, default
 * artifacts/run-summary.json) + a human-readable summary on stdout.
 *
 * This is a REPORTING tool: it never calls the API and never touches a
 * database. The PR-B gate ("100% Zod-pass post-repair before apply
 * artifacts", impl plan B4) is read off this summary by a human.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import {
  latestRecordById,
  parseRunRecords,
  requireFlagValue,
  warnIfOutsideArtifacts,
  type RunRecord,
} from './run-retag';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS_DIR = path.join(MODULE_DIR, 'artifacts');
const DEFAULT_RUN_PATH = path.join(ARTIFACTS_DIR, 'retag-run.jsonl');
const DEFAULT_CORPUS_PATH = path.join(ARTIFACTS_DIR, 'corpus.jsonl');
const DEFAULT_SUMMARY_PATH = path.join(ARTIFACTS_DIR, 'run-summary.json');

// ---------------------------------------------------------------------------
// Summary shape
// ---------------------------------------------------------------------------

export interface CorpusIndexEntry {
  id: string;
  title: string;
}

export interface RepairFieldTally {
  attempted: number;
  succeeded: number;
  failed: number;
}

/** Usage totals — like AnthropicUsage but with the cache counters always
 *  present and non-null (they sum to 0 when absent). */
export interface UsageTotals {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
}

export interface RunSummary {
  corpusLessons: number;
  uniqueIdsInRun: number;
  totalRecords: number;
  mainRecords: number;
  repairRecords: number;
  /** Corpus lessons with NO record in the run output (sorted by id). */
  missingFromRun: CorpusIndexEntry[];
  /** Run ids that match no corpus lesson (sorted). */
  unknownInRun: string[];
  /** Record counts per model / per prompt+schema hash, across all records. */
  models: Record<string, number>;
  promptSchemaHashes: Record<string, number>;
  /** Records produced with strict: true tool definitions (--strict runs). */
  strictRecords: number;
  /**
   * Latest record per lesson, bucketed exclusively: Zod-passed; Zod-failed
   * but output present (repairable / reviewable); no usable output (API
   * error, rawInput null).
   */
  latest: {
    zodPassed: number;
    zodFailedWithOutput: number;
    noUsableOutput: number;
  };
  /** Per-top-level-field Zod failure counts, from latest records only. */
  zodFailuresByField: Record<string, number>;
  /**
   * Code-enforced mechanical-rule normalizations (R1/R4/R5; see ./normalize),
   * counted from LATEST records, aggregated by BASE rule name (subject-scoped
   * `rule:subject` entries roll up under `rule`). Makes deterministic
   * enforcement visible in dry-run output.
   */
  normalizations: Record<string, number>;
  /**
   * Count of LATEST records carrying at least one academic_integration subject
   * that has NO framework concepts (R4 leaves these alone — they may be
   * legitimate — but flags them for human review).
   */
  integrationWithoutConcepts: number;
  repair: {
    recordsNowPassing: number;
    recordsStillFailing: number;
    fields: Record<string, RepairFieldTally>;
  };
  /** Usage totals across ALL records (repair records already aggregate
   *  their per-field call usage — provenance usage is NOT re-counted). */
  usage: UsageTotals;
  /** Sum of all known per-record costs. */
  totalCostUsd: number;
  /** Records with usage data but no cost figure (unknown model). */
  recordsWithoutCost: number;
  /** Error inventory across ALL records, grouped by message. */
  errors: Array<{ message: string; count: number; ids: string[] }>;
}

// ---------------------------------------------------------------------------
// Corpus index parsing (id + title is all this summary needs)
// ---------------------------------------------------------------------------

const corpusIndexLineSchema = z.object({ id: z.string().min(1), title: z.string() });

/** Parses corpus JSONL down to {id, title} per lesson. */
export function parseCorpusIndex(jsonlText: string): CorpusIndexEntry[] {
  const entries: CorpusIndexEntry[] = [];
  for (const line of jsonlText.split('\n')) {
    if (line.trim() === '') continue;
    const { id, title } = corpusIndexLineSchema.parse(JSON.parse(line));
    entries.push({ id, title });
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Summarization (pure — unit-tested on fixtures)
// ---------------------------------------------------------------------------

/** Loose shape for the repairs provenance map (run-retag writes richer). */
const repairOutcomeSchema = z.object({ error: z.string().nullable() }).passthrough();

/**
 * R4 flag: does this record's output carry an academic_integration subject
 * with no framework concepts? The normalizer leaves these in place (they may
 * be legitimate), so the summary surfaces them for human review.
 */
function hasIntegrationWithoutConcepts(rawInput: unknown): boolean {
  if (typeof rawInput !== 'object' || rawInput === null || Array.isArray(rawInput)) return false;
  const record = rawInput as Record<string, unknown>;
  const integration = record.academic_integration;
  if (!Array.isArray(integration)) return false;
  const concepts =
    typeof record.academic_concepts === 'object' &&
    record.academic_concepts !== null &&
    !Array.isArray(record.academic_concepts)
      ? (record.academic_concepts as Record<string, unknown>)
      : {};
  return integration.some((subject) => {
    if (typeof subject !== 'string') return false;
    const subjectConcepts = concepts[subject];
    if (
      typeof subjectConcepts !== 'object' ||
      subjectConcepts === null ||
      Array.isArray(subjectConcepts)
    ) {
      return true; // integrated subject with no concepts object at all
    }
    const framework = (subjectConcepts as Record<string, unknown>).framework;
    return !Array.isArray(framework) || framework.length === 0;
  });
}

export function summarizeRun(records: RunRecord[], corpus: CorpusIndexEntry[]): RunSummary {
  const corpusById = new Map(corpus.map((entry) => [entry.id, entry]));
  const latest = latestRecordById(records);

  const models: Record<string, number> = {};
  const promptSchemaHashes: Record<string, number> = {};
  const usage: UsageTotals = {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  };
  let mainRecords = 0;
  let repairRecords = 0;
  let strictRecords = 0;
  let totalCostUsd = 0;
  let recordsWithoutCost = 0;
  let recordsNowPassing = 0;
  let recordsStillFailing = 0;
  const repairFields: Record<string, RepairFieldTally> = {};
  const errorGroups = new Map<string, string[]>();

  for (const record of records) {
    if (record.phase === 'repair') repairRecords++;
    else mainRecords++;

    models[record.model] = (models[record.model] ?? 0) + 1;
    promptSchemaHashes[record.promptSchemaHash] =
      (promptSchemaHashes[record.promptSchemaHash] ?? 0) + 1;
    // === true: records parsed from pre-strict-field output files count as
    // non-strict rather than crashing the tally.
    if (record.strict === true) strictRecords++;

    if (record.usage) {
      usage.input_tokens += record.usage.input_tokens;
      usage.output_tokens += record.usage.output_tokens;
      usage.cache_creation_input_tokens += record.usage.cache_creation_input_tokens ?? 0;
      usage.cache_read_input_tokens += record.usage.cache_read_input_tokens ?? 0;
      if (record.costUsd === null) recordsWithoutCost++;
    }
    if (record.costUsd !== null) totalCostUsd += record.costUsd;

    if (record.error !== null) {
      const ids = errorGroups.get(record.error) ?? [];
      ids.push(record.id);
      errorGroups.set(record.error, ids);
    }

    if (record.phase === 'repair') {
      if (record.zod.passed) recordsNowPassing++;
      else recordsStillFailing++;
      for (const [fieldName, rawOutcome] of Object.entries(record.repairs ?? {})) {
        const tally = (repairFields[fieldName] ??= { attempted: 0, succeeded: 0, failed: 0 });
        tally.attempted++;
        const outcome = repairOutcomeSchema.safeParse(rawOutcome);
        if (outcome.success && outcome.data.error === null) tally.succeeded++;
        else tally.failed++;
      }
    }
  }

  let zodPassed = 0;
  let zodFailedWithOutput = 0;
  let noUsableOutput = 0;
  const zodFailuresByField: Record<string, number> = {};
  const normalizations: Record<string, number> = {};
  let integrationWithoutConcepts = 0;
  for (const record of latest.values()) {
    if (record.zod.passed) {
      zodPassed++;
    } else if (record.rawInput !== null && record.rawInput !== undefined) {
      zodFailedWithOutput++;
    } else {
      noUsableOutput++;
    }
    if (!record.zod.passed && record.zod.fieldErrors) {
      for (const fieldName of Object.keys(record.zod.fieldErrors)) {
        zodFailuresByField[fieldName] = (zodFailuresByField[fieldName] ?? 0) + 1;
      }
    }
    // Normalization provenance: aggregate `rule:subject` entries by base rule.
    for (const entry of record.normalizations ?? []) {
      const baseRule = entry.split(':', 1)[0];
      normalizations[baseRule] = (normalizations[baseRule] ?? 0) + 1;
    }
    if (hasIntegrationWithoutConcepts(record.rawInput)) integrationWithoutConcepts++;
  }

  const missingFromRun = corpus
    .filter((entry) => !latest.has(entry.id))
    .sort((a, b) => a.id.localeCompare(b.id));
  const unknownInRun = [...latest.keys()].filter((id) => !corpusById.has(id)).sort();

  const errors = [...errorGroups.entries()]
    .map(([message, ids]) => ({ message, count: ids.length, ids }))
    .sort((a, b) => b.count - a.count || a.message.localeCompare(b.message));

  return {
    corpusLessons: corpus.length,
    uniqueIdsInRun: latest.size,
    totalRecords: records.length,
    mainRecords,
    repairRecords,
    missingFromRun,
    unknownInRun,
    models,
    promptSchemaHashes,
    strictRecords,
    latest: { zodPassed, zodFailedWithOutput, noUsableOutput },
    zodFailuresByField,
    normalizations,
    integrationWithoutConcepts,
    repair: { recordsNowPassing, recordsStillFailing, fields: repairFields },
    usage,
    totalCostUsd,
    recordsWithoutCost,
    errors,
  };
}

// ---------------------------------------------------------------------------
// Human-readable formatting
// ---------------------------------------------------------------------------

const MAX_LISTED = 20;

function listWithCap<T>(items: T[], render: (item: T) => string): string[] {
  const lines = items.slice(0, MAX_LISTED).map((item) => `  - ${render(item)}`);
  if (items.length > MAX_LISTED) lines.push(`  … and ${items.length - MAX_LISTED} more`);
  return lines;
}

export function formatRunSummary(summary: RunSummary): string {
  const lines: string[] = [];
  lines.push('Stage 2 re-tag — run summary');
  lines.push('============================');
  lines.push(`Corpus lessons:        ${summary.corpusLessons}`);
  lines.push(
    `Run records:           ${summary.totalRecords} ` +
      `(${summary.mainRecords} main + ${summary.repairRecords} repair)`
  );
  lines.push(`Unique lessons in run: ${summary.uniqueIdsInRun}`);

  lines.push(`Missing from run:      ${summary.missingFromRun.length}`);
  lines.push(...listWithCap(summary.missingFromRun, (entry) => `${entry.id} (${entry.title})`));
  lines.push(`Not in corpus:         ${summary.unknownInRun.length}`);
  lines.push(...listWithCap(summary.unknownInRun, (id) => id));

  lines.push('');
  lines.push('Latest outcome per lesson:');
  lines.push(`  Zod-passed:          ${summary.latest.zodPassed}`);
  lines.push(`  Zod-failed (output): ${summary.latest.zodFailedWithOutput}`);
  lines.push(`  No usable output:    ${summary.latest.noUsableOutput}`);

  const failureFields = Object.entries(summary.zodFailuresByField).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  );
  if (failureFields.length > 0) {
    lines.push('');
    lines.push('Zod failures by field (latest records):');
    for (const [fieldName, count] of failureFields) lines.push(`  ${fieldName}: ${count}`);
  }

  const normRules = Object.entries(summary.normalizations).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  );
  lines.push('');
  lines.push('Code-enforced normalizations (latest records):');
  if (normRules.length === 0) {
    lines.push('  (none applied)');
  } else {
    for (const [rule, count] of normRules) lines.push(`  ${rule}: ${count}`);
  }
  lines.push(
    `  Records w/ integration subject lacking concepts (R4 flag): ${summary.integrationWithoutConcepts}`
  );

  lines.push('');
  lines.push('Repair pass:');
  lines.push(
    `  repair records:      ${summary.repairRecords} ` +
      `(${summary.repair.recordsNowPassing} now passing, ` +
      `${summary.repair.recordsStillFailing} still failing)`
  );
  for (const [fieldName, tally] of Object.entries(summary.repair.fields).sort((a, b) =>
    a[0].localeCompare(b[0])
  )) {
    lines.push(
      `  ${fieldName}: ${tally.attempted} attempted, ` +
        `${tally.succeeded} succeeded, ${tally.failed} failed`
    );
  }

  lines.push('');
  const renderTally = (tallies: Record<string, number>): string =>
    Object.entries(tallies)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([key, count]) => `${key} ×${count}`)
      .join(', ');
  lines.push(`Models: ${renderTally(summary.models)}`);
  lines.push(`Prompt+schema hashes: ${renderTally(summary.promptSchemaHashes)}`);
  lines.push(`Strict-tool records:  ${summary.strictRecords} of ${summary.totalRecords}`);

  lines.push('');
  lines.push('Usage totals (all records):');
  lines.push(
    `  input=${summary.usage.input_tokens}  output=${summary.usage.output_tokens}  ` +
      `cache_create=${summary.usage.cache_creation_input_tokens}  ` +
      `cache_read=${summary.usage.cache_read_input_tokens}`
  );
  const costSuffix =
    summary.recordsWithoutCost > 0
      ? ` (${summary.recordsWithoutCost} record(s) without cost data)`
      : '';
  lines.push(`Cost: $${summary.totalCostUsd.toFixed(4)}${costSuffix}`);

  if (summary.errors.length > 0) {
    const errored = summary.errors.reduce((sum, group) => sum + group.count, 0);
    lines.push('');
    lines.push(`Errors (${errored} record(s)):`);
    for (const group of summary.errors) {
      lines.push(`  ×${group.count} ${group.message}`);
      lines.push(...listWithCap(group.ids, (id) => id));
    }
  }

  return `${lines.join('\n')}\n`;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface Args {
  run: string;
  corpus: string;
  summaryOut: string;
  help: boolean;
}

export function parseArgs(argv: string[]): Args {
  const args: Args = {
    run: DEFAULT_RUN_PATH,
    corpus: DEFAULT_CORPUS_PATH,
    summaryOut: DEFAULT_SUMMARY_PATH,
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
      case '--summary-out':
        args.summaryOut = requireFlagValue(flag, next);
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
Stage 2 re-tag output validation (task A7) — run-level summary.

Usage:
  npx tsx scripts/stage2-retag/validate-output.ts [flags]

Flags:
  --run <path>          run-output JSONL (default scripts/stage2-retag/artifacts/retag-run.jsonl)
  --corpus <path>       corpus JSONL (default scripts/stage2-retag/artifacts/corpus.jsonl)
  --summary-out <path>  machine-readable JSON summary
                        (default scripts/stage2-retag/artifacts/run-summary.json)
  --help

Reads the run output + corpus, writes the JSON summary, and prints a
human-readable summary to stdout. Reporting only: no API calls, no DB access.
`;

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }
  warnIfOutsideArtifacts(args.summaryOut);
  const records = parseRunRecords(readFileSync(args.run, 'utf8'));
  const corpus = parseCorpusIndex(readFileSync(args.corpus, 'utf8'));
  const summary = summarizeRun(records, corpus);

  mkdirSync(path.dirname(args.summaryOut), { recursive: true });
  writeFileSync(args.summaryOut, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');

  console.log(formatRunSummary(summary));
  console.log(`JSON summary written to ${args.summaryOut}`);
}

const isDirectInvocation =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectInvocation) {
  try {
    main();
  } catch (error) {
    console.error('❌ Validation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
