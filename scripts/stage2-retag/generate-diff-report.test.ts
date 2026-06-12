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

  it('covers all 12 main-pass fields in canonical order', () => {
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
