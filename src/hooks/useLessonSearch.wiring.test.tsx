import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the Supabase client with an `rpc` we can inspect. The global setup mock
// does not expose `rpc`, so we override per-file (same pattern as
// lesson-search.infinite.test.tsx).
const rpcMock = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rpc: (...args: any[]) => rpcMock(...args),
  },
}));

// Import after the mock is registered.
import { useLessonSearch } from '@/hooks/useLessonSearch';
import type { SearchFilters, ViewState } from '@/types';

const EMPTY_FILTERS: SearchFilters = {
  query: '',
  gradeLevels: [],
  thematicCategories: [],
  seasonTiming: [],
  coreCompetencies: [],
  culturalHeritage: [],
  location: [],
  activityType: [],
  tags: [],
  academicIntegration: [],
  socialEmotionalLearning: [],
  cookingMethods: [],
};

function makeFilters(overrides: Partial<SearchFilters>): SearchFilters {
  return { ...EMPTY_FILTERS, ...overrides };
}

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

/** Render the hook and return the params object passed to supabase.rpc on the first call. */
async function getRpcParams(filters: SearchFilters): Promise<Record<string, unknown>> {
  renderHook(() => useLessonSearch({ filters }), { wrapper: createWrapper() });
  await waitFor(() => {
    expect(rpcMock).toHaveBeenCalled();
  });
  return rpcMock.mock.calls[0][1] as Record<string, unknown>;
}

/** Like getRpcParams but threads an explicit sortBy through the hook. */
async function getRpcParamsWithSort(
  filters: SearchFilters,
  sortBy: ViewState['sortBy']
): Promise<Record<string, unknown>> {
  renderHook(() => useLessonSearch({ filters, sortBy }), { wrapper: createWrapper() });
  await waitFor(() => {
    expect(rpcMock).toHaveBeenCalled();
  });
  return rpcMock.mock.calls[0][1] as Record<string, unknown>;
}

describe('useLessonSearch — parseSearchQuery wiring (S1.2)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: a successful single-page RPC response.
    rpcMock.mockResolvedValue({ data: [], error: null });
  });

  it('routes a grade cue: strips it from search_query and applies it as filter_grade_levels', async () => {
    const params = await getRpcParams(makeFilters({ query: 'compost lesson for 3rd grade' }));

    // "lesson", "for", and the routed "3rd grade" tokens are stripped from the term.
    expect(params.search_query).toBe('compost');
    // Detected grade applied (no explicit user grade filter present).
    expect(params.filter_grade_levels).toEqual(['3']);
  });

  it('explicit grade filter WINS over a grade detected in the query text', async () => {
    const params = await getRpcParams(
      makeFilters({ query: 'compost lesson for 3rd grade', gradeLevels: ['5'] })
    );

    // The routed grade token is still stripped from the search term...
    expect(params.search_query).toBe('compost');
    // ...but the explicit user filter is used, NOT the detected ['3'].
    expect(params.filter_grade_levels).toEqual(['5']);
    expect(params.filter_grade_levels).not.toEqual(['3']);
  });

  it('plain single-term query: passes through unchanged with no auto-applied grade', async () => {
    const params = await getRpcParams(makeFilters({ query: 'compost' }));

    expect(params.search_query).toBe('compost');
    // No grade cue → no detected grade → omitted (undefined), not [].
    expect(params.filter_grade_levels).toBeUndefined();
  });

  it('grade-only query: empty cleaned term → search_query undefined, show-all-of-grade applied', async () => {
    const params = await getRpcParams(makeFilters({ query: '3rd grade' }));

    // Nothing left after routing the grade cue → undefined (not '').
    expect(params.search_query).toBeUndefined();
    // The detected grade is still applied so the user sees all of that grade.
    expect(params.filter_grade_levels).toEqual(['3']);
  });

  it('empty query with no filters: search_query and filter_grade_levels both omitted', async () => {
    const params = await getRpcParams(makeFilters({ query: '' }));

    expect(params.search_query).toBeUndefined();
    expect(params.filter_grade_levels).toBeUndefined();
  });
});

