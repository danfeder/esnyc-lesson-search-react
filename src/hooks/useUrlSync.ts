import { useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSearchStore } from '@/stores/searchStore';
import {
  filtersToUrlParams,
  parseUrlToFilters,
  hasFilters,
  validateFilterValues,
} from '@/utils/urlParams';

/**
 * Syncs search filters between Zustand store and URL params.
 *
 * - On mount: parses URL and updates store (enables shared links)
 * - On filter change: updates URL with debounce (avoids history spam)
 *
 * Uses replace mode to update URL without adding history entries.
 *
 * Note: We intentionally do NOT persist viewState (sortBy, resultsPerPage, currentPage)
 * to URL because:
 * - Sort preference is personal, not worth sharing
 * - Page number is transient (infinite scroll resets it anyway)
 * - This keeps URLs cleaner and focused on the search criteria
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
      }, 300);
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

  // Initialize from URL on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const filtersFromUrl = parseUrlToFilters(searchParams);
    const validatedFilters = validateFilterValues(filtersFromUrl);

    if (hasFilters(validatedFilters)) {
      lastSyncSourceRef.current = 'url';
      setFilters(validatedFilters);
    }
    // Only run on mount - searchParams in deps would cause issues
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
