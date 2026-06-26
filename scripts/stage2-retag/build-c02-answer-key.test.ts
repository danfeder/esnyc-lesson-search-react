/**
 * Tests for the C02 gold-key build tooling (P2.2): scaffold / worksheet /
 * assemble.
 *
 * The module REUSES the existing floor (loadC02Floor / matchKey / C02Floor),
 * the manifest accessors (c02MainIngredientsValues / c02IngredientParentMap),
 * and the hard-case classifier (classifyHardCase) — it never re-implements
 * fold/parent/hard-case logic. These tests inject SYNTHETIC mini manifests +
 * mini corpora (a 2-3 lesson set) so they do not depend on the real 70-row
 * corpus or the real on-disk vocab.
 *
 * Coverage:
 *   - scaffold: the manifest×corpus join produces N rows in manifest order;
 *     floorAnchor folds a known alias to its canonical AND drops a
 *     non-canonical leftover; hardCaseJudgment agrees with classifyHardCase; a
 *     missing manifest id throws; a stale corpus (neither field key) throws.
 *   - assemble: accepts canonical values; normalizes casing
 *     (boiling & simmering -> Boiling & simmering); rejects an off-vocab value;
 *     rejects an orphan specific (Tomatoes w/o Nightshades); accepts a
 *     null-parent specific alone (Celery); de-dupes within a field.
 *   - worksheet -> assemble round-trip: the pre-filled FINAL lines parse back to
 *     exactly the pre-filled values (proves the FINAL format is stable).
 */
import { describe, expect, it } from 'vitest';

import { buildC02FloorInput, type C02FloorInput } from './c02-floor';
import { matchKey, buildC02Floor, type C02Floor } from './normalize';
import type { CorpusRecordForSampling, C02SamplerContext } from './sample-answer-key';
import { classifyHardCase } from './sample-answer-key';
import { c02IngredientParentMap, c02MainIngredientsValues, type C02Manifest } from './vocab';
import {
  assembleFromWorksheet,
  bucketField,
  buildScaffold,
  floorAnchor,
  renderWorksheet,
  type C02ScaffoldRecord,
  type ManifestSelection,
} from './build-c02-answer-key';

// ---------------------------------------------------------------------------
// Synthetic mini manifest + floor + sampler context (NO real on-disk data)
// ---------------------------------------------------------------------------

/**
 * A tiny manifest: 2 cooking skills, 2 ingredient groups, 3 specifics — one
 * normal (Tomatoes -> Nightshades), one null-parent (Celery), one whose parent
 * is the other group (Apples -> Fruits).
 */
const MINI_MANIFEST: C02Manifest = {
  provenance: { note: 'synthetic test manifest' },
  cookingSkills: ['Boiling & simmering', 'Baking'],
  mainIngredientsGroups: ['Nightshades', 'Fruits'],
  mainIngredientsSpecifics: [
    { value: 'Tomatoes', parent: 'Nightshades' },
    { value: 'Apples', parent: 'Fruits' },
    { value: 'Celery', parent: null },
  ],
};

/** Alias map: a cooking alias + an ingredient alias (both fold to canonicals). */
const MINI_ALIAS_MAP: Record<string, string> = {
  Boil: 'Boiling & simmering',
  Tomato: 'Tomatoes',
};

const MINI_FLOOR: C02Floor = buildC02Floor(MINI_ALIAS_MAP, MINI_MANIFEST);
const MINI_PARENT_MAP = c02IngredientParentMap(MINI_MANIFEST);
const MINI_DROPS = ['Lavender'];

/** The ONE canonical floor input (D-P3) the unified floor consumes. */
const MINI_INPUT: C02FloorInput = buildC02FloorInput(MINI_FLOOR, MINI_MANIFEST, MINI_DROPS);

/**
 * A synthetic sampler context for classifyHardCase + buildScaffold. The hard-case
 * classifier keys off dropKeys + ingredientFolds + the vague/herbs literals; the
 * scaffold floor-anchor keys off `floorInput`. We wire both from the mini floor +
 * a synthetic drop.
 */
