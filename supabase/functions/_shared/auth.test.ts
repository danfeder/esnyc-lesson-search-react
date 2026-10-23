import { describe, it, expect, vi } from 'vitest';
import {
  bearerToken,
  isServiceRoleToken,
  requireUserWithRole,
  type GateClient,
} from './auth.ts';

const user = { id: 'user-1', email: 'reviewer@example.com' };

function stubClient(opts: {
  getUser?: { data: { user: unknown }; error: unknown };
  profile?: { role: string } | null;
}): GateClient & { single: ReturnType<typeof vi.fn> } {
  const single = vi.fn(async () => ({ data: opts.profile ?? null, error: null }));
  return {
    auth: {
      getUser: async () => opts.getUser ?? { data: { user }, error: null },
    },
    from: () => ({ select: () => ({ eq: () => ({ single }) }) }),
    single,
  };
}

describe('bearerToken', () => {
  it('returns null without an Authorization header', () => {
    expect(bearerToken(new Request('https://x.test'))).toBeNull();
  });

  it('strips the Bearer prefix', () => {
    const req = new Request('https://x.test', { headers: { Authorization: 'Bearer abc.def' } });
    expect(bearerToken(req)).toBe('abc.def');
  });
});

describe('isServiceRoleToken', () => {
  it('accepts an identical key', () => {
    expect(isServiceRoleToken('secret-key-123', 'secret-key-123')).toBe(true);
  });

  it('rejects a one-byte difference', () => {
    expect(isServiceRoleToken('secret-key-124', 'secret-key-123')).toBe(false);
  });

  it('rejects a length mismatch', () => {
    expect(isServiceRoleToken('secret-key-12', 'secret-key-123')).toBe(false);
  });
});

describe('requireUserWithRole', () => {
  it('fails with invalid_token when getUser errors', async () => {
    const client = stubClient({ getUser: { data: { user: null }, error: new Error('bad jwt') } });
    await expect(requireUserWithRole(client, 't', ['admin'])).resolves.toEqual({
      ok: false,
      reason: 'invalid_token',
    });
    expect(client.single).not.toHaveBeenCalled();
  });

  it('fails with invalid_token when getUser returns no user', async () => {
    const client = stubClient({ getUser: { data: { user: null }, error: null } });
    await expect(requireUserWithRole(client, 't', null)).resolves.toEqual({
      ok: false,
      reason: 'invalid_token',
    });
  });

  it('skips the profile lookup when allowedRoles is null', async () => {
    const client = stubClient({});
    await expect(requireUserWithRole(client, 't', null)).resolves.toEqual({
      ok: true,
      user,
      role: null,
    });
    expect(client.single).not.toHaveBeenCalled();
  });

  it('fails with no_profile when the profile row is missing', async () => {
    const client = stubClient({ profile: null });
    await expect(requireUserWithRole(client, 't', ['admin'])).resolves.toEqual({
      ok: false,
      reason: 'no_profile',
    });
    expect(client.single).toHaveBeenCalledTimes(1);
  });

  it('fails with insufficient_role when the role is not allowlisted', async () => {
    const client = stubClient({ profile: { role: 'teacher' } });
    await expect(requireUserWithRole(client, 't', ['reviewer', 'admin'])).resolves.toEqual({
      ok: false,
      reason: 'insufficient_role',
    });
  });

  it('succeeds with the user and role when the role is allowlisted', async () => {
    const client = stubClient({ profile: { role: 'admin' } });
    await expect(requireUserWithRole(client, 't', ['reviewer', 'admin'])).resolves.toEqual({
      ok: true,
      user,
      role: 'admin',
    });
  });
});
