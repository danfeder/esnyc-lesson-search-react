/**
 * The C02 reconciler (design §3·PIVOT D-P6 / impl P2′.3).
 *
 * The pilot failed because the harness was a BLIND full-LLM re-read and the
 * apply stored the raw model output. The decisive forensics showed the additive
 * policy (floor ∪ LLM) scored WORSE than raw — so reconciliation must be
 * SUBTRACTIVE-capable, never append-only. This module merges:
 *   - the canonical floor-anchored core (the provenance-annotated `C02FlooredTags`
 *     the LLM was shown as the anchor), with
 *   - the LLM's KEEP / DROP / ADD decision (a validated `C02Decision`),
 * into the FINAL `finalC02` arrays the scorer + apply read.
 *
 * Contract (per field, enforced by REJECTING a malformed decision):
 *   1. KEEP ∪ DROP must EXACTLY partition the floored anchor — no value in both
 *      keep and drop (no overlap), no anchor value missing from keep∪drop (no
 *      omission), nothing in keep/drop outside the anchor. A non-partitioning
 *      decision is REJECTED (throws). The anchor IS the set of canonical values
 *      the model saw; KEEP/DROP is a verdict on each of them.
 *   2. ADD must be DISJOINT from the anchor — an anchor value is KEPT or DROPPED,
 *      never re-ADDed. An ADD that collides with the anchor is REJECTED.
 *   3. The base result is KEEP ∪ ADD (the kept anchor values + the additions);
 *      DROPPED anchor values are actually removed (subtractive proof).
 *   4. The specific→group invariant holds: every surviving specific implies its
 *      parent group is present (appended with provenance `parent-derived` when
 *      absent). This also RESOLVES the parent/child conflict — drop-parent +
 *      keep-child is contradictory, so the kept child forces its parent back in
 *      (the parent is RETAINED, not lost).
 *
 * Output is canonical (every value is a vocab value — the decision schema's
 * enums already guarantee this), unique, deterministically ordered (anchor-order
 * KEPT values first, then ADDed values in decision order, then parent-derived
 * groups), and stable across runs for identical inputs.
 */
import type { C02FloorInput, C02FlooredTags } from './c02-floor';
import type { C02Decision } from './schema';

/**
 * D-P1 keep-only lock (design §3·PIVOT). These universal catch-all cooking
 * skills are demonstrably over-ADDed by the LLM: pilot round 1 (P2′.6) scored
 * `Tasting` at 0.214 precision over 28 predictions — its KEEP decisions were
 * perfect (3/3) and ALL the damage came from ADDs (3 right / 22 wrong);
 * `Kitchen & food safety` 0.400 (KEEP 2/2, ADD 0/3). Tightening the prompt's
 * per-label ADD criteria + negative few-shots did NOT bring them under the
 * sentinel gate, so the lock makes them KEEP-only: a locked value the LLM ADDs
 * is suppressed from `finalC02`; a locked value already in the anchor may still
 * be KEPT or DROPPED (the lock blocks ADD only, never KEEP/DROP).
 */
export const C02_KEEP_ONLY_LOCK: ReadonlySet<string> = new Set([
  'Tasting',
  'Kitchen & food safety',
]);

/** Empty lock — no main_ingredients value is keep-only. */
const NO_LOCK: ReadonlySet<string> = new Set();

/** How a final reconciled value arrived in the output. */
export type C02ReconcileOrigin = 'kept' | 'added' | 'parent-derived';

/** One final reconciled value + how it got there. */
export interface C02ReconciledTag {
  value: string;
  /** Which field the value belongs to (so a single provenance list is unambiguous). */
  field: 'cooking_skills' | 'main_ingredients';
  origin: C02ReconcileOrigin;
}

export interface C02ReconcileInput {
  /** The lesson's RAW current tags (pre-floor) — carried for symmetry/forensics. */
  existing: { cooking_skills?: string[] | null; main_ingredients?: string[] | null };
  /** The provenance-annotated floor output the LLM was shown as the anchor. */
  floored: C02FlooredTags;
  /** The validated KEEP/DROP/ADD decision for both fields. */
  llmDecisions: C02Decision;
  /** Field-scoped canonical value sets + the specific→group parent map. */
  floor: C02FloorInput;
}

export interface C02ReconcileResult {
  finalCookingSkills: string[];
  finalMainIngredients: string[];
  /** Per-value origin for both fields, in output order. */
  provenance: C02ReconciledTag[];
}

/**
 * The persisted `finalC02` shape on a RunRecord (design §3·PIVOT D-P6): the
 * reconciled canonical arrays the scorer + diff + apply read, keyed by the same
 * field names the DB columns / metadata JSONB use. A thin tag-shaped projection
 * of a `C02ReconcileResult` (provenance lives separately on the record).
 */
export interface C02FinalTags {
  cooking_skills: string[];
  main_ingredients: string[];
}

/** Project a reconcile result to the persisted `finalC02` tag arrays. */
export function toFinalC02(result: C02ReconcileResult): C02FinalTags {
  return {
    cooking_skills: result.finalCookingSkills,
    main_ingredients: result.finalMainIngredients,
  };
}

/** A single field's KEEP/DROP/ADD decision after value-projection. */
interface FieldDecisionValues {
  keep: string[];
  drop: string[];
  add: string[];
}

