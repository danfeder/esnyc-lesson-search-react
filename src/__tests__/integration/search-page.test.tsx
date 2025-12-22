import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

import { makeRpcRow } from '../helpers/factories';

// Mock Supabase client
const rpcMock = vi.fn();
const functionsInvokeMock = vi.fn().mockResolvedValue({ data: null, error: null });

vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpcMock(...args),
    functions: { invoke: (...args: unknown[]) => functionsInvokeMock(...args) },
  },
}));

// Import after mocks
import { SearchPage } from '@/pages/SearchPage';
import { useSearchStore } from '@/stores/searchStore';

function renderWithProviders(ui: React.ReactElement, initialEntries: string[] = ['/']) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </MemoryRouter>
  );
}

// Test data factories
function createTestLesson(overrides: Partial<ReturnType<typeof makeRpcRow>> = {}) {
  return makeRpcRow({
    lesson_id: 'test-lesson-1',
    title: 'Test Lesson Title',
    summary: 'A detailed summary for testing the modal display.',
    file_link: 'https://docs.google.com/test-doc',
    grade_levels: ['3', '4'],
    metadata: {
      thematicCategories: ['Nutrition', 'Gardening'],
      seasonTiming: ['Fall'],
      coreCompetencies: ['Food Systems'],
      culturalHeritage: [],
      activityType: ['cooking-only'],
      lessonFormat: 'Standard',
      locationRequirements: ['Kitchen'],
      cookingMethods: [],
      academicIntegration: [],
      socialEmotionalLearning: [],
      cookingSkills: ['Mixing'],
      gardenSkills: [],
    },
    total_count: 1,
    ...overrides,
  });
}

