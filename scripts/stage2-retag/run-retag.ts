#!/usr/bin/env npx tsx
/* eslint-disable no-console -- CLI script: console output is the operator UI */
/**
 * Stage 2 re-tag — task A6: the synchronous monolithic runner.
 *
 * Reads `artifacts/corpus.jsonl` (task A4) and makes ONE monolithic
 * enum-forced API call per lesson, mirroring (never extending) the canonical
 * PROD call shape verified in
 * `docs/plans/pr6-stage2-retag-evidence/oq1-call-shape-confirmation.md` §2:
 * bare `new Anthropic({ apiKey })`, `system` array block + the single forced
 * `submit_tags` tool EACH carrying `cache_control: {type:'ephemeral'}` (two
 * breakpoints: prefix = prompt + tool schema cached across calls), enums
 * inline in `input_schema`, `tool_choice: {type:'tool', name:'submit_tags'}`,
 * single user turn = the lesson body, post-hoc Zod validation (enum adherence
 * is NOT server-guaranteed), SDK default retries, concurrency 5
 * (`mapWithConcurrency`, eval-script precedent).
 *
 * Flags:
 *   --model <id>        default claude-opus-4-7
 *   --limit N           only process the first N corpus records (dry-run)
 *   --resume            skip ids already in the output JSONL whose latest
 *                       record carries the CURRENT prompt+schema hash, the
 *                       same model, and no error (a prompt/schema edit
 *                       changes the hash and invalidates resume-merging)
 *   --output <path>     output JSONL (default artifacts/retag-run.jsonl)
 *   --repair            repair mode: re-run ONLY Zod-failed fields of
 *                       existing records as per-field calls and append
 *                       merged, provenance-marked records (see below)
 *   --concurrency N     parallel API calls (default 5)
 *   --strict            set `strict: true` on the tool definition(s)
 *   --help
 *
 * Output: appends one JSON line per lesson to the output file:
 *   { id, phase: 'main'|'repair', model, promptSchemaHash, rawInput,
 *     zod: { passed, fieldErrors }, usage (incl. cache_creation/cache_read
 *     counters), costUsd, latencyMs, error, repairs? (repair phase only,
 *     per-field provenance), completedAt }
 *
 * Repair pass (`--repair`): for every latest-per-id record that completed
 * without an API error but failed Zod, each failed top-level field is re-run
 * as a per-field call — today's PROD shape verbatim (single-field forced
 * tool, the field's own `###` prompt section atop the shared preamble, same
 * two cache breakpoints). Flat enum fields + grade_levels use the PROD
 * `selected_values` schema; `academic_concepts` (subject-keyed object — no
 * flat-enum PROD equivalent exists) uses its own single-property tool built
 * from the monolithic schema's `$defs`. Repaired values are merged into the
 * record's rawInput, re-validated against the full Zod result schema, and
 * appended as a NEW record with `phase: 'repair'` and a per-field `repairs`
 * provenance map ({ previous, repaired, usage, costUsd, latencyMs, error }).
 *
 * `strict: true` finding (task A6 check): the installed @anthropic-ai/sdk
 * 0.95.0 DOES type `strict?: boolean` on tool definitions ("guarantees
 * schema validation on tool names and inputs"). It is wired behind the
 * --strict flag, DEFAULT OFF: (a) the canonical PROD shape doesn't use it
 * (mirror, don't extend); (b) strict-mode schema compilation rejects some
 * JSON Schema keywords (string/array constraints like minLength/minItems —
 * documented structured-outputs limitations) that this tool's input_schema
 * carries, and with zero Console credits the rejection behavior can't be
 * live-verified tonight; (c) post-hoc Zod + the repair pass are the
 * enforcement gate regardless (design §6).
 *
 * API key: ANTHROPIC_CONSOLE_API_KEY from `.env.local` — NOT
 * ANTHROPIC_API_KEY, which is the CLIProxyAPI proxy-side key and 401s
 * against the direct API (Session-1 finding).
 *
 * DEFERRED LIVE CHECK (task A8, single command — Console credits required):
 *
 *   npx tsx scripts/stage2-retag/run-retag.ts --limit 3 --concurrency 1
 *
 *   Expected: 3 Zod-valid records; record 1 pays the cache write
 *   (cache_creation_input_tokens ≈ the ~6-8K prefix mass, cache_read 0);
 *   records 2-3 MUST show cache_read_input_tokens > 0. `--concurrency 1` is
 *   load-bearing for the check: parallel first calls cannot read a cache
 *   entry that is still being written.
 *
 * Zero-credit billing-error capture (the one allowed live attempt,
 * 2026-06-12, `--limit 1`, OBSERVED): the record landed in the output JSONL
 * as a clean per-lesson error (rawInput null, usage null, costUsd null,
 * zod {passed:false, fieldErrors:null}) with error string verbatim:
 *   `HTTP 400: 400 {"type":"error","error":{"type":"invalid_request_error",
 *   "message":"Your credit balance is too low to access the Anthropic API.
 *   Please go to Plans & Billing to upgrade or purchase credits."},
 *   "request_id":"req_011CbxqmRYdqNpc8xdXCGfiW"}`
 * The SDK made no retries (400s are non-retryable) and the runner exited 0.
 * Errored records are NOT --resume-skippable, so the same lesson re-runs
 * once credits exist — do not re-attempt before then.
 */
