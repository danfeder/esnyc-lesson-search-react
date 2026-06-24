/**
 * Unit tests for the Stage 2 re-tag runner's pure helpers (task A6).
 *
 * No network: live verification is deferred to the documented A8 single
 * command (see run-retag.ts header). Covered here per the A6 spec:
 * record-shape construction, --resume id-skipping against a synthetic
 * output JSONL, prompt+schema hash stability, repair-merge logic (a
 * forced-bad-enum fixture routes the right field through repair and merges
 * provenance-marked), cost arithmetic, and the --base-url proxy plumbing
 * (flag parse, normalizeBaseUrl /v1 strip, and the API-key-source selection —
 * resolveClientConfig, a jsdom-safe pure helper that does NOT construct the
 * SDK client, since the SDK refuses construction under jsdom without
 * dangerouslyAllowBrowser, which production must never set).
 */
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { afterEach, describe, expect, it } from 'vitest';

import {
  DEFAULT_MODEL,
  GRADE_LEVELS,
  RESULT_PROPERTIES,
  buildC02DecisionSchema,
  buildC02FinalSchema,
  buildResultSchema,
  buildSubmitTagsTool,
  loadSystemPrompt,
} from './schema';
import { loadC02FloorInput } from './c02-floor';
import { loadVocab } from './vocab';
import {
  DIRECT_BASE_URL,
  MAX_TOKENS,
  MAX_TOKENS_TOOL_CHOICE_AUTO,
  MissingToolUseError,
  PRICING_PER_MTOK,
  TOOL_CHOICE_AUTO_SYSTEM_ADDENDUM,
  buildMessageRequest,
  buildRepairTool,
  buildRunRecord,
  computeBodyHash,
  computeCostUsd,
  computePromptSchemaHash,
  computeResumableIds,
  excludeCorpusIds,
  extractFieldPromptSection,
  extractForcedToolResult,
  extractRepairedValue,
  fieldErrorsFromZod,
  filterCorpusByIds,
  isInsideArtifactsDir,
  loadCorpusExclusions,
  isRefusalError,
  latestRecordById,
  loadIdSet,
  mapWithConcurrency,
  mergeRepairedFields,
  normalizeBaseUrl,
  parseArgs,
  parseRunRecords,
  planRepairCandidates,
  planRepairs,
  repairFieldSpec,
  processC02Decision,
  resolveClientConfig,
  runFallbackForRefusal,
  validateRawInput,
  type AnthropicUsage,
  type CallResult,
  type RepairOutcome,
  type RunRecord,
} from './run-retag';
import type { C02FlooredTags } from './c02-floor';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_DIR = path.join(MODULE_DIR, '__fixtures__');

const vocab = loadVocab();
const systemPrompt = loadSystemPrompt();
const tool = buildSubmitTagsTool(vocab);
const resultSchema = buildResultSchema(vocab);
const subjects = vocab.academic_concepts.subjectKeys ?? [];

/** A fully valid monolithic tool output (all 13 properties). */
function makeValidResult(): Record<string, unknown> {
  return {
    activity_type: [vocab.activity_type.values[0]],
    tags: [],
    season_timing: [],
    cultural_responsiveness_features: [],
    cultural_heritage: [],
    academic_concepts: Object.fromEntries(
      subjects.map((subject) => [subject, { framework: [], everyday: [], synonym_pairs: [] }])
    ),
    academic_integration: [],
    social_emotional_learning: [],
    core_competencies: [],
    cooking_methods: [],
    observances_holidays: [],
    garden_skills: [],
    cooking_skills: [],
    main_ingredients: [],
    grade_levels: [],
  };
}

function makeRecord(overrides: Partial<RunRecord>): RunRecord {
  return {
    id: 'lesson-1',
    phase: 'main',
    model: 'claude-opus-4-7',
    promptSchemaHash: 'hash-a',
    rawInput: null,
    zod: { passed: true, fieldErrors: null },
    usage: null,
    costUsd: null,
    latencyMs: null,
    error: null,
    stopReason: null,
    bodyHash: 'hash-body',
    strict: false,
    effectiveBaseUrl: DIRECT_BASE_URL,
    completedAt: '2026-06-12T00:00:00.000Z',
    ...overrides,
  };
}

/** id → the makeRecord default body hash, for resume/repair identity params. */
function defaultBodyHashes(ids: string[]): Map<string, string> {
  return new Map(ids.map((id) => [id, 'hash-body']));
}

describe('computePromptSchemaHash', () => {
  it('is stable for identical inputs', () => {
    expect(computePromptSchemaHash(systemPrompt, tool)).toBe(
      computePromptSchemaHash(systemPrompt, tool)
    );
  });

  it('is a sha256 hex digest', () => {
    expect(computePromptSchemaHash(systemPrompt, tool)).toMatch(/^[0-9a-f]{64}$/);
  });

  it('changes when the prompt is edited', () => {
    expect(computePromptSchemaHash(`${systemPrompt} edited`, tool)).not.toBe(
      computePromptSchemaHash(systemPrompt, tool)
    );
  });

  it('changes when the tool schema changes', () => {
    const altered = { ...tool, description: `${tool.description} (v2)` };
    expect(computePromptSchemaHash(systemPrompt, altered)).not.toBe(
      computePromptSchemaHash(systemPrompt, tool)
    );
  });
});

describe('computeCostUsd', () => {
  const usage: AnthropicUsage = {
    input_tokens: 1000,
    output_tokens: 500,
    cache_creation_input_tokens: 6274,
    cache_read_input_tokens: 6274,
  };

  it('computes opus-4-7 cost from the rate table', () => {
    const rates = PRICING_PER_MTOK['claude-opus-4-7'];
    const expected =
      (1000 * rates.input +
        500 * rates.output +
        6274 * rates.cacheWrite5m +
        6274 * rates.cacheRead) /
      1_000_000;
    expect(computeCostUsd('claude-opus-4-7', usage)).toBeCloseTo(expected, 10);
  });

  it('rate table encodes 1.25x cache-write and 0.1x cache-read multipliers', () => {
    for (const rates of Object.values(PRICING_PER_MTOK)) {
      expect(rates.cacheWrite5m).toBeCloseTo(rates.input * 1.25, 10);
      expect(rates.cacheRead).toBeCloseTo(rates.input * 0.1, 10);
    }
  });

  it('treats missing cache counters as zero', () => {
    const noCaches: AnthropicUsage = { input_tokens: 1_000_000, output_tokens: 0 };
    expect(computeCostUsd('claude-opus-4-7', noCaches)).toBeCloseTo(
      PRICING_PER_MTOK['claude-opus-4-7'].input,
      10
    );
  });

  it('returns null for null usage or unknown models', () => {
    expect(computeCostUsd('claude-opus-4-7', null)).toBeNull();
    expect(computeCostUsd('some-unknown-model', usage)).toBeNull();
  });

  it('prices claude-opus-4-8 identically to claude-opus-4-7 (entry retained for r2/r3 artifacts)', () => {
    expect(PRICING_PER_MTOK['claude-opus-4-8']).toEqual({
      input: 5,
      output: 25,
      cacheWrite5m: 6.25,
      cacheRead: 0.5,
    });
    expect(PRICING_PER_MTOK['claude-opus-4-8']).toEqual(PRICING_PER_MTOK['claude-opus-4-7']);
    expect(computeCostUsd('claude-opus-4-8', usage)).toBeCloseTo(
      computeCostUsd('claude-opus-4-7', usage) ?? NaN,
      10
    );
  });
});

describe('buildRunRecord', () => {
  it('constructs the documented record shape', () => {
    const usage: AnthropicUsage = {
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 6000,
    };
    const record = buildRunRecord({
      id: 'lesson-9',
      phase: 'main',
      model: 'claude-opus-4-7',
      promptSchemaHash: 'abc',
      rawInput: { activity_type: ['garden'] },
      zod: { passed: false, fieldErrors: { tags: ['tags: bad'] } },
      usage,
      latencyMs: 1234,
      error: null,
      stopReason: 'tool_use',
      bodyHash: 'body-9',
      strict: false,
      effectiveBaseUrl: DIRECT_BASE_URL,
    });
    expect(record).toMatchObject({
      id: 'lesson-9',
      phase: 'main',
      model: 'claude-opus-4-7',
      promptSchemaHash: 'abc',
      rawInput: { activity_type: ['garden'] },
      zod: { passed: false, fieldErrors: { tags: ['tags: bad'] } },
      usage,
      latencyMs: 1234,
      error: null,
      stopReason: 'tool_use',
      bodyHash: 'body-9',
      strict: false,
      effectiveBaseUrl: DIRECT_BASE_URL,
    });
    expect(record.costUsd).toBeCloseTo(computeCostUsd('claude-opus-4-7', usage) ?? NaN, 10);
    expect(Number.isNaN(Date.parse(record.completedAt))).toBe(false);
    expect(record.repairs).toBeUndefined();
  });

  it('carries the repairs provenance map when provided', () => {
    const repairs: Record<string, RepairOutcome> = {
      cooking_methods: {
        previous: ['microwave'],
        repaired: [vocab.cooking_methods.values[0]],
        usage: null,
        costUsd: null,
        latencyMs: null,
        error: null,
      },
    };
    const record = buildRunRecord({
      id: 'lesson-9',
      phase: 'repair',
      model: 'claude-opus-4-7',
      promptSchemaHash: 'abc',
      rawInput: makeValidResult(),
      zod: { passed: true, fieldErrors: null },
      usage: null,
      latencyMs: null,
      error: null,
      stopReason: null,
      bodyHash: 'body-9',
      strict: true,
      effectiveBaseUrl: 'http://127.0.0.1:8317/api/provider/anthropic',
      repairs,
    });
    expect(record.phase).toBe('repair');
    expect(record.strict).toBe(true);
    expect(record.repairs).toEqual(repairs);
    expect(record.effectiveBaseUrl).toBe('http://127.0.0.1:8317/api/provider/anthropic');
  });

  it('computes cost from usage on error records too (billed no-tool_use path)', () => {
    const usage: AnthropicUsage = { input_tokens: 7000, output_tokens: 4096 };
    const record = buildRunRecord({
      id: 'lesson-9',
      phase: 'main',
      model: 'claude-opus-4-7',
      promptSchemaHash: 'abc',
      rawInput: null,
      zod: { passed: false, fieldErrors: null },
      usage,
      latencyMs: 9000,
      error: 'response carried no submit_tags tool_use block (stop_reason: max_tokens)',
      stopReason: 'max_tokens',
      bodyHash: 'body-9',
      strict: false,
      effectiveBaseUrl: DIRECT_BASE_URL,
    });
    expect(record.usage).toEqual(usage);
    expect(record.costUsd).toBeCloseTo(computeCostUsd('claude-opus-4-7', usage) ?? NaN, 10);
    expect(record.stopReason).toBe('max_tokens');
  });
});

