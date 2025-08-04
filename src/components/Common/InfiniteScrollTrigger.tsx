import React, { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface InfiniteScrollTriggerProps {
  onLoadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
  currentCount?: number;
  totalCount?: number;
  className?: string;
}

/**
 * Component that triggers a callback when it becomes visible in the viewport.
 * Used for implementing infinite scroll functionality.
 */
export const InfiniteScrollTrigger: React.FC<InfiniteScrollTriggerProps> = ({
  onLoadMore,
  isLoading,
  hasMore,
  currentCount,
  totalCount,
  className = '',
}) => {
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isLoading) return;

    const observer = new window.IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: '100px', // Trigger 100px before the element is visible
        threshold: 0,
      }
    );

    const currentRef = triggerRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [onLoadMore, isLoading, hasMore]);

  // Don't render anything if there are no more results
  if (!hasMore && !isLoading) {
    return (
      <div className={`text-center py-8 text-gray-500 ${className}`}>
        <p>No more results to load</p>
      </div>
    );
  }

  return (
    <div
      ref={triggerRef}
      className={`flex flex-col items-center py-8 ${className}`}
      role="region"
      aria-label="Load more results"
    >
      {/* Aria-live region for screen reader announcements */}
      {currentCount !== undefined && totalCount !== undefined && (
        <div className="sr-only" aria-live="polite" aria-atomic="true">
          {isLoading
            ? 'Loading more results...'
            : `Showing ${currentCount} of ${totalCount} results`}
        </div>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <div className="flex items-center" role="status">
          <Loader2 className="w-6 h-6 animate-spin text-primary-600 mr-2" />
          <span className="text-gray-600">Loading more results...</span>
        </div>
      )}

      {/* Keyboard-accessible load more button (fallback for keyboard users) */}
      {!isLoading && hasMore && (
        <button
          onClick={onLoadMore}
          className="sr-only focus:not-sr-only focus:inline-flex items-center px-4 py-2 mt-4 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
          aria-label={`Load more results. ${
            currentCount && totalCount ? `Currently showing ${currentCount} of ${totalCount}` : ''
          }`}
        >
          Load more results
        </button>
      )}
    </div>
  );
};

InfiniteScrollTrigger.displayName = 'InfiniteScrollTrigger';
