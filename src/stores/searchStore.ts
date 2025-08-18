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
  hasMore: boolean;
  isLoadingMore: boolean;

  // View state
  viewState: ViewState;

  // Actions

  setFilters: (filters: Partial<SearchFilters>) => void;
  clearFilters: () => void;

  setResults: (results: Lesson[], totalCount: number) => void;

  appendResults: (results: Lesson[]) => void;

  setLoading: (loading: boolean) => void;

  setLoadingMore: (loading: boolean) => void;

  setError: (error: string | null) => void;

  setViewState: (viewState: Partial<ViewState>) => void;

  setHasMore: (hasMore: boolean) => void;

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
      results: [],
      totalCount: 0,
      isLoading: false,
      error: null,
      hasMore: true,
      isLoadingMore: false,
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

      setResults: (results, totalCount) =>
        set({
          results,
          totalCount,
          error: null,
          hasMore: results.length < totalCount,
        }),

      appendResults: (newResults) =>
        set((state) => ({
          results: [...state.results, ...newResults],
          hasMore: state.results.length + newResults.length < state.totalCount,
        })),

      setLoading: (isLoading) => set({ isLoading }),

      setLoadingMore: (isLoadingMore) => set({ isLoadingMore }),

      setError: (error) => set({ error, isLoading: false, isLoadingMore: false }),

      setViewState: (newViewState) =>
        set((state) => ({
          viewState: { ...state.viewState, ...newViewState },
        })),

      setHasMore: (hasMore) => set({ hasMore }),

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
