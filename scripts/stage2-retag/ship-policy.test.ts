/**
 * Unit tests for the per-field SHIP policy (design §3·PIVOT D-P11 / impl P2′.8).
 *
 * `materializeC02Ship` produces the canonical APPLY input per field from a run
 * record + the row's existing tags + the unified floor:
 *   - `main_ingredients` = floor-ONLY (the LLM ingredient decision is IGNORED).
 *   - `cooking_skills`   = floor ∪ the LLM's cooking final (floor-RETENTION:
 *     the LLM may KEEP/ADD but can never DROP a floored skill). The cooking
 *     final is read from `record.finalC02.cooking_skills` when present, ELSE
 *     reconstructed as `keep ∪ valid-add` from the raw decision
 *     (`record.rawInput.cooking_skills`) — making the ship layer inherently
 *     field-isolated (an off-vocab INGREDIENT that crashed `finalC02` can never
 *     affect the ship output). Off-vocab cooking values are dropped against the
 *     manifest.
 *
 * These tests prove the behavior on synthetic mini-inputs (no real on-disk
 * model output). A separate re-score gate (`ship-policy.rescore.test.ts`)
 * reproduces D-P11's numbers over the stored r4 run.
 */
import { describe, expect, it } from 'vitest';

import { buildC02FloorInput, type C02FloorInput } from './c02-floor';
import { materializeC02Ship, type C02ShipRecord } from './ship-policy';
import { buildC02Floor, type C02Floor } from './normalize';
import { type C02Manifest } from './vocab';

// ---------------------------------------------------------------------------
// A small synthetic manifest + floor so the tests own their universe entirely.
// ---------------------------------------------------------------------------

const MANIFEST: C02Manifest = {
  provenance: {},
  // 'Tasting' is canonical here SO the off-vocab guard does NOT catch it — that
  // lets the keep-only-lock tests below exercise the real lock, not off-vocab.
  cookingSkills: ['Boiling & simmering', 'Roasting', 'Knife skills', 'Measuring', 'Tasting'],
  mainIngredientsGroups: ['Leafy greens', 'Alliums'],
  mainIngredientsSpecifics: [
    { value: 'Kale', parent: 'Leafy greens' },
    { value: 'Garlic', parent: 'Alliums' },
  ],
};

/**
 * Build a floor from a synthetic alias map. `buildC02Floor` self-populates every
 * canonical value at its own matchKey (the canonical-case rule), so the map only
 * needs the NON-canonical aliases plus one drop.
 */
function syntheticFloorInput(): C02FloorInput {
  const aliasMap: Record<string, string> = {
    // a cooking alias
    Boiling: 'Boiling & simmering',
    // an ingredient alias
    'Baby kale': 'Kale',
  };
  const drops = ['Olive oil'];
  const floor: C02Floor = buildC02Floor(aliasMap, MANIFEST);
  return buildC02FloorInput(floor, MANIFEST, drops);
}

const COOKING_VALUES = new Set(MANIFEST.cookingSkills);
const FLOOR_INPUT = syntheticFloorInput();

function ship(
  record: C02ShipRecord,
  existing: { cooking_skills?: string[]; main_ingredients?: string[] }
) {
  return materializeC02Ship(record, existing, FLOOR_INPUT, COOKING_VALUES);
}

// ---------------------------------------------------------------------------

describe('materializeC02Ship — main_ingredients = floor-only', () => {
  it('emits the floor over existing ingredient tags', () => {
    const out = ship(
      { finalC02: { cooking_skills: [], main_ingredients: [] } },
      { main_ingredients: ['Baby kale'] } // folds to Kale (+ parent Leafy greens)
    );
    expect(out.main_ingredients.sort()).toEqual(['Kale', 'Leafy greens']);
  });

  it('IGNORES an LLM ingredient ADD entirely (floor-only)', () => {
    // The LLM "decided" Garlic, but ingredients ship from the floor, so an LLM
    // add that is NOT in the existing tags must be ABSENT from the ship output.
    const out = ship(
      { finalC02: { cooking_skills: [], main_ingredients: ['Garlic', 'Alliums'] } },
      { main_ingredients: ['Baby kale'] } // existing → floor = Kale + Leafy greens only
    );
    expect(out.main_ingredients).not.toContain('Garlic');
    expect(out.main_ingredients).not.toContain('Alliums');
    expect(out.main_ingredients.sort()).toEqual(['Kale', 'Leafy greens']);
  });
});

