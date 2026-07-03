import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock Supabase client
const rpcMock = vi.fn();
// FP-01b: SearchPage mounts useFacetCounts, which fetches the facet corpus via
// from('lessons').select(...).is('retired_at', null).limit(...). Resolve an
// empty corpus so the hook settles cleanly (badges just render 0s) instead of
// TypeError-ing on a missing `from`.
const fromMock = vi.fn(() => ({
  select: vi.fn(() => ({
    is: vi.fn(() => ({
      limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
    })),
  })),
}));
vi.mock('@/lib/supabase', () => ({
  supabase: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rpc: (...args: any[]) => rpcMock(...args),
    from: () => fromMock(),
  },
}));

// Import after mocks
import { SearchPage } from '@/pages/SearchPage';
import { useSearchStore } from '@/stores/searchStore';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </BrowserRouter>
  );
}

describe('SearchPage + useLessonSearch (infinite)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to defaults
    const store = useSearchStore.getState();
    store.clearFilters();
  });

  it('renders initial results from first page', async () => {
    // page 0 response: 2 rows, total_count 3
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          lesson_id: 'L1',
          title: 'Lesson One',
          summary: 'Summary 1',
          file_link: '#',
          grade_levels: ['3'],
          metadata: {
            coreCompetencies: [],
            culturalHeritage: [],
            activityType: [],
          },
          confidence: { overall: 0.9 },
          total_count: 3,
        },
        {
          lesson_id: 'L2',
          title: 'Lesson Two',
          summary: 'Summary 2',
          file_link: '#',
          grade_levels: ['4'],
          metadata: {
            coreCompetencies: [],
            culturalHeritage: [],
            activityType: [],
          },
          confidence: { overall: 0.8 },
          total_count: 3,
        },
      ],
      error: null,
    });

    renderWithProviders(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText('Lesson One')).toBeInTheDocument();
      expect(screen.getByText('Lesson Two')).toBeInTheDocument();
    });

    // Ensure RPC called with page_offset 0 and the fixed page size (20)
    expect(rpcMock).toHaveBeenCalled();
    const callArgs = rpcMock.mock.calls[0];
    expect(callArgs[0]).toMatch(/search_lessons/);
    expect(callArgs[1].page_offset).toBe(0);
    expect(callArgs[1].page_size).toBe(20);
  });

  it('loads more results when load more is triggered', async () => {
    // First page
    rpcMock
      .mockResolvedValueOnce({
        data: [
          {
            lesson_id: 'L1',
            title: 'Lesson One',
            summary: 'Summary 1',
            file_link: '#',
            grade_levels: ['3'],
            metadata: {
              coreCompetencies: [],
              culturalHeritage: [],
              activityType: [],
            },
            confidence: { overall: 0.9 },
            total_count: 3,
          },
          {
            lesson_id: 'L2',
            title: 'Lesson Two',
            summary: 'Summary 2',
            file_link: '#',
            grade_levels: ['4'],
            metadata: {
              coreCompetencies: [],
              culturalHeritage: [],
              activityType: [],
            },
            confidence: { overall: 0.8 },
            total_count: 3,
          },
        ],
        error: null,
      })
      // Second page
      .mockResolvedValueOnce({
        data: [
          {
            lesson_id: 'L3',
            title: 'Lesson Three',
            summary: 'Summary 3',
            file_link: '#',
            grade_levels: ['5'],
            metadata: {
              coreCompetencies: [],
              culturalHeritage: [],
              activityType: [],
            },
            confidence: { overall: 0.7 },
            total_count: 3,
          },
        ],
        error: null,
      });

    renderWithProviders(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText('Lesson One')).toBeInTheDocument();
      expect(screen.getByText('Lesson Two')).toBeInTheDocument();
    });

    // Use the keyboard-accessible button rendered by InfiniteScrollTrigger
    const user = userEvent.setup();
    const loadMoreBtn = await screen.findByRole('button', { name: /load more results/i });
    await user.click(loadMoreBtn);

    await waitFor(() => {
      expect(screen.getByText('Lesson Three')).toBeInTheDocument();
    });

    // Ensure second call advances by one fixed-size page (offset = 20)
    const secondCall = rpcMock.mock.calls[1];
    expect(secondCall[1].page_offset).toBe(20);
  });

  it('shows a friendly error card with a working Retry when the RPC fails (FP-13)', async () => {
    const user = userEvent.setup();
    // First load fails.
    rpcMock.mockResolvedValueOnce({ data: null, error: new Error('Network error') });

    renderWithProviders(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText(/couldn't load lessons just now/i)).toBeInTheDocument();
    });
    // Plain language only — never the raw technical error text.
    expect(screen.queryByText(/network error/i)).not.toBeInTheDocument();
    // COLD failure (no rows loaded): the error card is the SOLE content. The
    // results block is gated on `(!isError || lessons.length > 0)`, which is
    // false here, so no (stale/empty) list container renders underneath it.
    expect(document.querySelector('.int-list')).toBeNull();

    // Retry re-runs the search; make the next call succeed.
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          lesson_id: 'L1',
          title: 'Recovered Lesson',
          summary: 'ok',
          file_link: '#',
          grade_levels: ['3'],
          metadata: { coreCompetencies: [], culturalHeritage: [], activityType: [] },
          total_count: 1,
        },
      ],
      error: null,
    });

    await user.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText('Recovered Lesson')).toBeInTheDocument();
    });
    // Error card is gone.
    expect(screen.queryByText(/couldn't load lessons just now/i)).not.toBeInTheDocument();
  });

  it('keeps loaded results (and offers a scoped retry) when a load-more fetch fails (FP-13)', async () => {
    const user = userEvent.setup();
    // Page 1 succeeds (2 of 3), so hasNextPage is true and the trigger shows.
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          lesson_id: 'L1',
          title: 'Lesson One',
          summary: 'Summary 1',
          file_link: '#',
          grade_levels: ['3'],
          metadata: { coreCompetencies: [], culturalHeritage: [], activityType: [] },
          confidence: { overall: 0.9 },
          total_count: 3,
        },
        {
          lesson_id: 'L2',
          title: 'Lesson Two',
          summary: 'Summary 2',
          file_link: '#',
          grade_levels: ['4'],
          metadata: { coreCompetencies: [], culturalHeritage: [], activityType: [] },
          confidence: { overall: 0.8 },
          total_count: 3,
        },
      ],
      error: null,
    });

    renderWithProviders(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText('Lesson One')).toBeInTheDocument();
      expect(screen.getByText('Lesson Two')).toBeInTheDocument();
    });

    // The NEXT page fetch (fetchNextPage) fails.
    rpcMock.mockResolvedValueOnce({ data: null, error: new Error('Network error') });
    const loadMoreBtn = await screen.findByRole('button', { name: /load more results/i });
    await user.click(loadMoreBtn);

    // Regression guard: the already-loaded rows must NOT be wiped. A single flaky
    // fetchNextPage flips isError for the whole useInfiniteQuery, but the earlier
    // pages are still valid, so they stay on screen.
    await waitFor(() => {
      expect(screen.getByText(/couldn't load more lessons just now/i)).toBeInTheDocument();
    });
    expect(screen.getByText('Lesson One')).toBeInTheDocument();
    expect(screen.getByText('Lesson Two')).toBeInTheDocument();
    expect(document.querySelector('.int-list')).not.toBeNull();
    // NOT the cold full-page error card — that one only replaces an empty result set.
    expect(
      screen.queryByText(/couldn't load lessons just now\. please check your connection/i)
    ).not.toBeInTheDocument();

    // The scoped Retry re-attempts the failed NEXT page (not a full refetch).
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          lesson_id: 'L3',
          title: 'Lesson Three',
          summary: 'Summary 3',
          file_link: '#',
          grade_levels: ['5'],
          metadata: { coreCompetencies: [], culturalHeritage: [], activityType: [] },
          confidence: { overall: 0.7 },
          total_count: 3,
        },
      ],
      error: null,
    });

    await user.click(screen.getByRole('button', { name: /retry/i }));

    await waitFor(() => {
      expect(screen.getByText('Lesson Three')).toBeInTheDocument();
    });
    // Retry re-attempted the next page (offset 20), not a refetch of page 1.
    const retryCall = rpcMock.mock.calls[rpcMock.mock.calls.length - 1];
    expect(retryCall[1].page_offset).toBe(20);
    expect(screen.queryByText(/couldn't load more lessons just now/i)).not.toBeInTheDocument();
  });

  it('hides the load-more trigger entirely when the whole result set fits on page 1 (FP-19)', async () => {
    // Single lesson, total_count 1 → one page, no next page. The paginated
    // trigger (and its "No more results to load" terminal footer) is pure noise
    // here, so the `(hasNextPage || pageCount > 1)` guard should suppress it
    // outright — neither the load-more control nor the terminal copy renders.
    rpcMock.mockResolvedValueOnce({
      data: [
        {
          lesson_id: 'only',
          title: 'Only Lesson',
          summary: 'ok',
          file_link: '#',
          grade_levels: ['3'],
          metadata: { coreCompetencies: [], culturalHeritage: [], activityType: [] },
          confidence: { overall: 0.9 },
          total_count: 1,
        },
      ],
      error: null,
    });

    renderWithProviders(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText('Only Lesson')).toBeInTheDocument();
    });
    expect(screen.queryByRole('button', { name: /load more results/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/no more results to load/i)).not.toBeInTheDocument();
  });
});
