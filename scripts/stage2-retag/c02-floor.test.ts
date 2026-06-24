/**
 * Unit tests for the ONE canonical C02 floor (design §3·PIVOT D-P3 / impl P2′.1).
 *
 * `applyC02Floor` is the single deterministic function the scorer, gold-key
 * builder, rules-baseline, and (future) reconciler all call. It folds aliases,
 * EXECUTES the drops list, drops unmapped/non-canonical legacy junk, removes the
 * `Herbs & Aromatics` literal (a split candidate, never emitted by the floor),
 * and enforces the specific→group parent invariant. Each emitted value carries a
 * provenance FIELD (exact-canonical / alias-fold / parent-derived).
 *
 * These tests prove (a) the behavior on a synthetic mini-floor with NO real
 * on-disk data, and (b) import-identity: the three legacy floor implementations
 * (predictMembership, build-c02-answer-key's floorAnchor, computeRulesBaseline)
 * are replaced by calls to THIS function — they reference the same symbol, not
 * just produce equal outputs.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  applyC02Floor,
  buildC02FloorInput,
  floorTagValues,
  loadC02FloorInput,
  type C02FloorInput,
} from './c02-floor';
import { floorAnchor } from './build-c02-answer-key';
import { computeRulesBaseline } from './c02-gates';
import { buildC02Floor, matchKey } from './normalize';
import {
  buildC02SamplerContext,
  predictMembership,
  type CorpusRecordForSampling,
} from './sample-answer-key';
import { type C02Manifest } from './vocab';

// ---------------------------------------------------------------------------
// Synthetic mini floor (NO real on-disk data) — mirrors build-c02-answer-key.test
// ---------------------------------------------------------------------------

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

const MINI_ALIAS_MAP: Record<string, string> = {
  Boil: 'Boiling & simmering',
  Tomato: 'Tomatoes',
};

/** drops to EXECUTE (a cosmetic-noise ingredient + a never-stored pantry word). */
const MINI_DROPS = ['Lavender', 'Olive oil'];

const MINI_INPUT: C02FloorInput = buildC02FloorInput(
  buildC02Floor(MINI_ALIAS_MAP, MINI_MANIFEST),
  MINI_MANIFEST,
  MINI_DROPS
);

// ---------------------------------------------------------------------------
// folding + provenance
// ---------------------------------------------------------------------------

describe('applyC02Floor — fold + provenance', () => {
  it('folds a cooking alias key to its canonical with provenance alias-fold', () => {
    const out = applyC02Floor({ cooking_skills: ['Boil'] }, MINI_INPUT);
    expect(out.cooking).toEqual([{ value: 'Boiling & simmering', provenance: 'alias-fold' }]);
  });

  it('marks an already-canonical value (canonical-case rule) as exact-canonical', () => {
    const out = applyC02Floor({ cooking_skills: ['Baking'] }, MINI_INPUT);
    expect(out.cooking).toEqual([{ value: 'Baking', provenance: 'exact-canonical' }]);
  });

  it('marks a miscased canonical as exact-canonical (it was already canonical, just recased)', () => {
    const out = applyC02Floor({ cooking_skills: ['baking'] }, MINI_INPUT);
    expect(out.cooking).toEqual([{ value: 'Baking', provenance: 'exact-canonical' }]);
  });

  it('appends a present specific’s parent group with provenance parent-derived', () => {
    const out = applyC02Floor({ main_ingredients: ['Tomatoes'] }, MINI_INPUT);
    expect(out.ingredients).toEqual([
      { value: 'Tomatoes', provenance: 'exact-canonical' },
      { value: 'Nightshades', provenance: 'parent-derived' },
    ]);
  });

  it('does not re-append a parent already present (no duplicate, group stays exact-canonical)', () => {
    const out = applyC02Floor({ main_ingredients: ['Nightshades', 'Tomatoes'] }, MINI_INPUT);
    expect(out.ingredients).toEqual([
      { value: 'Nightshades', provenance: 'exact-canonical' },
      { value: 'Tomatoes', provenance: 'exact-canonical' },
    ]);
  });

  it('is a no-op parent-reconcile for a null-parent specific (Celery)', () => {
    const out = applyC02Floor({ main_ingredients: ['Celery'] }, MINI_INPUT);
    expect(out.ingredients).toEqual([{ value: 'Celery', provenance: 'exact-canonical' }]);
  });
});

// ---------------------------------------------------------------------------
// drops + unmapped junk
// ---------------------------------------------------------------------------

