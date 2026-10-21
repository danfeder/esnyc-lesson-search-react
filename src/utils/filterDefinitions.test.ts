import { describe, it, expect } from 'vitest';
import {
  ACADEMIC_INTEGRATION_VALUES,
  COOKING_SKILLS_VALUES,
  CORE_COMPETENCIES_VALUES,
  CULTURAL_RESPONSIVENESS_FEATURE_VALUES,
  GARDEN_SKILLS_VALUES,
  OBSERVANCES_HOLIDAYS_VALUES,
  SEASON_TIMING_VALUES,
  SOCIAL_EMOTIONAL_LEARNING_VALUES,
} from '@/types/lessonMetadata.zod';
import { ALL_FIELD_CONFIGS, FILTER_CONFIGS, FILTER_KEYS } from './filterDefinitions';

// mainIngredients was promoted from METADATA_CONFIGS to FILTER_CONFIGS (Brief 5).
// METADATA_CONFIGS is now module-private + METADATA_KEYS was removed (F3 dead-export
// sweep), so the remaining reviewer-only fields are asserted via ALL_FIELD_CONFIGS.
const METADATA_ONLY_FIELDS = [
  'gardenSkills',
  'cookingSkills',
  'observancesHolidays',
  'culturalResponsivenessFeatures',
] as const;

