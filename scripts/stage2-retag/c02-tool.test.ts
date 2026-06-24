/**
 * Unit tests for the dedicated 2-field C02 verify-and-diff tool (design
 * §3·PIVOT D-P4 / impl P2′.2).
 *
 * The pilot's all-14-field `submit_tags` tool asked the model to re-tag from
 * scratch. The pivot uses a DEDICATED tool whose ONLY inputs are cooking_skills
 * + main_ingredients, each a structured KEEP/DROP/ADD decision with a reason
 * code per DROP and per ADD. The forced-tool NAME stays `submit_tags` (the
 * CLIProxyAPI proxy is detection-cleared for that name); only the INPUT SCHEMA
 * changes. Extraction (`extractForcedToolResult`) matches by that name, so it
 * keeps working unchanged.
 */
import { describe, expect, it } from 'vitest';

import {
  C02_DECISION_FIELDS,
  C02_ADD_REASONS,
  C02_DROP_REASONS,
  SUBMIT_TAGS_TOOL_NAME,
  buildC02DecisionSchema,
  buildC02SubmitTagsTool,
} from './schema';
import { loadVocab } from './vocab';

const vocab = loadVocab();
const tool = buildC02SubmitTagsTool(vocab);
const decisionSchema = buildC02DecisionSchema(vocab);

// ---------------------------------------------------------------------------
// tool shape: exactly the two C02 fields, KEEP/DROP/ADD + reason codes
// ---------------------------------------------------------------------------

describe('buildC02SubmitTagsTool — naming + 2-field scope', () => {
  it('keeps the forced-tool NAME equal to submit_tags (proxy detection-cleared)', () => {
    expect(tool.name).toBe(SUBMIT_TAGS_TOOL_NAME);
    expect(tool.name).toBe('submit_tags');
  });

  it('carries the ephemeral cache_control breakpoint like the monolithic tool', () => {
    expect(tool.cache_control).toEqual({ type: 'ephemeral' });
  });

  it('has EXACTLY cooking_skills + main_ingredients as input properties — no other field', () => {
    const keys = Object.keys(tool.input_schema.properties);
    expect(keys.sort()).toEqual(['cooking_skills', 'main_ingredients']);
    expect(tool.input_schema.required.sort()).toEqual(['cooking_skills', 'main_ingredients']);
    expect(tool.input_schema.additionalProperties).toBe(false);
    // The C02_DECISION_FIELDS const is the single source of truth for the two.
    expect([...C02_DECISION_FIELDS].sort()).toEqual(['cooking_skills', 'main_ingredients']);
  });

  it('does NOT carry any of the other 12 main-pass fields or grade_levels', () => {
    const keys = Object.keys(tool.input_schema.properties);
    for (const forbidden of [
      'activity_type',
      'tags',
      'cultural_heritage',
      'academic_concepts',
      'garden_skills',
      'cooking_methods',
      'grade_levels',
    ]) {
      expect(keys).not.toContain(forbidden);
    }
  });
});

