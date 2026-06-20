import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMediaQuery } from './useMediaQuery';

// A controllable MediaQueryList stand-in: tracks the registered `change`
// listener so a test can flip `matches` and dispatch like a real viewport resize.
function installMatchMedia(initialMatches: boolean) {
  let currentMatches = initialMatches;
  let changeHandler: ((e: MediaQueryListEvent) => void) | null = null;

  const mql = {
    get matches() {
      return currentMatches;
    },
    media: '',
    onchange: null,
    addEventListener: vi.fn((event: string, handler: (e: MediaQueryListEvent) => void) => {
      if (event === 'change') changeHandler = handler;
    }),
    removeEventListener: vi.fn((event: string) => {
      if (event === 'change') changeHandler = null;
    }),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  };

  const original = window.matchMedia;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    ...mql,
    media: query,
  })) as unknown as typeof window.matchMedia;

  return {
    setMatches(next: boolean) {
      currentMatches = next;
      changeHandler?.({ matches: next } as MediaQueryListEvent);
    },
    get mql() {
      return mql;
    },
    restore() {
      window.matchMedia = original;
    },
  };
}

describe('useMediaQuery', () => {
  let env: ReturnType<typeof installMatchMedia> | undefined;

  afterEach(() => {
    env?.restore();
    env = undefined;
    vi.clearAllMocks();
  });

  it('returns the current match on mount', () => {
    env = installMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(min-width: 1100px)'));
    expect(result.current).toBe(true);
  });

  it('updates when the media query change event fires', () => {
    env = installMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(min-width: 1100px)'));
    expect(result.current).toBe(false);

    act(() => {
      env!.setMatches(true);
    });

    expect(result.current).toBe(true);
  });

  it('unsubscribes the change listener on unmount', () => {
    env = installMatchMedia(true);
    const { unmount } = renderHook(() => useMediaQuery('(min-width: 1100px)'));
    unmount();
    expect(env.mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
