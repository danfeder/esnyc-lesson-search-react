/**
 * Monolithic `submit_tags` tool schema + Zod result validation for the
 * Stage 2 re-tag runner (task A5).
 *
 * Built FROM the vocab module (`./vocab`): every enum list in the tool's
 * `input_schema` is a direct reference into the loaded vocab data — enum
 * values are never re-typed here. The tool mirrors the canonical PROD call
 * shape (oq1-call-shape-confirmation.md §2): one custom tool named
 * `submit_tags` carrying `cache_control: {type:'ephemeral'}`, enums inline
 * in `input_schema`, forced via `tool_choice: {type:'tool'}`.
 *
 * Property set: the 12 main-pass vocab fields PLUS `grade_levels` (the
 * grade array the impl plan's result schema names; enum copied verbatim
 * from `FILTER_CONFIGS.gradeLevels` in `src/utils/filterDefinitions.ts` —
 * `src/types/lessonMetadata.zod.ts` has no grade enum). The everyday↔
 * framework synonym pairs (D5/OQ10: same call) live INSIDE the
 * `academic_concepts` subject-keyed object, so the top-level property count
 * is 13.
 *
 * Token-mass note: the academic-concepts enum (119 values) is needed at 12
 * sites (6 subjects × framework + synonym-pair slots). Inlining it 12×
 * would blow the ~10K-token prompt+tool budget, so the schema declares it
 * ONCE under `$defs` and `$ref`s it — standard JSON Schema, no change to
 * the canonical call shape. Enum adherence is NOT server-guaranteed either
 * way; the Zod result schema below is the enforcement gate, with the
 * per-field repair pass as backstop (design §6).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

import { MAIN_PASS_FIELDS, type Stage2Vocab } from './vocab';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

export const SUBMIT_TAGS_TOOL_NAME = 'submit_tags';

/** Default run model: the current Opus (user decision 2026-06-12). Opus 4.8
 *  has identical pricing to 4.7 ($5/$25 in/out) and the same tokenizer +
 *  4,096-token cache floor, so the cost projection and cache guards are
 *  unaffected by the swap. claude-opus-4-7 stays a valid priced contestant. */
export const DEFAULT_MODEL = 'claude-opus-4-8';

/**
 * Token budget for the cached prefix (system prompt + tool schema). The
 * impl plan expects ~6-8K; exceeding ~10K means stop and reassess cost.
 */
export const TOKEN_MASS_BUDGET_TOKENS = 10_000;

/**
 * Minimum cacheable prefix per model family (prompt-caching docs, verified
 * 2026-06-12): prefixes BELOW the floor silently don't cache — no error,
 * `cache_creation_input_tokens` stays 0 and every call pays full input
 * price, which invalidates this pipeline's cache-based cost projection.
 * Opus-family floor is 4096 tokens; Sonnet 4.6 is 2048.
 */
export const OPUS_MIN_CACHEABLE_PREFIX_TOKENS = 4096;
export const SONNET_MIN_CACHEABLE_PREFIX_TOKENS = 2048;

/**
 * Authoritative grade tokens, copied VERBATIM from
 * `FILTER_CONFIGS.gradeLevels.options[].value` in
 * `src/utils/filterDefinitions.ts` (schema.test.ts asserts equality against
 * that source). Locked grade policy (design §4 OQ6): source-doc claim only;
 * silent docs → empty array.
 */
export const GRADE_LEVELS = ['3K', 'PK', 'K', '1', '2', '3', '4', '5', '6', '7', '8'] as const;

/** Top-level result properties: the 12 vocab fields + the grade array. */
export const RESULT_PROPERTIES = [...MAIN_PASS_FIELDS, 'grade_levels'] as const;

// ---------------------------------------------------------------------------
// input_schema shape types
// ---------------------------------------------------------------------------

export interface EnumArraySchema {
  type: 'array';
  description?: string;
  items: { type: 'string'; enum: readonly string[] };
  uniqueItems: true;
  minItems?: number;
}

interface FreeStringArraySchema {
  type: 'array';
  description?: string;
  items: { type: 'string'; minLength: 1 };
  uniqueItems: true;
}

