import { describe, it, expect } from 'vitest';
import { reviewToLesson } from './reviewToLessonMapper';
import { lessonToReview } from './lessonToReviewMapper';
import type { ReviewFormPayloadValidated } from '@/types/reviewFormPayload.zod';
import type { LessonMetadataValidated } from '@/types/lessonMetadata.zod';

describe('reviewToLesson', () => {
  it('maps an empty payload to an empty canonical object', () => {
    expect(reviewToLesson({})).toEqual({});
  });

  // SQL-mirror cases — each translation rule from complete_review_atomic
  // (migration 20260428000003 lines 142-167) gets a focused test.

  it('wraps activityType single-select string into a single-element array', () => {
    expect(reviewToLesson({ activityType: 'cooking' })).toEqual({
      activityType: ['cooking'],
    });
  });

  it('wraps location single-select string into locationRequirements array', () => {
    expect(reviewToLesson({ location: 'Indoor' })).toEqual({
      locationRequirements: ['Indoor'],
    });
  });

  it('renames themes to thematicCategories (key rename only, array preserved)', () => {
    expect(reviewToLesson({ themes: ['Garden Basics', 'Plant Growth'] })).toEqual({
      thematicCategories: ['Garden Basics', 'Plant Growth'],
    });
  });

  it('renames season to seasonTiming (key rename only, array preserved)', () => {
    expect(reviewToLesson({ season: ['Fall', 'Winter'] })).toEqual({
      seasonTiming: ['Fall', 'Winter'],
    });
  });

  it('preserves same-key arrays', () => {
    expect(
      reviewToLesson({
        gradeLevels: ['K', '1', '2'],
        coreCompetencies: ['Garden Skills and Related Academic Content'],
        socialEmotionalLearning: ['Self-management'],
        cookingMethods: ['Stovetop'],
        mainIngredients: ['Tomatoes'],
        gardenSkills: ['Planting'],
        cookingSkills: ['Mixing/stirring'],
        culturalHeritage: ['Mexican'],
        academicIntegration: ['Science', 'Math'],
        observancesHolidays: ['Lunar New Year'],
        culturalResponsivenessFeatures: ['Reshapes curriculum'],
      })
    ).toEqual({
      gradeLevels: ['K', '1', '2'],
      coreCompetencies: ['Garden Skills and Related Academic Content'],
      socialEmotionalLearning: ['Self-management'],
      cookingMethods: ['Stovetop'],
      mainIngredients: ['Tomatoes'],
      gardenSkills: ['Planting'],
      cookingSkills: ['Mixing/stirring'],
      culturalHeritage: ['Mexican'],
      academicIntegration: ['Science', 'Math'],
      observancesHolidays: ['Lunar New Year'],
      culturalResponsivenessFeatures: ['Reshapes curriculum'],
    });
  });

  it('preserves same-key strings', () => {
    expect(
      reviewToLesson({
        lessonFormat: 'Standalone',
        processingNotes: 'Reviewed by admin',
        summary: 'A lesson about plants',
      })
    ).toEqual({
      lessonFormat: 'Standalone',
      processingNotes: 'Reviewed by admin',
      summary: 'A lesson about plants',
    });
  });

  it('drops empty arrays (matches SQL "" → [] collapse semantics)', () => {
    expect(
      reviewToLesson({
        themes: [],
        season: [],
        gradeLevels: [],
        coreCompetencies: [],
      })
    ).toEqual({});
  });

  it('handles a fully-populated review payload (acceptance fixture)', () => {
    const review: ReviewFormPayloadValidated = {
      activityType: 'cooking',
      location: 'Indoor',
      lessonFormat: 'Standalone',
      themes: ['Food Systems'],
      season: ['Fall'],
      gradeLevels: ['3', '4', '5'],
      coreCompetencies: ['Kitchen Skills and Related Academic Content'],
      socialEmotionalLearning: ['Relationship skills'],
      cookingMethods: ['No-cook'],
      mainIngredients: ['Apples'],
      gardenSkills: [],
      cookingSkills: ['Washing produce', 'Mixing/stirring'],
      culturalHeritage: ['Mexican'],
      academicIntegration: ['Science'],
      observancesHolidays: [],
      culturalResponsivenessFeatures: ['Encourages learning within the context of culture'],
      processingNotes: 'Approved as-is',
      summary: 'Apple salsa lesson',
    };

    expect(reviewToLesson(review)).toEqual({
      activityType: ['cooking'],
      locationRequirements: ['Indoor'],
      lessonFormat: 'Standalone',
      thematicCategories: ['Food Systems'],
      seasonTiming: ['Fall'],
      gradeLevels: ['3', '4', '5'],
      coreCompetencies: ['Kitchen Skills and Related Academic Content'],
      socialEmotionalLearning: ['Relationship skills'],
      cookingMethods: ['No-cook'],
      mainIngredients: ['Apples'],
      cookingSkills: ['Washing produce', 'Mixing/stirring'],
      culturalHeritage: ['Mexican'],
      academicIntegration: ['Science'],
      culturalResponsivenessFeatures: ['Encourages learning within the context of culture'],
      processingNotes: 'Approved as-is',
      summary: 'Apple salsa lesson',
    });
  });
});

