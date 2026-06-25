/* eslint-disable no-console -- CLI script: console output is the operator UI */
/**
 * Re-reconcile a STORED C02 run (design §3·PIVOT D-P6 / impl P2′.6 round 4).
 *
 * The pilot's expensive part is the LLM call; the cheap part is the deterministic
 * floor + reconcile that turns the model's raw KEEP/DROP/ADD decision into the
 * `finalC02` arrays. When a reconcile-policy lever changes (e.g. extending the
 * D-P1 keep-only lock to all main_ingredient specifics), we can measure its EXACT
 * effect on a past run WITHOUT a fresh, costly LLM call: re-run only the
 * deterministic stage over the STORED decisions.
 *
 * This script reconstructs the live reconcile inputs EXACTLY as `run-retag.ts`'s
 * `runMainPass` does — `loadC02FloorInput()` (the one canonical floor) +
 * `buildC02EffectiveInput(lesson, floorInput, manifestVersion)` to floor the
 * lesson's CURRENT tags into the anchor, then `processC02Decision({ apiInput,
 * floored, floorInput, decisionSchema, finalSchema })` (the same pure flow:
 * normalize {skipC02} → decision schema → floor+reconcile → finalC02 canonical).
 * The `apiInput` is the record's stored `rawInput` (the raw decision object the
 * normalize+decision-schema stages consumed live); feeding it back through the
 * unchanged flow is idempotent, which the `--golden` mode PROVES: against an
 * UNCHANGED reconcile.ts every regenerated `finalC02` must deep-equal the stored
 * one. A passing golden check is the A/B's validity proof — only then is a
 * regenerated run a faithful "what if the lock had been wider" counterfactual.
 *
 * USAGE
 *   # validity check (no write): regenerate must equal stored, byte-for-byte
 *   npx tsx scripts/stage2-retag/rereconcile-run.ts --in <run.jsonl> --golden
 *   # produce a re-reconciled run under a CHANGED reconcile policy
 *   npx tsx scripts/stage2-retag/rereconcile-run.ts --in <run.jsonl> --out <run.jsonl>
 *
 * Only `finalC02` is regenerated; every other field on each record is preserved
 * verbatim (the raw decision, usage, cost, hashes — all unchanged). Error records
 * (`error !== null`) are passed through untouched (no decision to reconcile).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildC02DecisionSchema, buildC02FinalSchema } from './schema';
import { loadVocab, loadC02Manifest } from './vocab';
import { loadC02FloorInput } from './c02-floor';
import { c02ManifestVersion } from './c02-anchor';
import { assertCorpusHasC02Tags } from './sample-answer-key';
import {
  buildC02EffectiveInput,
  corpusLineSchema,
  parseRunRecords,
  processC02Decision,
  type CorpusRecord,
  type RunRecord,
} from './run-retag';
import type { C02FinalTags } from './reconcile';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CORPUS_PATH = path.join(MODULE_DIR, 'artifacts/corpus.jsonl');

interface Args {
  in: string;
  out?: string;
  golden: boolean;
  corpus: string;
  help: boolean;
}

export function parseArgs(argv: string[]): Args {
  const args: Args = { in: '', golden: false, corpus: DEFAULT_CORPUS_PATH, help: false };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const next = argv[i + 1];
    switch (flag) {
      case '--in':
        if (next === undefined) throw new Error('--in requires a path');
        args.in = next;
        i++;
        break;
      case '--out':
        if (next === undefined) throw new Error('--out requires a path');
        args.out = next;
        i++;
        break;
      case '--corpus':
        if (next === undefined) throw new Error('--corpus requires a path');
        args.corpus = next;
        i++;
        break;
      case '--golden':
        args.golden = true;
        break;
      case '--help':
      case '-h':
        args.help = true;
        break;
      default:
        throw new Error(`unknown flag: ${flag}`);
    }
  }
  return args;
}

const USAGE = `Re-reconcile a stored C02 run over the SAME decisions (no LLM call).

  --in <path>      input run-output JSONL (required)
  --out <path>     write a re-reconciled run JSONL (finalC02 regenerated)
  --golden         assert every regenerated finalC02 deep-equals the stored one
                   (no write); prints "N/M match" and exits nonzero on any miss
  --corpus <path>  corpus JSONL with current tags (default artifacts/corpus.jsonl)

Exactly one of --out / --golden is required.`;

/** Load the corpus and index by lesson id (current tags → the floor anchor). */
function loadCorpusById(corpusPath: string): Map<string, CorpusRecord> {
  const text = readFileSync(corpusPath, 'utf8');
  const byId = new Map<string, CorpusRecord>();
  text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .forEach((line, index) => {
      let record: CorpusRecord;
      try {
        record = corpusLineSchema.parse(JSON.parse(line));
      } catch (e) {
        throw new Error(
          `corpus line ${index + 1} is malformed: ${e instanceof Error ? e.message : String(e)}`
        );
      }
      byId.set(record.id, record);
    });
  // Freshness guard (mirror run-retag.ts `loadCorpus`): fail loudly if the
  // corpus predates the C02 export. Without it, a stale corpus would silently
  // anchor rows as untagged → wrong `finalC02` in the `--out` file with no
  // indication anything was wrong (claude-review PR #543).
  assertCorpusHasC02Tags([...byId.values()], corpusPath);
  return byId;
}

