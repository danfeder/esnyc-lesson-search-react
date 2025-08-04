import React, { useRef, useEffect, useMemo, useCallback } from 'react';
import { VariableSizeGrid as Grid } from 'react-window';
import { Lesson } from '../../types';
import { LessonCard } from './LessonCard';

interface VirtualizedResultsGridProps {
  lessons: Lesson[];
  // eslint-disable-next-line no-unused-vars
  onLessonClick: (lesson: Lesson) => void;
  isLoading?: boolean;
}

// Constants for grid layout
const CARD_HEIGHT = 320; // Approximate height of a lesson card
const GAP = 24; // Gap between cards (gap-6 = 1.5rem = 24px)
const MOBILE_BREAKPOINT = 1024; // lg breakpoint

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
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<Grid>(null);
  const [dimensions, setDimensions] = React.useState({ width: 0, height: 600 });

  // Calculate number of columns based on width
  const columnCount = useMemo(() => {
    if (dimensions.width < MOBILE_BREAKPOINT) return 1;
    return 2;
  }, [dimensions.width]);

  // Calculate row count
  const rowCount = useMemo(() => {
    if (isLoading) return 3; // Show 3 rows of skeletons
    return Math.ceil(lessons.length / columnCount);
  }, [lessons.length, columnCount, isLoading]);

  // Update dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: rect.width,
          height: Math.min(window.innerHeight - 200, 800), // Max height of 800px
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Reset scroll position when lessons change significantly
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.scrollTo({ scrollLeft: 0, scrollTop: 0 });
    }
  }, [lessons.length]);

  // Calculate column width
  const getColumnWidth = useCallback(
    (index: number) => {
      if (columnCount === 1) return dimensions.width;
      // For 2 columns, account for gap
      return (dimensions.width - GAP) / 2;
    },
    [dimensions.width, columnCount]
  );

  // Row height is constant
  const getRowHeight = useCallback(() => CARD_HEIGHT + GAP, []);

  // Cell renderer
  const Cell = useCallback(
    ({ columnIndex, rowIndex, style }: any) => {
      const index = rowIndex * columnCount + columnIndex;

      // Handle loading state
      if (isLoading) {
        return (
          <div
            style={{
              ...style,
              paddingRight: columnIndex === 0 && columnCount === 2 ? GAP / 2 : 0,
              paddingLeft: columnIndex === 1 ? GAP / 2 : 0,
              paddingBottom: GAP,
            }}
          >
            <LoadingSkeleton />
          </div>
        );
      }

      // Check if we have a lesson at this index
      if (index >= lessons.length) {
        return null;
      }

      const lesson = lessons[index];

      return (
        <div
          style={{
            ...style,
            paddingRight: columnIndex === 0 && columnCount === 2 ? GAP / 2 : 0,
            paddingLeft: columnIndex === 1 ? GAP / 2 : 0,
            paddingBottom: GAP,
          }}
        >
          <LessonCard lesson={lesson} onClick={() => onLessonClick(lesson)} />
        </div>
      );
    },
    [lessons, onLessonClick, columnCount, isLoading]
  );

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

  // If dimensions aren't ready yet, show loading
  if (dimensions.width === 0) {
    return (
      <div ref={containerRef} className="w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <LoadingSkeleton key={index} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full"
      role="region"
      aria-label="Search results"
      aria-busy={isLoading}
    >
      <Grid
        ref={gridRef}
        columnCount={columnCount}
        columnWidth={getColumnWidth}
        height={dimensions.height}
        rowCount={rowCount}
        rowHeight={getRowHeight}
        width={dimensions.width}
        className="scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-100"
        overscanRowCount={2} // Render 2 extra rows for smoother scrolling
        overscanColumnCount={1} // Render 1 extra column for smoother scrolling
      >
        {Cell}
      </Grid>

      {/* Provide context for screen readers */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {isLoading ? 'Loading lessons...' : `Showing ${lessons.length} lessons`}
      </div>
    </div>
  );
};

VirtualizedResultsGrid.displayName = 'VirtualizedResultsGrid';
