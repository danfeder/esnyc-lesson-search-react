/**
 * Unit tests for the C02 reconciler (design §3·PIVOT D-P6 / impl P2′.3).
 *
 * `reconcileC02Tags` merges the canonical floor-anchored tags with the LLM's
 * KEEP/DROP/ADD decision into the FINAL `finalC02` arrays. It is the heart of
 * the pivot: the additive policy scored WORSE than raw, so the reconciler is
 * subtractive-capable by design — an LLM DROP of a floored anchor tag actually
 * removes it. Every test here proves a contract from the P2′.3 test list.
 */
import { describe, expect, it } from 'vitest';

import type { C02FloorInput, C02FlooredTags } from './c02-floor';
import type { C02Decision } from './schema';
import { c02IngredientParentMap, c02MainIngredientsValues, type C02Manifest } from './vocab';
import { reconcileC02Tags } from './reconcile';

// A small synthetic manifest with a clear specific→group parent map.
const MANIFEST: C02Manifest = {
  provenance: { note: 'synthetic reconcile test manifest' },
  cookingSkills: ['Boiling & simmering', 'Baking', 'Tasting'],
  mainIngredientsGroups: ['Nightshades', 'Fruits', 'Alliums'],
  mainIngredientsSpecifics: [
    { value: 'Tomatoes', parent: 'Nightshades' },
    { value: 'Apples', parent: 'Fruits' },
    { value: 'Garlic', parent: 'Alliums' },
    { value: 'Celery', parent: null },
  ],
};

/** Build a C02FloorInput off the synthetic manifest (folds irrelevant here). */
function makeFloorInput(): C02FloorInput {
  return {
    cookingFolds: new Map(),
    ingredientFolds: new Map(),
    parentMap: c02IngredientParentMap(MANIFEST),
    cookingValues: new Set(MANIFEST.cookingSkills),
    ingredientValues: new Set(c02MainIngredientsValues(MANIFEST)),
    dropKeys: new Set(),
  };
}

/** A floored anchor from explicit value lists (provenance is not load-bearing here). */
function floored(cooking: string[], ingredients: string[]): C02FlooredTags {
  return {
    cooking: cooking.map((value) => ({ value, provenance: 'exact-canonical' as const })),
    ingredients: ingredients.map((value) => ({ value, provenance: 'exact-canonical' as const })),
  };
}

/** Build a decision object (the validated C02Decision shape). */
function decision(
  cooking: { keep?: string[]; drop?: string[]; add?: string[] },
  ingredients: { keep?: string[]; drop?: string[]; add?: string[] }
): C02Decision {
  const field = (d: { keep?: string[]; drop?: string[]; add?: string[] }) => ({
    keep: d.keep ?? [],
    drop: (d.drop ?? []).map((value) => ({ value, reason: 'body-does-not-support' as const })),
    add: (d.add ?? []).map((value) => ({ value, reason: 'body-clearly-supports' as const })),
  });
  return {
    cooking_skills: field(cooking),
    main_ingredients: field(ingredients),
  } as C02Decision;
}

describe('reconcileC02Tags — partition contract', () => {
  it('KEEP ∪ DROP must EXACTLY partition the anchor — a complete partition is accepted', () => {
    const result = reconcileC02Tags({
      existing: { cooking_skills: ['Boiling & simmering', 'Baking'], main_ingredients: [] },
      floored: floored(['Boiling & simmering', 'Baking'], []),
      llmDecisions: decision({ keep: ['Boiling & simmering'], drop: ['Baking'] }, {}),
      floor: makeFloorInput(),
    });
    expect(result.finalCookingSkills).toEqual(['Boiling & simmering']);
  });

  it('REJECTS a decision that omits an anchor value from KEEP ∪ DROP', () => {
    expect(() =>
      reconcileC02Tags({
        existing: { cooking_skills: ['Boiling & simmering', 'Baking'], main_ingredients: [] },
        floored: floored(['Boiling & simmering', 'Baking'], []),
        // 'Baking' is in the anchor but appears in neither keep nor drop.
        llmDecisions: decision({ keep: ['Boiling & simmering'] }, {}),
        floor: makeFloorInput(),
      })
    ).toThrow(/partition/i);
  });

  it('REJECTS a decision whose KEEP/DROP value is outside the anchor', () => {
    expect(() =>
      reconcileC02Tags({
        existing: { cooking_skills: ['Boiling & simmering'], main_ingredients: [] },
        floored: floored(['Boiling & simmering'], []),
        // 'Baking' is not in the anchor; it cannot be KEPT (only ADDed).
        llmDecisions: decision({ keep: ['Boiling & simmering', 'Baking'] }, {}),
        floor: makeFloorInput(),
      })
    ).toThrow(/partition|not in the anchor/i);
  });

  it('REJECTS a value that appears in BOTH keep and drop (overlap)', () => {
    expect(() =>
      reconcileC02Tags({
        existing: { cooking_skills: ['Boiling & simmering'], main_ingredients: [] },
        floored: floored(['Boiling & simmering'], []),
        llmDecisions: decision(
          { keep: ['Boiling & simmering'], drop: ['Boiling & simmering'] },
          {}
        ),
        floor: makeFloorInput(),
      })
    ).toThrow(/partition|both keep and drop|overlap/i);
  });
});

