import { describe, it, expect } from 'vitest';
import { FILTER_CONFIGS, FILTER_KEYS, METADATA_CONFIGS, METADATA_KEYS } from './filterDefinitions';

describe('Filter Definitions Compliance', () => {
  describe('ESYNYC 11-Filter Requirement', () => {
    it('should have EXACTLY 11 filters in FILTER_CONFIGS', () => {
      const filterCount = Object.keys(FILTER_CONFIGS).length;
      expect(filterCount).toBe(11);
    });

    it('should have the correct 11 filters as specified in CLAUDE.md', () => {
      const requiredFilters = [
        'activityType',
        'location',
        'gradeLevels',
        'thematicCategories',
        'seasonTiming',
        'coreCompetencies',
        'culturalHeritage',
        'lessonFormat',
        'academicIntegration',
        'socialEmotionalLearning',
        'cookingMethods',
      ];

      const actualFilters = Object.keys(FILTER_CONFIGS);

      // Check that we have exactly the required filters, no more, no less
      expect(actualFilters.sort()).toEqual(requiredFilters.sort());
    });

    it('should have FILTER_KEYS match FILTER_CONFIGS keys', () => {
      expect(FILTER_KEYS.length).toBe(11);
      expect(FILTER_KEYS.sort()).toEqual(Object.keys(FILTER_CONFIGS).sort());
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

  describe('Filter Types', () => {
    it('should have all expected filter properties', () => {
      expect(FILTER_CONFIGS).toHaveProperty('activityType');
      expect(FILTER_CONFIGS).toHaveProperty('location');
      expect(FILTER_CONFIGS).toHaveProperty('gradeLevels');
      expect(FILTER_CONFIGS).toHaveProperty('thematicCategories');
      expect(FILTER_CONFIGS).toHaveProperty('seasonTiming');
      expect(FILTER_CONFIGS).toHaveProperty('coreCompetencies');
      expect(FILTER_CONFIGS).toHaveProperty('culturalHeritage');
      expect(FILTER_CONFIGS).toHaveProperty('lessonFormat');
      expect(FILTER_CONFIGS).toHaveProperty('academicIntegration');
      expect(FILTER_CONFIGS).toHaveProperty('socialEmotionalLearning');
      expect(FILTER_CONFIGS).toHaveProperty('cookingMethods');
    });

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
  });

  describe('Critical Filter Validation', () => {
    it('should never exceed 11 filters (CRITICAL RULE)', () => {
      // This test will fail if anyone adds a 12th filter
      const filterCount = Object.keys(FILTER_CONFIGS).length;
      expect(filterCount).toBeLessThanOrEqual(11);
      expect(filterCount).toBeGreaterThanOrEqual(11);

      // Double-check with explicit assertion
      if (filterCount !== 11) {
        throw new Error(
          `CRITICAL VIOLATION: Filter count is ${filterCount}, must be EXACTLY 11. ` +
            `This violates ESYNYC requirements specified in CLAUDE.md.`
        );
      }
    });

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
  });
});