const MINI_CTX: C02SamplerContext = {
  floor: MINI_FLOOR,
  parentMap: MINI_PARENT_MAP,
  dropKeys: new Set(MINI_DROPS.map((d) => matchKey(d))),
  cookingFolds: MINI_FLOOR.cookingFolds,
  ingredientFolds: MINI_FLOOR.ingredientFolds,
  cookingValues: MINI_MANIFEST.cookingSkills,
  ingredientValues: c02MainIngredientsValues(MINI_MANIFEST),
  keywords: new Map(),
  floorInput: MINI_INPUT,
};

let synthCounter = 0;
function synthRecord(
  over: Partial<CorpusRecordForSampling> & { id?: string }
): CorpusRecordForSampling {
  const id = over.id ?? `c02-key-synth-${synthCounter++}`;
  return {
    id,
    title: over.title ?? `Synthetic ${id}`,
    content_text: over.content_text ?? 'x'.repeat(120),
    activity_type: over.activity_type ?? ['cooking'],
    tags: null,
    season_timing: [],
    cultural_responsiveness_features: [],
    cultural_heritage: [],
    academic_integration: [],
    social_emotional_learning: [],
    core_competencies: [],
    cooking_methods: [],
    observances_holidays: [],
    garden_skills: [],
    academic_concepts: {},
    cooking_skills: over.cooking_skills ?? [],
    main_ingredients: over.main_ingredients ?? [],
  } as CorpusRecordForSampling;
}

function selection(over: Partial<ManifestSelection> & { id: string }): ManifestSelection {
  return {
    id: over.id,
    title: over.title ?? `T ${over.id}`,
    layer: over.layer ?? 'clean-core',
    hardCaseClass: over.hardCaseClass ?? null,
  };
}

// ---------------------------------------------------------------------------
// floorAnchor (the deterministic clean-core prediction)
// ---------------------------------------------------------------------------

describe('floorAnchor', () => {
  it('folds a known alias to its canonical value (+ R9 appends the parent group)', () => {
    const out = floorAnchor({ cooking_skills: ['Boil'], main_ingredients: ['Tomato'] }, MINI_INPUT);
    expect(out.cooking_skills).toEqual(['Boiling & simmering']);
    // R9 parent-reconcile: the specific Tomatoes pulls its parent Nightshades.
    expect(out.main_ingredients).toEqual(['Tomatoes', 'Nightshades']);
  });

  it('drops a non-canonical leftover (a value the floor cannot fold)', () => {
    const out = floorAnchor(
      { cooking_skills: ['Boil', 'Frobnicating'], main_ingredients: ['Tomato', 'Quux'] },
      MINI_INPUT
    );
    // Frobnicating / Quux are not canonical and not alias keys -> dropped;
    // Tomatoes survives and pulls its parent Nightshades (R9).
    expect(out.cooking_skills).toEqual(['Boiling & simmering']);
    expect(out.main_ingredients).toEqual(['Tomatoes', 'Nightshades']);
  });

  it('appends the parent group for a present specific (R9) but not for a null-parent specific', () => {
    const withParent = floorAnchor(
      { cooking_skills: [], main_ingredients: ['Tomato'] },
      MINI_INPUT
    );
    expect(withParent.main_ingredients).toEqual(['Tomatoes', 'Nightshades']);

    // Celery is a null-parent specific -> no parent appended.
    const nullParent = floorAnchor(
      { cooking_skills: [], main_ingredients: ['celery'] },
      MINI_INPUT
    );
    expect(nullParent.main_ingredients).toEqual(['Celery']);
  });

  it('normalizes a miscased canonical to its canonical casing', () => {
    const out = floorAnchor(
      { cooking_skills: ['boiling & simmering'], main_ingredients: ['celery'] },
      MINI_INPUT
    );
    expect(out.cooking_skills).toEqual(['Boiling & simmering']);
    expect(out.main_ingredients).toEqual(['Celery']);
  });

  it('de-dupes when two inputs fold to the same canonical', () => {
    const out = floorAnchor(
      { cooking_skills: ['Boil', 'boiling & simmering'], main_ingredients: [] },
      MINI_INPUT
    );
    expect(out.cooking_skills).toEqual(['Boiling & simmering']);
  });
});

// ---------------------------------------------------------------------------
// bucketField — per-tag AGREED / CONTESTED provenance
// ---------------------------------------------------------------------------

