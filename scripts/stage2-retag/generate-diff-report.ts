#!/usr/bin/env npx tsx
/* eslint-disable no-console -- CLI script: console output is the operator UI */
/**
 * Stage 2 re-tag — task A7: per-field corpus diff + plain-language report.
 *
 * Compares the corpus export's CURRENT field values (corpus.jsonl, task A4)
 * with the run output's PROPOSED tags (retag-run.jsonl, task A6) and emits a
 * plain-language markdown report — the artifact a curriculum-literate human
 * reads for the Protocol-B apply gate (design §4 OQ6; this same generator
 * produces the full-run report in PR B, task B5).
 *
 * Diff semantics:
 *   - One section per main-pass field, values compared as sets per lesson.
 *   - Capitalization-only changes (same value, different casing) are flagged
 *     SEPARATELY from semantic adds/drops — they are formatting fixes, not
 *     meaning changes.
 *   - The "new" side of each lesson is its LATEST run record (later lines
 *     win, so repair records supersede failed main-pass records).
 *   - Lessons whose latest record has no output (API error) or no record at
 *     all are listed as "not covered", with the reason.
 *   - Zod-failed-but-present outputs ARE diffed (with a warning count) so a
 *     partial run can still be audited; the PR-B gate separately requires
 *     100% post-repair Zod-pass before apply artifacts exist.
 *   - academic_concepts (subject-keyed object) diffs the corpus's
 *     subject→list values against the new per-subject `framework` arrays;
 *     the `everyday` phrases + synonym pairs are new-only output (they feed
 *     PR D's search_synonyms population) and are not part of this diff.
 *   - grade_levels is NOT diffed: the corpus export carries no current grade
 *     values (the run's proposed grades are reviewed at the apply step).
 *
 * Output: markdown to --out (default artifacts/diff-report.md). The pure
 * builder (`buildDiffReport`) returns the machine-usable structure that
 * PR B's prepare-apply.ts can consume directly (three-bucket sampling).
 *
 * Reporting only: no API calls, no DB access.
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
import { normalizeRecordInput } from './normalize';
import { MAIN_PASS_FIELDS, loadVocab, type MainPassField, type Stage2Vocab } from './vocab';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS_DIR = path.join(MODULE_DIR, 'artifacts');
const DEFAULT_RUN_PATH = path.join(ARTIFACTS_DIR, 'retag-run.jsonl');
const DEFAULT_CORPUS_PATH = path.join(ARTIFACTS_DIR, 'corpus.jsonl');
const DEFAULT_OUT_PATH = path.join(ARTIFACTS_DIR, 'diff-report.md');

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

export interface ValueChange {
  from: string;
  to: string;
}

export interface SetDiff {
  added: string[];
  dropped: string[];
  /** Old→new pairs that differ only by letter casing. */
  casingFixes: ValueChange[];
  unchanged: string[];
}

export interface SubjectDiff {
  added: string[];
  dropped: string[];
  casingFixes: ValueChange[];
}

export interface LessonFieldChange {
  id: string;
  title: string;
  added: string[];
  dropped: string[];
  casingFixes: ValueChange[];
  /** academic_concepts only: per-subject detail for changed subjects. */
  subjects?: Record<string, SubjectDiff>;
}

export interface FieldDiff {
  field: MainPassField;
  label: string;
  lessonsCompared: number;
  /** Identical sets (includes the both-empty lessons). */
  lessonsUnchanged: number;
  /** No values before AND none proposed (subset of unchanged). */
  lessonsBothEmpty: number;
  /** At least one real (semantic) add or drop. */
  lessonsChangedSemantic: number;
  /** ONLY capitalization fixes, nothing semantic. */
  lessonsCasingOnly: number;
  /** Total casing-fix value pairs across all lessons. */
  casingFixCount: number;
  /** value → number of lessons gaining it (academic_concepts values are
   *  prefixed "Subject: Concept"). */
  addedValueCounts: Record<string, number>;
  /** value → number of lessons losing it. */
  droppedValueCounts: Record<string, number>;
  /** Every lesson with any change (semantic or casing), sorted by title. */
  changedLessons: LessonFieldChange[];
}

