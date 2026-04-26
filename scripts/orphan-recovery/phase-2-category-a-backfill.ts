#!/usr/bin/env npx tsx
/**
 * Phase 2 — Category A FK backfill (lesson submission Tier-1 recovery).
 *
 * Audit-only: populates lessons.original_submission_id for approved submissions
 * whose Google Doc already lives in the library. Only the FK column changes;
 * content, embeddings, search vectors are untouched. Idempotent via
 * `WHERE original_submission_id IS NULL`.
 *
 * Plan-only mode: reads PROD via Supabase JS (service-role + --i-mean-prod),
 * emits an artifact JSON, a snapshot file, and two SQL files (rehearsal and
 * commit) that differ in exactly one line — the final `ROLLBACK;` vs
 * `COMMIT;` terminator. Both are produced by the same buildSql() call with
 * identical inputs. Execute via the mcp__supabase-remote__execute_sql tool.
 *
 * Hold-out rules (orphans excluded from the auto-batch, kept for manual review):
 *   - Multi-match: submission's google_doc_id matches >1 lessons rows
 *   - Broken lesson row: title='Unknown' or summary starts with 'Error '
 *
 * Recovery-script contract: see ~/.claude/plans/lesson-submission-tier1-implementation.md §11.
 */

import { createClient } from '@supabase/supabase-js';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
// @ts-ignore — .mjs helper, not part of the TS project
import { requireNonProd, describeSupabaseTarget } from '../lib/require-env.mjs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables:');
  console.error(`  VITE_SUPABASE_URL: ${supabaseUrl ? 'set' : 'unset'}`);
  console.error(`  SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? 'set' : 'unset'}`);
  process.exit(1);
}

requireNonProd({ scriptName: 'phase-2-category-a-backfill' });

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

interface OrphanRow {
  submission_id: string;
  google_doc_id: string;
  extracted_title: string | null;
  submission_type: string | null;
}

interface MatchedRow {
  submission_id: string;
  sub_title: string | null;
  lesson_id: string;
  lesson_title: string | null;
  lesson_summary: string | null;
}

interface SelectedRow {
  submission_id: string;
  target_lesson_id: string;
  sub_title: string | null;
  lesson_title: string | null;
  before: { original_submission_id: null };
  after: { original_submission_id: string };
  preflight_passed: boolean;
  snapshot_path: string;
}

interface SkippedRow {
  submission_id: string;
  sub_title: string | null;
  reason: 'multi_match' | 'broken_lesson_row' | 'no_doc_id_match';
  detail: string;
}

interface Artifact {
  phase: 'phase-2-category-a';
  generated_at: string;
  git_sha: string;
  target: { kind: string; url: string };
  selected_rows: SelectedRow[];
  skipped_rows: SkippedRow[];
  summary: {
    total_orphans: number;
    doc_id_matched: number;
    selected: number;
    skipped: number;
    skipped_reasons: Record<string, number>;
  };
  artifact_hash?: string;
}

const generatedAt = new Date();
const ts = generatedAt.toISOString().replace(/[:.]/g, '-');
const outDir = path.join(__dirname, 'dryrun-artifacts');
const snapshotDir = path.join(__dirname, 'snapshots');
const repoRoot = path.resolve(__dirname, '..', '..');

