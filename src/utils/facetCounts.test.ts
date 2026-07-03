import { describe, it, expect } from 'vitest';
import type { Lesson, LessonMetadata } from '@/types';
import { computeFacetCounts } from './facetCounts';

type LessonOverrides = Partial<Omit<Lesson, 'metadata'>> & {
  id: string;
  metadata?: Partial<LessonMetadata>;
};

function makeLesson(overrides: LessonOverrides): Lesson {
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
          // Stored verbatim as the bare noun (what real rows carry), NOT the
          // slug the sidebar looks up — see the dedicated activityType block.
          activityType: ['cooking'],
          locationRequirements: ['Indoor'],
          thematicCategories: ['Garden Basics'],
          seasonTiming: ['Fall'],
          cookingMethods: ['stovetop'],
          socialEmotionalLearning: ['Self-awareness'],
        },
      }),
      makeLesson({
        id: 'b',
        metadata: {
          coreCompetencies: ['garden', 'kitchen'],
          culturalHeritage: [],
          activityType: ['garden'],
          locationRequirements: ['Indoor', 'Outdoor'],
        },
      }),
    ];
    const counts = computeFacetCounts(lessons);
    expect(counts.coreCompetencies).toEqual({ garden: 2, kitchen: 1 });
    // Bucket is keyed by the sidebar's option slug, not the stored noun.
    expect(counts.activityType).toEqual({ 'cooking-only': 1, 'garden-only': 1 });
    expect(counts.location).toEqual({ Indoor: 2, Outdoor: 1 });
    expect(counts.thematicCategories).toEqual({ 'Garden Basics': 1 });
    // Heritage is expansion-aware: a lesson tagged with the slug `east-asian`
    // credits east-asian AND its ancestor asian (see dedicated cases below).
    expect(counts.culturalHeritage).toEqual({ 'east-asian': 1, asian: 1 });
    expect(counts.seasonTiming).toEqual({ Fall: 1 });
    expect(counts.cookingMethods).toEqual({ stovetop: 1 });
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

  describe('culturalHeritage — slug-keyed, expansion-aware counts (C1.6)', () => {
    it('keys by SLUG even when storage uses the Title-Case label (the prod bug)', () => {
      // Stored verbatim as Title-Case "Mexican"; the badge looks up by slug.
      const lessons = [makeLesson({ id: 'a', metadata: { culturalHeritage: ['Mexican'] } })];
      const counts = computeFacetCounts(lessons);
      // Was 0/undefined before C1.6 (label-keyed map vs slug lookup).
      expect(counts.culturalHeritage['mexican']).toBe(1);
      // Mexican also credits its ancestors latin-american and americas.
      expect(counts.culturalHeritage['latin-american']).toBe(1);
      expect(counts.culturalHeritage['americas']).toBe(1);
    });

    it('credits a deep label up its full ancestor chain', () => {
      // Chinese → east-asian → asian
      const lessons = [makeLesson({ id: 'a', metadata: { culturalHeritage: ['Chinese'] } })];
      const counts = computeFacetCounts(lessons);
      expect(counts.culturalHeritage['chinese']).toBe(1);
      expect(counts.culturalHeritage['east-asian']).toBe(1);
      expect(counts.culturalHeritage['asian']).toBe(1);
    });

    it('does NOT double-count a shared ancestor when a lesson is tagged with two siblings', () => {
      // Chinese + Japanese both roll up through east-asian → asian; the shared
      // ancestors must count the lesson ONCE (distinct-lesson semantics).
      const lessons = [
        makeLesson({ id: 'a', metadata: { culturalHeritage: ['Chinese', 'Japanese'] } }),
      ];
      const counts = computeFacetCounts(lessons);
      expect(counts.culturalHeritage['chinese']).toBe(1);
      expect(counts.culturalHeritage['japanese']).toBe(1);
      expect(counts.culturalHeritage['east-asian']).toBe(1); // not 2
      expect(counts.culturalHeritage['asian']).toBe(1); // not 2
    });

    it('credits an internal-tier label up through its hidden ancestors', () => {
      // Soul Food (internal) → african-american → indigenous-and-diaspora
      const lessons = [makeLesson({ id: 'a', metadata: { culturalHeritage: ['Soul Food'] } })];
      const counts = computeFacetCounts(lessons);
      expect(counts.culturalHeritage['soul-food']).toBe(1);
      expect(counts.culturalHeritage['african-american']).toBe(1);
      expect(counts.culturalHeritage['indigenous-and-diaspora']).toBe(1);
    });

    it('counts distinct lessons across a parent and its descendants', () => {
      // Three lessons, all rolling up to asian via different leaves.
      const lessons = [
        makeLesson({ id: 'a', metadata: { culturalHeritage: ['Chinese'] } }),
        makeLesson({ id: 'b', metadata: { culturalHeritage: ['Japanese'] } }),
        makeLesson({ id: 'c', metadata: { culturalHeritage: ['Indian'] } }), // south-asian → asian
      ];
      const counts = computeFacetCounts(lessons);
      expect(counts.culturalHeritage['asian']).toBe(3);
      expect(counts.culturalHeritage['east-asian']).toBe(2);
      expect(counts.culturalHeritage['south-asian']).toBe(1);
      expect(counts.culturalHeritage['indian']).toBe(1);
    });

    it('accepts slug-form storage too (already-canonical values pass through)', () => {
      const lessons = [makeLesson({ id: 'a', metadata: { culturalHeritage: ['mexican'] } })];
      const counts = computeFacetCounts(lessons);
      expect(counts.culturalHeritage['mexican']).toBe(1);
      expect(counts.culturalHeritage['americas']).toBe(1);
    });

    it('does not lose an unknown/phantom value (best-effort self-only credit, no crash)', () => {
      const lessons = [
        makeLesson({ id: 'a', metadata: { culturalHeritage: ['Klingon', 'Mexican'] } }),
      ];
      const counts = computeFacetCounts(lessons);
      // Unknown value credited verbatim, self only, no ancestors.
      expect(counts.culturalHeritage['Klingon']).toBe(1);
      // Known value still expands.
      expect(counts.culturalHeritage['mexican']).toBe(1);
      expect(counts.culturalHeritage['americas']).toBe(1);
    });
  });

  describe('activityType — slug-keyed counts (C69)', () => {
    it('keys by the option SLUG even though storage uses the bare noun (the prod bug)', () => {
      // Real rows store bare nouns (cooking/garden/academic/craft); the sidebar
      // badge looks up `counts.activityType[opt.value]` where opt.value is the
      // slug ('cooking-only', …). A verbatim tally rendered every badge blank.
      const lessons = [makeLesson({ id: 'a', metadata: { activityType: ['cooking'] } })];
      const counts = computeFacetCounts(lessons);
      // Was 0/undefined before C69 (noun-keyed bucket vs slug lookup).
      expect(counts.activityType['cooking-only']).toBe(1);
    });

    it('maps each of the four nouns to its sidebar slug', () => {
      const lessons = [
        makeLesson({ id: 'a', metadata: { activityType: ['cooking'] } }),
        makeLesson({ id: 'b', metadata: { activityType: ['garden'] } }),
        makeLesson({ id: 'c', metadata: { activityType: ['academic'] } }),
        makeLesson({ id: 'd', metadata: { activityType: ['craft'] } }),
      ];
      const counts = computeFacetCounts(lessons);
      expect(counts.activityType).toEqual({
        'cooking-only': 1,
        'garden-only': 1,
        'academic-only': 1,
        'craft-only': 1,
      });
    });

    it('keeps a stray `both` VERBATIM — no fan-out into cooking-only + garden-only', () => {
      // `both` was retired (D2.1, 2026-05-06) and PROD carries zero. The locked
      // design rejects a synthetic `both → [cooking-only, garden-only]` fan-out
      // (speculative dead code + the only thing that could double-count a
      // lesson). A stray value buckets verbatim via the unknown fallback.
      const lessons = [makeLesson({ id: 'a', metadata: { activityType: ['both'] } })];
      const counts = computeFacetCounts(lessons);
      expect(counts.activityType.both).toBe(1);
      expect(counts.activityType['cooking-only']).toBeUndefined();
      expect(counts.activityType['garden-only']).toBeUndefined();
    });

    it('counts each lesson once per distinct slug for a multi-noun array (no dedupe needed)', () => {
      const lessons = [makeLesson({ id: 'a', metadata: { activityType: ['cooking', 'garden'] } })];
      const counts = computeFacetCounts(lessons);
      expect(counts.activityType).toEqual({ 'cooking-only': 1, 'garden-only': 1 });
    });
  });
});
