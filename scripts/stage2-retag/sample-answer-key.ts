/**
 * Stage 2 answer-key sampler + labeling worksheet (task B1).
 *
 * Builds the Protocol-A answer-key sample (design doc §4 OQ6): ~40
 * stratified-random lessons (strata = current PROD activity_type × body-length
 * quartile) + ~20 hand-picked adversarial lessons from the failure gallery and
 * the PR-A dry-run escalations. Emits two artifacts into the gitignored
 * `artifacts/` directory:
 *
 *   - answer-key-sample.jsonl   — a provenance header record + one record per
 *                                 sampled lesson (id, title, bucket, stratum or
 *                                 adversarial class/reason, body, current tags).
 *   - answer-key-worksheet.md   — a plain-language per-lesson labeling sheet
 *                                 (12 re-tag fields + a grades row), with the
 *                                 canonical vocab lists inlined once at the top
 *                                 (rendered from vocab.ts, never hand-copied),
 *                                 a DRAFT column (B2 pre-fill agent) and a
 *                                 CONFIRMED column (the user).
 *
 * The same file also parses a FILLED worksheet back into
 * `artifacts/answer-key.final.jsonl` (the B1 converter the B2 step uses).
 *
 * Determinism: the random draw uses a seeded mulberry32 PRNG; the seed is a
 * fixed default (overridable via --seed) and is recorded in the sample
 * header record so any draw is reproducible.
 *
 * No DB access, no API calls — reads only artifacts/corpus.jsonl and the
 * checked-in data/answer-key-adversarial.json.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import { RESULT_PROPERTIES } from './schema';
import { MAIN_PASS_FIELDS, loadVocab, type MainPassField, type Stage2Vocab } from './vocab';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

/** Bumped when the sampler logic changes in a way that affects the emitted draw. */
export const SAMPLER_VERSION = 'b1-v1' as const;

/** Fixed default seed — recorded in the sample header so draws are reproducible. */
export const DEFAULT_SEED = 20260612;

/** Default sample sizes (the "~40" + "~20" of design §4 OQ6 Protocol A). */
export const DEFAULT_RANDOM_TOTAL = 40;

const DEFAULT_CORPUS_PATH = path.join(MODULE_DIR, 'artifacts/corpus.jsonl');
const DEFAULT_ADVERSARIAL_PATH = path.join(MODULE_DIR, 'data/answer-key-adversarial.json');
const DEFAULT_OUT_DIR = path.join(MODULE_DIR, 'artifacts');

const SAMPLE_FILENAME = 'answer-key-sample.jsonl';
const WORKSHEET_FILENAME = 'answer-key-worksheet.md';
const FINAL_FILENAME = 'answer-key.final.jsonl';

// ---------------------------------------------------------------------------
// Corpus record shape (the fields the worksheet needs)
// ---------------------------------------------------------------------------

const conceptsObjectSchema = z.record(z.array(z.string()));

/**
 * The corpus record shape the sampler consumes — the export-corpus.ts output:
 * id + title + body + the current PROD values of the 12 re-tag fields. We keep
 * the whole tag block (validated loosely) so the worksheet can show "current"
 * values and the sample JSONL can carry them forward.
 */
export const corpusRecordSchema = z
  .object({
    id: z.string().min(1),
    title: z.string(),
    content_text: z.string().min(1),
    activity_type: z.array(z.string()).nullable().optional(),
    tags: z.array(z.string()).nullable().optional(),
    season_timing: z.array(z.string()).nullable().optional(),
    cultural_responsiveness_features: z.array(z.string()).nullable().optional(),
    cultural_heritage: z.array(z.string()).nullable().optional(),
    academic_integration: z.array(z.string()).nullable().optional(),
    social_emotional_learning: z.array(z.string()).nullable().optional(),
    core_competencies: z.array(z.string()).nullable().optional(),
    cooking_methods: z.array(z.string()).nullable().optional(),
    observances_holidays: z.array(z.string()).nullable().optional(),
    garden_skills: z.array(z.string()).nullable().optional(),
    academic_concepts: conceptsObjectSchema.nullable().optional(),
  })
  .passthrough();

