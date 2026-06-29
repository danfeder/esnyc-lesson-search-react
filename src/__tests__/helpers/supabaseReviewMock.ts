/**
 * Table-aware Supabase query-builder mock for the ReviewDetail page-level test
 * (Wave 5, PR-0 Task 0.1).
 *
 * WHY THIS EXISTS
 * ---------------
 * The global test setup (`src/__tests__/setup.ts`) mocks `supabase.from` with a
 * single chainable builder that resolves the SAME `{data,error}` for every
 * table — and it has no `functions`/`rpc` member. `ReviewDetail.loadSubmission`
 * fans out across FIVE different tables (`lesson_submissions`,
 * `submission_similarities`, `lessons_with_metadata`, `submission_reviews`,
 * `user_profiles`), so the page can only be exercised with a mock that returns
 * DIFFERENT data per table. This helper provides exactly that.
 *
 * DISPATCH-BY-TABLE (not a `mockResolvedValueOnce` queue)
 * -------------------------------------------------------
 * `from(table)` looks the table up in `tableData` and returns a builder seeded
 * with that table's configured result, REGARDLESS of fetch order. This is what
 * lets the page test assert FINAL STATE rather than call sequence — so PR-2's
 * serial→parallel reorder of the fetch graph cannot break it. (A
 * `mockResolvedValueOnce` queue would be order-sensitive and would break on the
 * reorder.) CAVEAT: because dispatch is keyed on the table name and ignores
 * query args, the mock CANNOT detect a dependency-violating reorder (e.g. the
 * `lessons_with_metadata` candidate fetch firing before `submission_similarities`
 * resolves its ids) — that correctness is covered by PR-2's manual smoke, not by
 * this mock.
 *
 * DUAL-SHAPE TERMINALS (load-bearing — a naive impl breaks)
 * ---------------------------------------------------------
 * `loadSubmission` consumes query results in TWO shapes:
 *   - `.single()` / `.maybeSingle()` → an OBJECT (lesson_submissions,
 *     user_profiles, and the off-list lessons_with_metadata lookup).
 *   - a bare `await` (no `.single()`) → an ARRAY (submission_similarities via
 *     `.order()`, submission_reviews via `.limit(1)`, and the candidate
 *     lessons_with_metadata via `.in()`).
 * So every table's `data` is configured in the ARRAY form; `.single()`/
 * `.maybeSingle()` UNWRAP to the first element (or null), while a bare `await`
 * (the thenable) resolves the array as-is.
 *
 * NOTE on `lessons_with_metadata`: it is queried BOTH ways — the candidate
 * `.in()` path (array) and the off-list `.eq().single()` path (object). The
 * in-scope page behaviors drive only the candidate (array) path, so configure it
 * as the candidate array. None of the three shipped fixtures triggers the
 * off-list lookup (it only fires when `original_lesson_id` points to a lesson
 * NOT in the rendered top-5 dup cards). If a future behavior needs BOTH shapes
 * for `lessons_with_metadata` simultaneously, this default is insufficient — key
 * a handler on `{table, terminal}` at that point.
 *
 * CONSUMPTION CONTRACT (for Task 0.2)
 * -----------------------------------
 *   const supa = makeReviewSupabaseMock(modernFixture);
 *   vi.mock('@/lib/supabase', () => ({
 *     supabase: {
 *       from: (table: string) => currentMock.from(table),   // lazy ref so the
 *       functions: { invoke: (...a) => functionsInvokeMock(...a) }, // fixture
 *     },                                                            // can swap
 *   }));
 * Build a fresh mock per fixture (`makeReviewSupabaseMock(...)`) and point the
 * factory's `from` at the current one. `functions.invoke` is NOT supplied here —
 * 0.2 owns it in its own `vi.mock` (mirrors `search-page.test.tsx`).
 */
import { vi } from 'vitest';

/** The `{data, error}` shape every supabase-js query resolves to. */
export interface TableResult {
  data: unknown;
  error: unknown;
  /**
   * R2-1 reject path: when set, every terminal of this table's builder
   * (`.single()`, `.maybeSingle()`, and the bare-await thenable) REJECTS with
   * this value instead of resolving `{data, error}`. Models a true
   * network/connection failure — the supabase-js promise ITSELF rejecting, not
   * its usual resolved `{data: null, error}` — so a test can exercise the hook's
   * outer try/catch reject path. Omit it for the normal resolve behavior.
   */
  reject?: unknown;
}

/**
 * A thenable chainable query builder. Every chain method returns the SAME
 * builder; `.single()`/`.maybeSingle()` unwrap the configured array to its first
 * element; awaiting the builder directly resolves the configured array as-is.
 *
 * F1: the chainable-method surface MIRRORS the global `setup.ts` builder exactly
 * so this table-aware mock is a strict SUPERSET. `LessonSearchPicker` (rendered
 * by the auto-opened search hatch in the (update, null-target) / zero-candidate
 * cases — tests 6/7) chains `.ilike('title', …)` and, with excludeRetired,
 * `.is('retired_at', null)`; a thinner surface would TypeError the moment a test
 * exercises that search input. The methods are arg-blind by design (the LOCKED
 * dispatch-by-table tradeoff — see the module header); they only need to EXIST
 * and keep the chain fluent.
 */