describe('bucketField', () => {
  it('AGREED = floor ∪ (draft ∩ codex); CONTESTED splits the lens-only tags', () => {
    // floor={A}, draft={A,B,C}, codex={A,B,D} -> AGREED={A,B}, C[sonnet], D[codex].
    const out = bucketField(['A'], ['A', 'B', 'C'], ['A', 'B', 'D']);
    expect(out.agreed).toEqual(['A', 'B']);
    expect(out.contested).toEqual([
      { value: 'C', provenance: 'sonnet' },
      { value: 'D', provenance: 'codex' },
    ]);
  });

  it('keeps floor first, then the draft∩codex remainder, in stable order', () => {
    const out = bucketField(['Z'], ['B', 'A', 'Z'], ['A', 'B', 'Z']);
    // floor Z first, then intersection in draft order (B, A) minus the already-agreed Z.
    expect(out.agreed).toEqual(['Z', 'B', 'A']);
    expect(out.contested).toEqual([]);
  });

  it('with NO codex lens, AGREED = floor ∪ draft and nothing is contested', () => {
    const out = bucketField(['A'], ['A', 'B', 'C'], undefined);
    expect(out.agreed).toEqual(['A', 'B', 'C']);
    expect(out.contested).toEqual([]);
  });

  it('annotates a tag both lenses propose but the floor∩ excluded as sonnet+codex (defensive)', () => {
    // Force the impossible-under-intersection branch via a stubbed agreed set:
    // a tag present in BOTH draft and codex must be in AGREED, so we cannot
    // trigger it through the public path — assert the normal both-lens tag lands
    // in AGREED instead (the only reachable behavior), documenting the rule.
    const out = bucketField([], ['A', 'X'], ['A', 'Y']);
    expect(out.agreed).toEqual(['A']); // both lenses -> agreed, never contested
    expect(out.contested).toEqual([
      { value: 'X', provenance: 'sonnet' },
      { value: 'Y', provenance: 'codex' },
    ]);
  });

  it('de-dupes across draft+codex when building CONTESTED', () => {
    const out = bucketField([], ['A', 'A'], ['B', 'B']);
    expect(out.agreed).toEqual([]);
    expect(out.contested).toEqual([
      { value: 'A', provenance: 'sonnet' },
      { value: 'B', provenance: 'codex' },
    ]);
  });
});

describe('bucketField → prefill parent-reconcile (via floorAnchor + appendParents)', () => {
  it('a specific in AGREED pulls its parent group into the FINAL pre-fill', () => {
    // floor anchor already carries Tomatoes+Nightshades (R9). The pre-fill of the
    // AGREED bucket is then parent-reconciled, so a present specific keeps its
    // group and assemble accepts it. We prove it round-trips assemble-valid.
    const scaffold: C02ScaffoldRecord = {
      id: 'P',
      title: 'T P',
      layer: 'clean-core',
      hardCaseClass: null,
      hardCaseJudgment: true,
      current: { cooking_skills: [], main_ingredients: [] },
      // floor anchor lacks the parent (constructed by hand to a single specific)
      // — appendParents in prefill must add Nightshades so assemble passes.
      floorAnchor: { cooking_skills: [], main_ingredients: ['Tomatoes'] },
      bodyExcerpt: 'body text',
    };
    const proposals = new Map([
      [
        'P',
        {
          draft: { cooking_skills: [], main_ingredients: ['Tomatoes'] },
          codex: { cooking_skills: [], main_ingredients: ['Tomatoes'] },
        },
      ],
    ]);
    const md = renderWorksheet([scaffold], proposals, MINI_FLOOR);
    const out = assembleFromWorksheet(md, [selection({ id: 'P' })], MINI_MANIFEST, MINI_FLOOR);
    // Tomatoes (AGREED) pulled its parent Nightshades into the pre-fill -> no orphan.
    expect(out[0].main_ingredients.sort()).toEqual(['Nightshades', 'Tomatoes']);
  });
});

// ---------------------------------------------------------------------------
// buildScaffold
// ---------------------------------------------------------------------------

