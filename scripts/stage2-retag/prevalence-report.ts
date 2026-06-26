#!/usr/bin/env npx tsx
/* eslint-disable no-console -- CLI script: console output is the operator UI */
/**
 * Stage 2 re-tag — P3.1 task 3.1 (prevalence half) / design §8 ② "Greenlight
 * criterion": the committed CORPUS-WIDE per-value prevalence report.
 *
 * The scale gate. For every CANONICAL tag value (both C02 fields), this emits its
 * SHIPPED firing rate across all compared lessons — the check that "would have
 * caught Tasting on 78% of lessons" (a value over-firing at corpus scale that the
 * 69-key + fresh-25 canary cannot surface). A value that fires ZERO times still
 * appears (firing nowhere is itself signal). Alongside the shipped rate it shows
 * the CURRENT-corpus (pre-retag) firing rate, so the report reads as before→after
 * the user can scan for an over-tag.
 *
 * SHIPPED firing = the materialized per-field SHIP output (D-P6/D-P11):
 *   - main_ingredients = floor-ONLY (the LLM ingredient decision is ignored);
 *   - cooking_skills   = floor ∪ LLM final (floor-retention).
 * It reuses `selectComparedLessons` + `shipTagsFor` from generate-diff-report so
 * the firing rates it reports and the tags an apply migration writes can never
 * drift apart. It reads the SHIP output — NEVER `rawInput`, NEVER raw `finalC02`.
 *
 * CURRENT firing = the lesson's CURRENT corpus tags, counted against the SAME
 * canonical value universe. A current tag that is OFF the canonical list (drift)
 * is bucketed into a single `offCanonicalCurrent` count per field and excluded
 * from the per-value current counts — it has no canonical row to land in, and the
 * before→after comparison is only meaningful per canonical value.
 *
 * Reporting only: no API calls, no DB access. SCRIPTS-ONLY, git-revert reversible.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  isC02Anchored,
  parseCorpusRecords,
  selectComparedLessons,
  shipTagsFor,
  type ComparedLesson,
} from './generate-diff-report';
import { loadC02FloorInput, type C02FloorInput } from './c02-floor';
import type { C02ApplyField, C02ShipTags } from './ship-policy';
import { loadC02Manifest, c02MainIngredientsValues, type C02Manifest } from './vocab';
import { parseRunRecords, requireFlagValue, warnIfOutsideArtifacts } from './run-retag';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS_DIR = path.join(MODULE_DIR, 'artifacts');
const DEFAULT_RUN_PATH = path.join(ARTIFACTS_DIR, 'retag-run.jsonl');
const DEFAULT_CORPUS_PATH = path.join(ARTIFACTS_DIR, 'corpus.jsonl');
const DEFAULT_OUT_PATH = path.join(ARTIFACTS_DIR, 'prevalence-report.md');

const FIELD_LABEL: Record<C02ApplyField, string> = {
  cooking_skills: 'Cooking Skills',
  main_ingredients: 'Main Ingredients',
};

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

/** One canonical value's before→after firing across the compared corpus. */
export interface PrevalenceRow {
  value: string;
  /** Lessons whose SHIPPED per-field output includes this value. */
  shippedCount: number;
  /** shippedCount / totalCompared (0 when no lessons compared). */
  shippedRate: number;
  /** Lessons whose CURRENT corpus tags include this value. */
  currentCount: number;
  /** currentCount / totalCompared (0 when no lessons compared). */
  currentRate: number;
  /** shippedCount − currentCount (the net firing change at corpus scale). */
  delta: number;
}

/** Per-field prevalence: every canonical value as a row, plus a drift bucket. */
export interface FieldPrevalence {
  field: C02ApplyField;
  label: string;
  /** Every canonical value, sorted by shipped rate descending then value asc. */
  rows: PrevalenceRow[];
  /** Lesson-appearances of CURRENT tags that are OFF the canonical list (drift),
   *  bucketed because they have no canonical row to land in. */
  offCanonicalCurrent: number;
}

export interface PrevalenceReport {
  /** Lessons with a usable proposed tagging (the firing-rate denominator). */
  totalCompared: number;
  cookingSkills: FieldPrevalence;
  mainIngredients: FieldPrevalence;
}

// ---------------------------------------------------------------------------
// Building (pure-ish: loads the floor + manifest ONCE, like buildDiffReport)
// ---------------------------------------------------------------------------

interface FieldUniverse {
  field: C02ApplyField;
  values: readonly string[];
  valueSet: ReadonlySet<string>;
}

