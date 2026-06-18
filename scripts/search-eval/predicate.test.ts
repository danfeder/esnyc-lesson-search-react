/**
 * Unit tests for the predicate-family evaluator used by the search eval harness
 * (S0.3). The `predicate` scoring family evaluates a small, regular SQL boolean
 * (a subset pinned in queries.json) over each live top-10 row. The anon client
 * cannot run arbitrary SQL, so the predicate is evaluated in JS against fetched
 * row fields per gold-provenance.md §"PREDICATE queries".
 *
 * Grammar covered (exactly the productions in the frozen gold):
 *   - scalar ILIKE:        title|summary ILIKE '%pat%'
 *   - array-ILIKE EXISTS:  EXISTS(SELECT 1 FROM unnest(<arrCol>) a WHERE a ILIKE '%pat%' [OR ...])
 *   - array equality ANY:  '<Value>' = ANY(<arrCol>)
 *   - boolean composition: top-level AND of OR-groups (parens group an OR-set)
 *
 * Every pattern in the frozen gold is `%word%` with no embedded `_`/mid-string
 * `%`, so plain String.includes after toLowerCase() is faithful to Postgres
 * ILIKE. Anything unrecognized must THROW (caught loudly, never silently wrong).
 */
import { describe, expect, it } from 'vitest';

import { evaluatePredicate, parsePredicateThreshold, type PredicateRow } from './predicate';

