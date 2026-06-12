/**
 * Canonical vocab assembly for the Stage 2 re-tag main pass (task A3).
 *
 * Loads the locked canonical vocabularies for all 12 main-pass fields:
 *
 *   - 4 PR-1 closed enums from `src/types/generated/enums.json`
 *     (activity_type, tags, season_timing, cultural_responsiveness_features);
 *   - cultural_heritage + academic_concepts via an adapter that flattens the
 *     Stage-1 worksheet artifact shape `{provenance, canonical[], alias_map,
 *     drops}` (`data/vocab/*.vocab.json`) to the canonical surface-label
 *     list — drops excluded, alias_map never leaking into the enum list
 *     (aliases are rewrite inputs, not canonical values);
 *   - the 6 walkthrough-locked smaller fields from
 *     `scripts/stage2-retag/data/smaller-fields.vocab.json` (design doc §4
 *     OQ2 lock; spellings transcribed from filterDefinitions.ts + the census
 *     artifact).
 *
 * Each field declares its enum values, display label, selection arity, and
 * the dual-write targets (lessons text[] column + metadata JSONB key, census
 * §1). `academic_concepts` is the documented exception: it has NO lessons
 * column — it lives only at `metadata->academicConcepts` as an object keyed
 * by the 6 canonical academic_integration subjects.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(MODULE_DIR, '../..');

// ---------------------------------------------------------------------------
// Field inventory
// ---------------------------------------------------------------------------

export const MAIN_PASS_FIELDS = [
  'activity_type',
  'tags',
  'season_timing',
  'cultural_responsiveness_features',
  'cultural_heritage',
  'academic_concepts',
  'academic_integration',
  'social_emotional_learning',
  'core_competencies',
  'cooking_methods',
  'observances_holidays',
  'garden_skills',
] as const;

export type MainPassField = (typeof MAIN_PASS_FIELDS)[number];

export interface FieldVocab {
  /** snake_case design-doc field name (= lessons column name where one exists). */
  field: MainPassField;
  /** Human display label (filterDefinitions config labels). */
  label: string;
  /** Locked canonical enum values. */
  values: string[];
  /** Tagging-output arity. All 12 main-pass fields are array-valued in storage. */
  selection: 'multi' | 'single';
  /**
   * Dual-write target: `lessons.<column>` text[] — `null` for
   * academic_concepts, which is JSONB-only (no lessons column).
   */
  column: string | null;
  /** Dual-write target: `metadata-><jsonbKey>`. */
  jsonbKey: string;
  /** JSONB value shape. */
  shape: 'string-array' | 'subject-keyed-object';
  /**
   * For `subject-keyed-object` fields only: the canonical object keys
   * (academic_concepts is keyed by the 6 academic_integration subjects).
   */
  subjectKeys?: string[];
}

export type Stage2Vocab = Record<MainPassField, FieldVocab>;

// ---------------------------------------------------------------------------
// Input-file schemas (TS+Zod runner discipline: validate everything loaded)
// ---------------------------------------------------------------------------

/** Stage-1 worksheet vocab artifact (`data/vocab/*.vocab.json`). */
export const vocabArtifactSchema = z.object({
  provenance: z.record(z.unknown()),
  canonical: z
    .array(z.object({ key: z.string().min(1), label: z.string().min(1) }).passthrough())
    .min(1),
  alias_map: z.record(z.string()),
  drops: z.array(z.string()),
});

export type VocabArtifact = z.infer<typeof vocabArtifactSchema>;

/** The 4 PR-1 closed enums (`src/types/generated/enums.json`). */
const enumsJsonSchema = z.object({
  activity_type: z.array(z.string().min(1)).min(1),
  tags: z.array(z.string().min(1)).min(1),
  season_timing: z.array(z.string().min(1)).min(1),
  cultural_responsiveness_features: z.array(z.string().min(1)).min(1),
});

/** The 6 walkthrough-locked smaller fields (local data file). */
const smallerFieldsSchema = z.object({
  provenance: z.record(z.unknown()),
  fields: z.object({
    academic_integration: z.array(z.string().min(1)).min(1),
    social_emotional_learning: z.array(z.string().min(1)).min(1),
    core_competencies: z.array(z.string().min(1)).min(1),
    cooking_methods: z.array(z.string().min(1)).min(1),
    observances_holidays: z.array(z.string().min(1)).min(1),
    garden_skills: z.array(z.string().min(1)).min(1),
  }),
});

// ---------------------------------------------------------------------------
// Worksheet-artifact adapter
// ---------------------------------------------------------------------------

/**
 * Flattens a Stage-1 worksheet artifact to its canonical enum list: the
 * surface labels of `canonical[]`, excluding any entry whose key or label
 * appears in `drops`. `alias_map` is intentionally ignored — alias literals
 * are corpus-rewrite inputs, never canonical values.
 */
