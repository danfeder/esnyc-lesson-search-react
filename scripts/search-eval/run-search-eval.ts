#!/usr/bin/env npx tsx
/**
 * Search eval harness (S0.3) — read-only TypeScript script run via `npx tsx`.
 *
 *   npm run eval:search                          # target=test (default), no baseline write
 *   SEARCH_EVAL_TARGET=test npm run eval:search  # explicit target
 *   npm run eval:search -- --target=local        # CLI override
 *   npm run eval:search -- --write-baseline      # write/overwrite baseline.json (S0.4)
 *
 * It runs the committed two-tier gold (`queries.json`) through the live public
 * `search_lessons` RPC on the target DB and writes a human-readable scorecard +
 * (optionally) a machine-readable baseline. It scores per the per-query SCORING
 * FAMILY defined in design §4 (frozen-recall / frozen-precision / predicate /
 * g3-isolation / sentinel / control-maxcount), importing the cluster-aware
 * metric math from metrics.ts (NEVER reimplemented here).
 *
 * DATA SAFETY (HARD): READ-ONLY against the DB — only `.rpc('search_lessons')`
 * and `.from('lessons').select(...)`. NO insert/update/delete/upsert, no other
 * RPCs, no service key. The assertReadOnly guard enforces anon-only. Writing the
 * local scorecard / baseline FILES is NOT a DB write.
 *
 * SCORECARD FILENAME: scorecards/<target>.md is a STABLE filename per target so
 * each PR's re-run produces a git-diffable delta (the design's "commit the
 * scorecard diff as a required review item"). Re-running overwrites it.
 *
 * Never throws on a single bad query (missing gold id, zero rows, RPC error) —
 * records + continues; prints a final "N errored / M total" line.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';

import dotenv from 'dotenv';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  duplicateFloodCount,
  firstRankOf,
  isolationHitsAtK,
  jaccard,
  mrr,
  overBroad,
  precisionAtK,
  rankMovement,
  ranksOf,
  recallAtK,
  top1Relevant,
} from './metrics';
import { evaluatePredicate, parsePredicateThreshold, type PredicateRow } from './predicate';
import { assertReadOnly } from './readonly-guard';
// S1.4: the public G2 fix is frontend (parseSearchQuery). The harness imports the
// EXACT same pure, alias-free module the search hook uses (src/utils/parseSearchQuery.ts)
// so the eval scores the real normalized call (cleaned search_query + routed grades) —
// keeping the gate honest about end-to-end app behavior.
import { parseSearchQuery } from '../../src/utils/parseSearchQuery';

// Load env exactly like backfill-embeddings.ts (dotenv; never shell-source —
// .env may contain a multiline JSON value, GOOGLE_SERVICE_ACCOUNT_JSON).
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Corpus size is read from queries.json `_snapshot.searchableCorpus` at runtime
// (the single source of truth) and threaded into scoreQuery — never hardcoded,
// so a future snapshot refresh can't leave a stale over-broad denominator.
const PAGE_SIZE = 50;
const OVERBROAD_THRESHOLD = 0.5;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Target = 'local' | 'test' | 'prod';
type Scoring =
  | 'frozen-recall'
  | 'frozen-precision'
  | 'predicate'
  | 'g3-isolation'
  | 'sentinel'
  | 'control-maxcount';

/** A row returned by the search_lessons RPC (only the fields the harness uses). */
interface SearchRow {
  lesson_id: string;
  total_count: number;
}

/** A row from public.lessons used for the dup cluster key + predicate eval. */
interface LessonRow {
  lesson_id: string;
  content_hash: string | null;
  title: string | null;
  summary: string | null;
  main_ingredients: string[] | null;
  core_competencies: string[] | null;
  cultural_heritage: string[] | null;
}

interface QueryEntry {
  id: string;
  query: string;
  intent: string;
  category: string;
  scoring: Scoring;
  primaryClusters?: string[][];
  acceptableClusters?: string[][];
  predicate?: { description: string; sql: string };
  isolationIds?: string[];
  normalizedCall?: { search_query: string; filter_grade_levels?: string[] };
  maxTotalCount?: number;
  snapshot?: { totalCount?: number; topIds?: string[] };
}

interface QueriesFile {
  _snapshot: {
    db: string;
    project_ref: string;
    date: string;
    searchableCorpus: number;
    retiredExcluded: boolean;
    notes: string;
  };
  queries: QueryEntry[];
}

