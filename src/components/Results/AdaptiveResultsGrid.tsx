import React from 'react';
import { Lesson } from '../../types';
import { ResultsGrid } from './ResultsGrid';
import { VirtualizedResultsGrid } from './VirtualizedResultsGrid';
import { shouldVirtualize } from '../../utils/virtualization';

interface AdaptiveResultsGridProps {
  lessons: Lesson[];

  onLessonClick: (lesson: Lesson) => void;
  isLoading?: boolean;
  forceVirtualization?: boolean; // For testing/debugging
}

/**
 * Adaptive results grid that automatically switches between regular and virtualized rendering
 * based on the number of lessons to display.
 */
export const AdaptiveResultsGrid: React.FC<AdaptiveResultsGridProps> = ({
  lessons,
  onLessonClick,
  isLoading = false,
  forceVirtualization = false,
}) => {
  // Determine whether to use virtualization
  const useVirtualization = forceVirtualization || shouldVirtualize(lessons.length, 'grid');

  // Use virtualized grid for better performance with many items
  if (useVirtualization) {
    return (
      <VirtualizedResultsGrid
        lessons={lessons}
        onLessonClick={onLessonClick}
        isLoading={isLoading}
      />
    );
  }

  // Use regular grid for small datasets (better for SEO and simpler)
  return <ResultsGrid lessons={lessons} onLessonClick={onLessonClick} isLoading={isLoading} />;
};

AdaptiveResultsGrid.displayName = 'AdaptiveResultsGrid';