describe('run-record finalC02 contract (P2′.3 / D-P6)', () => {
  const llmDecisions = {
    cooking_skills: { keep: ['Baking'], drop: [], add: [] },
    main_ingredients: {
      keep: ['Nightshades'],
      drop: [],
      add: [{ value: 'Tomatoes', reason: 'specific-food-central' }],
    },
  };
  const finalC02 = {
    cooking_skills: ['Baking'],
    main_ingredients: ['Nightshades', 'Tomatoes'],
  };

  it('carries BOTH the raw llmDecisions AND finalC02 as NEW record fields, without overwriting rawInput', () => {
    const record = buildRunRecord({
      id: 'lesson-9',
      phase: 'main',
      model: 'claude-opus-4-8',
      promptSchemaHash: 'abc',
      rawInput: llmDecisions, // rawInput holds the raw decision — preserved.
      zod: { passed: true, fieldErrors: null },
      usage: null,
      latencyMs: null,
      error: null,
      stopReason: 'tool_use',
      bodyHash: 'body-9',
      strict: false,
      effectiveBaseUrl: DIRECT_BASE_URL,
      llmDecisions,
      finalC02,
    });
    expect(record.rawInput).toEqual(llmDecisions);
    expect(record.llmDecisions).toEqual(llmDecisions);
    expect(record.finalC02).toEqual(finalC02);
  });

  it('round-trips both NEW fields through parseRunRecords (write → parse → both present)', () => {
    const record = buildRunRecord({
      id: 'lesson-9',
      phase: 'main',
      model: 'claude-opus-4-8',
      promptSchemaHash: 'abc',
      rawInput: llmDecisions,
      zod: { passed: true, fieldErrors: null },
      usage: null,
      latencyMs: null,
      error: null,
      stopReason: 'tool_use',
      bodyHash: 'body-9',
      strict: false,
      effectiveBaseUrl: DIRECT_BASE_URL,
      llmDecisions,
      finalC02,
    });
    const [parsed] = parseRunRecords(JSON.stringify(record));
    expect(parsed.llmDecisions).toEqual(llmDecisions);
    expect(parsed.finalC02).toEqual(finalC02);
  });

  it('omits the NEW fields when not provided (legacy/non-C02 records still parse)', () => {
    const record = buildRunRecord({
      id: 'lesson-9',
      phase: 'main',
      model: 'claude-opus-4-7',
      promptSchemaHash: 'abc',
      rawInput: { activity_type: ['garden'] },
      zod: { passed: true, fieldErrors: null },
      usage: null,
      latencyMs: null,
      error: null,
      stopReason: 'tool_use',
      bodyHash: 'body-9',
      strict: false,
      effectiveBaseUrl: DIRECT_BASE_URL,
    });
    expect(record.llmDecisions).toBeUndefined();
    expect(record.finalC02).toBeUndefined();
    const [parsed] = parseRunRecords(JSON.stringify(record));
    expect(parsed.finalC02).toBeUndefined();
  });
});

describe('processC02Decision — validation flow (P2′.3 / D-P6)', () => {
  const decisionSchema = buildC02DecisionSchema(vocab);
  const finalSchema = buildC02FinalSchema(vocab);
  const floorInput = loadC02FloorInput();

  /** A floored anchor with both fields populated from canonical values. */
  function flooredAnchor(cooking: string[], ingredients: string[]): C02FlooredTags {
    return {
      cooking: cooking.map((value) => ({ value, provenance: 'exact-canonical' as const })),
      ingredients: ingredients.map((value) => ({ value, provenance: 'exact-canonical' as const })),
    };
  }

  it('valid decision → finalC02 reconciled + zod passed + skipC02 normalize (no R7/R8/R9)', () => {
    const apiInput = {
      cooking_skills: { keep: ['Baking'], drop: [], add: [] },
      main_ingredients: {
        keep: [],
        drop: [],
        add: [{ value: 'Tomatoes', reason: 'specific-food-central' }],
      },
    };
    const out = processC02Decision({
      apiInput,
      floored: flooredAnchor(['Baking'], []),
      floorInput,
      decisionSchema,
      finalSchema,
    });
    expect(out.zod.passed).toBe(true);
    // rawInput preserved as the raw decision; llmDecisions is the parsed decision.
    expect(out.rawInput).toEqual(apiInput);
    expect(out.finalC02?.cooking_skills).toEqual(['Baking']);
    // The ADDed specific pulls its parent group in via reconcile.
    expect(out.finalC02?.main_ingredients).toContain('Tomatoes');
    expect(out.finalC02?.main_ingredients).toContain('Nightshades');
    // C02 normalize rules were skipped (no double-apply).
    expect(out.normalizations).not.toContain('cooking-skills-alias-floor');
    expect(out.normalizations).not.toContain('ingredient-parent-reconcile');
  });

  it('a decision that fails the schema (wrong shape) → zod.passed false, no finalC02', () => {
    const out = processC02Decision({
      apiInput: { cooking_skills: 'not an object', main_ingredients: {} },
      floored: flooredAnchor([], []),
      floorInput,
      decisionSchema,
      finalSchema,
    });
    expect(out.zod.passed).toBe(false);
    expect(out.finalC02).toBeUndefined();
  });

  it('a non-partitioning decision (anchor value omitted) → RECOVERED as implicit KEEP (lenient, P2′.6 r3)', () => {
    // 'Baking' is in the anchor but neither kept nor dropped. Reconcile is now
    // LENIENT: it recovers the omission as an implicit KEEP rather than rejecting
    // the whole lesson (the strict-reject cost ~12% of pilot lessons their tags).
    const out = processC02Decision({
      apiInput: {
        cooking_skills: { keep: [], drop: [], add: [] },
        main_ingredients: { keep: [], drop: [], add: [] },
      },
      floored: flooredAnchor(['Baking'], []),
      floorInput,
      decisionSchema,
      finalSchema,
    });
    expect(out.zod.passed).toBe(true);
    expect(out.finalC02?.cooking_skills).toEqual(['Baking']);
  });
});

