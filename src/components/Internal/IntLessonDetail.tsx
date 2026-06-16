import { ExternalLink } from 'lucide-react';
import type { Lesson } from '@/types';
import { culturalLabel, intActivityLabel, intGradesLabel } from './IntListRow';

interface IntLessonDetailProps {
  lesson: Lesson;
}

function academicSelected(ai: Lesson['metadata']['academicIntegration']): string[] {
  if (!ai) return [];
  if (Array.isArray(ai)) return ai;
  return ai.selected ?? [];
}

interface MetaRowProps {
  label: string;
  items: string[];
  format?: (value: string) => string;
}

function MetaRow({ label, items, format }: MetaRowProps) {
  if (!items || items.length === 0) return null;
  return (
    <div className="int-detail-meta-item">
      <dt>{label}</dt>
      <dd>
        {items.map((item) => (
          <span key={item} className="int-detail-tag">
            {format ? format(item) : item}
          </span>
        ))}
      </dd>
    </div>
  );
}

export function IntLessonDetail({ lesson }: IntLessonDetailProps) {
  const meta = lesson.metadata;
  const activity = intActivityLabel(lesson);

  return (
    <>
      <div className="int-detail-eyebrow">
        {activity.label} · Grades {intGradesLabel(lesson.gradeLevels)}
      </div>
      <h2 className="int-detail-title">{lesson.title}</h2>
      <p className="int-detail-summary">{lesson.summary}</p>
      {lesson.fileLink && (
        <a
          className="int-detail-cta"
          href={lesson.fileLink}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open Lesson Plan
          <ExternalLink width={11} height={11} />
        </a>
      )}
      <dl className="int-detail-meta-list">
        <MetaRow label="Grades" items={lesson.gradeLevels} />
        <MetaRow label="Location" items={meta.locationRequirements ?? []} />
        <MetaRow label="Season" items={meta.seasonTiming ?? []} />
        <MetaRow label="Themes" items={meta.thematicCategories ?? []} />
        <MetaRow label="Competencies" items={meta.coreCompetencies} />
        <MetaRow label="Cultural" items={meta.culturalHeritage} format={culturalLabel} />
        <MetaRow label="Academic" items={academicSelected(meta.academicIntegration)} />
        <MetaRow label="Garden Skills" items={meta.gardenSkills ?? []} />
        <MetaRow label="Cooking Skills" items={meta.cookingSkills ?? []} />
        <MetaRow label="Ingredients" items={meta.mainIngredients ?? []} />
        <MetaRow label="Cooking Method" items={meta.cookingMethods ?? []} />
        <MetaRow label="SEL" items={meta.socialEmotionalLearning ?? []} />
        <MetaRow label="Observances" items={meta.observancesHolidays ?? []} />
      </dl>
    </>
  );
}
