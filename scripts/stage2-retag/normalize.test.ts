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
import { describe, expect, it } from 'vitest';

import { NORMALIZATION_RULES, normalizeRecordInput, type NormalizationResult } from './normalize';

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
