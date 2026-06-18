import { render, screen, fireEvent, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { IntActivePills } from './IntActivePills';
import { useSearchStore } from '@/stores/searchStore';
import type { SearchFilters } from '@/types';

// Drive the component through the REAL zustand store (matching searchStore.test.ts):
// set filters via the store, render, then assert on DOM + on the store after a click.
function setFilters(partial: Partial<SearchFilters>) {
  const { result } = renderHook(() => useSearchStore());
  act(() => {
    result.current.setFilters(partial);
  });
}

function getFilters(): SearchFilters {
  const { result } = renderHook(() => useSearchStore());
  return result.current.filters;
}

const AUTO_CHIP_REMOVE_LABEL = 'Remove auto-applied grade filter and search all grades';

describe('IntActivePills', () => {
  beforeEach(() => {
    // Reset all filters between tests so persisted/leaked state doesn't bleed across cases.
    const { result } = renderHook(() => useSearchStore());
    act(() => {
      result.current.clearFilters();
    });
  });

  describe('auto-detected grade chip', () => {
    it('renders the auto chip with a single-grade label for one detected grade', () => {
      setFilters({ query: 'compost lesson for 3rd grade', gradeLevels: [] });
      render(<IntActivePills />);

      // The auto chip text (the "· auto" marker distinguishes it from an explicit grade pill).
      expect(screen.getByText('Grade 3 · auto')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: AUTO_CHIP_REMOVE_LABEL })).toBeInTheDocument();
    });

    it('renders a combined label for a detected range', () => {
      setFilters({ query: 'seeds grades K-2', gradeLevels: [] });
      render(<IntActivePills />);

      expect(screen.getByText('Grades K, 1, 2 · auto')).toBeInTheDocument();
    });

    it('does NOT render the auto chip when an explicit grade filter is set (explicit-wins)', () => {
      setFilters({ query: 'compost lesson for 3rd grade', gradeLevels: ['5'] });
      render(<IntActivePills />);

      expect(screen.queryByText(/· auto/)).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: AUTO_CHIP_REMOVE_LABEL })
      ).not.toBeInTheDocument();
    });

    it('does NOT render the auto chip for a plain query with no grade cue', () => {
      setFilters({ query: 'compost', gradeLevels: [] });
      render(<IntActivePills />);

      expect(screen.queryByText(/· auto/)).not.toBeInTheDocument();
    });

    it('dismissing the auto chip rewrites the query to the cleaned term', () => {
      setFilters({ query: 'compost lesson for 3rd grade', gradeLevels: [] });
      render(<IntActivePills />);

      const removeBtn = screen.getByRole('button', { name: AUTO_CHIP_REMOVE_LABEL });
      act(() => {
        fireEvent.click(removeBtn);
      });

      // Cleaned term = filler ("lesson"/"for") + routed grade ("3rd grade") stripped.
      expect(getFilters().query).toBe('compost');
    });

    it('dismissing a grade-only auto chip clears the search box entirely', () => {
      // "3rd grade" parses to cleanedQuery '' + detectedGrades ['3']: the whole
      // query was the grade cue, so dismissing the chip empties the box.
      setFilters({ query: '3rd grade', gradeLevels: [] });
      const { rerender } = render(<IntActivePills />);

      // The grade-only query still surfaces the auto chip (reachable via testid).
      expect(screen.getByTestId('auto-grade-chip')).toBeInTheDocument();
      expect(screen.getByText('Grade 3 · auto')).toBeInTheDocument();

      const removeBtn = screen.getByRole('button', { name: AUTO_CHIP_REMOVE_LABEL });
      act(() => {
        fireEvent.click(removeBtn);
      });

      // Box is cleared (cleanedQuery was '') and the chip no longer renders.
      expect(getFilters().query).toBe('');
      rerender(<IntActivePills />);
      expect(screen.queryByTestId('auto-grade-chip')).not.toBeInTheDocument();
    });
  });

  describe('regression — existing pills', () => {
    it('still renders the raw query pill and a filter pill', () => {
      setFilters({ query: 'tomatoes', thematicCategories: ['garden-basics'] });
      render(<IntActivePills />);

      // Raw query pill is quoted; no grade cue in "tomatoes" so no auto chip.
      expect(screen.getByText('"tomatoes"')).toBeInTheDocument();
      expect(screen.queryByText(/· auto/)).not.toBeInTheDocument();
      // Both the query pill and the thematic-category filter pill render their
      // own remove buttons (label resolved from FILTER_CONFIGS or the raw value).
      const removeButtons = screen.getAllByRole('button', { name: /^Remove / });
      expect(removeButtons).toHaveLength(2);
      expect(screen.getByRole('button', { name: 'Remove "tomatoes"' })).toBeInTheDocument();
    });

    it('removing the raw query pill clears the query in the store', () => {
      setFilters({ query: 'tomatoes' });
      render(<IntActivePills />);

      const removeBtn = screen.getByRole('button', { name: 'Remove "tomatoes"' });
      act(() => {
        fireEvent.click(removeBtn);
      });

      expect(getFilters().query).toBe('');
    });
  });
});