describe('lessonToReview', () => {
  it('maps an empty canonical object to an empty review payload', () => {
    expect(lessonToReview({})).toEqual({});
  });

  it('extracts first element of activityType array into a single string', () => {
    expect(lessonToReview({ activityType: ['cooking'] })).toEqual({
      activityType: 'cooking',
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

describe('mapper round-trip property', () => {
  // Round-trip on the review-form side is lossless for every valid review
  // payload, because the canonical writer only ever produces single-element
  // activityType / locationRequirements arrays.

  const reviewFixtures: ReviewFormPayloadValidated[] = [
    {},
    { activityType: 'garden' },
    { location: 'Outdoor' },
    { themes: ['Garden Basics'], season: ['Summer'] },
    {
      activityType: 'both',
      location: 'Indoor',
      themes: ['Food Systems'],
      season: ['Fall', 'Winter'],
      gradeLevels: ['3', '4'],
      coreCompetencies: ['Culturally Responsive Education'],
      culturalResponsivenessFeatures: [
        'Communicates high expectations',
        'Promotes student-centered instruction',
      ],
      lessonFormat: 'Standalone',
      processingNotes: 'OK',
    },
  ];

  it.each(reviewFixtures)('lessonToReview(reviewToLesson(x)) === x for %j', (review) => {
    expect(lessonToReview(reviewToLesson(review))).toEqual(review);
  });

  // Canonical → review → canonical is lossless ONLY when activityType and
  // locationRequirements have ≤ 1 element (the SQL invariant). Any
  // multi-element array on either field would lose its tail in lessonToReview.

  const canonicalFixturesSafe: LessonMetadataValidated[] = [
    {},
    { activityType: ['academic'] },
    { locationRequirements: ['Both'] },
    { thematicCategories: ['Plant Growth'] },
    {
      activityType: ['craft'],
      locationRequirements: ['Indoor'],
      thematicCategories: ['Food Justice'],
      seasonTiming: ['Spring', 'Summer'],
      culturalResponsivenessFeatures: ['Reshapes curriculum'],
      lessonFormat: 'Single period',
    },
  ];

  it.each(canonicalFixturesSafe)(
    'reviewToLesson(lessonToReview(x)) === x for %j (single-element activityType / location)',
    (canonical) => {
      expect(reviewToLesson(lessonToReview(canonical))).toEqual(canonical);
    }
  );

  it('is intentionally lossy for canonical with multi-element activityType (documented asymmetry)', () => {
    const lossy: LessonMetadataValidated = { activityType: ['cooking', 'garden'] };
    // Lessons-to-review picks the first element; round-trip produces a
    // single-element canonical.
    expect(reviewToLesson(lessonToReview(lossy))).toEqual({
      activityType: ['cooking'],
    });
  });
});
