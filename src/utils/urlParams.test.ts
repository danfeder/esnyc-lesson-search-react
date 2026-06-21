import { describe, it, expect } from 'vitest';
import {
  buildSearchParams,
  parseSearchParams,
  canonicalSearchString,
  URL_SORT_VALUES,
  MAX_PARAM_LENGTH,
  MAX_ARRAY_LENGTH,
} from './urlParams';
import type { SearchFilters, ViewState } from '@/types';
import { FILTER_CONFIGS } from '@/utils/filterDefinitions';

const emptyFilters: SearchFilters = {
  query: '',
  gradeLevels: [],
  thematicCategories: [],
  seasonTiming: [],
  coreCompetencies: [],
  culturalHeritage: [],
  location: [],
  activityType: [],
  academicIntegration: [],
  socialEmotionalLearning: [],
  cookingMethods: [],
};

type SortBy = ViewState['sortBy'];

describe('buildSearchParams', () => {
  it('produces a clean (empty) URL for empty filters + default sort', () => {
    const params = buildSearchParams(emptyFilters, 'relevance');
    expect(params.toString()).toBe('');
  });

  it('serializes query under the q param (trimmed)', () => {
    const params = buildSearchParams({ ...emptyFilters, query: '  cooking  ' }, 'relevance');
    expect(params.get('q')).toBe('cooking');
  });

  it('serializes array filters as comma-joined values under short param names', () => {
    const params = buildSearchParams(
      {
        ...emptyFilters,
        gradeLevels: ['3', '4', '5'],
        thematicCategories: ['Garden Basics'],
        seasonTiming: ['Fall', 'Winter'],
        coreCompetencies: ['Social Justice'],
        culturalHeritage: ['americas'],
        location: ['Indoor'],
        activityType: ['cooking-only'],
        academicIntegration: ['Math'],
        socialEmotionalLearning: ['Self-awareness'],
        cookingMethods: ['stovetop'],
      },
      'relevance'
    );
    expect(params.get('grades')).toBe('3,4,5');
    expect(params.get('themes')).toBe('Garden Basics');
    expect(params.get('season')).toBe('Fall,Winter');
    expect(params.get('skills')).toBe('Social Justice');
    expect(params.get('culture')).toBe('americas');
    expect(params.get('loc')).toBe('Indoor');
    expect(params.get('activity')).toBe('cooking-only');
    expect(params.get('academic')).toBe('Math');
    expect(params.get('sel')).toBe('Self-awareness');
    expect(params.get('cooking')).toBe('stovetop');
  });

  it('omits empty array filters', () => {
    const params = buildSearchParams({ ...emptyFilters, query: 'x', gradeLevels: [] }, 'relevance');
    expect(params.get('q')).toBe('x');
    expect(params.has('grades')).toBe(false);
  });

  it('omits the default sort (relevance) from the URL', () => {
    const params = buildSearchParams(emptyFilters, 'relevance');
    expect(params.has('sort')).toBe(false);
  });

  it('serializes a non-default whitelisted sort under the sort param', () => {
    expect(buildSearchParams(emptyFilters, 'title').get('sort')).toBe('title');
    expect(buildSearchParams(emptyFilters, 'modified').get('sort')).toBe('modified');
  });

  it('omits a non-whitelisted sort value (grade/confidence) from the URL', () => {
    expect(buildSearchParams(emptyFilters, 'grade').has('sort')).toBe(false);
    expect(buildSearchParams(emptyFilters, 'confidence').has('sort')).toBe(false);
  });

  it('never emits a lessonFormat/format param', () => {
    const params = buildSearchParams({ ...emptyFilters, query: 'x', gradeLevels: ['3'] }, 'title');
    expect(params.has('format')).toBe(false);
    expect(params.has('lessonFormat')).toBe(false);
  });

  it('never emits a tags param (retired Lesson Type facet)', () => {
    // The vestigial "Lesson Type" (tags) facet was retired in W1c; the URL
    // schema must never serialize it even if a stale value is somehow present.
    const params = buildSearchParams(
      { ...emptyFilters, query: 'x', gradeLevels: ['3'] } as SearchFilters,
      'title'
    );
    expect(params.has('tags')).toBe(false);
  });
});

