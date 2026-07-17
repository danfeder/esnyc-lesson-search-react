/**
 * Drive provenance mapping through the search row mapper (locked decision:
 * only the public subset flows to the domain type, and attribution/source are
 * narrowed to the trusted unions at the boundary — fail closed).
 */
import { describe, it, expect } from 'vitest';
import { mapRowToLesson, type RpcRow } from '@/hooks/useLessonSearch';

const baseRow: RpcRow = {
  lesson_id: 'L-1',
  title: 'T',
  summary: 'S',
  file_link: '#',
  grade_levels: [],
  metadata: {},
};

describe('mapRowToLesson — Drive provenance', () => {
  it('maps the six public fields to camelCase', () => {
    const lesson = mapRowToLesson({
      ...baseRow,
      drive_mime_type: 'application/vnd.google-apps.document',
      drive_created_at: '2024-01-15T15:00:00.000Z',
      drive_modified_at: '2026-03-02T15:00:00.000Z',
      drive_creator_name: 'Test Person',
      drive_creator_attribution: 'adapted',
      drive_creator_source: 'reviewer_confirmed',
    });
    expect(lesson).toMatchObject({
      driveMimeType: 'application/vnd.google-apps.document',
      driveCreatedAt: '2024-01-15T15:00:00.000Z',
      driveModifiedAt: '2026-03-02T15:00:00.000Z',
      driveCreatorName: 'Test Person',
      driveCreatorAttribution: 'adapted',
      driveCreatorSource: 'reviewer_confirmed',
    });
  });

  it('maps null/absent columns to undefined', () => {
    const lesson = mapRowToLesson({
      ...baseRow,
      drive_mime_type: null,
      drive_created_at: null,
      drive_modified_at: null,
      drive_creator_name: null,
      drive_creator_attribution: null,
      drive_creator_source: null,
    });
    expect(lesson.driveMimeType).toBeUndefined();
    expect(lesson.driveCreatedAt).toBeUndefined();
    expect(lesson.driveModifiedAt).toBeUndefined();
    expect(lesson.driveCreatorName).toBeUndefined();
    expect(lesson.driveCreatorAttribution).toBeUndefined();
    expect(lesson.driveCreatorSource).toBeUndefined();

    const bare = mapRowToLesson(baseRow);
    expect(bare.driveCreatorAttribution).toBeUndefined();
  });

  it('narrows a stray attribution/source string to undefined (fail closed)', () => {
    const lesson = mapRowToLesson({
      ...baseRow,
      drive_creator_name: 'Test Person',
      drive_creator_attribution: 'owner',
      drive_creator_source: 'guessed',
    });
    expect(lesson.driveCreatorAttribution).toBeUndefined();
    expect(lesson.driveCreatorSource).toBeUndefined();
    // The name still maps — the RENDER gate (isCreatorSafeToRender) refuses
    // it without a trusted attribution+source.
    expect(lesson.driveCreatorName).toBe('Test Person');
  });

  it('never exposes drive_file_id or sync/verified timestamps on the domain type', () => {
    const lesson = mapRowToLesson({
      ...baseRow,
      // Simulate a server accidentally returning private columns — they must
      // not leak onto the Lesson object.
      ...({ drive_file_id: 'FILE-A', drive_metadata_synced_at: 'x' } as Partial<RpcRow>),
    });
    expect(lesson).not.toHaveProperty('driveFileId');
    expect(lesson).not.toHaveProperty('drive_file_id');
    expect(lesson).not.toHaveProperty('driveMetadataSyncedAt');
  });
});