/** Per-query computed result, written to the scorecard + (optionally) baseline. */
interface QueryResult {
  id: string;
  query: string;
  scoring: Scoring;
  category: string;
  totalCount: number;
  returned: number;
  errored?: string; // error message if the query failed
  expectedNormalizedCall?: { search_query: string; filter_grade_levels?: string[] };
  // S1.4 GATE-3: the parser-derived call actually made, + whether it drifted from
  // the frozen fixture entry.normalizedCall (only set for entries that carry one).
  actualNormalizedCall?: { search_query: string; filter_grade_levels?: string[] };
  normalizedCallMismatch?: boolean;
  // relevance diagnostics (frozen-recall / frozen-precision)
  recallAt10?: number;
  precisionAt10?: number;
  top1?: boolean;
  rr?: number; // per-query reciprocal rank (mean-aggregated into MRR)
  dupFlood?: number;
  distinctContentInTop10?: number;
  uniqueContentPrecision10?: number;
  // predicate
  predicateSatisfied?: number;
  predicateConsidered?: number;
  predicateThreshold?: number | null;
  predicatePass?: boolean;
  // g3-isolation
  isolationHits50?: number;
  isolationHits10?: number;
  isolationFirstRank?: number | null;
  isolationRanks?: (number | null)[];
  rankMovementMedian?: number | null;
  rankMovementBest?: number | null;
  // sentinel
  sentinelJaccard?: number;
  sentinelTotalCountDelta?: number | null;
  sentinelAlarm?: boolean;
  // maxTotalCount guard (any entry with maxTotalCount)
  maxTotalCount?: number;
  withinMaxTotalCount?: boolean;
  // control-maxcount
  overBroad?: boolean;
}

// ---------------------------------------------------------------------------
// CLI / env resolution
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): { writeBaseline: boolean; targetOverride?: Target } {
  let writeBaseline = false;
  let targetOverride: Target | undefined;
  for (const arg of argv) {
    if (arg === '--write-baseline') writeBaseline = true;
    else if (arg.startsWith('--target=')) {
      const t = arg.slice('--target='.length);
      if (t !== 'local' && t !== 'test' && t !== 'prod') {
        console.error(`Invalid --target='${t}' (expected local|test|prod)`);
        process.exit(1);
      }
      targetOverride = t;
    }
  }
  return { writeBaseline, targetOverride };
}

function resolveTarget(override?: Target): Target {
  const raw = override ?? process.env.SEARCH_EVAL_TARGET ?? 'test';
  if (raw !== 'local' && raw !== 'test' && raw !== 'prod') {
    console.error(`Invalid SEARCH_EVAL_TARGET='${raw}' (expected local|test|prod)`);
    process.exit(1);
  }
  return raw;
}

function resolveCreds(target: Target): { url: string; anonKey: string } {
  const pair: Record<Target, [string, string]> = {
    local: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
    test: ['TEST_SUPABASE_URL', 'TEST_SUPABASE_ANON_KEY'],
    prod: ['PROD_SUPABASE_URL', 'PROD_SUPABASE_ANON_KEY'],
  };
  const [urlVar, keyVar] = pair[target];
  const url = process.env[urlVar];
  const anonKey = process.env[keyVar];
  if (!url || !anonKey) {
    console.error(
      `Missing credentials for target '${target}': require ${urlVar} + ${keyVar} in .env / .env.local`,
    );
    process.exit(1);
  }
  return { url, anonKey };
}

/** Collect the VALUES of any env vars whose NAME matches /SERVICE/i. */
function collectServiceKeyValues(): string[] {
  const values: string[] = [];
  for (const [name, value] of Object.entries(process.env)) {
    if (/SERVICE/i.test(name) && typeof value === 'string' && value.length > 0) {
      values.push(value);
    }
  }
  return values;
}

// ---------------------------------------------------------------------------
// DB calls (the ONLY two DB operations: rpc search_lessons + lessons.select)
// ---------------------------------------------------------------------------

interface RpcResult {
  rows: SearchRow[];
  totalCount: number;
  error?: string;
}

/**
 * resolveCall — the S1.4 seam (now LIVE). Applies the shipped frontend G2 fix
 * (parseSearchQuery) so the harness scores the same normalized call the search
 * hook makes (useLessonSearch.ts): a cleaned FTS term + routed grade filter.
 * The expected normalizedCall stays recorded on the result for an attributable diff.
 */
function resolveCall(entry: QueryEntry): {
  search_query: string;
  filter_grade_levels?: string[];
} {
  // Apply parseSearchQuery exactly as the search hook does. No eval query is
  // grade-only, so cleanedQuery is always non-empty here (== the hook's
  // `cleanedQuery || undefined` for every entry in this set).
  const { cleanedQuery, detectedGrades } = parseSearchQuery(entry.query);
  const call: { search_query: string; filter_grade_levels?: string[] } = {
    search_query: cleanedQuery,
  };
  if (detectedGrades.length > 0) call.filter_grade_levels = detectedGrades;
  return call;
}