export interface MissingLesson {
  id: string;
  title: string;
  /** 'no-record' = never appears in the run output;
   *  'no-output' = latest record errored with no usable output. */
  reason: 'no-record' | 'no-output';
}

export interface DiffReport {
  corpusLessons: number;
  comparedLessons: number;
  /** Compared lessons whose latest record failed Zod (values shown as-is). */
  zodFailedIncluded: number;
  missingFromRun: MissingLesson[];
  unknownInRun: string[];
  fields: FieldDiff[];
}

// ---------------------------------------------------------------------------
// Corpus parsing
// ---------------------------------------------------------------------------

/** The 11 flat (text[]) fields — every main-pass field except the
 *  subject-keyed academic_concepts. */
const FLAT_FIELDS = MAIN_PASS_FIELDS.filter(
  (field): field is Exclude<MainPassField, 'academic_concepts'> => field !== 'academic_concepts'
);

export interface CorpusDiffRecord {
  id: string;
  title: string;
  /** Flat field → current values (null/missing normalized to []). */
  flat: Record<string, string[]>;
  /** Current subject→concepts map (null/missing normalized to {}). */
  academicConcepts: Record<string, string[]>;
}

const corpusLineSchema = z
  .object({
    id: z.string().min(1),
    title: z.string(),
    academic_concepts: z.record(z.array(z.string())).nullable().optional(),
  })
  .catchall(z.unknown());

/** Parses + normalizes corpus JSONL records for diffing. */
export function parseCorpusRecords(jsonlText: string): CorpusDiffRecord[] {
  const records: CorpusDiffRecord[] = [];
  for (const line of jsonlText.split('\n')) {
    if (line.trim() === '') continue;
    const raw = corpusLineSchema.parse(JSON.parse(line));
    const flat: Record<string, string[]> = {};
    for (const field of FLAT_FIELDS) {
      const value = raw[field];
      flat[field] = Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === 'string')
        : [];
    }
    records.push({
      id: raw.id,
      title: raw.title,
      flat,
      academicConcepts: raw.academic_concepts ?? {},
    });
  }
  return records;
}

// ---------------------------------------------------------------------------
// Set diffing (pure)
// ---------------------------------------------------------------------------

/**
 * Diffs two value sets. Values present on both sides are unchanged; an old
 * value and a new value that are equal case-insensitively are paired as a
 * casing fix (one-to-one); a dropped value whose lowercase form SURVIVES in
 * the new set (a within-side case twin collapsing to one canonical spelling,
 * e.g. ["Earth month","Earth Month"] → ["Earth Month"]) is also a casing
 * fix, not a semantic removal; everything left is a semantic add or drop.
 */
export function diffValueSets(oldValues: string[], newValues: string[]): SetDiff {
  const oldSet = new Set(oldValues);
  const newSet = new Set(newValues);

  const unchanged = [...oldSet].filter((value) => newSet.has(value));
  const rawDrops = [...oldSet].filter((value) => !newSet.has(value));
  const rawAdds = [...newSet].filter((value) => !oldSet.has(value));

  const addsByLower = new Map<string, string[]>();
  for (const add of rawAdds) {
    const lower = add.toLowerCase();
    const bucket = addsByLower.get(lower) ?? [];
    bucket.push(add);
    addsByLower.set(lower, bucket);
  }

  // First surviving new-side spelling per lowercase form (for case-twin dedup).
  const newByLower = new Map<string, string>();
  for (const value of newValues) {
    const lower = value.toLowerCase();
    if (!newByLower.has(lower)) newByLower.set(lower, value);
  }

  const casingFixes: ValueChange[] = [];
  const dropped: string[] = [];
  for (const drop of rawDrops) {
    const bucket = addsByLower.get(drop.toLowerCase());
    const paired = bucket?.shift();
    if (paired !== undefined) {
      casingFixes.push({ from: drop, to: paired });
      continue;
    }
    const survivor = newByLower.get(drop.toLowerCase());
    if (survivor !== undefined) {
      // Within-side case-twin dedup: the value survives under another
      // spelling — formatting cleanup, not a semantic removal.
      casingFixes.push({ from: drop, to: survivor });
      continue;
    }
    dropped.push(drop);
  }
  const added = [...addsByLower.values()].flat();

  return {
    added: added.sort(),
    dropped: dropped.sort(),
    casingFixes: casingFixes.sort((a, b) => a.from.localeCompare(b.from)),
    unchanged,
  };
}

