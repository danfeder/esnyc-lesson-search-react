import React, { useCallback, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Lightbulb } from 'lucide-react';
import { ScreenReaderAnnouncer } from '@/components/Common/ScreenReaderAnnouncer';
import { SkipLink } from '@/components/Common/SkipLink';
import { InfiniteScrollTrigger } from '@/components/Common/InfiniteScrollTrigger';
import {
  IntActivePills,
  IntCardGrid,
  IntEmptyState,
  IntFetchError,
  IntLessonDrawer,
  IntListRow,
  IntListSkeleton,
  IntMobileFilterDrawer,
  IntSidebar,
  IntSplitDetail,
  IntToolbar,
  type LessonPaneStatus,
} from '@/components/Internal';
import { useSearchStore } from '@/stores/searchStore';
import { useUrlSync } from '@/hooks/useUrlSync';
import { useLessonSearch } from '@/hooks/useLessonSearch';
import { useLessonById } from '@/hooks/useLessonById';
import { useLessonSuggestions } from '@/hooks/useLessonSuggestions';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { useFacetCounts } from '@/hooks/useFacetCounts';
import { buildSearchParams } from '@/utils/urlParams';
import { parseSearchQuery } from '@/utils/parseSearchQuery';
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

/**
 * FP-19: derive the human-facing "extra" terms the engine folded in via
 * synonyms, from smart-search's `expandedQuery` tsquery (e.g.
 * `corn:* | maize:*` → `['maize']`). smart-search's expansion also injects
 * morphological variants of each typed word (the word, word−lastchar, word+'s'
 * — see expandSearchTerms in the edge function); we reconstruct that exact set
 * and subtract it so the hint names ONLY genuine synonyms, never stemming noise
 * (`tomato` never surfaces `tomat`/`tomatos`). The hint is built from the SAME
 * cleaned query the results RPC searches: `useLessonSuggestions` expands
 * `parseSearchQuery(query).cleanedQuery` — filler + routed grade cues stripped,
 * identical to what `useLessonSearch` passes to `search_lessons` — so every term
 * shown here was genuinely searched against the results. This closes a real leak:
 * feeding the RAW query let smart-search's bidirectional reverse index fold in
 * synonyms of stripped FILLER words. The live `activity → [activities, lesson,
 * lessons, project, projects]` row means a raw "compost lesson" would announce
 * "activity/activities/project/projects" that the cleaned "compost" search never
 * matched. Pass this the cleaned query (the same one `useLessonSuggestions` sent)
 * so the morphological subtraction lines up with the expanded terms.
 */
export function extractSynonymTerms(query: string, expandedQuery: string | undefined): string[] {
  if (!expandedQuery) return [];
  const rawWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0);
  const morphological = new Set<string>();
  for (const w of rawWords) {
    morphological.add(w);
    if (w.length > 4) {
      morphological.add(w.slice(0, -1));
      morphological.add(`${w}s`);
    }
  }
  const seen = new Set<string>();
  const extras: string[] = [];
  for (const part of expandedQuery.split('|')) {
    const term = part.trim().replace(/:\*$/, '').trim();
    if (!term || morphological.has(term) || seen.has(term)) continue;
    seen.add(term);
    extras.push(term);
  }
  return extras;
}

