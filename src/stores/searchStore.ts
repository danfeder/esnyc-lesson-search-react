import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { SearchFilters, ViewState } from '../types';

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
  lessonFormat: '', // Single-select dropdown, empty string = all
  academicIntegration: [],
  socialEmotionalLearning: [],
  cookingMethods: '', // Single-select, empty string = all
};

const initialViewState: ViewState = {
  sortBy: 'relevance',
  resultsPerPage: 20,
  currentPage: 1,
};

export const useSearchStore = create<SearchState>()(
  devtools(
    (set, get) => ({
      // Initial state
      filters: initialFilters,
      viewState: initialViewState,

      // Actions
      setFilters: (newFilters) =>
        set((state) => ({
          filters: { ...state.filters, ...newFilters },
          viewState: { ...state.viewState, currentPage: 1 }, // Reset to first page
          results: [], // Clear results when filters change
          hasMore: true,
        })),

      clearFilters: () =>
        set({
          filters: initialFilters,
          viewState: { ...initialViewState },
          results: [],
          hasMore: true,
        }),

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
