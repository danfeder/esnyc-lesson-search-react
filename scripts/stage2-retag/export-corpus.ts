/**
 * Stage 2 re-tag — task A4: live-corpus export (READ-ONLY).
 *
 * Exports the live lesson corpus (`lessons WHERE retired_at IS NULL`) from
 * the PRODUCTION database to `scripts/stage2-retag/artifacts/corpus.jsonl`,
 * one JSON record per line:
 *
 *   { id, title, content_text, <13 text[] field columns>, academic_concepts }
 *
 * - `id` is `lessons.lesson_id` (the stable text id used throughout the
 *   PR 6 evidence artifacts and the OQ5 exclusion list).
 * - The 13 column names come from the vocab module's dual-write mapping
 *   (task A3) — `academic_concepts` is the documented exception with no
 *   text[] column; it is selected as `metadata->academicConcepts`.
 *
 * READ-ONLY BY CONSTRUCTION: database access is confined to
 * `fetchLiveLessonsPage()`, whose only PostgREST verb is `.select()` (plus
 * `.is()/.order()/.range()` filters). The script constructs no insert /
 * update / upsert / delete / rpc call, and it authenticates with the
 * project's PUBLISHABLE anon key — it holds no credential capable of
 * bypassing RLS. A final row-count assertion against the MCP census
 * (EXPECTED_LIVE_ROWS) runs before anything is written to disk.
 *
 * Credentials (env vars — never hardcode or commit key values):
 *   STAGE2_SUPABASE_URL       PROD project URL, e.g.
 *                             https://jxlxtzkmicfhchkhiojz.supabase.co
 *   STAGE2_SUPABASE_ANON_KEY  the project's publishable anon key
 *                             (Supabase dashboard → API keys, or
 *                             mcp__supabase-remote__get_publishable_keys)
 *
 * Usage:
 *   STAGE2_SUPABASE_URL=... STAGE2_SUPABASE_ANON_KEY=... \
 *     npx tsx scripts/stage2-retag/export-corpus.ts
 *
 * OQ5 handling (design doc §4 OQ5 lock; oq5-content-text-audit.md):
 * - EXCLUDED ghost stubs (273-char "Error processing lesson" rows, no body
 *   to read): lesson_ids in GHOST_STUB_LESSON_IDS.
 * - Who's Who in the Food System (WHOS_WHO_LESSON_ID): its stored
 *   content_text is a 462-char import-time extraction failure, but the live
 *   Google Doc holds the full ~3,300-char lesson. The body is fetched from
 *   the live Doc at export time per the oq5 §8.6 method
 *   (`mcp__google-workspace__get_doc_content`, user df@esynyc.org — the Doc
 *   is NOT link-public; its anonymous export endpoint returns 401, so an
 *   unauthenticated in-script fetch is impossible) and supplied to this
 *   script as the sidecar file `artifacts/whos-who-body.txt` (untracked, like
 *   every artifact). The script refuses to run if the sidecar is missing or
 *   stub-sized. NO DB write — the PROD content_text repair rides PR C.
 * - Normalization (every body, and titles for the same hygiene): strip
 *   vertical tabs (\x0B, the Google Docs soft-line-break artifact) and
 *   normalize \r\n / \r to \n.
 */
/* eslint-disable no-console -- CLI script: console output is the operator UI */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

import { MAIN_PASS_FIELDS, loadVocab } from './vocab';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS_DIR = path.join(MODULE_DIR, 'artifacts');
const OUTPUT_PATH = path.join(ARTIFACTS_DIR, 'corpus.jsonl');
const WHOS_WHO_BODY_PATH = path.join(ARTIFACTS_DIR, 'whos-who-body.txt');