import { createHash } from 'node:crypto';
import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import dotenv from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

import {
  DEFAULT_MODEL,
  GRADE_LEVELS,
  RESULT_PROPERTIES,
  SUBMIT_TAGS_TOOL_NAME,
  buildResultSchema,
  buildSubmitTagsTool,
  loadSystemPrompt,
  type SubmitTagsTool,
} from './schema';
import { MAIN_PASS_FIELDS, loadVocab, type MainPassField, type Stage2Vocab } from './vocab';

dotenv.config({ path: '.env.local' });

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS_DIR = path.join(MODULE_DIR, 'artifacts');
const CORPUS_PATH = path.join(ARTIFACTS_DIR, 'corpus.jsonl');
const DEFAULT_OUTPUT_PATH = path.join(ARTIFACTS_DIR, 'retag-run.jsonl');

/**
 * Output budget for the ~13-property monolithic response. The PROD per-field
 * calls use 1024; the monolithic output (13 fields incl. the dual-vocab
 * concepts object + synonym pairs) needs roughly 3-4x that. 4096 stays well
 * under the non-streaming SDK-timeout guidance (~16K).
 */
export const MAX_TOKENS = 4096;

/**
 * Published per-MTok pricing (USD), verified 2026-06-12 against the
 * Anthropic models/pricing documentation:
 *   claude-opus-4-7:   $5 input / $25 output
 *   claude-sonnet-4-6: $3 input / $15 output
 * Cache economics (prompt-caching docs): cache WRITE = 1.25x input for the
 * 5-minute TTL (`cache_control: {type:'ephemeral'}`, what this runner uses);
 * cache READ = 0.1x input. Both dry-run contestants (impl-plan A8) are
 * covered; an unknown model yields `costUsd: null` rather than a wrong
 * number.
 */
export const PRICING_PER_MTOK: Record<
  string,
  { input: number; output: number; cacheWrite5m: number; cacheRead: number }
> = {
  'claude-opus-4-7': { input: 5, output: 25, cacheWrite5m: 6.25, cacheRead: 0.5 },
  'claude-sonnet-4-6': { input: 3, output: 15, cacheWrite5m: 3.75, cacheRead: 0.3 },
};

// ---------------------------------------------------------------------------
// Record shapes
// ---------------------------------------------------------------------------

export interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

export interface ZodOutcome {
  passed: boolean;
  /** Per-top-level-field error messages; `null` when passed or never parsed. */
  fieldErrors: Record<string, string[]> | null;
}

export interface RepairOutcome {
  previous: unknown;
  repaired: unknown;
  usage: AnthropicUsage | null;
  costUsd: number | null;
  latencyMs: number | null;
  error: string | null;
}