describe('buildScaffold', () => {
  it('joins the selected ids to the corpus producing one row per selection in manifest order', () => {
    const corpus = [
      synthRecord({ id: 'A', cooking_skills: ['Boil'], main_ingredients: ['Tomato'] }),
      synthRecord({ id: 'B', cooking_skills: [], main_ingredients: [] }),
      synthRecord({ id: 'C', cooking_skills: [], main_ingredients: ['Lavender'] }),
    ];
    const selections = [selection({ id: 'C' }), selection({ id: 'A' }), selection({ id: 'B' })];
    const rows = buildScaffold(selections, corpus, MINI_CTX);
    expect(rows.map((r) => r.id)).toEqual(['C', 'A', 'B']); // manifest order, not corpus order
    expect(rows).toHaveLength(3);
  });

  it('populates current verbatim and floorAnchor from the floor', () => {
    const corpus = [
      synthRecord({ id: 'A', cooking_skills: ['Boil'], main_ingredients: ['Tomato', 'Quux'] }),
    ];
    const [row] = buildScaffold([selection({ id: 'A' })], corpus, MINI_CTX);
    expect(row.current.cooking_skills).toEqual(['Boil']);
    expect(row.current.main_ingredients).toEqual(['Tomato', 'Quux']);
    expect(row.floorAnchor.cooking_skills).toEqual(['Boiling & simmering']);
    // Quux is non-canonical -> dropped; Tomatoes survives + R9 appends Nightshades.
    expect(row.floorAnchor.main_ingredients).toEqual(['Tomatoes', 'Nightshades']);
  });

  it('sets hardCaseJudgment to agree with classifyHardCase', () => {
    const orphan = synthRecord({ id: 'C', main_ingredients: ['Lavender'] }); // in dropKeys
    const clean = synthRecord({ id: 'A', cooking_skills: ['Boil'] });
    const corpus = [orphan, clean];
    const rows = buildScaffold([selection({ id: 'C' }), selection({ id: 'A' })], corpus, MINI_CTX);
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(byId.get('C')!.hardCaseJudgment).toBe(classifyHardCase(orphan, MINI_CTX) !== null);
    expect(byId.get('C')!.hardCaseJudgment).toBe(true);
    expect(byId.get('A')!.hardCaseJudgment).toBe(classifyHardCase(clean, MINI_CTX) !== null);
    expect(byId.get('A')!.hardCaseJudgment).toBe(false);
  });

  it('trims the body excerpt to ~2000 chars', () => {
    const corpus = [synthRecord({ id: 'A', content_text: 'z'.repeat(5000) })];
    const [row] = buildScaffold([selection({ id: 'A' })], corpus, MINI_CTX);
    expect(row.bodyExcerpt.length).toBeLessThanOrEqual(2000);
    expect(row.bodyExcerpt.length).toBeGreaterThan(0);
  });

  it('throws (exit-1 cause) when a selected id is missing from the corpus', () => {
    const corpus = [synthRecord({ id: 'A' })];
    expect(() => buildScaffold([selection({ id: 'MISSING' })], corpus, MINI_CTX)).toThrow(
      /MISSING/
    );
  });

  it('throws when the corpus is stale (a record with neither field key present)', () => {
    const staleRec = {
      id: 'A',
      title: 'A',
      content_text: 'body',
      // NOTE: no cooking_skills / main_ingredients keys at all
    } as unknown as CorpusRecordForSampling;
    expect(() => buildScaffold([selection({ id: 'A' })], [staleRec], MINI_CTX)).toThrow(/stale/i);
  });
});

// ---------------------------------------------------------------------------
// assembleFromWorksheet — validation
// ---------------------------------------------------------------------------

function makeWorksheet(sections: { id: string; cooking: string; ingredients: string }[]): string {
  const blocks = sections.map((s, i) =>
    [
      `## ${i + 1}/${sections.length} — T ${s.id}`,
      `<!-- lesson-id: ${s.id} -->`,
      '',
      `FINAL cooking_skills = ${s.cooking}`,
      `FINAL main_ingredients = ${s.ingredients}`,
      '',
      '---',
    ].join('\n')
  );
  return `# C02 worksheet\n\n${blocks.join('\n')}\n`;
}

function assembleWith(markdown: string, selections: ManifestSelection[]) {
  return assembleFromWorksheet(markdown, selections, MINI_MANIFEST, MINI_FLOOR);
}

