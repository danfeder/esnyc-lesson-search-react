/**
 * Corpus-wide per-value prevalence report (impl P3.1 task 3.1 — prevalence half /
 * design §8 ② "committed corpus-wide per-value prevalence report").
 *
 * The scale gate: per CANONICAL tag value, its SHIPPED firing rate across all
 * compared lessons (the check that "would have caught Tasting on 78%"). Built on
 * synthetic in-test fixtures so the suite runs in CI without the gitignored dumps;
 * a guarded local-only assertion exercises the same path against real artifacts
 * when present.
 *
 * SHIPPED firing = the materialized per-field SHIP output (floor-only
 * main_ingredients + floor-retention cooking_skills — D-P11), via the SAME
 * `shipTagsFor` / `materializeC02Ship` the diff report consumes; NEVER rawInput,
 * NEVER raw finalC02.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { parseCorpusRecords } from './generate-diff-report';
import { parseRunRecords } from './run-retag';
import { loadC02Manifest, c02MainIngredientsValues } from './vocab';
import {
  buildPrevalenceReport,
  renderPrevalenceMarkdown,
  parseArgs,
  type PrevalenceReport,
} from './prevalence-report';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS = path.join(MODULE_DIR, 'artifacts');
const REAL_CORPUS = path.join(ARTIFACTS, 'corpus.jsonl');

// ---------------------------------------------------------------------------
// Synthetic fixtures — three C02-anchored lessons + their corpus rows. Every
// value is canonical C02 vocab. Mirrors generate-diff-report.test.ts's pattern.
// ---------------------------------------------------------------------------

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
    // On an anchored record rawInput holds the raw KEEP/DROP/ADD DECISION object
    // (NOT arrays). Deliberately the WRONG arrays here so any code reading
    // rawInput instead of the ship output would fail loudly.
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

// Three lessons:
//   A: current cooking [Sautéing & stir-frying]; finalC02 ADDs "Knife skills".
//      Current ingredients [Tomatoes] → floor parent-derives [Tomatoes, Nightshades].
//   B: current cooking [Sautéing & stir-frying]; finalC02 ADDs "Knife skills".
//      Current ingredients [Tomatoes, Nightshades] (no floor change).
//   C: current cooking [Tasting]; finalC02 KEEP "Tasting" only (no add).
//      Current ingredients [] → ships [].
// Shipped cooking firing: Sautéing 2/3, Knife skills 2/3, Tasting 1/3.
// Shipped ingredient firing: Tomatoes 2/3, Nightshades 2/3.
// Current cooking firing: Sautéing 2/3, Tasting 1/3, Knife skills 0/3.
// Current ingredient firing: Tomatoes 2/3, Nightshades 1/3.
const SYNTH_CORPUS = [
  c02Corpus('lesson-a', 'Alpha Salad', ['Sautéing & stir-frying'], ['Tomatoes']),
  c02Corpus('lesson-b', 'Bravo Stew', ['Sautéing & stir-frying'], ['Tomatoes', 'Nightshades']),
  c02Corpus('lesson-c', 'Charlie Taste Test', ['Tasting'], []),
].join('\n');

const SYNTH_RUN = [
  c02RunRecord('lesson-a', {
    cooking_skills: ['Sautéing & stir-frying', 'Knife skills'],
    main_ingredients: [],
  }),
  c02RunRecord('lesson-b', {
    cooking_skills: ['Sautéing & stir-frying', 'Knife skills'],
    main_ingredients: [],
  }),
  c02RunRecord('lesson-c', {
    cooking_skills: ['Tasting'],
    main_ingredients: [],
  }),
].join('\n');

function build(): PrevalenceReport {
  return buildPrevalenceReport(parseCorpusRecords(SYNTH_CORPUS), parseRunRecords(SYNTH_RUN));
}

function cookingRow(report: PrevalenceReport, value: string) {
  const row = report.cookingSkills.rows.find((r) => r.value === value);
  if (!row) throw new Error(`no cooking row for ${value}`);
  return row;
}

function ingredientRow(report: PrevalenceReport, value: string) {
  const row = report.mainIngredients.rows.find((r) => r.value === value);
  if (!row) throw new Error(`no ingredient row for ${value}`);
  return row;
}

describe('buildPrevalenceReport — shipped firing rate per canonical value', () => {
  it('reports the SHIPPED firing count + rate = (lessons firing it) / (total compared)', () => {
    const report = build();
    expect(report.totalCompared).toBe(3);
    // "Knife skills" was ADDed by the LLM on lesson-a + lesson-b → ships on 2/3.
    const knife = cookingRow(report, 'Knife skills');
    expect(knife.shippedCount).toBe(2);
    expect(knife.shippedRate).toBeCloseTo(2 / 3, 6);
    // "Sautéing & stir-frying" floor-retained on a + b → 2/3.
    const saute = cookingRow(report, 'Sautéing & stir-frying');
    expect(saute.shippedCount).toBe(2);
    expect(saute.shippedRate).toBeCloseTo(2 / 3, 6);
  });

  it('lists a zero-firing canonical value with 0% (firing nowhere is itself signal)', () => {
    const report = build();
    // "Measuring" is canonical but appears in no fixture → must still be a row.
    const measuring = cookingRow(report, 'Measuring');
    expect(measuring.shippedCount).toBe(0);
    expect(measuring.shippedRate).toBe(0);
    expect(measuring.currentCount).toBe(0);
    expect(measuring.currentRate).toBe(0);
  });

  it('covers EVERY canonical value for both fields (no value dropped)', () => {
    const report = build();
    const manifest = loadC02Manifest();
    const cookingValues = new Set(manifest.cookingSkills);
    const ingredientValues = new Set(c02MainIngredientsValues(manifest));
    expect(new Set(report.cookingSkills.rows.map((r) => r.value))).toEqual(cookingValues);
    expect(new Set(report.mainIngredients.rows.map((r) => r.value))).toEqual(ingredientValues);
    expect(report.cookingSkills.rows.length).toBe(cookingValues.size);
    expect(report.mainIngredients.rows.length).toBe(ingredientValues.size);
  });

  it('uses materializeC02Ship floor-retention for cooking (a floored value still fires)', () => {
    const report = build();
    // lesson-c's CURRENT cooking is [Tasting]; the floor retains it → Tasting
    // ships on lesson-c even though the LLM finalC02 only KEEPs it. The shipped
    // firing reflects the floor-union, NOT a bare LLM read.
    const tasting = cookingRow(report, 'Tasting');
    expect(tasting.shippedCount).toBe(1);
    expect(tasting.shippedRate).toBeCloseTo(1 / 3, 6);
  });

  it('uses floor-ONLY ingredients: an off-vocab/ignored LLM add does not fire', () => {
    // lesson-a ships main_ingredients from the FLOOR over its current [Tomatoes],
    // which parent-derives [Tomatoes, Nightshades]. The LLM ingredient decision
    // is ignored entirely. Add a 4th lesson whose finalC02 proposes an ingredient
    // the floor would NOT produce, and assert that proposal never fires shipped.
    const corpus = [SYNTH_CORPUS, c02Corpus('lesson-d', 'Delta Dip', [], ['Tomatoes'])].join('\n');
    const run = [
      SYNTH_RUN,
      // finalC02 proposes "Leafy greens" for ingredients — but ship is floor-only,
      // so lesson-d ships floor([Tomatoes]) = [Tomatoes, Nightshades], NOT greens.
      c02RunRecord('lesson-d', {
        cooking_skills: [],
        main_ingredients: ['Leafy greens'],
      }),
    ].join('\n');
    const report = buildPrevalenceReport(parseCorpusRecords(corpus), parseRunRecords(run));
    expect(report.totalCompared).toBe(4);
    // "Leafy greens" was the LLM's ingredient add for lesson-d but floor-only
    // ship ignores it → 0 shipped firings.
    expect(ingredientRow(report, 'Leafy greens').shippedCount).toBe(0);
    // The floor's parent-derived "Nightshades" DOES ship for lesson-d (+a +b) = 3.
    expect(ingredientRow(report, 'Nightshades').shippedCount).toBe(3);
  });

  it('also reports the CURRENT-corpus firing rate alongside shipped (before → after)', () => {
    const report = build();
    // CURRENT (pre-retag) cooking: Sautéing on a+b (2), Tasting on c (1),
    // Knife skills nowhere (0, an LLM addition).
    expect(cookingRow(report, 'Sautéing & stir-frying').currentCount).toBe(2);
    expect(cookingRow(report, 'Tasting').currentCount).toBe(1);
    expect(cookingRow(report, 'Knife skills').currentCount).toBe(0);
    // CURRENT ingredients: Tomatoes on a+b (2), Nightshades only on b (1).
    expect(ingredientRow(report, 'Tomatoes').currentCount).toBe(2);
    expect(ingredientRow(report, 'Nightshades').currentCount).toBe(1);
    // Delta = shipped − current. Knife skills: 2 − 0 = +2; Nightshades: 2 − 1 = +1.
    expect(cookingRow(report, 'Knife skills').delta).toBe(2);
    expect(ingredientRow(report, 'Nightshades').delta).toBe(1);
  });

  it('reports cooking_skills and main_ingredients as SEPARATE field sections', () => {
    const report = build();
    expect(report.cookingSkills.field).toBe('cooking_skills');
    expect(report.mainIngredients.field).toBe('main_ingredients');
    // A cooking value is not mixed into the ingredient rows and vice-versa.
    expect(report.cookingSkills.rows.some((r) => r.value === 'Tomatoes')).toBe(false);
    expect(report.mainIngredients.rows.some((r) => r.value === 'Tasting')).toBe(false);
  });
});

describe('renderPrevalenceMarkdown — output format', () => {
  it('sorts rows within each field by shipped % descending (over-firing at the top)', () => {
    const md = renderPrevalenceMarkdown(build());
    const cookingSection = md.split('## Main Ingredients')[0];
    // Sautéing (2/3) and Knife skills (2/3) tie at the top; Tasting (1/3) below;
    // Measuring (0) at the bottom. Assert a top firing value appears before a
    // zero-firing one in the rendered cooking section.
    const idxKnife = cookingSection.indexOf('Knife skills');
    const idxTasting = cookingSection.indexOf('| Tasting ');
    const idxMeasuring = cookingSection.indexOf('| Measuring ');
    expect(idxKnife).toBeGreaterThanOrEqual(0);
    expect(idxTasting).toBeGreaterThan(idxKnife);
    expect(idxMeasuring).toBeGreaterThan(idxTasting);
  });

  it('includes a header with total compared lessons and a how-to-read note', () => {
    const md = renderPrevalenceMarkdown(build());
    expect(md).toContain('3'); // total compared
    expect(md.toLowerCase()).toContain('firing rate');
    expect(md).toContain('## Cooking Skills');
    expect(md).toContain('## Main Ingredients');
    // Each row carries shipped + current count + % + delta columns.
    expect(md).toContain('shipped %');
    expect(md).toContain('current %');
  });
});

describe('parseArgs', () => {
  it('defaults corpus + run + out to artifact paths and accepts overrides', () => {
    const defaults = parseArgs([]);
    expect(defaults.corpus).toContain('corpus.jsonl');
    expect(defaults.out).toContain('.md');
    const overridden = parseArgs([
      '--corpus',
      '/tmp/c.jsonl',
      '--run',
      '/tmp/r.jsonl',
      '--out',
      '/tmp/o.md',
    ]);
    expect(overridden.corpus).toBe('/tmp/c.jsonl');
    expect(overridden.run).toBe('/tmp/r.jsonl');
    expect(overridden.out).toBe('/tmp/o.md');
  });
});

describe('real-corpus smoke (local-only; skipped in CI without the dumps)', () => {
  // The real corpus.jsonl carries lesson bodies → gitignored, present only on a
  // local checkout. Guard with the existsSync-skip idiom (ship-policy.rescore
  // template): bail BEFORE any read so collection never touches the missing file.
  if (!existsSync(REAL_CORPUS)) {
    it.skip('requires local-only corpus.jsonl — skipped in CI', () => {});
    return;
  }
  // Local only: a real run JSONL does not yet exist (the full LLM run is a later
  // user-gated step), so we cannot build a real shipped report here. We only
  // assert the manifest universe is intact end-to-end against the real corpus
  // parse — the synthetic fixtures above carry the behavioral assertions.
  it('parses the real corpus without throwing', () => {
    const records = parseCorpusRecords(readFileSync(REAL_CORPUS, 'utf8'));
    expect(records.length).toBeGreaterThan(0);
  });
});
