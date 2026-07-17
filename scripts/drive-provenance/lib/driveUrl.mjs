/**
 * Node-runtime mirror of the Drive URL / creator-name helpers at
 * `src/utils/driveProvenance.ts` (scripts are plain .mjs and cannot import the
 * TS module). Drift protection: driveUrl.equivalence.test.mjs runs identical
 * fixtures through both modules. If you edit one file, edit BOTH (and the
 * Deno mirror at supabase/functions/_shared/driveProvenance.ts).
 */

export const NATIVE_GOOGLE_DOC_MIME = 'application/vnd.google-apps.document';

// Optional account segment in its REAL position: /document/u/<n>/d/<id>.
const DOCS_URL_PATH = /^\/document\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)(?:\/|$)/;
const DRIVE_FILE_URL_PATH = /^\/file\/(?:u\/\d+\/)?d\/([a-zA-Z0-9_-]+)(?:\/|$)/;

export function extractDriveFileId(url) {
  if (typeof url !== 'string') return null;
  let parsed;
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

export function isNativeGoogleDocMime(mime) {
  return mime === NATIVE_GOOGLE_DOC_MIME;
}

export function isValidPublicCreatorName(name) {
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