export interface RunRecord {
  id: string;
  phase: 'main' | 'repair';
  model: string;
  promptSchemaHash: string;
  /** Raw tool_use input (repair phase: the repair-merged object). */
  rawInput: unknown;
  zod: ZodOutcome;
  usage: AnthropicUsage | null;
  costUsd: number | null;
  latencyMs: number | null;
  error: string | null;
  /** Repair phase only: per-field provenance for every attempted repair. */
  repairs?: Record<string, RepairOutcome>;
  completedAt: string;
}

// ---------------------------------------------------------------------------
// Pure helpers (unit-tested in run-retag.test.ts — no network)
// ---------------------------------------------------------------------------

/**
 * Stable identity hash over the cached prefix (system prompt + serialized
 * tool). Any edit to the prompt, the enum lists, or the schema shape changes
 * the hash, which invalidates `--resume` merging and repair eligibility.
 * The model is deliberately NOT part of the hash — it is recorded on the
 * record and matched separately.
 */
export function computePromptSchemaHash(systemPrompt: string, tool: SubmitTagsTool): string {
  return createHash('sha256')
    .update(systemPrompt)
    .update(' ')
    .update(JSON.stringify(tool))
    .digest('hex');
}

/** Groups Zod issues by top-level property ('_root' for object-level issues). */
export function fieldErrorsFromZod(error: z.ZodError): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : '_root';
    const where = issue.path.length > 0 ? issue.path.join('.') : '(object)';
    (fieldErrors[key] ??= []).push(`${where}: ${issue.message}`);
  }
  return fieldErrors;
}

export function validateRawInput(
  resultSchema: ReturnType<typeof buildResultSchema>,
  rawInput: unknown
): ZodOutcome {
  const parsed = resultSchema.safeParse(rawInput);
  if (parsed.success) return { passed: true, fieldErrors: null };
  return { passed: false, fieldErrors: fieldErrorsFromZod(parsed.error) };
}

/** Per-record cost in USD from the rate table; `null` for unknown models. */
export function computeCostUsd(model: string, usage: AnthropicUsage | null): number | null {
  if (!usage) return null;
  const rates = PRICING_PER_MTOK[model];
  if (!rates) return null;
  return (
    (usage.input_tokens * rates.input +
      usage.output_tokens * rates.output +
      (usage.cache_creation_input_tokens ?? 0) * rates.cacheWrite5m +
      (usage.cache_read_input_tokens ?? 0) * rates.cacheRead) /
    1_000_000
  );
}

export function buildRunRecord(params: {
  id: string;
  phase: 'main' | 'repair';
  model: string;
  promptSchemaHash: string;
  rawInput: unknown;
  zod: ZodOutcome;
  usage: AnthropicUsage | null;
  latencyMs: number | null;
  error: string | null;
  repairs?: Record<string, RepairOutcome>;
}): RunRecord {
  return {
    id: params.id,
    phase: params.phase,
    model: params.model,
    promptSchemaHash: params.promptSchemaHash,
    rawInput: params.rawInput,
    zod: params.zod,
    usage: params.usage,
    costUsd: computeCostUsd(params.model, params.usage),
    latencyMs: params.latencyMs,
    error: params.error,
    ...(params.repairs !== undefined ? { repairs: params.repairs } : {}),
    completedAt: new Date().toISOString(),
  };
}

/** Loose line schema for reading existing output (tolerates older extras). */
const runRecordLineSchema = z
  .object({
    id: z.string().min(1),
    phase: z.enum(['main', 'repair']),
    model: z.string().min(1),
    promptSchemaHash: z.string().min(1),
    rawInput: z.unknown(),
    zod: z.object({
      passed: z.boolean(),
      fieldErrors: z.record(z.array(z.string())).nullable(),
    }),
    usage: z
      .object({
        input_tokens: z.number(),
        output_tokens: z.number(),
        cache_creation_input_tokens: z.number().nullable().optional(),
        cache_read_input_tokens: z.number().nullable().optional(),
      })
      .nullable(),
    costUsd: z.number().nullable(),
    latencyMs: z.number().nullable(),
    error: z.string().nullable(),
    repairs: z.record(z.unknown()).optional(),
    completedAt: z.string(),
  })
  .passthrough();

