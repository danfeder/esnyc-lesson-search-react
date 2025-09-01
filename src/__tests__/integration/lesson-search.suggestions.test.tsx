import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mock Supabase client (rpc for search list; functions.invoke for smart-search suggestions)
const rpcMock = vi.fn();
const invokeMock = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: any[]) => rpcMock(...args),
    functions: { invoke: (...args: any[]) => invokeMock(...args) },
  },
}));

// Import after mocks
import { SearchPage } from '@/pages/SearchPage';
import { useSearchStore } from '@/stores/searchStore';
import { makeRpcRow, makeSmartSearchPayload } from '@/__tests__/helpers/factories';

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

describe('Search suggestions integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const store = useSearchStore.getState();
    store.clearFilters();
    store.setViewState({ resultsPerPage: 2 });
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

    // Seed a query so suggestions are enabled
    const store = useSearchStore.getState();
    store.setFilters({ query: 'no-result' });

    renderWithProviders(<SearchPage />);

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
