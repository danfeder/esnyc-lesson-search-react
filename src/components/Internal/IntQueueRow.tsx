import type { KeyboardEvent } from 'react';
import { IntStatusBadge, type IntStatus } from './IntStatusBadge';

interface IntQueueRowSubmission {
  id: string;
  title: string;
  author: string;
  status: IntStatus;
  submittedAt: string; // ISO
  type: 'new' | 'update';
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
        <span className="adm-pill">{submission.type === 'new' ? 'New lesson' : 'Update'}</span>
        {submission.duplicateCount ? (
          <span className="adm-queue-warn">
            {submission.duplicateCount} {submission.duplicateCount === 1 ? 'match' : 'matches'}
            {submission.topMatchType ? ` · ${submission.topMatchType}` : ''}
          </span>
        ) : null}
      </div>

      <button
        type="button"
        className="adm-btn adm-btn--primary adm-btn--sm"
        onClick={(e) => {
          e.stopPropagation();
          onSelect(submission.id);
        }}
      >
        Review
      </button>
    </div>
  );
}
