import { describe, it, expect } from 'vitest';
import { titlesAreSimilar } from '@/utils/titleSimilarity';

describe('titlesAreSimilar', () => {
  // Threshold is 0.3 (per design Section 6.6)
  const SIMILAR = true;
  const NOT_SIMILAR = false;

  it.each([
    ['Apple Crisp', 'Apple Crisp', SIMILAR], // identical
    ['Apple Crisp', 'apple crisp', SIMILAR], // case
    ['Apple Crisp', 'Apple-Crisp', SIMILAR], // punctuation
    ['Apple Crisp Lesson', 'Apple Crisp', SIMILAR], // contains
    ['Spring Planting', 'Spring Planting Updated for 2026', SIMILAR], // legitimate revision
    ['Three Sisters Garden', 'Planting the Three Sisters', SIMILAR], // word reorder
    ['Apple Crisp', 'Solar Eclipse', NOT_SIMILAR], // unrelated
    ['Pumpkin Pie', 'Apple Crisp', NOT_SIMILAR], // unrelated 2
    ['', '', NOT_SIMILAR], // both empty
    ['Apple Crisp', '', NOT_SIMILAR], // one empty
  ])('titlesAreSimilar(%s, %s) === %s', (a, b, expected) => {
    expect(titlesAreSimilar(a, b)).toBe(expected);
  });
});
