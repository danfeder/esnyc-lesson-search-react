#!/usr/bin/env npx tsx
/**
 * Phase 5 — Category B-new publish (lesson submission Tier-1 recovery).
 *
 * Publishes 5 approved orphan submissions whose Google Doc is NOT already in
 * the library and whose extracted content has no plausible duplicate among
 * existing lessons (cosine sim < 0.85 against full library). All 5 already
 * have `submission_reviews` rows with populated `tagged_metadata`
 * (decision='approve_new', canonical_lesson_id=NULL); recovery only writes
 * the missing `lessons` INSERT — no second review row, no email side effect,
 * no auth/embedding/email orchestration of `complete-review`.
 *
 * Plan-only mode: reads PROD via Supabase JS (service-role + --i-mean-prod),
 * emits an artifact JSON, a snapshot file, and two SQL files (rehearsal and
 * commit) that differ in exactly one line — the final `ROLLBACK;` vs
 * `COMMIT;` terminator. Both are produced by the same buildSql() call with
 * identical inputs. The migration file shipped with this script
 * (supabase/migrations/20260429000000_phase_5_b_new_publish.sql) is the
 * canonical write path; the SQL artifacts here exist for local rehearsal
 * and as the audit record for which 5 rows + which projection.
 *
 * Selection contract (verified live against PROD on the day this script was
 * added — see the project anchor for the verification queries):
 *   - status = 'approved' AND no lessons row links via original_submission_id
 *   - submission_type = 'new' (all 30 orphans are; not a filter, just a fact)
 *   - exactly 1 submission_reviews row, decision='approve_new'
 *   - tagged_metadata IS NOT NULL (React-state shape: themes/season/location/...)
 *   - content_embedding IS NOT NULL (mandatory preflight; NULL → hard-stop)
 *   - extracted_content non-empty
 *   - google_doc_id not present in any lessons.file_link
 *   - top cosine similarity to any library lesson < 0.85
 *
 * Smallest-first order (by extracted_content length, ascending) for the
 * Option C migration shape: each row's INSERT is a separate statement
 * inside the transaction so a failure on row N rolls back rows 1..N-1
 * cleanly and the manual surgical-revert path stays one-row-at-a-time.
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

requireNonProd({ scriptName: 'phase-5-b-new-publish' });

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Frozen list of submission_ids — verified Phase 5 candidates as of
// 2026-04-27. Order is content_length ascending (smallest blast radius
// first). Re-verify against live data before authoring the migration.
const PHASE_5_B_NEW_SUBMISSION_IDS = [
  '4e4f3ae3-4c51-4439-87ee-f20d2ec94921', // Bees                             (4277 chars)
  '4c2bacdb-7018-4ff2-badb-3701c8c974c0', // Food Justice Advocates           (4504 chars)
  '0369743c-8b6c-4037-a90e-790c2cbcef52', // All About Lanternflies lesson    (4738 chars)
  'ae8f00b4-a4ea-4601-85f3-9b720d0ced89', // NEW Place Based: Native Plants   (5328 chars)
  'dd2c3e79-6dbb-4863-b60b-6c37a1fcc2f7', // Puppet Pollinators               (5794 chars)
];

interface SubmissionRow {
  id: string;
  google_doc_id: string;
  google_doc_url: string;
  extracted_title: string | null;
  extracted_content: string;
  content_hash: string;
  content_embedding: unknown;
  status: string;
  submission_type: string;
}

interface ReviewRow {
  id: string;
  submission_id: string;
  reviewer_id: string;
  decision: string;
  canonical_lesson_id: string | null;
  tagged_metadata: Record<string, unknown>;
  notes: string | null;
}

interface SelectedRow {
  submission_id: string;
  extracted_title: string;
  content_length: number;
  has_embedding: boolean;
  review_id: string;
  decision: string;
  metadata_keys_present: string[];
}

interface Artifact {
  phase: 'phase-5-b-new';
  generated_at: string;
  git_sha: string;
  target: { target: string; url: string };
  selected_rows: SelectedRow[];
  preflight: {
    embedding_check_passed: boolean;
    doc_id_collision_check_passed: boolean;
    not_already_published_check_passed: boolean;
    review_present_check_passed: boolean;
  };
  summary: {
    total_candidates: number;
    selected: number;
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

const artifactPath = path.join(outDir, `phase-5-b-new-${ts}.json`);
const rehearsalPath = path.join(outDir, `phase-5-b-new-${ts}-rehearsal.sql`);
const commitPath = path.join(outDir, `phase-5-b-new-${ts}-commit.sql`);
const snapshotPath = path.join(snapshotDir, `category-b-new-pre-${ts}.json`);

function gitSha(): string {
  try {
    return execSync('git rev-parse HEAD', { cwd: repoRoot }).toString().trim();
  } catch {
    return 'unknown';
  }
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJson(obj[k])}`).join(',')}}`;
}

function sqlLit(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

async function fetchSubmission(id: string): Promise<SubmissionRow> {
  const { data, error } = await supabase
    .from('lesson_submissions')
    .select('id, google_doc_id, google_doc_url, extracted_title, extracted_content, content_hash, content_embedding, status, submission_type')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data as SubmissionRow;
}

async function fetchReview(submissionId: string): Promise<ReviewRow> {
  const { data, error } = await supabase
    .from('submission_reviews')
    .select('id, submission_id, reviewer_id, decision, canonical_lesson_id, tagged_metadata, notes')
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();
  if (error) throw error;
  return data as ReviewRow;
}

async function fetchAlreadyPublishedCount(submissionId: string): Promise<number> {
  const { count, error } = await supabase
    .from('lessons')
    .select('lesson_id', { count: 'exact', head: true })
    .eq('original_submission_id', submissionId);
  if (error) throw error;
  return count ?? 0;
}

async function fetchDocIdCollisionLessons(googleDocId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('lessons')
    .select('lesson_id')
    .like('file_link', `%${googleDocId}%`);
  if (error) throw error;
  return (data ?? []).map((r) => r.lesson_id);
}

/**
 * SQL projection of the React-state-shape `tagged_metadata` to:
 *   (a) the legacy `lessons.metadata` JSONB shape (thematicCategories /
 *       seasonTiming / locationRequirements:[...] / lessonFormat:[...] / etc.)
 *   (b) the typed array columns (text[]) and the lone activity_type / lesson_format
 *       text scalars on lessons.
 *
 * Logic mirrors `complete_review_atomic`'s approve_new branch (see migration
 * 20260428000007_phase_4_fix_metadata_shape.sql) line-for-line. We INSERT
 * inline here rather than calling the RPC because (1) the RPC's status guard
 * (added in 000008) would refuse to run on already-approved submissions
 * (ERRCODE 55000), and (2) routing through the RPC would UPSERT a second
 * submission_reviews row with `review_completed_at = now()`, overwriting
 * the historical reviewer's timestamp.
 */
