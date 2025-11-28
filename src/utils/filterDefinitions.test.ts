import { describe, it, expect } from 'vitest';
import { FILTER_CONFIGS, FILTER_KEYS, METADATA_CONFIGS, METADATA_KEYS } from './filterDefinitions';

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
    it('should have metadata fields separated from filters', () => {
      const expectedMetadataFields = [
        'mainIngredients',
        'gardenSkills',
        'cookingSkills',
        'observancesHolidays',
        'culturalResponsivenessFeatures',
      ];

      const actualMetadataFields = Object.keys(METADATA_CONFIGS);
      expect(actualMetadataFields.sort()).toEqual(expectedMetadataFields.sort());
    });

    it('should have METADATA_KEYS match METADATA_CONFIGS keys', () => {
      expect(METADATA_KEYS.sort()).toEqual(Object.keys(METADATA_CONFIGS).sort());
    });

    it('should not have any overlap between filters and metadata', () => {
      const filterKeys = Object.keys(FILTER_CONFIGS);
      const metadataKeys = Object.keys(METADATA_CONFIGS);

      const overlap = filterKeys.filter((key) => metadataKeys.includes(key));
      expect(overlap).toEqual([]);
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
    it('should not include metadata fields in FILTER_CONFIGS', () => {
      const filterKeys = Object.keys(FILTER_CONFIGS);
      const metadataFieldNames = [
        'mainIngredients',
        'gardenSkills',
        'cookingSkills',
        'observancesHolidays',
        'culturalResponsivenessFeatures',
      ];

      metadataFieldNames.forEach((field) => {
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
