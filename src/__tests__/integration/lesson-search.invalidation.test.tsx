import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock Supabase client
const rpcMock = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: any[]) => rpcMock(...args),
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

describe('Search invalidation and cache-key isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to defaults
    const store = useSearchStore.getState();
    store.clearFilters();
    store.setViewState({ resultsPerPage: 2 });
  });

  it('resets to first page and refetches when filters change', async () => {
    // 1) Initial page (2 results)
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
              lessonFormat: [],
            },
            confidence: { overall: 0.9 },
            total_count: 4,
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
              lessonFormat: [],
            },
            confidence: { overall: 0.8 },
            total_count: 4,
          },
        ],
        error: null,
      })
      // 2) Load-more page (1 result)
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
              lessonFormat: [],
            },
            confidence: { overall: 0.7 },
            total_count: 4,
          },
        ],
        error: null,
      })
      // 3) After filters change, reset to first page (new dataset)
      .mockResolvedValueOnce({
        data: [
          {
            lesson_id: 'LF1',
            title: 'Filtered One',
            summary: 'Filtered Summary 1',
            file_link: '#',
            grade_levels: ['5'],
            metadata: {
              coreCompetencies: [],
              culturalHeritage: [],
              activityType: [],
              lessonFormat: [],
            },
            confidence: { overall: 0.95 },
            total_count: 2,
          },
          {
            lesson_id: 'LF2',
            title: 'Filtered Two',
            summary: 'Filtered Summary 2',
            file_link: '#',
            grade_levels: ['5'],
            metadata: {
              coreCompetencies: [],
              culturalHeritage: [],
              activityType: [],
              lessonFormat: [],
            },
            confidence: { overall: 0.9 },
            total_count: 2,
          },
        ],
        error: null,
      });

    renderWithProviders(<SearchPage />);

    // Initial results are shown
    await waitFor(() => {
      expect(screen.getByText('Lesson One')).toBeInTheDocument();
      expect(screen.getByText('Lesson Two')).toBeInTheDocument();
    });

    // Load more to move to page 1 (offset 2)
    const user = userEvent.setup();
    const loadMoreBtn = await screen.findByRole('button', { name: /load more results/i });
    await user.click(loadMoreBtn);

    await waitFor(() => {
      expect(screen.getByText('Lesson Three')).toBeInTheDocument();
    });

    // Now change filters via store – e.g., set gradeLevels to ['5']
    const store = useSearchStore.getState();
    await act(async () => {
      store.setFilters({ gradeLevels: ['5'] });
    });

    // After filter change, the next RPC call should be for page 0 with new filters
    await waitFor(() => {
      // Three calls total: initial, load more, after filter change
      expect(rpcMock).toHaveBeenCalledTimes(3);
    });

    const thirdCall = rpcMock.mock.calls[2];
    // arg[0] is RPC name, arg[1] is params
    expect(thirdCall[0]).toMatch(/search_lessons/);
    expect(thirdCall[1].page_offset).toBe(0);
    expect(thirdCall[1].filter_grade_levels).toEqual(['5']);

    // UI should show the filtered dataset
    await waitFor(() => {
      expect(screen.getByText('Filtered One')).toBeInTheDocument();
      expect(screen.getByText('Filtered Two')).toBeInTheDocument();
    });
  });

  it('uses a separate cache key when page size changes (triggers refetch with new size)', async () => {
    // First call with pageSize 2
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
              lessonFormat: [],
            },
            confidence: { overall: 0.9 },
            total_count: 5,
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
              lessonFormat: [],
            },
            confidence: { overall: 0.8 },
            total_count: 5,
          },
        ],
        error: null,
      })
      // Second call after page size change to 3
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
              lessonFormat: [],
            },
            confidence: { overall: 0.7 },
            total_count: 5,
          },
          {
            lesson_id: 'L4',
            title: 'Lesson Four',
            summary: 'Summary 4',
            file_link: '#',
            grade_levels: ['6'],
            metadata: {
              coreCompetencies: [],
              culturalHeritage: [],
              activityType: [],
              lessonFormat: [],
            },
            confidence: { overall: 0.6 },
            total_count: 5,
          },
          {
            lesson_id: 'L5',
            title: 'Lesson Five',
            summary: 'Summary 5',
            file_link: '#',
            grade_levels: ['7'],
            metadata: {
              coreCompetencies: [],
              culturalHeritage: [],
              activityType: [],
              lessonFormat: [],
            },
            confidence: { overall: 0.5 },
            total_count: 5,
          },
        ],
        error: null,
      });

    renderWithProviders(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText('Lesson One')).toBeInTheDocument();
      expect(screen.getByText('Lesson Two')).toBeInTheDocument();
    });

    // Change resultsPerPage from 2 to 3
    const store = useSearchStore.getState();
    await act(async () => {
      store.setViewState({ resultsPerPage: 3 });
    });

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledTimes(2);
    });

    const secondCall = rpcMock.mock.calls[1];
    expect(secondCall[0]).toMatch(/search_lessons/);
    expect(secondCall[1].page_offset).toBe(0);
    expect(secondCall[1].page_size).toBe(3);

    await waitFor(() => {
      expect(screen.getByText('Lesson Three')).toBeInTheDocument();
      expect(screen.getByText('Lesson Four')).toBeInTheDocument();
      expect(screen.getByText('Lesson Five')).toBeInTheDocument();
    });
  });
});
