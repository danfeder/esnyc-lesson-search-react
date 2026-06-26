import { describe, it, expect } from 'vitest';
import {
  lessonMetadataSchema as srcLessonSchema,
  COOKING_SKILLS_VALUES,
  MAIN_INGREDIENTS_VALUES,
  INGREDIENT_PARENT_MAP,
} from './lessonMetadata.zod';
import { reviewFormPayloadSchema as srcReviewSchema } from './reviewFormPayload.zod';
import {
  lessonMetadataSchema as edgeLessonSchema,
  reviewFormPayloadSchema as edgeReviewSchema,
} from '../../supabase/functions/_shared/metadataSchemas';

/**
 * C02 enforcement (P4a.3): cooking_skills + main_ingredients close to the
 * frozen canonical vocab, and main_ingredients carries the specific→group
 * invariant (design §4 Q7 / §7). A specific ingredient with a NON-null parent
 * group requires that group to also be present (the harness auto-adds the
 * parent; the reviewer Zod path REJECTS an orphan on save). Groups and the four
 * null-parent specifics (Celery, Fennel, Seaweed (nori), Cocoa & chocolate)
 * never trigger the invariant. The same contract holds across all four schemas
 * (lesson + review, src + edge mirror).
 */

// All four schemas use identical key names for these two fields
// (mainIngredients / cookingSkills), so the same fixtures run through each.
const schemas = [
  ['src lessonMetadataSchema', srcLessonSchema],
  ['src reviewFormPayloadSchema', srcReviewSchema],
  ['edge lessonMetadataSchema', edgeLessonSchema],
  ['edge reviewFormPayloadSchema', edgeReviewSchema],
] as const;

describe('C02 cooking_skills closed enum (all four schemas)', () => {
  it.each(schemas)('%s ACCEPTS canonical cooking skill values', (_name, schema) => {
    const result = schema.safeParse({
      cookingSkills: ['Mixing & stirring', 'Sautéing & stir-frying', 'Knife skills'],
    });
    expect(result.success).toBe(true);
  });

  it.each(schemas)(
    '%s REJECTS an off-vocab old-kebab cooking skill ("chopping")',
    (_name, schema) => {
      const result = schema.safeParse({ cookingSkills: ['chopping'] });
      expect(result.success).toBe(false);
    }
  );

  it.each(schemas)(
    '%s REJECTS a near-miss cooking skill ("Mixing" not "Mixing & stirring")',
    (_name, schema) => {
      const result = schema.safeParse({ cookingSkills: ['Mixing'] });
      expect(result.success).toBe(false);
    }
  );
});

describe('C02 main_ingredients closed enum + specific→group invariant (all four schemas)', () => {
  it.each(schemas)('%s ACCEPTS a bare group', (_name, schema) => {
    const result = schema.safeParse({ mainIngredients: ['Nightshades'] });
    expect(result.success).toBe(true);
  });

  it.each(schemas)('%s ACCEPTS a group + its child specific', (_name, schema) => {
    const result = schema.safeParse({ mainIngredients: ['Nightshades', 'Tomatoes'] });
    expect(result.success).toBe(true);
  });

  it.each(schemas)('%s ACCEPTS a null-parent specific alone (Celery)', (_name, schema) => {
    const result = schema.safeParse({ mainIngredients: ['Celery'] });
    expect(result.success).toBe(true);
  });

  it.each(schemas)('%s ACCEPTS a null-parent specific alone (Seaweed (nori))', (_name, schema) => {
    const result = schema.safeParse({ mainIngredients: ['Seaweed (nori)'] });
    expect(result.success).toBe(true);
  });

  it.each(schemas)(
    '%s ACCEPTS a null-parent specific alone (Cocoa & chocolate)',
    (_name, schema) => {
      const result = schema.safeParse({ mainIngredients: ['Cocoa & chocolate'] });
      expect(result.success).toBe(true);
    }
  );

  it.each(schemas)('%s ACCEPTS an empty array', (_name, schema) => {
    const result = schema.safeParse({ mainIngredients: [] });
    expect(result.success).toBe(true);
  });

  it.each(schemas)('%s ACCEPTS multiple group+specific pairs', (_name, schema) => {
    const result = schema.safeParse({
      mainIngredients: ['Root vegetables', 'Carrots', 'Beets', 'Citrus fruits', 'Lemon'],
    });
    expect(result.success).toBe(true);
  });

  it.each(schemas)(
    '%s REJECTS an orphan specific (Tomatoes without Nightshades)',
    (_name, schema) => {
      const result = schema.safeParse({ mainIngredients: ['Tomatoes'] });
      expect(result.success).toBe(false);
    }
  );

  it.each(schemas)(
    '%s REJECTS an orphan specific even when an UNRELATED group is present',
    (_name, schema) => {
      const result = schema.safeParse({ mainIngredients: ['Alliums', 'Tomatoes'] });
      expect(result.success).toBe(false);
    }
  );

  it.each(schemas)(
    '%s REJECTS when only one of several specifics is orphaned (Lemon)',
    (_name, schema) => {
      // Carrots→Root vegetables present; Lemon→Citrus fruits missing.
      const result = schema.safeParse({ mainIngredients: ['Root vegetables', 'Carrots', 'Lemon'] });
      expect(result.success).toBe(false);
    }
  );

  it.each(schemas)('%s REJECTS an off-vocab ingredient ("Dragonfruit")', (_name, schema) => {
    const result = schema.safeParse({ mainIngredients: ['Dragonfruit'] });
    expect(result.success).toBe(false);
  });
});

describe('C02 vocab manifest integrity (src exports)', () => {
  it('COOKING_SKILLS_VALUES has 23 values', () => {
    expect(COOKING_SKILLS_VALUES).toHaveLength(23);
  });

  it('MAIN_INGREDIENTS_VALUES has 70 values (24 groups + 46 specifics)', () => {
    expect(MAIN_INGREDIENTS_VALUES).toHaveLength(70);
  });

  it('INGREDIENT_PARENT_MAP has exactly the 46 specifics as keys', () => {
    expect(Object.keys(INGREDIENT_PARENT_MAP)).toHaveLength(46);
  });

  it('INGREDIENT_PARENT_MAP has exactly four null-parent specifics', () => {
    const nullParents = Object.keys(INGREDIENT_PARENT_MAP)
      .filter((k) => INGREDIENT_PARENT_MAP[k] === null)
      .sort();
    expect(nullParents).toEqual(['Celery', 'Cocoa & chocolate', 'Fennel', 'Seaweed (nori)']);
  });

  it('every parent-map key is itself a valid MAIN_INGREDIENTS value', () => {
    for (const key of Object.keys(INGREDIENT_PARENT_MAP)) {
      expect(MAIN_INGREDIENTS_VALUES).toContain(key);
    }
  });

  it('every non-null parent is itself a valid MAIN_INGREDIENTS group value', () => {
    for (const parent of Object.values(INGREDIENT_PARENT_MAP)) {
      if (parent !== null) expect(MAIN_INGREDIENTS_VALUES).toContain(parent);
    }
  });
});
