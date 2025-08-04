import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { debounceResize } from '../../utils/virtualization';
import { Lesson } from '../../types';
import { LessonCard } from './LessonCard';

interface VirtualizedResultsGridProps {
  lessons: Lesson[];
  // eslint-disable-next-line no-unused-vars
  onLessonClick: (lesson: Lesson) => void;
  isLoading?: boolean;
}

// Constants for grid layout
const CARD_HEIGHT = 280; // Fixed height of lesson cards
const GAP = 24; // Gap between cards (gap-6 = 1.5rem = 24px)
const MOBILE_BREAKPOINT = 1024; // lg breakpoint
const ROW_HEIGHT = CARD_HEIGHT + GAP; // Fixed row height (304px)

// Loading skeleton component
const LoadingSkeleton: React.FC = () => (
  <div className="card p-6 animate-pulse">
    <div className="flex justify-between items-start mb-4">
      <div className="h-6 bg-gray-200 rounded w-3/4"></div>
      <div className="h-6 bg-gray-200 rounded w-16"></div>
    </div>
    <div className="space-y-2 mb-4">
      <div className="h-4 bg-gray-200 rounded w-full"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
      <div className="h-4 bg-gray-200 rounded w-4/6"></div>
    </div>
    <div className="flex space-x-4 mb-4">
      <div className="h-4 bg-gray-200 rounded w-20"></div>
      <div className="h-4 bg-gray-200 rounded w-16"></div>
    </div>
    <div className="flex space-x-2">
      <div className="h-6 bg-gray-200 rounded w-16"></div>
      <div className="h-6 bg-gray-200 rounded w-20"></div>
      <div className="h-6 bg-gray-200 rounded w-14"></div>
    </div>
  </div>
);

// Empty state component
const EmptyState: React.FC = () => (
  <div className="text-center py-16">
    <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
      <span className="text-4xl">🔍</span>
    </div>
    <h3 className="text-xl font-semibold text-gray-900 mb-2">No lessons found</h3>
    <p className="text-gray-600 max-w-md mx-auto">
      Try adjusting your search terms or filters to find more lessons.
    </p>
  </div>
);

export const VirtualizedResultsGrid: React.FC<VirtualizedResultsGridProps> = ({
  lessons,
  onLessonClick,
  isLoading = false,
}) => {
  // Calculate number of columns based on window width
  const [columnCount, setColumnCount] = useState(() => {
    if (typeof window === 'undefined') return 2;
    return window.innerWidth < MOBILE_BREAKPOINT ? 1 : 2;
  });

  // Update column count on resize with debouncing
  useEffect(() => {
    const handleResize = debounceResize(() => {
      setColumnCount(window.innerWidth < MOBILE_BREAKPOINT ? 1 : 2);
    }, 150);

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Calculate total rows needed
  const rowCount = useMemo(() => {
    if (isLoading) return 3; // Show 3 rows of skeletons
    return Math.ceil(lessons.length / columnCount);
  }, [lessons.length, columnCount, isLoading]);

  // Use window virtualizer for natural scrolling with fixed row heights
  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: useCallback(() => ROW_HEIGHT, []),
    overscan: 2, // Render 2 extra rows for smoother scrolling
    scrollMargin: 0,
  });

  // Handle loading state with skeletons
  if (isLoading && lessons.length === 0) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 6 }).map((_, index) => (
          <LoadingSkeleton key={index} />
        ))}
      </div>
    );
  }

  // Handle empty state
  if (!isLoading && lessons.length === 0) {
    return <EmptyState />;
  }

  const virtualItems = virtualizer.getVirtualItems();

  return (
    <div className="w-full" role="region" aria-label="Search results" aria-busy={isLoading}>
      {/* Virtual container with total size */}
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {/* Render only visible rows */}
        {virtualItems.map((virtualRow) => {
          const startIndex = virtualRow.index * columnCount;

          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${ROW_HEIGHT}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="flex gap-6">
                {isLoading
                  ? // Show loading skeletons
                    Array.from({ length: columnCount }).map((_, colIndex) => (
                      <div key={`skeleton-${virtualRow.index}-${colIndex}`} className="flex-1">
                        <LoadingSkeleton />
                      </div>
                    ))
                  : // Show actual lesson cards
                    Array.from({ length: columnCount }).map((_, colIndex) => {
                      const lessonIndex = startIndex + colIndex;
                      if (lessonIndex < lessons.length) {
                        const lesson = lessons[lessonIndex];
                        return (
                          <div key={`lesson-${lessonIndex}`} className="flex-1">
                            <LessonCard lesson={lesson} onClick={() => onLessonClick(lesson)} />
                          </div>
                        );
                      }
                      // Empty cell for incomplete rows
                      return (
                        <div key={`empty-${virtualRow.index}-${colIndex}`} className="flex-1" />
                      );
                    })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Provide context for screen readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isLoading ? 'Loading lessons...' : `Showing ${lessons.length} lessons`}
      </div>
    </div>
  );
};

VirtualizedResultsGrid.displayName = 'VirtualizedResultsGrid';
