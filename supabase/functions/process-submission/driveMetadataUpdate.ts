/**
 * Drive provenance → lesson_submissions column map.
 *
 * Turns the `driveMetadata` object that extract-google-doc returns (fail-soft:
 * possibly absent) into the partial update object process-submission merges
 * into its Step-3 submission write.
 *
 * Contract:
 *   - fileId + mimeType + syncedAt are REQUIRED — a successful native Docs
 *     extraction always proves those three, so their absence means the whole
 *     driveMetadata is untrustworthy and {} is returned (an empty object
 *     preserves whatever the row already holds: a resubmit whose metadata
 *     fetch blipped keeps the previous snapshot's values; a new submission's
 *     columns simply stay NULL).
 *   - createdTime/modifiedTime are OPTIONAL — a transient dates blip must not
 *     discard the trusted file id + native MIME (the RPC's native-doc gate
 *     would otherwise silently drop a reviewer's creator confirmation).
 *     Absent dates are simply not written, preserving any prior values.
 *
 * Pure and Deno-free so vitest covers it directly (same pattern as
 * validateResubmit.ts / normalizeSubmissionInputs.ts).
 */

export interface DriveMetadataColumns {
  drive_file_id: string;
  drive_mime_type: string;
  drive_metadata_synced_at: string;
  drive_created_at?: string;
  drive_modified_at?: string;
}

function nonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.length > 0;
}

export function buildDriveMetadataUpdate(
  driveMetadata: unknown
): DriveMetadataColumns | Record<string, never> {
  if (typeof driveMetadata !== 'object' || driveMetadata === null) return {};
  const m = driveMetadata as Record<string, unknown>;
  if (!nonEmptyString(m.fileId) || !nonEmptyString(m.mimeType) || !nonEmptyString(m.syncedAt)) {
    return {};
  }
  const update: DriveMetadataColumns = {
    drive_file_id: m.fileId,
    drive_mime_type: m.mimeType,
    drive_metadata_synced_at: m.syncedAt,
  };
  if (nonEmptyString(m.createdTime)) update.drive_created_at = m.createdTime;
  if (nonEmptyString(m.modifiedTime)) update.drive_modified_at = m.modifiedTime;
  return update;
}