function isNoChange(diff: SetDiff): boolean {
  return diff.added.length === 0 && diff.dropped.length === 0 && diff.casingFixes.length === 0;
}

// ---------------------------------------------------------------------------
// Report building (pure)
// ---------------------------------------------------------------------------

interface ComparedLesson {
  id: string;
  title: string;
  corpus: CorpusDiffRecord;
  rawInput: Record<string, unknown>;
}

function newFlatValues(rawInput: Record<string, unknown>, field: string): string[] {
  const value = rawInput[field];
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function newFrameworkValues(rawInput: Record<string, unknown>, subject: string): string[] {
  const concepts = rawInput.academic_concepts;
  if (typeof concepts !== 'object' || concepts === null) return [];
  const subjectValue = (concepts as Record<string, unknown>)[subject];
  if (typeof subjectValue !== 'object' || subjectValue === null) return [];
  const framework = (subjectValue as Record<string, unknown>).framework;
  return Array.isArray(framework)
    ? framework.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

function newConceptSubjects(rawInput: Record<string, unknown>): string[] {
  const concepts = rawInput.academic_concepts;
  if (typeof concepts !== 'object' || concepts === null) return [];
  return Object.keys(concepts as Record<string, unknown>);
}

function tally(counts: Record<string, number>, values: string[]): void {
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
}

function diffFlatField(field: MainPassField, label: string, lessons: ComparedLesson[]): FieldDiff {
  const result = emptyFieldDiff(field, label, lessons.length);
  for (const lesson of lessons) {
    const oldValues = lesson.corpus.flat[field] ?? [];
    const newValues = newFlatValues(lesson.rawInput, field);
    const diff = diffValueSets(oldValues, newValues);
    recordLessonDiff(result, lesson, diff, oldValues.length === 0 && newValues.length === 0);
  }
  finalizeFieldDiff(result);
  return result;
}

function diffConceptsField(label: string, lessons: ComparedLesson[]): FieldDiff {
  const result = emptyFieldDiff('academic_concepts', label, lessons.length);
  for (const lesson of lessons) {
    const oldBySubject = lesson.corpus.academicConcepts;
    const subjects = [
      ...new Set([...Object.keys(oldBySubject), ...newConceptSubjects(lesson.rawInput)]),
    ].sort();

    const perSubject: Record<string, SubjectDiff> = {};
    const combined: SetDiff = { added: [], dropped: [], casingFixes: [], unchanged: [] };
    let anyValues = false;
    for (const subject of subjects) {
      const oldValues = oldBySubject[subject] ?? [];
      const newValues = newFrameworkValues(lesson.rawInput, subject);
      if (oldValues.length > 0 || newValues.length > 0) anyValues = true;
      const diff = diffValueSets(oldValues, newValues);
      if (!isNoChange(diff)) {
        perSubject[subject] = {
          added: diff.added,
          dropped: diff.dropped,
          casingFixes: diff.casingFixes,
        };
      }
      combined.added.push(...diff.added.map((value) => `${subject}: ${value}`));
      combined.dropped.push(...diff.dropped.map((value) => `${subject}: ${value}`));
      combined.casingFixes.push(
        ...diff.casingFixes.map(({ from, to }) => ({
          from: `${subject}: ${from}`,
          to: `${subject}: ${to}`,
        }))
      );
    }
    recordLessonDiff(result, lesson, combined, !anyValues, perSubject);
  }
  finalizeFieldDiff(result);
  return result;
}

function emptyFieldDiff(field: MainPassField, label: string, lessonsCompared: number): FieldDiff {
  return {
    field,
    label,
    lessonsCompared,
    lessonsUnchanged: 0,
    lessonsBothEmpty: 0,
    lessonsChangedSemantic: 0,
    lessonsCasingOnly: 0,
    casingFixCount: 0,
    addedValueCounts: {},
    droppedValueCounts: {},
    changedLessons: [],
  };
}

function recordLessonDiff(
  result: FieldDiff,
  lesson: ComparedLesson,
  diff: SetDiff,
  bothEmpty: boolean,
  subjects?: Record<string, SubjectDiff>
): void {
  if (isNoChange(diff)) {
    result.lessonsUnchanged++;
    if (bothEmpty) result.lessonsBothEmpty++;
    return;
  }
  if (diff.added.length > 0 || diff.dropped.length > 0) result.lessonsChangedSemantic++;
  else result.lessonsCasingOnly++;
  result.casingFixCount += diff.casingFixes.length;
  tally(result.addedValueCounts, diff.added);
  tally(result.droppedValueCounts, diff.dropped);
  result.changedLessons.push({
    id: lesson.id,
    title: lesson.title,
    added: diff.added,
    dropped: diff.dropped,
    casingFixes: diff.casingFixes,
    ...(subjects && Object.keys(subjects).length > 0 ? { subjects } : {}),
  });
}

function finalizeFieldDiff(result: FieldDiff): void {
  result.changedLessons.sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
}

/** Builds the full diff report (pure; markdown rendering is separate). */
export function buildDiffReport(
  corpusRecords: CorpusDiffRecord[],
  runRecords: RunRecord[],
  vocab: Stage2Vocab
): DiffReport {
  const latest = latestRecordById(runRecords);
  const corpusIds = new Set(corpusRecords.map((record) => record.id));

  const compared: ComparedLesson[] = [];
  const missingFromRun: MissingLesson[] = [];
  let zodFailedIncluded = 0;
  for (const corpusRecord of corpusRecords) {
    const record = latest.get(corpusRecord.id);
    if (!record) {
      missingFromRun.push({ id: corpusRecord.id, title: corpusRecord.title, reason: 'no-record' });
      continue;
    }
    if (typeof record.rawInput !== 'object' || record.rawInput === null) {
      missingFromRun.push({ id: corpusRecord.id, title: corpusRecord.title, reason: 'no-output' });
      continue;
    }
    if (!record.zod.passed) zodFailedIncluded++;
    // Diff (and any downstream apply-prep) compares NORMALIZED values: the
    // runner already normalizes before persisting, and re-applying is
    // idempotent, so this also corrects any pre-normalization legacy record.
    const { rawInput } = normalizeRecordInput(record.rawInput);
    compared.push({
      id: corpusRecord.id,
      title: corpusRecord.title,
      corpus: corpusRecord,
      rawInput: rawInput as Record<string, unknown>,
    });
  }
  missingFromRun.sort((a, b) => a.id.localeCompare(b.id));
  const unknownInRun = [...latest.keys()].filter((id) => !corpusIds.has(id)).sort();

  const fields = MAIN_PASS_FIELDS.map((field) =>
    field === 'academic_concepts'
      ? diffConceptsField(vocab[field].label, compared)
      : diffFlatField(field, vocab[field].label, compared)
  );

  return {
    corpusLessons: corpusRecords.length,
    comparedLessons: compared.length,
    zodFailedIncluded,
    missingFromRun,
    unknownInRun,
    fields,
  };
}

// ---------------------------------------------------------------------------
// Plain-language markdown rendering
// ---------------------------------------------------------------------------

const TOP_VALUES_SHOWN = 15;

function quote(value: string): string {
  return `"${value}"`;
}

function renderCasingFix(fix: ValueChange): string {
  return `${quote(fix.from)} → ${quote(fix.to)}`;
}

function topValueLines(counts: Record<string, number>, verb: string): string[] {
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const lines = entries
    .slice(0, TOP_VALUES_SHOWN)
    .map(
      ([value, count]) =>
        `- ${quote(value)} — ${verb} ${count === 1 ? '1 lesson' : `${count} lessons`}`
    );
  if (entries.length > TOP_VALUES_SHOWN) {
    lines.push(`- … and ${entries.length - TOP_VALUES_SHOWN} more values`);
  }
  return lines;
}

function fieldLeadSentences(f: FieldDiff): string {
  if (f.lessonsCompared === 0) {
    return 'No lessons could be compared for this field.';
  }
  const anyChange = f.lessonsChangedSemantic + f.lessonsCasingOnly;
  if (anyChange === 0) {
    return (
      `None of the ${f.lessonsCompared} compared lessons change here — ` +
      'every lesson keeps exactly the values it has today.'
    );
  }
  const sentences: string[] = [];
  sentences.push(
    `Out of the ${f.lessonsCompared} lessons compared, ${f.lessonsUnchanged} keep exactly ` +
      `the values they have today and ${f.lessonsChangedSemantic} would genuinely change.`
  );
  if (f.lessonsCasingOnly > 0) {
    sentences.push(
      f.lessonsCasingOnly === 1
        ? 'Another 1 only gets capitalization fixes — formatting cleanup, not a change in meaning.'
        : `Another ${f.lessonsCasingOnly} only get capitalization fixes — ` +
            'formatting cleanup, not a change in meaning.'
    );
  }
  const topAdd = Object.entries(f.addedValueCounts).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  )[0];
  const topDrop = Object.entries(f.droppedValueCounts).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  )[0];
  if (topAdd && topDrop) {
    sentences.push(
      `The most common addition is ${quote(topAdd[0])} (${topAdd[1]} ` +
        `lesson${topAdd[1] === 1 ? '' : 's'}); the most common removal is ` +
        `${quote(topDrop[0])} (${topDrop[1]}).`
    );
  } else if (topAdd) {
    sentences.push(
      `The most common addition is ${quote(topAdd[0])} (${topAdd[1]} ` +
        `lesson${topAdd[1] === 1 ? '' : 's'}).`
    );
  } else if (topDrop) {
    sentences.push(
      `The most common removal is ${quote(topDrop[0])} (${topDrop[1]} ` +
        `lesson${topDrop[1] === 1 ? '' : 's'}).`
    );
  }
  return sentences.join(' ');
}

