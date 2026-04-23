import { X } from 'lucide-react';
import type { Lesson } from '@/types';
import { IntLessonDetail } from './IntLessonDetail';

interface IntSplitDetailProps {
  lesson: Lesson | null;
  onClose: () => void;
}

export function IntSplitDetail({ lesson, onClose }: IntSplitDetailProps) {
  return (
    <aside className="int-detail" aria-label="Lesson detail">
      {lesson ? (
        <>
          <button
            type="button"
            className="int-drawer-close"
            onClick={onClose}
            aria-label="Close lesson details"
          >
            <X width={16} height={16} />
          </button>
          <IntLessonDetail lesson={lesson} />
        </>
      ) : (
        <div className="int-detail-empty">Select a lesson to preview details.</div>
      )}
    </aside>
  );
}
