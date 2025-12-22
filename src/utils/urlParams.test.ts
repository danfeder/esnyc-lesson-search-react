import { describe, it, expect } from 'vitest';
import { filtersToUrlParams, parseUrlToFilters, hasFilters } from './urlParams';
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