interface ConceptRef {
  $ref: '#/$defs/concept';
}

interface SubjectConceptsSchema {
  type: 'object';
  description?: string;
  properties: {
    framework: {
      type: 'array';
      description?: string;
      items: ConceptRef;
      uniqueItems: true;
    };
    everyday: FreeStringArraySchema;
    synonym_pairs: {
      type: 'array';
      description?: string;
      items: {
        type: 'object';
        properties: {
          everyday: { type: 'string'; minLength: 1 };
          framework: ConceptRef;
        };
        required: string[];
        additionalProperties: false;
      };
    };
  };
  required: string[];
  additionalProperties: false;
}

export interface ConceptsObjectSchema {
  type: 'object';
  description?: string;
  properties: Record<string, { $ref: '#/$defs/subjectConcepts' }>;
  required: string[];
  additionalProperties: false;
}

// Type alias (not interface) so it picks up an implicit index signature and
// stays assignable to the SDK's `Tool.InputSchema` (`[k: string]: unknown`).
export type SubmitTagsInputSchema = {
  type: 'object';
  $defs: {
    concept: { type: 'string'; enum: readonly string[] };
    subjectConcepts: SubjectConceptsSchema;
  };
  properties: Record<string, EnumArraySchema | ConceptsObjectSchema>;
  required: string[];
  additionalProperties: false;
};

export interface SubmitTagsTool {
  name: typeof SUBMIT_TAGS_TOOL_NAME;
  description: string;
  input_schema: SubmitTagsInputSchema;
  cache_control: { type: 'ephemeral' };
}

// ---------------------------------------------------------------------------
// Result value types (what every Zod-passed API response parses to)
// ---------------------------------------------------------------------------

export interface SubjectConcepts {
  framework: string[];
  everyday: string[];
  synonym_pairs: Array<{ everyday: string; framework: string }>;
}

export interface Stage2RetagResult {
  activity_type: string[];
  tags: string[];
  season_timing: string[];
  cultural_responsiveness_features: string[];
  cultural_heritage: string[];
  academic_concepts: Record<string, SubjectConcepts>;
  academic_integration: string[];
  social_emotional_learning: string[];
  core_competencies: string[];
  cooking_methods: string[];
  observances_holidays: string[];
  garden_skills: string[];
  grade_levels: string[];
}

// ---------------------------------------------------------------------------
// System prompt
// ---------------------------------------------------------------------------

let promptMemo: string | null = null;

/** Loads the Stage 2 system prompt (memoized, mirrors the PROD .md pattern). */
export function loadSystemPrompt(): string {
  if (promptMemo === null) {
    promptMemo = readFileSync(path.join(MODULE_DIR, 'prompts', 'stage2-retag.md'), 'utf8');
  }
  return promptMemo;
}

// ---------------------------------------------------------------------------
// Tool construction
// ---------------------------------------------------------------------------

function subjectKeysOf(vocab: Stage2Vocab): string[] {
  const subjectKeys = vocab.academic_concepts.subjectKeys;
  if (!subjectKeys || subjectKeys.length === 0) {
    throw new Error('vocab.academic_concepts.subjectKeys missing — vocab module contract broken');
  }
  return subjectKeys;
}

function enumArray(
  vocab: Stage2Vocab,
  field: Exclude<(typeof MAIN_PASS_FIELDS)[number], 'academic_concepts'>,
  description: string,
  minItems?: number
): EnumArraySchema {
  return {
    type: 'array',
    description,
    // Direct reference into the vocab module data — never a re-typed copy.
    items: { type: 'string', enum: vocab[field].values },
    uniqueItems: true,
    ...(minItems !== undefined ? { minItems } : {}),
  };
}

/**
 * Builds the single monolithic `submit_tags` tool from the vocab module.
 * One enum-constrained array property per vocab field, the subject-keyed
 * dual-vocab concepts object, and the grade array — all required.
 */
