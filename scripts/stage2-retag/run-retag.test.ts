/**
 * Unit tests for the Stage 2 re-tag runner's pure helpers (task A6).
 *
 * No network: live verification is deferred to the documented A8 single
 * command (see run-retag.ts header). Covered here per the A6 spec:
 * record-shape construction, --resume id-skipping against a synthetic
 * output JSONL, prompt+schema hash stability, repair-merge logic (a
 * forced-bad-enum fixture routes the right field through repair and merges
 * provenance-marked), and cost arithmetic.
 */
import { describe, expect, it } from 'vitest';

import { GRADE_LEVELS, buildResultSchema, buildSubmitTagsTool, loadSystemPrompt } from './schema';
import { loadVocab } from './vocab';
import {
  PRICING_PER_MTOK,
  buildRepairTool,
  buildRunRecord,
  computeCostUsd,
  computePromptSchemaHash,
  computeResumableIds,
  extractFieldPromptSection,
  extractRepairedValue,
  fieldErrorsFromZod,
  mapWithConcurrency,
  mergeRepairedFields,
  parseRunRecords,
  planRepairs,
  repairFieldSpec,
  validateRawInput,
  type AnthropicUsage,
  type RepairOutcome,
  type RunRecord,
} from './run-retag';

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
    completedAt: '2026-06-12T00:00:00.000Z',
    ...overrides,
  };
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
      repairs,
    });
    expect(record.phase).toBe('repair');
    expect(record.repairs).toEqual(repairs);
  });
});

describe('parseRunRecords + computeResumableIds (--resume)', () => {
  const HASH = 'current-hash';
  const MODEL = 'claude-opus-4-7';

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
    expect(computeResumableIds(records, HASH, MODEL)).toEqual(new Set(['a']));
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
    expect(computeResumableIds(records, HASH, MODEL)).toEqual(new Set(['z']));
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
    expect(computeResumableIds(records, HASH, MODEL)).toEqual(new Set(['a']));
  });

  it('ignores malformed lines without crashing', () => {
    const records = parseRunRecords(
      jsonl(
        [makeRecord({ id: 'a', promptSchemaHash: HASH, model: MODEL })],
        ['{not json', '{"id":"x","unexpected":"shape"}', '']
      )
    );
    expect(records).toHaveLength(1);
    expect(computeResumableIds(records, HASH, MODEL)).toEqual(new Set(['a']));
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
