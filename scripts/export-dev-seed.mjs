#!/usr/bin/env node
/* eslint-disable no-console -- CLI script: console output is the operator UI */
/**
 * @description Regenerate the LOCAL dev seed (data/consolidated_lessons.json)
 *   from the PRODUCTION-live lesson corpus. (Wave 4 PR3 / C88.)
 * @example
 *   EXPORT_SOURCE_ANON_KEY='<prod publishable anon key>' node scripts/export-dev-seed.mjs
 *
 * @notes
 * READ-ONLY BY CONSTRUCTION:
 *   - This script SELECTs `lessons` from PRODUCTION using the PUBLISHABLE
 *     (anon) key only — `lessons` is publicly readable under RLS
 *     ("viewable by everyone" USING(true)). It holds NO service-role
 *     credential, performs NO insert/update/upsert/delete/DDL/rpc, and runs
 *     NO migration. Its only write is the LOCAL file data/consolidated_lessons.json.
 *
 * INVERSE PROD-GUARD (the opposite of require-env.mjs::requireNonProd):
 *   - The mutation scripts call requireNonProd() to REFUSE to run against prod.
 *     This generator must do the REVERSE: the dev seed must come from the real
 *     PROD-live corpus, so we REFUSE to run unless the resolved source URL is
 *     the known PROD project. We deliberately do NOT call requireNonProd() here
 *     — that guard exists for service-key MUTATION scripts and would wrongly
 *     block this intended, read-only PROD read.
 *
 * LOCKED decisions (Wave 4 design §4 Q14, do not re-debate):
 *   - Seed source = PROD live rows (retired_at IS NULL).
 *   - Emit PROD metadata AS-IS (current post-rebuild shape, plural `gradeLevels`).
 *     The grade reconciliation (gradeLevels ?? gradeLevel) happens on the
 *     IMPORTER side (scripts/import-data.js via scripts/lib/grade-levels.mjs).
 *   - Output is the legacy camelCase envelope that import-data.js consumes.
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { resolveGradeLevels } from './lib/grade-levels.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables (this script uses its OWN dedicated env vars,
// NOT VITE_SUPABASE_* — the export source is intentionally PROD regardless of
// whatever .env points the frontend/import scripts at).
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const PROD_PROJECT_REF = 'jxlxtzkmicfhchkhiojz';
const PROD_URL = `https://${PROD_PROJECT_REF}.supabase.co`;
const PAGE_SIZE = 1000;
const OUTPUT_PATH = path.join(__dirname, '..', 'data', 'consolidated_lessons.json');

const sourceUrl = process.env.EXPORT_SOURCE_URL || PROD_URL;
const sourceAnonKey = process.env.EXPORT_SOURCE_ANON_KEY;

if (!sourceAnonKey) {
  console.error('❌ Missing EXPORT_SOURCE_ANON_KEY.');
  console.error('   This generator reads PRODUCTION lessons with the PUBLISHABLE (anon) key.');
  console.error('   The public anon key comes from the Supabase dashboard (Project Settings →');
  console.error('   API → "anon"/publishable key) or the deployed frontend (VITE_SUPABASE_ANON_KEY).');
  console.error('   Re-run:  EXPORT_SOURCE_ANON_KEY=<anon key> node scripts/export-dev-seed.mjs');
  process.exit(1);
}

// Inverse prod-guard: the dev seed must be sourced from the real PROD-live
// corpus, so refuse to run against anything that is NOT prod.
if (!sourceUrl.includes(PROD_PROJECT_REF)) {
  console.error('');
  console.error('⛔ export-dev-seed refuses to seed from a NON-PRODUCTION source.');
  console.error(`   Resolved source URL: ${sourceUrl}`);
  console.error(`   Expected the prod project (${PROD_PROJECT_REF}).`);
  console.error('   The dev seed must reflect the live PROD corpus; aborting.');
  console.error('');
  process.exit(1);
}

// Anon client, no auth persistence (read-only, no session needed).
const supabase = createClient(sourceUrl, sourceAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const SELECT_COLUMNS =
  'lesson_id, title, summary, file_link, last_modified, metadata, confidence, ' +
  'flagged_for_review, review_notes, processing_notes';

async function exportDevSeed() {
  try {
    console.log('🔄 Regenerating local dev seed from PROD-live corpus (C88)...');
    console.log(`🛰  Source (read-only PROD): ${sourceUrl}`);

    // 1) Exact live-row count up front so we can page deterministically and
    //    detect PostgREST silent truncation.
    const { count, error: countError } = await supabase
      .from('lessons')
      .select('id', { count: 'exact', head: true })
      .is('retired_at', null);

    if (countError) {
      console.error('❌ Failed to count live rows:', countError);
      process.exit(1);
    }
    if (count == null) {
      console.error('❌ Live-row count came back null — refusing to proceed.');
      process.exit(1);
    }
    // This corpus is never empty. A 0 count means the read went wrong (RLS
    // misconfig, wrong/empty environment, transient auth) — abort rather than
    // overwrite the local dev seed with an empty array.
    if (count === 0) {
      console.error('❌ PROD returned 0 live rows — refusing to overwrite the local seed with [].');
      console.error('   This corpus should never be empty; check the source URL / anon key / RLS.');
      process.exit(1);
    }
    console.log(`📊 PROD live-row count (retired_at IS NULL): ${count}`);

    // 2) Page through ALL live rows, ordered by lesson_id ascending.
    const collected = [];
    for (let from = 0; from < count; from += PAGE_SIZE) {
      const to = Math.min(from + PAGE_SIZE - 1, count - 1);
      const { data, error } = await supabase
        .from('lessons')
        .select(SELECT_COLUMNS)
        .is('retired_at', null)
        .order('lesson_id', { ascending: true })
        .range(from, to);

      if (error) {
        console.error(`❌ Fetch error on range ${from}-${to}:`, error);
        process.exit(1);
      }
      collected.push(...data);
      console.log(`📥 Fetched ${collected.length}/${count} rows...`);
    }

    // 3) Fail loud if we did not collect exactly `count` rows.
    if (collected.length !== count) {
      console.error(
        `❌ Row-count mismatch: collected ${collected.length}, expected ${count} (PostgREST truncation?).`
      );
      process.exit(1);
    }

    // 4) Map each DB row → the legacy camelCase envelope import-data.js consumes.
    //    metadata is emitted AS-IS (no mutation; plural `gradeLevels` preserved).
    const rows = collected.map((row) => ({
      lessonId: row.lesson_id,
      lessonTitle: row.title,
      lessonSummary: row.summary,
      fileLink: row.file_link,
      lastModified: row.last_modified,
      metadata: row.metadata,
      confidence: row.confidence,
      flaggedForReview: row.flagged_for_review,
      reviewNotes: row.review_notes,
      processingNotes: row.processing_notes,
    }));

    // 5) Self-check invariants BEFORE writing anything to disk.
    const noGradeRows = rows.filter(
      (r) => !(resolveGradeLevels(r.metadata) || []).length
    );
    const lessonFormatRows = rows.filter(
      (r) => r.metadata && Object.prototype.hasOwnProperty.call(r.metadata, 'lessonFormat')
    );

    console.log(`🔎 grade-resolvable rows: ${rows.length - noGradeRows.length}/${rows.length}`);
    console.log(`🔎 rows containing metadata.lessonFormat: ${lessonFormatRows.length} (expect 0)`);

    if (noGradeRows.length > 0) {
      console.error(
        `❌ Invariant violated: ${noGradeRows.length} row(s) resolve to NO grade levels ` +
          `(gradeLevels ?? gradeLevel empty). First offender: ${noGradeRows[0].lessonId}`
      );
      process.exit(1);
    }
    if (lessonFormatRows.length > 0) {
      console.error(
        `❌ Invariant violated: ${lessonFormatRows.length} row(s) still carry metadata.lessonFormat ` +
          `(field was dropped in the 2026-05 metadata rebuild). First offender: ${lessonFormatRows[0].lessonId}`
      );
      process.exit(1);
    }

    // 6) Write the seed. Match the existing pretty-printed JSON formatting.
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(rows, null, 2) + '\n');

    console.log('');
    console.log('🎉 Dev seed regenerated.');
    console.log(`   Source URL ............... ${sourceUrl}`);
    console.log(`   Rows written ............. ${rows.length}`);
    console.log(`   metadata.lessonFormat .... ${lessonFormatRows.length} (expect 0)`);
    console.log(`   grade-resolvable rows .... ${rows.length - noGradeRows.length} (expect ${rows.length})`);
    console.log(`   Output ................... ${OUTPUT_PATH}`);
  } catch (error) {
    console.error('❌ Export failed:', error);
    process.exit(1);
  }
}

exportDevSeed();
