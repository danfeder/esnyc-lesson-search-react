import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

// Mocks
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

describe('Season parameter naming (RPC and suggestions)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const store = useSearchStore.getState();
    store.clearFilters();
    store.setViewState({ resultsPerPage: 2 });
  });

  it('sends `filter_seasons` to RPC when season filters are selected', async () => {
    // RPC returns one row
    rpcMock.mockResolvedValueOnce({
      data: [
        makeRpcRow({
          lesson_id: 'SZN1',
          title: 'Fall Planting',
          grade_levels: ['3'],
          total_count: 1,
        }),
      ],
      error: null,
    });

    // Set season filters to ensure param is sent
    const store = useSearchStore.getState();
    store.setFilters({ seasonTiming: ['Fall', 'Winter'] });

    renderWithProviders(<SearchPage />);

    await waitFor(() => expect(rpcMock).toHaveBeenCalled());
    const callArgs = rpcMock.mock.calls[0];
    expect(callArgs[0]).toMatch(/search_lessons/);
    expect(callArgs[1].filter_seasons).toEqual(['Fall', 'Winter']);
  });

  it('sends `seasons` in suggestions payload (not seasonTiming)', async () => {
    // Suggestions available
    invokeMock.mockResolvedValue({
      data: makeSmartSearchPayload({ suggestions: ['winter gardening'] }),
      error: null,
    });
    // No list results to force suggestions UI
    rpcMock.mockResolvedValueOnce({ data: [], error: null });

    const store = useSearchStore.getState();
    store.setFilters({ query: 'no-result', seasonTiming: ['Winter'] });

    renderWithProviders(<SearchPage />);

    await waitFor(() => expect(invokeMock).toHaveBeenCalled());
    const [fnName, payload] = invokeMock.mock.calls[0];
    expect(fnName).toBe('smart-search');
    expect(payload?.body?.filters?.seasons).toEqual(['Winter']);
    // Ensure legacy key is not sent accidentally
    expect(payload?.body?.filters?.seasonTiming).toBeUndefined();
  });
});
