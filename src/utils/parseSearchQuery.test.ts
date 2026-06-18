import { describe, it, expect } from 'vitest';
import { parseSearchQuery } from './parseSearchQuery';

describe('parseSearchQuery', () => {
  // --- Frozen gold (from scripts/search-eval/queries.json normalizedCall) ---
  // These MUST reproduce exactly: search_query <- cleanedQuery, filter_grade_levels <- detectedGrades.
  describe('frozen gold outputs (queries.json normalizedCall)', () => {
    it.each([
      ['compost lesson for 3rd grade', 'compost', ['3']],
      ['garden lessons for kindergarten', 'garden', ['K']],
      ['worm composting for 2nd graders', 'worm composting', ['2']],
      ['a lesson about seeds for first grade', 'seeds', ['1']],
      ['compost lesson for third graders', 'compost', ['3']],
      ['seeds grades K-2', 'seeds', ['K', '1', '2']],
    ])('parseSearchQuery(%j) -> { %j, %j }', (raw, cleanedQuery, detectedGrades) => {
      expect(parseSearchQuery(raw)).toEqual({ cleanedQuery, detectedGrades });
    });
  });

  // --- False-positive guards: must NOT route a grade ---
  describe('false-positive guards (never route a grade)', () => {
    it('does not route a cardinal "three" (no grade cue)', () => {
      // cardinal "three" is not an ordinal; "three sisters garden" is a content phrase.
      const result = parseSearchQuery('three sisters garden');
      expect(result.detectedGrades).toEqual([]);
      expect(result.cleanedQuery).toBe('three sisters garden');
    });

    it('does not route when "grade" is a verb (not followed by a number/ordinal)', () => {
      const result = parseSearchQuery('grade a vegetables');
      expect(result.detectedGrades).toEqual([]);
      // filler "a" may be dropped; "grade" + "vegetables" are content here.
      expect(result.cleanedQuery).toBe('grade vegetables');
    });

    it('never routes a bare digit alone', () => {
      const result = parseSearchQuery('compost 3');
      expect(result.detectedGrades).toEqual([]);
      expect(result.cleanedQuery).toBe('compost 3');
    });

    it('never routes a bare number word alone', () => {
      const result = parseSearchQuery('three');
      expect(result.detectedGrades).toEqual([]);
      expect(result.cleanedQuery).toBe('three');
    });
  });

  // --- Grade-only queries: cleanedQuery may be empty (show-all-of-grade path) ---
  describe('grade-only queries', () => {
    it('routes "kindergarten" to K with empty cleanedQuery', () => {
      expect(parseSearchQuery('kindergarten')).toEqual({ cleanedQuery: '', detectedGrades: ['K'] });
    });

    it('routes a bare ordinal-grade phrase to empty query', () => {
      expect(parseSearchQuery('3rd grade')).toEqual({ cleanedQuery: '', detectedGrades: ['3'] });
    });

    it('routes "grade 5" to 5 with empty cleanedQuery', () => {
      expect(parseSearchQuery('grade 5')).toEqual({ cleanedQuery: '', detectedGrades: ['5'] });
    });
  });

  // --- 3K / PK edge cases (group-only in UI but valid filter values) ---
  describe('3K / PK edges', () => {
    it('routes "pre-k" to PK', () => {
      expect(parseSearchQuery('pre-k')).toEqual({ cleanedQuery: '', detectedGrades: ['PK'] });
    });

    it('routes "prek" to PK', () => {
      expect(parseSearchQuery('prek')).toEqual({ cleanedQuery: '', detectedGrades: ['PK'] });
    });

    it('routes "pre-kindergarten" to PK', () => {
      expect(parseSearchQuery('pre-kindergarten')).toEqual({
        cleanedQuery: '',
        detectedGrades: ['PK'],
      });
    });

    it('routes "3k" to 3K', () => {
      expect(parseSearchQuery('3k')).toEqual({ cleanedQuery: '', detectedGrades: ['3K'] });
    });
  });

  // --- Grade-cue forms ---
  describe('grade-cue forms', () => {
    it('routes "grade 3" (grade + number)', () => {
      expect(parseSearchQuery('compost grade 3')).toEqual({
        cleanedQuery: 'compost',
        detectedGrades: ['3'],
      });
    });

    it('routes "grade three" (grade + spelled number)', () => {
      expect(parseSearchQuery('compost grade three')).toEqual({
        cleanedQuery: 'compost',
        detectedGrades: ['3'],
      });
    });

    it('routes "first grade" (ordinal + grade word)', () => {
      expect(parseSearchQuery('seeds for first grade')).toEqual({
        cleanedQuery: 'seeds',
        detectedGrades: ['1'],
      });
    });

    it('routes "8th graders" (ordinal + graders)', () => {
      expect(parseSearchQuery('worms for 8th graders')).toEqual({
        cleanedQuery: 'worms',
        detectedGrades: ['8'],
      });
    });

    it('maps all ordinals first..eighth -> 1..8', () => {
      expect(parseSearchQuery('first grade').detectedGrades).toEqual(['1']);
      expect(parseSearchQuery('second grade').detectedGrades).toEqual(['2']);
      expect(parseSearchQuery('third grade').detectedGrades).toEqual(['3']);
      expect(parseSearchQuery('fourth grade').detectedGrades).toEqual(['4']);
      expect(parseSearchQuery('fifth grade').detectedGrades).toEqual(['5']);
      expect(parseSearchQuery('sixth grade').detectedGrades).toEqual(['6']);
      expect(parseSearchQuery('seventh grade').detectedGrades).toEqual(['7']);
      expect(parseSearchQuery('eighth grade').detectedGrades).toEqual(['8']);
    });
  });

  // --- Range expansion along canonical order ---
  describe('range expansion', () => {
    it('expands "K-2" to [K,1,2]', () => {
      expect(parseSearchQuery('seeds grades K-2')).toEqual({
        cleanedQuery: 'seeds',
        detectedGrades: ['K', '1', '2'],
      });
    });

    it('expands "3-5" to [3,4,5]', () => {
      expect(parseSearchQuery('compost grades 3-5')).toEqual({
        cleanedQuery: 'compost',
        detectedGrades: ['3', '4', '5'],
      });
    });

    it('expands "grades 6-8" to [6,7,8]', () => {
      expect(parseSearchQuery('worms grades 6-8')).toEqual({
        cleanedQuery: 'worms',
        detectedGrades: ['6', '7', '8'],
      });
    });
  });

  // --- Out-of-range / invalid: ignore ---
  describe('out-of-range grades', () => {
    it('does not route "grade 9"', () => {
      const result = parseSearchQuery('grade 9');
      expect(result.detectedGrades).toEqual([]);
    });

    it('does not route "9th graders"', () => {
      const result = parseSearchQuery('seeds for 9th graders');
      expect(result.detectedGrades).toEqual([]);
    });
  });

  // --- De-dup + canonical sort ---
  describe('de-dup and canonical ordering', () => {
    it('de-dups overlapping cues and sorts to canonical order', () => {
      // "grade 5" and "grades 3-5" overlap on 5; result must be deduped + sorted.
      const result = parseSearchQuery('compost grade 5 grades 3-5');
      expect(result.detectedGrades).toEqual(['3', '4', '5']);
    });
  });

  // --- never-empty invariant when no grade detected ---
  describe('never strips to empty when no grade is detected', () => {
    it('keeps a query that is all filler', () => {
      // removing filler would leave '' but no grade detected -> keep trimmed raw.
      const result = parseSearchQuery('a lesson about the');
      expect(result.detectedGrades).toEqual([]);
      expect(result.cleanedQuery).not.toBe('');
      expect(result.cleanedQuery).toBe('a lesson about the');
    });

    it('single content word survives', () => {
      expect(parseSearchQuery('compost')).toEqual({ cleanedQuery: 'compost', detectedGrades: [] });
    });
  });

  // --- empty / whitespace / robustness: never throws ---
  describe('robustness', () => {
    it('empty string -> empty result', () => {
      expect(parseSearchQuery('')).toEqual({ cleanedQuery: '', detectedGrades: [] });
    });

    it('whitespace-only -> empty result', () => {
      expect(parseSearchQuery('   \t  ')).toEqual({ cleanedQuery: '', detectedGrades: [] });
    });

    it('collapses internal whitespace in cleanedQuery', () => {
      expect(parseSearchQuery('worm    composting')).toEqual({
        cleanedQuery: 'worm composting',
        detectedGrades: [],
      });
    });

    it('never throws on odd input', () => {
      const inputs = [
        '',
        '   ',
        '!!!',
        '3',
        'grade',
        'grade grade',
        'K-K',
        'grades',
        '------',
        'pre-k 3rd grade',
      ];
      for (const input of inputs) {
        expect(() => parseSearchQuery(input)).not.toThrow();
      }
    });
  });
});
