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
import { reconcileC02Tags, C02_KEEP_ONLY_LOCK, C02_INGREDIENT_KEEP_ONLY_LOCK } from './reconcile';

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

  // Lenient recovery (D-P6 amended, P2′.6 r3): the LLM cannot reliably emit a
  // perfect partition, and REJECTING cost ~12% of lessons their tags. Reconcile
  // now RECOVERS the model's intent into a clean partition instead of throwing.
  it('RECOVERS an omitted anchor value as an implicit KEEP (lenient)', () => {
    const result = reconcileC02Tags({
      existing: { cooking_skills: ['Boiling & simmering', 'Baking'], main_ingredients: [] },
      floored: floored(['Boiling & simmering', 'Baking'], []),
      // 'Baking' is in the anchor but appears in neither keep nor drop → kept.
      llmDecisions: decision({ keep: ['Boiling & simmering'] }, {}),
      floor: makeFloorInput(),
    });
    expect(result.finalCookingSkills).toEqual(['Boiling & simmering', 'Baking']);
  });

  it('RECOVERS a KEEP value outside the anchor as an ADD (lenient)', () => {
    const result = reconcileC02Tags({
      existing: { cooking_skills: ['Boiling & simmering'], main_ingredients: [] },
      floored: floored(['Boiling & simmering'], []),
      // 'Baking' is not in the anchor; a keep-mis-bucket → recovered as an add.
      llmDecisions: decision({ keep: ['Boiling & simmering', 'Baking'] }, {}),
      floor: makeFloorInput(),
    });
    expect(result.finalCookingSkills).toEqual(['Boiling & simmering', 'Baking']);
  });

  it('IGNORES a DROP value outside the anchor (cannot drop an absent value)', () => {
    const result = reconcileC02Tags({
      existing: { cooking_skills: ['Boiling & simmering'], main_ingredients: [] },
      floored: floored(['Boiling & simmering'], []),
      llmDecisions: decision({ keep: ['Boiling & simmering'], drop: ['Baking'] }, {}),
      floor: makeFloorInput(),
    });
    expect(result.finalCookingSkills).toEqual(['Boiling & simmering']);
  });

  it('RESOLVES an overlap (a value in both keep and drop) by DROP-wins (precision-favoring)', () => {
    const result = reconcileC02Tags({
      existing: { cooking_skills: ['Boiling & simmering'], main_ingredients: [] },
      floored: floored(['Boiling & simmering'], []),
      llmDecisions: decision({ keep: ['Boiling & simmering'], drop: ['Boiling & simmering'] }, {}),
      floor: makeFloorInput(),
    });
    expect(result.finalCookingSkills).toEqual([]);
  });
});

describe('reconcileC02Tags — ADD contract', () => {
  it('RECOVERS an ADD already in the anchor as a KEEP (lenient)', () => {
    const result = reconcileC02Tags({
      existing: { cooking_skills: ['Boiling & simmering'], main_ingredients: [] },
      floored: floored(['Boiling & simmering'], []),
      llmDecisions: decision({ add: ['Boiling & simmering'] }, {}),
      floor: makeFloorInput(),
    });
    expect(result.finalCookingSkills).toEqual(['Boiling & simmering']);
  });

  it('an LLM ADD survives into finalC02', () => {
    const result = reconcileC02Tags({
      existing: { cooking_skills: ['Boiling & simmering'], main_ingredients: [] },
      floored: floored(['Boiling & simmering'], []),
      // 'Baking' is a non-locked skill; a locked ADD is tested separately below.
      llmDecisions: decision({ keep: ['Boiling & simmering'], add: ['Baking'] }, {}),
      floor: makeFloorInput(),
    });
    expect(result.finalCookingSkills).toContain('Baking');
  });
});

describe('reconcileC02Tags — D-P1 keep-only lock (Tasting / Kitchen & food safety)', () => {
  it('the lock set is exactly the two universal catch-all cooking skills', () => {
    expect(C02_KEEP_ONLY_LOCK).toEqual(new Set(['Tasting', 'Kitchen & food safety']));
  });

  it('SUPPRESSES an LLM ADD of a locked cooking skill (never-add), even though it is a valid disjoint add', () => {
    const result = reconcileC02Tags({
      existing: { cooking_skills: [], main_ingredients: [] },
      floored: floored([], []),
      llmDecisions: decision({ add: ['Tasting'] }, {}),
      floor: makeFloorInput(),
    });
    expect(result.finalCookingSkills).toEqual([]);
    expect(result.finalCookingSkills).not.toContain('Tasting');
  });

  it('KEEPS a locked cooking skill when it is in the anchor (keep-only, not no-tag)', () => {
    const result = reconcileC02Tags({
      existing: { cooking_skills: ['Tasting'], main_ingredients: [] },
      floored: floored(['Tasting'], []),
      llmDecisions: decision({ keep: ['Tasting'] }, {}),
      floor: makeFloorInput(),
    });
    expect(result.finalCookingSkills).toContain('Tasting');
  });

  it('still DROPS a locked cooking skill the LLM drops (the lock blocks ADD only, not DROP)', () => {
    const result = reconcileC02Tags({
      existing: { cooking_skills: ['Tasting'], main_ingredients: [] },
      floored: floored(['Tasting'], []),
      llmDecisions: decision({ drop: ['Tasting'] }, {}),
      floor: makeFloorInput(),
    });
    expect(result.finalCookingSkills).not.toContain('Tasting');
  });

  it('the ingredient lock is exactly the over-applied pantry group Sweeteners', () => {
    expect(C02_INGREDIENT_KEEP_ONLY_LOCK).toEqual(new Set(['Sweeteners']));
  });

  it('SUPPRESSES an LLM ADD of the locked pantry group Sweeteners (main_ingredients)', () => {
    const result = reconcileC02Tags({
      existing: { cooking_skills: [], main_ingredients: [] },
      floored: floored([], []),
      llmDecisions: decision({}, { add: ['Sweeteners'] }),
      floor: makeFloorInput(),
    });
    expect(result.finalMainIngredients).not.toContain('Sweeteners');
  });

  it('KEEPS Sweeteners when it is in the anchor (keep-only, not no-tag)', () => {
    const result = reconcileC02Tags({
      existing: { cooking_skills: [], main_ingredients: ['Sweeteners'] },
      floored: floored([], ['Sweeteners']),
      llmDecisions: decision({}, { keep: ['Sweeteners'] }),
      floor: makeFloorInput(),
    });
    expect(result.finalMainIngredients).toContain('Sweeteners');
  });

  it('also suppresses a locked value the LLM mis-buckets into KEEP (recovered-add path is locked too)', () => {
    const result = reconcileC02Tags({
      existing: { cooking_skills: [], main_ingredients: [] },
      floored: floored([], []),
      // 'Sweeteners' is NOT in the anchor; a keep-mis-bucket recovers to ADD,
      // and the lock must still suppress it on that path.
      llmDecisions: decision({}, { keep: ['Sweeteners'] }),
      floor: makeFloorInput(),
    });
    expect(result.finalMainIngredients).not.toContain('Sweeteners');
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
        { keep: ['Boiling & simmering'], add: ['Baking'] }, // non-locked add
        { add: ['Tomatoes'] }
      ),
      floor: makeFloorInput(),
    });
    const provFor = (v: string) => result.provenance.find((p) => p.value === v)?.origin;
    expect(provFor('Boiling & simmering')).toBe('kept');
    expect(provFor('Baking')).toBe('added');
    expect(provFor('Tomatoes')).toBe('added');
    expect(provFor('Nightshades')).toBe('parent-derived');
  });
});
