// Tests for scripts/ci/prod-db-url.py, the guard rail that validates and
// redacts the production database URL in migrate-production.yml and
// backup-production.yml. The helper is Python (it runs on a bare GitHub runner
// before any `npm ci`), so these tests drive it as a subprocess.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const SCRIPT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'prod-db-url.py');
const REF = 'jxlxtzkmicfhchkhiojz';
const TEST_REF = 'rxgajgmphciuaqzvwmox';
const POOLER = 'aws-0-us-east-1.pooler.supabase.com';
const pooler = (password, { ref = REF, host = POOLER, port = 5432 } = {}) =>
  `postgresql://postgres.${ref}:${password}@${host}:${port}/postgres`;

function run(mode, url, input = '') {
  const env = { ...process.env };
  if (url === undefined) delete env.SUPABASE_DB_URL_PROD;
  else env.SUPABASE_DB_URL_PROD = url;
  const result = spawnSync('python3', [SCRIPT, mode], { env, input, encoding: 'utf8' });
  return { code: result.status, out: result.stdout, err: result.stderr };
}

beforeAll(() => {
  const probe = spawnSync('python3', ['--version'], { encoding: 'utf8' });
  if (probe.error || probe.status !== 0) {
    throw new Error(
      'scripts/ci/prod-db-url.test.mjs needs `python3` on PATH (the helper under test is a Python script).'
    );
  }
});

describe('prod-db-url.py check', () => {
  it('accepts the production session-pooler URL', () => {
    const { code, out } = run('check', pooler('Abc123SecretValue'));
    expect(code).toBe(0);
    expect(out).toContain(`Connection string OK: host=${POOLER} port=5432`);
  });

  it('accepts the production direct-connection URL', () => {
    const { code } = run('check', `postgresql://postgres:Abc123SecretValue@db.${REF}.supabase.co:5432/postgres`);
    expect(code).toBe(0);
  });

  it('never prints the connection string, and masks the password', () => {
    const url = pooler('p%40ss%2FWord9');
    const { out } = run('check', url);
    expect(out).not.toContain(url);
    expect(out).toContain('::add-mask::p%40ss%2FWord9');
    expect(out).toContain('::add-mask::p@ss/Word9');
    const unmasked = out.split('\n').filter((line) => !line.startsWith('::add-mask::'));
    expect(unmasked.join('\n')).not.toMatch(/p%40ss|p@ss/);
  });

  it.each([
    ['a missing secret', undefined, 'is not set'],
    ['an empty secret', '   ', 'is not set'],
    ['a non-postgres scheme', `https://postgres.${REF}:pw@${POOLER}:5432/postgres`, 'must start with postgresql://'],
    ['a URL with no password', `postgresql://postgres.${REF}@${POOLER}:5432/postgres`, 'must include a user, a password and a host'],
    ['the TEST project', pooler('pw', { ref: TEST_REF }), 'does not point at the production project'],
    ['the transaction pooler port', pooler('pw', { port: 6543 }), 'uses port 6543'],
    ['a non-numeric port', `postgresql://postgres.${REF}:pw@${POOLER}:notaport/postgres`, 'is not a valid connection string'],
  ])('rejects %s', (_label, url, message) => {
    const { code, out } = run('check', url);
    expect(code).toBe(1);
    expect(out).toContain('::error::SUPABASE_DB_URL_PROD');
    expect(out).toContain(message);
  });

  it('rejects a URL that only mentions the production ref somewhere', () => {
    // Ref in the host of a non-Supabase domain, and ref as a username suffix.
    for (const url of [
      `postgresql://postgres.${TEST_REF}:pw@${REF}.example.com:5432/postgres`,
      `postgresql://evil.${REF}:pw@${POOLER}:5432/postgres`,
      `postgresql://postgres.${REF}:pw@pooler.supabase.com.example.com:5432/postgres`,
    ]) {
      expect(run('check', url).code, url).toBe(1);
    }
  });
});

describe('prod-db-url.py redact', () => {
  const url = pooler('p%40ss%2FWord9');

  it('replaces the URL and every spelling of the password', () => {
    const input = [
      `connecting to ${url}`,
      'as written: p%40ss%2FWord9',
      'decoded: p@ss/Word9',
      're-encoded with lower-case hex: p%40ss%2fWord9',
      'harmless line',
      '',
    ].join('\n');
    const { code, out } = run('redact', url, input);
    expect(code).toBe(0);
    expect(out).not.toMatch(/p%40ss|p@ss\/Word9|Word9/);
    expect(out).toContain('connecting to ***');
    expect(out).toContain('harmless line');
  });

  it('passes ordinary output through unchanged', () => {
    const input = 'Would push these migrations:\n • 20260101000000_example.sql\n';
    expect(run('redact', url, input).out).toBe(input);
  });

  it('fails instead of passing text through when the secret is missing', () => {
    const { code, out } = run('redact', undefined, 'some output\n');
    expect(code).toBe(1);
    expect(out).not.toContain('some output');
  });
});

describe('prod-db-url.py usage', () => {
  it('exits 2 on an unknown mode', () => {
    expect(run('nonsense', pooler('pw')).code).toBe(2);
  });
});