describe('useLessonSearch — keepPreviousData persistence (C59)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('keeps the previous data.pages while the next filter-changed query is in flight', async () => {
    // Build a row factory that matches the RpcRow shape mapRowToLesson expects.
    const makeRow = (id: string, total: number) => ({
      lesson_id: id,
      title: `Lesson ${id}`,
      summary: '',
      file_link: '',
      grade_levels: [],
      metadata: {},
      total_count: total,
    });

    // First filter resolves immediately; the second never resolves (in flight).
    let resolveSecond: ((value: { data: unknown; error: null }) => void) | undefined;
    rpcMock.mockResolvedValueOnce({ data: [makeRow('a', 1)], error: null }).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveSecond = resolve;
        })
    );

    const { result, rerender } = renderHook(
      ({ filters }: { filters: SearchFilters }) => useLessonSearch({ filters }),
      {
        wrapper: createWrapper(),
        initialProps: { filters: makeFilters({ query: 'first' }) },
      }
    );

    // First query resolves with the 'a' lesson.
    await waitFor(() => {
      expect(result.current.data?.pages[0].lessons[0].lessonId).toBe('a');
    });

    // Change the filter → a NEW query starts (the second, never-resolving rpc).
    rerender({ filters: makeFilters({ query: 'second' }) });

    // With placeholderData: keepPreviousData, the prior data.pages stay visible
    // while the new query is fetching (instead of blanking to undefined).
    await waitFor(() => {
      expect(result.current.isPlaceholderData).toBe(true);
    });
    expect(result.current.data?.pages[0].lessons[0].lessonId).toBe('a');

    // Cleanup: let the pending promise settle so the test runner doesn't hang.
    resolveSecond?.({ data: [makeRow('b', 1)], error: null });
  });
});

describe('useLessonSearch — C58 sort wiring (order_by + queryKey)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    rpcMock.mockResolvedValue({ data: [], error: null });
  });

  it('passes the active sort through to the RPC as order_by', async () => {
    const params = await getRpcParamsWithSort(makeFilters({ query: 'compost' }), 'title');
    expect(params.order_by).toBe('title');
  });

  it('passes order_by="modified" when the modified sort is active', async () => {
    const params = await getRpcParamsWithSort(makeFilters({ query: 'compost' }), 'modified');
    expect(params.order_by).toBe('modified');
  });

  it('defaults order_by to relevance when no sort is supplied', async () => {
    // The hook is called without a sortBy (parity with today's SearchPage
    // before this wiring) — it should still send a defined relevance value.
    const params = await getRpcParams(makeFilters({ query: 'compost' }));
    expect(params.order_by).toBe('relevance');
  });

  it('refetches with the new order_by when the sort changes (sortBy is in the queryKey)', async () => {
    rpcMock.mockResolvedValue({ data: [], error: null });

    const { rerender } = renderHook(
      ({ sortBy }: { sortBy: ViewState['sortBy'] }) =>
        useLessonSearch({ filters: makeFilters({ query: 'compost' }), sortBy }),
      { wrapper: createWrapper(), initialProps: { sortBy: 'relevance' as ViewState['sortBy'] } }
    );

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledTimes(1);
    });
    expect((rpcMock.mock.calls[0][1] as Record<string, unknown>).order_by).toBe('relevance');

    // A sort change must produce a NEW query (refetch) — only possible if sortBy
    // participates in the queryKey.
    rerender({ sortBy: 'title' as ViewState['sortBy'] });

    await waitFor(() => {
      expect(rpcMock).toHaveBeenCalledTimes(2);
    });
    expect((rpcMock.mock.calls[1][1] as Record<string, unknown>).order_by).toBe('title');
  });
});
