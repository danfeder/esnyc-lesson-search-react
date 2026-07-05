import React, { useEffect, useRef, useState } from 'react';
import { useSearchStore } from '@/stores/searchStore';

interface ScreenReaderAnnouncerProps {
  totalCount?: number;
  /**
   * When true, hold the announcement (the search is pending/showing placeholder
   * data, so `totalCount` is stale or the `|| 0` cold-load fallback). Keeps the
   * last announcement until the data settles, then announces the real count
   * once — avoids a stale "Found N lessons" mid-transition and a premature
   * "0 lessons" on cold load. Mirrors C59's other isPlaceholderData gates.
   */
  suppressed?: boolean;
}

export const ScreenReaderAnnouncer: React.FC<ScreenReaderAnnouncerProps> = ({
  totalCount,
  suppressed = false,
}) => {
  const [announcement, setAnnouncement] = useState('');
  // Select only `filters` (not the whole store) so unrelated view-state writes
  // don't re-run this effect.
  const filters = useSearchStore((s) => s.filters);

  // FP4 Brief 4 item 6: the FIRST unsuppressed effect run is the mount baseline
  // — a fresh page load, after useUrlSync's on-mount hydration and the initial
  // count settle. We skip it so nothing is announced with zero interaction (no
  // phantom "All filters cleared. Showing all N lessons."). A reference/value
  // check on `filters` won't do: hydration churns `filters` before any real
  // interaction. Every run AFTER the baseline is a genuine user filter/sort
  // change and gets announced.
  const hasBaselinedRef = useRef(false);

  // Announce filter changes
  useEffect(() => {
    // While the result count is stale/placeholder, don't announce — wait for
    // the settled count so screen readers hear it exactly once and correctly.
    if (suppressed) return;

    if (!hasBaselinedRef.current) {
      hasBaselinedRef.current = true;
      return;
    }

    const activeFilters = [];

    if (filters.query) activeFilters.push(`searching for "${filters.query}"`);
    if (filters.gradeLevels.length)
      activeFilters.push(`${filters.gradeLevels.length} grade levels`);
    if (filters.activityType.length)
      activeFilters.push(`${filters.activityType.length} activity types`);
    if (filters.seasonTiming.length) activeFilters.push(`${filters.seasonTiming.length} seasons`);
    if (filters.location.length) activeFilters.push(`${filters.location.length} locations`);
    if (filters.thematicCategories.length)
      activeFilters.push(`${filters.thematicCategories.length} themes`);
    if (filters.culturalHeritage.length)
      activeFilters.push(`${filters.culturalHeritage.length} cultural heritage selections`);
    if (filters.coreCompetencies.length)
      activeFilters.push(`${filters.coreCompetencies.length} core competencies`);
    if (filters.cookingMethods.length)
      activeFilters.push(`${filters.cookingMethods.length} cooking methods`);
    if (filters.academicIntegration.length)
      activeFilters.push(`${filters.academicIntegration.length} academic subjects`);
    if (filters.socialEmotionalLearning.length)
      activeFilters.push(`${filters.socialEmotionalLearning.length} SEL competencies`);

    const count = typeof totalCount === 'number' ? totalCount : 0;
    if (activeFilters.length > 0) {
      const filterText = activeFilters.join(', ');
      setAnnouncement(`Filters updated: ${filterText}. Found ${count} lessons.`);
    } else {
      setAnnouncement(`All filters cleared. Showing all ${count} lessons.`);
    }
  }, [filters, totalCount, suppressed]);

  return (
    <>
      {/* Live region for filter updates */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {/* Live region for immediate announcements */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        id="immediate-announcer"
      />
    </>
  );
};
