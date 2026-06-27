import { describe, it, expect } from 'vitest';
import {
  reAddActivityTypeSuffix,
  parseExtractedContent,
  normalizeMatchType,
  selectOptionsFromConfig,
  flattenHeritageOptions,
  ZOD_FIELD_TO_LABEL,
} from '@/pages/ReviewDetail';
import type { ReviewMetadata } from '@/types';
import type { FilterConfig } from '@/utils/filterDefinitions';

// Characterization tests for ReviewDetail's module-scope pure helpers.
// These PIN current behavior (PR-0 safety net, Wave 5) — they assert what
// the code does TODAY, not what it arguably "should" do, so the upcoming
// decomposition (PR-1a relocation) can move these helpers verbatim with a
// behavioral guardrail in place.

describe('reAddActivityTypeSuffix (legacy activityType slug round-trip — the crash landmine)', () => {
  it('scalar "cooking" → single-element suffixed array, preserving other fields', () => {
    expect(
      reAddActivityTypeSuffix({
        activityType: 'cooking',
        themes: ['Bread'],
      } as unknown as ReviewMetadata)
    ).toEqual({ activityType: ['cooking-only'], themes: ['Bread'] });
  });

  it('scalar "garden" → ["garden-only"]', () => {
    expect(
      reAddActivityTypeSuffix({ activityType: 'garden' } as unknown as ReviewMetadata)
    ).toEqual({ activityType: ['garden-only'] });
  });

  it('scalar "both" → fans out to ["cooking-only","garden-only"]', () => {
    expect(reAddActivityTypeSuffix({ activityType: 'both' } as unknown as ReviewMetadata)).toEqual({
      activityType: ['cooking-only', 'garden-only'],
    });
  });

  it('scalar already-suffixed "cooking-only" → not double-suffixed', () => {
    expect(
      reAddActivityTypeSuffix({ activityType: 'cooking-only' } as unknown as ReviewMetadata)
    ).toEqual({ activityType: ['cooking-only'] });
  });

  it('array input → each bare value suffixed, already-suffixed left intact', () => {
    expect(
      reAddActivityTypeSuffix({
        activityType: ['cooking', 'garden-only'],
      } as unknown as ReviewMetadata)
    ).toEqual({ activityType: ['cooking-only', 'garden-only'] });
  });

  // EDGE / surprising: an EMPTY array hits neither the string branch nor the
  // `length > 0` array branch, so the input is returned UNCHANGED (activityType
  // stays []). Pinned as-is.
  it('empty array → returned unchanged (NOT transformed)', () => {
    expect(reAddActivityTypeSuffix({ activityType: [] })).toEqual({ activityType: [] });
  });

  // EDGE / surprising: an empty STRING short-circuits to the unchanged raw
  // (activityType stays '' rather than becoming ['-only']). Pinned as-is.
  it('empty string → returned unchanged (NOT transformed)', () => {
    expect(reAddActivityTypeSuffix({ activityType: '' } as unknown as ReviewMetadata)).toEqual({
      activityType: '',
    });
  });

  it('null activityType → returned unchanged', () => {
    expect(reAddActivityTypeSuffix({ activityType: null } as unknown as ReviewMetadata)).toEqual({
      activityType: null,
    });
  });

  it('undefined / missing activityType → returned unchanged', () => {
    expect(reAddActivityTypeSuffix({})).toEqual({});
    expect(reAddActivityTypeSuffix({ themes: ['X'] })).toEqual({ themes: ['X'] });
  });
});

