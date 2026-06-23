/**
 * Tests for the C02 provisional canonical vocab manifest + parent map +
 * deterministic alias-floor (P1.1, TDD).
 *
 * Byte-source: `docs/plans/c02-session1-discovery/q1-vocab-census.md` §2/§3/§4
 * (RECONCILED 2026-06-23 to the locked §4 Q1 decisions) + the decided worksheet
 * `docs/plans/2026-06-12-metadata-rebuild-stage1-cooking-skills-ingredients-worksheet-decided.md`.
 *
 * Locked invariants (design §4 Q1, supervisor adjudication 2026-06-23):
 *   - cooking_skills = 23 flat Title-Case values.
 *   - main_ingredients = 24 groups + 46 specifics = 70 provisional values.
 *   - EXACTLY 4 null-parent (group-less) specifics: Celery, Fennel,
 *     Seaweed (nori), Cocoa & chocolate. Melons is parented under
 *     "Squash, cucumbers & melons" (NOT null).
 *   - 4 user-pre-added high-count specifics: Apples→Apples & pears,
 *     Coconut→Tropical fruits, Oranges→Citrus fruits, Lime→Citrus fruits.
 *   - Pantry B-lite: Sugar→Sweeteners via the alias map; NO Salt/Oil/Soy-sauce
 *     literals anywhere.
 *   - Title-Case value===label throughout.
 *
 * The alias map is the deterministic FLOOR: unambiguous folds only. The four
 * test invariants below are the load-bearing preconditions for the P1.3
 * normalize-rule idempotency contract.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

function readJson(relPath: string): unknown {
  return JSON.parse(readFileSync(path.join(MODULE_DIR, relPath), 'utf8'));
}

// ---------------------------------------------------------------------------
// Loaded artifacts (parsing them here exercises invariant (a))
// ---------------------------------------------------------------------------

interface Specific {
  value: string;
  parent: string | null;
}
interface C02Vocab {
  provenance: Record<string, unknown>;
  cookingSkills: string[];
  mainIngredientsGroups: string[];
  mainIngredientsSpecifics: Specific[];
}
interface C02AliasMap {
  provenance: Record<string, unknown>;
  aliasMap: Record<string, string>;
  drops: string[];
}

const vocab = readJson('./c02-vocab.json') as C02Vocab;
const aliases = readJson('./c02-alias-map.json') as C02AliasMap;

/** The closed canonical set: cooking ∪ groups ∪ specifics. */
const canonicalSet = new Set<string>([
  ...vocab.cookingSkills,
  ...vocab.mainIngredientsGroups,
  ...vocab.mainIngredientsSpecifics.map((s) => s.value),
]);

const groupSet = new Set(vocab.mainIngredientsGroups);

// ---------------------------------------------------------------------------
// Invariant (a) — both JSON files parse + have the expected shape
// ---------------------------------------------------------------------------

describe('c02 manifest — invariant (a): both files parse with the expected shape', () => {
  it('c02-vocab.json parses with the three vocab arrays', () => {
    expect(Array.isArray(vocab.cookingSkills)).toBe(true);
    expect(Array.isArray(vocab.mainIngredientsGroups)).toBe(true);
    expect(Array.isArray(vocab.mainIngredientsSpecifics)).toBe(true);
    for (const s of vocab.mainIngredientsSpecifics) {
      expect(typeof s.value).toBe('string');
      expect(s.parent === null || typeof s.parent === 'string').toBe(true);
    }
  });

  it('c02-alias-map.json parses with aliasMap + drops', () => {
    expect(typeof aliases.aliasMap).toBe('object');
    expect(Array.isArray(aliases.drops)).toBe(true);
  });

  it('aliasMap has the locked key count (201 — drift guard)', () => {
    // 187 original + 14 P2.1b floor top-ups (clean folds the TEST-sourced
    // census missed; see c02-alias-map.json provenance).
    expect(Object.keys(aliases.aliasMap)).toHaveLength(201);
  });

  it('declares the case-insensitive + trim matching in its provenance', () => {
    const note = JSON.stringify(aliases.provenance);
    expect(note.toLowerCase()).toContain('case-insensitive');
  });
});

// ---------------------------------------------------------------------------
// Locked counts — drift guards
// ---------------------------------------------------------------------------

describe('c02 manifest — locked counts (drift guards)', () => {
  it('cooking_skills = 23 (flat, no duplicates)', () => {
    expect(vocab.cookingSkills).toHaveLength(23);
    expect(new Set(vocab.cookingSkills).size).toBe(23);
  });

  it('main_ingredients groups = 24 (no duplicates)', () => {
    expect(vocab.mainIngredientsGroups).toHaveLength(24);
    expect(new Set(vocab.mainIngredientsGroups).size).toBe(24);
  });

  it('main_ingredients specifics = 46 (no duplicate values)', () => {
    expect(vocab.mainIngredientsSpecifics).toHaveLength(46);
    const values = vocab.mainIngredientsSpecifics.map((s) => s.value);
    expect(new Set(values).size).toBe(46);
  });

  it('total main_ingredients canonical = 70 (24 groups + 46 specifics)', () => {
    expect(vocab.mainIngredientsGroups.length + vocab.mainIngredientsSpecifics.length).toBe(70);
  });

  it('exactly 4 null-parent (group-less) specifics', () => {
    const nullParents = vocab.mainIngredientsSpecifics
      .filter((s) => s.parent === null)
      .map((s) => s.value)
      .sort();
    expect(nullParents).toEqual(['Celery', 'Cocoa & chocolate', 'Fennel', 'Seaweed (nori)'].sort());
  });
});

