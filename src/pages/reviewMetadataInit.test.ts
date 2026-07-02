import { describe, it, expect } from 'vitest';
import { computeInitialMetadataFromAiDraft, withPrefilledTitleSummary } from './reviewMetadataInit';

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

describe('withPrefilledTitleSummary (editable title/summary prefill)', () => {
  it('prefers the trimmed extracted_title for the title', () => {
    const out = withPrefilledTitleSummary(
      {},
      { extractedTitle: '  From Filename  ', extractedContent: 'A Different Body Title\nmore' }
    );
    expect(out.title).toBe('From Filename');
  });

  it('falls back to the parsed doc title when extracted_title is empty', () => {
    const out = withPrefilledTitleSummary(
      {},
      { extractedTitle: '', extractedContent: 'Parsed Title Line\nrest of body' }
    );
    expect(out.title).toBe('Parsed Title Line');
  });

  it('pulls the summary from the parsed doc body', () => {
    const out = withPrefilledTitleSummary(
      {},
      {
        extractedTitle: 'Doc File',
        extractedContent: 'Title Line\n\nSummary: A short summary.\n\nMore text',
      }
    );
    expect(out.title).toBe('Doc File');
    expect(out.summary).toBe('A short summary.');
  });

  it('preserves existing metadata title/summary over the prefill (restore wins)', () => {
    const out = withPrefilledTitleSummary(
      { title: 'Reviewer Edit', summary: 'Reviewer summary' },
      { extractedTitle: 'Filename', extractedContent: 'X\n\nSummary: Y.\n\nZ' }
    );
    expect(out.title).toBe('Reviewer Edit');
    expect(out.summary).toBe('Reviewer summary');
  });

  it('leaves title/summary undefined when nothing can be derived', () => {
    const out = withPrefilledTitleSummary({}, { extractedTitle: null, extractedContent: '' });
    expect(out.title).toBeUndefined();
    expect(out.summary).toBeUndefined();
  });

  it('re-derives from the doc when the stored value is blank/whitespace (cleared then saved needs_revision)', () => {
    const out = withPrefilledTitleSummary(
      { title: '', summary: '   ' },
      { extractedTitle: 'Doc Title', extractedContent: 'Doc Title\n\nSummary: Doc summary.\n\nX' }
    );
    expect(out.title).toBe('Doc Title');
    expect(out.summary).toBe('Doc summary.');
  });

  it('does not mutate the input metadata', () => {
    const input = {};
    withPrefilledTitleSummary(input, { extractedTitle: 'X', extractedContent: 'Y' });
    expect(input).toEqual({});
  });
});
