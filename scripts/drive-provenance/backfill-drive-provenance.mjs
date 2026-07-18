#!/usr/bin/env node
/**
 * ONE-TIME supervised historical Drive-provenance backfill (Phase 5).
 *
 * Fills lessons' drive_file_id / drive_mime_type / drive_created_at /
 * drive_modified_at / drive_metadata_synced_at for the active corpus, and —
 * ONLY in the supervised Activity path — the historical creator tuple
 * (drive_creator_name/attribution, source='drive_activity', verified_at=now)
 * per the locked acceptance rules in lib/attribution.mjs.
 *
 * SAFETY MODEL
 *   - EXPLICIT MODE: pass --dates-only (dates/MIME refresh evidence only, no
 *     creator inputs allowed) OR the complete creator set (--activity-subject
 *     + ≥1 --worksheet + a validated non-empty --actor-map). A creator run
 *     never silently degrades into a mass omit.
 *   - DEFAULT IS DRY-RUN: no database writes of any kind; a private aggregate
 *     report (mode 600, outside the repo) plus an aggregate stdout summary
 *     that includes the run's plan_digest.
 *   - Writes require --write. Production writes ADDITIONALLY require
 *     --i-mean-prod (requireNonProd guard). --confirm-token must equal the
 *     plan_digest RECOMPUTED from the write run's own evidence — the digest
 *     covers target project, corpus source, private-input hashes, and every
 *     intended per-row update, so a reviewed dry-run authorizes exactly the
 *     write that was reviewed and nothing else. Write runs must source the
 *     corpus from the target DB (--lessons-json is dry-run only).
 *   - Existing reviewer_confirmed creator tuples are NEVER overwritten, and
 *     creator columns are only touched by an explicit creator-mode decision.
 *   - A private backup of every to-be-touched row's current drive_* columns is
 *     written (mode 600) before any write batch runs; the write-mode report
 *     goes to <report>.write-result.json (the reviewed dry-run report is
 *     never overwritten).
 *   - DB writes go in batches of at most 50; ANY API/validation/write error
 *     exits nonzero (non-404 Drive/Activity failures abort BEFORE any write).
 *   - NOTHING identifying is ever printed: no emails, names, file ids, tokens,
 *     or worksheet rows — aggregate counts, safe category labels, and hashes only.
 *   - Every private input file must be owner-only (mode 600 or stricter) or
 *     the script refuses to read it.
 *
 * IDENTITIES (all supplied at runtime — nothing hard-coded)
 *   --metadata-subject   the ORDINARY delegated reader (Docs+Drive readonly) —
 *                        the same identity the deployed refresh path uses.
 *   --activity-subject   the supervised, one-time Activity impersonation
 *                        subject. ONLY meaningful locally; the Activity scope
 *                        never ships in deployed runtime behavior.
 *
 * USAGE
 *   Dates-only dry-run over an offline lesson export (no DB contact at all):
 *     node scripts/drive-provenance/backfill-drive-provenance.mjs --dates-only \
 *       --service-account <key.json> --metadata-subject <reader@…> \
 *       --lessons-json <active-lessons.json> --report <private-report.json>
 *
 *   Full supervised dry-run (Activity + worksheets + actor map), DB corpus:
 *     node scripts/drive-provenance/backfill-drive-provenance.mjs \
 *       --service-account <key.json> --metadata-subject <reader@…> \
 *       --activity-subject <supervised@…> \
 *       --worksheet <final.csv> --worksheet <recovery.csv> \
 *       --actor-map <private-actor-map.json> --report <private-report.json>
 *
 *   Production write (SUPERVISED — human at the wheel; corpus from the DB):
 *     … same as the dry-run plus --write --i-mean-prod \
 *       --confirm-token <plan_digest printed by the reviewed dry-run>
 */