describe('parseRunRecords + computeResumableIds (--resume)', () => {
  const HASH = 'current-hash';
  const MODEL = 'claude-opus-4-7';

  function identity(ids: string[], strict = false, toolChoiceAuto = false, proxied = false) {
    return {
      promptSchemaHash: HASH,
      model: MODEL,
      strict,
      toolChoiceAuto,
      proxied,
      bodyHashById: defaultBodyHashes(ids),
    };
  }

  function jsonl(records: RunRecord[], extraLines: string[] = []): string {
    return [...records.map((record) => JSON.stringify(record)), ...extraLines].join('\n');
  }

  it('skips ids whose latest record matches hash + model with no error', () => {
    const records = parseRunRecords(
      jsonl([
        makeRecord({ id: 'a', promptSchemaHash: HASH, model: MODEL }),
        makeRecord({ id: 'b', promptSchemaHash: HASH, model: MODEL, error: 'HTTP 400: boom' }),
        makeRecord({ id: 'c', promptSchemaHash: 'stale-hash', model: MODEL }),
        makeRecord({ id: 'd', promptSchemaHash: HASH, model: 'claude-sonnet-4-6' }),
      ])
    );
    expect(computeResumableIds(records, identity(['a', 'b', 'c', 'd']))).toEqual(new Set(['a']));
  });

  it('counts Zod-failed (but not errored) records as resumable — repair owns those', () => {
    const records = parseRunRecords(
      jsonl([
        makeRecord({
          id: 'z',
          promptSchemaHash: HASH,
          model: MODEL,
          zod: { passed: false, fieldErrors: { tags: ['tags: bad'] } },
        }),
      ])
    );
    expect(computeResumableIds(records, identity(['z']))).toEqual(new Set(['z']));
  });

  it('later lines win: an errored record re-run successfully becomes resumable', () => {
    const records = parseRunRecords(
      jsonl([
        makeRecord({ id: 'a', promptSchemaHash: HASH, model: MODEL, error: 'transient' }),
        makeRecord({ id: 'a', promptSchemaHash: HASH, model: MODEL }),
        makeRecord({ id: 'b', promptSchemaHash: HASH, model: MODEL }),
        makeRecord({ id: 'b', promptSchemaHash: HASH, model: MODEL, error: 'late failure' }),
      ])
    );
    expect(computeResumableIds(records, identity(['a', 'b']))).toEqual(new Set(['a']));
  });

  it('requires strict equality with the current run flag (mirrors model equality)', () => {
    const records = parseRunRecords(
      jsonl([
        makeRecord({ id: 'a', promptSchemaHash: HASH, model: MODEL, strict: false }),
        makeRecord({ id: 'b', promptSchemaHash: HASH, model: MODEL, strict: true }),
      ])
    );
    expect(computeResumableIds(records, identity(['a', 'b'], false))).toEqual(new Set(['a']));
    expect(computeResumableIds(records, identity(['a', 'b'], true))).toEqual(new Set(['b']));
  });

  it('requires matching proxy participation (mirrors strict/toolChoiceAuto)', () => {
    const PROXY = 'http://127.0.0.1:8317/api/provider/anthropic';
    const records = parseRunRecords(
      jsonl([
        makeRecord({
          id: 'direct',
          promptSchemaHash: HASH,
          model: MODEL,
          effectiveBaseUrl: DIRECT_BASE_URL,
        }),
        makeRecord({
          id: 'proxied',
          promptSchemaHash: HASH,
          model: MODEL,
          effectiveBaseUrl: PROXY,
        }),
      ])
    );
    // Current run = direct → only the direct record is resumable.
    expect(
      computeResumableIds(records, identity(['direct', 'proxied'], false, false, false))
    ).toEqual(new Set(['direct']));
    // Current run = proxied → only the proxied record is resumable.
    expect(
      computeResumableIds(records, identity(['direct', 'proxied'], false, false, true))
    ).toEqual(new Set(['proxied']));
  });

  it('treats a legacy record without effectiveBaseUrl as direct', () => {
    const legacy = { ...makeRecord({ id: 'a', promptSchemaHash: HASH, model: MODEL }) } as Record<
      string,
      unknown
    >;
    delete legacy.effectiveBaseUrl;
    const records = parseRunRecords(JSON.stringify(legacy));
    expect(records).toHaveLength(1);
    // A direct current run resumes it; a proxied current run does not.
    expect(computeResumableIds(records, identity(['a'], false, false, false))).toEqual(
      new Set(['a'])
    );
    expect(computeResumableIds(records, identity(['a'], false, false, true))).toEqual(new Set());
  });

  it('requires the record bodyHash to match the CURRENT corpus body hash', () => {
    const records = parseRunRecords(
      jsonl([
        makeRecord({ id: 'a', promptSchemaHash: HASH, model: MODEL, bodyHash: 'hash-body' }),
        makeRecord({ id: 'b', promptSchemaHash: HASH, model: MODEL, bodyHash: 'old-body-hash' }),
      ])
    );
    // b's corpus body changed since the run → re-run it.
    expect(computeResumableIds(records, identity(['a', 'b']))).toEqual(new Set(['a']));
    // an id missing from the current corpus is never resumable.
    expect(computeResumableIds(records, identity(['b']))).toEqual(new Set());
  });

  it('treats records written before bodyHash/strict existed as non-resumable', () => {
    const legacy = { ...makeRecord({ id: 'a', promptSchemaHash: HASH, model: MODEL }) } as Record<
      string,
      unknown
    >;
    delete legacy.bodyHash;
    delete legacy.strict;
    delete legacy.stopReason;
    const records = parseRunRecords(JSON.stringify(legacy));
    expect(records).toHaveLength(1); // still parses (optional in the line schema)
    expect(computeResumableIds(records, identity(['a']))).toEqual(new Set());
  });

  it('ignores malformed lines without crashing', () => {
    const records = parseRunRecords(
      jsonl(
        [makeRecord({ id: 'a', promptSchemaHash: HASH, model: MODEL })],
        ['{not json', '{"id":"x","unexpected":"shape"}', '']
      )
    );
    expect(records).toHaveLength(1);
    expect(computeResumableIds(records, identity(['a']))).toEqual(new Set(['a']));
  });

  // FIX 1 (P2′.3 Codex): the C02 anchored run expects `finalC02` on every
  // successful record. A record matching the current identity but LACKING
  // finalC02 (error === null) is a validation FAILURE that must re-run on
  // --resume, not resume-skip. Opt in via requireFinalC02.
  describe('requireFinalC02 (C02 anchored resume — re-run validation failures)', () => {
    it('does NOT resume a matching record that lacks finalC02 (validation failure)', () => {
      // error === null but no finalC02 → a C02 validation failure, not done.
      const records = parseRunRecords(
        jsonl([makeRecord({ id: 'a', promptSchemaHash: HASH, model: MODEL, error: null })])
      );
      expect(computeResumableIds(records, { ...identity(['a']), requireFinalC02: true })).toEqual(
        new Set()
      );
    });

    it('resumes the same matching record once finalC02 is present (PASS)', () => {
      const records = parseRunRecords(
        jsonl([
          makeRecord({
            id: 'a',
            promptSchemaHash: HASH,
            model: MODEL,
            finalC02: { cooking_skills: ['Knife skills'], main_ingredients: ['Alliums'] },
          }),
        ])
      );
      expect(computeResumableIds(records, { ...identity(['a']), requireFinalC02: true })).toEqual(
        new Set(['a'])
      );
    });

    it('treats finalC02 with EMPTY arrays as a PASS (resumable), not a failure', () => {
      const records = parseRunRecords(
        jsonl([
          makeRecord({
            id: 'a',
            promptSchemaHash: HASH,
            model: MODEL,
            finalC02: { cooking_skills: [], main_ingredients: [] },
          }),
        ])
      );
      expect(computeResumableIds(records, { ...identity(['a']), requireFinalC02: true })).toEqual(
        new Set(['a'])
      );
    });

    it('leaves legacy behavior unchanged when requireFinalC02 is absent/false', () => {
      // A record with no finalC02 + error === null stays resumable (the gate is off).
      const records = parseRunRecords(
        jsonl([makeRecord({ id: 'a', promptSchemaHash: HASH, model: MODEL, error: null })])
      );
      expect(computeResumableIds(records, identity(['a']))).toEqual(new Set(['a']));
      expect(computeResumableIds(records, { ...identity(['a']), requireFinalC02: false })).toEqual(
        new Set(['a'])
      );
    });
  });
});

describe('computeBodyHash (D-P9 — full effective input, not body-only)', () => {
  // The anchored pivot hashes the FULL effective input (body + raw current tags
  // + floored anchor + manifest version + reconcile policy). Per-dimension
  // independence is covered in c02-corpus-thread.test.ts; here we assert the
  // signature + stable-hex + body-sensitivity contract.
  const base = {
    body: 'Pre K lesson about roots and shoots.',
    rawCookingSkills: [],
    rawMainIngredients: [],
    anchor: 'cooking_skills: (none)\nmain_ingredients: (none)',
    manifestVersion: 'v',
    reconcilePolicyId: 'p',
  };
  it('is a stable 64-char sha256 hex digest over the effective input', () => {
    expect(computeBodyHash(base)).toMatch(/^[0-9a-f]{64}$/);
    expect(computeBodyHash(base)).toBe(computeBodyHash({ ...base }));
  });
  it('changes when the body changes (no longer body-only, but body still matters)', () => {
    expect(computeBodyHash({ ...base, body: 'a different body' })).not.toBe(computeBodyHash(base));
  });
});

describe('Zod outcome + repair planning', () => {
  it('a valid result passes with no repairs planned', () => {
    const outcome = validateRawInput(resultSchema, makeValidResult());
    expect(outcome).toEqual({ passed: true, fieldErrors: null });
    expect(planRepairs(outcome)).toEqual([]);
  });

  it('a forced bad enum routes exactly that field through repair', () => {
    const bad = { ...makeValidResult(), cooking_methods: ['microwave'] };
    const outcome = validateRawInput(resultSchema, bad);
    expect(outcome.passed).toBe(false);
    expect(Object.keys(outcome.fieldErrors ?? {})).toEqual(['cooking_methods']);
    expect(planRepairs(outcome)).toEqual(['cooking_methods']);
  });

  it('a missing required field is planned for repair', () => {
    const partial = makeValidResult();
    delete (partial as Record<string, unknown>).garden_skills;
    const outcome = validateRawInput(resultSchema, partial);
    expect(outcome.passed).toBe(false);
    expect(planRepairs(outcome)).toEqual(['garden_skills']);
  });

  it('object-level issues land under _root and are not repair-planned', () => {
    const extraKey = { ...makeValidResult(), bogus_field: [] };
    const outcome = validateRawInput(resultSchema, extraKey);
    expect(outcome.passed).toBe(false);
    expect(Object.keys(outcome.fieldErrors ?? {})).toEqual(['_root']);
    expect(planRepairs(outcome)).toEqual([]);
  });

  it('fieldErrorsFromZod keys nested concept issues by the top-level field', () => {
    const badConcepts = makeValidResult();
    (badConcepts.academic_concepts as Record<string, unknown>)[subjects[0]] = {
      framework: ['not-a-real-concept'],
      everyday: [],
      synonym_pairs: [],
    };
    const parsed = resultSchema.safeParse(badConcepts);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const fieldErrors = fieldErrorsFromZod(parsed.error);
      expect(Object.keys(fieldErrors)).toEqual(['academic_concepts']);
      expect(fieldErrors.academic_concepts[0]).toContain(subjects[0]);
    }
  });
});