/** Parses an output JSONL text into records, skipping malformed lines. */
export function parseRunRecords(jsonlText: string): RunRecord[] {
  const records: RunRecord[] = [];
  for (const line of jsonlText.split('\n')) {
    if (line.trim() === '') continue;
    let raw: unknown;
    try {
      raw = JSON.parse(line);
    } catch {
      console.warn('  skipping malformed output line (not JSON)');
      continue;
    }
    const parsed = runRecordLineSchema.safeParse(raw);
    if (!parsed.success) {
      console.warn('  skipping malformed output line (wrong record shape)');
      continue;
    }
    records.push(parsed.data as RunRecord);
  }
  return records;
}

/** Latest record per id, in file order (later lines win). */
export function latestRecordById(records: RunRecord[]): Map<string, RunRecord> {
  const byId = new Map<string, RunRecord>();
  for (const record of records) byId.set(record.id, record);
  return byId;
}

/**
 * Ids `--resume` may skip: the latest record for the id carries the CURRENT
 * prompt+schema hash, the same model, and completed without an API error.
 * (Zod-failed records still count as done — the repair pass owns those.)
 * Hash or model mismatches re-run the lesson.
 */
export function computeResumableIds(
  records: RunRecord[],
  currentHash: string,
  model: string
): Set<string> {
  const resumable = new Set<string>();
  for (const [id, record] of latestRecordById(records)) {
    if (
      record.promptSchemaHash === currentHash &&
      record.model === model &&
      record.error === null
    ) {
      resumable.add(id);
    }
  }
  return resumable;
}

/** The repairable top-level properties out of a failed Zod outcome. */
export function planRepairs(zod: ZodOutcome): string[] {
  if (zod.passed || zod.fieldErrors === null) return [];
  const failed = new Set(Object.keys(zod.fieldErrors));
  return RESULT_PROPERTIES.filter((property) => failed.has(property));
}

/**
 * Repair system prompt: the shared preamble (everything above the
 * "## Field-by-field rules" heading) + ONLY the failed field's `###`
 * section — "same prompt section" per the impl plan's A6 repair spec.
 */
