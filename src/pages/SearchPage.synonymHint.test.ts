import { describe, it, expect } from 'vitest';
import { extractSynonymTerms } from './SearchPage';

describe('extractSynonymTerms (FP-19 synonym hint)', () => {
  it('returns [] when there is no expansion', () => {
    expect(extractSynonymTerms('corn', undefined)).toEqual([]);
    expect(extractSynonymTerms('corn', '')).toEqual([]);
  });

  it('hides the morphological stems smart-search injects, never surfacing them as "synonyms"', () => {
    // For "tomato" (len>4) expandSearchTerms adds tomato, tomat (−1 char),
    // tomatos (+s). None of those are real synonyms → nothing to announce.
    expect(extractSynonymTerms('tomato', 'tomato:* | tomat:* | tomatos:*')).toEqual([]);
  });

  it('surfaces a genuine synonym while dropping the original + its stems', () => {
    // "corn" is len 4 (no morphological variants added); maize is the synonym.
    expect(extractSynonymTerms('corn', 'corn:* | maize:*')).toEqual(['maize']);
    // "squash" (len>4) → squash/squas/squashs are noise; zucchini is the synonym.
    expect(extractSynonymTerms('squash', 'squash:* | squas:* | squashs:* | zucchini:*')).toEqual([
      'zucchini',
    ]);
  });

  it('dedupes and is case-insensitive on the original words', () => {
    expect(extractSynonymTerms('Corn', 'corn:* | maize:* | maize:*')).toEqual(['maize']);
  });

  it('handles multi-word queries', () => {
    // "sweet" (len>4) → sweet/swee/sweets noise; "corn" (len4) → corn; maize stays.
    expect(
      extractSynonymTerms('sweet corn', 'sweet:* | swee:* | sweets:* | corn:* | maize:*')
    ).toEqual(['maize']);
  });
});
