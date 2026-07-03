import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Mock Supabase client (rpc for search list; functions.invoke for smart-search suggestions)
const rpcMock = vi.fn();
const invokeMock = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rpc: (...args: any[]) => rpcMock(...args),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    functions: { invoke: (...args: any[]) => invokeMock(...args) },
  },
}));

// Import after mocks
import { SearchPage } from '@/pages/SearchPage';
import { useSearchStore, initialFilters } from '@/stores/searchStore';
import { buildSearchParams } from '@/utils/urlParams';
import type { SearchFilters, ViewState } from '@/types';
import { makeRpcRow, makeSmartSearchPayload } from '@/__tests__/helpers/factories';

// W1c: SearchPage mounts useUrlSync and hydrates filters from the URL on mount.
// Render inside a Router and seed the starting query via the URL (a pre-render
// store.setFilters would be cleared by the empty-URL mount pass).
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

function searchUrl(filters: Partial<SearchFilters>, sortBy: ViewState['sortBy'] = 'relevance') {
  const params = buildSearchParams({ ...initialFilters, ...filters }, sortBy);
  const qs = params.toString();
  return qs ? `/?${qs}` : '/';
}

describe('Search suggestions integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const store = useSearchStore.getState();
    store.clearFilters();
  });

  it('shows suggestions and applies one to trigger a new search', async () => {
    // Smart-search returns suggestions for the current query
    invokeMock.mockResolvedValue({
      data: makeSmartSearchPayload({ suggestions: ['garden planning'] }),
      error: null,
    });

    // Initial list call returns no results (simulate empty state)
    rpcMock
      .mockResolvedValueOnce({ data: [], error: null })
      // After clicking suggestion, return a result
      .mockResolvedValueOnce({
        data: [
          makeRpcRow({
            lesson_id: 'S1',
            title: 'Garden Planning 101',
            grade_levels: ['5'],
            total_count: 1,
          }),
        ],
        error: null,
      });

    // Seed a query (via the URL) so suggestions are enabled after hydration.
    renderWithProviders(<SearchPage />, [searchUrl({ query: 'no-result' })]);

    // Ensure smart-search was called to populate suggestions
    await waitFor(() => expect(invokeMock).toHaveBeenCalled());

    // Ensure list search executed with the original query
    await waitFor(() => expect(rpcMock).toHaveBeenCalled());
    const firstCall = rpcMock.mock.calls[0];
    expect(firstCall[1].search_query).toBe('no-result');

    // Suggestions are visible
    expect(screen.getByText(/no results found\. try these suggestions:/i)).toBeInTheDocument();

    const user = userEvent.setup();
    const suggestionBtn = screen.getByRole('button', { name: 'garden planning' });
    await user.click(suggestionBtn);

    // After clicking suggestion, a new RPC call is made with updated query
    await waitFor(() => expect(rpcMock).toHaveBeenCalledTimes(2));
    const secondCall = rpcMock.mock.calls[1];
    expect(secondCall[1].search_query).toBe('garden planning');
    expect(secondCall[1].page_offset).toBe(0);

    // UI shows the new result
    await waitFor(() => {
      expect(screen.getByText('Garden Planning 101')).toBeInTheDocument();
    });
  });
});
