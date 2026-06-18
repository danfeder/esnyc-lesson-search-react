/**
 * parseSearchQuery — pure, dependency-free query preprocessing for the public search.
 *
 * Splits a raw search box string into:
 *   - cleanedQuery:    the FTS term with filler words AND any routed grade-cue tokens
 *                      removed, collapsed to single spaces, trimmed.
 *   - detectedGrades:  valid `filter_grade_levels` values, in canonical order, routed
 *                      only when an EXPLICIT grade cue is present.
 *
 * IMPORTANT (GATE-1 invariant): this module MUST stay pure and dependency-free —
 * NO `@/` alias imports, NO `import.meta.env`, no other `src/` deps. The standalone
 * `tsx` search-eval harness imports this exact file, so the grade vocabulary is
 * inlined here rather than imported from filterDefinitions.ts.
 *
 * Grade-router safety invariants (design §5):
 *  - Never route a bare digit/number alone — an explicit cue is required.
 *  - Map only to valid values; ignore out-of-range (e.g. `grade 9`).
 *  - Ranges expand inclusively along canonical order.
 *  - Always strip the routed grade token(s) from cleanedQuery.
 *  - Never strip filler to empty when no grade is detected (keep the trimmed raw query);
 *    a grade-only query MAY return an empty cleanedQuery (show-all-of-grade path).
 */

// Canonical order for the grade filter values (inlined; mirrors filterDefinitions.ts gradeLevels).
const CANONICAL_GRADES = ['3K', 'PK', 'K', '1', '2', '3', '4', '5', '6', '7', '8'] as const;
const VALID_GRADE_SET = new Set<string>(CANONICAL_GRADES);
const CANONICAL_INDEX: Record<string, number> = Object.fromEntries(
  CANONICAL_GRADES.map((g, i) => [g, i])
);

// Filler stoplist — small, conservative, whole-token, case-insensitive.
const FILLER = new Set<string>(['lesson', 'lessons', 'for', 'about', 'a', 'an', 'the']);

// Ordinal words/abbreviations -> grade value '1'..'8'.
const ORDINAL_MAP: Record<string, string> = {
  first: '1',
  '1st': '1',
  second: '2',
  '2nd': '2',
  third: '3',
  '3rd': '3',
  fourth: '4',
  '4th': '4',
  fifth: '5',
  '5th': '5',
  sixth: '6',
  '6th': '6',
  seventh: '7',
  '7th': '7',
  eighth: '8',
  '8th': '8',
};

// Spelled-out numbers usable after "grade(s)" -> grade value.
const NUMBER_WORD_MAP: Record<string, string> = {
  zero: '0', // out-of-range on purpose (ignored downstream)
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
};

/**
 * Normalize a single endpoint token (already lower-cased) to a canonical grade value,
 * or null if it is not a valid grade endpoint. Used for both single grades and ranges.
 * Accepts: 3k / pk / k / digit / number-word / ordinal.
 */
function endpointToGrade(token: string): string | null {
  if (token === '3k') return '3K';
  if (token === 'pk') return 'PK';
  if (token === 'k') return 'K';
  if (ORDINAL_MAP[token]) return ORDINAL_MAP[token];
  if (NUMBER_WORD_MAP[token]) {
    const g = NUMBER_WORD_MAP[token];
    return VALID_GRADE_SET.has(g) ? g : null;
  }
  if (/^[0-9]+$/.test(token)) {
    return VALID_GRADE_SET.has(token) ? token : null;
  }
  return null;
}

/** Expand an inclusive range between two canonical grade values along canonical order. */
function expandRange(a: string, b: string): string[] {
  const ia = CANONICAL_INDEX[a];
  const ib = CANONICAL_INDEX[b];
  if (ia === undefined || ib === undefined) return [];
  const [lo, hi] = ia <= ib ? [ia, ib] : [ib, ia];
  return CANONICAL_GRADES.slice(lo, hi + 1);
}

export interface ParsedSearchQuery {
  cleanedQuery: string;
  detectedGrades: string[];
}

