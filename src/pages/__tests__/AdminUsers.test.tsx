/**
 * FP4 Brief 1 · F1 + FP20a — AdminUsers honest load-error state & staleness guard.
 *
 * Pins:
 *  - F1: a failed users load renders the IntFetchError card + retry, never the
 *    confidently-wrong "No users found." A genuine empty response still shows
 *    "No users found." Retry refetches.
 *  - FP20a: with the request-id ref guard, a slow load A that resolves AFTER a
 *    later load B must not clobber B's rows.
 *
 * AdminUsers has no in-component auth hook (route-guarded upstream), so it mounts
 * directly. One file-scoped, table-aware supabase mock (read lazily) backs every
 * test; the stale test swaps the `user_profiles` resolver for a deferred queue.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

interface Result {
  data: unknown;
  error: unknown;
  count?: number;
}

// Per-table lazily-invoked resolvers. Unset tables resolve empty. Reset in
// beforeEach so tests don't leak into each other.
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
  'neq',
  'or',
  'is',
  'in',
  'order',
  'range',
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
    auth: {
      getUser: () => Promise.resolve({ data: { user: { id: 'admin' } }, error: null }),
    },
    functions: { invoke: () => Promise.resolve({ data: {}, error: null }) },
  },
}));

import { AdminUsers } from '@/pages/AdminUsers';

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminUsers />
    </MemoryRouter>
  );
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

describe('AdminUsers — honest load-error state (F1)', () => {
  beforeEach(() => {
    tableResolvers = {};
    rpcResolver = () => Promise.resolve({ data: [], error: null });
  });

  it('shows the retryable error card on load failure — not "No users found."', async () => {
    tableResolvers.user_profiles = () =>
      Promise.resolve({ data: null, error: { message: 'boom' } });
    renderPage();

    expect(await screen.findByText(/could not load users/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
    expect(screen.queryByText(/no users found/i)).not.toBeInTheDocument();
  });

  it('shows "No users found." only on a genuinely-empty successful load', async () => {
    tableResolvers.user_profiles = () => Promise.resolve({ data: [], error: null, count: 0 });
    renderPage();

    expect(await screen.findByText(/no users found/i)).toBeInTheDocument();
    expect(screen.queryByText(/could not load users/i)).not.toBeInTheDocument();
  });

  it('retry refetches and recovers', async () => {
    const user = userEvent.setup();
    tableResolvers.user_profiles = () =>
      Promise.resolve({ data: null, error: { message: 'boom' } });
    renderPage();

    const retry = await screen.findByRole('button', { name: /retry/i });
    tableResolvers.user_profiles = () => Promise.resolve({ data: [], error: null, count: 0 });
    await user.click(retry);

    expect(await screen.findByText(/no users found/i)).toBeInTheDocument();
    expect(screen.queryByText(/could not load users/i)).not.toBeInTheDocument();
  });
});

describe('AdminUsers — staleness guard (FP20a)', () => {
  beforeEach(() => {
    tableResolvers = {};
    rpcResolver = () => Promise.resolve({ data: [], error: null });
  });

  it('a slow load resolving after a newer load does not clobber the newer rows', async () => {
    const user = userEvent.setup();
    // Initial mount loads resolve empty.
    tableResolvers.user_profiles = () => Promise.resolve({ data: [], error: null, count: 0 });
    renderPage();
    await screen.findByText(/no users found/i);

    // Now queue two deferred loads: A (first click) then B (second click).
    const dA = deferred<Result>();
    const dB = deferred<Result>();
    const queue: Array<() => Promise<Result>> = [() => dA.promise, () => dB.promise];
    tableResolvers.user_profiles = () =>
      (queue.shift() ?? (() => Promise.resolve({ data: [], error: null, count: 0 })))();
    // B is the winning load; its nested email lookup returns Bob.
    rpcResolver = () =>
      Promise.resolve({ data: [{ id: 'userB', email: 'bob@win.com' }], error: null });

    // Two fast tab-clicks → load A then load B.
    await user.click(screen.getByRole('tab', { name: 'Reviewers' }));
    await user.click(screen.getByRole('tab', { name: 'Teachers' }));

    // Resolve the NEWER load B first — its rows apply.
    await act(async () => {
      dB.resolve({
        data: [{ id: 'userB', full_name: 'Bob Winner', role: 'teacher', is_active: true }],
        error: null,
        count: 1,
      });
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(await screen.findByText('Bob Winner')).toBeInTheDocument();

    // Now resolve the STALE load A. The guard must discard it — Bob stays, Alice
    // never appears. Flush generously so a broken guard would have time to apply.
    await act(async () => {
      dA.resolve({
        data: [{ id: 'userA', full_name: 'Alice Stale', role: 'reviewer', is_active: true }],
        error: null,
        count: 1,
      });
      await new Promise((r) => setTimeout(r, 25));
    });

    expect(screen.getByText('Bob Winner')).toBeInTheDocument();
    expect(screen.queryByText('Alice Stale')).not.toBeInTheDocument();
  });
});
