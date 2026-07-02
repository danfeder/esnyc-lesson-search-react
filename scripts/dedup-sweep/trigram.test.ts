import { describe, expect, it } from 'vitest';

import { normTitle, stringSim, trigramSet, trigramSim } from './trigram';

describe('normTitle', () => {
  it('lowercases and trims', () => {
    expect(normTitle('  Sun Printing  ')).toBe('sun printing');
  });

  it('collapses runs of ordinary whitespace to a single space', () => {
    expect(normTitle('Foo   Bar\tBaz')).toBe('foo bar baz');
  });

  it('collapses a trailing vertical tab so VT-only variants normalize equal', () => {
    // The 10 known same-title pairs differ only by a trailing U+000B.
    const vt = String.fromCharCode(0x0b);
    expect(normTitle(`The Water Cycle${vt}`)).toBe('the water cycle');
    expect(normTitle(`The Water Cycle${vt}`)).toBe(normTitle('The Water Cycle'));
  });

  it('collapses other control characters (NUL, SOH) and non-breaking space', () => {
    const nul = String.fromCharCode(0x00);
    const soh = String.fromCharCode(0x01);
    const nbsp = String.fromCharCode(0xa0);
    expect(normTitle(`a${nul}${soh}b`)).toBe('a b');
    expect(normTitle(`a${nbsp}b`)).toBe('a b');
  });
});

describe('trigramSet', () => {
  it('pads each word with two leading and one trailing space (pg_trgm style)', () => {
    // "cat" → "  cat " → 3-grams: "  c", " ca", "cat", "at "
    expect([...trigramSet('cat')].sort()).toEqual(['  c', ' ca', 'at ', 'cat']);
  });

  it('splits on non-alphanumerics and lowercases', () => {
    expect(trigramSet('A-B')).toEqual(trigramSet('a b'));
  });

  it('produces an empty set for punctuation-only input', () => {
    expect(trigramSet('!!!').size).toBe(0);
  });
});

describe('trigramSim', () => {
  it('is 1 for identical non-empty strings', () => {
    expect(stringSim('sun printing', 'sun printing')).toBe(1);
  });

  it('is 0 for fully disjoint strings', () => {
    expect(stringSim('cat', 'dog')).toBe(0);
  });

  it('returns 0 when EITHER set is empty (matches pg_trgm; guards rule (b))', () => {
    // Regression: previously returned 1 for two empty sets, which would falsely
    // candidate-pair e.g. two punctuation-only titles.
    expect(trigramSim(trigramSet('!!!'), trigramSet('---'))).toBe(0);
    expect(trigramSim(new Set(), new Set())).toBe(0);
    expect(trigramSim(trigramSet('cat'), new Set())).toBe(0);
  });

  it('computes Jaccard on the trigram sets', () => {
    // cat={"  c"," ca","cat","at "}, car={"  c"," ca","car","ar "}
    // ∩ = {"  c"," ca"} = 2, ∪ = 6 → 2/6.
    expect(stringSim('cat', 'car')).toBeCloseTo(2 / 6, 10);
  });

  it('is symmetric', () => {
    expect(stringSim('worm study', 'worm studies')).toBe(stringSim('worm studies', 'worm study'));
  });
});