describe('assembleFromWorksheet — validation', () => {
  it('accepts canonical values and emits id + the two fields only', () => {
    const md = makeWorksheet([
      { id: 'A', cooking: 'Baking', ingredients: 'Nightshades; Tomatoes' },
    ]);
    const out = assembleWith(md, [selection({ id: 'A' })]);
    expect(out).toEqual([
      { id: 'A', cooking_skills: ['Baking'], main_ingredients: ['Nightshades', 'Tomatoes'] },
    ]);
  });

  it('normalizes casing (boiling & simmering -> Boiling & simmering)', () => {
    const md = makeWorksheet([{ id: 'A', cooking: 'boiling & simmering', ingredients: 'celery' }]);
    const out = assembleWith(md, [selection({ id: 'A' })]);
    expect(out[0].cooking_skills).toEqual(['Boiling & simmering']);
    expect(out[0].main_ingredients).toEqual(['Celery']);
  });

  it('rejects an off-vocab value (names the value + id)', () => {
    const md = makeWorksheet([{ id: 'A', cooking: 'Flambeing', ingredients: '' }]);
    expect(() => assembleWith(md, [selection({ id: 'A' })])).toThrow(/Flambeing/);
  });

  it('rejects an orphan specific (Tomatoes without Nightshades)', () => {
    const md = makeWorksheet([{ id: 'A', cooking: '', ingredients: 'Tomatoes' }]);
    expect(() => assembleWith(md, [selection({ id: 'A' })])).toThrow(/Nightshades/);
  });

  it('accepts a null-parent specific alone (Celery)', () => {
    const md = makeWorksheet([{ id: 'A', cooking: '', ingredients: 'Celery' }]);
    const out = assembleWith(md, [selection({ id: 'A' })]);
    expect(out[0].main_ingredients).toEqual(['Celery']);
  });

  it('de-dupes within a field preserving first-occurrence order', () => {
    const md = makeWorksheet([
      { id: 'A', cooking: 'Baking; Baking', ingredients: 'Nightshades; Tomatoes; Nightshades' },
    ]);
    const out = assembleWith(md, [selection({ id: 'A' })]);
    expect(out[0].cooking_skills).toEqual(['Baking']);
    expect(out[0].main_ingredients).toEqual(['Nightshades', 'Tomatoes']);
  });

  it('parses an empty field (nothing after =) as an empty array', () => {
    const md = makeWorksheet([{ id: 'A', cooking: '', ingredients: 'Celery' }]);
    const out = assembleWith(md, [selection({ id: 'A' })]);
    expect(out[0].cooking_skills).toEqual([]);
  });

  it('throws when the section count does not match the manifest', () => {
    const md = makeWorksheet([{ id: 'A', cooking: 'Baking', ingredients: '' }]);
    expect(() => assembleWith(md, [selection({ id: 'A' }), selection({ id: 'B' })])).toThrow();
  });

  it('throws when a section id is not in the manifest set', () => {
    const md = makeWorksheet([{ id: 'X', cooking: 'Baking', ingredients: '' }]);
    expect(() => assembleWith(md, [selection({ id: 'A' })])).toThrow(/X/);
  });

  it('throws when a FINAL line is missing for a section', () => {
    const md = [
      '# C02 worksheet',
      '<!-- lesson-id: A -->',
      'FINAL cooking_skills = Baking',
      '', // no FINAL main_ingredients line
      '---',
    ].join('\n');
    expect(() => assembleWith(md, [selection({ id: 'A' })])).toThrow(/main_ingredients/);
  });
});

// ---------------------------------------------------------------------------
// worksheet -> assemble round-trip
// ---------------------------------------------------------------------------

