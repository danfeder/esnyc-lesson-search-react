import type { KeyboardEvent } from 'react';
import { cn } from '@/utils/cn';

export type IntDuplicateMatchType = 'exact' | 'high' | 'medium' | 'low';

export interface IntDuplicateCardData {
  id: string;
  title: string;
  /** Free-text meta line (e.g. "Grades 4–5 · l-002"). */
  meta?: string;
  /** Combined similarity score in 0..1. */
  similarity: number;
  matchType?: IntDuplicateMatchType | null;
  /** Optional human label for the match type (e.g. "Near-duplicate"). Falls back to a default per matchType. */
  matchLabel?: string;
}

interface IntDuplicateCardProps {
  dup: IntDuplicateCardData;
  selected: boolean;
  onSelect: () => void;
}

const DEFAULT_MATCH_LABELS: Record<IntDuplicateMatchType, string> = {
  exact: 'Near-duplicate',
  high: 'High similarity',
  medium: 'Some overlap',
  low: 'Low overlap',
};

export function IntDuplicateCard({ dup, selected, onSelect }: IntDuplicateCardProps) {
  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onSelect();
    }
  };

  const pct = Math.round((dup.similarity ?? 0) * 100);
  const matchType = dup.matchType ?? null;
  const matchLabel = dup.matchLabel ?? (matchType ? DEFAULT_MATCH_LABELS[matchType] : null);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      className={cn('adm-dup', selected && 'selected')}
      onClick={onSelect}
      onKeyDown={handleKey}
    >
      <span className="adm-dup-radio" aria-hidden />
      <div>
        <p className="adm-dup-title">{dup.title}</p>
        {dup.meta && <div className="adm-dup-meta">{dup.meta}</div>}
      </div>
      <div>
        <div className="adm-dup-score">{pct}%</div>
        {matchLabel && (
          <span className={cn('adm-dup-matchtype', matchType && `adm-dup-matchtype--${matchType}`)}>
            {matchLabel}
          </span>
        )}
      </div>
    </div>
  );
}
