import { describe, it, expect } from 'vitest';
import {
  computeInitialMetadataFromAiDraft,
  detectDocTitleChange,
  withPrefilledTitleSummary,
  withPrefilledTemplateTags,
} from './reviewMetadataInit';

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

describe('withPrefilledTemplateTags (mechanical template-tag prefill, only-fill-empty)', () => {
  const templateWithComps = [
    '[Table]',
    'Core Competencies: | List all that apply: social justice',
    '[Table]',
    'Cultural Responsiveness | : n/a',
  ].join('\n');

  it('fills an EMPTY closed-vocab field from the template cell', () => {
    const out = withPrefilledTemplateTags({}, templateWithComps);
    expect(out.coreCompetencies).toEqual(['Social Justice']);
  });

  it('never clobbers an existing non-empty field (reviewer/restored selection wins)', () => {
    const out = withPrefilledTemplateTags(
      { coreCompetencies: ['Cultural Diversity'] },
      templateWithComps
    );
    expect(out.coreCompetencies).toEqual(['Cultural Diversity']);
  });

  it('treats an empty array as fillable (a blank field re-derives from the doc)', () => {
    const out = withPrefilledTemplateTags({ coreCompetencies: [] }, templateWithComps);
    expect(out.coreCompetencies).toEqual(['Social Justice']);
  });

  it('leaves a non-template doc untouched (no tag fields added)', () => {
    const out = withPrefilledTemplateTags(
      { title: 'X', summary: 'Y' },
      'Plain body with kindness and respect but no labeled cells.'
    );
    expect(out).toEqual({ title: 'X', summary: 'Y' });
  });

  it('tolerates null/undefined content', () => {
    expect(withPrefilledTemplateTags({ themes: ['Bread'] }, null)).toEqual({ themes: ['Bread'] });
    expect(withPrefilledTemplateTags({}, undefined)).toEqual({});
  });

  it('does not mutate the input metadata', () => {
    const input = { coreCompetencies: [] as string[] };
    withPrefilledTemplateTags(input, templateWithComps);
    expect(input).toEqual({ coreCompetencies: [] });
  });
});

describe('detectDocTitleChange (title-changed-on-resubmit hint)', () => {
  it('returns the doc title when it differs from the restored round-1 title', () => {
    expect(
      detectDocTitleChange('Old Name', { extractedTitle: 'New Name', extractedContent: '' })
    ).toBe('New Name');
  });

  it('falls back to the parsed doc-body title when extracted_title is blank', () => {
    expect(
      detectDocTitleChange('Old Name', {
        extractedTitle: '',
        extractedContent: 'Parsed Body Title\nrest of the doc',
      })
    ).toBe('Parsed Body Title');
  });

  it('returns null when the titles match ignoring case and whitespace', () => {
    expect(
      detectDocTitleChange('  compost cake  ', {
        extractedTitle: 'Compost Cake',
        extractedContent: '',
      })
    ).toBeNull();
  });

  it('returns null when the restored title is blank (prefill re-derives from the doc anyway)', () => {
    expect(
      detectDocTitleChange('', { extractedTitle: 'New Name', extractedContent: '' })
    ).toBeNull();
    expect(
      detectDocTitleChange('   ', { extractedTitle: 'New Name', extractedContent: '' })
    ).toBeNull();
    expect(
      detectDocTitleChange(undefined, { extractedTitle: 'New Name', extractedContent: '' })
    ).toBeNull();
  });

  it('returns null when no doc title can be derived at all', () => {
    expect(
      detectDocTitleChange('Old Name', { extractedTitle: null, extractedContent: '' })
    ).toBeNull();
  });
});
