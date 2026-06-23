import { describe, it, expect } from 'vitest';
// @ts-expect-error - .mjs helper has no type declarations; import resolves at runtime under vitest
import { resolveGradeLevels } from './grade-levels.mjs';

describe('resolveGradeLevels', () => {
  it('prefers the plural gradeLevels when both keys are present and differ', () => {
    const metadata = { gradeLevels: ['3', '4'], gradeLevel: ['K'] };
    expect(resolveGradeLevels(metadata)).toEqual(['3', '4']);
  });

  it('falls back to the singular gradeLevel when only that key is present', () => {
    const metadata = { gradeLevel: ['K', '1'] };
    expect(resolveGradeLevels(metadata)).toEqual(['K', '1']);
  });

  it('falls through an EMPTY plural gradeLevels to the populated singular key', () => {
    // `??` alone would return [] here and discard the singular data.
    const metadata = { gradeLevels: [], gradeLevel: ['K'] };
    expect(resolveGradeLevels(metadata)).toEqual(['K']);
  });

  it('returns an empty array when both keys are empty', () => {
    expect(resolveGradeLevels({ gradeLevels: [], gradeLevel: [] })).toEqual([]);
  });

  it('returns an empty array when neither key is present', () => {
    expect(resolveGradeLevels({})).toEqual([]);
  });

  it('returns an empty array for null/undefined metadata', () => {
    expect(resolveGradeLevels(null)).toEqual([]);
    expect(resolveGradeLevels(undefined)).toEqual([]);
  });

  it('returns [] when a grade key is a non-array (legacy malformed data)', () => {
    // The Array.isArray guards reject non-array shapes rather than passing a
    // string through to the text[] column.
    expect(resolveGradeLevels({ gradeLevel: 'K' as unknown as string[] })).toEqual([]);
    expect(
      resolveGradeLevels({ gradeLevels: 'K' as unknown as string[], gradeLevel: ['3'] })
    ).toEqual(['3']);
  });
});
