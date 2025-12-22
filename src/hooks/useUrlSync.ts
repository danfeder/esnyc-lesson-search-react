import { useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSearchStore } from '@/stores/searchStore';
import {
  filtersToUrlParams,
  parseUrlToFilters,
  hasFilters,
  validateFilterValues,
} from '@/utils/urlParams';

/** Debounce delay for URL updates (ms). Prevents URL thrashing during rapid filter changes. */
const URL_SYNC_DEBOUNCE_MS = 300;

/**
 * Syncs search filters between Zustand store and URL params.
 *
 * Behavior:
 * - On mount: parses URL and updates store (enables shared links)
 * - On filter change: updates URL with 300ms debounce (avoids history spam)
 *
 * Design decisions:
 * - Uses `replace: true` mode so filter changes don't create history entries.
 *   This keeps browser history clean - users can navigate back to the previous
 *   page rather than stepping through every filter change. If you want each
 *   filter change to be a history entry, change to `replace: false`.
 *
 * - We intentionally do NOT persist viewState (sortBy, resultsPerPage, currentPage)
 *   to URL because:
 *   - Sort preference is personal, not worth sharing
 *   - Page number is transient (infinite scroll resets it anyway)
 *   - This keeps URLs cleaner and focused on the search criteria
 *
 * - URL initialization only happens once on mount. If the URL changes after
 *   mount (e.g., programmatic navigation), the hook won't re-initialize. This
 *   is intentional to avoid conflicts with the debounced URL updates.
 */
export function useUrlSync(): void {
  const [searchParams, setSearchParams] = useSearchParams();
  const { filters, setFilters } = useSearchStore();

  // Track if we've initialized from URL to avoid overwriting on mount
  const initializedRef = useRef(false);
  // Track the source of the last filter change to prevent sync loops
  const lastSyncSourceRef = useRef<'url' | 'store' | null>(null);
  // Store timeout ID for cleanup
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced URL update with cleanup support
  const updateUrl = useCallback(
    (params: URLSearchParams) => {
      // Clear any pending update
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        setSearchParams(params, { replace: true });
        debounceTimeoutRef.current = null;
      }, URL_SYNC_DEBOUNCE_MS);
    },
    [setSearchParams]
  );

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Initialize from URL on mount (one-time only)
  // Empty deps is intentional: we only want to read URL once on mount, not on subsequent
  // URL changes (which would conflict with our debounced URL updates from filter changes).
  // setFilters is stable per Zustand guarantees. searchParams is read synchronously.
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const filtersFromUrl = parseUrlToFilters(searchParams);
    const validatedFilters = validateFilterValues(filtersFromUrl);

    if (hasFilters(validatedFilters)) {
      // Clear any pending URL updates to prevent race condition where:
      // 1. User changes filters (debounce timer starts)
      // 2. URL changes externally (e.g., browser back)
      // 3. Debounce timer fires, overwrites URL with stale state
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
        debounceTimeoutRef.current = null;
      }
      lastSyncSourceRef.current = 'url';
      setFilters(validatedFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Intentional: one-time init from URL on mount only
  }, []);

  // Handle browser back/forward navigation (popstate)
  // This effect runs when searchParams change externally (not from our debounced updates)
  useEffect(() => {
    // Skip before initialization
    if (!initializedRef.current) return;

    // Skip if we just updated the URL ourselves
    if (lastSyncSourceRef.current === 'store') {
      return;
    }

    // URL changed externally (browser back/forward) - sync to store
    const filtersFromUrl = parseUrlToFilters(searchParams);
    const validatedFilters = validateFilterValues(filtersFromUrl);

    // Clear any pending debounced URL updates to prevent overwriting
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
      debounceTimeoutRef.current = null;
    }

    lastSyncSourceRef.current = 'url';
    setFilters(validatedFilters);
  }, [searchParams, setFilters]);

  // Sync filters to URL when they change
  useEffect(() => {
    // Skip on initial render before URL init
    if (!initializedRef.current) return;

    // Skip if this change originated from URL sync (prevent loop)
    if (lastSyncSourceRef.current === 'url') {
      lastSyncSourceRef.current = 'store';
      return;
    }

    lastSyncSourceRef.current = 'store';
    const params = filtersToUrlParams(filters);
    updateUrl(params);
  }, [filters, updateUrl]);
}
