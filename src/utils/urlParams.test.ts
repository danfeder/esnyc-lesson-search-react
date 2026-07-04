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
  mainIngredients: [],
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

  it('caps the query at MAX_PARAM_LENGTH on build (outbound symmetry with parse)', () => {
    const longQuery = 'a'.repeat(MAX_PARAM_LENGTH + 100);
    const params = buildSearchParams({ ...emptyFilters, query: longQuery }, 'relevance');
    expect(params.get('q')!.length).toBe(MAX_PARAM_LENGTH);
  });

  it('caps array filters at MAX_ARRAY_LENGTH on build (outbound symmetry with parse)', () => {
    const many = Array.from({ length: MAX_ARRAY_LENGTH + 10 }, (_, i) => `v${i}`);
    const params = buildSearchParams({ ...emptyFilters, gradeLevels: many }, 'relevance');
    expect(params.get('grades')!.split(',').length).toBe(MAX_ARRAY_LENGTH);
  });

  it('omits the default sort (relevance) from the URL', () => {
    const params = buildSearchParams(emptyFilters, 'relevance');
    expect(params.has('sort')).toBe(false);
  });

  it('serializes a non-default whitelisted sort under the sort param', () => {
    expect(buildSearchParams(emptyFilters, 'title').get('sort')).toBe('title');
    expect(buildSearchParams(emptyFilters, 'modified').get('sort')).toBe('modified');
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

  it('de-duplicates repeated values within an array param (filter arrays are sets)', () => {
    // A hand-edited/shared URL can carry duplicates; parse must treat filter
    // arrays as sets (as canonicalSearchString already assumes) so the active-pill
    // renderer doesn't get duplicate React keys and the RPC isn't sent redundant
    // values. The UI's toggleFilter can't produce dupes, but a crafted URL can.
    const { filters } = parseSearchParams(new URLSearchParams('grades=3,3,5,3'));
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

  it('folds the legacy coreCompetencies value on parse (FP5 Brief 1 rename)', () => {
    // Old bookmarked/shared links carried 'Culturally Responsive Education' in the
    // `skills` param; after the rename that value is no longer a valid option, so
    // without the fold it would be silently dropped. Fold → 'Cultural Diversity'.
    const params = new URLSearchParams();
    params.set('skills', 'Culturally Responsive Education');
    const { filters } = parseSearchParams(params);
    expect(filters.coreCompetencies).toEqual(['Cultural Diversity']);
  });

  it('folds the legacy value alongside a still-valid one, de-duplicating', () => {
    const params = new URLSearchParams();
    // Legacy value + the new canonical value → both resolve to 'Cultural Diversity',
    // and the parse-time Set de-dupes them to a single entry.
    params.set('skills', ['Culturally Responsive Education', 'Cultural Diversity'].join(','));
    const { filters } = parseSearchParams(params);
    expect(filters.coreCompetencies).toEqual(['Cultural Diversity']);
  });

  it('the fold is scoped to coreCompetencies (does not leak to other facets)', () => {
    // The legacy string is meaningless for e.g. thematicCategories — it must be
    // dropped there, not folded.
    const params = new URLSearchParams();
    params.set('themes', 'Culturally Responsive Education');
    const { filters } = parseSearchParams(params);
    expect(filters.thematicCategories).toBeUndefined();
  });

  it('drops a grade group id (only individual grade values are URL-valid)', () => {
    // The sidebar only emits individual grades (K/1/3…); the RPC matches lessons
    // by those, so a group id (lower-elementary) would silently return zero
    // results. We drop it on parse → graceful "no grade filter" instead.
    const { filters } = parseSearchParams(new URLSearchParams('grades=lower-elementary'));
    expect(filters.gradeLevels).toBeUndefined();
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
      location: ['Indoor'],
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

describe('FP-18 — location accepts only the search options (Indoor/Outdoor), drops Both', () => {
  it('drops a stale/shared ?loc=Both rather than storing a phantom filter', () => {
    const { filters } = parseSearchParams(new URLSearchParams('loc=Both'));
    expect(filters.location).toBeUndefined();
  });

  it('keeps Indoor/Outdoor but strips a co-listed Both', () => {
    const { filters } = parseSearchParams(new URLSearchParams('loc=Indoor,Both,Outdoor'));
    expect(filters.location).toEqual(['Indoor', 'Outdoor']);
  });

  it('accepts a plain Indoor selection', () => {
    const { filters } = parseSearchParams(new URLSearchParams('loc=Indoor'));
    expect(filters.location).toEqual(['Indoor']);
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
  // Collect every option value (recursively) + grade group ids across FILTER_CONFIGS.
  const allValues: string[] = [];
  const walk = (options: Array<{ value: string; children?: unknown }>) => {
    for (const opt of options) {
      allValues.push(opt.value);
      if (Array.isArray((opt as { children?: unknown[] }).children)) {
        walk((opt as { children: Array<{ value: string }> }).children);
      }
    }
  };
  for (const key of Object.keys(FILTER_CONFIGS)) {
    const config = FILTER_CONFIGS[key];
    walk(config.options as Array<{ value: string; children?: unknown }>);
    if (config.groups) for (const g of config.groups) allValues.push(g.id);
  }

  // Array params are comma-joined; commas inside a value are escaped to `%2C`
  // (Brief 5 — the `Squash, cucumbers & melons` ingredient group). The escape is
  // only unambiguous if no value contains the literal sentinel `%2C`.
  it('no FILTER_CONFIGS value contains the %2C escape sentinel literally', () => {
    const offenders = allValues.filter((v) => v.includes('%2C'));
    expect(offenders).toEqual([]);
  });

  // Any comma-containing value MUST survive a build → parse round-trip intact
  // (this is what the pre-Brief-5 "no commas allowed" invariant used to guarantee
  // by avoidance; now the escape guarantees it by construction).
  it('comma-containing FILTER_CONFIGS values round-trip through the URL', () => {
    const commaValues = allValues.filter((v) => v.includes(','));
    // Sanity: the known Brief-5 case is present (guards against silent vocab drift).
    expect(commaValues).toContain('Squash, cucumbers & melons');
    for (const value of commaValues) {
      // Find the filter key that owns this value so we build the right param.
      const ownerKey = (Object.keys(FILTER_CONFIGS) as Array<keyof typeof FILTER_CONFIGS>).find(
        (k) => {
          let found = false;
          const scan = (opts: Array<{ value: string; children?: unknown }>) => {
            for (const o of opts) {
              if (o.value === value) found = true;
              if (Array.isArray((o as { children?: unknown[] }).children)) {
                scan((o as { children: Array<{ value: string }> }).children);
              }
            }
          };
          scan(FILTER_CONFIGS[k].options as Array<{ value: string; children?: unknown }>);
          return found;
        }
      );
      expect(ownerKey).toBeDefined();
      const filters = { ...emptyFilters, [ownerKey as keyof SearchFilters]: [value] };
      const params = buildSearchParams(filters, 'relevance');
      const round = parseSearchParams(new URLSearchParams(params.toString()));
      expect(round.filters[ownerKey as keyof SearchFilters]).toEqual([value]);
    }
  });

  it('exposes the expected sort whitelist constant', () => {
    expect(URL_SORT_VALUES).toEqual(['relevance', 'title', 'modified']);
  });
});
