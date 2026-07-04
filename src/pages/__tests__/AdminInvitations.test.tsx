/**
 * FP4 Brief 1 · F4 — AdminInvitations honest load-error state.
 *
 * Pins: a failed LOAD renders the persistent IntFetchError card + retry, never
 * the self-dismissing toast that left the "No pending invitations" / "Invite
 * your first teacher…" empty CTA as the resting state. A genuine empty response
 * still shows the empty CTA. Retry refetches.
 *
 * `useEnhancedAuth` is mocked to a VIEW_USERS admin; supabase supplies the one
 * `user_invitations` list query (read lazily so tests can swap it per call).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

let listResult: () => Promise<{ data: unknown; error: unknown }> = () =>
  Promise.resolve({ data: [], error: null });

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        order: () => listResult(),
      }),
    }),
  },
}));

vi.mock('@/hooks/useEnhancedAuth', () => ({
  useEnhancedAuth: () => ({
    user: { id: 'admin-1', email: 'admin@test.com' },
    hasPermission: () => true,
    loading: false,
  }),
}));

import { AdminInvitations } from '@/pages/AdminInvitations';

const PENDING_ROW = {
  id: 'inv1',
  email: 'teach@school.org',
  role: 'teacher',
  invited_at: '2026-07-01T00:00:00Z',
  expires_at: '2030-01-01T00:00:00Z',
  accepted_at: null,
  invited_by: 'admin-1',
  token: 'tok-1',
  school_name: null,
  school_borough: null,
  metadata: null,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminInvitations />
    </MemoryRouter>
  );
}

describe('AdminInvitations — honest load-error state (F4)', () => {
  beforeEach(() => {
    listResult = () => Promise.resolve({ data: [], error: null });
  });

  it('shows the retryable error card on load failure — not the empty CTA', async () => {
    listResult = () => Promise.resolve({ data: null, error: { message: 'boom' } });
    renderPage();

    expect(await screen.findByText(/could not load invitations/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByText(/no pending invitations/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/invite your first teacher/i)).not.toBeInTheDocument();
  });

  it('shows the empty CTA only on a genuinely-empty successful load', async () => {
    listResult = () => Promise.resolve({ data: [], error: null });
    renderPage();

    // Default tab is Pending → the pending empty copy (not the error card).
    expect(await screen.findByText(/no pending invitations/i)).toBeInTheDocument();
    expect(screen.queryByText(/could not load invitations/i)).not.toBeInTheDocument();
  });

  it('retry refetches and renders the recovered list', async () => {
    const user = userEvent.setup();
    listResult = () => Promise.resolve({ data: null, error: { message: 'boom' } });
    renderPage();

    const retry = await screen.findByRole('button', { name: /retry/i });
    listResult = () => Promise.resolve({ data: [PENDING_ROW], error: null });
    await user.click(retry);

    expect(await screen.findByText('teach@school.org')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.queryByText(/could not load invitations/i)).not.toBeInTheDocument()
    );
  });
});
