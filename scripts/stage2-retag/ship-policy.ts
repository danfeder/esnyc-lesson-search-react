/**
 * Per-field SHIP policy (design §3·PIVOT D-P11 / impl P2′.8).
 *
 * The full C02 run ships a DIFFERENT source per field — the LLM does NOT ship
 * for both. `materializeC02Ship` is the single function that materializes the
 * canonical APPLY input (what `generate-diff-report` / `prepare-apply` consume,
 * superseding the carry-forward "thread `finalC02` into the diff"):
 *
 *   - `main_ingredients` = deterministic floor ONLY (`floorTagValues` over the
 *     row's existing tags). The LLM ingredient decision is IGNORED entirely —
 *     coherent with the Session-13 accept-ceiling (floor 0.918 > LLM 0.831
 *     clean-core; the LLM leaks group-level FPs the per-value gate can't catch).
 *
 *   - `cooking_skills` = floor ∪ the LLM's cooking final ("option 3" /
 *     floor-RETENTION). The LLM may KEEP/ADD but can NEVER DROP a floored skill
 *     (a NEW reconcile/materialization policy, append-only for cooking only —
 *     re-opens D-P6 for cooking, sanctioned by user-verdict). Honest all-69
 *     re-score: floor-only F1 0.807 / LLM-as-is 0.836 / floor-retention 0.872
 *     (+0.065, P0.833/R0.915). It recovers ~50 real body-derived skills the
 *     floor structurally cannot add AND restores the ~28 high-confidence skills
 *     the LLM otherwise wrongly drops, with ZERO clean-core data loss.
 *
 * The cooking final is read from `record.finalC02.cooking_skills` WHEN PRESENT,
 * ELSE reconstructed as `keep ∪ valid-add` from the raw decision
 * (`record.rawInput.cooking_skills`). This finalC02-or-raw read is what makes
 * the ship layer inherently FIELD-ISOLATED: the 4 pilot records whose `finalC02`
 * was discarded by an off-vocab INGREDIENT (whole-record validation coupling)
 * still yield their valid cooking, because ingredients come from the floor and
 * cooking from the cooking decision — neither field can crash the other.
 *
 * Off-vocab cooking values (against the canonical cooking manifest) are dropped.
 */
import { applyC02Floor, floorTagValues, type C02FloorInput } from './c02-floor';
import { C02_KEEP_ONLY_LOCK } from './reconcile';

/**
 * The two-field SHIP output: the canonical APPLY arrays per field. Keyed by the
 * same field names the DB columns / metadata JSONB use (mirrors `C02FinalTags`).
 */
export interface C02ShipTags {
  cooking_skills: string[];
  main_ingredients: string[];
}

/**
 * The minimal run-record surface `materializeC02Ship` reads. A real RunRecord is
 * a superset of this; the loose `rawInput: unknown` mirrors the on-disk shape
 * (the raw KEEP/DROP/ADD decision OBJECT for a C02 record, NOT tag arrays).
 */
export interface C02ShipRecord {
  /** The reconciled canonical arrays (present on 65 of the 69 r4 records). */
  finalC02?: { cooking_skills: string[]; main_ingredients: string[] };
  /** The raw KEEP/DROP/ADD decision (the reconstruction source for the 4). */
  rawInput?: unknown;
}

/** A single ADD/DROP entry is either a bare string or a `{value, reason}` object. */
function decisionEntryValue(entry: unknown): string | undefined {
  if (typeof entry === 'string') return entry;
  if (entry && typeof entry === 'object' && 'value' in entry) {
    const value = (entry as { value: unknown }).value;
    if (typeof value === 'string') return value;
  }
  return undefined;
}

