import React, { useEffect, useState } from 'react';
import { useSearchStore } from '../../stores/searchStore';

export const ScreenReaderAnnouncer: React.FC = () => {
  const [announcement, setAnnouncement] = useState('');
  const { filters, totalCount } = useSearchStore();

  // Announce filter changes
  useEffect(() => {
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
    if (filters.lessonFormat) activeFilters.push(`lesson format: ${filters.lessonFormat}`);
    if (filters.cookingMethods) activeFilters.push(`cooking method: ${filters.cookingMethods}`);
    if (filters.academicIntegration.length)
      activeFilters.push(`${filters.academicIntegration.length} academic subjects`);
    if (filters.socialEmotionalLearning.length)
      activeFilters.push(`${filters.socialEmotionalLearning.length} SEL competencies`);

    if (activeFilters.length > 0) {
      const filterText = activeFilters.join(', ');
      setAnnouncement(`Filters updated: ${filterText}. Found ${totalCount} lessons.`);
    } else {
      setAnnouncement(`All filters cleared. Showing all ${totalCount} lessons.`);
    }
  }, [filters, totalCount]);

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
