import { useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSearchStore } from '@/stores/searchStore';
import { filtersToUrlParams, parseUrlToFilters, hasFilters } from '@/utils/urlParams';
import { debounce } from '@/utils/debounce';

/**
 * Syncs search filters between Zustand store and URL params.
 *
 * - On mount: parses URL and updates store (enables shared links)
 * - On filter change: updates URL with debounce (avoids history spam)
 *
 * Uses replace mode to update URL without adding history entries.
 */
export function useUrlSync(): void {
  const [searchParams, setSearchParams] = useSearchParams();
  const { filters, setFilters } = useSearchStore();

  // Track if we've initialized from URL to avoid overwriting on mount
  const initializedRef = useRef(false);
  // Track if we're currently syncing from URL to avoid loops
  const syncingFromUrlRef = useRef(false);

  // Debounced URL update function
  const debouncedSetParams = useMemo(
    () =>
      debounce((params: URLSearchParams) => {
        setSearchParams(params, { replace: true });
      }, 300),
    [setSearchParams]
  );

  // Initialize from URL on mount
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    const filtersFromUrl = parseUrlToFilters(searchParams);
    if (hasFilters(filtersFromUrl)) {
      syncingFromUrlRef.current = true;
      setFilters(filtersFromUrl);
      // Reset sync flag after a tick
      setTimeout(() => {
        syncingFromUrlRef.current = false;
      }, 0);
    }
    // Only run on mount - searchParams in deps would cause issues
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync filters to URL when they change
  useEffect(() => {
    // Skip if we're syncing from URL (avoid loop)
    if (syncingFromUrlRef.current) return;
    // Skip on initial render before URL init
    if (!initializedRef.current) return;

    const params = filtersToUrlParams(filters);
    debouncedSetParams(params);
  }, [filters, debouncedSetParams]);
}
