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

import { parseRunRecords } from './run-retag';
import { formatRunSummary, parseCorpusIndex, summarizeRun } from './validate-output';

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
});
