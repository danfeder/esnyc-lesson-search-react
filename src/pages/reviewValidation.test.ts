import { describe, it, expect } from 'vitest';
import {
  showCookingFields,
  showGardenFields,
  validateRequiredFields,
  computeFieldProgress,
} from '@/pages/reviewValidation';
import type { ReviewMetadata } from '@/types';

// Unit tests for the ReviewDetail validation/progress logic extracted to
// `reviewValidation.ts` (Wave 5 PR-1a Task 1a.5). These PIN current behavior:
// which metadata fields are required (incl. the cooking/garden conditional
// branches) and the progress-bar counts. The cooking/garden derivations gate
// which conditional fields become required, so they live alongside validation.

// A fully-populated base (the 8 always-required fields incl. the editable
// Lesson title), no conditional activity type. Spread + override per case.
const completeBase: ReviewMetadata = {
  title: 'A Complete Lesson',
  activityType: ['academic'], // neither cooking nor garden → no conditional fields
  location: 'Indoor',
  gradeLevels: ['3'],
  themes: ['Garden Basics'],
  season: ['Fall'],
  coreCompetencies: ['Develops self-awareness'],
  socialEmotionalLearning: ['Self-management'],
};

describe('showCookingFields (gates the cooking conditional-required block)', () => {
  it('true when activityType includes "cooking"', () => {
    expect(showCookingFields({ activityType: ['cooking'] })).toBe(true);
  });

  it('true when activityType includes the "cooking-only" UI slug', () => {
    expect(showCookingFields({ activityType: ['cooking-only'] })).toBe(true);
  });

  it('true when cooking appears among other values', () => {
    expect(showCookingFields({ activityType: ['garden-only', 'cooking-only'] })).toBe(true);
  });

  it('false for a garden-only activity', () => {
    expect(showCookingFields({ activityType: ['garden-only'] })).toBe(false);
  });

  it('false when activityType is undefined or empty', () => {
    expect(showCookingFields({})).toBe(false);
    expect(showCookingFields({ activityType: [] })).toBe(false);
  });
});

describe('showGardenFields (gates the garden conditional-required block)', () => {
  it('true when activityType includes "garden"', () => {
    expect(showGardenFields({ activityType: ['garden'] })).toBe(true);
  });

  it('true when activityType includes the "garden-only" UI slug', () => {
    expect(showGardenFields({ activityType: ['garden-only'] })).toBe(true);
  });

  it('false for a cooking-only activity', () => {
    expect(showGardenFields({ activityType: ['cooking-only'] })).toBe(false);
  });

  it('false when activityType is undefined or empty', () => {
    expect(showGardenFields({})).toBe(false);
    expect(showGardenFields({ activityType: [] })).toBe(false);
  });
});

describe('validateRequiredFields (returns the list of MISSING field labels)', () => {
  it('empty metadata → all 8 always-required base labels (Lesson title first), in order', () => {
    expect(validateRequiredFields({})).toEqual([
      'Lesson title',
      'Activity Type',
      'Location',
      'Grade Levels',
      'Thematic Categories',
      'Season & Timing',
      'Core Competencies',
      'Social-Emotional Skills',
    ]);
  });

  it('neither cooking nor garden + complete base → no errors (no conditional fields required)', () => {
    expect(validateRequiredFields(completeBase)).toEqual([]);
  });

  it('empty/whitespace title on an otherwise-complete base → only Lesson title', () => {
    expect(validateRequiredFields({ ...completeBase, title: '' })).toEqual(['Lesson title']);
    expect(validateRequiredFields({ ...completeBase, title: '   ' })).toEqual(['Lesson title']);
    expect(validateRequiredFields({ ...completeBase, title: undefined })).toEqual(['Lesson title']);
  });

  it('COOKING branch: cooking shown + base complete + cooking fields empty → only the 3 cooking labels', () => {
    expect(validateRequiredFields({ ...completeBase, activityType: ['cooking-only'] })).toEqual([
      'Cooking Methods',
      'Main Ingredients',
      'Cooking Skills',
    ]);
  });

  it('COOKING branch: cooking fully satisfied → no errors', () => {
    expect(
      validateRequiredFields({
        ...completeBase,
        activityType: ['cooking-only'],
        cookingMethods: ['Boiling'],
        mainIngredients: ['Flour'],
        cookingSkills: ['Measuring'],
      })
    ).toEqual([]);
  });

  it('GARDEN branch: garden shown + base complete + garden fields empty → only Garden Skills', () => {
    expect(validateRequiredFields({ ...completeBase, activityType: ['garden-only'] })).toEqual([
      'Garden Skills',
    ]);
  });

  it('BOTH branch: cooking + garden shown + conditional fields empty → 3 cooking + 1 garden, in order', () => {
    expect(
      validateRequiredFields({ ...completeBase, activityType: ['cooking-only', 'garden-only'] })
    ).toEqual(['Cooking Methods', 'Main Ingredients', 'Cooking Skills', 'Garden Skills']);
  });

  // Partial-satisfaction guard: cooking fully filled but garden empty → only
  // Garden Skills. Catches a regression where the garden requirement is ever
  // accidentally nested inside the cooking block (it would wrongly return []).
  it('BOTH branch: cooking satisfied, garden empty → only Garden Skills', () => {
    expect(
      validateRequiredFields({
        ...completeBase,
        activityType: ['cooking-only', 'garden-only'],
        cookingMethods: ['Boiling'],
        mainIngredients: ['Flour'],
        cookingSkills: ['Measuring'],
      })
    ).toEqual(['Garden Skills']);
  });
});

describe('computeFieldProgress (progress-bar completed/total counts)', () => {
  // The base set is 8 (the editable Lesson title + 7 tag fields), kept in sync
  // with validateRequiredFields so the bar can't read "Complete" while an empty
  // title still blocks Publish.
  it('empty metadata → 0 of 8 (base only, nothing filled)', () => {
    expect(computeFieldProgress({})).toEqual({ completed: 0, total: 8 });
  });

  it('neither conditional, fully filled base (incl. title) → 8 of 8', () => {
    expect(computeFieldProgress(completeBase)).toEqual({ completed: 8, total: 8 });
  });

  it('partial base, no conditionals → counts only the filled base fields', () => {
    expect(
      computeFieldProgress({
        title: 'Has a title',
        activityType: ['academic'],
        location: 'Indoor',
        gradeLevels: ['3'],
      })
    ).toEqual({ completed: 4, total: 8 });
  });

  it('COOKING shown → total grows to 11; counts filled across base + cooking', () => {
    expect(
      computeFieldProgress({
        title: 'Has a title', // filled
        activityType: ['cooking-only'], // Activity Type filled
        location: 'Indoor', // filled
        gradeLevels: ['3'], // filled
        cookingMethods: ['Boiling'], // filled
        // themes/season/coreCompetencies/socialEmotionalLearning empty
        // mainIngredients/cookingSkills empty
      })
    ).toEqual({ completed: 5, total: 11 });
  });

  it('GARDEN shown → total grows to 9', () => {
    expect(computeFieldProgress({ ...completeBase, activityType: ['garden-only'] })).toEqual({
      completed: 8,
      total: 9,
    });
  });

  it('BOTH shown + everything filled → 12 of 12', () => {
    expect(
      computeFieldProgress({
        ...completeBase,
        activityType: ['cooking-only', 'garden-only'],
        cookingMethods: ['Boiling'],
        mainIngredients: ['Flour'],
        cookingSkills: ['Measuring'],
        gardenSkills: ['Weeding'],
      })
    ).toEqual({ completed: 12, total: 12 });
  });
});