describe('materializeC02Ship — cooking_skills = floor-retention (floor ∪ LLM final)', () => {
  it('retains a floored skill the LLM DROPPED (subtractive blocked)', () => {
    // Existing tags floor to [Roasting]; the LLM final omits Roasting (dropped).
    // Floor-retention means Roasting MUST survive.
    const out = ship(
      { finalC02: { cooking_skills: [], main_ingredients: [] } },
      { cooking_skills: ['Roasting'] }
    );
    expect(out.cooking_skills).toContain('Roasting');
  });

  it('includes an LLM cooking ADD not present in the floor', () => {
    const out = ship(
      { finalC02: { cooking_skills: ['Measuring'], main_ingredients: [] } },
      { cooking_skills: ['Roasting'] }
    );
    expect(out.cooking_skills.sort()).toEqual(['Measuring', 'Roasting']);
  });

  it('output ⊇ floor for cooking (no clean-core data loss)', () => {
    const out = ship(
      { finalC02: { cooking_skills: ['Measuring'], main_ingredients: [] } },
      { cooking_skills: ['Boiling', 'Knife skills'] } // floor = Boiling & simmering, Knife skills
    );
    for (const v of ['Boiling & simmering', 'Knife skills']) {
      expect(out.cooking_skills).toContain(v);
    }
  });

  it('drops an off-vocab cooking ADD against the manifest', () => {
    // The LLM final carries a value NOT in the manifest — it must not ship.
    const out = ship(
      { finalC02: { cooking_skills: ['Measuring', 'Flambeing'], main_ingredients: [] } },
      { cooking_skills: ['Roasting'] }
    );
    expect(out.cooking_skills).not.toContain('Flambeing');
    expect(out.cooking_skills.sort()).toEqual(['Measuring', 'Roasting']);
  });
});

