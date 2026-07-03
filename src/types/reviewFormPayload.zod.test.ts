import { describe, it, expect } from 'vitest';
import { reviewFormPayloadSchema } from './reviewFormPayload.zod';
import { CULTURAL_HERITAGE_VALUES } from './lessonMetadata.zod';
import { culturalHeritageReviewOptions } from '@/utils/heritageHierarchy.generated';

/**
 * Reviewer-submission contract (PR 6e E2b). The review form's 6 small-field
 * vocabularies are closed to canonical enums, lock-step with the lesson side
 * (lessonMetadata.zod.ts) and the canonical DB CHECK arrays
 * (scripts/stage2-retag/data/smaller-fields.vocab.json). A reviewer save that
 * emits a canonical value must be accepted; an off-vocab value (legacy slug or
 * wrong case) must be rejected so it never reaches the DB CHECK.
 */
describe('reviewFormPayloadSchema — canonical small-field vocab (E2b)', () => {
  it('ACCEPTS a payload with canonical values for all 6 closed fields', () => {
    const payload = {
      academicIntegration: ['Math', 'Science', 'Literacy/ELA'],
      socialEmotionalLearning: ['Self-management', 'Relationship skills'],
      coreCompetencies: ['Garden Skills and Related Academic Content'],
      cookingMethods: ['basic-prep', 'stovetop', 'oven'],
      observancesHolidays: ['Lunar New Year', 'End of year celebrations'],
      gardenSkills: ['Planting', 'Stewardship tasks', 'Sensory exploration'],
    };
    const result = reviewFormPayloadSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('REJECTS Title-case cookingMethods (canonical is kebab)', () => {
    const result = reviewFormPayloadSchema.safeParse({ cookingMethods: ['Stovetop'] });
    expect(result.success).toBe(false);
  });

  it('REJECTS legacy-slug gardenSkills (canonical is Title-Case)', () => {
    const result = reviewFormPayloadSchema.safeParse({ gardenSkills: ['planting'] });
    expect(result.success).toBe(false);
  });

  it('REJECTS legacy-slug academicIntegration (canonical is Title-Case)', () => {
    const result = reviewFormPayloadSchema.safeParse({ academicIntegration: ['math'] });
    expect(result.success).toBe(false);
  });

  it('REJECTS legacy-slug socialEmotionalLearning', () => {
    const result = reviewFormPayloadSchema.safeParse({
      socialEmotionalLearning: ['self-management'],
    });
    expect(result.success).toBe(false);
  });

  it('REJECTS off-vocab coreCompetencies', () => {
    const result = reviewFormPayloadSchema.safeParse({ coreCompetencies: ['Cooking'] });
    expect(result.success).toBe(false);
  });

  it('REJECTS off-vocab observancesHolidays', () => {
    const result = reviewFormPayloadSchema.safeParse({ observancesHolidays: ['End of year'] });
    expect(result.success).toBe(false);
  });
});

/**
 * Cultural Heritage closed to a pick-list (Brief 4, 2026-07-03 — owner reversal
 * ahead of the heritage worksheet). The reviewer control offers EXACTLY the
 * generated full-tier list and rejects free text. The closed list is derived from
 * the CURRENT distinct stored values (Brief-4 PROD census), so every stored value —
 * including the 40 internal-tier ones the SEARCH filter hides (Soul Food, Egyptian,
 * Southern United States…) — still round-trips and nothing is invalidated.
 */
describe('reviewFormPayloadSchema — Cultural Heritage closed pick-list (Brief 4)', () => {
  it('offers EXACTLY the closed list: option values === the closed enum', () => {
    const optionValues = culturalHeritageReviewOptions.map((o) => o.value);
    expect([...optionValues].sort()).toEqual([...CULTURAL_HERITAGE_VALUES].sort());
    // Option values are unique (react-select needs unique values; enum needs no dups).
    expect(new Set(optionValues).size).toBe(optionValues.length);
  });

  it('ACCEPTS canonical values, including internal-tier ones stored on PROD', () => {
    const result = reviewFormPayloadSchema.safeParse({
      culturalHeritage: [
        'Mexican',
        'East Asian',
        'Soul Food',
        'Egyptian',
        'Southern United States',
      ],
    });
    expect(result.success).toBe(true);
  });

  it('REJECTS reviewer free text (the field is no longer creatable)', () => {
    const result = reviewFormPayloadSchema.safeParse({ culturalHeritage: ['Martian cuisine'] });
    expect(result.success).toBe(false);
  });

  it('REJECTS a kebab slug (the stored corpus + closed list are Title-Case labels)', () => {
    const result = reviewFormPayloadSchema.safeParse({ culturalHeritage: ['east-asian'] });
    expect(result.success).toBe(false);
  });

  it('ACCEPTS an empty heritage array', () => {
    expect(reviewFormPayloadSchema.safeParse({ culturalHeritage: [] }).success).toBe(true);
  });
});
