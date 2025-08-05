import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSearchStore } from './searchStore';
import type { SearchFilters, Lesson } from '@/types';

describe('searchStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useSearchStore());
    act(() => {
      result.current.clearFilters();
      result.current.setResults([], 0);
      result.current.setError(null);
      result.current.setHasMore(true);
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useSearchStore());

      expect(result.current.filters.query).toBe('');
      expect(result.current.filters.gradeLevels).toEqual([]);
      expect(result.current.filters.thematicCategories).toEqual([]);
      expect(result.current.results).toEqual([]);
      expect(result.current.totalCount).toBe(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.hasMore).toBe(true);
    });

    it('should have correct initial view state', () => {
      const { result } = renderHook(() => useSearchStore());

      expect(result.current.viewState.sortBy).toBe('relevance');
      expect(result.current.viewState.resultsPerPage).toBe(20);
      expect(result.current.viewState.currentPage).toBe(1);
    });
  });

  describe('Filter Management', () => {
    it('should update filters correctly', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setFilters({
          query: 'tomato',
          gradeLevels: ['3rd', '4th'],
        });
      });

      expect(result.current.filters.query).toBe('tomato');
      expect(result.current.filters.gradeLevels).toEqual(['3rd', '4th']);
    });

    it('should merge filters when setting partial filters', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setFilters({
          query: 'tomato',
          gradeLevels: ['3rd'],
        });
      });

      act(() => {
        result.current.setFilters({
          seasons: ['Spring'],
        });
      });

      expect(result.current.filters.query).toBe('tomato');
      expect(result.current.filters.gradeLevels).toEqual(['3rd']);
      expect(result.current.filters.seasons).toEqual(['Spring']);
    });

    it('should clear all filters', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setFilters({
          query: 'tomato',
          gradeLevels: ['3rd', '4th'],
          seasons: ['Spring'],
        });
      });

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters.query).toBe('');
      expect(result.current.filters.gradeLevels).toEqual([]);
      expect(result.current.filters.seasons).toEqual([]);
    });

    it('should reset page when filters change', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setViewState({ currentPage: 5 });
      });

      act(() => {
        result.current.setFilters({ query: 'tomato' });
      });

      expect(result.current.viewState.currentPage).toBe(1);
    });

    it('should clear results when filters change', () => {
      const { result } = renderHook(() => useSearchStore());

      const mockLessons: Lesson[] = [
        { id: '1', title: 'Test Lesson 1' } as Lesson,
        { id: '2', title: 'Test Lesson 2' } as Lesson,
      ];

      act(() => {
        result.current.setResults(mockLessons, 2);
      });

      act(() => {
        result.current.setFilters({ query: 'new search' });
      });

      expect(result.current.results).toEqual([]);
      expect(result.current.hasMore).toBe(true);
    });
  });

  describe('Filter Helpers', () => {
    it('should add filter value', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.addFilter('gradeLevels', '3rd');
      });

      expect(result.current.filters.gradeLevels).toContain('3rd');

      act(() => {
        result.current.addFilter('gradeLevels', '4th');
      });

      expect(result.current.filters.gradeLevels).toEqual(['3rd', '4th']);
    });

    it('should not add duplicate filter values', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.addFilter('gradeLevels', '3rd');
        result.current.addFilter('gradeLevels', '3rd');
      });

      expect(result.current.filters.gradeLevels).toEqual(['3rd']);
    });

    it('should remove filter value', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setFilters({
          gradeLevels: ['3rd', '4th', '5th'],
        });
      });

      act(() => {
        result.current.removeFilter('gradeLevels', '4th');
      });

      expect(result.current.filters.gradeLevels).toEqual(['3rd', '5th']);
    });

    it('should handle removing non-existent filter value', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setFilters({
          gradeLevels: ['3rd'],
        });
      });

      act(() => {
        result.current.removeFilter('gradeLevels', '4th');
      });

      expect(result.current.filters.gradeLevels).toEqual(['3rd']);
    });

    it('should toggle filter value', () => {
      const { result } = renderHook(() => useSearchStore());

      // Add value
      act(() => {
        result.current.toggleFilter('gradeLevels', '3rd');
      });

      expect(result.current.filters.gradeLevels).toContain('3rd');

      // Remove value
      act(() => {
        result.current.toggleFilter('gradeLevels', '3rd');
      });

      expect(result.current.filters.gradeLevels).not.toContain('3rd');
    });

    it('should reset page when using filter helpers', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setViewState({ currentPage: 3 });
      });

      act(() => {
        result.current.addFilter('gradeLevels', '3rd');
      });

      expect(result.current.viewState.currentPage).toBe(1);
    });
  });

  describe('Results Management', () => {
    it('should set results and total count', () => {
      const { result } = renderHook(() => useSearchStore());

      const mockLessons: Lesson[] = [
        { id: '1', title: 'Lesson 1' } as Lesson,
        { id: '2', title: 'Lesson 2' } as Lesson,
      ];

      act(() => {
        result.current.setResults(mockLessons, 10);
      });

      expect(result.current.results).toEqual(mockLessons);
      expect(result.current.totalCount).toBe(10);
      expect(result.current.hasMore).toBe(true);
    });

    it('should append results for pagination', () => {
      const { result } = renderHook(() => useSearchStore());

      const firstBatch: Lesson[] = [
        { id: '1', title: 'Lesson 1' } as Lesson,
        { id: '2', title: 'Lesson 2' } as Lesson,
      ];

      const secondBatch: Lesson[] = [
        { id: '3', title: 'Lesson 3' } as Lesson,
        { id: '4', title: 'Lesson 4' } as Lesson,
      ];

      act(() => {
        result.current.setResults(firstBatch, 4);
      });

      act(() => {
        result.current.appendResults(secondBatch);
      });

      expect(result.current.results).toHaveLength(4);
      expect(result.current.results[2].id).toBe('3');
      expect(result.current.hasMore).toBe(false);
    });

    it('should update hasMore correctly', () => {
      const { result } = renderHook(() => useSearchStore());

      const lessons: Lesson[] = Array.from(
        { length: 20 },
        (_, i) =>
          ({
            id: `${i + 1}`,
            title: `Lesson ${i + 1}`,
          }) as Lesson
      );

      act(() => {
        result.current.setResults(lessons, 20);
      });

      expect(result.current.hasMore).toBe(false);

      act(() => {
        result.current.setResults(lessons.slice(0, 10), 20);
      });

      expect(result.current.hasMore).toBe(true);
    });

    it('should clear error when setting results', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setError('Test error');
      });

      act(() => {
        result.current.setResults([], 0);
      });

      expect(result.current.error).toBeNull();
    });
  });

  describe('Loading States', () => {
    it('should set loading state', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setLoading(true);
      });

      expect(result.current.isLoading).toBe(true);

      act(() => {
        result.current.setLoading(false);
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should set loading more state', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setLoadingMore(true);
      });

      expect(result.current.isLoadingMore).toBe(true);

      act(() => {
        result.current.setLoadingMore(false);
      });

      expect(result.current.isLoadingMore).toBe(false);
    });

    it('should clear loading states when setting error', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setLoading(true);
        result.current.setLoadingMore(true);
      });

      act(() => {
        result.current.setError('Network error');
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.isLoadingMore).toBe(false);
      expect(result.current.error).toBe('Network error');
    });
  });

  describe('View State Management', () => {
    it('should update view state', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setViewState({
          sortBy: 'date',
          resultsPerPage: 50,
        });
      });

      expect(result.current.viewState.sortBy).toBe('date');
      expect(result.current.viewState.resultsPerPage).toBe(50);
    });

    it('should merge view state updates', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setViewState({ sortBy: 'date' });
      });

      act(() => {
        result.current.setViewState({ resultsPerPage: 50 });
      });

      expect(result.current.viewState.sortBy).toBe('date');
      expect(result.current.viewState.resultsPerPage).toBe(50);
      expect(result.current.viewState.currentPage).toBe(1);
    });

    it('should reset view state when clearing filters', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setViewState({
          sortBy: 'date',
          currentPage: 5,
          resultsPerPage: 50,
        });
      });

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.viewState.sortBy).toBe('relevance');
      expect(result.current.viewState.currentPage).toBe(1);
      expect(result.current.viewState.resultsPerPage).toBe(20);
    });
  });

  describe('Complex Filter Scenarios', () => {
    it('should handle multiple filter types simultaneously', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setFilters({
          query: 'cooking',
          gradeLevels: ['3rd', '4th'],
          seasons: ['Spring', 'Summer'],
          location: ['Indoor'],
          includeAllSeasons: true,
        });
      });

      expect(result.current.filters.query).toBe('cooking');
      expect(result.current.filters.gradeLevels).toEqual(['3rd', '4th']);
      expect(result.current.filters.seasons).toEqual(['Spring', 'Summer']);
      expect(result.current.filters.location).toEqual(['Indoor']);
      expect(result.current.filters.includeAllSeasons).toBe(true);
    });

    it('should handle single-select dropdown filters', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setFilters({
          lessonFormat: 'single-period',
          cookingMethods: 'no-cook',
        });
      });

      expect(result.current.filters.lessonFormat).toBe('single-period');
      expect(result.current.filters.cookingMethods).toBe('no-cook');

      // Should overwrite, not append
      act(() => {
        result.current.setFilters({
          lessonFormat: 'multi-session',
        });
      });

      expect(result.current.filters.lessonFormat).toBe('multi-session');
    });

    it('should maintain filter integrity across operations', () => {
      const { result } = renderHook(() => useSearchStore());

      // Set initial filters
      act(() => {
        result.current.setFilters({
          query: 'garden',
          gradeLevels: ['3rd', '4th', '5th'],
        });
      });

      // Add filter using helper
      act(() => {
        result.current.addFilter('thematicCategories', 'Plant Growth');
      });

      // Remove filter using helper
      act(() => {
        result.current.removeFilter('gradeLevels', '4th');
      });

      // Toggle filter
      act(() => {
        result.current.toggleFilter('seasons', 'Spring');
      });

      expect(result.current.filters.query).toBe('garden');
      expect(result.current.filters.gradeLevels).toEqual(['3rd', '5th']);
      expect(result.current.filters.thematicCategories).toEqual(['Plant Growth']);
      expect(result.current.filters.seasons).toEqual(['Spring']);
    });
  });

  describe('Error Handling', () => {
    it('should set and clear errors', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setError('Network error occurred');
      });

      expect(result.current.error).toBe('Network error occurred');

      act(() => {
        result.current.setError(null);
      });

      expect(result.current.error).toBeNull();
    });

    it('should clear error when performing new search', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setError('Previous error');
      });

      act(() => {
        result.current.setFilters({ query: 'new search' });
      });

      // Error should be preserved until new results arrive
      expect(result.current.error).toBe('Previous error');

      act(() => {
        result.current.setResults([], 0);
      });

      expect(result.current.error).toBeNull();
    });
  });
});
