import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';

import { makeRpcRow } from '../helpers/factories';

// Mock Supabase client (mirrors search-page.test.tsx so the RPC is controllable).
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

function createTestLesson(overrides: Partial<ReturnType<typeof makeRpcRow>> = {}) {
  return makeRpcRow({
    lesson_id: 'split-test-lesson-1',
    title: 'Splittable Lesson',
    summary: 'A summary for split-view testing.',
    file_link: 'https://docs.google.com/test-doc',
    grade_levels: ['3', '4'],
    metadata: {
      thematicCategories: ['Nutrition'],
      seasonTiming: ['Fall'],
      coreCompetencies: ['Food Systems'],
      culturalHeritage: [],
      activityType: ['cooking-only'],
      locationRequirements: ['Kitchen'],
      cookingMethods: [],
      academicIntegration: [],
      socialEmotionalLearning: [],
      cookingSkills: [],
      gardenSkills: [],
    },
    total_count: 1,
    ...overrides,
  });
}

// Override window.matchMedia so `(min-width: 1100px)` resolves to a fixed
// `matches` value (the global setup.ts stub always returns matches:false, which
// alone would make "wide" untestable). Returns a restore fn.
function mockViewport(isWide: boolean) {
  const original = window.matchMedia;
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('min-width: 1100px') ? isWide : false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

describe('SearchPage split-view viewport coercion (§3.4)', () => {
  let restoreMatchMedia: (() => void) | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    const store = useSearchStore.getState();
    store.clearFilters();
    // The user persisted "split" view on a wide laptop.
    store.setViewState({ view: 'split', resultsPerPage: 10, sortBy: 'relevance' });
    functionsInvokeMock.mockResolvedValue({ data: null, error: null });
  });

  afterEach(() => {
    restoreMatchMedia?.();
    restoreMatchMedia = undefined;
  });

  it('below 1100px: clicking a row opens the drawer (not the dead split rail) and hides the SPLIT control', async () => {
    restoreMatchMedia = mockViewport(false); // narrow / tablet

    rpcMock.mockResolvedValue({ data: [createTestLesson()], error: null });
    renderWithProviders(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText('Splittable Lesson')).toBeInTheDocument();
    });

    // The split detail rail (<aside aria-label="Lesson detail">) is a CSS dead
    // end below 1100px — it must NOT render when narrow.
    expect(screen.queryByRole('complementary', { name: /lesson detail/i })).not.toBeInTheDocument();

    // The SPLIT option in the view switcher must be hidden when narrow.
    expect(screen.queryByRole('radio', { name: /split/i })).not.toBeInTheDocument();

    // The toolbar reflects the EFFECTIVE view (list) below 1100px: the List
    // radio is checked (not a stranded no-selection state) and the density
    // switcher — which only renders for list view — is present. Both follow
    // from passing `effectiveView` (not the raw stored `view='split'`) to the
    // toolbar; otherwise the density control vanishes for a genuine list.
    expect(screen.getByRole('radio', { name: /^list$/i })).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('radiogroup', { name: /list density/i })).toBeInTheDocument();

    // Clicking a row opens the drawer (a Dialog with the lesson title as its
    // accessible name), not nothing.
    const user = userEvent.setup();
    await user.click(screen.getByText('Splittable Lesson'));

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: /splittable lesson/i })).toBeInTheDocument();
    });
  });

  it('at/above 1100px: the split rail renders and the SPLIT control is available', async () => {
    restoreMatchMedia = mockViewport(true); // wide / laptop

    rpcMock.mockResolvedValue({ data: [createTestLesson()], error: null });
    renderWithProviders(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText('Splittable Lesson')).toBeInTheDocument();
    });

    // The split rail renders when wide (even before a lesson is picked, it shows
    // the "Select a lesson to preview details." empty state).
    expect(screen.getByRole('complementary', { name: /lesson detail/i })).toBeInTheDocument();

    // The SPLIT option is present and not disabled.
    const splitControl = screen.getByRole('radio', { name: /split/i });
    expect(splitControl).toBeInTheDocument();
    expect(splitControl).not.toBeDisabled();
  });

  it('does not mutate the persisted view when coerced narrow', async () => {
    restoreMatchMedia = mockViewport(false); // narrow

    rpcMock.mockResolvedValue({ data: [createTestLesson()], error: null });
    renderWithProviders(<SearchPage />);

    await waitFor(() => {
      expect(screen.getByText('Splittable Lesson')).toBeInTheDocument();
    });

    // Effective render is non-split, but the stored preference is untouched, so a
    // return to a wide screen restores split view.
    expect(useSearchStore.getState().viewState.view).toBe('split');
  });
});
