/**
 * Review-form payload Zod schema.
 *
 * Validates what the `complete-review` edge function accepts and what
 * `ReviewDetail.tsx` saves. Diverges from the canonical `lessonMetadata.zod.ts`
 * in three load-bearing ways (per validator architecture doc Decision 2):
 *
 *   - `activityType` is a single-select string (canonical: `string[]`)
 *   - `location` key is a single-select string (canonical: `locationRequirements: string[]`)
 *   - `themes` / `season` keys (canonical: `thematicCategories` / `seasonTiming`)
 *
 * The translation between this schema and the canonical schema is performed
 * in two places that must stay in sync:
 *   - SQL: the `complete_review_atomic` RPC (grep migrations for the current definition)
 *   - TS: `src/utils/{reviewToLesson,lessonToReview}Mapper.ts`
 *
 * Closed-enum scope mirrors `lessonMetadata.zod.ts`: activityType (single
 * value), season (array), culturalResponsivenessFeatures (array). Other
 * vocabulary fields stay open until Stage 1 worksheets close them.
 *
 * Note: `tags` (orientation / bilingual_handouts) is not currently exposed
 * in the review form — those values come from the LLM-draft canonical-keys
 * path (PR 2). If the reviewer surface ever exposes a tag picker, add tags
 * here at that time.
 */
import { z } from 'zod';
import {
  ActivityTypeEnum,
  SeasonTimingEnum,
  CulturalResponsivenessFeatureEnum,
} from './lessonMetadata.zod';

export const reviewFormPayloadSchema = z.object({
  // Single-select strings (review-form shape).
  activityType: ActivityTypeEnum.optional(),
  location: z.string().optional(),

  // Closed-enum array fields.
  season: z.array(SeasonTimingEnum).optional(),
  culturalResponsivenessFeatures: z.array(CulturalResponsivenessFeatureEnum).optional(),

  // Open-string-array fields (review-form key names where they diverge from
  // canonical — see translation rules above).
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

  // Free-form pass-through.
  processingNotes: z.string().optional(),
  summary: z.string().optional(),
});

export type ReviewFormPayloadValidated = z.infer<typeof reviewFormPayloadSchema>;
