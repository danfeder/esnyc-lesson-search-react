import React from 'react';
import { useState } from 'react';
import { SearchBar } from '../components/Search/SearchBar';
import { FilterPills } from '../components/Filters/FilterPills';
import { FilterModal } from '../components/Filters/FilterModal';
import { ResultsHeader } from '../components/Results/ResultsHeader';
import { ResultsGrid } from '../components/Results/ResultsGrid';
import { LessonModal } from '../components/Modal/LessonModal';
import { ScreenReaderAnnouncer } from '../components/Common/ScreenReaderAnnouncer';
import { SkipLink } from '../components/Common/SkipLink';
import { useSearchStore } from '../stores/searchStore';
import { useSupabaseSearch } from '../hooks/useSupabaseSearch';
import type { Lesson, ViewState } from '../types';

export const SearchPage: React.FC = () => {
  const { filters, viewState, setViewState, setFilters } = useSearchStore();
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const { lessons, totalCount, isLoading, error, facets } = useSupabaseSearch(
    filters,
    viewState.currentPage,
    viewState.resultsPerPage
  );

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
    // console.log('Export functionality coming soon...');
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

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error loading lessons: {error}</p>
          </div>
        )}

        <ResultsGrid lessons={lessons} onLessonClick={handleLessonClick} isLoading={isLoading} />
      </main>

      {/* Filter Modal */}
      <FilterModal
        isOpen={isFilterModalOpen}
        onClose={handleCloseFilterModal}
        filters={filters}
        onFiltersChange={setFilters}
        facets={facets}
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