export function extractFieldPromptSection(systemPrompt: string, field: string): string {
  const rulesHeading = '## Field-by-field rules';
  const rulesIdx = systemPrompt.indexOf(rulesHeading);
  if (rulesIdx === -1) {
    throw new Error(`system prompt has no "${rulesHeading}" heading`);
  }
  const preamble = systemPrompt.slice(0, rulesIdx).trimEnd();
  const rules = systemPrompt.slice(rulesIdx);
  const headingMatch = new RegExp(`^### ${field}(?:\\s|$)`, 'm').exec(rules);
  if (!headingMatch) {
    throw new Error(`system prompt has no "### ${field}" section`);
  }
  const sectionStart = headingMatch.index;
  const afterHeading = rules.slice(sectionStart + '### '.length);
  const nextHeadingRel = afterHeading.search(/^##+ /m);
  const section =
    nextHeadingRel === -1
      ? rules.slice(sectionStart)
      : rules.slice(sectionStart, sectionStart + '### '.length + nextHeadingRel);
  return `${preamble}\n\n${rulesHeading}\n\n${section.trimEnd()}\n`;
}

interface RepairFieldSpec {
  label: string;
  kind: 'flat' | 'concepts';
  values: readonly string[];
}

/** Field → repair vocab/label/kind (covers the 12 vocab fields + grades). */
export function repairFieldSpec(vocab: Stage2Vocab, field: string): RepairFieldSpec {
  if (field === 'academic_concepts') {
    return { label: vocab.academic_concepts.label, kind: 'concepts', values: [] };
  }
  if (field === 'grade_levels') {
    return { label: 'Grade Levels', kind: 'flat', values: GRADE_LEVELS };
  }
  if ((MAIN_PASS_FIELDS as readonly string[]).includes(field)) {
    const fieldVocab = vocab[field as MainPassField];
    return { label: fieldVocab.label, kind: 'flat', values: fieldVocab.values };
  }
  throw new Error(`not a repairable field: ${field}`);
}

/**
 * Builds the per-field repair tool. Flat fields (the 11 enum arrays +
 * grade_levels) use today's PROD multi-label shape VERBATIM
 * (`selected_values` enum array, uniqueItems, required). `academic_concepts`
 * has no flat-enum PROD equivalent, so its repair tool is the monolithic
 * schema's own subject-keyed property as the single required property
 * (same single-field forced-tool call shape).
 */
export function buildRepairTool(
  vocab: Stage2Vocab,
  field: string,
  strict = false
): Anthropic.Messages.Tool {
  const spec = repairFieldSpec(vocab, field);
  const inputSchema: Anthropic.Messages.Tool.InputSchema =
    spec.kind === 'flat'
      ? {
          type: 'object',
          properties: {
            selected_values: {
              type: 'array',
              items: { type: 'string', enum: [...spec.values] },
              uniqueItems: true,
            },
          },
          required: ['selected_values'],
        }
      : (() => {
          const full = buildSubmitTagsTool(vocab).input_schema;
          return {
            type: 'object',
            $defs: full.$defs,
            properties: { academic_concepts: full.properties.academic_concepts },
            required: ['academic_concepts'],
            additionalProperties: false,
          };
        })();
  return {
    name: SUBMIT_TAGS_TOOL_NAME,
    description: `Submit the selected ${spec.label} value(s) for the lesson.`,
    input_schema: inputSchema,
    cache_control: { type: 'ephemeral' },
    ...(strict ? { strict: true } : {}),
  };
}

/** Extracts the repaired field value from a repair call's tool_use input. */
export function extractRepairedValue(field: string, input: Record<string, unknown>): unknown {
  if (field === 'academic_concepts') return input.academic_concepts;
  const v = input.selected_values;
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/**
 * Merges successful repairs into the record's raw tool input. Fields whose
 * repair call errored keep their previous (failed) value so the failure
 * stays visible.
 */
export function mergeRepairedFields(
  rawInput: unknown,
  repairs: Record<string, RepairOutcome>
): Record<string, unknown> {
  if (typeof rawInput !== 'object' || rawInput === null || Array.isArray(rawInput)) {
    throw new Error('cannot merge repairs into a non-object rawInput');
  }
  const merged: Record<string, unknown> = { ...(rawInput as Record<string, unknown>) };
  for (const [field, outcome] of Object.entries(repairs)) {
    if (outcome.error === null) merged[field] = outcome.repaired;
  }
  return merged;
}

/** Worker-pool map (eval-script precedent, default concurrency 5). */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const worker = async (): Promise<void> => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  };
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

interface Args {
  model: string;
  limit?: number;
  resume: boolean;
  output: string;
  repair: boolean;
  concurrency: number;
  strict: boolean;
  help: boolean;
}

export function parseArgs(argv: string[]): Args {
  const a: Args = {
    model: DEFAULT_MODEL,
    resume: false,
    output: DEFAULT_OUTPUT_PATH,
    repair: false,
    concurrency: 5,
    strict: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const next = argv[i + 1];
    switch (flag) {
      case '--model':
        a.model = next;
        i++;
        break;
      case '--limit':
        a.limit = parseInt(next, 10);
        i++;
        break;
      case '--resume':
        a.resume = true;
        break;
      case '--output':
        a.output = next;
        i++;
        break;
      case '--repair':
        a.repair = true;
        break;
      case '--concurrency':
        a.concurrency = parseInt(next, 10);
        i++;
        break;
      case '--strict':
        a.strict = true;
        break;
      case '--help':
      case '-h':
        a.help = true;
        break;
      default:
        throw new Error(`unknown flag: ${flag} (use --help for usage)`);
    }
  }
  return a;
}

const HELP = `
Stage 2 re-tag runner (task A6) — one monolithic enum-forced call per lesson.

Usage:
  npx tsx scripts/stage2-retag/run-retag.ts [flags]

Flags:
  --model <id>       Anthropic model ID (default ${DEFAULT_MODEL})
  --limit <N>        only process the first N corpus records (dry-run)
  --resume           skip ids already in the output JSONL (same prompt+schema
                     hash + same model + no error; a prompt edit re-runs all)
  --output <path>    output JSONL (default scripts/stage2-retag/artifacts/retag-run.jsonl)
  --repair           repair mode: per-field re-runs of Zod-failed fields,
                     merged + provenance-marked (appends phase:'repair' records)
  --concurrency <N>  parallel API calls (default 5)
  --strict           set strict:true on the tool definition(s) (off by default;
                     Zod + repair remain the enforcement gate regardless)
  --help

Env: ANTHROPIC_CONSOLE_API_KEY required (from .env.local). Do NOT use
     ANTHROPIC_API_KEY — it is the CLIProxyAPI proxy-side key and 401s
     against the direct API.

Deferred A8 live check (single command, needs Console credits):
  npx tsx scripts/stage2-retag/run-retag.ts --limit 3 --concurrency 1
  (record 1 pays the cache write; records 2-3 must show cache_read_input_tokens > 0)
`;

// ---------------------------------------------------------------------------
// API plumbing
// ---------------------------------------------------------------------------

const corpusLineSchema = z.object({ id: z.string().min(1), content_text: z.string().min(1) });
type CorpusRecord = z.infer<typeof corpusLineSchema>;

function loadCorpus(): CorpusRecord[] {
  const text = readFileSync(CORPUS_PATH, 'utf8');
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line, index) => {
      try {
        return corpusLineSchema.parse(JSON.parse(line));
      } catch (e) {
        throw new Error(
          `corpus line ${index + 1} is malformed: ${e instanceof Error ? e.message : String(e)}`
        );
      }
    });
}

function createApiClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_CONSOLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_CONSOLE_API_KEY missing from .env.local (do NOT use ANTHROPIC_API_KEY — ' +
        'it is the CLIProxyAPI proxy-side key and 401s against the direct API).'
    );
  }
  // Bare constructor (canonical shape); no maxRetries override = SDK default
  // retries (429/5xx only — billing 400s are never retried).
  return new Anthropic({ apiKey });
}

function errorMessage(e: unknown): string {
  if (e instanceof Anthropic.APIError) return `HTTP ${e.status}: ${e.message}`;
  return e instanceof Error ? e.message : String(e);
}

interface CallResult {
  rawInput: unknown;
  usage: AnthropicUsage;
  latencyMs: number;
}

/** One forced-tool call in the canonical shape; returns the raw tool input. */
async function callForcedTool(
  client: Anthropic,
  model: string,
  systemPrompt: string,
  tool: Anthropic.Messages.Tool | SubmitTagsTool,
  body: string
): Promise<CallResult> {
  const startedAt = Date.now();
  const response = await client.messages.create({
    model,
    max_tokens: MAX_TOKENS,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }],
    tools: [tool as Anthropic.Messages.Tool],
    tool_choice: { type: 'tool', name: SUBMIT_TAGS_TOOL_NAME },
    messages: [{ role: 'user', content: body }],
  });
  const latencyMs = Date.now() - startedAt;
  for (const block of response.content) {
    if (block.type === 'tool_use' && block.name === SUBMIT_TAGS_TOOL_NAME) {
      return { rawInput: block.input, usage: response.usage as AnthropicUsage, latencyMs };
    }
  }
  throw new Error(`response carried no ${SUBMIT_TAGS_TOOL_NAME} tool_use block`);
}

function appendRecord(outputPath: string, record: RunRecord): void {
  appendFileSync(outputPath, `${JSON.stringify(record)}\n`, 'utf8');
}

// ---------------------------------------------------------------------------
// Main pass
// ---------------------------------------------------------------------------

