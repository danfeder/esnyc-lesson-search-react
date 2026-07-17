/**
 * Google Drive provenance helpers (Drive-provenance feature, 2026-07).
 *
 * Small, deterministic, pure functions shared by the public drawer, the search
 * mapping, the review form, and the backfill/refresh tooling. The Deno edge
 * runtime can't import from src/, so the subset needed by edge functions is
 * mirrored at `supabase/functions/_shared/driveProvenance.ts` (same pattern as
 * metadataSchemas); `driveProvenance.equivalence.test.ts` asserts lock-step.
 *
 * Safety posture: every helper fails CLOSED — an unrecognized URL, MIME type,
 * or name yields null/false, never a guess. Creator attribution renders only
 * when every condition in `isCreatorSafeToRender` passes.
 */

export const NATIVE_GOOGLE_DOC_MIME = 'application/vnd.google-apps.document';

/**
 * MIME types we positively recognize as "imported into Drive" (Word/PDF).
 * A file with any OTHER non-native MIME gets NO Created/Added date line —
 * the drawer must not guess what an unknown type's createdTime means.
 */
export const KNOWN_IMPORTED_MIME_TYPES = [
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/pdf',
] as const;

export type DriveCreatorAttribution = 'created' | 'adapted';
export type DriveCreatorSource = 'drive_activity' | 'reviewer_confirmed';

/** The reviewer's three-way choice; 'omit' (or an absent key) publishes nothing. */
export type DriveCreatorChoice = DriveCreatorAttribution | 'omit';

export const DRIVE_CREATOR_ATTRIBUTIONS: readonly DriveCreatorAttribution[] = [
  'created',
  'adapted',
];
export const DRIVE_CREATOR_SOURCES: readonly DriveCreatorSource[] = [
  'drive_activity',
  'reviewer_confirmed',
];

// The two supported URL families. An optional account segment is accepted in
// its REAL position — /document/u/<n>/d/<id> and /file/u/<n>/d/<id> (it
// addresses the same document); anything else — other hosts, other paths,
// `open?id=` forms, bare ids — is rejected as ambiguous.
const DOCS_URL_PATH = /^\/document\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)(?:\/|$)/;
const DRIVE_FILE_URL_PATH = /^\/file\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)(?:\/|$)/;

/**
 * Extract a Drive file ID from either supported URL family:
 *   https://docs.google.com/document/d/<id>/...
 *   https://drive.google.com/file/d/<id>/...
 * Returns null for unrelated, malformed, or ambiguous URLs.
 */
export function extractDriveFileId(url: string | null | undefined): string | null {
  if (typeof url !== 'string') return null;
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;
  if (parsed.hostname === 'docs.google.com') {
    const m = parsed.pathname.match(DOCS_URL_PATH);
    return m ? m[1] : null;
  }
  if (parsed.hostname === 'drive.google.com') {
    const m = parsed.pathname.match(DRIVE_FILE_URL_PATH);
    return m ? m[1] : null;
  }
  return null;
}

/** Exact-match test for the native Google Docs MIME type. */
export function isNativeGoogleDocMime(mime: string | null | undefined): boolean {
  return mime === NATIVE_GOOGLE_DOC_MIME;
}

/**
 * Defense-in-depth validation for a PUBLIC creator name. Rejects blank,
 * untrimmed, overlong (>120), email-like (`@`), and obvious-URL values.
 * Deliberately does NOT restrict the character set beyond that — legitimate
 * names carry punctuation, diacritics, and non-ASCII scripts.
 */
export function isValidPublicCreatorName(name: unknown): name is string {
  if (typeof name !== 'string') return false;
  if (name.length === 0 || name.trim().length === 0) return false;
  if (name !== name.trim()) return false;
  if (name.length > 120) return false;
  // No embedded control characters (newline/tab/C0/DEL) — a "name" is one line.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001f\u007f]/.test(name)) return false;
  if (name.includes('@')) return false;
  if (/https?:\/\//i.test(name) || /(^|\s)www\./i.test(name)) return false;
  return true;
}

/**
 * Which date label the Drive createdTime gets:
 *   'created'  → native Google Doc ("Created [date]")
 *   'added'    → known imported type ("Added to Drive [date]")
 *   null       → missing or unrecognized MIME (omit the line; never guess)
 */
export function driveDateLabelKind(mime: string | null | undefined): 'created' | 'added' | null {
  if (isNativeGoogleDocMime(mime)) return 'created';
  if (typeof mime === 'string' && (KNOWN_IMPORTED_MIME_TYPES as readonly string[]).includes(mime)) {
    return 'added';
  }
  return null;
}

// One formatter instance — construction is expensive; formatting is not.
// en-US short month in America/New_York, e.g. "Jan 15, 2024". Pinning the
// zone keeps the rendered date stable regardless of the viewer's machine.
const DRIVE_DATE_FORMAT = new Intl.DateTimeFormat('en-US', {
  timeZone: 'America/New_York',
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

/** Format a Drive ISO timestamp as e.g. "Jan 15, 2024"; null if unparseable. */
export function formatDriveDate(iso: string | null | undefined): string | null {
  if (typeof iso !== 'string' || iso.trim() === '') return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return DRIVE_DATE_FORMAT.format(date);
}

export interface DriveCreatorFields {
  driveMimeType?: string | null;
  driveCreatorName?: string | null;
  driveCreatorAttribution?: string | null;
  driveCreatorSource?: string | null;
}

/**
 * Whether a creator attribution is safe to show publicly. ALL of:
 *   - the file is a native Google Doc (creator provenance is doc-native only);
 *   - the attribution is exactly 'created' or 'adapted';
 *   - the source is a trusted pipeline ('drive_activity' | 'reviewer_confirmed');
 *   - the name passes the public-name validator.
 */
export function isCreatorSafeToRender(fields: DriveCreatorFields): boolean {
  if (!isNativeGoogleDocMime(fields.driveMimeType)) return false;
  if (
    !DRIVE_CREATOR_ATTRIBUTIONS.includes(fields.driveCreatorAttribution as DriveCreatorAttribution)
  ) {
    return false;
  }
  if (!DRIVE_CREATOR_SOURCES.includes(fields.driveCreatorSource as DriveCreatorSource)) {
    return false;
  }
  return isValidPublicCreatorName(fields.driveCreatorName);
}
