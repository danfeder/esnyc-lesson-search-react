import { X } from 'lucide-react';
import type { Lesson } from '@/types';
import { IntLessonPaneBody, type LessonPaneStatus } from './IntLessonPaneBody';

interface IntSplitDetailProps {
  /** 'closed' renders the rail's empty prompt (non-modal, always visible). */
  status: LessonPaneStatus | 'closed';
  lesson: Lesson | null;
  onClose: () => void;
  onRetry?: () => void;
}

export function IntSplitDetail({ status, lesson, onClose, onRetry }: IntSplitDetailProps) {
  return (
    <aside className="int-detail" aria-label="Lesson detail">
      {status === 'closed' ? (
        <div className="int-detail-empty">Select a lesson to preview details.</div>
      ) : (
        <>
          <button
            type="button"
            className="int-drawer-close"
            onClick={onClose}
            aria-label="Close lesson details"
          >
            <X width={16} height={16} />
          </button>
          <IntLessonPaneBody status={status} lesson={lesson} onClose={onClose} onRetry={onRetry} />
        </>
      )}
    </aside>
  );
}
