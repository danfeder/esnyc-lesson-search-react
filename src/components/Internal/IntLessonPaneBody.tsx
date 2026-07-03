import type { Lesson } from '@/types';
import { IntButton } from './IntButton';
import { IntLessonDetail } from './IntLessonDetail';

export type LessonPaneStatus = 'ready' | 'loading' | 'not-found' | 'error';

interface IntLessonPaneBodyProps {
  status: LessonPaneStatus;
  /** Required when status === 'ready'. */
  lesson: Lesson | null;
  /** "Back to search" — funnels into the same close handler as the X button. */
  onClose: () => void;
  /** Retry the by-id fetch (error status only). */
  onRetry?: () => void;
}

/**
 * D2: the single status→content mapping shared by BOTH lesson detail surfaces
 * (IntLessonDrawer and the IntSplitDetail rail) — one body, two chromes.
 * Non-ready statuses are honest, FP-12-consistent states: a deep link to an
 * unknown/retired lesson gets "Lesson not found" (retired lessons are
 * deliberately invisible to the public surface — "removed from the library"
 * covers them truthfully), and a failed fetch gets an error state with retry.
 */
export function IntLessonPaneBody({ status, lesson, onClose, onRetry }: IntLessonPaneBodyProps) {
  if (status === 'ready') {
    // Key by lesson so per-lesson UI state (e.g. the copy-link label) resets
    // on split-view click-through from one lesson to the next.
    return lesson ? <IntLessonDetail key={lesson.lessonId} lesson={lesson} /> : null;
  }

  if (status === 'loading') {
    return <div className="int-detail-empty">Loading lesson…</div>;
  }

  if (status === 'not-found') {
    return (
      <div className="int-detail-status">
        <h2 className="int-detail-title">Lesson not found</h2>
        <p className="int-detail-summary">
          This lesson may have been removed from the library, or the link may be old or mistyped.
        </p>
        <div className="int-detail-status-actions">
          <IntButton onClick={onClose}>Back to search</IntButton>
        </div>
      </div>
    );
  }

  return (
    <div className="int-detail-status" role="alert">
      <h2 className="int-detail-title">Couldn't load this lesson</h2>
      <p className="int-detail-summary">Something went wrong loading this lesson.</p>
      <div className="int-detail-status-actions">
        {onRetry && (
          <IntButton variant="primary" onClick={() => onRetry()}>
            Try again
          </IntButton>
        )}
        <IntButton onClick={onClose}>Back to search</IntButton>
      </div>
    </div>
  );
}