// Minimal fixture-row builder: all fields default to null/empty so each test
// sets only what it exercises.
function row(overrides: Partial<PredicateRow> = {}): PredicateRow {
  return {
    title: null,
    summary: null,
    main_ingredients: null,
    core_competencies: null,
    cultural_heritage: null,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// scalar ILIKE — title / summary substring (case-insensitive)
// ---------------------------------------------------------------------------

describe('evaluatePredicate — scalar ILIKE', () => {
  it('matches a title substring case-insensitively', () => {
    expect(evaluatePredicate("title ILIKE '%pumpkin%'", row({ title: 'Pumpkin Soup' }))).toBe(true);
    expect(evaluatePredicate("title ILIKE '%pumpkin%'", row({ title: 'PUMPKIN pie' }))).toBe(true);
  });

  it('matches a summary substring case-insensitively', () => {
    expect(
      evaluatePredicate("summary ILIKE '%tomato%'", row({ summary: 'A lesson on Tomatoes' })),
    ).toBe(true);
  });

  it('returns false when the field does not contain the pattern', () => {
    expect(evaluatePredicate("title ILIKE '%pumpkin%'", row({ title: 'Carrot Cake' }))).toBe(false);
  });

  it('treats a null field as false (does not throw)', () => {
    expect(evaluatePredicate("title ILIKE '%pumpkin%'", row({ title: null }))).toBe(false);
    expect(evaluatePredicate("summary ILIKE '%pumpkin%'", row({ summary: null }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// array-ILIKE EXISTS — unnest(arrCol) ILIKE
// ---------------------------------------------------------------------------

describe('evaluatePredicate — array-ILIKE EXISTS', () => {
  it('matches when any main_ingredients element contains the pattern (ci)', () => {
    const sql = "EXISTS(SELECT 1 FROM unnest(main_ingredients) mi WHERE mi ILIKE '%pumpkin%')";
    expect(evaluatePredicate(sql, row({ main_ingredients: ['flour', 'Pumpkin puree'] }))).toBe(true);
    expect(evaluatePredicate(sql, row({ main_ingredients: ['flour', 'sugar'] }))).toBe(false);
  });

  it('matches when any cultural_heritage element contains the pattern', () => {
    const sql = "EXISTS(SELECT 1 FROM unnest(cultural_heritage) ch WHERE ch ILIKE '%mexic%')";
    expect(evaluatePredicate(sql, row({ cultural_heritage: ['Mexican'] }))).toBe(true);
  });

  it('supports an OR of multiple patterns inside the EXISTS WHERE clause', () => {
    const sql =
      "EXISTS(SELECT 1 FROM unnest(main_ingredients) mi WHERE mi ILIKE '%basil%' OR mi ILIKE '%mint%')";
    expect(evaluatePredicate(sql, row({ main_ingredients: ['Fresh Mint'] }))).toBe(true);
    expect(evaluatePredicate(sql, row({ main_ingredients: ['oregano'] }))).toBe(false);
  });

  it('treats a null array as false (does not throw)', () => {
    const sql = "EXISTS(SELECT 1 FROM unnest(main_ingredients) mi WHERE mi ILIKE '%pumpkin%')";
    expect(evaluatePredicate(sql, row({ main_ingredients: null }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// array equality ANY — exact, case-sensitive (matches Postgres = ANY)
// ---------------------------------------------------------------------------

describe('evaluatePredicate — array equality ANY', () => {
  it("is true when core_competencies contains the value (exact, case-sensitive)", () => {
    expect(
      evaluatePredicate("'Garden Skills' = ANY(core_competencies)", row({ core_competencies: ['Garden Skills'] })),
    ).toBe(true);
  });

  it('is false when the value is absent', () => {
    expect(
      evaluatePredicate("'Garden Skills' = ANY(core_competencies)", row({ core_competencies: ['Cooking Skills'] })),
    ).toBe(false);
  });

  it('is case-sensitive (does NOT match a differently-cased element)', () => {
    expect(
      evaluatePredicate("'Garden Skills' = ANY(core_competencies)", row({ core_competencies: ['garden skills'] })),
    ).toBe(false);
  });

  it('treats a null array as false', () => {
    expect(
      evaluatePredicate("'Garden Skills' = ANY(core_competencies)", row({ core_competencies: null })),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// boolean composition — top-level OR of terms (one group)
// ---------------------------------------------------------------------------

describe('evaluatePredicate — top-level OR of terms', () => {
  const sql =
    "title ILIKE '%garden%' OR summary ILIKE '%garden%' OR 'Garden Skills' = ANY(core_competencies)";

  it('is true when the first OR term matches', () => {
    expect(evaluatePredicate(sql, row({ title: 'Garden Tasks' }))).toBe(true);
  });

  it('is true when only the last OR term (the ANY) matches', () => {
    expect(evaluatePredicate(sql, row({ core_competencies: ['Garden Skills'] }))).toBe(true);
  });

  it('is false when no OR term matches', () => {
    expect(evaluatePredicate(sql, row({ title: 'Compost Relay', core_competencies: ['Cooking Skills'] }))).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// boolean composition — top-level AND of OR-groups (q17 shape, with parens)
// ---------------------------------------------------------------------------

describe('evaluatePredicate — AND of OR-groups (q17 seed saving)', () => {
  // The frozen q17 predicate.
  const sql =
    "(title ILIKE '%seed%' OR summary ILIKE '%seed%') AND (title ILIKE '%sav%' OR summary ILIKE '%sav%' OR title ILIKE '%collect%' OR summary ILIKE '%collect%' OR title ILIKE '%harvest%' OR summary ILIKE '%harvest%')";

  it('is true when BOTH groups are satisfied', () => {
    expect(evaluatePredicate(sql, row({ title: 'Seed Saving' }))).toBe(true);
    expect(evaluatePredicate(sql, row({ title: 'Seeds', summary: 'how to collect them' }))).toBe(true);
  });

  it('is false when only the first group is satisfied (seed but no sav/collect/harvest)', () => {
    expect(evaluatePredicate(sql, row({ title: 'Seed Starting Basics' }))).toBe(false);
  });

  it('is false when only the second group is satisfied (harvest but no seed)', () => {
    expect(evaluatePredicate(sql, row({ title: 'Harvest Soup' }))).toBe(false);
  });

  it('does not split AND inside a parenthesized OR-group', () => {
    // a literal would never appear, but the parser must treat the parens as one
    // group; the only top-level AND is between the two groups.
    expect(evaluatePredicate(sql, row({ summary: 'save the seed' }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// faithfulness guard — reject wildcards that String.includes can't honor
// ---------------------------------------------------------------------------

describe('evaluatePredicate — ILIKE faithfulness guard', () => {
  it('throws on a pattern containing a bare underscore wildcard', () => {
    expect(() => evaluatePredicate("title ILIKE '%a_b%'", row({ title: 'axb' }))).toThrow();
  });

  it('throws on a pattern with a mid-string percent wildcard', () => {
    expect(() => evaluatePredicate("title ILIKE '%a%b%'", row({ title: 'ab' }))).toThrow();
  });
});

// ---------------------------------------------------------------------------
// defensive — unrecognized grammar throws (never silently wrong)
// ---------------------------------------------------------------------------

describe('evaluatePredicate — defensive throws on unrecognized grammar', () => {
  it('throws on an unknown scalar column', () => {
    expect(() => evaluatePredicate("body ILIKE '%x%'", row())).toThrow();
  });

  it('throws on an unknown array column in EXISTS', () => {
    expect(() =>
      evaluatePredicate("EXISTS(SELECT 1 FROM unnest(cooking_skills) cs WHERE cs ILIKE '%x%')", row()),
    ).toThrow();
  });

  it('throws on an unknown array column in = ANY', () => {
    expect(() => evaluatePredicate("'X' = ANY(social_emotional_learning)", row())).toThrow();
  });

  it('throws on the q09-style pseudo-SQL (must never be fed to evaluatePredicate)', () => {
    expect(() =>
      evaluatePredicate('lesson_id IN (q15.primaryClusters UNION q15.acceptableClusters flattened)', row()),
    ).toThrow();
  });

  it('throws on a wholly unparseable term', () => {
    expect(() => evaluatePredicate('rank > 0.5', row())).toThrow();
  });
});

// ---------------------------------------------------------------------------
// parsePredicateThreshold — extract N from ">=N/10"
// ---------------------------------------------------------------------------

describe('parsePredicateThreshold', () => {
  it('extracts 7 from ">=7/10 ..."', () => {
    expect(parsePredicateThreshold('>=7/10 of top-10 have garden')).toBe(7);
  });

  it('extracts 6 from a description with surrounding text', () => {
    expect(parsePredicateThreshold('predicate control: >=6/10 top-10 about tomato')).toBe(6);
  });

  it('extracts 8 from the q09 control description', () => {
    expect(parsePredicateThreshold('>=8/10 top-10 are pollinator-themed')).toBe(8);
  });

  it('tolerates whitespace around the operator', () => {
    expect(parsePredicateThreshold('>=  5 / 10 top-10 about kimchi')).toBe(5);
  });

  it('returns null when no >=N/10 threshold is present', () => {
    expect(parsePredicateThreshold('a description with no threshold')).toBeNull();
  });
});
