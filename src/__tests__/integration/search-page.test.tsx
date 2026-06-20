import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

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

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
    </BrowserRouter>
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

  // Lesson detail drawer (replaces the old modal as part of the internal
  // design system redesign — see docs/plans/yes-let-s-get-to-curried-cake.md).
  describe('LessonDrawer', () => {
    it('opens drawer when lesson row is clicked', async () => {
      const testLesson = createTestLesson({
        lesson_id: 'modal-test-1',
        title: 'Clickable Lesson',
      });

      rpcMock.mockResolvedValueOnce({ data: [testLesson], error: null });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText('Clickable Lesson')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      const lessonCards = screen.getAllByText('Clickable Lesson');
      await user.click(lessonCards[0]);

      // Drawer title is a level-2 heading (.int-detail-title).
      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { level: 2 });
        expect(headings.some((h) => h.textContent === 'Clickable Lesson')).toBe(true);
      });
    });

    it('displays correct lesson data in drawer', async () => {
      const testLesson = createTestLesson({
        lesson_id: 'data-test-1',
        title: 'Data Verification Lesson',
        summary: 'This is a unique summary for testing drawer content.',
        grade_levels: ['K', '1', '2'],
      });

      rpcMock.mockResolvedValueOnce({ data: [testLesson], error: null });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText('Data Verification Lesson')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByText('Data Verification Lesson'));

      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { level: 2 });
        expect(headings.some((h) => h.textContent === 'Data Verification Lesson')).toBe(true);

        // Summary appears in both row and drawer.
        const summaryElements = screen.getAllByText(
          'This is a unique summary for testing drawer content.'
        );
        expect(summaryElements.length).toBeGreaterThanOrEqual(2);

        // intGradesLabel compresses 3+ grades to a range: "K–2".
        expect(screen.getByText(/Grades K–2/)).toBeInTheDocument();
      });
    });

    it('closes drawer when close button clicked', async () => {
      const testLesson = createTestLesson({ title: 'Closeable Lesson' });

      rpcMock.mockResolvedValueOnce({ data: [testLesson], error: null });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText('Closeable Lesson')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByText('Closeable Lesson'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /close lesson details/i })).toBeInTheDocument();
      });

      await user.click(screen.getByRole('button', { name: /close lesson details/i }));

      await waitFor(() => {
        expect(
          screen.queryByRole('button', { name: /close lesson details/i })
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

      rpcMock.mockResolvedValueOnce({ data: [lesson1, lesson2], error: null });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText('First Sequential Lesson')).toBeInTheDocument();
        expect(screen.getByText('Second Sequential Lesson')).toBeInTheDocument();
      });

      const user = userEvent.setup();

      await user.click(screen.getByText('First Sequential Lesson'));
      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { level: 2 });
        expect(headings.some((h) => h.textContent === 'First Sequential Lesson')).toBe(true);
      });

      await user.click(screen.getByRole('button', { name: /close lesson details/i }));

      await waitFor(() => {
        expect(
          screen.queryByRole('button', { name: /close lesson details/i })
        ).not.toBeInTheDocument();
      });

      await user.click(screen.getByText('Second Sequential Lesson'));
      await waitFor(() => {
        const headings = screen.getAllByRole('heading', { level: 2 });
        expect(headings.some((h) => h.textContent === 'Second Sequential Lesson')).toBe(true);
      });
    });

    it('displays Open Lesson Plan link', async () => {
      const testLesson = createTestLesson({
        title: 'Lesson With Link',
        file_link: 'https://docs.google.com/test-document',
      });

      rpcMock.mockResolvedValueOnce({ data: [testLesson], error: null });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByText('Lesson With Link')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByText('Lesson With Link'));

      await waitFor(() => {
        const link = screen.getByRole('link', { name: /open lesson plan/i });
        expect(link).toHaveAttribute('href', 'https://docs.google.com/test-document');
        expect(link).toHaveAttribute('target', '_blank');
      });
    });
  });

  describe('Active filter pills', () => {
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

      // IntActivePills renders a button with aria-label "Remove Nutrition".
      const removeButton = screen.getByRole('button', {
        name: /remove nutrition/i,
      });
      await user.click(removeButton);

      await waitFor(() => {
        const currentState = useSearchStore.getState();
        expect(currentState.filters.thematicCategories).not.toContain('Nutrition');
      });
    });

    it('Clear all button removes all filters', async () => {
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

      // Sidebar's "Clear all" (lowercase 'all') appears when any filter is set.
      await waitFor(() => {
        expect(screen.getByText('Clear all')).toBeInTheDocument();
      });

      const user = userEvent.setup();
      await user.click(screen.getByText('Clear all'));

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

    it('renders Filters sidebar heading', async () => {
      // Design rework: filters live in a persistent sidebar instead of
      // behind a modal, so the old "Add Filters" button is gone.
      const testLesson = createTestLesson();
      rpcMock.mockResolvedValueOnce({ data: [testLesson], error: null });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /^filters$/i, level: 2 })).toBeInTheDocument();
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
      await user.selectOptions(sortDropdown, 'modified');

      // Check the store was updated
      await waitFor(() => {
        const currentState = useSearchStore.getState();
        expect(currentState.viewState.sortBy).toBe('modified');
      });

      // End-to-end (C58): the chosen sort must actually REACH the RPC as order_by
      // (UI -> SearchPage prop threading -> useLessonSearch -> rpc). This guards
      // the `sortBy: viewState.sortBy` prop in SearchPage — without it the hook
      // would default to relevance and this assertion would fail even though the
      // store update above still passes.
      await waitFor(() => {
        const sawModified = rpcMock.mock.calls.some(
          ([, params]) => (params as Record<string, unknown> | undefined)?.order_by === 'modified'
        );
        expect(sawModified).toBe(true);
      });
    });

    it('sort change resets the result page to 1 (C58)', async () => {
      const testLesson = createTestLesson();
      rpcMock.mockResolvedValue({ data: [testLesson], error: null });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByRole('combobox', { name: /sort results/i })).toBeInTheDocument();
      });

      // Simulate being deeper in the paginated list before re-sorting.
      const store = useSearchStore.getState();
      store.setViewState({ currentPage: 4 });
      expect(useSearchStore.getState().viewState.currentPage).toBe(4);

      const user = userEvent.setup();
      const sortDropdown = screen.getByRole('combobox', { name: /sort results/i });
      await user.selectOptions(sortDropdown, 'title');

      await waitFor(() => {
        const currentState = useSearchStore.getState();
        expect(currentState.viewState.sortBy).toBe('title');
        // Changing the sort must reset paging to the first page (mirrors the
        // filter-change reset rule in src/stores/CLAUDE.md).
        expect(currentState.viewState.currentPage).toBe(1);
      });
    });
  });

  describe('Toolbar', () => {
    it('displays total result count from API response', async () => {
      const lessons = [
        createTestLesson({ lesson_id: 'r1', title: 'Result 1', total_count: 42 }),
        createTestLesson({ lesson_id: 'r2', title: 'Result 2', total_count: 42 }),
      ];

      rpcMock.mockResolvedValueOnce({ data: lessons, error: null });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        // IntToolbar renders `<strong>42</strong> lessons`.
        expect(screen.getByText('42')).toBeInTheDocument();
        // "lessons" appears in the toolbar AND the sr-only announcer.
        expect(screen.getAllByText(/\blessons\b/i).length).toBeGreaterThanOrEqual(1);
      });
    });

    it('displays current search query when present', async () => {
      const store = useSearchStore.getState();
      store.setFilters({ query: 'salad recipes' });

      const testLesson = createTestLesson({ total_count: 3 });
      rpcMock.mockResolvedValueOnce({ data: [testLesson], error: null });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        // IntToolbar: `<strong>N</strong> lessons matching "<query>"`.
        expect(screen.getByText(/matching "salad recipes"/i)).toBeInTheDocument();
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

  describe('Loading State (C59)', () => {
    it('shows the loading skeleton (not "No matches") while the first search is pending', async () => {
      // A never-resolving RPC keeps the query in the cold-load `isPending` state.
      rpcMock.mockReturnValueOnce(new Promise(() => {}));

      renderWithProviders(<SearchPage />);

      // The cold-load skeleton renders...
      await waitFor(() => {
        // The skeleton's loading announcement lives in an sr-only text node
        // inside a role="status" live region (no aria-label — see IntListSkeleton).
        expect(screen.getByText(/loading lessons/i).closest('[role="status"]')).toBeInTheDocument();
      });
      // ...and the false-negative "No matches"/"No results" empty state does NOT.
      expect(screen.queryByRole('heading', { name: /no matches/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /no results/i })).not.toBeInTheDocument();
    });

    it('suppresses the load-more affordance while showing placeholder data mid-transition', async () => {
      // First query: a page of 1 row out of total_count 50 → hasNextPage, so the
      // keyboard "Load more results" affordance renders.
      const firstRow = createTestLesson({ lesson_id: 'first', total_count: 50 });
      let resolveSecond: ((value: { data: unknown; error: null }) => void) | undefined;
      rpcMock.mockResolvedValueOnce({ data: [firstRow], error: null }).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          })
      );

      renderWithProviders(<SearchPage />);

      // Load-more affordance present once the first (settled) page is showing.
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /load more results/i })).toBeInTheDocument();
      });

      // Change the filter → a NEW, in-flight query. keepPreviousData keeps the
      // 'first' row visible (placeholder), but the load-more affordance must be
      // suppressed so the sentinel can't paginate the stale list.
      const store = useSearchStore.getState();
      store.setFilters({ gradeLevels: ['5'] });

      await waitFor(() => {
        expect(
          screen.queryByRole('button', { name: /load more results/i })
        ).not.toBeInTheDocument();
      });
      // The previous result stays on screen (no blank/false "No matches").
      expect(screen.getByText('Test Lesson Title')).toBeInTheDocument();

      resolveSecond?.({
        data: [createTestLesson({ lesson_id: 'second', total_count: 1 })],
        error: null,
      });
    });

    it('does not flash "No more results to load" over stale rows mid-transition', async () => {
      // First query: one row of total_count 50 → hasNextPage true, so the
      // settled state shows the load-more affordance (NOT the terminal copy).
      const firstRow = createTestLesson({ lesson_id: 'first', total_count: 50 });
      let resolveSecond: ((value: { data: unknown; error: null }) => void) | undefined;
      rpcMock.mockResolvedValueOnce({ data: [firstRow], error: null }).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveSecond = resolve;
          })
      );

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /load more results/i })).toBeInTheDocument();
      });

      // Change the filter → in-flight refetch; keepPreviousData keeps 'first'
      // visible. The trigger forces hasMore=false during placeholder, which —
      // if the trigger still rendered — would flash "No more results to load"
      // over the stale rows. The whole trigger must be hidden instead.
      const store = useSearchStore.getState();
      store.setFilters({ gradeLevels: ['5'] });

      await waitFor(() => {
        expect(
          screen.queryByRole('button', { name: /load more results/i })
        ).not.toBeInTheDocument();
      });
      // Stale row still visible, but NO false terminal "No more results" copy.
      expect(screen.getByText('Test Lesson Title')).toBeInTheDocument();
      expect(screen.queryByText(/no more results to load/i)).not.toBeInTheDocument();

      resolveSecond?.({
        data: [createTestLesson({ lesson_id: 'second', total_count: 1 })],
        error: null,
      });
    });

    it('does not flash a suggestions panel while the first search is pending', async () => {
      const store = useSearchStore.getState();
      store.setFilters({ query: 'pizza' });

      // Pending RPC: totalCount is 0 only because data is absent, not because the
      // search genuinely returned zero — the suggestions panel must not mis-fire.
      rpcMock.mockReturnValueOnce(new Promise(() => {}));
      functionsInvokeMock.mockResolvedValueOnce({
        data: { suggestions: ['cooking', 'gardening'] },
        error: null,
      });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        // The skeleton's loading announcement lives in an sr-only text node
        // inside a role="status" live region (no aria-label — see IntListSkeleton).
        expect(screen.getByText(/loading lessons/i).closest('[role="status"]')).toBeInTheDocument();
      });
      expect(screen.queryByText(/No results found/i)).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows zero results when search returns empty', async () => {
      const store = useSearchStore.getState();
      store.setFilters({ query: 'nonexistent search term xyz' });

      rpcMock.mockResolvedValueOnce({ data: [], error: null });

      renderWithProviders(<SearchPage />);

      await waitFor(() => {
        // Toolbar still renders the "0 lessons" count; IntEmptyState surfaces
        // the "No matches" heading.
        expect(screen.getByText('0')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /no matches/i })).toBeInTheDocument();
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