function renderLessonChangeLine(lesson: LessonFieldChange): string {
  const parts: string[] = [];
  if (lesson.added.length > 0) {
    parts.push(`adds ${lesson.added.map(quote).join(', ')}`);
  }
  if (lesson.dropped.length > 0) {
    parts.push(`removes ${lesson.dropped.map(quote).join(', ')}`);
  }
  if (lesson.casingFixes.length > 0) {
    parts.push(`capitalization: ${lesson.casingFixes.map(renderCasingFix).join(', ')}`);
  }
  return `- **${lesson.title}** (\`${lesson.id}\`) — ${parts.join('; ')}`;
}

function renderFieldSection(f: FieldDiff): string[] {
  const lines: string[] = [];
  lines.push(`## ${f.label}`);
  lines.push('');
  lines.push(fieldLeadSentences(f));
  lines.push('');
  lines.push('| | lessons |');
  lines.push('|---|---|');
  lines.push(`| Same values as today | ${f.lessonsUnchanged} |`);
  lines.push(`| Real changes | ${f.lessonsChangedSemantic} |`);
  lines.push(`| Capitalization-only fixes | ${f.lessonsCasingOnly} |`);
  lines.push(`| Empty before and after | ${f.lessonsBothEmpty} |`);
  lines.push('');

  if (Object.keys(f.addedValueCounts).length > 0) {
    lines.push('Most-added values:');
    lines.push('');
    lines.push(...topValueLines(f.addedValueCounts, 'added to'));
    lines.push('');
  }
  if (Object.keys(f.droppedValueCounts).length > 0) {
    lines.push('Most-removed values:');
    lines.push('');
    lines.push(...topValueLines(f.droppedValueCounts, 'removed from'));
    lines.push('');
  }

  const semantic = f.changedLessons.filter(
    (lesson) => lesson.added.length > 0 || lesson.dropped.length > 0
  );
  const casingOnly = f.changedLessons.filter(
    (lesson) => lesson.added.length === 0 && lesson.dropped.length === 0
  );
  if (semantic.length > 0) {
    lines.push('### Lessons with real changes');
    lines.push('');
    for (const lesson of semantic) lines.push(renderLessonChangeLine(lesson));
    lines.push('');
  }
  if (casingOnly.length > 0) {
    lines.push('### Lessons with capitalization-only fixes');
    lines.push('');
    for (const lesson of casingOnly) lines.push(renderLessonChangeLine(lesson));
    lines.push('');
  }
  return lines;
}

