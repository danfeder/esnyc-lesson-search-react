import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFacetCounts, FACET_COLUMNS, FACET_CORPUS_MAX } from './useFacetCounts';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { initialFilters } from '@/stores/searchStore';

// The global setup file already mocks @/lib/supabase; override `from` per test.
const mockSupabase = vi.mocked(supabase);

vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

interface CorpusResult {
  data: unknown[] | null;
  error: { message: string } | null;
}

/**
 * Chain mock matching the hook's exact query shape:
 * from('lessons').select(FACET_COLUMNS).is('retired_at', null).limit(N)
 */
function createCorpusQueryMock(result: CorpusResult | Promise<CorpusResult>) {
  const promise = result instanceof Promise ? result : Promise.resolve(result);
  const limitMock = vi.fn().mockReturnValue(promise);
  const isMock = vi.fn().mockReturnValue({ limit: limitMock });
  const selectMock = vi.fn().mockReturnValue({ is: isMock });
  return {
    selectMock,
    isMock,
    limitMock,
    chain: { select: selectMock } as unknown as ReturnType<typeof supabase.from>,
  };
}

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  };
}

/** A corpus row in DB (snake_case) shape. */
function corpusRow(overrides: Record<string, string[] | null> = {}) {
  return {
    grade_levels: null,
    activity_type: null,
    location_requirements: null,
    thematic_categories: null,
    season_timing: null,
    core_competencies: null,
    cultural_heritage: null,
    academic_integration: null,
    social_emotional_learning: null,
    cooking_methods: null,
    ...overrides,
  };
}

describe('useFacetCounts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the slim corpus: lessons table, exact columns, retired-exclusion, explicit cap', async () => {
    const { selectMock, isMock, limitMock, chain } = createCorpusQueryMock({
      data: [],
      error: null,
    });
    mockSupabase.from.mockReturnValue(chain);

    const { result } = renderHook(() => useFacetCounts(initialFilters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current).toBeDefined());
    expect(mockSupabase.from).toHaveBeenCalledWith('lessons');
    expect(selectMock).toHaveBeenCalledWith(FACET_COLUMNS);
    // Pins the retired-exclusion parity with search_lessons' liveness gate.
    expect(isMock).toHaveBeenCalledWith('retired_at', null);
    expect(limitMock).toHaveBeenCalledWith(FACET_CORPUS_MAX);
  });

  it('returns undefined before the corpus resolves, computed counts after', async () => {
    let resolveCorpus!: (value: CorpusResult) => void;
    const pending = new Promise<CorpusResult>((resolve) => {
      resolveCorpus = resolve;
    });
    const { chain } = createCorpusQueryMock(pending);
    mockSupabase.from.mockReturnValue(chain);

    const { result } = renderHook(() => useFacetCounts(initialFilters), {
      wrapper: createWrapper(),
    });

    expect(result.current).toBeUndefined();

    resolveCorpus({
      data: [
        corpusRow({ activity_type: ['cooking'], grade_levels: ['K'] }),
        corpusRow({ activity_type: ['cooking'] }),
        corpusRow({ activity_type: ['garden'] }),
      ],
      error: null,
    });

    await waitFor(() => expect(result.current).toBeDefined());
    expect(result.current!.activityType).toEqual({ 'cooking-only': 2, 'garden-only': 1 });
    expect(result.current!.gradeLevels).toEqual({ K: 1 });
  });

  it('maps null columns to empty arrays without throwing', async () => {
    const { chain } = createCorpusQueryMock({ data: [corpusRow()], error: null });
    mockSupabase.from.mockReturnValue(chain);

    const { result } = renderHook(() => useFacetCounts(initialFilters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current).toBeDefined());
    expect(result.current!.activityType).toEqual({});
    expect(result.current!.location).toEqual({});
  });

  it('stays undefined on a supabase error (badges render blank, sidebar still works)', async () => {
    const { chain } = createCorpusQueryMock({ data: null, error: { message: 'boom' } });
    mockSupabase.from.mockReturnValue(chain);

    const { result } = renderHook(() => useFacetCounts(initialFilters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(logger.error).toHaveBeenCalled());
    expect(result.current).toBeUndefined();
  });

  it('warns via the truncation tripwire when the corpus hits the fetch cap', async () => {
    const cappedData = Array.from({ length: FACET_CORPUS_MAX }, () => corpusRow());
    const { chain } = createCorpusQueryMock({ data: cappedData, error: null });
    mockSupabase.from.mockReturnValue(chain);

    const { result } = renderHook(() => useFacetCounts(initialFilters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current).toBeDefined());
    expect(logger.warn).toHaveBeenCalledWith(
      'facet corpus hit fetch cap — counts may be truncated'
    );
  });
});
