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
  DEFAULT_CORPUS_EXCLUSIONS_PATH,
  excludeCorpusIds,
  latestRecordById,
  loadCorpusExclusions,
  parseRunRecords,
  requireFlagValue,
  warnIfOutsideArtifacts,
  type RunRecord,
} from './run-retag';
import { normalizeRecordInput } from './normalize';
import { loadC02FloorInput, type C02FloorInput } from './c02-floor';
import {
  C02_APPLY_FIELDS,
  materializeC02Ship,
  type C02ApplyField,
  type C02ShipRecord,
  type C02ShipTags,
} from './ship-policy';
import {
  MAIN_PASS_FIELDS,
  loadC02Manifest,
  loadVocab,
  type MainPassField,
  type Stage2Vocab,
} from './vocab';
import type { C02FinalTags } from './reconcile';

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

/**
 * One C02 ship-policy provenance row (P3.1-diff / design §8 ②). On a C02 run the
 * diff reads the materialized per-field SHIP output (floor-only `main_ingredients`
 * + floor-retention `cooking_skills`), so the existing `normalizationCount`
 * edge-case signal cannot flag floored C02 rows (C02 bypasses `normalize`; the
 * floor lands later in `materializeC02Ship`). This bucket replaces it: every row
 * is classified by HOW its shipped output was produced/changed, so the user can
 * spot-check the floored / ship-changed sample before apply.
 */
export interface C02ShipProvenanceRow {
  id: string;
  title: string;
  /** Field(s) whose LLM decision was off-vocab and fell back to the floor. */
  flooredFields: C02ApplyField[];
  /** True iff `flooredFields` is non-empty (a floor-fallback row). */
  floored: boolean;
  /** True iff the shipped C02 output differs from the CURRENT C02 tags. */
  shipChanged: boolean;
  /** The materialized per-field SHIP output (what apply would write). */
  ship: C02ShipTags;
}

/**
 * The ship-policy provenance bucket for a C02 run — the floored / ship-changed
 * SAMPLE the user spot-checks (design §8 ② / impl P3.1). Only present on a C02
 * anchored run; absent on a legacy/non-C02 run.
 */
export interface C02ShipProvenanceBucket {
  /** Rows that are floored OR ship-changed (the spot-check sample). */
  rows: C02ShipProvenanceRow[];
  /** Count of floored rows (a field fell back to the floor). */
  flooredCount: number;
  /** Count of rows whose shipped output differs from today's tags. */
  shipChangedCount: number;
}

export interface DiffReport {
  corpusLessons: number;
  /** Corpus lessons dropped before diffing because they are on the run's
   *  exclusion list (deletion-slated / non-lesson — never tagged). */
  excludedLessons: number;
  comparedLessons: number;
  /** Compared lessons whose latest record failed Zod (values shown as-is). */
  zodFailedIncluded: number;
  missingFromRun: MissingLesson[];
  unknownInRun: string[];
  fields: FieldDiff[];
  /** C02 anchored run only (design §8 ② / P3.1): the ship-policy provenance
   *  bucket — the floored / ship-changed spot-check sample. Absent otherwise. */
  c02ShipProvenance?: C02ShipProvenanceBucket;
}

// ---------------------------------------------------------------------------
// Corpus parsing
// ---------------------------------------------------------------------------

/** The 13 flat (text[]) fields — every main-pass field except the
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

export interface ComparedLesson {
  id: string;
  title: string;
  corpus: CorpusDiffRecord;
  rawInput: Record<string, unknown>;
  /**
   * C02 anchored run only (threaded when `c02ShipThreading` is on): the
   * reconciled canonical C02 arrays. The diff reads the per-field SHIP output
   * MATERIALIZED from this (NOT `rawInput`, which holds the raw decision); see
   * D-P6/D-P11. Absent on legacy/non-C02 records.
   */
  finalC02?: C02FinalTags;
  /** C02 anchored run only: the raw KEEP/DROP/ADD decision (the ship layer's
   *  reconstruction source for a finalC02-less fallback record). */
  llmDecisions?: unknown;
  /** C02 anchored run only: field(s) that fell back to the deterministic floor
   *  (the provenance bucket's floored signal). */
  flooredFields?: C02ApplyField[];
}

