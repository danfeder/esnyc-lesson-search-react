import { describe, it, expect } from 'vitest';
import { lessonToReview } from './lessonToReviewMapper';

// `lessonToReview` is the LIVE read-path mapper (canonical lesson metadata →
// review-form keys), used at reviewMetadataInit.ts to seed the reviewer form
// from an AI draft / existing lesson. These cases were previously homed in
// reviewToLessonMapper.test.ts alongside the now-deleted forward mapper
// (FP4 Brief 4 item 2 — the write-path `reviewToLesson` had no production
// consumer; the real review→lesson translation lives in the SQL
// `complete_review_atomic` RPC). Relocated here so the live mapper keeps its
// coverage. Thematic-category normalization is additionally covered in
// thematicNormalize.test.ts.
describe('lessonToReview', () => {
  it('maps an empty canonical object to an empty review payload', () => {
    expect(lessonToReview({})).toEqual({});
  });

  it('passes activityType array through (single-element)', () => {
    expect(lessonToReview({ activityType: ['cooking'] })).toEqual({
      activityType: ['cooking'],
    });
  });

  it('passes activityType array through (multi-element)', () => {
    expect(lessonToReview({ activityType: ['cooking', 'garden'] })).toEqual({
      activityType: ['cooking', 'garden'],
    });
  });

  it('extracts first element of locationRequirements into location string', () => {
    expect(lessonToReview({ locationRequirements: ['Outdoor'] })).toEqual({
      location: 'Outdoor',
    });
  });

  it('renames thematicCategories to themes', () => {
    expect(lessonToReview({ thematicCategories: ['Plant Growth', 'Ecosystems'] })).toEqual({
      themes: ['Plant Growth', 'Ecosystems'],
    });
  });

  it('renames seasonTiming to season', () => {
    expect(lessonToReview({ seasonTiming: ['Spring'] })).toEqual({
      season: ['Spring'],
    });
  });

  it('extracts selected[] from academicIntegration object form', () => {
    expect(
      lessonToReview({
        academicIntegration: {
          concepts: { Science: ['plant parts', 'photosynthesis'] },
          selected: ['Science'],
        },
      })
    ).toEqual({ academicIntegration: ['Science'] });
  });

  it('passes academicIntegration array form through', () => {
    expect(lessonToReview({ academicIntegration: ['Math', 'Science'] })).toEqual({
      academicIntegration: ['Math', 'Science'],
    });
  });

  it('drops empty arrays and the academicIntegration object with no selected entries', () => {
    expect(
      lessonToReview({
        thematicCategories: [],
        seasonTiming: [],
        academicIntegration: { concepts: { Science: ['plant parts'] }, selected: [] },
      })
    ).toEqual({});
  });
});
