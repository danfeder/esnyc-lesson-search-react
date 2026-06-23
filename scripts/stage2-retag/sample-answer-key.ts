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

import { loadC02Floor, matchKey, type C02Floor } from './normalize';
import { RESULT_PROPERTIES } from './schema';
import {
  MAIN_PASS_FIELDS,
  c02IngredientParentMap,
  c02MainIngredientsValues,
  loadC02Manifest,
  loadVocab,
  type MainPassField,
  type Stage2Vocab,
} from './vocab';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

/** Bumped when the sampler logic changes in a way that affects the emitted draw. */
export const SAMPLER_VERSION = 'b1-v1' as const;

/** Fixed default seed — recorded in the sample header so draws are reproducible. */
export const DEFAULT_SEED = 20260612;

/** Default sample sizes (the "~40" + "~20" of design §4 OQ6 Protocol A). */
export const DEFAULT_RANDOM_TOTAL = 40;

const DEFAULT_CORPUS_PATH = path.join(MODULE_DIR, 'artifacts/corpus.jsonl');
const DEFAULT_ADVERSARIAL_PATH = path.join(MODULE_DIR, 'data/answer-key-adversarial.json');
const DEFAULT_EXCLUSIONS_PATH = path.join(MODULE_DIR, 'data/answer-key-exclusions.json');
const DEFAULT_OUT_DIR = path.join(MODULE_DIR, 'artifacts');

const SAMPLE_FILENAME = 'answer-key-sample.jsonl';
const WORKSHEET_FILENAME = 'answer-key-worksheet.md';
const FINAL_FILENAME = 'answer-key.final.jsonl';

/** C02 (P1.5) artifact filenames — the 3-layer cooking/ingredients pilot sample. */
const C02_SAMPLE_FILENAME = 'c02-answer-key-sample.jsonl';
const C02_MANIFEST_FILENAME = 'c02-answer-key-manifest.json';

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
    // C02 (P1.5): the two re-tagged free-form vocabularies. The on-disk
    // corpus.jsonl predates the export that added these, so they may be absent
    // (P2.1 regenerates the corpus with them); the C02 sampler reads them when
    // present and treats absent as an empty current-tag set.
    cooking_skills: z.array(z.string()).nullable().optional(),
    main_ingredients: z.array(z.string()).nullable().optional(),
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
// Exclusions list (sampled lessons the user removed from the answer key)
// ---------------------------------------------------------------------------

export const exclusionEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  reason: z.string().min(1),
});

export type ExclusionEntry = z.infer<typeof exclusionEntrySchema>;

const exclusionsFileSchema = z.object({
  provenance: z.record(z.unknown()),
  excluded: z.array(exclusionEntrySchema),
});

/**
 * Loads the checked-in exclusions list — lessons that were sampled into the
 * worksheet but which the user removed from the answer key (incomplete /
 * non-lesson docs, per the PR-6b verification rulings). Returns the set of
 * excluded ids. Rejects duplicate ids within the list.
 */
