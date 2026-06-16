import { describe, it, expect } from 'vitest';
import {
  formatCategoryName,
  getCategoryIcon,
  buildCultureLabelMap,
  getCultureDescendantValues,
} from './filterUtils';
import { FILTER_CONFIGS } from './filterDefinitions';

describe('filterUtils — display helpers', () => {
  it('formatCategoryName maps culturalHeritage to "Culture"', () => {
    expect(formatCategoryName('culturalHeritage')).toBe('Culture');
  });

  it('getCategoryIcon returns the globe for culturalHeritage', () => {
    expect(getCategoryIcon('culturalHeritage')).toBe('🌍');
  });
});

describe('filterUtils — recursive cultural-heritage helpers', () => {
  // The heritage tree is now 3-4 tiers deep (Americas › Latin American ›
  // Mexican). These helpers must traverse ALL descendants, not just the
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

  it('getCultureDescendantValues returns ALL transitive descendants of a top region', () => {
    // Selecting "asian" should yield every descendant key at any depth,
    // e.g. the third-tier leaf "chinese" (asian › east-asian › chinese).
    const descendants = getCultureDescendantValues('asian');
    expect(descendants).toContain('east-asian'); // direct child
    expect(descendants).toContain('chinese'); // grandchild (3rd tier)
    expect(descendants).toContain('uzbek'); // central-asian › uzbek
    // The node itself is NOT in its own descendant list.
    expect(descendants).not.toContain('asian');
  });

  it('getCultureDescendantValues returns descendants of a mid-tree node', () => {
    // latin-american › mexican, puerto-rican
    const descendants = getCultureDescendantValues('latin-american');
    expect(descendants).toEqual(expect.arrayContaining(['mexican', 'puerto-rican']));
  });

  it('getCultureDescendantValues returns [] for a leaf node', () => {
    expect(getCultureDescendantValues('mexican')).toEqual([]);
  });

  it('getCultureDescendantValues returns [] for an unknown value', () => {
    expect(getCultureDescendantValues('not-a-real-culture')).toEqual([]);
  });
});