describe('buildRepairTool', () => {
  it('flat fields get the PROD selected_values shape verbatim', () => {
    const repairTool = buildRepairTool(vocab, 'cooking_methods');
    expect(repairTool.name).toBe('submit_tags');
    expect(repairTool.description).toBe(
      'Submit the selected Cooking Methods value(s) for the lesson.'
    );
    expect(repairTool.cache_control).toEqual({ type: 'ephemeral' });
    expect(repairTool.input_schema).toEqual({
      type: 'object',
      properties: {
        selected_values: {
          type: 'array',
          items: { type: 'string', enum: vocab.cooking_methods.values },
          uniqueItems: true,
        },
      },
      required: ['selected_values'],
    });
    expect('strict' in repairTool).toBe(false);
  });

  it('grade_levels repairs against the verbatim grade enum', () => {
    const repairTool = buildRepairTool(vocab, 'grade_levels');
    const properties = repairTool.input_schema.properties as {
      selected_values: { items: { enum: string[] } };
    };
    expect(properties.selected_values.items.enum).toEqual([...GRADE_LEVELS]);
  });

  it('academic_concepts gets its monolithic-schema property as the single field', () => {
    const repairTool = buildRepairTool(vocab, 'academic_concepts');
    const schema = repairTool.input_schema as Record<string, unknown>;
    expect(schema.required).toEqual(['academic_concepts']);
    const defs = schema.$defs as { concept: { enum: string[] } };
    expect(defs.concept.enum).toEqual(vocab.academic_concepts.values);
    expect(Object.keys(schema.properties as Record<string, unknown>)).toEqual([
      'academic_concepts',
    ]);
  });

  it('--strict wires strict: true onto the repair tool', () => {
    expect(buildRepairTool(vocab, 'cooking_methods', true).strict).toBe(true);
  });

  it('rejects unknown fields', () => {
    expect(() => buildRepairTool(vocab, 'not_a_field')).toThrow(/not a repairable field/);
    expect(() => repairFieldSpec(vocab, 'not_a_field')).toThrow(/not a repairable field/);
  });
});

describe('extractRepairedValue', () => {
  it('reads selected_values for flat fields, filtering non-strings', () => {
    expect(
      extractRepairedValue('cooking_methods', { selected_values: ['stovetop', 7, 'oven'] })
    ).toEqual(['stovetop', 'oven']);
    expect(extractRepairedValue('cooking_methods', {})).toEqual([]);
  });

  it('reads the academic_concepts object for the concepts field', () => {
    const concepts = { Science: { framework: [], everyday: [], synonym_pairs: [] } };
    expect(extractRepairedValue('academic_concepts', { academic_concepts: concepts })).toBe(
      concepts
    );
  });
});

describe('mergeRepairedFields (repair-merge logic)', () => {
  it('merges a successful repair so the record now Zod-passes, provenance intact', () => {
    const bad: Record<string, unknown> = { ...makeValidResult(), cooking_methods: ['microwave'] };
    const before = validateRawInput(resultSchema, bad);
    expect(planRepairs(before)).toEqual(['cooking_methods']);

    const repaired = [vocab.cooking_methods.values[0]];
    const repairs: Record<string, RepairOutcome> = {
      cooking_methods: {
        previous: bad.cooking_methods,
        repaired,
        usage: { input_tokens: 10, output_tokens: 5 },
        costUsd: computeCostUsd('claude-opus-4-7', { input_tokens: 10, output_tokens: 5 }),
        latencyMs: 42,
        error: null,
      },
    };
    const merged = mergeRepairedFields(bad, repairs);
    expect(merged.cooking_methods).toEqual(repaired);
    expect(merged.activity_type).toEqual(bad.activity_type);
    expect(validateRawInput(resultSchema, merged).passed).toBe(true);
    // provenance preserved on the outcome map (what the record carries)
    expect(repairs.cooking_methods.previous).toEqual(['microwave']);
  });

  it('keeps the previous value when the repair call errored', () => {
    const bad = { ...makeValidResult(), cooking_methods: ['microwave'] };
    const merged = mergeRepairedFields(bad, {
      cooking_methods: {
        previous: bad.cooking_methods,
        repaired: null,
        usage: null,
        costUsd: null,
        latencyMs: null,
        error: 'HTTP 400: boom',
      },
    });
    expect(merged.cooking_methods).toEqual(['microwave']);
    expect(validateRawInput(resultSchema, merged).passed).toBe(false);
  });

  it('refuses to merge into a non-object rawInput', () => {
    expect(() => mergeRepairedFields(null, {})).toThrow(/non-object/);
    expect(() => mergeRepairedFields([], {})).toThrow(/non-object/);
  });

  it('strips top-level keys outside RESULT_PROPERTIES so repair can converge', () => {
    const bad: Record<string, unknown> = {
      ...makeValidResult(),
      cooking_methods: ['microwave'],
      bogus_field: ['never legitimate under the forced tool schema'],
    };
    expect(validateRawInput(resultSchema, bad).passed).toBe(false);
    const merged = mergeRepairedFields(bad, {
      cooking_methods: {
        previous: bad.cooking_methods,
        repaired: [vocab.cooking_methods.values[0]],
        usage: null,
        costUsd: null,
        latencyMs: null,
        error: null,
      },
    });
    expect('bogus_field' in merged).toBe(false);
    expect(validateRawInput(resultSchema, merged).passed).toBe(true);
  });
});

describe('planRepairCandidates (repair candidate selection)', () => {
  const HASH = 'current-hash';
  const MODEL = 'claude-opus-4-7';
  const failedZod = { passed: false, fieldErrors: { tags: ['tags.0: Invalid enum value'] } };
  const objectInput = { tags: ['bad value'] };

  function plan(records: RunRecord[], bodyHashById?: Map<string, string>) {
    return planRepairCandidates(latestRecordById(records), HASH, MODEL, bodyHashById);
  }

  it('selects Zod-failed records with object rawInput as candidates', () => {
    const result = plan([
      makeRecord({ id: 'a', promptSchemaHash: HASH, zod: failedZod, rawInput: objectInput }),
    ]);
    expect(result.candidates.map((c) => c.record.id)).toEqual(['a']);
    expect(result.candidates[0].fields).toEqual(['tags']);
  });

  it('skips Zod-passed records', () => {
    const result = plan([makeRecord({ id: 'a', promptSchemaHash: HASH, rawInput: objectInput })]);
    expect(result.candidates).toEqual([]);
  });

  it('skips main-phase records with an error (no usable output)', () => {
    const result = plan([
      makeRecord({
        id: 'a',
        phase: 'main',
        promptSchemaHash: HASH,
        zod: { passed: false, fieldErrors: null },
        rawInput: null,
        error: 'HTTP 400: boom',
      }),
    ]);
    expect(result.candidates).toEqual([]);
    expect(result.nonObjectIds).toEqual([]);
  });

  it('keeps repair-phase records with a transient error ELIGIBLE (merged rawInput is usable)', () => {
    const result = plan([
      makeRecord({
        id: 'a',
        phase: 'repair',
        promptSchemaHash: HASH,
        zod: failedZod,
        rawInput: objectInput,
        error: 'HTTP 500: overloaded',
      }),
    ]);
    expect(result.candidates.map((c) => c.record.id)).toEqual(['a']);
    expect(result.candidates[0].fields).toEqual(['tags']);
  });

  it('skips and counts stale prompt+schema hashes', () => {
    const result = plan([
      makeRecord({ id: 'a', promptSchemaHash: 'stale', zod: failedZod, rawInput: objectInput }),
    ]);
    expect(result.candidates).toEqual([]);
    expect(result.staleHash).toBe(1);
  });

  it('skips and counts records from a different model (item 2)', () => {
    const result = plan([
      makeRecord({
        id: 'a',
        promptSchemaHash: HASH,
        model: 'claude-sonnet-4-6',
        zod: failedZod,
        rawInput: objectInput,
      }),
    ]);
    expect(result.candidates).toEqual([]);
    expect(result.modelMismatch).toBe(1);
    expect(result.mismatchedModels).toEqual(['claude-sonnet-4-6']);
  });

  it('skips non-object rawInput (string / array) with the id surfaced', () => {
    const result = plan([
      makeRecord({ id: 'a', promptSchemaHash: HASH, zod: failedZod, rawInput: 'not an object' }),
      makeRecord({ id: 'b', promptSchemaHash: HASH, zod: failedZod, rawInput: ['array'] }),
    ]);
    expect(result.candidates).toEqual([]);
    expect(result.nonObjectIds.sort()).toEqual(['a', 'b']);
  });

  it('skips and counts body-hash mismatches when bodyHashById is provided (item 6)', () => {
    const records = [
      makeRecord({ id: 'a', promptSchemaHash: HASH, zod: failedZod, rawInput: objectInput }),
      makeRecord({
        id: 'b',
        promptSchemaHash: HASH,
        zod: failedZod,
        rawInput: objectInput,
        bodyHash: 'old-body-hash',
      }),
    ];
    const result = plan(records, defaultBodyHashes(['a', 'b']));
    expect(result.candidates.map((c) => c.record.id)).toEqual(['a']);
    expect(result.bodyMismatch).toBe(1);
  });

  it('surfaces Zod-failed candidates with zero repairable fields and their _root errors (item 3b)', () => {
    const result = plan([
      makeRecord({
        id: 'a',
        promptSchemaHash: HASH,
        zod: {
          passed: false,
          fieldErrors: { _root: ["(object): Unrecognized key(s) in object: 'bogus_field'"] },
        },
        rawInput: { ...makeValidResult(), bogus_field: [] },
      }),
    ]);
    expect(result.candidates).toEqual([]);
    expect(result.zeroFieldRecords).toEqual([
      { id: 'a', rootErrors: ["(object): Unrecognized key(s) in object: 'bogus_field'"] },
    ]);
  });
});

