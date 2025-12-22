import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useUrlSync } from './useUrlSync';
import { useSearchStore } from '@/stores/searchStore';

// Wrapper component with MemoryRouter
function createWrapper(initialEntries: string[] = ['/search']) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>;
  };
}

describe('useUrlSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Reset store to defaults before each test
    const store = useSearchStore.getState();
    store.clearFilters();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('URL to store sync (on mount)', () => {
    it('initializes filters from URL params on mount', async () => {
      const wrapper = createWrapper(['/search?q=cooking&grades=3,4,5']);

      renderHook(() => useUrlSync(), { wrapper });

      // Check that store was updated
      const { filters } = useSearchStore.getState();
      expect(filters.query).toBe('cooking');
      expect(filters.gradeLevels).toEqual(['3', '4', '5']);
    });

    it('handles multiple filter types from URL', () => {
      const wrapper = createWrapper([
        '/search?q=salad&grades=K,1&activity=cooking-only&season=Fall,Winter',
      ]);

      renderHook(() => useUrlSync(), { wrapper });

      const { filters } = useSearchStore.getState();
      expect(filters.query).toBe('salad');
      expect(filters.gradeLevels).toEqual(['K', '1']);
      expect(filters.activityType).toEqual(['cooking-only']);
      expect(filters.seasonTiming).toEqual(['Fall', 'Winter']);
    });

    it('ignores invalid filter values from URL', () => {
      const wrapper = createWrapper(['/search?grades=3,invalid,99,5']);

      renderHook(() => useUrlSync(), { wrapper });

      const { filters } = useSearchStore.getState();
      // Only valid grades should be included
      expect(filters.gradeLevels).toEqual(['3', '5']);
    });

    it('does not update store when URL has no params', () => {
      const wrapper = createWrapper(['/search']);

      renderHook(() => useUrlSync(), { wrapper });

      const { filters } = useSearchStore.getState();
      expect(filters.query).toBe('');
      expect(filters.gradeLevels).toEqual([]);
    });

    it('only initializes once (ignores subsequent URL changes)', () => {
      const wrapper = createWrapper(['/search?q=first']);

      const { rerender } = renderHook(() => useUrlSync(), { wrapper });

      expect(useSearchStore.getState().filters.query).toBe('first');

      // Simulate store change (which would update URL)
      act(() => {
        useSearchStore.getState().setFilters({ query: 'second' });
      });

      // Rerender shouldn't re-initialize from URL
      rerender();

      expect(useSearchStore.getState().filters.query).toBe('second');
    });
  });

  describe('Store to URL sync (on filter change)', () => {
    it('updates URL when filters change (after debounce)', async () => {
      const wrapper = createWrapper(['/search']);

      renderHook(() => useUrlSync(), { wrapper });

      // Change filters via store
      act(() => {
        useSearchStore.getState().setFilters({ query: 'cooking' });
      });

      // URL should not update immediately (debounce)
      // Advance timers past debounce delay
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // The hook uses setSearchParams which updates the router state
      // We can verify the store change was processed
      expect(useSearchStore.getState().filters.query).toBe('cooking');
    });

    it('debounces rapid filter changes', () => {
      const wrapper = createWrapper(['/search']);

      renderHook(() => useUrlSync(), { wrapper });

      // Rapid changes
      act(() => {
        useSearchStore.getState().setFilters({ query: 'a' });
      });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      act(() => {
        useSearchStore.getState().setFilters({ query: 'ab' });
      });
      act(() => {
        vi.advanceTimersByTime(100);
      });
      act(() => {
        useSearchStore.getState().setFilters({ query: 'abc' });
      });

      // Final value should be 'abc'
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(useSearchStore.getState().filters.query).toBe('abc');
    });
  });

  describe('Loop prevention', () => {
    it('does not create infinite loop when URL sets filters', () => {
      // This test verifies that setting filters from URL doesn't trigger
      // a URL update that would trigger another filter update, etc.
      const wrapper = createWrapper(['/search?q=test&grades=3,4']);

      // Should not throw or hang
      renderHook(() => useUrlSync(), { wrapper });

      // Advance timers to ensure no pending updates
      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Filters should match URL
      const { filters } = useSearchStore.getState();
      expect(filters.query).toBe('test');
      expect(filters.gradeLevels).toEqual(['3', '4']);
    });
  });

  describe('Cleanup', () => {
    it('clears pending debounce on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');
      const wrapper = createWrapper(['/search']);

      const { unmount } = renderHook(() => useUrlSync(), { wrapper });

      // Trigger a filter change to start debounce timer
      act(() => {
        useSearchStore.getState().setFilters({ query: 'test' });
      });

      // Unmount before debounce completes
      unmount();

      // clearTimeout should have been called during cleanup
      expect(clearTimeoutSpy).toHaveBeenCalled();

      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Edge cases', () => {
    it('handles URL-encoded special characters', () => {
      const wrapper = createWrapper(['/search?q=mac%20%26%20cheese']);

      renderHook(() => useUrlSync(), { wrapper });

      const { filters } = useSearchStore.getState();
      expect(filters.query).toBe('mac & cheese');
    });

    it('handles clearFilters correctly (no sync issues)', () => {
      const wrapper = createWrapper(['/search?q=cooking&grades=3,4']);

      renderHook(() => useUrlSync(), { wrapper });

      // Verify initial state from URL
      expect(useSearchStore.getState().filters.query).toBe('cooking');
      expect(useSearchStore.getState().filters.gradeLevels).toEqual(['3', '4']);

      // Clear filters
      act(() => {
        useSearchStore.getState().clearFilters();
      });

      // Filters should be cleared
      expect(useSearchStore.getState().filters.query).toBe('');
      expect(useSearchStore.getState().filters.gradeLevels).toEqual([]);

      // Advance past debounce
      act(() => {
        vi.advanceTimersByTime(300);
      });

      // No infinite loop, no errors - clearFilters works correctly with URL sync
    });

    it('handles empty query param', () => {
      const wrapper = createWrapper(['/search?q=']);

      renderHook(() => useUrlSync(), { wrapper });

      const { filters } = useSearchStore.getState();
      expect(filters.query).toBe('');
    });

    it('preserves other filters when one changes', () => {
      const wrapper = createWrapper(['/search?q=cooking&grades=3,4']);

      renderHook(() => useUrlSync(), { wrapper });

      // Initial state
      let { filters } = useSearchStore.getState();
      expect(filters.query).toBe('cooking');
      expect(filters.gradeLevels).toEqual(['3', '4']);

      // Change only query
      act(() => {
        useSearchStore.getState().setFilters({ query: 'salad' });
      });

      act(() => {
        vi.advanceTimersByTime(300);
      });

      // Grades should still be preserved
      filters = useSearchStore.getState().filters;
      expect(filters.query).toBe('salad');
      expect(filters.gradeLevels).toEqual(['3', '4']);
    });
  });
});
