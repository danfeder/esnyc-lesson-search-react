/**
 * Tests for the Stage 2 re-tag monolithic tool schema + result validation
 * (task A5, TDD).
 *
 * Property-set reconciliation (recorded as an A5 deviation): the impl plan's
 * test wording says "exactly 12 field properties", but the plan's own A5 text
 * names two structures beyond the 12 vocab fields — the grade array and the
 * concepts dual-vocab/synonym-pair structure (OQ10: synonyms come out of the
 * SAME call). The synonym pairs live INSIDE the `academic_concepts`
 * subject-keyed object, so the exact intended top-level property set is:
 * the 12 vocab fields + `grade_levels` = 13 properties. Asserted exactly
 * below.
 *
 * Grade enum source: `src/types/lessonMetadata.zod.ts` carries no grade enum
 * (`gradeLevels: z.array(z.string())` is open), so the authoritative list is
 * `FILTER_CONFIGS.gradeLevels.options[].value` in
 * `src/utils/filterDefinitions.ts` (the spec's named fallback source) —
 * copied verbatim into schema.ts and equality-tested here.
 */
import { describe, expect, it } from 'vitest';

import { FILTER_CONFIGS } from '@/utils/filterDefinitions';

import {
  GRADE_LEVELS,
  RESULT_PROPERTIES,
  SUBMIT_TAGS_TOOL_NAME,
  TOKEN_MASS_BUDGET_TOKENS,
  buildResultSchema,
  buildSubmitTagsTool,
  buildTokenCountRequest,
  estimateTokenMass,
  loadSystemPrompt,
  type EnumArraySchema,
  type ConceptsObjectSchema,
  type Stage2RetagResult,
  type SubjectConcepts,
} from './schema';
import { MAIN_PASS_FIELDS, loadVocab, type MainPassField } from './vocab';

const vocab = loadVocab();
const tool = buildSubmitTagsTool(vocab);
const resultSchema = buildResultSchema(vocab);
const subjects = vocab.academic_integration.values;
const concept = vocab.academic_concepts.values[0];

/** The 11 enum-array vocab fields (every main-pass field except the concepts object). */
const ENUM_ARRAY_FIELDS = MAIN_PASS_FIELDS.filter(
  (field): field is Exclude<MainPassField, 'academic_concepts'> => field !== 'academic_concepts'
);

function enumProp(field: string): EnumArraySchema {
  return tool.input_schema.properties[field] as EnumArraySchema;
}

function emptySubject(): SubjectConcepts {
  return { framework: [], everyday: [], synonym_pairs: [] };
}

/** A fully valid result: one populated subject, empties where "none" is legitimate. */
function validResult(): Stage2RetagResult {
  return {
    activity_type: [vocab.activity_type.values[0]],
    tags: [],
    season_timing: [vocab.season_timing.values[0]],
    cultural_responsiveness_features: [vocab.cultural_responsiveness_features.values[0]],
    cultural_heritage: [vocab.cultural_heritage.values[0]],
    academic_concepts: Object.fromEntries(
      subjects.map((subject, i) => [
        subject,
        i === 0
          ? {
              framework: [concept],
              everyday: ['how plants make food'],
              synonym_pairs: [{ everyday: 'how plants make food', framework: concept }],
            }
          : emptySubject(),
      ])
    ),
    academic_integration: [vocab.academic_integration.values[0]],
    social_emotional_learning: [],
    core_competencies: [vocab.core_competencies.values[0]],
    cooking_methods: [],
    observances_holidays: [],
    garden_skills: [vocab.garden_skills.values[0]],
    cooking_skills: [vocab.cooking_skills.values[0]],
    main_ingredients: [],
    grade_levels: ['K', '1', '2'],
  };
}

// ---------------------------------------------------------------------------
// Tool shape — mirrors the PROD canonical call shape (oq1 artifact §2)
// ---------------------------------------------------------------------------

describe('submit_tags tool shape', () => {
  it('mirrors the PROD tool envelope: name, description, cache_control', () => {
    expect(tool.name).toBe('submit_tags');
    expect(SUBMIT_TAGS_TOOL_NAME).toBe('submit_tags');
    expect(tool.description.length).toBeGreaterThan(0);
    expect(tool.cache_control).toEqual({ type: 'ephemeral' });
    expect(tool.input_schema.type).toBe('object');
    expect(tool.input_schema.additionalProperties).toBe(false);
  });

  it('contains exactly the intended property set: 14 vocab fields + grade_levels', () => {
    const expected = [...MAIN_PASS_FIELDS, 'grade_levels'].sort();
    expect(Object.keys(tool.input_schema.properties).sort()).toEqual(expected);
    // 14 main-pass vocab fields (incl. C02 cooking_skills + main_ingredients)
    // + grade_levels = 15.
    expect(Object.keys(tool.input_schema.properties)).toHaveLength(15);
    expect([...RESULT_PROPERTIES].sort()).toEqual(expected);
  });

  it('requires every property (all fields answered every call)', () => {
    expect([...tool.input_schema.required].sort()).toEqual(
      Object.keys(tool.input_schema.properties).sort()
    );
  });
});

