import { describe, it, expect } from 'vitest';
import {
  NATIVE_GOOGLE_DOC_MIME,
  extractDriveFileId,
  isNativeGoogleDocMime,
  isValidPublicCreatorName,
  driveDateLabelKind,
  formatDriveDate,
  isCreatorSafeToRender,
  type DriveCreatorFields,
} from './driveProvenance';

// Synthetic ids only — never real corpus file ids.
const DOC_ID = 'abc123_DEF-456';

describe('extractDriveFileId', () => {
  it.each([
    [`https://docs.google.com/document/d/${DOC_ID}/edit`, DOC_ID],
    [`https://docs.google.com/document/d/${DOC_ID}/edit?usp=sharing`, DOC_ID],
    [`https://docs.google.com/document/d/${DOC_ID}`, DOC_ID],
    [`https://docs.google.com/document/d/${DOC_ID}/`, DOC_ID],
    // account-scoped variant (REAL position: /document/u/<n>/d/<id>)
    [`https://docs.google.com/document/u/0/d/${DOC_ID}/edit`, DOC_ID],
    [`https://drive.google.com/file/u/1/d/${DOC_ID}/view`, DOC_ID],
    [`https://drive.google.com/file/d/${DOC_ID}/view`, DOC_ID],
    [`https://drive.google.com/file/d/${DOC_ID}/view?usp=drive_link`, DOC_ID],
    [`https://drive.google.com/file/d/${DOC_ID}`, DOC_ID],
    // surrounding whitespace tolerated (copy-paste reality)
    [`  https://docs.google.com/document/d/${DOC_ID}/edit  `, DOC_ID],
  ])('accepts %s', (url, expected) => {
    expect(extractDriveFileId(url)).toBe(expected);
  });

  it.each([
    // unrelated hosts / lookalikes
    ['https://example.com/document/d/abc/edit'],
    ['https://docs.google.com.evil.example/document/d/abc/edit'],
    ['https://sites.google.com/document/d/abc'],
    // wrong path family for the host
    ['https://docs.google.com/file/d/abc/view'],
    ['https://drive.google.com/document/d/abc/edit'],
    // account segment in the WRONG position (real form is /document/u/N/d/)
    ['https://docs.google.com/u/0/document/d/abc/edit'],
    // ambiguous / unsupported forms
    ['https://drive.google.com/open?id=abc123'],
    ['https://docs.google.com/spreadsheets/d/abc/edit'],
    ['https://docs.google.com/document/d//edit'],
    ['https://docs.google.com/document/d'],
    // malformed / non-URL / wrong scheme
    ['http://docs.google.com/document/d/abc/edit'],
    ['ftp://docs.google.com/document/d/abc'],
    ['not a url'],
    [''],
    // id charset violation ends the match before a non-slash boundary
    ['https://docs.google.com/document/dabc'],
  ])('rejects %s', (url) => {
    expect(extractDriveFileId(url)).toBeNull();
  });

  it('rejects null/undefined without throwing', () => {
    expect(extractDriveFileId(null)).toBeNull();
    expect(extractDriveFileId(undefined)).toBeNull();
  });
});

describe('isNativeGoogleDocMime / driveDateLabelKind', () => {
  it('recognizes exactly the native Docs MIME', () => {
    expect(isNativeGoogleDocMime(NATIVE_GOOGLE_DOC_MIME)).toBe(true);
    expect(isNativeGoogleDocMime('application/pdf')).toBe(false);
    expect(isNativeGoogleDocMime('application/vnd.google-apps.spreadsheet')).toBe(false);
    expect(isNativeGoogleDocMime(undefined)).toBe(false);
    expect(isNativeGoogleDocMime(null)).toBe(false);
  });

  it('labels native docs "created" and known imports "added"', () => {
    expect(driveDateLabelKind(NATIVE_GOOGLE_DOC_MIME)).toBe('created');
    expect(
      driveDateLabelKind('application/vnd.openxmlformats-officedocument.wordprocessingml.document')
    ).toBe('added');
    expect(driveDateLabelKind('application/msword')).toBe('added');
    expect(driveDateLabelKind('application/pdf')).toBe('added');
  });

  it('returns null (omit the line) for missing or unrecognized MIME', () => {
    expect(driveDateLabelKind(undefined)).toBeNull();
    expect(driveDateLabelKind(null)).toBeNull();
    expect(driveDateLabelKind('')).toBeNull();
    expect(driveDateLabelKind('image/png')).toBeNull();
    expect(driveDateLabelKind('application/vnd.google-apps.spreadsheet')).toBeNull();
  });
});

