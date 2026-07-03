import { describe, it, expect } from 'vitest';
import { buildCultureLabelMap, collapseHeritageToLeaves, fieldValueLabeler } from './filterUtils';
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

describe('collapseHeritageToLeaves (FP-16 — drop ancestors of a co-tagged leaf)', () => {
  it('collapses the owner-reported 3-deep chain to just the leaf', () => {
    // asian › east-asian › chinese — Asian and East Asian are both proper
    // ancestors of Chinese, so only Chinese survives.
    expect(collapseHeritageToLeaves(['Asian', 'East Asian', 'Chinese'])).toEqual(['Chinese']);
  });

  it('works on stored kebab slugs too (normalizes before comparing)', () => {
    expect(collapseHeritageToLeaves(['asian', 'east-asian', 'chinese'])).toEqual(['chinese']);
  });

  it('keeps sibling leaves that share no ancestry line', () => {
    // chinese (asian) and mexican (americas) are unrelated — both are leaves.
    expect(collapseHeritageToLeaves(['Chinese', 'Mexican'])).toEqual(['Chinese', 'Mexican']);
  });

  it('drops only the ancestor when a parent is co-tagged with one child', () => {
    // asian is a proper ancestor of chinese; south-asian is not tagged, so
    // Chinese (not the broader Asian) is what remains.
    expect(collapseHeritageToLeaves(['Asian', 'Chinese'])).toEqual(['Chinese']);
  });

  it('preserves order and de-duplicates slug-equal values', () => {
    expect(collapseHeritageToLeaves(['Chinese', 'chinese'])).toEqual(['Chinese']);
  });

  it('passes unknown values through untouched', () => {
    expect(collapseHeritageToLeaves(['Klingon'])).toEqual(['Klingon']);
  });

  it('returns [] for an empty array', () => {
    expect(collapseHeritageToLeaves([])).toEqual([]);
  });
});

describe('fieldValueLabeler (FP-16 — stored value → display label)', () => {
  it('maps a kebab Cooking Methods value to its friendly label', () => {
    const label = fieldValueLabeler('cookingMethods');
    expect(label('basic-prep')).toBe('Basic prep');
    expect(label('stovetop')).toBe('Stovetop');
  });

  it('passes an unknown value through verbatim', () => {
    const label = fieldValueLabeler('cookingMethods');
    expect(label('sous-vide')).toBe('sous-vide');
  });

  it('recurses into hierarchical (children) options', () => {
    const label = fieldValueLabeler('culturalHeritage');
    expect(label('chinese')).toBe('Chinese'); // asian › east-asian › chinese
  });
});