export type CorpusRecordForSampling = z.infer<typeof corpusRecordSchema>;

/** The current-tags block carried into the sample record + shown in the worksheet. */
export type CurrentTags = Record<string, unknown>;

function currentTagsOf(rec: CorpusRecordForSampling): CurrentTags {
  const out: CurrentTags = {};
  for (const field of MAIN_PASS_FIELDS) {
    out[field] =
      (rec as Record<string, unknown>)[field] ?? (field === 'academic_concepts' ? {} : []);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Adversarial list
// ---------------------------------------------------------------------------

export const adversarialEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  reason: z.string().min(1),
  class: z.string().min(1),
});

export type AdversarialEntry = z.infer<typeof adversarialEntrySchema>;

const adversarialFileSchema = z.object({
  provenance: z.record(z.unknown()),
  adversarial: z.array(adversarialEntrySchema).min(1),
});

/**
 * Loads the checked-in adversarial list and HARD-validates every id against
 * the corpus id set: an unknown id is a fatal error (a retired/renamed lesson
 * must be caught here, not silently dropped from the answer key). Also rejects
 * duplicate ids within the list.
 */
export function loadAdversarial(filePath: string, corpusIds: Set<string>): AdversarialEntry[] {
  const parsed = adversarialFileSchema.parse(JSON.parse(readFileSync(filePath, 'utf8')));
  const seen = new Set<string>();
  for (const entry of parsed.adversarial) {
    if (seen.has(entry.id)) {
      throw new Error(`adversarial list has a duplicate id: ${entry.id}`);
    }
    seen.add(entry.id);
    if (!corpusIds.has(entry.id)) {
      throw new Error(
        `adversarial id ${entry.id} (${entry.title}) is not in the corpus — ` +
          `the lesson may have been retired/renamed. Pick another from the same ` +
          `class and update data/answer-key-adversarial.json.`
      );
    }
  }
  return parsed.adversarial;
}

// ---------------------------------------------------------------------------
// Seedable PRNG (determinism is required; Math.random is banned in sampling)
// ---------------------------------------------------------------------------

/**
 * mulberry32 — a tiny, fast, well-distributed seedable 32-bit PRNG. Returns a
 * function producing floats in [0, 1). Same seed → identical stream, which is
 * the determinism guarantee the sample header records.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function next(): number {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic Fisher-Yates shuffle of a copy of `items` using `rng`. */
