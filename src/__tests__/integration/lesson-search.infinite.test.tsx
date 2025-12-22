import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

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

function renderWithProviders(ui: React.ReactElement, initialEntries: string[] = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );
}

describe('SearchPage + useLessonSearch (infinite)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to defaults
    const store = useSearchStore.getState();
    store.clearFilters();
    store.setViewState({ resultsPerPage: 2 });
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
            lessonFormat: [],
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
            lessonFormat: [],
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

    // Ensure RPC called with page_offset 0
    expect(rpcMock).toHaveBeenCalled();
    const callArgs = rpcMock.mock.calls[0];
    expect(callArgs[0]).toMatch(/search_lessons/);
    expect(callArgs[1].page_offset).toBe(0);
    expect(callArgs[1].page_size).toBe(2);
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
              lessonFormat: [],
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
              lessonFormat: [],
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
              lessonFormat: [],
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

    // Ensure second call uses page_offset = 2
    const secondCall = rpcMock.mock.calls[1];
    expect(secondCall[1].page_offset).toBe(2);
  });

  it('shows an error when RPC fails', async () => {
    rpcMock.mockResolvedValueOnce({ data: null, error: new Error('Network error') });

    renderWithProviders(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText(/error loading lessons/i)).toBeInTheDocument();
    });
  });
});
