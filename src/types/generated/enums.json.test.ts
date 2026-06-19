import { describe, it, expect } from 'vitest';
import enumsJson from './enums.json';
import {
  ACTIVITY_TYPE_VALUES,
  TAG_VALUES,
  SEASON_TIMING_VALUES,
  CULTURAL_RESPONSIVENESS_FEATURE_VALUES,
  ACADEMIC_INTEGRATION_VALUES,
  SOCIAL_EMOTIONAL_LEARNING_VALUES,
  CORE_COMPETENCIES_VALUES,
  COOKING_METHODS_VALUES,
  OBSERVANCES_HOLIDAYS_VALUES,
  GARDEN_SKILLS_VALUES,
} from '../lessonMetadata.zod';

/**
 * Asserts the committed `enums.json` matches the canonical Zod source. Run
 * `npm run generate:enums` to refresh after changing closed-enum values.
 *
 * Effectively replaces a separate "is enums.json fresh" CI step. Per
 * validator architecture doc Decision 5.
 */
describe('enums.json freshness', () => {
  it('activity_type values match the canonical Zod source', () => {
    expect(enumsJson.activity_type).toEqual([...ACTIVITY_TYPE_VALUES]);
  });

  it('tags values match the canonical Zod source', () => {
    expect(enumsJson.tags).toEqual([...TAG_VALUES]);
  });

  it('season_timing values match the canonical Zod source', () => {
    expect(enumsJson.season_timing).toEqual([...SEASON_TIMING_VALUES]);
  });

  it('cultural_responsiveness_features values match the canonical Zod source', () => {
    expect(enumsJson.cultural_responsiveness_features).toEqual([
      ...CULTURAL_RESPONSIVENESS_FEATURE_VALUES,
    ]);
  });

  it('academic_integration values match the canonical Zod source', () => {
    expect(enumsJson.academic_integration).toEqual([...ACADEMIC_INTEGRATION_VALUES]);
  });

  it('social_emotional_learning values match the canonical Zod source', () => {
    expect(enumsJson.social_emotional_learning).toEqual([...SOCIAL_EMOTIONAL_LEARNING_VALUES]);
  });

  it('core_competencies values match the canonical Zod source', () => {
    expect(enumsJson.core_competencies).toEqual([...CORE_COMPETENCIES_VALUES]);
  });

  it('cooking_methods values match the canonical Zod source', () => {
    expect(enumsJson.cooking_methods).toEqual([...COOKING_METHODS_VALUES]);
  });

  it('observances_holidays values match the canonical Zod source', () => {
    expect(enumsJson.observances_holidays).toEqual([...OBSERVANCES_HOLIDAYS_VALUES]);
  });

  it('garden_skills values match the canonical Zod source', () => {
    expect(enumsJson.garden_skills).toEqual([...GARDEN_SKILLS_VALUES]);
  });

  it('exposes exactly the ten closed-enum keys (4 foundation + 6 small fields closed PR 6e)', () => {
    expect(Object.keys(enumsJson).sort()).toEqual(
      [
        'activity_type',
        'cultural_responsiveness_features',
        'season_timing',
        'tags',
        'academic_integration',
        'social_emotional_learning',
        'core_competencies',
        'cooking_methods',
        'observances_holidays',
        'garden_skills',
      ].sort()
    );
  });
});
