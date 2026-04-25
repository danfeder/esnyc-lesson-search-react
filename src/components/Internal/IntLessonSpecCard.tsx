import { useMemo } from 'react';
import { Check, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import type { LessonForReview } from '@/services/duplicateGroupService';
import { cn } from '@/utils/cn';

export interface IntLessonSpecCardProps {
  lesson: LessonForReview;
  groupLessons: LessonForReview[];
  isCanonical: boolean;
  locked?: boolean;
  dismissed?: boolean;
  onKeep: () => void;
  archiveTargetId?: string;

  onArchiveTargetChange?: (targetId: string) => void;
  groupId: string;
}

export function IntLessonSpecCard({
  lesson,
  groupLessons,
  isCanonical,
  locked = false,
  dismissed = false,
  onKeep,
  archiveTargetId,
  onArchiveTargetChange,
  groupId,
}: IntLessonSpecCardProps) {
  const siblings = useMemo(() => {
    const titleByLessonId = new Map(groupLessons.map((l) => [l.lesson_id, l.title]));
    return Object.entries(lesson.similarities || {})
      .map(([id, sim]) => ({
        id,
        sim,
        title: titleByLessonId.get(id) || id,
      }))
      .sort((a, b) => b.sim - a.sim);
  }, [groupLessons, lesson.similarities]);

  const cardClasses = cn(
    'adm-spec-card',
    isCanonical && !dismissed && 'canonical',
    !isCanonical && locked && !dismissed && 'archived'
  );

  const archiveOptions = groupLessons.filter((l) => l.lesson_id !== lesson.lesson_id);
  const showArchivePicker = !isCanonical && !locked && archiveOptions.length > 1;

  return (
    <article className={cardClasses} aria-label={lesson.title}>
      <div className="adm-spec-card-head">
        <div style={{ minWidth: 0 }}>
          <h3 className="adm-spec-card-title">{lesson.title}</h3>
          <span className="adm-spec-card-id">
            {lesson.lesson_id}
            {lesson.teacher_name ? ` · ${lesson.teacher_name}` : ''}
          </span>
        </div>
        {locked && !dismissed ? (
          isCanonical ? (
            <span className="adm-spec-card-canonical-chip">
              <Check size={9} /> Canonical
            </span>
          ) : (
            <span className="adm-spec-card-archived-chip">Archived</span>
          )
        ) : null}
      </div>

      <dl className="adm-spec-card-meta">
        <div className="row">
          <span className="k">Grades</span>
          <span className="v">{lesson.grade_levels?.join(', ') || '—'}</span>
        </div>
        <div className="row">
          <span className="k">Submitted by</span>
          <span className="v">{lesson.teacher_name || '—'}</span>
        </div>
        {lesson.updated_at && (
          <div className="row">
            <span className="k">Updated</span>
            <span className="v mono">
              {formatDistanceToNow(new Date(lesson.updated_at), { addSuffix: true })}
            </span>
          </div>
        )}
        <div className="row">
          <span className="k">Length</span>
          <span className="v mono">{lesson.content_length.toLocaleString()} chars</span>
        </div>
      </dl>

      {lesson.summary && <p className="adm-spec-card-summary">{lesson.summary}</p>}

      {siblings.length > 0 && (
        <div className="adm-spec-card-sibs">
          <span className="lbl">Similarity to siblings</span>
          {siblings.map((s) => (
            <div className="adm-spec-card-sibs-row" key={s.id}>
              <span className="title">{s.title}</span>
              <span className="pct">{Math.round(s.sim * 100)}%</span>
            </div>
          ))}
        </div>
      )}

      <div className="adm-spec-card-actions">
        <label className={cn('adm-keep-radio', isCanonical && 'on')}>
          <input
            type="radio"
            name={`keep-${groupId}`}
            checked={isCanonical}
            onChange={onKeep}
            disabled={locked}
          />
          <span className="dot" />
          {isCanonical ? 'Keeping as canonical' : 'Keep as canonical'}
        </label>
        {lesson.file_link && (
          <a
            className="adm-btn adm-btn--sm adm-btn--ghost"
            href={lesson.file_link}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={10} /> Open doc
          </a>
        )}
      </div>

      {showArchivePicker && (
        <div className="adm-archive-picker">
          <label className="lbl" htmlFor={`archive-target-${lesson.lesson_id}`}>
            Archive → redirect to
          </label>
          <select
            id={`archive-target-${lesson.lesson_id}`}
            value={archiveTargetId || ''}
            onChange={(e) => onArchiveTargetChange?.(e.target.value)}
          >
            {archiveOptions.map((o) => (
              <option key={o.lesson_id} value={o.lesson_id}>
                {o.lesson_id} — {o.title.length > 42 ? `${o.title.slice(0, 42)}…` : o.title}
              </option>
            ))}
          </select>
        </div>
      )}
    </article>
  );
}