/**
 * Deep-compare two normalized calls (S1.4 GATE-3 drift guard). Two calls are
 * equal iff their search_query strings match exactly AND their grade lists have
 * the same elements in the same order (missing / empty grades == no grades).
 * Pure helper — used to assert the parser-derived call still matches the frozen
 * fixture entry.normalizedCall so parser drift is caught and the scorecard stays
 * honest. NO mismatch is expected today (this is a latent alarm).
 */
function callsEqual(
  a: { search_query: string; filter_grade_levels?: string[] },
  b: { search_query: string; filter_grade_levels?: string[] },
): boolean {
  if (a.search_query !== b.search_query) return false;
  const ga = a.filter_grade_levels ?? [];
  const gb = b.filter_grade_levels ?? [];
  if (ga.length !== gb.length) return false;
  for (let i = 0; i < ga.length; i++) {
    if (ga[i] !== gb[i]) return false;
  }
  return true;
}

async function runSearch(
  supabase: SupabaseClient,
  call: { search_query: string; filter_grade_levels?: string[] },
): Promise<RpcResult> {
  const params: Record<string, unknown> = {
    search_query: call.search_query,
    page_size: PAGE_SIZE,
    page_offset: 0,
  };
  // Only set the grade filter when a call actually provides one (at S0: never).
  if (call.filter_grade_levels && call.filter_grade_levels.length > 0) {
    params.filter_grade_levels = call.filter_grade_levels;
  }

  const { data, error } = await supabase.rpc('search_lessons', params);
  if (error) {
    return { rows: [], totalCount: 0, error: error.message };
  }
  const rows = (data ?? []) as SearchRow[];
  const totalCount = rows[0]?.total_count ?? 0;
  return { rows, totalCount };
}

