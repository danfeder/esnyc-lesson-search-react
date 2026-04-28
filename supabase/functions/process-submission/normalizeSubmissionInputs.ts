export interface RawSubmissionInputs {
  submissionType?: 'new' | 'update' | string | undefined;
  originalLessonId?: string | null | undefined;
}

export interface NormalizedSubmissionInputs {
  normalizedSubmissionType: 'new' | 'update';
  normalizedOriginalLessonId: string | null;
}

export function normalizeSubmissionInputs(
  input: RawSubmissionInputs
): NormalizedSubmissionInputs {
  const normalizedSubmissionType: 'new' | 'update' =
    input.submissionType === 'update' ? 'update' : 'new';
  const normalizedOriginalLessonId =
    normalizedSubmissionType === 'update' &&
    typeof input.originalLessonId === 'string' &&
    input.originalLessonId.trim().length > 0
      ? input.originalLessonId.trim()
      : null;
  return { normalizedSubmissionType, normalizedOriginalLessonId };
}
