/**
 * The C02 anchored verify-and-diff seam (design §3·PIVOT D-P4/D-P5/D-P9 / impl
 * P2′.2).
 *
 * The pilot failed as a BLIND full-LLM re-read: the model saw the lesson body
 * only, so it re-tagged from scratch and over-tagged (84% of false positives
 * were pure-LLM additions; 67% of misses were already in the existing tags).
 * The pivot shows the model the CURRENT tags — each annotated with the floor's
 * provenance — and asks it to KEEP/DROP/ADD against the body, not re-tag from
 * scratch.
 *
 * This module is the C02 analog of `doc-surfaces.ts`: a PURE render/append
 * helper that appends a clearly-delimited anchor block to the user turn, plus
 * the effective-input identity hash (D-P9). It is intentionally I/O-free and
 * unit-tested without the network.
 *
 *   - `renderC02AnchorBlock` / `appendC02Anchor` mirror `doc-surfaces`'s
 *     render/append pair. The anchor reads the PROVENANCE FIELD off
 *     `applyC02Floor`'s return (P2′.1) — it never re-derives provenance, and
 *     because drops/unmapped values never enter the floor output they never
 *     enter the anchor (D-P5).
 *   - `c02ManifestVersion` is a stable content hash of the canonical vocab (the
 *     "manifest version" the run-identity hash folds in — a vocab change
 *     invalidates a cached answer; a free-form provenance edit does not).
 *   - `computeEffectiveInputHash` hashes the FULL effective input the model is
 *     shown (D-P9): body + raw current tags + floored anchor + manifest version
 *     + reconciliation-policy identifier. Each dimension is framed so a value
 *     cannot silently migrate between fields and collide. Any change to ANY
 *     dimension changes the hash, so a stale cached answer from the failed
 *     pilot (body-only hash) is never resume/repair-reused.
 */
import { createHash } from 'node:crypto';

import type { C02FloorTag, C02FlooredTags } from './c02-floor';
import { c02MainIngredientsValues, type C02Manifest } from './vocab';

/**
 * Identifier for the reconciliation policy folded into the run-identity hash
 * (D-P9). The reconciler itself ships in P2′.3; this id is the stable name of
 * the floor-anchored verify-and-diff policy the anchored run operates under. A
 * change to the reconciliation contract bumps this id so cached answers from a
 * prior policy never resume-merge.
 */
export const C02_RECONCILE_POLICY_ID = 'c02-anchored-verify-and-diff-v1';

/**
 * One-sentence note framing the anchor as the lesson's CURRENT tags (so the
 * model treats the block as a starting set to verify, not as additional body
 * text to classify).
 */
export const C02_ANCHOR_NOTE =
  "The following are the lesson's CURRENT cooking_skills and main_ingredients " +
  'tags, each annotated with how it was derived. Treat them as a starting set: ' +
  'KEEP a tag the body still supports, DROP a tag the body does not support, and ' +
  'ADD a missing tag the body clearly supports. These are tags to verify against ' +
  'the body above — NOT additional lesson content to classify.';

/** Renders one provenance-annotated field section (the value list or "(none)"). */
function renderAnchorField(label: string, tags: readonly C02FloorTag[]): string {
  if (tags.length === 0) {
    return `${label}: (none)`;
  }
  const lines = tags.map((t) => `  - ${t.value}  [${t.provenance}]`);
  return [`${label}:`, ...lines].join('\n');
}

/**
 * Renders the delimited anchor block (pure, unit-tested). BOTH field sections
 * are always present — an empty section is rendered as "(none)" so the model
 * can distinguish "this field currently has no tags (ADD-only)" from "this
 * field is not under consideration". Each value carries its floor provenance
 * (exact-canonical / alias-fold / parent-derived) — a confidence signal the
 * prompt tells the model how to weight (D-P5).
 */
export function renderC02AnchorBlock(floored: C02FlooredTags): string {
  return [
    '--- Current tags to verify (cooking_skills + main_ingredients) ---',
    C02_ANCHOR_NOTE,
    '',
    renderAnchorField('cooking_skills', floored.cooking),
    renderAnchorField('main_ingredients', floored.ingredients),
  ].join('\n');
}

/**
 * Appends the anchor block to a lesson body. The anchor is ALWAYS appended
 * (unlike `appendDocSurfaces`, which no-ops on a missing sidecar) — every C02
 * lesson has a current-tags anchor, even if both fields are empty, because the
 * empty-anchor case ("nothing to keep, ADD if the body supports it") is itself
 * load-bearing signal for the verify-and-diff task.
 */
export function appendC02Anchor(body: string, floored: C02FlooredTags): string {
  return `${body}\n\n${renderC02AnchorBlock(floored)}`;
}

/**
 * A stable content version of the canonical C02 vocab — a sha256 over ONLY the
 * canonical value sets (cooking skills, ingredient groups, and the
 * specific→parent pairs), deliberately EXCLUDING the free-form `provenance`
 * block so a documentation/date edit does not invalidate cached answers while a
 * genuine vocab change does. Folded into the run-identity hash (D-P9).
 */
export function c02ManifestVersion(manifest: C02Manifest): string {
  const canonical = {
    cookingSkills: [...manifest.cookingSkills],
    mainIngredients: c02MainIngredientsValues(manifest),
    specifics: manifest.mainIngredientsSpecifics.map((s) => [s.value, s.parent] as const),
  };
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex');
}

/**
 * The full effective input the model is shown for one C02 lesson (D-P9). The
 * run-identity hash is taken over ALL of these dimensions, not body-only, so an
 * anchor change (new floor, new vocab, new policy) invalidates a stale cached
 * answer. `rawCookingSkills` / `rawMainIngredients` are the lesson's RAW current
 * tags (pre-floor) — included so a reviewer's edit to the current tags since
 * export invalidates the cached answer even when the floored anchor happens to
 * collapse to the same value set.
 */
export interface C02EffectiveInput {
  body: string;
  rawCookingSkills: string[];
  rawMainIngredients: string[];
  anchor: string;
  manifestVersion: string;
  reconcilePolicyId: string;
}

/**
 * sha256 over the full effective input, FIELD-FRAMED so a value cannot migrate
 * between dimensions and collide. Each dimension is length-prefixed implicitly
 * by JSON serialization (quoted strings + array structure), which keeps the
 * `body:'x' tags:['y']` vs `body:'xy' tags:[]` boundary distinct.
 */
export function computeEffectiveInputHash(input: C02EffectiveInput): string {
  const framed = {
    body: input.body,
    rawCookingSkills: input.rawCookingSkills,
    rawMainIngredients: input.rawMainIngredients,
    anchor: input.anchor,
    manifestVersion: input.manifestVersion,
    reconcilePolicyId: input.reconcilePolicyId,
  };
  return createHash('sha256').update(JSON.stringify(framed)).digest('hex');
}
