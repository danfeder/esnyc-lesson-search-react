import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

// cors.ts reads Deno.env at module top, so stub Deno before a dynamic import.
let getRestrictedCorsHeaders: (origin: string | null) => Record<string, string>;

beforeAll(async () => {
  vi.stubGlobal('Deno', { env: { get: () => undefined } }); // use the default list
  ({ getRestrictedCorsHeaders } = await import('./cors.ts'));
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const fallback = 'http://localhost:5173';
const acao = (o: string | null) => getRestrictedCorsHeaders(o)['Access-Control-Allow-Origin'];

describe('getRestrictedCorsHeaders', () => {
  it('echoes an exact allowlisted origin', () => {
    expect(acao('https://esynyc-lessonlibrary-v2.netlify.app')).toBe(
      'https://esynyc-lessonlibrary-v2.netlify.app'
    );
  });

  it('echoes a deploy-preview origin (one label for the wildcard)', () => {
    expect(acao('https://deploy-preview-123--esynyc-lessonlibrary-v2.netlify.app')).toBe(
      'https://deploy-preview-123--esynyc-lessonlibrary-v2.netlify.app'
    );
  });

  it('falls back for a null origin', () => {
    expect(acao(null)).toBe(fallback);
  });

  it('falls back when the allowlisted host is only a prefix of the origin', () => {
    expect(acao('https://deploy-preview-1--esynyc-lessonlibrary-v2.netlify.app.example.com')).toBe(
      fallback
    );
  });

  it('treats dots in the pattern literally', () => {
    expect(acao('https://deploy-preview-1--esynyc-lessonlibrary-v2Xnetlify.app')).toBe(fallback);
  });

  it('always sends POST, OPTIONS and the standard header allowlist', () => {
    const h = getRestrictedCorsHeaders(null);
    expect(h['Access-Control-Allow-Methods']).toBe('POST, OPTIONS');
    expect(h['Access-Control-Allow-Headers']).toBe(
      'authorization, x-client-info, apikey, content-type'
    );
  });
});