describe('extractForcedToolResult (no-tool_use typed error, item 5)', () => {
  const usage: AnthropicUsage = {
    input_tokens: 7000,
    output_tokens: 4096,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 6000,
  };

  it('returns rawInput + usage + stopReason on the happy path', () => {
    const result = extractForcedToolResult({
      content: [{ type: 'tool_use', name: 'submit_tags', input: { tags: [] } }],
      usage,
      stop_reason: 'tool_use',
    });
    expect(result).toEqual({ rawInput: { tags: [] }, usage, stopReason: 'tool_use' });
  });

  it('throws a MissingToolUseError carrying the billed usage + stop_reason', () => {
    let thrown: unknown;
    try {
      extractForcedToolResult({
        content: [{ type: 'text' }],
        usage,
        stop_reason: 'max_tokens',
      });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(MissingToolUseError);
    const error = thrown as MissingToolUseError;
    expect(error.usage).toEqual(usage);
    expect(error.stopReason).toBe('max_tokens');
    expect(error.message).toContain('no submit_tags tool_use block');
    expect(error.message).toContain('max_tokens');
    // costUsd is computable from the carried usage (what the error record stores).
    expect(computeCostUsd('claude-opus-4-7', error.usage)).not.toBeNull();
  });

  it('ignores tool_use blocks with a different tool name', () => {
    expect(() =>
      extractForcedToolResult({
        content: [{ type: 'tool_use', name: 'some_other_tool', input: {} }],
        usage,
        stop_reason: 'tool_use',
      })
    ).toThrow(MissingToolUseError);
  });
});

describe('extractFieldPromptSection', () => {
  it('returns the preamble plus only the named field section', () => {
    const section = extractFieldPromptSection(systemPrompt, 'cooking_methods');
    expect(section).toContain('curriculum metadata classifier');
    expect(section).toContain('## Field-by-field rules');
    expect(section).toContain('### cooking_methods');
    expect(section).not.toContain('### garden_skills');
    expect(section).not.toContain('### activity_type');
  });

  it('handles headings with suffixes and the final section', () => {
    expect(extractFieldPromptSection(systemPrompt, 'activity_type')).toContain('### activity_type');
    expect(extractFieldPromptSection(systemPrompt, 'garden_skills')).toContain('### garden_skills');
  });

  it('throws for fields without a prompt section', () => {
    expect(() => extractFieldPromptSection(systemPrompt, 'no_such_field')).toThrow(
      /no "### no_such_field" section/
    );
  });
});

describe('mapWithConcurrency', () => {
  it('preserves result order and processes everything', async () => {
    const items = [5, 4, 3, 2, 1];
    const results = await mapWithConcurrency(items, 2, async (n) => {
      await new Promise((resolve) => setTimeout(resolve, n));
      return n * 10;
    });
    expect(results).toEqual([50, 40, 30, 20, 10]);
  });
});

describe('prompt/schema contract (item 10)', () => {
  it.each([...RESULT_PROPERTIES])(
    'extractFieldPromptSection succeeds for %s (pins the prompt contract through A8 iterations)',
    (field) => {
      const section = extractFieldPromptSection(systemPrompt, field);
      expect(section).toContain(`### ${field}`);
      expect(section).toContain('## Field-by-field rules');
    }
  );
});

describe('parseArgs hardening', () => {
  it('throws when a value-taking flag is missing its value', () => {
    expect(() => parseArgs(['--model'])).toThrow(/--model requires a value/);
    expect(() => parseArgs(['--output'])).toThrow(/--output requires a value/);
    expect(() => parseArgs(['--model', '--resume'])).toThrow(/--model requires a value/);
    expect(() => parseArgs(['--output', '--repair'])).toThrow(/--output requires a value/);
  });

  it('throws on non-integer or out-of-range numeric flags', () => {
    expect(() => parseArgs(['--limit', '0'])).toThrow(/--limit requires an integer >= 1/);
    expect(() => parseArgs(['--limit', '2.5'])).toThrow(/--limit requires an integer >= 1/);
    expect(() => parseArgs(['--limit', 'abc'])).toThrow(/--limit requires an integer >= 1/);
    expect(() => parseArgs(['--concurrency', '-3'])).toThrow(
      /--concurrency requires an integer >= 1/
    );
    expect(() => parseArgs(['--concurrency'])).toThrow(/--concurrency requires a value/);
  });

  it('accepts valid values and still rejects unknown flags', () => {
    const args = parseArgs(['--model', 'claude-sonnet-4-6', '--limit', '3', '--concurrency', '1']);
    expect(args.model).toBe('claude-sonnet-4-6');
    expect(args.limit).toBe(3);
    expect(args.concurrency).toBe(1);
    expect(() => parseArgs(['--bogus'])).toThrow(/unknown flag/);
  });

  it('defaults --model to claude-opus-4-7 (r3 comparison verdict 2026-06-12)', () => {
    expect(DEFAULT_MODEL).toBe('claude-opus-4-7');
    expect(parseArgs([]).model).toBe('claude-opus-4-7');
  });
});

describe('--base-url flag parsing (CLIProxyAPI proxy path)', () => {
  it('defaults baseUrl to undefined (direct API)', () => {
    expect(parseArgs([]).baseUrl).toBeUndefined();
    expect(parseArgs(['--model', 'claude-opus-4-7']).baseUrl).toBeUndefined();
  });

  it('captures the proxy base URL value', () => {
    const args = parseArgs(['--base-url', 'http://127.0.0.1:8317/api/provider/anthropic']);
    expect(args.baseUrl).toBe('http://127.0.0.1:8317/api/provider/anthropic');
  });

  it('requires a value (and rejects a following flag as the value)', () => {
    expect(() => parseArgs(['--base-url'])).toThrow(/--base-url requires a value/);
    expect(() => parseArgs(['--base-url', '--resume'])).toThrow(/--base-url requires a value/);
  });
});

describe('normalizeBaseUrl (trailing-/v1 SDK trap)', () => {
  it('leaves the canonical proxy URL untouched', () => {
    expect(normalizeBaseUrl('http://127.0.0.1:8317/api/provider/anthropic')).toBe(
      'http://127.0.0.1:8317/api/provider/anthropic'
    );
  });

  it('strips a trailing /v1 (the SDK appends it itself)', () => {
    expect(normalizeBaseUrl('http://127.0.0.1:8317/api/provider/anthropic/v1')).toBe(
      'http://127.0.0.1:8317/api/provider/anthropic'
    );
  });

  it('strips a trailing /v1/ with its slash', () => {
    expect(normalizeBaseUrl('http://127.0.0.1:8317/api/provider/anthropic/v1/')).toBe(
      'http://127.0.0.1:8317/api/provider/anthropic'
    );
  });

  it('trims a bare trailing slash without touching the path', () => {
    expect(normalizeBaseUrl('http://127.0.0.1:8317/api/provider/anthropic/')).toBe(
      'http://127.0.0.1:8317/api/provider/anthropic'
    );
  });

  it('does not strip a path segment that merely contains v1 mid-path', () => {
    expect(normalizeBaseUrl('http://example.com/v1/anthropic')).toBe(
      'http://example.com/v1/anthropic'
    );
  });
});

describe('resolveClientConfig (key-source switch + baseURL plumbing)', () => {
  // Asserts the Anthropic constructor config WITHOUT building the SDK client
  // (the SDK refuses to construct under the repo-default jsdom env without
  // dangerouslyAllowBrowser, which production must never set). No network.
  const savedConsole = process.env.ANTHROPIC_CONSOLE_API_KEY;
  const savedProxy = process.env.ANTHROPIC_API_KEY;

  afterEach(() => {
    if (savedConsole === undefined) delete process.env.ANTHROPIC_CONSOLE_API_KEY;
    else process.env.ANTHROPIC_CONSOLE_API_KEY = savedConsole;
    if (savedProxy === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = savedProxy;
  });

  it('default (no base URL) uses the CONSOLE key and adds NO baseURL (direct API)', () => {
    process.env.ANTHROPIC_CONSOLE_API_KEY = 'console-key-direct';
    process.env.ANTHROPIC_API_KEY = 'proxy-key-should-not-be-used';
    const config = resolveClientConfig();
    expect(config.apiKey).toBe('console-key-direct');
    expect(config.baseURL).toBeUndefined();
  });

  it('default throws when the CONSOLE key is missing (does NOT fall back to the proxy key)', () => {
    delete process.env.ANTHROPIC_CONSOLE_API_KEY;
    process.env.ANTHROPIC_API_KEY = 'proxy-key';
    expect(() => resolveClientConfig()).toThrow(/ANTHROPIC_CONSOLE_API_KEY missing/);
  });

  it('proxy path uses ANTHROPIC_API_KEY and passes the baseURL through', () => {
    process.env.ANTHROPIC_CONSOLE_API_KEY = 'console-key-should-not-be-used';
    process.env.ANTHROPIC_API_KEY = 'proxy-key-max-billing';
    const url = 'http://127.0.0.1:8317/api/provider/anthropic';
    const config = resolveClientConfig(url);
    expect(config.apiKey).toBe('proxy-key-max-billing');
    expect(config.baseURL).toBe(url);
  });

  it('proxy path throws when ANTHROPIC_API_KEY is missing (does NOT fall back to the console key)', () => {
    process.env.ANTHROPIC_CONSOLE_API_KEY = 'console-key';
    delete process.env.ANTHROPIC_API_KEY;
    expect(() => resolveClientConfig('http://127.0.0.1:8317/api/provider/anthropic')).toThrow(
      /ANTHROPIC_API_KEY missing/
    );
  });
});

describe('isInsideArtifactsDir (output-path hygiene)', () => {
  it('accepts paths under scripts/stage2-retag/artifacts/ and flags everything else', () => {
    expect(isInsideArtifactsDir(path.join(MODULE_DIR, 'artifacts', 'retag-run.jsonl'))).toBe(true);
    expect(isInsideArtifactsDir(path.join(MODULE_DIR, 'artifacts', 'sub', 'x.jsonl'))).toBe(true);
    expect(isInsideArtifactsDir('/tmp/retag-run.jsonl')).toBe(false);
    expect(isInsideArtifactsDir(path.join(MODULE_DIR, 'retag-run.jsonl'))).toBe(false);
  });
});

describe('fixture integrity (__fixtures__/run-output.fixture.jsonl, item 9)', () => {
  const fixtureRecords = parseRunRecords(
    readFileSync(path.join(FIXTURES_DIR, 'run-output.fixture.jsonl'), 'utf8')
  );

  it('recorded zod.passed matches ACTUAL validation for every object-rawInput record', () => {
    let checked = 0;
    for (const record of fixtureRecords) {
      if (typeof record.rawInput !== 'object' || record.rawInput === null) continue;
      checked++;
      expect(
        validateRawInput(resultSchema, record.rawInput).passed,
        `fixture record ${record.id} (${record.phase}) claims zod.passed=${record.zod.passed}`
      ).toBe(record.zod.passed);
    }
    expect(checked).toBeGreaterThanOrEqual(5);
  });

  it("lesson-weird's transient-500 repair record is repair-ELIGIBLE under the new filter (item 1)", () => {
    const plan = planRepairCandidates(
      latestRecordById(fixtureRecords),
      'hash-current',
      'claude-opus-4-7'
    );
    const ids = plan.candidates.map((c) => c.record.id);
    expect(ids).toContain('lesson-weird');
    const weird = plan.candidates.find((c) => c.record.id === 'lesson-weird');
    expect(weird?.record.phase).toBe('repair');
    expect(weird?.record.error).toBe('HTTP 500: overloaded');
    expect(weird?.fields).toEqual(['activity_type', 'tags']);
    // soup repaired to Zod-pass and errored has no usable output — neither is a candidate.
    expect(ids).not.toContain('lesson-soup');
    expect(ids).not.toContain('lesson-errored');
    // ghost Zod-passed under another model: skipped as passed, not as model mismatch.
    expect(ids).not.toContain('lesson-ghost');
    expect(plan.modelMismatch).toBe(0);
  });
});

describe('--tool-choice-auto escape hatch (Fable experiment)', () => {
  describe('flag parse', () => {
    it('defaults toolChoiceAuto to false', () => {
      expect(parseArgs([]).toolChoiceAuto).toBe(false);
      expect(parseArgs(['--model', 'claude-fable-5']).toolChoiceAuto).toBe(false);
    });

    it('sets toolChoiceAuto when --tool-choice-auto is passed', () => {
      expect(parseArgs(['--tool-choice-auto']).toolChoiceAuto).toBe(true);
      expect(
        parseArgs(['--model', 'claude-fable-5', '--tool-choice-auto', '--limit', '3'])
          .toolChoiceAuto
      ).toBe(true);
    });

    it('is a boolean flag (takes no value) and coexists with other flags', () => {
      const args = parseArgs(['--tool-choice-auto', '--strict', '--concurrency', '1']);
      expect(args.toolChoiceAuto).toBe(true);
      expect(args.strict).toBe(true);
      expect(args.concurrency).toBe(1);
    });
  });

  describe('buildMessageRequest (system addendum + cache breakpoints)', () => {
    it('forced default: canonical shape, NO addendum, two cache breakpoints intact', () => {
      const req = buildMessageRequest({
        model: 'claude-opus-4-8',
        systemPrompt,
        tool,
        body: 'lesson body',
        toolChoiceAuto: false,
      });
      expect(req.tool_choice).toEqual({ type: 'tool', name: 'submit_tags' });
      // Forced path keeps the canonical 4096 cap untouched.
      expect(req.max_tokens).toBe(MAX_TOKENS);
      const systemBlocks = req.system as Array<{ text: string; cache_control?: unknown }>;
      expect(systemBlocks).toHaveLength(1);
      // No addendum on the forced path: system text is byte-identical to the prompt.
      expect(systemBlocks[0].text).toBe(systemPrompt);
      expect(systemBlocks[0].text).not.toContain(TOOL_CHOICE_AUTO_SYSTEM_ADDENDUM.trim());
      // Breakpoint 1: system block carries cache_control.
      expect(systemBlocks[0].cache_control).toEqual({ type: 'ephemeral' });
      // Breakpoint 2: the tool carries its own cache_control (unchanged).
      expect((req.tools?.[0] as { cache_control?: unknown }).cache_control).toEqual({
        type: 'ephemeral',
      });
      expect(req.messages).toEqual([{ role: 'user', content: 'lesson body' }]);
    });

    it('auto path: tool_choice auto + addendum appended INTO the cached system block', () => {
      const req = buildMessageRequest({
        model: 'claude-fable-5',
        systemPrompt,
        tool,
        body: 'lesson body',
        toolChoiceAuto: true,
      });
      expect(req.tool_choice).toEqual({ type: 'auto' });
      // Auto path gets the 8192 headroom (fable's always-on thinking shares the cap).
      expect(req.max_tokens).toBe(MAX_TOKENS_TOOL_CHOICE_AUTO);
      expect(MAX_TOKENS_TOOL_CHOICE_AUTO).toBeGreaterThan(MAX_TOKENS);
      const systemBlocks = req.system as Array<{ text: string; cache_control?: unknown }>;
      // Still a SINGLE system block (the addendum is concatenated, not a new block).
      expect(systemBlocks).toHaveLength(1);
      // Addendum present, and the original prompt is the unchanged prefix.
      expect(systemBlocks[0].text).toBe(systemPrompt + TOOL_CHOICE_AUTO_SYSTEM_ADDENDUM);
      expect(systemBlocks[0].text.startsWith(systemPrompt)).toBe(true);
      expect(systemBlocks[0].text).toContain('submit_tags');
      expect(systemBlocks[0].text).toContain('Do NOT answer in prose');
      // Breakpoint 1 preserved: the addendum sits BEFORE the system block's
      // cache_control (it is inside the same cached block).
      expect(systemBlocks[0].cache_control).toEqual({ type: 'ephemeral' });
      // Breakpoint 2 preserved: tool cache_control still present.
      expect((req.tools?.[0] as { cache_control?: unknown }).cache_control).toEqual({
        type: 'ephemeral',
      });
    });

    it('addendum is short (~2 sentences) and names the tool + the prose ban', () => {
      const sentences = TOOL_CHOICE_AUTO_SYSTEM_ADDENDUM.trim().split(/(?<=[.!?])\s+/);
      expect(sentences.length).toBeLessThanOrEqual(2);
      expect(TOOL_CHOICE_AUTO_SYSTEM_ADDENDUM).toContain('submit_tags');
      expect(TOOL_CHOICE_AUTO_SYSTEM_ADDENDUM.toLowerCase()).toContain('exactly once');
    });
  });

  describe('extraction robustness (auto responses carry thinking/text alongside tool_use)', () => {
    const usage: AnthropicUsage = { input_tokens: 7000, output_tokens: 4096 };

    it('finds the tool_use after [thinking, text] blocks (auto choice)', () => {
      const result = extractForcedToolResult({
        content: [
          { type: 'thinking' },
          { type: 'text' },
          { type: 'tool_use', name: 'submit_tags', input: { tags: ['x'] } },
        ],
        usage,
        stop_reason: 'tool_use',
      });
      expect(result.rawInput).toEqual({ tags: ['x'] });
    });

    it('errors (does not crash) when the auto response has only thinking/text, no tool_use', () => {
      let thrown: unknown;
      try {
        extractForcedToolResult({
          content: [{ type: 'thinking' }, { type: 'text' }],
          usage,
          stop_reason: 'end_turn',
        });
      } catch (e) {
        thrown = e;
      }
      expect(thrown).toBeInstanceOf(MissingToolUseError);
      const error = thrown as MissingToolUseError;
      // The error string surfaces clearly on the errored record.
      expect(error.message).toContain('no submit_tags tool_use block');
      expect(error.usage).toEqual(usage);
    });
  });

  describe('provenance on the run record', () => {
    function recordWith(toolChoice: 'auto' | undefined): RunRecord {
      return buildRunRecord({
        id: 'lesson-fable',
        phase: 'main',
        model: 'claude-fable-5',
        promptSchemaHash: 'h',
        rawInput: makeValidResult(),
        zod: { passed: true, fieldErrors: null },
        usage: null,
        latencyMs: null,
        error: null,
        stopReason: 'tool_use',
        bodyHash: 'b',
        strict: false,
        toolChoice,
        effectiveBaseUrl: DIRECT_BASE_URL,
      });
    }

    it('stamps toolChoice:"auto" when the flag is set', () => {
      expect(recordWith('auto').toolChoice).toBe('auto');
    });

    it('omits toolChoice on the default forced path (reads as forced)', () => {
      const record = recordWith(undefined);
      expect(record.toolChoice).toBeUndefined();
      expect('toolChoice' in record).toBe(false);
    });

    it('round-trips through parseRunRecords (line schema accepts toolChoice:"auto")', () => {
      const parsed = parseRunRecords(JSON.stringify(recordWith('auto')));
      expect(parsed).toHaveLength(1);
      expect(parsed[0].toolChoice).toBe('auto');
    });
  });

  describe('resume identity treats tool-choice shape like --strict', () => {
    const HASH = 'current-hash';
    const MODEL = 'claude-fable-5';

    function jsonl(records: RunRecord[]): string {
      return records.map((record) => JSON.stringify(record)).join('\n');
    }

    function identity(ids: string[], toolChoiceAuto: boolean) {
      return {
        promptSchemaHash: HASH,
        model: MODEL,
        strict: false,
        toolChoiceAuto,
        proxied: false,
        bodyHashById: defaultBodyHashes(ids),
      };
    }

    it('an auto-shape run does NOT resume a forced-shape record (and vice versa)', () => {
      const records = parseRunRecords(
        jsonl([
          makeRecord({ id: 'forced', promptSchemaHash: HASH, model: MODEL }), // no toolChoice = forced
          makeRecord({ id: 'auto', promptSchemaHash: HASH, model: MODEL, toolChoice: 'auto' }),
        ])
      );
      // Current run = forced → only the forced record is resumable.
      expect(computeResumableIds(records, identity(['forced', 'auto'], false))).toEqual(
        new Set(['forced'])
      );
      // Current run = auto → only the auto record is resumable.
      expect(computeResumableIds(records, identity(['forced', 'auto'], true))).toEqual(
        new Set(['auto'])
      );
    });
  });
});

describe('--ids flag (subset run over a JSONL/JSON id file)', () => {
  describe('parseArgs', () => {
    it('defaults ids to undefined (full corpus)', () => {
      expect(parseArgs([]).ids).toBeUndefined();
      expect(parseArgs(['--model', 'claude-fable-5']).ids).toBeUndefined();
    });

    it('captures the --ids path value', () => {
      const args = parseArgs(['--ids', 'scripts/stage2-retag/artifacts/answer-key.final.jsonl']);
      expect(args.ids).toBe('scripts/stage2-retag/artifacts/answer-key.final.jsonl');
    });

    it('requires a value (and rejects a following flag as the value)', () => {
      expect(() => parseArgs(['--ids'])).toThrow(/--ids requires a value/);
      expect(() => parseArgs(['--ids', '--resume'])).toThrow(/--ids requires a value/);
    });

    it('composes with --limit, --resume, --repair', () => {
      const args = parseArgs(['--ids', 'key.jsonl', '--limit', '5', '--resume', '--repair']);
      expect(args.ids).toBe('key.jsonl');
      expect(args.limit).toBe(5);
      expect(args.resume).toBe(true);
      expect(args.repair).toBe(true);
    });
  });

  describe('loadIdSet (detects JSON array vs JSONL by first non-whitespace char)', () => {
    it('parses a JSON array of strings', () => {
      expect(loadIdSet('["a", "b", "c"]')).toEqual(['a', 'b', 'c']);
    });

    it('parses a JSON array with surrounding whitespace/newlines', () => {
      expect(loadIdSet('\n  [\n  "a",\n  "b"\n]\n')).toEqual(['a', 'b']);
    });

    it('parses JSONL records carrying an `id` field', () => {
      const jsonl = '{"id":"a","activity_type":["garden"]}\n{"id":"b"}\n';
      expect(loadIdSet(jsonl)).toEqual(['a', 'b']);
    });

    it('skips blank JSONL lines', () => {
      expect(loadIdSet('{"id":"a"}\n\n  \n{"id":"b"}\n')).toEqual(['a', 'b']);
    });

    it('dedupes repeated ids preserving first-seen order', () => {
      expect(loadIdSet('["a","b","a","c"]')).toEqual(['a', 'b', 'c']);
      expect(loadIdSet('{"id":"a"}\n{"id":"b"}\n{"id":"a"}\n')).toEqual(['a', 'b']);
    });

    it('throws on an empty file', () => {
      expect(() => loadIdSet('   \n  ')).toThrow(/empty/i);
    });

    it('throws when a JSON array contains a non-string element', () => {
      expect(() => loadIdSet('["a", 3, "b"]')).toThrow(/string/i);
    });

    it('throws when a JSONL record lacks a string `id`', () => {
      expect(() => loadIdSet('{"id":"a"}\n{"activity_type":[]}\n')).toThrow(/id/i);
    });

    it('throws on malformed JSONL', () => {
      expect(() => loadIdSet('{"id":"a"}\nnot json\n')).toThrow();
    });
  });

  describe('filterCorpusByIds (intersection + missing report)', () => {
    const lessons = [
      { id: 'a', content_text: 'A' },
      { id: 'b', content_text: 'B' },
      { id: 'c', content_text: 'C' },
    ];

    it('keeps only corpus records whose id is in the set (corpus order preserved)', () => {
      const { kept, missingIds } = filterCorpusByIds(lessons, ['c', 'a']);
      expect(kept.map((l) => l.id)).toEqual(['a', 'c']);
      expect(missingIds).toEqual([]);
    });

    it('reports requested ids absent from the corpus (request order preserved)', () => {
      const { kept, missingIds } = filterCorpusByIds(lessons, ['a', 'zzz', 'b', 'qqq']);
      expect(kept.map((l) => l.id)).toEqual(['a', 'b']);
      expect(missingIds).toEqual(['zzz', 'qqq']);
    });

    it('returns an empty kept set when no ids intersect', () => {
      const { kept, missingIds } = filterCorpusByIds(lessons, ['x', 'y']);
      expect(kept).toEqual([]);
      expect(missingIds).toEqual(['x', 'y']);
    });
  });
});

describe('--fallback-model (refusal-only fallback with provenance-marked records)', () => {
  const usage: AnthropicUsage = {
    input_tokens: 6000,
    output_tokens: 300,
    cache_creation_input_tokens: 0,
    cache_read_input_tokens: 6000,
  };

  describe('parseArgs', () => {
    it('defaults fallbackModel to undefined (no fallback)', () => {
      expect(parseArgs([]).fallbackModel).toBeUndefined();
      expect(parseArgs(['--model', 'claude-fable-5']).fallbackModel).toBeUndefined();
    });

    it('captures the --fallback-model value', () => {
      const args = parseArgs(['--model', 'claude-fable-5', '--fallback-model', 'claude-opus-4-7']);
      expect(args.model).toBe('claude-fable-5');
      expect(args.fallbackModel).toBe('claude-opus-4-7');
    });

    it('requires a value (and rejects a following flag as the value)', () => {
      expect(() => parseArgs(['--fallback-model'])).toThrow(/--fallback-model requires a value/);
      expect(() => parseArgs(['--fallback-model', '--resume'])).toThrow(
        /--fallback-model requires a value/
      );
    });
  });

  describe('isRefusalError (the fallback trigger predicate)', () => {
    it('is true ONLY for a MissingToolUseError whose stopReason is "refusal"', () => {
      expect(isRefusalError(new MissingToolUseError(usage, 'refusal'))).toBe(true);
    });

    it('is false for a MissingToolUseError with a non-refusal stop_reason (max_tokens, end_turn)', () => {
      expect(isRefusalError(new MissingToolUseError(usage, 'max_tokens'))).toBe(false);
      expect(isRefusalError(new MissingToolUseError(usage, 'end_turn'))).toBe(false);
      expect(isRefusalError(new MissingToolUseError(usage, null))).toBe(false);
    });

    it('is false for ordinary errors (network/billing 400s keep existing behavior)', () => {
      expect(isRefusalError(new Error('socket hang up'))).toBe(false);
      expect(isRefusalError(new Error('HTTP 400: credit balance too low'))).toBe(false);
      expect(isRefusalError('not even an error')).toBe(false);
    });
  });

  describe('runFallbackForRefusal (orchestrates the single fallback retry)', () => {
    const fallbackResult: CallResult = {
      rawInput: makeValidResult(),
      usage: { input_tokens: 6200, output_tokens: 280 },
      latencyMs: 4200,
      stopReason: 'tool_use',
    };

    function baseParams(callFn: (toolChoiceAuto: boolean) => Promise<CallResult>) {
      return {
        id: 'lesson-seed-burst',
        fallbackModel: 'claude-opus-4-7',
        promptSchemaHash: 'hash-a',
        bodyHash: 'body-h',
        resultSchema,
        effectiveBaseUrl: DIRECT_BASE_URL,
        strict: false,
        callFn,
      };
    }

    it('appends a phase:"fallback" record carrying the fallback model + provenance', async () => {
      const record = await runFallbackForRefusal(baseParams(async () => fallbackResult));
      expect(record.phase).toBe('fallback');
      expect(record.model).toBe('claude-opus-4-7');
      expect(record.id).toBe('lesson-seed-burst');
      expect(record.error).toBeNull();
      expect(record.zod.passed).toBe(true);
      expect(record.stopReason).toBe('tool_use');
      // billed under the fallback model
      expect(record.costUsd).toBeCloseTo(
        computeCostUsd('claude-opus-4-7', fallbackResult.usage) ?? NaN,
        10
      );
    });

    it('uses the FORCED tool_choice even when the main pass ran --tool-choice-auto', async () => {
      let sawToolChoiceAuto: boolean | undefined;
      const record = await runFallbackForRefusal({
        ...baseParams(async (toolChoiceAuto) => {
          sawToolChoiceAuto = toolChoiceAuto;
          return fallbackResult;
        }),
        // the main pass was auto (fable), but the fallback must NOT inherit it
        mainPassToolChoiceAuto: true,
      });
      expect(sawToolChoiceAuto).toBe(false);
      // forced path → no toolChoice marker on the fallback record
      expect(record.toolChoice).toBeUndefined();
      expect('toolChoice' in record).toBe(false);
    });

    it('records a fallback that itself errors (keeps usage when billed)', async () => {
      const record = await runFallbackForRefusal(
        baseParams(async () => {
          throw new MissingToolUseError({ input_tokens: 10, output_tokens: 0 }, 'max_tokens');
        })
      );
      expect(record.phase).toBe('fallback');
      expect(record.model).toBe('claude-opus-4-7');
      expect(record.error).toContain('no submit_tags tool_use block');
      expect(record.usage).toEqual({ input_tokens: 10, output_tokens: 0 });
      expect(record.zod.passed).toBe(false);
    });
  });

  describe('computeResumableIds treats a successful fallback record as completed', () => {
    const HASH = 'current-hash';
    const PRIMARY = 'claude-fable-5';
    const FALLBACK = 'claude-opus-4-7';

    function jsonl(records: RunRecord[]): string {
      return records.map((record) => JSON.stringify(record)).join('\n');
    }

    function identity(ids: string[], opts: { toolChoiceAuto?: boolean; fallbackModel?: string }) {
      return {
        promptSchemaHash: HASH,
        model: PRIMARY,
        strict: false,
        toolChoiceAuto: opts.toolChoiceAuto ?? false,
        proxied: false,
        fallbackModel: opts.fallbackModel,
        bodyHashById: defaultBodyHashes(ids),
      };
    }

    it('a fallback-completed lesson is NOT re-run when --fallback-model matches', () => {
      const records = parseRunRecords(
        jsonl([
          // the refusing main record (errored) ...
          makeRecord({
            id: 'refused',
            promptSchemaHash: HASH,
            model: PRIMARY,
            toolChoice: 'auto',
            error: 'response carried no submit_tags tool_use block (stop_reason: refusal)',
            stopReason: 'refusal',
          }),
          // ... superseded by a clean fallback record (forced opus)
          makeRecord({
            id: 'refused',
            phase: 'fallback',
            promptSchemaHash: HASH,
            model: FALLBACK,
          }),
        ])
      );
      // Primary run is --tool-choice-auto (fable) WITH --fallback-model opus-4-7.
      expect(
        computeResumableIds(
          records,
          identity(['refused'], { toolChoiceAuto: true, fallbackModel: FALLBACK })
        )
      ).toEqual(new Set(['refused']));
    });

    it('does NOT resume a fallback record when the run has no/another --fallback-model', () => {
      const records = parseRunRecords(
        jsonl([
          makeRecord({ id: 'refused', phase: 'fallback', promptSchemaHash: HASH, model: FALLBACK }),
        ])
      );
      // No fallback model this run → the fallback record's model matches nothing.
      expect(computeResumableIds(records, identity(['refused'], { toolChoiceAuto: true }))).toEqual(
        new Set()
      );
      // A DIFFERENT fallback model → still not resumable.
      expect(
        computeResumableIds(
          records,
          identity(['refused'], { toolChoiceAuto: true, fallbackModel: 'claude-sonnet-4-6' })
        )
      ).toEqual(new Set());
    });

    it('an errored fallback record is NOT resumable (re-runs like any errored record)', () => {
      const records = parseRunRecords(
        jsonl([
          makeRecord({
            id: 'refused',
            phase: 'fallback',
            promptSchemaHash: HASH,
            model: FALLBACK,
            error: 'response carried no submit_tags tool_use block (stop_reason: max_tokens)',
          }),
        ])
      );
      expect(
        computeResumableIds(
          records,
          identity(['refused'], { toolChoiceAuto: true, fallbackModel: FALLBACK })
        )
      ).toEqual(new Set());
    });

    it('a fallback record is forced-shape: its toolChoice identity ignores the run --tool-choice-auto', () => {
      // The fallback record has no toolChoice marker (forced). Even though the
      // current run is --tool-choice-auto, the fallback record must still match.
      const records = parseRunRecords(
        jsonl([
          makeRecord({ id: 'refused', phase: 'fallback', promptSchemaHash: HASH, model: FALLBACK }),
        ])
      );
      expect(
        computeResumableIds(
          records,
          identity(['refused'], { toolChoiceAuto: true, fallbackModel: FALLBACK })
        )
      ).toEqual(new Set(['refused']));
    });
  });

  describe('parseRunRecords round-trips phase:"fallback" records', () => {
    it('accepts the fallback phase in the line schema', () => {
      const fallback = makeRecord({ id: 'r', phase: 'fallback', model: 'claude-opus-4-7' });
      const parsed = parseRunRecords(JSON.stringify(fallback));
      expect(parsed).toHaveLength(1);
      expect(parsed[0].phase).toBe('fallback');
      expect(parsed[0].model).toBe('claude-opus-4-7');
    });
  });
});

describe('corpus exclusions (B3.5c — deletion-slated lessons skipped in the run path)', () => {
  describe('loadCorpusExclusions (reads the checked-in exclusions file → ordered entries)', () => {
    it('returns the excluded entries from a well-formed file', () => {
      const entries = loadCorpusExclusions(
        path.join(FIXTURES_DIR, 'corpus-exclusions.fixture.json')
      );
      expect(entries.map((e) => e.id)).toEqual(['fix-1', 'fix-2']);
      expect(entries[0].title).toBe('Fixture One');
      expect(entries[0].reason).toBe('fixture row');
    });

    it('throws on a duplicate id within the list', () => {
      const tmp = path.join(FIXTURES_DIR, 'corpus-exclusions.dup.tmp.json');
      writeFileSync(
        tmp,
        JSON.stringify({
          provenance: {},
          excluded: [
            { id: 'x', title: 'X', reason: 'r' },
            { id: 'x', title: 'X again', reason: 'r' },
          ],
        })
      );
      try {
        expect(() => loadCorpusExclusions(tmp)).toThrow(/duplicate id: x/);
      } finally {
        rmSync(tmp, { force: true });
      }
    });

    it('throws when an entry is missing a required field (loud, never silent)', () => {
      const tmp = path.join(FIXTURES_DIR, 'corpus-exclusions.bad.tmp.json');
      writeFileSync(tmp, JSON.stringify({ provenance: {}, excluded: [{ id: 'x', title: 'X' }] }));
      try {
        expect(() => loadCorpusExclusions(tmp)).toThrow();
      } finally {
        rmSync(tmp, { force: true });
      }
    });

    it('loads the real checked-in data/corpus-exclusions.json with the B3.5c + B3.5b verdicts', () => {
      const entries = loadCorpusExclusions(path.join(MODULE_DIR, 'data/corpus-exclusions.json'));
      // 3 original B3.5c deletion verdicts (= the answer-key-exclusions.json set)
      // + 9 added from the B3.5b completeness-screen user verdicts (7 user-ruled
      // non-lessons/drafts + 2 metadata-card records whose Doc 404'd in Drive).
      expect(entries).toHaveLength(12);
      // The 3 B3.5c ids must still be a SUBSET (the corpus list is the
      // answer-key set PLUS the B3.5b additions; it no longer equals it).
      const answerKey = JSON.parse(
        readFileSync(path.join(MODULE_DIR, 'data/answer-key-exclusions.json'), 'utf8')
      ) as { excluded: Array<{ id: string }> };
      const corpusIds = new Set(entries.map((e) => e.id));
      for (const { id } of answerKey.excluded) {
        expect(corpusIds.has(id)).toBe(true);
      }
      // The 2 re-extraction-fallback ids (Doc 404'd) must be present.
      expect(corpusIds.has('1jfFP2nKtAti3HQZzX2Fi9X72M8BZ02uX')).toBe(true);
      expect(corpusIds.has('1SDsLLHlfBqIHSxvVVQrbOk96hlOkxOse')).toBe(true);
    });
  });

  describe('excludeCorpusIds (drops excluded lessons, reports which were hit)', () => {
    const lessons = [
      { id: 'a', content_text: 'A' },
      { id: 'b', content_text: 'B' },
      { id: 'c', content_text: 'C' },
    ];

    it('removes excluded lessons and preserves corpus order', () => {
      const { kept, excludedHits } = excludeCorpusIds(lessons, new Set(['b']));
      expect(kept.map((l) => l.id)).toEqual(['a', 'c']);
      expect(excludedHits).toEqual(['b']);
    });

    it('returns all lessons and no hits when nothing is excluded', () => {
      const { kept, excludedHits } = excludeCorpusIds(lessons, new Set());
      expect(kept.map((l) => l.id)).toEqual(['a', 'b', 'c']);
      expect(excludedHits).toEqual([]);
    });

    it('ignores excluded ids that are not in the corpus (no spurious hit)', () => {
      const { kept, excludedHits } = excludeCorpusIds(lessons, new Set(['b', 'zzz']));
      expect(kept.map((l) => l.id)).toEqual(['a', 'c']);
      expect(excludedHits).toEqual(['b']);
    });
  });
});
