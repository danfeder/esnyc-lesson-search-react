/**
 * UserProfile "My submissions" honest-error behavior (FP-05 finding 2).
 *
 * Pins the fail-open fix: a failed submissions fetch renders an error card +
 * Retry inside the "My submissions" card — never "No submissions yet" (which
 * would also hide the resubmit path for a returned lesson). Retry restores the
 * path to the resubmit button.
 *
 * Auth is mocked at the hook boundary (signed-in teacher); supabase uses the
 * table-aware mock following the review-detail-page.test.tsx conventions.
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { makeReviewSupabaseMock, type TableResult } from '@/__tests__/helpers/supabaseReviewMock';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';
import { UserRole, type EnhancedUserProfile } from '@/types/auth';

vi.mock('@/hooks/useEnhancedAuth', () => ({
  useEnhancedAuth: vi.fn(),
}));

// Module-scope mock, read LAZILY by the vi.mock factory's arrows (the
// consumption contract documented in supabaseReviewMock.ts).
let currentMock = makeReviewSupabaseMock({});

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => currentMock.from(table),
    functions: { invoke: vi.fn() },
    auth: { updateUser: vi.fn() },
  },
}));

// Import after the mocks.
import { UserProfile } from '@/pages/UserProfile';

const teacherUser: EnhancedUserProfile = {
  id: 'teacher-1',
  user_id: 'teacher-1',
  email: 'teacher@test.com',
  full_name: 'Terry Teacher',
  role: UserRole.TEACHER,
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

// loadUserProfile's two fetches (profile card + schools) succeed in every test
// so the page renders past its own loading state; only the submissions fetch
// varies.
const profileTables: Record<string, TableResult> = {
  user_profiles: {
    data: [{ id: 'teacher-1', full_name: 'Terry Teacher', school_borough: 'Brooklyn' }],
    error: null,
  },
  user_schools: { data: [], error: null },
};

const needsRevisionRow = {
  id: 'sub-9',
  google_doc_url: 'https://docs.google.com/document/d/9',
  extracted_title: 'Herb Garden Lesson',
  status: 'needs_revision',
  submission_type: 'new',
  revision_requested_reason: 'Please add grade levels.',
  created_at: '2026-06-01T00:00:00.000Z',
  updated_at: '2026-06-01T00:00:00.000Z',
};

const submissionsErrorFixture: Record<string, TableResult> = {
  ...profileTables,
  lesson_submissions: { data: null, error: { message: 'connection refused' } },
};

const submissionsOkFixture: Record<string, TableResult> = {
  ...profileTables,
  lesson_submissions: { data: [needsRevisionRow], error: null },
};

function renderProfile() {
  return render(
    <MemoryRouter initialEntries={['/profile']}>
      <UserProfile />
    </MemoryRouter>
  );
}

describe('UserProfile "My submissions" honest error state (FP-05)', () => {
  beforeEach(() => {
    (useEnhancedAuth as Mock).mockReturnValue({ user: teacherUser, loading: false });
    currentMock = makeReviewSupabaseMock(submissionsOkFixture);
  });

  it('shows an error card + Retry (never "No submissions yet") when the fetch fails', async () => {
    currentMock = makeReviewSupabaseMock(submissionsErrorFixture);

    renderProfile();

    expect(await screen.findByText(/couldn't load your submissions/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    expect(screen.queryByText('No submissions yet')).not.toBeInTheDocument();
  });

  it('Retry restores the submissions list including the resubmit path', async () => {
    currentMock = makeReviewSupabaseMock(submissionsErrorFixture);
    const user = userEvent.setup();

    renderProfile();

    const retry = await screen.findByRole('button', { name: 'Retry' });
    // The blip clears — flip the mock to success and retry.
    currentMock = makeReviewSupabaseMock(submissionsOkFixture);
    await user.click(retry);

    expect(await screen.findByText('Herb Garden Lesson')).toBeInTheDocument();
    // The returned lesson's resubmit button is reachable again.
    expect(screen.getByRole('button', { name: /send it back for review/i })).toBeInTheDocument();
    expect(screen.queryByText(/couldn't load your submissions/i)).not.toBeInTheDocument();
  });
});
