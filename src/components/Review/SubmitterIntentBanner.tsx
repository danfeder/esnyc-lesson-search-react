import { AlertTriangle } from 'lucide-react';
import type { SimilarityWithLesson, SubmitterTargetLesson } from '@/pages/buildCandidateCards';

interface SubmitterIntentBannerProps {
  /** submission.submission_type — drives the four-state branch. */
  submissionType: 'new' | 'update' | undefined;
  /** submission.original_lesson_id — the submitter's declared merge target. */
  targetId: string | undefined;
  /** submission.submitterTargetLesson — off-list target lookup (title at top level). */
  submitterTargetLesson: SubmitterTargetLesson | null | undefined;
  /** Top-5 similarities — used to resolve an in-list target's title. */
  topDuplicates: SimilarityWithLesson[];
}

/**
 * Binding-intent banner. Rendered FIRST in the decision column so the reviewer
 * reads what the submitter declared BEFORE the candidate cards, mismatch
 * warning, and search escape hatch.
 *
 * Four states, in this exact order (LOAD-BEARING — a degraded update must
 * render the amber "title couldn't be loaded" state and NEVER fall through to
 * the green genuine-new branch):
 *   1. blue   — (update, target id, title known) happy update;
 *   2. amber  — (update, target id, title lookup FAILED) degraded update;
 *   3. amber  — (update, null target) explicit can't-find-it;
 *   4. green  — (new or unknown type) genuine new submission.
 */
export function SubmitterIntentBanner({
  submissionType,
  targetId,
  submitterTargetLesson,
  topDuplicates,
}: SubmitterIntentBannerProps) {
  const type = submissionType;
  // SimilarityWithLesson has lesson_id at top level, lesson.title nested.
  // submitterTargetLesson (off-list fetch) has title at top level.
  // Use ?? so empty-string titles from corrupt rows don't fall
  // through to the next lookup (?? coalesces only on null|undefined).
  const targetTitle =
    submitterTargetLesson?.title ??
    topDuplicates.find((d) => d.lesson_id === targetId)?.lesson?.title ??
    null;

  // (update, X, title-known) — happy path
  if (type === 'update' && targetId && targetTitle) {
    return (
      <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
        <span className="font-medium text-blue-900">Submitter says:</span>{' '}
        <span className="text-blue-900">
          Updating <strong>{targetTitle}</strong>
        </span>
      </div>
    );
  }
  // (update, X, title lookup FAILED) — degraded but still update intent.
  // CRITICAL: must NOT fall through to the green "new" banner; that's the
  // worst-possible misrender (reviewer thinks it's new when submitter
  // declared an update). Render yellow with the raw lesson_id and a
  // "verify before approving" prompt.
  if (type === 'update' && targetId && !targetTitle) {
    return (
      <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg text-sm flex items-start">
        <AlertTriangle size={16} className="text-amber-700 mr-2 mt-0.5 flex-shrink-0" />
        <div>
          <span className="font-medium text-amber-900">Submitter says:</span>{' '}
          <span className="text-amber-900">
            Updating lesson <code>{targetId}</code> — but its title couldn&apos;t be loaded. Please
            search the library to confirm the right merge target before approving.
          </span>
        </div>
      </div>
    );
  }
  // (update, null) — explicit can't-find-it
  if (type === 'update' && !targetId) {
    return (
      <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg text-sm flex items-start">
        <AlertTriangle size={16} className="text-amber-700 mr-2 mt-0.5 flex-shrink-0" />
        <div>
          <span className="font-medium text-amber-900">Submitter says:</span>{' '}
          <span className="text-amber-900">
            Updating, but couldn&apos;t find target — please search to identify.
          </span>
        </div>
      </div>
    );
  }
  // (new or unknown/undefined type) — genuine-new fallthrough; any value that
  // isn't 'update' lands here (matches the original IIFE behavior).
  return (
    <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
      <span className="font-medium text-emerald-900">Submitter says:</span>{' '}
      <span className="text-emerald-900">New lesson</span>
    </div>
  );
}