for (const dir of [outDir, snapshotDir]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const artifactPath = path.join(outDir, `phase-2-category-a-${ts}.json`);
const rehearsalPath = path.join(outDir, `phase-2-category-a-${ts}-rehearsal.sql`);
const commitPath = path.join(outDir, `phase-2-category-a-${ts}-commit.sql`);
const snapshotPath = path.join(snapshotDir, `category-a-pre-${ts}.json`);

const snapshotPathRel = path.relative(repoRoot, snapshotPath);

function gitSha(): string {
  try {
    return execSync('git rev-parse HEAD', { cwd: repoRoot }).toString().trim();
  } catch {
    return 'unknown';
  }
}

function isBrokenLessonRow(lesson_title: string | null, summary: string | null): boolean {
  if (!lesson_title || lesson_title.trim() === '') return true;
  if (lesson_title.toLowerCase() === 'unknown') return true;
  if (summary && /^error\s+processing/i.test(summary.trim())) return true;
  return false;
}

async function fetchOrphans(): Promise<OrphanRow[]> {
  const { data: subs, error: subsErr } = await supabase
    .from('lesson_submissions')
    .select('id, google_doc_id, extracted_title, submission_type, status')
    .eq('status', 'approved');
  if (subsErr) throw subsErr;
  const { data: lessonsLink, error: linkErr } = await supabase
    .from('lessons')
    .select('original_submission_id')
    .not('original_submission_id', 'is', null);
  if (linkErr) throw linkErr;
  const linkedIds = new Set((lessonsLink ?? []).map((r) => r.original_submission_id));
  return (subs ?? [])
    .filter((s) => !linkedIds.has(s.id))
    .map((s) => ({
      submission_id: s.id,
      google_doc_id: s.google_doc_id,
      extracted_title: s.extracted_title,
      submission_type: s.submission_type,
    }));
}

async function fetchMatchesForOrphan(orphan: OrphanRow): Promise<MatchedRow[]> {
  if (!orphan.google_doc_id) return [];
  const { data, error } = await supabase
    .from('lessons')
    .select('lesson_id, title, summary, file_link')
    .like('file_link', `%${orphan.google_doc_id}%`);
  if (error) throw error;
  return (data ?? []).map((l) => ({
    submission_id: orphan.submission_id,
    sub_title: orphan.extracted_title,
    lesson_id: l.lesson_id,
    lesson_title: l.title,
    lesson_summary: l.summary,
  }));
}

async function fetchFullLessonsRows(lessonIds: string[]): Promise<Record<string, unknown>[]> {
  if (lessonIds.length === 0) return [];
  const { data, error } = await supabase.from('lessons').select('*').in('lesson_id', lessonIds);
  if (error) throw error;
  return data ?? [];
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function sqlIdentEscape(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

function buildSql(
  selectedRows: SelectedRow[],
  terminator: 'ROLLBACK' | 'COMMIT',
  totalOrphansAtPlanTime: number
): string {
  const valuesLines = selectedRows
    .map((r) => `    (${sqlIdentEscape(r.target_lesson_id)}, ${sqlIdentEscape(r.submission_id)}::uuid)`)
    .join(',\n');
  const lessonIdArray = selectedRows.map((r) => sqlIdentEscape(r.target_lesson_id)).join(', ');
  // Static header — every line in the body is identical between rehearsal and
  // commit; only the final `${terminator};` line differs. A diff between the
  // two files should show one changed line.
  const header = `-- Phase 2 — Category A FK backfill
-- Generated by scripts/orphan-recovery/phase-2-category-a-backfill.ts
-- Selected rows: ${selectedRows.length}
-- Total orphans at plan time: ${totalOrphansAtPlanTime}
--   (the verification SELECT below uses this baseline; if the live orphan
--    count differs from what's expected, new approved submissions arrived
--    between plan-mode and apply-mode — pause and re-plan rather than commit.)
-- Idempotency: WHERE original_submission_id IS NULL ensures re-run is a no-op.
-- Audit-only: only lessons.original_submission_id is touched.
`;
  return `${header}
BEGIN;

WITH applied AS (
  UPDATE lessons l
     SET original_submission_id = m.submission_id
    FROM (VALUES
${valuesLines}
    ) AS m(lesson_id, submission_id)
   WHERE l.lesson_id = m.lesson_id
     AND l.original_submission_id IS NULL
  RETURNING l.lesson_id, l.original_submission_id
)
SELECT
  (SELECT count(*) FROM applied)::int AS rows_updated,
  (SELECT count(*) FROM lesson_submissions s
     LEFT JOIN lessons ll ON ll.original_submission_id = s.id
     WHERE s.status = 'approved' AND ll.lesson_id IS NULL)::int AS orphans_remaining_in_txn,
  (SELECT count(*) FROM lessons
     WHERE lesson_id IN (${lessonIdArray})
       AND original_submission_id IS NOT NULL)::int AS auto_batch_now_set,
  ${selectedRows.length}::int AS expected_rows_updated,
  (${totalOrphansAtPlanTime} - ${selectedRows.length})::int AS expected_orphans_remaining_in_txn;

${terminator};
`;
}

async function main() {
  const target = describeSupabaseTarget();
  console.log(`Phase 2 — Category A FK backfill (plan mode) against ${target.target}`);

  const orphans = await fetchOrphans();
  console.log(`  Total approved orphans: ${orphans.length}`);

  // Group lessons-row matches by submission_id.
  const matchesBySub = new Map<string, MatchedRow[]>();
  for (const o of orphans) {
    const matches = await fetchMatchesForOrphan(o);
    if (matches.length > 0) matchesBySub.set(o.submission_id, matches);
  }

  const docIdMatchedCount = matchesBySub.size;
  console.log(`  Doc-id-matched orphans: ${docIdMatchedCount}`);

  const selected: SelectedRow[] = [];
  const skipped: SkippedRow[] = [];

  for (const orphan of orphans) {
    const matches = matchesBySub.get(orphan.submission_id);
    if (!matches || matches.length === 0) {
      skipped.push({
        submission_id: orphan.submission_id,
        sub_title: orphan.extracted_title,
        reason: 'no_doc_id_match',
        detail: 'submission google_doc_id not present in any lessons.file_link',
      });
      continue;
    }
    if (matches.length > 1) {
      skipped.push({
        submission_id: orphan.submission_id,
        sub_title: orphan.extracted_title,
        reason: 'multi_match',
        detail: `submission's doc-id matches ${matches.length} lessons rows: ${matches
          .map((m) => m.lesson_id)
          .join(', ')}`,
      });
      continue;
    }
    const m = matches[0];
    if (isBrokenLessonRow(m.lesson_title, m.lesson_summary)) {
      skipped.push({
        submission_id: orphan.submission_id,
        sub_title: orphan.extracted_title,
        reason: 'broken_lesson_row',
        detail: `lesson_id=${m.lesson_id} has broken metadata (title=${JSON.stringify(
          m.lesson_title
        )}, summary starts with ${JSON.stringify((m.lesson_summary || '').slice(0, 30))})`,
      });
      continue;
    }
    selected.push({
      submission_id: orphan.submission_id,
      target_lesson_id: m.lesson_id,
      sub_title: orphan.extracted_title,
      lesson_title: m.lesson_title,
      before: { original_submission_id: null },
      after: { original_submission_id: orphan.submission_id },
      preflight_passed: true,
      snapshot_path: snapshotPathRel,
    });
  }

  console.log(`  Selected (auto-batch): ${selected.length}`);
  console.log(`  Skipped: ${skipped.length}`);
  for (const s of skipped) {
    console.log(`    - [${s.reason}] ${s.sub_title ?? '(no title)'} — ${s.detail}`);
  }

  // Sanity check: no two orphans should target the same lessons row. Each
  // orphan was already classified `multi_match` (and held out) if its doc-id
  // resolved to >1 lessons rows; the converse — two orphans pointing at the
  // same single lesson — would mean two submissions are claiming the same
  // library entry. The IS NULL guard would still keep the DB safe (only the
  // first UPDATE wins), but the artifact's selected_rows would have a
  // contradiction. Detect explicitly so the operator gets a clear message.
  const targetCounts = new Map<string, string[]>();
  for (const row of selected) {
    const list = targetCounts.get(row.target_lesson_id) ?? [];
    list.push(row.submission_id);
    targetCounts.set(row.target_lesson_id, list);
  }
  const collisions = [...targetCounts.entries()].filter(([, subs]) => subs.length > 1);
  if (collisions.length > 0) {
    console.error('Duplicate target_lesson_id detected — two or more orphans claim the same library row:');
    for (const [lessonId, subs] of collisions) {
      console.error(`  lesson_id=${lessonId} <- submission_ids=[${subs.join(', ')}]`);
    }
    console.error('Resolve manually before re-running plan-mode.');
    process.exit(1);
  }

  // Fetch full lesson rows for the auto-batch and run preflight before any
  // file is written. Preflight failures should not leave a snapshot file on
  // disk — the artifact/SQL files don't get written either, and a stranded
  // snapshot would just be cruft.
  const fullLessons = await fetchFullLessonsRows(selected.map((r) => r.target_lesson_id));

  if (fullLessons.length !== selected.length) {
    console.error(`Pre-flight failed: fetched ${fullLessons.length} lessons rows but selected ${selected.length}. Some target_lesson_ids do not resolve.`);
    process.exit(1);
  }
  for (const lesson of fullLessons) {
    if ((lesson as { original_submission_id?: string | null }).original_submission_id != null) {
      console.error(
        `Pre-flight failed: lesson_id=${(lesson as { lesson_id: string }).lesson_id} already has original_submission_id set. Aborting.`
      );
      process.exit(1);
    }
  }

  // Preflight passed; safe to persist the snapshot.
  fs.writeFileSync(snapshotPath, JSON.stringify({
    generated_at: generatedAt.toISOString(),
    target: target.target,
    rows: fullLessons,
  }, null, 2));
  console.log(`  Snapshot written: ${path.relative(process.cwd(), snapshotPath)} (${fullLessons.length} rows)`);

  const skippedReasons = skipped.reduce<Record<string, number>>((acc, s) => {
    acc[s.reason] = (acc[s.reason] ?? 0) + 1;
    return acc;
  }, {});

  const artifactWithoutHash: Omit<Artifact, 'artifact_hash'> = {
    phase: 'phase-2-category-a',
    generated_at: generatedAt.toISOString(),
    git_sha: gitSha(),
    target,
    selected_rows: selected,
    skipped_rows: skipped,
    summary: {
      total_orphans: orphans.length,
      doc_id_matched: docIdMatchedCount,
      selected: selected.length,
      skipped: skipped.length,
      skipped_reasons: skippedReasons,
    },
  };

  const artifact: Artifact = {
    ...artifactWithoutHash,
    artifact_hash: sha256(canonicalJson(artifactWithoutHash)),
  };

  fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
  console.log(`  Artifact: ${path.relative(process.cwd(), artifactPath)}`);

  fs.writeFileSync(rehearsalPath, buildSql(selected, 'ROLLBACK', orphans.length));
  fs.writeFileSync(commitPath, buildSql(selected, 'COMMIT', orphans.length));
  console.log(`  Rehearsal SQL: ${path.relative(process.cwd(), rehearsalPath)}`);
  console.log(`  Commit SQL:    ${path.relative(process.cwd(), commitPath)}`);

  console.log('');
  console.log('Next steps:');
  console.log('  1. Review the artifact and the rehearsal.sql file.');
  console.log('  2. Run the rehearsal SQL via mcp__supabase-remote__execute_sql.');
  console.log('     Expect rows_updated and auto_batch_now_set to equal expected_rows_updated;');
  console.log('     orphans_remaining_in_txn to equal expected_orphans_remaining_in_txn.');
  console.log('  3. If the rehearsal verifies, run the commit SQL via the same MCP tool.');
  console.log('  4. Run a post-commit verification query independently.');
}

main().catch((err) => {
  console.error('phase-2-category-a-backfill failed:', err);
  process.exit(1);
});
