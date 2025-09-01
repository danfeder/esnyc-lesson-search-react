import React from 'react';
import { useState, useCallback } from 'react';
import { SearchBar } from '../components/Search/SearchBar';
import { FilterPills } from '../components/Filters/FilterPills';
import { FilterModal } from '../components/Filters/FilterModal';
import { ResultsHeader } from '../components/Results/ResultsHeader';
import { AdaptiveResultsGrid } from '../components/Results/AdaptiveResultsGrid';
import { LessonModal } from '../components/Modal/LessonModal';
import { ScreenReaderAnnouncer } from '../components/Common/ScreenReaderAnnouncer';
import { SkipLink } from '../components/Common/SkipLink';
import { InfiniteScrollTrigger } from '../components/Common/InfiniteScrollTrigger';
import { useSearchStore } from '../stores/searchStore';
import { useLessonSearch } from '@/hooks/useLessonSearch';
import type { Lesson, ViewState } from '../types';

export const SearchPage: React.FC = () => {
  const { filters, viewState, setViewState, setFilters } = useSearchStore();

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  // React Query manages pagination; no local page counter required

  const { data, isLoading, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useLessonSearch({ filters, pageSize: viewState.resultsPerPage });

  const lessons = (data?.pages || []).flatMap((p) => p.lessons);
  const totalCount = data?.pages?.[0]?.totalCount || 0;

  // Load more handler for infinite scroll
  const handleLoadMore = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) return;
    await fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setIsLessonModalOpen(true);
  };

  const handleCloseLessonModal = () => {
    setIsLessonModalOpen(false);
    setSelectedLesson(null);
  };

  const handleOpenFilterModal = () => {
    setIsFilterModalOpen(true);
  };

  const handleCloseFilterModal = () => {
    setIsFilterModalOpen(false);
  };

  const handleExport = () => {
    // TODO: Implement CSV export
    // logger.log('Export functionality coming soon...');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SkipLink />
      <ScreenReaderAnnouncer />
      <SearchBar />

      {/* Filter Pills */}
      <FilterPills onAddFilters={handleOpenFilterModal} />

      {/* Results Area */}
      <main id="main-content" tabIndex={-1}>
        <ResultsHeader
          totalCount={totalCount}
          currentQuery={filters.query}
          sortBy={viewState.sortBy}
          onSortChange={(sort) => setViewState({ sortBy: sort as ViewState['sortBy'] })}
          onExport={handleExport}
        />

        {isError && error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error loading lessons: {error.message}</p>
          </div>
        )}

        <AdaptiveResultsGrid
          lessons={lessons}
          onLessonClick={handleLessonClick}
          isLoading={isLoading}
        />

        {/* Infinite Scroll Trigger */}
        {lessons.length > 0 && (
          <InfiniteScrollTrigger
            onLoadMore={handleLoadMore}
            isLoading={isFetchingNextPage}
            hasMore={!!hasNextPage}
            currentCount={lessons.length}
            totalCount={totalCount}
          />
        )}
      </main>

      {/* Filter Modal */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={handleCloseFilterModal}
        filters={filters}
        onFiltersChange={setFilters}
        facets={{}}
      />

      {/* Lesson Detail Modal */}
      <LessonModal
        lesson={selectedLesson}
        isOpen={isLessonModalOpen}
        onClose={handleCloseLessonModal}
      />
    </div>
  );
};
