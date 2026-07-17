/**
 * Pure logic for the internal sync-drive-metadata function (Drive provenance
 * date refresh). Deno-free so vitest covers it directly; index.ts stays a thin
 * IO shell.
 *
 * INVARIANTS (enforced here, asserted by syncLogic.test.ts):
 *   - batches are capped at MAX_SYNC_BATCH (50) rows;
 *   - API work is deduplicated by Drive file id, with results applied to every
 *     active lesson row sharing that id;
 *   - a 404 or transient failure produces NO update (last-known metadata is
 *     preserved, the file is only counted/reported);
 *   - the update object NEVER contains a creator column — the permanent
 *     refresh path has no creator authority (that is reviewer/backfill-only).
 */

import { timingSafeEqual } from '../_shared/timing-safe-equal.ts';
import { extractDriveFileId } from '../_shared/driveProvenance.ts';
import type { DriveFileMetadata, DriveMetadataResult } from '../_shared/google-drive-metadata.ts';

export const MAX_SYNC_BATCH = 50;

/** Clamp a caller-requested batch size into [1, MAX_SYNC_BATCH] (default max). */
export function clampBatchSize(requested: unknown): number {
  if (typeof requested !== 'number' || !Number.isFinite(requested)) return MAX_SYNC_BATCH;
  return Math.min(MAX_SYNC_BATCH, Math.max(1, Math.floor(requested)));
}

/** Constant-time bearer-token check for the dedicated sync secret. */
export function isAuthorizedSyncRequest(
  authorizationHeader: string | null,
  expectedToken: string | undefined
): boolean {
  if (!expectedToken || !authorizationHeader) return false;
  const token = authorizationHeader.replace(/^Bearer\s+/i, '');
  const a = new TextEncoder().encode(token);
  const b = new TextEncoder().encode(expectedToken);
  return a.length === b.length && timingSafeEqual(a, b);
}

export interface ActiveLessonRow {
  lesson_id: string;
  drive_file_id: string | null;
  file_link: string | null;
}

export interface BatchPlanEntry {
  fileId: string;
  lessonIds: string[];
}

export interface BatchPlan {
  /** One entry per UNIQUE file id — the API work list. */
  entries: BatchPlanEntry[];
  /** Rows whose file id could not be determined (no stored id, unparseable link). */
  unresolvableLessonIds: string[];
}

/**
 * Group a batch of active lesson rows by Drive file id. The stored
 * drive_file_id wins; a missing one is recovered by safely parsing file_link
 * (both URL families). Rows that resolve to the same file share one fetch.
 */
export function planBatch(rows: ActiveLessonRow[]): BatchPlan {
  const byFile = new Map<string, string[]>();
  const unresolvable: string[] = [];
  for (const row of rows) {
    const fileId = row.drive_file_id || extractDriveFileId(row.file_link);
    if (!fileId) {
      unresolvable.push(row.lesson_id);
      continue;
    }
    const existing = byFile.get(fileId);
    if (existing) existing.push(row.lesson_id);
    else byFile.set(fileId, [row.lesson_id]);
  }
  return {
    entries: [...byFile.entries()].map(([fileId, lessonIds]) => ({ fileId, lessonIds })),
    unresolvableLessonIds: unresolvable,
  };
}

export interface DriveDateColumns {
  drive_file_id: string;
  drive_mime_type: string;
  drive_created_at: string;
  drive_modified_at: string;
  drive_metadata_synced_at: string;
}

/**
 * The refresh decision for one fetched file:
 *   'update'    → write the returned dates/MIME (+ the resolved file id);
 *   'unreadable'→ 404: preserve last-known metadata, report the file;
 *   'transient' → other failure: preserve, report, let a later run retry.
 */
export function classifyFetchResult(
  result: DriveMetadataResult
): 'update' | 'unreadable' | 'transient' {
  if (result.ok) return 'update';
  return result.notFound ? 'unreadable' : 'transient';
}

/**
 * Build the row update for a successful fetch. Contains ONLY the five
 * file/date/MIME/sync columns — never creator fields (see module invariants).
 */
export function buildDriveRowUpdate(
  metadata: DriveFileMetadata,
  syncedAtIso: string
): DriveDateColumns {
  return {
    drive_file_id: metadata.id,
    drive_mime_type: metadata.mimeType,
    drive_created_at: metadata.createdTime,
    drive_modified_at: metadata.modifiedTime,
    drive_metadata_synced_at: syncedAtIso,
  };
}

/**
 * Keyset-pagination cursor: null when this batch was the last (short batch);
 * otherwise the last row's lesson_id (rows must arrive ordered by lesson_id).
 */
export function computeNextCursor(rows: ActiveLessonRow[], batchSize: number): string | null {
  if (rows.length < batchSize) return null;
  return rows[rows.length - 1]?.lesson_id ?? null;
}
