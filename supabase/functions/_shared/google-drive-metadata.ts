/**
 * Drive v3 file-metadata fetch for the permanent provenance pipeline.
 *
 * Deliberately requests ONLY id/mimeType/createdTime/modifiedTime — never
 * permissions, owners, revisions, email addresses, or Activity. This is the
 * whole Drive surface the deployed runtime is allowed to touch; the one-time
 * supervised historical backfill (scripts/drive-provenance/) is a separate,
 * local-only path.
 *
 * Works with the existing delegated reader token from
 * `google-auth-with-delegation.ts` (Docs+Drive readonly scopes — unchanged).
 */

export interface DriveFileMetadata {
  id: string;
  mimeType: string;
  createdTime: string;
  modifiedTime: string;
}

export type DriveMetadataResult =
  | { ok: true; metadata: DriveFileMetadata }
  | { ok: false; status: number; notFound: boolean };

const FIELDS = 'id,mimeType,createdTime,modifiedTime';

/**
 * Fetch Drive metadata for one file. Returns a discriminated result instead of
 * throwing: callers treat 404 as "file unreadable" (preserve last-known
 * values) and any other failure as transient (also preserve — never blank
 * trustworthy stored metadata on an API blip).
 */
export async function fetchDriveFileMetadata(
  accessToken: string,
  fileId: string,
  fetchImpl: typeof fetch = fetch
): Promise<DriveMetadataResult> {
  const url =
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}` +
    `?fields=${encodeURIComponent(FIELDS)}&supportsAllDrives=true`;
  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    return { ok: false, status: response.status, notFound: response.status === 404 };
  }
  const body = (await response.json()) as Partial<DriveFileMetadata>;
  if (!body.id || !body.mimeType || !body.createdTime || !body.modifiedTime) {
    // A 200 with missing fields is not trustworthy provenance — treat as a
    // transient failure rather than persisting a partial record.
    return { ok: false, status: 200, notFound: false };
  }
  return {
    ok: true,
    metadata: {
      id: body.id,
      mimeType: body.mimeType,
      createdTime: body.createdTime,
      modifiedTime: body.modifiedTime,
    },
  };
}