describe('renderWorksheet -> assembleFromWorksheet round-trip', () => {
  function scaffoldRow(over: Partial<C02ScaffoldRecord> & { id: string }): C02ScaffoldRecord {
    return {
      id: over.id,
      title: over.title ?? `T ${over.id}`,
      layer: over.layer ?? 'clean-core',
      hardCaseClass: over.hardCaseClass ?? null,
      hardCaseJudgment: over.hardCaseJudgment ?? false,
      current: over.current ?? { cooking_skills: [], main_ingredients: [] },
      floorAnchor: over.floorAnchor ?? { cooking_skills: [], main_ingredients: [] },
      bodyExcerpt: over.bodyExcerpt ?? 'body text',
    };
  }

  it('reproduces the pre-filled FINAL values exactly (floor anchor, no proposals)', () => {
    const scaffold = [
      scaffoldRow({
        id: 'A',
        floorAnchor: { cooking_skills: ['Baking'], main_ingredients: ['Nightshades', 'Tomatoes'] },
      }),
      scaffoldRow({ id: 'B', floorAnchor: { cooking_skills: [], main_ingredients: ['Celery'] } }),
    ];
    const md = renderWorksheet(scaffold, new Map(), MINI_FLOOR);
    const out = assembleFromWorksheet(
      md,
      scaffold.map((s) => selection({ id: s.id })),
      MINI_MANIFEST,
      MINI_FLOOR
    );
    expect(out).toEqual([
      { id: 'A', cooking_skills: ['Baking'], main_ingredients: ['Nightshades', 'Tomatoes'] },
      { id: 'B', cooking_skills: [], main_ingredients: ['Celery'] },
    ]);
  });

  it('pre-fills the AGREED bucket (floorAnchor ∪ draft∩codex) — contested tags are NOT pre-filled', () => {
    // floor={Baking}/{Nightshades,Tomatoes}; draft adds Boiling (cooking) +
    // Apples,Fruits (ingredients); codex agrees only on Apples,Fruits (NOT
    // Boiling). AGREED cooking = {Baking}; AGREED ingredients = floor ∪
    // {Apples,Fruits}. Boiling is contested [sonnet] → left out of the pre-fill.
    const scaffold = [
      scaffoldRow({
        id: 'A',
        hardCaseJudgment: true,
        floorAnchor: { cooking_skills: ['Baking'], main_ingredients: ['Nightshades', 'Tomatoes'] },
      }),
    ];
    const proposals = new Map([
      [
        'A',
        {
          draft: {
            cooking_skills: ['Baking', 'Boiling & simmering'],
            main_ingredients: ['Nightshades', 'Tomatoes', 'Fruits', 'Apples'],
          },
          codex: {
            cooking_skills: ['Baking'],
            main_ingredients: ['Nightshades', 'Tomatoes', 'Fruits', 'Apples'],
          },
        },
      ],
    ]);
    const md = renderWorksheet(scaffold, proposals, MINI_FLOOR);
    const out = assembleFromWorksheet(md, [selection({ id: 'A' })], MINI_MANIFEST, MINI_FLOOR);
    // Boiling & simmering (draft-only) is excluded from the AGREED pre-fill.
    expect(out[0].cooking_skills).toEqual(['Baking']);
    // Agreed ingredients = floor {Nightshades, Tomatoes} ∪ both-lens {Fruits, Apples}.
    expect(out[0].main_ingredients.sort()).toEqual(['Apples', 'Fruits', 'Nightshades', 'Tomatoes']);
    // The contested tag is surfaced (annotated) but NOT in the FINAL line.
    expect(md).toMatch(/Boiling & simmering \[sonnet\]/);
  });

  it('renders the agreed / contested provenance blocks per field', () => {
    const scaffold = [
      scaffoldRow({
        id: 'A',
        hardCaseJudgment: true,
        floorAnchor: { cooking_skills: ['Baking'], main_ingredients: [] },
      }),
    ];
    const proposals = new Map([
      [
        'A',
        {
          draft: { cooking_skills: ['Baking'], main_ingredients: [] },
          codex: { cooking_skills: ['Boiling & simmering'], main_ingredients: [] },
        },
      ],
    ]);
    const md = renderWorksheet(scaffold, proposals, MINI_FLOOR);
    expect(md).toMatch(/agreed \(high-confidence\)/);
    expect(md).toMatch(/contested — decide each/);
    // Baking is in the floor anchor -> AGREED (not contested). Boiling (codex-
    // only, not in the floor) is the sole contested tag, annotated [codex].
    expect(md).toMatch(/cooking_skills — agreed \(high-confidence\):\*\* Baking/);
    expect(md).toMatch(/Boiling & simmering \[codex\]/);
  });
});
