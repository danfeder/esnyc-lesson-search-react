/**
 * FP4 Brief 1 · F6 — AdminInviteUser pending-invite check honesty.
 *
 * Pins: when the live pending-invite check ERRORS, the form no longer treats the
 * null result as "no duplicate" and proceeds — it surfaces a retryable inline
 * message and disables Send. Retry (on a now-clear check) re-enables Send.
 *
 * `useEnhancedAuth` mocked to an INVITE_USERS admin; a table-aware supabase mock
 * controls the `user_invitations` dup-check result (schools resolve empty).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

interface Result {
  data: unknown;
  error: unknown;
}

let tableResolvers: Record<string, () => Promise<Result>> = {};

function resolveTable(table: string): Promise<Result> {
  const r = tableResolvers[table];
  return r ? r() : Promise.resolve({ data: [], error: null });
}

const CHAIN_METHODS = ['select', 'eq', 'is', 'order', 'limit'] as const;

function chain(table: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b: any = {};
  for (const m of CHAIN_METHODS) b[m] = () => b;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  b.then = (onF: any, onR: any) => resolveTable(table).then(onF, onR);
  return b;
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (t: string) => chain(t),
  },
}));

vi.mock('@/hooks/useEnhancedAuth', () => ({
  useEnhancedAuth: () => ({
    user: { id: 'admin-1', email: 'admin@test.com', full_name: 'Admin' },
    hasPermission: () => true,
    loading: false,
  }),
}));

import { AdminInviteUser } from '@/pages/AdminInviteUser';

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminInviteUser />
    </MemoryRouter>
  );
}

describe('AdminInviteUser — pending-invite check honesty (F6)', () => {
  beforeEach(() => {
    tableResolvers = {};
  });

  it('blocks submit and shows a retryable message when the dup-check errors', async () => {
    const user = userEvent.setup();
    tableResolvers.user_invitations = () =>
      Promise.resolve({ data: null, error: { message: 'boom' } });
    renderPage();

    await user.type(screen.getByPlaceholderText('teacher@school.org'), 'teacher@school.org');

    expect(await screen.findByText(/couldn't check for an existing invite/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send invite/i })).toBeDisabled();
  });

  it('retry clears the block and re-enables Send once the check succeeds', async () => {
    const user = userEvent.setup();
    tableResolvers.user_invitations = () =>
      Promise.resolve({ data: null, error: { message: 'boom' } });
    renderPage();

    await user.type(screen.getByPlaceholderText('teacher@school.org'), 'teacher@school.org');
    const retry = await screen.findByRole('button', { name: /^retry$/i });

    // Next check succeeds with no pending invite.
    tableResolvers.user_invitations = () => Promise.resolve({ data: [], error: null });
    await user.click(retry);

    await waitFor(() =>
      expect(screen.queryByText(/couldn't check for an existing invite/i)).not.toBeInTheDocument()
    );
    expect(screen.getByRole('button', { name: /send invite/i })).toBeEnabled();
  });
});
