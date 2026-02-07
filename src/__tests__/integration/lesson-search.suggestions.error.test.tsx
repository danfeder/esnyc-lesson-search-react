import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mocks: rpc for list, functions.invoke for smart-search
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
import { useSearchStore } from '@/stores/searchStore';

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </BrowserRouter>
  );
}

describe('Search suggestions error handling', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Reset store to defaults
    const store = useSearchStore.getState();
    store.clearFilters();
    store.setViewState({ resultsPerPage: 2 });
  });

  it('does not render suggestions when smart-search fails and falls back', async () => {
    // Smart-search fails -> fallback path
    invokeMock.mockResolvedValue({ data: null, error: new Error('smart failed') });

    // List search returns no results
    rpcMock.mockResolvedValueOnce({ data: [], error: null });

    // Seed a query so suggestions would be enabled if available
    const store = useSearchStore.getState();
    store.setFilters({ query: 'no-result' });

    renderWithProviders(<SearchPage />);

    // Smart-search called
    await waitFor(() => expect(invokeMock).toHaveBeenCalled());

    // List rpc executed
    await waitFor(() => expect(rpcMock).toHaveBeenCalled());

    // Suggestions panel should not be shown
    expect(
      screen.queryByText(/no results found\.? try these suggestions/i)
    ).not.toBeInTheDocument();
  });
});
