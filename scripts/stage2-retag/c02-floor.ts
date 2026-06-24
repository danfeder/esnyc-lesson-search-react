/**
 * The ONE canonical C02 floor (design §3·PIVOT D-P3 / impl P2′.1).
 *
 * The "floor over existing tags" had THREE divergent implementations before this
 * module:
 *   - sample-answer-key.ts `predictMembership`/`foldField` (the runtime sampling
 *     + rules-baseline floor) — folded + parent-reconciled but KEPT unmapped junk
 *     (`folds.get(matchKey(tag)) ?? tag`) and never executed the `drops` list;
 *   - build-c02-answer-key.ts `floorAnchor` (the gold-key floor) — folded, KEPT
 *     ONLY canonical (so junk fell out as a side-effect), parent-reconciled, but
 *     also never executed the `drops` list explicitly;
 *   - c02-gates.ts `computeRulesBaseline` — inherited `predictMembership`, so it
 *     scored the LLM winner against a junk-KEEPING baseline (D-P7 wants the
 *     baseline recomputed against the CLEANED floor).
 *
 * Building the eval loop against the wrong floor invalidates it (Codex Q7 #1/#2).
 * D-P3 unifies all three into this single deterministic function. In order, the
 * floor:
 *   1. EXECUTES the `drops` list — a value whose matchKey is in `dropKeys` is
 *      removed. (Today the `drops` list is INERT — normalize.ts:134-139 ignores
 *      it. This makes it actually remove the value: Olive oil / Forming patties /
 *      Salt / Oil / Soy sauce / the cosmetic-craft-composite noise.)
 *   2. FOLDS aliases — a value whose matchKey is an alias-map key folds to its
 *      canonical (provenance `alias-fold`); a value already canonical (matched via
 *      the canonical-case rule) keeps its canonical casing (provenance
 *      `exact-canonical`).
 *   3. DROPS unmapped / non-canonical legacy junk — a value that is neither a
 *      canonical vocab value, nor an alias key, nor a drop is removed. This is how
 *      the `Herbs & Aromatics` literal leaves the floor: it is NOT folded (it is
 *      an LLM SPLIT candidate — Fresh herbs vs Alliums — not a deterministic
 *      fold), so it falls through as unmapped junk and is never emitted.
 *   4. ENFORCES the specific→group parent invariant — for every emitted specific,
 *      its parent group is appended if absent (provenance `parent-derived`),
 *      matching the gold-key builder's R9 behavior. Null-parent specifics
 *      (Celery / Fennel / Seaweed (nori) / Cocoa & chocolate) are no-ops.
 *
 * Every emitted value carries a provenance FIELD (`exact-canonical` /
 * `alias-fold` / `parent-derived`). D-P5 (P2′.2) reads this field to build the
 * confidence-typed anchor — it does NOT re-derive provenance. The `ambiguous`
 * class is reserved for the anchor stage (P2′.2); the deterministic floor never
 * emits it. Drops and unmapped values NEVER enter the floor output (and so never
 * the anchor).
 *
 * Output is canonical-only, de-duped (first-occurrence order), and an idempotent
 * fixed point — `floor(floor(x)) === floor(x)` on the value projection — because
 * canonical values fold to themselves (the canonical-case rule) and the
 * parent-reconcile never introduces a value the next pass would change.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

import { loadC02Floor, matchKey, type C02Floor } from './normalize';
import { c02MainIngredientsValues, loadC02Manifest, type C02Manifest } from './vocab';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, '../..');
const C02_ALIAS_MAP_PATH = 'scripts/stage2-retag/data/c02-alias-map.json';

/**
 * Per-tag provenance recorded on every floor-emitted value.
 *   - `exact-canonical`  the input value was already a canonical vocab value
 *                        (matched case-insensitively, recased to canonical).
 *   - `alias-fold`       the input value was an alias-map key folded to canonical.
 *   - `parent-derived`   a parent group appended by the specific→group invariant.
 *   - `ambiguous`        RESERVED for the D-P5 anchor stage (P2′.2); the
 *                        deterministic floor never emits this.
 */
export type C02FloorProvenance = 'exact-canonical' | 'alias-fold' | 'parent-derived' | 'ambiguous';

/** One floor-emitted canonical value + how it was derived. */
export interface C02FloorTag {
  value: string;
  provenance: C02FloorProvenance;
}

/** The two-field floor output, each a provenance-annotated canonical list. */
export interface C02FlooredTags {
  cooking: C02FloorTag[];
  ingredients: C02FloorTag[];
}

/**
 * Everything the floor needs: the field-scoped fold lookups + parent map (from
 * the existing `C02Floor`), the canonical value SETS (to decide "is this
 * canonical?" when assigning provenance), and the `dropKeys` matchKey set (to
 * EXECUTE the drops list). This is a superset of `C02Floor`, so the gold-key
 * builder / sampler can build it from a `C02Floor` they already hold.
 */
