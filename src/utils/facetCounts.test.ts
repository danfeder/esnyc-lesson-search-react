import { describe, it, expect } from 'vitest';
import type { SearchFilters } from '@/types';
import { initialFilters } from '@/stores/searchStore';
import { computeTrueFacetCounts, matchesFacetSelection, type FacetLesson } from './facetCounts';

type FacetLessonOverrides = Partial<Omit<FacetLesson, 'metadata'>> & {
  metadata?: Partial<FacetLesson['metadata']>;
};

function makeLesson(overrides: FacetLessonOverrides = {}): FacetLesson {
  return {
    gradeLevels: overrides.gradeLevels ?? [],
    metadata: {
      coreCompetencies: [],
      culturalHeritage: [],
      activityType: [],
      ...(overrides.metadata ?? {}),
    },
  };
}

function filtersWith(overrides: Partial<SearchFilters> = {}): SearchFilters {
  return { ...initialFilters, ...overrides };
}

describe('computeTrueFacetCounts — plain tally (no active filters)', () => {
  it('returns empty bucket for every filter key when no lessons', () => {
    const counts = computeTrueFacetCounts([], filtersWith());
    expect(counts.gradeLevels).toEqual({});
    expect(counts.activityType).toEqual({});
    expect(counts.culturalHeritage).toEqual({});
  });

  it('counts top-level gradeLevels', () => {
    const lessons = [
      makeLesson({ gradeLevels: ['K', '1'] }),
      makeLesson({ gradeLevels: ['1', '2'] }),
    ];
    const counts = computeTrueFacetCounts(lessons, filtersWith());
    expect(counts.gradeLevels).toEqual({ K: 1, '1': 2, '2': 1 });
  });

  it('counts metadata array facets and reads locationRequirements for `location`', () => {
    const lessons = [
      makeLesson({
        metadata: {
          coreCompetencies: ['Social Justice'],
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
        metadata: {
          coreCompetencies: ['Social Justice', 'Culturally Responsive Education'],
          culturalHeritage: [],
          activityType: ['garden'],
          locationRequirements: ['Indoor', 'Outdoor'],
        },
      }),
    ];
    const counts = computeTrueFacetCounts(lessons, filtersWith());
    expect(counts.coreCompetencies).toEqual({
      'Social Justice': 2,
      'Culturally Responsive Education': 1,
    });
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
      makeLesson({ metadata: { academicIntegration: ['Math', 'Science'] } }),
      makeLesson({
        metadata: { academicIntegration: { concepts: {}, selected: ['Science', 'Health'] } },
      }),
    ];
    const counts = computeTrueFacetCounts(lessons, filtersWith());
    expect(counts.academicIntegration).toEqual({ Math: 1, Science: 2, Health: 1 });
  });

  it('skips missing optional fields without throwing', () => {
    const lessons = [makeLesson({ gradeLevels: ['3'] })];
    expect(() => computeTrueFacetCounts(lessons, filtersWith())).not.toThrow();
    expect(computeTrueFacetCounts(lessons, filtersWith()).thematicCategories).toEqual({});
  });

  it('is unaffected by the free-text query (deliberately not part of the badge universe)', () => {
    const lessons = [
      makeLesson({ gradeLevels: ['K'], metadata: { activityType: ['cooking'] } }),
      makeLesson({ gradeLevels: ['1'], metadata: { seasonTiming: ['Fall'] } }),
    ];
    const withQuery = computeTrueFacetCounts(lessons, filtersWith({ query: 'compost' }));
    const withoutQuery = computeTrueFacetCounts(lessons, filtersWith());
    expect(withQuery).toEqual(withoutQuery);
  });
});

