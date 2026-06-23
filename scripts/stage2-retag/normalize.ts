/**
 * Deterministic, code-enforced mechanical tagging rules for Stage 2 re-tag.
 *
 * Two dry-run rounds proved that both claude-opus-4-7 and claude-opus-4-8
 * ignore certain mechanical tagging rules no matter how the prompt states
 * them (the `academic` activity_type exclusivity rule failed 11/15, 10/15,
 * 9/15 across two prompt formulations and two models). Supervisor decision:
 * enforce these rules in CODE, deterministically, in the validation layer —
 * the design §6 principle "Zod + repair pass remains the backstop".
 *
 * Rules enforced here (dry-run policy-violation findings R1/R4/R5):
 *
 *   R1 — `academic` activity_type exclusivity. `academic` is the
 *        by-elimination fallback: if a real activity MODE (cooking / garden /
 *        craft) is present, `academic` is dropped. Activity mode wins.
 *   R4 — academic_concepts ⇄ academic_integration reconciliation. A subject
 *        carrying framework concepts is evidence of integration, so a subject
 *        with non-empty `framework` that is missing from `academic_integration`
 *        gets ADDED. A subject in `academic_integration` with NO concepts is
 *        left alone (it may be legitimate) — the validation summary flags it
 *        separately; this function never removes integration subjects.
 *   R5 — synonym-pair lint. A synonym pair whose `everyday` string is not
 *        verbatim-present in that subject's `everyday` array, OR whose
 *        `framework` string is not in that subject's `framework` array, is
 *        DROPPED. Garbage pairs are worse than fewer pairs (they feed the
 *        search_synonyms PR).
 *   R6 — garden_skills exclusivity. garden_skills only makes sense when the
 *        lesson is (partly) a garden activity. When the predicted
 *        `activity_type` does NOT include `garden`, `garden_skills` is cleared
 *        to an empty array. User ruling 2026-06-12 on B3 answer-key evidence:
 *        in all 14 cases where a model emitted garden_skills on a non-garden
 *        activity_type, the user-verified key had garden_skills EMPTY (zero
 *        harm cases). Mirrors R1 — activity mode governs the dependent field.
 *
 * C02 (P1.3) adds the deterministic alias-floor + parent-reconcile for the two
 * re-tagged free-form vocabularies (design §3, §4 Q3/Q7). The alias map is the
 * ~92-94% deterministic core; where it gives an unambiguous canonical it
 * OVERWRITES (floor-first). It loads from `data/c02-alias-map.json` once
 * (lazy memoized singleton — normalizeRecordInput runs per-record ~700×).
 *
 *   R7 — cooking_skills alias-floor. For the `cooking_skills` tag array,
 *        overwrite each tag that is an alias-map KEY with its canonical value.
 *        Field-scoped: only aliases whose canonical is a cooking_skills value
 *        are applied here, so an ingredient alias sitting in cooking_skills
 *        (wrong field) is never folded — no cross-domain contamination.
 *   R8 — main_ingredients alias-floor. Same, scoped to aliases whose canonical
 *        is a main_ingredients value (group ∪ specific).
 *   R9 — ingredient parent-reconcile. For every emitted SPECIFIC in
 *        `main_ingredients`, APPEND its parent group if absent (never drop,
 *        never reorder existing). No-op for the 4 group-less specifics; DOES
 *        append "Squash, cucumbers & melons" for Melons. Source of truth =
 *        c02IngredientParentMap (a manifest miss = "no parent required").
 *        R7/R8 MUST run before R9 so a folded specific gets its parent.
 *
 * The field-partition disjointness invariant (P1.1: no canonical value is an
 * alias KEY; no key folds to both a cooking and an ingredient canonical; group
 * names are never keys) makes the alias-floor a single-pass fixed point and the
 * floor∘reconcile composition idempotent.
 *
 * normalizeRecordInput does NOT mutate its argument, is IDEMPOTENT
 * (re-normalizing normalized output is a no-op), and is NEVER silent (every
 * applied rule is named in the returned `normalizations` list). It is not pure
 * in the strict sense: on first call it lazily loads + memoizes the C02
 * alias-floor data (`data/c02-alias-map.json`, `data/c02-vocab.json`) via
 * `loadC02Floor()` — a one-time synchronous file read that throws ENOENT if
 * those files are absent. run-retag, generate-diff-report, and validate-output
 * all route raw tool_use input through it so the persisted + diffed + applied
 * values are the normalized ones.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import {
  c02IngredientParentMap,
  c02MainIngredientsValues,
  loadC02Manifest,
  type C02Manifest,
} from './vocab';

/** Stable rule keys recorded in a record's `normalizations` provenance list
 *  and counted in the validation summary. Subject-scoped rules append
 *  `:<subject>` (one entry per affected subject). */
