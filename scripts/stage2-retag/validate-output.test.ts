/**
 * Unit tests for the run-level output validation summary (task A7).
 *
 * Fixtures (committed under __fixtures__/) model a small but complete run:
 *
 *   corpus.fixture.jsonl — 5 lessons (lesson-roots, lesson-soup,
 *     lesson-missing, lesson-errored, lesson-weird).
 *   run-output.fixture.jsonl — 7 records:
 *     1. lesson-roots   main   Zod-passed
 *     2. lesson-soup    main   Zod-failed (cooking_methods)
 *     3. lesson-ghost   main   Zod-passed, NOT in corpus, unknown-model cost
 *     4. lesson-errored main   API error, no output
 *     5. lesson-weird   main   Zod-failed (activity_type + tags)
 *     6. lesson-soup    repair cooking_methods repaired → now Zod-passes
 *     7. lesson-weird   repair tags repair call FAILED → still Zod-fails
 *
 *   lesson-missing has no run record at all.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseRunRecords, type RunRecord } from './run-retag';
import { formatRunSummary, parseArgs, parseCorpusIndex, summarizeRun } from './validate-output';

const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '__fixtures__');

const corpusText = readFileSync(path.join(FIXTURES_DIR, 'corpus.fixture.jsonl'), 'utf8');
const runText = readFileSync(path.join(FIXTURES_DIR, 'run-output.fixture.jsonl'), 'utf8');

const corpus = parseCorpusIndex(corpusText);
const runRecords = parseRunRecords(runText);
const summary = summarizeRun(runRecords, corpus);

describe('parseCorpusIndex', () => {
  it('reads id + title for every corpus line', () => {
    expect(corpus).toHaveLength(5);
    expect(corpus[0]).toEqual({ id: 'lesson-roots', title: 'Roots and Shoots' });
  });

  it('skips blank lines', () => {
    expect(parseCorpusIndex(`${corpusText}\n\n`)).toHaveLength(5);
  });
});

describe('summarizeRun — record counts', () => {
  it('counts total, main, and repair records', () => {
    expect(summary.totalRecords).toBe(7);
    expect(summary.mainRecords).toBe(5);
    expect(summary.repairRecords).toBe(2);
  });

  it('counts corpus lessons and unique run ids', () => {
    expect(summary.corpusLessons).toBe(5);
    expect(summary.uniqueIdsInRun).toBe(5);
  });

  it('tallies models and prompt+schema hashes across all records', () => {
    expect(summary.models).toEqual({ 'claude-opus-4-7': 6, 'claude-mystery': 1 });
    expect(summary.promptSchemaHashes).toEqual({ 'hash-current': 7 });
  });

  it('counts strict-tool records (all fixture records ran non-strict)', () => {
    expect(summary.strictRecords).toBe(0);
  });

  it('counts records with strict: true', () => {
    const strictRecord: RunRecord = {
      ...runRecords[0],
      id: 'lesson-strict',
      strict: true,
    };
    const withStrict = summarizeRun([...runRecords, strictRecord], corpus);
    expect(withStrict.strictRecords).toBe(1);
  });
});

describe('summarizeRun — corpus coverage', () => {
  it('lists corpus lessons with no run record (with titles)', () => {
    expect(summary.missingFromRun).toEqual([
      { id: 'lesson-missing', title: 'Worm Bin Exploration' },
    ]);
  });

  it('lists run ids that are not in the corpus', () => {
    expect(summary.unknownInRun).toEqual(['lesson-ghost']);
  });
});

describe('summarizeRun — latest outcome per lesson', () => {
  it('buckets latest records into passed / failed-with-output / no-usable-output', () => {
    // Latest: roots PASS, soup PASS (repair), ghost PASS, errored NO-OUTPUT,
    // weird FAIL (repair record still failing, output present).
    expect(summary.latest).toEqual({
      zodPassed: 3,
      zodFailedWithOutput: 1,
      noUsableOutput: 1,
    });
  });

  it('counts Zod failures per field from LATEST records only', () => {
    // lesson-soup's main-pass cooking_methods failure was superseded by its
    // passing repair record; only lesson-weird's failures remain.
    expect(summary.zodFailuresByField).toEqual({ activity_type: 1, tags: 1 });
  });
});

describe('summarizeRun — repair pass outcomes', () => {
  it('counts repair records that now pass vs still fail', () => {
    expect(summary.repair.recordsNowPassing).toBe(1);
    expect(summary.repair.recordsStillFailing).toBe(1);
  });

  it('tallies per-field repair attempts, successes, and failures', () => {
    expect(summary.repair.fields).toEqual({
      cooking_methods: { attempted: 1, succeeded: 1, failed: 0 },
      tags: { attempted: 1, succeeded: 0, failed: 1 },
    });
  });
});

describe('summarizeRun — usage and cost totals', () => {
  it('sums usage across ALL records (main + repair)', () => {
    expect(summary.usage).toEqual({
      input_tokens: 3700,
      output_tokens: 2000,
      cache_creation_input_tokens: 6000,
      cache_read_input_tokens: 16000,
    });
  });

  it('sums known costs and counts records with usage but no cost figure', () => {
    expect(summary.totalCostUsd).toBeCloseTo(0.13, 10);
    expect(summary.recordsWithoutCost).toBe(1); // lesson-ghost (unknown model)
  });
});

describe('summarizeRun — error inventory', () => {
  it('groups errors by message with counts and ids', () => {
    expect(summary.errors).toEqual([
      { message: 'HTTP 400: credit balance too low', count: 1, ids: ['lesson-errored'] },
      { message: 'HTTP 500: overloaded', count: 1, ids: ['lesson-weird'] },
    ]);
  });
});

describe('summarizeRun — edge cases', () => {
  it('handles an empty run against a corpus', () => {
    const empty = summarizeRun([], corpus);
    expect(empty.totalRecords).toBe(0);
    expect(empty.missingFromRun).toHaveLength(5);
    expect(empty.latest).toEqual({ zodPassed: 0, zodFailedWithOutput: 0, noUsableOutput: 0 });
    expect(empty.totalCostUsd).toBe(0);
    expect(empty.errors).toEqual([]);
  });
});

describe('formatRunSummary', () => {
  const text = formatRunSummary(summary);

  it('reports the headline record counts', () => {
    expect(text).toContain('7');
    expect(text).toMatch(/5 main/);
    expect(text).toMatch(/2 repair/);
  });

  it('names missing lessons with their titles', () => {
    expect(text).toContain('lesson-missing');
    expect(text).toContain('Worm Bin Exploration');
  });

  it('shows the latest-outcome buckets and the cost total', () => {
    expect(text).toMatch(/Zod-passed:\s+3/);
    expect(text).toContain('$0.1300');
  });

  it('lists the error inventory', () => {
    expect(text).toContain('HTTP 400: credit balance too low');
    expect(text).toContain('lesson-errored');
  });

  it('shows the strict-tool record count', () => {
    expect(text).toMatch(/Strict-tool records:\s+0 of 7/);
  });
});

describe('summarizeRun — normalization provenance (code-enforced rules)', () => {
  // Build a tiny synthetic run on top of a passing fixture record so the
  // normalization tallies are isolated from the rest of the fixture.
  const base = runRecords[0]; // lesson-roots, main, Zod-passed
  const withNorms: RunRecord[] = [
    {
      ...base,
      id: 'lesson-roots',
      normalizations: ['academic-exclusivity-strip', 'concepts-integration-add:Math'],
      rawInput: {
        academic_integration: ['Math', 'Health'],
        academic_concepts: {
          Math: { framework: ['Measurement'], everyday: [], synonym_pairs: [] },
          Health: { framework: [], everyday: [], synonym_pairs: [] },
        },
      },
    },
    {
      ...base,
      id: 'lesson-soup',
      normalizations: ['concepts-integration-add:Science', 'synonym-pair-drop:Science'],
      rawInput: { academic_integration: ['Science'], academic_concepts: {} },
    },
  ];
  const normSummary = summarizeRun(withNorms, corpus);

  it('tallies normalization-rule applications by base rule across latest records', () => {
    expect(normSummary.normalizations).toEqual({
      'academic-exclusivity-strip': 1,
      'concepts-integration-add': 2,
      'synonym-pair-drop': 1,
    });
  });

  it('counts records with an integration subject that carries no framework concepts (R4 flag)', () => {
    // lesson-roots: Health is integrated but has empty framework; lesson-soup:
    // Science is integrated but its academic_concepts has no Science entry at
    // all. Both records are flagged → 2.
    expect(normSummary.integrationWithoutConcepts).toBe(2);
  });

  it('reports zero normalizations when no record carries the field', () => {
    expect(summary.normalizations).toEqual({});
    expect(summary.integrationWithoutConcepts).toBe(0);
  });

  it('renders the normalization tallies and the R4 flag in the text summary', () => {
    const text = formatRunSummary(normSummary);
    expect(text).toMatch(/academic-exclusivity-strip:\s*1/);
    expect(text).toMatch(/concepts-integration-add:\s*2/);
    expect(text).toMatch(/integration subject lacking concepts \(R4 flag\):\s*2/);
  });
});

describe('summarizeRun — C02 fields are field-agnostic (no per-field gap)', () => {
  // validate-output never enumerates a field list: every per-field tally keys
  // off RUNTIME field names (Object.keys over zod.fieldErrors / normalizations
  // / repairs). So cooking_skills + main_ingredients flow through with zero
  // code change — this test pins that contract for the two new fields.
  const base = runRecords[0]; // lesson-roots, main, Zod-passed
  const c02Records: RunRecord[] = [
    {
      ...base,
      id: 'lesson-c02-main',
      phase: 'main',
      zod: {
        passed: false,
        fieldErrors: { main_ingredients: ['main_ingredients.0: Invalid enum value'] },
      },
      normalizations: ['cooking-skills-alias-floor', 'ingredient-parent-reconcile'],
      rawInput: { cooking_skills: ['Knife skills'], main_ingredients: ['banana'] },
    },
    {
      ...base,
      id: 'lesson-c02-repair',
      phase: 'repair',
      zod: { passed: true, fieldErrors: null },
      repairs: {
        main_ingredients: {
          previous: ['banana'],
          repaired: ['Bananas'],
          usage: null,
          costUsd: null,
          latencyMs: null,
          error: null,
        },
      },
      rawInput: { cooking_skills: ['Knife skills'], main_ingredients: ['Bananas'] },
    },
  ];
  const c02Summary = summarizeRun(c02Records, corpus);

  it('tallies a main_ingredients Zod failure under its runtime field name', () => {
    expect(c02Summary.zodFailuresByField.main_ingredients).toBe(1);
  });

  it('tallies the C02 normalization rules (alias-floor + parent-reconcile) by base rule', () => {
    // Real rule keys are kebab-case and R9 emits parent-reconcile bare (no
    // `:subject` suffix); the fixture mirrors what normalize.ts actually pushes.
    // (Suffix roll-up is covered by the `concepts-integration-add:…` fixtures.)
    expect(c02Summary.normalizations['cooking-skills-alias-floor']).toBe(1);
    expect(c02Summary.normalizations['ingredient-parent-reconcile']).toBe(1);
  });

  it('tallies a main_ingredients repair attempt under its runtime field name', () => {
    expect(c02Summary.repair.fields.main_ingredients).toEqual({
      attempted: 1,
      succeeded: 1,
      failed: 0,
    });
  });
});

describe('parseArgs hardening', () => {
  it('throws when a value-taking flag is missing its value', () => {
    expect(() => parseArgs(['--run'])).toThrow(/--run requires a value/);
    expect(() => parseArgs(['--corpus', '--help'])).toThrow(/--corpus requires a value/);
    expect(() => parseArgs(['--summary-out'])).toThrow(/--summary-out requires a value/);
  });

  it('accepts valid values and still rejects unknown flags', () => {
    expect(parseArgs(['--run', '/tmp/r.jsonl']).run).toBe('/tmp/r.jsonl');
    expect(() => parseArgs(['--bogus'])).toThrow(/unknown flag/);
  });
});