function fieldUniverses(manifest: C02Manifest): Record<C02ApplyField, FieldUniverse> {
  const cooking = manifest.cookingSkills;
  const ingredients = c02MainIngredientsValues(manifest);
  return {
    cooking_skills: { field: 'cooking_skills', values: cooking, valueSet: new Set(cooking) },
    main_ingredients: {
      field: 'main_ingredients',
      values: ingredients,
      valueSet: new Set(ingredients),
    },
  };
}

/** Count firings of each canonical value across the lessons' chosen tag arrays. */
function tallyField(
  universe: FieldUniverse,
  lessons: ComparedLesson[],
  shipped: (lesson: ComparedLesson) => readonly string[],
  current: (lesson: ComparedLesson) => readonly string[],
  totalCompared: number
): FieldPrevalence {
  const shippedCounts = new Map<string, number>();
  const currentCounts = new Map<string, number>();
  let offCanonicalCurrent = 0;

  for (const lesson of lessons) {
    // De-dupe per lesson: a value present twice in one lesson counts once (a
    // FIRING is "this value appears in this lesson", not a multiplicity).
    for (const value of new Set(shipped(lesson))) {
      if (universe.valueSet.has(value)) {
        shippedCounts.set(value, (shippedCounts.get(value) ?? 0) + 1);
      }
    }
    for (const value of new Set(current(lesson))) {
      if (universe.valueSet.has(value)) {
        currentCounts.set(value, (currentCounts.get(value) ?? 0) + 1);
      } else {
        offCanonicalCurrent++;
      }
    }
  }

  const rate = (count: number): number => (totalCompared > 0 ? count / totalCompared : 0);
  const rows: PrevalenceRow[] = universe.values.map((value) => {
    const shippedCount = shippedCounts.get(value) ?? 0;
    const currentCount = currentCounts.get(value) ?? 0;
    return {
      value,
      shippedCount,
      shippedRate: rate(shippedCount),
      currentCount,
      currentRate: rate(currentCount),
      delta: shippedCount - currentCount,
    };
  });

  // Over-firing values surface at the top: shipped rate desc, then value asc.
  rows.sort((a, b) => b.shippedRate - a.shippedRate || a.value.localeCompare(b.value));

  return { field: universe.field, label: FIELD_LABEL[universe.field], rows, offCanonicalCurrent };
}

/**
 * Builds the corpus-wide per-value prevalence report. Selects compared lessons
 * with the SAME rules as the diff report (`c02ShipThreading: true`), materializes
 * each lesson's per-field SHIP output ONCE (floor + manifest loaded once), then
 * tallies shipped + current firings per canonical value.
 */
export function buildPrevalenceReport(
  corpusRecords: ReturnType<typeof parseCorpusRecords>,
  runRecords: ReturnType<typeof parseRunRecords>,
  excludedIds: Set<string> = new Set()
): PrevalenceReport {
  const { compared } = selectComparedLessons(corpusRecords, runRecords, excludedIds, {
    c02ShipThreading: true,
  });
  const c02Lessons = compared.filter(isC02Anchored);
  const totalCompared = c02Lessons.length;

  const manifest = loadC02Manifest();
  const universes = fieldUniverses(manifest);
  const floorInput: C02FloorInput = loadC02FloorInput();
  const cookingValues = new Set(manifest.cookingSkills);

  // Materialize each lesson's ship output ONCE (shared across both field tallies).
  const shipById = new Map<string, C02ShipTags>();
  for (const lesson of c02Lessons) {
    shipById.set(lesson.id, shipTagsFor(lesson, floorInput, cookingValues));
  }

  const cookingSkills = tallyField(
    universes.cooking_skills,
    c02Lessons,
    (lesson) => shipById.get(lesson.id)?.cooking_skills ?? [],
    (lesson) => lesson.corpus.flat.cooking_skills ?? [],
    totalCompared
  );
  const mainIngredients = tallyField(
    universes.main_ingredients,
    c02Lessons,
    (lesson) => shipById.get(lesson.id)?.main_ingredients ?? [],
    (lesson) => lesson.corpus.flat.main_ingredients ?? [],
    totalCompared
  );

  return { totalCompared, cookingSkills, mainIngredients };
}

// ---------------------------------------------------------------------------
// Markdown rendering
// ---------------------------------------------------------------------------

