import { describe, it, expect } from 'vitest';
import {
  ACTIVITY_TYPE_VALUES as canonicalActivity,
  TAG_VALUES as canonicalTags,
  SEASON_TIMING_VALUES as canonicalSeason,
  CULTURAL_RESPONSIVENESS_FEATURE_VALUES as canonicalCRF,
  ACADEMIC_INTEGRATION_VALUES as canonicalAcademicIntegration,
  SOCIAL_EMOTIONAL_LEARNING_VALUES as canonicalSEL,
  CORE_COMPETENCIES_VALUES as canonicalCoreCompetencies,
  COOKING_METHODS_VALUES as canonicalCookingMethods,
  OBSERVANCES_HOLIDAYS_VALUES as canonicalObservances,
  GARDEN_SKILLS_VALUES as canonicalGardenSkills,
  lessonMetadataSchema as canonicalLessonSchema,
} from './lessonMetadata.zod';
import { reviewFormPayloadSchema as canonicalReviewSchema } from './reviewFormPayload.zod';

import {
  ACTIVITY_TYPE_VALUES as sharedActivity,
  TAG_VALUES as sharedTags,
  SEASON_TIMING_VALUES as sharedSeason,
  CULTURAL_RESPONSIVENESS_FEATURE_VALUES as sharedCRF,
  ACADEMIC_INTEGRATION_VALUES as sharedAcademicIntegration,
  SOCIAL_EMOTIONAL_LEARNING_VALUES as sharedSEL,
  CORE_COMPETENCIES_VALUES as sharedCoreCompetencies,
  COOKING_METHODS_VALUES as sharedCookingMethods,
  OBSERVANCES_HOLIDAYS_VALUES as sharedObservances,
  GARDEN_SKILLS_VALUES as sharedGardenSkills,
  lessonMetadataSchema as sharedLessonSchema,
  reviewFormPayloadSchema as sharedReviewSchema,
} from '../../supabase/functions/_shared/metadataSchemas';

/**
 * Asserts the deno-runtime mirror at supabase/functions/_shared/metadataSchemas.ts
 * stays in lock-step with the canonical Zod schemas at src/types/. Per the dual-
 * runtime strategy in the validator architecture doc: edge functions can't
 * reliably import from src/, so the mirror is hand-maintained and CI-tested.
 *
 * If this test fails, edit BOTH files together. The canonical schemas are the
 * source of truth; the mirror reflects them.
 */
