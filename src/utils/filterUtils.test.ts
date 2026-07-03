import { describe, it, expect } from 'vitest';
import { buildCultureLabelMap } from './filterUtils';
import { FILTER_CONFIGS } from './filterDefinitions';

describe('filterUtils — recursive cultural-heritage helpers', () => {
  // The heritage tree is now 3-4 tiers deep (Americas › Latin American ›
  // Mexican). This helper must traverse ALL descendants, not just the
  // direct children the old 2-level consumers assumed.

  it('buildCultureLabelMap resolves a deeply-nested (grandchild) value', () => {
    const map = buildCultureLabelMap();
    // Mexican lives two levels below the "Americas" top region:
    //   americas › latin-american › mexican
    // A 1-level flatten would miss it.
    expect(map['mexican']).toBe('Mexican');
  });

  it('buildCultureLabelMap resolves a third-tier East Asian leaf', () => {
    const map = buildCultureLabelMap();
    // asian › east-asian › chinese
    expect(map['chinese']).toBe('Chinese');
  });

  it('buildCultureLabelMap still resolves top-level and direct-child values', () => {
    const map = buildCultureLabelMap();
    expect(map['americas']).toBe('Americas'); // top region
    expect(map['caribbean']).toBe('Caribbean'); // direct child of a top region
  });

  it('buildCultureLabelMap covers every node in the heritage option tree', () => {
    const map = buildCultureLabelMap();
    const countNodes = (opts: { value: string; children?: unknown[] }[]): number =>
      opts.reduce((acc, o) => acc + 1 + countNodes((o.children ?? []) as typeof opts), 0);
    const total = countNodes(FILTER_CONFIGS.culturalHeritage.options);
    expect(Object.keys(map).length).toBe(total);
  });
});
