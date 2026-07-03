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

  it('cannot itself filter a reverse-index leak — the fix must send the cleaned query upstream (FP-19)', () => {
    // If the RAW "compost lesson" reaches smart-search, its bidirectional reverse
    // index expands the live `activity → [activities, lesson, lessons, project,
    // projects]` row (matched via "lesson" in the synonyms array), so expandedQuery
    // carries activity/activities/project/projects. This function only strips
    // morphological variants of the base words, so those genuinely-unmatched terms
    // survive — proving the leak must be prevented in useLessonSuggestions (send
    // parseSearchQuery(query).cleanedQuery), not here.
    expect(
      extractSynonymTerms(
        'compost lesson',
        'compost:* | lesson:* | activity:* | activities:* | lessons:* | project:* | projects:*'
      )
    ).toEqual(['activity', 'activities', 'project', 'projects']);

    // With the cleaned query sent upstream, smart-search only ever expands
    // "compost" (filler "lesson" removed), so no reverse-index terms appear and the
    // hint is empty — the honest result for a search that matched only "compost".
    expect(extractSynonymTerms('compost', 'compost:*')).toEqual([]);
  });
});