export function buildSubmitTagsTool(vocab: Stage2Vocab): SubmitTagsTool {
  const subjects = subjectKeysOf(vocab);

  const conceptsProperty: ConceptsObjectSchema = {
    type: 'object',
    description:
      'Academic Concepts per subject, in BOTH vocabularies plus everyday-to-framework synonym pairs. Every subject key is required; use empty arrays for subjects with no concepts.',
    properties: Object.fromEntries(
      subjects.map((subject) => [subject, { $ref: '#/$defs/subjectConcepts' as const }])
    ),
    required: [...subjects],
    additionalProperties: false,
  };

  const properties: Record<string, EnumArraySchema | ConceptsObjectSchema> = {
    activity_type: enumArray(vocab, 'activity_type', 'Activity Type — at least one applies.', 1),
    tags: enumArray(vocab, 'tags', 'Lesson Type tags.'),
    season_timing: enumArray(vocab, 'season_timing', 'Seasons the lesson claims or depends on.'),
    cultural_responsiveness_features: enumArray(
      vocab,
      'cultural_responsiveness_features',
      'Cultural Responsiveness Features (Brown framework) clearly demonstrated.'
    ),
    cultural_heritage: enumArray(
      vocab,
      'cultural_heritage',
      'Cultural heritages the lesson genuinely engages.'
    ),
    academic_concepts: conceptsProperty,
    academic_integration: enumArray(
      vocab,
      'academic_integration',
      'Subjects with substantive academic content.'
    ),
    social_emotional_learning: enumArray(
      vocab,
      'social_emotional_learning',
      'CASEL competencies the lesson explicitly practices.'
    ),
    core_competencies: enumArray(
      vocab,
      'core_competencies',
      'ESYNYC core competencies the lesson serves.'
    ),
    cooking_methods: enumArray(
      vocab,
      'cooking_methods',
      'Cooking methods actually used by students.'
    ),
    observances_holidays: enumArray(
      vocab,
      'observances_holidays',
      'Observances the lesson is explicitly tied to.'
    ),
    garden_skills: enumArray(vocab, 'garden_skills', 'Garden skills practiced or taught.'),
    grade_levels: {
      type: 'array',
      description:
        'Grades the lesson document itself states — source-doc claim only; empty if the document is silent.',
      items: { type: 'string', enum: GRADE_LEVELS },
      uniqueItems: true,
    },
  };

  return {
    name: SUBMIT_TAGS_TOOL_NAME,
    description:
      'Submit the selected canonical metadata values for the lesson across all main-pass fields plus grade levels.',
    input_schema: {
      type: 'object',
      $defs: {
        // Single shared copy of the concepts enum (direct vocab reference);
        // framework arrays and synonym-pair framework slots both $ref it.
        concept: { type: 'string', enum: vocab.academic_concepts.values },
        subjectConcepts: {
          type: 'object',
          properties: {
            framework: {
              type: 'array',
              description: 'Canonical framework concept names taught by the lesson.',
              items: { $ref: '#/$defs/concept' },
              uniqueItems: true,
            },
            everyday: {
              type: 'array',
              description: 'The same concepts as plain everyday search phrases.',
              items: { type: 'string', minLength: 1 },
              uniqueItems: true,
            },
            synonym_pairs: {
              type: 'array',
              description: 'Explicit everyday-phrase to framework-concept links.',
              items: {
                type: 'object',
                properties: {
                  everyday: { type: 'string', minLength: 1 },
                  framework: { $ref: '#/$defs/concept' },
                },
                required: ['everyday', 'framework'],
                additionalProperties: false,
              },
            },
          },
          required: ['framework', 'everyday', 'synonym_pairs'],
          additionalProperties: false,
        },
      },
      properties,
      required: Object.keys(properties),
      additionalProperties: false,
    },
    cache_control: { type: 'ephemeral' },
  };
}

// ---------------------------------------------------------------------------
// Zod result schema — mirrors the input_schema exactly
// ---------------------------------------------------------------------------

function zodEnumFrom(values: string[]): z.ZodEnum<[string, ...string[]]> {
  if (values.length === 0) {
    throw new Error('cannot build an enum from an empty value list');
  }
  return z.enum(values as [string, ...string[]]);
}

