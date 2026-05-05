import type { KeyboardEvent } from 'react';
import type { Lesson } from '@/types';
import { cn } from '@/utils/cn';
import { intActivityLabel, intGradesLabel } from './IntListRow';

interface IntCardProps {
  lesson: Lesson;
  selected: boolean;
  onClick: (lesson: Lesson) => void;
}

export function IntCard({ lesson, selected, onClick }: IntCardProps) {
  const activity = intActivityLabel(lesson);
  const meta = lesson.metadata;
  const season = meta.seasonTiming?.[0];
  const theme = meta.thematicCategories?.[0];

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(lesson);
    }
  };

  return (
    <article
      role="button"
      tabIndex={0}
      className={cn('int-card', selected && 'selected')}
      onClick={() => onClick(lesson)}
      onKeyDown={handleKeyDown}
    >
      <div className="int-card-top">
        <span>Grades {intGradesLabel(lesson.gradeLevels)}</span>
        <span className="int-row-meta">
          <span className={`activity ${activity.className}`}>{activity.label}</span>
        </span>
      </div>
      <h3 className="int-card-title">{lesson.title}</h3>
      <p className="int-card-summary">{lesson.summary}</p>
      {(season || theme) && (
        <div className="int-card-meta">
          {season && <span>{season}</span>}
          {theme && <span>{theme}</span>}
        </div>
      )}
    </article>
  );
}