export function flattenVocabArtifact(artifact: VocabArtifact): string[] {
  const drops = new Set(artifact.drops);
  const values = artifact.canonical
    .filter((entry) => !drops.has(entry.key) && !drops.has(entry.label))
    .map((entry) => entry.label);
  const seen = new Set(values);
  if (seen.size !== values.length) {
    const dupes = values.filter((value, index) => values.indexOf(value) !== index);
    throw new Error(
      `vocab artifact has duplicate surface labels: ${[...new Set(dupes)].join(', ')}`
    );
  }
  return values;
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

function readJsonFile(relPath: string): unknown {
  return JSON.parse(readFileSync(path.join(REPO_ROOT, relPath), 'utf8'));
}

/**
 * Loads and assembles the locked canonical vocab for all 12 main-pass fields.
 * Throws (loudly, via Zod) if any input file is missing or malformed.
 */
export function loadVocab(): Stage2Vocab {
  const enums = enumsJsonSchema.parse(readJsonFile('src/types/generated/enums.json'));
  const heritage = vocabArtifactSchema.parse(
    readJsonFile('data/vocab/cultural-heritage.vocab.json')
  );
  const concepts = vocabArtifactSchema.parse(
    readJsonFile('data/vocab/academic-concepts.vocab.json')
  );
  const smaller = smallerFieldsSchema.parse(
    readJsonFile('scripts/stage2-retag/data/smaller-fields.vocab.json')
  );

  const academicIntegrationValues = [...smaller.fields.academic_integration];

  return {
    activity_type: {
      field: 'activity_type',
      label: 'Activity Type',
      values: [...enums.activity_type],
      selection: 'multi',
      column: 'activity_type',
      jsonbKey: 'activityType',
      shape: 'string-array',
    },
    tags: {
      field: 'tags',
      label: 'Lesson Type',
      values: [...enums.tags],
      selection: 'multi',
      column: 'tags',
      jsonbKey: 'tags',
      shape: 'string-array',
    },
    season_timing: {
      field: 'season_timing',
      label: 'Season & Timing',
      values: [...enums.season_timing],
      selection: 'multi',
      column: 'season_timing',
      jsonbKey: 'seasonTiming',
      shape: 'string-array',
    },
    cultural_responsiveness_features: {
      field: 'cultural_responsiveness_features',
      label: 'Cultural Responsiveness Features',
      values: [...enums.cultural_responsiveness_features],
      selection: 'multi',
      column: 'cultural_responsiveness_features',
      jsonbKey: 'culturalResponsivenessFeatures',
      shape: 'string-array',
    },
    cultural_heritage: {
      field: 'cultural_heritage',
      label: 'Cultural Heritage',
      values: flattenVocabArtifact(heritage),
      selection: 'multi',
      column: 'cultural_heritage',
      jsonbKey: 'culturalHeritage',
      shape: 'string-array',
    },
    academic_concepts: {
      field: 'academic_concepts',
      label: 'Academic Concepts',
      values: flattenVocabArtifact(concepts),
      selection: 'multi',
      // Documented exception: academic_concepts has NO lessons text[] column.
      // It exists only as metadata->academicConcepts, an object keyed by the
      // 6 canonical academic_integration subjects (census §1 / §5.1).
      column: null,
      jsonbKey: 'academicConcepts',
      shape: 'subject-keyed-object',
      subjectKeys: academicIntegrationValues,
    },
    academic_integration: {
      field: 'academic_integration',
      label: 'Academic Integration',
      values: academicIntegrationValues,
      selection: 'multi',
      column: 'academic_integration',
      jsonbKey: 'academicIntegration',
      shape: 'string-array',
    },
    social_emotional_learning: {
      field: 'social_emotional_learning',
      label: 'Social-Emotional Learning',
      values: [...smaller.fields.social_emotional_learning],
      selection: 'multi',
      column: 'social_emotional_learning',
      jsonbKey: 'socialEmotionalLearning',
      shape: 'string-array',
    },
    core_competencies: {
      field: 'core_competencies',
      label: 'Core Competencies',
      values: [...smaller.fields.core_competencies],
      selection: 'multi',
      column: 'core_competencies',
      jsonbKey: 'coreCompetencies',
      shape: 'string-array',
    },
    cooking_methods: {
      field: 'cooking_methods',
      label: 'Cooking Methods',
      values: [...smaller.fields.cooking_methods],
      selection: 'multi',
      column: 'cooking_methods',
      jsonbKey: 'cookingMethods',
      shape: 'string-array',
    },
    observances_holidays: {
      field: 'observances_holidays',
      label: 'Observances & Holidays',
      values: [...smaller.fields.observances_holidays],
      selection: 'multi',
      column: 'observances_holidays',
      jsonbKey: 'observancesHolidays',
      shape: 'string-array',
    },
    garden_skills: {
      field: 'garden_skills',
      label: 'Garden Skills',
      values: [...smaller.fields.garden_skills],
      selection: 'multi',
      column: 'garden_skills',
      jsonbKey: 'gardenSkills',
      shape: 'string-array',
    },
  };
}
