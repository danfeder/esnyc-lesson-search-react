/**
 * ReviewDashboard honest-error behavior (FP-05 finding 1 + FP-07 finding 5).
 *
 * Pins the two fail-open fixes:
 *  - a failed role-check FETCH renders "Couldn't check your access" + Retry,
 *    never the "Access denied" screen (that copy is reserved for a
 *    successfully-fetched non-reviewer role);
 *  - a failed submissions fetch renders an error card + Retry in the queue
 *    card, never the "No submissions" empty state (reserved for a successful
 *    empty fetch).
 *
 * Uses the table-aware supabase mock (dispatch-by-table, final-state asserts)
 * following the review-detail-page.test.tsx conventions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { makeReviewSupabaseMock, type TableResult } from '@/__tests__/helpers/supabaseReviewMock';

// Module-scope mocks, read LAZILY by the vi.mock factory's arrows (the
// consumption contract documented in supabaseReviewMock.ts) — reassigning
// `currentMock` per test / mid-test is safe.
const getUserMock = vi.fn();
let currentMock = makeReviewSupabaseMock({});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => currentMock.from(table),
    auth: { getUser: () => getUserMock() },
  },
}));

// Import after the mock (mirrors review-detail-page.test.tsx).
import { ReviewDashboard } from '@/pages/ReviewDashboard';

const AUTH_USER = { id: 'reviewer-1', email: 'reviewer@test.com' };

// user_profiles serves BOTH checkAuth's `.single()` (unwraps to the FIRST
// element → keep the reviewer first) and loadSubmissions' teacher-name `.in()`
// (bare await → whole array).
const profilesOk: TableResult = {
  data: [
    { id: 'reviewer-1', full_name: 'Rev Iewer', role: 'reviewer' },
    { id: 'teacher-1', full_name: 'Terry Teacher', role: 'teacher' },
  ],
  error: null,
};

const submissionRow = {
  id: 'sub-1',
  created_at: '2026-06-01T00:00:00.000Z',
  teacher_id: 'teacher-1',
  google_doc_url: 'https://docs.google.com/document/d/1',
  google_doc_id: 'doc-1',
  submission_type: 'new',
  status: 'submitted',
  extracted_title: 'Compost Cake Lesson',
  extracted_content: '',
  original_lesson_id: null,
};

const authErrorFixture: Record<string, TableResult> = {
  user_profiles: { data: null, error: { message: 'connection refused' } },
};

const queueErrorFixture: Record<string, TableResult> = {
  user_profiles: profilesOk,
  lesson_submissions: { data: null, error: { message: 'connection refused' } },
};

const successFixture: Record<string, TableResult> = {
  user_profiles: profilesOk,
  lesson_submissions: { data: [submissionRow], error: null },
  submission_similarities: { data: [], error: null },
};

const emptyFixture: Record<string, TableResult> = {
  user_profiles: profilesOk,
  lesson_submissions: { data: [], error: null },
  submission_similarities: { data: [], error: null },
};

function renderDashboard() {
  return render(
    <MemoryRouter initialEntries={['/review']}>
      <ReviewDashboard />
    </MemoryRouter>
  );
}

describe('ReviewDashboard honest error states (FP-05/FP-07)', () => {
  beforeEach(() => {
    getUserMock.mockReset().mockResolvedValue({ data: { user: AUTH_USER }, error: null });
    currentMock = makeReviewSupabaseMock(successFixture);
  });

  it('shows "Couldn\'t check your access" + Retry (never "Access denied") when the role fetch fails', async () => {
    currentMock = makeReviewSupabaseMock(authErrorFixture);

    renderDashboard();

    expect(await screen.findByText(/couldn't check your access/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByText(/access denied/i)).not.toBeInTheDocument();
  });

  it('shows the queue error card + Retry (never "No submissions") when the submissions fetch fails', async () => {
    currentMock = makeReviewSupabaseMock(queueErrorFixture);

    renderDashboard();

    expect(await screen.findByText(/couldn't load the review queue/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByText('No submissions')).not.toBeInTheDocument();
  });

  it('Retry reloads the queue once the fetch succeeds', async () => {
    currentMock = makeReviewSupabaseMock(queueErrorFixture);
    const user = userEvent.setup();

    renderDashboard();

    const retry = await screen.findByRole('button', { name: 'Retry' });
    // The blip clears — flip the mock to success and retry.
    currentMock = makeReviewSupabaseMock(successFixture);
    await user.click(retry);

    expect(await screen.findByText('Compost Cake Lesson')).toBeInTheDocument();
    expect(screen.queryByText(/couldn't load the review queue/i)).not.toBeInTheDocument();
  });

  it('still shows the "No submissions" empty state on a successful empty fetch', async () => {
    currentMock = makeReviewSupabaseMock(emptyFixture);

    renderDashboard();

    expect(await screen.findByText('No submissions')).toBeInTheDocument();
    expect(screen.queryByText(/couldn't load the review queue/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
  });
});
