import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
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
  /**
   * Synchronously write any pending (debounced) store→URL change to the CURRENT
   * history entry, preserving `location.state`. SearchPage calls this — while
   * still mounted — before pushing a `/lesson/:id` entry so a sub-300ms filter
   * toggle lands on the list entry rather than being stranded on the pushed one
   * (rung8-permalink-history F2). This ALSO covers rung8-stores F3 (toggle →
   * open lesson → Back must keep the toggle), since post-D2 opening a lesson no
   * longer unmounts SearchPage — it's a same-element push through this path.
   * (On a split-view click-through — replacing one open lesson with another — the
   * pending write lands on the OUTGOING lesson entry, which the following
   * `navigate(replace)` immediately overwrites; harmless, a no-op in effect there.)
   * A no-op when no write is pending. NOTE: intentionally NOT called on unmount
   * — flushing there would re-navigate through a stale router closure and
   * clobber a concurrent cross-route push (verified in
   * useUrlSync.unmount-nav.test.tsx), so unmount still cancels the timer.
   */
  flush: () => void;
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
  const location = useLocation();
  const filters = useSearchStore((s) => s.filters);
  const sortBy = useSearchStore((s) => s.viewState.sortBy);
  const hydrateUrlState = useSearchStore((s) => s.hydrateUrlState);

  const [hydrated, setHydrated] = useState(false);

  // Canonical of the URL WE last wrote — a ONE-USE token (cleared once it has
  // matched an incoming echo so a later identical external nav still hydrates).
  const lastWrittenRef = useRef<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Freshest store + history state, updated every render, for writes that fire
  // OUTSIDE the render that scheduled them (the debounce timer and the unmount
  // flush). Two things this guards: a deferred write never serializes a stale
  // filter set, and — crucially for D2 permalinks — it carries `location.state`
  // so the write doesn't wipe the `fromSearch` mark a bare setSearchParams would
  // drop (rung8-permalink-history F1). `state` can change without re-running the
  // store→URL effect (e.g. a lesson opening keeps the same search string), so
  // it MUST be read from here at fire time, not captured in the effect closure.
  const latestRef = useRef({ filters, sortBy, state: location.state });
  latestRef.current = { filters, sortBy, state: location.state };

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

  // Write any pending store→URL change to the CURRENT entry NOW, preserving
  // history state. Used (a) by SearchPage before pushing /lesson/:id so the
  // write lands on the list entry, not the pushed one (F2), and (b) on unmount
  // so a sub-300ms toggle isn't dropped when navigating away then pressing Back
  // (rung8-stores F3 — flush, don't cancel). No-op when nothing is pending.
  const flushPendingWrite = useCallback(() => {
    if (!debounceTimerRef.current) return;
    clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = null;
    const { filters: f, sortBy: s, state } = latestRef.current;
    lastWrittenRef.current = canonicalSearchString(f, s);
    setSearchParams(buildSearchParams(f, s), { replace: true, state });
  }, [setSearchParams]);

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
      // Read state fresh at FIRE time (F1): it can change without re-running
      // this effect (e.g. a lesson opening keeps the same search string), so a
      // closure-captured `location.state` would be stale and wipe `fromSearch`.
      setSearchParams(buildSearchParams(filters, sortBy), {
        replace: true,
        state: latestRef.current.state,
      });
      lastWrittenRef.current = next;
      debounceTimerRef.current = null;
    }, URL_SYNC_DEBOUNCE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- setSearchParams is stable; searchParams read inside is intentionally not a dep (the URL→store effect owns external changes)
  }, [filters, sortBy, hydrated]);

  // Clean up a pending debounce on unmount. Deliberately CANCEL (not flush):
  // flushing here would re-navigate through React Router's stale non-data-router
  // `navigate` closure (captured with SearchPage's own pathname, with no
  // activeRef reset on unmount), which `replace`s the CURRENT top entry — so a
  // cross-route push (e.g. clicking a header link to /submit within the 300ms
  // window) gets clobbered straight back to the search URL. The live
  // rung8-stores F3 flow (toggle → open lesson → Back) is instead handled by
  // `flush()` on the still-mounted same-element push (see handleOpenLesson).
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
    };
  }, []);

  return { hydrated, flush: flushPendingWrite };
}
