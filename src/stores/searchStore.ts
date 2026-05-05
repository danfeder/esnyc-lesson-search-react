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
  setViewState: (viewState: Partial<ViewState>) => void;

  // Filter helpers
  addFilter: (key: keyof SearchFilters, value: string) => void;
  removeFilter: (key: keyof SearchFilters, value: string) => void;
  toggleFilter: (key: keyof SearchFilters, value: string) => void;
}

const initialFilters: SearchFilters = {
  query: '',
  gradeLevels: [],
  thematicCategories: [],
  seasonTiming: [],
  coreCompetencies: [],
  culturalHeritage: [],
  location: [],
  activityType: [],
  tags: [], // Multi-select, empty array = all (backed by lessons.tags column)
  academicIntegration: [],
  socialEmotionalLearning: [],
  cookingMethods: [], // Multi-select, empty array = all
};

const initialViewState: ViewState = {
  sortBy: 'relevance',
  resultsPerPage: 20,
  currentPage: 1,
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
            viewState: { ...state.viewState, currentPage: 1 }, // Reset to first page
          })),

        clearFilters: () =>
          set((state) => ({
            filters: initialFilters,
            // Preserve layout preferences (view + density) across "Clear all"
            viewState: {
              ...initialViewState,
              view: state.viewState.view,
              density: state.viewState.density,
            },
          })),

        setViewState: (newViewState) =>
          set((state) => ({
            viewState: { ...state.viewState, ...newViewState },
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
                viewState: { ...state.viewState, currentPage: 1 },
              };
            }
            return state;
          });
        },

        removeFilter: (key, value) => {
          set((state) => {
            const currentValues = state.filters[key] as string[];
            if (Array.isArray(currentValues)) {
              return {
                filters: {
                  ...state.filters,
                  [key]: currentValues.filter((v) => v !== value),
                },
                viewState: { ...state.viewState, currentPage: 1 },
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
                viewState: { ...state.viewState, currentPage: 1 },
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
