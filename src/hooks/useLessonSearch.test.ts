import { describe, it, expect } from 'vitest';
import { normalizeMetadata } from '@/hooks/useLessonSearch';

describe('normalizeMetadata academicIntegration', () => {
  it('flat array passes through', () => {
    expect(
      normalizeMetadata({ academicIntegration: ['Math', 'Science'] }).academicIntegration
    ).toEqual(['Math', 'Science']);
  });

  it('legacy object {selected: [...]} unwraps to flat array', () => {
    expect(
      normalizeMetadata({ academicIntegration: { selected: ['Math'] } }).academicIntegration
    ).toEqual(['Math']);
  });

  it('object with empty selected → empty array', () => {
    expect(
      normalizeMetadata({ academicIntegration: { selected: [] } }).academicIntegration
    ).toEqual([]);
  });

  it('null → empty array', () => {
    expect(normalizeMetadata({ academicIntegration: null }).academicIntegration).toEqual([]);
  });

  it('undefined / missing key → empty array', () => {
    expect(normalizeMetadata({}).academicIntegration).toEqual([]);
  });

  it('non-array, non-object scalar → empty array (not stringified-object)', () => {
    expect(
      normalizeMetadata({ academicIntegration: 'Math' as unknown as string[] }).academicIntegration
    ).toEqual([]);
  });
});
