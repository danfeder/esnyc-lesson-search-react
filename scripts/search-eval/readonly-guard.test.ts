/**
 * Unit tests for the read-only DB-client guard used by the search eval harness
 * (S0.3). The harness is READ-ONLY against the DB: it must run with an anon (or
 * publishable) key only, never a service-role / secret key. These guards
 * enforce anon-only and defend-in-depth against a service key leaking in via the
 * target's var pair.
 *
 * NOTE: this guards the DB *client* is anon-only. Writing local scorecard /
 * baseline FILES is expected and is NOT a DB write.
 *
 * Test JWTs are FABRICATED here (never real keys) by base64url-encoding a
 * `{ role }` payload — exactly what the guard decodes.
 */
import { describe, expect, it } from 'vitest';

import { assertAnonKey, assertReadOnly } from './readonly-guard';

/** Build a fake (unsigned-looking) JWT with the given payload role. */
function fakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fakesignature`;
}

// ---------------------------------------------------------------------------
// assertAnonKey
// ---------------------------------------------------------------------------

describe('assertAnonKey — JWT keys', () => {
  it('accepts a JWT whose payload role is "anon"', () => {
    expect(() => assertAnonKey(fakeJwt({ role: 'anon' }))).not.toThrow();
  });

  it('throws on a JWT whose payload role is "service_role"', () => {
    expect(() => assertAnonKey(fakeJwt({ role: 'service_role' }))).toThrow();
  });

  it('throws on a JWT whose payload role is any other value', () => {
    expect(() => assertAnonKey(fakeJwt({ role: 'authenticated' }))).toThrow();
  });

  it('throws on a JWT with no role claim', () => {
    expect(() => assertAnonKey(fakeJwt({ iss: 'supabase' }))).toThrow();
  });

  it('throws on a JWT whose payload is not valid JSON', () => {
    const header = Buffer.from('{}').toString('base64url');
    const garbageBody = Buffer.from('not-json-at-all').toString('base64url');
    expect(() => assertAnonKey(`${header}.${garbageBody}.sig`)).toThrow();
  });
});

describe('assertAnonKey — non-JWT keys', () => {
  it('accepts a key starting with sb_publishable_', () => {
    expect(() => assertAnonKey('sb_publishable_abc123')).not.toThrow();
  });

  it('throws on a key starting with sb_secret_', () => {
    expect(() => assertAnonKey('sb_secret_abc123')).toThrow();
  });

  it('throws on an unknown key type', () => {
    expect(() => assertAnonKey('totally-unknown-key')).toThrow(/unknown key type/i);
  });

  it('throws on an empty key', () => {
    expect(() => assertAnonKey('')).toThrow();
  });
});

// ---------------------------------------------------------------------------
// assertReadOnly — defense-in-depth: key must be anon AND not a known service key
// ---------------------------------------------------------------------------

describe('assertReadOnly', () => {
  it('passes for an anon JWT with no matching service-env value', () => {
    const anon = fakeJwt({ role: 'anon' });
    expect(() => assertReadOnly({ key: anon, serviceKeysInEnv: ['sb_secret_x', 'svc-123'] })).not.toThrow();
  });

  it('throws when the key equals a known service-env value (even if it parsed as anon)', () => {
    const anon = fakeJwt({ role: 'anon' });
    expect(() => assertReadOnly({ key: anon, serviceKeysInEnv: [anon] })).toThrow();
  });

  it('throws when the underlying key fails the anon check (service_role JWT)', () => {
    const svc = fakeJwt({ role: 'service_role' });
    expect(() => assertReadOnly({ key: svc, serviceKeysInEnv: [] })).toThrow();
  });

  it('passes with an empty serviceKeysInEnv list for a valid anon key', () => {
    expect(() => assertReadOnly({ key: fakeJwt({ role: 'anon' }), serviceKeysInEnv: [] })).not.toThrow();
  });

  it('accepts a publishable key not present in the service-env list', () => {
    expect(() =>
      assertReadOnly({ key: 'sb_publishable_abc', serviceKeysInEnv: ['sb_secret_y'] }),
    ).not.toThrow();
  });
});
