import { describe, it, expect, vi, beforeEach } from 'vitest';

const invoke = vi.fn();
vi.mock('@/lib/supabase', () => ({
  supabase: { functions: { invoke: (...a: unknown[]) => invoke(...a) } },
}));
vi.mock('@/utils/logger', () => ({
  logger: { error: vi.fn(), debug: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { getPermissionsForRole, sendInvitationEmail } from '@/utils/invitationEmail';
import { DEFAULT_PERMISSIONS, UserRole } from '@/types/auth';
import { logger } from '@/utils/logger';

const baseParams = {
  to: 'teacher@example.org',
  invitationId: 'inv-1',
  token: 'tok-1',
  inviterName: 'Dana Admin',
  role: 'reviewer',
  expiresAt: '2026-11-01T00:00:00.000Z',
  customMessage: 'Welcome aboard',
};

describe('getPermissionsForRole', () => {
  it('derives each invitable role from DEFAULT_PERMISSIONS', () => {
    // Self-adjusting: if DEFAULT_PERMISSIONS changes, the email lists follow.
    // The literal smoke below deliberately names only permissions that are
    // not scheduled for removal, so this file never needs to track that edit.
    expect(getPermissionsForRole('teacher')).toEqual(DEFAULT_PERMISSIONS[UserRole.TEACHER]);
    expect(getPermissionsForRole('reviewer')).toEqual(DEFAULT_PERMISSIONS[UserRole.REVIEWER]);
    expect(getPermissionsForRole('admin')).toEqual(DEFAULT_PERMISSIONS[UserRole.ADMIN]);

    expect(getPermissionsForRole('teacher')).toEqual(['view_lessons', 'submit_lessons']);
    expect(getPermissionsForRole('reviewer')).toContain('review_lessons');
    expect(getPermissionsForRole('admin')).toContain('invite_users');
  });

  it('falls back to the teacher list for an unknown role', () => {
    expect(getPermissionsForRole('nope')).toEqual(DEFAULT_PERMISSIONS[UserRole.TEACHER]);
  });
});

describe('sendInvitationEmail', () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it('invokes send-email with the invitation payload and reports delivery', async () => {
    invoke.mockResolvedValue({ data: null, error: null });

    await expect(sendInvitationEmail(baseParams)).resolves.toBe(true);

    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith('send-email', {
      body: {
        type: 'invitation',
        to: baseParams.to,
        data: {
          invitationId: baseParams.invitationId,
          token: baseParams.token,
          inviterName: baseParams.inviterName,
          role: 'reviewer',
          customMessage: baseParams.customMessage,
          permissions: DEFAULT_PERMISSIONS[UserRole.REVIEWER],
          expiresAt: baseParams.expiresAt,
        },
      },
    });
  });

  it('returns false and logs when the edge function reports an error', async () => {
    invoke.mockResolvedValue({ data: null, error: { message: 'sandbox rejected recipient' } });

    await expect(sendInvitationEmail(baseParams)).resolves.toBe(false);
    expect(logger.error).toHaveBeenCalledTimes(1);
  });

  it('returns false instead of throwing when invoke rejects', async () => {
    invoke.mockRejectedValue(new Error('network down'));

    await expect(sendInvitationEmail(baseParams)).resolves.toBe(false);
  });

  it('passes customMessage through as undefined when omitted (resend path parity)', async () => {
    invoke.mockResolvedValue({ data: null, error: null });
    const withoutMessage = {
      to: baseParams.to,
      invitationId: baseParams.invitationId,
      token: baseParams.token,
      inviterName: baseParams.inviterName,
      role: baseParams.role,
      expiresAt: baseParams.expiresAt,
    };

    await expect(sendInvitationEmail(withoutMessage)).resolves.toBe(true);

    const body = invoke.mock.calls[0][1].body;
    expect(body.data.customMessage).toBeUndefined();
    expect('customMessage' in body.data).toBe(true);
  });
});
