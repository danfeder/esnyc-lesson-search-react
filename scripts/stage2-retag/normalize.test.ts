/**
 * Unit tests for the deterministic, code-enforced mechanical tagging rules
 * (dry-run policy-violation findings R1/R4/R5). Two Opus generations ignored
 * these rules no matter how the prompt stated them; the design's "Zod +
 * repair pass remains the backstop" principle says enforce them in CODE.
 *
 * normalizeRecordInput is a PURE function: given a raw tool_use input object,
 * it returns a normalized copy plus a provenance list of every rule applied.
 * Normalization is NEVER silent — every change is named in `normalizations`.
 * It is also IDEMPOTENT: re-normalizing already-normalized output is a no-op
 * (so consumers — run-retag, generate-diff-report, validate-output — can all
 * apply it safely).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { NORMALIZATION_RULES, normalizeRecordInput, type NormalizationResult } from './normalize';
import { c02IngredientParentMap, c02MainIngredientsValues, loadC02Manifest } from './vocab';

// Derive the ACTUAL canonical sets + parent map from the locked manifest, so
// these tests fail loudly if the data drifts rather than encoding stale copies.
const MANIFEST = loadC02Manifest();
const COOKING_SKILLS = MANIFEST.cookingSkills;
const PARENT_MAP = c02IngredientParentMap(MANIFEST);
const ING_VALUES = new Set(c02MainIngredientsValues(MANIFEST));
const GROUPS = new Set(MANIFEST.mainIngredientsGroups);
const NULL_PARENT_SPECIFICS = MANIFEST.mainIngredientsSpecifics
  .filter((s) => s.parent === null)
  .map((s) => s.value);

// The alias map itself (read directly — the rules load it internally; the test
// reads it to assert the groups-never-keys invariant + derive fold fixtures).
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, '../..');
const ALIAS_FILE = JSON.parse(
  readFileSync(path.join(REPO_ROOT, 'scripts/stage2-retag/data/c02-alias-map.json'), 'utf8')
) as { aliasMap: Record<string, string>; drops: string[] };
const ALIAS_MAP = ALIAS_FILE.aliasMap;

// ---------------------------------------------------------------------------
// R1 — `academic` activity_type exclusivity strip
// ---------------------------------------------------------------------------

describe('normalizeRecordInput — R1 academic exclusivity', () => {
  it('strips `academic` when a mode tag (cooking) is also present', () => {
    const { rawInput, normalizations } = normalizeRecordInput({
      activity_type: ['cooking', 'academic'],
    });
    expect((rawInput as { activity_type: string[] }).activity_type).toEqual(['cooking']);
    expect(normalizations).toContain(NORMALIZATION_RULES.academicExclusivityStrip);
  });

  it('strips `academic` alongside garden and craft too', () => {
    const garden = normalizeRecordInput({ activity_type: ['garden', 'academic'] });
    expect((garden.rawInput as { activity_type: string[] }).activity_type).toEqual(['garden']);
    const craft = normalizeRecordInput({ activity_type: ['academic', 'craft'] });
    expect((craft.rawInput as { activity_type: string[] }).activity_type).toEqual(['craft']);
  });

  it('preserves the order of the surviving mode tags', () => {
    const { rawInput } = normalizeRecordInput({
      activity_type: ['cooking', 'academic', 'garden'],
    });
    expect((rawInput as { activity_type: string[] }).activity_type).toEqual(['cooking', 'garden']);
  });

  it('leaves `academic` alone when it appears ALONE (by-elimination fallback)', () => {
    const { rawInput, normalizations } = normalizeRecordInput({ activity_type: ['academic'] });
    expect((rawInput as { activity_type: string[] }).activity_type).toEqual(['academic']);
    expect(normalizations).not.toContain(NORMALIZATION_RULES.academicExclusivityStrip);
  });

  it('leaves a pure mode array (no academic) untouched', () => {
    const { rawInput, normalizations } = normalizeRecordInput({
      activity_type: ['cooking', 'garden'],
    });
    expect((rawInput as { activity_type: string[] }).activity_type).toEqual(['cooking', 'garden']);
    expect(normalizations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// R6 — garden_skills cleared when activity_type lacks `garden`
// ---------------------------------------------------------------------------

describe('normalizeRecordInput — R6 garden_skills non-garden clear', () => {
  it('clears garden_skills when activity_type does NOT include garden', () => {
    const { rawInput, normalizations } = normalizeRecordInput({
      activity_type: ['cooking'],
      garden_skills: ['Planting seeds', 'Harvesting'],
    });
    expect((rawInput as { garden_skills: string[] }).garden_skills).toEqual([]);
    expect(normalizations).toContain(NORMALIZATION_RULES.gardenSkillsNonGardenClear);
  });

  it('leaves garden_skills untouched when activity_type includes garden', () => {
    const { rawInput, normalizations } = normalizeRecordInput({
      activity_type: ['garden'],
      garden_skills: ['Planting seeds', 'Harvesting'],
    });
    expect((rawInput as { garden_skills: string[] }).garden_skills).toEqual([
      'Planting seeds',
      'Harvesting',
    ]);
    expect(normalizations).not.toContain(NORMALIZATION_RULES.gardenSkillsNonGardenClear);
  });

  it('leaves garden_skills untouched for a multi-value activity_type that includes garden', () => {
    const { rawInput, normalizations } = normalizeRecordInput({
      activity_type: ['cooking', 'garden'],
      garden_skills: ['Planting seeds'],
    });
    expect((rawInput as { garden_skills: string[] }).garden_skills).toEqual(['Planting seeds']);
    expect(normalizations).not.toContain(NORMALIZATION_RULES.gardenSkillsNonGardenClear);
  });

  it('records NO marker when non-garden activity_type already has empty garden_skills', () => {
    const { rawInput, normalizations } = normalizeRecordInput({
      activity_type: ['cooking'],
      garden_skills: [],
    });
    expect((rawInput as { garden_skills: string[] }).garden_skills).toEqual([]);
    expect(normalizations).not.toContain(NORMALIZATION_RULES.gardenSkillsNonGardenClear);
  });
});

// ---------------------------------------------------------------------------
// R4 — academic_concepts ⇄ academic_integration reconciliation
// ---------------------------------------------------------------------------

describe('normalizeRecordInput — R4 concepts/integration reconcile', () => {
  it('adds a subject with framework concepts that is missing from academic_integration', () => {
    const { rawInput, normalizations } = normalizeRecordInput({
      academic_integration: ['Science'],
      academic_concepts: {
        Math: { framework: ['Measurement'], everyday: [], synonym_pairs: [] },
        Science: { framework: ['Life Cycles'], everyday: [], synonym_pairs: [] },
      },
    });
    expect((rawInput as { academic_integration: string[] }).academic_integration).toEqual([
      'Science',
      'Math',
    ]);
    expect(normalizations).toContain(`${NORMALIZATION_RULES.conceptsIntegrationAdd}:Math`);
  });

  it('does NOT add a subject whose framework array is empty', () => {
    const { rawInput, normalizations } = normalizeRecordInput({
      academic_integration: ['Science'],
      academic_concepts: {
        Math: { framework: [], everyday: [], synonym_pairs: [] },
        Science: { framework: ['Life Cycles'], everyday: [], synonym_pairs: [] },
      },
    });
    expect((rawInput as { academic_integration: string[] }).academic_integration).toEqual([
      'Science',
    ]);
    expect(normalizations).toEqual([]);
  });

  it('leaves an integration subject with no concepts ALONE (legitimate, not stripped)', () => {
    // Health is integrated but carries no framework concepts: per R4 the rule
    // only ADDS, it never removes. The validation summary flags it separately.
    const { rawInput, normalizations } = normalizeRecordInput({
      academic_integration: ['Health'],
      academic_concepts: {
        Health: { framework: [], everyday: [], synonym_pairs: [] },
      },
    });
    expect((rawInput as { academic_integration: string[] }).academic_integration).toEqual([
      'Health',
    ]);
    expect(normalizations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// R5 — synonym-pair lint
// ---------------------------------------------------------------------------

describe('normalizeRecordInput — R5 synonym-pair lint', () => {
  it('drops a pair whose everyday string is not verbatim in the subject everyday array', () => {
    const { rawInput, normalizations } = normalizeRecordInput({
      academic_concepts: {
        Science: {
          framework: ['Life Cycles'],
          everyday: ['life cycle'],
          synonym_pairs: [{ everyday: 'plant growth', framework: 'Life Cycles' }],
        },
      },
    });
    const science = (
      rawInput as {
        academic_concepts: Record<string, { synonym_pairs: unknown[] }>;
      }
    ).academic_concepts.Science;
    expect(science.synonym_pairs).toEqual([]);
    expect(normalizations).toContain(`${NORMALIZATION_RULES.synonymPairDrop}:Science`);
  });

  it('drops a pair whose framework string is not in the subject framework array', () => {
    const { rawInput } = normalizeRecordInput({
      academic_concepts: {
        Math: {
          framework: ['Measurement'],
          everyday: ['measuring'],
          synonym_pairs: [{ everyday: 'measuring', framework: 'Fractions' }],
        },
      },
    });
    const math = (
      rawInput as {
        academic_concepts: Record<string, { synonym_pairs: unknown[] }>;
      }
    ).academic_concepts.Math;
    expect(math.synonym_pairs).toEqual([]);
  });

  it('keeps a fully-grounded pair (both endpoints present in their arrays)', () => {
    const { rawInput, normalizations } = normalizeRecordInput({
      academic_concepts: {
        Math: {
          framework: ['Measurement'],
          everyday: ['measuring'],
          synonym_pairs: [{ everyday: 'measuring', framework: 'Measurement' }],
        },
      },
    });
    const math = (
      rawInput as {
        academic_concepts: Record<string, { synonym_pairs: { everyday: string }[] }>;
      }
    ).academic_concepts.Math;
    expect(math.synonym_pairs).toEqual([{ everyday: 'measuring', framework: 'Measurement' }]);
    expect(normalizations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Provenance shape + idempotence + robustness
// ---------------------------------------------------------------------------

describe('normalizeRecordInput — provenance, idempotence, robustness', () => {
  it('returns an empty normalizations list for already-clean output', () => {
    const result = normalizeRecordInput({
      activity_type: ['cooking'],
      academic_integration: ['Math'],
      academic_concepts: {
        Math: {
          framework: ['Measurement'],
          everyday: ['measuring'],
          synonym_pairs: [{ everyday: 'measuring', framework: 'Measurement' }],
        },
      },
    });
    expect(result.normalizations).toEqual([]);
  });

  it('is idempotent — re-normalizing normalized output records no further changes', () => {
    const first = normalizeRecordInput({
      activity_type: ['cooking', 'academic'],
      academic_integration: ['Science'],
      academic_concepts: {
        Math: {
          framework: ['Measurement'],
          everyday: ['measuring'],
          synonym_pairs: [{ everyday: 'bogus', framework: 'Measurement' }],
        },
        Science: { framework: ['Life Cycles'], everyday: [], synonym_pairs: [] },
      },
    });
    expect(first.normalizations.length).toBeGreaterThan(0);
    const second = normalizeRecordInput(first.rawInput);
    expect(second.normalizations).toEqual([]);
    expect(second.rawInput).toEqual(first.rawInput);
  });

  it('does not mutate the input object', () => {
    const input = { activity_type: ['cooking', 'academic'] };
    normalizeRecordInput(input);
    expect(input.activity_type).toEqual(['cooking', 'academic']);
  });

  it('returns non-object input unchanged with no normalizations', () => {
    expect(normalizeRecordInput(null)).toEqual({ rawInput: null, normalizations: [] });
    expect(normalizeRecordInput('nope')).toEqual({ rawInput: 'nope', normalizations: [] });
    expect(normalizeRecordInput([1, 2])).toEqual({ rawInput: [1, 2], normalizations: [] });
  });

  it('tolerates missing / malformed fields without throwing', () => {
    const result: NormalizationResult = normalizeRecordInput({ tags: ['fun'] });
    expect(result.normalizations).toEqual([]);
    // non-array activity_type / non-object concepts are left as-is
    expect(normalizeRecordInput({ activity_type: 'cooking' }).normalizations).toEqual([]);
    expect(normalizeRecordInput({ academic_concepts: 'nope' }).normalizations).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// R7 — cooking_skills deterministic alias-floor
// ---------------------------------------------------------------------------

describe('normalizeRecordInput — R7 cooking_skills alias floor', () => {
  it('overwrites an alias-key tag with its cooking canonical', () => {
    // `Sautéing` → `Sautéing & stir-frying` (a cooking_skills canonical).
    const { rawInput, normalizations } = normalizeRecordInput({
      cooking_skills: ['Sautéing', 'Baking'],
    });
    expect((rawInput as { cooking_skills: string[] }).cooking_skills).toEqual([
      'Sautéing & stir-frying',
      'Baking',
    ]);
    expect(normalizations).toContain(NORMALIZATION_RULES.cookingSkillsAliasFloor);
  });

  it('de-dupes when two aliases fold to the same canonical (uniqueItems-safe)', () => {
    // `Chopping` and `Dicing` both fold to `Knife skills`. A positional overwrite
    // would emit `Knife skills` twice, which the downstream uniqueEnumArray
    // refinement REJECTS (kicking a clean-core row into the repair pass) — so the
    // floor de-dupes, preserving first-occurrence order.
    const { rawInput, normalizations } = normalizeRecordInput({
      cooking_skills: ['Chopping', 'Tasting', 'Dicing'],
    });
    expect((rawInput as { cooking_skills: string[] }).cooking_skills).toEqual([
      'Knife skills',
      'Tasting',
    ]);
    expect(normalizations).toContain(NORMALIZATION_RULES.cookingSkillsAliasFloor);
    // Fixed point: re-running over the de-duped output changes nothing.
    const again = normalizeRecordInput(rawInput);
    expect(again.normalizations).toEqual([]);
    expect(again.rawInput).toEqual(rawInput);
  });

  it('leaves an already-canonical cooking_skills array untouched (no provenance)', () => {
    const { rawInput, normalizations } = normalizeRecordInput({
      cooking_skills: ['Measuring', 'Knife skills', 'Baking'],
    });
    expect((rawInput as { cooking_skills: string[] }).cooking_skills).toEqual([
      'Measuring',
      'Knife skills',
      'Baking',
    ]);
    expect(normalizations).not.toContain(NORMALIZATION_RULES.cookingSkillsAliasFloor);
  });

  it('is a no-op when cooking_skills is absent / not a string array', () => {
    expect(normalizeRecordInput({}).normalizations).not.toContain(
      NORMALIZATION_RULES.cookingSkillsAliasFloor
    );
    expect(normalizeRecordInput({ cooking_skills: 'Baking' }).normalizations).not.toContain(
      NORMALIZATION_RULES.cookingSkillsAliasFloor
    );
    expect(normalizeRecordInput({ cooking_skills: [1, 2] }).normalizations).not.toContain(
      NORMALIZATION_RULES.cookingSkillsAliasFloor
    );
  });
});

// ---------------------------------------------------------------------------
// R8 — main_ingredients deterministic alias-floor
// ---------------------------------------------------------------------------

describe('normalizeRecordInput — R8 main_ingredients alias floor', () => {
  it('overwrites an alias-key tag with its ingredient canonical', () => {
    // `Hummus` → `Chickpeas` (a specific); `Legumes` → `Beans & legumes` (a group).
    const { rawInput, normalizations } = normalizeRecordInput({
      // Pair with the parent group already present so R9 has nothing to append
      // here — this test isolates the R8 fold.
      main_ingredients: ['Beans & legumes', 'Hummus'],
    });
    expect((rawInput as { main_ingredients: string[] }).main_ingredients).toEqual([
      'Beans & legumes',
      'Chickpeas',
    ]);
    expect(normalizations).toContain(NORMALIZATION_RULES.mainIngredientsAliasFloor);
  });

  it('folds the §5 remaps (Nori/Seaweed → Seaweed (nori); Cocoa → Cocoa & chocolate)', () => {
    const { rawInput } = normalizeRecordInput({
      main_ingredients: ['Nori', 'Cocoa powder'],
    });
    // Both fold to null-parent specifics, so R9 appends nothing.
    expect((rawInput as { main_ingredients: string[] }).main_ingredients).toEqual([
      'Seaweed (nori)',
      'Cocoa & chocolate',
    ]);
  });

  it('leaves an already-canonical main_ingredients array untouched (no fold provenance)', () => {
    const { normalizations } = normalizeRecordInput({
      main_ingredients: ['Nightshades', 'Tomatoes'],
    });
    expect(normalizations).not.toContain(NORMALIZATION_RULES.mainIngredientsAliasFloor);
  });
});

// ---------------------------------------------------------------------------
// R9 — ingredient parent-reconcile (append-only)
// ---------------------------------------------------------------------------

describe('normalizeRecordInput — R9 ingredient parent reconcile', () => {
  it('appends the missing parent group for an emitted specific (Tomatoes → +Nightshades)', () => {
    const expectedParent = PARENT_MAP['Tomatoes'];
    expect(expectedParent).toBe('Nightshades'); // guards against manifest drift
    const { rawInput, normalizations } = normalizeRecordInput({
      main_ingredients: ['Tomatoes'],
    });
    expect((rawInput as { main_ingredients: string[] }).main_ingredients).toEqual([
      'Tomatoes',
      'Nightshades',
    ]);
    expect(normalizations).toContain(NORMALIZATION_RULES.ingredientParentReconcile);
  });

  it('never removes a reviewer-meaningful specific (append-only, original order kept)', () => {
    const { rawInput } = normalizeRecordInput({
      main_ingredients: ['Garlic', 'Tomatoes', 'Lemon'],
    });
    const out = (rawInput as { main_ingredients: string[] }).main_ingredients;
    // All three originals survive in their original relative order.
    expect(out.indexOf('Garlic')).toBe(0);
    expect(out.indexOf('Tomatoes')).toBe(1);
    expect(out.indexOf('Lemon')).toBe(2);
    // Parents appended after the originals.
    expect(out).toContain(PARENT_MAP['Garlic']); // Alliums
    expect(out).toContain(PARENT_MAP['Tomatoes']); // Nightshades
    expect(out).toContain(PARENT_MAP['Lemon']); // Citrus fruits
    expect(out).toHaveLength(6);
  });

  it('does NOT re-append a parent already present (no duplicate, no provenance)', () => {
    const { rawInput, normalizations } = normalizeRecordInput({
      main_ingredients: ['Nightshades', 'Tomatoes'],
    });
    expect((rawInput as { main_ingredients: string[] }).main_ingredients).toEqual([
      'Nightshades',
      'Tomatoes',
    ]);
    expect(normalizations).not.toContain(NORMALIZATION_RULES.ingredientParentReconcile);
  });

  it('is a NO-OP for the 4 null-parent specifics', () => {
    // Manifest-derived list of the group-less specifics.
    expect(NULL_PARENT_SPECIFICS.sort()).toEqual(
      ['Celery', 'Cocoa & chocolate', 'Fennel', 'Seaweed (nori)'].sort()
    );
    const { rawInput, normalizations } = normalizeRecordInput({
      main_ingredients: [...NULL_PARENT_SPECIFICS],
    });
    expect((rawInput as { main_ingredients: string[] }).main_ingredients).toEqual(
      NULL_PARENT_SPECIFICS
    );
    expect(normalizations).not.toContain(NORMALIZATION_RULES.ingredientParentReconcile);
  });

  it('DOES append "Squash, cucumbers & melons" for Melons (parented, not null)', () => {
    expect(PARENT_MAP['Melons']).toBe('Squash, cucumbers & melons');
    const { rawInput, normalizations } = normalizeRecordInput({
      main_ingredients: ['Melons'],
    });
    expect((rawInput as { main_ingredients: string[] }).main_ingredients).toEqual([
      'Melons',
      'Squash, cucumbers & melons',
    ]);
    expect(normalizations).toContain(NORMALIZATION_RULES.ingredientParentReconcile);
  });

  it('leaves a group-only array untouched (groups have no parent requirement)', () => {
    const { rawInput, normalizations } = normalizeRecordInput({
      main_ingredients: ['Nightshades', 'Alliums'],
    });
    expect((rawInput as { main_ingredients: string[] }).main_ingredients).toEqual([
      'Nightshades',
      'Alliums',
    ]);
    expect(normalizations).not.toContain(NORMALIZATION_RULES.ingredientParentReconcile);
  });
});

// ---------------------------------------------------------------------------
// R7/R8/R9 — combined invariants: ordering, idempotence, field-scoping
// ---------------------------------------------------------------------------

describe('normalizeRecordInput — C02 floor/reconcile combined invariants', () => {
  it('R8 alias-floor runs BEFORE R9 reconcile in ONE pass (Hummus → Chickpeas → +Beans & legumes)', () => {
    // Hummus folds to the specific Chickpeas, which then needs its parent
    // (Beans & legumes) appended — both must happen in a single normalize call.
    const { rawInput, normalizations } = normalizeRecordInput({
      main_ingredients: ['Hummus'],
    });
    expect((rawInput as { main_ingredients: string[] }).main_ingredients).toEqual([
      'Chickpeas',
      'Beans & legumes',
    ]);
    expect(normalizations).toContain(NORMALIZATION_RULES.mainIngredientsAliasFloor);
    expect(normalizations).toContain(NORMALIZATION_RULES.ingredientParentReconcile);
  });

  it('is idempotent — re-normalizing folded+reconciled output is a fixed point', () => {
    const first = normalizeRecordInput({
      cooking_skills: ['Sautéing', 'Chopping'],
      main_ingredients: ['Hummus', 'Nori'],
    });
    expect(first.normalizations.length).toBeGreaterThan(0);
    const second = normalizeRecordInput(first.rawInput);
    expect(second.normalizations).toEqual([]);
    expect(second.rawInput).toEqual(first.rawInput);
  });

  it('every canonical group is absent from the alias map (groups-never-keys invariant)', () => {
    // Extends the P1.1 idempotency invariant to GROUPS specifically: a folded
    // specific's appended parent group can never itself be re-folded, so
    // floor∘reconcile is a combined fixed point.
    for (const group of GROUPS) {
      expect(ALIAS_MAP).not.toHaveProperty([group]);
    }
  });

  it('never folds a cooking_skills tag to an ingredient canonical, or vice versa (no cross-field contamination)', () => {
    // A cooking-skill alias key placed in main_ingredients must NOT fold (its
    // canonical is not an ingredient value); and an ingredient alias key placed
    // in cooking_skills must NOT fold (its canonical is not a cooking value).
    // `Sautéing` is a cooking alias key; `Hummus` is an ingredient alias key.
    const cookingCanonOfSauteing = ALIAS_MAP['Sautéing'];
    const ingCanonOfHummus = ALIAS_MAP['Hummus'];
    expect(COOKING_SKILLS).toContain(cookingCanonOfSauteing);
    expect(ING_VALUES.has(cookingCanonOfSauteing)).toBe(false);
    expect(ING_VALUES.has(ingCanonOfHummus)).toBe(true);
    expect(COOKING_SKILLS).not.toContain(ingCanonOfHummus);

    // Wrong-field placement: an ingredient alias key sitting in cooking_skills
    // is NOT folded by R7 (and would not become a valid cooking value).
    const r7 = normalizeRecordInput({ cooking_skills: ['Hummus'] });
    expect((r7.rawInput as { cooking_skills: string[] }).cooking_skills).toEqual(['Hummus']);
    expect(r7.normalizations).not.toContain(NORMALIZATION_RULES.cookingSkillsAliasFloor);

    // A cooking alias key sitting in main_ingredients is NOT folded by R8.
    const r8 = normalizeRecordInput({ main_ingredients: ['Sautéing'] });
    expect((r8.rawInput as { main_ingredients: string[] }).main_ingredients).toEqual(['Sautéing']);
    expect(r8.normalizations).not.toContain(NORMALIZATION_RULES.mainIngredientsAliasFloor);
  });
});