/** A compared lesson is C02-anchored iff it carries a reconciled finalC02 or the
 *  raw C02 decision — the SAME marker the run record uses. */
export function isC02Anchored(lesson: ComparedLesson): boolean {
  return lesson.finalC02 !== undefined || lesson.llmDecisions !== undefined;
}

/**
 * Selects the diffable/applyable lessons out of the corpus + run output, using
 * the SAME record-selection rules the diff report applies:
 *   - corpus exclusions dropped first (deletion-slated / non-lesson rows);
 *   - latest run record per id wins (later JSONL lines supersede earlier ones,
 *     so a repair/fallback record supersedes its failed main record);
 *   - a lesson with no record, or whose latest record has no usable object
 *     rawInput (API error), is reported as missing — NOT compared;
 *   - every compared lesson's rawInput is normalized via normalizeRecordInput
 *     (idempotent; the runner already normalized, this also corrects any
 *     pre-normalization legacy record), so staging applies the same values the
 *     diff report shows.
 *
 * Both buildDiffReport and prepare-apply build on this so the diff a human
 * reviews and the tags an apply migration writes can never drift apart.
 */
export interface SelectComparedOptions {
  /**
   * P3.1-diff: opt IN to C02 ship threading. When on, a C02 anchored record is
   * NOT refused — its reconciled C02 source (`finalC02` / `llmDecisions` /
   * `flooredFields`) is threaded onto the compared lesson so the caller can
   * materialize the per-field SHIP output (NOT read the raw decision from
   * `rawInput`). BOTH C02 read paths pass this now: the diff path
   * (`buildDiffReport`) and — as of P3.2 — the apply path (`buildStagingRows` in
   * prepare-apply), which materializes the ship output into staging. A caller
   * that OMITS the flag stays fail-closed (the throw below): it would read the
   * raw KEEP/DROP/ADD decision from `rawInput` and risk an all-C02-emptying apply.
   */
  c02ShipThreading?: boolean;
}

