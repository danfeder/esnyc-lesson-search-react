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
        'gradeLevel',
        'theme',
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
    it('should have correct filter types for each filter', () => {
      // Single-select filters
      expect(FILTER_CONFIGS.activityType.type).toBe('single');
      expect(FILTER_CONFIGS.location.type).toBe('single');
      expect(FILTER_CONFIGS.lessonFormat.type).toBe('single');

      // Multiple-select filters
      expect(FILTER_CONFIGS.gradeLevel.type).toBe('multiple');
      expect(FILTER_CONFIGS.theme.type).toBe('multiple');
      expect(FILTER_CONFIGS.seasonTiming.type).toBe('multiple');
      expect(FILTER_CONFIGS.coreCompetencies.type).toBe('multiple');
      expect(FILTER_CONFIGS.academicIntegration.type).toBe('multiple');
      expect(FILTER_CONFIGS.socialEmotionalLearning.type).toBe('multiple');
      expect(FILTER_CONFIGS.cookingMethods.type).toBe('multiple');

      // Hierarchical filter
      expect(FILTER_CONFIGS.culturalHeritage.type).toBe('hierarchical');
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
