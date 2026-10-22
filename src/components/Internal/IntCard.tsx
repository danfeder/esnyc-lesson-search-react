import { Fragment } from 'react';
import type { KeyboardEvent } from 'react';
import type { Lesson } from '@/types';
import { cn } from '@/utils/cn';
import { intActivityLabel, intGradesLabel, intMetaSegments } from './IntListRow';

interface IntCardProps {
  lesson: Lesson;
  selected: boolean;
  onClick: (lesson: Lesson) => void;
}

export function IntCard({ lesson, selected, onClick }: IntCardProps) {
  const activity = intActivityLabel(lesson);
  // Same segments as the list row (seasons · what · heritage) — one rule, two renderers.
  const segments = intMetaSegments(lesson);

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
      {segments.length > 0 && (
        <div className="int-card-meta">
          {segments.map((segment, i) => (
            // Index keys: segment strings are distinct in practice but nothing guarantees it.
            <Fragment key={i}>
              {i > 0 && <span className="dot">·</span>}
              <span>{segment}</span>
            </Fragment>
          ))}
        </div>
      )}
    </article>
  );
}
