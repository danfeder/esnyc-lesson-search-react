import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const invokeMock = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    functions: { invoke: (...args: any[]) => invokeMock(...args) },
  },
}));

// Import after mocks
import { useLessonSuggestions } from './useLessonSuggestions';
import { initialFilters } from '@/stores/searchStore';

function makeWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

describe('useLessonSuggestions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requests limit:1, never 0 (rung8-hooks F1 — smart-search coerces 0→20)', async () => {
    invokeMock.mockResolvedValue({ data: { suggestions: [], expandedQuery: 'x:*' }, error: null });

    renderHook(() => useLessonSuggestions({ filters: { ...initialFilters, query: 'x' } }), {
      wrapper: makeWrapper(),
    });

    await waitFor(() => expect(invokeMock).toHaveBeenCalled());
    expect(invokeMock.mock.calls[0][0]).toBe('smart-search');
    expect(invokeMock.mock.calls[0][1].body.limit).toBe(1);
  });

  it('throws on invoke error instead of caching an empty success (rung8-hooks F2)', async () => {
    invokeMock.mockResolvedValue({ data: null, error: new Error('edge cold-start') });

    const { result } = renderHook(
      () => useLessonSuggestions({ filters: { ...initialFilters, query: 'tomato' } }),
      { wrapper: makeWrapper() }
    );

    // The failure surfaces as a real error, NOT a cached { suggestions: [] }
    // success that would stick fresh for 5 minutes with no recovery.
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });

  it('returns suggestions + expandedQuery on success', async () => {
    invokeMock.mockResolvedValue({
      data: { suggestions: ['maize'], expandedQuery: 'corn:* | maize:*' },
      error: null,
    });

    const { result } = renderHook(
      () => useLessonSuggestions({ filters: { ...initialFilters, query: 'corn' } }),
      { wrapper: makeWrapper() }
    );

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.data?.suggestions).toEqual(['maize']);
    expect(result.current.data?.expandedQuery).toBe('corn:* | maize:*');
  });
});
