import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from 'react-router-dom';

import { makeRpcRow } from '../helpers/factories';

// Mock Supabase client. `rpcMock` serves the search RPC; the `from(...)` chain
// serves useLessonById's deep-link fallback — `maybeSingleMock` is the single
// controllable resolution point for it.
const rpcMock = vi.fn();
const functionsInvokeMock = vi.fn().mockResolvedValue({ data: null, error: null });
const maybeSingleMock = vi.fn();
const fromMock = vi.fn((..._args: unknown[]) => ({
  select: () => ({
    eq: () => ({
      is: () => ({
        maybeSingle: () => maybeSingleMock(),
      }),
    }),
  }),
}));

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    from: (...args: unknown[]) => fromMock(...args),
    functions: { invoke: (...args: unknown[]) => functionsInvokeMock(...args) },
  },
}));

// Import after mocks
import { SearchPage } from '@/pages/SearchPage';
import { useSearchStore, initialFilters } from '@/stores/searchStore';
import { buildSearchParams } from '@/utils/urlParams';
import type { SearchFilters } from '@/types';

/**
 * Router probe rendered NEXT TO the page (same route element) so tests can
 * assert the live pathname/search and drive real history navigation
 * (browser-Back equivalent) without reaching for window.history, which
 * MemoryRouter does not use.
 */
function RouterProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <div data-testid="probe-path">{location.pathname}</div>
      <div data-testid="probe-search">{location.search}</div>
      <button type="button" data-testid="probe-history-back" onClick={() => navigate(-1)}>
        probe-history-back
      </button>
    </>
  );
}

function renderSearchApp(initialEntries: string[] = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const page = (
    <>
      <SearchPage />
      <RouterProbe />
    </>
  );
  // Same three-route shape as production App.tsx: one element type at one tree
  // position, so `/` <-> `/lesson/:id` navigation must not remount SearchPage.
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path="/" element={page} />
          <Route path="/search" element={page} />
          <Route path="/lesson/:lessonId" element={page} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>
  );
}

function themesQueryString() {
  return buildSearchParams(
    { ...initialFilters, thematicCategories: ['Food Systems'] } as SearchFilters,
    'relevance'
  ).toString();
}

function createTestLesson(overrides: Partial<ReturnType<typeof makeRpcRow>> = {}) {
  return makeRpcRow({
    lesson_id: 'test-lesson-1',
    title: 'Test Lesson Title',
    summary: 'A summary for permalink testing.',
    file_link: 'https://docs.google.com/test-doc',
    grade_levels: ['3', '4'],
    total_count: 1,
    ...overrides,
  });
}

function drawerHeadingVisible(title: string): boolean {
  return screen
    .getAllByRole('heading', { level: 2 })
    .some((h) => h.textContent === title && h.classList.contains('int-detail-title'));
}

