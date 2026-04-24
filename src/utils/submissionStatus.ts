import type { IntStatus } from '@/components/Internal';

/**
 * DB-backed status enum from the lesson_submissions check constraint:
 * 'submitted' | 'in_review' | 'needs_revision' | 'approved'.
 *
 * The broader Submission TS type elsewhere drifted to 'under_review' / includes
 * 'rejected', but the actual CHECK constraint rejects those — use this type
 * any time the value is being read from or written to lesson_submissions.status.
 */
export type SubmissionStatus = 'submitted' | 'in_review' | 'needs_revision' | 'approved';

export const STATUS_TO_BADGE: Record<SubmissionStatus, IntStatus> = {
  submitted: 'submitted',
  in_review: 'review',
  needs_revision: 'revision',
  approved: 'approved',
};

export const STATUS_LABEL: Record<SubmissionStatus, string> = {
  submitted: 'Submitted',
  in_review: 'In review',
  needs_revision: 'Needs revision',
  approved: 'Approved',
};
