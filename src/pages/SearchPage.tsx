import React from 'react';
import { useState } from 'react';
import { SearchBar } from '../components/Search/SearchBar';
import { FilterSidebar } from '../components/Filters/FilterSidebar';
import { ResultsHeader } from '../components/Results/ResultsHeader';
import { ResultsGrid } from '../components/Results/ResultsGrid';
import { LessonModal } from '../components/Modal/LessonModal';
import { useSearchStore } from '../stores/searchStore';
import { useSearch } from '../hooks/useSearch';
import type { Lesson } from '../types';

export const SearchPage: React.FC = () => {
  const { filters, viewState, setViewState } = useSearchStore();
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const { data: searchResults, isLoading, error } = useSearch({
    filters,
    page: viewState.currentPage,
    limit: viewState.resultsPerPage,
  });

  const handleLessonClick = (lesson: Lesson) => {
    setSelectedLesson(lesson);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedLesson(null);
  };

  const handleExport = () => {
    // TODO: Implement CSV export
    console.log('Export functionality coming soon...');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <SearchBar />
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <aside className="lg:col-span-1">
          <FilterSidebar
            filters={filters}
            onFiltersChange={(newFilters) => useSearchStore.getState().setFilters(newFilters)}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />
        </aside>
        
        {/* Results Area */}
        <main className="lg:col-span-3">
          <ResultsHeader
            totalCount={searchResults?.totalCount || 0}
            currentQuery={filters.query}
            viewMode={viewState.view}
            onViewModeChange={(mode) => setViewState({ view: mode })}
            sortBy={viewState.sortBy}
            onSortChange={(sort) => setViewState({ sortBy: sort as any })}
            onExport={handleExport}
          />
          
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">Error loading lessons: {error.message}</p>
            </div>
          )}
          
          <ResultsGrid
            lessons={searchResults?.lessons || []}
            onLessonClick={handleLessonClick}
            isLoading={isLoading}
          />
        </main>
      </div>
      
      {/* Mobile Filter Toggle */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 bg-primary-600 text-white p-4 rounded-full shadow-lg hover:bg-primary-700 transition-colors z-40"
      >
        <span className="text-sm font-medium">Filters</span>
      </button>
      
      {/* Lesson Detail Modal */}
      <LessonModal
        lesson={selectedLesson}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
};