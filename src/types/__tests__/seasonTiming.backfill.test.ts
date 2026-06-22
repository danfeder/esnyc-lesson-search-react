import { describe, it, expect } from 'vitest';
import { lessonMetadataSchema } from '@/types/lessonMetadata.zod';
import { reviewFormPayloadSchema } from '@/types/reviewFormPayload.zod';
import { reviewToLesson } from '@/utils/reviewToLessonMapper';

/**
 * C83 contract-lock (Wave 4): the review season value MUST be a `z.array(SeasonTimingEnum)`.
 *
 * The PR1 migration normalizes 17 string-typed `submission_reviews.tagged_metadata->'season'`
 * values into arrays — 14 backfilled from the published lesson's `seasonTiming` array, and 3
 * fallbacks set to `[]` (the resolved lesson's own empty array). This fixture pins the shape
 * those backfilled/empty values must satisfy, and pins that a bare *string* season (the bug
 * being fixed) is rejected. Design doc §4 Q4/Q5; impl plan Task 1.1.
 *
 * Isolation note: every field on `reviewFormPayloadSchema` / `lessonMetadataSchema` is
 * `.optional()`, so a bare `{ season: ... }` object varies ONLY the season-shape contract and
 * cannot fail for unrelated missing-key reasons. We additionally assert against
 * `reviewFormPayloadSchema.shape.season` directly to isolate the field sub-schema beyond doubt.
 */
describe('C83 season-normalization contract', () => {
  describe('reviewFormPayloadSchema.season (review-form key)', () => {
    it('accepts an empty array (the 3-fallback `[]` shape)', () => {
      expect(reviewFormPayloadSchema.safeParse({ season: [] }).success).toBe(true);
      // Field-isolated: prove it is the season sub-schema accepting [], not object completeness.
      expect(reviewFormPayloadSchema.shape.season.safeParse([]).success).toBe(true);
    });

    it('accepts a backfilled array of valid season values', () => {
      expect(reviewFormPayloadSchema.safeParse({ season: ['Winter', 'Spring'] }).success).toBe(
        true
      );
      expect(reviewFormPayloadSchema.shape.season.safeParse(['Winter', 'Spring']).success).toBe(
        true
      );
    });

    it('rejects a bare string season (the bug being fixed)', () => {
      expect(reviewFormPayloadSchema.safeParse({ season: 'year-round' }).success).toBe(false);
      // Field-isolated: prove the rejection comes from the season sub-schema, not the object.
      expect(reviewFormPayloadSchema.shape.season.safeParse('year-round').success).toBe(false);
    });
  });

  describe('lessonMetadataSchema.seasonTiming (canonical lesson key)', () => {
    it('accepts an empty array', () => {
      expect(lessonMetadataSchema.safeParse({ seasonTiming: [] }).success).toBe(true);
      expect(lessonMetadataSchema.shape.seasonTiming.safeParse([]).success).toBe(true);
    });

    it('rejects a bare string seasonTiming', () => {
      expect(lessonMetadataSchema.safeParse({ seasonTiming: 'year-round' }).success).toBe(false);
      expect(lessonMetadataSchema.shape.seasonTiming.safeParse('year-round').success).toBe(false);
    });
  });

  describe('reviewToLesson rename path (season → seasonTiming)', () => {
    it('renames a season array to seasonTiming, preserving the array', () => {
      expect(reviewToLesson({ season: ['Winter'] }).seasonTiming).toEqual(['Winter']);
    });
  });
});
