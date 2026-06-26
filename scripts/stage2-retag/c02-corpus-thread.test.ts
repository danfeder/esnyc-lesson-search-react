/**
 * Unit tests for threading the existing C02 tags through the run-time corpus
 * reader + the effective-input run-identity hash (design §3·PIVOT D-P4/D-P9 /
 * impl P2′.2 parts 1 + 5).
 *
 * The blind re-read STRIPPED the existing tags at load time
 * (`z.object({id, content_text})`). The pivot widens the corpus reader to
 * RETAIN cooking_skills / main_ingredients (already written to corpus.jsonl by
 * export-corpus), threads them into the loop, and asserts the on-disk corpus is
 * fresh (carries the two fields) rather than blindly re-exporting.
 */
import { describe, expect, it } from 'vitest';

import { corpusLineSchema, computeBodyHash, type CorpusRecord } from './run-retag';
import { c02ManifestVersion, C02_RECONCILE_POLICY_ID, renderC02AnchorBlock } from './c02-anchor';
import { loadC02Manifest } from './vocab';

// ---------------------------------------------------------------------------
// corpusLineSchema retains both C02 fields
// ---------------------------------------------------------------------------

describe('corpusLineSchema (P2′.2 part 1) — retains the existing C02 tags', () => {
  it('parses a corpus line carrying cooking_skills + main_ingredients', () => {
    const parsed = corpusLineSchema.parse({
      id: 'lesson-1',
      content_text: 'body',
      cooking_skills: ['Baking'],
      main_ingredients: ['Nightshades', 'Tomatoes'],
    });
    expect(parsed.cooking_skills).toEqual(['Baking']);
    expect(parsed.main_ingredients).toEqual(['Nightshades', 'Tomatoes']);
  });

  it('tolerates an OLD corpus line lacking the two fields (optional)', () => {
    const parsed = corpusLineSchema.parse({ id: 'lesson-1', content_text: 'body' });
    expect(parsed.cooking_skills).toBeUndefined();
    expect(parsed.main_ingredients).toBeUndefined();
  });

  it('tolerates a null field (export writes null for an untagged lesson)', () => {
    const parsed = corpusLineSchema.parse({
      id: 'lesson-1',
      content_text: 'body',
      cooking_skills: null,
      main_ingredients: null,
    });
    expect(parsed.cooking_skills).toBeNull();
  });

  it('does not strip the two fields (regression: the blind re-read used to drop them)', () => {
    const record: CorpusRecord = corpusLineSchema.parse({
      id: 'x',
      content_text: 'b',
      cooking_skills: ['Knife skills'],
      main_ingredients: ['Leafy greens'],
    });
    // The TYPE carries the fields (compile-time) and the value retains them.
    expect('cooking_skills' in record).toBe(true);
    expect('main_ingredients' in record).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// computeBodyHash now hashes the FULL effective input (D-P9)
// ---------------------------------------------------------------------------

describe('computeBodyHash (P2′.2 part 5 / D-P9) — full effective input', () => {
  const manifestVersion = c02ManifestVersion(loadC02Manifest());
  const base = {
    body: 'a lesson body',
    rawCookingSkills: ['Boil'],
    rawMainIngredients: ['Tomato'],
    anchor: renderC02AnchorBlock({
      cooking: [{ value: 'Boiling & simmering', provenance: 'alias-fold' as const }],
      ingredients: [{ value: 'Tomatoes', provenance: 'exact-canonical' as const }],
    }),
    manifestVersion,
    reconcilePolicyId: C02_RECONCILE_POLICY_ID,
  };

  it('returns a 64-char hex digest; identical inputs hash identically', () => {
    expect(computeBodyHash(base)).toMatch(/^[0-9a-f]{64}$/);
    expect(computeBodyHash(base)).toBe(computeBodyHash({ ...base }));
  });

  it('changes when the body alone changes', () => {
    expect(computeBodyHash({ ...base, body: 'DIFFERENT' })).not.toBe(computeBodyHash(base));
  });

  it('changes when the raw current tags alone change', () => {
    expect(computeBodyHash({ ...base, rawCookingSkills: ['Boil', 'Roast'] })).not.toBe(
      computeBodyHash(base)
    );
    expect(computeBodyHash({ ...base, rawMainIngredients: [] })).not.toBe(computeBodyHash(base));
  });

  it('changes when the floored anchor alone changes', () => {
    expect(computeBodyHash({ ...base, anchor: base.anchor + ' x' })).not.toBe(
      computeBodyHash(base)
    );
  });

  it('changes when the manifest version alone changes', () => {
    expect(computeBodyHash({ ...base, manifestVersion: 'other' })).not.toBe(computeBodyHash(base));
  });

  it('changes when the reconcile-policy id alone changes', () => {
    expect(computeBodyHash({ ...base, reconcilePolicyId: 'other' })).not.toBe(
      computeBodyHash(base)
    );
  });
});
