import { useMemo } from 'react';
import type { Lesson, LessonMetadata } from '@/types';
import { aliasToSlug, ancestorsBySlug } from '@/utils/heritageAncestry.generated';

/**
 * Filter keys whose values appear as facets in the internal sidebar.
 * Must align with SearchFilters keys in src/types/index.ts.
 */
export type FacetFilterKey =
  | 'gradeLevels'
  | 'tags'
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
  tags: {},
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
    case 'tags':
      // `tags` is a top-level lessons column not currently exposed by the
      // search_lessons RPC RETURNS TABLE, so we have no per-row signal here.
      // Filter still works (RPC applies WHERE clause); badge counts stay 0
      // until a follow-up exposes tags in the result shape. Mirrors the
      // pre-existing Activity Type facet badge limitation.
      // TODO: tracked in docs/plans/2026-05-03-metadata-rebuild-foundation-execution-status.md
      // → "Out-of-scope follow-ups captured here" → "Lesson Type (tags) facet count badge always shows 0".
      return [];
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
  'tags',
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
 * Tally one lesson's Cultural Heritage values into a SLUG-keyed,
 * expansion-aware bucket (C1.6).
 *
 * Stored heritage values are Title-Case labels (e.g. "Mexican", "Soul Food")
 * while the filter UI looks up badge counts by kebab slug ("mexican"), so a
 * verbatim tally renders every badge blank. We instead:
 *   1. normalize each stored value (label OR slug) → canonical slug;
 *   2. expand that slug → `{self ∪ all ancestors}` (e.g. chinese → east-asian →
 *      asian), so a parent badge reflects all of its descendants;
 *   3. union every expanded slug into ONE Set for the lesson before counting,
 *      so a lesson tagged both Chinese and Japanese credits `asian` exactly
 *      once (distinct-lesson semantics — no double-count).
 *
 * An unknown/phantom value (not in the vocab alias map) is credited under its
 * verbatim key, self only, so it is never silently lost.
 */
function tallyHeritage(lesson: Lesson, bucket: Record<string, number>): void {
  const stored = lesson.metadata.culturalHeritage ?? [];
  const slugsForLesson = new Set<string>();
  for (const value of stored) {
    const slug = aliasToSlug[value];
    if (slug === undefined) {
      // Best-effort: keep the unknown value (self only, no ancestors).
      slugsForLesson.add(value);
      continue;
    }
    for (const ancestor of ancestorsBySlug[slug] ?? [slug]) {
      slugsForLesson.add(ancestor);
    }
  }
  for (const slug of slugsForLesson) {
    bucket[slug] = (bucket[slug] ?? 0) + 1;
  }
}

/**
 * Compute facet counts over a set of lessons — one `{ value: count }` bucket
 * per filter category. Pure function; safe to call from a useMemo.
 *
 * Every category except `culturalHeritage` is a verbatim per-value tally.
 * `culturalHeritage` is special-cased (slug-keyed + expansion-aware) so its
 * badge counts render and parent nodes reflect their descendants — see
 * `tallyHeritage`. (`activityType` has the same slug-vs-label class of bug; it
 * is a separate tracked follow-up and intentionally untouched here.)
 */
export function computeFacetCounts(lessons: Lesson[]): FacetCounts {
  const counts = EMPTY_COUNTS();
  for (const lesson of lessons) {
    for (const key of KEYS) {
      if (key === 'culturalHeritage') continue; // handled by tallyHeritage
      const bucket = counts[key];
      for (const value of valuesForKey(lesson, key)) {
        bucket[value] = (bucket[value] ?? 0) + 1;
      }
    }
    tallyHeritage(lesson, counts.culturalHeritage);
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
