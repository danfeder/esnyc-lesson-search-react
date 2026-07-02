/**
 * Review-form payload Zod schema.
 *
 * Validates what the `complete-review` edge function accepts and what
 * `ReviewDetail.tsx` saves. Diverges from the canonical `lessonMetadata.zod.ts`
 * in two load-bearing ways (per validator architecture doc Decision 2):
 *
 *   - `location` key is a single-select string (canonical: `locationRequirements: string[]`)
 *   - `themes` / `season` keys (canonical: `thematicCategories` / `seasonTiming`)
 *
 * The translation between this schema and the canonical schema is performed
 * in two places that must stay in sync:
 *   - SQL: the `complete_review_atomic` RPC (grep migrations for the current definition)
 *   - TS: `src/utils/{reviewToLesson,lessonToReview}Mapper.ts`
 *
 * Closed-enum scope mirrors `lessonMetadata.zod.ts`: activityType (array),
 * season (array), culturalResponsivenessFeatures (array), and — closed in
 * PR 6e E2b — the 6 small-field vocabularies academicIntegration,
 * socialEmotionalLearning, coreCompetencies, cookingMethods,
 * observancesHolidays, gardenSkills. The review side reuses the enums exported
 * by `lessonMetadata.zod.ts` so the two never drift. academicIntegration on
 * the review side is a plain `string[]` (not the lesson-side object|array
 * union), so it closes to `z.array(AcademicIntegrationEnum)`. Closed in C02
 * (P4a): mainIngredients (with the lesson-side specific→group invariant) and
 * cookingSkills. Other vocabulary fields stay open until Stage 1 worksheets
 * close them.
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
  AcademicIntegrationEnum,
  SocialEmotionalLearningEnum,
  CoreCompetenciesEnum,
  CookingMethodsEnum,
  ObservancesHolidaysEnum,
  GardenSkillsEnum,
  CookingSkillsEnum,
  mainIngredientsArraySchema,
} from './lessonMetadata.zod';

export const reviewFormPayloadSchema = z.object({
  // Multi-select activity_type; single-select location.
  activityType: z.array(ActivityTypeEnum).optional(),
  location: z.string().optional(),

  // Closed-enum array fields.
  season: z.array(SeasonTimingEnum).optional(),
  culturalResponsivenessFeatures: z.array(CulturalResponsivenessFeatureEnum).optional(),

  // Closed small-field vocabularies (locked PR 6e E2b — reuse the lesson-side
  // enums so review and lesson never drift). academicIntegration is a plain
  // string[] on the review side, so it closes to the array form directly.
  coreCompetencies: z.array(CoreCompetenciesEnum).optional(),
  socialEmotionalLearning: z.array(SocialEmotionalLearningEnum).optional(),
  cookingMethods: z.array(CookingMethodsEnum).optional(),
  gardenSkills: z.array(GardenSkillsEnum).optional(),
  academicIntegration: z.array(AcademicIntegrationEnum).optional(),
  observancesHolidays: z.array(ObservancesHolidaysEnum).optional(),

  // Closed C02 vocabularies (locked P4a — reuse the lesson-side enum/shared
  // schema so review and lesson never drift). mainIngredients carries the same
  // specific→group invariant.
  mainIngredients: mainIngredientsArraySchema.optional(),
  cookingSkills: z.array(CookingSkillsEnum).optional(),

  // Open-string-array fields (review-form key names where they diverge from
  // canonical — see translation rules above).
  themes: z.array(z.string()).optional(),
  gradeLevels: z.array(z.string()).optional(),
  culturalHeritage: z.array(z.string()).optional(),

  // Free-form pass-through. `title` + `summary` are the reviewer-editable
  // "what gets published" fields (prefilled from the extracted doc); both are
  // persisted to the lesson by complete_review_atomic.
  processingNotes: z.string().optional(),
  title: z.string().optional(),
  summary: z.string().optional(),
});

export type ReviewFormPayloadValidated = z.infer<typeof reviewFormPayloadSchema>;
