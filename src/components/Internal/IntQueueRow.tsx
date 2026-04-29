import type { KeyboardEvent } from 'react';
import { IntStatusBadge, type IntStatus } from './IntStatusBadge';

interface IntQueueRowSubmission {
  id: string;
  title: string;
  author: string;
  status: IntStatus;
  submittedAt: string; // ISO
  type: 'new' | 'update';
  originalLessonId?: string | null;
  originalLessonTitle?: string | null;
  duplicateCount?: number;
  topMatchType?: 'exact' | 'high' | 'medium' | 'low';
}

interface IntQueueRowProps {
  submission: IntQueueRowSubmission;
  onSelect: (id: string) => void;
}

function relativeAge(iso: string): string {
  const ts = new Date(iso).getTime();
  if (Number.isNaN(ts)) return '—';
  const ms = Date.now() - ts;
  const days = Math.floor(ms / 86_400_000);
  if (days >= 30) return `${Math.floor(days / 30)}mo ago`;
  if (days >= 1) return `${days}d ago`;
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 1) return `${hours}h ago`;
  const mins = Math.floor(ms / 60_000);
  if (mins >= 1) return `${mins}m ago`;
  return 'just now';
}

export function IntQueueRow({ submission, onSelect }: IntQueueRowProps) {
  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect(submission.id);
    }
  };

  return (
    <div
      role="button"
      tabIndex={0}
      className="adm-queue-row"
      onClick={() => onSelect(submission.id)}
      onKeyDown={handleKey}
    >
      <div>
        <IntStatusBadge status={submission.status} />
        <div className="adm-queue-row-meta" style={{ marginTop: 6 }}>
          {relativeAge(submission.submittedAt)}
        </div>
      </div>

      <div>
        <div className="adm-queue-title">{submission.title}</div>
        <div className="adm-queue-sub">
          <span>{submission.author}</span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
        {(() => {
          if (submission.type === 'new') {
            return (
              <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">NEW</span>
            );
          }
          if (submission.originalLessonId) {
            const fullTitle = submission.originalLessonTitle ?? '';
            const truncated =
              fullTitle.length > 40 ? `${fullTitle.slice(0, 40).trim()}…` : fullTitle;
            return (
              <span className="inline-flex items-center gap-1 max-w-full">
                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded shrink-0">
                  UPDATE
                </span>
                <span
                  className="text-xs text-gray-700 truncate"
                  title={fullTitle}
                  aria-label={fullTitle ? `Updating lesson: ${fullTitle}` : 'Updating lesson'}
                >
                  {truncated || '(target unknown)'}
                </span>
              </span>
            );
          }
          return (
            <span className="inline-flex items-center gap-1">
              <span
                className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded"
                aria-label="Submitter is updating but couldn't find target — needs reviewer search"
              >
                UPDATE?
              </span>
              <span className="text-xs text-amber-700">needs reviewer search</span>
            </span>
          );
        })()}
        {submission.duplicateCount ? (
          <span className="adm-queue-warn">
            {submission.duplicateCount} {submission.duplicateCount === 1 ? 'match' : 'matches'}
            {submission.topMatchType ? ` · ${submission.topMatchType}` : ''}
          </span>
        ) : null}
      </div>

      {/* Visual CTA only — the entire row is the clickable surface (the outer
          div has role="button"). A nested <button> here would be invalid HTML
          (interactive-inside-interactive). */}
      <span className="adm-btn adm-btn--primary adm-btn--sm" aria-hidden="true">
        Review
      </span>
    </div>
  );
}