export const NORMALIZATION_RULES = {
  /** R1 — removed `academic` because a mode tag was also present. */
  academicExclusivityStrip: 'academic-exclusivity-strip',
  /** R4 — added a concept-bearing subject to academic_integration. */
  conceptsIntegrationAdd: 'concepts-integration-add',
  /** R5 — dropped one or more ungrounded synonym pairs for a subject. */
  synonymPairDrop: 'synonym-pair-drop',
  /** R6 — cleared garden_skills because activity_type lacks `garden`. */
  gardenSkillsNonGardenClear: 'garden-skills-nongarden-clear',
  /** R7 — folded one or more cooking_skills tags to their alias canonical. */
  cookingSkillsAliasFloor: 'cooking-skills-alias-floor',
  /** R8 — folded one or more main_ingredients tags to their alias canonical. */
  mainIngredientsAliasFloor: 'main-ingredients-alias-floor',
  /** R9 — appended one or more missing parent groups for emitted specifics. */
  ingredientParentReconcile: 'ingredient-parent-reconcile',
} as const;

export interface NormalizationResult {
  /** A normalized DEEP COPY of the input (or the input unchanged when it is
   *  not a plain object — nothing to normalize). */
  rawInput: unknown;
  /** Every rule applied, in rule order. Empty when nothing changed. */
  normalizations: string[];
}

const ACTIVITY_MODE_TAGS = ['cooking', 'garden', 'craft'] as const;
const ACADEMIC_TAG = 'academic';
const GARDEN_TAG = 'garden';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

// ---------------------------------------------------------------------------
// C02 alias-floor + parent-map loading (lazy memoized singletons)
//
// normalizeRecordInput runs PER-RECORD (~700×) so the file I/O + Zod parse must
// happen once, not per call. The data files are the same byte-source the vocab
// loader and DB CHECK use (P1.1).
// ---------------------------------------------------------------------------

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, '../..');
const C02_ALIAS_MAP_PATH = 'scripts/stage2-retag/data/c02-alias-map.json';

/**
 * The C02 alias-floor file (P1.1). `aliasMap` is a single combined object of
 * raw census source-value → canonical Title-Case value. `drops` is carried for
 * provenance + the future P1.6 rules-baseline contestant — it is NOT part of
 * R7/R8/R9 (drop-removal is LLM judgment per design §5, not the floor).
 */
const c02AliasMapSchema = z.object({
  provenance: z.record(z.unknown()),
  aliasMap: z.record(z.string()),
  drops: z.array(z.string()),
});

/**
 * The canonical MATCH key for an alias key or a tag: NFC-normalized, trimmed,
 * lowercased. This is the ONLY normalization the floor applies before lookup —
 * it deliberately does NOT strip diacritics, fold punctuation, or collapse
 * internal whitespace (out of scope; supervisor-verified the corpus needs only
 * case + surrounding-whitespace tolerance, and that wider folding is unsafe
 * here). So "Mixing", "MIXING", " mixing " all share the match key "mixing",
 * but "Sautéing" keeps its é and "Mixing & stirring" keeps its & and spaces.
 */
export function matchKey(s: string): string {
  return s.normalize('NFC').trim().toLowerCase();
}