export function selectComparedLessons(
  corpusRecords: CorpusDiffRecord[],
  runRecords: RunRecord[],
  excludedIds: Set<string> = new Set(),
  options: SelectComparedOptions = {}
): {
  compared: ComparedLesson[];
  missingFromRun: MissingLesson[];
  unknownInRun: string[];
  corpusLessonsKept: number;
  excludedLessons: number;
  zodFailedIncluded: number;
} {
  const latest = latestRecordById(runRecords);
  // FIX 2 (P2′.3 Codex), narrowed in P3.1: fail-closed on C02 anchored records
  // UNLESS the caller opts into ship threading. On an anchored record `rawInput`
  // holds the raw KEEP/DROP/ADD DECISION OBJECT (not arrays → newFlatValues
  // silently returns []); the reconciled arrays live on `record.finalC02`.
  //   - Diff path (c02ShipThreading: true): threads finalC02 and materializes the
  //     per-field SHIP output below — safe, so the throw is lifted (P3.1-diff).
  //   - Apply path (prepare-apply): as of P3.2 ALSO passes c02ShipThreading and
  //     materializes the per-field SHIP output into staging — so it, too, is safe
  //     and takes the threaded path, never this throw.
  //   - The throw therefore guards only a caller that OMITS the flag on a C02
  //     anchored record: that path would read `rawInput`'s raw KEEP/DROP/ADD
  //     decision and silently stage empty C02 fields, risking an all-C02-emptying
  //     apply — so it stays fail-closed.
  // (Legacy/body-only records, which lack both fields, are unaffected either way.)
  if (!options.c02ShipThreading) {
    for (const record of latest.values()) {
      if (record.finalC02 !== undefined || record.llmDecisions !== undefined) {
        throw new Error(
          `selectComparedLessons: run record ${record.id} is a C02 anchored record ` +
            `(carries finalC02/llmDecisions). This caller does not thread the C02 ship output ` +
            `— it would read the raw KEEP/DROP/ADD decision from rawInput and silently emit empty ` +
            `cooking_skills/main_ingredients, risking an all-C02-emptying apply. Refusing. The diff ` +
            `path passes { c02ShipThreading: true } (P3.1); the apply path threads the ship output ` +
            `in P3.2 — use those, not this fail-closed path, for C02.`
        );
      }
    }
  }
  const { kept: corpusRecordsKept, excludedHits } = excludeCorpusIds(corpusRecords, excludedIds);
  const corpusIds = new Set(corpusRecordsKept.map((record) => record.id));

  const compared: ComparedLesson[] = [];
  const missingFromRun: MissingLesson[] = [];
  let zodFailedIncluded = 0;
  for (const corpusRecord of corpusRecordsKept) {
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
    // C02 fields bypass `normalize` (skipC02): normalizing here is harmless for
    // the 12 non-C02 fields and is a no-op on the raw C02 decision object, which
    // the diff never reads on an anchored record (it reads the ship output).
    const { rawInput } = normalizeRecordInput(record.rawInput);
    const isC02 =
      options.c02ShipThreading &&
      (record.finalC02 !== undefined || record.llmDecisions !== undefined);
    compared.push({
      id: corpusRecord.id,
      title: corpusRecord.title,
      corpus: corpusRecord,
      rawInput: rawInput as Record<string, unknown>,
      ...(isC02 && record.finalC02 !== undefined ? { finalC02: record.finalC02 } : {}),
      ...(isC02 && record.llmDecisions !== undefined ? { llmDecisions: record.llmDecisions } : {}),
      ...(isC02 && record.flooredFields !== undefined
        ? { flooredFields: record.flooredFields }
        : {}),
    });
  }
  missingFromRun.sort((a, b) => a.id.localeCompare(b.id));
  const unknownInRun = [...latest.keys()].filter((id) => !corpusIds.has(id)).sort();

  return {
    compared,
    missingFromRun,
    unknownInRun,
    corpusLessonsKept: corpusRecordsKept.length,
    excludedLessons: excludedHits.length,
    zodFailedIncluded,
  };
}

function newFlatValues(rawInput: Record<string, unknown>, field: string): string[] {
  const value = rawInput[field];
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : [];
}

/** Order-insensitive set equality on string arrays (ship-change detection). */
function setsEqual(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(a);
  return b.every((value) => set.has(value));
}

/**
 * The materialized per-field SHIP output a C02 compared lesson would APPLY
 * (D-P6/D-P11): floor-only `main_ingredients` + floor-retention `cooking_skills`.
 * Reads the lesson's CURRENT C02 tags from the corpus as `materializeC02Ship`'s
 * floor input — NOT `rawInput` (the raw decision). Shared by the diff (new
 * values) and the provenance bucket (ship-change detection) so they cannot drift.
 */
export function shipTagsFor(
  lesson: ComparedLesson,
  floorInput: C02FloorInput,
  cookingValues: ReadonlySet<string>
): C02ShipTags {
  const shipRecord: C02ShipRecord = {
    ...(lesson.finalC02 !== undefined ? { finalC02: lesson.finalC02 } : {}),
    // The reconstruction source for a finalC02-less fallback record is the raw
    // decision; the run record stores it both as `llmDecisions` and `rawInput`.
    rawInput: lesson.llmDecisions ?? lesson.rawInput,
  };
  const existingTags = {
    cooking_skills: lesson.corpus.flat.cooking_skills ?? [],
    main_ingredients: lesson.corpus.flat.main_ingredients ?? [],
  };
  return materializeC02Ship(shipRecord, existingTags, floorInput, cookingValues);
}

/** Per-id materialized ship output for every C02 compared lesson (computed once;
 *  the floor input + canonical cooking set are loaded ONCE by the caller). */
function buildC02ShipMap(
  lessons: ComparedLesson[],
  floorInput: C02FloorInput,
  cookingValues: ReadonlySet<string>
): Map<string, C02ShipTags> {
  const map = new Map<string, C02ShipTags>();
  for (const lesson of lessons) {
    if (isC02Anchored(lesson)) map.set(lesson.id, shipTagsFor(lesson, floorInput, cookingValues));
  }
  return map;
}