// ---------------------------------------------------------------------------
// Enum-array properties — REFERENCES into the vocab module, never copies
// ---------------------------------------------------------------------------

describe('enum-array properties', () => {
  it.each(ENUM_ARRAY_FIELDS.map((f) => [f] as const))(
    '%s: items.enum IS the vocab module array (reference identity), uniqueItems on',
    (field) => {
      const prop = enumProp(field);
      expect(prop.type).toBe('array');
      expect(prop.uniqueItems).toBe(true);
      // Identity, not just equality: the schema must reference vocab data,
      // never re-type enum values.
      expect(prop.items.enum).toBe(vocab[field].values);
    }
  );

  it('activity_type requires at least one value (the taxonomy is exhaustive)', () => {
    expect(enumProp('activity_type').minItems).toBe(1);
  });

  it('activity_type description states the academic-exclusivity decision rule', () => {
    const desc = enumProp('activity_type').description ?? '';
    // The old "at least one applies" wording actively invited multi-tagging.
    expect(desc).not.toMatch(/at least one applies/i);
    // It must communicate the by-elimination, mutually-exclusive `academic`
    // rule (code-enforced now, but the prompt/schema should agree).
    expect(desc).toMatch(/academic/i);
    expect(desc).toMatch(/cooking/i);
    expect(desc).toMatch(/never|only|alone/i);
  });

  it('every other array allows empty ("none" is legitimate)', () => {
    for (const field of [
      ...ENUM_ARRAY_FIELDS.filter((f) => f !== 'activity_type'),
      'grade_levels',
    ]) {
      expect(enumProp(field).minItems, `${field} should allow an empty array`).toBeUndefined();
    }
  });
});

// ---------------------------------------------------------------------------
// grade_levels — authoritative list from filterDefinitions.ts
// ---------------------------------------------------------------------------

describe('grade_levels', () => {
  it('GRADE_LEVELS matches the authoritative FILTER_CONFIGS.gradeLevels list verbatim', () => {
    expect([...GRADE_LEVELS]).toEqual(FILTER_CONFIGS.gradeLevels.options.map((o) => o.value));
  });

  it('the grade property is an enum array over GRADE_LEVELS', () => {
    const prop = enumProp('grade_levels');
    expect(prop.type).toBe('array');
    expect(prop.uniqueItems).toBe(true);
    expect([...prop.items.enum]).toEqual([...GRADE_LEVELS]);
  });
});

// ---------------------------------------------------------------------------
// academic_concepts — subject-keyed dual-vocab + synonym pairs (D5/OQ10)
// ---------------------------------------------------------------------------

describe('academic_concepts structure', () => {
  const conceptsProp = () => tool.input_schema.properties.academic_concepts as ConceptsObjectSchema;

  it('is an object keyed by exactly the 6 academic_integration subjects, all required', () => {
    const prop = conceptsProp();
    expect(prop.type).toBe('object');
    expect(prop.additionalProperties).toBe(false);
    expect(Object.keys(prop.properties)).toEqual(subjects);
    expect([...prop.required]).toEqual(subjects);
    expect(subjects).toHaveLength(6);
  });

  it('each subject $refs the shared subjectConcepts definition', () => {
    const prop = conceptsProp();
    for (const subject of subjects) {
      expect(prop.properties[subject]).toEqual({ $ref: '#/$defs/subjectConcepts' });
    }
  });

  it('the shared concept enum IS the vocab module concepts array (single copy via $defs)', () => {
    expect(tool.input_schema.$defs.concept.enum).toBe(vocab.academic_concepts.values);
    // The serialized tool carries exactly ONE copy of the concept enum —
    // framework arrays and synonym-pair framework slots both $ref it.
    const serialized = JSON.stringify(tool);
    const probe = JSON.stringify(vocab.academic_concepts.values[0]);
    expect(serialized.split(probe).length - 1).toBe(1);
  });

  it('subjectConcepts requires framework + everyday + synonym_pairs, framework enum-constrained', () => {
    const def = tool.input_schema.$defs.subjectConcepts;
    expect([...def.required]).toEqual(['framework', 'everyday', 'synonym_pairs']);
    expect(def.additionalProperties).toBe(false);
    expect(def.properties.framework.items).toEqual({ $ref: '#/$defs/concept' });
    expect(def.properties.framework.uniqueItems).toBe(true);
    // everyday is free vocabulary — no enum.
    expect(def.properties.everyday.items).toEqual({ type: 'string', minLength: 1 });
    expect(def.properties.everyday.uniqueItems).toBe(true);
    // synonym pairs: everyday phrase ↔ framework concept (enum side $ref'd).
    const pairItems = def.properties.synonym_pairs.items;
    expect([...pairItems.required].sort()).toEqual(['everyday', 'framework']);
    expect(pairItems.additionalProperties).toBe(false);
    expect(pairItems.properties.everyday).toEqual({ type: 'string', minLength: 1 });
    expect(pairItems.properties.framework).toEqual({ $ref: '#/$defs/concept' });
  });
});