describe('parseExtractedContent', () => {
  it('extracts "Title:" prefix + "Summary:" block (terminated by blank line)', () => {
    expect(
      parseExtractedContent('Title: Apple Pie\n\nSummary: A delicious dessert.\n\nMore content')
    ).toEqual({ title: 'Apple Pie', summary: 'A delicious dessert.' });
  });

  it('extracts markdown "# " title + "Summary:" block', () => {
    expect(parseExtractedContent('# Garden Basics\n\nSummary: Learn to garden.\n\nStep 1')).toEqual(
      { title: 'Garden Basics', summary: 'Learn to garden.' }
    );
  });

  it('falls back to first line as title + first following paragraph as summary when no markers', () => {
    expect(parseExtractedContent('My Lesson\nFirst body line.')).toEqual({
      title: 'My Lesson',
      summary: 'First body line.',
    });
  });

  it('empty content → empty title and summary', () => {
    expect(parseExtractedContent('')).toEqual({ title: '', summary: '' });
  });
});

describe('normalizeMatchType', () => {
  it('passes through the four known match types', () => {
    expect(normalizeMatchType('exact')).toBe('exact');
    expect(normalizeMatchType('high')).toBe('high');
    expect(normalizeMatchType('medium')).toBe('medium');
    expect(normalizeMatchType('low')).toBe('low');
  });

  it('null → null', () => {
    expect(normalizeMatchType(null)).toBeNull();
  });

  it('empty string → null', () => {
    expect(normalizeMatchType('')).toBeNull();
  });

  it('unrecognized / wrong-case value → null', () => {
    expect(normalizeMatchType('unknown')).toBeNull();
    expect(normalizeMatchType('HIGH')).toBeNull();
  });
});

describe('selectOptionsFromConfig', () => {
  it('maps options to {value,label}, dropping extra props', () => {
    const config: FilterConfig = {
      label: 'Activity Type',
      type: 'multiple',
      options: [
        { value: 'cooking-only', label: 'Cooking', category: 'x' },
        { value: 'garden-only', label: 'Garden' },
      ],
    };
    expect(selectOptionsFromConfig(config)).toEqual([
      { value: 'cooking-only', label: 'Cooking' },
      { value: 'garden-only', label: 'Garden' },
    ]);
  });

  it('empty options → empty array', () => {
    const config: FilterConfig = { label: 'Empty', type: 'multiple', options: [] };
    expect(selectOptionsFromConfig(config)).toEqual([]);
  });
});

describe('flattenHeritageOptions', () => {
  it('flattens parents and children, prefixing child labels with "parent → "', () => {
    const config: FilterConfig = {
      label: 'Cultural Heritage',
      type: 'hierarchical',
      options: [
        {
          value: 'asian',
          label: 'Asian',
          children: [
            { value: 'chinese', label: 'Chinese' },
            { value: 'japanese', label: 'Japanese' },
          ],
        },
        { value: 'african', label: 'African' },
      ],
    };
    expect(flattenHeritageOptions(config)).toEqual([
      { value: 'asian', label: 'Asian' },
      { value: 'chinese', label: 'Asian → Chinese' },
      { value: 'japanese', label: 'Asian → Japanese' },
      { value: 'african', label: 'African' },
    ]);
  });

  it('parent without children → just the parent option', () => {
    const config: FilterConfig = {
      label: 'Cultural Heritage',
      type: 'hierarchical',
      options: [{ value: 'african', label: 'African' }],
    };
    expect(flattenHeritageOptions(config)).toEqual([{ value: 'african', label: 'African' }]);
  });

  it('empty options → empty array', () => {
    const config: FilterConfig = { label: 'Cultural Heritage', type: 'hierarchical', options: [] };
    expect(flattenHeritageOptions(config)).toEqual([]);
  });
});

describe('ZOD_FIELD_TO_LABEL', () => {
  it('maps known Zod field keys to their human labels', () => {
    expect(ZOD_FIELD_TO_LABEL.activityType).toBe('Activity Type');
    expect(ZOD_FIELD_TO_LABEL.culturalResponsivenessFeatures).toBe(
      'Cultural Responsiveness Features'
    );
    expect(ZOD_FIELD_TO_LABEL.summary).toBe('Summary');
  });
});
