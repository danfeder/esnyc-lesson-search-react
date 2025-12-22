import type { SearchFilters } from '@/types';

/**
 * Mapping between store filter keys and short URL parameter names.
 * Short names keep URLs readable and shareable.
 */
const PARAM_TO_FILTER: Record<string, keyof SearchFilters> = {
  q: 'query',
  grades: 'gradeLevels',
  activity: 'activityType',
  loc: 'location',
  season: 'seasonTiming',
  themes: 'thematicCategories',
  skills: 'coreCompetencies',
  culture: 'culturalHeritage',
  format: 'lessonFormat',
  academic: 'academicIntegration',
  sel: 'socialEmotionalLearning',
  cooking: 'cookingMethods',
};

const FILTER_TO_PARAM: Record<keyof SearchFilters, string> = Object.fromEntries(
  Object.entries(PARAM_TO_FILTER).map(([param, filter]) => [filter, param])
) as Record<keyof SearchFilters, string>;

// Filters that are arrays (multi-select)
const ARRAY_FILTERS: Set<keyof SearchFilters> = new Set([
  'gradeLevels',
  'activityType',
  'location',
  'seasonTiming',
  'thematicCategories',
  'coreCompetencies',
  'culturalHeritage',
  'academicIntegration',
  'socialEmotionalLearning',
  'cookingMethods',
]);

/**
 * Convert search filters to URL search params.
 * Only includes non-empty values to keep URLs clean.
 */
export function filtersToUrlParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();

  for (const [filterKey, paramKey] of Object.entries(FILTER_TO_PARAM)) {
    const value = filters[filterKey as keyof SearchFilters];

    if (ARRAY_FILTERS.has(filterKey as keyof SearchFilters)) {
      const arr = value as string[];
      if (arr && arr.length > 0) {
        params.set(paramKey, arr.join(','));
      }
    } else {
      // String value (query, lessonFormat)
      if (value && typeof value === 'string') {
        params.set(paramKey, value);
      }
    }
  }

  return params;
}

/**
 * Parse URL search params into partial search filters.
 * Invalid or unknown params are ignored for graceful degradation.
 */
export function parseUrlToFilters(params: URLSearchParams): Partial<SearchFilters> {
  const filters: Partial<SearchFilters> = {};

  for (const [paramKey, filterKey] of Object.entries(PARAM_TO_FILTER)) {
    const value = params.get(paramKey);
    if (!value) continue;

    if (ARRAY_FILTERS.has(filterKey)) {
      // Split comma-separated values, filter empty strings
      const arr = value.split(',').filter((v) => v.trim());
      if (arr.length > 0) {
        (filters as Record<string, string[]>)[filterKey] = arr;
      }
    } else {
      // String value
      (filters as Record<string, string>)[filterKey] = value;
    }
  }

  return filters;
}

/**
 * Check if there are any non-empty filters in the partial filters object.
 */
export function hasFilters(filters: Partial<SearchFilters>): boolean {
  return Object.values(filters).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return !!value;
  });
}
