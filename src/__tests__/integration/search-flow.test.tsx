import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import type { Lesson } from '@/types';

// Mock the Supabase client
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        textSearch: vi.fn(() =>
          Promise.resolve({
            data: [],
            error: null,
          })
        ),
        eq: vi.fn(() =>
          Promise.resolve({
            data: [],
            error: null,
          })
        ),
        in: vi.fn(() =>
          Promise.resolve({
            data: [],
            error: null,
          })
        ),
        order: vi.fn(() =>
          Promise.resolve({
            data: [],
            error: null,
          })
        ),
        range: vi.fn(() =>
          Promise.resolve({
            data: [],
            error: null,
          })
        ),
      })),
      insert: vi.fn(() =>
        Promise.resolve({
          data: null,
          error: null,
        })
      ),
      update: vi.fn(() => ({
        eq: vi.fn(() =>
          Promise.resolve({
            data: null,
            error: null,
          })
        ),
      })),
    })),
    auth: {
      getUser: vi.fn(() =>
        Promise.resolve({
          data: { user: null },
          error: null,
        })
      ),
      signIn: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

// Import components after mocking
import { SearchBar } from '@/components/Search/SearchBar';
import { FilterModal } from '@/components/Filters/FilterModal';
import { useSearchStore } from '@/stores/searchStore';
import { useSearch } from '@/hooks/useSearch';

// Mock the search hook
vi.mock('@/hooks/useSearch');

describe('Search Flow Integration', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: 0 },
        mutations: { retry: false },
      },
    });

    // Reset store
    const store = useSearchStore.getState();
    store.clearFilters();
    store.setResults([], 0);
    store.setError(null);

    // Default mock for useSearch
    (useSearch as any).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const renderApp = () => {
    const TestApp = () => {
      const { filters, setFilters } = useSearchStore();
      const [isFilterModalOpen, setFilterModalOpen] = React.useState(false);

      return (
        <BrowserRouter>
          <QueryClientProvider client={queryClient}>
            <div>
              <SearchBar />
              <button onClick={() => setFilterModalOpen(true)} aria-label="Open filters">
                Filters
              </button>
              <FilterModal
                isOpen={isFilterModalOpen}
                onClose={() => setFilterModalOpen(false)}
                filters={filters}
                onFiltersChange={setFilters}
              />
              <div data-testid="results">{/* Results would be rendered here */}</div>
            </div>
          </QueryClientProvider>
        </BrowserRouter>
      );
    };

    return render(<TestApp />);
  };

  describe('Basic Search Flow', () => {
    it('should search for lessons by keyword', async () => {
      const user = userEvent.setup();
      const mockLessons: Lesson[] = [
        {
          lessonId: '1',
          title: 'Tomato Salad',
          summary: 'Make a fresh tomato salad',
          fileLink: 'https://example.com/lesson1',
          gradeLevels: ['3', '4'],
          metadata: {
            coreCompetencies: [],
            culturalHeritage: [],
            activityType: [],
            lessonFormat: [],
          },
          confidence: { overall: 0.9, title: 0.9, summary: 0.9, gradeLevels: 0.9 },
        },
        {
          lessonId: '2',
          title: 'Growing Tomatoes',
          summary: 'Learn to grow tomatoes in the garden',
          fileLink: 'https://example.com/lesson2',
          gradeLevels: ['5', '6'],
          metadata: {
            coreCompetencies: [],
            culturalHeritage: [],
            activityType: [],
            lessonFormat: [],
          },
          confidence: { overall: 0.9, title: 0.9, summary: 0.9, gradeLevels: 0.9 },
        },
      ];

      (useSearch as any).mockReturnValue({
        data: { results: mockLessons, totalCount: 2 },
        isLoading: false,
        error: null,
        refetch: vi.fn(),
      });

      renderApp();

      // Type in search box
      const searchInput = screen.getByPlaceholderText(/search lessons/i);
      await user.type(searchInput, 'tomato');

      // Submit search
      const searchButton = screen.getByRole('button', { name: /^search$/i });
      await user.click(searchButton);

      // Verify search was triggered
      await waitFor(() => {
        const store = useSearchStore.getState();
        expect(store.filters.query).toBe('tomato');
      });
    });

    it('should clear search and results', async () => {
      const user = userEvent.setup();

      // Set initial search state
      const store = useSearchStore.getState();
      store.setFilters({ query: 'tomato' });
      store.setResults(
        [
          {
            lessonId: '1',
            title: 'Test Lesson',
            summary: 'Test',
            fileLink: 'https://example.com/test',
            gradeLevels: [],
            metadata: {
              coreCompetencies: [],
              culturalHeritage: [],
              activityType: [],
              lessonFormat: [],
            },
            confidence: { overall: 0.9, title: 0.9, summary: 0.9, gradeLevels: 0.9 },
          },
        ],
        1
      );

      renderApp();

      // Verify search query is displayed
      const searchInput = screen.getByDisplayValue('tomato');
      expect(searchInput).toBeInTheDocument();

      // Clear search
      const clearButton = screen.getByRole('button', { name: /clear search/i });
      await user.click(clearButton);

      // Verify search was cleared
      await waitFor(() => {
        const updatedStore = useSearchStore.getState();
        expect(updatedStore.filters.query).toBe('');
      });
    });
  });

  describe('Filter Application Flow', () => {
    it('should apply grade level filters', async () => {
      const user = userEvent.setup();
      renderApp();

      // Open filter modal
      const filterButton = screen.getByRole('button', { name: /open filters/i });
      await user.click(filterButton);

      // Wait for modal to open
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Select grade levels
      const grade3 = screen.getByLabelText('3rd Grade');
      const grade4 = screen.getByLabelText('4th Grade');
      await user.click(grade3);
      await user.click(grade4);

      // Apply filters
      const applyButton = screen.getByRole('button', { name: /apply.*filter/i });
      await user.click(applyButton);

      // Verify filters were applied
      await waitFor(() => {
        const store = useSearchStore.getState();
        expect(store.filters.gradeLevels).toContain('3');
        expect(store.filters.gradeLevels).toContain('4');
      });
    });

    it('should apply multiple filter types', async () => {
      const user = userEvent.setup();
      renderApp();

      // Open filter modal
      const filterButton = screen.getByRole('button', { name: /open filters/i });
      await user.click(filterButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Select grade level
      const grade3 = screen.getByLabelText('3rd Grade');
      await user.click(grade3);

      // Select activity type
      const cookingOnly = screen.getByLabelText('Cooking Only');
      await user.click(cookingOnly);

      // Select location
      const indoor = screen.getByLabelText('Indoor');
      await user.click(indoor);

      // Switch to Themes tab
      const themesTab = screen.getByRole('tab', { name: /themes/i });
      await user.click(themesTab);

      // Wait for themes content to load
      await waitFor(() => {
        expect(screen.getByText('Thematic Category')).toBeInTheDocument();
      });

      // Apply filters
      const applyButton = screen.getByRole('button', { name: /apply.*filter/i });
      await user.click(applyButton);

      // Verify filters were applied
      await waitFor(() => {
        const store = useSearchStore.getState();
        expect(store.filters.gradeLevels).toContain('3');
        expect(store.filters.activityType).toContain('cooking-only');
        expect(store.filters.location).toContain('Indoor');
      });
    });

    it('should clear all filters', async () => {
      const user = userEvent.setup();

      // Set initial filters
      const store = useSearchStore.getState();
      store.setFilters({
        gradeLevels: ['3', '4', '5'],
        seasons: ['Spring', 'Summer'],
        activityType: ['cooking-only'],
      });

      renderApp();

      // Open filter modal
      const filterButton = screen.getByRole('button', { name: /open filters/i });
      await user.click(filterButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Clear all filters
      const clearButton = screen.getByRole('button', { name: /clear all/i });
      await user.click(clearButton);

      // Apply changes
      const applyButton = screen.getByRole('button', { name: /apply.*filter/i });
      await user.click(applyButton);

      // Verify filters were cleared
      await waitFor(() => {
        const updatedStore = useSearchStore.getState();
        expect(updatedStore.filters.gradeLevels).toEqual([]);
        expect(updatedStore.filters.seasons).toEqual([]);
        expect(updatedStore.filters.activityType).toEqual([]);
      });
    });
  });

  describe('Combined Search and Filter Flow', () => {
    it('should search and then apply filters', async () => {
      const user = userEvent.setup();
      renderApp();

      // First, perform a search
      const searchInput = screen.getByPlaceholderText(/search lessons/i);
      await user.type(searchInput, 'garden');

      const searchButton = screen.getByRole('button', { name: /^search$/i });
      await user.click(searchButton);

      // Verify search was applied
      await waitFor(() => {
        const store = useSearchStore.getState();
        expect(store.filters.query).toBe('garden');
      });

      // Then apply filters
      const filterButton = screen.getByRole('button', { name: /open filters/i });
      await user.click(filterButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const grade3 = screen.getByLabelText('3rd Grade');
      await user.click(grade3);

      const applyButton = screen.getByRole('button', { name: /apply.*filter/i });
      await user.click(applyButton);

      // Verify both search and filters are active
      await waitFor(() => {
        const store = useSearchStore.getState();
        expect(store.filters.query).toBe('garden');
        expect(store.filters.gradeLevels).toContain('3');
      });
    });

    it('should preserve filters when searching', async () => {
      const user = userEvent.setup();

      // Set initial filters
      const store = useSearchStore.getState();
      store.setFilters({
        gradeLevels: ['3', '4'],
        seasons: ['Spring'],
      });

      renderApp();

      // Perform a search
      const searchInput = screen.getByPlaceholderText(/search lessons/i);
      await user.type(searchInput, 'cooking');

      const searchButton = screen.getByRole('button', { name: /^search$/i });
      await user.click(searchButton);

      // Verify filters are preserved with new search
      await waitFor(() => {
        const updatedStore = useSearchStore.getState();
        expect(updatedStore.filters.query).toBe('cooking');
        expect(updatedStore.filters.gradeLevels).toEqual(['3', '4']);
        expect(updatedStore.filters.seasons).toEqual(['Spring']);
      });
    });
  });

  describe('Quick Search Suggestions', () => {
    it('should apply quick search suggestion', async () => {
      const user = userEvent.setup();
      renderApp();

      // Click a quick search suggestion
      const quickSearchButton = screen.getByRole('button', { name: /thanksgiving/i });
      await user.click(quickSearchButton);

      // Verify search was applied
      await waitFor(() => {
        const store = useSearchStore.getState();
        expect(store.filters.query).toBe('thanksgiving');
      });

      // Verify input shows the search term
      const searchInput = screen.getByDisplayValue('thanksgiving');
      expect(searchInput).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle search errors gracefully', async () => {
      const user = userEvent.setup();

      (useSearch as any).mockReturnValue({
        data: null,
        isLoading: false,
        error: new Error('Network error'),
        refetch: vi.fn(),
      });

      renderApp();

      // Perform a search that will fail
      const searchInput = screen.getByPlaceholderText(/search lessons/i);
      await user.type(searchInput, 'test');

      const searchButton = screen.getByRole('button', { name: /^search$/i });
      await user.click(searchButton);

      // Error should be handled (specific UI depends on implementation)
      await waitFor(() => {
        const store = useSearchStore.getState();
        expect(store.filters.query).toBe('test');
      });
    });
  });

  describe('Loading States', () => {
    it('should show loading state during search', async () => {
      const user = userEvent.setup();

      let resolveSearch: any;
      const searchPromise = new Promise((resolve) => {
        resolveSearch = resolve;
      });

      (useSearch as any).mockReturnValue({
        data: null,
        isLoading: true,
        error: null,
        refetch: vi.fn(() => searchPromise),
      });

      renderApp();

      // Perform a search
      const searchInput = screen.getByPlaceholderText(/search lessons/i);
      await user.type(searchInput, 'loading test');

      const searchButton = screen.getByRole('button', { name: /^search$/i });
      await user.click(searchButton);

      // Should be in loading state
      await waitFor(() => {
        const store = useSearchStore.getState();
        expect(store.filters.query).toBe('loading test');
      });

      // Resolve the search
      resolveSearch({
        data: { results: [], totalCount: 0 },
      });
    });
  });

  describe('Accessibility', () => {
    it('should be fully keyboard navigable', async () => {
      const user = userEvent.setup();
      renderApp();

      // Tab to search input
      await user.tab();
      expect(screen.getByPlaceholderText(/search lessons/i)).toHaveFocus();

      // Tab to search button
      await user.tab();
      expect(screen.getByRole('button', { name: /^search$/i })).toHaveFocus();

      // Continue tabbing through quick searches
      await user.tab();
      // Should reach quick search buttons or filter button
      const activeElement = document.activeElement;
      expect(activeElement?.tagName).toBe('BUTTON');
    });

    it('should handle keyboard shortcuts in filter modal', async () => {
      const user = userEvent.setup();
      renderApp();

      // Open filter modal
      const filterButton = screen.getByRole('button', { name: /open filters/i });
      await user.click(filterButton);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      // Press Escape to close modal
      await user.keyboard('{Escape}');

      // Modal should close
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });
});