describe('applyC02Floor — executes drops + removes unmapped junk', () => {
  it('EXECUTES the drops list — a drops-listed value is removed (not kept verbatim)', () => {
    const out = applyC02Floor({ main_ingredients: ['Lavender', 'Tomatoes'] }, MINI_INPUT);
    expect(floorTagValues(out.ingredients)).not.toContain('Lavender');
    expect(floorTagValues(out.ingredients)).toContain('Tomatoes');
  });

  it('executes the Olive oil drop (confirms drops actually fire)', () => {
    const out = applyC02Floor({ main_ingredients: ['Olive oil'] }, MINI_INPUT);
    expect(out.ingredients).toEqual([]);
  });

  it('removes unmapped / non-canonical legacy junk (neither canonical, alias, nor drop)', () => {
    const out = applyC02Floor({ main_ingredients: ['Glitter glue', 'Tomatoes'] }, MINI_INPUT);
    expect(floorTagValues(out.ingredients)).toEqual(['Tomatoes', 'Nightshades']);
  });

  it('emits ONLY canonical values (no off-vocab survives in either field)', () => {
    const out = applyC02Floor(
      {
        cooking_skills: ['Boil', 'Some junk skill'],
        main_ingredients: ['Glitter glue', 'Tomatoes'],
      },
      MINI_INPUT
    );
    const ing = new Set(MINI_INPUT.ingredientValues);
    const cook = new Set(MINI_INPUT.cookingValues);
    for (const t of out.cooking) expect(cook.has(t.value)).toBe(true);
    for (const t of out.ingredients) expect(ing.has(t.value)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// idempotent fixed point
// ---------------------------------------------------------------------------

describe('applyC02Floor — idempotent fixed point', () => {
  it('floor(floor(x)) === floor(x)', () => {
    const x = { cooking_skills: ['Boil', 'Baking'], main_ingredients: ['Tomato', 'Lavender'] };
    const once = applyC02Floor(x, MINI_INPUT);
    const twice = applyC02Floor(
      {
        cooking_skills: floorTagValues(once.cooking),
        main_ingredients: floorTagValues(once.ingredients),
      },
      MINI_INPUT
    );
    expect(floorTagValues(twice.cooking)).toEqual(floorTagValues(once.cooking));
    expect(floorTagValues(twice.ingredients)).toEqual(floorTagValues(once.ingredients));
  });

  it('de-dupes when two inputs fold to the same canonical', () => {
    const out = applyC02Floor({ main_ingredients: ['Tomato', 'Tomatoes'] }, MINI_INPUT);
    expect(floorTagValues(out.ingredients).filter((v) => v === 'Tomatoes')).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Deterministic provenance precedence (Codex P2′.1 #2/#3)
//
// When the SAME resolved value is reached both directly (exact-canonical) and
// via an alias (alias-fold) in one record, the emitted provenance must NOT
// depend on input order — exact-canonical wins. D-P5 uses provenance as a
// confidence signal, so logically-equal tag sets must annotate identically.
// ---------------------------------------------------------------------------

describe('applyC02Floor — provenance is order-independent (exact-canonical wins)', () => {
  it('labels the merged value exact-canonical regardless of which form appears first', () => {
    const aliasFirst = applyC02Floor({ main_ingredients: ['Tomato', 'Tomatoes'] }, MINI_INPUT);
    const canonicalFirst = applyC02Floor({ main_ingredients: ['Tomatoes', 'Tomato'] }, MINI_INPUT);
    const pick = (tags: { value: string; provenance: string }[]) =>
      tags.find((t) => t.value === 'Tomatoes');
    expect(pick(aliasFirst.ingredients)).toEqual({
      value: 'Tomatoes',
      provenance: 'exact-canonical',
    });
    expect(pick(canonicalFirst.ingredients)).toEqual({
      value: 'Tomatoes',
      provenance: 'exact-canonical',
    });
  });

  it('keeps first-occurrence ORDER even when provenance is upgraded', () => {
    // `Tomato` (alias) appears first → `Tomatoes` keeps that slot; `Apples`
    // (canonical) is second. The provenance upgrade must not reorder them.
    const out = applyC02Floor({ main_ingredients: ['Tomato', 'Apples', 'Tomatoes'] }, MINI_INPUT);
    // floorField yields [Tomatoes, Apples] (first-occurrence order); the
    // specific→group invariant then appends parents at the end.
    expect(floorTagValues(out.ingredients)).toEqual([
      'Tomatoes',
      'Apples',
      'Nightshades',
      'Fruits',
    ]);
  });
});

// ---------------------------------------------------------------------------
// Real on-disk data: Herbs & Aromatics + provenance over the live floor
// ---------------------------------------------------------------------------

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, '../..');
const ALIAS_FILE = JSON.parse(
  readFileSync(path.join(REPO_ROOT, 'scripts/stage2-retag/data/c02-alias-map.json'), 'utf8')
) as { aliasMap: Record<string, string>; drops: string[] };

describe('applyC02Floor — real on-disk floor', () => {
  const input = loadC02FloorInput();

  it('does NOT emit "Herbs & Aromatics" verbatim (it is a split candidate, not a fold)', () => {
    const out = applyC02Floor({ main_ingredients: ['Herbs & Aromatics'] }, input);
    expect(floorTagValues(out.ingredients)).toEqual([]);
  });

  it('executes the real Forming patties drop (cooking craft noise)', () => {
    expect(ALIAS_FILE.drops).toContain('Forming patties');
    const out = applyC02Floor({ cooking_skills: ['Forming patties'] }, input);
    expect(out.cooking).toEqual([]);
  });

  it('does NOT fold the vague tags Basic Skills / Cooking Techniques (removed, not folded)', () => {
    // They are LLM-judgment replacements; the floor must not emit any value for them.
    const out = applyC02Floor({ cooking_skills: ['Basic Skills', 'Cooking Techniques'] }, input);
    expect(out.cooking).toEqual([]);
  });

  it('emits parent-derived provenance for a real specific→group append (Beets → Root vegetables)', () => {
    const out = applyC02Floor({ main_ingredients: ['Beets'] }, input);
    expect(out.ingredients).toContainEqual({ value: 'Beets', provenance: 'exact-canonical' });
    expect(out.ingredients).toContainEqual({
      value: 'Root vegetables',
      provenance: 'parent-derived',
    });
  });

  it('emits alias-fold provenance for a real fold (Hummus → Chickpeas, +Beans & legumes parent)', () => {
    const out = applyC02Floor({ main_ingredients: ['Hummus'] }, input);
    expect(out.ingredients).toContainEqual({ value: 'Chickpeas', provenance: 'alias-fold' });
    expect(out.ingredients).toContainEqual({
      value: 'Beans & legumes',
      provenance: 'parent-derived',
    });
  });
});

// ---------------------------------------------------------------------------
// floorTagValues projection helper
// ---------------------------------------------------------------------------

describe('floorTagValues', () => {
  it('projects floored tags to their plain string values, order-preserving', () => {
    expect(
      floorTagValues([
        { value: 'A', provenance: 'exact-canonical' },
        { value: 'B', provenance: 'parent-derived' },
      ])
    ).toEqual(['A', 'B']);
  });
});

// ---------------------------------------------------------------------------
// Import-identity: the three legacy floors now ROUTE THROUGH applyC02Floor
//
// They previously DIVERGED — `predictMembership` (and the rules baseline it
// feeds) KEPT unmapped junk + never executed drops; `floorAnchor` dropped junk
// but never executed drops. After unification, all three must agree with
// applyC02Floor on the SAME junk+drops input over the real on-disk floor, and
// the old junk-keeping behavior must be gone.
// ---------------------------------------------------------------------------

function synth(over: {
  id?: string;
  cooking_skills?: string[];
  main_ingredients?: string[];
}): CorpusRecordForSampling {
  return {
    id: over.id ?? 'identity-synth',
    title: 'T',
    content_text: 'x'.repeat(120),
    cooking_skills: over.cooking_skills ?? [],
    main_ingredients: over.main_ingredients ?? [],
  } as CorpusRecordForSampling;
}

describe('import-identity — all three legacy floors route through applyC02Floor', () => {
  const input = loadC02FloorInput();
  const ctx = buildC02SamplerContext();

  // An input that mixes a fold, an already-canonical value, a drop, unmapped
  // junk, and the Herbs & Aromatics split-literal — the exact cases where the
  // three implementations USED to disagree.
  const current = {
    cooking_skills: ['Mixing', 'Baking', 'Forming patties', 'Some junk skill'],
    main_ingredients: ['Hummus', 'Beets', 'Olive oil', 'Glitter glue', 'Herbs & Aromatics'],
  };

  const expected = applyC02Floor(current, input);

  it('predictMembership === applyC02Floor (value projection)', () => {
    const pred = predictMembership(synth(current), ctx);
    expect(pred.cooking).toEqual(floorTagValues(expected.cooking));
    expect(pred.ingredients).toEqual(floorTagValues(expected.ingredients));
  });

  it('floorAnchor === applyC02Floor (value projection)', () => {
    const anchor = floorAnchor(current, input);
    expect(anchor.cooking_skills).toEqual(floorTagValues(expected.cooking));
    expect(anchor.main_ingredients).toEqual(floorTagValues(expected.ingredients));
  });

  it('computeRulesBaseline (the scorer’s baseline) === applyC02Floor', () => {
    const [baseline] = computeRulesBaseline([synth({ ...current, id: 'B' })], ctx);
    expect(baseline.cooking_skills).toEqual(floorTagValues(expected.cooking));
    expect(baseline.main_ingredients).toEqual(floorTagValues(expected.ingredients));
  });

  it('the OLD junk-keeping behavior is gone — unmapped junk + drops are removed', () => {
    const pred = predictMembership(synth(current), ctx);
    // Previously predictMembership kept these verbatim (`?? tag`); now removed.
    expect(pred.cooking).not.toContain('Some junk skill');
    expect(pred.cooking).not.toContain('Forming patties');
    expect(pred.ingredients).not.toContain('Glitter glue');
    expect(pred.ingredients).not.toContain('Olive oil');
    expect(pred.ingredients).not.toContain('Herbs & Aromatics');
    // The clean folds + parents survive.
    expect(pred.cooking).toContain('Mixing & stirring');
    expect(pred.cooking).toContain('Baking');
    expect(pred.ingredients).toContain('Chickpeas');
    expect(pred.ingredients).toContain('Beets');
  });
});

// sanity: matchKey import is exercised (keeps the import non-dead if reorganized)
describe('matchKey sanity', () => {
  it('lowercases + trims', () => {
    expect(matchKey('  Beets ')).toBe('beets');
  });
});