export function parseSearchQuery(raw: string): ParsedSearchQuery {
  if (raw == null || typeof raw !== 'string') {
    return { cleanedQuery: '', detectedGrades: [] };
  }

  const trimmedRaw = raw.replace(/\s+/g, ' ').trim();
  if (trimmedRaw === '') {
    return { cleanedQuery: '', detectedGrades: [] };
  }

  // Tokenize on whitespace, preserving the original token for reconstruction.
  const tokens = trimmedRaw.split(' ');
  const lower = tokens.map((t) => t.toLowerCase());

  const detected: string[] = [];
  // Indices of tokens consumed by grade routing (stripped from cleanedQuery).
  const consumed = new Set<number>();

  const isGradeWord = (i: number) => lower[i] === 'grade' || lower[i] === 'grades';

  // A standalone-cue endpoint may be a range "lo-hi" (e.g. "k-2", "3-5") or a single value.
  // Returns the routed grades from a token, or null if it is not a self-contained range/standalone.
  const rangeFromToken = (token: string): string[] | null => {
    const m = token.match(/^([a-z0-9]+)-([a-z0-9]+)$/);
    if (!m) return null;
    const a = endpointToGrade(m[1]);
    const b = endpointToGrade(m[2]);
    if (!a || !b) return null;
    return expandRange(a, b);
  };

  for (let i = 0; i < tokens.length; i++) {
    if (consumed.has(i)) continue;
    const tok = lower[i];

    // --- Standalone cues (no preceding "grade(s)" needed) ---
    // kindergarten -> K
    if (tok === 'kindergarten') {
      detected.push('K');
      consumed.add(i);
      continue;
    }
    // pre-k / prek / pre-kindergarten -> PK
    if (
      tok === 'pre-k' ||
      tok === 'prek' ||
      tok === 'pre-kindergarten' ||
      tok === 'prekindergarten'
    ) {
      detected.push('PK');
      consumed.add(i);
      continue;
    }
    // 3k -> 3K (standalone)
    if (tok === '3k') {
      detected.push('3K');
      consumed.add(i);
      continue;
    }

    // ordinal + grade word: "3rd grade", "first grade", "2nd graders", "third graders"
    if (ORDINAL_MAP[tok] && i + 1 < tokens.length) {
      const next = lower[i + 1];
      if (next === 'grade' || next === 'grades' || next === 'grader' || next === 'graders') {
        detected.push(ORDINAL_MAP[tok]);
        consumed.add(i);
        consumed.add(i + 1);
        continue;
      }
    }

    // "grade(s)" + (number | ordinal | spelled-number | range)
    if (isGradeWord(i) && i + 1 < tokens.length) {
      const nextTok = lower[i + 1];

      // range as a single token after grade(s): "grades K-2", "grades 3-5"
      const range = rangeFromToken(nextTok);
      if (range && range.length > 0) {
        detected.push(...range);
        consumed.add(i);
        consumed.add(i + 1);
        continue;
      }

      // single grade value after grade(s)
      const single = endpointToGrade(nextTok);
      if (single && VALID_GRADE_SET.has(single)) {
        detected.push(single);
        consumed.add(i);
        consumed.add(i + 1);
        continue;
      }
      // "grade" not followed by a valid grade endpoint -> treat as content (verb sense).
    }

    // standalone range token even without a "grade(s)" prefix is NOT a cue by itself
    // (a bare "K-2" without "grade(s)" is ambiguous content); only route ranges that
    // followed a grade word above. So nothing else routes here.
  }

  // De-dup + sort to canonical order; drop any invalid (defensive).
  const detectedGrades = Array.from(new Set(detected))
    .filter((g) => VALID_GRADE_SET.has(g))
    .sort((a, b) => CANONICAL_INDEX[a] - CANONICAL_INDEX[b]);

  // Build cleanedQuery: drop consumed (grade) tokens, then drop filler tokens.
  const kept: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (consumed.has(i)) continue;
    if (FILLER.has(lower[i])) continue;
    kept.push(tokens[i]);
  }
  let cleanedQuery = kept.join(' ').replace(/\s+/g, ' ').trim();

  // never-empty invariant: if filler removal emptied the query AND no grade was detected,
  // fall back to the trimmed raw query (don't return empty). A grade-only query (grades
  // detected, nothing left) intentionally keeps cleanedQuery === ''.
  if (cleanedQuery === '' && detectedGrades.length === 0) {
    cleanedQuery = trimmedRaw;
  }

  return { cleanedQuery, detectedGrades };
}