export function loadExclusions(filePath: string): Set<string> {
  const parsed = exclusionsFileSchema.parse(JSON.parse(readFileSync(filePath, 'utf8')));
  const ids = new Set<string>();
  for (const entry of parsed.excluded) {
    if (ids.has(entry.id)) {
      throw new Error(`exclusions list has a duplicate id: ${entry.id}`);
    }
    ids.add(entry.id);
  }
  return ids;
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
// C02 3-layer answer-key sampler (P1.5)
//
// Builds the pilot answer-key sample for the cooking_skills + main_ingredients
// re-tag (design §4 Q4): a deterministic, seeded, 70-lesson sample in three
// layers — (1) hard-case quotas keyed off CURRENT tags, (2) a deterministic
// greedy set-cover guaranteeing every one of the 93 canonical values appears
// >=2x across {hard-case ∪ coverage}, (3) a clean-core slice (the existing
// activity_type × body-length-quartile proportional draw) filling to exactly 70.
//
// The set-cover's coverage TARGET is "expected post-retag membership", NOT
// current tags — an added specific has near-zero current carriers. A lesson is
// a CANDIDATE for value V iff EITHER the deterministic C02 floor predicts V from
// its current tags (floor-over-current-tags) OR a committed body-keyword pattern
// for V matches the lesson body. Coverage is HARD where the pool allows; any
// value the pool cannot raise to 2 lands on a WARN list (defensive — the
// grounding proved this list is empty on the real corpus).
//
// Determinism: every random choice routes through mulberry32(seed) + the shared
// shuffle. No Math.random. Same seed -> identical selection + layer assignment.
// ---------------------------------------------------------------------------

/** Target sample size — design §4 Q4 lock (≈25 clean-core / 25 coverage / 20 hard-case). */
export const C02_SAMPLE_SIZE = 70;

/** Hard-case layer cap (design §4 Q4 ≈20). */
export const C02_HARD_CASE_CAP = 20;

/** Minimum occurrences every canonical value must reach (design §4 Q4 ≥2×). */
export const C02_COVERAGE_FLOOR = 2;

const C02_COVERAGE_KEYWORDS_PATH = path.join(MODULE_DIR, 'data/c02-coverage-keywords.json');
const C02_ALIAS_MAP_PATH = path.join(MODULE_DIR, 'data/c02-alias-map.json');

const coverageKeywordsSchema = z.object({
  provenance: z.record(z.unknown()),
  keywords: z.record(z.string()),
});

/**
 * Loads the committed body-keyword patterns (value → case-insensitive RegExp).
 * Used by the set-cover to widen the candidate pool for values with near-zero
 * current carriers (added specifics; the empty/low-floor tail). P2 may extend
 * the data file if the real run reveals a coverage gap (data-only change).
 */
export function loadCoverageKeywords(
  filePath: string = C02_COVERAGE_KEYWORDS_PATH
): Map<string, RegExp> {
  const parsed = coverageKeywordsSchema.parse(JSON.parse(readFileSync(filePath, 'utf8')));
  const out = new Map<string, RegExp>();
  for (const [value, pattern] of Object.entries(parsed.keywords)) {
    out.set(value, new RegExp(pattern, 'i'));
  }
  return out;
}

const aliasMapFileSchema = z.object({
  provenance: z.record(z.unknown()),
  aliasMap: z.record(z.string()),
  drops: z.array(z.string()),
});

/** The C02 floor + parent map + drop set + canonical value sets the sampler needs. */
export interface C02SamplerContext {
  floor: C02Floor;
  parentMap: Record<string, string>;
  /** matchKey set of every alias-map drop literal (orphan/drop hard-case class). */
  dropKeys: Set<string>;
  /** matchKey → canonical for cooking_skills (alias folds + canonical-case). */
  cookingFolds: Map<string, string>;
  /** matchKey → canonical for main_ingredients (alias folds + canonical-case). */
  ingredientFolds: Map<string, string>;
  cookingValues: string[];
  ingredientValues: string[];
  keywords: Map<string, RegExp>;
}

/**
 * Builds the sampler context from the real on-disk C02 data (the SAME floor the
 * normalize R7/R8/R9 rules use — reused, never re-implemented), plus the
 * coverage keywords and the alias-map drop list. The floor is loaded via the
 * exported `loadC02Floor`; we additionally read the alias-map file directly for
 * its `drops` (the orphan/drop hard-case signal) rather than re-deriving it.
 */
export function buildC02SamplerContext(opts?: {
  keywordsPath?: string;
  aliasMapPath?: string;
}): C02SamplerContext {
  const manifest = loadC02Manifest();
  const floor = loadC02Floor();
  const parsedAlias = aliasMapFileSchema.parse(
    JSON.parse(readFileSync(opts?.aliasMapPath ?? C02_ALIAS_MAP_PATH, 'utf8'))
  );
  return {
    floor,
    parentMap: c02IngredientParentMap(manifest),
    dropKeys: new Set(parsedAlias.drops.map((d) => matchKey(d))),
    cookingFolds: floor.cookingFolds,
    ingredientFolds: floor.ingredientFolds,
    cookingValues: manifest.cookingSkills,
    ingredientValues: c02MainIngredientsValues(manifest),
    keywords: loadCoverageKeywords(opts?.keywordsPath),
  };
}

/** The two-field membership prediction the set-cover targets. */
export interface PredictedMembership {
  cooking: string[];
  ingredients: string[];
}

function foldField(tags: string[] | null | undefined, folds: Map<string, string>): string[] {
  if (!tags) return [];
  return tags.map((tag) => folds.get(matchKey(tag)) ?? tag);
}

/**
 * Apply the REAL deterministic C02 floor to a record's CURRENT tags to predict
 * its post-retag canonical membership (per field). REUSES the floor's folds +
 * the parent map (R9: a specific implies its parent group). Returns deduped,
 * order-preserving arrays. NOT a tagger — a sampling predictor only.
 *
 * `ctx` defaults to the real on-disk context (cached via loadC02Floor); pass an
 * explicit context to test with synthetic data.
 */
export function predictMembership(
  record: CorpusRecordForSampling,
  ctx: C02SamplerContext = buildC02SamplerContext()
): PredictedMembership {
  const cookingFolded = foldField(record.cooking_skills, ctx.cookingFolds);
  const ingredientFolded = foldField(record.main_ingredients, ctx.ingredientFolds);

  // R9 parent-reconcile: every emitted specific implies its parent group.
  const withParents = [...ingredientFolded];
  const present = new Set(ingredientFolded);
  for (const value of ingredientFolded) {
    const parent = ctx.parentMap[value];
    if (parent !== undefined && !present.has(parent)) {
      present.add(parent);
      withParents.push(parent);
    }
  }

  return {
    cooking: dedupe(cookingFolded),
    ingredients: dedupe(withParents),
  };
}

function dedupe(values: string[]): string[] {
  return values.filter((v, i) => values.indexOf(v) === i);
}

/** A (field, canonical-value) coverage slot. */
type Slot = `cooking:${string}` | `ingredients:${string}`;

/**
 * The set of canonical values a lesson is a CANDIDATE for, by field:
 * floor-over-current-tags ∪ body-keyword-scan. A value enters the cooking set
 * iff the floor predicts it OR its keyword pattern matches the body; likewise
 * ingredients. The keyword scan lets added/low-floor values find candidates the
 * floor alone misses.
 */
function candidateSlots(record: CorpusRecordForSampling, ctx: C02SamplerContext): Set<Slot> {
  const pred = predictMembership(record, ctx);
  const slots = new Set<Slot>();
  for (const v of pred.cooking) slots.add(`cooking:${v}`);
  for (const v of pred.ingredients) slots.add(`ingredients:${v}`);

  const body = record.content_text ?? '';
  for (const v of ctx.cookingValues) {
    const re = ctx.keywords.get(v);
    if (re && re.test(body)) slots.add(`cooking:${v}`);
  }
  for (const v of ctx.ingredientValues) {
    const re = ctx.keywords.get(v);
    if (re && re.test(body)) slots.add(`ingredients:${v}`);
  }
  return slots;
}

/** The hard-case signal classes (design §4 Q4). */
export type HardCaseClass = 'vague-cooking' | 'herbs-aromatics' | 'orphan-food';

/** The vague cooking tags the LLM must REPLACE (never folded — design §5). */
const VAGUE_COOKING_KEYS = new Set(['Basic Skills', 'Cooking Techniques'].map((s) => matchKey(s)));

/** The legacy ingredient catch-all that conflates Fresh herbs vs Alliums. */
const HERBS_AROMATICS_KEY = matchKey('Herbs & Aromatics');

/**
 * Classify a record's hard-case signal (first match wins, in a stable order),
 * or null if it is clean. (a) a vague cooking tag in current cooking_skills;
 * (b) the Herbs & Aromatics catch-all in current main_ingredients; (c) an
 * orphan/drop food — a current main_ingredients tag that is in the alias-map
 * drops list OR floors to nothing (non-canonical, not an alias key).
 */
export function classifyHardCase(
  record: CorpusRecordForSampling,
  ctx: C02SamplerContext
): HardCaseClass | null {
  const cooking = record.cooking_skills ?? [];
  if (cooking.some((t) => VAGUE_COOKING_KEYS.has(matchKey(t)))) return 'vague-cooking';

  const ingredients = record.main_ingredients ?? [];
  if (ingredients.some((t) => matchKey(t) === HERBS_AROMATICS_KEY)) return 'herbs-aromatics';

  for (const t of ingredients) {
    const key = matchKey(t);
    if (ctx.dropKeys.has(key)) return 'orphan-food';
    // floors to nothing = not in the ingredient folds (no alias, not a canonical)
    if (!ctx.ingredientFolds.has(key)) return 'orphan-food';
  }
  return null;
}

/** A selected lesson tagged with its layer + (for hard-case) its class. */
export interface C02SelectedLesson {
  id: string;
  title: string;
  layer: 'hard-case' | 'coverage' | 'clean-core';
  hardCaseClass: HardCaseClass | null;
}

export interface C02Coverage {
  cooking: Record<string, number>;
  ingredients: Record<string, number>;
}

export interface C02SampleResult {
  selected: C02SelectedLesson[];
  coverage: C02Coverage;
  warnings: string[];
  layerSizes: { hardCase: number; coverage: number; cleanCore: number };
  seed: number;
  size: number;
}

export interface BuildC02SampleOptions {
  seed: number;
  size?: number;
  hardCaseCap?: number;
  context?: C02SamplerContext;
}

/** Tally a selected record's candidate slots into the running coverage map. */
function tallyCoverage(
  record: CorpusRecordForSampling,
  ctx: C02SamplerContext,
  coverage: C02Coverage
): void {
  for (const slot of candidateSlots(record, ctx)) {
    const [field, value] = splitSlot(slot);
    if (field === 'cooking') coverage.cooking[value] = (coverage.cooking[value] ?? 0) + 1;
    else coverage.ingredients[value] = (coverage.ingredients[value] ?? 0) + 1;
  }
}

function splitSlot(slot: Slot): ['cooking' | 'ingredients', string] {
  const idx = slot.indexOf(':');
  return [slot.slice(0, idx) as 'cooking' | 'ingredients', slot.slice(idx + 1)];
}

/**
 * Build the C02 3-layer answer-key sample. Deterministic for a fixed seed.
 *
 * Layer order:
 *   1. hard-case — round-robin across the three signal classes (seeded shuffle
 *      within each class), capped at `hardCaseCap` (~20).
 *   2. coverage  — deterministic greedy set-cover over the NOT-yet-chosen
 *      lessons: repeatedly pick the lesson covering the most still-deficient
 *      (value, slot) pairs (a value is deficient until it reaches
 *      C02_COVERAGE_FLOOR across {hard-case ∪ coverage}); tie-break by a seeded
 *      shuffle then by id. Stop when every value is satisfied OR no remaining
 *      lesson can raise any deficient value. Unreachable values → WARN list.
 *   3. clean-core — fill to exactly `size` from the remaining NON-hard-case
 *      lessons via the existing activity_type × quartile proportional draw.
 *
 * If the corpus is smaller than `size`, takes all available lessons (mirrors the
 * existing small-pool behavior).
 */
export function buildC02Sample(
  corpus: CorpusRecordForSampling[],
  options: BuildC02SampleOptions
): C02SampleResult {
  const seed = options.seed;
  const size = options.size ?? C02_SAMPLE_SIZE;
  const hardCaseCap = options.hardCaseCap ?? C02_HARD_CASE_CAP;
  const ctx = options.context ?? buildC02SamplerContext();
  const rng = mulberry32(seed);

  const byId = new Map(corpus.map((r) => [r.id, r]));
  const chosenIds = new Set<string>();
  const selected: C02SelectedLesson[] = [];
  const coverage: C02Coverage = { cooking: {}, ingredients: {} };

  const select = (
    record: CorpusRecordForSampling,
    layer: C02SelectedLesson['layer'],
    hardCaseClass: HardCaseClass | null
  ): void => {
    chosenIds.add(record.id);
    selected.push({ id: record.id, title: record.title, layer, hardCaseClass });
    tallyCoverage(record, ctx, coverage);
  };

  // ----- Classify every lesson once (stable order preserved) -----
  const hardCaseOf = new Map<string, HardCaseClass>();
  for (const rec of corpus) {
    const cls = classifyHardCase(rec, ctx);
    if (cls) hardCaseOf.set(rec.id, cls);
  }

  // ===== Layer 1 — hard-case (round-robin by class, seeded shuffle within) =====
  const classOrder: HardCaseClass[] = ['vague-cooking', 'herbs-aromatics', 'orphan-food'];
  const buckets = new Map<HardCaseClass, CorpusRecordForSampling[]>();
  for (const cls of classOrder) buckets.set(cls, []);
  for (const rec of corpus) {
    const cls = hardCaseOf.get(rec.id);
    if (cls) buckets.get(cls)!.push(rec);
  }
  const shuffledBuckets = new Map<HardCaseClass, CorpusRecordForSampling[]>();
  for (const cls of classOrder) shuffledBuckets.set(cls, shuffle(buckets.get(cls)!, rng));

  const cursors = new Map<HardCaseClass, number>(classOrder.map((c) => [c, 0]));
  let hardRemaining = true;
  while (selected.length < hardCaseCap && hardRemaining && selected.length < size) {
    hardRemaining = false;
    for (const cls of classOrder) {
      if (selected.length >= hardCaseCap || selected.length >= size) break;
      const bucket = shuffledBuckets.get(cls)!;
      let cursor = cursors.get(cls)!;
      while (cursor < bucket.length && chosenIds.has(bucket[cursor].id)) cursor++;
      if (cursor < bucket.length) {
        select(bucket[cursor], 'hard-case', cls);
        cursors.set(cls, cursor + 1);
        hardRemaining = true;
      }
    }
  }

  // ===== Layer 2 — deterministic greedy set-cover =====
  const needed = (value: string, field: 'cooking' | 'ingredients'): number => {
    const have =
      field === 'cooking' ? (coverage.cooking[value] ?? 0) : (coverage.ingredients[value] ?? 0);
    return Math.max(0, C02_COVERAGE_FLOOR - have);
  };

  // Precompute each remaining lesson's candidate slot set once.
  const remaining = corpus.filter((r) => !chosenIds.has(r.id));
  const slotsOf = new Map<string, Set<Slot>>();
  for (const rec of remaining) slotsOf.set(rec.id, candidateSlots(rec, ctx));

  const allSlots: Slot[] = [
    ...ctx.cookingValues.map((v): Slot => `cooking:${v}`),
    ...ctx.ingredientValues.map((v): Slot => `ingredients:${v}`),
  ];

  const deficientSlots = (): Set<Slot> => {
    const out = new Set<Slot>();
    for (const slot of allSlots) {
      const [field, value] = splitSlot(slot);
      if (needed(value, field) > 0) out.add(slot);
    }
    return out;
  };

  // Greedy loop: pick the remaining lesson covering the most still-deficient
  // slots; tie-break by a seeded shuffle then by id (both deterministic).
  let pool = remaining.slice();
  // A stable, seed-derived priority order for tie-breaking.
  const tiePriority = new Map<string, number>();
  shuffle(remaining, rng).forEach((rec, i) => tiePriority.set(rec.id, i));

  for (;;) {
    if (selected.length >= size) break;
    const deficient = deficientSlots();
    if (deficient.size === 0) break;

    let best: CorpusRecordForSampling | null = null;
    let bestGain = 0;
    let bestKey = Number.POSITIVE_INFINITY;
    for (const rec of pool) {
      if (chosenIds.has(rec.id)) continue;
      let gain = 0;
      for (const slot of slotsOf.get(rec.id)!) if (deficient.has(slot)) gain++;
      if (gain === 0) continue;
      const key = tiePriority.get(rec.id)!;
      if (gain > bestGain || (gain === bestGain && key < bestKey)) {
        best = rec;
        bestGain = gain;
        bestKey = key;
      }
    }

    if (!best || bestGain === 0) break; // no candidate can raise any deficient value
    select(best, 'coverage', null);
    pool = pool.filter((r) => r.id !== best!.id);
  }

  // WARN for any value the pool could not raise to the floor.
  const warnings: string[] = [];
  for (const slot of allSlots) {
    const [field, value] = splitSlot(slot);
    const have =
      field === 'cooking' ? (coverage.cooking[value] ?? 0) : (coverage.ingredients[value] ?? 0);
    if (have < C02_COVERAGE_FLOOR) {
      warnings.push(
        `C02 set-cover: ${field}:${value} reached only ${have}/${C02_COVERAGE_FLOOR} (insufficient candidates)`
      );
    }
  }

  // ===== Layer 3 — clean-core fill to exactly `size` =====
  if (selected.length < size) {
    const cleanPool = corpus.filter((r) => !chosenIds.has(r.id) && !hardCaseOf.has(r.id));
    const want = size - selected.length;
    // Reuse the existing proportional stratified draw (deterministic, seeded).
    const drawn = stratifiedSample(cleanPool, want, seed, new Set());
    for (const rec of drawn) {
      if (selected.length >= size) break;
      if (chosenIds.has(rec.id)) continue;
      select(rec, 'clean-core', null);
    }
    // If clean-core is exhausted but we are still short (tiny corpus), top up
    // from any remaining lesson via a seeded shuffle so we honor `size` when the
    // population allows.
    if (selected.length < size) {
      const leftover = shuffle(
        corpus.filter((r) => !chosenIds.has(r.id)),
        rng
      );
      for (const rec of leftover) {
        if (selected.length >= size) break;
        select(rec, 'clean-core', null);
      }
    }
  }

  void byId;
  return {
    selected,
    coverage,
    warnings,
    layerSizes: {
      hardCase: selected.filter((s) => s.layer === 'hard-case').length,
      coverage: selected.filter((s) => s.layer === 'coverage').length,
      cleanCore: selected.filter((s) => s.layer === 'clean-core').length,
    },
    seed,
    size,
  };
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
 *
 * `excluded` (optional) is a set of lesson ids the user removed from the answer
 * key (incomplete / non-lesson docs). Excluded sections are skipped — they
 * never become records — so the caller can produce a key smaller than the
 * sampled worksheet.
 */
export function parseFilledWorksheet(markdown: string, excluded?: Set<string>): FinalLabelRecord[] {
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
      // An excluded lesson's section is parsed but never collected: set current
      // to null so its field rows are ignored and finalize() pushes nothing.
      current = excluded?.has(idMatch[1]) ? null : blank(idMatch[1]);
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
  /**
   * C02 mode: emit the 3-layer cooking_skills/main_ingredients pilot sample
   * (hard-case + set-cover + clean-core, design §4 Q4) instead of the
   * Protocol-A sample. Independent of the Protocol-A path.
   */
  c02: boolean;
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
  const a: Args = {
    seed: DEFAULT_SEED,
    randomTotal: DEFAULT_RANDOM_TOTAL,
    c02: false,
    help: false,
  };
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
      case '--c02':
        a.c02 = true;
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
  --c02               C02 mode: emit the 3-layer cooking_skills/main_ingredients
                      pilot sample (hard-case + ≥2× set-cover + clean-core,
                      size ${C02_SAMPLE_SIZE}) → ${C02_SAMPLE_FILENAME} + ${C02_MANIFEST_FILENAME}.
                      Requires a corpus carrying the two fields (P2.1 regen).
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

/**
 * Converter entry point: filled worksheet → answer-key.final.jsonl.
 *
 * `exclusionsPath` defaults to the checked-in PR-6b exclusions file. Lessons
 * listed there are sampled into the worksheet but removed from the answer key
 * (user verdicts: incomplete / non-lesson docs). Pass an explicit path (e.g. a
 * fixture) to override, or a path to an empty `excluded` list to keep all. The
 * ids that were actually skipped (present in both the worksheet and the
 * exclusions list) are returned as `skippedIds`.
 */
export function parseWorksheetToFinal(
  worksheetPath: string,
  outDir: string,
  exclusionsPath: string = DEFAULT_EXCLUSIONS_PATH
): {
  finalPath: string;
  recordCount: number;
  skippedIds: string[];
} {
  const markdown = readFileSync(worksheetPath, 'utf8');
  const excluded = loadExclusions(exclusionsPath);
  const allIds = new Set(parseFilledWorksheet(markdown).map((r) => r.id));
  const records = parseFilledWorksheet(markdown, excluded);
  // Only ids that are BOTH in the worksheet and the exclusions list count as
  // actually skipped (so a stale exclusions entry doesn't show as skipped).
  const skippedIds = [...excluded].filter((id) => allIds.has(id)).sort();
  mkdirSync(outDir, { recursive: true });
  const finalPath = path.join(outDir, FINAL_FILENAME);
  writeFileSync(finalPath, records.map((r) => JSON.stringify(r)).join('\n') + '\n');
  return { finalPath, recordCount: records.length, skippedIds };
}

interface C02RunResult {
  samplePath: string;
  manifestPath: string;
  selectedCount: number;
  layerSizes: { hardCase: number; coverage: number; cleanCore: number };
  warningCount: number;
  seed: number;
}

/**
 * C02 orchestration (P1.5): build the 3-layer sample and write a JSONL of the
 * selected lessons + a manifest (provenance + layer sizes + per-value coverage
 * + the WARN list). Reuses the same corpus loader + artifact-write pattern as
 * `run`; the corpus must carry cooking_skills/main_ingredients (P2.1 regen).
 */
export function runC02(opts: { seed: number; outDir: string; corpusPath?: string }): C02RunResult {
  const corpus = loadCorpus(opts.corpusPath ?? DEFAULT_CORPUS_PATH);
  const result = buildC02Sample(corpus, { seed: opts.seed });

  mkdirSync(opts.outDir, { recursive: true });
  const samplePath = path.join(opts.outDir, C02_SAMPLE_FILENAME);
  const manifestPath = path.join(opts.outDir, C02_MANIFEST_FILENAME);

  const sampleJsonl =
    result.selected.map((s) => JSON.stringify(s)).join('\n') + (result.selected.length ? '\n' : '');
  writeFileSync(samplePath, sampleJsonl);
  writeFileSync(
    manifestPath,
    JSON.stringify(
      {
        provenance: {
          task: 'C02 P1.5 — 3-layer answer-key sample (hard-case + set-cover + clean-core)',
          sampler_version: SAMPLER_VERSION,
          seed: result.seed,
          size: result.size,
          note:
            'Deterministic; reproduce with `npx tsx scripts/stage2-retag/sample-answer-key.ts --c02 --seed ' +
            `${result.seed}\``,
        },
        layerSizes: result.layerSizes,
        coverage: result.coverage,
        warnings: result.warnings,
        selected: result.selected,
      },
      null,
      2
    ) + '\n'
  );

  return {
    samplePath,
    manifestPath,
    selectedCount: result.selected.length,
    layerSizes: result.layerSizes,
    warningCount: result.warnings.length,
    seed: result.seed,
  };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(HELP);
    return;
  }
  if (args.c02) {
    const result = runC02({ seed: args.seed, outDir: args.outDir ?? DEFAULT_OUT_DIR });
    process.stdout.write(
      `c02 answer key: ${result.selectedCount} lessons ` +
        `(${result.layerSizes.hardCase} hard-case + ${result.layerSizes.coverage} coverage + ` +
        `${result.layerSizes.cleanCore} clean-core; seed ${result.seed})\n` +
        `  ${result.samplePath}\n  ${result.manifestPath}\n`
    );
    if (result.warningCount > 0) {
      process.stdout.write(
        `  ⚠️  ${result.warningCount} value(s) under the ≥2× floor — see the manifest's "warnings"\n`
      );
    }
    return;
  }
  if (args.parse) {
    const { finalPath, recordCount, skippedIds } = parseWorksheetToFinal(
      args.parse,
      args.outDir ?? DEFAULT_OUT_DIR
    );
    process.stdout.write(`parsed ${recordCount} labeled lessons → ${finalPath}\n`);
    if (skippedIds.length > 0) {
      process.stdout.write(
        `  skipped ${skippedIds.length} excluded lesson(s): ${skippedIds.join(', ')}\n`
      );
    }
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
