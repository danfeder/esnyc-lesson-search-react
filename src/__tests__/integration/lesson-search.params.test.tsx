import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Mocks
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

import { SearchPage } from '@/pages/SearchPage';
import { useSearchStore, initialFilters } from '@/stores/searchStore';
import { buildSearchParams } from '@/utils/urlParams';
import type { SearchFilters, ViewState } from '@/types';
import { makeRpcRow, makeSmartSearchPayload } from '@/__tests__/helpers/factories';

// W1c: SearchPage mounts useUrlSync and hydrates filters from the URL on mount.
// So the page must render inside a Router, and the starting filter state must
// come from the URL (a pre-render store.setFilters is cleared by the empty-URL
// mount pass). Use MemoryRouter + a URL built from the production serializer.
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

describe('Season parameter naming (RPC and suggestions)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const store = useSearchStore.getState();
    store.clearFilters();
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

    // Set season filters via the URL so they survive useUrlSync hydration.
    renderWithProviders(<SearchPage />, [searchUrl({ seasonTiming: ['Fall', 'Winter'] })]);

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

    renderWithProviders(<SearchPage />, [
      searchUrl({ query: 'no-result', seasonTiming: ['Winter'] }),
    ]);

    await waitFor(() => expect(invokeMock).toHaveBeenCalled());
    const [fnName, payload] = invokeMock.mock.calls[0];
    expect(fnName).toBe('smart-search');
    expect(payload?.body?.filters?.seasons).toEqual(['Winter']);
    // Ensure legacy key is not sent accidentally
    expect(payload?.body?.filters?.seasonTiming).toBeUndefined();
  });
});
