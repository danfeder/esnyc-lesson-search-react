/**
 * Deno-runtime mirror of the canonical Zod schemas at:
 *   - src/types/lessonMetadata.zod.ts
 *   - src/types/reviewFormPayload.zod.ts
 *
 * Why duplicated: edge functions deploy from the supabase/functions/ tree only.
 * Importing from `../../../src/types/...` is unreliable across Supabase CLI
 * deploy versions, and `_shared/` is the established cross-function utility
 * pattern (see _shared/cors.ts, _shared/search-helpers.ts).
 *
 * Drift protection: src/types/edgeSharedSchemas.equivalence.test.ts
 * imports both this file and the canonical schemas, runs identical fixtures
 * through both, and asserts behavioural equivalence. CI fails if they drift.
 *
 * `import { z } from 'zod'` resolves via supabase/functions/deno.json
 * (`{"imports": { "zod": "npm:zod@3.24.0" }}`) on the edge runtime; in node
 * (Vitest, scripts) it resolves from node_modules. Dual-runtime by design.
 */
import { z } from 'zod';

// =============================================================================
// Closed-enum value lists — MUST match src/types/lessonMetadata.zod.ts.
// =============================================================================

export const ACTIVITY_TYPE_VALUES = ['cooking', 'garden', 'academic', 'craft'] as const;

export const TAG_VALUES = ['orientation', 'bilingual_handouts'] as const;

export const SEASON_TIMING_VALUES = ['Fall', 'Winter', 'Spring', 'Summer'] as const;

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

// =============================================================================
// AcademicIntegration sub-shape (canonical-keys path).
// =============================================================================

const academicIntegrationObjectSchema = z.object({
  concepts: z.record(z.string(), z.array(z.string())),
  selected: z.array(z.string()),
});

const academicIntegrationCanonicalSchema = z.union([
  z.array(z.string()),
  academicIntegrationObjectSchema,
]);

// =============================================================================
// Canonical lesson metadata schema.
// Mirrors lessonMetadataSchema in src/types/lessonMetadata.zod.ts.
// =============================================================================

export const lessonMetadataSchema = z.object({
  activityType: z.array(ActivityTypeEnum).optional(),
  tags: z.array(TagEnum).optional(),
  seasonTiming: z.array(SeasonTimingEnum).optional(),
  culturalResponsivenessFeatures: z.array(CulturalResponsivenessFeatureEnum).optional(),

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
  academicIntegration: academicIntegrationCanonicalSchema.optional(),
  academicConcepts: z.record(z.string(), z.array(z.string())).optional(),

  duration: z.string().optional(),
  groupSize: z.string().optional(),
  processingNotes: z.string().optional(),
  summary: z.string().optional(),

  skills: z.array(z.string()).optional(),
  equipment: z.array(z.string()).optional(),
});

// =============================================================================
// Review-form payload schema.
// Mirrors reviewFormPayloadSchema in src/types/reviewFormPayload.zod.ts.
// Diverges from canonical: location is single-select string (canonical:
// locationRequirements: string[]); themes/season keys (canonical:
// thematicCategories/seasonTiming).
// =============================================================================

export const reviewFormPayloadSchema = z.object({
  activityType: z.array(ActivityTypeEnum).optional(),
  location: z.string().optional(),

  season: z.array(SeasonTimingEnum).optional(),
  culturalResponsivenessFeatures: z.array(CulturalResponsivenessFeatureEnum).optional(),

  themes: z.array(z.string()).optional(),
  gradeLevels: z.array(z.string()).optional(),
  coreCompetencies: z.array(z.string()).optional(),
  socialEmotionalLearning: z.array(z.string()).optional(),
  cookingMethods: z.array(z.string()).optional(),
  mainIngredients: z.array(z.string()).optional(),
  gardenSkills: z.array(z.string()).optional(),
  cookingSkills: z.array(z.string()).optional(),
  culturalHeritage: z.array(z.string()).optional(),
  academicIntegration: z.array(z.string()).optional(),
  observancesHolidays: z.array(z.string()).optional(),

  processingNotes: z.string().optional(),
  summary: z.string().optional(),
});
