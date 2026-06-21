import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useSearchStore, initialFilters } from '@/stores/searchStore';
import { buildSearchParams, parseSearchParams, canonicalSearchString } from '@/utils/urlParams';

/** Debounce delay for store→URL writes (ms). Prevents URL thrashing on rapid toggles. */
const URL_SYNC_DEBOUNCE_MS = 300;

interface UseUrlSyncResult {
  /**
   * False until the first URL→store hydration pass runs. SearchPage gates the
   * first query on this (Task 4.3) so a shared link doesn't fire a default
   * empty-filter RPC before the URL is applied.
   */
  hydrated: boolean;
}

/**
 * Two-way sync between the public search URL and the Zustand store, written
 * fresh for W1c (design §4 Q6–Q8). It serializes query + filters + sortBy.
 *
 * Correctness model (fixes the WIP's two latent bugs):
 *
 *  - **One-use written-token loop guard.** `lastWrittenRef` holds the canonical
 *    string of the URL we ourselves last wrote. On the NEXT external URL change
 *    we compare the incoming URL's canonical against it: if they match it's our
 *    own echo → we consume the token (reset it to null) and skip hydration.
 *    Because the token is one-use, a *later* identical external navigation
 *    (e.g. browser Back to a URL that happens to equal an earlier write) still
 *    hydrates — the WIP's `lastSyncSourceRef === 'store'` flag stayed sticky and
 *    silently swallowed the first Back. We never early-return on a source flag.
 *
 *  - **Single canonical serializer on both equality sides.** Every guard
 *    compares `canonicalSearchString(...)` of the full filter object — on the
 *    URL side we merge the incoming validated partial onto `initialFilters` to
 *    get a COMPLETE SearchFilters; on the store side we use the live `filters`.
 *    No raw-string comparisons.
 *
 *  - **`replace` history mode** so filter/sort toggles update the URL in place
 *    (Back leaves the search, doesn't undo one filter).
 *
 * StrictMode-safe: the canonical-equality guards make a double effect-invoke
 * idempotent (no duplicate write, no double-hydrate). The debounce timer is
 * cleaned up on unmount.
 */
export function useUrlSync(): UseUrlSyncResult {
  const [searchParams, setSearchParams] = useSearchParams();
  const filters = useSearchStore((s) => s.filters);
  const sortBy = useSearchStore((s) => s.viewState.sortBy);
  const hydrateUrlState = useSearchStore((s) => s.hydrateUrlState);

  const [hydrated, setHydrated] = useState(false);

  // Canonical of the URL WE last wrote — a ONE-USE token (cleared once it has
  // matched an incoming echo so a later identical external nav still hydrates).
  const lastWrittenRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Canonical of an incoming URLSearchParams (merge the validated partial onto defaults). */
  function incomingCanonical(params: URLSearchParams): {
    canonical: string;
    parsed: ReturnType<typeof parseSearchParams>;
  } {
    const parsed = parseSearchParams(params);
    const canonical = canonicalSearchString(
      { ...initialFilters, ...parsed.filters },
      parsed.sortBy
    );
    return { canonical, parsed };
  }

  // URL → store. Deps: [searchParams] — covers BOTH mount and browser
  // back/forward (any external URL change).
  useEffect(() => {
    const { canonical, parsed } = incomingCanonical(searchParams);

    // An external URL change supersedes a pending store→URL write.
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }

    if (lastWrittenRef.current !== null && canonical === lastWrittenRef.current) {
      // Our own echo (the URL we just wrote). Consume the one-use token so a
      // later identical EXTERNAL nav is not mistaken for an echo.
      lastWrittenRef.current = null;
    } else {
      hydrateUrlState(parsed.filters, parsed.sortBy);
    }

    // Always: the first URL→store pass has run.
    setHydrated(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- store actions are stable; we intentionally key on searchParams only
  }, [searchParams]);

  // store → URL. Gated on `hydrated` so we never write before the URL has been
  // applied to the store.
  useEffect(() => {
    if (!hydrated) return;

    const next = canonicalSearchString(filters, sortBy);
    const current = incomingCanonical(searchParams).canonical;

    // No-op: the URL already represents this state (e.g. immediately after
    // hydration). Skipping kills the echo loop.
    if (next === current) {
      // The store already matches the URL — cancel any pending (now-stale) write
      // so a toggle-and-revert within the debounce window doesn't write a value
      // the user has already undone. Clearing is always safe here: if no timer is
      // armed it's a no-op; if one is, it's for a now-superseded state.
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      return;
    }

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      setSearchParams(buildSearchParams(filters, sortBy), { replace: true });
      lastWrittenRef.current = next;
      debounceTimerRef.current = null;
    }, URL_SYNC_DEBOUNCE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setSearchParams is stable; searchParams read inside is intentionally not a dep (the URL→store effect owns external changes)
  }, [filters, sortBy, hydrated]);

  // Clean up a pending debounce on unmount.
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);

  return { hydrated };
}
