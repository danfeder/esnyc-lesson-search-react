import React, { useCallback, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { ScreenReaderAnnouncer } from '@/components/Common/ScreenReaderAnnouncer';
import { SkipLink } from '@/components/Common/SkipLink';
import { InfiniteScrollTrigger } from '@/components/Common/InfiniteScrollTrigger';
import {
  IntActivePills,
  IntCardGrid,
  IntEmptyState,
  IntLessonDrawer,
  IntListRow,
  IntMobileFilterDrawer,
  IntSidebar,
  IntSplitDetail,
  IntToolbar,
} from '@/components/Internal';
import { useSearchStore } from '@/stores/searchStore';
import { useLessonSearch } from '@/hooks/useLessonSearch';
import { useLessonSuggestions } from '@/hooks/useLessonSuggestions';
import { useFacetCounts } from '@/utils/facetCounts';
import type { Lesson, SearchFilters, ViewState } from '@/types';

function countActiveFilters(filters: SearchFilters): number {
  return (Object.keys(filters) as Array<keyof SearchFilters>)
    .filter((k) => k !== 'query')
    .reduce((sum, k) => {
      const v = filters[k];
      if (Array.isArray(v)) return sum + v.length;
      if (typeof v === 'string' && v) return sum + 1;
      return sum;
    }, 0);
}

export const SearchPage: React.FC = () => {
  const filters = useSearchStore((s) => s.filters);
  const viewState = useSearchStore((s) => s.viewState);
  const setViewState = useSearchStore((s) => s.setViewState);
  const setFilters = useSearchStore((s) => s.setFilters);

  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null);
  const [isMobileFilterOpen, setMobileFilterOpen] = useState(false);

  const { data, isError, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useLessonSearch({
    filters,
    pageSize: viewState.resultsPerPage,
  });

  const lessons = (data?.pages || []).flatMap((p) => p.lessons);
  const totalCount = data?.pages?.[0]?.totalCount || 0;
  const counts = useFacetCounts(lessons);

  const { data: suggestionsData } = useLessonSuggestions({
    filters,
    enabled: !!filters.query?.trim(),
  });
  const suggestions = suggestionsData?.suggestions || [];

  const handleLoadMore = useCallback(async () => {
    if (!hasNextPage || isFetchingNextPage) return;
    await fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const activeFilterCount = countActiveFilters(filters);
  const hasQuery = !!filters.query?.trim();
  const view = viewState.view;
  const density = viewState.density;
  const selectedId = selectedLesson?.lessonId ?? null;
  const isSplit = view === 'split';
  const isGrid = view === 'grid';

  return (
    <div className="int-shell-root" data-view={view} data-density={density}>
      <SkipLink />
      <ScreenReaderAnnouncer totalCount={totalCount} />

      <div className="int-shell">
        <IntSidebar counts={counts} />

        <main id="main-content" className="int-main" tabIndex={-1}>
          <IntToolbar
            count={totalCount}
            query={filters.query}
            activeFilterCount={activeFilterCount}
            sortBy={viewState.sortBy}
            view={view}
            density={density}
            onSortChange={(sort) => setViewState({ sortBy: sort as ViewState['sortBy'] })}
            onViewChange={(v) => setViewState({ view: v })}
            onDensityChange={(d) => setViewState({ density: d })}
            onOpenMobileFilters={() => setMobileFilterOpen(true)}
          />

          <IntActivePills />

          {isError && error && (
            <div
              role="alert"
              className="int-empty"
              style={{
                borderStyle: 'solid',
                borderColor: 'var(--color-esy-red)',
                color: 'var(--color-esy-red)',
              }}
            >
              <h3>Error loading lessons</h3>
              <p>{error.message}</p>
            </div>
          )}

          {!isError && lessons.length === 0 ? (
            <IntEmptyState
              title={hasQuery || activeFilterCount > 0 ? 'No matches' : 'No results'}
              hint={
                hasQuery || activeFilterCount > 0
                  ? 'Try removing a filter or broadening your search.'
                  : 'Loading lessons…'
              }
            />
          ) : isGrid ? (
            <IntCardGrid lessons={lessons} selectedId={selectedId} onSelect={setSelectedLesson} />
          ) : (
            <div className="int-list">
              {lessons.map((lesson) => (
                <IntListRow
                  key={lesson.lessonId}
                  lesson={lesson}
                  selected={lesson.lessonId === selectedId}
                  onClick={(l) => setSelectedLesson(l)}
                />
              ))}
            </div>
          )}

          {totalCount === 0 && hasQuery && suggestions.length > 0 && (
            <div
              className="int-empty"
              style={{ marginTop: 12, borderStyle: 'solid', textAlign: 'left' }}
            >
              <div className="flex items-start gap-2">
                <Lightbulb
                  className="mt-0.5 flex-shrink-0"
                  style={{ color: 'var(--color-esy-green)', width: 18, height: 18 }}
                />
                <div>
                  <p className="font-medium mb-2">No results found. Try these suggestions:</p>
                  <div className="int-pills">
                    {suggestions.map((s, index) => (
                      <button
                        key={`sugg-${index}-${s}`}
                        type="button"
                        onClick={() => setFilters({ query: s })}
                        className="int-pill"
                        style={{ cursor: 'pointer' }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

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

        {isSplit && (
          <IntSplitDetail lesson={selectedLesson} onClose={() => setSelectedLesson(null)} />
        )}
      </div>

      {/* Drawer only outside split view — split uses the sticky right rail */}
      {!isSplit && (
        <IntLessonDrawer lesson={selectedLesson} onClose={() => setSelectedLesson(null)} />
      )}

      <IntMobileFilterDrawer
        isOpen={isMobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        counts={counts}
      />
    </div>
  );
};
