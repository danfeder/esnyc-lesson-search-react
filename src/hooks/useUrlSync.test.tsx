import { StrictMode } from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, Outlet } from 'react-router-dom';
import { useUrlSync } from './useUrlSync';
import { useSearchStore } from '@/stores/searchStore';

type MemoryRouter = ReturnType<typeof createMemoryRouter>;

/**
 * Mount the hook inside a real (history-instrumented) memory router so the tests
 * can assert BOTH store state AND the URL (router.state.location.search) AND
 * that the browser history stack does NOT grow on filter toggles (replace mode).
 *
 * `createMemoryRouter` exposes `router.navigate(...)` (external navigation, i.e.
 * a browser Back/forward equivalent) and `router.state.location`.
 */
function Probe() {
  useUrlSync();
  return null;
}

function makeRouter(initialEntry: string, strict = false): MemoryRouter {
  const element = strict ? (
    <StrictMode>
      <Probe />
    </StrictMode>
  ) : (
    <Probe />
  );
  return createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <>
            {element}
            <Outlet />
          </>
        ),
      },
      // A catch-all so router.navigate to any path resolves.
      { path: '*', element: <Probe /> },
    ],
    { initialEntries: [initialEntry] }
  );
}

function renderWithRouter(initialEntry: string, strict = false) {
  const router = makeRouter(initialEntry, strict);
  const { unmount } = render(<RouterProvider router={router} />);
  return { router, unmount };
}

function resetStore() {
  const store = useSearchStore.getState();
  act(() => {
    store.clearFilters();
    store.setViewState({ view: 'list', density: 'comfy' });
  });
}

describe('useUrlSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetStore();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('hydrates the store from the URL on mount (?q=tomato&grades=3)', () => {
    renderWithRouter('/?q=tomato&grades=3');

    const { filters } = useSearchStore.getState();
    expect(filters.query).toBe('tomato');
    expect(filters.gradeLevels).toContain('3');
  });

  it('writes the URL after the 300ms debounce in replace mode (history does not grow)', () => {
    const { router } = renderWithRouter('/');

    // Pre-debounce: URL is unchanged.
    act(() => {
      useSearchStore.getState().setFilters({ query: 'cooking' });
    });
    expect(router.state.location.search).toBe('');

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(router.state.location.search).toContain('q=cooking');

    // A second filter write — also replace mode.
    act(() => {
      useSearchStore.getState().setFilters({ query: 'cooking salad' });
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(router.state.location.search).toContain('q=cooking+salad');

    // Replace-mode proof: Back must NOT step through the intermediate
    // '?q=cooking' filter state. Each store→URL write replaced rather than
    // pushed, so the intermediate filter URL is not in the history stack.
    act(() => {
      router.navigate(-1);
    });
    expect(router.state.location.search).not.toBe('?q=cooking');
  });

  it('re-hydrates the store after a store-origin write when an external nav (Back) changes the URL', () => {
    const { router } = renderWithRouter('/');

    // Store-origin write: sets lastWrittenRef to the canonical of ?q=apple.
    act(() => {
      useSearchStore.getState().setFilters({ query: 'apple' });
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(router.state.location.search).toContain('q=apple');

    // External navigation (browser Back/forward equivalent) to a DIFFERENT URL.
    // The WIP bug: lastSyncSourceRef === 'store' would early-return and swallow
    // this. The fresh one-use-token guard must re-hydrate.
    act(() => {
      router.navigate('/?q=banana&grades=4');
    });

    const { filters } = useSearchStore.getState();
    expect(filters.query).toBe('banana');
    expect(filters.gradeLevels).toContain('4');
  });

  it('hydrates sortBy from ?sort=title with currentPage reset to 1', () => {
    renderWithRouter('/?sort=title');

    const { viewState } = useSearchStore.getState();
    expect(viewState.sortBy).toBe('title');
    expect(viewState.currentPage).toBe(1);
  });

  it('writes ?sort=title to the URL when sortBy changes', () => {
    const { router } = renderWithRouter('/');

    act(() => {
      useSearchStore.getState().setViewState({ sortBy: 'title' });
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(router.state.location.search).toContain('sort=title');
  });

  it('FULL-REPLACE: external nav to a clean path clears active store filters', () => {
    const { router } = renderWithRouter('/?q=tomato&grades=3');

    // Sanity: hydrated from the URL.
    expect(useSearchStore.getState().filters.query).toBe('tomato');

    // External nav to a clean path (no params) — filters must CLEAR, not stay.
    act(() => {
      router.navigate('/');
    });

    const { filters } = useSearchStore.getState();
    expect(filters.query).toBe('');
    expect(filters.gradeLevels).toEqual([]);
  });

  it('FULL-REPLACE: an all-invalid URL clears active store filters', () => {
    const { router } = renderWithRouter('/?grades=3');
    expect(useSearchStore.getState().filters.gradeLevels).toContain('3');

    act(() => {
      router.navigate('/?grades=zzz');
    });

    expect(useSearchStore.getState().filters.gradeLevels).toEqual([]);
  });

  it('StrictMode double-mount: bounded setSearchParams, no duplicate write, single hydrate', () => {
    // Mount under StrictMode (the app runs under <StrictMode>). The
    // canonical-equality guards must make the double effect-invoke idempotent.
    const { router } = renderWithRouter('/?q=tomato', /* strict */ true);

    expect(useSearchStore.getState().filters.query).toBe('tomato');

    // No store change → after settling, the URL must equal what we loaded with
    // (the post-hydration no-op guard prevents an echo write).
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(router.state.location.search).toBe('?q=tomato');
  });

  it('does not loop: a store change settles to a stable URL with no further writes', () => {
    const { router } = renderWithRouter('/');

    act(() => {
      useSearchStore.getState().setFilters({ query: 'loop-check' });
    });
    act(() => {
      vi.advanceTimersByTime(300);
    });
    const searchAfterFirst = router.state.location.search;
    expect(searchAfterFirst).toContain('q=loop-check');

    // Let any further effects run — the post-write no-op guard must prevent a
    // re-write triggered by the URL change we just made.
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(router.state.location.search).toBe(searchAfterFirst);
  });

  it('cancels a pending write when filters revert to the URL state within the debounce window', () => {
    const { router } = renderWithRouter('/');
    act(() => {
      useSearchStore.getState().setFilters({ query: 'transient' });
    });
    // Revert BEFORE the 300ms debounce fires.
    act(() => {
      useSearchStore.getState().setFilters({ query: '' });
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    // No stale write: the URL stays clean, matching the reverted store.
    expect(router.state.location.search).toBe('');
  });

  it('cleans up the debounce timer on unmount (no setSearchParams after unmount)', () => {
    const { router, unmount } = renderWithRouter('/');

    act(() => {
      useSearchStore.getState().setFilters({ query: 'pending' });
    });

    const searchBefore = router.state.location.search;
    // Unmount before the debounce fires.
    act(() => {
      unmount();
    });

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    // The pending write never fired (timer cleared on unmount).
    expect(router.state.location.search).toBe(searchBefore);
  });
});