function shuffle<T>(items: T[], rng: () => number): T[] {
  const out = items.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// ---------------------------------------------------------------------------
// Stratification
// ---------------------------------------------------------------------------

export interface Quartiles {
  q25: number;
  q50: number;
  q75: number;
}

/** Body-length quartile cut points over the corpus (inclusive lower bands). */
export function bodyLengthQuartiles(records: CorpusRecordForSampling[]): Quartiles {
  const lengths = records.map((r) => r.content_text.length).sort((x, y) => x - y);
  const n = lengths.length;
  const at = (p: number): number => lengths[Math.min(n - 1, Math.floor(p * n))];
  return { q25: at(0.25), q50: at(0.5), q75: at(0.75) };
}

function activityLabel(rec: CorpusRecordForSampling): string {
  const at = rec.activity_type;
  if (!at || at.length === 0) return '(none)';
  return [...at].sort().join('|');
}

function quartileBand(length: number, q: Quartiles): 'Q1' | 'Q2' | 'Q3' | 'Q4' {
  if (length < q.q25) return 'Q1';
  if (length < q.q50) return 'Q2';
  if (length < q.q75) return 'Q3';
  return 'Q4';
}

/** Stratum key = sorted activity_type label × body-length quartile. */
export function stratumKey(rec: CorpusRecordForSampling, q: Quartiles): string {
  return `${activityLabel(rec)}::${quartileBand(rec.content_text.length, q)}`;
}

/**
 * Proportional stratified-random sample of `total` records (deterministic for a
 * given seed). Excluded ids (the adversarial bucket) never enter the draw.
 *
 * Allocation: each stratum gets `round(total * stratumSize / population)`
 * (capped at the stratum size), drawn by a per-stratum deterministic shuffle.
 * Rounding drift is corrected by topping up / trimming from a global
 * deterministic shuffle of the remaining pool, so the result honors `total`
 * exactly whenever the available population allows. Small/empty strata are
 * handled naturally (a stratum of size 0 allocates 0).
 */
export function stratifiedSample(
  records: CorpusRecordForSampling[],
  total: number,
  seed: number,
  excluded: Set<string>
): CorpusRecordForSampling[] {
  const pool = records.filter((r) => !excluded.has(r.id));
  if (pool.length <= total) return pool.slice();

  const q = bodyLengthQuartiles(records);
  const rng = mulberry32(seed);

  // Group into strata, keeping a stable initial order for reproducibility.
  const strata = new Map<string, CorpusRecordForSampling[]>();
  for (const rec of pool) {
    const key = stratumKey(rec, q);
    const bucket = strata.get(key);
    if (bucket) bucket.push(rec);
    else strata.set(key, [rec]);
  }

  const orderedKeys = [...strata.keys()].sort();
  const chosen: CorpusRecordForSampling[] = [];
  const chosenIds = new Set<string>();

  for (const key of orderedKeys) {
    const bucket = strata.get(key)!;
    const want = Math.min(bucket.length, Math.round((total * bucket.length) / pool.length));
    const drawn = shuffle(bucket, rng).slice(0, want);
    for (const rec of drawn) {
      chosen.push(rec);
      chosenIds.add(rec.id);
    }
  }

  // Correct rounding drift against the requested total.
  if (chosen.length > total) {
    const trimmed = shuffle(chosen, rng).slice(0, total);
    return trimmed;
  }
  if (chosen.length < total) {
    const remaining = shuffle(
      pool.filter((r) => !chosenIds.has(r.id)),
      rng
    );
    for (const rec of remaining) {
      if (chosen.length >= total) break;
      chosen.push(rec);
      chosenIds.add(rec.id);
    }
  }
  return chosen;
}

// ---------------------------------------------------------------------------
// Sample-record assembly
// ---------------------------------------------------------------------------

export interface SampleHeaderRecord {
  kind: 'header';
  sampler_version: string;
  seed: number;
  random_count: number;
  adversarial_count: number;
  total: number;
  generated_at_note: string;
}

export interface SampleLessonRecord {
  kind: 'lesson';
  id: string;
  title: string;
  bucket: 'random' | 'adversarial';
  stratum: string | null;
  adversarial_class: string | null;
  adversarial_reason: string | null;
  content_text: string;
  current_tags: CurrentTags;
  sampler_version: string;
  seed: number;
}

export type SampleRecord = SampleHeaderRecord | SampleLessonRecord;

export interface BuildSampleParams {
  random: CorpusRecordForSampling[];
  adversarial: AdversarialEntry[];
  corpus: CorpusRecordForSampling[];
  seed: number;
}

/**
 * Assembles the answer-key-sample records: a header (provenance) record first,
 * then one lesson record per sampled lesson. Random records carry their
 * stratum; adversarial records carry their class + reason. Bodies and current
 * tags are pulled from the corpus by id.
 */
export function buildSampleRecords(params: BuildSampleParams): SampleRecord[] {
  const { random, adversarial, corpus, seed } = params;
  const byId = new Map(corpus.map((r) => [r.id, r]));
  const q = bodyLengthQuartiles(corpus);

  const records: SampleRecord[] = [
    {
      kind: 'header',
      sampler_version: SAMPLER_VERSION,
      seed,
      random_count: random.length,
      adversarial_count: adversarial.length,
      total: random.length + adversarial.length,
      generated_at_note:
        'Deterministic draw; reproduce with `npx tsx scripts/stage2-retag/sample-answer-key.ts --seed ' +
        `${seed}`,
    },
  ];

  for (const rec of random) {
    records.push({
      kind: 'lesson',
      id: rec.id,
      title: rec.title,
      bucket: 'random',
      stratum: stratumKey(rec, q),
      adversarial_class: null,
      adversarial_reason: null,
      content_text: rec.content_text,
      current_tags: currentTagsOf(rec),
      sampler_version: SAMPLER_VERSION,
      seed,
    });
  }

  for (const entry of adversarial) {
    const rec = byId.get(entry.id);
    if (!rec) {
      // Should never happen — loadAdversarial validated against the corpus.
      throw new Error(`adversarial id ${entry.id} unexpectedly absent from the corpus at assembly`);
    }
    records.push({
      kind: 'lesson',
      id: rec.id,
      title: rec.title,
      bucket: 'adversarial',
      stratum: null,
      adversarial_class: entry.class,
      adversarial_reason: entry.reason,
      content_text: rec.content_text,
      current_tags: currentTagsOf(rec),
      sampler_version: SAMPLER_VERSION,
      seed,
    });
  }

  return records;
}

// ---------------------------------------------------------------------------
// Worksheet rendering
// ---------------------------------------------------------------------------

const GRADES_ROW_LABEL = 'Grades the document itself claims (leave blank if the doc is silent)';

/** Field-row order in the worksheet: the 12 re-tag fields, then the grades row. */
const WORKSHEET_FIELD_ORDER: (MainPassField | 'grade_levels')[] = [...RESULT_PROPERTIES];

function fieldRowLabel(field: MainPassField | 'grade_levels', vocab: Stage2Vocab): string {
  if (field === 'grade_levels') return GRADES_ROW_LABEL;
  return vocab[field].label;
}

/** Plain-language one-liner per field, for the vocab section. */
function vocabListBlock(vocab: Stage2Vocab): string {
  const lines: string[] = [];
  for (const field of MAIN_PASS_FIELDS) {
    const fv = vocab[field];
    if (field === 'academic_concepts') {
      lines.push(
        `- **${fv.label}** (per-subject, keyed by Academic Integration subject): a large ` +
          `controlled list — pick the framework concept(s) the lesson actually teaches, ` +
          `grouped under the subject they live in (e.g. \`Science: Plant Parts\`). The full ` +
          `concept vocabulary is in \`data/vocab/academic-concepts.vocab.json\`.`
      );
      continue;
    }
    lines.push(`- **${fv.label}** — ${fv.values.join(' · ')}`);
  }
  // The grades row is a closed enum too.
  lines.push(
    `- **Grade levels** (source-doc claim only) — 3K · PK · K · 1 · 2 · 3 · 4 · 5 · 6 · 7 · 8`
  );
  return lines.join('\n');
}

function renderLessonSection(rec: SampleLessonRecord, index: number, vocab: Stage2Vocab): string {
  const bucketLine =
    rec.bucket === 'adversarial'
      ? `**bucket:** adversarial — class \`${rec.adversarial_class}\``
      : `**bucket:** random — stratum \`${rec.stratum}\``;
  const reasonLine =
    rec.bucket === 'adversarial' && rec.adversarial_reason
      ? `\n> Why this lesson is here: ${rec.adversarial_reason}\n`
      : '\n';

  const rows: string[] = [];
  rows.push('| Field | DRAFT (B2 pre-fill) | CONFIRMED (user) |');
  rows.push('|---|---|---|');
  for (const field of WORKSHEET_FIELD_ORDER) {
    const label = fieldRowLabel(field, vocab);
    // Anchor each row with a hidden field marker so the parser keys on the
    // snake_case field name, not the human label.
    rows.push(`| ${label} <!-- f:${field} --> |  |  |`);
  }

  return [
    `### Lesson ${index} — ${rec.title}`,
    '',
    `<!-- lesson-id: ${rec.id} -->`,
    '',
    `- **id:** \`${rec.id}\``,
    `- ${bucketLine}`,
    reasonLine,
    `Read this lesson's body from \`${SAMPLE_FILENAME}\` (record id \`${rec.id}\`). The body is`,
    `NOT inlined here — open the sample JSONL and find the matching \`id\`.`,
    '',
    rows.join('\n'),
    '',
    'For `academic_concepts`, write `Subject: concept, concept; Subject2: concept`.',
    'For every other multi-value field, comma-separate the values. Leave a cell',
    'blank for "none". CONFIRMED wins; a blank CONFIRMED cell falls back to DRAFT.',
    '',
    '---',
    '',
  ].join('\n');
}

/**
 * Renders the plain-language labeling worksheet. The canonical vocab lists are
 * rendered from the vocab module (never hand-copied). Lesson bodies are
 * referenced by id, not inlined.
 */
export function renderWorksheet(records: SampleRecord[], vocab: Stage2Vocab): string {
  const header = records.find((r): r is SampleHeaderRecord => r.kind === 'header');
  const lessons = records.filter((r): r is SampleLessonRecord => r.kind === 'lesson');

  const intro = [
    '# Answer-key labeling worksheet',
    '',
    '> Protocol-A answer key (design §4 OQ6). One section per sampled lesson. For',
    '> each lesson, read its body from the sample JSONL (by `id`), then fill the',
    '> CONFIRMED column for every field. The DRAFT column is pre-filled by the B2',
    '> agent with body-quote evidence; you check and correct it.',
    '>',
    '> **Grades policy (locked):** record only the grades the lesson document itself',
    '> claims. If the document is silent about grade levels, leave the grades row',
    '> blank — do not infer grades from the activity.',
    '',
    header
      ? `> Sample: ${header.random_count} random + ${header.adversarial_count} adversarial = ` +
        `${header.total} lessons · seed \`${header.seed}\` · sampler \`${header.sampler_version}\`.`
      : '',
    '',
    '## Canonical vocabulary',
    '',
    'Pick values only from these lists (they are rendered from the locked vocab,',
    'so they always match the runner). Multi-value fields can take several;',
    'leave blank for none.',
    '',
    vocabListBlock(vocab),
    '',
    '---',
    '',
  ].join('\n');

  const sections = lessons.map((rec, i) => renderLessonSection(rec, i + 1, vocab)).join('\n');
  return `${intro}\n${sections}`;
}

// ---------------------------------------------------------------------------
// Filled-worksheet parser (worksheet → answer-key.final.jsonl)
// ---------------------------------------------------------------------------

export interface FinalLabelRecord {
  id: string;
  activity_type: string[];
  tags: string[];
  season_timing: string[];
  cultural_responsiveness_features: string[];
  cultural_heritage: string[];
  academic_integration: string[];
  social_emotional_learning: string[];
  core_competencies: string[];
  cooking_methods: string[];
  observances_holidays: string[];
  garden_skills: string[];
  academic_concepts: Record<string, string[]>;
  grade_levels: string[];
}

function splitMultiValue(cell: string): string[] {
  return cell
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseConceptsCell(cell: string): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const group of cell.split(';')) {
    const trimmed = group.trim();
    if (!trimmed) continue;
    const colon = trimmed.indexOf(':');
    if (colon === -1) continue;
    const subject = trimmed.slice(0, colon).trim();
    const values = splitMultiValue(trimmed.slice(colon + 1));
    if (subject) out[subject] = values;
  }
  return out;
}