describe('computeTrueFacetCounts — culturalHeritage (slug-keyed, expansion-aware, C1.6)', () => {
  it('keys by SLUG even when storage uses the Title-Case label (the prod bug)', () => {
    // Stored verbatim as Title-Case "Mexican"; the badge looks up by slug.
    const lessons = [makeLesson({ metadata: { culturalHeritage: ['Mexican'] } })];
    const counts = computeTrueFacetCounts(lessons, filtersWith());
    // Was 0/undefined before C1.6 (label-keyed map vs slug lookup).
    expect(counts.culturalHeritage['mexican']).toBe(1);
    // Mexican also credits its ancestors latin-american and americas.
    expect(counts.culturalHeritage['latin-american']).toBe(1);
    expect(counts.culturalHeritage['americas']).toBe(1);
  });

  it('credits a deep label up its full ancestor chain', () => {
    // Chinese → east-asian → asian
    const lessons = [makeLesson({ metadata: { culturalHeritage: ['Chinese'] } })];
    const counts = computeTrueFacetCounts(lessons, filtersWith());
    expect(counts.culturalHeritage['chinese']).toBe(1);
    expect(counts.culturalHeritage['east-asian']).toBe(1);
    expect(counts.culturalHeritage['asian']).toBe(1);
  });

  it('does NOT double-count a shared ancestor when a lesson is tagged with two siblings', () => {
    // Chinese + Japanese both roll up through east-asian → asian; the shared
    // ancestors must count the lesson ONCE (distinct-lesson semantics).
    const lessons = [makeLesson({ metadata: { culturalHeritage: ['Chinese', 'Japanese'] } })];
    const counts = computeTrueFacetCounts(lessons, filtersWith());
    expect(counts.culturalHeritage['chinese']).toBe(1);
    expect(counts.culturalHeritage['japanese']).toBe(1);
    expect(counts.culturalHeritage['east-asian']).toBe(1); // not 2
    expect(counts.culturalHeritage['asian']).toBe(1); // not 2
  });

  it('rolls an internal-tier label up into its RENDERED ancestors only', () => {
    // Soul Food is an `internal` vocab node — hidden in the UI, so it gets no
    // badge key of its own; its lesson still credits the rendered ancestors
    // african-american → indigenous-and-diaspora.
    const lessons = [makeLesson({ metadata: { culturalHeritage: ['Soul Food'] } })];
    const counts = computeTrueFacetCounts(lessons, filtersWith());
    expect(counts.culturalHeritage['soul-food']).toBeUndefined();
    expect(counts.culturalHeritage['african-american']).toBe(1);
    expect(counts.culturalHeritage['indigenous-and-diaspora']).toBe(1);
  });

  it('counts distinct lessons across a parent and its descendants', () => {
    // Three lessons, all rolling up to asian via different leaves.
    const lessons = [
      makeLesson({ metadata: { culturalHeritage: ['Chinese'] } }),
      makeLesson({ metadata: { culturalHeritage: ['Japanese'] } }),
      makeLesson({ metadata: { culturalHeritage: ['Indian'] } }), // south-asian → asian
    ];
    const counts = computeTrueFacetCounts(lessons, filtersWith());
    expect(counts.culturalHeritage['asian']).toBe(3);
    expect(counts.culturalHeritage['east-asian']).toBe(2);
    expect(counts.culturalHeritage['south-asian']).toBe(1);
    expect(counts.culturalHeritage['indian']).toBe(1);
  });

  it('accepts slug-form storage too (already-canonical values pass through)', () => {
    const lessons = [makeLesson({ metadata: { culturalHeritage: ['mexican'] } })];
    const counts = computeTrueFacetCounts(lessons, filtersWith());
    expect(counts.culturalHeritage['mexican']).toBe(1);
    expect(counts.culturalHeritage['americas']).toBe(1);
  });

  it('leaves an unknown/phantom value under NO badge key — no crash, no fan-out', () => {
    // No rendered option can express "Klingon", so it appears nowhere; the
    // known co-tag still expands normally.
    const lessons = [makeLesson({ metadata: { culturalHeritage: ['Klingon', 'Mexican'] } })];
    const counts = computeTrueFacetCounts(lessons, filtersWith());
    expect(counts.culturalHeritage['Klingon']).toBeUndefined();
    expect(counts.culturalHeritage['klingon']).toBeUndefined();
    expect(counts.culturalHeritage['mexican']).toBe(1);
    expect(counts.culturalHeritage['americas']).toBe(1);
  });
});

