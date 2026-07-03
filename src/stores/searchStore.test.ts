import { describe, it, expect, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useSearchStore } from './searchStore';
// Store now manages only filters and view state; server results are owned by React Query

describe('searchStore', () => {
  beforeEach(() => {
    // Reset store state before each test — including layout prefs that
    // clearFilters deliberately preserves and that persist might hydrate.
    const { result } = renderHook(() => useSearchStore());
    act(() => {
      result.current.clearFilters();
      result.current.setViewState({ view: 'list', density: 'comfy' });
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
      expect(result.current.viewState.currentPage).toBe(1);
      expect(result.current.viewState.view).toBe('list');
      expect(result.current.viewState.density).toBe('comfy');
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

    it('clearFilterSelections clears facets but KEEPS the query and sort (D-E)', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setFilters({
          query: 'compost',
          gradeLevels: ['3rd', '4th'],
          seasonTiming: ['Fall'],
        });
        result.current.setViewState({ sortBy: 'title', currentPage: 5 });
      });

      act(() => {
        result.current.clearFilterSelections();
      });

      // Facet selections cleared...
      expect(result.current.filters.gradeLevels).toEqual([]);
      expect(result.current.filters.seasonTiming).toEqual([]);
      // ...but the typed query and the sort choice SURVIVE (unlike clearFilters).
      expect(result.current.filters.query).toBe('compost');
      expect(result.current.viewState.sortBy).toBe('title');
      // Page reset like any filter change.
      expect(result.current.viewState.currentPage).toBe(1);
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
          density: 'compact',
        });
      });

      expect(result.current.viewState.sortBy).toBe('modified');
      expect(result.current.viewState.density).toBe('compact');
    });

    it('should merge view state updates', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setViewState({ sortBy: 'modified' });
      });

      act(() => {
        result.current.setViewState({ density: 'compact' });
      });

      expect(result.current.viewState.sortBy).toBe('modified');
      expect(result.current.viewState.density).toBe('compact');
      expect(result.current.viewState.currentPage).toBe(1);
    });

    it('should reset view state when clearing filters', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setViewState({
          sortBy: 'modified',
          currentPage: 5,
        });
      });

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.viewState.sortBy).toBe('relevance');
      expect(result.current.viewState.currentPage).toBe(1);
    });

    it('should update view and density', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setViewState({ view: 'grid', density: 'compact' });
      });

      expect(result.current.viewState.view).toBe('grid');
      expect(result.current.viewState.density).toBe('compact');
    });

    it('should not reset currentPage when changing view or density', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setViewState({ currentPage: 4 });
      });

      act(() => {
        result.current.setViewState({ view: 'split' });
      });

      expect(result.current.viewState.currentPage).toBe(4);
      expect(result.current.viewState.view).toBe('split');

      act(() => {
        result.current.setViewState({ density: 'ultra' });
      });

      expect(result.current.viewState.currentPage).toBe(4);
      expect(result.current.viewState.density).toBe('ultra');
    });

    it('should preserve view and density across clearFilters', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setViewState({ view: 'grid', density: 'compact' });
        result.current.setFilters({ query: 'tomato', gradeLevels: ['3rd'] });
      });

      act(() => {
        result.current.clearFilters();
      });

      expect(result.current.filters.query).toBe('');
      expect(result.current.filters.gradeLevels).toEqual([]);
      // Layout preferences survive "Clear all"
      expect(result.current.viewState.view).toBe('grid');
      expect(result.current.viewState.density).toBe('compact');
      // But non-layout view state still resets
      expect(result.current.viewState.currentPage).toBe(1);
      expect(result.current.viewState.sortBy).toBe('relevance');
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

  describe('hydrateUrlState (W1c URL → store)', () => {
    it('fully replaces filters, sets sort, and resets currentPage in one write', () => {
      const { result } = renderHook(() => useSearchStore());

      // Seed a stale filter + a non-relevance sort + a non-1 page.
      act(() => {
        result.current.setFilters({ cookingMethods: ['stovetop'] });
        result.current.setViewState({ sortBy: 'modified', currentPage: 5 });
      });

      expect(result.current.filters.cookingMethods).toEqual(['stovetop']);

      // Hydrate from a URL that only carries gradeLevels + sort 'title'.
      act(() => {
        result.current.hydrateUrlState({ gradeLevels: ['3'] }, 'title');
      });

      // FULL replace: gradeLevels set, the stale cookingMethods is now empty.
      expect(result.current.filters.gradeLevels).toEqual(['3']);
      expect(result.current.filters.cookingMethods).toEqual([]);
      // Every other filter resets to the empty default too.
      expect(result.current.filters.query).toBe('');
      expect(result.current.filters.seasonTiming).toEqual([]);
      // Sort + page applied in the same write.
      expect(result.current.viewState.sortBy).toBe('title');
      expect(result.current.viewState.currentPage).toBe(1);
    });

    it('clears all filters when hydrated with an empty partial', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setFilters({ query: 'tomato', gradeLevels: ['3rd'] });
      });

      act(() => {
        result.current.hydrateUrlState({}, 'relevance');
      });

      expect(result.current.filters.query).toBe('');
      expect(result.current.filters.gradeLevels).toEqual([]);
      expect(result.current.viewState.sortBy).toBe('relevance');
      expect(result.current.viewState.currentPage).toBe(1);
    });

    it('preserves layout preferences (view + density) across hydration', () => {
      const { result } = renderHook(() => useSearchStore());

      act(() => {
        result.current.setViewState({ view: 'grid', density: 'compact' });
      });

      act(() => {
        result.current.hydrateUrlState({ query: 'salad' }, 'title');
      });

      expect(result.current.filters.query).toBe('salad');
      expect(result.current.viewState.view).toBe('grid');
      expect(result.current.viewState.density).toBe('compact');
    });
  });

  // Error handling for server data is owned by React Query; store no longer manages error state
});
