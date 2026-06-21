import type { SearchFilters, ViewState } from '@/types';
import { FILTER_CONFIGS } from '@/utils/filterDefinitions';

/**
 * Pure (no-React) serialize / parse / validate for the public search URL
 * schema: query + 11 filters + sort. Written fresh against the current
 * `SearchFilters` shape (tags included; the legacy lesson-type field removed in
 * the 2026-05 metadata rebuild is intentionally absent) per design §4 Q6/Q7
 * (2026-06-20-theme-b-public-ux-design.md).
 *
 * Schema (param ↔ filter):
 *   q → query, grades → gradeLevels, themes → thematicCategories,
 *   season → seasonTiming, skills → coreCompetencies, culture → culturalHeritage,
 *   loc → location, activity → activityType, tags → tags,
 *   academic → academicIntegration, sel → socialEmotionalLearning,
 *   cooking → cookingMethods, plus sort → sortBy.
 */

// DoS guards: cap a single param's length and the size of any decoded array.
export const MAX_PARAM_LENGTH = 1000;
export const MAX_ARRAY_LENGTH = 50;

// The only sort values that live in the URL. Mirrors the search_lessons RPC's
// `CASE … ELSE relevance` whitelist (W1b). `relevance` is the default and is
// omitted from the serialized URL.
export const URL_SORT_VALUES = ['relevance', 'title', 'modified'] as const;
type UrlSortValue = (typeof URL_SORT_VALUES)[number];
const DEFAULT_SORT: UrlSortValue = 'relevance';

// Every search filter is a string[] in SearchFilters except `query` (a string).
// `location` is single-select in the UI but is still typed/stored as string[]
// in SearchFilters, so it serializes like any other array filter.
type ArrayFilterKey = Exclude<keyof SearchFilters, 'query'>;

// store filter key → short URL param name
const FILTER_TO_PARAM: Record<keyof SearchFilters, string> = {
  query: 'q',
  gradeLevels: 'grades',
  thematicCategories: 'themes',
  seasonTiming: 'season',
  coreCompetencies: 'skills',
  culturalHeritage: 'culture',
  location: 'loc',
  activityType: 'activity',
  tags: 'tags',
  academicIntegration: 'academic',
  socialEmotionalLearning: 'sel',
  cookingMethods: 'cooking',
};

const ARRAY_FILTER_KEYS = (Object.keys(FILTER_TO_PARAM) as Array<keyof SearchFilters>).filter(
  (k): k is ArrayFilterKey => k !== 'query'
);

const SORT_PARAM = 'sort';

/** Narrow an arbitrary sort string to a URL-valid value, defaulting to relevance. */
function whitelistSort(value: string | null | undefined): UrlSortValue {
  return (URL_SORT_VALUES as readonly string[]).includes(value ?? '')
    ? (value as UrlSortValue)
    : DEFAULT_SORT;
}

/**
 * Build a URLSearchParams from filters + sort.
 * Empty arrays and the default sort are omitted to keep URLs clean.
 */
export function buildSearchParams(
  filters: SearchFilters,
  sortBy: ViewState['sortBy']
): URLSearchParams {
  const params = new URLSearchParams();

  const query = (filters.query ?? '').trim();
  if (query) {
    params.set(FILTER_TO_PARAM.query, query);
  }

  for (const key of ARRAY_FILTER_KEYS) {
    const arr = filters[key];
    if (arr && arr.length > 0) {
      params.set(FILTER_TO_PARAM[key], arr.join(','));
    }
  }

  const sort = whitelistSort(sortBy);
  if (sort !== DEFAULT_SORT) {
    params.set(SORT_PARAM, sort);
  }

  return params;
}

/**
 * Collect every valid value for a filter, including nested children for
 * hierarchical filters (culturalHeritage walks `options[].children` recursively)
 * and grade group ids (`groups[].id`).
 *
 * Tags assumption: W1c preserves only the exposed `FILTER_CONFIGS.tags.options`
 * values; revisit if C84 makes tags a free vocabulary (the deferred tags audit
 * is the reopen trigger).
 */
function validValuesForFilter(filterKey: keyof SearchFilters): Set<string> | null {
  const config = FILTER_CONFIGS[filterKey];
  if (!config) return null;

  const valid = new Set<string>();

  const addOptions = (options: typeof config.options): void => {
    for (const option of options) {
      valid.add(option.value);
      if (option.children && option.children.length > 0) {
        addOptions(option.children);
      }
    }
  };
  addOptions(config.options);

  if (config.groups) {
    for (const group of config.groups) {
      valid.add(group.id);
    }
  }

  return valid;
}

/**
 * Parse a URLSearchParams into a VALIDATED partial of SearchFilters plus a
 * whitelisted sortBy (default relevance). Unknown params, unknown filter
 * values, and out-of-whitelist sort values are dropped.
 */
export function parseSearchParams(params: URLSearchParams): {
  filters: Partial<SearchFilters>;
  sortBy: ViewState['sortBy'];
} {
  const filters: Partial<SearchFilters> = {};

  // query: free-form — trimmed + length-capped, never validated against options.
  const rawQuery = params.get(FILTER_TO_PARAM.query);
  if (rawQuery) {
    const trimmed = rawQuery.slice(0, MAX_PARAM_LENGTH).trim();
    if (trimmed) {
      filters.query = trimmed;
    }
  }

  for (const key of ARRAY_FILTER_KEYS) {
    const raw = params.get(FILTER_TO_PARAM[key]);
    if (!raw || raw.length > MAX_PARAM_LENGTH) continue;

    const valid = validValuesForFilter(key);
    if (!valid) continue;

    const values = raw
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean)
      .slice(0, MAX_ARRAY_LENGTH)
      .filter((v) => valid.has(v));

    if (values.length > 0) {
      filters[key] = values;
    }
  }

  return { filters, sortBy: whitelistSort(params.get(SORT_PARAM)) };
}

/**
 * The SINGLE stable serializer used on both sides of every loop-guard equality
 * (Task 4.2). Param keys are sorted, array values are sorted, the default sort
 * is omitted, and the query is normalized (trim) — so two states that represent
 * the same URL produce byte-identical strings:
 *   canonicalSearchString(a) === canonicalSearchString(b)  iff  a, b are the same URL state.
 */
export function canonicalSearchString(filters: SearchFilters, sortBy: ViewState['sortBy']): string {
  const params = buildSearchParams(filters, sortBy);

  // Sort array values deterministically (does not affect filter semantics —
  // multi-selects are order-insensitive sets).
  for (const key of ARRAY_FILTER_KEYS) {
    const value = params.get(FILTER_TO_PARAM[key]);
    if (value !== null) {
      const sorted = value.split(',').sort().join(',');
      params.set(FILTER_TO_PARAM[key], sorted);
    }
  }

  // Sort param KEYS so insertion order is irrelevant.
  const sortedParams = new URLSearchParams();
  for (const k of [...params.keys()].sort()) {
    sortedParams.set(k, params.get(k) ?? '');
  }

  return sortedParams.toString();
}