describe('computeTrueFacetCounts — activityType (slug-keyed, C69)', () => {
  it('keys by the option SLUG even though storage uses the bare noun (the prod bug)', () => {
    // Real rows store bare nouns (cooking/garden/academic/craft); the sidebar
    // badge looks up `counts.activityType[opt.value]` where opt.value is the
    // slug ('cooking-only', …). A verbatim tally rendered every badge blank.
    const lessons = [makeLesson({ metadata: { activityType: ['cooking'] } })];
    const counts = computeTrueFacetCounts(lessons, filtersWith());
    expect(counts.activityType['cooking-only']).toBe(1);
  });

  it('maps each of the four nouns to its sidebar slug', () => {
    const lessons = [
      makeLesson({ metadata: { activityType: ['cooking'] } }),
      makeLesson({ metadata: { activityType: ['garden'] } }),
      makeLesson({ metadata: { activityType: ['academic'] } }),
      makeLesson({ metadata: { activityType: ['craft'] } }),
    ];
    const counts = computeTrueFacetCounts(lessons, filtersWith());
    expect(counts.activityType).toEqual({
      'cooking-only': 1,
      'garden-only': 1,
      'academic-only': 1,
      'craft-only': 1,
    });
  });

  it('leaves a stray `both` under NO badge key — no fan-out into cooking-only + garden-only', () => {
    // `both` was retired (D2.1, 2026-05-06) and PROD carries zero. The option-
    // keyed contract counts only what a rendered option can match, so a stray
    // stored `both` is simply uncounted — and can never double-count a lesson
    // (the C69 no-fan-out invariant, now by construction).
    const lessons = [makeLesson({ metadata: { activityType: ['both'] } })];
    const counts = computeTrueFacetCounts(lessons, filtersWith());
    expect(counts.activityType).toEqual({});
  });

  it('counts each lesson once per distinct slug for a multi-noun array (no dedupe needed)', () => {
    const lessons = [makeLesson({ metadata: { activityType: ['cooking', 'garden'] } })];
    const counts = computeTrueFacetCounts(lessons, filtersWith());
    expect(counts.activityType).toEqual({ 'cooking-only': 1, 'garden-only': 1 });
  });
});

describe('computeTrueFacetCounts — current-filter-awareness (D-2)', () => {
  const threeGardenTwoCooking = [
    makeLesson({ gradeLevels: ['K'], metadata: { activityType: ['garden'] } }),
    makeLesson({ gradeLevels: ['K'], metadata: { activityType: ['garden'] } }),
    makeLesson({ gradeLevels: ['1'], metadata: { activityType: ['garden'] } }),
    makeLesson({ gradeLevels: ['2'], metadata: { activityType: ['cooking'] } }),
    makeLesson({ gradeLevels: ['2'], metadata: { activityType: ['cooking'] } }),
  ];

  it('excludes the badge category itself from the restriction (F4: OR, not intersection)', () => {
    const counts = computeTrueFacetCounts(
      threeGardenTwoCooking,
      filtersWith({ activityType: ['garden-only'] })
    );
    // The Cooking badge shows what selecting Cooking ALONE would match — NOT
    // the cooking∩garden intersection (which is 0 here).
    expect(counts.activityType['cooking-only']).toBe(2);
    expect(counts.activityType['garden-only']).toBe(3);
  });

  it('restricts OTHER categories by the active selection', () => {
    const counts = computeTrueFacetCounts(
      threeGardenTwoCooking,
      filtersWith({ activityType: ['garden-only'] })
    );
    // Grade badges count only the 3 garden lessons.
    expect(counts.gradeLevels).toEqual({ K: 2, '1': 1 });
  });

  it("cross-category restriction narrows other categories but never the category's own badges", () => {
    const lessons = [
      makeLesson({ metadata: { seasonTiming: ['Fall'], activityType: ['cooking'] } }),
      makeLesson({ metadata: { seasonTiming: ['Fall'], activityType: ['garden'] } }),
      makeLesson({ metadata: { seasonTiming: ['Winter'], activityType: ['cooking'] } }),
    ];
    const counts = computeTrueFacetCounts(lessons, filtersWith({ seasonTiming: ['Fall'] }));
    // Activity badges count only Fall lessons…
    expect(counts.activityType).toEqual({ 'cooking-only': 1, 'garden-only': 1 });
    // …while the Season category's own badges stay unrestricted by Season.
    expect(counts.seasonTiming).toEqual({ Fall: 2, Winter: 1 });
  });

  it('drops a lesson from ALL universes when it fails two or more active categories', () => {
    const lessons = [
      // Fails both the Fall restriction and the garden restriction.
      makeLesson({ metadata: { seasonTiming: ['Winter'], activityType: ['cooking'] } }),
      // Matches both.
      makeLesson({ metadata: { seasonTiming: ['Fall'], activityType: ['garden'] } }),
    ];
    const counts = computeTrueFacetCounts(
      lessons,
      filtersWith({ seasonTiming: ['Fall'], activityType: ['garden-only'] })
    );
    // The Winter+cooking lesson fails two other-category checks everywhere:
    // it may not even appear in its own categories' badges.
    expect(counts.seasonTiming).toEqual({ Fall: 1 });
    expect(counts.activityType).toEqual({ 'garden-only': 1 });
    expect(counts.gradeLevels).toEqual({});
  });

  it('restricts other categories via a heritage PARENT selection (down-expansion equivalence)', () => {
    const lessons = [
      makeLesson({ metadata: { culturalHeritage: ['Chinese'], activityType: ['cooking'] } }),
      makeLesson({ metadata: { culturalHeritage: ['Mexican'], activityType: ['garden'] } }),
    ];
    const counts = computeTrueFacetCounts(lessons, filtersWith({ culturalHeritage: ['asian'] }));
    // Selecting the parent "asian" matches the Chinese-tagged lesson (server
    // expands the selection down its subtree; the client expands the lesson up).
    expect(counts.activityType).toEqual({ 'cooking-only': 1 });
    // Heritage's own badges stay unrestricted by heritage.
    expect(counts.culturalHeritage['mexican']).toBe(1);
    expect(counts.culturalHeritage['asian']).toBe(1);
  });

  it('gradeLevels badges are restricted by other categories (D-3 data side)', () => {
    const lessons = [
      makeLesson({ gradeLevels: ['K'], metadata: { seasonTiming: ['Fall'] } }),
      makeLesson({ gradeLevels: ['K', '1'], metadata: { seasonTiming: ['Winter'] } }),
    ];
    const unrestricted = computeTrueFacetCounts(lessons, filtersWith());
    expect(unrestricted.gradeLevels).toEqual({ K: 2, '1': 1 });
    const restricted = computeTrueFacetCounts(lessons, filtersWith({ seasonTiming: ['Fall'] }));
    expect(restricted.gradeLevels).toEqual({ K: 1 });
  });
});

