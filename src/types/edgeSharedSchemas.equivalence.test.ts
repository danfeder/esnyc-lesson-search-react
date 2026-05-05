import { describe, it, expect } from 'vitest';
import {
  ACTIVITY_TYPE_VALUES as canonicalActivity,
  TAG_VALUES as canonicalTags,
  SEASON_TIMING_VALUES as canonicalSeason,
  CULTURAL_RESPONSIVENESS_FEATURE_VALUES as canonicalCRF,
  lessonMetadataSchema as canonicalLessonSchema,
} from './lessonMetadata.zod';
import { reviewFormPayloadSchema as canonicalReviewSchema } from './reviewFormPayload.zod';

import {
  ACTIVITY_TYPE_VALUES as sharedActivity,
  TAG_VALUES as sharedTags,
  SEASON_TIMING_VALUES as sharedSeason,
  CULTURAL_RESPONSIVENESS_FEATURE_VALUES as sharedCRF,
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
      { tags: ['unknown_tag'] },
      { seasonTiming: ['fall'] },
      { culturalResponsivenessFeatures: ['Communication of high expectations'] },
      { activityType: 'cooking' }, // canonical wants array, not string
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
      { activityType: 'cooking' },
      { activityType: 'craft', location: 'Indoor' },
      { season: ['Spring', 'Summer'] },
      { themes: ['Plants', 'Cycles'] },
      { culturalResponsivenessFeatures: ['Reshapes curriculum'] },
      {
        activityType: 'both',
        location: 'Both',
        season: ['Fall'],
        themes: ['Plants'],
        gradeLevels: ['3', '4', '5'],
        coreCompetencies: ['Cooking', 'Gardening'],
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
      { activityType: ['cooking'] }, // canonical-keys array; review-form expects single
      { activityType: 'unknown' },
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
