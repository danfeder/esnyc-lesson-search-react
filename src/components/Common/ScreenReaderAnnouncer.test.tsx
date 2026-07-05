import { StrictMode } from 'react';
import { render, screen, act, renderHook } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ScreenReaderAnnouncer } from './ScreenReaderAnnouncer';
import { useSearchStore } from '@/stores/searchStore';
import type { SearchFilters } from '@/types';

// Apply a filter change through the REAL zustand store. Call AFTER rendering the
// component so it registers as a post-mount USER change — FP4 Brief 4 item 6:
// the announcer stays silent until the first real change after mount.
function change(partial: Partial<SearchFilters>) {
  const { result } = renderHook(() => useSearchStore());
  act(() => {
    result.current.setFilters(partial);
  });
}

function clearSelections() {
  const { result } = renderHook(() => useSearchStore());
  act(() => {
    result.current.clearFilterSelections();
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

  it('stays silent on mount with zero interaction (item 6)', () => {
    render(<ScreenReaderAnnouncer totalCount={703} />);

    // No phantom "All filters cleared. Showing all 703 lessons." on fresh load.
    expect(announcement()).toBe('');
  });

  it('stays silent on mount even under React.StrictMode (double-invoked effect)', () => {
    // StrictMode dev-double-invokes the effect; a one-shot "skip first run" latch
    // would be consumed by the discarded first pass and let the phantom through
    // on the second. The value-comparison latch must keep mount silent.
    render(
      <StrictMode>
        <ScreenReaderAnnouncer totalCount={703} />
      </StrictMode>
    );

    expect(announcement()).toBe('');
  });

  it('reaches the "All filters cleared" branch after the user clears an active filter', () => {
    render(<ScreenReaderAnnouncer totalCount={42} />);

    change({ gradeLevels: ['3rd'] }); // a real change wakes the announcer up
    clearSelections(); // back to no active filters

    expect(announcement()).toBe('All filters cleared. Showing all 42 lessons.');
  });

  it('does not emit a phantom "cooking method" fragment when cookingMethods is empty', () => {
    render(<ScreenReaderAnnouncer totalCount={42} />);

    change({ gradeLevels: ['3rd'] });

    expect(announcement()).not.toMatch(/cooking method/i);
  });

  it('announces an active cookingMethods filter with the sibling count phrasing', () => {
    render(<ScreenReaderAnnouncer totalCount={7} />);

    change({ cookingMethods: ['stovetop', 'oven'] });

    // Matches the sibling array branches (e.g. "2 grade levels", "3 seasons").
    expect(announcement()).toBe('Filters updated: 2 cooking methods. Found 7 lessons.');
  });

  // R2-6: under C59's keepPreviousData, totalCount lags one fetch (and is the
  // `|| 0` fallback on cold load), so the announcer must stay silent while the
  // search is pending/placeholder.
  it('stays silent while suppressed, even after a filter change (pending/placeholder)', () => {
    render(<ScreenReaderAnnouncer totalCount={0} suppressed />);

    change({ gradeLevels: ['3rd'] });

    // No premature "Found N lessons." while data is still in flight.
    expect(announcement()).toBe('');
  });

  it('stays silent when suppression lifts with no interaction, then speaks on the first change', () => {
    const { rerender } = render(<ScreenReaderAnnouncer totalCount={0} suppressed />);
    expect(announcement()).toBe('');

    // Data settles (suppression off, real count) but the user has not touched
    // anything → still silent (item 6: no phantom load announcement).
    rerender(<ScreenReaderAnnouncer totalCount={42} suppressed={false} />);
    expect(announcement()).toBe('');

    // First real change → one correct announcement.
    change({ gradeLevels: ['3rd'] });
    expect(announcement()).toBe('Filters updated: 1 grade levels. Found 42 lessons.');
  });
});
