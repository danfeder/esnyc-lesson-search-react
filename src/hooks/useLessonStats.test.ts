import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLessonStats } from './useLessonStats';
import { supabase } from '@/lib/supabase';

// Get the mocked supabase
const mockSupabase = vi.mocked(supabase);

describe('useLessonStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('returns loading true initially', () => {
      // Setup mock that doesn't resolve immediately
      const selectMock = vi.fn().mockReturnValue(new Promise(() => {}));
      mockSupabase.from.mockReturnValue({
        select: selectMock,
      } as any);

      const { result } = renderHook(() => useLessonStats());

      expect(result.current.isLoading).toBe(true);
    });

    it('returns totalCategories as 11 (hardcoded)', () => {
      // Setup mock that doesn't resolve immediately
      const selectMock = vi.fn().mockReturnValue(new Promise(() => {}));
      mockSupabase.from.mockReturnValue({
        select: selectMock,
      } as any);

      const { result } = renderHook(() => useLessonStats());

      expect(result.current.totalCategories).toBe(11);
    });
  });

  describe('successful fetch', () => {
    it('returns lesson count from database', async () => {
      const selectMock = vi.fn().mockResolvedValue({ count: 831, error: null });
      mockSupabase.from.mockReturnValue({
        select: selectMock,
      } as any);

      const { result } = renderHook(() => useLessonStats());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.totalLessons).toBe(831);
    });

    it('sets isLoading to false after fetch', async () => {
      const selectMock = vi.fn().mockResolvedValue({ count: 100, error: null });
      mockSupabase.from.mockReturnValue({
        select: selectMock,
      } as any);

      const { result } = renderHook(() => useLessonStats());

      expect(result.current.isLoading).toBe(true);

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('returns null error on success', async () => {
      const selectMock = vi.fn().mockResolvedValue({ count: 500, error: null });
      mockSupabase.from.mockReturnValue({
        select: selectMock,
      } as any);

      const { result } = renderHook(() => useLessonStats());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBeNull();
    });

    it('calls supabase with correct parameters', async () => {
      const selectMock = vi.fn().mockResolvedValue({ count: 100, error: null });
      mockSupabase.from.mockReturnValue({
        select: selectMock,
      } as any);

      renderHook(() => useLessonStats());

      await waitFor(() => {
        expect(mockSupabase.from).toHaveBeenCalledWith('lessons_with_metadata');
      });

      expect(selectMock).toHaveBeenCalledWith('*', { count: 'exact', head: true });
    });
  });

  describe('error handling', () => {
    it('sets error message on fetch failure', async () => {
      // Supabase errors are plain objects, not Error instances
      // The hook throws the error, which gets caught and uses fallback message
      const selectMock = vi.fn().mockResolvedValue({
        count: null,
        error: { message: 'Database connection failed' },
      });
      mockSupabase.from.mockReturnValue({
        select: selectMock,
      } as any);

      const { result } = renderHook(() => useLessonStats());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Supabase error objects aren't Error instances, so fallback message is used
      expect(result.current.error).toBe('Failed to fetch stats');
    });

    it('sets isLoading to false on error', async () => {
      const selectMock = vi.fn().mockResolvedValue({
        count: null,
        error: { message: 'Error' },
      });
      mockSupabase.from.mockReturnValue({
        select: selectMock,
      } as any);

      const { result } = renderHook(() => useLessonStats());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
    });

    it('preserves totalCategories on error', async () => {
      const selectMock = vi.fn().mockResolvedValue({
        count: null,
        error: { message: 'Error' },
      });
      mockSupabase.from.mockReturnValue({
        select: selectMock,
      } as any);

      const { result } = renderHook(() => useLessonStats());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.totalCategories).toBe(11);
    });

    it('handles thrown exceptions', async () => {
      const selectMock = vi.fn().mockRejectedValue(new Error('Network error'));
      mockSupabase.from.mockReturnValue({
        select: selectMock,
      } as any);

      const { result } = renderHook(() => useLessonStats());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Network error');
    });

    it('handles non-Error exceptions with fallback message', async () => {
      const selectMock = vi.fn().mockRejectedValue('string error');
      mockSupabase.from.mockReturnValue({
        select: selectMock,
      } as any);

      const { result } = renderHook(() => useLessonStats());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.error).toBe('Failed to fetch stats');
    });
  });

  describe('edge cases', () => {
    it('handles null count from database (returns 0)', async () => {
      const selectMock = vi.fn().mockResolvedValue({ count: null, error: null });
      mockSupabase.from.mockReturnValue({
        select: selectMock,
      } as any);

      const { result } = renderHook(() => useLessonStats());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.totalLessons).toBe(0);
    });

    it('handles zero count', async () => {
      const selectMock = vi.fn().mockResolvedValue({ count: 0, error: null });
      mockSupabase.from.mockReturnValue({
        select: selectMock,
      } as any);

      const { result } = renderHook(() => useLessonStats());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.totalLessons).toBe(0);
      expect(result.current.error).toBeNull();
    });
  });
});
