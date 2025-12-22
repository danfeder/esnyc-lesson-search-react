import { describe, it, expect } from 'vitest';
import {
  filtersToUrlParams,
  parseUrlToFilters,
  hasFilters,
  validateFilterValues,
} from './urlParams';
import type { SearchFilters } from '@/types';

const emptyFilters: SearchFilters = {
  query: '',
  gradeLevels: [],
  thematicCategories: [],
  seasonTiming: [],
  coreCompetencies: [],
  culturalHeritage: [],
  location: [],
  activityType: [],
  lessonFormat: '',
  academicIntegration: [],
  socialEmotionalLearning: [],
  cookingMethods: [],
};

describe('filtersToUrlParams', () => {
  it('returns empty params for default/empty filters', () => {
    const params = filtersToUrlParams(emptyFilters);
    expect(params.toString()).toBe('');
  });

  it('serializes query to q param', () => {
    const filters = { ...emptyFilters, query: 'cooking' };
    const params = filtersToUrlParams(filters);
    expect(params.get('q')).toBe('cooking');
  });

  it('serializes array filters as comma-separated values', () => {
    const filters = { ...emptyFilters, gradeLevels: ['3', '4', '5'] };
    const params = filtersToUrlParams(filters);
    expect(params.get('grades')).toBe('3,4,5');
  });

  it('serializes multiple filters', () => {
    const filters = {
      ...emptyFilters,
      query: 'salad',
      gradeLevels: ['K', '1'],
      activityType: ['garden-only'],
    };
    const params = filtersToUrlParams(filters);
    expect(params.get('q')).toBe('salad');
    expect(params.get('grades')).toBe('K,1');
    expect(params.get('activity')).toBe('garden-only');
  });

  it('omits empty array filters', () => {
    const filters = { ...emptyFilters, query: 'test', gradeLevels: [] };
    const params = filtersToUrlParams(filters);
    expect(params.get('q')).toBe('test');
    expect(params.has('grades')).toBe(false);
  });

  it('serializes lessonFormat as format param', () => {
    const filters = { ...emptyFilters, lessonFormat: 'recipe' };
    const params = filtersToUrlParams(filters);
    expect(params.get('format')).toBe('recipe');
  });

  it('handles special characters in query', () => {
    const filters = { ...emptyFilters, query: 'mac & cheese' };
    const params = filtersToUrlParams(filters);
    // URLSearchParams handles encoding
    expect(params.get('q')).toBe('mac & cheese');
  });
});

describe('parseUrlToFilters', () => {
  it('returns empty object for empty params', () => {
    const params = new URLSearchParams();
    const filters = parseUrlToFilters(params);
    expect(filters).toEqual({});
  });

  it('parses q param to query', () => {
    const params = new URLSearchParams('q=cooking');
    const filters = parseUrlToFilters(params);
    expect(filters.query).toBe('cooking');
  });

  it('parses comma-separated grades to array', () => {
    const params = new URLSearchParams('grades=3,4,5');
    const filters = parseUrlToFilters(params);
    expect(filters.gradeLevels).toEqual(['3', '4', '5']);
  });

  it('parses multiple params', () => {
    const params = new URLSearchParams('q=salad&grades=K,1&activity=garden-only');
    const filters = parseUrlToFilters(params);
    expect(filters.query).toBe('salad');
    expect(filters.gradeLevels).toEqual(['K', '1']);
    expect(filters.activityType).toEqual(['garden-only']);
  });

  it('ignores unknown params', () => {
    const params = new URLSearchParams('q=test&unknown=value');
    const filters = parseUrlToFilters(params);
    expect(filters.query).toBe('test');
    expect(Object.keys(filters)).toEqual(['query']);
  });

  it('handles URL-encoded values', () => {
    const params = new URLSearchParams('q=mac%20%26%20cheese');
    const filters = parseUrlToFilters(params);
    expect(filters.query).toBe('mac & cheese');
  });

  it('filters empty strings from arrays', () => {
    const params = new URLSearchParams('grades=3,,5');
    const filters = parseUrlToFilters(params);
    expect(filters.gradeLevels).toEqual(['3', '5']);
  });

  it('parses format param to lessonFormat', () => {
    const params = new URLSearchParams('format=recipe');
    const filters = parseUrlToFilters(params);
    expect(filters.lessonFormat).toBe('recipe');
  });
});

describe('hasFilters', () => {
  it('returns false for empty object', () => {
    expect(hasFilters({})).toBe(false);
  });

  it('returns false for empty values', () => {
    expect(hasFilters({ query: '', gradeLevels: [] })).toBe(false);
  });

  it('returns true for non-empty query', () => {
    expect(hasFilters({ query: 'test' })).toBe(true);
  });

  it('returns true for non-empty array', () => {
    expect(hasFilters({ gradeLevels: ['3'] })).toBe(true);
  });

  it('returns true if any filter has value', () => {
    expect(hasFilters({ query: '', gradeLevels: ['3'] })).toBe(true);
  });
});