// ---------------------------------------------------------------------------
// Zod result schema — the post-hoc validation gate (enum adherence is NOT
// server-guaranteed), mirroring the input_schema
// ---------------------------------------------------------------------------

describe('Zod result schema', () => {
  it('accepts a valid full result', () => {
    const parsed = resultSchema.safeParse(validResult());
    expect(parsed.success, JSON.stringify(!parsed.success && parsed.error.issues)).toBe(true);
  });

  it('accepts empty arrays everywhere "none" is legitimate', () => {
    const result = validResult();
    result.tags = [];
    result.season_timing = [];
    result.cultural_responsiveness_features = [];
    result.cultural_heritage = [];
    result.academic_integration = [];
    result.core_competencies = [];
    result.garden_skills = [];
    result.grade_levels = []; // silent doc → no grades (OQ6 lock)
    result.academic_concepts = Object.fromEntries(subjects.map((s) => [s, emptySubject()]));
    expect(resultSchema.safeParse(result).success).toBe(true);
  });

  it('rejects an empty activity_type (taxonomy is exhaustive — minItems 1)', () => {
    const result = validResult();
    result.activity_type = [];
    expect(resultSchema.safeParse(result).success).toBe(false);
  });

  it.each(ENUM_ARRAY_FIELDS.map((f) => [f] as const))('%s: rejects off-enum values', (field) => {
    const result = validResult();
    result[field] = [...result[field], 'NOT-A-CANONICAL-VALUE'];
    expect(resultSchema.safeParse(result).success).toBe(false);
  });

  it('rejects off-enum grades (label spellings, out-of-range grades)', () => {
    for (const bad of ['Pre-K', '9', 'Kindergarten']) {
      const result = validResult();
      result.grade_levels = [bad];
      expect(resultSchema.safeParse(result).success, `should reject grade ${bad}`).toBe(false);
    }
  });

  it('accepts every authoritative grade token', () => {
    const result = validResult();
    result.grade_levels = [...GRADE_LEVELS];
    expect(resultSchema.safeParse(result).success).toBe(true);
  });

  it('rejects duplicate values (uniqueItems mirror)', () => {
    const result = validResult();
    result.grade_levels = ['K', 'K'];
    expect(resultSchema.safeParse(result).success).toBe(false);
    const dupTags = validResult();
    dupTags.garden_skills = [vocab.garden_skills.values[0], vocab.garden_skills.values[0]];
    expect(resultSchema.safeParse(dupTags).success).toBe(false);
  });

  it.each([...MAIN_PASS_FIELDS, 'grade_levels'].map((f) => [f] as const))(
    'rejects a result missing required field %s',
    (field) => {
      const result = validResult() as unknown as Record<string, unknown>;
      delete result[field];
      expect(resultSchema.safeParse(result).success).toBe(false);
    }
  );

  it('rejects unknown top-level keys (additionalProperties mirror)', () => {
    const result = validResult() as unknown as Record<string, unknown>;
    // C02 folded cooking_skills + main_ingredients INTO the main pass, so the
    // unknown-key probe uses a field that is genuinely outside the schema.
    result.not_a_real_field = []; // not in MAIN_PASS_FIELDS / RESULT_PROPERTIES
    expect(resultSchema.safeParse(result).success).toBe(false);
  });

  it('rejects academic_concepts missing a subject key', () => {
    const result = validResult();
    delete (result.academic_concepts as Record<string, unknown>)[subjects[0]];
    expect(resultSchema.safeParse(result).success).toBe(false);
  });

  it('rejects academic_concepts with an unknown subject key', () => {
    const result = validResult();
    (result.academic_concepts as Record<string, unknown>)['Physical Education'] = emptySubject();
    expect(resultSchema.safeParse(result).success).toBe(false);
  });

  it('rejects off-enum framework concepts (framework array AND synonym-pair side)', () => {
    const inArray = validResult();
    inArray.academic_concepts[subjects[0]].framework = ['NOT-A-CANONICAL-CONCEPT'];
    expect(resultSchema.safeParse(inArray).success).toBe(false);

    const inPair = validResult();
    inPair.academic_concepts[subjects[0]].synonym_pairs = [
      { everyday: 'some phrase', framework: 'NOT-A-CANONICAL-CONCEPT' },
    ];
    expect(resultSchema.safeParse(inPair).success).toBe(false);
  });

  it('rejects malformed synonym pairs (missing framework, empty everyday phrase)', () => {
    const missing = validResult();
    missing.academic_concepts[subjects[0]].synonym_pairs = [
      { everyday: 'some phrase' } as unknown as { everyday: string; framework: string },
    ];
    expect(resultSchema.safeParse(missing).success).toBe(false);

    const empty = validResult();
    empty.academic_concepts[subjects[0]].everyday = [''];
    expect(resultSchema.safeParse(empty).success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// System prompt — the locked walkthrough policies must be present
// ---------------------------------------------------------------------------

describe('system prompt (prompts/stage2-retag.md)', () => {
  const prompt = loadSystemPrompt();

  it('is substantial', () => {
    expect(prompt.length).toBeGreaterThan(2000);
  });

  it.each([
    ['grades = source-doc claim only', /never infer grades/i],
    ['silent docs → empty grade array', /empty array/i],
    ['tasting ≠ cooking failure class', /tasting is not cooking/i],
    ['cosmetics/soap → craft', /soap/i],
    ['same-titled variants tagged independently', /independently/i],
    ['concepts in everyday vocabulary', /everyday/i],
    ['everyday↔framework synonym pairs', /synonym/i],
    ['CRF Brown framework semantics', /Brown/],
    ['extraction table markers are content', /\[Table\]/],
    ['heritage mention-vs-about rule (B3 ban-case seed)', /Mention vs\. about/],
    ['heritage feature-only example stays empty', /a featured dish is not cultural engagement/],
  ] as const)('carries the locked policy: %s', (_label, pattern) => {
    expect(prompt).toMatch(pattern);
  });
});

// ---------------------------------------------------------------------------
// Token-mass guard — static estimate now; live count_tokens deferred to A8
// (zero Console credits), runnable via preflight-token-mass.ts
// ---------------------------------------------------------------------------

describe('token-mass guard', () => {
  // TOKEN_MASS_BUDGET_TOKENS (12K) is the PROXY-MEASURED ceiling: it includes
  // the CLIProxyAPI cloak's ~1.4K injected prompt that shows up only when
  // count_tokens routes through the proxy. The static estimate below is
  // OWN-PREFIX (chars/4 over our prompt + serialized tool, no cloak) and the
  // own-prefix budget is effectively ~10.5K — so the static estimate sits
  // comfortably below either line. The single assertion against the 12K
  // proxy ceiling is the conservative guard (own-prefix < proxy-measured).
  it('prompt + tool own-prefix static estimate stays under the proxy-measured budget', () => {
    const estimate = estimateTokenMass(loadSystemPrompt(), tool);
    expect(estimate).toBeGreaterThan(0);
    expect(
      estimate,
      `Own-prefix static estimate ${estimate} tokens (chars/4 over prompt + serialized tool, ` +
        `no proxy cloak) exceeds the ~${TOKEN_MASS_BUDGET_TOKENS}-token proxy-measured budget ` +
        `(12K = own-prefix ~10.5K + cloak ~1.4K) — STOP and reassess the cost projection before ` +
        `any run. (Live count_tokens preflight: npx tsx scripts/stage2-retag/preflight-token-mass.ts)`
    ).toBeLessThan(TOKEN_MASS_BUDGET_TOKENS);
  });

  it('buildTokenCountRequest mirrors the canonical call shape (no max_tokens)', () => {
    const body = 'Lesson body sample';
    const req = buildTokenCountRequest(vocab, body);
    expect(req.model).toBe('claude-opus-4-7');
    expect(req.system).toEqual([
      { type: 'text', text: loadSystemPrompt(), cache_control: { type: 'ephemeral' } },
    ]);
    expect(req.tools).toHaveLength(1);
    const requestTool = req.tools?.[0] as { name?: string };
    expect(requestTool.name).toBe('submit_tags');
    expect(req.tool_choice).toEqual({ type: 'tool', name: 'submit_tags' });
    expect(req.messages).toEqual([{ role: 'user', content: body }]);
    expect('max_tokens' in req).toBe(false);
  });
});
