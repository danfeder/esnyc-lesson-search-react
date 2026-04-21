import type { KeyboardEvent } from 'react';
import type { Lesson } from '@/types';
import { FILTER_CONFIGS } from '@/utils/filterDefinitions';
import { cn } from '@/utils/cn';

type ActivityClass = 'cook' | 'grow' | 'both' | 'academic';

interface ActivityLabel {
  label: string;
  className: ActivityClass;
}

export function intActivityLabel(lesson: Lesson): ActivityLabel {
  const hasC = (lesson.metadata.cookingSkills?.length ?? 0) > 0;
  const hasG = (lesson.metadata.gardenSkills?.length ?? 0) > 0;
  if (hasC && hasG) return { label: 'Cook + Grow', className: 'both' };
  if (hasC) return { label: 'Cook', className: 'cook' };
  if (hasG) return { label: 'Grow', className: 'grow' };
  return { label: 'Academic', className: 'academic' };
}

export function intGradesLabel(grades: string[] | undefined): string {
  if (!grades || grades.length === 0) return '—';
  if (grades.length <= 2) return grades.join(', ');
  return `${grades[0]}–${grades[grades.length - 1]}`;
}

function culturalLabel(value: string): string {
  for (const region of FILTER_CONFIGS.culturalHeritage.options) {
    if (region.value === value) return region.label;
    for (const child of region.children ?? []) {
      if (child.value === value) return child.label;
    }
  }
  return value;
}

function lessonFormatLabel(value: string): string {
  return FILTER_CONFIGS.lessonFormat.options.find((o) => o.value === value)?.label ?? value;
}

interface IntListRowProps {
  lesson: Lesson;
  selected: boolean;

  onClick: (lesson: Lesson) => void;
}

export function IntListRow({ lesson, selected, onClick }: IntListRowProps) {
  const activity = intActivityLabel(lesson);
  const meta = lesson.metadata;
  const season = meta.seasonTiming?.[0];
  const theme = meta.thematicCategories?.[0];
  const heritage = meta.culturalHeritage?.[0];
  const format = meta.lessonFormat;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick(lesson);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      className={cn('int-list-row', selected && 'selected')}
      onClick={() => onClick(lesson)}
      onKeyDown={handleKeyDown}
    >
      <div className="int-row-grades">{intGradesLabel(lesson.gradeLevels)}</div>
      <div className="int-row-main">
        <h3 className="int-row-title">{lesson.title}</h3>
        <p className="int-row-summary">{lesson.summary}</p>
        <div className="int-row-meta">
          <span className={`activity ${activity.className}`}>{activity.label}</span>
          {season && (
            <>
              <span className="dot">·</span>
              <span>{season}</span>
            </>
          )}
          {theme && (
            <>
              <span className="dot">·</span>
              <span>{theme}</span>
            </>
          )}
          {heritage && (
            <>
              <span className="dot">·</span>
              <span>{culturalLabel(heritage)}</span>
            </>
          )}
          {format && (
            <>
              <span className="dot">·</span>
              <span>{lessonFormatLabel(format)}</span>
            </>
          )}
        </div>
      </div>
      <div className="int-row-right">
        <span className="int-row-open">Open</span>
      </div>
    </div>
  );
}
