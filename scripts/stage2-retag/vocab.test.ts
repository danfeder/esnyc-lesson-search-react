/**
 * Tests for the Stage 2 re-tag canonical vocab assembly (task A3, TDD).
 *
 * Spelling sources (locked — design doc §4 OQ2 + supervisor resolution
 * 2026-06-12 on the observances merge): `src/utils/filterDefinitions.ts` and
 * `docs/plans/pr6-stage2-retag-evidence/oq2-smaller-fields-census.md` §1/§5.
 * Every literal below is transcribed verbatim from those files — never from
 * memory.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  MAIN_PASS_FIELDS,
  flattenVocabArtifact,
  loadVocab,
  vocabArtifactSchema,
  type VocabArtifact,
} from './vocab';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function readJson(relPath: string): unknown {
  return JSON.parse(readFileSync(path.join(REPO_ROOT, relPath), 'utf8'));
}

const vocab = loadVocab();
const heritageArtifact = vocabArtifactSchema.parse(
  readJson('data/vocab/cultural-heritage.vocab.json')
);
const conceptsArtifact = vocabArtifactSchema.parse(
  readJson('data/vocab/academic-concepts.vocab.json')
);
const enumsJson = readJson('src/types/generated/enums.json') as Record<string, string[]>;

/** Post-drop canonical surface labels, computed from the artifact itself. */
function expectedLabels(artifact: VocabArtifact): string[] {
  const drops = new Set(artifact.drops);
  return artifact.canonical
    .filter((entry) => !drops.has(entry.key) && !drops.has(entry.label))
    .map((entry) => entry.label);
}

/** Alias literals that are NOT themselves canonical labels (non-identity aliases). */
function nonIdentityAliasLiterals(artifact: VocabArtifact): string[] {
  const labels = new Set(artifact.canonical.map((entry) => entry.label));
  return Object.keys(artifact.alias_map).filter((literal) => !labels.has(literal));
}

// ---------------------------------------------------------------------------
// Adapter: {provenance, canonical[], alias_map, drops} → flat enum list
// ---------------------------------------------------------------------------

describe('flattenVocabArtifact (worksheet-artifact adapter)', () => {
  const fixture: VocabArtifact = {
    provenance: { source: 'fixture' },
    canonical: [
      { key: 'alpha', label: 'Alpha' },
      { key: 'beta', label: 'Beta' },
      { key: 'gamma', label: 'Gamma' },
    ],
    alias_map: {
      'alpha variant': 'alpha',
      Beta: 'beta', // identity alias — literal equals the canonical label
      'old gamma': 'gamma',
    },
    drops: ['dropped literal', 'gamma'],
  };

  it('flattens canonical entries to their surface labels, in order', () => {
    expect(flattenVocabArtifact({ ...fixture, drops: [] })).toEqual(['Alpha', 'Beta', 'Gamma']);
  });

  it('excludes canonical entries whose key or label is in drops', () => {
    // 'gamma' appears in drops (matches the canonical key) → Gamma excluded.
    expect(flattenVocabArtifact(fixture)).toEqual(['Alpha', 'Beta']);
    // Drop by label form as well.
    expect(flattenVocabArtifact({ ...fixture, drops: ['Beta'] })).toEqual(['Alpha', 'Gamma']);
  });

  it('does NOT leak alias_map literals into the enum list', () => {
    const flat = flattenVocabArtifact(fixture);
    expect(flat).not.toContain('alpha variant');
    expect(flat).not.toContain('old gamma');
    expect(flat).toHaveLength(2); // canonical-post-drop count, not canonical+aliases
  });

  it('rejects duplicate surface labels', () => {
    expect(() =>
      flattenVocabArtifact({
        ...fixture,
        canonical: [
          { key: 'a', label: 'Same' },
          { key: 'b', label: 'Same' },
        ],
        drops: [],
      })
    ).toThrow(/duplicate/i);
  });
});

// ---------------------------------------------------------------------------
// cultural_heritage — data/vocab/cultural-heritage.vocab.json
// ---------------------------------------------------------------------------