export interface C02FloorInput {
  cookingFolds: Map<string, string>;
  ingredientFolds: Map<string, string>;
  parentMap: Record<string, string>;
  cookingValues: ReadonlySet<string>;
  ingredientValues: ReadonlySet<string>;
  /** matchKey set of every drops-list literal — these are EXECUTED (removed). */
  dropKeys: ReadonlySet<string>;
}

/**
 * Build a `C02FloorInput` from a `C02Floor` (folds + parent map), the canonical
 * manifest (value sets), and the raw `drops` list (executed). PURE — no I/O.
 */
export function buildC02FloorInput(
  floor: C02Floor,
  manifest: C02Manifest,
  drops: readonly string[]
): C02FloorInput {
  return {
    cookingFolds: floor.cookingFolds,
    ingredientFolds: floor.ingredientFolds,
    parentMap: floor.parentMap,
    cookingValues: new Set(manifest.cookingSkills),
    ingredientValues: new Set(c02MainIngredientsValues(manifest)),
    dropKeys: new Set(drops.map((d) => matchKey(d))),
  };
}

const aliasMapFileSchema = z.object({
  provenance: z.record(z.unknown()),
  aliasMap: z.record(z.string()),
  drops: z.array(z.string()),
});

let inputCache: C02FloorInput | null = null;

/**
 * Load (and memoize) the real on-disk floor input — the SAME alias map + manifest
 * the normalize R7/R8 rules use, plus the executed drops list. Memoized because
 * the floor runs per-record (~700×).
 */
export function loadC02FloorInput(): C02FloorInput {
  if (inputCache) return inputCache;
  const aliasFile = aliasMapFileSchema.parse(
    JSON.parse(readFileSync(path.join(REPO_ROOT, C02_ALIAS_MAP_PATH), 'utf8'))
  );
  inputCache = buildC02FloorInput(loadC02Floor(), loadC02Manifest(), aliasFile.drops);
  return inputCache;
}

/** Project a floored-tag list to its plain canonical string values (order kept). */
export function floorTagValues(tags: readonly C02FloorTag[]): string[] {
  return tags.map((t) => t.value);
}

/**
 * Fold ONE field: execute drops, fold aliases, drop unmapped junk, assign
 * provenance (`alias-fold` vs `exact-canonical`), de-dupe (first occurrence).
 * Does NOT parent-reconcile — that is ingredient-only and runs after.
 */
function floorField(
  tags: readonly string[],
  folds: Map<string, string>,
  canonical: ReadonlySet<string>,
  dropKeys: ReadonlySet<string>
): C02FloorTag[] {
  const out: C02FloorTag[] = [];
  const seen = new Set<string>();
  for (const tag of tags) {
    const key = matchKey(tag);
    // (1) execute drops — a drops-listed value is removed.
    if (dropKeys.has(key)) continue;
    // (2) fold; (3) drop unmapped junk (no fold + not canonical).
    const folded = folds.get(key);
    if (folded === undefined || !canonical.has(folded)) continue;
    if (seen.has(folded)) continue;
    seen.add(folded);
    // alias-fold vs exact-canonical: the canonical-case rule loads every
    // canonical at its own matchKey, so the input was already canonical iff its
    // matchKey equals the folded canonical's matchKey.
    const provenance: C02FloorProvenance =
      key === matchKey(folded) ? 'exact-canonical' : 'alias-fold';
    out.push({ value: folded, provenance });
  }
  return out;
}

/**
 * Apply the ONE canonical floor to a record's CURRENT tags. Returns the two
 * provenance-annotated canonical lists (D-P3 / D-P5). Absent / null fields are
 * treated as empty.
 */
export function applyC02Floor(
  current: { cooking_skills?: string[] | null; main_ingredients?: string[] | null },
  input: C02FloorInput
): C02FlooredTags {
  const cooking = floorField(
    current.cooking_skills ?? [],
    input.cookingFolds,
    input.cookingValues,
    input.dropKeys
  );
  const ingredients = floorField(
    current.main_ingredients ?? [],
    input.ingredientFolds,
    input.ingredientValues,
    input.dropKeys
  );

  // (4) specific→group parent invariant: append each present specific's parent
  // group if absent (provenance `parent-derived`). Null-parent specifics + bare
  // groups are no-ops. Matches the gold-key builder's R9 behavior.
  const present = new Set(ingredients.map((t) => t.value));
  for (const tag of [...ingredients]) {
    const parent = input.parentMap[tag.value];
    if (parent !== undefined && !present.has(parent)) {
      present.add(parent);
      ingredients.push({ value: parent, provenance: 'parent-derived' });
    }
  }

  return { cooking, ingredients };
}