describe('buildC02SubmitTagsTool — KEEP/DROP/ADD decision shape', () => {
  function fieldShape(field: 'cooking_skills' | 'main_ingredients') {
    return tool.input_schema.properties[field];
  }

  it('each field is an object with exactly keep / drop / add sub-properties', () => {
    for (const field of ['cooking_skills', 'main_ingredients'] as const) {
      const shape = fieldShape(field);
      expect(shape.type).toBe('object');
      expect(Object.keys(shape.properties).sort()).toEqual(['add', 'drop', 'keep']);
      expect(shape.required.sort()).toEqual(['add', 'drop', 'keep']);
      expect(shape.additionalProperties).toBe(false);
    }
  });

  it('keep is an enum array of canonical values (no reason code)', () => {
    const keep = fieldShape('cooking_skills').properties.keep;
    expect(keep.type).toBe('array');
    expect(keep.items.type).toBe('string');
    expect(Array.isArray(keep.items.enum)).toBe(true);
    expect(keep.items.enum).toContain('Baking');
  });

  it('drop entries carry a value (canonical enum) AND a reason code', () => {
    const drop = fieldShape('cooking_skills').properties.drop;
    expect(drop.type).toBe('array');
    expect(drop.items.type).toBe('object');
    expect(Object.keys(drop.items.properties).sort()).toEqual(['reason', 'value']);
    expect(drop.items.required.sort()).toEqual(['reason', 'value']);
    expect(drop.items.additionalProperties).toBe(false);
    expect(drop.items.properties.reason.enum).toEqual([...C02_DROP_REASONS]);
    expect(Array.isArray(drop.items.properties.value.enum)).toBe(true);
  });

  it('add entries carry a value (canonical enum) AND a reason code', () => {
    const add = fieldShape('main_ingredients').properties.add;
    expect(add.type).toBe('array');
    expect(add.items.type).toBe('object');
    expect(Object.keys(add.items.properties).sort()).toEqual(['reason', 'value']);
    expect(add.items.required.sort()).toEqual(['reason', 'value']);
    expect(add.items.additionalProperties).toBe(false);
    expect(add.items.properties.reason.enum).toEqual([...C02_ADD_REASONS]);
    // main_ingredients ADD value enum includes both groups and specifics.
    expect(add.items.properties.value.enum).toContain('Tomatoes');
    expect(add.items.properties.value.enum).toContain('Nightshades');
  });
});

// ---------------------------------------------------------------------------
// Zod decision parser (the post-hoc gate; reconcile in P2′.3 consumes this)
// ---------------------------------------------------------------------------

describe('buildC02DecisionSchema — parses a well-formed KEEP/DROP/ADD decision', () => {
  const wellFormed = {
    cooking_skills: {
      keep: ['Baking'],
      drop: [{ value: 'Roasting', reason: 'body-does-not-support' }],
      add: [{ value: 'Knife skills', reason: 'real-technique-taught' }],
    },
    main_ingredients: {
      keep: ['Nightshades', 'Tomatoes'],
      drop: [],
      add: [{ value: 'Apples', reason: 'specific-food-central' }],
    },
  };

  it('accepts a well-formed decision object', () => {
    const parsed = decisionSchema.safeParse(wellFormed);
    expect(parsed.success).toBe(true);
  });

  it('rejects an unknown top-level field (only the two C02 fields allowed)', () => {
    const parsed = decisionSchema.safeParse({
      ...wellFormed,
      activity_type: { keep: [], drop: [], add: [] },
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a drop entry missing its reason code', () => {
    const parsed = decisionSchema.safeParse({
      ...wellFormed,
      cooking_skills: { keep: [], drop: [{ value: 'Roasting' }], add: [] },
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects a non-canonical keep value', () => {
    const parsed = decisionSchema.safeParse({
      ...wellFormed,
      cooking_skills: { keep: ['Not A Real Skill'], drop: [], add: [] },
    });
    expect(parsed.success).toBe(false);
  });

  it('rejects an unknown reason code', () => {
    const parsed = decisionSchema.safeParse({
      ...wellFormed,
      cooking_skills: {
        keep: [],
        drop: [{ value: 'Roasting', reason: 'made-up-reason' }],
        add: [],
      },
    });
    expect(parsed.success).toBe(false);
  });
});

describe('reason-code constants', () => {
  it('drop + add reason codes are non-empty distinct string lists', () => {
    expect(C02_DROP_REASONS.length).toBeGreaterThan(0);
    expect(C02_ADD_REASONS.length).toBeGreaterThan(0);
    expect(new Set(C02_DROP_REASONS).size).toBe(C02_DROP_REASONS.length);
    expect(new Set(C02_ADD_REASONS).size).toBe(C02_ADD_REASONS.length);
  });
});
