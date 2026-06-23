/**
 * Tests for C02 P1.2 — cooking_skills + main_ingredients added to the
 * harness output (schema + vocab + emitter prompt), TDD.
 *
 * Byte-source for the canonical values: `data/c02-vocab.json` (the P1.1
 * manifest). The two fields are flat `string[]` over {groups ∪ specifics}
 * (design §4 Q2); main_ingredients additionally carries a parent-map
 * `.superRefine` that rejects an orphan specific (a specific whose parent
 * group is absent from the same array). cooking_skills is a plain flat enum
 * array like garden_skills — no refinement.
 *
 * Locked invariants exercised here:
 *   - both fields are in MAIN_PASS_FIELDS / the tool schema / the result schema;
 *   - main_ingredients vocab = groups ∪ specifics (24 + 46 = 70);
 *   - cooking_skills vocab = the 23 flat skills;
 *   - the orphan-specific refinement rejects ['Tomatoes'] (Nightshades absent),
 *     accepts ['Nightshades','Tomatoes'], accepts a null-parent specific
 *     (e.g. ['Celery']) alone;
 *   - cooking_skills is a flat enum (accepts a valid skill, rejects off-vocab).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { buildResultSchema, buildSubmitTagsTool, type EnumArraySchema } from './schema';
import { MAIN_PASS_FIELDS, loadVocab } from './vocab';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

interface Specific {
  value: string;
  parent: string | null;
}
interface C02Vocab {
  cookingSkills: string[];
  mainIngredientsGroups: string[];
  mainIngredientsSpecifics: Specific[];
}

const c02 = JSON.parse(
  readFileSync(path.join(MODULE_DIR, 'data', 'c02-vocab.json'), 'utf8')
) as C02Vocab;

const expectedMainIngredients = [
  ...c02.mainIngredientsGroups,
  ...c02.mainIngredientsSpecifics.map((s) => s.value),
];

const vocab = loadVocab();
const tool = buildSubmitTagsTool(vocab);
const resultSchema = buildResultSchema(vocab);

/** A baseline valid result, then overridden per assertion. */
function validResult(): Record<string, unknown> {
  const subjects = vocab.academic_integration.values;
  const emptySubject = { framework: [], everyday: [], synonym_pairs: [] };
  return {
    activity_type: [vocab.activity_type.values[0]],
    tags: [],
    season_timing: [],
    cultural_responsiveness_features: [],
    cultural_heritage: [],
    academic_concepts: Object.fromEntries(subjects.map((s) => [s, emptySubject])),
    academic_integration: [],
    social_emotional_learning: [],
    core_competencies: [],
    cooking_methods: [],
    observances_holidays: [],
    garden_skills: [],
    cooking_skills: [],
    main_ingredients: [],
    grade_levels: [],
  };
}

// ---------------------------------------------------------------------------
// vocab.ts — both fields declared in MAIN_PASS_FIELDS + loadVocab
// ---------------------------------------------------------------------------

describe('C02 vocab declarations', () => {
  it('MAIN_PASS_FIELDS now carries cooking_skills + main_ingredients', () => {
    expect(MAIN_PASS_FIELDS).toContain('cooking_skills');
    expect(MAIN_PASS_FIELDS).toContain('main_ingredients');
    expect(MAIN_PASS_FIELDS).toHaveLength(14);
  });

  it('cooking_skills declares the 23 flat skills + dual-write mapping', () => {
    const decl = vocab.cooking_skills;
    expect(decl.field).toBe('cooking_skills');
    expect(decl.column).toBe('cooking_skills');
    expect(decl.jsonbKey).toBe('cookingSkills');
    expect(decl.shape).toBe('string-array');
    expect(decl.selection).toBe('multi');
    expect(decl.values).toEqual(c02.cookingSkills);
    expect(decl.values).toHaveLength(23);
  });

  it('main_ingredients vocab = groups ∪ specifics (24 + 46 = 70) + dual-write mapping', () => {
    const decl = vocab.main_ingredients;
    expect(decl.field).toBe('main_ingredients');
    expect(decl.column).toBe('main_ingredients');
    expect(decl.jsonbKey).toBe('mainIngredients');
    expect(decl.shape).toBe('string-array');
    expect(decl.selection).toBe('multi');
    expect(decl.values).toEqual(expectedMainIngredients);
    expect(decl.values).toHaveLength(70);
    // Both groups and specifics are present in the flat union.
    expect(decl.values).toContain('Nightshades'); // a group
    expect(decl.values).toContain('Tomatoes'); // a specific
    expect(decl.values).toContain('Celery'); // a null-parent specific
  });

  it('no duplicate values in either new field', () => {
    expect(new Set(vocab.cooking_skills.values).size).toBe(vocab.cooking_skills.values.length);
    expect(new Set(vocab.main_ingredients.values).size).toBe(vocab.main_ingredients.values.length);
  });
});

