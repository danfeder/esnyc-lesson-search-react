import { describe, it, expect } from 'vitest';
import { buildDriveMetadataUpdate } from './driveMetadataUpdate.ts';

const full = {
  fileId: 'FILE-A',
  mimeType: 'application/vnd.google-apps.document',
  createdTime: '2024-01-01T00:00:00Z',
  modifiedTime: '2025-01-01T00:00:00Z',
  syncedAt: '2026-07-17T00:00:00Z',
};

describe('buildDriveMetadataUpdate', () => {
  it('maps a complete driveMetadata object to the five snake_case columns', () => {
    expect(buildDriveMetadataUpdate(full)).toEqual({
      drive_file_id: 'FILE-A',
      drive_mime_type: 'application/vnd.google-apps.document',
      drive_created_at: '2024-01-01T00:00:00Z',
      drive_modified_at: '2025-01-01T00:00:00Z',
      drive_metadata_synced_at: '2026-07-17T00:00:00Z',
    });
  });

  it('never emits creator columns', () => {
    expect(Object.keys(buildDriveMetadataUpdate(full)).some((k) => k.includes('creator'))).toBe(
      false
    );
  });

  it('keeps the trusted id/MIME/sync when dates are absent (transient dates blip)', () => {
    expect(
      buildDriveMetadataUpdate({ ...full, createdTime: undefined, modifiedTime: undefined })
    ).toEqual({
      drive_file_id: 'FILE-A',
      drive_mime_type: 'application/vnd.google-apps.document',
      drive_metadata_synced_at: '2026-07-17T00:00:00Z',
    });
    // Absent date keys are NOT written — a prior snapshot's dates survive.
    expect(buildDriveMetadataUpdate({ ...full, modifiedTime: '' })).not.toHaveProperty(
      'drive_modified_at'
    );
  });

  it.each([
    ['absent', undefined],
    ['null', null],
    ['non-object', 'nope'],
    ['empty object', {}],
    ['missing fileId', { ...full, fileId: undefined }],
    ['missing mimeType', { ...full, mimeType: '' }],
    ['missing syncedAt', { ...full, syncedAt: undefined }],
    ['non-string required field', { ...full, fileId: 123 }],
  ])('returns {} for %s input (preserve/leave-NULL semantics)', (_label, input) => {
    expect(buildDriveMetadataUpdate(input)).toEqual({});
  });
});
