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
    // On error the card is the SOLE content — the results block is gated on
    // !isError, so no (stale/empty) list container renders underneath it.
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
});