function pct(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function signed(delta: number): string {
  return delta > 0 ? `+${delta}` : `${delta}`;
}

function renderFieldSection(field: FieldPrevalence, totalCompared: number): string[] {
  const lines: string[] = [];
  lines.push(`## ${field.label}`);
  lines.push('');
  lines.push(
    `Every canonical value for this field, sorted by **shipped firing rate** ` +
      `(highest first). A value at the top of this list that you would not expect ` +
      `on that share of lessons is a likely over-tag.`
  );
  if (field.offCanonicalCurrent > 0) {
    lines.push('');
    lines.push(
      `_Note: ${field.offCanonicalCurrent} current tag appearance(s) on these lessons ` +
        `are off the canonical list (drift) and are not shown per-value below — only ` +
        `the re-tag's canonical values have rows._`
    );
  }
  lines.push('');
  lines.push('| value | shipped count | shipped % | current count | current % | delta |');
  lines.push('|---|---:|---:|---:|---:|---:|');
  for (const row of field.rows) {
    lines.push(
      `| ${row.value} | ${row.shippedCount} | ${pct(row.shippedRate)} | ` +
        `${row.currentCount} | ${pct(row.currentRate)} | ${signed(row.delta)} |`
    );
  }
  lines.push('');
  lines.push(`_${field.rows.length} canonical values · ${totalCompared} lessons compared._`);
  lines.push('');
  return lines;
}

/** Renders the prevalence report as scannable markdown (the §8 ② artifact). */
export function renderPrevalenceMarkdown(report: PrevalenceReport): string {
  const lines: string[] = [];
  lines.push('# C02 re-tag — corpus-wide per-value prevalence report');
  lines.push('');
  lines.push(
    `Compared lessons: **${report.totalCompared}**. For every canonical cooking-skill ` +
      `and main-ingredient value, this shows how often the **shipped** re-tag fires it ` +
      `across the whole corpus, next to how often the **current** tags fire it today.`
  );
  lines.push('');
  lines.push(
    '**How to read it:** "shipped %" is the firing rate the re-tag WOULD apply — the ' +
      'share of lessons that would carry this tag after apply. Scan the top of each ' +
      'field for a value firing on a surprisingly large share of lessons (the scale ' +
      'check that catches an over-tag like "Tasting on 78%"). "current %" is the same ' +
      'rate for the tags lessons have today, and "delta" is shipped count − current ' +
      'count, so a large positive delta means the re-tag adds that value broadly. ' +
      'A canonical value firing on 0 lessons still gets a row — firing nowhere is ' +
      'itself a signal.'
  );
  lines.push('');
  lines.push(
    'Shipped values are the materialized per-field SHIP output: main ingredients ship ' +
      'the deterministic floor only; cooking skills ship the floor combined with the ' +
      "AI's kept/added skills (floor-retention)."
  );
  lines.push('');
  lines.push(...renderFieldSection(report.cookingSkills, report.totalCompared));
  lines.push(...renderFieldSection(report.mainIngredients, report.totalCompared));
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
C02 re-tag corpus-wide per-value prevalence report (P3.1 / design §8 ②).

For every canonical cooking-skill and main-ingredient value, emits its SHIPPED
firing rate across all compared lessons (the scale check that catches an over-tag
like "Tasting on 78%"), alongside the current-corpus firing rate. A zero-firing
canonical value still gets a row.

Usage:
  npx tsx scripts/stage2-retag/prevalence-report.ts [flags]

Flags:
  --run <path>     run-output JSONL (default scripts/stage2-retag/artifacts/retag-run.jsonl)
  --corpus <path>  corpus JSONL (default scripts/stage2-retag/artifacts/corpus.jsonl)
  --out <path>     markdown report path (default scripts/stage2-retag/artifacts/prevalence-report.md)
  --help

Reporting only: no API calls, no DB access. Reads the per-field SHIP output
(D-P6/D-P11), never rawInput.
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
  const report = buildPrevalenceReport(corpusRecords, runRecords);

  mkdirSync(path.dirname(args.out), { recursive: true });
  writeFileSync(args.out, renderPrevalenceMarkdown(report), 'utf8');

  const topCooking = report.cookingSkills.rows[0];
  console.log(
    `Prevalence report written to ${args.out} — ${report.totalCompared} lessons compared; ` +
      `top shipped cooking value ${
        topCooking ? `"${topCooking.value}" at ${pct(topCooking.shippedRate)}` : '(none)'
      }.`
  );
}

const isDirectInvocation =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectInvocation) {
  try {
    main();
  } catch (error) {
    console.error('❌ Prevalence report failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
