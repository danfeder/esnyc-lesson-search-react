/**
 * Deno-runtime mirror of the Drive-provenance helpers at
 * `src/utils/driveProvenance.ts` (the subset edge functions need: URL → file-id
 * parsing, native-MIME test, public-name validation).
 *
 * Why duplicated: edge functions deploy from the supabase/functions/ tree only —
 * same rationale as `_shared/metadataSchemas.ts`. Drift protection:
 * `src/utils/driveProvenance.equivalence.test.ts` runs identical fixtures
 * through both modules and asserts equal behavior; CI fails on drift.
 * If you edit one file, edit BOTH.
 */

export const NATIVE_GOOGLE_DOC_MIME = 'application/vnd.google-apps.document';

// Optional account segment in its REAL position: /document/u/<n>/d/<id>.
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