describe('SearchPage Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset store to defaults
    const store = useSearchStore.getState();
    store.clearFilters();
    store.setViewState({ resultsPerPage: 10, sortBy: 'relevance' });

    // Clear suggestions mock
    functionsInvokeMock.mockResolvedValue({ data: null, error: null });
  });

  describe('LessonModal', () => {
    it('opens modal when lesson card is clicked', async () => {
      const testLesson = createTestLesson({
        lesson_id: 'modal-test-1',
        title: 'Clickable Lesson',
      });

      rpcMock.mockResolvedValueOnce({
        data: [testLesson],
        error: null,
      });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText('Clickable Lesson')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      // Click the lesson card (not the View Plan link)
      const lessonCards = screen.getAllByText('Clickable Lesson');
      await user.click(lessonCards[0]);

      // Modal should now be visible with h1 heading (modal header uses h1)
      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { level: 1 });
        expect(headings.some((h) => h.textContent === 'Clickable Lesson')).toBe(true);
      });
    });

    it('displays correct lesson data in modal', async () => {
      const testLesson = createTestLesson({
        lesson_id: 'data-test-1',
        title: 'Data Verification Lesson',
        summary: 'This is a unique summary for testing modal content.',
        grade_levels: ['K', '1', '2'],
      });

      rpcMock.mockResolvedValueOnce({
        data: [testLesson],
        error: null,
      });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText('Data Verification Lesson')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      // Click the title in the card
      await user.click(screen.getByText('Data Verification Lesson'));

      await waitFor(() => {
        // Title in modal header
        const headings = screen.getAllByRole('heading', { level: 1 });
        expect(headings.some((h) => h.textContent === 'Data Verification Lesson')).toBe(true);

        // Summary appears in both card and modal - verify there are 2 instances
        const summaryElements = screen.getAllByText(
          'This is a unique summary for testing modal content.'
        );
        expect(summaryElements.length).toBe(2); // One in card, one in modal

        // Grade levels in modal header
        expect(screen.getByText(/Grades K, 1, 2/)).toBeInTheDocument();
      });
    });

    it('closes modal when X button clicked', async () => {
      const testLesson = createTestLesson({ title: 'Closeable Lesson' });

      rpcMock.mockResolvedValueOnce({
        data: [testLesson],
        error: null,
      });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText('Closeable Lesson')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByText('Closeable Lesson'));

      // Modal is open - verify close button is present
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /close lesson modal/i })).toBeInTheDocument();
      });

      // Click the close button using accessible selector
      await user.click(screen.getByRole('button', { name: /close lesson modal/i }));

      // Modal should be closed
      await waitFor(() => {
        expect(
          screen.queryByRole('button', { name: /close lesson modal/i })
        ).not.toBeInTheDocument();
      });
    });

    it('can open different lessons sequentially', async () => {
      const lesson1 = createTestLesson({
        lesson_id: 'seq-1',
        title: 'First Sequential Lesson',
        summary: 'Summary of first lesson',
      });
      const lesson2 = createTestLesson({
        lesson_id: 'seq-2',
        title: 'Second Sequential Lesson',
        summary: 'Summary of second lesson',
      });

      rpcMock.mockResolvedValueOnce({
        data: [lesson1, lesson2],
        error: null,
      });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText('First Sequential Lesson')).toBeInTheDocument();
        expect(screen.getByText('Second Sequential Lesson')).toBeInTheDocument();
      });

      const user = userEvent.setup();

      // Open first lesson
      await user.click(screen.getByText('First Sequential Lesson'));
      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { level: 1 });
        expect(headings.some((h) => h.textContent === 'First Sequential Lesson')).toBe(true);
      });

      // Close modal using accessible selector
      await user.click(screen.getByRole('button', { name: /close lesson modal/i }));

      await waitFor(() => {
        expect(
          screen.queryByRole('button', { name: /close lesson modal/i })
        ).not.toBeInTheDocument();
      });

      // Open second lesson
      await user.click(screen.getByText('Second Sequential Lesson'));
      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { level: 1 });
        expect(headings.some((h) => h.textContent === 'Second Sequential Lesson')).toBe(true);
      });
    });

    it('displays View Complete Lesson link', async () => {
      const testLesson = createTestLesson({
        title: 'Lesson With Link',
        file_link: 'https://docs.google.com/test-document',
      });

      rpcMock.mockResolvedValueOnce({
        data: [testLesson],
        error: null,
      });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText('Lesson With Link')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByText('Lesson With Link'));

      await waitFor(() => {
        const viewLink = screen.getByRole('link', { name: /view complete lesson/i });
        expect(viewLink).toHaveAttribute('href', 'https://docs.google.com/test-document');
        expect(viewLink).toHaveAttribute('target', '_blank');
      });
    });
  });

  describe('FilterPills', () => {
    it('displays active filters as pills', async () => {
      // Set up filters before rendering
      const store = useSearchStore.getState();
      store.setFilters({ thematicCategories: ['Nutrition'] });

      const testLesson = createTestLesson();
      rpcMock.mockResolvedValueOnce({
        data: [testLesson],
        error: null,
      });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        // Filter pill should show formatted category name and value
        expect(screen.getByText('Nutrition')).toBeInTheDocument();
      });
    });

    it('removes single filter when X clicked on pill', async () => {
      const store = useSearchStore.getState();
      store.setFilters({ thematicCategories: ['Nutrition'] });

      const testLesson = createTestLesson();
      rpcMock.mockResolvedValueOnce({
        data: [testLesson],
        error: null,
      });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText('Nutrition')).toBeInTheDocument();
      });

      const user = userEvent.setup();

      // Find the remove button by its aria-label
      const removeButton = screen.getByRole('button', {
        name: /remove.*filter.*nutrition/i,
      });
      await user.click(removeButton);

      await waitFor(() => {
        const currentState = useSearchStore.getState();
        expect(currentState.filters.thematicCategories).not.toContain('Nutrition');
      });
    });

    it('Clear All button removes all filters', async () => {
      const store = useSearchStore.getState();
      store.setFilters({
        query: 'test search',
        gradeLevels: ['3'],
        thematicCategories: ['Nutrition'],
      });

      const testLesson = createTestLesson();
      rpcMock.mockResolvedValueOnce({
        data: [testLesson],
        error: null,
      });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText('Clear All')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByText('Clear All'));

      await waitFor(() => {
        const currentState = useSearchStore.getState();
        expect(currentState.filters.query).toBe('');
        expect(currentState.filters.gradeLevels).toEqual([]);
        expect(currentState.filters.thematicCategories).toEqual([]);
      });
    });

    it('displays search query as a pill', async () => {
      const store = useSearchStore.getState();
      store.setFilters({ query: 'pizza recipe' });

      const testLesson = createTestLesson();
      rpcMock.mockResolvedValueOnce({
        data: [testLesson],
        error: null,
      });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        // Search query should appear as a pill with quotes
        // Text may appear in multiple places (pill + screen reader), so use getAllByText
        const elements = screen.getAllByText(/"pizza recipe"/);
        expect(elements.length).toBeGreaterThanOrEqual(1);
        // Verify at least one is in a pill (has the pill class styling)
        const pillElement = elements.find(
          (el) => el.tagName.toLowerCase() === 'span' && !el.closest('.sr-only')
        );
        expect(pillElement).toBeTruthy();
      });
    });

    it('shows Add Filters button', async () => {
      const testLesson = createTestLesson();
      rpcMock.mockResolvedValueOnce({
        data: [testLesson],
        error: null,
      });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        // The button has aria-label="Open filter modal to add more filters"
        expect(
          screen.getByRole('button', { name: /open filter modal to add more filters/i })
        ).toBeInTheDocument();
      });
    });
  });

  describe('Sort Functionality', () => {
    it('displays current sort option', async () => {
      const testLesson = createTestLesson();
      rpcMock.mockResolvedValueOnce({
        data: [testLesson],
        error: null,
      });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        const sortDropdown = screen.getByRole('combobox', { name: /sort results/i });
        expect(sortDropdown).toHaveValue('relevance');
      });
    });

    it('changes sort order when dropdown changed', async () => {
      const testLesson = createTestLesson();
      rpcMock.mockResolvedValueOnce({
        data: [testLesson],
        error: null,
      });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /sort results/i })).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const sortDropdown = screen.getByRole('combobox', { name: /sort results/i });
      await user.selectOptions(sortDropdown, 'title');

      await waitFor(() => {
        expect(sortDropdown).toHaveValue('title');
        const currentState = useSearchStore.getState();
        expect(currentState.viewState.sortBy).toBe('title');
      });
    });

    it('sort change updates store with new sort param', async () => {
      const testLesson = createTestLesson();
      rpcMock.mockResolvedValueOnce({
        data: [testLesson],
        error: null,
      });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /sort results/i })).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const sortDropdown = screen.getByRole('combobox', { name: /sort results/i });
      await user.selectOptions(sortDropdown, 'grade');

      // Check the store was updated
      await waitFor(() => {
        const currentState = useSearchStore.getState();
        expect(currentState.viewState.sortBy).toBe('grade');
      });
    });
  });

  describe('ResultsHeader', () => {
    it('displays total result count from API response', async () => {
      // Test that the header shows total_count from API, not just rendered items
      const lessons = [
        createTestLesson({ lesson_id: 'r1', title: 'Result 1', total_count: 42 }),
        createTestLesson({ lesson_id: 'r2', title: 'Result 2', total_count: 42 }),
      ];

      rpcMock.mockResolvedValueOnce({
        data: lessons,
        error: null,
      });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        // Should show total_count (42), not just rendered items (2)
        expect(screen.getByText('42')).toBeInTheDocument();
        expect(screen.getByText(/lessons found/i)).toBeInTheDocument();
      });
    });

    it('displays current search query when present', async () => {
      const store = useSearchStore.getState();
      store.setFilters({ query: 'salad recipes' });

      const testLesson = createTestLesson({ total_count: 3 });
      rpcMock.mockResolvedValueOnce({
        data: [testLesson],
        error: null,
      });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText(/Results for/i)).toBeInTheDocument();
        expect(screen.getByText('salad recipes')).toBeInTheDocument();
      });
    });

    it('updates count when filters change', async () => {
      const initialLessons = [
        createTestLesson({ lesson_id: 'i1', total_count: 100 }),
        createTestLesson({ lesson_id: 'i2', total_count: 100 }),
      ];

      const filteredLessons = [createTestLesson({ lesson_id: 'f1', total_count: 5 })];

      rpcMock
        .mockResolvedValueOnce({
          data: initialLessons,
          error: null,
        })
        .mockResolvedValueOnce({
          data: filteredLessons,
          error: null,
        });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText('100')).toBeInTheDocument();
      });

      // Apply filter to trigger new search
      const store = useSearchStore.getState();
      store.setFilters({ gradeLevels: ['K'] });

      await waitFor(() => {
        expect(screen.getByText('5')).toBeInTheDocument();
      });
    });
  });

  describe('Empty State', () => {
    it('shows zero results when search returns empty', async () => {
      const store = useSearchStore.getState();
      store.setFilters({ query: 'nonexistent search term xyz' });

      rpcMock.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument();
        expect(screen.getByText(/lessons found/i)).toBeInTheDocument();
      });
    });

    it('displays suggestions panel for empty results with query', async () => {
      const store = useSearchStore.getState();
      store.setFilters({ query: 'misspelled word' });

      rpcMock.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      // Mock suggestions hook response
      functionsInvokeMock.mockResolvedValueOnce({
        data: { suggestions: ['cooking', 'gardening', 'nutrition'] },
        error: null,
      });

      renderWithProviders(<SearchPage />);

      // Wait for suggestions panel - appears when totalCount === 0 and query is present
      await waitFor(() => {
        expect(screen.getByText(/No results found/i)).toBeInTheDocument();
      });
    });

    it('hides suggestions when results exist', async () => {
      const store = useSearchStore.getState();
      store.setFilters({ query: 'pizza' });

      const testLesson = createTestLesson({ title: 'Pizza Making Lesson', total_count: 5 });
      rpcMock.mockResolvedValueOnce({
        data: [testLesson],
        error: null,
      });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText('Pizza Making Lesson')).toBeInTheDocument();
      });

      // Suggestions panel should not be visible when there are results
      expect(screen.queryByText(/No results found/i)).not.toBeInTheDocument();
    });
  });

  describe('Screen Reader Announcements', () => {
    it('announces result count on initial load', async () => {
      const testLesson = createTestLesson({ total_count: 15 });
      rpcMock.mockResolvedValueOnce({
        data: [testLesson],
        error: null,
      });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        // Screen reader announcer has role="status"
        const announcer = screen.getByRole('status');
        expect(announcer).toBeInTheDocument();
        // The text format is "All filters cleared. Showing all X lessons." or similar
        expect(announcer).toHaveTextContent(/15 lessons/i);
      });
    });

    it('announces updated count after filter change', async () => {
      const initialLesson = createTestLesson({ total_count: 100 });
      const filteredLesson = createTestLesson({ total_count: 10 });

      rpcMock
        .mockResolvedValueOnce({
          data: [initialLesson],
          error: null,
        })
        .mockResolvedValueOnce({
          data: [filteredLesson],
          error: null,
        });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        const announcer = screen.getByRole('status');
        expect(announcer).toHaveTextContent(/100 lessons/i);
      });

      // Apply filter
      const store = useSearchStore.getState();
      store.setFilters({ gradeLevels: ['5'] });

      await waitFor(() => {
        const announcer = screen.getByRole('status');
        // After filter change, the message should include the new count
        expect(announcer).toHaveTextContent(/10 lessons/i);
      });
    });
  });
});