describe('materializeC02Ship — finalC02-or-raw read (field isolation)', () => {
  it('reconstructs keep ∪ valid-add from the raw decision when finalC02 is ABSENT', () => {
    // Mirrors the 4 pilot records: no finalC02 (an off-vocab INGREDIENT crashed
    // it), but the cooking decision is valid. keep = strings; add = {value,reason}.
    const out = ship(
      {
        rawInput: {
          cooking_skills: {
            keep: ['Knife skills'],
            drop: [{ value: 'Measuring', reason: 'body-does-not-support' }],
            add: [{ value: 'Roasting', reason: 'real-technique-taught' }],
          },
        },
      },
      { cooking_skills: ['Boiling'] } // floor = Boiling & simmering
    );
    // cooking final = keep(Knife skills) ∪ add(Roasting); union floor(Boiling & simmering)
    expect(out.cooking_skills.sort()).toEqual(['Boiling & simmering', 'Knife skills', 'Roasting']);
    // and it is NON-EMPTY (the 4-record regression: must yield real cooking)
    expect(out.cooking_skills.length).toBeGreaterThan(0);
  });

  it('reconstructs a valid ADD even when raw keep is ABSENT (does not discard it)', () => {
    // reconstructCookingFinal runs on PRE-validation output; the field whose
    // schema failed may be missing an array. A missing `keep` must not throw away
    // a valid `add` (claude-review PR #543).
    const out = ship(
      {
        rawInput: {
          cooking_skills: {
            // no `keep` key
            drop: [],
            add: [{ value: 'Roasting', reason: 'real-technique-taught' }],
          },
        },
      },
      { cooking_skills: [] }
    );
    expect(out.cooking_skills).toContain('Roasting');
  });

  it('drops an off-vocab value from the raw-decision add', () => {
    const out = ship(
      {
        rawInput: {
          cooking_skills: {
            keep: ['Knife skills'],
            drop: [],
            add: [{ value: 'Flambeing', reason: 'real-technique-taught' }],
          },
        },
      },
      { cooking_skills: [] }
    );
    expect(out.cooking_skills).not.toContain('Flambeing');
    expect(out.cooking_skills).toEqual(['Knife skills']);
  });

  it('reconstruction does NOT subtract a floored skill via the raw drop', () => {
    // Even when the raw decision DROPS a skill, floor-retention keeps it if floored.
    const out = ship(
      {
        rawInput: {
          cooking_skills: {
            keep: [],
            drop: [{ value: 'Roasting', reason: 'body-does-not-support' }],
            add: [],
          },
        },
      },
      { cooking_skills: ['Roasting'] } // floored → must survive
    );
    expect(out.cooking_skills).toContain('Roasting');
  });

  it('does NOT ship a keep-only-locked ADD from the raw decision (mirrors the reconcile lock)', () => {
    // The lock (Tasting / Kitchen & food safety) blocks an ADD on the reconcile
    // path; the reconstruction fallback must match — r4 record 1YOJ adds Tasting.
    // Tasting IS canonical, so the off-vocab guard alone would NOT catch it.
    const out = ship(
      {
        rawInput: {
          cooking_skills: {
            keep: ['Knife skills'],
            drop: [],
            add: [{ value: 'Tasting', reason: 'real-technique-taught' }],
          },
        },
      },
      { cooking_skills: [] } // Tasting NOT in the floor → must NOT ship
    );
    expect(out.cooking_skills).not.toContain('Tasting');
    expect(out.cooking_skills).toEqual(['Knife skills']);
  });

  it('does NOT ship a keep-only-locked value MIS-BUCKETED into raw keep (non-anchored)', () => {
    // GATE-4 hole: the lock must filter keep ∪ add, not just add. A locked value
    // the LLM put in `keep` (not `add`) that is NOT in the floor must not ship.
    const out = ship(
      {
        rawInput: {
          cooking_skills: {
            keep: ['Knife skills', 'Tasting'], // Tasting mis-bucketed into keep
            drop: [],
            add: [],
          },
        },
      },
      { cooking_skills: [] } // Tasting NOT floored → must NOT ship
    );
    expect(out.cooking_skills).not.toContain('Tasting');
    expect(out.cooking_skills).toEqual(['Knife skills']);
  });

  it('a keep-only-locked value that is FLOORED still ships (floor-retention; the lock only blocks the ADD)', () => {
    const out = ship(
      {
        rawInput: {
          cooking_skills: {
            keep: [],
            drop: [],
            add: [{ value: 'Tasting', reason: 'x' }],
          },
        },
      },
      { cooking_skills: ['Tasting'] } // anchored → ships from the floor regardless
    );
    expect(out.cooking_skills).toContain('Tasting');
  });
});

describe('materializeC02Ship — output hygiene', () => {
  it('cooking output is unique', () => {
    const out = ship(
      { finalC02: { cooking_skills: ['Roasting'], main_ingredients: [] } },
      { cooking_skills: ['Roasting'] } // both floor and final carry Roasting
    );
    expect(out.cooking_skills).toEqual(['Roasting']);
  });

  it('ingredient output is unique', () => {
    const out = ship(
      { finalC02: { cooking_skills: [], main_ingredients: [] } },
      { main_ingredients: ['Kale', 'Baby kale'] } // both fold to Kale
    );
    expect(out.main_ingredients.filter((v) => v === 'Kale')).toHaveLength(1);
  });
});
