/**
 * T4 dedup sweep — title normalization + pg_trgm-style trigram similarity.
 *
 * Pure, deterministic, no I/O. Kept in its own module so it can be unit-tested
 * and reused. The trigram algorithm mimics PostgreSQL `pg_trgm.similarity()`
 * closely enough that tier assignments match the SQL reference values (see the
 * calibration gate in `generate-candidates.ts`): lowercase, split on
 * non-alphanumerics, pad each word with two leading + one trailing space,
 * collect the 3-grams into a SET, and compute Jaccard |A∩B| / |A∪B|.
 */

/**
 * `norm(title)`: lowercase, collapse EVERY run of whitespace-or-control
 * characters (spaces, tabs, newlines, and C0/C1 control bytes — crucially the
 * trailing vertical tab `U+000B` that 10 known same-title pairs differ only by)
 * to a single space, then trim. Implemented by codepoint scan rather than a
 * control-character regex literal (which `no-control-regex` forbids).
 */
export function normTitle(title: string): string {
  const lowered = title.toLowerCase();
  let out = '';
  let prevSpace = false;
  for (const ch of lowered) {
    const code = ch.codePointAt(0) as number;
    const isWsOrControl =
      code <= 0x20 || code === 0x7f || (code >= 0x80 && code <= 0x9f) || /\s/u.test(ch);
    if (isWsOrControl) {
      if (!prevSpace) {
        out += ' ';
        prevSpace = true;
      }
    } else {
      out += ch;
      prevSpace = false;
    }
  }
  return out.trim();
}

/**
 * Extract the pg_trgm-style trigram SET of a string: lowercase, replace every
 * non-alphanumeric run with a single space, split into words, pad each word
 * `"  <word> "` (two leading spaces, one trailing), and collect all length-3
 * substrings. Duplicates are collapsed (pg_trgm compares unique trigrams).
 *
 * Known limitation: only ASCII `[a-z0-9]` count as word characters, so accented
 * letters (ñ, é, …) split words where Postgres's locale-aware pg_trgm might not.
 * The brief explicitly does NOT require exact pg_trgm parity — the calibration
 * gate is the arbiter, and on the pre-registered PROD pairs the TS and SQL
 * values agree to ≤0.001, so this approximation is intentional.
 */
export function trigramSet(text: string): Set<string> {
  const set = new Set<string>();
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w.length > 0);
  for (const word of words) {
    const padded = `  ${word} `;
    for (let i = 0; i + 3 <= padded.length; i += 1) {
      set.add(padded.slice(i, i + 3));
    }
  }
  return set;
}

/**
 * Jaccard similarity of two trigram sets: |A∩B| / |A∪B|. Matches pg_trgm's
 * `similarity()`, including returning 0 when EITHER set is empty (two strings
 * with no trigrams are not "identical" — pg_trgm's cnt_sml gives 0, and this
 * avoids blocking-rule (b) falsely pairing e.g. two punctuation-only titles).
 */
export function trigramSim(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  let inter = 0;
  for (const t of small) {
    if (large.has(t)) inter += 1;
  }
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

/** Convenience: trigram similarity of two raw strings. */
export function stringSim(a: string, b: string): number {
  return trigramSim(trigramSet(a), trigramSet(b));
}
