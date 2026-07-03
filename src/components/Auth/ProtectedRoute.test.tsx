/**
 * ProtectedRoute auth-blip behavior (FP-07 finding 4).
 *
 * Pins the fix for the fail-open silent redirect: a transient profile-fetch
 * failure (`profileError`) must render "Couldn't load your account" + Retry
 * instead of dumping a signed-in user on `/`. The hook is mocked per test —
 * this suite is about the CONSUMER's branching, not the hook internals (those
 * are covered in useEnhancedAuth.test.ts).
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from '@/components/Auth/ProtectedRoute';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';
import { UserRole, type AuthContextValue, type EnhancedUserProfile } from '@/types/auth';

vi.mock('@/hooks/useEnhancedAuth', () => ({
  useEnhancedAuth: vi.fn(),
}));

const mockUseEnhancedAuth = useEnhancedAuth as Mock;

const activeUser: EnhancedUserProfile = {
  id: 'user-1',
  user_id: 'user-1',
  email: 'teacher@test.com',
  full_name: 'Terry Teacher',
  role: UserRole.TEACHER,
  is_active: true,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

function makeAuthValue(overrides: Partial<AuthContextValue> = {}): AuthContextValue {
  return {
    user: null,
    loading: false,
    profileError: false,
    retryAuth: vi.fn().mockResolvedValue(undefined),
    permissions: [],
    hasPermission: vi.fn().mockReturnValue(true),
    hasAnyPermission: vi.fn().mockReturnValue(true),
    hasAllPermissions: vi.fn().mockReturnValue(true),
    isAdmin: vi.fn().mockReturnValue(false),
    isReviewer: vi.fn().mockReturnValue(false),
    ...overrides,
  };
}

function renderProtected() {
  return render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/" element={<div>home sentinel</div>} />
        <Route
          path="/protected"
          element={
            <ProtectedRoute>
              <div>secret child</div>
            </ProtectedRoute>
          }
        />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute (FP-07 auth blip)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects a genuinely signed-out user (no profileError) to the redirect target', () => {
    mockUseEnhancedAuth.mockReturnValue(makeAuthValue());

    renderProtected();

    expect(screen.getByText('home sentinel')).toBeInTheDocument();
    expect(screen.queryByText('secret child')).not.toBeInTheDocument();
    expect(screen.queryByText(/couldn't load your account/i)).not.toBeInTheDocument();
  });

  it('shows "Couldn\'t load your account" + Retry (no redirect) on a profile-fetch blip', async () => {
    const retryAuth = vi.fn().mockResolvedValue(undefined);
    mockUseEnhancedAuth.mockReturnValue(
      makeAuthValue({ user: null, profileError: true, retryAuth })
    );

    const user = userEvent.setup();
    renderProtected();

    expect(screen.getByText(/couldn't load your account/i)).toBeInTheDocument();
    // Not silently dumped on the home route.
    expect(screen.queryByText('home sentinel')).not.toBeInTheDocument();
    expect(screen.queryByText('secret child')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Retry' }));
    expect(retryAuth).toHaveBeenCalledTimes(1);
  });

  it('falls through to children when a later refetch errors but user is still known', () => {
    mockUseEnhancedAuth.mockReturnValue(makeAuthValue({ user: activeUser, profileError: true }));

    renderProtected();

    // Stale-but-authenticated beats a false sign-out.
    expect(screen.getByText('secret child')).toBeInTheDocument();
    expect(screen.queryByText(/couldn't load your account/i)).not.toBeInTheDocument();
  });
});
