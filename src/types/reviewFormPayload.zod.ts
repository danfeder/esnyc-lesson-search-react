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
 * The canonical-side translation lives in the `complete_review_atomic` RPC
 * (grep migrations for the current definition). On the TS read path,
 * `src/utils/lessonToReviewMapper.ts` maps canonical metadata back into this
 * review-form shape (the write-path TS mapper was removed as dead code —
 * complete-review does the review→lesson translation in SQL).
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
 * cookingSkills. Closed in Brief 4 (2026-07-03): culturalHeritage — the reviewer
 * field became a closed pick-list ahead of the heritage worksheet (owner reversal);
 * its enum is GENERATED from the vocab (all tiers) so nothing stored is invalidated.
 * Other vocabulary fields stay open until Stage 1 worksheets close them.
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
  CulturalHeritageEnum,
  mainIngredientsArraySchema,
} from './lessonMetadata.zod';
import { isValidPublicCreatorName } from '@/utils/driveProvenance';

/**
 * Drive provenance (creator confirmation) cross-field rule, applied via
 * superRefine on the payload schema:
 *   - 'created'/'adapted' REQUIRE a safe public full name (trimmed, ≤120
 *     chars, no '@', no obvious URL);
 *   - a name without a publishable attribution ('omit'/absent) is a shape
 *     error — the client strips the name in that case, so its presence means
 *     a bug or a hand-crafted payload.
 * The server (complete_review_atomic) re-validates and derives
 * drive_creator_source/verified_at itself; client-sent values for those never
 * exist in this schema.
 */
const refineDriveCreator = (
  data: { driveCreatorAttribution?: string; driveCreatorName?: string },
  ctx: z.RefinementCtx
): void => {
  const attr = data.driveCreatorAttribution;
  if (attr === 'created' || attr === 'adapted') {
    if (!isValidPublicCreatorName(data.driveCreatorName)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['driveCreatorName'],
        message:
          'A public full name is required for "Created by"/"Adapted by" — no emails, links, or blank/untrimmed values.',
      });
    }
  } else if (data.driveCreatorName !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['driveCreatorName'],
      message: 'driveCreatorName requires driveCreatorAttribution "created" or "adapted".',
    });
  }
};

/**
 * Base object schema — exported separately because `.superRefine` wraps the
 * object in a ZodEffects, and `ZOD_FIELD_TO_LABEL` (reviewDetailHelpers) needs
 * the raw `.shape` for its exhaustive key typing. Parse with
 * `reviewFormPayloadSchema` (below), not this.
 */
export const reviewFormPayloadObjectSchema = z.object({
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

  // Cultural Heritage closed 2026-07-03 (Brief 4 — reviewer field closed to a
  // pick-list; ends reviewer free-text). Reuses the lesson-side enum (GENERATED
  // from the vocab, all 71 tiers incl. internal) so every currently-stored value
  // round-trips and nothing is invalidated. UI-level closure only — no DB CHECK
  // (the heritage worksheet will reshape the vocab later, via code).
  culturalHeritage: z.array(CulturalHeritageEnum).optional(),

  // Open-string-array fields (review-form key names where they diverge from
  // canonical — see translation rules above).
  themes: z.array(z.string()).optional(),
  gradeLevels: z.array(z.string()).optional(),

  // Free-form pass-through. `title` + `summary` are the reviewer-editable
  // "what gets published" fields (prefilled from the extracted doc); both are
  // persisted to the lesson by complete_review_atomic.
  processingNotes: z.string().optional(),
  title: z.string().optional(),
  summary: z.string().optional(),

  // Drive provenance — the reviewer's creator confirmation (2026-07 feature).
  // Defaults to omitted. The cross-field name rule lives in refineDriveCreator
  // (applied below); the server re-validates and derives source/verified time.
  driveCreatorAttribution: z.enum(['created', 'adapted', 'omit']).optional(),
  driveCreatorName: z.string().optional(),
});

export const reviewFormPayloadSchema =
  reviewFormPayloadObjectSchema.superRefine(refineDriveCreator);

export type ReviewFormPayloadValidated = z.infer<typeof reviewFormPayloadSchema>;