import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { requireNonProd, describeSupabaseTarget } from '../lib/require-env.mjs';
import { extractDriveFileId, isNativeGoogleDocMime } from './lib/driveUrl.mjs';
import { decideAttribution, lastCreateMillis, isLaterThan } from './lib/attribution.mjs';
import { parseWorksheet, mergeWorksheets } from './lib/worksheet.mjs';
import { getGoogleAccessToken, METADATA_SCOPES, ACTIVITY_SCOPE } from './lib/googleAuth.mjs';
import { fetchDriveFileMetadata, fetchDriveActivity } from './lib/driveApi.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const BATCH_SIZE_MAX = 50;
// PostgREST `.in()` filters ride in the GET querystring — ~710 lesson ids in
// one filter is a ~27KB URL the server rejects (400). 100 ids ≈ 4KB stays
// comfortably under every proxy limit.
const SELECT_CHUNK = 100;

// ---------------------------------------------------------------------------
// CLI parsing (no deps; explicit and boring).
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const args = {
    worksheets: [],
    write: false,
    iMeanProd: false,
    batchSize: BATCH_SIZE_MAX,
  };
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
      case '--worksheet': args.worksheets.push(next()); break;
      case '--actor-map': args.actorMap = next(); break;
      case '--lessons-json': args.lessonsJson = next(); break;
      case '--report': args.report = next(); break;
      case '--backup': args.backup = next(); break;
      case '--batch-size': args.batchSize = Number(next()); break;
      case '--confirm-token': args.confirmToken = next(); break;
      case '--dates-only': args.datesOnly = true; break;
      case '--write': args.write = true; break;
      case '--i-mean-prod': args.iMeanProd = true; break; // consumed by requireNonProd via argv
      default: throw new Error(`unknown argument: ${a}`);
    }
  }
  if (!args.report) throw new Error('--report <path> is required (private, outside the repo)');
  if (!Number.isInteger(args.batchSize) || args.batchSize < 1 || args.batchSize > BATCH_SIZE_MAX) {
    throw new Error(`--batch-size must be an integer in [1, ${BATCH_SIZE_MAX}]`);
  }
  // EXPLICIT mode contract — a requested creator run must never silently
  // degrade into a dates-only run (which, in write mode, would treat every
  // actor as unresolved and clear historical attributions):
  //   --dates-only        → forbid ALL creator inputs;
  //   otherwise (creator) → require the COMPLETE set: activity subject +
  //                         ≥1 worksheet + actor map (validated non-empty later).
  if (args.datesOnly) {
    if (args.activitySubject || args.worksheets.length > 0 || args.actorMap) {
      throw new Error(
        '--dates-only forbids --activity-subject/--worksheet/--actor-map — pick ONE mode explicitly'
      );
    }
  } else if (!args.activitySubject || args.worksheets.length === 0 || !args.actorMap) {
    throw new Error(
      'creator mode requires --activity-subject, at least one --worksheet, AND --actor-map. ' +
        'For a dates-only run, pass --dates-only explicitly.'
    );
  }
  return args;
}

// Refuse to read a private input unless it is owner-only (600 or stricter).
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
    throw new Error(`private outputs must be written OUTSIDE the repository: ${filePath}`);
  }
  fs.writeFileSync(filePath, content, { mode: 0o600 });
  fs.chmodSync(filePath, 0o600);
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Write-plan + digest: the production confirmation token IS the digest of the
// intended write plan, recomputed from the live evidence immediately before
// writing. A token from the reviewed dry-run therefore only authorizes a
// write whose target, corpus, private inputs, AND per-row intended updates
// are byte-identical to what was reviewed — any drift aborts.
// ---------------------------------------------------------------------------

/**
 * Deterministic per-row write intent, sorted by lesson_id. Timestamp columns
 * (synced/verified) are deliberately EXCLUDED — they are stamped at write
 * time and must not break digest equality. Contains creator names/file ids →
 * NEVER printed or written to a report (only its count summary and digest are).
 */
