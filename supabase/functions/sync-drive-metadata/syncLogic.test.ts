import { describe, it, expect } from 'vitest';
import {
  MAX_SYNC_BATCH,
  clampBatchSize,
  computeNextCursor,
  classifyFetchResult,
  buildDriveRowUpdate,
  isAuthorizedSyncRequest,
  planBatch,
  type ActiveLessonRow,
} from './syncLogic';

describe('clampBatchSize', () => {
  it('caps at 50 and floors at 1', () => {
    expect(clampBatchSize(undefined)).toBe(MAX_SYNC_BATCH);
    expect(clampBatchSize(999)).toBe(50);
    expect(clampBatchSize(0)).toBe(1);
    expect(clampBatchSize(-3)).toBe(1);
    expect(clampBatchSize(12.9)).toBe(12);
    expect(clampBatchSize('50' as unknown)).toBe(MAX_SYNC_BATCH);
    expect(clampBatchSize(NaN)).toBe(MAX_SYNC_BATCH);
  });
});

describe('isAuthorizedSyncRequest (dedicated token, constant-time)', () => {
  it('accepts the exact bearer token', () => {
    expect(isAuthorizedSyncRequest('Bearer sekret-token', 'sekret-token')).toBe(true);
  });
  it('rejects a wrong, empty, or missing token — and rejects when no secret is configured', () => {
    expect(isAuthorizedSyncRequest('Bearer wrong', 'sekret-token')).toBe(false);
    expect(isAuthorizedSyncRequest('Bearer ', 'sekret-token')).toBe(false);
    expect(isAuthorizedSyncRequest(null, 'sekret-token')).toBe(false);
    expect(isAuthorizedSyncRequest('Bearer sekret-token', undefined)).toBe(false);
    expect(isAuthorizedSyncRequest('Bearer sekret-token', '')).toBe(false);
  });
});

describe('planBatch (dedupe by file id; recover ids from links)', () => {
  const rows: ActiveLessonRow[] = [
    { lesson_id: 'L1', drive_file_id: 'FILE-A', file_link: 'x' },
    { lesson_id: 'L2', drive_file_id: 'FILE-A', file_link: 'y' },
    {
      lesson_id: 'L3',
      drive_file_id: null,
      file_link: 'https://docs.google.com/document/d/FILE-B/edit',
    },
    {
      lesson_id: 'L4',
      drive_file_id: null,
      file_link: 'https://drive.google.com/file/d/FILE-C/view',
    },
    { lesson_id: 'L5', drive_file_id: null, file_link: 'not a drive url' },
    { lesson_id: 'L6', drive_file_id: null, file_link: null },
  ];

  it('groups shared files, parses both URL families, isolates unresolvable rows', () => {
    const plan = planBatch(rows);
    expect(plan.entries).toEqual([
      { fileId: 'FILE-A', lessonIds: ['L1', 'L2'] },
      { fileId: 'FILE-B', lessonIds: ['L3'] },
      { fileId: 'FILE-C', lessonIds: ['L4'] },
    ]);
    expect(plan.unresolvableLessonIds).toEqual(['L5', 'L6']);
  });
});

describe('classifyFetchResult (404/transient preserve last-known metadata)', () => {
  it('maps ok → update, 404 → unreadable, others → transient', () => {
    expect(
      classifyFetchResult({
        ok: true,
        metadata: { id: 'F', mimeType: 'm', createdTime: 'c', modifiedTime: 'd' },
      })
    ).toBe('update');
    expect(classifyFetchResult({ ok: false, status: 404, notFound: true })).toBe('unreadable');
    expect(classifyFetchResult({ ok: false, status: 500, notFound: false })).toBe('transient');
    expect(classifyFetchResult({ ok: false, status: 429, notFound: false })).toBe('transient');
  });
});

describe('buildDriveRowUpdate', () => {
  const update = buildDriveRowUpdate(
    {
      id: 'FILE-A',
      mimeType: 'application/vnd.google-apps.document',
      createdTime: '2024-01-01T00:00:00Z',
      modifiedTime: '2025-01-01T00:00:00Z',
    },
    '2026-07-17T00:00:00Z'
  );

  it('carries exactly the five file/date/MIME/sync columns', () => {
    expect(update).toEqual({
      drive_file_id: 'FILE-A',
      drive_mime_type: 'application/vnd.google-apps.document',
      drive_created_at: '2024-01-01T00:00:00Z',
      drive_modified_at: '2025-01-01T00:00:00Z',
      drive_metadata_synced_at: '2026-07-17T00:00:00Z',
    });
  });

  it('NEVER contains a creator column (refresh path has no creator authority)', () => {
    const keys = Object.keys(update);
    expect(keys.some((k) => k.includes('creator'))).toBe(false);
  });
});

describe('computeNextCursor (keyset pagination)', () => {
  const row = (id: string): ActiveLessonRow => ({
    lesson_id: id,
    drive_file_id: null,
    file_link: null,
  });
  it('returns null on a short (final) batch', () => {
    expect(computeNextCursor([row('A'), row('B')], 50)).toBeNull();
    expect(computeNextCursor([], 50)).toBeNull();
  });
  it('returns the last lesson_id on a full batch', () => {
    const rows = Array.from({ length: 50 }, (_, i) => row(`L${String(i).padStart(2, '0')}`));
    expect(computeNextCursor(rows, 50)).toBe('L49');
  });
});