/**
 * B3.5b body-override sidecar directory + manifest (generalizes the OQ5
 * Who's-Who single override). Each override id's real lesson body — fetched
 * READ-ONLY from its live Google Doc out-of-band — lives in an untracked
 * sidecar at `artifacts/body-overrides/<id>.txt`; the tracked manifest at
 * `data/body-overrides.json` lists the ids (so adding an override is a
 * data-only edit + a new sidecar). The export substitutes the sidecar body
 * for the stored content_text, exactly like Who's-Who.
 */
const BODY_OVERRIDES_DIR = path.join(ARTIFACTS_DIR, 'body-overrides');
export const BODY_OVERRIDES_MANIFEST_PATH = path.join(MODULE_DIR, 'data/body-overrides.json');

/** Per-override min body length sanity guard (mirrors the Who's-Who guard). */
export const MIN_OVERRIDE_BODY_CHARS = 2000;

/**
 * MCP census, 2026-06-12 (mcp__supabase-remote__execute_sql, PROD):
 *   SELECT count(*) FROM lessons WHERE retired_at IS NULL;  -- 767
 * The export hard-fails if the fetched row count differs.
 */
const EXPECTED_LIVE_ROWS = 767;

/** OQ5 ghost stubs — excluded from the corpus (verbatim from the OQ5 lock). */
const GHOST_STUB_LESSON_IDS: ReadonlySet<string> = new Set([
  '1l9KH63QBe2xhyH0zp6VIavtj0uKSRZtd',
  '1nFbpkwlujk8fIO8RkeIcDoO2fuO83Iil2Srf8t5iqm8',
]);

const EXPECTED_EXPORT_ROWS = EXPECTED_LIVE_ROWS - GHOST_STUB_LESSON_IDS.size; // 765

/** OQ5 body override — Who's Who in the Food System (verbatim id). */
const WHOS_WHO_LESSON_ID = '1n8wS0X-dXAw9sfQuLFgsMg_kNvACph3cT4yd9p2i1eg';
/** Stored stub is 462 chars; the live Doc body is ~3,300. */
const MIN_WHOS_WHO_BODY_CHARS = MIN_OVERRIDE_BODY_CHARS;

const PAGE_SIZE = 200;

/**
 * OQ5 normalization: strip \x0B; normalize \r\n and \r to \n.
 * (split/join for the VT strip: the no-control-regex lint rule forbids
 * control characters inside regular expressions.)
 */
export function normalizeBody(text: string): string {
  return text.split('\u000B').join('').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

// ---------------------------------------------------------------------------
// Body overrides (B3.5b — generalizes the OQ5 Who's-Who single override)
// ---------------------------------------------------------------------------

const bodyOverrideEntrySchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  doc_type: z.string().min(1),
  fetched_chars: z.number(),
});

/** One body-override entry from the tracked manifest. */
export type BodyOverrideEntry = z.infer<typeof bodyOverrideEntrySchema>;

const bodyOverridesManifestSchema = z.object({
  provenance: z.record(z.unknown()),
  overrides: z.array(bodyOverrideEntrySchema),
});

/**
 * Loads the tracked body-overrides manifest (data/body-overrides.json) — the
 * list of corpus records whose stored content_text is a stub/tag-card and must
 * be replaced by a sidecar body at export time. Returns the entries in file
 * order; rejects a duplicate id (a typo must fail loudly, never silently
 * override the wrong lesson's body). Same shape contract as
 * loadCorpusExclusions, so adding an override is a data-only edit.
 */
export function loadBodyOverridesManifest(filePath: string): BodyOverrideEntry[] {
  const parsed = bodyOverridesManifestSchema.parse(JSON.parse(readFileSync(filePath, 'utf8')));
  const seen = new Set<string>();
  for (const entry of parsed.overrides) {
    if (seen.has(entry.id)) {
      throw new Error(`body-overrides manifest has a duplicate id: ${entry.id}`);
    }
    seen.add(entry.id);
  }
  return parsed.overrides;
}

/**
 * Reads, normalizes, and min-length-guards an override sidecar body (the OQ5
 * Who's-Who guard, generalized). Throws a descriptive error when the sidecar
 * is missing (the operator must fetch the live Google Doc first) or stub-sized
 * (looks like the import-failure stub, not the real body).
 */
