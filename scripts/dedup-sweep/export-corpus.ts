/**
 * T4 dedup sweep — live PROD corpus export (READ-ONLY).
 *
 * Exports every live lesson (`lessons WHERE retired_at IS NULL`) from the
 * PRODUCTION database to `scripts/dedup-sweep/artifacts/corpus.json` (one JSON
 * array of records). This file is the local input for `generate-candidates.ts`
 * and the deck fan-out; it is gitignored (holds full lesson bodies), like the
 * stage2-retag corpus export it is modelled on.
 *
 * READ-ONLY BY CONSTRUCTION: the only database verb is `.select()` (plus the
 * `.is()/.order()/.range()` read filters). The script constructs no
 * insert/update/upsert/delete/rpc call and authenticates with the project's
 * PUBLISHABLE anon key — it holds no credential capable of bypassing RLS. A
 * row-count assertion against the live MCP census runs before any file write.
 *
 * Credentials (env vars — never hardcode or commit key values):
 *   DEDUP_SWEEP_SUPABASE_URL       PROD project URL
 *                                  (https://jxlxtzkmicfhchkhiojz.supabase.co)
 *   DEDUP_SWEEP_SUPABASE_ANON_KEY  the project's publishable anon key
 *                                  (mcp__supabase-remote__get_publishable_keys)
 *
 * Usage:
 *   DEDUP_SWEEP_SUPABASE_URL=... DEDUP_SWEEP_SUPABASE_ANON_KEY=... \
 *     npx tsx scripts/dedup-sweep/export-corpus.ts
 */
/* eslint-disable no-console -- CLI script: console output is the operator UI */
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS_DIR = path.join(MODULE_DIR, 'artifacts');
const OUTPUT_PATH = path.join(ARTIFACTS_DIR, 'corpus.json');

/**
 * MCP census, PROD 2026-07-02 (mcp__supabase-remote__execute_sql):
 *   SELECT count(*) FROM lessons WHERE retired_at IS NULL;  -- 764
 * The brief pre-registers 764 (785 total − 21 retired). The export hard-fails
 * if the fetched count drifts by more than ±ROW_COUNT_TOLERANCE.
 */
export const EXPECTED_LIVE_ROWS = 764;
const ROW_COUNT_TOLERANCE = 5;

/**
 * The 14 facet array (`text[]`) columns carried per lesson. Used for the
 * candidate metadata-overlap rule (main_ingredients + thematic_categories) and
 * the per-side populated-facet-count signal. `grade_levels` is exported
 * separately (a grade band, not a facet); the vestigial `tags` column and the
 * `season_timing_backup` mirror column are intentionally excluded.
 */
export const FACET_ARRAY_COLUMNS = [
  'activity_type',
  'location_requirements',
  'thematic_categories',
  'season_timing',
  'core_competencies',
  'cultural_heritage',
  'academic_integration',
  'social_emotional_learning',
  'cooking_methods',
  'main_ingredients',
  'garden_skills',
  'cooking_skills',
  'observances_holidays',
  'cultural_responsiveness_features',
] as const;

const SELECT_LIST = [
  'lesson_id',
  'title',
  'summary',
  'content_text',
  'content_hash',
  'created_at',
  'updated_at',
  'original_submission_id',
  'file_link',
  'grade_levels',
  ...FACET_ARRAY_COLUMNS,
].join(', ');

const stringArrayOrNull = z.array(z.string()).nullable();
const rowShape: Record<string, z.ZodTypeAny> = {
  lesson_id: z.string().min(1),
  title: z.string(),
  summary: z.string().nullable(),
  content_text: z.string(),
  content_hash: z.string().nullable(),
  created_at: z.string().nullable(),
  updated_at: z.string().nullable(),
  original_submission_id: z.string().nullable(),
  file_link: z.string().nullable(),
  grade_levels: stringArrayOrNull,
};
for (const col of FACET_ARRAY_COLUMNS) {
  rowShape[col] = stringArrayOrNull;
}
const rowSchema = z.object(rowShape);
type LessonRow = z.infer<typeof rowSchema>;

/** One exported corpus record = the fetched row + a precomputed body length. */
export interface CorpusRecord extends LessonRow {
  content_length: number;
}

export function buildCorpusRecord(row: LessonRow): CorpusRecord {
  return { ...row, content_length: row.content_text.length };
}

const PAGE_SIZE = 200;

interface ReadOnlyLessonsSource {
  fetchLiveLessonsPage(from: number, to: number): Promise<LessonRow[]>;
}

function createReadOnlyLessonsSource(url: string, anonKey: string): ReadOnlyLessonsSource {
  const client = createClient(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return {
    async fetchLiveLessonsPage(from: number, to: number): Promise<LessonRow[]> {
      const { data, error } = await client
        .from('lessons')
        .select(SELECT_LIST)
        .is('retired_at', null)
        .order('lesson_id', { ascending: true })
        .range(from, to);
      if (error) {
        throw new Error(`lessons select failed (rows ${from}-${to}): ${error.message}`);
      }
      return z.array(rowSchema).parse(data);
    },
  };
}

async function main(): Promise<void> {
  const url = process.env.DEDUP_SWEEP_SUPABASE_URL;
  const anonKey = process.env.DEDUP_SWEEP_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error('❌ Missing environment variables');
    console.error(
      'Required: DEDUP_SWEEP_SUPABASE_URL, DEDUP_SWEEP_SUPABASE_ANON_KEY (publishable anon key)'
    );
    process.exit(1);
  }

  const source = createReadOnlyLessonsSource(url, anonKey);
  console.log(`🔄 Exporting live corpus from ${url} (read-only, anon key)...`);

  const rows: LessonRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const page = await source.fetchLiveLessonsPage(from, from + PAGE_SIZE - 1);
    rows.push(...page);
    console.log(`   fetched ${rows.length} rows...`);
    if (page.length < PAGE_SIZE) break;
  }

  // Row-count assertion against the MCP census — BEFORE any file is written.
  const drift = Math.abs(rows.length - EXPECTED_LIVE_ROWS);
  if (drift > ROW_COUNT_TOLERANCE) {
    throw new Error(
      `live-row count drift: fetched ${rows.length}, census says ${EXPECTED_LIVE_ROWS} ` +
        `(±${ROW_COUNT_TOLERANCE}) — RLS may be hiding rows or the corpus changed; STOP and report`
    );
  }
  if (rows.length !== EXPECTED_LIVE_ROWS) {
    console.warn(
      `⚠️  fetched ${rows.length} rows, census says ${EXPECTED_LIVE_ROWS} (within ±${ROW_COUNT_TOLERANCE})`
    );
  }

  // content_text sanity: the brief STOPs if >5 live lessons have NULL/empty bodies.
  const emptyBodies = rows.filter((r) => r.content_text.trim().length === 0);
  if (emptyBodies.length > 5) {
    throw new Error(
      `${emptyBodies.length} live lessons have empty content_text (> 5) — STOP and report: ` +
        emptyBodies
          .slice(0, 10)
          .map((r) => r.lesson_id)
          .join(', ')
    );
  }
  if (emptyBodies.length > 0) {
    console.warn(`⚠️  ${emptyBodies.length} live lessons have empty content_text (≤ 5, allowed)`);
  }

  const records = rows.map(buildCorpusRecord);
  mkdirSync(ARTIFACTS_DIR, { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(records, null, 0)}\n`, 'utf8');

  console.log(`✅ Wrote ${records.length} records to ${OUTPUT_PATH}`);
}

const isDirectInvocation =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectInvocation) {
  main().catch((error: unknown) => {
    console.error('❌ Export failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