/** Field-scoped alias folds: cooking-skills folds and ingredient folds, split
 *  by whether each alias's canonical is a cooking_skills or main_ingredients
 *  value. Splitting at load time makes R7/R8 genuinely field-scoped (their
 *  names) and structurally prevents cross-domain contamination. The lookups are
 *  keyed by matchKey (case-insensitive + trim) so a miscased tag folds; each
 *  also carries every canonical value at its own matchKey (the "canonical-case
 *  rule") so a correctly-spelled-but-miscased canonical normalizes to its
 *  canonical casing. */
export interface C02Floor {
  /** matchKey → cooking_skills canonical (folds whose canonical is a
   *  cooking_skills value, plus every cooking canonical at its own matchKey). */
  cookingFolds: Map<string, string>;
  /** matchKey → main_ingredients canonical (folds whose canonical is a
   *  main_ingredients group ∪ specific value, plus every ingredient canonical
   *  at its own matchKey). */
  ingredientFolds: Map<string, string>;
  /** specific → required parent group (group-less specifics absent = no
   *  parent required). */
  parentMap: Record<string, string>;
}

/**
 * Build the field-scoped, case-insensitive C02 floor from an alias map + the
 * canonical manifest. PURE + side-effect-free (the cache wrapper is separate)
 * so it can be unit-tested with a synthetic conflicting alias map.
 *
 * Each field lookup is populated from BOTH:
 *   (a) every alias entry whose canonical target belongs to that field — keyed
 *       by matchKey(aliasKey) → canonical target; and
 *   (b) every canonical value of that field — keyed by matchKey(canonical) →
 *       the canonical itself (the canonical-case rule).
 *
 * Insertion THROWS if a matchKey is already present mapping to a DIFFERENT
 * canonical (the case-collision guard — mirrors the orphan-canonical throw).
 * Identical-target re-inserts (e.g. an alias key whose lowercase equals its own
 * canonical target) are fine.
 */
export function buildC02Floor(aliasMap: Record<string, string>, manifest: C02Manifest): C02Floor {
  const cookingValues = new Set(manifest.cookingSkills);
  const ingredientValues = new Set(c02MainIngredientsValues(manifest));

  const cookingFolds = new Map<string, string>();
  const ingredientFolds = new Map<string, string>();

  const insert = (lookup: Map<string, string>, key: string, canonical: string): void => {
    const existing = lookup.get(key);
    if (existing !== undefined && existing !== canonical) {
      throw new Error(
        `c02 alias-floor match-key collision: "${key}" maps to both "${existing}" and ` +
          `"${canonical}" — a case-insensitive (matchKey) conflict onto different canonicals`
      );
    }
    lookup.set(key, canonical);
  };

  // (a) alias entries, partitioned by the field their canonical target belongs to.
  for (const [alias, canonical] of Object.entries(aliasMap)) {
    if (cookingValues.has(canonical)) {
      insert(cookingFolds, matchKey(alias), canonical);
    } else if (ingredientValues.has(canonical)) {
      insert(ingredientFolds, matchKey(alias), canonical);
    } else {
      // A fold whose canonical is in NEITHER field's value set is a data bug
      // (P1.1's "every alias VALUE is canonical" invariant) — fail loudly
      // rather than silently dropping the fold.
      throw new Error(
        `c02-alias-map.json: alias "${alias}" folds to "${canonical}" which is ` +
          `not a cooking_skills nor a main_ingredients canonical value`
      );
    }
  }

  // (b) canonical-case rule: every canonical value folds to itself at its matchKey.
  for (const canonical of cookingValues) insert(cookingFolds, matchKey(canonical), canonical);
  for (const canonical of ingredientValues) insert(ingredientFolds, matchKey(canonical), canonical);

  return {
    cookingFolds,
    ingredientFolds,
    parentMap: c02IngredientParentMap(manifest),
  };
}

let c02FloorCache: C02Floor | null = null;

/**
 * Load (and memoize) the real on-disk C02 floor — the same alias map + canonical
 * manifest the normalize R7/R8/R9 rules use. Exported so the answer-key sampler
 * (P1.5) can REUSE the deterministic floor for its membership predictor instead
 * of re-implementing the fold/parent logic (design §4 Q4).
 */
