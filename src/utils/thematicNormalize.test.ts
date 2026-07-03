import { describe, it, expect } from 'vitest';
import { normalizeThematicCategories } from './thematicNormalize';
import { lessonToReview } from './lessonToReviewMapper';
import { FILTER_CONFIGS } from './filterDefinitions';

// FP-02 Tier-1 write-site guard tests. The kebab twins below are the exact
// 7 variants measured on TEST/PROD (2026-07-03) — all mechanical derivations
// of the canonical labels in filterDefinitions.ts.

const CANONICAL = FILTER_CONFIGS.thematicCategories.options.map((o) => o.value);

describe('normalizeThematicCategories', () => {
  it('maps every kebab twin to its canonical label (the measured 7-variant set)', () => {
    expect(
      normalizeThematicCategories([
        'garden-basics',
        'plant-growth',
        'garden-communities',
        'ecosystems',
        'seed-to-table',
        'food-systems',
        'food-justice',
      ])
    ).toEqual([
      'Garden Basics',
      'Plant Growth',
      'Garden Communities',
      'Ecosystems',
      'Seed to Table',
      'Food Systems',
      'Food Justice',
    ]);
  });

  it('covers all canonical labels via the mechanical derivation (no hand-typed map drift)', () => {
    const kebabbed = CANONICAL.map((v) => v.toLowerCase().replace(/\s+/g, '-'));
    expect(normalizeThematicCategories(kebabbed)).toEqual(CANONICAL);
  });

  it('is the identity on already-canonical input (idempotent)', () => {
    expect(normalizeThematicCategories(CANONICAL)).toEqual(CANONICAL);
  });

  it('normalizes mixed arrays, preserving element order', () => {
    expect(normalizeThematicCategories(['Garden Basics', 'seed-to-table', 'Food Justice'])).toEqual(
      ['Garden Basics', 'Seed to Table', 'Food Justice']
    );
  });

  it('dedupes when a kebab twin and its canonical label co-occur, keeping first-seen order', () => {
    expect(normalizeThematicCategories(['ecosystems', 'Ecosystems', 'plant-growth'])).toEqual([
      'Ecosystems',
      'Plant Growth',
    ]);
  });

  it('passes unknown values through verbatim (repair layer, not enforcement)', () => {
    expect(normalizeThematicCategories(['Not A Theme', 'some-unknown-kebab'])).toEqual([
      'Not A Theme',
      'some-unknown-kebab',
    ]);
  });

  it('returns an empty array for empty input', () => {
    expect(normalizeThematicCategories([])).toEqual([]);
  });
});

describe('lessonToReview thematicCategories normalization (form-init ingress)', () => {
  it('pins kebab-in → canonical-out through the mapper', () => {
    expect(lessonToReview({ thematicCategories: ['seed-to-table', 'garden-basics'] })).toEqual({
      themes: ['Seed to Table', 'Garden Basics'],
    });
  });

  it('pins canonical passthrough (existing behavior unchanged)', () => {
    expect(lessonToReview({ thematicCategories: ['Plant Growth', 'Ecosystems'] })).toEqual({
      themes: ['Plant Growth', 'Ecosystems'],
    });
  });
});
