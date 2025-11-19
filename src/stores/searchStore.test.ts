import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSearchStore } from './searchStore';
// Store now manages only filters and view state; server results are owned by React Query

describe('searchStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    const { result } = renderHook(() => useSearchStore());
    act(() => {
      result.current.clearFilters();
    });
  });

  describe('Initial State', () => {
    it('should have correct initial state', () => {
      const { result } = renderHook(() => useSearchStore());

      expect(result.current.filters.query).toBe('');
      expect(result.current.filters.gradeLevels).toEqual([]);
      expect(result.current.filters.thematicCategories).toEqual([]);
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
          seasonTiming: ['Spring'],
        });
      });

      expect(result.current.filters.query).toBe('tomato');
      expect(result.current.filters.gradeLevels).toEqual(['3rd']);
      expect(result.current.filters.seasonTiming).toEqual(['Spring']);
    });

    it('should clear all filters', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setFilters({
          query: 'tomato',
          gradeLevels: ['3rd', '4th'],
          seasonTiming: ['Spring'],
        });
      });

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters.query).toBe('');
      expect(result.current.filters.gradeLevels).toEqual([]);
      expect(result.current.filters.seasonTiming).toEqual([]);
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

    it('should clear paging when filters change', () => {
      const { result } = renderHook(() => useSearchStore());
      act(() => {
        result.current.setViewState({ currentPage: 3 });
      });

      act(() => {
        result.current.setFilters({ query: 'new search' });
      });

      expect(result.current.viewState.currentPage).toBe(1);
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

  // Results and loading are owned by React Query; store tests cover filters and view only.

  describe('View State Management', () => {
    it('should update view state', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setViewState({
          sortBy: 'modified',
          resultsPerPage: 50,
        });
      });

      expect(result.current.viewState.sortBy).toBe('modified');
      expect(result.current.viewState.resultsPerPage).toBe(50);
    });

    it('should merge view state updates', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setViewState({ sortBy: 'modified' });
      });

      act(() => {
        result.current.setViewState({ resultsPerPage: 50 });
      });

      expect(result.current.viewState.sortBy).toBe('modified');
      expect(result.current.viewState.resultsPerPage).toBe(50);
      expect(result.current.viewState.currentPage).toBe(1);
    });

    it('should reset view state when clearing filters', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setViewState({
          sortBy: 'modified',
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
          seasonTiming: ['Spring', 'Summer'],
          location: ['Indoor'],
        });
      });

      expect(result.current.filters.query).toBe('cooking');
      expect(result.current.filters.gradeLevels).toEqual(['3rd', '4th']);
      expect(result.current.filters.seasonTiming).toEqual(['Spring', 'Summer']);
      expect(result.current.filters.location).toEqual(['Indoor']);
    });

    it('should handle single-select dropdown filters', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setFilters({
          lessonFormat: 'single-period',
          cookingMethods: ['no-cook'],
        });
      });

      expect(result.current.filters.lessonFormat).toBe('single-period');
      expect(result.current.filters.cookingMethods).toEqual(['no-cook']);

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
        result.current.toggleFilter('seasonTiming', 'Spring');
      });

      expect(result.current.filters.query).toBe('garden');
      expect(result.current.filters.gradeLevels).toEqual(['3rd', '5th']);
      expect(result.current.filters.thematicCategories).toEqual(['Plant Growth']);
      expect(result.current.filters.seasonTiming).toEqual(['Spring']);
    });
  });

  // Error handling for server data is owned by React Query; store no longer manages error state
});
