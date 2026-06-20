import { useEffect, useState } from 'react';

/**
 * Subscribe to a CSS media query and return whether it currently matches.
 *
 * SSR/jsdom-safe: if `window` or `matchMedia` is unavailable, returns `false`
 * and never subscribes. On the client it reads the current match and updates on
 * viewport changes via the MediaQueryList `change` event.
 *
 * @param query A media query string, e.g. `'(min-width: 1100px)'`.
 * @returns `true` when the query currently matches, else `false`.
 */
export function useMediaQuery(query: string): boolean {
  const getMatches = (): boolean => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(query).matches;
  };

  const [matches, setMatches] = useState<boolean>(getMatches);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mql = window.matchMedia(query);
    // Re-sync in case the viewport changed between the initial render and the
    // effect running (e.g. hydration), then subscribe to subsequent changes.
    setMatches(mql.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mql.addEventListener('change', handleChange);
    return () => {
      mql.removeEventListener('change', handleChange);
    };
  }, [query]);

  return matches;
}
