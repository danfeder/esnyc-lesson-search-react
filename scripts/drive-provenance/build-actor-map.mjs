#!/usr/bin/env node
/**
 * SUPERVISED, LOCAL-ONLY actor-map regeneration (Drive provenance, Gate 2).
 *
 * Rebuilds the private `people/NNN → account email` map the backfill's
 * creator mode needs, using the investigation-proven approved-account sweep:
 * Drive Activity marks the QUERYING identity's own actions with
 * `knownUser.isCurrentUser`, so querying each approved account against the
 * files whose CREATE actor is still unresolved identifies actors one account
 * at a time — within the existing Activity scope, no People API, no new
 * grants. This mechanism NEVER ships in deployed runtime behavior.
 *
 * READ-ONLY everywhere: Drive Activity queries + (optionally) a lessons
 * SELECT. Writes exactly one file — the private map at --out (mode 600,
 * outside the repo). Prints aggregate counts only; never an email, name,
 * person id, or file id.
 *
 * USAGE (all identities supplied at runtime):
 *   node scripts/drive-provenance/build-actor-map.mjs \
 *     --service-account <key.json> \
 *     --metadata-subject <reader@…> \
 *     --activity-subject <primary-supervised@…> \
 *     --sweep-subject <account1@…> --sweep-subject <account2@…> … \
 *     --lessons-json <active-lessons.json> \
 *     --out <private-actor-map.json>
 *
 *   --metadata-subject fetches file MIME (native-Docs filter) with the
 *   ordinary reader. --activity-subject makes the primary CREATE-collection
 *   pass (and resolves its own actions via isCurrentUser). Each
 *   --sweep-subject is then queried ONLY against files whose CREATE actor is
 *   still unresolved. Worksheet accounts are the natural sweep list.
 */

import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describeSupabaseTarget } from '../lib/require-env.mjs';
import { extractDriveFileId, isNativeGoogleDocMime } from './lib/driveUrl.mjs';
import {
  collectUnresolvedCreators,
  applySweepObservation,
  filesStillUnresolved,
} from './lib/actorSweep.mjs';
import { getGoogleAccessToken, METADATA_SCOPES, ACTIVITY_SCOPE } from './lib/googleAuth.mjs';
import { fetchDriveFileMetadata, fetchDriveActivity } from './lib/driveApi.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const PAUSE_EVERY = 50;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseArgs(argv) {
  const args = { sweepSubjects: [] };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`missing value for ${a}`);
      return v;
    };
    switch (a) {
      case '--service-account': args.serviceAccount = next(); break;
      case '--metadata-subject': args.metadataSubject = next(); break;
      case '--activity-subject': args.activitySubject = next(); break;
      case '--sweep-subject': args.sweepSubjects.push(next()); break;
      case '--lessons-json': args.lessonsJson = next(); break;
      case '--out': args.out = next(); break;
      default: throw new Error(`unknown argument: ${a}`);
    }
  }
  for (const [flag, v] of [
    ['--service-account', args.serviceAccount],
    ['--metadata-subject', args.metadataSubject],
    ['--activity-subject', args.activitySubject],
    ['--out', args.out],
  ]) {
    if (!v) throw new Error(`${flag} is required`);
  }
  if (args.sweepSubjects.length === 0) {
    throw new Error('at least one --sweep-subject is required (the approved worksheet accounts)');
  }
  return args;
}

function readPrivateFile(filePath, label) {
  const st = fs.statSync(filePath);
  if ((st.mode & 0o077) !== 0) {
    throw new Error(`${label} must be mode 600 or stricter (owner-only): ${filePath}`);
  }
  return fs.readFileSync(filePath, 'utf8');
}

function writePrivateFile(filePath, content) {
  const dir = path.dirname(path.resolve(filePath));
  const repoRoot = path.resolve(__dirname, '..', '..');
  if (dir === repoRoot || dir.startsWith(repoRoot + path.sep)) {
    throw new Error(`the actor map must be written OUTSIDE the repository: ${filePath}`);
  }
  fs.writeFileSync(filePath, content, { mode: 0o600 });
  fs.chmodSync(filePath, 0o600);
}