const ROW_RE = /\|([^|]*)<!--\s*f:([a-z_]+)\s*-->\s*\|([^|]*)\|([^|]*)\|/;
const LESSON_ID_RE = /<!--\s*lesson-id:\s*(\S+)\s*-->/;

/**
 * Parses a FILLED worksheet back into final.jsonl label records. Each lesson
 * section is delimited by a `<!-- lesson-id: X -->` anchor; each field row
 * carries an `<!-- f:field -->` anchor. CONFIRMED (4th cell) wins; if blank,
 * the DRAFT (3rd cell) is used. Unfilled fields become empty arrays / `{}`.
 */
export function parseFilledWorksheet(markdown: string): FinalLabelRecord[] {
  const records: FinalLabelRecord[] = [];
  let current: FinalLabelRecord | null = null;

  const finalize = (): void => {
    if (current) records.push(current);
  };

  const blank = (id: string): FinalLabelRecord => ({
    id,
    activity_type: [],
    tags: [],
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
    grade_levels: [],
  });

  for (const line of markdown.split('\n')) {
    const idMatch = line.match(LESSON_ID_RE);
    if (idMatch) {
      finalize();
      current = blank(idMatch[1]);
      continue;
    }
    if (!current) continue;

    const rowMatch = line.match(ROW_RE);
    if (!rowMatch) continue;
    const field = rowMatch[2];
    const draft = rowMatch[3].trim();
    const confirmed = rowMatch[4].trim();
    const value = confirmed.length > 0 ? confirmed : draft;
    if (field === 'academic_concepts') {
      current.academic_concepts = parseConceptsCell(value);
    } else if (field in current) {
      (current as unknown as Record<string, string[]>)[field] = splitMultiValue(value);
    }
  }
  finalize();
  return records;
}

