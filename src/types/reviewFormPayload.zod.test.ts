import { describe, it, expect } from 'vitest';
import { reviewFormPayloadSchema } from './reviewFormPayload.zod';

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
