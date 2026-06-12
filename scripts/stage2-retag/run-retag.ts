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
 *                       same model, the same --strict flag, the same
 *                       tool-choice shape, the same proxy participation
 *                       (--base-url set vs direct), the same lesson body hash,
 *                       and no error (a prompt/schema edit changes the hash and
 *                       invalidates resume-merging; a corpus body change
 *                       invalidates that lesson's record; proxy and direct
 *                       runs never resume-merge — the proxy cloak injects
 *                       ~1.4K tokens, a materially different effective prompt)
 *   --output <path>     output JSONL (default artifacts/retag-run.jsonl)
 *   --repair            repair mode: re-run ONLY Zod-failed fields of
 *                       existing records as per-field calls and append
 *                       merged, provenance-marked records (see below)
 *   --concurrency N     parallel API calls (default 5)
 *   --strict            set `strict: true` on the tool definition(s)
 *   --tool-choice-auto  EXPERIMENT-ONLY escape hatch: send
 *                       `tool_choice: {type:'auto'}` instead of the canonical
 *                       forced shape, for BOTH the main pass and the repair
 *                       pass, plus a system addendum instructing the model to
 *                       call `submit_tags` exactly once and never answer in
 *                       prose. Needed for models that reject forced tool_choice
 *                       (e.g. claude-fable-5, whose always-on thinking is
 *                       incompatible with `tool_choice: {type:'tool'}` and 400s
 *                       "tool_choice forces tool use is not compatible with
 *                       this model"). The production Opus/Sonnet shape stays
 *                       forced-tool by default — this flag is for the A8 dry-run
 *                       Fable contestant only.
 *   --help
 *
 * Output: appends one JSON line per lesson to the output file:
 *   { id, phase: 'main'|'repair', model, promptSchemaHash, rawInput,
 *     zod: { passed, fieldErrors }, usage (incl. cache_creation/cache_read
 *     counters), costUsd, latencyMs, error, stopReason, bodyHash (sha256 of
 *     the lesson body actually sent), strict, repairs? (repair phase only,
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
 * Optional proxy path (`--base-url <url>`): routes calls through a local
 * CLIProxyAPI proxy (billing against Claude Max) instead of the direct
 * Anthropic API. When set, the API key SOURCE switches to ANTHROPIC_API_KEY
 * (the proxy-side key) — the exact inverse of the default. The expected proxy
 * value is `http://127.0.0.1:8317/api/provider/anthropic`; the SDK appends
 * `/v1/...`, so a trailing `/v1` is stripped (with a stderr warning) by
 * normalizeBaseUrl to avoid the double-`/v1` 404 trap (project memory). The
 * effective base URL (or `direct` when unset) is stamped on every output
 * record's provenance so proxy-billed runs are distinguishable in artifacts.
 * When `--base-url` is absent, behavior is byte-for-byte unchanged.
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
import { normalizeRecordInput } from './normalize';
import { appendDocSurfaces, loadDocSurfaces } from './doc-surfaces';
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
 * Output budget for the --tool-choice-auto path only. fable's always-on
 * thinking bills as output and shares this cap, so a verbose-thinking lesson
 * could hit max_tokens before the model ever emits the tool_use block —
 * producing a billed, errored (MissingToolUseError) record. 8192 gives the
 * thinking headroom while staying under the non-streaming SDK-timeout
 * guidance (~16K). The forced path stays at MAX_TOKENS (4096) untouched.
 */
export const MAX_TOKENS_TOOL_CHOICE_AUTO = 8192;

/**
 * Published per-MTok pricing (USD), verified 2026-06-12 against the
 * Anthropic models/pricing documentation:
 *   claude-opus-4-8:   $5 input / $25 output (dropped from the PR-B eval
 *                      2026-06-12 on the r3 comparison; entry retained — r2/r3
 *                      artifacts reference it)
 *   claude-opus-4-7:   $5 input / $25 output (identical pricing to 4.8;
 *                      retained — E3 baseline + older artifacts reference it)
 *   claude-sonnet-4-6: $3 input / $15 output
 *   claude-fable-5:    $10 input / $50 output (user-requested experimental
 *                      contestant 2026-06-12; thinking is always on and its
 *                      tokens bill as output, so per-lesson output mass runs
 *                      higher than Opus on the same task)
 * Cache economics (prompt-caching docs): cache WRITE = 1.25x input for the
 * 5-minute TTL (`cache_control: {type:'ephemeral'}`, what this runner uses);
 * cache READ = 0.1x input. All dry-run contestants (impl-plan A8) are
 * covered; an unknown model yields `costUsd: null` rather than a wrong
 * number.
 */
export const PRICING_PER_MTOK: Record<
  string,
  { input: number; output: number; cacheWrite5m: number; cacheRead: number }
> = {
  'claude-opus-4-8': { input: 5, output: 25, cacheWrite5m: 6.25, cacheRead: 0.5 },
  'claude-opus-4-7': { input: 5, output: 25, cacheWrite5m: 6.25, cacheRead: 0.5 },
  'claude-sonnet-4-6': { input: 3, output: 15, cacheWrite5m: 3.75, cacheRead: 0.3 },
  'claude-fable-5': { input: 10, output: 50, cacheWrite5m: 12.5, cacheRead: 1 },
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
  /**
   * 'main' = the primary monolithic pass; 'repair' = a per-field Zod-failure
   * re-run; 'fallback' = an automatic single retry of a refusal-stopped main
   * call with the --fallback-model (carries that model id, so downstream
   * consumers both USE it as the lesson's result — it is the latest record —
   * and SEE it was not the primary model).
   */
  phase: 'main' | 'repair' | 'fallback';
  model: string;
  promptSchemaHash: string;
  /** Raw tool_use input (repair phase: the repair-merged object). */
  rawInput: unknown;
  zod: ZodOutcome;
  usage: AnthropicUsage | null;
  costUsd: number | null;
  latencyMs: number | null;
  error: string | null;
  /**
   * API stop_reason ('tool_use' on the happy path; whatever the API returned
   * on a no-tool_use response; null when no response arrived or for repair
   * records, which aggregate several per-field calls).
   */
  stopReason: string | null;
  /**
   * sha256 of the lesson body actually sent (the corpus content_text). Lets
   * --resume and --repair detect that the corpus body changed under a record.
   */
  bodyHash: string;
  /** Whether the tool definition(s) carried strict: true (--strict flag). */
  strict: boolean;
  /**
   * The tool-choice shape this record was produced under. Present and set to
   * `'auto'` only when the --tool-choice-auto escape hatch was used (the call
   * sent `tool_choice: {type:'auto'}` + a system addendum); absent on the
   * default forced-tool path, where it reads as the implicit `'forced'`.
   * Part of the resume identity, mirroring `strict`.
   */
  toolChoice?: 'auto';
  /**
   * The effective Anthropic SDK base URL this record was produced against:
   * the normalized `--base-url` value (e.g. the CLIProxyAPI proxy endpoint) or
   * the literal `'direct'` when no `--base-url` was passed. Lets artifacts
   * distinguish proxy-billed runs (Claude Max) from direct-API runs.
   */
  effectiveBaseUrl: string;
  /** Repair phase only: per-field provenance for every attempted repair. */
  repairs?: Record<string, RepairOutcome>;
  /**
   * Deterministic mechanical-rule normalizations applied to this record's
   * rawInput before Zod validation (see ./normalize). Each entry names a rule
   * (subject-scoped rules append `:<subject>`). Omitted/absent on records
   * written before normalization existed; empty when nothing was changed.
   * NEVER silent — every code-enforced edit is recorded here.
   */
  normalizations?: string[];
  completedAt: string;
}

/** Provenance sentinel stamped on records produced against the direct API. */
export const DIRECT_BASE_URL = 'direct';

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
    .update('\u0000')
    .update(JSON.stringify(tool))
    .digest('hex');
}

/** sha256 hex of a lesson body string (stamped on every RunRecord). */
export function computeBodyHash(body: string): string {
  return createHash('sha256').update(body).digest('hex');
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
  phase: 'main' | 'repair' | 'fallback';
  model: string;
  promptSchemaHash: string;
  rawInput: unknown;
  zod: ZodOutcome;
  usage: AnthropicUsage | null;
  latencyMs: number | null;
  error: string | null;
  stopReason: string | null;
  bodyHash: string;
  strict: boolean;
  /** Only set on the --tool-choice-auto path; omitted on the default forced path. */
  toolChoice?: 'auto';
  effectiveBaseUrl: string;
  repairs?: Record<string, RepairOutcome>;
  normalizations?: string[];
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
    stopReason: params.stopReason,
    bodyHash: params.bodyHash,
    strict: params.strict,
    ...(params.toolChoice !== undefined ? { toolChoice: params.toolChoice } : {}),
    effectiveBaseUrl: params.effectiveBaseUrl,
    ...(params.repairs !== undefined ? { repairs: params.repairs } : {}),
    ...(params.normalizations !== undefined ? { normalizations: params.normalizations } : {}),
    completedAt: new Date().toISOString(),
  };
}

/** Loose line schema for reading existing output (tolerates older extras). */
const runRecordLineSchema = z
  .object({
    id: z.string().min(1),
    phase: z.enum(['main', 'repair', 'fallback']),
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
    // Optional in the line schema so pre-existing output files (written
    // before these fields existed) still parse; the runner writes them on
    // every record, and resume/repair treat their absence as a mismatch.
    stopReason: z.string().nullable().optional(),
    bodyHash: z.string().optional(),
    strict: z.boolean().optional(),
    toolChoice: z.literal('auto').optional(),
    effectiveBaseUrl: z.string().optional(),
    repairs: z.record(z.unknown()).optional(),
    normalizations: z.array(z.string()).optional(),
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

/** The current run's identity, against which records are resume/repair-matched. */
export interface CurrentRunIdentity {
  promptSchemaHash: string;
  model: string;
  /** The current run's --strict flag (NOT part of the prompt+schema hash). */
  strict: boolean;
  /**
   * Whether the current run uses the --tool-choice-auto escape hatch. Part of
   * the resume identity (mirroring `strict`): the call shape — tool_choice
   * type AND the system addendum — differs from the forced path, so a record
   * produced under the other shape must NOT be resume-skipped. A record's
   * absent `toolChoice` reads as forced (false here).
   */
  toolChoiceAuto: boolean;
  /**
   * Whether the current run routes through the CLIProxyAPI proxy (--base-url
   * set). Part of the resume identity (mirroring `strict`/`toolChoiceAuto`):
   * the proxy cloak injects ~1.4K tokens proxy-side, so proxied and direct
   * calls run under materially different effective prompts and must NOT be
   * resume-merged. A record is proxied iff its `effectiveBaseUrl` is present
   * AND not the `'direct'` sentinel (legacy records without the field read as
   * direct).
   */
  proxied: boolean;
  /**
   * The --fallback-model for this run (undefined when no fallback is wired).
   * `phase: 'fallback'` records carry the FALLBACK model id, not the primary
   * `model`, so they are matched against this field instead of `model`. When
   * it is undefined (or set to a different model than the record's), the
   * fallback record is NOT resume-skipped and its lesson re-runs the main pass.
   */
  fallbackModel?: string;
  /** id → sha256 of the CURRENT corpus body for that lesson. */
  bodyHashById: Map<string, string>;
}

/**
 * Ids `--resume` may skip: the latest record for the id carries the CURRENT
 * prompt+schema hash, the same model, the same strict flag, the same
 * tool-choice shape, the same proxy participation, the same corpus body hash,
 * and completed without an API error. (Zod-failed records still count as done
 * — the repair pass owns those.) Any mismatch — including a record written
 * before bodyHash/strict/toolChoice existed — re-runs the lesson.
 */
export function computeResumableIds(
  records: RunRecord[],
  current: CurrentRunIdentity
): Set<string> {
  const resumable = new Set<string>();
  for (const [id, record] of latestRecordById(records)) {
    // A record is proxied iff effectiveBaseUrl is present AND not 'direct'
    // (legacy records without the field read as direct).
    const recordProxied =
      record.effectiveBaseUrl !== undefined && record.effectiveBaseUrl !== DIRECT_BASE_URL;
    // A `phase: 'fallback'` record carries the FALLBACK model id (not the
    // primary `model`) and is ALWAYS forced-shape (the fallback call never
    // uses --tool-choice-auto). So it matches the fallback model and its
    // tool-choice identity is forced regardless of the run's --tool-choice-auto.
    // Non-fallback records keep the exact previous identity rules verbatim —
    // existing records' resume verdict is unchanged.
    const isFallback = record.phase === 'fallback';
    const modelMatches = isFallback
      ? record.model === current.fallbackModel
      : record.model === current.model;
    const toolChoiceMatches = isFallback
      ? record.toolChoice !== 'auto'
      : (record.toolChoice === 'auto') === current.toolChoiceAuto;
    if (
      record.promptSchemaHash === current.promptSchemaHash &&
      modelMatches &&
      record.strict === current.strict &&
      toolChoiceMatches &&
      recordProxied === current.proxied &&
      record.bodyHash === current.bodyHashById.get(id) &&
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

export interface RepairPlan {
  candidates: Array<{ record: RunRecord; fields: string[] }>;
  /** Zod-failed records skipped for a stale prompt+schema hash. */
  staleHash: number;
  /** Zod-failed records skipped because they ran under a different model. */
  modelMismatch: number;
  /** The distinct other models seen on model-mismatch skips (sorted). */
  mismatchedModels: string[];
  /** Records skipped because the current corpus body hash differs from the
   *  record's bodyHash (only checked when bodyHashById is provided). */
  bodyMismatch: number;
  /** Records whose rawInput is not a plain object (nothing to merge into). */
  nonObjectIds: string[];
  /** Zod-failed candidates with ZERO repairable fields (e.g. only `_root`
   *  errors) — surfaced so the operator sees why nothing was repaired. */
  zeroFieldRecords: Array<{ id: string; rootErrors: string[] }>;
}

/**
 * Selects the repair-pass candidates out of the latest-per-id records.
 *
 * A record is repair-eligible iff it failed Zod AND its rawInput is a usable
 * plain object — EXCEPT main-phase records with a non-null error (those have
 * no usable output and re-run via the main pass instead). Repair-phase
 * records whose error aggregates transient per-field failures stay eligible:
 * their rawInput is the merged object, and the failed fields can be retried.
 * Stale prompt+schema hash, a different model, or (when bodyHashById is
 * given) a changed corpus body each skip the record, counted for warnings.
 */
export function planRepairCandidates(
  latestById: Map<string, RunRecord>,
  currentHash: string,
  model: string,
  bodyHashById?: Map<string, string>
): RepairPlan {
  const plan: RepairPlan = {
    candidates: [],
    staleHash: 0,
    modelMismatch: 0,
    mismatchedModels: [],
    bodyMismatch: 0,
    nonObjectIds: [],
    zeroFieldRecords: [],
  };
  const otherModels = new Set<string>();
  for (const record of latestById.values()) {
    if (record.zod.passed) continue;
    if (record.phase === 'main' && record.error !== null) continue;
    if (record.promptSchemaHash !== currentHash) {
      plan.staleHash++;
      continue;
    }
    if (record.model !== model) {
      plan.modelMismatch++;
      otherModels.add(record.model);
      continue;
    }
    if (
      typeof record.rawInput !== 'object' ||
      record.rawInput === null ||
      Array.isArray(record.rawInput)
    ) {
      plan.nonObjectIds.push(record.id);
      continue;
    }
    if (bodyHashById !== undefined && record.bodyHash !== bodyHashById.get(record.id)) {
      plan.bodyMismatch++;
      continue;
    }
    const fields = planRepairs(record.zod);
    if (fields.length === 0) {
      plan.zeroFieldRecords.push({
        id: record.id,
        rootErrors: record.zod.fieldErrors?._root ?? [],
      });
      continue;
    }
    plan.candidates.push({ record, fields });
  }
  plan.mismatchedModels = [...otherModels].sort();
  return plan;
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
 * stays visible. Top-level keys outside RESULT_PROPERTIES are STRIPPED —
 * they are never legitimate under the forced tool schema (the Zod result
 * schema is `.strict()`), and dropping them lets a record whose only
 * object-level problem is an extra key converge to Zod-pass after repair.
 */
export function mergeRepairedFields(
  rawInput: unknown,
  repairs: Record<string, RepairOutcome>
): Record<string, unknown> {
  if (typeof rawInput !== 'object' || rawInput === null || Array.isArray(rawInput)) {
    throw new Error('cannot merge repairs into a non-object rawInput');
  }
  const allowed = new Set<string>(RESULT_PROPERTIES);
  const merged: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rawInput as Record<string, unknown>)) {
    if (allowed.has(key)) merged[key] = value;
  }
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
  /**
   * Optional path to a JSON array of ids OR a JSONL file whose records carry an
   * `id` field. When set, the runner processes ONLY corpus records whose id is
   * in that set (intersection); ids requested but absent from the corpus warn
   * to stderr. Composes with --limit (limit applies AFTER the id filter),
   * --resume, and --repair. Intended use: the answer-key subset run, e.g.
   * `--ids scripts/stage2-retag/artifacts/answer-key.final.jsonl`.
   */
  ids?: string;
  resume: boolean;
  output: string;
  repair: boolean;
  concurrency: number;
  strict: boolean;
  /**
   * EXPERIMENT-ONLY: send `tool_choice: {type:'auto'}` + a system addendum
   * instead of the canonical forced `tool_choice: {type:'tool'}`, for models
   * that reject forced tool use (claude-fable-5). Default false = forced.
   */
  toolChoiceAuto: boolean;
  /**
   * Optional fallback model. When set, a MAIN-pass call that ends in a model
   * REFUSAL (stop_reason: 'refusal') is automatically retried ONCE with this
   * model — using the canonical FORCED tool_choice regardless of
   * --tool-choice-auto — and the result is appended as a provenance-marked
   * `phase: 'fallback'` record. Other errors keep the existing behavior.
   * Undefined = no fallback.
   */
  fallbackModel?: string;
  /**
   * Optional CLIProxyAPI base URL. When set, calls route through the proxy and
   * the API key source switches to ANTHROPIC_API_KEY (the proxy-side key);
   * normalized (trailing `/v1` stripped) before use. Undefined = direct API.
   */
  baseUrl?: string;
  help: boolean;
}

/** Throws unless a value-taking flag actually has a value (not another flag). */
export function requireFlagValue(flag: string, next: string | undefined): string {
  if (next === undefined || next.startsWith('--')) {
    throw new Error(`flag ${flag} requires a value (use --help for usage)`);
  }
  return next;
}

/** Throws unless a numeric flag's value is an integer >= min. */
export function requireIntFlag(flag: string, next: string | undefined, min: number): number {
  const raw = requireFlagValue(flag, next);
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min) {
    throw new Error(
      `flag ${flag} requires an integer >= ${min}, got: ${raw} (use --help for usage)`
    );
  }
  return value;
}

export function parseArgs(argv: string[]): Args {
  const a: Args = {
    model: DEFAULT_MODEL,
    resume: false,
    output: DEFAULT_OUTPUT_PATH,
    repair: false,
    concurrency: 5,
    strict: false,
    toolChoiceAuto: false,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    const next = argv[i + 1];
    switch (flag) {
      case '--model':
        a.model = requireFlagValue(flag, next);
        i++;
        break;
      case '--limit':
        a.limit = requireIntFlag(flag, next, 1);
        i++;
        break;
      case '--ids':
        a.ids = requireFlagValue(flag, next);
        i++;
        break;
      case '--resume':
        a.resume = true;
        break;
      case '--output':
        a.output = requireFlagValue(flag, next);
        i++;
        break;
      case '--repair':
        a.repair = true;
        break;
      case '--concurrency':
        a.concurrency = requireIntFlag(flag, next, 1);
        i++;
        break;
      case '--strict':
        a.strict = true;
        break;
      case '--tool-choice-auto':
        a.toolChoiceAuto = true;
        break;
      case '--fallback-model':
        a.fallbackModel = requireFlagValue(flag, next);
        i++;
        break;
      case '--base-url':
        a.baseUrl = requireFlagValue(flag, next);
        i++;
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
  --ids <path>       process ONLY corpus records whose id is in this file: a
                     JSON array of id strings OR a JSONL file whose records
                     carry an "id" field (e.g. answer-key.final.jsonl). Shape
                     detected by the first non-whitespace char. Requested ids
                     absent from the corpus warn to stderr. Composes with
                     --limit (limit applies AFTER the id filter), --resume, and
                     --repair (which restricts to the same id subset).
  --resume           skip ids already in the output JSONL (same prompt+schema
                     hash + model + strict flag + tool-choice shape + proxy
                     participation + lesson body hash + no error; a prompt edit
                     re-runs all, a body edit re-runs that lesson; proxy and
                     direct runs never resume-merge — the cloak injects ~1.4K
                     tokens proxy-side)
  --output <path>    output JSONL (default scripts/stage2-retag/artifacts/retag-run.jsonl)
  --repair           repair mode: per-field re-runs of Zod-failed fields,
                     merged + provenance-marked (appends phase:'repair' records)
  --concurrency <N>  parallel API calls (default 5)
  --strict           set strict:true on the tool definition(s) (off by default;
                     Zod + repair remain the enforcement gate regardless)
  --tool-choice-auto EXPERIMENT-ONLY escape hatch: send tool_choice:{type:'auto'}
                     + a system addendum (call submit_tags exactly once, never
                     answer in prose) instead of the canonical forced shape, for
                     BOTH the main and repair passes. For models that reject
                     forced tool_choice (claude-fable-5); the production
                     Opus/Sonnet shape stays forced-tool by default.
  --fallback-model <id>
                     refusal-only fallback: when a MAIN-pass call ends in a
                     model refusal (stop_reason: refusal), retry that lesson
                     ONCE with this model and append the result as a
                     provenance-marked phase:'fallback' record (carrying this
                     model id). The fallback call uses the canonical FORCED
                     tool_choice even when the main pass runs --tool-choice-auto
                     (the escape hatch is NOT applied to the fallback). Only a
                     refusal triggers it — network/billing/max_tokens errors
                     keep the existing errored-record behavior. --resume treats
                     a clean fallback record as completed (matched against this
                     model). Typical: --model claude-fable-5 --fallback-model
                     claude-opus-4-7.
  --base-url <url>   route through a local CLIProxyAPI proxy to bill against
                     Claude Max (e.g. http://127.0.0.1:8317/api/provider/anthropic).
                     Do NOT include the trailing "/v1" — the SDK appends it; a
                     trailing "/v1" is stripped with a stderr warning. When set,
                     the API key source switches to ANTHROPIC_API_KEY (the
                     proxy-side key); unset = direct API + ANTHROPIC_CONSOLE_API_KEY.
  --help

Env (direct API, no --base-url): ANTHROPIC_CONSOLE_API_KEY required (from
     .env.local). Do NOT use ANTHROPIC_API_KEY — it is the CLIProxyAPI
     proxy-side key and 401s against the direct API.
Env (--base-url set): ANTHROPIC_API_KEY required (the proxy-side key).

Deferred A8 live check (single command, needs Console credits):
  npx tsx scripts/stage2-retag/run-retag.ts --limit 3 --concurrency 1
  (record 1 pays the cache write; records 2-3 must show cache_read_input_tokens > 0)

Answer-key subset run (B3 — the 57 key lessons only):
  npx tsx scripts/stage2-retag/run-retag.ts \\
    --ids scripts/stage2-retag/artifacts/answer-key.final.jsonl \\
    --model <id> [--tool-choice-auto] [--base-url <proxy>] --output <path>
`;

// ---------------------------------------------------------------------------
// --ids subset loading (pure, unit-tested — no filesystem)
// ---------------------------------------------------------------------------

/**
 * Parses an --ids file's TEXT into an ordered, de-duplicated id list. The shape
 * is detected by the first non-whitespace character: `[` → a JSON array of
 * strings; anything else → JSONL records each carrying a string `id` field
 * (the answer-key.final.jsonl shape). Blank JSONL lines are skipped. Throws on
 * an empty file, a non-string array element, a record without a string `id`,
 * or malformed JSON — a bad --ids file must fail loudly, never silently run an
 * unintended subset.
 */
export function loadIdSet(text: string): string[] {
  const trimmed = text.trim();
  if (trimmed === '') throw new Error('--ids file is empty');
  const seen = new Set<string>();
  const ids: string[] = [];
  const push = (id: string): void => {
    if (!seen.has(id)) {
      seen.add(id);
      ids.push(id);
    }
  };
  if (trimmed[0] === '[') {
    const parsed: unknown = JSON.parse(trimmed);
    if (!Array.isArray(parsed)) {
      throw new Error('--ids file is a JSON value but not an array of strings');
    }
    for (const element of parsed) {
      if (typeof element !== 'string' || element === '') {
        throw new Error(
          `--ids JSON array contains a non-string (or empty) element: ${JSON.stringify(element)}`
        );
      }
      push(element);
    }
    return ids;
  }
  for (const line of trimmed.split('\n')) {
    if (line.trim() === '') continue;
    const raw: unknown = JSON.parse(line);
    if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
      throw new Error(`--ids JSONL line is not an object: ${line.slice(0, 80)}`);
    }
    const id = (raw as Record<string, unknown>).id;
    if (typeof id !== 'string' || id === '') {
      throw new Error(
        `--ids JSONL record lacks a non-empty string "id" field: ${line.slice(0, 80)}`
      );
    }
    push(id);
  }
  return ids;
}

/**
 * Intersects a corpus list with a requested id set. Returns the kept lessons in
 * CORPUS order (stable downstream ordering) plus the requested ids absent from
 * the corpus, in REQUEST order (so the operator's warning lists them as typed).
 */
export function filterCorpusByIds<T extends { id: string }>(
  lessons: T[],
  requestedIds: string[]
): { kept: T[]; missingIds: string[] } {
  const requested = new Set(requestedIds);
  const present = new Set(lessons.map((lesson) => lesson.id));
  const kept = lessons.filter((lesson) => requested.has(lesson.id));
  const missingIds = requestedIds.filter((id) => !present.has(id));
  return { kept, missingIds };
}

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

/**
 * Normalizes a CLIProxyAPI base URL: strips a single trailing `/v1` (with or
 * without a trailing slash) and warns, because the Anthropic SDK appends
 * `/v1/...` itself — leaving `/v1` on the base URL produces a double-`/v1`
 * 404 (documented SDK trap, project memory). Trailing slashes are trimmed.
 * Returns the URL unchanged when there is nothing to strip.
 */
export function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/+$/, '');
  if (/\/v1$/.test(trimmed)) {
    const stripped = trimmed.replace(/\/v1$/, '');
    console.warn(
      `note: --base-url ended in "/v1" — stripping it (the SDK appends "/v1/..." itself). ` +
        `Using ${stripped}`
    );
    return stripped;
  }
  return trimmed;
}

/**
 * Resolves the Anthropic constructor config from an ALREADY-NORMALIZED base URL
 * (callers run normalizeBaseUrl once and pass the result). Pure + side-effect-
 * free apart from reading process.env, so it is unit-testable without
 * constructing the SDK client (the SDK refuses to construct under a jsdom
 * global without dangerouslyAllowBrowser).
 *
 * Direct path (normalizedBaseUrl undefined): the canonical `{ apiKey }` against
 * ANTHROPIC_CONSOLE_API_KEY — no baseURL key, byte-for-byte unchanged. Proxy
 * path (set): switches the key SOURCE to ANTHROPIC_API_KEY (the CLIProxyAPI
 * proxy-side key; the direct-API key 401s against the proxy — Session-1
 * finding) AND adds the baseURL. Throws a descriptive error when the required
 * key for the chosen path is missing.
 */
export function resolveClientConfig(normalizedBaseUrl?: string): {
  apiKey: string;
  baseURL?: string;
} {
  if (normalizedBaseUrl !== undefined) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY missing from .env.local — required when --base-url routes ' +
          'through the CLIProxyAPI proxy (it is the proxy-side key; the direct-API ' +
          'ANTHROPIC_CONSOLE_API_KEY 401s against the proxy).'
      );
    }
    return { apiKey, baseURL: normalizedBaseUrl };
  }
  const apiKey = process.env.ANTHROPIC_CONSOLE_API_KEY;
  if (!apiKey) {
    throw new Error(
      'ANTHROPIC_CONSOLE_API_KEY missing from .env.local (do NOT use ANTHROPIC_API_KEY — ' +
        'it is the CLIProxyAPI proxy-side key and 401s against the direct API).'
    );
  }
  return { apiKey };
}

/**
 * Builds the Anthropic client. Direct path is the canonical bare
 * `new Anthropic({ apiKey })` (no baseURL) = byte-for-byte unchanged; proxy
 * path adds the baseURL and uses the proxy-side key (see resolveClientConfig).
 * No maxRetries override either way = SDK default retries (429/5xx only —
 * billing 400s are never retried).
 */
export function createApiClient(normalizedBaseUrl?: string): Anthropic {
  return new Anthropic(resolveClientConfig(normalizedBaseUrl));
}

function errorMessage(e: unknown): string {
  if (e instanceof Anthropic.APIError) return `HTTP ${e.status}: ${e.message}`;
  return e instanceof Error ? e.message : String(e);
}

export interface CallResult {
  rawInput: unknown;
  usage: AnthropicUsage;
  latencyMs: number;
  stopReason: string | null;
}

/**
 * Typed error for a response that carried no submit_tags tool_use block.
 * The response WAS billed, so the usage (and stop_reason, which says why the
 * model stopped — e.g. 'max_tokens') ride on the error for the error record.
 */
export class MissingToolUseError extends Error {
  readonly usage: AnthropicUsage;
  readonly stopReason: string | null;
  /** Set by callForcedTool once the round-trip latency is known. */
  latencyMs: number | null = null;

  constructor(usage: AnthropicUsage, stopReason: string | null) {
    super(
      `response carried no ${SUBMIT_TAGS_TOOL_NAME} tool_use block ` +
        `(stop_reason: ${stopReason ?? 'null'})`
    );
    this.name = 'MissingToolUseError';
    this.usage = usage;
    this.stopReason = stopReason;
  }
}

/**
 * The --fallback-model trigger predicate. Fallback fires ONLY when a main-pass
 * call ended in a model REFUSAL — i.e. a MissingToolUseError whose stop_reason
 * is exactly `'refusal'` (the API returns a refusal block instead of the
 * forced tool call; a deterministic safety false-positive on innocuous content
 * was observed for claude-fable-5 on the B3 answer key). Every other error
 * (network, billing 400s, max_tokens, end_turn) keeps the existing errored-
 * record behavior and does NOT trigger a fallback.
 */
export function isRefusalError(error: unknown): boolean {
  return error instanceof MissingToolUseError && error.stopReason === 'refusal';
}

/** The slice of an API response the extractor needs (pure, unit-testable). */
export interface ForcedToolResponseShape {
  content: Array<{ type: string; name?: string; input?: unknown }>;
  usage: AnthropicUsage;
  stop_reason: string | null;
}

/**
 * Pulls the submit_tags tool_use input out of a response. Scans the WHOLE
 * content array for the first `tool_use` block named submit_tags, so it is
 * robust to thinking/text blocks appearing alongside (or before) the tool
 * call — the case the --tool-choice-auto path produces (auto choice + an
 * always-thinking model like fable). Captures usage and stop_reason BEFORE
 * scanning so the no-tool_use path can throw a MissingToolUseError that still
 * carries the billed usage; that surfaces as a clean errored record rather
 * than crashing the run.
 */
export function extractForcedToolResult(response: ForcedToolResponseShape): {
  rawInput: unknown;
  usage: AnthropicUsage;
  stopReason: string | null;
} {
  const usage = response.usage;
  const stopReason = response.stop_reason ?? null;
  for (const block of response.content) {
    if (block.type === 'tool_use' && block.name === SUBMIT_TAGS_TOOL_NAME) {
      return { rawInput: block.input, usage, stopReason };
    }
  }
  throw new MissingToolUseError(usage, stopReason);
}

/**
 * System addendum appended (only) on the --tool-choice-auto path. With
 * `tool_choice: {type:'auto'}` the model is free to answer in prose, so this
 * instruction is what keeps it calling the tool. Kept to two sentences and
 * appended INTO the system text block before its cache_control breakpoint, so
 * the cached prefix still ends at the same breakpoint (see buildMessageRequest).
 */
export const TOOL_CHOICE_AUTO_SYSTEM_ADDENDUM =
  `\n\nYou MUST respond by calling the \`${SUBMIT_TAGS_TOOL_NAME}\` tool exactly once with your selected values. ` +
  'Do NOT answer in prose or explain your reasoning in the response text — the tool call is the only accepted output.';

/**
 * Builds the `messages.create` request for one call (pure, unit-testable, no
 * network). Default (forced) path mirrors the canonical PROD shape verbatim:
 * a single system text block + the single tool, EACH carrying
 * `cache_control: {type:'ephemeral'}` (two breakpoints), and
 * `tool_choice: {type:'tool'}`. The --tool-choice-auto escape hatch instead
 * sends `tool_choice: {type:'auto'}` and appends TOOL_CHOICE_AUTO_SYSTEM_ADDENDUM
 * to the SAME system text block's text — the addendum sits before the system
 * block's cache_control, so both breakpoints (system + tool) are preserved.
 */
export function buildMessageRequest(params: {
  model: string;
  systemPrompt: string;
  tool: Anthropic.Messages.Tool | SubmitTagsTool;
  body: string;
  toolChoiceAuto: boolean;
}): Anthropic.Messages.MessageCreateParamsNonStreaming {
  const systemText = params.toolChoiceAuto
    ? params.systemPrompt + TOOL_CHOICE_AUTO_SYSTEM_ADDENDUM
    : params.systemPrompt;
  return {
    model: params.model,
    max_tokens: params.toolChoiceAuto ? MAX_TOKENS_TOOL_CHOICE_AUTO : MAX_TOKENS,
    system: [{ type: 'text', text: systemText, cache_control: { type: 'ephemeral' } }],
    tools: [params.tool as Anthropic.Messages.Tool],
    tool_choice: params.toolChoiceAuto
      ? { type: 'auto' }
      : { type: 'tool', name: SUBMIT_TAGS_TOOL_NAME },
    messages: [{ role: 'user', content: params.body }],
  };
}

/**
 * One model call; returns the raw tool input. Forced-tool shape by default;
 * the --tool-choice-auto escape hatch (toolChoiceAuto) switches to auto +
 * system addendum (buildMessageRequest). Either way the response is scanned
 * for the first `submit_tags` tool_use block (extractForcedToolResult), so
 * thinking/text blocks alongside the tool call are tolerated.
 */
async function callForcedTool(
  client: Anthropic,
  model: string,
  systemPrompt: string,
  tool: Anthropic.Messages.Tool | SubmitTagsTool,
  body: string,
  toolChoiceAuto = false
): Promise<CallResult> {
  const startedAt = Date.now();
  const response = await client.messages.create(
    buildMessageRequest({ model, systemPrompt, tool, body, toolChoiceAuto })
  );
  const latencyMs = Date.now() - startedAt;
  try {
    const extracted = extractForcedToolResult({
      content: response.content,
      usage: response.usage as AnthropicUsage,
      stop_reason: response.stop_reason,
    });
    return { ...extracted, latencyMs };
  } catch (e) {
    if (e instanceof MissingToolUseError) e.latencyMs = latencyMs;
    throw e;
  }
}

/**
 * Runs the single automatic fallback retry of a refusal-stopped main call and
 * builds its `phase: 'fallback'` record. Orchestration is pure apart from the
 * injected `callFn` (the runner passes a closure over callForcedTool; tests
 * pass a stub) — no network here, so the refusal→fallback flow is unit-tested.
 *
 * The fallback ALWAYS uses the canonical FORCED tool_choice (callFn is invoked
 * with `false`), even when the main pass ran with --tool-choice-auto: the
 * escape hatch exists only for models that reject forced tool_choice
 * (claude-fable-5), and the fallback model (claude-opus-4-7) takes forced tool
 * use. The resulting record therefore carries NO `toolChoice` marker (forced),
 * the fallback model id, post-hoc Zod validation against the SAME result
 * schema, and cost billed under the fallback model. A fallback that itself
 * errors lands as a clean errored fallback record (usage preserved when the
 * no-tool_use response was billed) — and, being errored, is not resumable.
 */
export async function runFallbackForRefusal(params: {
  id: string;
  fallbackModel: string;
  promptSchemaHash: string;
  bodyHash: string;
  resultSchema: ReturnType<typeof buildResultSchema>;
  effectiveBaseUrl: string;
  strict: boolean;
  /**
   * Performs the actual fallback call. Receives `toolChoiceAuto` (always
   * `false` here — forced). In the runner this is a closure over callForcedTool
   * bound to the fallback model + the canonical (non-auto) tool.
   */
  callFn: (toolChoiceAuto: boolean) => Promise<CallResult>;
  /**
   * Whether the MAIN pass ran --tool-choice-auto. Captured only to make the
   * "fallback ignores the escape hatch" contract explicit and testable; the
   * fallback call is forced regardless of its value.
   */
  mainPassToolChoiceAuto?: boolean;
}): Promise<RunRecord> {
  try {
    // ALWAYS forced — the fallback never inherits --tool-choice-auto.
    const { rawInput: apiInput, usage, latencyMs, stopReason } = await params.callFn(false);
    const { rawInput, normalizations } = normalizeRecordInput(apiInput);
    const zod = validateRawInput(params.resultSchema, rawInput);
    return buildRunRecord({
      id: params.id,
      phase: 'fallback',
      model: params.fallbackModel,
      promptSchemaHash: params.promptSchemaHash,
      rawInput,
      zod,
      usage,
      latencyMs,
      error: null,
      stopReason,
      bodyHash: params.bodyHash,
      strict: params.strict,
      // Forced path → no toolChoice marker (mirrors the main forced path).
      effectiveBaseUrl: params.effectiveBaseUrl,
      normalizations,
    });
  } catch (e) {
    const msg = errorMessage(e);
    const billed = e instanceof MissingToolUseError ? e : null;
    return buildRunRecord({
      id: params.id,
      phase: 'fallback',
      model: params.fallbackModel,
      promptSchemaHash: params.promptSchemaHash,
      rawInput: null,
      zod: { passed: false, fieldErrors: null },
      usage: billed?.usage ?? null,
      latencyMs: billed?.latencyMs ?? null,
      error: msg,
      stopReason: billed?.stopReason ?? null,
      bodyHash: params.bodyHash,
      strict: params.strict,
      effectiveBaseUrl: params.effectiveBaseUrl,
    });
  }
}

function appendRecord(outputPath: string, record: RunRecord): void {
  appendFileSync(outputPath, `${JSON.stringify(record)}\n`, 'utf8');
}

/** True when a resolved path lands inside scripts/stage2-retag/artifacts/. */
export function isInsideArtifactsDir(filePath: string): boolean {
  return path.resolve(filePath).startsWith(ARTIFACTS_DIR + path.sep);
}

/** One-line warning when an output path is outside the gitignored artifacts dir. */
export function warnIfOutsideArtifacts(filePath: string): void {
  if (!isInsideArtifactsDir(filePath)) {
    console.warn(
      `note: output path ${path.resolve(filePath)} is outside scripts/stage2-retag/artifacts/ ` +
        'and will NOT be gitignored.'
    );
  }
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

  // Append the source-document surfaces (Drive filename + page header) to each
  // lesson body BEFORE hashing/sending — these carry grade/season claims that
  // content_text lacks (ruling §A20). Lessons absent from the sidecar are
  // byte-identical (no block appended); a missing sidecar warns once and adds
  // nothing, so the full-corpus run is unchanged before the corpus-wide capture.
  const docSurfaces = loadDocSurfaces();
  const corpus = loadCorpus().map((lesson) => ({
    ...lesson,
    content_text: appendDocSurfaces(lesson.content_text, docSurfaces.get(lesson.id)),
  }));
  const bodyHashById = new Map(
    corpus.map((lesson) => [lesson.id, computeBodyHash(lesson.content_text)])
  );
  let lessons = corpus;
  // --ids: restrict to the intersection of the corpus with the requested id
  // set (e.g. the 57-lesson answer-key subset). Applied BEFORE --limit so the
  // limit caps the filtered set, and before --resume so resume only skips
  // within the chosen subset. Requested ids absent from the corpus warn.
  if (args.ids !== undefined) {
    const requestedIds = loadIdSet(readFileSync(args.ids, 'utf8'));
    const { kept, missingIds } = filterCorpusByIds(lessons, requestedIds);
    lessons = kept;
    console.log(`--ids: ${requestedIds.length} requested → ${lessons.length} present in corpus.`);
    if (missingIds.length > 0) {
      console.warn(
        `  warning: ${missingIds.length} requested id(s) not in the corpus: ${missingIds.join(', ')}`
      );
    }
  }
  if (args.limit !== undefined) lessons = lessons.slice(0, args.limit);

  if (args.resume && existsSync(args.output)) {
    const existing = parseRunRecords(readFileSync(args.output, 'utf8'));
    const resumable = computeResumableIds(existing, {
      promptSchemaHash,
      model: args.model,
      strict: args.strict,
      toolChoiceAuto: args.toolChoiceAuto,
      proxied: args.baseUrl !== undefined,
      fallbackModel: args.fallbackModel,
      bodyHashById,
    });
    const before = lessons.length;
    lessons = lessons.filter((lesson) => !resumable.has(lesson.id));
    console.log(`Resume: skipping ${before - lessons.length} already-completed ids.`);
  }

  if (lessons.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  const normalizedBaseUrl = args.baseUrl !== undefined ? normalizeBaseUrl(args.baseUrl) : undefined;
  const effectiveBaseUrl = normalizedBaseUrl ?? DIRECT_BASE_URL;
  const client = createApiClient(normalizedBaseUrl);
  mkdirSync(path.dirname(args.output), { recursive: true });

  console.log(
    `Calling ${args.model} for ${lessons.length} lessons ` +
      `(concurrency ${args.concurrency}${args.strict ? ', strict tools' : ''}` +
      `${args.toolChoiceAuto ? ', tool_choice auto' : ''}` +
      `${normalizedBaseUrl !== undefined ? `, via ${normalizedBaseUrl}` : ''}) → ${args.output}`
  );

  let done = 0;
  let zodPassed = 0;
  let zodFailed = 0;
  let errored = 0;
  let fellBack = 0;
  let totalCostUsd = 0;
  const totalUsage: AnthropicUsage = {
    input_tokens: 0,
    output_tokens: 0,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 0,
  };

  const addToTotals = (usage: AnthropicUsage, costUsd: number | null): void => {
    totalUsage.input_tokens += usage.input_tokens;
    totalUsage.output_tokens += usage.output_tokens;
    totalUsage.cache_creation_input_tokens =
      (totalUsage.cache_creation_input_tokens ?? 0) + (usage.cache_creation_input_tokens ?? 0);
    totalUsage.cache_read_input_tokens =
      (totalUsage.cache_read_input_tokens ?? 0) + (usage.cache_read_input_tokens ?? 0);
    totalCostUsd += costUsd ?? 0;
  };

  await mapWithConcurrency(lessons, args.concurrency, async (lesson) => {
    let record: RunRecord;
    // Captured in the catch when a refusal triggers --fallback-model; appended
    // AFTER the main errored record so the fallback wins as the latest record.
    let fallbackRecord: RunRecord | null = null;
    const bodyHash = computeBodyHash(lesson.content_text);
    try {
      const {
        rawInput: apiInput,
        usage,
        latencyMs,
        stopReason,
      } = await callForcedTool(
        client,
        args.model,
        systemPrompt,
        tool,
        lesson.content_text,
        args.toolChoiceAuto
      );
      // Code-enforce the mechanical tagging rules the models ignore (R1/R4/R5)
      // BEFORE Zod, so validation + the repair pass + the apply gate all see
      // normalized values. Provenance is stamped on the record, never silent.
      const { rawInput, normalizations } = normalizeRecordInput(apiInput);
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
        stopReason,
        bodyHash,
        strict: args.strict,
        toolChoice: args.toolChoiceAuto ? 'auto' : undefined,
        effectiveBaseUrl,
        normalizations,
      });
      addToTotals(usage, record.costUsd);
      if (zod.passed) zodPassed++;
      else zodFailed++;
    } catch (e) {
      const msg = errorMessage(e);
      console.warn(`  lesson ${lesson.id} failed: ${msg}`);
      // A MissingToolUseError response WAS billed — keep its usage + cost on
      // the error record instead of recording usage: null.
      const billed = e instanceof MissingToolUseError ? e : null;
      record = buildRunRecord({
        id: lesson.id,
        phase: 'main',
        model: args.model,
        promptSchemaHash,
        rawInput: null,
        zod: { passed: false, fieldErrors: null },
        usage: billed?.usage ?? null,
        latencyMs: billed?.latencyMs ?? null,
        error: msg,
        stopReason: billed?.stopReason ?? null,
        bodyHash,
        strict: args.strict,
        toolChoice: args.toolChoiceAuto ? 'auto' : undefined,
        effectiveBaseUrl,
      });
      if (billed) addToTotals(billed.usage, record.costUsd);
      errored++;

      // Refusal-only fallback: a MAIN-pass refusal (stop_reason: 'refusal')
      // retries ONCE with --fallback-model, using the canonical FORCED
      // tool_choice (never the --tool-choice-auto escape hatch — that exists
      // only for the primary model that rejects forced tools). The errored
      // main record is still written above (provenance of the refusal); the
      // fallback record is appended after it, so it becomes the lesson's
      // latest record for validate-output/scoring/--resume.
      if (args.fallbackModel !== undefined && isRefusalError(e)) {
        console.warn(
          `  lesson ${lesson.id} refused by ${args.model} — falling back to ${args.fallbackModel}`
        );
        fallbackRecord = await runFallbackForRefusal({
          id: lesson.id,
          fallbackModel: args.fallbackModel,
          promptSchemaHash,
          bodyHash,
          resultSchema,
          effectiveBaseUrl,
          strict: args.strict,
          mainPassToolChoiceAuto: args.toolChoiceAuto,
          // Forced tool_choice (toolChoiceAuto=false), forced tool definition.
          callFn: (toolChoiceAuto) =>
            callForcedTool(
              client,
              args.fallbackModel as string,
              systemPrompt,
              tool,
              lesson.content_text,
              toolChoiceAuto
            ),
        });
        fellBack++;
        if (fallbackRecord.usage) addToTotals(fallbackRecord.usage, fallbackRecord.costUsd);
        if (fallbackRecord.error !== null) {
          console.warn(
            `  lesson ${lesson.id} fallback (${args.fallbackModel}) also failed: ${fallbackRecord.error}`
          );
        }
      }
    }
    // Main record first, then the fallback (if any) — so the fallback is the
    // lesson's LATEST record (latestRecordById picks the last line per id).
    appendRecord(args.output, record);
    if (fallbackRecord !== null) appendRecord(args.output, fallbackRecord);
    done++;
    if (done % 10 === 0 || done === lessons.length) {
      console.log(`  ${done}/${lessons.length} processed`);
    }
  });

  console.log('');
  console.log(
    `Done: ${zodPassed} Zod-passed, ${zodFailed} Zod-failed (repairable via --repair), ${errored} errored` +
      `${args.fallbackModel !== undefined ? `, ${fellBack} fell back to ${args.fallbackModel}` : ''}.`
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
  let latest = latestRecordById(parseRunRecords(readFileSync(args.output, 'utf8')));

  // --ids: restrict the repair pass to records whose id is in the requested set
  // (mirrors the main pass's subset behavior). Requested ids absent from the
  // run output warn; the candidate planner then works over the filtered map.
  if (args.ids !== undefined) {
    const requestedIds = loadIdSet(readFileSync(args.ids, 'utf8'));
    const requested = new Set(requestedIds);
    const filtered = new Map([...latest].filter(([id]) => requested.has(id)));
    const missingIds = requestedIds.filter((id) => !latest.has(id));
    console.log(
      `--ids: ${requestedIds.length} requested → ${filtered.size} present in run output.`
    );
    if (missingIds.length > 0) {
      console.warn(
        `  warning: ${missingIds.length} requested id(s) not in the run output: ${missingIds.join(', ')}`
      );
    }
    latest = filtered;
  }

  const bodyHashById = new Map(
    [...lessonBodyById].map(([id, body]) => [id, computeBodyHash(body)])
  );
  const plan = planRepairCandidates(latest, promptSchemaHash, args.model, bodyHashById);
  if (plan.staleHash > 0) {
    console.warn(
      `Skipping ${plan.staleHash} Zod-failed record(s) with a stale prompt+schema hash — ` +
        're-run the main pass for those instead of repairing.'
    );
  }
  if (plan.modelMismatch > 0) {
    console.warn(
      `Skipping ${plan.modelMismatch} Zod-failed record(s) from a different model ` +
        `(${plan.mismatchedModels.join(', ')}) — pass --model <m> to repair them.`
    );
  }
  if (plan.bodyMismatch > 0) {
    console.warn(
      `Skipping ${plan.bodyMismatch} record(s) whose corpus body changed since the run ` +
        '(bodyHash mismatch) — re-run the main pass for those instead of repairing.'
    );
  }
  for (const id of plan.nonObjectIds) {
    console.warn(`  ${id}: non-object rawInput, not repairable`);
  }
  for (const zeroField of plan.zeroFieldRecords) {
    console.warn(
      `  ${zeroField.id}: Zod-failed but no per-field repair is possible — _root errors: ` +
        `${zeroField.rootErrors.length > 0 ? zeroField.rootErrors.join('; ') : '(none recorded)'}`
    );
  }

  const limited = args.limit !== undefined ? plan.candidates.slice(0, args.limit) : plan.candidates;
  if (limited.length === 0) {
    console.log('Nothing to repair.');
    return;
  }

  const normalizedBaseUrl = args.baseUrl !== undefined ? normalizeBaseUrl(args.baseUrl) : undefined;
  const effectiveBaseUrl = normalizedBaseUrl ?? DIRECT_BASE_URL;
  const client = createApiClient(normalizedBaseUrl);
  console.log(
    `Repairing ${limited.length} record(s) with ${args.model} (concurrency ${args.concurrency}` +
      `${args.toolChoiceAuto ? ', tool_choice auto' : ''}` +
      `${normalizedBaseUrl !== undefined ? `, via ${normalizedBaseUrl}` : ''}) → ${args.output}`
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
          lessonBody,
          args.toolChoiceAuto
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
        // A MissingToolUseError response WAS billed — keep its usage + cost.
        const billed = e instanceof MissingToolUseError ? e : null;
        repairs[field] = {
          previous,
          repaired: null,
          usage: billed?.usage ?? null,
          costUsd: computeCostUsd(args.model, billed?.usage ?? null),
          latencyMs: billed?.latencyMs ?? null,
          error: errorMessage(e),
        };
      }
    }

    const mergedRaw = mergeRepairedFields(record.rawInput, repairs);
    // Re-apply the mechanical rules: a repaired field (e.g. a re-generated
    // activity_type or academic_concepts) can re-introduce an R1/R4/R5
    // violation, so normalization runs again on the merged object.
    const { rawInput: merged, normalizations } = normalizeRecordInput(mergedRaw);
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
        // Repair records aggregate several per-field calls — no single
        // stop_reason applies, so it is null by design.
        stopReason: null,
        bodyHash: computeBodyHash(lessonBody),
        strict: args.strict,
        toolChoice: args.toolChoiceAuto ? 'auto' : undefined,
        effectiveBaseUrl,
        repairs,
        normalizations,
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
  warnIfOutsideArtifacts(args.output);
  if (args.repair) {
    // Surface bodies the same way the main pass does, so the repair pass sends
    // the identical body and its bodyHash matches the main-pass record's (no
    // spurious bodyMismatch skips). See runMainPass for the §A20 rationale.
    const docSurfaces = loadDocSurfaces();
    lessonBodyById = new Map(
      loadCorpus().map((lesson) => [
        lesson.id,
        appendDocSurfaces(lesson.content_text, docSurfaces.get(lesson.id)),
      ])
    );
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