describe('parseSearchParams', () => {
  it('returns empty filters + relevance for empty params', () => {
    const { filters, sortBy } = parseSearchParams(new URLSearchParams());
    expect(filters).toEqual({});
    expect(sortBy).toBe('relevance');
  });

  it('parses q into a trimmed query', () => {
    const { filters } = parseSearchParams(new URLSearchParams('q=cooking'));
    expect(filters.query).toBe('cooking');
  });

  it('parses comma-joined arrays back to arrays (trim + drop-empty)', () => {
    const { filters } = parseSearchParams(new URLSearchParams('grades=3,,5'));
    expect(filters.gradeLevels).toEqual(['3', '5']);
  });

  it('drops unknown filter values not in FILTER_CONFIGS', () => {
    const { filters } = parseSearchParams(new URLSearchParams('grades=3,notagrade,5'));
    expect(filters.gradeLevels).toEqual(['3', '5']);
  });

  it('drops a whole filter that has no valid values', () => {
    const { filters } = parseSearchParams(new URLSearchParams('activity=garbage'));
    expect(filters.activityType).toBeUndefined();
  });

  it('ignores unknown params entirely', () => {
    const { filters } = parseSearchParams(new URLSearchParams('q=test&bogus=1&format=recipe'));
    expect(filters.query).toBe('test');
    expect(Object.keys(filters)).toEqual(['query']);
  });

  it('ignores a stale tags param (retired Lesson Type facet)', () => {
    // `tags` is no longer part of the URL schema; a bookmarked link carrying it
    // must be treated as an unknown param and dropped (no `tags` key on output).
    const { filters } = parseSearchParams(new URLSearchParams('q=test&tags=orientation'));
    expect(filters.query).toBe('test');
    expect(Object.keys(filters)).toEqual(['query']);
  });

  it('accepts a hierarchical heritage parent value', () => {
    const { filters } = parseSearchParams(new URLSearchParams('culture=americas'));
    expect(filters.culturalHeritage).toEqual(['americas']);
  });

  it('accepts a deeply-nested hierarchical heritage child value', () => {
    // americas > latin-american > mexican (a leaf child several tiers deep)
    const { filters } = parseSearchParams(new URLSearchParams('culture=mexican'));
    expect(filters.culturalHeritage).toEqual(['mexican']);
  });

  it('accepts a grade group id as a valid grade value', () => {
    const { filters } = parseSearchParams(new URLSearchParams('grades=lower-elementary'));
    expect(filters.gradeLevels).toEqual(['lower-elementary']);
  });

  it('caps the query at MAX_PARAM_LENGTH characters', () => {
    const long = 'a'.repeat(MAX_PARAM_LENGTH + 500);
    const params = new URLSearchParams();
    params.set('q', long);
    const { filters } = parseSearchParams(params);
    expect(filters.query?.length).toBe(MAX_PARAM_LENGTH);
  });

  it('caps array length at MAX_ARRAY_LENGTH entries', () => {
    // Build MAX_ARRAY_LENGTH + 10 valid-shaped (will pass validation if all '3')
    const values = Array.from({ length: MAX_ARRAY_LENGTH + 10 }, () => '3');
    const params = new URLSearchParams();
    params.set('grades', values.join(','));
    const { filters } = parseSearchParams(params);
    expect(filters.gradeLevels?.length ?? 0).toBeLessThanOrEqual(MAX_ARRAY_LENGTH);
  });

  it('whitelists the sort param: relevance default', () => {
    expect(parseSearchParams(new URLSearchParams()).sortBy).toBe('relevance');
    expect(parseSearchParams(new URLSearchParams('sort=relevance')).sortBy).toBe('relevance');
  });

  it('whitelists the sort param: title/modified kept', () => {
    expect(parseSearchParams(new URLSearchParams('sort=title')).sortBy).toBe('title');
    expect(parseSearchParams(new URLSearchParams('sort=modified')).sortBy).toBe('modified');
  });

  it('whitelists the sort param: grade/confidence/junk fall back to relevance', () => {
    expect(parseSearchParams(new URLSearchParams('sort=grade')).sortBy).toBe('relevance');
    expect(parseSearchParams(new URLSearchParams('sort=confidence')).sortBy).toBe('relevance');
    expect(parseSearchParams(new URLSearchParams('sort=banana')).sortBy).toBe('relevance');
  });
});

