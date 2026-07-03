import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, act, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useUrlSync } from './useUrlSync';
import { useSearchStore } from '@/stores/searchStore';

/**
 * Regression guard for the "flush-on-unmount clobber" hazard.
 *
 * useUrlSync's unmount cleanup must CANCEL (not flush) a pending debounced
 * store→URL write. Flushing on unmount re-navigates through React Router's
 * non-data-router `navigate` closure — captured with SearchPage's OWN pathname
 * and never reset on unmount — which `replace`s the CURRENT top history entry.
 * So a filter toggle followed within 300ms by a cross-route push (a header link
 * to /submit, /admin, …) would be clobbered straight back to the search URL,
 * silently undoing the user's navigation.
 *
 * Faithful repro: a plain <MemoryRouter> (NOT createMemoryRouter) so useNavigate
 * resolves to the same non-data-router implementation BrowserRouter uses, and a
 * route swap that actually unmounts the useUrlSync host — exactly like App.tsx
 * swaps SearchPage for another page.
 */
function SearchPageLike() {
  useUrlSync();
  return <Link to="/submit">go-submit</Link>;
}

function Probe() {
  const loc = useLocation();
  return <div data-testid="probe">{`${loc.pathname}${loc.search}`}</div>;
}

describe('useUrlSync unmount vs. cross-route navigation', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    const store = useSearchStore.getState();
    act(() => {
      store.clearFilters();
      store.setViewState({ view: 'list', density: 'comfy' });
    });
  });
  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('navigating away within the debounce window is NOT clobbered back to search', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Probe />
        <Routes>
          <Route path="/" element={<SearchPageLike />} />
          <Route path="/submit" element={<div>submit-page</div>} />
        </Routes>
      </MemoryRouter>
    );

    // Toggle a filter → arms the 300ms store→URL debounce.
    act(() => {
      useSearchStore.getState().setFilters({ query: 'pending' });
    });

    // Within the window, click a cross-route link (SearchPageLike unmounts).
    act(() => {
      screen.getByText('go-submit').click();
    });

    // Let any stale timer / unmount effect settle.
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // We stay on /submit — the pending write was cancelled, not flushed onto
    // (and thereby reverting) the pushed entry.
    expect(screen.getByTestId('probe').textContent).toBe('/submit');
  });
});
