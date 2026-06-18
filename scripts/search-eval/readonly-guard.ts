/**
 * Read-only DB-client guard for the search eval harness (S0.3).
 *
 * The harness is READ-ONLY against the database: only `.rpc('search_lessons')`
 * and `.from('lessons').select(...)`. It must therefore be configured with an
 * ANON (or publishable) key only — never a service-role / secret key. These
 * guards enforce that BEFORE a client is constructed.
 *
 * Scope: this guards that the DB *client* is anon-only. Writing the local
 * scorecard / baseline FILES is expected behavior and is NOT a DB write — the
 * guard says nothing about local filesystem output.
 *
 * Pure module: no IO, no env. The harness passes it the resolved key plus the
 * values of any `*SERVICE*`-named env vars it can see (defense-in-depth).
 */

/**
 * Decode a base64url segment to a UTF-8 string. (Node Buffer supports
 * 'base64url' directly.)
 */
function decodeBase64Url(segment: string): string {
  return Buffer.from(segment, 'base64url').toString('utf8');
}

/**
 * Throw unless `key` is provably non-service:
 *  - JWT (3 dot-separated segments): base64url-decode the payload, JSON.parse,
 *    require payload.role === 'anon'. Any other role (incl. 'service_role') or
 *    a parse failure throws.
 *  - else key starting with `sb_publishable_` -> accept.
 *  - else key starting with `sb_secret_` -> throw.
 *  - otherwise throw ("unknown key type — refusing").
 */
export function assertAnonKey(key: string): void {
  if (typeof key !== 'string' || key.length === 0) {
    throw new Error('assertAnonKey: empty key — refusing to build a DB client');
  }

  const segments = key.split('.');
  if (segments.length === 3) {
    let payload: unknown;
    try {
      payload = JSON.parse(decodeBase64Url(segments[1]));
    } catch {
      throw new Error('assertAnonKey: JWT payload is not valid JSON — refusing');
    }
    const role =
      payload && typeof payload === 'object'
        ? (payload as Record<string, unknown>).role
        : undefined;
    if (role !== 'anon') {
      throw new Error(
        `assertAnonKey: JWT role is '${String(role)}', expected 'anon' — refusing (service/other key)`,
      );
    }
    return;
  }

  if (key.startsWith('sb_publishable_')) return;
  if (key.startsWith('sb_secret_')) {
    throw new Error('assertAnonKey: sb_secret_ (secret) key — refusing to build a DB client');
  }

  throw new Error('assertAnonKey: unknown key type — refusing to build a DB client');
}

/**
 * Defense-in-depth: assert the configured key is anon-only AND is not equal to
 * any known service key value seen in the environment. The harness collects the
 * VALUES of any env vars whose NAME matches /SERVICE/i and passes them here, so
 * that a service key accidentally placed in the target's anon var slot is still
 * rejected.
 */
export function assertReadOnly(opts: { key: string; serviceKeysInEnv: string[] }): void {
  assertAnonKey(opts.key);
  if (opts.serviceKeysInEnv.some((sk) => sk && sk === opts.key)) {
    throw new Error(
      'assertReadOnly: configured key matches a known *SERVICE* env value — refusing (read-only harness)',
    );
  }
}
