/**
 * Unit tests for the C02 anchored verify-and-diff seam (design §3·PIVOT
 * D-P4/D-P5/D-P9 / impl P2′.2).
 *
 * This module is the C02 analog of `doc-surfaces.ts`: a pure render/append
 * helper that appends the lesson's CURRENT tags — annotated with the floor's
 * provenance (D-P5) — to the user turn, plus the effective-input identity hash
 * (D-P9) that an anchor change must invalidate. It reads the provenance FIELD
 * off `applyC02Floor`'s return (P2′.1); it never re-derives provenance.
 */
import { describe, expect, it } from 'vitest';

import {
  C02_RECONCILE_POLICY_ID,
  appendC02Anchor,
  c02ManifestVersion,
  computeEffectiveInputHash,
  renderC02AnchorBlock,
  type C02EffectiveInput,
} from './c02-anchor';
import type { C02FlooredTags } from './c02-floor';
import type { C02Manifest } from './vocab';

const MINI_MANIFEST: C02Manifest = {
  provenance: { note: 'synthetic test manifest' },
  cookingSkills: ['Boiling & simmering', 'Baking'],
  mainIngredientsGroups: ['Nightshades', 'Fruits'],
  mainIngredientsSpecifics: [
    { value: 'Tomatoes', parent: 'Nightshades' },
    { value: 'Apples', parent: 'Fruits' },
    { value: 'Celery', parent: null },
  ],
};

const SAMPLE_FLOORED: C02FlooredTags = {
  cooking: [
    { value: 'Boiling & simmering', provenance: 'alias-fold' },
    { value: 'Baking', provenance: 'exact-canonical' },
  ],
  ingredients: [
    { value: 'Tomatoes', provenance: 'exact-canonical' },
    { value: 'Nightshades', provenance: 'parent-derived' },
  ],
};

// ---------------------------------------------------------------------------
// renderC02AnchorBlock — provenance-annotated anchor
// ---------------------------------------------------------------------------

describe('renderC02AnchorBlock', () => {
  it('renders both fields with each value annotated by its provenance', () => {
    const block = renderC02AnchorBlock(SAMPLE_FLOORED);
    // Every floored value appears verbatim.
    expect(block).toContain('Boiling & simmering');
    expect(block).toContain('Baking');
    expect(block).toContain('Tomatoes');
    expect(block).toContain('Nightshades');
    // Each value carries its provenance label.
    expect(block).toContain('alias-fold');
    expect(block).toContain('exact-canonical');
    expect(block).toContain('parent-derived');
  });

  it('labels the two field sections so the model can KEEP/DROP per field', () => {
    const block = renderC02AnchorBlock(SAMPLE_FLOORED);
    expect(block).toContain('cooking_skills');
    expect(block).toContain('main_ingredients');
  });

  it('renders an empty-field section explicitly (no current tags) rather than omitting it', () => {
    const block = renderC02AnchorBlock({ cooking: [], ingredients: [] });
    expect(block).toContain('cooking_skills');
    expect(block).toContain('main_ingredients');
    // No stray provenance labels when both fields are empty.
    expect(block).not.toContain('exact-canonical');
    expect(block).not.toContain('alias-fold');
    expect(block).not.toContain('parent-derived');
  });
});

// ---------------------------------------------------------------------------
// appendC02Anchor — mirrors appendDocSurfaces
// ---------------------------------------------------------------------------

describe('appendC02Anchor', () => {
  it('appends the anchor block after the body (body stays the prefix)', () => {
    const out = appendC02Anchor('LESSON BODY HERE', SAMPLE_FLOORED);
    expect(out.startsWith('LESSON BODY HERE')).toBe(true);
    expect(out).toContain('Boiling & simmering');
    expect(out.length).toBeGreaterThan('LESSON BODY HERE'.length);
  });

  it('still appends the (empty) anchor sections when there are no current tags', () => {
    // The anchor is always present so the model knows the field exists and is
    // currently empty (an ADD-only situation), distinct from "field omitted".
    const out = appendC02Anchor('BODY', { cooking: [], ingredients: [] });
    expect(out.startsWith('BODY')).toBe(true);
    expect(out).toContain('cooking_skills');
    expect(out).toContain('main_ingredients');
  });
});