export const SearchPage: React.FC = () => {
  const filters = useSearchStore((s) => s.filters);
  const viewState = useSearchStore((s) => s.viewState);
  const setViewState = useSearchStore((s) => s.setViewState);
  const setFilters = useSearchStore((s) => s.setFilters);

  // W1c: two-way URL <-> store sync (query + filters + sort), making the public
  // search shareable/bookmarkable/refresh-surviving. `hydrated` is false until
  // the first URL->store pass runs; gating the query below on it means a shared
  // link applies its filters BEFORE the first RPC fires (no default empty-filter
  // call, no false "No matches" flash). An empty URL still flips hydrated=true
  // (with default filters) on mount, so the gate opens after exactly one pass.
  const { hydrated, flush } = useUrlSync();
  const queryClient = useQueryClient();

  // D2: the open lesson is ROUTE state — `/lesson/:lessonId` renders this same
  // SearchPage element as `/` and `/search`, so `params.lessonId` presence IS
  // the open/closed state (no component-state copy) and open/close navigation
  // never remounts the list. Known-harmless seam: each pathname change re-fires
  // useUrlSync's URL→store effect with structurally identical filters — React
  // Query hashes keys structurally so NO search refetch results. Pinned by the
  // "does not refire the search RPC" test in search-page.permalink.test.tsx.
  const params = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const routeLessonId = params.lessonId ?? null;

  const [isMobileFilterOpen, setMobileFilterOpen] = useState(false);

  const {
    data,
    isError,
    isPending,
    isPlaceholderData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch: refetchSearch,
  } = useLessonSearch({
    filters,
    sortBy: viewState.sortBy,
    // Gate the first query on hydration (see useUrlSync above). While disabled
    // the query is `status:'pending'` so the C59 skeleton — not IntEmptyState —
    // shows during the brief disabled+hydrating window.
    enabled: hydrated,
  });

  const lessons = (data?.pages || []).flatMap((p) => p.lessons);
  const totalCount = data?.pages?.[0]?.totalCount || 0;
  // FP-19: how many pages have actually been loaded — 1 means the whole result
  // set fit without paginating, so the "No more results to load" footer is noise.
  const pageCount = data?.pages?.length ?? 0;
  // FP-01b: badges no longer tally the loaded result pages — they come from a
  // once-per-session corpus fetch, restricted by the OTHER active filter
  // categories (undefined until that fetch resolves → blank badges).
  const counts = useFacetCounts(filters);

  // D2 §2c: resolve the routed lesson. Fast path from the loaded pages (no
  // fetch, no flash — covers every click-to-open); fallback fetch-by-id for a
  // deep link whose lesson is outside the loaded pages. The extra `!isPending`
  // gate waits for the FIRST search page before deciding, so an in-page deep
  // link never fires a redundant by-id request racing the search.
  const lessonFromResults = routeLessonId
    ? (lessons.find((l) => l.lessonId === routeLessonId) ?? null)
    : null;
  const lessonById = useLessonById(routeLessonId, {
    enabled: !!routeLessonId && !lessonFromResults && !isPending,
  });
  const openedLesson = lessonFromResults ?? lessonById.data ?? null;
  // Derived pane status — pure derivation, no state variable.
  const paneStatus: LessonPaneStatus | 'closed' = !routeLessonId
    ? 'closed'
    : openedLesson
      ? 'ready'
      : lessonById.isError
        ? 'error'
        : lessonById.isSuccess
          ? 'not-found' // by-id succeeded with null: unknown, retired, or malformed id
          : 'loading';

  const { data: suggestionsData } = useLessonSuggestions({
    filters,
    enabled: !!filters.query?.trim(),
  });
  const suggestions = suggestionsData?.suggestions || [];
  // FP-19: synonym-expansion terms to name in the "Including matches for…" hint.
  // FP-19: build the hint from the cleaned query the results RPC actually
  // searched (matching what useLessonSuggestions expanded), not the raw box text —
  // otherwise synonyms of stripped filler words leak in via smart-search's
  // bidirectional reverse index and the hint names terms the results never matched.
  const synonymTerms = extractSynonymTerms(
    parseSearchQuery(filters.query ?? '').cleanedQuery,
    suggestionsData?.expandedQuery
  );

  const handleLoadMore = useCallback(async () => {
    // C59: never fetch the next page while showing placeholder data — the
    // current list belongs to the prior query, so paginating it is wrong.
    if (!hasNextPage || isFetchingNextPage || isPlaceholderData) return;
    await fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage, isPlaceholderData]);

  // D2 §2b history semantics. Open = push (Back closes the drawer); opening
  // ANOTHER lesson while one is already open (split-view click-through) =
  // replace, so A→B→C stays ONE history entry and Back returns to the list.
  // `fromSearch` marks entries WE pushed: close pops exactly that entry
  // (no history garbage); a direct deep-link landing has no such mark, so
  // close replaces to the list keeping any URL filters — Back then honestly
  // leaves the site (where the visitor came from).
  const cameFromSearch = Boolean((location.state as { fromSearch?: boolean } | null)?.fromSearch);

  const handleOpenLesson = useCallback(
    (lesson: Lesson) => {
      // F3: seed the by-id cache so the pane keeps rendering this lesson even if
      // a later filter/query change drops it from the result set — no spurious
      // "Loading lesson" spinner over content that's already on screen, and no
      // redundant by-id fetch (rung8-permalink-history F3).
      queryClient.setQueryData(['lesson', lesson.lessonId], lesson);
      // F2: flush any pending debounced filter write onto the CURRENT (list)
      // entry BEFORE pushing, so a sub-300ms toggle lands there rather than
      // being stranded on the pushed entry — otherwise Back reverts the toggle.
      flush();
      const isReplace = routeLessonId !== null;
      navigate(
        {
          pathname: `/lesson/${encodeURIComponent(lesson.lessonId)}`,
          // Build from LIVE filters, not location.search: inside the debounce
          // race the URL is still pre-toggle, and the flush above just wrote the
          // live filters to the list entry — the pushed entry must match.
          search: buildSearchParams(filters, viewState.sortBy).toString(),
        },
        // A replace must PROPAGATE the current entry's mark, not mint one:
        // stamping fromSearch on a deep-link LANDING entry would point close
        // at navigate(-1), which no-ops in a fresh tab (history length 1).
        { replace: isReplace, state: { fromSearch: isReplace ? cameFromSearch : true } }
      );
    },
    [navigate, queryClient, flush, filters, viewState.sortBy, routeLessonId, cameFromSearch]
  );
  const handleCloseLesson = useCallback(() => {
    if (cameFromSearch) {
      navigate(-1);
    } else {
      navigate({ pathname: '/', search: location.search }, { replace: true });
    }
  }, [navigate, cameFromSearch, location.search]);

  const { refetch: refetchLessonById } = lessonById;
  const handleRetryLesson = useCallback(() => {
    void refetchLessonById();
  }, [refetchLessonById]);

  const activeFilterCount = countActiveFilters(filters);
  const hasQuery = !!filters.query?.trim();
  const view = viewState.view;
  const density = viewState.density;
  const selectedId = routeLessonId;
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

          {/* FP-19: quiet, dismiss-free transparency line when the engine folded
              in synonyms (e.g. searching "corn" also matched "maize"). Only once
              results have settled and there are some — the no-results case is
              handled by the suggestions panel below. `!isError` so it never sits
              above the error card: a failed background refetch keeps the last-good
              `totalCount`/`data` (TanStack v5), which would otherwise imply a
              search just succeeded right under a "couldn't load" message. */}
          {synonymTerms.length > 0 &&
            totalCount > 0 &&
            !isPending &&
            !isPlaceholderData &&
            !isError && (
              // aria-live so screen-reader users hear the transparency note too,
              // not just sighted users (this PR is about search transparency).
              <p
                className="text-sm text-gray-600"
                style={{ margin: '4px 0 8px' }}
                role="status"
                aria-live="polite"
              >
                Including matches for {synonymTerms.join(', ')}.
              </p>
            )}

          {isError && lessons.length === 0 && (
            // FP-13: honest, plain-language failure card + a working Retry —
            // never raw technical error text. Reuses the shared IntFetchError
            // (IntAlert + IntButton, role="alert" aria-live="assertive") so this
            // matches the FP-05/FP-07 error surfaces elsewhere. Retry re-runs the
            // search query.
            // `lessons.length === 0` scopes this to a COLD failure (nothing loaded
            // yet). A `fetchNextPage()` failure flips `isError` for the whole query
            // too (useInfiniteQuery shares one status) but keeps the loaded pages —
            // there we preserve the rows and show a scoped "couldn't load more"
            // retry below, rather than replacing a full result set with this card.
            <IntFetchError onRetry={() => refetchSearch()}>
              We couldn&apos;t load lessons just now. Please check your connection and try again.
            </IntFetchError>
          )}

          {/* Keep the rows whenever we actually have data, even mid-error: a
              failed `fetchNextPage()` flips `isError` for the whole query, but the
              already-loaded pages are still valid — wiping them would be worse than
              the failure. Only a COLD error (no data) hides everything, and that's
              the error card above (excluded here because `lessons.length > 0` is
              false, so the `|| lessons.length > 0` guard falls back to `!isError`,
              which is also false). A same-key refetch that fails while retaining
              last-good data likewise keeps its rows visible rather than blanking. */}
          {(!isError || lessons.length > 0) &&
            (isPending ? (
              // C59: cold load (no cached/placeholder data) — show the skeleton,
              // never a false "No matches". With keepPreviousData a refetch keeps
              // the prior rows instead of reaching this branch.
              <IntListSkeleton />
            ) : lessons.length === 0 ? (
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
              <IntCardGrid lessons={lessons} selectedId={selectedId} onSelect={handleOpenLesson} />
            ) : (
              <div className="int-list">
                {lessons.map((lesson) => (
                  <IntListRow
                    key={lesson.lessonId}
                    lesson={lesson}
                    selected={lesson.lessonId === selectedId}
                    onClick={handleOpenLesson}
                  />
                ))}
              </div>
            ))}

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

          {!isError &&
            lessons.length > 0 &&
            !isPlaceholderData &&
            (hasNextPage || pageCount > 1) && (
              // C59: hide the whole trigger during a filter-changed refetch
              // (placeholder rows are the PREVIOUS query's). This both stops the
              // sentinel firing fetchNextPage against stale data AND avoids the
              // trigger's "No more results to load" terminal copy flashing over
              // those stale rows when hasMore would be forced false. It reappears
              // with the correct hasMore once the fresh page resolves.
              // FP-19: also require an actual paginated result set — when the whole
              // set fit on page 1 (pageCount===1, no next page) the terminal "No
              // more results to load" footer is pure noise, so skip the trigger
              // entirely. It still shows as a reassuring end-marker after the user
              // has genuinely loaded ≥2 pages.
              <InfiniteScrollTrigger
                onLoadMore={handleLoadMore}
                isLoading={isFetchingNextPage}
                hasMore={!!hasNextPage}
                currentCount={lessons.length}
                totalCount={totalCount}
              />
            )}

          {/* FP-13 (load-more): a `fetchNextPage()` failure keeps the loaded rows
              (see the results guard above) and hides the auto-firing scroll trigger
              (gated on `!isError`), which would otherwise retry-loop against a dead
              server. Surface an honest, manual retry in its place instead of a
              silent dead-end. onRetry re-attempts the NEXT page via handleLoadMore —
              not refetchSearch, which for an infinite query only re-pulls the pages
              that already succeeded and leaves the failed one still missing. */}
          {isError && lessons.length > 0 && (
            <IntFetchError onRetry={() => handleLoadMore()}>
              We couldn&apos;t load more lessons just now. Please try again.
            </IntFetchError>
          )}
        </div>

        {isSplit && (
          <IntSplitDetail
            status={paneStatus}
            lesson={openedLesson}
            onClose={handleCloseLesson}
            onRetry={handleRetryLesson}
          />
        )}
      </div>

      {/* Drawer only outside split view — split uses the sticky right rail */}
      {!isSplit && (
        <IntLessonDrawer
          open={paneStatus !== 'closed'}
          status={paneStatus === 'closed' ? 'ready' : paneStatus}
          lesson={openedLesson}
          onClose={handleCloseLesson}
          onRetry={handleRetryLesson}
        />
      )}

      <IntMobileFilterDrawer
        isOpen={isMobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        counts={counts}
      />
    </div>
  );
};
