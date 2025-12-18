import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useDebounce } from './useDebounce';

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial behavior', () => {
    it('returns initial value immediately', () => {
      const { result } = renderHook(() => useDebounce('initial', 300));

      expect(result.current).toBe('initial');
    });

    it('returns initial value before delay elapses', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'updated' });

      // Advance time but not enough
      act(() => {
        vi.advanceTimersByTime(200);
      });

      expect(result.current).toBe('initial');
    });
  });

  describe('delayed updates', () => {
    it('updates value after delay elapses', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'updated' });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current).toBe('updated');
    });

    it('uses the specified delay duration', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 500), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'updated' });

      // At 300ms, should still be initial
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(result.current).toBe('initial');

      // At 500ms total, should be updated
      act(() => {
        vi.advanceTimersByTime(200);
      });
      expect(result.current).toBe('updated');
    });
  });

  describe('rapid changes', () => {
    it('only returns final value when multiple changes occur within delay', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
        initialProps: { value: 'first' },
      });

      // Rapid changes
      rerender({ value: 'second' });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      rerender({ value: 'third' });
      act(() => {
        vi.advanceTimersByTime(100);
      });

      rerender({ value: 'fourth' });

      // Still showing first value
      expect(result.current).toBe('first');

      // After full delay from last change
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current).toBe('fourth');
    });

    it('resets timer on each value change', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'first' });

      // Advance 250ms (not enough)
      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(result.current).toBe('initial');

      // Change value again - timer should reset
      rerender({ value: 'second' });

      // Another 250ms (total 500ms from first change, but only 250ms from second)
      act(() => {
        vi.advanceTimersByTime(250);
      });
      expect(result.current).toBe('initial');

      // Final 50ms to complete the delay from second change
      act(() => {
        vi.advanceTimersByTime(50);
      });
      expect(result.current).toBe('second');
    });
  });

  describe('cleanup', () => {
    it('clears timeout on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      const { unmount, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'updated' });
      unmount();

      // clearTimeout should have been called during cleanup
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });
  });

  describe('edge cases', () => {
    it('handles zero delay', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 0), {
        initialProps: { value: 'initial' },
      });

      rerender({ value: 'updated' });

      act(() => {
        vi.advanceTimersByTime(0);
      });

      expect(result.current).toBe('updated');
    });

    it('works with different value types - numbers', () => {
      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
        initialProps: { value: 42 },
      });

      expect(result.current).toBe(42);

      rerender({ value: 100 });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current).toBe(100);
    });

    it('works with different value types - objects', () => {
      const initialObj = { name: 'test' };
      const updatedObj = { name: 'updated' };

      const { result, rerender } = renderHook(({ value }) => useDebounce(value, 300), {
        initialProps: { value: initialObj },
      });

      expect(result.current).toEqual(initialObj);

      rerender({ value: updatedObj });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current).toEqual(updatedObj);
    });
  });
});