const UNIQUE_MESSAGE = 'duplicate values not allowed (uniqueItems)';

function noDuplicates(arr: readonly unknown[]): boolean {
  return new Set(arr).size === arr.length;
}

function uniqueEnumArray(values: string[], minItems = 0) {
  return z
    .array(zodEnumFrom(values))
    .min(minItems)
    .refine(noDuplicates, { message: UNIQUE_MESSAGE });
}

/**
 * The Zod schema every API response must `safeParse` before it counts as a
 * valid record (post-hoc validation is load-bearing: input_schema enum
 * adherence is not server-guaranteed). Mirrors the input_schema: same 13
 * required properties, same enums, uniqueItems as refinements, unknown keys
 * rejected (`.strict()` = additionalProperties: false).
 */
export function buildResultSchema(vocab: Stage2Vocab) {
  const subjects = subjectKeysOf(vocab);
  const conceptEnum = zodEnumFrom(vocab.academic_concepts.values);

  const subjectConcepts = z
    .object({
      framework: z.array(conceptEnum).refine(noDuplicates, { message: UNIQUE_MESSAGE }),
      everyday: z.array(z.string().min(1)).refine(noDuplicates, { message: UNIQUE_MESSAGE }),
      synonym_pairs: z.array(
        z.object({ everyday: z.string().min(1), framework: conceptEnum }).strict()
      ),
    })
    .strict();

  return z
    .object({
      activity_type: uniqueEnumArray(vocab.activity_type.values, 1),
      tags: uniqueEnumArray(vocab.tags.values),
      season_timing: uniqueEnumArray(vocab.season_timing.values),
      cultural_responsiveness_features: uniqueEnumArray(
        vocab.cultural_responsiveness_features.values
      ),
      cultural_heritage: uniqueEnumArray(vocab.cultural_heritage.values),
      academic_concepts: z
        .object(Object.fromEntries(subjects.map((subject) => [subject, subjectConcepts])))
        .strict(),
      academic_integration: uniqueEnumArray(vocab.academic_integration.values),
      social_emotional_learning: uniqueEnumArray(vocab.social_emotional_learning.values),
      core_competencies: uniqueEnumArray(vocab.core_competencies.values),
      cooking_methods: uniqueEnumArray(vocab.cooking_methods.values),
      observances_holidays: uniqueEnumArray(vocab.observances_holidays.values),
      garden_skills: uniqueEnumArray(vocab.garden_skills.values),
      grade_levels: z.array(z.enum(GRADE_LEVELS)).refine(noDuplicates, {
        message: UNIQUE_MESSAGE,
      }),
    })
    .strict();
}

// ---------------------------------------------------------------------------
// Token-mass guard
// ---------------------------------------------------------------------------

/**
 * Static token estimate (chars/4 heuristic) over the cached prefix: system
 * prompt + serialized tool. The live `count_tokens` preflight is the real
 * measurement (run `npx tsx scripts/stage2-retag/preflight-token-mass.ts`);
 * this estimate is the credit-free guard used in tests.
 */
export function estimateTokenMass(systemPrompt: string, tool: SubmitTagsTool): number {
  return Math.ceil((systemPrompt.length + JSON.stringify(tool).length) / 4);
}

/**
 * The exact `messages.countTokens` request for the preflight — mirrors the
 * canonical run-call shape (system array block + single forced tool, each
 * with cache_control; single user turn) minus `max_tokens`, which
 * count_tokens does not take.
 */
export function buildTokenCountRequest(
  vocab: Stage2Vocab,
  body: string,
  model: string = DEFAULT_MODEL
): Anthropic.Messages.MessageCountTokensParams {
  return {
    model,
    system: [{ type: 'text', text: loadSystemPrompt(), cache_control: { type: 'ephemeral' } }],
    tools: [buildSubmitTagsTool(vocab)],
    tool_choice: { type: 'tool', name: SUBMIT_TAGS_TOOL_NAME },
    messages: [{ role: 'user', content: body }],
  };
}
