import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useSearchStore } from '@/stores/searchStore';

vi.mock('@/hooks/useEnhancedAuth', () => ({
  useEnhancedAuth: () => ({ user: null, hasPermission: () => false, loading: false }),
}));

import { Header } from '@/components/Layout/Header';

const renderHeader = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Header />
    </MemoryRouter>
  );
const input = () => screen.getByRole('textbox', { name: /search lessons/i });
const storeQuery = () => useSearchStore.getState().filters.query;
const advance = (ms: number) => {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
};

describe('HeaderSearch debounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useSearchStore.getState().clearFilters();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes the store only after 300 ms of quiet', () => {
    renderHeader();

    fireEvent.change(input(), { target: { value: 'gar' } });
    advance(299);
    expect(storeQuery()).toBe('');

    advance(1);
    expect(storeQuery()).toBe('gar');
  });

  it('collapses rapid typing into one store write with the final value', () => {
    renderHeader();
    const writes: string[] = [];
    const unsub = useSearchStore.subscribe((s) => writes.push(s.filters.query));

    fireEvent.change(input(), { target: { value: 't' } });
    advance(100);
    fireEvent.change(input(), { target: { value: 'to' } });
    advance(100);
    fireEvent.change(input(), { target: { value: 'tom' } });
    advance(300);

    expect(writes).toEqual(['tom']);
    unsub();
  });

  it('reflects an external store change in the input without echoing it back', () => {
    renderHeader();

    act(() => {
      useSearchStore.getState().setFilters({ query: 'beans' });
    });
    expect(input()).toHaveValue('beans');

    // Subscribe AFTER the external write — that write itself notifies.
    let extraWrites = 0;
    const unsub = useSearchStore.subscribe(() => {
      extraWrites += 1;
    });
    advance(300);

    expect(storeQuery()).toBe('beans');
    expect(extraWrites).toBe(0);
    unsub();
  });

  it('does not resurrect a pending query when Clear is clicked inside the window', () => {
    renderHeader();

    fireEvent.change(input(), { target: { value: 'tomato' } });
    advance(100);
    fireEvent.click(screen.getByRole('button', { name: /clear search/i }));

    expect(storeQuery()).toBe('');
    expect(input()).toHaveValue('');

    advance(300);
    expect(storeQuery()).toBe('');
    expect(input()).toHaveValue('');
  });

  it('renders no search input off the search routes', () => {
    renderHeader('/review');

    expect(screen.queryByRole('textbox', { name: /search lessons/i })).toBeNull();
  });
});