export interface ReviewQueryBuilder extends PromiseLike<TableResult> {
  select: (...args: unknown[]) => ReviewQueryBuilder;
  insert: (...args: unknown[]) => ReviewQueryBuilder;
  update: (...args: unknown[]) => ReviewQueryBuilder;
  delete: (...args: unknown[]) => ReviewQueryBuilder;
  eq: (...args: unknown[]) => ReviewQueryBuilder;
  neq: (...args: unknown[]) => ReviewQueryBuilder;
  gt: (...args: unknown[]) => ReviewQueryBuilder;
  gte: (...args: unknown[]) => ReviewQueryBuilder;
  lt: (...args: unknown[]) => ReviewQueryBuilder;
  lte: (...args: unknown[]) => ReviewQueryBuilder;
  like: (...args: unknown[]) => ReviewQueryBuilder;
  ilike: (...args: unknown[]) => ReviewQueryBuilder;
  is: (...args: unknown[]) => ReviewQueryBuilder;
  in: (...args: unknown[]) => ReviewQueryBuilder;
  contains: (...args: unknown[]) => ReviewQueryBuilder;
  containedBy: (...args: unknown[]) => ReviewQueryBuilder;
  range: (...args: unknown[]) => ReviewQueryBuilder;
  overlaps: (...args: unknown[]) => ReviewQueryBuilder;
  textSearch: (...args: unknown[]) => ReviewQueryBuilder;
  match: (...args: unknown[]) => ReviewQueryBuilder;
  not: (...args: unknown[]) => ReviewQueryBuilder;
  or: (...args: unknown[]) => ReviewQueryBuilder;
  filter: (...args: unknown[]) => ReviewQueryBuilder;
  order: (...args: unknown[]) => ReviewQueryBuilder;
  limit: (...args: unknown[]) => ReviewQueryBuilder;
  single: () => Promise<TableResult>;
  maybeSingle: () => Promise<TableResult>;
}

function makeReviewQueryBuilder(config: TableResult): ReviewQueryBuilder {
  const { data, error, reject: rejectWith } = config;
  // R2-1 reject path: a configured `reject` makes every terminal REJECT (models
  // the supabase-js promise itself rejecting) instead of resolving `{data,error}`.
  const rejecting = rejectWith !== undefined;
  // Dual-shape unwrap: array form on disk → first element for `.single()`.
  const unwrapped: unknown = Array.isArray(data) ? (data[0] ?? null) : data;

  const builder: ReviewQueryBuilder = {
    select: () => builder,
    insert: () => builder,
    update: () => builder,
    delete: () => builder,
    eq: () => builder,
    neq: () => builder,
    gt: () => builder,
    gte: () => builder,
    lt: () => builder,
    lte: () => builder,
    like: () => builder,
    ilike: () => builder,
    is: () => builder,
    in: () => builder,
    contains: () => builder,
    containedBy: () => builder,
    range: () => builder,
    overlaps: () => builder,
    textSearch: () => builder,
    match: () => builder,
    not: () => builder,
    or: () => builder,
    filter: () => builder,
    order: () => builder,
    limit: () => builder,
    single: () =>
      rejecting
        ? Promise.reject<TableResult>(rejectWith)
        : Promise.resolve<TableResult>({ data: unwrapped, error }),
    maybeSingle: () =>
      rejecting
        ? Promise.reject<TableResult>(rejectWith)
        : Promise.resolve<TableResult>({ data: unwrapped, error }),
    then: <TResult1 = TableResult, TResult2 = never>(
      onfulfilled?: ((value: TableResult) => TResult1 | PromiseLike<TResult1>) | null | undefined,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null | undefined
    ): Promise<TResult1 | TResult2> =>
      (rejecting
        ? Promise.reject<TableResult>(rejectWith)
        : Promise.resolve<TableResult>({ data, error })
      ).then(onfulfilled, onrejected),
  };

  return builder;
}

/**
 * Build a table-aware supabase `from` mock from a per-table result map.
 *
 * @param tableData maps a table name → its `{data, error}` result. `data` is in
 *   ARRAY form (see dual-shape note above). Unknown tables resolve to
 *   `{data: null, error: null}`.
 * @returns an object with a `from(table)` method yielding a fresh thenable
 *   chainable builder for that table.
 */
export function makeReviewSupabaseMock(tableData: Record<string, TableResult>) {
  const from = vi.fn(
    (table: string): ReviewQueryBuilder =>
      makeReviewQueryBuilder(tableData[table] ?? { data: null, error: null })
  );
  return { from };
}
