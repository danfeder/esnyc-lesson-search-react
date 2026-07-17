import { describe, it, expect } from 'vitest';
import {
  NATIVE_GOOGLE_DOC_MIME as canonicalNativeMime,
  extractDriveFileId as canonicalExtract,
  isNativeGoogleDocMime as canonicalIsNative,
  isValidPublicCreatorName as canonicalNameValid,
} from './driveProvenance';
import {
  NATIVE_GOOGLE_DOC_MIME as sharedNativeMime,
  extractDriveFileId as sharedExtract,
  isNativeGoogleDocMime as sharedIsNative,
  isValidPublicCreatorName as sharedNameValid,
} from '../../supabase/functions/_shared/driveProvenance';

/**
 * Asserts the deno-runtime mirror at supabase/functions/_shared/driveProvenance.ts
 * stays in lock-step with the canonical helpers at src/utils/driveProvenance.ts
 * (same dual-runtime strategy as metadataSchemas). If this fails, edit BOTH files.
 */
describe('edge _shared/driveProvenance mirrors canonical src/utils helpers', () => {
  it('native MIME constant matches', () => {
    expect(sharedNativeMime).toBe(canonicalNativeMime);
  });

  const urls = [
    'https://docs.google.com/document/d/abc123_DEF-456/edit',
    'https://docs.google.com/document/d/abc123_DEF-456/edit?usp=sharing',
    'https://docs.google.com/document/u/0/d/abc123_DEF-456/edit',
    'https://docs.google.com/u/0/document/d/abc123_DEF-456/edit',
    'https://drive.google.com/file/d/abc123_DEF-456/view',
    'https://drive.google.com/file/d/abc123_DEF-456',
    'https://drive.google.com/open?id=abc123',
    'https://docs.google.com/spreadsheets/d/abc/edit',
    'https://example.com/document/d/abc/edit',
    'https://docs.google.com.evil.example/document/d/abc/edit',
    'http://docs.google.com/document/d/abc/edit',
    'not a url',
    '',
    '  https://docs.google.com/document/d/trimmed_id/edit  ',
  ];
  it.each(urls)('extractDriveFileId agrees on %s', (url) => {
    expect(sharedExtract(url)).toBe(canonicalExtract(url));
  });

  const mimes = [
    canonicalNativeMime,
    'application/pdf',
    'application/vnd.google-apps.spreadsheet',
    '',
    null,
    undefined,
  ];
  it.each(mimes)('isNativeGoogleDocMime agrees on %s', (mime) => {
    expect(sharedIsNative(mime)).toBe(canonicalIsNative(mime));
  });

  const names: unknown[] = [
    'Jane Doe',
    'María-José Álvarez',
    '田中 花子',
    '',
    '   ',
    ' Jane Doe',
    'Jane Doe ',
    'x'.repeat(120),
    'x'.repeat(121),
    'jane@example.org',
    'Jane\nDoe',
    'Jane\tDoe',
    'see https://example.org',
    'www.example.org',
    null,
    undefined,
    42,
  ];
  it.each(names.map((n) => [n]))('isValidPublicCreatorName agrees on %j', (name) => {
    expect(sharedNameValid(name)).toBe(canonicalNameValid(name));
  });
});
