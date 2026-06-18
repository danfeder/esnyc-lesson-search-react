/**
 * Predicate-family evaluator for the search eval harness (S0.3).
 *
 * The `predicate` scoring family (gold-provenance.md §"PREDICATE queries")
 * evaluates a concrete, snapshot-pinned SQL boolean over each of the live
 * top-10 rows. The anon Supabase client CANNOT run arbitrary SQL, so the
 * predicate is re-evaluated IN JS against the row fields the harness fetches.
 *
 * The predicate grammar in queries.json is small and regular. This module
 * implements EXACTLY these productions and THROWS on anything unrecognized, so a
 * future gold edit that introduces an unsupported form is caught loudly rather
 * than silently scored wrong:
 *
 *   - scalar ILIKE:        title|summary ILIKE '%pat%'
 *   - array-ILIKE EXISTS:  EXISTS(SELECT 1 FROM unnest(<arrCol>) <alias>
 *                            WHERE <alias> ILIKE '%pat%' [OR <alias> ILIKE '%pat2%']*)
 *                          where <arrCol> in {main_ingredients, cultural_heritage}
 *   - array equality ANY:  '<Value>' = ANY(<arrCol>)
 *                          where <arrCol> in {core_competencies}
 *   - boolean composition: top-level " AND " of OR-groups (only q17 uses it);
 *                          within a group, top-level " OR " of terms; parentheses
 *                          group an OR-set. Whole predicate = AND of groups;
 *                          group = OR of terms. Splitting NEVER occurs inside
 *                          `(...)` or inside a quoted string.
 *
 * ILIKE faithfulness: every pattern in the frozen gold is `%word%` with NO
 * embedded `_`/mid-string `%` wildcard, so plain `String.includes` after
 * `toLowerCase()` is faithful to Postgres ILIKE. If a pattern ever contains a
 * bare `_` or a mid-string `%`, we THROW (a future gold edit can't silently
 * break faithfulness).
 *
 * q09's predicate.sql is NOT real SQL
 * (`lesson_id IN (q15.primaryClusters UNION q15.acceptableClusters flattened)`).
 * It is special-cased by id in the harness and must NEVER be fed here;
 * evaluatePredicate throws on it defensively (no recognized production matches).
 *
 * Pure module: no IO, no env, no `@/` aliases (so the harness and any future
 * frontend caller share identical code).
 */

/** The row fields the predicate grammar can read. */
export interface PredicateRow {
  title: string | null;
  summary: string | null;
  main_ingredients: string[] | null;
  core_competencies: string[] | null;
  cultural_heritage: string[] | null;
}

/** Scalar (text) columns a `title|summary ILIKE` term may target. */
const SCALAR_COLUMNS = ['title', 'summary'] as const;
type ScalarColumn = (typeof SCALAR_COLUMNS)[number];

/** Array columns an `EXISTS(unnest(...))` term may target. */
const ARRAY_ILIKE_COLUMNS = ['main_ingredients', 'cultural_heritage'] as const;
type ArrayIlikeColumn = (typeof ARRAY_ILIKE_COLUMNS)[number];

/** Array columns an `'<Value>' = ANY(...)` term may target. */
const ARRAY_ANY_COLUMNS = ['core_competencies'] as const;
type ArrayAnyColumn = (typeof ARRAY_ANY_COLUMNS)[number];

function isScalarColumn(name: string): name is ScalarColumn {
  return (SCALAR_COLUMNS as readonly string[]).includes(name);
}
function isArrayIlikeColumn(name: string): name is ArrayIlikeColumn {
  return (ARRAY_ILIKE_COLUMNS as readonly string[]).includes(name);
}
function isArrayAnyColumn(name: string): name is ArrayAnyColumn {
  return (ARRAY_ANY_COLUMNS as readonly string[]).includes(name);
}

/**
 * Extract the substring an ILIKE pattern `'%word%'` matches, and assert it is a
 * faithful (`String.includes`-equivalent) pattern. Throws if the pattern has a
 * bare `_` or a mid-string `%` (anything `String.includes` cannot honor).
 */
function ilikeNeedle(pattern: string): string {
  if (!pattern.startsWith('%') || !pattern.endsWith('%') || pattern.length < 2) {
    throw new Error(`Unfaithful ILIKE pattern (expected leading+trailing %): '${pattern}'`);
  }
  const inner = pattern.slice(1, -1);
  if (inner.includes('%')) {
    throw new Error(`Unfaithful ILIKE pattern (mid-string %): '${pattern}'`);
  }
  if (inner.includes('_')) {
    throw new Error(`Unfaithful ILIKE pattern (underscore wildcard): '${pattern}'`);
  }
  return inner.toLowerCase();
}

function scalarContains(value: string | null, needle: string): boolean {
  if (value == null) return false;
  return value.toLowerCase().includes(needle);
}

function arrayAnyContains(arr: string[] | null, needle: string): boolean {
  if (arr == null) return false;
  return arr.some((el) => el != null && el.toLowerCase().includes(needle));
}

/**
 * Split a boolean expression on a top-level operator (` AND ` / ` OR `), never
 * splitting inside parentheses or inside a single-quoted string literal.
 */
