import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SearchBar } from './SearchBar';
import { useSearchStore } from '@/stores/searchStore';
import { useSearch } from '@/hooks/useSearch';

// Mock the stores and hooks
vi.mock('@/stores/searchStore');
vi.mock('@/hooks/useSearch');
vi.mock('@/utils/debounce', () => ({
  debounce: (fn: any) => fn,
}));

describe('SearchBar', () => {
  const mockSetFilters = vi.fn();
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Setup default mock implementation
    (useSearchStore as any).mockReturnValue({
      filters: { query: '' },
      setFilters: mockSetFilters,
    });

    (useSearch as any).mockReturnValue({
      data: null,
      isLoading: false,
      error: null,
    });
  });

  const renderComponent = () => {
    return render(
      <QueryClientProvider client={queryClient}>
        <SearchBar />
      </QueryClientProvider>
    );
  };

  describe('Rendering', () => {
    it('should render search input with placeholder', () => {
      renderComponent();
      const input = screen.getByPlaceholderText(/search lessons by keyword/i);
      expect(input).toBeInTheDocument();
    });

    it('should render search button', () => {
      renderComponent();
      const searchButton = screen.getByRole('button', { name: /^search$/i });
      expect(searchButton).toBeInTheDocument();
    });

    it('should display current search query', () => {
      (useSearchStore as any).mockReturnValue({
        filters: { query: 'tomato salad' },
        setFilters: mockSetFilters,
      });

      renderComponent();
      const input = screen.getByDisplayValue('tomato salad');
      expect(input).toBeInTheDocument();
    });

    it('should show clear button when search query exists', () => {
      (useSearchStore as any).mockReturnValue({
        filters: { query: 'tomato' },
        setFilters: mockSetFilters,
      });

      renderComponent();
      const clearButton = screen.getByRole('button', { name: /clear search/i });
      expect(clearButton).toBeInTheDocument();
    });

    it('should not show clear button when search query is empty', () => {
      renderComponent();
      const clearButton = screen.queryByRole('button', { name: /clear search/i });
      expect(clearButton).not.toBeInTheDocument();
    });

    it('should render quick search suggestions', () => {
      renderComponent();
      expect(screen.getByText(/quick searches:/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /thanksgiving/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /winter vegetables/i })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should update search query on input', async () => {
      const user = userEvent.setup();
      renderComponent();

      const input = screen.getByPlaceholderText(/search lessons by keyword/i);
      await user.type(input, 'tomato');

      expect(mockSetFilters).toHaveBeenCalledWith({ query: 'tomato' });
    });

    it('should clear search when clear button is clicked', async () => {
      const user = userEvent.setup();
      (useSearchStore as any).mockReturnValue({
        filters: { query: 'tomato' },
        setFilters: mockSetFilters,
      });

      renderComponent();
      const clearButton = screen.getByRole('button', { name: /clear search/i });

      await user.click(clearButton);
      expect(mockSetFilters).toHaveBeenCalledWith({ query: '' });
    });

    it('should handle form submission', async () => {
      const user = userEvent.setup();
      renderComponent();

      const input = screen.getByPlaceholderText(/search lessons by keyword/i);
      const searchButton = screen.getByRole('button', { name: /^search$/i });

      await user.type(input, 'tomato');
      await user.click(searchButton);

      expect(mockSetFilters).toHaveBeenCalledWith({ query: 'tomato' });
    });

    it('should handle Enter key press', async () => {
      const user = userEvent.setup();
      renderComponent();

      const input = screen.getByPlaceholderText(/search lessons by keyword/i);
      await user.type(input, 'tomato{Enter}');

      expect(mockSetFilters).toHaveBeenCalledWith({ query: 'tomato' });
    });

    it('should apply quick search when suggestion is clicked', async () => {
      const user = userEvent.setup();
      renderComponent();

      const quickSearchButton = screen.getByRole('button', { name: /thanksgiving/i });
      await user.click(quickSearchButton);

      expect(mockSetFilters).toHaveBeenCalledWith({ query: 'thanksgiving' });
    });
  });

  describe('Search Suggestions', () => {
    it('should display suggestions when no results found', () => {
      (useSearch as any).mockReturnValue({
        data: {
          suggestions: ['tomatoes', 'tomato sauce', 'cherry tomatoes'],
        },
        isLoading: false,
        error: null,
      });

      renderComponent();

      expect(screen.getByText(/no results found/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /tomatoes/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /tomato sauce/i })).toBeInTheDocument();
    });

    it('should apply suggestion when clicked', async () => {
      const user = userEvent.setup();
      (useSearch as any).mockReturnValue({
        data: {
          suggestions: ['tomatoes'],
        },
        isLoading: false,
        error: null,
      });

      renderComponent();

      const suggestionButton = screen.getByRole('button', { name: /tomatoes/i });
      await user.click(suggestionButton);

      expect(mockSetFilters).toHaveBeenCalledWith({ query: 'tomatoes' });
    });

    it('should not display suggestions when results exist', () => {
      (useSearch as any).mockReturnValue({
        data: {
          results: [{ id: 1, title: 'Test' }],
          suggestions: [],
        },
        isLoading: false,
        error: null,
      });

      renderComponent();

      expect(screen.queryByText(/no results found/i)).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible label for search input', () => {
      renderComponent();
      const input = screen.getByLabelText(/search lessons/i);
      expect(input).toBeInTheDocument();
    });

    it('should have accessible label for clear button', () => {
      (useSearchStore as any).mockReturnValue({
        filters: { query: 'tomato' },
        setFilters: mockSetFilters,
      });

      renderComponent();
      const clearButton = screen.getByRole('button', { name: /clear search/i });
      expect(clearButton).toHaveAccessibleName('Clear search');
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      renderComponent();

      await user.tab();
      const input = screen.getByPlaceholderText(/search lessons by keyword/i);
      expect(input).toHaveFocus();

      await user.tab();
      const searchButton = screen.getByRole('button', { name: /^search$/i });
      expect(searchButton).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty search submission', async () => {
      const user = userEvent.setup();
      renderComponent();

      const searchButton = screen.getByRole('button', { name: /^search$/i });
      await user.click(searchButton);

      expect(mockSetFilters).toHaveBeenCalledWith({ query: '' });
    });

    it('should handle special characters in search', async () => {
      const user = userEvent.setup();
      renderComponent();

      const specialChars = 'test@#$%^&*()';
      const input = screen.getByPlaceholderText(/search lessons by keyword/i);
      await user.type(input, specialChars);

      expect(mockSetFilters).toHaveBeenCalledWith({ query: specialChars });
    });

    it('should update local query when filter changes externally', () => {
      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <SearchBar />
        </QueryClientProvider>
      );

      (useSearchStore as any).mockReturnValue({
        filters: { query: 'new query' },
        setFilters: mockSetFilters,
      });

      rerender(
        <QueryClientProvider client={queryClient}>
          <SearchBar />
        </QueryClientProvider>
      );

      const input = screen.getByDisplayValue('new query');
      expect(input).toBeInTheDocument();
    });
  });
});