describe('formatDriveDate (America/New_York, timezone-stable)', () => {
  it('formats a mid-day UTC timestamp', () => {
    expect(formatDriveDate('2024-01-15T15:30:00.000Z')).toBe('Jan 15, 2024');
  });

  it('rolls a just-past-midnight UTC timestamp back a day in New York', () => {
    // 03:00 UTC on Jun 2 is 23:00 EDT on Jun 1 — the label must follow the
    // pinned zone, not the machine zone.
    expect(formatDriveDate('2024-06-02T03:00:00.000Z')).toBe('Jun 1, 2024');
  });

  it('handles winter (EST) offsets too', () => {
    // 04:59 UTC on Jan 2 is 23:59 EST on Jan 1.
    expect(formatDriveDate('2024-01-02T04:59:00.000Z')).toBe('Jan 1, 2024');
  });

  it('returns null for unparseable or empty input', () => {
    expect(formatDriveDate('not-a-date')).toBeNull();
    expect(formatDriveDate('')).toBeNull();
    expect(formatDriveDate(null)).toBeNull();
    expect(formatDriveDate(undefined)).toBeNull();
  });
});

describe('isValidPublicCreatorName', () => {
  it.each([
    ['Jane Doe'],
    ['María-José Álvarez'],
    ["O'Connor"],
    ['田中 花子'],
    ['J. R. R. Tolkien'],
  ])('accepts %s', (name) => {
    expect(isValidPublicCreatorName(name)).toBe(true);
  });

  it.each([
    ['', 'blank'],
    ['   ', 'whitespace-only'],
    [' Jane Doe', 'leading space (untrimmed)'],
    ['Jane Doe ', 'trailing space (untrimmed)'],
    ['x'.repeat(121), 'over 120 chars'],
    ['jane@example.org', 'contains @'],
    ['Jane\nDoe', 'embedded newline (control char)'],
    ['Jane\tDoe', 'embedded tab (control char)'],
    ['see https://example.org', 'http(s) URL'],
    ['see www.example.org', 'www URL'],
    ['www.example.org', 'bare www URL'],
  ])('rejects %s (%s)', (name) => {
    expect(isValidPublicCreatorName(name)).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(isValidPublicCreatorName(undefined)).toBe(false);
    expect(isValidPublicCreatorName(null)).toBe(false);
    expect(isValidPublicCreatorName(42)).toBe(false);
    expect(isValidPublicCreatorName(['Jane'])).toBe(false);
  });

  it('accepts a name of exactly 120 chars', () => {
    expect(isValidPublicCreatorName('x'.repeat(120))).toBe(true);
  });
});

describe('isCreatorSafeToRender', () => {
  const safe = {
    driveMimeType: NATIVE_GOOGLE_DOC_MIME,
    driveCreatorName: 'Jane Doe',
    driveCreatorAttribution: 'created',
    driveCreatorSource: 'drive_activity',
  };

  it('passes when every condition holds', () => {
    expect(isCreatorSafeToRender(safe)).toBe(true);
    expect(
      isCreatorSafeToRender({
        ...safe,
        driveCreatorAttribution: 'adapted',
        driveCreatorSource: 'reviewer_confirmed',
      })
    ).toBe(true);
  });

  const unsafeCases: Array<[DriveCreatorFields, string]> = [
    [{ ...safe, driveMimeType: 'application/pdf' }, 'non-native MIME'],
    [{ ...safe, driveMimeType: undefined }, 'missing MIME'],
    [{ ...safe, driveCreatorAttribution: 'owner' }, 'unknown attribution'],
    [{ ...safe, driveCreatorAttribution: undefined }, 'missing attribution'],
    [{ ...safe, driveCreatorSource: 'guessed' }, 'unknown source'],
    [{ ...safe, driveCreatorSource: undefined }, 'missing source'],
    [{ ...safe, driveCreatorName: 'jane@example.org' }, 'email-like name'],
    [{ ...safe, driveCreatorName: '  ' }, 'blank name'],
    [{ ...safe, driveCreatorName: undefined }, 'missing name'],
  ];
  it.each(unsafeCases)('fails closed on %j (%s)', (fields) => {
    expect(isCreatorSafeToRender(fields)).toBe(false);
  });
});
