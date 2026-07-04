/**
 * FP4 Brief 1 · F3 — AdminUserDetail honest load-error state.
 *
 * Pins: a transient load failure (network/RLS/5xx) renders the IntFetchError
 * card + retry, NOT the affirmatively-wrong "User not found." That copy is
 * reserved for a genuine zero-row profile (`.single()` → PGRST116). Retry
 * recovers.
 *
 * `useEnhancedAuth` mocked to a full-permission admin; a table-aware supabase
 * mock supplies `.single()` for the profile and thenables for the sub-fetches.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

interface Result {
  data: unknown;
  error: unknown;
  count?: number;
}

let tableResolvers: Record<string, () => Promise<Result>> = {};
let rpcResolver: () => Promise<Result> = () => Promise.resolve({ data: [], error: null });

function resolveTable(table: string): Promise<Result> {
  const r = tableResolvers[table];
  return r ? r() : Promise.resolve({ data: [], error: null });
}

const CHAIN_METHODS = [
  'select',
  'insert',
  'update',
  'delete',
  'eq',
  'in',
  'order',
  'limit',
] as const;

function chain(table: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b: any = {};
  for (const m of CHAIN_METHODS) b[m] = () => b;
  b.single = () => resolveTable(table);
  b.maybeSingle = () => resolveTable(table);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  b.then = (onF: any, onR: any) => resolveTable(table).then(onF, onR);
  return b;
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (t: string) => chain(t),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rpc: (...a: any[]) => rpcResolver(...(a as [])),
  },
}));

vi.mock('@/hooks/useEnhancedAuth', () => ({
  useEnhancedAuth: () => ({
    user: { id: 'admin-1', role: 'admin' },
    hasPermission: () => true,
    loading: false,
  }),
}));

import { AdminUserDetail } from '@/pages/AdminUserDetail';

function renderPage() {
  return render(
    <MemoryRouter initialEntries={['/admin/users/u1']}>
      <Routes>
        <Route path="/admin/users/:userId" element={<AdminUserDetail />} />
        <Route path="/admin/users" element={<div>Users list</div>} />
      </Routes>
    </MemoryRouter>
  );
}

const USER_ROW = {
  id: 'u1',
  full_name: 'Dana Teacher',
  role: 'teacher',
  is_active: true,
  notes: null,
  user_id: 'u1',
  permissions: null,
  created_at: '2026-06-01T00:00:00Z',
  updated_at: '2026-06-02T00:00:00Z',
};

describe('AdminUserDetail — honest load-error state (F3)', () => {
  beforeEach(() => {
    tableResolvers = {};
    rpcResolver = () => Promise.resolve({ data: [], error: null });
  });

  it('shows the retryable error card on a transient failure — not "User not found."', async () => {
    tableResolvers.user_profiles = () =>
      Promise.resolve({ data: null, error: { message: 'network down' } });
    renderPage();

    expect(await screen.findByText(/could not load this user/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByText(/user not found/i)).not.toBeInTheDocument();
  });

  it('shows "User not found." only for a genuine zero-row profile (PGRST116)', async () => {
    tableResolvers.user_profiles = () =>
      Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'no rows' } });
    renderPage();

    expect(await screen.findByText(/user not found/i)).toBeInTheDocument();
    expect(screen.queryByText(/could not load this user/i)).not.toBeInTheDocument();
  });

  it('retry recovers and renders the user', async () => {
    const user = userEvent.setup();
    tableResolvers.user_profiles = () =>
      Promise.resolve({ data: null, error: { message: 'network down' } });
    renderPage();

    const retry = await screen.findByRole('button', { name: /retry/i });
    tableResolvers.user_profiles = () => Promise.resolve({ data: USER_ROW, error: null });
    await user.click(retry);

    // Name renders in both the page header (h1) and the user head (h2).
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Dana Teacher' })
    ).toBeInTheDocument();
    expect(screen.queryByText(/could not load this user/i)).not.toBeInTheDocument();
  });
});