describe('SearchPage permalinks (D2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const store = useSearchStore.getState();
    store.clearFilters();
    store.setViewState({ sortBy: 'relevance' });
    functionsInvokeMock.mockResolvedValue({ data: null, error: null });
    // mockReset (not just clear): drop any unconsumed mockImplementationOnce
    // left by a prior test so it can't leak a stale resolution across tests.
    maybeSingleMock.mockReset().mockResolvedValue({ data: null, error: null });
  });

  it('deep link resolves from the loaded page (fast path — no by-id fetch)', async () => {
    const row = createTestLesson({ lesson_id: 'deep-1', title: 'Deep Linked Lesson' });
    rpcMock.mockResolvedValue({ data: [row], error: null });

    renderSearchApp(['/lesson/deep-1']);

    await waitFor(() => {
      expect(drawerHeadingVisible('Deep Linked Lesson')).toBe(true);
    });
    expect(screen.getByRole('button', { name: /close lesson details/i })).toBeInTheDocument();
    expect(fromMock).not.toHaveBeenCalled();
  });

  it('deep link outside the loaded pages fetches by id (loading, then ready)', async () => {
    rpcMock.mockResolvedValue({ data: [createTestLesson()], error: null });
    let resolveById: ((value: { data: unknown; error: null }) => void) | undefined;
    maybeSingleMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveById = resolve;
        })
    );

    renderSearchApp(['/lesson/fetched-1']);

    // Loading state while the by-id fetch is in flight (exact text — the list
    // skeleton's sr-only copy is the plural "Loading lessons…").
    await waitFor(() => {
      expect(screen.getByText('Loading lesson…')).toBeInTheDocument();
    });
    // The by-id fetch only starts AFTER the first search page settles (the
    // fast-path gate); wait for it before resolving the deferred response.
    await waitFor(() => {
      expect(maybeSingleMock).toHaveBeenCalled();
    });
    expect(screen.getByText('Loading lesson…')).toBeInTheDocument();

    resolveById!({
      data: createTestLesson({ lesson_id: 'fetched-1', title: 'Fetched By Id Lesson' }),
      error: null,
    });

    await waitFor(() => {
      expect(drawerHeadingVisible('Fetched By Id Lesson')).toBe(true);
    });
    expect(fromMock).toHaveBeenCalledWith('lessons');
  });

  it('unknown id shows not-found; Back to search closes to / keeping filters', async () => {
    rpcMock.mockResolvedValue({ data: [createTestLesson()], error: null });
    // maybeSingle default ({ data: null }) = unknown/retired id.
    const qs = themesQueryString();

    renderSearchApp([`/lesson/definitely-not-real?${qs}`]);

    await waitFor(() => {
      // DialogTitle (sr-only) + body heading both carry the copy.
      expect(screen.getAllByText('Lesson not found').length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText(/removed from the library/i)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /back to search/i }));

    await waitFor(() => {
      expect(screen.getByTestId('probe-path').textContent).toBe('/');
    });
    // Direct deep-link landing: close REPLACES to the list, keeping URL filters.
    expect(screen.getByTestId('probe-search').textContent).toBe(`?${qs}`);
    expect(screen.queryByRole('button', { name: /close lesson details/i })).not.toBeInTheDocument();
  });

  it('by-id failure shows the honest error state and retry recovers', async () => {
    rpcMock.mockResolvedValue({ data: [createTestLesson()], error: null });
    maybeSingleMock
      .mockImplementationOnce(() => Promise.resolve({ data: null, error: new Error('boom') }))
      .mockImplementationOnce(() =>
        Promise.resolve({
          data: createTestLesson({ lesson_id: 'retry-1', title: 'Recovered Lesson' }),
          error: null,
        })
      );

    renderSearchApp(['/lesson/retry-1']);

    await waitFor(() => {
      expect(screen.getAllByText("Couldn't load this lesson").length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getByText(/something went wrong loading this lesson/i)).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /try again/i }));

    await waitFor(() => {
      expect(drawerHeadingVisible('Recovered Lesson')).toBe(true);
    });
  });

  it('opening a lesson pushes /lesson/<id> keeping the filter search string; close returns to /', async () => {
    const row = createTestLesson({ lesson_id: 'url-1', title: 'URL Lesson' });
    rpcMock.mockResolvedValue({ data: [row], error: null });
    const qs = themesQueryString();

    renderSearchApp([`/?${qs}`]);

    await waitFor(() => {
      expect(screen.getByText('URL Lesson')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByText('URL Lesson'));

    await waitFor(() => {
      expect(screen.getByTestId('probe-path').textContent).toBe('/lesson/url-1');
    });
    expect(screen.getByTestId('probe-search').textContent).toBe(`?${qs}`);

    await user.click(screen.getByRole('button', { name: /close lesson details/i }));

    await waitFor(() => {
      expect(screen.getByTestId('probe-path').textContent).toBe('/');
    });
    expect(screen.getByTestId('probe-search').textContent).toBe(`?${qs}`);
  });

  it('browser Back closes the drawer and keeps the list intact (no remount)', async () => {
    const row = createTestLesson({ lesson_id: 'back-1', title: 'Back Button Lesson' });
    rpcMock.mockResolvedValue({ data: [row], error: null });

    renderSearchApp();

    await waitFor(() => {
      expect(screen.getByText('Back Button Lesson')).toBeInTheDocument();
    });

    const user = userEvent.setup();
    await user.click(screen.getByText('Back Button Lesson'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /close lesson details/i })).toBeInTheDocument();
    });

    // fireEvent (not userEvent): the probe sits outside the modal, and the
    // Dialog's focus/inert management would block a synthesized user click.
    fireEvent.click(screen.getByTestId('probe-history-back'));

    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /close lesson details/i })
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText('Back Button Lesson')).toBeInTheDocument();
    expect(screen.getByTestId('probe-path').textContent).toBe('/');
  });

  it('split click-through on a deep-link landing: close returns to the list (contract)', async () => {
    // Locks the POST-FIX contract for the fromSearch-propagation fix
    // (SearchPage handleOpenLesson replace branch). NOTE: this cannot pin the
    // pre-fix bug in jsdom — MemoryRouter clamps go(-1) at index 0, masking
    // the no-op that a real fresh browser tab exhibits. The true pre-fix
    // repro is a real-browser E2E (fresh tab -> permalink -> split
    // click-through -> close), noted in the PR as a follow-up candidate.
    useSearchStore.getState().setViewState({ view: 'split' });
    const rowA = createTestLesson({
      lesson_id: 'land-a',
      title: 'Landing Lesson A',
      total_count: 2,
    });
    const rowB = createTestLesson({
      lesson_id: 'land-b',
      title: 'Clicked Lesson B',
      total_count: 2,
    });
    rpcMock.mockResolvedValue({ data: [rowA, rowB], error: null });

    renderSearchApp(['/lesson/land-a']);
    await waitFor(() => {
      expect(drawerHeadingVisible('Landing Lesson A')).toBe(true);
    });

    const user = userEvent.setup();
    await user.click(screen.getByText('Clicked Lesson B'));
    await waitFor(() => {
      expect(screen.getByTestId('probe-path').textContent).toBe('/lesson/land-b');
    });

    await user.click(screen.getByRole('button', { name: /close lesson details/i }));
    await waitFor(() => {
      expect(screen.getByTestId('probe-path').textContent).toBe('/');
    });
  });

  it('opening a lesson does not refire the search RPC and keeps filter pills (redundant-hydrate seam)', async () => {
    const row = createTestLesson({ lesson_id: 'seam-1', title: 'Seam Lesson' });
    rpcMock.mockResolvedValue({ data: [row], error: null });
    const qs = themesQueryString();

    renderSearchApp([`/?${qs}`]);

    await waitFor(() => {
      expect(screen.getByText('Seam Lesson')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /remove food systems/i })).toBeInTheDocument();
    });

    const searchCallsBefore = rpcMock.mock.calls.length;

    const user = userEvent.setup();
    await user.click(screen.getByText('Seam Lesson'));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /close lesson details/i })).toBeInTheDocument();
    });

    // The pathname change re-fires useUrlSync's URL→store effect with
    // structurally identical filters; React Query's structural key hashing
    // must swallow it — NO new search RPC, no by-id call, pills intact.
    expect(rpcMock.mock.calls.length).toBe(searchCallsBefore);
    expect(fromMock).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /remove food systems/i })).toBeInTheDocument();
  });
});
