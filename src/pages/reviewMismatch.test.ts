import { describe, it, expect } from 'vitest';
import { shouldShowMismatchWarning } from '@/pages/reviewMismatch';

describe('shouldShowMismatchWarning', () => {
  it('returns false when nothing selected', () => {
    expect(
      shouldShowMismatchWarning({
        selectedTarget: null,
        submitterTargetId: 'lesson_1',
        topDuplicateIds: [],
        searchPickedId: null,
      })
    ).toBe(false);
  });

  it('returns true when submitter-bound target is selected', () => {
    expect(
      shouldShowMismatchWarning({
        selectedTarget: 'lesson_1',
        submitterTargetId: 'lesson_1',
        topDuplicateIds: [],
        searchPickedId: null,
      })
    ).toBe(true);
  });

  it('returns true when dup-detector target is selected', () => {
    expect(
      shouldShowMismatchWarning({
        selectedTarget: 'lesson_2',
        submitterTargetId: null,
        topDuplicateIds: ['lesson_2', 'lesson_3'],
        searchPickedId: null,
      })
    ).toBe(true);
  });

  it('returns false when reviewer manually search-picked the target', () => {
    expect(
      shouldShowMismatchWarning({
        selectedTarget: 'lesson_5',
        submitterTargetId: null,
        topDuplicateIds: [],
        searchPickedId: 'lesson_5',
      })
    ).toBe(false);
  });

  it('returns false when reviewer search-picked AND that lesson happens to also be a dup-detector hit (defer to deliberate confirmation)', () => {
    expect(
      shouldShowMismatchWarning({
        selectedTarget: 'lesson_5',
        submitterTargetId: null,
        topDuplicateIds: ['lesson_5'],
        searchPickedId: 'lesson_5',
      })
    ).toBe(false);
  });
});