async function fetchLessonRows(
  supabase: SupabaseClient,
  ids: string[],
): Promise<{ rows: LessonRow[]; error?: string }> {
  if (ids.length === 0) return { rows: [] };
  const { data, error } = await supabase
    .from('lessons')
    .select(
      'lesson_id, content_hash, title, summary, main_ingredients, core_competencies, cultural_heritage',
    )
    .in('lesson_id', ids);
  if (error) return { rows: [], error: error.message };
  return { rows: (data ?? []) as LessonRow[] };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function flattenClusters(clusters: string[][] | undefined): string[] {
  if (!clusters) return [];
  return clusters.flat();
}

/** Score one query against its returned rows + fetched lesson rows. */
function scoreQuery(
  entry: QueryEntry,
  rpc: RpcResult,
  rowByid: Map<string, PredicateRow>,
  clusterKeyOf: (id: string) => string,
  baseline: BaselineFile | null,
  corpusSize: number,
): QueryResult {
  const topIds = rpc.rows.map((r) => r.lesson_id);
  const result: QueryResult = {
    id: entry.id,
    query: entry.query,
    scoring: entry.scoring,
    category: entry.category,
    totalCount: rpc.totalCount,
    returned: rpc.rows.length,
  };
  if (entry.normalizedCall) result.expectedNormalizedCall = entry.normalizedCall;

  if (rpc.error) {
    result.errored = `RPC error: ${rpc.error}`;
    return result;
  }

  const considered = Math.min(10, rpc.rows.length);

  // common diagnostics for relevance queries (frozen-recall / frozen-precision)
  const addRelevanceDiagnostics = () => {
    const dupFlood = duplicateFloodCount(topIds, 10, clusterKeyOf);
    result.dupFlood = dupFlood;
    result.distinctContentInTop10 = considered - dupFlood;
    result.uniqueContentPrecision10 = (considered - dupFlood) / 10;
  };

  switch (entry.scoring) {
    case 'frozen-recall': {
      const primary = entry.primaryClusters ?? [];
      result.recallAt10 = recallAtK(topIds, primary, 10);
      result.top1 = top1Relevant(topIds, primary);
      result.rr = mrr(topIds, primary);
      addRelevanceDiagnostics();
      break;
    }
    case 'frozen-precision': {
      const primary = entry.primaryClusters ?? [];
      const relevant = [...primary, ...(entry.acceptableClusters ?? [])];
      result.precisionAt10 = precisionAtK(topIds, relevant, 10);
      result.top1 = top1Relevant(topIds, primary);
      result.rr = mrr(topIds, primary);
      addRelevanceDiagnostics();
      break;
    }
    case 'predicate': {
      let satisfied = 0;
      if (entry.id === 'q09') {
        // q09 is NOT real SQL: membership in q15 primary ∪ acceptable.
        // q15Members is supplied via the closure-captured map (see caller).
        const members = q09Members;
        for (const id of topIds.slice(0, 10)) {
          if (members.has(id)) satisfied += 1;
        }
        // q09 description carries the threshold (>=8/10).
        result.predicateThreshold = parsePredicateThreshold(
          entry.predicate?.description ?? '',
        );
      } else {
        const sql = entry.predicate?.sql ?? '';
        for (const id of topIds.slice(0, 10)) {
          const row = rowByid.get(id);
          if (!row) continue; // missing row -> false
          if (evaluatePredicate(sql, row)) satisfied += 1;
        }
        result.predicateThreshold = parsePredicateThreshold(entry.predicate?.description ?? '');
      }
      result.predicateSatisfied = satisfied;
      result.predicateConsidered = considered;
      result.predicatePass =
        result.predicateThreshold != null && satisfied >= result.predicateThreshold;
      addRelevanceDiagnostics();
      break;
    }
    case 'g3-isolation': {
      const iso = entry.isolationIds ?? [];
      result.isolationHits50 = isolationHitsAtK(topIds, iso, 50);
      result.isolationHits10 = isolationHitsAtK(topIds, iso, 10); // secondary signal
      result.isolationFirstRank = firstRankOf(topIds, iso);
      result.isolationRanks = ranksOf(topIds, iso);
      // rank-movement vs baseline. Absent (null) is treated as beyond the
      // fetched window (PAGE_SIZE + 1) inside rankMovement, so a tag-only lesson
      // that was ABSENT at baseline and becomes RANKED after typed-field
      // indexing (the primary S2 success case) registers as a positive move
      // rather than being dropped. No baseline (S0 first run / --write-baseline)
      // -> null movement.
      const rawBaselineRanks = baseline?.queries?.[entry.id]?.isolationRanks;
      const baselineRanks: (number | null)[] | null = Array.isArray(rawBaselineRanks)
        ? (rawBaselineRanks as (number | null)[])
        : null;
      if (baselineRanks) {
        const mv = rankMovement(result.isolationRanks, baselineRanks, PAGE_SIZE + 1);
        result.rankMovementMedian = mv.median;
        result.rankMovementBest = mv.best;
      } else {
        result.rankMovementMedian = null;
        result.rankMovementBest = null;
      }
      addRelevanceDiagnostics();
      break;
    }
    case 'sentinel': {
      const snapTop = entry.snapshot?.topIds ?? [];
      const snapTotal = entry.snapshot?.totalCount ?? null;
      result.sentinelJaccard = jaccard(topIds.slice(0, 10), snapTop);
      result.sentinelTotalCountDelta = snapTotal == null ? null : rpc.totalCount - snapTotal;
      const jaccardAlarm = result.sentinelJaccard < 0.8;
      const countAlarm =
        snapTotal != null && Math.abs(rpc.totalCount - snapTotal) > snapTotal * 0.1;
      result.sentinelAlarm = jaccardAlarm || countAlarm;
      break;
    }
    case 'control-maxcount': {
      result.overBroad = overBroad(rpc.totalCount, corpusSize, OVERBROAD_THRESHOLD);
      break;
    }
  }

  // maxTotalCount guard — for ANY entry that carries it.
  if (entry.maxTotalCount != null) {
    result.maxTotalCount = entry.maxTotalCount;
    result.withinMaxTotalCount = rpc.totalCount <= entry.maxTotalCount;
  }

  return result;
}

// q09 members set, populated once queries.json is loaded (q15 primary ∪ acceptable).
let q09Members: Set<string> = new Set();

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

const r3 = (n: number | null | undefined): string => {
  if (n == null) return 'n/a';
  if (Number.isNaN(n)) return 'NaN';
  return n.toFixed(3);
};

interface BaselineFile {
  _meta: { target: string; snapshotDate: string; corpusSize: number; note: string };
  queries: Record<string, Record<string, unknown>>;
}

interface Aggregate {
  meanRecall10: number | null;
  meanPrecision10: number | null;
  predicatePassRate: number | null;
  predicatePassed: number;
  predicateTotal: number;
  corpusMrr: number | null;
  maxTotalCountViolations: number;
  dupFloodAlarms: number;
  g3Count: number;
  normalizedCallMismatches: number;
}

function computeAggregate(results: QueryResult[]): Aggregate {
  const valid = results.filter((r) => !r.errored);
  const recallVals = valid
    .filter((r) => r.scoring === 'frozen-recall' && r.recallAt10 != null && !Number.isNaN(r.recallAt10))
    .map((r) => r.recallAt10 as number);
  const precisionVals = valid
    .filter(
      (r) =>
        r.scoring === 'frozen-precision' && r.precisionAt10 != null && !Number.isNaN(r.precisionAt10),
    )
    .map((r) => r.precisionAt10 as number);
  const predicateResults = valid.filter((r) => r.scoring === 'predicate');
  const predicatePassed = predicateResults.filter((r) => r.predicatePass === true).length;
  // corpus MRR = mean per-query RR over ALL frozen queries (recall + precision).
  const rrVals = valid
    .filter((r) => r.scoring === 'frozen-recall' || r.scoring === 'frozen-precision')
    .map((r) => r.rr ?? 0);

  const mean = (xs: number[]): number | null =>
    xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;

  return {
    meanRecall10: mean(recallVals),
    meanPrecision10: mean(precisionVals),
    predicatePassRate: predicateResults.length === 0 ? null : predicatePassed / predicateResults.length,
    predicatePassed,
    predicateTotal: predicateResults.length,
    corpusMrr: mean(rrVals),
    maxTotalCountViolations: valid.filter((r) => r.withinMaxTotalCount === false).length,
    dupFloodAlarms: valid.filter((r) => (r.dupFlood ?? 0) > 0).length,
    g3Count: valid.filter((r) => r.scoring === 'g3-isolation').length,
    // S1.4 GATE-3 drift alarm — counted over ALL results (an errored entry can
    // still carry a frozen normalizedCall whose parser-derived call drifted).
    normalizedCallMismatches: results.filter((r) => r.normalizedCallMismatch === true).length,
  };
}

function buildScorecard(
  target: Target,
  snapshot: QueriesFile['_snapshot'],
  results: QueryResult[],
  agg: Aggregate,
  hadBaseline: boolean,
): string {
  const lines: string[] = [];
  lines.push('<!--');
  lines.push('  GENERATED by scripts/search-eval/run-search-eval.ts (S0 search eval harness).');
  lines.push('  STABLE filename per target (scorecards/<target>.md): each PR re-runs the harness');
  lines.push('  and commits the git-diffable scorecard delta as a required review item.');
  lines.push('  Do not hand-edit — re-run `npm run eval:search` to regenerate.');
  lines.push('-->');
  lines.push(`# Search Eval Scorecard — target: \`${target}\``);
  lines.push('');
  lines.push(`- **Snapshot date:** ${snapshot.date} (gold frozen from DB \`${snapshot.db}\`, ref \`${snapshot.project_ref}\`)`);
  lines.push(`- **Corpus size:** ${snapshot.searchableCorpus} (searchable, retired-excluded)`);
  lines.push(`- **Run note:** normalized queries (S1: parseSearchQuery APPLIED — G2 entries scored on the cleaned search_query + routed filter_grade_levels; expectedNormalizedCall is the call actually made).`);
  lines.push(`- **Baseline for rank-movement:** ${hadBaseline ? 'present (G3 movement computed)' : 'absent (first run — G3 movement = n/a)'}`);
  lines.push('');

  lines.push('## Aggregate quality summary (sentinel EXCLUDED)');
  lines.push('');
  lines.push('| Metric | Value |');
  lines.push('|---|---|');
  lines.push(`| Mean recall@10 (frozen-recall) | ${r3(agg.meanRecall10)} |`);
  lines.push(`| Mean precision@10 (frozen-precision) | ${r3(agg.meanPrecision10)} |`);
  lines.push(`| Predicate pass-rate | ${r3(agg.predicatePassRate)} (${agg.predicatePassed}/${agg.predicateTotal}) |`);
  lines.push(`| Corpus MRR (mean RR over frozen queries) | ${r3(agg.corpusMrr)} |`);
  lines.push(`| maxTotalCount violations | ${agg.maxTotalCountViolations} |`);
  lines.push(`| normalized-call mismatches | ${agg.normalizedCallMismatches} |`);
  lines.push(`| Dup-flood alarms (dupFlood>0) | ${agg.dupFloodAlarms} |`);
  lines.push(`| G3-isolation queries | ${agg.g3Count} |`);
  lines.push('');

  // --- per-family tables ---
  const byScoring = (s: Scoring) => results.filter((r) => r.scoring === s);

  const recallRows = byScoring('frozen-recall');
  if (recallRows.length) {
    lines.push('## frozen-recall');
    lines.push('');
    lines.push('| id | query | total | recall@10 | top1 | RR | dupFlood | uniqContentP@10 | maxCount ok |');
    lines.push('|---|---|---|---|---|---|---|---|---|');
    for (const r of recallRows) {
      lines.push(
        `| ${r.id} | ${r.query} | ${r.totalCount} | ${r3(r.recallAt10)} | ${r.top1 ?? 'n/a'} | ${r3(r.rr)} | ${r.dupFlood ?? 'n/a'} | ${r3(r.uniqueContentPrecision10)} | ${r.withinMaxTotalCount ?? 'n/a'} |`,
      );
    }
    lines.push('');
  }

  const precisionRows = byScoring('frozen-precision');
  if (precisionRows.length) {
    lines.push('## frozen-precision');
    lines.push('');
    lines.push('| id | query | total | precision@10 | top1 | RR | dupFlood | uniqContentP@10 | maxCount ok |');
    lines.push('|---|---|---|---|---|---|---|---|---|');
    for (const r of precisionRows) {
      lines.push(
        `| ${r.id} | ${r.query} | ${r.totalCount} | ${r3(r.precisionAt10)} | ${r.top1 ?? 'n/a'} | ${r3(r.rr)} | ${r.dupFlood ?? 'n/a'} | ${r3(r.uniqueContentPrecision10)} | ${r.withinMaxTotalCount ?? 'n/a'} |`,
      );
    }
    lines.push('');
  }

  const predicateRows = byScoring('predicate');
  if (predicateRows.length) {
    lines.push('## predicate');
    lines.push('');
    lines.push('| id | query | total | satisfied/considered | threshold | pass | maxCount ok |');
    lines.push('|---|---|---|---|---|---|---|');
    for (const r of predicateRows) {
      lines.push(
        `| ${r.id} | ${r.query} | ${r.totalCount} | ${r.predicateSatisfied ?? 'n/a'}/${r.predicateConsidered ?? 'n/a'} | ${r.predicateThreshold ?? 'n/a'} | ${r.predicatePass ?? 'n/a'} | ${r.withinMaxTotalCount ?? 'n/a'} |`,
      );
    }
    lines.push('');
  }

  const g3Rows = byScoring('g3-isolation');
  if (g3Rows.length) {
    lines.push('## g3-isolation');
    lines.push('');
    lines.push('| id | query | total | isoHits@50 | isoHits@10 | firstRank | rankMoveMedian | rankMoveBest | maxCount ok |');
    lines.push('|---|---|---|---|---|---|---|---|---|');
    for (const r of g3Rows) {
      lines.push(
        `| ${r.id} | ${r.query} | ${r.totalCount} | ${r.isolationHits50 ?? 'n/a'} | ${r.isolationHits10 ?? 'n/a'} | ${r.isolationFirstRank ?? 'n/a'} | ${r3(r.rankMovementMedian)} | ${r3(r.rankMovementBest)} | ${r.withinMaxTotalCount ?? 'n/a'} |`,
      );
    }
    lines.push('');
  }

  const controlRows = byScoring('control-maxcount');
  if (controlRows.length) {
    lines.push('## control-maxcount');
    lines.push('');
    lines.push('| id | query | total | overBroad | maxCount ok |');
    lines.push('|---|---|---|---|---|');
    for (const r of controlRows) {
      lines.push(
        `| ${r.id} | ${r.query} | ${r.totalCount} | ${r.overBroad ?? 'n/a'} | ${r.withinMaxTotalCount ?? 'n/a'} |`,
      );
    }
    lines.push('');
  }

  // --- Diagnostics section ---
  lines.push('## Diagnostics (NOT part of the quality aggregate)');
  lines.push('');

  const sentinelRows = byScoring('sentinel');
  if (sentinelRows.length) {
    lines.push('### Sentinel (q22 — stability watchdog)');
    lines.push('');
    lines.push('| id | query | total | jaccard vs snapshot | totalCount delta | alarm |');
    lines.push('|---|---|---|---|---|---|');
    for (const r of sentinelRows) {
      lines.push(
        `| ${r.id} | ${r.query} | ${r.totalCount} | ${r3(r.sentinelJaccard)} | ${r.sentinelTotalCountDelta ?? 'n/a'} | ${r.sentinelAlarm ?? 'n/a'} |`,
      );
    }
    lines.push('');
  }

  const dupFloodRows = results.filter((r) => (r.dupFlood ?? 0) > 0);
  lines.push('### Dup-flood (dupFlood > 0 in top-10)');
  lines.push('');
  if (dupFloodRows.length) {
    lines.push('| id | query | dupFlood | distinctContentInTop10 |');
    lines.push('|---|---|---|---|');
    for (const r of dupFloodRows) {
      lines.push(`| ${r.id} | ${r.query} | ${r.dupFlood} | ${r.distinctContentInTop10 ?? 'n/a'} |`);
    }
  } else {
    lines.push('_None._');
  }
  lines.push('');

  const maxViolations = results.filter((r) => r.withinMaxTotalCount === false);
  lines.push('### maxTotalCount violations');
  lines.push('');
  if (maxViolations.length) {
    lines.push('| id | query | totalCount | maxTotalCount |');
    lines.push('|---|---|---|---|');
    for (const r of maxViolations) {
      lines.push(`| ${r.id} | ${r.query} | ${r.totalCount} | ${r.maxTotalCount} |`);
    }
  } else {
    lines.push('_None._');
  }
  lines.push('');

  // S1.4 GATE-3: surface any drift between the parser-derived call and the frozen
  // fixture call so a reviewer sees exactly what moved. None expected today.
  const fmtCall = (c?: { search_query: string; filter_grade_levels?: string[] }): string => {
    if (!c) return 'n/a';
    const grades = c.filter_grade_levels && c.filter_grade_levels.length > 0
      ? `[${c.filter_grade_levels.join(',')}]`
      : '[]';
    return `q=\`${c.search_query}\` grades=${grades}`;
  };
  const mismatchRows = results.filter((r) => r.normalizedCallMismatch === true);
  lines.push('### normalized-call mismatches (parser drift vs frozen fixture)');
  lines.push('');
  if (mismatchRows.length) {
    lines.push('| id | query | actual (parser) | expected (fixture) |');
    lines.push('|---|---|---|---|');
    for (const r of mismatchRows) {
      lines.push(
        `| ${r.id} | ${r.query} | ${fmtCall(r.actualNormalizedCall)} | ${fmtCall(r.expectedNormalizedCall)} |`,
      );
    }
  } else {
    lines.push('_None._');
  }
  lines.push('');

  const erroredRows = results.filter((r) => r.errored);
  lines.push('### Errored queries');
  lines.push('');
  if (erroredRows.length) {
    lines.push('| id | query | error |');
    lines.push('|---|---|---|');
    for (const r of erroredRows) {
      lines.push(`| ${r.id} | ${r.query} | ${r.errored} |`);
    }
  } else {
    lines.push('_None._');
  }
  lines.push('');

  return lines.join('\n');
}

function buildBaseline(
  target: Target,
  snapshot: QueriesFile['_snapshot'],
  results: QueryResult[],
): BaselineFile {
  const queries: Record<string, Record<string, unknown>> = {};
  for (const r of results) {
    const {
      id,
      query,
      category,
      expectedNormalizedCall,
      actualNormalizedCall,
      normalizedCallMismatch,
      ...metrics
    } = r;
    void query;
    void category;
    void expectedNormalizedCall;
    void actualNormalizedCall;
    void normalizedCallMismatch;
    queries[id] = metrics as Record<string, unknown>;
  }
  return {
    _meta: {
      target,
      snapshotDate: snapshot.date,
      corpusSize: snapshot.searchableCorpus,
      note: 'Captured by run-search-eval.ts --write-baseline (S0.4). Machine-readable per-query metrics for deltas + G3 rank-movement.',
    },
    queries,
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const { writeBaseline, targetOverride } = parseArgs(process.argv.slice(2));
  const target = resolveTarget(targetOverride);
  const { url, anonKey } = resolveCreds(target);

  // HARD: anon-only DB client (defense-in-depth against any *SERVICE* env value).
  assertReadOnly({ key: anonKey, serviceKeysInEnv: collectServiceKeyValues() });

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Load queries.json (resolve relative to this script).
  const queriesPath = join(__dirname, 'queries.json');
  const queriesFile = JSON.parse(readFileSync(queriesPath, 'utf8')) as QueriesFile;
  const { _snapshot: snapshot, queries } = queriesFile;

  // Load baseline.json if present (for G3 rank-movement deltas); absent is fine.
  // When --write-baseline is set we DELIBERATELY ignore any existing baseline so
  // that the captured baseline is deterministic — scoring is never relative to a
  // prior baseline, so a refresh from a checkout that already has the committed
  // baseline produces byte-identical output (the S0.4 reproducibility guarantee).
  const baselinePath = join(__dirname, 'baseline.json');
  let baseline: BaselineFile | null = null;
  if (!writeBaseline && existsSync(baselinePath)) {
    baseline = JSON.parse(readFileSync(baselinePath, 'utf8')) as BaselineFile;
  }

  // Build the q09 membership set (q15 primary ∪ acceptable) from the loaded gold.
  const q15 = queries.find((q) => q.id === 'q15');
  q09Members = new Set([
    ...flattenClusters(q15?.primaryClusters),
    ...flattenClusters(q15?.acceptableClusters),
  ]);

  console.log(`[eval:search] target=${target} url=${url}`);
  console.log(`[eval:search] snapshot date=${snapshot.date} corpus=${snapshot.searchableCorpus} queries=${queries.length}`);
  if (writeBaseline) console.log('[eval:search] --write-baseline ON: will (over)write baseline.json');

  const results: QueryResult[] = [];

  for (const entry of queries) {
    try {
      const call = resolveCall(entry);
      const rpc = await runSearch(supabase, call);

      const topIds = rpc.rows.map((r) => r.lesson_id);
      const fetched = await fetchLessonRows(supabase, topIds);
      if (fetched.error && !rpc.error) {
        results.push({
          id: entry.id,
          query: entry.query,
          scoring: entry.scoring,
          category: entry.category,
          totalCount: rpc.totalCount,
          returned: rpc.rows.length,
          errored: `lessons.select error: ${fetched.error}`,
        });
        continue;
      }

      const hashByid = new Map<string, string>();
      const rowByid = new Map<string, PredicateRow>();
      for (const lr of fetched.rows) {
        if (lr.content_hash) hashByid.set(lr.lesson_id, lr.content_hash);
        rowByid.set(lr.lesson_id, {
          title: lr.title,
          summary: lr.summary,
          main_ingredients: lr.main_ingredients,
          core_competencies: lr.core_competencies,
          cultural_heritage: lr.cultural_heritage,
        });
      }
      const clusterKeyOf = (id: string): string => hashByid.get(id) ?? id;

      const scored = scoreQuery(entry, rpc, rowByid, clusterKeyOf, baseline, snapshot.searchableCorpus);
      // S1.4 GATE-3: assert the parser-derived call still equals the frozen
      // fixture call. Only entries that carry a normalizedCall are checked; a
      // mismatch is a latent ALARM surfaced in the aggregate + scorecard (it
      // never changes resolveCall behavior nor exits non-zero).
      if (entry.normalizedCall) {
        scored.actualNormalizedCall = call;
        scored.normalizedCallMismatch = !callsEqual(call, entry.normalizedCall);
      }
      results.push(scored);
    } catch (err) {
      // Never let one bad query crash the run.
      results.push({
        id: entry.id,
        query: entry.query,
        scoring: entry.scoring,
        category: entry.category,
        totalCount: 0,
        returned: 0,
        errored: `unexpected: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  const agg = computeAggregate(results);
  const hadBaseline = baseline != null;

  // Write the scorecard (stable filename per target).
  const scorecardDir = join(__dirname, 'scorecards');
  mkdirSync(scorecardDir, { recursive: true });
  const scorecardPath = join(scorecardDir, `${target}.md`);
  const scorecard = buildScorecard(target, snapshot, results, agg, hadBaseline);
  writeFileSync(scorecardPath, scorecard, 'utf8');

  // Optionally write the baseline (ONLY on --write-baseline; S0.3 does NOT).
  if (writeBaseline) {
    const baselineFile = buildBaseline(target, snapshot, results);
    writeFileSync(baselinePath, JSON.stringify(baselineFile, null, 2) + '\n', 'utf8');
  }

  // Print the aggregate summary to stdout.
  const erroredCount = results.filter((r) => r.errored).length;
  console.log('');
  console.log('===== AGGREGATE QUALITY SUMMARY (sentinel excluded) =====');
  console.log(`mean recall@10 (frozen-recall):        ${r3(agg.meanRecall10)}`);
  console.log(`mean precision@10 (frozen-precision):  ${r3(agg.meanPrecision10)}`);
  console.log(`predicate pass-rate:                   ${r3(agg.predicatePassRate)} (${agg.predicatePassed}/${agg.predicateTotal})`);
  console.log(`corpus MRR (mean RR over frozen):      ${r3(agg.corpusMrr)}`);
  console.log(`maxTotalCount violations:              ${agg.maxTotalCountViolations}`);
  console.log(`normalized-call mismatches:            ${agg.normalizedCallMismatches}`);
  console.log(`dup-flood alarms (dupFlood>0):         ${agg.dupFloodAlarms}`);
  console.log(`G3-isolation queries:                  ${agg.g3Count}`);
  const sentinel = results.find((r) => r.scoring === 'sentinel');
  if (sentinel) {
    console.log(
      `sentinel q22 (DIAGNOSTIC): jaccard=${r3(sentinel.sentinelJaccard)} totalCountDelta=${sentinel.sentinelTotalCountDelta ?? 'n/a'} alarm=${sentinel.sentinelAlarm}`,
    );
  }
  console.log('=========================================================');
  console.log(`scorecard written: ${scorecardPath}`);
  if (writeBaseline) console.log(`baseline written:  ${baselinePath}`);
  console.log(`${erroredCount} errored / ${results.length} total`);
}

main().catch((err) => {
  console.error('[eval:search] fatal:', err);
  process.exit(1);
});
