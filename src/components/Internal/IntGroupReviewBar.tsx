import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface IntGroupReviewBarProps {
  summary: ReactNode;
  primaryLabel: string;
  dismissLabel?: string;
  onResolve: () => void;
  onDismiss: () => void;
  resolveDisabled?: boolean;
  dismissDisabled?: boolean;
  isSubmitting?: boolean;
  submittingAction?: 'resolve' | 'dismiss' | null;
  error?: string | null;
  className?: string;
}

export function IntGroupReviewBar({
  summary,
  primaryLabel,
  dismissLabel = 'Dismiss group',
  onResolve,
  onDismiss,
  resolveDisabled,
  dismissDisabled,
  isSubmitting,
  submittingAction,
  error,
  className,
}: IntGroupReviewBarProps) {
  return (
    <div className={cn('adm-reviewbar', className)}>
      {error && (
        <div className="adm-reviewbar-error" role="alert">
          <AlertCircle size={12} style={{ marginRight: 6, verticalAlign: 'middle' }} />
          {error}
        </div>
      )}
      <div className="adm-reviewbar-summary">{summary}</div>
      <div className="adm-reviewbar-actions">
        <button
          type="button"
          className="adm-btn adm-btn--ghost"
          onClick={onDismiss}
          disabled={dismissDisabled || isSubmitting}
        >
          {submittingAction === 'dismiss' ? 'Dismissing…' : dismissLabel}
        </button>
        <button
          type="button"
          className="adm-btn adm-btn--primary"
          onClick={onResolve}
          disabled={resolveDisabled || isSubmitting}
        >
          {submittingAction === 'resolve' ? 'Resolving…' : primaryLabel}
        </button>
      </div>
    </div>
  );
}
