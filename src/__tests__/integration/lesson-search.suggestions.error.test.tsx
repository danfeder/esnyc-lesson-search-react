import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mocks: rpc for list, functions.invoke for smart-search
const rpcMock = vi.fn();
const invokeMock = vi.fn();
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    functions: { invoke: (...args: any[]) => invokeMock(...args) },
    from: () => fromMock(),
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