describe('computeTrueFacetCounts — location Both-subsumption (F3)', () => {
  it('counts Both-stored lessons under Indoor AND Outdoor (what clicking matches)', () => {
    const lessons = [
      makeLesson({ metadata: { locationRequirements: ['Indoor'] } }),
      makeLesson({ metadata: { locationRequirements: ['Both'] } }),
      makeLesson({ metadata: { locationRequirements: ['Outdoor'] } }),
    ];
    const counts = computeTrueFacetCounts(lessons, filtersWith());
    // FP-18: the search sidebar renders only Indoor/Outdoor, so no `Both` badge
    // bucket is computed; a Both-stored lesson still counts under BOTH badges.
    expect(counts.location).toEqual({ Indoor: 2, Outdoor: 2 });
  });

  it('is case-insensitive on the stored side (lowercase storage still counts)', () => {
    const lessons = [makeLesson({ metadata: { locationRequirements: ['indoor'] } })];
    const counts = computeTrueFacetCounts(lessons, filtersWith());
    expect(counts.location['Indoor']).toBe(1);
  });
});

describe('computeTrueFacetCounts — cookingMethods case-insensitivity', () => {
  it('tallies case-insensitively under the kebab option value', () => {
    const lessons = [
      makeLesson({ metadata: { cookingMethods: ['Stovetop'] } }),
      makeLesson({ metadata: { cookingMethods: ['stovetop'] } }),
    ];
    const counts = computeTrueFacetCounts(lessons, filtersWith());
    expect(counts.cookingMethods['stovetop']).toBe(2);
  });
});

