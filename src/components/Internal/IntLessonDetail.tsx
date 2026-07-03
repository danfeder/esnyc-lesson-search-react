import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Link2 } from 'lucide-react';
import type { Lesson } from '@/types';
import { collapseHeritageToLeaves, fieldValueLabeler } from '@/utils/filterUtils';
import { IntButton } from './IntButton';
import { culturalLabel, intActivityLabel, intGradesLabel, sortGradeLevels } from './IntListRow';

// FP-16: Cooking Methods stores kebab canonical values (`basic-prep`); map them
// through the field's display labels ("Basic prep") so the drawer never shows a
// raw slug. Built once at module load.
const labelCookingMethod = fieldValueLabeler('cookingMethods');

type CopyLinkState = 'idle' | 'copied' | 'failed';

const COPY_LABELS: Record<CopyLinkState, string> = {
  idle: 'Copy link',
  copied: 'Copied',
  failed: 'Copy failed',
};

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

  // D2 §2e copy-link affordance (AdminInviteUser house pattern: label swap, no
  // toast). Unlike the invite page's silent catch, failure is surfaced as a
  // "Copy failed" label — there is no selectable-input fallback here.
  const [copyState, setCopyState] = useState<CopyLinkState>('idle');
  const copyResetTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (copyResetTimerRef.current !== null) {
        window.clearTimeout(copyResetTimerRef.current);
      }
    };
  }, []);

  const handleCopyLink = async () => {
    // The BARE permalink (origin + path, no search params): the link names the
    // lesson, not the sharer's browse context.
    const permalink = `${window.location.origin}/lesson/${encodeURIComponent(lesson.lessonId)}`;
    if (copyResetTimerRef.current !== null) {
      window.clearTimeout(copyResetTimerRef.current);
    }
    try {
      await window.navigator.clipboard.writeText(permalink);
      setCopyState('copied');
    } catch {
      setCopyState('failed');
    }
    copyResetTimerRef.current = window.setTimeout(() => {
      setCopyState('idle');
      copyResetTimerRef.current = null;
    }, 2000);
  };

  return (
    <>
      <div className="int-detail-eyebrow">
        {activity.label} · Grades {intGradesLabel(lesson.gradeLevels)}
      </div>
      <h2 className="int-detail-title">{lesson.title}</h2>
      <p className="int-detail-summary">{lesson.summary}</p>
      <div className="int-detail-actions">
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
        {/* Always rendered (not gated on fileLink) — the permalink exists even
            for a lesson missing its doc link. aria-live announces the label
            swap ("Copied"/"Copy failed") to screen readers. */}
        <IntButton size="sm" variant="ghost" aria-live="polite" onClick={handleCopyLink}>
          <Link2 width={12} height={12} aria-hidden="true" />
          {COPY_LABELS[copyState]}
        </IntButton>
      </div>
      <dl className="int-detail-meta-list">
        <MetaRow label="Grades" items={sortGradeLevels(lesson.gradeLevels)} />
        <MetaRow label="Location" items={meta.locationRequirements ?? []} />
        <MetaRow label="Season" items={meta.seasonTiming ?? []} />
        <MetaRow label="Themes" items={meta.thematicCategories ?? []} />
        <MetaRow label="Competencies" items={meta.coreCompetencies} />
        {/* FP-16: collapse ancestor chains to the leaf ("Asian, East Asian,
            Chinese" → "Chinese"); display-only, stored data unchanged. */}
        <MetaRow
          label="Cultural Heritage"
          items={collapseHeritageToLeaves(meta.culturalHeritage)}
          format={culturalLabel}
        />
        <MetaRow label="Academic" items={academicSelected(meta.academicIntegration)} />
        <MetaRow label="Garden Skills" items={meta.gardenSkills ?? []} />
        <MetaRow label="Cooking Skills" items={meta.cookingSkills ?? []} />
        <MetaRow label="Ingredients" items={meta.mainIngredients ?? []} />
        <MetaRow
          label="Cooking Method"
          items={meta.cookingMethods ?? []}
          format={labelCookingMethod}
        />
        <MetaRow label="SEL" items={meta.socialEmotionalLearning ?? []} />
        <MetaRow label="Observances" items={meta.observancesHolidays ?? []} />
      </dl>
    </>
  );
}