/** Order-sensitive deep equality for the two finalC02 arrays (or both absent). */
function finalC02Equal(a: C02FinalTags | undefined, b: C02FinalTags | undefined): boolean {
  if (a === undefined && b === undefined) return true;
  if (a === undefined || b === undefined) return false;
  const eqArr = (x: string[], y: string[]): boolean =>
    x.length === y.length && x.every((v, i) => v === y[i]);
  return eqArr(a.cooking_skills, b.cooking_skills) && eqArr(a.main_ingredients, b.main_ingredients);
}

interface RegenResult {
  /** The record with finalC02 regenerated (error/legacy records pass through). */
  record: RunRecord;
  /** True for a non-error C02 record we actually re-reconciled. */
  reconciled: boolean;
  /** The regenerated finalC02 (undefined when the decision fails validation). */
  regenerated?: C02FinalTags;
}

/**
 * Re-run the deterministic floor+reconcile stage for ONE record, mirroring the
 * live `runMainPass` reconstruction. Error records and records lacking a raw
 * decision pass through unchanged.
 */
function regenerateRecord(
  record: RunRecord,
  corpusById: Map<string, CorpusRecord>,
  floorInput: ReturnType<typeof loadC02FloorInput>,
  manifestVersion: string,
  decisionSchema: ReturnType<typeof buildC02DecisionSchema>,
  finalSchema: ReturnType<typeof buildC02FinalSchema>
): RegenResult {
  if (record.error !== null) return { record, reconciled: false };

  const lesson = corpusById.get(record.id);
  if (lesson === undefined) {
    throw new Error(
      `record id ${record.id} is not in the corpus — cannot reconstruct its floor anchor`
    );
  }

  // Mirror the live path: floor the lesson's CURRENT tags into the anchor, then
  // run the SAME pure decision flow over the stored raw decision (rawInput).
  const { floored } = buildC02EffectiveInput(lesson, floorInput, manifestVersion);
  const outcome = processC02Decision({
    apiInput: record.rawInput,
    floored,
    floorInput,
    decisionSchema,
    finalSchema,
  });

  // Regenerate finalC02 ONLY; preserve every other field verbatim.
  const regenerated = outcome.finalC02;
  const nextRecord: RunRecord =
    regenerated !== undefined
      ? { ...record, finalC02: regenerated }
      : // a decision that fails validation has no finalC02 — drop the stored one
        // so the regenerated record matches the live "validation failure" shape.
        (() => {
          const { finalC02: _drop, ...rest } = record;
          void _drop;
          return rest as RunRecord;
        })();

  return { record: nextRecord, reconciled: true, regenerated };
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(USAGE);
    return;
  }
  if (!args.in) throw new Error(`--in is required\n\n${USAGE}`);
  if (!args.golden && args.out === undefined) {
    throw new Error(`exactly one of --out / --golden is required\n\n${USAGE}`);
  }
  if (args.golden && args.out !== undefined) {
    throw new Error(`--golden does not write; drop --out\n\n${USAGE}`);
  }

  const records = parseRunRecords(readFileSync(args.in, 'utf8'));
  const corpusById = loadCorpusById(args.corpus);
  const vocab = loadVocab();
  const floorInput = loadC02FloorInput();
  const manifestVersion = c02ManifestVersion(loadC02Manifest());
  const decisionSchema = buildC02DecisionSchema(vocab);
  const finalSchema = buildC02FinalSchema(vocab);

  if (args.golden) {
    let matched = 0;
    let total = 0;
    const mismatches: string[] = [];
    for (const record of records) {
      if (record.error !== null) continue;
      total++;
      const { regenerated } = regenerateRecord(
        record,
        corpusById,
        floorInput,
        manifestVersion,
        decisionSchema,
        finalSchema
      );
      if (finalC02Equal(regenerated, record.finalC02)) {
        matched++;
      } else {
        mismatches.push(record.id);
      }
    }
    console.log(`${matched}/${total} match`);
    if (mismatches.length > 0) {
      console.error(`MISMATCH on ${mismatches.length} record(s): ${mismatches.join(', ')}`);
      process.exit(1);
    }
    return;
  }

  // --out: regenerate finalC02 on every C02 record, preserving line order.
  let reconciled = 0;
  const lines = records.map((record) => {
    const result = regenerateRecord(
      record,
      corpusById,
      floorInput,
      manifestVersion,
      decisionSchema,
      finalSchema
    );
    if (result.reconciled) reconciled++;
    return JSON.stringify(result.record);
  });
  const out = args.out as string;
  mkdirSync(path.dirname(out), { recursive: true });
  if (existsSync(out) && path.resolve(out) === path.resolve(args.in)) {
    throw new Error('--out must differ from --in (refusing to overwrite the input)');
  }
  writeFileSync(out, lines.length > 0 ? `${lines.join('\n')}\n` : '', 'utf8');
  console.log(`Re-reconciled ${reconciled}/${records.length} record(s) → ${out}`);
}

// Run only when invoked directly (not when imported by a test).
const INVOKED_DIRECTLY =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (INVOKED_DIRECTLY) main();