export function loadOverrideBody(
  sidecarPath: string,
  minChars: number = MIN_OVERRIDE_BODY_CHARS
): string {
  let raw: string;
  try {
    raw = readFileSync(sidecarPath, 'utf8');
  } catch {
    throw new Error(
      `missing sidecar ${sidecarPath} — fetch the live Google Doc body (READ-ONLY, ` +
        `df@esynyc.org) and save it there before exporting`
    );
  }
  const body = normalizeBody(raw).trim();
  if (body.length < minChars) {
    throw new Error(
      `override sidecar ${sidecarPath} body is ${body.length} chars (< ${minChars}) — ` +
        `looks like an import-failure stub or tag-card, not the live Doc body`
    );
  }
  return body;
}

/** Sidecar path for a manifest-driven override id. */
export function overrideSidecarPath(id: string): string {
  return path.join(BODY_OVERRIDES_DIR, `${id}.txt`);
}

/**
 * Builds the id → override-body map: the OQ5 Who's-Who override (its dedicated
 * sidecar) plus every manifest-driven B3.5b override (its `<id>.txt` sidecar).
 * Each body is read + normalized + min-length-guarded via loadOverrideBody. A
 * manifest id colliding with the built-in Who's-Who id fails loudly.
 */
export function loadBodyOverrides(
  manifestPath: string = BODY_OVERRIDES_MANIFEST_PATH
): Map<string, string> {
  const overrides = new Map<string, string>();
  // OQ5 built-in: Who's Who in the Food System.
  overrides.set(WHOS_WHO_LESSON_ID, loadOverrideBody(WHOS_WHO_BODY_PATH, MIN_WHOS_WHO_BODY_CHARS));
  for (const entry of loadBodyOverridesManifest(manifestPath)) {
    if (overrides.has(entry.id)) {
      throw new Error(`body-overrides manifest id ${entry.id} collides with a built-in override`);
    }
    overrides.set(entry.id, loadOverrideBody(overrideSidecarPath(entry.id)));
  }
  return overrides;
}

// ---------------------------------------------------------------------------
// Read-only data access (the ONLY database touchpoint in this script)
// ---------------------------------------------------------------------------

const vocab = loadVocab();

/** The 13 fields with a lessons text[] column, in canonical field order (all
 *  14 main-pass fields except academic_concepts, which is JSONB-only). */
const COLUMN_FIELDS = MAIN_PASS_FIELDS.filter((field) => vocab[field].column !== null);

const SELECT_LIST = [
  'lesson_id',
  'title',
  'content_text',
  ...COLUMN_FIELDS.map((field) => vocab[field].column as string),
  // academic_concepts has NO text[] column (vocab module's documented
  // exception) — it lives only at metadata->academicConcepts.
  `academic_concepts:metadata->${vocab.academic_concepts.jsonbKey}`,
].join(', ');

const rowShape: Record<string, z.ZodTypeAny> = {
  lesson_id: z.string().min(1),
  title: z.string(),
  content_text: z.string().min(1),
  academic_concepts: z.unknown(),
};
for (const field of COLUMN_FIELDS) {
  rowShape[vocab[field].column as string] = z.array(z.string()).nullable();
}
const rowSchema = z.object(rowShape);
type LessonRow = z.infer<typeof rowSchema>;

interface ReadOnlyLessonsSource {
  /** SELECT-only page fetch over the live corpus, ordered by lesson_id. */
  fetchLiveLessonsPage(from: number, to: number): Promise<LessonRow[]>;
}

/**
 * Builds one exported corpus record from a fetched lessons row + its resolved
 * body (already normalized / override-substituted by the caller). Pure: every
 * column-backed main-pass field's text[] column is copied (null preserved as
 * null), academic_concepts is taken from its JSONB selection. Because the field
 * list is derived from COLUMN_FIELDS (= MAIN_PASS_FIELDS with a non-null
 * column), any field added to the vocab with a column — e.g. the C02
 * cooking_skills / main_ingredients — round-trips here with no code change.
 */