function buildLessonInsertStatement(sub: SubmissionRow, review: ReviewRow, ordinalLabel: string): string {
  const subId = sqlLit(sub.id);
  const docUrl = sqlLit(sub.google_doc_url);
  const reviewMetaLit = sqlLit(JSON.stringify(review.tagged_metadata ?? {}));
  const titleHint = sqlLit(sub.extracted_title ?? '');

  return `-- ${ordinalLabel}: submission_id ${sub.id} — ${(sub.extracted_title ?? '(no title)').replace(/\n/g, ' ')}
WITH src AS (
  SELECT s.id                AS submission_id,
         s.extracted_title   AS extracted_title,
         s.extracted_content AS extracted_content,
         s.content_hash      AS content_hash,
         s.content_embedding AS content_embedding,
         s.google_doc_url    AS google_doc_url,
         sr.tagged_metadata  AS v_meta,
         jsonb_build_object(
           'thematicCategories',             COALESCE(sr.tagged_metadata->'themes', '[]'::jsonb),
           'seasonTiming',                   COALESCE(sr.tagged_metadata->'season', '[]'::jsonb),
           'coreCompetencies',               COALESCE(sr.tagged_metadata->'coreCompetencies', '[]'::jsonb),
           'culturalHeritage',               COALESCE(sr.tagged_metadata->'culturalHeritage', '[]'::jsonb),
           'locationRequirements',
             CASE WHEN sr.tagged_metadata ? 'location'
                       AND COALESCE(sr.tagged_metadata->>'location', '') <> ''
                  THEN jsonb_build_array(sr.tagged_metadata->>'location')
                  ELSE '[]'::jsonb END,
           'lessonFormat',
             CASE WHEN sr.tagged_metadata ? 'lessonFormat'
                       AND COALESCE(sr.tagged_metadata->>'lessonFormat', '') <> ''
                  THEN jsonb_build_array(sr.tagged_metadata->>'lessonFormat')
                  ELSE '[]'::jsonb END,
           'academicIntegration',            COALESCE(sr.tagged_metadata->'academicIntegration', '[]'::jsonb),
           'socialEmotionalLearning',        COALESCE(sr.tagged_metadata->'socialEmotionalLearning', '[]'::jsonb),
           'cookingMethods',                 COALESCE(sr.tagged_metadata->'cookingMethods', '[]'::jsonb),
           'mainIngredients',                COALESCE(sr.tagged_metadata->'mainIngredients', '[]'::jsonb),
           'gardenSkills',                   COALESCE(sr.tagged_metadata->'gardenSkills', '[]'::jsonb),
           'cookingSkills',                  COALESCE(sr.tagged_metadata->'cookingSkills', '[]'::jsonb),
           'observancesHolidays',            COALESCE(sr.tagged_metadata->'observancesHolidays', '[]'::jsonb),
           'culturalResponsivenessFeatures', COALESCE(sr.tagged_metadata->'culturalResponsivenessFeatures', '[]'::jsonb)
         ) AS v_legacy_meta
  FROM lesson_submissions s
  JOIN submission_reviews sr ON sr.submission_id = s.id
  WHERE s.id = ${subId}::uuid
    AND s.status = 'approved'
    AND sr.decision = 'approve_new'
    AND s.content_embedding IS NOT NULL
)
INSERT INTO lessons (
  lesson_id, title, summary, file_link,
  grade_levels, activity_type, thematic_categories, season_timing,
  core_competencies, cultural_heritage, location_requirements, lesson_format,
  academic_integration, social_emotional_learning, cooking_methods,
  main_ingredients, garden_skills, cooking_skills, observances_holidays,
  cultural_responsiveness_features,
  metadata, content_text, content_hash, content_embedding,
  original_submission_id, processing_notes, created_at, updated_at
)
SELECT
  'lesson_' || replace(gen_random_uuid()::text, '-', ''),
  COALESCE(NULLIF(src.extracted_title, ''), NULLIF(src.v_meta->>'title', ''), 'Untitled Lesson'),
  COALESCE(src.v_meta->>'summary', ''),
  src.google_doc_url,
  public._phase4_jsonb_text_array(src.v_meta->'gradeLevels'),
  CASE WHEN src.v_meta ? 'activityType' AND COALESCE(src.v_meta->>'activityType', '') <> ''
       THEN ARRAY[src.v_meta->>'activityType']
       ELSE ARRAY[]::text[] END,
  public._phase4_jsonb_text_array(src.v_meta->'themes'),
  public._phase4_jsonb_text_array(src.v_meta->'season'),
  public._phase4_jsonb_text_array(src.v_meta->'coreCompetencies'),
  public._phase4_jsonb_text_array(src.v_meta->'culturalHeritage'),
  CASE WHEN src.v_meta ? 'location' AND COALESCE(src.v_meta->>'location', '') <> ''
       THEN ARRAY[src.v_meta->>'location']
       ELSE ARRAY[]::text[] END,
  NULLIF(src.v_meta->>'lessonFormat', ''),
  public._phase4_jsonb_text_array(src.v_meta->'academicIntegration'),
  public._phase4_jsonb_text_array(src.v_meta->'socialEmotionalLearning'),
  public._phase4_jsonb_text_array(src.v_meta->'cookingMethods'),
  public._phase4_jsonb_text_array(src.v_meta->'mainIngredients'),
  public._phase4_jsonb_text_array(src.v_meta->'gardenSkills'),
  public._phase4_jsonb_text_array(src.v_meta->'cookingSkills'),
  public._phase4_jsonb_text_array(src.v_meta->'observancesHolidays'),
  public._phase4_jsonb_text_array(src.v_meta->'culturalResponsivenessFeatures'),
  src.v_legacy_meta,
  COALESCE(src.extracted_content, ''),
  src.content_hash,
  src.content_embedding,
  src.submission_id,
  COALESCE(src.v_meta->>'processingNotes', ''),
  now(),
  now()
FROM src
WHERE NOT EXISTS (
  SELECT 1 FROM lessons WHERE original_submission_id = ${subId}::uuid
);

-- Local sanity hint (not asserted at SQL level; used by post-apply MCP verification):
--   src title hint: ${titleHint}
--   embedding source: live submission row content_embedding column
--   raw tagged_metadata (review id ${review.id}):
--     ${reviewMetaLit.length > 200 ? reviewMetaLit.slice(0, 200) + '… (truncated)' : reviewMetaLit}
`;
}

