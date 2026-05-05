/**
 * Canonical lesson metadata Zod schema (Gate B canonical source).
 *
 * Source of truth for the canonical lesson shape — consumed by
 * process-submission (LLM-draft writer in PR 2; canonical keys), data-import
 * scripts, and the Stage 2 corpus re-tag (PR 6+).
 *
 * Companion schema `reviewFormPayload.zod.ts` captures the review-form shape
 * (themes/season/location keys, single-select strings) that complete-review
 * accepts. Bidirectional mappers in `src/utils/{reviewToLesson,
 * lessonToReview}Mapper.ts` mirror the SQL translation in
 * `complete_review_atomic` (see migration 20260428000003 lines 142-167).
 *
 * Closed-enum coverage in this scaffold:
 *   - activity_type (D2 — 5 values)
 *   - tags (D2 + D7 — 2 values)
 *   - season_timing (existing valid_seasons CHECK — 4 values)
 *   - cultural_responsiveness_features (D9 — 7 master-list features)
 *
 * Other vocabulary fields stay open `z.array(z.string())` until Stage 1
 * worksheets close them in PR 5+ (see design doc §5).
 *
 * Sync discipline: this file is the canonical source. `enums.json` is
 * generated from it via `scripts/generate-enums-json.ts`. SQL CHECK
 * constraints + Pydantic mirrors are hand-synced from `enums.json` with
 * `-- SOURCE: enums.json["<key>"]` comment markers. See validator
 * architecture doc Decision 6 for sync-test details.
 */
import { z } from 'zod';

// =============================================================================
// Closed-enum value lists (single source of truth — also exported so
// scripts/generate-enums-json.ts can serialize them to JSON for cross-runtime
// mirrors).
// =============================================================================

export const ACTIVITY_TYPE_VALUES = ['cooking', 'garden', 'both', 'academic', 'craft'] as const;

export const TAG_VALUES = ['orientation', 'bilingual_handouts'] as const;

export const SEASON_TIMING_VALUES = ['Fall', 'Winter', 'Spring', 'Summer'] as const;

// 7 master-list features from the Brown CR framework, per v3 taxonomy.
// See docs/plans/2026-05-03-metadata-rebuild-foundation-design.md §4 (D9).
// Order mirrors v3.
export const CULTURAL_RESPONSIVENESS_FEATURE_VALUES = [
  'Promotes positive perspectives on parents and families',
  'Communicates high expectations',
  'Encourages learning within the context of culture',
  'Promotes student-centered instruction',
  'Incorporates different individual and cultural learning styles',
  'Reshapes curriculum',
  'Positions teacher as facilitator',
] as const;

// =============================================================================
// Closed-enum Zod types
// =============================================================================

export const ActivityTypeEnum = z.enum(ACTIVITY_TYPE_VALUES);
export const TagEnum = z.enum(TAG_VALUES);
export const SeasonTimingEnum = z.enum(SEASON_TIMING_VALUES);
export const CulturalResponsivenessFeatureEnum = z.enum(CULTURAL_RESPONSIVENESS_FEATURE_VALUES);

export type ActivityTypeValue = z.infer<typeof ActivityTypeEnum>;
export type TagValue = z.infer<typeof TagEnum>;
export type SeasonTimingValue = z.infer<typeof SeasonTimingEnum>;
export type CulturalResponsivenessFeatureValue = z.infer<typeof CulturalResponsivenessFeatureEnum>;

// =============================================================================
// AcademicIntegration sub-shape (PROD has both array and object regimes).
// PR 5+ canonicalizes shape decisions during Stage 1 concepts worksheet.
// =============================================================================

const academicIntegrationObjectSchema = z.object({
  concepts: z.record(z.string(), z.array(z.string())),
  selected: z.array(z.string()),
});

const academicIntegrationSchema = z.union([z.array(z.string()), academicIntegrationObjectSchema]);

// =============================================================================
// Canonical lesson metadata schema. All fields optional to match runtime
// usage (LLM drafts, partial review saves, legacy rows). Strictness lives in
// the closed-enum contents, not in field presence.
// =============================================================================

export const lessonMetadataSchema = z.object({
  // Closed-enum vocabularies (locked PR 1).
  activityType: z.array(ActivityTypeEnum).optional(),
  tags: z.array(TagEnum).optional(),
  seasonTiming: z.array(SeasonTimingEnum).optional(),
  culturalResponsivenessFeatures: z.array(CulturalResponsivenessFeatureEnum).optional(),

  // Open-string-array placeholders — tighten as Stage 1 worksheets land in PR 5+.
  thematicCategories: z.array(z.string()).optional(),
  coreCompetencies: z.array(z.string()).optional(),
  culturalHeritage: z.array(z.string()).optional(),
  locationRequirements: z.array(z.string()).optional(),
  mainIngredients: z.array(z.string()).optional(),
  gradeLevels: z.array(z.string()).optional(),
  gardenSkills: z.array(z.string()).optional(),
  cookingSkills: z.array(z.string()).optional(),
  cookingMethods: z.array(z.string()).optional(),
  observancesHolidays: z.array(z.string()).optional(),
  socialEmotionalLearning: z.array(z.string()).optional(),
  academicIntegration: academicIntegrationSchema.optional(),
  academicConcepts: z.record(z.string(), z.array(z.string())).optional(),

  // Single-string fields.
  duration: z.string().optional(),
  groupSize: z.string().optional(),
  processingNotes: z.string().optional(),
  summary: z.string().optional(),

  // Free-form arrays not under canonicalization governance (skills/equipment
  // are descriptive, not classified vocab).
  skills: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
});

export type LessonMetadataValidated = z.infer<typeof lessonMetadataSchema>;
