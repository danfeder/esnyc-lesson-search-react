import type { ResultDensity, ResultView, ViewState } from '@/types';
import { IntViewSwitcher } from './IntViewSwitcher';
import { IntDensitySwitcher } from './IntDensitySwitcher';
import { IntMobileFilterButton } from './IntMobileFilterButton';

type SortBy = ViewState['sortBy'];

interface IntToolbarProps {
  count: number;
  query: string;
  activeFilterCount: number;
  sortBy: SortBy;
  view: ResultView;
  density: ResultDensity;
  /** §3.4: gate the desktop-only Split view option (hidden below 1100px). */
  allowSplit?: boolean;
  onSortChange: (sort: SortBy) => void;
  onViewChange: (view: ResultView) => void;
  onDensityChange: (density: ResultDensity) => void;
  onOpenMobileFilters: () => void;
}

// C58: real server-side sort is relevance/title/modified only. The 'grade'
// option was a no-op (no defined ordering over grade_levels) and is removed;
// it remains in the ViewState.sortBy TS union as a harmless legacy value (a
// stale persisted 'grade' falls back to relevance in the RPC).
const SORT_OPTIONS: Array<{ value: SortBy; label: string }> = [
  { value: 'relevance', label: 'Sort: Relevance' },
  { value: 'title', label: 'Sort: Title A–Z' },
  { value: 'modified', label: 'Sort: Updated' },
];

export function IntToolbar({
  count,
  query,
  activeFilterCount,
  sortBy,
  view,
  density,
  allowSplit = true,
  onSortChange,
  onViewChange,
  onDensityChange,
  onOpenMobileFilters,
}: IntToolbarProps) {
  const lessonWord = count === 1 ? 'lesson' : 'lessons';
  const trailer = query
    ? ` ${lessonWord} matching "${query}"`
    : activeFilterCount > 0
      ? ` ${lessonWord} · ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''}`
      : ` ${lessonWord}`;

  return (
    <div className="int-toolbar">
      <div className="int-toolbar-left">
        <strong>{count}</strong>
        <span>{trailer}</span>
      </div>
      <div className="int-toolbar-right">
        <select
          className="int-sort"
          value={sortBy}
          onChange={(e) => onSortChange(e.target.value as SortBy)}
          aria-label="Sort results"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <IntViewSwitcher value={view} onChange={onViewChange} allowSplit={allowSplit} />
        <IntDensitySwitcher value={density} view={view} onChange={onDensityChange} />
        <IntMobileFilterButton
          activeFilterCount={activeFilterCount}
          onClick={onOpenMobileFilters}
        />
      </div>
    </div>
  );
}