describe('round-trip serialization', () => {
  it('preserves filters through serialize/parse cycle', () => {
    const original = {
      ...emptyFilters,
      query: 'fall cooking',
      gradeLevels: ['3', '4', '5'],
      seasonTiming: ['Fall', 'Winter'],
      activityType: ['cooking-only'],
    };

    const params = filtersToUrlParams(original);
    const parsed = parseUrlToFilters(params);

    expect(parsed.query).toBe(original.query);
    expect(parsed.gradeLevels).toEqual(original.gradeLevels);
    expect(parsed.seasonTiming).toEqual(original.seasonTiming);
    expect(parsed.activityType).toEqual(original.activityType);
  });
});

describe('validateFilterValues', () => {
  it('returns empty object for empty input', () => {
    expect(validateFilterValues({})).toEqual({});
  });

  it('preserves valid query (free-form text)', () => {
    const filters = { query: 'cooking lessons' };
    const validated = validateFilterValues(filters);
    expect(validated.query).toBe('cooking lessons');
  });

  it('trims whitespace from query', () => {
    const filters = { query: '  cooking  ' };
    const validated = validateFilterValues(filters);
    expect(validated.query).toBe('cooking');
  });

  it('removes empty query', () => {
    const filters = { query: '   ' };
    const validated = validateFilterValues(filters);
    expect(validated.query).toBeUndefined();
  });

  it('preserves valid grade levels', () => {
    const filters = { gradeLevels: ['3', '4', '5'] };
    const validated = validateFilterValues(filters);
    expect(validated.gradeLevels).toEqual(['3', '4', '5']);
  });

  it('removes invalid grade levels', () => {
    const filters = { gradeLevels: ['3', 'invalid', '99', '5'] };
    const validated = validateFilterValues(filters);
    expect(validated.gradeLevels).toEqual(['3', '5']);
  });

  it('removes array filter if all values are invalid', () => {
    const filters = { gradeLevels: ['invalid', 'hacked'] };
    const validated = validateFilterValues(filters);
    expect(validated.gradeLevels).toBeUndefined();
  });

  it('preserves valid season values', () => {
    const filters = { seasonTiming: ['Fall', 'Winter'] };
    const validated = validateFilterValues(filters);
    expect(validated.seasonTiming).toEqual(['Fall', 'Winter']);
  });

  it('removes invalid season values', () => {
    const filters = { seasonTiming: ['Fall', 'InvalidSeason', 'Winter'] };
    const validated = validateFilterValues(filters);
    expect(validated.seasonTiming).toEqual(['Fall', 'Winter']);
  });

  it('preserves valid activity type', () => {
    const filters = { activityType: ['cooking-only', 'garden-only'] };
    const validated = validateFilterValues(filters);
    expect(validated.activityType).toEqual(['cooking-only', 'garden-only']);
  });

  it('removes invalid activity type', () => {
    const filters = { activityType: ['cooking-only', 'hacked'] };
    const validated = validateFilterValues(filters);
    expect(validated.activityType).toEqual(['cooking-only']);
  });

  it('preserves valid lesson format (single value)', () => {
    const filters = { lessonFormat: 'standalone' };
    const validated = validateFilterValues(filters);
    expect(validated.lessonFormat).toBe('standalone');
  });

  it('removes invalid lesson format', () => {
    const filters = { lessonFormat: 'invalid-format' };
    const validated = validateFilterValues(filters);
    expect(validated.lessonFormat).toBeUndefined();
  });

  it('validates hierarchical cultural heritage values', () => {
    // Both parent and child values should be valid
    const filters = { culturalHeritage: ['asian', 'east-asian', 'invalid'] };
    const validated = validateFilterValues(filters);
    expect(validated.culturalHeritage).toEqual(['asian', 'east-asian']);
  });

  it('handles multiple filter types together', () => {
    const filters = {
      query: 'cooking',
      gradeLevels: ['3', 'invalid'],
      seasonTiming: ['Fall'],
      activityType: ['invalid'],
      lessonFormat: 'standalone',
    };
    const validated = validateFilterValues(filters);
    expect(validated).toEqual({
      query: 'cooking',
      gradeLevels: ['3'],
      seasonTiming: ['Fall'],
      lessonFormat: 'standalone',
    });
  });

  it('allows grade group IDs as valid values', () => {
    const filters = { gradeLevels: ['early-childhood', '3'] };
    const validated = validateFilterValues(filters);
    expect(validated.gradeLevels).toEqual(['early-childhood', '3']);
  });
});