// ---------------------------------------------------------------------------
// Invariant (b) — every specific's parent is null OR a real group
// ---------------------------------------------------------------------------

describe('c02 manifest — invariant (b): specific parents are null or a real group', () => {
  it('every specific parent is null or a member of mainIngredientsGroups', () => {
    for (const s of vocab.mainIngredientsSpecifics) {
      if (s.parent !== null) {
        expect(groupSet.has(s.parent)).toBe(true);
      }
    }
  });

  it('the 4 user-pre-added specifics are present + parented as locked', () => {
    const byValue = new Map(vocab.mainIngredientsSpecifics.map((s) => [s.value, s.parent]));
    expect(byValue.get('Apples')).toBe('Apples & pears');
    expect(byValue.get('Coconut')).toBe('Tropical fruits');
    expect(byValue.get('Oranges')).toBe('Citrus fruits');
    expect(byValue.get('Lime')).toBe('Citrus fruits');
  });

  it('Melons is parented under "Squash, cucumbers & melons" (NOT null)', () => {
    const melons = vocab.mainIngredientsSpecifics.find((s) => s.value === 'Melons');
    expect(melons).toBeDefined();
    expect(melons?.parent).toBe('Squash, cucumbers & melons');
  });
});

// ---------------------------------------------------------------------------
// Invariant (c) — NO canonical value is an alias-map key (idempotency precond)
// ---------------------------------------------------------------------------

describe('c02 alias map — invariant (c): no canonical value is an alias-map key', () => {
  it('no cooking skill / group / specific appears as an aliasMap key', () => {
    const offenders = Object.keys(aliases.aliasMap).filter((k) => canonicalSet.has(k));
    expect(offenders).toEqual([]);
  });

  it('no canonical value appears in the drops list', () => {
    const offenders = aliases.drops.filter((d) => canonicalSet.has(d));
    expect(offenders).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Invariant (d) — every alias VALUE is a canonical value
// ---------------------------------------------------------------------------

describe('c02 alias map — invariant (d): every alias value is canonical', () => {
  it('every aliasMap value is a member of the canonical set', () => {
    const offenders = Object.values(aliases.aliasMap).filter((v) => !canonicalSet.has(v));
    expect(offenders).toEqual([]);
  });

  it('an alias key never equals its own value (no identity self-folds)', () => {
    for (const [key, value] of Object.entries(aliases.aliasMap)) {
      expect(key).not.toBe(value);
    }
  });

  it('Sugar (B-lite) folds to Sweeteners; no Salt/Oil/Soy-sauce canonical literal exists', () => {
    expect(aliases.aliasMap['Sugar']).toBe('Sweeteners');
    expect(canonicalSet.has('Salt')).toBe(false);
    expect(canonicalSet.has('Oil')).toBe(false);
    expect(canonicalSet.has('Soy sauce')).toBe(false);
  });

  it('named §5 remaps fold to their canonical specifics', () => {
    expect(aliases.aliasMap['Hummus']).toBe('Chickpeas');
    expect(aliases.aliasMap['Nori']).toBe('Seaweed (nori)');
    expect(aliases.aliasMap['Seaweed']).toBe('Seaweed (nori)');
    expect(aliases.aliasMap['Chocolate']).toBe('Cocoa & chocolate');
    expect(aliases.aliasMap['Cocoa']).toBe('Cocoa & chocolate');
    expect(aliases.aliasMap['Frying']).toBe('Sautéing & stir-frying');
  });

  it('folds the §4c near-synonym group-words + case twins (review-fix coverage)', () => {
    // Guards against silently dropping an explicitly-enumerated §4c twin
    // (the `rice` omission caught at P1.1 review) or a single-group near-synonym.
    expect(aliases.aliasMap['rice']).toBe('Rice');
    expect(aliases.aliasMap['Seeds']).toBe('Nuts & seeds');
    expect(aliases.aliasMap['Nuts']).toBe('Nuts & seeds');
    expect(aliases.aliasMap['Legumes']).toBe('Beans & legumes');
    expect(aliases.aliasMap['Citrus']).toBe('Citrus fruits');
    expect(aliases.aliasMap['Various spices']).toBe('Spices');
  });

  it('does NOT fold the vague LLM-judgment tags', () => {
    for (const vague of [
      'Basic Skills',
      'Cooking Techniques',
      'Stovetop cooking',
      'Various techniques',
      'Cooking',
      'Heating',
      'Fruits',
      'Vegetables',
      'Herbs',
      'Spices',
      'Dairy',
    ]) {
      expect(Object.prototype.hasOwnProperty.call(aliases.aliasMap, vague)).toBe(false);
    }
  });
});
