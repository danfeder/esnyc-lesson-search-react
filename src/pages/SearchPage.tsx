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
  IntListSkeleton,
  IntMobileFilterDrawer,
  IntSidebar,
  IntSplitDetail,
  IntToolbar,
} from '@/components/Internal';
import { useSearchStore } from '@/stores/searchStore';
import { useLessonSearch } from '@/hooks/useLessonSearch';
import { useLessonSuggestions } from '@/hooks/useLessonSuggestions';
import { useMediaQuery } from '@/hooks/useMediaQuery';
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

  const {
    data,
    isError,
    error,
    isPending,
    isPlaceholderData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useLessonSearch({
    filters,
    pageSize: viewState.resultsPerPage,
    sortBy: viewState.sortBy,
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
    // C59: never fetch the next page while showing placeholder data — the
    // current list belongs to the prior query, so paginating it is wrong.
    if (!hasNextPage || isFetchingNextPage || isPlaceholderData) return;
    await fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isPlaceholderData]);

  const activeFilterCount = countActiveFilters(filters);
  const hasQuery = !!filters.query?.trim();
  const view = viewState.view;
  const density = viewState.density;
  const selectedId = selectedLesson?.lessonId ?? null;
  // §3.4: split view is a desktop-only affordance — the detail rail is
  // CSS-hidden below 1100px. Coerce the EFFECTIVE view to non-split when narrow
  // (non-destructive: the stored `view` preference is left untouched, so a
  // return to a wide screen restores split) and route the drawer path instead.
  const isWide = useMediaQuery('(min-width: 1100px)');
  const isSplit = view === 'split' && isWide;
  const isGrid = view === 'grid';
  // The layout attribute mirrors the EFFECTIVE view so the grid never reserves a
  // 3rd column for a split rail that isn't rendered below 1100px.
  const effectiveView = view === 'split' && !isWide ? 'list' : view;

  return (
    <div className="int-shell-root" data-view={effectiveView} data-density={density}>
      <SkipLink />
      {/* C59: totalCount lags one fetch under keepPreviousData (and is `|| 0`
          on cold load) — suppress the live-region announcement until settled so
          screen readers hear the real count once, not a stale/zero one. */}
      <ScreenReaderAnnouncer totalCount={totalCount} suppressed={isPending || isPlaceholderData} />

      <div className="int-shell">
        <IntSidebar counts={counts} />

        <div id="main-content" className="int-main" tabIndex={-1}>
          <h1 className="sr-only">ESYNYC Lesson Library</h1>
          <IntToolbar
            count={totalCount}
            query={filters.query}
            activeFilterCount={activeFilterCount}
            sortBy={viewState.sortBy}
            // §3.4: pass the EFFECTIVE view (split→list below 1100px) so the
            // view switcher highlights List and the list-only density switcher
            // still renders; raw `view='split'` would strand both. Stored
            // preference is untouched (allowSplit also hides the dead Split
            // option), so a return to a wide screen restores split.
            view={effectiveView}
            density={density}
            allowSplit={isWide}
            // C58: keep `currentPage` in sync with the filter-change reset
            // convention (src/stores/CLAUDE.md) — setViewState doesn't reset it on
            // its own (unlike setFilters). The user-visible result reset is driven
            // by `sortBy` being in the React Query key (useLessonSearch), which
            // restarts the infinite query at page 0; this write keeps store state
            // consistent for any future paginated consumer.
            onSortChange={(sort) =>
              setViewState({ sortBy: sort as ViewState['sortBy'], currentPage: 1 })
            }
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

          {!isError && isPending ? (
            // C59: cold load (no cached/placeholder data) — show the skeleton,
            // never a false "No matches". With keepPreviousData a refetch keeps
            // the prior rows instead of reaching this branch.
            <IntListSkeleton />
          ) : !isError && lessons.length === 0 ? (
            <IntEmptyState
              title={hasQuery || activeFilterCount > 0 ? 'No matches' : 'No results'}
              // Neutral hint when nothing is queried/filtered — the "Try removing
              // a filter" copy is nonsensical with no active filters (C59).
              hint={
                hasQuery || activeFilterCount > 0
                  ? 'Try removing a filter or broadening your search.'
                  : 'No lessons to show.'
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

          {/* C59: only after the data settles — totalCount lags one fetch under
              keepPreviousData, so gating on a stale 0 here would flash/mis-fire
              the suggestions panel mid-transition. */}
          {!isPending &&
            !isPlaceholderData &&
            totalCount === 0 &&
            hasQuery &&
            suggestions.length > 0 && (
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

          {lessons.length > 0 && !isPlaceholderData && (
            // C59: hide the whole trigger during a filter-changed refetch
            // (placeholder rows are the PREVIOUS query's). This both stops the
            // sentinel firing fetchNextPage against stale data AND avoids the
            // trigger's "No more results to load" terminal copy flashing over
            // those stale rows when hasMore would be forced false. It reappears
            // with the correct hasMore once the fresh page resolves.
            <InfiniteScrollTrigger
              onLoadMore={handleLoadMore}
              isLoading={isFetchingNextPage}
              hasMore={!!hasNextPage}
              currentCount={lessons.length}
              totalCount={totalCount}
            />
          )}
        </div>

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