/**
 * The ship-policy provenance bucket (P3.1 / design §8 ②): classify every C02
 * compared lesson by how its shipped output was produced/changed, and keep the
 * floored OR ship-changed rows as the user's spot-check sample. REPLACES the
 * `normalizationCount` edge-case signal for C02 floored rows (C02 bypasses
 * `normalize`; the floor lands later in `materializeC02Ship`).
 */
function buildC02ShipProvenance(
  lessons: ComparedLesson[],
  shipMap: Map<string, C02ShipTags>
): C02ShipProvenanceBucket {
  const rows: C02ShipProvenanceRow[] = [];
  let flooredCount = 0;
  let shipChangedCount = 0;
  for (const lesson of lessons) {
    const ship = shipMap.get(lesson.id);
    if (ship === undefined) continue; // non-C02 lesson (defensive)
    const flooredFields = lesson.flooredFields ?? [];
    const floored = flooredFields.length > 0;
    const shipChanged =
      !setsEqual(lesson.corpus.flat.cooking_skills ?? [], ship.cooking_skills) ||
      !setsEqual(lesson.corpus.flat.main_ingredients ?? [], ship.main_ingredients);
    if (floored) flooredCount++;
    if (shipChanged) shipChangedCount++;
    if (floored || shipChanged) {
      rows.push({ id: lesson.id, title: lesson.title, flooredFields, floored, shipChanged, ship });
    }
  }
  rows.sort((a, b) => a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
  return { rows, flooredCount, shipChangedCount };
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

/**
 * @param shipMap when supplied (a C02 run), the two C02 fields' NEW values come
 *   from the materialized per-field SHIP output (NOT `rawInput`, which holds the
 *   raw decision) — D-P6/D-P11. Non-C02 fields always read `rawInput`.
 */
function diffFlatField(
  field: MainPassField,
  label: string,
  lessons: ComparedLesson[],
  shipMap?: Map<string, C02ShipTags>
): FieldDiff {
  const result = emptyFieldDiff(field, label, lessons.length);
  const isC02Field = (C02_APPLY_FIELDS as readonly string[]).includes(field);
  for (const lesson of lessons) {
    const oldValues = lesson.corpus.flat[field] ?? [];
    const ship = isC02Field ? shipMap?.get(lesson.id) : undefined;
    const newValues = ship ? ship[field as C02ApplyField] : newFlatValues(lesson.rawInput, field);
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

/**
 * Builds the full diff report (pure; markdown rendering is separate).
 *
 * `excludedIds` (default empty) drops deletion-slated / non-lesson rows from
 * the corpus BEFORE diffing — those lessons were intentionally never sent to
 * the run, so they must not surface as "missing", merely as an excluded count.
 */
export function buildDiffReport(
  corpusRecords: CorpusDiffRecord[],
  runRecords: RunRecord[],
  vocab: Stage2Vocab,
  excludedIds: Set<string> = new Set()
): DiffReport {
  const {
    compared,
    missingFromRun,
    unknownInRun,
    corpusLessonsKept,
    excludedLessons,
    zodFailedIncluded,
    // Both C02 read paths thread the ship output now: the diff path (here) and —
    // as of P3.2 — the apply path (buildStagingRows in prepare-apply).
  } = selectComparedLessons(corpusRecords, runRecords, excludedIds, { c02ShipThreading: true });

  // A C02 anchored run scopes the diff to the two C02 fields and reads the
  // materialized per-field SHIP output for them (D-P6/D-P11). The floor input +
  // canonical cooking set are loaded ONCE here (not per row).
  const isC02Run = compared.some(isC02Anchored);
  let shipMap: Map<string, C02ShipTags> | undefined;
  let c02ShipProvenance: C02ShipProvenanceBucket | undefined;
  if (isC02Run) {
    const floorInput = loadC02FloorInput();
    const cookingValues = new Set(loadC02Manifest().cookingSkills);
    shipMap = buildC02ShipMap(compared, floorInput, cookingValues);
    c02ShipProvenance = buildC02ShipProvenance(compared, shipMap);
  }

  // On a C02 run, the run's `rawInput` carries no values for the other 12 fields,
  // so diffing them would spuriously show every other field emptied — scope to
  // the two C02 fields only.
  const fieldsToReport: readonly MainPassField[] = isC02Run
    ? (C02_APPLY_FIELDS as readonly MainPassField[])
    : MAIN_PASS_FIELDS;

  const fields = fieldsToReport.map((field) =>
    field === 'academic_concepts'
      ? diffConceptsField(vocab[field].label, compared)
      : diffFlatField(field, vocab[field].label, compared, shipMap)
  );

  return {
    corpusLessons: corpusLessonsKept,
    excludedLessons,
    comparedLessons: compared.length,
    zodFailedIncluded,
    missingFromRun,
    unknownInRun,
    fields,
    ...(c02ShipProvenance ? { c02ShipProvenance } : {}),
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

/**
 * Renders the C02 ship-policy provenance bucket — the floored / ship-changed
 * SAMPLE the user spot-checks before apply (design §8 ② / P3.1). Each row says
 * how its shipped output was produced (floor-fallback) and what it would write.
 */
function renderC02ShipProvenance(bucket: C02ShipProvenanceBucket): string[] {
  const lines: string[] = [];
  lines.push('## Spot-check sample — floored / ship-changed rows');
  lines.push('');
  lines.push(
    'These are the C02 rows whose shipped tags were produced by the deterministic ' +
      'floor (a field whose AI suggestion was off-vocabulary fell back to the floor) ' +
      'or otherwise differ from the tags they have today. Spot-check these before ' +
      'applying — they are where the re-tag actually changes a lesson.'
  );
  lines.push('');
  lines.push(
    `- Rows that fell back to the floor (floored): ${bucket.flooredCount}` +
      `\n- Rows whose shipped tags differ from today: ${bucket.shipChangedCount}`
  );
  lines.push('');
  if (bucket.rows.length === 0) {
    lines.push('No floored or ship-changed rows in this run.');
    lines.push('');
    return lines;
  }
  for (const row of bucket.rows) {
    const markers: string[] = [];
    if (row.floored) {
      markers.push(`floored (${row.flooredFields.join(', ')})`);
    }
    if (row.shipChanged) markers.push('ship-changed');
    const cooking =
      row.ship.cooking_skills.length > 0 ? row.ship.cooking_skills.map(quote).join(', ') : '(none)';
    const ingredients =
      row.ship.main_ingredients.length > 0
        ? row.ship.main_ingredients.map(quote).join(', ')
        : '(none)';
    lines.push(
      `- **${row.title}** (\`${row.id}\`) — ${markers.join('; ')}; ` +
        `ships cooking skills: ${cooking}; main ingredients: ${ingredients}`
    );
  }
  lines.push('');
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
  if (report.excludedLessons > 0) {
    lines.push(
      `- Lessons excluded from the run (deletion-slated / not lessons, so never ` +
        `re-tagged): ${report.excludedLessons}`
    );
  }
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

  if (report.c02ShipProvenance) {
    lines.push(...renderC02ShipProvenance(report.c02ShipProvenance));
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
  exclusions: string;
  help: boolean;
}

export function parseArgs(argv: string[]): Args {
  const args: Args = {
    run: DEFAULT_RUN_PATH,
    corpus: DEFAULT_CORPUS_PATH,
    out: DEFAULT_OUT_PATH,
    exclusions: DEFAULT_CORPUS_EXCLUSIONS_PATH,
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
      case '--exclusions':
        args.exclusions = requireFlagValue(flag, next);
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
  --exclusions <path>  corpus-exclusions JSON; excluded lessons are dropped from the
                       diff (default scripts/stage2-retag/data/corpus-exclusions.json)
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
  const excludedIds = new Set(loadCorpusExclusions(args.exclusions).map((entry) => entry.id));
  const report = buildDiffReport(corpusRecords, runRecords, loadVocab(), excludedIds);

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
