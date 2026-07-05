import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { StateStorage } from 'zustand/middleware';
import type { SearchFilters, ViewState } from '@/types';

// Lazy storage that re-reads window.localStorage on every call, so test setups
// that swap the mock after this module is imported continue to work. The
// default createJSONStorage helper captures the reference once at module load.
const lazyLocalStorage: StateStorage = {
  getItem: (name) => {
    if (typeof window === 'undefined') return null;
    try {
      return window.localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name, value) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(name, value);
    } catch {
      /* quota / privacy mode — silently drop */
    }
  },
  removeItem: (name) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(name);
    } catch {
      /* ignore */
    }
  },
};

interface SearchState {
  // Filters (UI state only)
  filters: SearchFilters;
  // View state
  viewState: ViewState;

  // Actions
  setFilters: (filters: Partial<SearchFilters>) => void;
  clearFilters: () => void;
  /**
   * D-E (2026-07-03 design decision): the Filters panel's "Clear all" clears
   * facet SELECTIONS only — the typed search query and the sort choice survive.
   * Distinct from `clearFilters`, which is a FULL reset (query + sort included)
   * used by tests/teardown, not by the UI.
   */
  clearFilterSelections: () => void;
  setViewState: (viewState: Partial<ViewState>) => void;
  // Atomic URL → store hydration (W1c): fully REPLACES filters (fields absent
  // from the URL reset to their empty default — so Back-to-unfiltered clears
  // stale filters that a partial setFilters merge would keep) and applies
  // sort + page reset in ONE write (one render, one query-key change).
  hydrateUrlState: (urlFilters: Partial<SearchFilters>, sortBy: ViewState['sortBy']) => void;

  // Filter helpers
  addFilter: (key: keyof SearchFilters, value: string) => void;
  removeFilter: (key: keyof SearchFilters, value: string) => void;
  toggleFilter: (key: keyof SearchFilters, value: string) => void;
}

// Exported so the URL-sync hook (useUrlSync) can build a COMPLETE SearchFilters
// from an incoming URL's validated partial when canonicalizing for the loop guard.
export const initialFilters: SearchFilters = {
  query: '',
  gradeLevels: [],
  thematicCategories: [],
  seasonTiming: [],
  coreCompetencies: [],
  culturalHeritage: [],
  location: [],
  activityType: [],
  mainIngredients: [],
  academicIntegration: [],
  socialEmotionalLearning: [],
  cookingMethods: [], // Multi-select, empty array = all
};

const initialViewState: ViewState = {
  sortBy: 'relevance',
  view: 'list',
  density: 'comfy',
};

export const useSearchStore = create<SearchState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        filters: initialFilters,
        viewState: initialViewState,

        // Actions
        setFilters: (newFilters) =>
          set((state) => ({
            filters: { ...state.filters, ...newFilters },
          })),

        clearFilters: () =>
          set((state) => ({
            filters: initialFilters,
            // Preserve layout preferences (view + density) across a full reset.
            viewState: {
              ...initialViewState,
              view: state.viewState.view,
              density: state.viewState.density,
            },
          })),

        clearFilterSelections: () =>
          set((state) => ({
            // D-E: clear every facet filter but KEEP the typed query so the
            // Filters-panel "Clear all" doesn't wipe the user's search text.
            filters: { ...initialFilters, query: state.filters.query },
            // sortBy/view/density untouched; pagination resets on its own via
            // the React Query key (useLessonSearch), not a store field.
          })),

        setViewState: (newViewState) =>
          set((state) => ({
            viewState: { ...state.viewState, ...newViewState },
          })),

        hydrateUrlState: (urlFilters, sortBy) =>
          set((state) => ({
            // FULL replace — fields absent from the URL reset to empty.
            filters: { ...initialFilters, ...urlFilters },
            // filters + sort in ONE write (one render). Pagination restarts via
            // the React Query key, not a store field.
            viewState: { ...state.viewState, sortBy },
          })),

        // Filter helpers
        addFilter: (key, value) => {
          set((state) => {
            const currentValues = state.filters[key] as string[];
            if (Array.isArray(currentValues) && !currentValues.includes(value)) {
              return {
                filters: {
                  ...state.filters,
                  [key]: [...currentValues, value],
                },
              };
            }
            return state;
          });
        },

        removeFilter: (key, value) => {
          set((state) => {
            const currentValues = state.filters[key] as string[];
            // Mirror addFilter's no-op guard: only rebuild filters when the value
            // is actually present, so removing an absent value doesn't churn a
            // new object/render.
            if (Array.isArray(currentValues) && currentValues.includes(value)) {
              return {
                filters: {
                  ...state.filters,
                  [key]: currentValues.filter((v) => v !== value),
                },
              };
            }
            return state;
          });
        },

        toggleFilter: (key, value) => {
          set((state) => {
            const currentValues = state.filters[key] as string[];
            if (Array.isArray(currentValues)) {
              const hasValue = currentValues.includes(value);
              return {
                filters: {
                  ...state.filters,
                  [key]: hasValue
                    ? currentValues.filter((v) => v !== value)
                    : [...currentValues, value],
                },
              };
            }
            return state;
          });
        },
      }),
      {
        name: 'esy-search-ui',
        storage: {
          getItem: (name) => {
            const raw = lazyLocalStorage.getItem(name);
            if (typeof raw !== 'string' || raw.length === 0) return null;
            try {
              return JSON.parse(raw);
            } catch {
              return null;
            }
          },
          setItem: (name, value) => {
            lazyLocalStorage.setItem(name, JSON.stringify(value));
          },
          removeItem: (name) => {
            lazyLocalStorage.removeItem(name);
          },
        },
        // Only persist layout preferences, never filters/query/pagination
        partialize: (state) =>
          ({
            viewState: {
              view: state.viewState.view,
              density: state.viewState.density,
            },
          }) as SearchState,
        // Merge persisted layout into defaults so new fields stay current
        merge: (persisted, current) => {
          const p = persisted as { viewState?: Partial<ViewState> } | undefined;
          return {
            ...current,
            viewState: {
              ...current.viewState,
              ...(p?.viewState ?? {}),
            },
          };
        },
      }
    ),
    {
      name: 'search-store',
    }
  )
);
