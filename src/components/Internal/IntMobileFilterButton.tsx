import { SlidersHorizontal } from 'lucide-react';

interface IntMobileFilterButtonProps {
  activeFilterCount: number;
  onClick: () => void;
}

export function IntMobileFilterButton({ activeFilterCount, onClick }: IntMobileFilterButtonProps) {
  return (
    <button
      type="button"
      className="int-mobile-filter-btn"
      onClick={onClick}
      aria-label={
        activeFilterCount > 0 ? `Open filters (${activeFilterCount} active)` : 'Open filters'
      }
    >
      <SlidersHorizontal width={12} height={12} />
      <span>Filters</span>
      {activeFilterCount > 0 && (
        <span className="int-mobile-filter-btn-count">{activeFilterCount}</span>
      )}
    </button>
  );
}
