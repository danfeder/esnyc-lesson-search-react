import { describe, it, expect } from 'vitest';
import {
  NATIVE_GOOGLE_DOC_MIME as scriptNativeMime,
  extractDriveFileId as scriptExtract,
  isValidPublicCreatorName as scriptNameValid,
} from './driveUrl.mjs';
import {
  NATIVE_GOOGLE_DOC_MIME as canonicalNativeMime,
  extractDriveFileId as canonicalExtract,
  isValidPublicCreatorName as canonicalNameValid,
} from '../../../src/utils/driveProvenance';

/**
 * Locks the Node .mjs mirror (scripts can't import TS) to the canonical
 * src/utils/driveProvenance.ts helpers — the third copy alongside the Deno
 * mirror, all drift-tested. If this fails, edit BOTH files.
 */
describe('scripts/drive-provenance driveUrl.mjs mirrors src/utils/driveProvenance', () => {
  it('native MIME constant matches', () => {
    expect(scriptNativeMime).toBe(canonicalNativeMime);
  });

  const urls = [
    'https://docs.google.com/document/d/abc123_DEF-456/edit',
    'https://docs.google.com/document/u/0/d/abc123_DEF-456/edit',
    'https://docs.google.com/u/0/document/d/abc123_DEF-456/edit',
    'https://drive.google.com/file/d/abc123_DEF-456/view?usp=drive_link',
    'https://drive.google.com/open?id=abc123',
    'https://example.com/document/d/abc/edit',
    'http://docs.google.com/document/d/abc/edit',
    'not a url',
    '',
  ];
  it.each(urls)('extractDriveFileId agrees on %s', (url) => {
    expect(scriptExtract(url)).toBe(canonicalExtract(url));
  });

  const names = [
    'Jane Doe',
    '田中 花子',
    ' Jane Doe',
    'jane@example.org',
    'Jane\nDoe',
    'Jane\tDoe',
    'see https://example.org',
    'www.example.org',
    '',
    'x'.repeat(121),
  ];
  it.each(names)('isValidPublicCreatorName agrees on %j', (name) => {
    expect(scriptNameValid(name)).toBe(canonicalNameValid(name));
  });
});
