/**
 * FP4 Brief 1 · F7 — SchoolCheckboxGroup honest-error state.
 *
 * Pins the fix that distinguishes a FAILED schools fetch (retry affordance) from
 * a genuinely-empty list ("No schools available"). Before the fix both rendered
 * the same empty copy, hiding a user's assigned schools behind a silent failure.
 *
 * Local `vi.mock('@/lib/supabase')` supplies a thin `from().select().order()`
 * thenable (the component's only query); the module-scope `orderResult` is read
 * lazily so each test can swap the resolved value / reject.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Lazily-read result for the single `.order('name')` terminal. A function so a
// test can return a fresh promise (incl. a reject) per call and change it
// between the initial load and a retry.
let orderResult: () => Promise<{ data: unknown; error: unknown }> = () =>
  Promise.resolve({ data: [], error: null });

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => orderResult(),
      }),
    }),
  },
}));

import { SchoolCheckboxGroup } from '@/components/Schools/SchoolCheckboxGroup';

function renderGroup() {
  return render(<SchoolCheckboxGroup selectedSchools={[]} onChange={vi.fn()} />);
}

describe('SchoolCheckboxGroup — honest error state (F7)', () => {
  beforeEach(() => {
    orderResult = () => Promise.resolve({ data: [], error: null });
  });

  it('renders a retry affordance on fetch error — NOT the empty-list copy', async () => {
    orderResult = () => Promise.resolve({ data: null, error: { message: 'boom' } });
    renderGroup();

    expect(await screen.findByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.getByText(/couldn't load schools/i)).toBeInTheDocument();
    expect(screen.queryByText(/no schools available/i)).not.toBeInTheDocument();
  });

  it('renders "No schools available" ONLY for a genuinely-empty successful fetch', async () => {
    orderResult = () => Promise.resolve({ data: [], error: null });
    renderGroup();

    expect(await screen.findByText(/no schools available/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /retry/i })).not.toBeInTheDocument();
  });

  it('retry refetches and renders the recovered list', async () => {
    const user = userEvent.setup();
    orderResult = () => Promise.resolve({ data: null, error: { message: 'boom' } });
    renderGroup();

    const retry = await screen.findByRole('button', { name: /retry/i });

    // Next fetch succeeds with a real school.
    orderResult = () => Promise.resolve({ data: [{ id: 's1', name: 'PS 216' }], error: null });
    await user.click(retry);

    expect(await screen.findByText('PS 216')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText(/couldn't load schools/i)).not.toBeInTheDocument()
    );
  });
});