async function loadActiveLessons(args) {
  if (args.lessonsJson) {
    const rows = JSON.parse(readPrivateFile(args.lessonsJson, '--lessons-json input'));
    if (!Array.isArray(rows)) throw new Error('--lessons-json must contain a JSON array');
    return rows.filter((r) => r.retired_at == null);
  }
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('need --lessons-json or VITE_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
  }
  console.log(`🛰  Supabase target (READ-ONLY): ${describeSupabaseTarget().target}`);
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const all = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await supabase
      .from('lessons')
      .select('lesson_id, file_link, drive_file_id')
      .is('retired_at', null)
      .order('lesson_id', { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`lessons select failed: ${error.message}`);
    all.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return all;
}

async function main() {
  const args = parseArgs(process.argv);
  console.log(
    `🔄 actor-map sweep — 1 primary + ${args.sweepSubjects.length} sweep subject(s), read-only`
  );

  const serviceAccount = JSON.parse(readPrivateFile(args.serviceAccount, 'service-account key'));
  const metadataToken = await getGoogleAccessToken(
    serviceAccount,
    METADATA_SCOPES,
    args.metadataSubject
  );

  // --- corpus → unique native-Doc file ids ---------------------------------
  const lessons = await loadActiveLessons(args);
  const fileIds = new Set();
  for (const lesson of lessons) {
    const id = lesson.drive_file_id || extractDriveFileId(lesson.file_link);
    if (id) fileIds.add(id);
  }
  const nativeFileIds = [];
  let probed = 0;
  for (const fileId of fileIds) {
    const meta = await fetchDriveFileMetadata(metadataToken, fileId);
    if (meta.ok && isNativeGoogleDocMime(meta.metadata.mimeType)) nativeFileIds.push(fileId);
    if (++probed % PAUSE_EVERY === 0) {
      console.log(`  … mime ${probed}/${fileIds.size}`);
      await sleep(250);
    }
  }
  console.log(`📚 unique files: ${fileIds.size}; native docs: ${nativeFileIds.length}`);

  // --- pass 1: primary subject collects CREATE actors (+ self-resolution) ---
  const actorMap = new Map();
  const perFileCreates = new Map();
  const primaryToken = await getGoogleAccessToken(
    serviceAccount,
    ACTIVITY_SCOPE,
    args.activitySubject
  );
  let activityFailures = 0;
  probed = 0;
  for (const fileId of nativeFileIds) {
    const activity = await fetchDriveActivity(primaryToken, fileId);
    if (!activity.ok) {
      activityFailures++;
    } else {
      perFileCreates.set(fileId, activity.createActions);
      applySweepObservation(actorMap, args.activitySubject.trim().toLowerCase(), [
        ...activity.createActions,
        ...activity.edits,
      ]);
    }
    if (++probed % PAUSE_EVERY === 0) {
      console.log(`  … activity ${probed}/${nativeFileIds.length}`);
      await sleep(250);
    }
  }

  // --- pass 2: sweep each approved account over still-unresolved files ------
  let sweepQueries = 0;
  for (const subject of args.sweepSubjects) {
    const unresolved = collectUnresolvedCreators(perFileCreates, actorMap);
    const targets = filesStillUnresolved(unresolved);
    if (targets.length === 0) break;
    const token = await getGoogleAccessToken(serviceAccount, ACTIVITY_SCOPE, subject);
    let resolvedBySubject = 0;
    for (const fileId of targets) {
      const activity = await fetchDriveActivity(token, fileId);
      sweepQueries++;
      if (activity.ok) {
        resolvedBySubject += applySweepObservation(
          actorMap,
          subject.trim().toLowerCase(),
          [...activity.createActions, ...activity.edits]
        ).length;
      } else {
        activityFailures++;
      }
      if (sweepQueries % PAUSE_EVERY === 0) await sleep(250);
    }
    console.log(
      `  … sweep subject ${args.sweepSubjects.indexOf(subject) + 1}/${args.sweepSubjects.length}: ` +
        `${targets.length} file(s) queried, ${resolvedBySubject} actor id(s) resolved`
    );
  }

  const stillUnresolved = collectUnresolvedCreators(perFileCreates, actorMap);

  // --- output ---------------------------------------------------------------
  writePrivateFile(args.out, JSON.stringify(Object.fromEntries(actorMap), null, 2));
  console.log('—— aggregate summary ————————————————————————————');
  console.log(
    JSON.stringify(
      {
        native_files: nativeFileIds.length,
        files_with_create_evidence: perFileCreates.size,
        activity_failures: activityFailures,
        resolved_actor_ids: actorMap.size,
        unresolved_actor_ids: stillUnresolved.size,
        files_with_unresolved_creator: filesStillUnresolved(stillUnresolved).length,
        sweep_queries: sweepQueries,
      },
      null,
      2
    )
  );
  console.log(`🔑 actor map written (mode 600): ${actorMap.size} entries`);
  if (activityFailures > 0) {
    console.error(`❌ ${activityFailures} Activity API failure(s) — map may be incomplete`);
    process.exit(2);
  }
  console.log(
    '✅ done — unresolved actors (former staff / non-sweep accounts) correctly omit downstream'
  );
}

main().catch((error) => {
  console.error('❌ build-actor-map failed:', error.message);
  process.exit(1);
});
