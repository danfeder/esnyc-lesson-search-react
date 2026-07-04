import { describe, it, expect } from 'vitest';
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
