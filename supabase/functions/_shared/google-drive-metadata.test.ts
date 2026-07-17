import { describe, it, expect, vi } from 'vitest';
import { fetchDriveFileMetadata } from './google-drive-metadata.ts';

const okBody = {
  id: 'FILE-A',
  mimeType: 'application/vnd.google-apps.document',
  createdTime: '2024-01-01T00:00:00Z',
  modifiedTime: '2025-01-01T00:00:00Z',
};

function mockFetch(status: number, body: unknown) {
  return vi.fn(async () => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  })) as unknown as typeof fetch;
}

describe('fetchDriveFileMetadata', () => {
  it('requests ONLY id/mimeType/createdTime/modifiedTime (no owners/permissions/revisions)', async () => {
    const fetchImpl = mockFetch(200, okBody);
    await fetchDriveFileMetadata('token', 'FILE-A', fetchImpl);
    const url = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(url).toContain('fields=id%2CmimeType%2CcreatedTime%2CmodifiedTime');
    expect(url).not.toMatch(/owners|permissions|revisions|email/i);
  });

  it('returns the metadata on 200 with a complete body', async () => {
    const result = await fetchDriveFileMetadata('token', 'FILE-A', mockFetch(200, okBody));
    expect(result).toEqual({ ok: true, metadata: okBody });
  });

  it('flags 404 as notFound (caller preserves last-known values)', async () => {
    const result = await fetchDriveFileMetadata('token', 'GONE', mockFetch(404, {}));
    expect(result).toEqual({ ok: false, status: 404, notFound: true });
  });

  it('flags other failures as transient (not notFound)', async () => {
    const result = await fetchDriveFileMetadata('token', 'FILE-A', mockFetch(503, {}));
    expect(result).toEqual({ ok: false, status: 503, notFound: false });
  });

  it('treats a 200 with missing fields as untrustworthy (no partial provenance)', async () => {
    const result = await fetchDriveFileMetadata(
      'token',
      'FILE-A',
      mockFetch(200, { id: 'FILE-A', mimeType: 'application/pdf' })
    );
    expect(result).toEqual({ ok: false, status: 200, notFound: false });
  });
});
