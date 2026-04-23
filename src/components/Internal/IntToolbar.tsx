import type { ResultDensity, ResultView, ViewState } from '@/types';
import { IntViewSwitcher } from './IntViewSwitcher';
import { IntDensitySwitcher } from './IntDensitySwitcher';

type SortBy = ViewState['sortBy'];

interface IntToolbarProps {
  count: number;
  query: string;
  activeFilterCount: number;
  sortBy: SortBy;
  view: ResultView;
  density: ResultDensity;
  onSortChange: (sort: SortBy) => void;
  onViewChange: (view: ResultView) => void;
  onDensityChange: (density: ResultDensity) => void;
}

const SORT_OPTIONS: Array<{ value: SortBy; label: string }> = [
  { value: 'relevance', label: 'Sort: Relevance' },
  { value: 'title', label: 'Sort: Title A–Z' },
  { value: 'grade', label: 'Sort: Grade' },
  { value: 'modified', label: 'Sort: Updated' },
];

export function IntToolbar({
  count,
  query,
  activeFilterCount,
  sortBy,
  view,
  density,
  onSortChange,
  onViewChange,
  onDensityChange,
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
        <IntViewSwitcher value={view} onChange={onViewChange} />
        <IntDensitySwitcher value={density} view={view} onChange={onDensityChange} />
      </div>
    </div>
  );
}
