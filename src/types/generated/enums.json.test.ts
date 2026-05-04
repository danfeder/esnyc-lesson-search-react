import { describe, it, expect } from 'vitest';
import enumsJson from './enums.json';
import {
  ACTIVITY_TYPE_VALUES,
  TAG_VALUES,
  SEASON_TIMING_VALUES,
  CULTURAL_RESPONSIVENESS_FEATURE_VALUES,
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

  it('exposes exactly the four foundation-phase closed-enum keys', () => {
    expect(Object.keys(enumsJson).sort()).toEqual(
      ['activity_type', 'cultural_responsiveness_features', 'season_timing', 'tags'].sort()
    );
  });
});