describe('cultural_heritage vocab', () => {
  it('equals the computed post-drop canonical labels (71, OQ2 lock)', () => {
    const expected = expectedLabels(heritageArtifact);
    expect(vocab.cultural_heritage.values).toEqual(expected);
    expect(vocab.cultural_heritage.values).toHaveLength(71);
    expect(heritageArtifact.drops).toHaveLength(0); // heritage worksheet had zero drops
  });

  it('contains no non-identity alias literals', () => {
    const enumSet = new Set(vocab.cultural_heritage.values);
    for (const literal of nonIdentityAliasLiterals(heritageArtifact)) {
      expect(enumSet.has(literal)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// academic_concepts — data/vocab/academic-concepts.vocab.json
// ---------------------------------------------------------------------------

describe('academic_concepts vocab', () => {
  it('equals the computed post-drop canonical labels', () => {
    const expected = expectedLabels(conceptsArtifact);
    expect(vocab.academic_concepts.values).toEqual(expected);
    expect(vocab.academic_concepts.values).toHaveLength(expected.length);
    // Input-artifact shape locks (verified REFERENCE counts).
    expect(conceptsArtifact.canonical).toHaveLength(119);
    expect(Object.keys(conceptsArtifact.alias_map)).toHaveLength(202);
    expect(conceptsArtifact.drops).toHaveLength(7);
  });

  it('excludes the worksheet drops (known drop value absent)', () => {
    expect(conceptsArtifact.drops).toContain('food systems');
    const lowercased = new Set(vocab.academic_concepts.values.map((v) => v.toLowerCase()));
    for (const drop of conceptsArtifact.drops) {
      expect(vocab.academic_concepts.values).not.toContain(drop);
      expect(lowercased.has(drop.toLowerCase())).toBe(false);
    }
  });

  it('contains no non-identity alias literals', () => {
    const enumSet = new Set(vocab.academic_concepts.values);
    for (const literal of nonIdentityAliasLiterals(conceptsArtifact)) {
      expect(enumSet.has(literal)).toBe(false);
    }
  });
});

// ---------------------------------------------------------------------------
// The 4 PR-1 closed enums — src/types/generated/enums.json
// ---------------------------------------------------------------------------

describe('enums.json fields', () => {
  it.each([
    ['activity_type', 4],
    ['tags', 2],
    ['season_timing', 4],
    ['cultural_responsiveness_features', 7],
  ] as const)('%s matches enums.json exactly (%i values)', (field, count) => {
    expect(vocab[field].values).toEqual(enumsJson[field]);
    expect(vocab[field].values).toHaveLength(count);
  });
});

// ---------------------------------------------------------------------------
// The 6 smaller fields — scripts/stage2-retag/data/smaller-fields.vocab.json
// (counts locked 6/5/6/3/16/24 per design §4 OQ2 + supervisor resolution)
// ---------------------------------------------------------------------------

describe('smaller fields', () => {
  it('has the locked counts 6/5/6/3/16/24', () => {
    expect(vocab.academic_integration.values).toHaveLength(6);
    expect(vocab.social_emotional_learning.values).toHaveLength(5);
    expect(vocab.core_competencies.values).toHaveLength(6);
    expect(vocab.cooking_methods.values).toHaveLength(3);
    expect(vocab.observances_holidays.values).toHaveLength(16);
    expect(vocab.garden_skills.values).toHaveLength(24);
  });

  it('academic_integration = the 6 FILTER_CONFIGS.academicIntegration values', () => {
    expect(vocab.academic_integration.values).toEqual([
      'Math',
      'Science',
      'Literacy/ELA',
      'Social Studies',
      'Health',
      'Arts',
    ]);
  });

  it('social_emotional_learning = the 5 CASEL values', () => {
    expect(vocab.social_emotional_learning.values).toEqual([
      'Relationship skills',
      'Self-awareness',
      'Responsible decision-making',
      'Self-management',
      'Social awareness',
    ]);
  });

  it('core_competencies = the 6 configured values; stray "Food Justice" is NOT canonical', () => {
    expect(vocab.core_competencies.values).toEqual([
      'Environmental and Community Stewardship',
      'Social Justice',
      'Social-Emotional Intelligence',
      'Garden Skills and Related Academic Content',
      'Kitchen Skills and Related Academic Content',
      'Culturally Responsive Education',
    ]);
    expect(vocab.core_competencies.values).not.toContain('Food Justice');
  });

  it('cooking_methods = the stored-dominant kebab regime; "no-cook" folds away', () => {
    expect(vocab.cooking_methods.values).toEqual(['basic-prep', 'stovetop', 'oven']);
    expect(vocab.cooking_methods.values).not.toContain('no-cook');
    expect(vocab.cooking_methods.values).not.toContain('basic-prep-only');
  });

  it('observances_holidays = 16 after the End-of-year merge ("End of year celebrations" survives)', () => {
    expect(vocab.observances_holidays.values).toEqual([
      'AAPI Heritage Month',
      'Black History Month',
      'Hispanic/Latinx Heritage Month',
      "Indigenous Peoples' Month",
      "Women's History Month",
      'Pride',
      'Earth Month',
      'Thanksgiving',
      'Lunar New Year',
      'New Year',
      'Ramadan',
      'Eid',
      'Juneteenth',
      'School Food Hero Day',
      'Beginning of year',
      'End of year celebrations',
    ]);
    // Exact-equality membership checks (NOT substring — 'End of year
    // celebrations' contains 'End of year' as a prefix).
    expect(vocab.observances_holidays.values.includes('End of year')).toBe(false);
    expect(vocab.observances_holidays.values.includes('End of year celebrations')).toBe(true);
    // Title-Case 'Earth Month' is canonical; the stored case-twin is not.
    expect(vocab.observances_holidays.values).toContain('Earth Month');
    expect(vocab.observances_holidays.values).not.toContain('Earth month');
  });

  it('garden_skills = the 22 configured Title-Case labels + Stewardship tasks + Sensory exploration', () => {
    expect(vocab.garden_skills.values).toEqual([
      'Planting',
      'Seed starting',
      'Transplanting',
      'Watering techniques',
      'Harvesting',
      'Composting',
      'Mulching',
      'Soil preparation and care',
      'Weeding',
      'Cover cropping',
      'Garden planning',
      'Companion planting',
      'Crop rotation',
      'Observing plant parts',
      'Identifying plants',
      'Pest identification',
      'Beneficial insect identification',
      'Pollinator observation',
      'Seed saving',
      'Tool use and maintenance',
      'Preservation techniques',
      'Garden exploration',
      'Stewardship tasks',
      'Sensory exploration',
    ]);
    expect(vocab.garden_skills.values).toContain('Crop rotation');
    expect(vocab.garden_skills.values).toContain('Stewardship tasks');
    expect(vocab.garden_skills.values).toContain('Sensory exploration');
  });
});

// ---------------------------------------------------------------------------
// Field declarations: column + JSONB-key dual-write mapping (census §1)
// ---------------------------------------------------------------------------

describe('field declarations', () => {
  it('covers exactly the 14 main-pass fields (incl. C02 cooking_skills + main_ingredients)', () => {
    expect(Object.keys(vocab).sort()).toEqual([...MAIN_PASS_FIELDS].sort());
    expect(MAIN_PASS_FIELDS).toHaveLength(14);
  });

  it('every field declares label, selection, jsonbKey, and column mapping', () => {
    for (const field of MAIN_PASS_FIELDS) {
      const decl = vocab[field];
      expect(decl.field).toBe(field);
      expect(decl.label.length).toBeGreaterThan(0);
      expect(['multi', 'single']).toContain(decl.selection);
      expect(decl.jsonbKey.length).toBeGreaterThan(0);
      expect(decl.values.length).toBeGreaterThan(0);
      // No duplicate enum values anywhere.
      expect(new Set(decl.values).size).toBe(decl.values.length);
    }
  });

  it('maps the 13 column-backed fields 1:1 to their snake_case text[] columns', () => {
    for (const field of MAIN_PASS_FIELDS) {
      if (field === 'academic_concepts') continue;
      expect(vocab[field].column).toBe(field);
    }
  });

  it('academic_concepts is the documented exception: JSONB-only, no lessons column', () => {
    expect(vocab.academic_concepts.column).toBeNull();
    expect(vocab.academic_concepts.jsonbKey).toBe('academicConcepts');
    expect(vocab.academic_concepts.shape).toBe('subject-keyed-object');
    // The object is keyed by the 6 canonical academic_integration subjects.
    expect(vocab.academic_concepts.subjectKeys).toEqual(vocab.academic_integration.values);
  });

  it('declares the camelCase JSONB keys from the census §1 mapping', () => {
    const expectedJsonbKeys: Record<(typeof MAIN_PASS_FIELDS)[number], string> = {
      activity_type: 'activityType',
      tags: 'tags',
      season_timing: 'seasonTiming',
      cultural_responsiveness_features: 'culturalResponsivenessFeatures',
      cultural_heritage: 'culturalHeritage',
      academic_concepts: 'academicConcepts',
      academic_integration: 'academicIntegration',
      social_emotional_learning: 'socialEmotionalLearning',
      core_competencies: 'coreCompetencies',
      cooking_methods: 'cookingMethods',
      observances_holidays: 'observancesHolidays',
      garden_skills: 'gardenSkills',
      cooking_skills: 'cookingSkills',
      main_ingredients: 'mainIngredients',
    };
    for (const field of MAIN_PASS_FIELDS) {
      expect(vocab[field].jsonbKey).toBe(expectedJsonbKeys[field]);
    }
  });
});