function buildWritePlan(fileToLessons, perFile, creatorPathEnabled) {
  const rows = [];
  for (const [fileId, lessonIds] of fileToLessons) {
    const entry = perFile.get(fileId);
    if (!entry?.metadata) continue; // unreadable → no row → stored values preserved
    for (const lessonId of lessonIds) {
      const row = {
        lesson_id: lessonId,
        drive_file_id: entry.metadata.id,
        drive_mime_type: entry.metadata.mimeType,
        drive_created_at: entry.metadata.createdTime,
        drive_modified_at: entry.metadata.modifiedTime,
        // 'untouched' = creator columns not part of this run (dates-only, or
        // no decision); 'set'/'clear' = supervised creator outcome. The
        // reviewer_confirmed protection is applied at EXECUTION time on live
        // DB state and can only shrink the creator scope, never widen it.
        creator_intent: 'untouched',
      };
      if (creatorPathEnabled && entry.decision) {
        if (entry.decision.accept) {
          row.creator_intent = 'set';
          row.creator_attribution = entry.decision.attribution;
          row.creator_name = entry.decision.name;
        } else {
          row.creator_intent = 'clear';
        }
      }
      rows.push(row);
    }
  }
  rows.sort((a, b) => (a.lesson_id < b.lesson_id ? -1 : a.lesson_id > b.lesson_id ? 1 : 0));
  return rows;
}

function computePlanDigest({ target, planRows, inputHashes }) {
  return sha256(JSON.stringify({ v: 1, target, inputs: inputHashes, plan: planRows }));
}

// ---------------------------------------------------------------------------
// Lesson loading: offline export file OR the env-configured database.
// ---------------------------------------------------------------------------
async function loadActiveLessons(args, supabase, inputHashes) {
  if (args.lessonsJson) {
    const raw = readPrivateFile(args.lessonsJson, '--lessons-json input');
    inputHashes.lessons_json = sha256(raw);
    const rows = JSON.parse(raw);
    if (!Array.isArray(rows)) throw new Error('--lessons-json must contain a JSON array');
    for (const r of rows) {
      if (!r || typeof r.lesson_id !== 'string') {
        throw new Error('--lessons-json rows need lesson_id (offline export shape)');
      }
    }
    // Offline exports are expected to be pre-filtered to active rows; a
    // retired_at field, if present, is honored defensively.
    return rows.filter((r) => r.retired_at == null);
  }
  const all = [];
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await supabase
      .from('lessons')
      .select('lesson_id, file_link, drive_file_id, retired_at')
      .is('retired_at', null)
      .order('lesson_id', { ascending: true })
      .range(from, from + page - 1);
    if (error) throw new Error(`lessons select failed: ${error.message}`);
    all.push(...(data ?? []));
    if (!data || data.length < page) break;
  }
  return all;
}

