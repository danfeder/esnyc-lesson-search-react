import { describe, it, expect } from 'vitest';
import { computeInitialMetadataFromAiDraft } from './reviewMetadataInit';

describe('computeInitialMetadataFromAiDraft', () => {
  it('returns null when draft is null', () => {
    expect(computeInitialMetadataFromAiDraft(null)).toBeNull();
  });

  it('returns null when draft is undefined', () => {
    expect(computeInitialMetadataFromAiDraft(undefined)).toBeNull();
  });

  it('returns null when draft fails canonical schema (invalid enum value)', () => {
    expect(computeInitialMetadataFromAiDraft({ activityType: ['not-a-real-activity'] })).toBeNull();
  });

  it('returns null when draft fails canonical schema (wrong shape)', () => {
    expect(computeInitialMetadataFromAiDraft({ activityType: 'cooking' })).toBeNull();
  });

  it('returns empty object for valid empty draft', () => {
    expect(computeInitialMetadataFromAiDraft({})).toEqual({});
  });

  it('maps canonical → review-form for a populated draft', () => {
    const draft = {
      activityType: ['cooking'],
      thematicCategories: ['Bread'],
      seasonTiming: ['Fall'],
      gradeLevels: ['3'],
      locationRequirements: ['Indoor'],
    };
    expect(computeInitialMetadataFromAiDraft(draft)).toEqual({
      activityType: ['cooking'],
      themes: ['Bread'],
      season: ['Fall'],
      gradeLevels: ['3'],
      location: 'Indoor',
    });
  });

  it('maps canonical culturalResponsivenessFeatures → review form', () => {
    expect(
      computeInitialMetadataFromAiDraft({
        culturalResponsivenessFeatures: ['Communicates high expectations'],
      })
    ).toEqual({
      culturalResponsivenessFeatures: ['Communicates high expectations'],
    });
  });

  it('returns null when culturalResponsivenessFeatures contains invalid value', () => {
    expect(
      computeInitialMetadataFromAiDraft({
        culturalResponsivenessFeatures: ['not-a-real-feature'],
      })
    ).toBeNull();
  });
});