function splitTopLevel(expr: string, operator: 'AND' | 'OR'): string[] {
  const token = ` ${operator} `;
  const parts: string[] = [];
  let depth = 0;
  let inQuote = false;
  let start = 0;

  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (ch === "'") {
      // KNOWN LIMITATION: this toggles on every single-quote and does NOT decode
      // the SQL `''` escape for a literal apostrophe. No frozen queries.json
      // predicate uses an apostrophe, so this is currently inert. If a future
      // predicate introduces one (e.g. a possessive cultural term), the split
      // mis-detects and the term parser then throws on the malformed leaf —
      // surfacing LOUDLY in the scorecard's "Errored queries" table, never a
      // silent wrong score. Add `''`-escape handling here (and value-unescape in
      // the `= ANY`/ILIKE leaf parsers) at that point.
      inQuote = !inQuote;
      continue;
    }
    if (inQuote) continue;
    if (ch === '(') {
      depth += 1;
      continue;
    }
    if (ch === ')') {
      depth -= 1;
      continue;
    }
    if (
      depth === 0 &&
      expr.startsWith(token, i)
    ) {
      parts.push(expr.slice(start, i));
      i += token.length - 1;
      start = i + 1;
    }
  }
  parts.push(expr.slice(start));
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

/** Strip one outer layer of balanced parentheses, if present. */
function stripOuterParens(expr: string): string {
  let s = expr.trim();
  // Only strip when the leading `(` matches the trailing `)` (i.e. the whole
  // expression is wrapped), never when they belong to different sub-groups.
  while (s.startsWith('(') && s.endsWith(')')) {
    let depth = 0;
    let wraps = true;
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '(') depth += 1;
      else if (s[i] === ')') {
        depth -= 1;
        if (depth === 0 && i < s.length - 1) {
          wraps = false;
          break;
        }
      }
    }
    if (!wraps) break;
    s = s.slice(1, -1).trim();
  }
  return s;
}

// --- term matchers (leaf predicates) ---------------------------------------

const SCALAR_ILIKE_RE = /^(\w+)\s+ILIKE\s+'((?:[^']|'')*)'$/i;
const ARRAY_ANY_RE = /^'((?:[^']|'')*)'\s*=\s*ANY\(\s*(\w+)\s*\)$/i;
const EXISTS_RE =
  /^EXISTS\(\s*SELECT\s+1\s+FROM\s+unnest\(\s*(\w+)\s*\)\s+(\w+)\s+WHERE\s+(.+)\)$/i;

/** Evaluate a single leaf term (no top-level AND/OR). Throws if unrecognized. */
function evaluateTerm(term: string, r: PredicateRow): boolean {
  const t = term.trim();

  // scalar ILIKE
  const scalar = SCALAR_ILIKE_RE.exec(t);
  if (scalar) {
    const col = scalar[1].toLowerCase();
    if (!isScalarColumn(col)) {
      throw new Error(`Unrecognized scalar column in predicate term: '${col}' (${t})`);
    }
    const needle = ilikeNeedle(scalar[2]);
    return scalarContains(r[col], needle);
  }

  // array equality ANY
  const anyMatch = ARRAY_ANY_RE.exec(t);
  if (anyMatch) {
    const value = anyMatch[1];
    const col = anyMatch[2].toLowerCase();
    if (!isArrayAnyColumn(col)) {
      throw new Error(`Unrecognized array column in '= ANY' predicate term: '${col}' (${t})`);
    }
    const arr = r[col];
    if (arr == null) return false;
    // exact, case-sensitive — matches Postgres `= ANY`.
    return arr.includes(value);
  }

  // array-ILIKE EXISTS
  const exists = EXISTS_RE.exec(t);
  if (exists) {
    const col = exists[1].toLowerCase();
    const alias = exists[2];
    const whereClause = exists[3].trim();
    if (!isArrayIlikeColumn(col)) {
      throw new Error(`Unrecognized array column in EXISTS predicate term: '${col}' (${t})`);
    }
    // The WHERE clause is an OR of `<alias> ILIKE '%pat%'` comparisons.
    const ilikeRe = new RegExp(`^${alias}\\s+ILIKE\\s+'((?:[^']|'')*)'$`, 'i');
    const orTerms = splitTopLevel(whereClause, 'OR');
    const needles: string[] = [];
    for (const ot of orTerms) {
      const m = ilikeRe.exec(ot.trim());
      if (!m) {
        throw new Error(`Unrecognized EXISTS WHERE term: '${ot}' (${t})`);
      }
      needles.push(ilikeNeedle(m[1]));
    }
    return needles.some((n) => arrayAnyContains(r[col], n));
  }

  throw new Error(`Unrecognized predicate term: '${t}'`);
}

/**
 * Evaluate a predicate SQL boolean over a single row.
 *
 * Whole predicate = AND of OR-groups; group = OR of terms. Parentheses group an
 * OR-set; never split inside parens or a quoted string. Throws on any
 * unrecognized production (defensive — including q09's pseudo-SQL).
 */
export function evaluatePredicate(sql: string, row: PredicateRow): boolean {
  if (typeof sql !== 'string' || sql.trim().length === 0) {
    throw new Error('evaluatePredicate: empty predicate SQL');
  }

  const andGroups = splitTopLevel(sql.trim(), 'AND');

  return andGroups.every((group) => {
    const inner = stripOuterParens(group);
    const orTerms = splitTopLevel(inner, 'OR');
    return orTerms.some((term) => evaluateTerm(stripOuterParens(term), row));
  });
}

/**
 * Extract the integer threshold N from a `>=N/10` token in a predicate
 * description (e.g. ">=7/10 of top-10 ..."). Tolerates whitespace around the
 * operator and the slash. Returns null when no such threshold is present.
 */
export function parsePredicateThreshold(description: string): number | null {
  const m = /,?\s*>=\s*(\d+)\s*\/\s*10/.exec(description);
  return m ? Number(m[1]) : null;
}