describe('reconcileC02Tags — ADD contract', () => {
  it('REJECTS an ADD that is already in the anchor (ADD must be disjoint)', () => {
    expect(() =>
      reconcileC02Tags({
        existing: { cooking_skills: ['Boiling & simmering'], main_ingredients: [] },
        floored: floored(['Boiling & simmering'], []),
        llmDecisions: decision({ keep: ['Boiling & simmering'], add: ['Boiling & simmering'] }, {}),
        floor: makeFloorInput(),
      })
    ).toThrow(/disjoint|already in the anchor|ADD/i);
  });

  it('an LLM ADD survives into finalC02', () => {
    const result = reconcileC02Tags({
      existing: { cooking_skills: ['Boiling & simmering'], main_ingredients: [] },
      floored: floored(['Boiling & simmering'], []),
      llmDecisions: decision({ keep: ['Boiling & simmering'], add: ['Tasting'] }, {}),
      floor: makeFloorInput(),
    });
    expect(result.finalCookingSkills).toContain('Tasting');
  });
});

describe('reconcileC02Tags — subtractive (never append-only)', () => {
  it('an LLM-dropped floor tag is actually REMOVED from finalC02', () => {
    const result = reconcileC02Tags({
      existing: { cooking_skills: ['Boiling & simmering', 'Baking'], main_ingredients: [] },
      floored: floored(['Boiling & simmering', 'Baking'], []),
      llmDecisions: decision({ keep: ['Boiling & simmering'], drop: ['Baking'] }, {}),
      floor: makeFloorInput(),
    });
    expect(result.finalCookingSkills).not.toContain('Baking');
    expect(result.finalCookingSkills).toEqual(['Boiling & simmering']);
  });
});

describe('reconcileC02Tags — specific→group invariant', () => {
  it('ADDing a specific implies its parent group is present in finalC02', () => {
    const result = reconcileC02Tags({
      existing: { cooking_skills: [], main_ingredients: [] },
      floored: floored([], []),
      llmDecisions: decision({}, { add: ['Tomatoes'] }),
      floor: makeFloorInput(),
    });
    expect(result.finalMainIngredients).toContain('Tomatoes');
    expect(result.finalMainIngredients).toContain('Nightshades');
  });

  it('a null-parent specific does NOT spawn a parent', () => {
    const result = reconcileC02Tags({
      existing: { cooking_skills: [], main_ingredients: [] },
      floored: floored([], []),
      llmDecisions: decision({}, { add: ['Celery'] }),
      floor: makeFloorInput(),
    });
    expect(result.finalMainIngredients).toEqual(['Celery']);
  });
});

describe('reconcileC02Tags — parent/child conflict resolution', () => {
  it('drop-parent + keep-child → the parent is RETAINED', () => {
    const result = reconcileC02Tags({
      existing: {
        cooking_skills: [],
        main_ingredients: ['Nightshades', 'Tomatoes'],
      },
      // The anchor holds both the parent group and its child specific.
      floored: floored([], ['Nightshades', 'Tomatoes']),
      // The LLM drops the parent but keeps the child — contradictory; keep parent.
      llmDecisions: decision({}, { keep: ['Tomatoes'], drop: ['Nightshades'] }),
      floor: makeFloorInput(),
    });
    expect(result.finalMainIngredients).toContain('Tomatoes');
    expect(result.finalMainIngredients).toContain('Nightshades');
  });
});

describe('reconcileC02Tags — canonical / deterministic output', () => {
  it('finalC02 is unique, canonically-ordered, and deterministic across runs', () => {
    const args = () => ({
      existing: { cooking_skills: [] as string[], main_ingredients: ['Tomatoes', 'Apples'] },
      floored: floored([], ['Tomatoes', 'Nightshades', 'Apples', 'Fruits']),
      llmDecisions: decision(
        {},
        { keep: ['Tomatoes', 'Nightshades', 'Apples', 'Fruits'], add: ['Garlic'] }
      ),
      floor: makeFloorInput(),
    });
    const a = reconcileC02Tags(args());
    const b = reconcileC02Tags(args());
    // Deterministic: identical inputs → identical output ordering.
    expect(a.finalMainIngredients).toEqual(b.finalMainIngredients);
    // Unique: no duplicate values.
    expect(new Set(a.finalMainIngredients).size).toBe(a.finalMainIngredients.length);
    // Canonical: every value is a canonical vocab value (Garlic pulls Alliums in).
    for (const v of a.finalMainIngredients) {
      expect(c02MainIngredientsValues(MANIFEST)).toContain(v);
    }
    expect(a.finalMainIngredients).toContain('Garlic');
    expect(a.finalMainIngredients).toContain('Alliums');
  });

  it('emits per-value provenance for every final value', () => {
    const result = reconcileC02Tags({
      existing: { cooking_skills: ['Boiling & simmering'], main_ingredients: [] },
      floored: floored(['Boiling & simmering'], []),
      llmDecisions: decision(
        { keep: ['Boiling & simmering'], add: ['Tasting'] },
        { add: ['Tomatoes'] }
      ),
      floor: makeFloorInput(),
    });
    const provFor = (v: string) => result.provenance.find((p) => p.value === v)?.origin;
    expect(provFor('Boiling & simmering')).toBe('kept');
    expect(provFor('Tasting')).toBe('added');
    expect(provFor('Tomatoes')).toBe('added');
    expect(provFor('Nightshades')).toBe('parent-derived');
  });
});