// ---------------------------------------------------------------------------
// Main.
// ---------------------------------------------------------------------------
async function main() {
  const args = parseArgs(process.argv);

  console.log(`🔄 drive-provenance backfill — mode: ${args.write ? 'WRITE' : 'DRY-RUN'}`);

  // --- database handle (only when not running from an offline export) ------
  let supabase = null;
  if (!args.lessonsJson || args.write) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing environment variables');
      console.error('Required: VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
      process.exit(1);
    }
    if (args.write) {
      // Prod guard (scripts/CLAUDE.md): every mutating run must pass it;
      // production additionally demands the explicit --i-mean-prod opt-in.
      requireNonProd({ scriptName: 'backfill-drive-provenance' });
    } else {
      const { target } = describeSupabaseTarget();
      console.log(`🛰  Supabase target (READ-ONLY dry-run): ${target}`);
    }
    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }

  // --- write-mode precondition (presence only) ------------------------------
  // The token's VALUE is checked later, against the plan digest recomputed
  // from THIS run's evidence — see computePlanDigest. Binding the token to a
  // report file alone would let a stale/unrelated report authorize a
  // different write set.
  if (args.write && !args.confirmToken) {
    throw new Error(
      'write mode requires --confirm-token (the plan_digest printed by the reviewed dry-run)'
    );
  }

  // --- Google auth ----------------------------------------------------------
  if (!args.serviceAccount || !args.metadataSubject) {
    throw new Error('--service-account and --metadata-subject are required');
  }
  const serviceAccount = JSON.parse(
    readPrivateFile(args.serviceAccount, 'service-account key')
  );
  const metadataToken = await getGoogleAccessToken(
    serviceAccount,
    METADATA_SCOPES,
    args.metadataSubject
  );
  let activityToken = null;
  if (args.activitySubject) {
    activityToken = await getGoogleAccessToken(
      serviceAccount,
      ACTIVITY_SCOPE,
      args.activitySubject
    );
  }

  // --- worksheets + actor map (creator path inputs) -------------------------
  // Private-input content hashes feed the plan digest so the reviewed dry-run
  // and the write run are provably working from the SAME evidence files.
  const inputHashes = { worksheets: [], actor_map: null, lessons_json: null };
  let worksheet = new Map();
  for (const wsPath of args.worksheets) {
    const wsRaw = readPrivateFile(wsPath, 'name worksheet');
    inputHashes.worksheets.push(sha256(wsRaw));
    const entries = parseWorksheet(wsRaw, path.basename(wsPath));
    worksheet = mergeWorksheets([[...worksheet.entries()].map(([accountEmail, v]) => ({
      accountEmail,
      ...v,
    })), entries]);
  }
  let actorMap = new Map();
  if (args.actorMap) {
    const amRaw = readPrivateFile(args.actorMap, 'actor map');
    inputHashes.actor_map = sha256(amRaw);
    const raw = JSON.parse(amRaw);
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      throw new Error('--actor-map must be a JSON object of personName → account email');
    }
    actorMap = new Map(
      Object.entries(raw).map(([k, v]) => [k, String(v).trim().toLowerCase()])
    );
    // Validated non-empty (mode contract): every value must look like an
    // account email; an empty/garbage map would make every actor unresolved
    // and turn a creator run into a mass omit.
    if (actorMap.size === 0) {
      throw new Error('--actor-map is empty — creator mode needs a populated actor map');
    }
    for (const v of actorMap.values()) {
      if (!v.includes('@')) {
        throw new Error('--actor-map values must be account emails (one is not)');
      }
    }
  }
  const creatorPathEnabled = !args.datesOnly;
  if (creatorPathEnabled && worksheet.size === 0) {
    throw new Error('creator mode needs at least one worksheet DATA row (headers alone are not a worksheet)');
  }

  // --- corpus ---------------------------------------------------------------
  // A WRITE run must source its corpus from the target database itself — an
  // offline export could silently diverge from the rows being written.
  if (args.write && args.lessonsJson) {
    throw new Error('write mode forbids --lessons-json — the corpus must come from the target DB');
  }
  const lessons = await loadActiveLessons(args, supabase, inputHashes);
  const fileToLessons = new Map();
  const unparseableLessonIds = [];
  for (const lesson of lessons) {
    const fileId = lesson.drive_file_id || extractDriveFileId(lesson.file_link);
    if (!fileId) {
      unparseableLessonIds.push(lesson.lesson_id);
      continue;
    }
    const list = fileToLessons.get(fileId);
    if (list) list.push(lesson.lesson_id);
    else fileToLessons.set(fileId, [lesson.lesson_id]);
  }
  const uniqueFileIds = [...fileToLessons.keys()];
  const duplicateLessonRows = lessons.length - unparseableLessonIds.length - uniqueFileIds.length;

  console.log(
    `📚 active lesson rows: ${lessons.length}; unique files: ${uniqueFileIds.length}; ` +
      `rows sharing a file: ${duplicateLessonRows}; no parseable link: ${unparseableLessonIds.length}`
  );

  // --- per-file evidence (metadata + optional supervised activity) ----------
  const perFile = new Map(); // fileId → { metadata|null, status, decision|null }
  const mimeCounts = {};
  let readableFiles = 0;
  let notFoundFiles = 0;
  let otherFailedFiles = 0;
  let datesPresentFiles = 0;

  let processed = 0;
  for (const fileId of uniqueFileIds) {
    const meta = await fetchDriveFileMetadata(metadataToken, fileId);
    if (!meta.ok) {
      if (meta.notFound) notFoundFiles++;
      else otherFailedFiles++;
      perFile.set(fileId, { metadata: null, status: meta.status, decision: null });
    } else {
      readableFiles++;
      const mime = meta.metadata.mimeType;
      mimeCounts[mime] = (mimeCounts[mime] ?? 0) + 1;
      if (meta.metadata.createdTime && meta.metadata.modifiedTime) datesPresentFiles++;
      perFile.set(fileId, { metadata: meta.metadata, status: 200, decision: null });
    }
    processed++;
    if (processed % BATCH_SIZE_MAX === 0) {
      console.log(`  … metadata ${processed}/${uniqueFileIds.length}`);
      await sleep(250); // stay far under Drive quota; batches of ≤50 between pauses
    }
  }

  // --- creator decisions (supervised path only) -----------------------------
  const decisionCounts = {};
  let acceptedCreated = 0;
  let acceptedAdapted = 0;
  let activityFailedFiles = 0;
  if (creatorPathEnabled) {
    let activityProcessed = 0;
    for (const [fileId, entry] of perFile) {
      if (!entry.metadata || !isNativeGoogleDocMime(entry.metadata.mimeType)) continue;
      const activity = await fetchDriveActivity(activityToken, fileId);
      if (!activity.ok) {
        activityFailedFiles++;
        entry.decision = { accept: false, reason: 'activity_unavailable' };
      } else {
        const resolve = (personName) =>
          personName && actorMap.has(personName) ? actorMap.get(personName) : null;
        const createActions = activity.createActions.map((a) => ({
          actorEmail: resolve(a.personName),
          actorIsPerson: a.actorIsPerson,
          subtype: a.subtype,
        }));
        // Parsed-epoch comparison (NOT lexicographic — RFC 3339 fractional
        // precision varies, so string order lies: '…00.900Z' < '…00Z' as
        // strings yet is later in time). FAIL CLOSED on an unreadable create
        // time: with no anchor we cannot prove any edit came AFTER the copy,
        // so no edit counts as "later" (a copy then omits via
        // copy_without_edit rather than sneaking in). Equal timestamps are
        // also not "later".
        const lastCreateMs = lastCreateMillis(activity.createActions.map((a) => a.timestamp));
        const laterEditActorEmails = [
          ...new Set(
            activity.edits
              .filter((e) => isLaterThan(e.timestamp, lastCreateMs))
              .map((e) => resolve(e.personName))
              .filter(Boolean)
          ),
        ];
        entry.decision = decideAttribution({
          mimeType: entry.metadata.mimeType,
          createActions,
          laterEditActorEmails,
          worksheet,
        });
      }
      const key = entry.decision.accept
        ? `accepted_${entry.decision.attribution}`
        : entry.decision.reason;
      decisionCounts[key] = (decisionCounts[key] ?? 0) + 1;
      if (entry.decision.accept && entry.decision.attribution === 'created') acceptedCreated++;
      if (entry.decision.accept && entry.decision.attribution === 'adapted') acceptedAdapted++;
      activityProcessed++;
      if (activityProcessed % BATCH_SIZE_MAX === 0) {
        console.log(`  … activity ${activityProcessed}`);
        await sleep(250);
      }
    }
  }

  const lessonRowsFor = (predicate) => {
    let n = 0;
    for (const [fileId, lessonIds] of fileToLessons) {
      if (predicate(perFile.get(fileId))) n += lessonIds.length;
    }
    return n;
  };

  // --- aggregate report (counts + safe categories ONLY) ---------------------
  const report = {
    generated_at: new Date().toISOString(),
    mode: args.write ? 'write' : 'dry_run',
    creator_path_enabled: creatorPathEnabled,
    corpus: {
      active_lesson_rows: lessons.length,
      unique_file_ids: uniqueFileIds.length,
      duplicate_lesson_rows_sharing_a_file: duplicateLessonRows,
      rows_without_parseable_link: unparseableLessonIds.length,
    },
    drive_metadata: {
      readable_files: readableFiles,
      not_found_files: notFoundFiles,
      other_failed_files: otherFailedFiles,
      both_dates_present_files: datesPresentFiles,
      mime_counts: mimeCounts,
      readable_lesson_rows: lessonRowsFor((e) => e?.metadata != null),
      unreadable_lesson_rows: lessonRowsFor((e) => e?.metadata == null),
    },
    creator_attribution: creatorPathEnabled
      ? {
          accepted_created_files: acceptedCreated,
          accepted_adapted_files: acceptedAdapted,
          accepted_lesson_rows: lessonRowsFor((e) => e?.decision?.accept === true),
          activity_failed_files: activityFailedFiles,
          decision_counts: decisionCounts,
        }
      : { skipped: 'dates-only run (--dates-only)' },
    writes: 0,
  };

  // --- write plan + binding digest ------------------------------------------
  // The digest binds target project + corpus source + private-input hashes +
  // every intended per-row update. The dry-run prints it; write mode requires
  // --confirm-token to EXACTLY match the digest recomputed from THIS run.
  const planRows = buildWritePlan(fileToLessons, perFile, creatorPathEnabled);
  const digestTarget = args.lessonsJson
    ? { corpus: 'offline-export' }
    : { corpus: 'db', db: sha256(process.env.VITE_SUPABASE_URL ?? '') };
  const planDigest = computePlanDigest({ target: digestTarget, planRows, inputHashes });
  const planCounts = {
    rows: planRows.length,
    creator_set: planRows.filter((r) => r.creator_intent === 'set').length,
    creator_clear: planRows.filter((r) => r.creator_intent === 'clear').length,
    creator_untouched: planRows.filter((r) => r.creator_intent === 'untouched').length,
  };
  report.write_plan = planCounts;
  report.plan_digest = planDigest;

  // API errors (NOT expected 404s) mean the evidence is incomplete: report the
  // aggregates for diagnosis, then STOP NONZERO — and never reach write mode.
  const apiErrors = otherFailedFiles + activityFailedFiles;
  if (apiErrors > 0) {
    writeReportAndSummarize(report, args, /* failed= */ true);
    console.error(
      `❌ ${apiErrors} Drive/Activity API failure(s) (non-404) — evidence incomplete; ` +
        `no writes performed. Re-run when the API is healthy.`
    );
    process.exit(2);
  }

  // --- write mode -----------------------------------------------------------
  if (args.write) {
    if (args.confirmToken !== planDigest) {
      throw new Error(
        '--confirm-token does not match the plan_digest recomputed from this run — the corpus, ' +
          'Drive evidence, or private inputs changed since the reviewed dry-run (or the token is ' +
          'stale/unrelated). Re-run the dry-run, review its report, and pass its plan_digest.'
      );
    }

    // Map lesson_id → existing creator source, fetched fresh so the backfill
    // NEVER clobbers a reviewer-confirmed attribution published since the
    // reviewed dry-run (Gate-2 reviewer flow can precede Gate-3 backfill).
    // Execution-time only — this live-state guard can only SHRINK the
    // reviewed plan's creator scope, never widen it, so it sits outside the
    // digest by design.
    const existingBySource = new Map();
    const planLessonIds = planRows.map((r) => r.lesson_id);
    for (let i = 0; i < planLessonIds.length; i += SELECT_CHUNK) {
      const { data, error } = await supabase
        .from('lessons')
        .select('lesson_id, drive_creator_source')
        .in('lesson_id', planLessonIds.slice(i, i + SELECT_CHUNK));
      if (error) throw new Error(`pre-write select failed: ${error.message}`);
      for (const row of data ?? []) existingBySource.set(row.lesson_id, row.drive_creator_source);
    }

    const nowIso = new Date().toISOString();
    const updates = planRows.map((row) => {
      const base = {
        drive_file_id: row.drive_file_id,
        drive_mime_type: row.drive_mime_type,
        drive_created_at: row.drive_created_at,
        drive_modified_at: row.drive_modified_at,
        drive_metadata_synced_at: nowIso,
      };
      let creator = {};
      if (row.creator_intent !== 'untouched') {
        if (existingBySource.get(row.lesson_id) === 'reviewer_confirmed') {
          creator = {}; // newer, human-decided truth always wins
        } else if (row.creator_intent === 'set') {
          creator = {
            drive_creator_name: row.creator_name,
            drive_creator_attribution: row.creator_attribution,
            drive_creator_source: 'drive_activity',
            drive_creator_verified_at: nowIso,
          };
        } else {
          creator = {
            drive_creator_name: null,
            drive_creator_attribution: null,
            drive_creator_source: null,
            drive_creator_verified_at: null,
          };
        }
      }
      return { lesson_id: row.lesson_id, ...base, ...creator };
    });

    // Private rollback artifact: current drive_* values of every target row.
    const backupPath =
      args.backup ?? path.join(path.dirname(path.resolve(args.report)),
        `drive-provenance-backup-${Date.now()}.json`);
    const targetIds = updates.map((u) => u.lesson_id);
    const backupRows = [];
    for (let i = 0; i < targetIds.length; i += SELECT_CHUNK) {
      const { data, error } = await supabase
        .from('lessons')
        .select(
          'lesson_id, drive_file_id, drive_mime_type, drive_created_at, drive_modified_at, ' +
            'drive_metadata_synced_at, drive_creator_name, drive_creator_attribution, ' +
            'drive_creator_source, drive_creator_verified_at'
        )
        .in('lesson_id', targetIds.slice(i, i + SELECT_CHUNK));
      if (error) throw new Error(`backup select failed: ${error.message}`);
      backupRows.push(...(data ?? []));
    }
    writePrivateFile(backupPath, JSON.stringify(backupRows, null, 2));
    console.log(`🗄  backup written (mode 600, ${backupRows.length} rows)`);

    let written = 0;
    for (let i = 0; i < updates.length; i += args.batchSize) {
      const batch = updates.slice(i, i + args.batchSize);
      for (const u of batch) {
        const { lesson_id, ...cols } = u;
        const { error } = await supabase
          .from('lessons')
          .update(cols)
          .eq('lesson_id', lesson_id)
          .is('retired_at', null);
        if (error) {
          console.error(`❌ write failed at batch ${Math.floor(i / args.batchSize) + 1}`);
          throw new Error(error.message);
        }
        written++;
      }
      console.log(`  … wrote ${Math.min(i + args.batchSize, updates.length)}/${updates.length}`);
    }
    report.writes = written;
    report.backup_rows = backupRows.length;
  }

  writeReportAndSummarize(report, args, /* failed= */ false);
}

/**
 * Write the aggregate report privately and echo the aggregate summary. In
 * write mode the result goes to `<report>.write-result.json` — the REVIEWED
 * dry-run report (which printed the plan_digest used as --confirm-token) is
 * never overwritten. The token is the computed plan_digest itself, NOT the
 * report file's sha256.
 */
function writeReportAndSummarize(report, args, failed) {
  const reportPath = args.write ? `${args.report}.write-result.json` : args.report;
  writePrivateFile(reportPath, JSON.stringify(report, null, 2));
  console.log('—— aggregate summary ————————————————————————————');
  console.log(JSON.stringify(report, null, 2));
  console.log(`📝 report written (mode 600)`);
  if (!failed) {
    if (args.write) {
      console.log(`✅ wrote ${report.writes} lesson rows`);
    } else {
      console.log('✅ dry-run complete — writes=0');
      console.log(
        `🔑 after review, authorize the write with: --confirm-token ${report.plan_digest}`
      );
    }
  }
}

main().catch((error) => {
  console.error('❌ backfill-drive-provenance failed:', error.message);
  process.exit(1);
});