// ---------------------------------------------------------------------------
// c02ManifestVersion — stable content version of the canonical vocab
// ---------------------------------------------------------------------------

describe('c02ManifestVersion', () => {
  it('is a stable hex string for identical manifest content', () => {
    expect(c02ManifestVersion(MINI_MANIFEST)).toMatch(/^[0-9a-f]{64}$/);
    expect(c02ManifestVersion(MINI_MANIFEST)).toBe(c02ManifestVersion(MINI_MANIFEST));
  });

  it('changes when the canonical vocab changes (not when only provenance changes)', () => {
    const changedVocab: C02Manifest = {
      ...MINI_MANIFEST,
      cookingSkills: [...MINI_MANIFEST.cookingSkills, 'Grilling'],
    };
    expect(c02ManifestVersion(changedVocab)).not.toBe(c02ManifestVersion(MINI_MANIFEST));
    // The free-form provenance block must NOT perturb the version.
    const reprovenanced: C02Manifest = {
      ...MINI_MANIFEST,
      provenance: { note: 'a different note', emitted: '2099-01-01' },
    };
    expect(c02ManifestVersion(reprovenanced)).toBe(c02ManifestVersion(MINI_MANIFEST));
  });
});

// ---------------------------------------------------------------------------
// computeEffectiveInputHash — D-P9 full effective input
// ---------------------------------------------------------------------------

describe('computeEffectiveInputHash (D-P9)', () => {
  const BASE: C02EffectiveInput = {
    body: 'a lesson body',
    rawCookingSkills: ['Boil'],
    rawMainIngredients: ['Tomato'],
    anchor: renderC02AnchorBlock(SAMPLE_FLOORED),
    manifestVersion: c02ManifestVersion(MINI_MANIFEST),
    reconcilePolicyId: C02_RECONCILE_POLICY_ID,
  };

  it('is a 64-char hex digest and identical for identical inputs', () => {
    expect(computeEffectiveInputHash(BASE)).toMatch(/^[0-9a-f]{64}$/);
    expect(computeEffectiveInputHash(BASE)).toBe(computeEffectiveInputHash({ ...BASE }));
  });

  it('changes when the body alone changes', () => {
    expect(computeEffectiveInputHash({ ...BASE, body: 'a DIFFERENT body' })).not.toBe(
      computeEffectiveInputHash(BASE)
    );
  });

  it('changes when the raw current tags alone change', () => {
    expect(computeEffectiveInputHash({ ...BASE, rawCookingSkills: ['Boil', 'Roast'] })).not.toBe(
      computeEffectiveInputHash(BASE)
    );
    expect(
      computeEffectiveInputHash({ ...BASE, rawMainIngredients: ['Tomato', 'Onion'] })
    ).not.toBe(computeEffectiveInputHash(BASE));
  });

  it('changes when the floored anchor alone changes', () => {
    expect(computeEffectiveInputHash({ ...BASE, anchor: BASE.anchor + ' (extra)' })).not.toBe(
      computeEffectiveInputHash(BASE)
    );
  });

  it('changes when the manifest version alone changes', () => {
    expect(computeEffectiveInputHash({ ...BASE, manifestVersion: 'a-different-version' })).not.toBe(
      computeEffectiveInputHash(BASE)
    );
  });

  it('changes when the reconcile-policy id alone changes', () => {
    expect(computeEffectiveInputHash({ ...BASE, reconcilePolicyId: 'some-other-policy' })).not.toBe(
      computeEffectiveInputHash(BASE)
    );
  });

  it('does not collide across dimensions (raw-tags order vs body content are distinct fields)', () => {
    // A naive concatenation could let a value migrate between fields and collide;
    // the framed hash must keep field boundaries.
    const a = computeEffectiveInputHash({ ...BASE, body: 'x', rawCookingSkills: ['y'] });
    const b = computeEffectiveInputHash({ ...BASE, body: 'xy', rawCookingSkills: [] });
    expect(a).not.toBe(b);
  });
});