// ---------------------------------------------------------------------------
// Corpus loading
// ---------------------------------------------------------------------------

export function loadCorpus(filePath: string): CorpusRecordForSampling[] {
  return readFileSync(filePath, 'utf8')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line, index) => {
      try {
        return corpusRecordSchema.parse(JSON.parse(line));
      } catch (e) {
        throw new Error(
          `corpus line ${index + 1} is malformed: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    });
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export interface Args {
  seed: number;
  outDir?: string;
  randomTotal: number;
  /**
   * Converter mode: when set, parse this FILLED worksheet back into
   * answer-key.final.jsonl instead of emitting a fresh sample (the B1 tooling
   * the B2 step uses to materialize the user-confirmed key).
   */
  parse?: string;
  help: boolean;
}

function requireIntFlag(flag: string, next: string | undefined): number {
  if (next === undefined || next.startsWith('--')) {
    throw new Error(`flag ${flag} requires a value (use --help for usage)`);
  }
  const value = Number(next);
  if (!Number.isInteger(value)) {
    throw new Error(`flag ${flag} requires an integer, got: ${next} (use --help for usage)`);
  }
  return value;
}

export function parseArgs(argv: string[]): Args {
  const a: Args = { seed: DEFAULT_SEED, randomTotal: DEFAULT_RANDOM_TOTAL, help: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const next = argv[i + 1];
    switch (flag) {
      case '--seed':
        a.seed = requireIntFlag(flag, next);
        i++;
        break;
      case '--random-total':
        a.randomTotal = requireIntFlag(flag, next);
        i++;
        break;
      case '--out-dir':
        if (next === undefined || next.startsWith('--')) {
          throw new Error(`flag ${flag} requires a value (use --help for usage)`);
        }
        a.outDir = next;
        i++;
        break;
      case '--parse':
        if (next === undefined || next.startsWith('--')) {
          throw new Error(`flag ${flag} requires a value (use --help for usage)`);
        }
        a.parse = next;
        i++;
        break;
      case '--help':
      case '-h':
        a.help = true;
        break;
      default:
        throw new Error(`unknown flag: ${flag} (use --help for usage)`);
    }
  }
  return a;
}

const HELP = `
Stage 2 answer-key sampler + labeling worksheet (task B1).

Builds the Protocol-A answer key: ~${DEFAULT_RANDOM_TOTAL} stratified-random
lessons (activity_type × body-length quartile) + the ~20 checked-in adversarial
lessons (data/answer-key-adversarial.json). Emits, into the artifacts dir:
  - ${SAMPLE_FILENAME}     (header + per-lesson: id, title, bucket, body, current tags)
  - ${WORKSHEET_FILENAME}  (plain-language per-lesson labeling sheet)

Usage:
  npx tsx scripts/stage2-retag/sample-answer-key.ts [flags]

Flags:
  --seed <N>          PRNG seed for the random draw (default ${DEFAULT_SEED};
                      recorded in the sample header for reproducibility)
  --random-total <N>  number of stratified-random lessons (default ${DEFAULT_RANDOM_TOTAL})
  --out-dir <path>    output directory (default scripts/stage2-retag/artifacts)
  --parse <path>      CONVERTER mode: parse a FILLED worksheet at <path> back
                      into ${FINAL_FILENAME} (CONFIRMED wins, blank → DRAFT)
                      instead of emitting a fresh sample
  --help

No DB access, no API calls. Reads artifacts/corpus.jsonl + data/answer-key-adversarial.json.
`;

interface RunResult {
  samplePath: string;
  worksheetPath: string;
  sampleLineCount: number;
  randomCount: number;
  adversarialCount: number;
  seed: number;
}

/** Pure-ish orchestration (filesystem writes only) — testable via out-dir override. */
export function run(opts: {
  seed: number;
  randomTotal: number;
  outDir: string;
  corpusPath?: string;
  adversarialPath?: string;
}): RunResult {
  const corpusPath = opts.corpusPath ?? DEFAULT_CORPUS_PATH;
  const adversarialPath = opts.adversarialPath ?? DEFAULT_ADVERSARIAL_PATH;

  const corpus = loadCorpus(corpusPath);
  const corpusIds = new Set(corpus.map((r) => r.id));
  const adversarial = loadAdversarial(adversarialPath, corpusIds);
  const excluded = new Set(adversarial.map((e) => e.id));
  const random = stratifiedSample(corpus, opts.randomTotal, opts.seed, excluded);

  const records = buildSampleRecords({ random, adversarial, corpus, seed: opts.seed });
  const vocab = loadVocab();
  const worksheet = renderWorksheet(records, vocab);

  mkdirSync(opts.outDir, { recursive: true });
  const samplePath = path.join(opts.outDir, SAMPLE_FILENAME);
  const worksheetPath = path.join(opts.outDir, WORKSHEET_FILENAME);
  const sampleJsonl = records.map((r) => JSON.stringify(r)).join('\n') + '\n';
  writeFileSync(samplePath, sampleJsonl);
  writeFileSync(worksheetPath, worksheet);

  return {
    samplePath,
    worksheetPath,
    sampleLineCount: records.length,
    randomCount: random.length,
    adversarialCount: adversarial.length,
    seed: opts.seed,
  };
}

/** Converter entry point: filled worksheet → answer-key.final.jsonl. */
export function parseWorksheetToFinal(
  worksheetPath: string,
  outDir: string
): {
  finalPath: string;
  recordCount: number;
} {
  const markdown = readFileSync(worksheetPath, 'utf8');
  const records = parseFilledWorksheet(markdown);
  mkdirSync(outDir, { recursive: true });
  const finalPath = path.join(outDir, FINAL_FILENAME);
  writeFileSync(finalPath, records.map((r) => JSON.stringify(r)).join('\n') + '\n');
  return { finalPath, recordCount: records.length };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(HELP);
    return;
  }
  if (args.parse) {
    const { finalPath, recordCount } = parseWorksheetToFinal(
      args.parse,
      args.outDir ?? DEFAULT_OUT_DIR
    );
    process.stdout.write(`parsed ${recordCount} labeled lessons → ${finalPath}\n`);
    return;
  }
  const result = run({
    seed: args.seed,
    randomTotal: args.randomTotal,
    outDir: args.outDir ?? DEFAULT_OUT_DIR,
  });
  process.stdout.write(
    `answer key: ${result.randomCount} random + ${result.adversarialCount} adversarial = ` +
      `${result.randomCount + result.adversarialCount} lessons (seed ${result.seed})\n` +
      `  ${result.samplePath} (${result.sampleLineCount} lines incl. header)\n` +
      `  ${result.worksheetPath}\n`
  );
}

// Run only when invoked directly (mirrors run-retag.ts).
const INVOKED_PATH = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (INVOKED_PATH === fileURLToPath(import.meta.url)) {
  main();
}