describe('edge _shared/metadataSchemas mirrors canonical src/types schemas', () => {
  describe('closed-enum value lists', () => {
    it('activity_type values match', () => {
      expect([...sharedActivity]).toEqual([...canonicalActivity]);
    });
    it('tags values match', () => {
      expect([...sharedTags]).toEqual([...canonicalTags]);
    });
    it('season_timing values match', () => {
      expect([...sharedSeason]).toEqual([...canonicalSeason]);
    });
    it('cultural_responsiveness_features values match', () => {
      expect([...sharedCRF]).toEqual([...canonicalCRF]);
    });
    it('academic_integration values match', () => {
      expect([...sharedAcademicIntegration]).toEqual([...canonicalAcademicIntegration]);
    });
    it('social_emotional_learning values match', () => {
      expect([...sharedSEL]).toEqual([...canonicalSEL]);
    });
    it('core_competencies values match', () => {
      expect([...sharedCoreCompetencies]).toEqual([...canonicalCoreCompetencies]);
    });
    it('cooking_methods values match', () => {
      expect([...sharedCookingMethods]).toEqual([...canonicalCookingMethods]);
    });
    it('observances_holidays values match', () => {
      expect([...sharedObservances]).toEqual([...canonicalObservances]);
    });
    it('garden_skills values match', () => {
      expect([...sharedGardenSkills]).toEqual([...canonicalGardenSkills]);
    });
  });

  describe('lessonMetadataSchema parses identically across both modules', () => {
    const valid = [
      {},
      { activityType: ['cooking', 'craft'] },
      { tags: ['orientation'] },
      { tags: ['orientation', 'bilingual_handouts'] },
      { seasonTiming: ['Fall', 'Winter'] },
      { culturalResponsivenessFeatures: ['Reshapes curriculum', 'Communicates high expectations'] },
      { thematicCategories: ['Plants'], gradeLevels: ['3', '4'] },
      {
        academicConcepts: { Math: ['Fractions'], Science: ['Photosynthesis'] },
        academicIntegration: ['Math', 'Science'],
      },
      {
        academicIntegration: {
          concepts: { Math: ['Fractions'] },
          selected: ['Math'],
        },
      },
      // All-fields-populated fixture — drift protection. If a future edit drops
      // any key from the deno-runtime mirror, the c.data === s.data assertion
      // catches it because the missing key would be absent from s.data.
      {
        activityType: ['cooking'],
        tags: ['orientation'],
        seasonTiming: ['Fall'],
        culturalResponsivenessFeatures: ['Reshapes curriculum'],
        thematicCategories: ['Plants'],
        coreCompetencies: ['Kitchen Skills and Related Academic Content'],
        culturalHeritage: ['Mexican'],
        locationRequirements: ['Indoor'],
        mainIngredients: ['Tomatoes'],
        gradeLevels: ['3'],
        gardenSkills: ['Planting'],
        cookingSkills: ['Mixing'],
        cookingMethods: ['stovetop'],
        observancesHolidays: ['Lunar New Year'],
        socialEmotionalLearning: ['Self-management'],
        academicIntegration: ['Math'],
        academicConcepts: { Math: ['Fractions'] },
        duration: '30 min',
        groupSize: 'Small group',
        processingNotes: 'Note',
        summary: 'Summary',
        skills: ['Skill1'],
        equipment: ['Bowl'],
      },
    ];
    it.each(valid)('accepts %j', (fixture) => {
      const c = canonicalLessonSchema.safeParse(fixture);
      const s = sharedLessonSchema.safeParse(fixture);
      expect(c.success).toBe(true);
      expect(s.success).toBe(true);
      if (c.success && s.success) expect(c.data).toEqual(s.data);
    });

    const invalid = [
      { activityType: ['indoor'] },
      { activityType: ['unknown'] },
      { activityType: ['both'] }, // 'both' retired (D2.1)
      { tags: ['unknown_tag'] },
      { seasonTiming: ['fall'] },
      { culturalResponsivenessFeatures: ['Communication of high expectations'] },
      { activityType: 'cooking' }, // canonical wants array, not string
      // 6 small fields closed PR 6e — off-vocab values now rejected.
      { academicIntegration: ['math'] }, // legacy slug, canonical is Title 'Math'
      { socialEmotionalLearning: ['self-management'] }, // legacy slug, canonical 'Self-management'
      { coreCompetencies: ['Cooking'] }, // not a canonical core competency
      { cookingMethods: ['Stovetop'] }, // canonical is kebab 'stovetop'
      { observancesHolidays: ['Not A Holiday'] },
      { gardenSkills: ['planting'] }, // legacy slug, canonical Title 'Planting'
    ];
    it.each(invalid)('rejects %j', (fixture) => {
      const c = canonicalLessonSchema.safeParse(fixture);
      const s = sharedLessonSchema.safeParse(fixture);
      expect(c.success).toBe(false);
      expect(s.success).toBe(false);
    });
  });

  describe('reviewFormPayloadSchema parses identically across both modules', () => {
    const valid = [
      {},
      { activityType: ['cooking'] },
      { activityType: ['craft'], location: 'Indoor' },
      { activityType: ['cooking', 'garden'] },
      { season: ['Spring', 'Summer'] },
      { themes: ['Plants', 'Cycles'] },
      { culturalResponsivenessFeatures: ['Reshapes curriculum'] },
      {
        activityType: ['cooking', 'garden'],
        location: 'Both',
        season: ['Fall'],
        themes: ['Plants'],
        gradeLevels: ['3', '4', '5'],
        coreCompetencies: ['Cooking', 'Gardening'],
      },
      // All-fields-populated fixture — drift protection. See lessonMetadata
      // counterpart above for rationale.
      {
        activityType: ['cooking'],
        location: 'Indoor',
        season: ['Fall'],
        culturalResponsivenessFeatures: ['Reshapes curriculum'],
        themes: ['Plants'],
        gradeLevels: ['3'],
        coreCompetencies: ['Cooking'],
        socialEmotionalLearning: ['Self-management'],
        cookingMethods: ['Stovetop'],
        mainIngredients: ['Tomatoes'],
        gardenSkills: ['Planting'],
        cookingSkills: ['Mixing'],
        culturalHeritage: ['Mexican'],
        academicIntegration: ['Math'],
        observancesHolidays: ['Lunar New Year'],
        processingNotes: 'Note',
        summary: 'Summary',
      },
    ];
    it.each(valid)('accepts %j', (fixture) => {
      const c = canonicalReviewSchema.safeParse(fixture);
      const s = sharedReviewSchema.safeParse(fixture);
      expect(c.success).toBe(true);
      expect(s.success).toBe(true);
      if (c.success && s.success) expect(c.data).toEqual(s.data);
    });

    const invalid = [
      { activityType: 'cooking' }, // scalar string rejected (D2.1: review-form is array-shape)
      { activityType: ['unknown'] },
      { activityType: ['both'] }, // 'both' retired (D2.1)
      { season: 'Spring' }, // string instead of array
      { season: ['fall'] }, // wrong case
    ];
    it.each(invalid)('rejects %j', (fixture) => {
      const c = canonicalReviewSchema.safeParse(fixture);
      const s = sharedReviewSchema.safeParse(fixture);
      expect(c.success).toBe(false);
      expect(s.success).toBe(false);
    });
  });
});