/**
 * Reconcile ONE field against its floored anchor. Returns the ordered, unique
 * canonical values + each value's origin (`kept` | `added`). Parent-reconcile is
 * applied by the caller (ingredient-only). REJECTS a non-partitioning decision
 * or an ADD that collides with the anchor.
 */
function reconcileField(
  field: 'cooking_skills' | 'main_ingredients',
  anchorTags: readonly { value: string }[],
  decision: FieldDecisionValues,
  lockedAddValues: ReadonlySet<string>
): C02ReconciledTag[] {
  const anchor = new Set(anchorTags.map((t) => t.value));
  const keep = new Set(decision.keep);
  const drop = new Set(decision.drop);
  const add = decision.add; // order-preserving

  // (1a) overlap — a value in BOTH keep and drop.
  for (const v of keep) {
    if (drop.has(v)) {
      throw new Error(
        `C02 reconcile (${field}): "${v}" appears in BOTH keep and drop — ` +
          `KEEP ∪ DROP must partition the anchor (no overlap).`
      );
    }
  }
  // (1b) outside-the-anchor — a kept/dropped value not in the anchor.
  for (const v of [...keep, ...drop]) {
    if (!anchor.has(v)) {
      throw new Error(
        `C02 reconcile (${field}): "${v}" is in keep/drop but NOT in the anchor — ` +
          `KEEP/DROP decide only anchor values (a new value must be ADDed).`
      );
    }
  }
  // (1c) omission — an anchor value decided neither keep nor drop.
  for (const v of anchor) {
    if (!keep.has(v) && !drop.has(v)) {
      throw new Error(
        `C02 reconcile (${field}): anchor value "${v}" is in neither keep nor drop — ` +
          `KEEP ∪ DROP must EXACTLY partition the anchor (no omission).`
      );
    }
  }
  // (2) ADD must be disjoint from the anchor.
  for (const v of add) {
    if (anchor.has(v)) {
      throw new Error(
        `C02 reconcile (${field}): ADD "${v}" is already in the anchor — ` +
          `ADD must be DISJOINT from the anchor (an anchor value is KEPT, not ADDed).`
      );
    }
  }

  // D-P1 keep-only lock: a locked value may be KEPT (it is in the anchor) but
  // never ADDed. Filter locked values out of the add list for output ONLY —
  // the disjoint/partition checks above still ran over the full decision, so a
  // malformed decision is still rejected, not silently lock-masked.
  const addForOutput = add.filter((v) => !lockedAddValues.has(v));

  // (3) base result = KEPT anchor values (in anchor order) ∪ ADDed values
  // (in decision order). Subtractive: a DROPPED anchor value never appears.
  const out: C02ReconciledTag[] = [];
  const seen = new Set<string>();
  for (const t of anchorTags) {
    if (keep.has(t.value) && !seen.has(t.value)) {
      seen.add(t.value);
      out.push({ value: t.value, field, origin: 'kept' });
    }
  }
  for (const v of addForOutput) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push({ value: v, field, origin: 'added' });
    }
  }
  return out;
}

/**
 * Enforce the specific→group invariant on the reconciled ingredient list: for
 * every present specific, append its parent group (origin `parent-derived`) when
 * absent. Null-parent specifics + bare groups are no-ops. This is also what
 * RESOLVES the parent/child conflict — a kept child whose parent the LLM dropped
 * forces the parent back in. Appends in deterministic order (iterate the current
 * list, append missing parents at the end).
 */
function reconcileParents(
  ingredients: C02ReconciledTag[],
  parentMap: Record<string, string>
): C02ReconciledTag[] {
  const present = new Set(ingredients.map((t) => t.value));
  const out = [...ingredients];
  for (const tag of ingredients) {
    const parent = parentMap[tag.value];
    if (parent !== undefined && !present.has(parent)) {
      present.add(parent);
      out.push({ value: parent, field: 'main_ingredients', origin: 'parent-derived' });
    }
  }
  return out;
}

/**
 * Reconcile the floor-anchored core with the LLM's KEEP/DROP/ADD into the final
 * `finalC02` arrays (design §3·PIVOT D-P6). Throws on any non-partitioning
 * decision or anchor-colliding ADD (the caller treats a throw as a reconcile
 * failure for that lesson, like a Zod failure).
 */
export function reconcileC02Tags(input: C02ReconcileInput): C02ReconcileResult {
  const cooking = reconcileField(
    'cooking_skills',
    input.floored.cooking,
    {
      keep: input.llmDecisions.cooking_skills.keep,
      drop: input.llmDecisions.cooking_skills.drop.map((d) => d.value),
      add: input.llmDecisions.cooking_skills.add.map((a) => a.value),
    },
    C02_KEEP_ONLY_LOCK
  );

  const ingredientsBase = reconcileField(
    'main_ingredients',
    input.floored.ingredients,
    {
      keep: input.llmDecisions.main_ingredients.keep,
      drop: input.llmDecisions.main_ingredients.drop.map((d) => d.value),
      add: input.llmDecisions.main_ingredients.add.map((a) => a.value),
    },
    NO_LOCK
  );
  const ingredients = reconcileParents(ingredientsBase, input.floor.parentMap);

  return {
    finalCookingSkills: cooking.map((t) => t.value),
    finalMainIngredients: ingredients.map((t) => t.value),
    provenance: [...cooking, ...ingredients],
  };
}