function buildSql(
  selected: { sub: SubmissionRow; review: ReviewRow }[],
  terminator: 'ROLLBACK' | 'COMMIT'
): string {
  const header = `-- Phase 5 — Category B-new publish (smallest-content-first order)
-- Generated by scripts/orphan-recovery/phase-5-b-new-publish.ts
-- Selected rows: ${selected.length}
--
-- Each INSERT is its own statement, idempotent via WHERE NOT EXISTS on
-- lessons.original_submission_id. The transaction wrapper is for atomic
-- rollback if any individual INSERT trips a constraint. Re-applying is
-- safe — the WHERE NOT EXISTS guard makes already-published rows no-ops.
--
-- This SQL is the rehearsal/commit artifact paired with the canonical
-- migration file at supabase/migrations/20260429000000_phase_5_b_new_publish.sql.
-- The migration's body is structurally identical to this file's body
-- (same header, same per-row statements). Diff between rehearsal and
-- commit shows exactly one line — the final terminator.
`;

  const statements = selected
    .map(({ sub, review }, i) => buildLessonInsertStatement(sub, review, `Row ${i + 1} of ${selected.length}`))
    .join('\n');

  const verification = `
-- Post-write verification (visible in the same transaction):
SELECT
  count(*)::int AS lessons_published_for_b_new,
  count(*) FILTER (WHERE search_vector IS NOT NULL)::int AS with_fts,
  count(*) FILTER (WHERE content_embedding IS NOT NULL)::int AS with_embedding,
  count(*) FILTER (WHERE metadata ? 'thematicCategories')::int AS with_legacy_meta_keys
FROM lessons
WHERE original_submission_id IN (
  ${selected.map((r) => sqlLit(r.sub.id) + '::uuid').join(',\n  ')}
);
`;

  return `${header}
BEGIN;

${statements}
${verification}
${terminator};
`;
}

