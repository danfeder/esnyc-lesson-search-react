import type { ViewState } from '@/types';

type SortBy = ViewState['sortBy'];

interface IntToolbarProps {
  count: number;
  query: string;
  activeFilterCount: number;
  sortBy: SortBy;

  onSortChange: (sort: SortBy) => void;
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
  onSortChange,
}: IntToolbarProps) {
  return (
    <div className="int-toolbar">
      <div className="int-toolbar-left">
        <strong>{count}</strong> lesson{count === 1 ? '' : 's'}
        {query && <> matching "{query}"</>}
        {!query && activeFilterCount > 0 && (
          <>
            {' · '}
            {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
          </>
        )}
      </div>
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
    </div>
  );
}
