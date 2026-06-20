import { render, screen, act, renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ScreenReaderAnnouncer } from './ScreenReaderAnnouncer';
import { useSearchStore } from '@/stores/searchStore';
import type { SearchFilters } from '@/types';

// Drive the component through the REAL zustand store (matching IntActivePills.test.tsx):
// reset filters, set the partial under test, render, then assert on the live-region text.
function setFilters(partial: Partial<SearchFilters>) {
  const { result } = renderHook(() => useSearchStore());
  act(() => {
    result.current.setFilters(partial);
  });
}

// The polite live region (role="status") carries the filter-update announcement.
function announcement(): string {
  return screen.getByRole('status').textContent ?? '';
}

describe('ScreenReaderAnnouncer', () => {
  beforeEach(() => {
    const { result } = renderHook(() => useSearchStore());
    act(() => {
      result.current.clearFilters();
    });
  });

  it('reaches the "All filters cleared" branch when no filters are active', () => {
    // No query, no array filters set — every filter is empty.
    render(<ScreenReaderAnnouncer totalCount={42} />);

    expect(announcement()).toBe('All filters cleared. Showing all 42 lessons.');
  });

  it('does not emit a phantom "cooking method" fragment when cookingMethods is empty', () => {
    render(<ScreenReaderAnnouncer totalCount={42} />);

    expect(announcement()).not.toMatch(/cooking method/i);
  });

  it('announces an active cookingMethods filter with the sibling count phrasing', () => {
    setFilters({ cookingMethods: ['stovetop', 'oven'] });
    render(<ScreenReaderAnnouncer totalCount={7} />);

    // Matches the sibling array branches (e.g. "2 grade levels", "3 seasons").
    expect(announcement()).toBe('Filters updated: 2 cooking methods. Found 7 lessons.');
  });

  // R2-6: under C59's keepPreviousData, totalCount lags one fetch (and is the
  // `|| 0` fallback on cold load), so the announcer must stay silent while the
  // search is pending/placeholder and only announce the settled count.
  it('stays silent while suppressed (pending/placeholder)', () => {
    render(<ScreenReaderAnnouncer totalCount={0} suppressed />);

    // No premature "Showing all 0 lessons." while data is still in flight.
    expect(announcement()).toBe('');
  });

  it('announces the settled count once suppression lifts', () => {
    const { rerender } = render(<ScreenReaderAnnouncer totalCount={0} suppressed />);
    expect(announcement()).toBe('');

    // Data settles: suppression off + the real count arrives → one correct announce.
    rerender(<ScreenReaderAnnouncer totalCount={42} suppressed={false} />);
    expect(announcement()).toBe('All filters cleared. Showing all 42 lessons.');
  });
});
