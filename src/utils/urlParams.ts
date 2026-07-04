import type { SearchFilters, ViewState } from '@/types';
import { FILTER_CONFIGS, SEARCH_LOCATION_OPTIONS } from '@/utils/filterDefinitions';

/**
 * Pure (no-React) serialize / parse / validate for the public search URL
 * schema: query + 10 filters + sort. Written fresh against the current
 * `SearchFilters` shape per design §4 Q6/Q7
 * (2026-06-20-theme-b-public-ux-design.md). The vestigial "Lesson Type" (tags)
 * facet was retired in W1c, so it is intentionally NOT part of the URL schema.
 *
 * Schema (param ↔ filter):
 *   q → query, grades → gradeLevels, themes → thematicCategories,
 *   season → seasonTiming, skills → coreCompetencies, culture → culturalHeritage,
 *   loc → location, activity → activityType, ing → mainIngredients,
 *   academic → academicIntegration, sel → socialEmotionalLearning,
 *   cooking → cookingMethods, plus sort → sortBy.
 *
 * `ing` (Main Ingredients) is a group→specific tree; `validValuesForFilter`
 * walks `children` recursively, so both group and specific values validate for
 * free. F5 cap note: all 70 ingredient values joined = 749 chars < the 1000-char
 * MAX_PARAM_LENGTH inbound guard (verified), so the outbound/inbound cap
 * asymmetry is unreachable for this vocab — parse never silently drops `ing`.
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
// `location` renders as multi-select checkboxes in the search UI (FP-18) and is
// typed/stored as string[] in SearchFilters, so it serializes like any other
// array filter.
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
  mainIngredients: 'ing',
  academicIntegration: 'academic',
  socialEmotionalLearning: 'sel',
  cookingMethods: 'cooking',
};

const ARRAY_FILTER_KEYS = (Object.keys(FILTER_TO_PARAM) as Array<keyof SearchFilters>).filter(
  (k): k is ArrayFilterKey => k !== 'query'
);

const SORT_PARAM = 'sort';

// Array params are comma-JOINED, but one frozen vocab value —
// `Squash, cucumbers & melons` (a Main Ingredients group, Brief 5) — itself
// contains a comma, which would shatter on `split(',')`. Escape a literal comma
// inside each value to `%2C` before joining and restore it after splitting. The
// sentinel `%2C` never occurs literally in any canonical value (drift-locked by a
// urlParams test), and comma-FREE values are byte-identical to the pre-Brief-5
// scheme, so existing shared/bookmarked links are unaffected. (URLSearchParams
// round-trips any string faithfully, so this app-level escape survives its own
// encode/decode layer intact.)
const COMMA_SENTINEL = '%2C';
const encodeArrayValue = (v: string): string => v.split(',').join(COMMA_SENTINEL);
const decodeArrayValue = (v: string): string => v.split(COMMA_SENTINEL).join(',');

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

  // Apply the same caps on the OUTBOUND path as parseSearchParams does inbound,
  // so the app can never emit a URL longer than it will accept on read (keeps
  // shared links bounded for pathological input).
  const query = (filters.query ?? '').slice(0, MAX_PARAM_LENGTH).trim();
  if (query) {
    params.set(FILTER_TO_PARAM.query, query);
  }

  for (const key of ARRAY_FILTER_KEYS) {
    const arr = filters[key];
    if (arr && arr.length > 0) {
      params.set(
        FILTER_TO_PARAM[key],
        arr.slice(0, MAX_ARRAY_LENGTH).map(encodeArrayValue).join(',')
      );
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
 * hierarchical filters (culturalHeritage walks `options[].children` recursively).
 *
 * Grade group ids (`gradeLevels.groups[].id`, e.g. `lower-elementary`) are
 * deliberately NOT included: the sidebar only ever emits individual grade
 * option values (K/1/3…) into `filters.gradeLevels`, and the search RPC matches
 * lessons by those individual grades — a group id would match nothing. Accepting
 * one from a hand-crafted URL would store a valid-looking value that silently
 * returns zero results, so we drop it on parse (→ graceful "no grade filter").
 */
function validValuesForFilter(filterKey: keyof SearchFilters): Set<string> | null {
  // FP-18: the public search facet accepts only Indoor/Outdoor — `Both` is not a
  // search option (search folds it into both server-side), so a stale or shared
  // `?loc=Both` is dropped here rather than becoming a phantom filter chip.
  if (filterKey === 'location') {
    return new Set(SEARCH_LOCATION_OPTIONS.map((o) => o.value));
  }

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

    // De-duplicate: filter arrays are order-insensitive sets (canonicalSearchString
    // relies on this), so a crafted/shared URL like `?grades=3,3` must not yield a
    // duplicated entry (which would produce duplicate React keys in the active-pill
    // renderer and redundant RPC values). Set preserves first-occurrence order.
    const values = [
      ...new Set(
        raw
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean)
          .slice(0, MAX_ARRAY_LENGTH)
          .map(decodeArrayValue)
          .filter((v) => valid.has(v))
      ),
    ];

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
