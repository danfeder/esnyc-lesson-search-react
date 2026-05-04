import { useMemo } from 'react';
import type { Lesson, LessonMetadata } from '@/types';

/**
 * Filter keys whose values appear as facets in the internal sidebar.
 * Must align with SearchFilters keys in src/types/index.ts.
 */
export type FacetFilterKey =
  | 'gradeLevels'
  | 'activityType'
  | 'location'
  | 'thematicCategories'
  | 'seasonTiming'
  | 'coreCompetencies'
  | 'culturalHeritage'
  | 'academicIntegration'
  | 'socialEmotionalLearning'
  | 'cookingMethods';

export type FacetCounts = Record<FacetFilterKey, Record<string, number>>;

const EMPTY_COUNTS = (): FacetCounts => ({
  gradeLevels: {},
  activityType: {},
  location: {},
  thematicCategories: {},
  seasonTiming: {},
  coreCompetencies: {},
  culturalHeritage: {},
  academicIntegration: {},
  socialEmotionalLearning: {},
  cookingMethods: {},
});

function valuesForKey(lesson: Lesson, key: FacetFilterKey): string[] {
  const meta: LessonMetadata = lesson.metadata;
  switch (key) {
    case 'gradeLevels':
      return lesson.gradeLevels ?? [];
    case 'activityType':
      return meta.activityType ?? [];
    case 'location':
      return meta.locationRequirements ?? [];
    case 'thematicCategories':
      return meta.thematicCategories ?? [];
    case 'seasonTiming':
      return meta.seasonTiming ?? [];
    case 'coreCompetencies':
      return meta.coreCompetencies ?? [];
    case 'culturalHeritage':
      return meta.culturalHeritage ?? [];
    case 'academicIntegration': {
      const ai = meta.academicIntegration;
      if (!ai) return [];
      if (Array.isArray(ai)) return ai;
      return ai.selected ?? [];
    }
    case 'socialEmotionalLearning':
      return meta.socialEmotionalLearning ?? [];
    case 'cookingMethods':
      return meta.cookingMethods ?? [];
  }
}

const KEYS: readonly FacetFilterKey[] = [
  'gradeLevels',
  'activityType',
  'location',
  'thematicCategories',
  'seasonTiming',
  'coreCompetencies',
  'culturalHeritage',
  'academicIntegration',
  'socialEmotionalLearning',
  'cookingMethods',
] as const;

/**
 * Compute facet counts over a set of lessons — one `{ value: count }` bucket
 * per filter category. Pure function; safe to call from a useMemo.
 */
export function computeFacetCounts(lessons: Lesson[]): FacetCounts {
  const counts = EMPTY_COUNTS();
  for (const lesson of lessons) {
    for (const key of KEYS) {
      const bucket = counts[key];
      for (const value of valuesForKey(lesson, key)) {
        bucket[value] = (bucket[value] ?? 0) + 1;
      }
    }
  }
  return counts;
}

/**
 * Memoized hook wrapper for use inside React components.
 * Counts are recomputed only when the `lessons` reference changes.
 */
export function useFacetCounts(lessons: Lesson[]): FacetCounts {
  return useMemo(() => computeFacetCounts(lessons), [lessons]);
}