export function loadC02Floor(): C02Floor {
  if (c02FloorCache) return c02FloorCache;

  const aliasFile = c02AliasMapSchema.parse(
    JSON.parse(readFileSync(path.join(REPO_ROOT, C02_ALIAS_MAP_PATH), 'utf8'))
  );
  c02FloorCache = buildC02Floor(aliasFile.aliasMap, loadC02Manifest());
  return c02FloorCache;
}

/**
 * Fold each tag whose matchKey (case-insensitive + trim) is in the field's
 * match-lookup to its canonical value; tags with no match are kept verbatim.
 * The lookup carries both alias folds and the canonical-case rule, so a miscased
 * canonical normalizes to its canonical casing for free. Records the rule key
 * once when ANY tag changed (mirrors R6's guard).
 */
function applyAliasFloor(
  work: Record<string, unknown>,
  field: 'cooking_skills' | 'main_ingredients',
  folds: Map<string, string>,
  ruleKey: string,
  normalizations: string[]
): void {
  const tags = work[field];
  if (!isStringArray(tags)) return;
  const folded = tags.map((tag) => folds.get(matchKey(tag)) ?? tag);
  // Two distinct aliases can fold to the SAME canonical (e.g. `Chopping` and
  // `Dicing` → `Knife skills`). A positional overwrite would emit that canonical
  // twice, which the downstream `uniqueEnumArray` refinement REJECTS (kicking an
  // otherwise clean-core row into the LLM repair pass) — so de-dupe here,
  // preserving first-occurrence order. The floor's contract is clean, unique,
  // valid canonical output.
  const deduped = folded.filter((value, index) => folded.indexOf(value) === index);
  const changed =
    deduped.length !== tags.length || deduped.some((value, index) => value !== tags[index]);
  if (changed) {
    work[field] = deduped;
    normalizations.push(ruleKey);
  }
}

/**
 * R9 — for every emitted SPECIFIC in main_ingredients, APPEND its parent group
 * if absent. Append-only: never drops, never reorders existing tags. Group-less
 * specifics (parent-map miss) and bare groups are no-ops. Runs AFTER R8 so a
 * folded specific gets its parent appended in the same pass.
 */
function applyIngredientParentReconcile(
  work: Record<string, unknown>,
  parentMap: Record<string, string>,
  normalizations: string[]
): void {
  const tags = work.main_ingredients;
  if (!isStringArray(tags)) return;

  const present = new Set(tags);
  const additions: string[] = [];
  for (const tag of tags) {
    const parent = parentMap[tag];
    if (parent !== undefined && !present.has(parent)) {
      present.add(parent);
      additions.push(parent);
    }
  }
  if (additions.length > 0) {
    work.main_ingredients = [...tags, ...additions];
    normalizations.push(NORMALIZATION_RULES.ingredientParentReconcile);
  }
}

/**
 * R1 — strip `academic` from activity_type when any real activity mode tag is
 * also present. Mutates the working copy in place; pushes the rule name when
 * a strip happened.
 */
function applyAcademicExclusivity(work: Record<string, unknown>, normalizations: string[]): void {
  const activityType = work.activity_type;
  if (!isStringArray(activityType)) return;
  const hasMode = activityType.some((tag) =>
    (ACTIVITY_MODE_TAGS as readonly string[]).includes(tag)
  );
  if (hasMode && activityType.includes(ACADEMIC_TAG)) {
    work.activity_type = activityType.filter((tag) => tag !== ACADEMIC_TAG);
    normalizations.push(NORMALIZATION_RULES.academicExclusivityStrip);
  }
}

/**
 * R6 — clear garden_skills when the predicted activity_type does not include
 * `garden`. Only fires (and only records the rule) when garden_skills is
 * non-empty, so an already-empty field on a non-garden lesson is a no-op.
 */
function applyGardenSkillsNonGardenClear(
  work: Record<string, unknown>,
  normalizations: string[]
): void {
  const gardenSkills = work.garden_skills;
  if (!isStringArray(gardenSkills) || gardenSkills.length === 0) return;
  const activityType = work.activity_type;
  if (!isStringArray(activityType)) return;
  if (activityType.includes(GARDEN_TAG)) return;
  work.garden_skills = [];
  normalizations.push(NORMALIZATION_RULES.gardenSkillsNonGardenClear);
}

