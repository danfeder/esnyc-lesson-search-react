import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useEnhancedAuth } from './useEnhancedAuth';
import { supabase } from '@/lib/supabase';
import { UserRole, Permission, DEFAULT_PERMISSIONS } from '@/types/auth';

// Cast supabase methods as mocks for testing
const mockGetUser = supabase.auth.getUser as Mock;
const mockOnAuthStateChange = supabase.auth.onAuthStateChange as Mock;
const mockFrom = supabase.from as Mock;

// Helper to create mock auth user
function createMockAuthUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    user_metadata: { full_name: 'Test User' },
    ...overrides,
  };
}

// Helper to create mock user profile
function createMockProfile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'user-123',
    user_id: 'user-123',
    email: 'test@example.com',
    full_name: 'Test User',
    role: UserRole.TEACHER,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe('useEnhancedAuth', () => {
  // Store auth callback for triggering events
  let authCallback: ((event: string, session: { user: unknown } | null) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    authCallback = null;

    // Default: capture auth callback
    mockOnAuthStateChange.mockImplementation((callback) => {
      authCallback = callback as typeof authCallback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    // Default: no user
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });
  });

  describe('initial state', () => {
    it('returns loading true initially', () => {
      const { result } = renderHook(() => useEnhancedAuth());

      expect(result.current.loading).toBe(true);
    });

    it('returns null user initially', () => {
      const { result } = renderHook(() => useEnhancedAuth());

      expect(result.current.user).toBeNull();
    });
  });

  describe('unauthenticated user', () => {
    it('returns null user when no auth session', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { result } = renderHook(() => useEnhancedAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });

    it('sets loading false after check', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { result } = renderHook(() => useEnhancedAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });

    it('returns empty permissions when not authenticated', async () => {
      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const { result } = renderHook(() => useEnhancedAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.permissions).toEqual([]);
    });
  });

  describe('authenticated user with existing profile', () => {
    it('fetches user profile on auth', async () => {
      const mockUser = createMockAuthUser();
      const mockProfile = createMockProfile();

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      } as any);

      const { result } = renderHook(() => useEnhancedAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(mockFrom).toHaveBeenCalledWith('user_profiles');
      expect(result.current.user).not.toBeNull();
    });

    it('returns user with correct role', async () => {
      const mockUser = createMockAuthUser();
      const mockProfile = createMockProfile({ role: UserRole.ADMIN });

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      } as any);

      const { result } = renderHook(() => useEnhancedAuth());

      await waitFor(() => {
        expect(result.current.user?.role).toBe(UserRole.ADMIN);
      });
    });

    it('sets loading to false after profile fetch', async () => {
      const mockUser = createMockAuthUser();
      const mockProfile = createMockProfile();

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      } as any);

      const { result } = renderHook(() => useEnhancedAuth());

      expect(result.current.loading).toBe(true);

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });
    });
  });

  describe('authenticated user without profile', () => {
    it('creates new profile with teacher role', async () => {
      const mockUser = createMockAuthUser();
      const insertMock = vi.fn().mockReturnThis();
      const selectMock = vi.fn().mockReturnThis();
      const singleMock = vi.fn().mockResolvedValue({
        data: createMockProfile(),
        error: null,
      });

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // First call: profile doesn't exist
      // Second call: insert new profile
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as any)
        .mockReturnValueOnce({
          insert: insertMock,
          select: selectMock,
          single: singleMock,
        } as any);

      const { result } = renderHook(() => useEnhancedAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRole.TEACHER,
        })
      );
    });

    it('uses email metadata for full_name', async () => {
      const mockUser = createMockAuthUser({
        user_metadata: { full_name: 'John Doe' },
      });
      const insertMock = vi.fn().mockReturnThis();

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as any)
        .mockReturnValueOnce({
          insert: insertMock,
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: createMockProfile({ full_name: 'John Doe' }),
            error: null,
          }),
        } as any);

      const { result } = renderHook(() => useEnhancedAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: 'John Doe',
        })
      );
    });

    it('falls back to email prefix if no full_name', async () => {
      const mockUser = createMockAuthUser({
        email: 'johndoe@example.com',
        user_metadata: {},
      });
      const insertMock = vi.fn().mockReturnThis();

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as any)
        .mockReturnValueOnce({
          insert: insertMock,
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: createMockProfile({ full_name: 'johndoe' }),
            error: null,
          }),
        } as any);

      const { result } = renderHook(() => useEnhancedAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(insertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          full_name: 'johndoe',
        })
      );
    });
  });

  describe('auth state changes', () => {
    it('updates user on sign in event', async () => {
      const mockUser = createMockAuthUser();
      const mockProfile = createMockProfile();

      mockGetUser.mockResolvedValue({
        data: { user: null },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      } as any);

      const { result } = renderHook(() => useEnhancedAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();

      // Trigger sign in event
      act(() => {
        authCallback?.('SIGNED_IN', { user: mockUser });
      });

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });
    });

    it('clears user on sign out event', async () => {
      const mockUser = createMockAuthUser();
      const mockProfile = createMockProfile();

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      } as any);

      const { result } = renderHook(() => useEnhancedAuth());

      await waitFor(() => {
        expect(result.current.user).not.toBeNull();
      });

      // Trigger sign out event
      act(() => {
        authCallback?.('SIGNED_OUT', null);
      });

      await waitFor(() => {
        expect(result.current.user).toBeNull();
      });
    });

    it('unsubscribes on unmount', () => {
      const unsubscribeMock = vi.fn();
      mockOnAuthStateChange.mockReturnValue({
        data: { subscription: { unsubscribe: unsubscribeMock } },
      });

      const { unmount } = renderHook(() => useEnhancedAuth());

      unmount();

      expect(unsubscribeMock).toHaveBeenCalled();
    });
  });

  describe('permissions - role-based', () => {
    async function setupUserWithRole(role: UserRole) {
      const mockUser = createMockAuthUser();
      const mockProfile = createMockProfile({ role });

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      } as any);

      const { result } = renderHook(() => useEnhancedAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      return result;
    }

    it('returns correct permissions for teacher role', async () => {
      const result = await setupUserWithRole(UserRole.TEACHER);

      expect(result.current.permissions).toEqual(
        expect.arrayContaining(DEFAULT_PERMISSIONS[UserRole.TEACHER])
      );
      expect(result.current.permissions.length).toBe(DEFAULT_PERMISSIONS[UserRole.TEACHER].length);
    });

    it('returns correct permissions for reviewer role', async () => {
      const result = await setupUserWithRole(UserRole.REVIEWER);

      expect(result.current.permissions).toEqual(
        expect.arrayContaining(DEFAULT_PERMISSIONS[UserRole.REVIEWER])
      );
    });

    it('returns correct permissions for admin role', async () => {
      const result = await setupUserWithRole(UserRole.ADMIN);

      expect(result.current.permissions).toEqual(
        expect.arrayContaining(DEFAULT_PERMISSIONS[UserRole.ADMIN])
      );
    });

    it('returns correct permissions for super_admin role', async () => {
      const result = await setupUserWithRole(UserRole.SUPER_ADMIN);

      // Super admin has all permissions
      expect(result.current.permissions.length).toBe(Object.values(Permission).length);
    });
  });

  describe('permissions - custom overrides', () => {
    it('adds custom permissions to role defaults', async () => {
      const mockUser = createMockAuthUser();
      const mockProfile = createMockProfile({
        role: UserRole.TEACHER,
        permissions: {
          [Permission.VIEW_ANALYTICS]: true, // Add permission not in teacher defaults
        },
      });

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      } as any);

      const { result } = renderHook(() => useEnhancedAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.permissions).toContain(Permission.VIEW_ANALYTICS);
      expect(result.current.permissions).toContain(Permission.VIEW_LESSONS); // Default
    });

    it('removes explicitly disabled permissions', async () => {
      const mockUser = createMockAuthUser();
      const mockProfile = createMockProfile({
        role: UserRole.TEACHER,
        permissions: {
          [Permission.VIEW_LESSONS]: false, // Disable a default permission
        },
      });

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      } as any);

      const { result } = renderHook(() => useEnhancedAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.permissions).not.toContain(Permission.VIEW_LESSONS);
      expect(result.current.permissions).toContain(Permission.SUBMIT_LESSONS); // Other default
    });
  });

  describe('permission helpers', () => {
    async function setupActiveTeacher() {
      const mockUser = createMockAuthUser();
      const mockProfile = createMockProfile({
        role: UserRole.TEACHER,
        is_active: true,
      });

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      } as any);

      const { result } = renderHook(() => useEnhancedAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      return result;
    }

    it('hasPermission returns true for granted permission', async () => {
      const result = await setupActiveTeacher();

      expect(result.current.hasPermission(Permission.VIEW_LESSONS)).toBe(true);
    });

    it('hasPermission returns false for denied permission', async () => {
      const result = await setupActiveTeacher();

      expect(result.current.hasPermission(Permission.DELETE_LESSONS)).toBe(false);
    });

    it('hasPermission returns false for inactive user', async () => {
      const mockUser = createMockAuthUser();
      const mockProfile = createMockProfile({
        role: UserRole.ADMIN, // Has many permissions
        is_active: false, // But inactive
      });

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      } as any);

      const { result } = renderHook(() => useEnhancedAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.hasPermission(Permission.VIEW_LESSONS)).toBe(false);
    });

    it('hasAnyPermission returns true if any match', async () => {
      const result = await setupActiveTeacher();

      expect(
        result.current.hasAnyPermission([Permission.DELETE_LESSONS, Permission.VIEW_LESSONS])
      ).toBe(true);
    });

    it('hasAnyPermission returns false if none match', async () => {
      const result = await setupActiveTeacher();

      expect(
        result.current.hasAnyPermission([Permission.DELETE_LESSONS, Permission.MANAGE_ROLES])
      ).toBe(false);
    });

    it('hasAllPermissions returns true if all match', async () => {
      const result = await setupActiveTeacher();

      expect(
        result.current.hasAllPermissions([Permission.VIEW_LESSONS, Permission.SUBMIT_LESSONS])
      ).toBe(true);
    });

    it('hasAllPermissions returns false if any missing', async () => {
      const result = await setupActiveTeacher();

      expect(
        result.current.hasAllPermissions([Permission.VIEW_LESSONS, Permission.DELETE_LESSONS])
      ).toBe(false);
    });
  });

  describe('role helpers', () => {
    async function setupUserWithRole(role: UserRole, isActive = true) {
      const mockUser = createMockAuthUser();
      const mockProfile = createMockProfile({ role, is_active: isActive });

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: mockProfile, error: null }),
      } as any);

      const { result } = renderHook(() => useEnhancedAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      return result;
    }

    it('isAdmin returns true for admin', async () => {
      const result = await setupUserWithRole(UserRole.ADMIN);
      expect(result.current.isAdmin()).toBe(true);
    });

    it('isAdmin returns true for super_admin', async () => {
      const result = await setupUserWithRole(UserRole.SUPER_ADMIN);
      expect(result.current.isAdmin()).toBe(true);
    });

    it('isAdmin returns false for teacher', async () => {
      const result = await setupUserWithRole(UserRole.TEACHER);
      expect(result.current.isAdmin()).toBe(false);
    });

    it('isAdmin returns false for reviewer', async () => {
      const result = await setupUserWithRole(UserRole.REVIEWER);
      expect(result.current.isAdmin()).toBe(false);
    });

    it('isAdmin returns false for inactive admin', async () => {
      const result = await setupUserWithRole(UserRole.ADMIN, false);
      expect(result.current.isAdmin()).toBe(false);
    });

    it('isReviewer returns true for reviewer', async () => {
      const result = await setupUserWithRole(UserRole.REVIEWER);
      expect(result.current.isReviewer()).toBe(true);
    });

    it('isReviewer returns true for admin', async () => {
      const result = await setupUserWithRole(UserRole.ADMIN);
      expect(result.current.isReviewer()).toBe(true);
    });

    it('isReviewer returns true for super_admin', async () => {
      const result = await setupUserWithRole(UserRole.SUPER_ADMIN);
      expect(result.current.isReviewer()).toBe(true);
    });

    it('isReviewer returns false for teacher', async () => {
      const result = await setupUserWithRole(UserRole.TEACHER);
      expect(result.current.isReviewer()).toBe(false);
    });

    it('isReviewer returns false for inactive reviewer', async () => {
      const result = await setupUserWithRole(UserRole.REVIEWER, false);
      expect(result.current.isReviewer()).toBe(false);
    });
  });

  describe('error handling', () => {
    it('handles getUser error gracefully', async () => {
      mockGetUser.mockRejectedValue(new Error('Auth error'));

      const { result } = renderHook(() => useEnhancedAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      expect(result.current.user).toBeNull();
    });

    it('handles profile fetch error gracefully', async () => {
      const mockUser = createMockAuthUser();

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({
          data: null,
          error: { code: 'SOME_ERROR', message: 'Database error' },
        }),
      } as any);

      const { result } = renderHook(() => useEnhancedAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should not crash, user remains null
      expect(result.current.user).toBeNull();
    });

    it('handles profile create error gracefully', async () => {
      const mockUser = createMockAuthUser();

      mockGetUser.mockResolvedValue({
        data: { user: mockUser },
        error: null,
      });

      // First call: no profile exists
      // Second call: insert fails
      mockFrom
        .mockReturnValueOnce({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as any)
        .mockReturnValueOnce({
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Insert failed' },
          }),
        } as any);

      const { result } = renderHook(() => useEnhancedAuth());

      await waitFor(() => {
        expect(result.current.loading).toBe(false);
      });

      // Should still set a basic user object even if insert fails
      expect(result.current.user).not.toBeNull();
      expect(result.current.user?.role).toBe(UserRole.TEACHER);
    });
  });
});
