import { describe, it, expect } from 'vitest';
import { normalizeSubmissionInputs } from './normalizeSubmissionInputs';

describe('normalizeSubmissionInputs', () => {
  it.each([
    [
      { submissionType: 'new', originalLessonId: null },
      { normalizedSubmissionType: 'new', normalizedOriginalLessonId: null },
    ],
    [
      { submissionType: 'new', originalLessonId: 'lesson_abc' },
      { normalizedSubmissionType: 'new', normalizedOriginalLessonId: null },
    ],
    [
      { submissionType: 'update', originalLessonId: 'lesson_abc' },
      { normalizedSubmissionType: 'update', normalizedOriginalLessonId: 'lesson_abc' },
    ],
    [
      { submissionType: 'update', originalLessonId: '  lesson_abc  ' },
      { normalizedSubmissionType: 'update', normalizedOriginalLessonId: 'lesson_abc' },
    ],
    [
      { submissionType: 'update', originalLessonId: '' },
      { normalizedSubmissionType: 'update', normalizedOriginalLessonId: null },
    ],
    [
      { submissionType: 'update', originalLessonId: '   ' },
      { normalizedSubmissionType: 'update', normalizedOriginalLessonId: null },
    ],
    [
      { submissionType: 'update', originalLessonId: undefined },
      { normalizedSubmissionType: 'update', normalizedOriginalLessonId: null },
    ],
    [
      { submissionType: undefined, originalLessonId: 'lesson_abc' },
      { normalizedSubmissionType: 'new', normalizedOriginalLessonId: null },
    ],
    [
      { submissionType: 'bogus' as 'new' | 'update', originalLessonId: 'lesson_abc' },
      { normalizedSubmissionType: 'new', normalizedOriginalLessonId: null },
    ],
  ])('normalizeSubmissionInputs(%j) === %j', (input, expected) => {
    expect(normalizeSubmissionInputs(input)).toEqual(expected);
  });
});
