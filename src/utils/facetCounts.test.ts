import { describe, it, expect } from 'vitest';
import type { Lesson } from '@/types';
import { computeFacetCounts } from './facetCounts';

function makeLesson(overrides: Partial<Lesson> & { id: string }): Lesson {
  return {
    lessonId: overrides.id,
    title: 'Lesson ' + overrides.id,
    summary: 'Summary',
    fileLink: 'https://example.com/' + overrides.id,
    gradeLevels: overrides.gradeLevels ?? [],
    metadata: {
      coreCompetencies: [],
      culturalHeritage: [],
      activityType: [],
      ...(overrides.metadata ?? {}),
    },
    confidence: { overall: 1, title: 1, summary: 1, gradeLevels: 1 },
  };
}

describe('computeFacetCounts', () => {
  it('returns empty bucket for every filter key when no lessons', () => {
    const counts = computeFacetCounts([]);
    expect(counts.gradeLevels).toEqual({});
    expect(counts.activityType).toEqual({});
    expect(counts.culturalHeritage).toEqual({});
  });

  it('counts top-level gradeLevels', () => {
    const lessons = [
      makeLesson({ id: 'a', gradeLevels: ['K', '1'] }),
      makeLesson({ id: 'b', gradeLevels: ['1', '2'] }),
    ];
    const counts = computeFacetCounts(lessons);
    expect(counts.gradeLevels).toEqual({ K: 1, '1': 2, '2': 1 });
  });

  it('counts metadata array facets and reads locationRequirements for `location`', () => {
    const lessons = [
      makeLesson({
        id: 'a',
        metadata: {
          coreCompetencies: ['garden'],
          culturalHeritage: ['east-asian'],
          activityType: ['cooking-only'],
          locationRequirements: ['Indoor'],
          thematicCategories: ['Garden Basics'],
          seasonTiming: ['Fall'],
          cookingMethods: ['Stovetop'],
          socialEmotionalLearning: ['Self-awareness'],
        },
      }),
      makeLesson({
        id: 'b',
        metadata: {
          coreCompetencies: ['garden', 'kitchen'],
          culturalHeritage: [],
          activityType: ['both'],
          locationRequirements: ['Indoor', 'Outdoor'],
        },
      }),
    ];
    const counts = computeFacetCounts(lessons);
    expect(counts.coreCompetencies).toEqual({ garden: 2, kitchen: 1 });
    expect(counts.activityType).toEqual({ 'cooking-only': 1, both: 1 });
    expect(counts.location).toEqual({ Indoor: 2, Outdoor: 1 });
    expect(counts.thematicCategories).toEqual({ 'Garden Basics': 1 });
    expect(counts.culturalHeritage).toEqual({ 'east-asian': 1 });
    expect(counts.seasonTiming).toEqual({ Fall: 1 });
    expect(counts.cookingMethods).toEqual({ Stovetop: 1 });
    expect(counts.socialEmotionalLearning).toEqual({ 'Self-awareness': 1 });
  });

  it('treats academicIntegration as string[] or normalizes object form to `selected`', () => {
    const lessons = [
      makeLesson({
        id: 'a',
        metadata: {
          coreCompetencies: [],
          culturalHeritage: [],
          activityType: [],
          academicIntegration: ['Math', 'Science'],
        },
      }),
      makeLesson({
        id: 'b',
        metadata: {
          coreCompetencies: [],
          culturalHeritage: [],
          activityType: [],
          academicIntegration: { concepts: {}, selected: ['Science', 'Health'] },
        },
      }),
    ];
    const counts = computeFacetCounts(lessons);
    expect(counts.academicIntegration).toEqual({ Math: 1, Science: 2, Health: 1 });
  });

  it('skips missing optional fields without throwing', () => {
    const lessons = [makeLesson({ id: 'a', gradeLevels: ['3'] })];
    expect(() => computeFacetCounts(lessons)).not.toThrow();
    expect(computeFacetCounts(lessons).thematicCategories).toEqual({});
  });
});
