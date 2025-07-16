import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { SearchFilters, ViewState, Lesson } from '../types';

interface SearchState {
  // Search state
  filters: SearchFilters;
  results: Lesson[];
  totalCount: number;
  isLoading: boolean;
  error: string | null;

  // View state
  viewState: ViewState;

  // Actions
  // eslint-disable-next-line no-unused-vars
  setFilters: (filters: Partial<SearchFilters>) => void;
  clearFilters: () => void;
  // eslint-disable-next-line no-unused-vars
  setResults: (results: Lesson[], totalCount: number) => void;
  // eslint-disable-next-line no-unused-vars
  setLoading: (loading: boolean) => void;
  // eslint-disable-next-line no-unused-vars
  setError: (error: string | null) => void;
  // eslint-disable-next-line no-unused-vars
  setViewState: (viewState: Partial<ViewState>) => void;

  // Filter helpers
  // eslint-disable-next-line no-unused-vars
  addFilter: (key: keyof SearchFilters, value: string) => void;
  // eslint-disable-next-line no-unused-vars
  removeFilter: (key: keyof SearchFilters, value: string) => void;
  // eslint-disable-next-line no-unused-vars
  toggleFilter: (key: keyof SearchFilters, value: string) => void;
}

const initialFilters: SearchFilters = {
  query: '',
  gradeLevels: [],
  thematicCategories: [],
  seasons: [],
  coreCompetencies: [],
  culturalHeritage: [],
  location: [],
  activityType: [],
  lessonFormat: [],
  includeAllSeasons: false,
};

const initialViewState: ViewState = {
  view: 'grid',
  sortBy: 'title',
  resultsPerPage: 20,
  currentPage: 1,
};

export const useSearchStore = create<SearchState>()(
  devtools(
    (set, get) => ({
      // Initial state
      filters: initialFilters,
      results: [],
      totalCount: 0,
      isLoading: false,
      error: null,
      viewState: initialViewState,

      // Actions
      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
          viewState: { ...state.viewState, currentPage: 1 }, // Reset to first page
        })),

      clearFilters: () =>
        set({
          filters: initialFilters,
          viewState: { ...initialViewState },
        }),

      setResults: (results, totalCount) => set({ results, totalCount, error: null }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error, isLoading: false }),

      setViewState: (newViewState) =>
        set((state) => ({
          viewState: { ...state.viewState, ...newViewState },
        })),

      // Filter helpers
      addFilter: (key, value) => {
        const { filters } = get();
        const currentValues = filters[key] as string[];

        if (Array.isArray(currentValues) && !currentValues.includes(value)) {
          set((state) => ({
            filters: {
              ...state.filters,
              [key]: [...currentValues, value],
            },
            viewState: { ...state.viewState, currentPage: 1 },
          }));
        }
      },

      removeFilter: (key, value) => {
        const { filters } = get();
        const currentValues = filters[key] as string[];

        if (Array.isArray(currentValues)) {
          set((state) => ({
            filters: {
              ...state.filters,
              [key]: currentValues.filter((v) => v !== value),
            },
            viewState: { ...state.viewState, currentPage: 1 },
          }));
        }
      },

      toggleFilter: (key, value) => {
        const { filters } = get();
        const currentValues = filters[key] as string[];

        if (Array.isArray(currentValues)) {
          const hasValue = currentValues.includes(value);
          set((state) => ({
            filters: {
              ...state.filters,
              [key]: hasValue
                ? currentValues.filter((v) => v !== value)
                : [...currentValues, value],
            },
            viewState: { ...state.viewState, currentPage: 1 },
          }));
        }
      },
    }),
    {
      name: 'search-store',
    }
  )
);