/**
 * Reconstruct the cooking final from a raw KEEP/DROP/ADD decision: `keep ∪ add`
 * (the LLM's intended final; DROPs are NOT applied here — floor-retention makes
 * the floor the only authority that can keep a skill, never the LLM's drop).
 * `keep` entries are bare strings; `add` entries are `{value, reason}` objects.
 *
 * The keep-only lock (`Tasting` / `Kitchen & food safety`) is filtered from the
 * reconstructed final — from BOTH `keep` and `add` — MIRRORING the reconcile
 * path, which demotes a non-anchor KEEP to ADD and then lock-filters the adds
 * (`reconcile.ts:175`/`:201`/`:204`). A locked catch-all may be KEPT from the
 * anchor but never reintroduced by the LLM. Without this a fallback record (no
 * `finalC02`) could ship a locked over-add that the reconciled records suppress
 * — either ADDed (r4 record `1YOJ…` adds `Tasting`) or mis-bucketed into KEEP
 * (the GATE-4 hole). An anchored locked value still ships via floor-retention's
 * floor union, so filtering it from the reconstructed final loses nothing real.
 *
 * Returns `[]` if the record carries no usable cooking decision.
 */
export function reconstructCookingFinal(rawInput: unknown): string[] {
  if (!rawInput || typeof rawInput !== 'object') return [];
  const decision = (rawInput as Record<string, unknown>).cooking_skills;
  if (!decision || typeof decision !== 'object') return [];
  const { keep, add } = decision as { keep?: unknown; add?: unknown };
  if (!Array.isArray(keep)) return [];
  const values: string[] = [];
  for (const entry of keep) {
    const v = decisionEntryValue(entry);
    if (v !== undefined) values.push(v);
  }
  if (Array.isArray(add)) {
    for (const entry of add) {
      const v = decisionEntryValue(entry);
      if (v !== undefined) values.push(v);
    }
  }
  // keep-only lock over the combined keep ∪ add (closes the mis-bucketed-KEEP
  // hole GATE 4 flagged); an anchored locked value returns via the floor.
  return values.filter((v) => !C02_KEEP_ONLY_LOCK.has(v));
}

/**
 * The LLM's cooking final for the ship layer: `finalC02.cooking_skills` when
 * present, ELSE `keep ∪ add` reconstructed from the raw decision, then filtered
 * to the canonical cooking manifest (off-vocab guard). This is the "LLM-as-is"
 * contestant in the re-score gate AND the floor-retention input — exported so
 * the gate measures the SAME value the ship layer unions with the floor.
 */
export function cookingFinalForShip(
  record: C02ShipRecord,
  cookingValues: ReadonlySet<string>
): string[] {
  const raw = record.finalC02
    ? record.finalC02.cooking_skills
    : reconstructCookingFinal(record.rawInput);
  return raw.filter((v) => cookingValues.has(v));
}

/** De-dupe preserving first-occurrence order. */
function uniqueOrdered(values: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (!seen.has(v)) {
      seen.add(v);
      out.push(v);
    }
  }
  return out;
}

/**
 * Materialize the per-field SHIP output for one lesson (D-P11).
 *
 * @param record       the run record (carries `finalC02` and/or `rawInput`).
 * @param existingTags the row's CURRENT (pre-retag) C02 tags — the floor input.
 * @param floorInput   the unified floor input (`loadC02FloorInput()`).
 * @param cookingValues the canonical cooking_skills value set (off-vocab guard).
 */
export function materializeC02Ship(
  record: C02ShipRecord,
  existingTags: { cooking_skills?: string[] | null; main_ingredients?: string[] | null },
  floorInput: C02FloorInput,
  cookingValues: ReadonlySet<string>
): C02ShipTags {
  const floored = applyC02Floor(existingTags, floorInput);
  const flooredCooking = floorTagValues(floored.cooking);

  // main_ingredients ship from the floor ONLY (LLM ingredient decision ignored).
  const main_ingredients = floorTagValues(floored.ingredients);

  // cooking_skills: the LLM's cooking final, from finalC02 when present else
  // reconstructed from the raw decision (field isolation for the 4 pilot rows),
  // off-vocab-filtered against the manifest.
  const cookingFinal = cookingFinalForShip(record, cookingValues);

  // floor-RETENTION: floor ∪ LLM final (the LLM never drops a floored skill).
  const cooking_skills = uniqueOrdered([...flooredCooking, ...cookingFinal]);

  return { cooking_skills, main_ingredients };
}
