import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLessonStats } from './useLessonStats';
import { supabase } from '@/lib/supabase';
import { logger } from '@/utils/logger';
import { TOTAL_FILTER_CATEGORIES } from '@/utils/filterDefinitions';

// Get the mocked supabase
const mockSupabase = vi.mocked(supabase);

// Mock the logger
vi.mock('@/utils/logger', () => ({
  logger: {
    error: vi.fn(),
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

// Typed mock helper for Supabase select queries
interface MockSelectResult {
  count: number | null;
  error: { message: string } | null;
}

function createMockSelectQuery(result: MockSelectResult | Promise<MockSelectResult>) {
  const selectMock = vi
    .fn()
    .mockReturnValue(result instanceof Promise ? result : Promise.resolve(result));
  return {
    mock: selectMock,
    chain: { select: selectMock } as unknown as ReturnType<typeof supabase.from>,
  };
}

describe('useLessonStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('returns loading true initially', () => {
      // Setup mock that doesn't resolve immediately
      const { chain } = createMockSelectQuery(new Promise(() => {}));
      mockSupabase.from.mockReturnValue(chain);

      const { result } = renderHook(() => useLessonStats());

      expect(result.current.isLoading).toBe(true);
    });

    it('returns totalCategories from TOTAL_FILTER_CATEGORIES constant', () => {
      // Setup mock that doesn't resolve immediately
      const { chain } = createMockSelectQuery(new Promise(() => {}));
      mockSupabase.from.mockReturnValue(chain);

      const { result } = renderHook(() => useLessonStats());

      expect(result.current.totalCategories).toBe(TOTAL_FILTER_CATEGORIES);
    });
  });

  describe('successful fetch', () => {
    it('returns lesson count from database', async () => {
      const { chain } = createMockSelectQuery({ count: 831, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const { result } = renderHook(() => useLessonStats());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.totalLessons).toBe(831);
    });

    it('sets isLoading to false after fetch', async () => {
      const { chain } = createMockSelectQuery({ count: 100, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const { result } = renderHook(() => useLessonStats());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('returns null error on success', async () => {
      const { chain } = createMockSelectQuery({ count: 500, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const { result } = renderHook(() => useLessonStats());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
    });

    it('calls supabase with correct parameters', async () => {
      const { mock, chain } = createMockSelectQuery({ count: 100, error: null });
      mockSupabase.from.mockReturnValue(chain);

      renderHook(() => useLessonStats());

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('lessons_with_metadata');
      });

      expect(mock).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    });
  });

  describe('error handling', () => {
    it('sets error message on fetch failure', async () => {
      // Supabase errors are plain objects, not Error instances
      // The hook throws the error, which gets caught and uses fallback message
      const { chain } = createMockSelectQuery({
        count: null,
        error: { message: 'Database connection failed' },
      });
      mockSupabase.from.mockReturnValue(chain);

      const { result } = renderHook(() => useLessonStats());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Supabase error objects aren't Error instances, so fallback message is used
      expect(result.current.error).toBe('Failed to fetch stats');
    });

    it('sets isLoading to false on error', async () => {
      const { chain } = createMockSelectQuery({
        count: null,
        error: { message: 'Error' },
      });
      mockSupabase.from.mockReturnValue(chain);

      const { result } = renderHook(() => useLessonStats());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('preserves totalCategories on error', async () => {
      const { chain } = createMockSelectQuery({
        count: null,
        error: { message: 'Error' },
      });
      mockSupabase.from.mockReturnValue(chain);

      const { result } = renderHook(() => useLessonStats());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.totalCategories).toBe(TOTAL_FILTER_CATEGORIES);
    });

    it('handles thrown exceptions', async () => {
      const selectMock = vi.fn().mockRejectedValue(new Error('Network error'));
      mockSupabase.from.mockReturnValue({ select: selectMock } as unknown as ReturnType<
        typeof supabase.from
      >);

      const { result } = renderHook(() => useLessonStats());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
    });

    it('handles non-Error exceptions with fallback message', async () => {
      const selectMock = vi.fn().mockRejectedValue('string error');
      mockSupabase.from.mockReturnValue({ select: selectMock } as unknown as ReturnType<
        typeof supabase.from
      >);

      const { result } = renderHook(() => useLessonStats());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch stats');
    });

    it('logs error when fetch fails', async () => {
      const testError = new Error('Network error');
      const selectMock = vi.fn().mockRejectedValue(testError);
      mockSupabase.from.mockReturnValue({ select: selectMock } as unknown as ReturnType<
        typeof supabase.from
      >);

      renderHook(() => useLessonStats());

      await waitFor(() => {
        expect(logger.error).toHaveBeenCalledWith('Error fetching lesson stats:', testError);
      });
    });
  });

  describe('edge cases', () => {
    it('handles null count from database (returns 0)', async () => {
      const { chain } = createMockSelectQuery({ count: null, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const { result } = renderHook(() => useLessonStats());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.totalLessons).toBe(0);
    });

    it('handles zero count', async () => {
      const { chain } = createMockSelectQuery({ count: 0, error: null });
      mockSupabase.from.mockReturnValue(chain);

      const { result } = renderHook(() => useLessonStats());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.totalLessons).toBe(0);
      expect(result.current.error).toBeNull();
    });
  });
});
