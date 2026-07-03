/**
 * ReviewDashboard default-tab behavior (post-launch reviewer-UX item 1).
 *
 * Pins that landing on /review starts on the PENDING tab (the actionable
 * `submitted` queue) instead of All — T2 punch-list row 4 — and that the very
 * FIRST submissions fetch already carries the `status = 'submitted'` filter
 * (not an unfiltered All fetch that a later tab click re-narrows).
 *
 * Lives in its own file (NOT ReviewDashboard.test.tsx): the open FP-05/FP-07
 * branch adds that filename, so a separate suite avoids an add/add rebase
 * conflict. Uses the table-aware supabase mock following the
 * review-detail-page.test.tsx conventions, plus a thin `.eq` recorder — the
 * shared mock is arg-blind by design, and the query-filter pin needs the args.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { makeReviewSupabaseMock, type TableResult } from '@/__tests__/helpers/supabaseReviewMock';

// Module-scope mocks, read LAZILY by the vi.mock factory's arrows (the
// consumption contract documented in supabaseReviewMock.ts).
const getUserMock = vi.fn();
let currentMock = makeReviewSupabaseMock({});
// Records every `.eq(column, value)` call per table so the suite can assert
// the first lesson_submissions fetch was status-filtered.
let eqCalls: Array<{ table: string; column: unknown; value: unknown }> = [];

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => {
      const builder = currentMock.from(table);
      const originalEq = builder.eq;
      builder.eq = (...args: unknown[]) => {
        eqCalls.push({ table, column: args[0], value: args[1] });
        return originalEq(...args);
      };
      return builder;
    },
    auth: { getUser: () => getUserMock() },
  },
}));

// Import after the mock (mirrors review-detail-page.test.tsx).
import { ReviewDashboard } from '@/pages/ReviewDashboard';

const AUTH_USER = { id: 'reviewer-1', email: 'reviewer@test.com' };

// user_profiles serves BOTH checkAuth's `.single()` (unwraps to the FIRST
// element → keep the reviewer first) and loadSubmissions' teacher-name `.in()`
// (bare await → whole array).
const successFixture: Record<string, TableResult> = {
  user_profiles: {
    data: [
      { id: 'reviewer-1', full_name: 'Rev Iewer', role: 'reviewer' },
      { id: 'teacher-1', full_name: 'Terry Teacher', role: 'teacher' },
    ],
    error: null,
  },
  lesson_submissions: {
    data: [
      {
        id: 'sub-pending',
        created_at: '2026-07-01T00:00:00.000Z',
        teacher_id: 'teacher-1',
        google_doc_url: 'https://docs.google.com/document/d/pending-doc',
        google_doc_id: 'pending-doc',
        submission_type: 'new',
        status: 'submitted',
        extracted_title: 'Pending Compost Lesson',
        extracted_content: '',
        original_lesson_id: null,
      },
    ],
    error: null,
  },
  submission_similarities: { data: [], error: null },
};

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/review']}>
      <ReviewDashboard />
    </MemoryRouter>
  );
}

describe('ReviewDashboard default tab (post-launch item 1)', () => {
  beforeEach(() => {
    getUserMock.mockReset().mockResolvedValue({ data: { user: AUTH_USER }, error: null });
    currentMock = makeReviewSupabaseMock(successFixture);
    eqCalls = [];
  });

  it('lands on the Pending tab, not All', async () => {
    renderDashboard();

    // Tab names are exact ('Pending' / 'All') — counts only render on the All
    // tab's in-memory tally, which never populates before visiting All.
    const pendingTab = await screen.findByRole('tab', { name: 'Pending' });
    expect(pendingTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'false');
  });

  it("first submissions fetch is filtered to status = 'submitted'", async () => {
    renderDashboard();

    // Wait for the queue row so the first load has fully resolved.
    expect(await screen.findByText('Pending Compost Lesson')).toBeInTheDocument();

    // The landing fetch itself carried the Pending filter (with the default on
    // 'all' this .eq never fires — loadSubmissions skips it for the All tab).
    expect(eqCalls).toContainEqual({
      table: 'lesson_submissions',
      column: 'status',
      value: 'submitted',
    });
  });
});
