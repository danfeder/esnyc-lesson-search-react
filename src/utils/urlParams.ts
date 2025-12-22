import type { SearchFilters } from '@/types';
import { FILTER_CONFIGS } from '@/utils/filterDefinitions';

// Limits to prevent DoS via malformed URLs
const MAX_PARAM_LENGTH = 1000;
const MAX_ARRAY_LENGTH = 50;

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

// Pre-computed entries for performance (avoid creating arrays on each call)
const FILTER_ENTRIES = Object.entries(FILTER_TO_PARAM) as [keyof SearchFilters, string][];
const PARAM_ENTRIES = Object.entries(PARAM_TO_FILTER) as [string, keyof SearchFilters][];

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

  for (const [filterKey, paramKey] of FILTER_ENTRIES) {
    const value = filters[filterKey];

    if (ARRAY_FILTERS.has(filterKey)) {
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

// Type for string filter keys (non-array filters)
type StringFilterKey = 'query' | 'lessonFormat';

/**
 * Type-safe helper to set filter values.
 * Uses TypeScript's type system for safety without verbose switch statements.
 */
function setFilterValue<K extends keyof SearchFilters>(
  filters: Partial<SearchFilters>,
  key: K,
  value: SearchFilters[K]
): void {
  filters[key] = value;
}

/**
 * Check if a key is an array filter key (for type narrowing).
 */
function isArrayFilterKey(
  key: keyof SearchFilters
): key is Exclude<keyof SearchFilters, StringFilterKey> {
  return ARRAY_FILTERS.has(key);
}

/**
 * Check if a key is a string filter key (for type narrowing).
 */
function isStringFilterKey(key: keyof SearchFilters): key is StringFilterKey {
  return key === 'query' || key === 'lessonFormat';
}

/**
 * Parse URL search params into partial search filters.
 * Invalid or unknown params are ignored for graceful degradation.
 * Includes length limits to prevent DoS attacks.
 */
export function parseUrlToFilters(params: URLSearchParams): Partial<SearchFilters> {
  const filters: Partial<SearchFilters> = {};

  for (const [paramKey, filterKey] of PARAM_ENTRIES) {
    const value = params.get(paramKey);
    if (!value || value.length > MAX_PARAM_LENGTH) continue;

    if (isArrayFilterKey(filterKey)) {
      // Split comma-separated values, trim, filter empty, limit array size
      const arr = value
        .split(',')
        .map((v) => v.trim())
        .filter(Boolean)
        .slice(0, MAX_ARRAY_LENGTH);
      if (arr.length > 0) {
        setFilterValue(filters, filterKey, arr);
      }
    } else if (isStringFilterKey(filterKey)) {
      setFilterValue(filters, filterKey, value);
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

/**
 * Get all valid values for a filter, including nested children for hierarchical filters.
 */
function getValidValuesForFilter(filterKey: string): Set<string> | null {
  const config = FILTER_CONFIGS[filterKey];
  if (!config || !config.options) return null;

  const validValues = new Set<string>();

  const addOptions = (options: typeof config.options) => {
    for (const option of options) {
      validValues.add(option.value);
      // Include children for hierarchical filters (e.g., culturalHeritage)
      if ('children' in option && option.children) {
        addOptions(option.children);
      }
    }
  };

  addOptions(config.options);

  // Include grade group IDs as valid values
  if (config.groups) {
    for (const group of config.groups) {
      validValues.add(group.id);
    }
  }

  return validValues;
}

/**
 * Validate filter values against known valid options.
 * Invalid values are silently removed to prevent injection of arbitrary data.
 * The 'query' field is not validated as it's free-form text.
 */
export function validateFilterValues(filters: Partial<SearchFilters>): Partial<SearchFilters> {
  const validated: Partial<SearchFilters> = {};

  for (const [key, value] of Object.entries(filters)) {
    const filterKey = key as keyof SearchFilters;

    // Query is free-form text, no validation needed (but trim whitespace)
    if (filterKey === 'query') {
      if (typeof value === 'string' && value.trim()) {
        validated.query = value.trim();
      }
      continue;
    }

    const validValues = getValidValuesForFilter(filterKey);

    // If no config found for this filter, skip it (don't allow unknown filters)
    if (!validValues) {
      continue;
    }

    if (isArrayFilterKey(filterKey)) {
      // Filter array values to only include valid options
      const arr = value as string[];
      const validArr = arr.filter((v) => validValues.has(v));
      if (validArr.length > 0) {
        setFilterValue(validated, filterKey, validArr);
      }
    } else if (isStringFilterKey(filterKey)) {
      // Validate single value (excluding query which is handled above)
      if (typeof value === 'string' && validValues.has(value)) {
        setFilterValue(validated, filterKey, value);
      }
    }
  }

  return validated;
}