async function runMainPass(args: Args): Promise<void> {
  const vocab = loadVocab();
  const systemPrompt = loadSystemPrompt();
  const baseTool = buildSubmitTagsTool(vocab);
  const tool: SubmitTagsTool & { strict?: boolean } = args.strict
    ? { ...baseTool, strict: true }
    : baseTool;
  // Hash is over the canonical (non-strict) tool so --strict toggling alone
  // does not invalidate resume; the wire schema content is identical.
  const promptSchemaHash = computePromptSchemaHash(systemPrompt, baseTool);
  const resultSchema = buildResultSchema(vocab);

  let lessons = loadCorpus();
  if (args.limit !== undefined) lessons = lessons.slice(0, args.limit);

  if (args.resume && existsSync(args.output)) {
    const existing = parseRunRecords(readFileSync(args.output, 'utf8'));
    const resumable = computeResumableIds(existing, promptSchemaHash, args.model);
    const before = lessons.length;
    lessons = lessons.filter((lesson) => !resumable.has(lesson.id));
    console.log(`Resume: skipping ${before - lessons.length} already-completed ids.`);
  }

  if (lessons.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  const client = createApiClient();
  mkdirSync(path.dirname(args.output), { recursive: true });

  console.log(
    `Calling ${args.model} for ${lessons.length} lessons ` +
      `(concurrency ${args.concurrency}${args.strict ? ', strict tools' : ''}) → ${args.output}`
  );

  let done = 0;
  let zodPassed = 0;
  let zodFailed = 0;
  let errored = 0;
  let totalCostUsd = 0;
  const totalUsage: AnthropicUsage = {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  };

  await mapWithConcurrency(lessons, args.concurrency, async (lesson) => {
    let record: RunRecord;
    try {
      const { rawInput, usage, latencyMs } = await callForcedTool(
        client,
        args.model,
        systemPrompt,
        tool,
        lesson.content_text
      );
      const zod = validateRawInput(resultSchema, rawInput);
      record = buildRunRecord({
        id: lesson.id,
        phase: 'main',
        model: args.model,
        promptSchemaHash,
        rawInput,
        zod,
        usage,
        latencyMs,
        error: null,
      });
      totalUsage.input_tokens += usage.input_tokens;
      totalUsage.output_tokens += usage.output_tokens;
      totalUsage.cache_creation_input_tokens =
        (totalUsage.cache_creation_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0);
      totalUsage.cache_read_input_tokens =
        (totalUsage.cache_read_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);
      totalCostUsd += record.costUsd ?? 0;
      if (zod.passed) zodPassed++;
      else zodFailed++;
    } catch (e) {
      const msg = errorMessage(e);
      console.warn(`  lesson ${lesson.id} failed: ${msg}`);
      record = buildRunRecord({
        id: lesson.id,
        phase: 'main',
        model: args.model,
        promptSchemaHash,
        rawInput: null,
        zod: { passed: false, fieldErrors: null },
        usage: null,
        latencyMs: null,
        error: msg,
      });
      errored++;
    }
    appendRecord(args.output, record);
    done++;
    if (done % 10 === 0 || done === lessons.length) {
      console.log(`  ${done}/${lessons.length} processed`);
    }
  });

  console.log('');
  console.log(
    `Done: ${zodPassed} Zod-passed, ${zodFailed} Zod-failed (repairable via --repair), ${errored} errored.`
  );
  console.log(
    `Tokens: input=${totalUsage.input_tokens}  output=${totalUsage.output_tokens}  ` +
      `cache_create=${totalUsage.cache_creation_input_tokens}  cache_read=${totalUsage.cache_read_input_tokens}`
  );
  console.log(`Cost: $${totalCostUsd.toFixed(4)} (${args.model})`);
}

// ---------------------------------------------------------------------------
// Repair pass
// ---------------------------------------------------------------------------

async function runRepairPass(args: Args): Promise<void> {
  const vocab = loadVocab();
  const systemPrompt = loadSystemPrompt();
  const baseTool = buildSubmitTagsTool(vocab);
  const promptSchemaHash = computePromptSchemaHash(systemPrompt, baseTool);
  const resultSchema = buildResultSchema(vocab);

  if (!existsSync(args.output)) {
    throw new Error(`--repair needs an existing output file: ${args.output}`);
  }
  const latest = latestRecordById(parseRunRecords(readFileSync(args.output, 'utf8')));

  const candidates: Array<{ record: RunRecord; fields: string[] }> = [];
  let staleHash = 0;
  for (const record of latest.values()) {
    if (record.error !== null || record.zod.passed) continue;
    if (record.promptSchemaHash !== promptSchemaHash) {
      staleHash++;
      continue;
    }
    const fields = planRepairs(record.zod);
    if (fields.length === 0) continue;
    if (typeof record.rawInput !== 'object' || record.rawInput === null) {
      console.warn(`  ${record.id}: non-object rawInput, not repairable`);
      continue;
    }
    candidates.push({ record, fields });
  }
  if (staleHash > 0) {
    console.warn(
      `Skipping ${staleHash} Zod-failed record(s) with a stale prompt+schema hash — ` +
        're-run the main pass for those instead of repairing.'
    );
  }

  const limited = args.limit !== undefined ? candidates.slice(0, args.limit) : candidates;
  if (limited.length === 0) {
    console.log('Nothing to repair.');
    return;
  }

  const client = createApiClient();
  console.log(
    `Repairing ${limited.length} record(s) with ${args.model} (concurrency ${args.concurrency}) → ${args.output}`
  );

  let nowPassing = 0;
  let stillFailing = 0;
  await mapWithConcurrency(limited, args.concurrency, async ({ record, fields }) => {
    const lessonBody = lessonBodyById.get(record.id);
    if (lessonBody === undefined) {
      console.warn(`  ${record.id}: not in corpus.jsonl, skipping repair`);
      return;
    }
    const repairs: Record<string, RepairOutcome> = {};
    for (const field of fields) {
      const previous = (record.rawInput as Record<string, unknown>)[field];
      try {
        const repairPrompt = extractFieldPromptSection(systemPrompt, field);
        const repairTool = buildRepairTool(vocab, field, args.strict);
        const { rawInput, usage, latencyMs } = await callForcedTool(
          client,
          args.model,
          repairPrompt,
          repairTool,
          lessonBody
        );
        repairs[field] = {
          previous,
          repaired: extractRepairedValue(field, rawInput as Record<string, unknown>),
          usage,
          costUsd: computeCostUsd(args.model, usage),
          latencyMs,
          error: null,
        };
      } catch (e) {
        repairs[field] = {
          previous,
          repaired: null,
          usage: null,
          costUsd: null,
          latencyMs: null,
          error: errorMessage(e),
        };
      }
    }

    const merged = mergeRepairedFields(record.rawInput, repairs);
    const zod = validateRawInput(resultSchema, merged);
    const outcomes = Object.values(repairs);
    const usage: AnthropicUsage = {
      input_tokens: outcomes.reduce((sum, o) => sum + (o.usage?.input_tokens ?? 0), 0),
      output_tokens: outcomes.reduce((sum, o) => sum + (o.usage?.output_tokens ?? 0), 0),
      cache_creation_input_tokens: outcomes.reduce(
        (sum, o) => sum + (o.usage?.cache_creation_input_tokens ?? 0),
        0
      ),
      cache_read_input_tokens: outcomes.reduce(
        (sum, o) => sum + (o.usage?.cache_read_input_tokens ?? 0),
        0
      ),
    };
    const latencyMs = outcomes.reduce((sum, o) => sum + (o.latencyMs ?? 0), 0);
    const firstError = outcomes.find((o) => o.error !== null)?.error ?? null;
    appendRecord(
      args.output,
      buildRunRecord({
        id: record.id,
        phase: 'repair',
        model: args.model,
        promptSchemaHash,
        rawInput: merged,
        zod,
        usage,
        latencyMs,
        error: firstError,
        repairs,
      })
    );
    if (zod.passed) nowPassing++;
    else stillFailing++;
  });

  console.log('');
  console.log(`Repair done: ${nowPassing} now Zod-pass, ${stillFailing} still failing.`);
}

/** Lesson bodies for the repair pass (lazy: only loaded in --repair mode). */
let lessonBodyById: Map<string, string>;

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    console.log(HELP);
    return;
  }
  if (args.repair) {
    lessonBodyById = new Map(loadCorpus().map((lesson) => [lesson.id, lesson.content_text]));
    await runRepairPass(args);
  } else {
    await runMainPass(args);
  }
}

const isDirectInvocation =
  process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectInvocation) {
  main().catch((error: unknown) => {
    console.error('❌ Run failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