describe('Filter Definitions Compliance', () => {
  describe('Filter Configuration', () => {
    it('should have filters defined in FILTER_CONFIGS', () => {
      const filterCount = Object.keys(FILTER_CONFIGS).length;
      expect(filterCount).toBeGreaterThan(0);
    });

    it('should have FILTER_KEYS match FILTER_CONFIGS keys', () => {
      expect(FILTER_KEYS.sort()).toEqual(Object.keys(FILTER_CONFIGS).sort());
    });

    it('should have all current filters properly configured', () => {
      // Verify each filter has required properties
      Object.entries(FILTER_CONFIGS).forEach(([_key, config]) => {
        expect(config).toHaveProperty('label');
        expect(config).toHaveProperty('type');
        expect(config).toHaveProperty('options');
        expect(typeof config.label).toBe('string');
        expect(['single', 'multiple', 'hierarchical']).toContain(config.type);
        expect(Array.isArray(config.options)).toBe(true);
      });
    });
  });

  describe('Metadata Fields', () => {
    it('reviewer-only metadata fields are reachable via ALL_FIELD_CONFIGS', () => {
      for (const field of METADATA_ONLY_FIELDS) {
        expect(ALL_FIELD_CONFIGS).toHaveProperty(field);
      }
    });

    it('reviewer-only metadata fields are NOT search filters', () => {
      const filterKeys = Object.keys(FILTER_CONFIGS);
      for (const field of METADATA_ONLY_FIELDS) {
        expect(filterKeys).not.toContain(field);
      }
    });

    it('mainIngredients is promoted to a search filter (Brief 5)', () => {
      // Now a FILTER, no longer reviewer-only metadata.
      expect(FILTER_CONFIGS).toHaveProperty('mainIngredients');
      const cfg = FILTER_CONFIGS.mainIngredients;
      expect(cfg.type).toBe('hierarchical');
      // Group→specific tree: at least one top-level group carries `children`.
      expect(cfg.options.some((o) => (o.children?.length ?? 0) > 0)).toBe(true);
    });

    // value === label is load-bearing for mainIngredients: the reviewer form's
    // chip-label map and IntActivePills both fall back to the raw value for a
    // NESTED specific (their flat `.options.find()` only sees top-level nodes),
    // so a specific's chip renders correctly ONLY while value === label. Lock it.
    it('every mainIngredients tree value (recursive) has value === label', () => {
      const offenders: string[] = [];
      const walk = (opts: Array<{ value: string; label: string; children?: unknown }>) => {
        for (const o of opts) {
          if (o.value !== o.label) offenders.push(`${o.value} != ${o.label}`);
          if (Array.isArray((o as { children?: unknown[] }).children)) {
            walk((o as { children: Array<{ value: string; label: string }> }).children);
          }
        }
      };
      walk(
        FILTER_CONFIGS.mainIngredients.options as Array<{
          value: string;
          label: string;
          children?: unknown;
        }>
      );
      expect(offenders).toEqual([]);
    });
  });

  // Audit §6.3: every flat closed-enum option list is DERIVED from its exported
  // *_VALUES in lessonMetadata.zod.ts (the single canonical source that the
  // edge mirror, enums.json and the SQL CHECKs are synced to). These tests pin
  // (1) set-equality — the vocabulary can never drift from the canon — and
  // (2) array equality — the UI order IS the canonical order and value===label.
  // A list whose UI order must differ from its *_VALUES order is NOT in this
  // table (see the culturalResponsivenessFeatures test below).
  describe('Canonical vocabulary derivation (audit §6.3)', () => {
    const DERIVED_LISTS = [
      ['seasonTiming', SEASON_TIMING_VALUES],
      ['academicIntegration', ACADEMIC_INTEGRATION_VALUES],
      ['socialEmotionalLearning', SOCIAL_EMOTIONAL_LEARNING_VALUES],
      ['coreCompetencies', CORE_COMPETENCIES_VALUES],
      ['gardenSkills', GARDEN_SKILLS_VALUES],
      ['observancesHolidays', OBSERVANCES_HOLIDAYS_VALUES],
      ['cookingSkills', COOKING_SKILLS_VALUES],
    ] as const;

    it.each(DERIVED_LISTS)(
      '%s options are set-equal to the canonical *_VALUES',
      (key, canonical) => {
        const values = ALL_FIELD_CONFIGS[key].options.map((o) => o.value);
        expect(new Set(values)).toEqual(new Set(canonical));
        expect(values).toHaveLength(canonical.length); // no duplicates either side
      }
    );

    it.each(DERIVED_LISTS)(
      '%s options are array-equal to the canonical *_VALUES (order + value===label)',
      (key, canonical) => {
        expect(ALL_FIELD_CONFIGS[key].options).toEqual(
          canonical.map((value) => ({ value, label: value }))
        );
      }
    );

    // Intentional order divergence (audit §6.3): CRF stays hand-listed because
    // the reviewer UI order differs from the v3-taxonomy order kept in
    // CULTURAL_RESPONSIVENESS_FEATURE_VALUES. Lock the VOCABULARY (set) only.
    it('culturalResponsivenessFeatures options are set-equal to the canonical values (UI order intentionally differs)', () => {
      const options = ALL_FIELD_CONFIGS.culturalResponsivenessFeatures.options;
      const values = options.map((o) => o.value);
      expect(new Set(values)).toEqual(new Set(CULTURAL_RESPONSIVENESS_FEATURE_VALUES));
      expect(values).toHaveLength(CULTURAL_RESPONSIVENESS_FEATURE_VALUES.length);
      for (const o of options) expect(o.label).toBe(o.value);
    });
  });

  describe('Filter Structure Validation', () => {
    it('gradeLevels filter has correct structure', () => {
      const config = FILTER_CONFIGS.gradeLevels;
      expect(config.label).toBe('Grade Levels');
      expect(config.type).toBe('multiple');
      expect(config.options.length).toBeGreaterThan(0);
      expect(config.groups).toBeDefined();
    });

    it('thematicCategories filter has correct structure', () => {
      const config = FILTER_CONFIGS.thematicCategories;
      expect(config.label).toBe('Thematic Categories');
      expect(config.type).toBe('multiple');
      expect(config.options.length).toBeGreaterThan(0);
    });

    it('culturalHeritage filter supports hierarchical selection', () => {
      const config = FILTER_CONFIGS.culturalHeritage;
      expect(config.label).toBe('Cultural Heritage');
      expect(config.type).toBe('hierarchical');
      // Cultural heritage has parent-child relationships
      expect(config.options.length).toBeGreaterThan(0);
    });
  });

  describe('Filter Integrity', () => {
    it('should not include reviewer-only metadata fields in FILTER_CONFIGS', () => {
      const filterKeys = Object.keys(FILTER_CONFIGS);
      METADATA_ONLY_FIELDS.forEach((field) => {
        expect(filterKeys).not.toContain(field);
      });
    });

    it('each filter should have at least one option', () => {
      Object.entries(FILTER_CONFIGS).forEach(([key, config]) => {
        expect(
          config.options.length,
          `Filter "${key}" should have at least one option`
        ).toBeGreaterThan(0);
      });
    });
  });
});