// ---------------------------------------------------------------------------
// schema.ts — both fields wired into BOTH hand-listed sites
// ---------------------------------------------------------------------------

describe('C02 tool schema (submit_tags)', () => {
  it('the tool property set includes both new fields (14 vocab fields + grade_levels)', () => {
    const keys = Object.keys(tool.input_schema.properties);
    expect(keys).toContain('cooking_skills');
    expect(keys).toContain('main_ingredients');
    expect(keys).toHaveLength(15); // 14 main-pass fields + grade_levels
    // required mirrors properties (all answered every call)
    expect([...tool.input_schema.required].sort()).toEqual(keys.sort());
  });

  it('cooking_skills is an enum array referencing the vocab module data', () => {
    const prop = tool.input_schema.properties.cooking_skills as EnumArraySchema;
    expect(prop.type).toBe('array');
    expect(prop.uniqueItems).toBe(true);
    expect(prop.items.enum).toBe(vocab.cooking_skills.values);
    expect(prop.minItems).toBeUndefined(); // empty array is legitimate
  });

  it('main_ingredients is an enum array referencing the vocab module data', () => {
    const prop = tool.input_schema.properties.main_ingredients as EnumArraySchema;
    expect(prop.type).toBe('array');
    expect(prop.uniqueItems).toBe(true);
    expect(prop.items.enum).toBe(vocab.main_ingredients.values);
    expect(prop.minItems).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Zod result schema — both fields parse; cooking_skills is a flat enum
// ---------------------------------------------------------------------------

describe('C02 result schema — cooking_skills (flat enum)', () => {
  it('accepts a valid cooking skill', () => {
    const r = validResult();
    r.cooking_skills = [vocab.cooking_skills.values[0]];
    const parsed = resultSchema.safeParse(r);
    expect(parsed.success, JSON.stringify(!parsed.success && parsed.error.issues)).toBe(true);
  });

  it('rejects an off-vocab cooking skill', () => {
    const r = validResult();
    r.cooking_skills = ['NOT-A-CANONICAL-SKILL'];
    expect(resultSchema.safeParse(r).success).toBe(false);
  });

  it('accepts an empty cooking_skills array', () => {
    const r = validResult();
    r.cooking_skills = [];
    expect(resultSchema.safeParse(r).success).toBe(true);
  });

  it('has NO parent-map refinement (a flat skill set is never an orphan)', () => {
    const r = validResult();
    // Two unrelated skills — no group/specific relationship exists for cooking.
    r.cooking_skills = [vocab.cooking_skills.values[0], vocab.cooking_skills.values[5]];
    expect(resultSchema.safeParse(r).success).toBe(true);
  });
});

describe('C02 result schema — main_ingredients (orphan-specific superRefine)', () => {
  it('rejects an off-vocab ingredient', () => {
    const r = validResult();
    r.main_ingredients = ['NOT-A-CANONICAL-INGREDIENT'];
    expect(resultSchema.safeParse(r).success).toBe(false);
  });

  it("rejects an orphan specific: ['Tomatoes'] without its parent 'Nightshades'", () => {
    const r = validResult();
    r.main_ingredients = ['Tomatoes'];
    const parsed = resultSchema.safeParse(r);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      // Error must attribute to main_ingredients (so the repair pass re-prompts
      // the right field, not the object root).
      expect(parsed.error.issues.some((i) => i.path[0] === 'main_ingredients')).toBe(true);
    }
  });

  it("accepts the specific WITH its parent: ['Nightshades','Tomatoes']", () => {
    const r = validResult();
    r.main_ingredients = ['Nightshades', 'Tomatoes'];
    const parsed = resultSchema.safeParse(r);
    expect(parsed.success, JSON.stringify(!parsed.success && parsed.error.issues)).toBe(true);
  });

  it("accepts a null-parent specific alone: ['Celery'] (no parent requirement)", () => {
    const r = validResult();
    r.main_ingredients = ['Celery'];
    expect(resultSchema.safeParse(r).success).toBe(true);
  });

  it('accepts a group alone (a group is never an orphan)', () => {
    const r = validResult();
    r.main_ingredients = ['Nightshades'];
    expect(resultSchema.safeParse(r).success).toBe(true);
  });

  it("Melons requires 'Squash, cucumbers & melons' (not null-parent)", () => {
    const orphan = validResult();
    orphan.main_ingredients = ['Melons'];
    expect(resultSchema.safeParse(orphan).success).toBe(false);

    const ok = validResult();
    ok.main_ingredients = ['Squash, cucumbers & melons', 'Melons'];
    expect(resultSchema.safeParse(ok).success).toBe(true);
  });

  it('accepts an empty main_ingredients array', () => {
    const r = validResult();
    r.main_ingredients = [];
    expect(resultSchema.safeParse(r).success).toBe(true);
  });
});