export function buildCorpusRecord(row: LessonRow, body: string): Record<string, unknown> {
  const record: Record<string, unknown> = {
    id: row.lesson_id,
    title: normalizeBody(row.title),
    content_text: body,
  };
  for (const field of COLUMN_FIELDS) {
    record[field] = row[vocab[field].column as string] ?? null;
  }
  record.academic_concepts = row.academic_concepts ?? null;
  return record;
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

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const url = process.env.STAGE2_SUPABASE_URL;
  const anonKey = process.env.STAGE2_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error('❌ Missing environment variables');
    console.error('Required: STAGE2_SUPABASE_URL, STAGE2_SUPABASE_ANON_KEY (publishable anon key)');
    process.exit(1);
  }

  // OQ5 Who's-Who override + B3.5b manifest-driven overrides, all loaded,
  // normalized, and min-length-guarded BEFORE any DB read.
  const bodyOverrides = loadBodyOverrides();
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
  if (rows.length !== EXPECTED_LIVE_ROWS) {
    throw new Error(
      `live-row count mismatch: fetched ${rows.length}, MCP census says ${EXPECTED_LIVE_ROWS} — ` +
        `RLS may be hiding rows from the anon key, or the corpus changed; STOP and investigate`
    );
  }

  const ghostsSeen = rows.filter((row) => GHOST_STUB_LESSON_IDS.has(row.lesson_id));
  if (ghostsSeen.length !== GHOST_STUB_LESSON_IDS.size) {
    throw new Error(
      `expected ${GHOST_STUB_LESSON_IDS.size} ghost stubs in the live corpus, found ${ghostsSeen.length}`
    );
  }

  const overridesApplied = new Set<string>();
  const lines: string[] = [];
  for (const row of rows) {
    if (GHOST_STUB_LESSON_IDS.has(row.lesson_id)) continue;

    let body: string;
    const overrideBody = bodyOverrides.get(row.lesson_id);
    if (overrideBody !== undefined) {
      body = overrideBody;
      overridesApplied.add(row.lesson_id);
    } else {
      body = normalizeBody(row.content_text);
    }
    if (body.length === 0) {
      throw new Error(`empty body after normalization: ${row.lesson_id}`);
    }

    lines.push(JSON.stringify(buildCorpusRecord(row, body)));
  }

  // Every loaded override MUST have matched a live corpus row — a manifest id
  // (or the built-in Who's-Who id) absent from the corpus is a stale/typo'd
  // override and must fail loudly, not silently no-op.
  const missingOverrides = [...bodyOverrides.keys()].filter((id) => !overridesApplied.has(id));
  if (missingOverrides.length > 0) {
    throw new Error(
      `body-override id(s) not found in the live corpus: ${missingOverrides.join(', ')} — ` +
        `stale or mistyped override entry; STOP and investigate`
    );
  }
  if (lines.length !== EXPECTED_EXPORT_ROWS) {
    throw new Error(
      `export count mismatch: ${lines.length} records, expected ${EXPECTED_EXPORT_ROWS}`
    );
  }

  mkdirSync(ARTIFACTS_DIR, { recursive: true });
  writeFileSync(OUTPUT_PATH, `${lines.join('\n')}\n`, 'utf8');

  console.log(`✅ Wrote ${lines.length} records to ${OUTPUT_PATH}`);
  console.log(`   excluded ghost stubs: ${[...GHOST_STUB_LESSON_IDS].join(', ')}`);
  console.log(
    `   body overrides applied (${overridesApplied.size}): ${[...overridesApplied].join(', ')}`
  );
}

const isDirectInvocation =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectInvocation) {
  main().catch((error: unknown) => {
    console.error('❌ Export failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
