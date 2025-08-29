import React from 'react';
import { useState, useEffect, useCallback } from 'react';
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
import { useSupabaseSearch } from '../hooks/useSupabaseSearch';
import { supabase } from '../lib/supabase';
import type { Lesson, ViewState, LessonMetadata } from '../types';

export const SearchPage: React.FC = () => {
  const {
    filters,
    viewState,
    results,
    totalCount,
    isLoading,
    isLoadingMore,
    error,
    hasMore,
    setViewState,
    setFilters,
    setResults,
    appendResults,
    setLoading,
    setLoadingMore,
    setError,
  } = useSearchStore();

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isLessonModalOpen, setIsLessonModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Initial search for first page
  const {
    lessons: initialLessons,
    totalCount: searchTotalCount,
    isLoading: searchIsLoading,
    error: searchError,
    facets,
  } = useSupabaseSearch(
    filters,
    1, // Always fetch first page for initial load
    viewState.resultsPerPage
  );

  // Update store when initial search completes
  useEffect(() => {
    if (!searchIsLoading && initialLessons) {
      setResults(initialLessons, searchTotalCount);
      setLoading(searchIsLoading);
      setCurrentPage(1);
    }
    if (searchError) {
      setError(searchError);
    }
  }, [
    initialLessons,
    searchTotalCount,
    searchIsLoading,
    searchError,
    setResults,
    setLoading,
    setError,
  ]);

  // Load more handler for infinite scroll
  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;

    const nextPage = currentPage + 1;
    setLoadingMore(true);

    try {
      // Use supabase directly for pagination

      const searchParams = {
        search_query: filters.query || undefined,
        filter_grade_levels: filters.gradeLevels?.length ? filters.gradeLevels : undefined,
        filter_themes: filters.thematicCategories?.length ? filters.thematicCategories : undefined,
        filter_seasonTiming: filters.seasonTiming?.length ? filters.seasonTiming : undefined,
        filter_competencies: filters.coreCompetencies?.length
          ? filters.coreCompetencies
          : undefined,
        filter_cultures: filters.culturalHeritage?.length ? filters.culturalHeritage : undefined,
        filter_location: filters.location?.length ? filters.location : undefined,
        filter_activity_type: filters.activityType?.length ? filters.activityType : undefined,
        filter_lesson_format: filters.lessonFormat || undefined,
        filter_academic: filters.academicIntegration?.length
          ? filters.academicIntegration
          : undefined,
        filter_sel: filters.socialEmotionalLearning?.length
          ? filters.socialEmotionalLearning
          : undefined,
        filter_cooking_method: filters.cookingMethods || undefined,
        page_size: viewState.resultsPerPage,
        page_offset: (nextPage - 1) * viewState.resultsPerPage,
      };

      const { data, error: loadError } = await supabase.rpc('search_lessons', searchParams);

      if (loadError) throw loadError;

      const newLessons: Lesson[] =
        data?.map((row: Record<string, unknown>) => ({
          lessonId: row.lesson_id as string,
          title: row.title as string,
          summary: row.summary as string,
          fileLink: row.file_link as string,
          gradeLevels: row.grade_levels as string[],
          metadata: {
            ...((row.metadata as Record<string, any>) || {}),
            coreCompetencies: (row.metadata as any)?.coreCompetencies || [],
            culturalHeritage: (row.metadata as any)?.culturalHeritage || [],
            activityType: (row.metadata as any)?.activityType || [],
            lessonFormat: (row.metadata as any)?.lessonFormat || [],
          } as LessonMetadata,
          confidence: {
            overall: (row.confidence as any)?.overall || 0,
            title: (row.confidence as any)?.title || 0,
            summary: (row.confidence as any)?.summary || 0,
            gradeLevels: (row.confidence as any)?.gradeLevels || 0,
          },
        })) || [];

      appendResults(newLessons);
      setCurrentPage(nextPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load more results');
    } finally {
      setLoadingMore(false);
    }
  }, [
    currentPage,
    filters,
    viewState.resultsPerPage,
    hasMore,
    isLoadingMore,
    appendResults,
    setLoadingMore,
    setError,
  ]);

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

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error loading lessons: {error}</p>
          </div>
        )}

        <AdaptiveResultsGrid
          lessons={results}
          onLessonClick={handleLessonClick}
          isLoading={isLoading}
        />

        {/* Infinite Scroll Trigger */}
        {results.length > 0 && (
          <InfiniteScrollTrigger
            onLoadMore={handleLoadMore}
            isLoading={isLoadingMore}
            hasMore={hasMore}
            currentCount={results.length}
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
