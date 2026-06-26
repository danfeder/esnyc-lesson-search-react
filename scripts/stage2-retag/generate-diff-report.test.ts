/**
 * Unit tests for the per-field corpus diff + plain-language markdown report
 * (task A7). Shares the committed __fixtures__/ pair with
 * validate-output.test.ts — see that file's header for the fixture story.
 *
 * Expected diff (corpus "current" vs latest usable run record "proposed"):
 *
 *   lesson-roots — season_timing casing-only (winter→Winter); garden_skills
 *     semantic add (Identifying plants); academic_concepts: Science adds
 *     Life Cycles, Arts drops Visual Arts.
 *   lesson-soup  — cooking_methods casing-only (Stovetop→stovetop, via the
 *     repair record); academic_integration adds Social Studies;
 *     academic_concepts: null → Social Studies: Cultural Traditions;
 *     cultural_heritage semantic swap (Native American → Indigenous, the
 *     canonical spelling).
 *   lesson-weird — tags: casing fix (Plant Based→plant based) + semantic add
 *     (Garden Fresh); record is Zod-failed but has output (included with a
 *     warning).
 *   lesson-missing — no run record; lesson-errored — record has no output.
 *   lesson-ghost — run record with no corpus row.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  buildDiffReport,
  diffValueSets,
  parseArgs,
  parseCorpusRecords,
  renderMarkdown,
  selectComparedLessons,
  type FieldDiff,
} from './generate-diff-report';
import { parseRunRecords } from './run-retag';
import { loadVocab } from './vocab';

const FIXTURES_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '__fixtures__');

const corpusText = readFileSync(path.join(FIXTURES_DIR, 'corpus.fixture.jsonl'), 'utf8');
const runText = readFileSync(path.join(FIXTURES_DIR, 'run-output.fixture.jsonl'), 'utf8');

const vocab = loadVocab();
const corpus = parseCorpusRecords(corpusText);
const runRecords = parseRunRecords(runText);
const report = buildDiffReport(corpus, runRecords, vocab);

function field(name: string): FieldDiff {
  const found = report.fields.find((f) => f.field === name);
  if (!found) throw new Error(`report has no field ${name}`);
  return found;
}

describe('diffValueSets', () => {
  it('reports identical sets as unchanged regardless of order', () => {
    const diff = diffValueSets(['a', 'b'], ['b', 'a']);
    expect(diff.added).toEqual([]);
    expect(diff.dropped).toEqual([]);
    expect(diff.casingFixes).toEqual([]);
    expect(diff.unchanged.sort()).toEqual(['a', 'b']);
  });

  it('handles empty → empty', () => {
    const diff = diffValueSets([], []);
    expect(diff).toEqual({ added: [], dropped: [], casingFixes: [], unchanged: [] });
  });

  it('separates casing-only changes from semantic adds/drops', () => {
    const diff = diffValueSets(['Stovetop', 'Old Value'], ['stovetop', 'New Value']);
    expect(diff.casingFixes).toEqual([{ from: 'Stovetop', to: 'stovetop' }]);
    expect(diff.added).toEqual(['New Value']);
    expect(diff.dropped).toEqual(['Old Value']);
  });

  it('treats pure additions and pure drops as semantic', () => {
    expect(diffValueSets([], ['x']).added).toEqual(['x']);
    expect(diffValueSets(['x'], []).dropped).toEqual(['x']);
  });

  it('routes within-side case-twin dedup into casing fixes, not semantic drops (item 8)', () => {
    // Two case-variants collapsing to the surviving canonical spelling:
    // a formatting cleanup, NOT a semantic removal.
    const diff = diffValueSets(['Earth month', 'Earth Month'], ['Earth Month']);
    expect(diff.unchanged).toEqual(['Earth Month']);
    expect(diff.casingFixes).toEqual([{ from: 'Earth month', to: 'Earth Month' }]);
    expect(diff.dropped).toEqual([]);
    expect(diff.added).toEqual([]);
  });

  it('case-twin dedup also pairs against an unchanged survivor', () => {
    const diff = diffValueSets(['Winter', 'winter'], ['Winter']);
    expect(diff.unchanged).toEqual(['Winter']);
    expect(diff.casingFixes).toEqual([{ from: 'winter', to: 'Winter' }]);
    expect(diff.dropped).toEqual([]);
  });

  it('a genuinely removed value (no case twin surviving) stays a semantic drop', () => {
    const diff = diffValueSets(['Earth month', 'Earth Month'], []);
    expect(diff.dropped.sort()).toEqual(['Earth Month', 'Earth month']);
    expect(diff.casingFixes).toEqual([]);
  });
});

describe('parseCorpusRecords', () => {
  it('normalizes null and missing flat fields to empty arrays', () => {
    const roots = corpus.find((r) => r.id === 'lesson-roots');
    expect(roots?.flat.tags).toEqual([]); // null in the fixture
    expect(roots?.flat.season_timing).toEqual(['winter']);
  });

  it('normalizes null academic_concepts to an empty object', () => {
    const soup = corpus.find((r) => r.id === 'lesson-soup');
    expect(soup?.academicConcepts).toEqual({});
    const roots = corpus.find((r) => r.id === 'lesson-roots');
    expect(roots?.academicConcepts).toEqual({
      Science: ['Plant Parts'],
      Arts: ['Visual Arts'],
    });
  });
});

describe('buildDiffReport — coverage', () => {
  it('compares only lessons present in both corpus and run with usable output', () => {
    expect(report.corpusLessons).toBe(5);
    expect(report.comparedLessons).toBe(3); // roots, soup, weird
  });

  it('counts Zod-failed-but-included lessons', () => {
    expect(report.zodFailedIncluded).toBe(1); // lesson-weird
  });

  it('lists corpus lessons without usable run output, with reasons', () => {
    expect(report.missingFromRun).toEqual([
      { id: 'lesson-errored', title: 'Herb Harvest', reason: 'no-output' },
      { id: 'lesson-missing', title: 'Worm Bin Exploration', reason: 'no-record' },
    ]);
  });

  it('lists run ids with no corpus row', () => {
    expect(report.unknownInRun).toEqual(['lesson-ghost']);
  });

  it('covers all 14 main-pass fields in canonical order', () => {
    expect(report.fields.map((f) => f.field)).toEqual([
      'activity_type',
      'tags',
      'season_timing',
      'cultural_responsiveness_features',
      'cultural_heritage',
      'academic_concepts',
      'academic_integration',
      'social_emotional_learning',
      'core_competencies',
      'cooking_methods',
      'observances_holidays',
      'garden_skills',
      'cooking_skills',
      'main_ingredients',
    ]);
  });
});

describe('buildDiffReport — per-field counts', () => {
  it('reports a fully unchanged field (activity_type)', () => {
    const f = field('activity_type');
    expect(f.label).toBe('Activity Type');
    expect(f.lessonsCompared).toBe(3);
    expect(f.lessonsUnchanged).toBe(3);
    expect(f.lessonsChangedSemantic).toBe(0);
    expect(f.lessonsCasingOnly).toBe(0);
    expect(f.lessonsBothEmpty).toBe(1); // lesson-weird: [] → []
    expect(f.changedLessons).toEqual([]);
  });

  it('flags casing-only lessons separately (season_timing)', () => {
    const f = field('season_timing');
    expect(f.lessonsCasingOnly).toBe(1); // roots: winter → Winter
    expect(f.lessonsChangedSemantic).toBe(0);
    expect(f.lessonsUnchanged).toBe(2);
    expect(f.casingFixCount).toBe(1);
    const roots = f.changedLessons.find((l) => l.id === 'lesson-roots');
    expect(roots?.casingFixes).toEqual([{ from: 'winter', to: 'Winter' }]);
    expect(roots?.added).toEqual([]);
    expect(roots?.dropped).toEqual([]);
  });

  it('flags repair-merged casing-only change (cooking_methods via repair record)', () => {
    const f = field('cooking_methods');
    expect(f.lessonsCasingOnly).toBe(1); // soup: Stovetop → stovetop
    expect(f.lessonsUnchanged).toBe(2);
    const soup = f.changedLessons.find((l) => l.id === 'lesson-soup');
    expect(soup?.casingFixes).toEqual([{ from: 'Stovetop', to: 'stovetop' }]);
  });

  it('counts a lesson with both a casing fix and a semantic add as semantic (tags)', () => {
    const f = field('tags');
    expect(f.lessonsChangedSemantic).toBe(1); // weird
    expect(f.lessonsCasingOnly).toBe(0);
    expect(f.lessonsUnchanged).toBe(2); // roots (null→[]), soup ([]→[])
    expect(f.lessonsBothEmpty).toBe(2);
    expect(f.addedValueCounts).toEqual({ 'Garden Fresh': 1 });
    expect(f.droppedValueCounts).toEqual({});
    const weird = f.changedLessons.find((l) => l.id === 'lesson-weird');
    expect(weird?.added).toEqual(['Garden Fresh']);
    expect(weird?.casingFixes).toEqual([{ from: 'Plant Based', to: 'plant based' }]);
  });

  it('treats corpus null as empty (tags: null → [] is unchanged)', () => {
    const f = field('tags');
    const ids = f.changedLessons.map((l) => l.id);
    expect(ids).not.toContain('lesson-roots');
  });

  it('tallies added/dropped value counts (garden_skills, academic_integration)', () => {
    expect(field('garden_skills').addedValueCounts).toEqual({ 'Identifying plants': 1 });
    expect(field('academic_integration').addedValueCounts).toEqual({ 'Social Studies': 1 });
  });

  it('treats a canonical-spelling swap as semantic, not casing (cultural_heritage)', () => {
    const f = field('cultural_heritage');
    expect(f.lessonsChangedSemantic).toBe(1); // soup: Native American → Indigenous
    expect(f.lessonsCasingOnly).toBe(0);
    expect(f.addedValueCounts).toEqual({ Indigenous: 1 });
    expect(f.droppedValueCounts).toEqual({ 'Native American': 1 });
  });

  it('partitions every compared lesson into exactly one bucket per field', () => {
    for (const f of report.fields) {
      expect(f.lessonsUnchanged + f.lessonsChangedSemantic + f.lessonsCasingOnly).toBe(
        f.lessonsCompared
      );
    }
  });
});

describe('buildDiffReport — academic_concepts (subject-keyed object)', () => {
  const f = field('academic_concepts');

  it('diffs old subject→list against the new per-subject framework arrays', () => {
    expect(f.lessonsChangedSemantic).toBe(2); // roots + soup
    expect(f.lessonsUnchanged).toBe(1); // weird: null → all-empty
    expect(f.lessonsBothEmpty).toBe(1);
  });

  it('prefixes value tallies with the subject', () => {
    expect(f.addedValueCounts).toEqual({
      'Science: Life Cycles': 1,
      'Social Studies: Cultural Traditions': 1,
    });
    expect(f.droppedValueCounts).toEqual({ 'Arts: Visual Arts': 1 });
  });

  it('carries per-subject detail on changed lessons', () => {
    const roots = f.changedLessons.find((l) => l.id === 'lesson-roots');
    expect(roots?.subjects?.Science.added).toEqual(['Life Cycles']);
    expect(roots?.subjects?.Arts.dropped).toEqual(['Visual Arts']);
    const soup = f.changedLessons.find((l) => l.id === 'lesson-soup');
    expect(soup?.subjects?.['Social Studies'].added).toEqual(['Cultural Traditions']);
  });
});

describe('renderMarkdown — plain-language report', () => {
  const md = renderMarkdown(report);

  it('spells out field names as section headings', () => {
    expect(md).toContain('## Season & Timing');
    expect(md).toContain('## Cultural Heritage');
    expect(md).toContain('## Academic Concepts');
  });

  it('shows lesson titles, not just ids', () => {
    expect(md).toContain('Roots and Shoots');
    expect(md).toContain('Three Sisters Soup');
    expect(md).toContain('Mystery Salad');
  });

  it('leads each field section with a summary sentence', () => {
    expect(md).toContain('Out of the 3 lessons compared');
  });

  it('separates capitalization-only fixes from real changes', () => {
    expect(md).toMatch(/capitalization/i);
    expect(md).toContain('"winter" → "Winter"');
    expect(md).toContain('"Stovetop" → "stovetop"');
  });

  it('lists lessons without usable results, with titles', () => {
    expect(md).toContain('Worm Bin Exploration');
    expect(md).toContain('Herb Harvest');
  });

  it('warns about Zod-failed lessons included in the diff', () => {
    expect(md).toMatch(/validation problem/i);
  });

  it('notes that grade levels are not part of this diff', () => {
    expect(md).toMatch(/grade level/i);
  });

  it('shows per-subject academic-concepts detail', () => {
    expect(md).toContain('Science: Life Cycles');
    expect(md).toContain('Arts: Visual Arts');
  });
});

describe('buildDiffReport — corpus exclusions', () => {
  it('drops excluded corpus lessons from the diff entirely (not compared, not missing)', () => {
    // lesson-missing has no run record; without exclusions it shows up under
    // missingFromRun. As an excluded (deletion-slated) lesson it must vanish
    // from the report completely — it was never run on purpose.
    const excluded = new Set(['lesson-missing']);
    const r = buildDiffReport(corpus, runRecords, vocab, excluded);
    expect(r.corpusLessons).toBe(4); // 5 corpus rows minus the 1 excluded
    expect(r.excludedLessons).toBe(1);
    expect(r.missingFromRun.map((m) => m.id)).not.toContain('lesson-missing');
    expect(r.missingFromRun.map((m) => m.id)).toEqual(['lesson-errored']);
    // The compared set is unaffected (the excluded lesson had no run record).
    expect(r.comparedLessons).toBe(3);
  });

  it('only counts exclusions that are actually present in the corpus', () => {
    const excluded = new Set(['lesson-missing', 'not-in-corpus']);
    const r = buildDiffReport(corpus, runRecords, vocab, excluded);
    expect(r.excludedLessons).toBe(1); // only lesson-missing was present
  });

  it('defaults to no exclusions when the argument is omitted', () => {
    const r = buildDiffReport(corpus, runRecords, vocab);
    expect(r.corpusLessons).toBe(5);
    expect(r.excludedLessons).toBe(0);
    expect(r.missingFromRun.map((m) => m.id)).toContain('lesson-missing');
  });

  it('surfaces the exclusion count in the rendered report when nonzero', () => {
    const r = buildDiffReport(corpus, runRecords, vocab, new Set(['lesson-missing']));
    const md = renderMarkdown(r);
    expect(md).toMatch(/excluded from the run/i);
    expect(md).toContain('1');
  });
});

describe('buildDiffReport — C02 anchored run (per-field SHIP output, P3.1-diff)', () => {
  // Three C02-ANCHORED lessons (carry finalC02 ⇒ the diff reads the materialized
  // per-field SHIP output, NOT rawInput). All values are canonical C02 vocab.
  //
  //   lesson-floored    flooredFields:['main_ingredients']; cooking finalC02 KEEP
  //                     + ADD "Knife skills"; ingredients fell back to floor.
  //                     Ship cooking = floor ∪ LLM = [Sautéing & stir-frying,
  //                     Knife skills]; ingredients floor-only of [Tomatoes] =
  //                     [Tomatoes, Nightshades] (parent-derived). BOTH change.
  //   lesson-shipchanged  clean; cooking finalC02 ADDs "Knife skills";
  //                     ingredients unchanged by the floor. Cooking ship-changes.
  //   lesson-unchanged  clean; cooking finalC02 KEEP-only; ship == today on both
  //                     fields. Neither floored nor ship-changed.
  function c02Corpus(id: string, title: string, cooking: string[], ingredients: string[]): string {
    return JSON.stringify({
      id,
      title,
      content_text: 'A cooking lesson.',
      activity_type: ['cooking'],
      tags: [],
      season_timing: [],
      cultural_responsiveness_features: [],
      cultural_heritage: [],
      academic_integration: [],
      social_emotional_learning: [],
      core_competencies: [],
      cooking_methods: [],
      observances_holidays: [],
      garden_skills: [],
      cooking_skills: cooking,
      main_ingredients: ingredients,
      academic_concepts: null,
    });
  }

  function c02RunRecord(
    id: string,
    finalC02: { cooking_skills: string[]; main_ingredients: string[] },
    extra: Record<string, unknown> = {}
  ): string {
    return JSON.stringify({
      id,
      phase: 'main',
      model: 'claude-opus-4-8',
      promptSchemaHash: 'hash-current',
      // rawInput on an anchored record holds the raw KEEP/DROP/ADD DECISION
      // object (NOT arrays). It is deliberately the WRONG arrays here so any
      // test reading rawInput instead of the ship output would fail loudly.
      rawInput: { cooking_skills: { keep: [], add: [] }, main_ingredients: { keep: [], add: [] } },
      llmDecisions: { cooking_skills: { keep: [], add: [] } },
      finalC02,
      zod: { passed: true, fieldErrors: null },
      usage: null,
      costUsd: null,
      latencyMs: null,
      error: null,
      stopReason: 'tool_use',
      bodyHash: 'h',
      strict: false,
      completedAt: '2026-06-25T00:00:00.000Z',
      ...extra,
    });
  }

  const corpusText = [
    c02Corpus('lesson-floored', 'Floored Salad', ['Sautéing & stir-frying'], ['Tomatoes']),
    c02Corpus(
      'lesson-shipchanged',
      'Ship Changed Stew',
      ['Sautéing & stir-frying'],
      ['Tomatoes', 'Nightshades']
    ),
    c02Corpus(
      'lesson-unchanged',
      'Unchanged Roast',
      ['Sautéing & stir-frying'],
      ['Tomatoes', 'Nightshades']
    ),
  ].join('\n');

  const runText = [
    c02RunRecord(
      'lesson-floored',
      { cooking_skills: ['Sautéing & stir-frying', 'Knife skills'], main_ingredients: [] },
      { flooredFields: ['main_ingredients'] }
    ),
    c02RunRecord('lesson-shipchanged', {
      cooking_skills: ['Sautéing & stir-frying', 'Knife skills'],
      main_ingredients: ['Tomatoes', 'Nightshades'],
    }),
    c02RunRecord('lesson-unchanged', {
      cooking_skills: ['Sautéing & stir-frying'],
      main_ingredients: ['Tomatoes', 'Nightshades'],
    }),
  ].join('\n');

  const c02CorpusRecs = parseCorpusRecords(corpusText);
  const c02Run = parseRunRecords(runText);
  const c02Report = buildDiffReport(c02CorpusRecs, c02Run, vocab);

  function c02Field(name: string): FieldDiff {
    const found = c02Report.fields.find((f) => f.field === name);
    if (!found) throw new Error(`report has no field ${name}`);
    return found;
  }

  it('scopes a C02 run to ONLY the two C02 fields (the other 12 are not diffed)', () => {
    expect(c02Report.fields.map((f) => f.field)).toEqual(['cooking_skills', 'main_ingredients']);
  });

  it('diffs cooking_skills via floor-retention (floor ∪ LLM), NOT rawInput', () => {
    const f = c02Field('cooking_skills');
    expect(f.label).toBe('Cooking Skills');
    // floored + shipchanged both ADD "Knife skills"; unchanged keeps as-is.
    expect(f.lessonsChangedSemantic).toBe(2);
    expect(f.lessonsUnchanged).toBe(1);
    expect(f.addedValueCounts).toEqual({ 'Knife skills': 2 });
    expect(f.droppedValueCounts).toEqual({});
    const floored = f.changedLessons.find((l) => l.id === 'lesson-floored');
    expect(floored?.added).toEqual(['Knife skills']);
    expect(floored?.dropped).toEqual([]);
  });

  it('diffs main_ingredients via floor-ONLY (ignores the LLM ingredient decision)', () => {
    const f = c02Field('main_ingredients');
    expect(f.label).toBe('Main Ingredients');
    // Only lesson-floored changes: floor-only of [Tomatoes] adds the parent
    // [Nightshades]. shipchanged + unchanged already carry [Tomatoes,Nightshades].
    expect(f.lessonsChangedSemantic).toBe(1);
    expect(f.addedValueCounts).toEqual({ Nightshades: 1 });
    expect(f.droppedValueCounts).toEqual({});
    const floored = f.changedLessons.find((l) => l.id === 'lesson-floored');
    expect(floored?.added).toEqual(['Nightshades']);
  });

  it('renders both C02 fields and OMITS the other fields from the markdown', () => {
    const md = renderMarkdown(c02Report);
    expect(md).toContain('## Cooking Skills');
    expect(md).toContain('## Main Ingredients');
    expect(md).toContain('"Knife skills"');
    expect(md).toContain('"Nightshades"');
    // Other main-pass fields must NOT appear as sections on a C02 run.
    expect(md).not.toContain('## Activity Type');
    expect(md).not.toContain('## Garden Skills');
  });

  describe('ship-policy provenance bucket (floored / ship-changed sample)', () => {
    it('flags the floored row AND the ship-changed row, and EXCLUDES the unchanged row', () => {
      const bucket = c02Report.c02ShipProvenance;
      expect(bucket).toBeDefined();
      const ids = bucket?.rows.map((r) => r.id).sort();
      expect(ids).toEqual(['lesson-floored', 'lesson-shipchanged']);
    });

    it('marks the floored row as floored (flooredFields non-empty)', () => {
      const row = c02Report.c02ShipProvenance?.rows.find((r) => r.id === 'lesson-floored');
      expect(row?.floored).toBe(true);
      expect(row?.flooredFields).toEqual(['main_ingredients']);
      expect(row?.shipChanged).toBe(true);
    });

    it('marks the ship-changed-only row as ship-changed but NOT floored', () => {
      const row = c02Report.c02ShipProvenance?.rows.find((r) => r.id === 'lesson-shipchanged');
      expect(row?.floored).toBe(false);
      expect(row?.flooredFields).toEqual([]);
      expect(row?.shipChanged).toBe(true);
    });

    it('renders a labeled provenance section a human can spot-check', () => {
      const md = renderMarkdown(c02Report);
      expect(md).toMatch(/floored.*ship-changed|ship-changed.*floored|spot-check/i);
      expect(md).toContain('Floored Salad');
      expect(md).toContain('Ship Changed Stew');
      // the unchanged row is NOT in the spot-check sample
      expect(md).not.toContain('Unchanged Roast');
    });
  });
});

describe('selectComparedLessons — C02 ship threading (P3.1-diff, lifts the P2′.3 fail-closed throw)', () => {
  // Minimal shared corpus line: one lesson the run records can target.
  const corpusText = JSON.stringify({
    id: 'lesson-c02',
    title: 'Knife Skills with Onions',
    cooking_skills: ['Sautéing & stir-frying'],
    main_ingredients: ['Nightshades'],
    academic_concepts: null,
  });
  const corpus = parseCorpusRecords(corpusText);

  function runRecordWith(extra: Record<string, unknown>): string {
    return JSON.stringify({
      id: 'lesson-c02',
      phase: 'main',
      model: 'claude-opus-4-7',
      promptSchemaHash: 'hash-current',
      rawInput: { cooking_skills: [], main_ingredients: [] },
      zod: { passed: true, fieldErrors: null },
      usage: null,
      costUsd: null,
      latencyMs: null,
      error: null,
      stopReason: 'tool_use',
      bodyHash: 'h',
      strict: false,
      completedAt: '2026-06-23T00:00:00.000Z',
      ...extra,
    });
  }

  it('with c02ShipThreading: does NOT throw and threads finalC02 onto the compared lesson', () => {
    const runRecords = parseRunRecords(
      runRecordWith({ finalC02: { cooking_skills: ['Knife skills'], main_ingredients: [] } })
    );
    expect(() =>
      selectComparedLessons(corpus, runRecords, new Set(), { c02ShipThreading: true })
    ).not.toThrow();
    const { compared } = selectComparedLessons(corpus, runRecords, new Set(), {
      c02ShipThreading: true,
    });
    expect(compared.map((c) => c.id)).toEqual(['lesson-c02']);
    expect(compared[0].finalC02).toEqual({
      cooking_skills: ['Knife skills'],
      main_ingredients: [],
    });
  });

  it('with c02ShipThreading: threads llmDecisions (reconstruction source) onto the compared lesson', () => {
    const runRecords = parseRunRecords(
      runRecordWith({ llmDecisions: { cooking_skills: { keep: [], drop: [], add: [] } } })
    );
    expect(() =>
      selectComparedLessons(corpus, runRecords, new Set(), { c02ShipThreading: true })
    ).not.toThrow();
    const { compared } = selectComparedLessons(corpus, runRecords, new Set(), {
      c02ShipThreading: true,
    });
    expect(compared[0].llmDecisions).toEqual({
      cooking_skills: { keep: [], drop: [], add: [] },
    });
  });

  it('WITHOUT c02ShipThreading (the apply path): STILL fails closed on a C02 record (P3.2 owns lifting it)', () => {
    const runRecords = parseRunRecords(
      runRecordWith({ finalC02: { cooking_skills: ['Knife skills'], main_ingredients: [] } })
    );
    expect(() => selectComparedLessons(corpus, runRecords)).toThrowError(/finalC02/);
    expect(() => selectComparedLessons(corpus, runRecords)).toThrowError(/C02/);
  });

  it('does NOT throw on legacy records lacking finalC02/llmDecisions (either mode)', () => {
    const runRecords = parseRunRecords(runRecordWith({}));
    expect(() => selectComparedLessons(corpus, runRecords)).not.toThrow();
    const { compared } = selectComparedLessons(corpus, runRecords);
    expect(compared.map((c) => c.id)).toEqual(['lesson-c02']);
    expect(compared[0].finalC02).toBeUndefined();
  });
});

describe('parseArgs — exclusions flag', () => {
  it('accepts --exclusions and rejects it without a value', () => {
    expect(parseArgs(['--exclusions', '/tmp/excl.json']).exclusions).toBe('/tmp/excl.json');
    expect(() => parseArgs(['--exclusions'])).toThrow(/--exclusions requires a value/);
  });
});

describe('parseArgs hardening', () => {
  it('throws when a value-taking flag is missing its value', () => {
    expect(() => parseArgs(['--run'])).toThrow(/--run requires a value/);
    expect(() => parseArgs(['--corpus', '--help'])).toThrow(/--corpus requires a value/);
    expect(() => parseArgs(['--out'])).toThrow(/--out requires a value/);
  });

  it('accepts valid values and still rejects unknown flags', () => {
    expect(parseArgs(['--out', '/tmp/report.md']).out).toBe('/tmp/report.md');
    expect(() => parseArgs(['--bogus'])).toThrow(/unknown flag/);
  });
});