describe('matchesFacetSelection — server-parity predicate rows (§4)', () => {
  it('imposes no restriction for an empty selection (mirrors the RPC NULL guards)', () => {
    expect(matchesFacetSelection(makeLesson(), 'gradeLevels', [])).toBe(true);
    expect(matchesFacetSelection(makeLesson(), 'location', [])).toBe(true);
  });

  it('gradeLevels: verbatim case-sensitive overlap (`l.grade_levels && filter`)', () => {
    const lesson = makeLesson({ gradeLevels: ['K', '1'] });
    expect(matchesFacetSelection(lesson, 'gradeLevels', ['1', '5'])).toBe(true);
    expect(matchesFacetSelection(lesson, 'gradeLevels', ['5'])).toBe(false);
    expect(matchesFacetSelection(lesson, 'gradeLevels', ['k'])).toBe(false); // case-sensitive
  });

  it('thematicCategories: verbatim overlap — kebab-drifted storage does NOT match (FP-02 consistency)', () => {
    const drifted = makeLesson({ metadata: { thematicCategories: ['seed-to-table'] } });
    // Matches click behavior today: the drifted row is invisible to the filter.
    expect(matchesFacetSelection(drifted, 'thematicCategories', ['Seed to Table'])).toBe(false);
    const canonical = makeLesson({ metadata: { thematicCategories: ['Seed to Table'] } });
    expect(matchesFacetSelection(canonical, 'thematicCategories', ['Seed to Table'])).toBe(true);
  });

  it('seasonTiming / coreCompetencies / academicIntegration / SEL: verbatim overlap', () => {
    const lesson = makeLesson({
      metadata: {
        seasonTiming: ['Fall'],
        coreCompetencies: ['Social Justice'],
        academicIntegration: ['Math'],
        socialEmotionalLearning: ['Self-awareness'],
      },
    });
    expect(matchesFacetSelection(lesson, 'seasonTiming', ['Fall'])).toBe(true);
    expect(matchesFacetSelection(lesson, 'seasonTiming', ['Winter'])).toBe(false);
    expect(matchesFacetSelection(lesson, 'coreCompetencies', ['Social Justice'])).toBe(true);
    expect(matchesFacetSelection(lesson, 'academicIntegration', ['Math'])).toBe(true);
    expect(matchesFacetSelection(lesson, 'socialEmotionalLearning', ['Self-awareness'])).toBe(true);
  });

  it('academicIntegration: tolerates the `{ selected }` object form', () => {
    const lesson = makeLesson({
      metadata: { academicIntegration: { concepts: {}, selected: ['Science'] } },
    });
    expect(matchesFacetSelection(lesson, 'academicIntegration', ['Science'])).toBe(true);
    expect(matchesFacetSelection(lesson, 'academicIntegration', ['Math'])).toBe(false);
  });

  it('culturalHeritage: parent selection matches descendant-tagged lessons', () => {
    const lesson = makeLesson({ metadata: { culturalHeritage: ['Chinese'] } });
    expect(matchesFacetSelection(lesson, 'culturalHeritage', ['asian'])).toBe(true);
    expect(matchesFacetSelection(lesson, 'culturalHeritage', ['east-asian'])).toBe(true);
    expect(matchesFacetSelection(lesson, 'culturalHeritage', ['chinese'])).toBe(true);
    expect(matchesFacetSelection(lesson, 'culturalHeritage', ['european'])).toBe(false);
    // A child selection does NOT match a parent-tagged lesson (no down-leak).
    const parentTagged = makeLesson({ metadata: { culturalHeritage: ['Asian'] } });
    expect(matchesFacetSelection(parentTagged, 'culturalHeritage', ['chinese'])).toBe(false);
  });

  it('location: Indoor selection subsumes Both; Both selection is exact; case-insensitive', () => {
    const both = makeLesson({ metadata: { locationRequirements: ['Both'] } });
    expect(matchesFacetSelection(both, 'location', ['Indoor'])).toBe(true);
    expect(matchesFacetSelection(both, 'location', ['Outdoor'])).toBe(true);
    expect(matchesFacetSelection(both, 'location', ['Both'])).toBe(true);
    const indoor = makeLesson({ metadata: { locationRequirements: ['indoor'] } });
    expect(matchesFacetSelection(indoor, 'location', ['Indoor'])).toBe(true);
    expect(matchesFacetSelection(indoor, 'location', ['Both'])).toBe(false);
    expect(matchesFacetSelection(indoor, 'location', ['Outdoor'])).toBe(false);
  });

  it('activityType: slug selection matches noun OR slug storage; never a stray `both`', () => {
    expect(
      matchesFacetSelection(
        makeLesson({ metadata: { activityType: ['cooking'] } }),
        'activityType',
        ['cooking-only']
      )
    ).toBe(true);
    expect(
      matchesFacetSelection(
        makeLesson({ metadata: { activityType: ['cooking-only'] } }),
        'activityType',
        ['cooking-only']
      )
    ).toBe(true);
    expect(
      matchesFacetSelection(makeLesson({ metadata: { activityType: ['both'] } }), 'activityType', [
        'cooking-only',
      ])
    ).toBe(false);
  });

  it('cookingMethods: case-insensitive overlap', () => {
    const lesson = makeLesson({ metadata: { cookingMethods: ['Stovetop'] } });
    expect(matchesFacetSelection(lesson, 'cookingMethods', ['stovetop'])).toBe(true);
    expect(matchesFacetSelection(lesson, 'cookingMethods', ['oven'])).toBe(false);
  });
});
