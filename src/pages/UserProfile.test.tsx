/**
 * UserProfile page-level regression tests for FP-06 (fp1-audit state-bugs F2).
 *
 * The contract under test: page data loads are keyed on the STABLE `user.id`,
 * not the `user` object identity. `useEnhancedAuth` setUser()s a fresh object
 * on every background auth event (hourly TOKEN_REFRESHED, tab refocus,
 * USER_UPDATED from a password change) — before the fix that re-fired the load
 * effect, flashed the full-page spinner, and setFormData() clobbered
 * in-progress edits. Mocking the hook and swapping its returned object is the
 * precise lever for that contract.
 *
 * NOTE for the F4 slice (auth context provider): if useEnhancedAuth is lifted
 * into an AuthProvider, the vi.mock target below changes — mechanical update.
 */
import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import type { ReactElement } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';
import { UserRole, type AuthContextValue, type EnhancedUserProfile } from '@/types/auth';
import { UserProfile } from '@/pages/UserProfile';

vi.mock('@/hooks/useEnhancedAuth');

const mockUseEnhancedAuth = vi.mocked(useEnhancedAuth);
const mockFrom = supabase.from as Mock;

// Table rows keyed by the id the page passes to `.eq(...)` — the user-id-change
// test relies on the fetched name varying with the queried id.
const PROFILE_ROWS: Record<string, { full_name: string; school_borough: string }> = {
  'user-1': { full_name: 'DB Name', school_borough: 'Queens' },
  'user-2': { full_name: 'Second User', school_borough: 'Brooklyn' },
};

function makeUser(overrides: Partial<EnhancedUserProfile> = {}): EnhancedUserProfile {
  return {
    id: 'user-1',
    user_id: 'user-1',
    email: 'teacher@example.com',
    full_name: 'DB Name',
    role: UserRole.TEACHER,
    is_active: true,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeAuth(user: EnhancedUserProfile | null): AuthContextValue {
  return {
    user,
    loading: false,
    profileError: false,
    retryAuth: vi.fn(),
    permissions: [],
    hasPermission: vi.fn(() => false),
    hasAnyPermission: vi.fn(() => false),
    hasAllPermissions: vi.fn(() => false),
    isAdmin: vi.fn(() => false),
    isReviewer: vi.fn(() => false),
  };
}

// Awaitable query result (`await supabase.from(...).select(...).eq(...)`) —
// same thenable shape as the global setup mock (setup.ts).
function thenable(result: { data: unknown; error: null }) {
  return {
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
}

// Table-aware supabase.from override (global setup mocks the module; we swap
// in per-table chains matching the page's exact call shapes).
function installFromMock() {
  mockFrom.mockImplementation((table: string) => {
    if (table === 'user_profiles') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn((_col: string, id: string) => ({
            single: vi.fn().mockResolvedValue({
              data: PROFILE_ROWS[id] ?? { full_name: '', school_borough: '' },
              error: null,
            }),
          })),
        }),
      };
    }
    if (table === 'user_schools') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue(thenable({ data: [], error: null })),
        }),
      };
    }
    if (table === 'lesson_submissions') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue(thenable({ data: [], error: null })),
          }),
        }),
      };
    }
    throw new Error(`Unexpected table in UserProfile test: ${table}`);
  });
}

function profileFetchCount() {
  return mockFrom.mock.calls.filter(([table]) => table === 'user_profiles').length;
}

function renderProfile() {
  return render(
    <MemoryRouter>
      <UserProfile />
    </MemoryRouter>
  );
}

function rerenderProfile(rerender: (ui: ReactElement) => void) {
  rerender(
    <MemoryRouter>
      <UserProfile />
    </MemoryRouter>
  );
}

async function loadPage() {
  mockUseEnhancedAuth.mockReturnValue(makeAuth(makeUser()));
  const view = renderProfile();
  // Readonly "Full name" value proves the initial load completed.
  await screen.findByText('DB Name');
  expect(profileFetchCount()).toBe(1);
  return view;
}

function startEditingDraftName() {
  fireEvent.click(screen.getByRole('button', { name: 'Edit profile' }));
  const input = screen.getByPlaceholderText('Enter your full name');
  fireEvent.change(input, { target: { value: 'Draft Name' } });
  return input;
}

beforeEach(() => {
  installFromMock();
});

describe('UserProfile — FP-06 background auth events must not clobber edits', () => {
  it('same-id user identity churn does not reload or clobber in-progress edits', async () => {
    const { rerender } = await loadPage();
    const input = startEditingDraftName();
    expect(input).toHaveValue('Draft Name');

    // Fresh object, identical fields — what every TOKEN_REFRESHED /
    // USER_UPDATED / redundant SIGNED_IN hands to consumers.
    mockUseEnhancedAuth.mockReturnValue(makeAuth(makeUser()));
    rerenderProfile(rerender);

    expect(screen.getByPlaceholderText('Enter your full name')).toHaveValue('Draft Name');
    expect(screen.queryByText(/Loading your profile/)).not.toBeInTheDocument();
    expect(profileFetchCount()).toBe(1);
  });

  it('a different user id refetches page data for the new user', async () => {
    const { rerender } = await loadPage();

    mockUseEnhancedAuth.mockReturnValue(
      makeAuth(makeUser({ id: 'user-2', user_id: 'user-2', email: 'second@example.com' }))
    );
    rerenderProfile(rerender);

    await screen.findByText('Second User');
    expect(profileFetchCount()).toBe(2);
  });

  it('sign-out renders the signed-out branch without fetching', async () => {
    const { rerender } = await loadPage();

    mockUseEnhancedAuth.mockReturnValue(makeAuth(null));
    rerenderProfile(rerender);

    // In the real app ProtectedRoute redirects first; this pins the in-page
    // fallback plus the no-fetch gate on a nullish user id.
    expect(await screen.findByText('Sign in required')).toBeInTheDocument();
    expect(profileFetchCount()).toBe(1);
  });

  it('Cancel still resets the form from the DB (rejected editMode-guard would break this)', async () => {
    await loadPage();
    startEditingDraftName();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(profileFetchCount()).toBe(2));
    // Back to readonly view showing the DB value, draft discarded.
    expect(await screen.findByText('DB Name')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Draft Name')).not.toBeInTheDocument();
  });
});
