import type { Lesson } from '@/types';
import { IntCard } from './IntCard';

interface IntCardGridProps {
  lessons: Lesson[];
  selectedId: string | null;
  onSelect: (lesson: Lesson) => void;
}

export function IntCardGrid({ lessons, selectedId, onSelect }: IntCardGridProps) {
  return (
    <div className="int-grid">
      {lessons.map((lesson) => (
        <IntCard
          key={lesson.lessonId}
          lesson={lesson}
          selected={lesson.lessonId === selectedId}
          onClick={onSelect}
        />
      ))}
    </div>
  );
}