async function main() {
  const target = describeSupabaseTarget();
  console.log(`Phase 5 — Category B-new publish (plan mode) against ${target.target}`);

  const fetched: { sub: SubmissionRow; review: ReviewRow }[] = [];
  for (const id of PHASE_5_B_NEW_SUBMISSION_IDS) {
    const sub = await fetchSubmission(id);
    if (sub.status !== 'approved') {
      console.error(`Pre-flight failed: submission ${id} status='${sub.status}', expected 'approved'.`);
      process.exit(1);
    }
    if (sub.content_embedding == null) {
      console.error(`Pre-flight failed: submission ${id} has NULL content_embedding. Hard-stop.`);
      console.error('  Recovery options: (1) regenerate via process-submission with regenerateEmbedding=true, (2) skip and document.');
      process.exit(1);
    }
    if (!sub.extracted_content || sub.extracted_content.length === 0) {
      console.error(`Pre-flight failed: submission ${id} has empty extracted_content.`);
      process.exit(1);
    }

    const alreadyPublished = await fetchAlreadyPublishedCount(id);
    if (alreadyPublished > 0) {
      console.error(`Pre-flight failed: submission ${id} already has ${alreadyPublished} lessons row(s) linked. Skip or investigate.`);
      process.exit(1);
    }

    const docCollisions = await fetchDocIdCollisionLessons(sub.google_doc_id);
    if (docCollisions.length > 0) {
      console.error(`Pre-flight failed: submission ${id} google_doc_id matches ${docCollisions.length} existing lessons rows: ${docCollisions.join(', ')}.`);
      console.error('  This submission is Category A (doc-id match), not B-new. Re-classify.');
      process.exit(1);
    }

    const review = await fetchReview(id);
    if (review.decision !== 'approve_new') {
      console.error(`Pre-flight failed: submission ${id} review decision='${review.decision}', expected 'approve_new'.`);
      process.exit(1);
    }
    if (review.canonical_lesson_id != null) {
      console.error(`Pre-flight failed: submission ${id} review canonical_lesson_id=${review.canonical_lesson_id}, expected NULL for approve_new.`);
      process.exit(1);
    }
    if (review.tagged_metadata == null || typeof review.tagged_metadata !== 'object') {
      console.error(`Pre-flight failed: submission ${id} review tagged_metadata is missing or non-object.`);
      process.exit(1);
    }

    fetched.push({ sub, review });
    console.log(`  ✓ ${id} preflight passed (title="${(sub.extracted_title ?? '').slice(0, 60)}", content_length=${sub.extracted_content.length}, metadata_keys=${Object.keys(review.tagged_metadata).length})`);
  }

  const selectedRows: SelectedRow[] = fetched.map(({ sub, review }) => ({
    submission_id: sub.id,
    extracted_title: sub.extracted_title ?? '',
    content_length: sub.extracted_content.length,
    has_embedding: sub.content_embedding != null,
    review_id: review.id,
    decision: review.decision,
    metadata_keys_present: Object.keys(review.tagged_metadata ?? {}),
  }));

  // Snapshot: full submission + review rows for the selected 5. Used as
  // rollback context if a published lesson needs to be deleted and
  // republished from a different metadata snapshot. Snapshot is local-only
  // (gitignored) — contains teacher content.
  fs.writeFileSync(
    snapshotPath,
    JSON.stringify(
      {
        generated_at: generatedAt.toISOString(),
        target: target.target,
        submissions: fetched.map(({ sub }) => ({ ...sub, content_embedding: '<<vector elided>>' })),
        reviews: fetched.map(({ review }) => review),
      },
      null,
      2
    )
  );
  console.log(`  Snapshot written: ${path.relative(process.cwd(), snapshotPath)} (${fetched.length} rows)`);

  const artifactWithoutHash: Omit<Artifact, 'artifact_hash'> = {
    phase: 'phase-5-b-new',
    generated_at: generatedAt.toISOString(),
    git_sha: gitSha(),
    target,
    selected_rows: selectedRows,
    preflight: {
      embedding_check_passed: true,
      doc_id_collision_check_passed: true,
      not_already_published_check_passed: true,
      review_present_check_passed: true,
    },
    summary: {
      total_candidates: PHASE_5_B_NEW_SUBMISSION_IDS.length,
      selected: selectedRows.length,
    },
  };

  const artifact: Artifact = {
    ...artifactWithoutHash,
    artifact_hash: sha256(canonicalJson(artifactWithoutHash)),
  };

  fs.writeFileSync(artifactPath, JSON.stringify(artifact, null, 2));
  console.log(`  Artifact: ${path.relative(process.cwd(), artifactPath)}`);

  fs.writeFileSync(rehearsalPath, buildSql(fetched, 'ROLLBACK'));
  fs.writeFileSync(commitPath, buildSql(fetched, 'COMMIT'));
  console.log(`  Rehearsal SQL: ${path.relative(process.cwd(), rehearsalPath)}`);
  console.log(`  Commit SQL:    ${path.relative(process.cwd(), commitPath)}`);

  console.log('');
  console.log('Next steps:');
  console.log('  1. Review the artifact and the rehearsal.sql file.');
  console.log('  2. Local rehearsal: `psql -f ${rehearsal}` against a local DB seeded with the 5 submissions.');
  console.log('  3. The migration file at supabase/migrations/20260429000000_phase_5_b_new_publish.sql is the canonical write path.');
  console.log('  4. CI applies the migration to TEST DB on PR push; verify with mcp__supabase-test__execute_sql before merging.');
  console.log('  5. After merge, the production migration workflow runs; verify with mcp__supabase-remote__execute_sql.');
}

main().catch((err) => {
  console.error('phase-5-b-new-publish failed:', err);
  process.exit(1);
});