/**
 * R4 — add every concept-bearing subject (non-empty `framework`) that is
 * missing from academic_integration. Never removes; never reorders existing
 * entries (additions append in subject-key order).
 */
function applyConceptsIntegrationReconcile(
  work: Record<string, unknown>,
  normalizations: string[]
): void {
  const concepts = work.academic_concepts;
  if (!isPlainObject(concepts)) return;
  const integration = work.academic_integration;
  if (!isStringArray(integration)) return;

  const present = new Set(integration);
  const additions: string[] = [];
  for (const [subject, value] of Object.entries(concepts)) {
    if (!isPlainObject(value)) continue;
    const framework = value.framework;
    if (!isStringArray(framework) || framework.length === 0) continue;
    if (!present.has(subject)) {
      present.add(subject);
      additions.push(subject);
      normalizations.push(`${NORMALIZATION_RULES.conceptsIntegrationAdd}:${subject}`);
    }
  }
  if (additions.length > 0) {
    work.academic_integration = [...integration, ...additions];
  }
}

/**
 * R5 — drop synonym pairs whose `everyday` is not verbatim in the subject's
 * `everyday` array or whose `framework` is not in the subject's `framework`
 * array. One provenance entry per affected subject (regardless of how many
 * pairs that subject lost).
 */
function applySynonymPairLint(work: Record<string, unknown>, normalizations: string[]): void {
  const concepts = work.academic_concepts;
  if (!isPlainObject(concepts)) return;

  for (const [subject, value] of Object.entries(concepts)) {
    if (!isPlainObject(value)) continue;
    const pairs = value.synonym_pairs;
    if (!Array.isArray(pairs) || pairs.length === 0) continue;
    const everyday = isStringArray(value.everyday) ? new Set(value.everyday) : new Set<string>();
    const framework = isStringArray(value.framework) ? new Set(value.framework) : new Set<string>();

    const kept = pairs.filter((pair) => {
      if (!isPlainObject(pair)) return false;
      const pairEveryday = pair.everyday;
      const pairFramework = pair.framework;
      if (typeof pairEveryday !== 'string' || typeof pairFramework !== 'string') return false;
      return everyday.has(pairEveryday) && framework.has(pairFramework);
    });

    if (kept.length !== pairs.length) {
      value.synonym_pairs = kept;
      normalizations.push(`${NORMALIZATION_RULES.synonymPairDrop}:${subject}`);
    }
  }
}

/**
 * Apply every mechanical rule to a raw tool_use input object. Returns a deep
 * copy plus the provenance list. Non-object input is returned untouched (there
 * is nothing to normalize — e.g. an errored record's `null` rawInput).
 */
export function normalizeRecordInput(rawInput: unknown): NormalizationResult {
  if (!isPlainObject(rawInput)) {
    return { rawInput, normalizations: [] };
  }
  // Deep copy so the rules never mutate the caller's object. The tool output
  // is JSON (enum strings, arrays, plain objects), so a JSON round-trip is a
  // safe, dependency-free deep clone here.
  const work = JSON.parse(JSON.stringify(rawInput)) as Record<string, unknown>;
  const normalizations: string[] = [];

  applyAcademicExclusivity(work, normalizations);
  applyGardenSkillsNonGardenClear(work, normalizations);
  applyConceptsIntegrationReconcile(work, normalizations);
  applySynonymPairLint(work, normalizations);

  // C02 (P1.3) — alias-floor (R7/R8) MUST precede parent-reconcile (R9) so a
  // folded specific gets its parent appended in the same pass.
  const c02Floor = loadC02Floor();
  applyAliasFloor(
    work,
    'cooking_skills',
    c02Floor.cookingFolds,
    NORMALIZATION_RULES.cookingSkillsAliasFloor,
    normalizations
  );
  applyAliasFloor(
    work,
    'main_ingredients',
    c02Floor.ingredientFolds,
    NORMALIZATION_RULES.mainIngredientsAliasFloor,
    normalizations
  );
  applyIngredientParentReconcile(work, c02Floor.parentMap, normalizations);

  return { rawInput: work, normalizations };
}