describe('round-trip identity', () => {
  it('preserves valid filters + sort through build → parse', () => {
    const original: SearchFilters = {
      ...emptyFilters,
      query: 'fall cooking',
      gradeLevels: ['3', '4', '5'],
      seasonTiming: ['Fall', 'Winter'],
      activityType: ['cooking-only'],
      culturalHeritage: ['americas', 'mexican'],
      location: ['Both'],
    };
    const sortBy: SortBy = 'title';

    const { filters, sortBy: parsedSort } = parseSearchParams(buildSearchParams(original, sortBy));

    expect(filters.query).toBe(original.query);
    expect(filters.gradeLevels).toEqual(original.gradeLevels);
    expect(filters.seasonTiming).toEqual(original.seasonTiming);
    expect(filters.activityType).toEqual(original.activityType);
    expect(filters.culturalHeritage).toEqual(original.culturalHeritage);
    expect(filters.location).toEqual(original.location);
    expect(parsedSort).toBe(sortBy);
  });
});

describe('canonicalSearchString', () => {
  it('is stable regardless of filter-array internal order', () => {
    const a = canonicalSearchString({ ...emptyFilters, gradeLevels: ['3', '4', '5'] }, 'relevance');
    const b = canonicalSearchString({ ...emptyFilters, gradeLevels: ['5', '3', '4'] }, 'relevance');
    expect(a).toBe(b);
  });

  it('is stable regardless of which filters were set first (sorted param keys)', () => {
    const a = canonicalSearchString(
      { ...emptyFilters, query: 'x', gradeLevels: ['3'], seasonTiming: ['Fall'] },
      'relevance'
    );
    const b = canonicalSearchString(
      { ...emptyFilters, seasonTiming: ['Fall'], query: 'x', gradeLevels: ['3'] },
      'relevance'
    );
    expect(a).toBe(b);
  });

  it('treats sort=relevance (default) the same as omitting sort', () => {
    // relevance is the default and must be omitted, so an explicit relevance
    // produces the same canonical string as the default.
    const withRelevance = canonicalSearchString({ ...emptyFilters, query: 'x' }, 'relevance');
    const reparsed = parseSearchParams(
      buildSearchParams({ ...emptyFilters, query: 'x' }, 'relevance')
    );
    const fromReparse = canonicalSearchString(
      { ...emptyFilters, ...reparsed.filters },
      reparsed.sortBy
    );
    expect(withRelevance).toBe(fromReparse);
    expect(withRelevance.includes('sort=relevance')).toBe(false);
  });

  it('is referentially consistent: same state → same string via two construction paths', () => {
    const direct = canonicalSearchString(
      { ...emptyFilters, query: 'tomato', activityType: ['cooking-only'] },
      'title'
    );
    // Build a URL, parse it, then canonicalize the parsed result — must match.
    const parsed = parseSearchParams(
      buildSearchParams(
        { ...emptyFilters, query: 'tomato', activityType: ['cooking-only'] },
        'title'
      )
    );
    const viaParse = canonicalSearchString({ ...emptyFilters, ...parsed.filters }, parsed.sortBy);
    expect(viaParse).toBe(direct);
  });

  it('is invariant to space encoding (%20 vs +) in the query', () => {
    // Both URLSearchParams strings decode to the same query "mac cheese".
    const fromPlus = parseSearchParams(new URLSearchParams('q=mac+cheese'));
    const fromPct = parseSearchParams(new URLSearchParams('q=mac%20cheese'));
    const a = canonicalSearchString({ ...emptyFilters, ...fromPlus.filters }, fromPlus.sortBy);
    const b = canonicalSearchString({ ...emptyFilters, ...fromPct.filters }, fromPct.sortBy);
    expect(a).toBe(b);
  });

  it('handles a unicode query value deterministically', () => {
    const a = canonicalSearchString({ ...emptyFilters, query: 'piñata café' }, 'relevance');
    const b = canonicalSearchString({ ...emptyFilters, query: 'piñata café' }, 'relevance');
    expect(a).toBe(b);
    expect(a.length).toBeGreaterThan(0);
  });
});

describe('comma-safety invariant', () => {
  it('no current FILTER_CONFIGS option value (recursive) contains a comma', () => {
    const offenders: string[] = [];
    const walk = (options: Array<{ value: string; children?: unknown }>) => {
      for (const opt of options) {
        if (opt.value.includes(',')) offenders.push(opt.value);
        if (Array.isArray((opt as { children?: unknown[] }).children)) {
          walk((opt as { children: Array<{ value: string }> }).children);
        }
      }
    };
    for (const key of Object.keys(FILTER_CONFIGS)) {
      const config = FILTER_CONFIGS[key];
      walk(config.options as Array<{ value: string; children?: unknown }>);
      if (config.groups) {
        for (const g of config.groups) {
          if (g.id.includes(',')) offenders.push(g.id);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('exposes the expected sort whitelist constant', () => {
    expect(URL_SORT_VALUES).toEqual(['relevance', 'title', 'modified']);
  });
});