/** Renders the diff report as plain-language markdown (Protocol-B artifact). */
export function renderMarkdown(report: DiffReport): string {
  const lines: string[] = [];
  lines.push('# Stage 2 re-tag — proposed tag changes (diff report)');
  lines.push('');
  lines.push(
    'This report compares the tags each lesson has **today** with the tags the ' +
      're-tagging run **proposes**. Nothing has been changed in the database — ' +
      'this is a preview for review.'
  );
  lines.push('');
  lines.push(
    '**How to read it:** each section covers one tag field. "Real changes" add or ' +
      'remove values; capitalization-only fixes (e.g. "winter" → "Winter") are counted ' +
      'separately because they tidy formatting without changing what a lesson is about.'
  );
  lines.push('');
  lines.push(
    'Grade levels are not compared in this report: the corpus export does not carry ' +
      "the lessons' current grade values, so the run's proposed grades are reviewed " +
      'separately at the apply step.'
  );
  lines.push('');
  lines.push('## Coverage');
  lines.push('');
  lines.push(`- Lessons in the corpus export: ${report.corpusLessons}`);
  lines.push(
    `- Lessons with a usable proposed tagging (compared below): ${report.comparedLessons}`
  );
  lines.push(
    `- Lessons without usable results: ${report.missingFromRun.length} (listed at the end)`
  );
  lines.push(`- Run results that matched no corpus lesson: ${report.unknownInRun.length}`);
  if (report.zodFailedIncluded > 0) {
    lines.push(
      `- ⚠️ ${report.zodFailedIncluded} compared lesson(s) had a validation problem in their ` +
        'proposed tags; their values are shown as-is and need a repair pass before any apply.'
    );
  }
  lines.push('');

  for (const f of report.fields) {
    lines.push(...renderFieldSection(f));
  }

  if (report.missingFromRun.length > 0) {
    lines.push('## Lessons without usable results');
    lines.push('');
    lines.push('These lessons could not be compared:');
    lines.push('');
    for (const lesson of report.missingFromRun) {
      const reason =
        lesson.reason === 'no-record'
          ? 'no run result for this lesson yet'
          : 'the run hit an error and produced no tags';
      lines.push(`- **${lesson.title}** (\`${lesson.id}\`) — ${reason}`);
    }
    lines.push('');
  }
  if (report.unknownInRun.length > 0) {
    lines.push('## Run results that matched no corpus lesson');
    lines.push('');
    for (const id of report.unknownInRun) lines.push(`- \`${id}\``);
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

interface Args {
  run: string;
  corpus: string;
  out: string;
  help: boolean;
}

export function parseArgs(argv: string[]): Args {
  const args: Args = {
    run: DEFAULT_RUN_PATH,
    corpus: DEFAULT_CORPUS_PATH,
    out: DEFAULT_OUT_PATH,
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
      case '--out':
        args.out = requireFlagValue(flag, next);
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
Stage 2 re-tag diff report (task A7) — per-field corpus diff, old → new,
rendered as a plain-language markdown report (the Protocol-B artifact).

Usage:
  npx tsx scripts/stage2-retag/generate-diff-report.ts [flags]

Flags:
  --run <path>     run-output JSONL (default scripts/stage2-retag/artifacts/retag-run.jsonl)
  --corpus <path>  corpus JSONL (default scripts/stage2-retag/artifacts/corpus.jsonl)
  --out <path>     markdown report path (default scripts/stage2-retag/artifacts/diff-report.md)
  --help

Reporting only: no API calls, no DB access.
`;

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }
  warnIfOutsideArtifacts(args.out);
  const corpusRecords = parseCorpusRecords(readFileSync(args.corpus, 'utf8'));
  const runRecords = parseRunRecords(readFileSync(args.run, 'utf8'));
  const report = buildDiffReport(corpusRecords, runRecords, loadVocab());

  mkdirSync(path.dirname(args.out), { recursive: true });
  writeFileSync(args.out, renderMarkdown(report), 'utf8');

  const changed = report.fields.reduce(
    (sum, f) => sum + f.lessonsChangedSemantic + f.lessonsCasingOnly,
    0
  );
  console.log(
    `Diff report written to ${args.out} — ${report.comparedLessons}/${report.corpusLessons} ` +
      `lessons compared, ${changed} field-level lesson changes across ${report.fields.length} fields.`
  );
}

const isDirectInvocation =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectInvocation) {
  try {
    main();
  } catch (error) {
    console.error('❌ Diff report failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
