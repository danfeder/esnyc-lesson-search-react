import React, { useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';

interface InfiniteScrollTriggerProps {
  onLoadMore: () => void;
  isLoading: boolean;
  hasMore: boolean;
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
  className = '',
}) => {
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || isLoading) return;

    const observer = new IntersectionObserver(
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
      className={`flex justify-center items-center py-8 ${className}`}
      role="status"
      aria-live="polite"
      aria-label={isLoading ? 'Loading more results' : 'Load more trigger'}
    >
      {isLoading && (
        <>
          <Loader2 className="w-6 h-6 animate-spin text-primary-600 mr-2" />
          <span className="text-gray-600">Loading more results...</span>
        </>
      )}
    </div>
  );
};

InfiniteScrollTrigger.displayName = 'InfiniteScrollTrigger';
