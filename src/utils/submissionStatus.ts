import type { IntStatus } from '@/components/Internal';

/**
 * DB-backed status enum from the lesson_submissions check constraint:
 * 'submitted' | 'in_review' | 'needs_revision' | 'approved' | 'rejected'
 * (live CHECK verified on TEST 2026-07-03 — an older comment here claimed the
 * constraint rejected 'rejected'; it does not, and rejected rows exist).
 *
 * The broader Submission TS type elsewhere drifted to 'under_review', which the
 * CHECK really does reject — use this type any time the value is being read
 * from or written to lesson_submissions.status.
 */
export type SubmissionStatus =
  | 'submitted'
  | 'in_review'
  | 'needs_revision'
  | 'approved'
  | 'rejected';

export const STATUS_TO_BADGE: Record<SubmissionStatus, IntStatus> = {
  submitted: 'submitted',
  in_review: 'review',
  needs_revision: 'revision',
  approved: 'approved',
  rejected: 'rejected',
};

export const STATUS_LABEL: Record<SubmissionStatus, string> = {
  submitted: 'Submitted',
  in_review: 'In review',
  needs_revision: 'Needs revision',
  approved: 'Approved',
  rejected: 'Rejected',
};
