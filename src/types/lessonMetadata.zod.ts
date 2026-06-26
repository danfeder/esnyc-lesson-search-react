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
 * Closed-enum coverage:
 *   Foundation phase (PR 1):
 *     - activity_type (D2 — 4 values; D2.1 retired 'both' 2026-05-06)
 *     - tags (D2 + D7 — 2 values)
 *     - season_timing (existing valid_seasons CHECK — 4 values)
 *     - cultural_responsiveness_features (D9 — 7 master-list features)
 *   Small fields closed in PR 6e (canonical vocab locked OQ2 2026-06-12):
 *     - academic_integration (array branch only — object branch stays open)
 *     - social_emotional_learning, core_competencies, cooking_methods,
 *       observances_holidays, garden_skills
 *
 * Closed in C02 (P4a): mainIngredients (with a specific→group invariant) and
 * cookingSkills.
 *
 * Still genuinely open `z.array(z.string())`: thematicCategories,
 * culturalHeritage, locationRequirements (later worksheets), and gradeLevels.
 *
 * Sync discipline: this file is the canonical source. `enums.json` is
 * generated from it via `scripts/generate-enums-json.ts`. The edge mirror
 * `supabase/functions/_shared/metadataSchemas.ts` and the SQL CHECK
 * constraints are hand-synced from these value lists; the equivalence test
 * (`edgeSharedSchemas.equivalence.test.ts`) enforces lock-step parity with
 * the edge mirror. See validator architecture doc Decision 6 for sync-test
 * details.
 */
import { z } from 'zod';

// =============================================================================
// Closed-enum value lists (single source of truth — also exported so
// scripts/generate-enums-json.ts can serialize them to JSON for cross-runtime
// mirrors).
// =============================================================================

export const ACTIVITY_TYPE_VALUES = ['cooking', 'garden', 'academic', 'craft'] as const;

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

// -----------------------------------------------------------------------------
// 6 small-field vocabularies closed in PR 6e. Values copied VERBATIM from
// scripts/stage2-retag/data/smaller-fields.vocab.json (byte-identical to the
// live PROD CHECK arrays in 20260617000000_pr6c2_retag_apply.sql §6).
// academic_integration / SEL / core_competencies = Title-case; cooking_methods
// = kebab; garden_skills = Title-case.
// -----------------------------------------------------------------------------

export const ACADEMIC_INTEGRATION_VALUES = [
  'Math',
  'Science',
  'Literacy/ELA',
  'Social Studies',
  'Health',
  'Arts',
] as const;

export const SOCIAL_EMOTIONAL_LEARNING_VALUES = [
  'Relationship skills',
  'Self-awareness',
  'Responsible decision-making',
  'Self-management',
  'Social awareness',
] as const;

export const CORE_COMPETENCIES_VALUES = [
  'Environmental and Community Stewardship',
  'Social Justice',
  'Social-Emotional Intelligence',
  'Garden Skills and Related Academic Content',
  'Kitchen Skills and Related Academic Content',
  'Culturally Responsive Education',
] as const;

export const COOKING_METHODS_VALUES = ['basic-prep', 'stovetop', 'oven'] as const;

export const OBSERVANCES_HOLIDAYS_VALUES = [
  'AAPI Heritage Month',
  'Black History Month',
  'Hispanic/Latinx Heritage Month',
  "Indigenous Peoples' Month",
  "Women's History Month",
  'Pride',
  'Earth Month',
  'Thanksgiving',
  'Lunar New Year',
  'New Year',
  'Ramadan',
  'Eid',
  'Juneteenth',
  'School Food Hero Day',
  'Beginning of year',
  'End of year celebrations',
] as const;

export const GARDEN_SKILLS_VALUES = [
  'Planting',
  'Seed starting',
  'Transplanting',
  'Watering techniques',
  'Harvesting',
  'Composting',
  'Mulching',
  'Soil preparation and care',
  'Weeding',
  'Cover cropping',
  'Garden planning',
  'Companion planting',
  'Crop rotation',
  'Observing plant parts',
  'Identifying plants',
  'Pest identification',
  'Beneficial insect identification',
  'Pollinator observation',
  'Seed saving',
  'Tool use and maintenance',
  'Preservation techniques',
  'Garden exploration',
  'Stewardship tasks',
  'Sensory exploration',
] as const;

// -----------------------------------------------------------------------------
// C02 closed vocabularies (locked P4a, frozen manifest
// scripts/stage2-retag/data/c02-vocab.json). value===label Title-Case canonical
// — byte-identical across filterDefinitions, the edge mirror, and the P4b SQL
// CHECKs. main_ingredients is a two-level taxonomy (24 groups + 46 specifics);
// INGREDIENT_PARENT_MAP maps each specific to its parent group (or null for the
// four group-less specifics). Do not add/remove/rename a value.
// -----------------------------------------------------------------------------

export const COOKING_SKILLS_VALUES = [
  'Measuring',
  'Mixing & stirring',
  'Reading & following recipes',
  'Kitchen & food safety',
  'Tasting',
  'Grating',
  'Mashing',
  'Blending & juicing',
  'Seasoning & spice blending',
  'Knife skills',
  'Boiling & simmering',
  'Sautéing & stir-frying',
  'Steaming',
  'Roasting',
  'Baking',
  'Grilling',
  'Dough making',
  'Creating sauces & dressings',
  'Pickling & preserving',
  'Fermenting',
  'Assembling dishes',
  'Wrapping & rolling',
  'Plating & garnishing',
] as const;

export const MAIN_INGREDIENTS_VALUES = [
  // Groups (24)
  'Alliums',
  'Leafy greens',
  'Root vegetables',
  'Nightshades',
  'Peppers',
  'Cruciferous',
  'Squash, cucumbers & melons',
  'Mushrooms',
  'Berries',
  'Citrus fruits',
  'Tropical fruits',
  'Apples & pears',
  'Stone fruits',
  'Dried fruits',
  'Grains & starches',
  'Beans & legumes',
  'Nuts & seeds',
  'Eggs',
  'Tofu & plant proteins',
  'Dairy',
  'Dairy alternatives',
  'Fresh herbs',
  'Spices',
  'Sweeteners',
  // Specifics (46)
  'Garlic',
  'Carrots',
  'Sweet potatoes',
  'Potatoes',
  'Beets',
  'Tomatoes',
  'Bell peppers',
  'Cabbage',
  'Winter squash',
  'Cucumbers',
  'Melons',
  'Bananas',
  'Avocado',
  'Coconut',
  'Lemon',
  'Oranges',
  'Lime',
  'Apples',
  'Wheat/flour',
  'Corn/masa',
  'Rice',
  'Oats',
  'Black beans',
  'Black-eyed peas',
  'Chickpeas',
  'Pinto beans',
  'Pumpkin seeds',
  'Sunflower seeds',
  'Sunflower butter',
  'Tahini',
  'Peanut butter',
  'Yogurt',
  'Cheese',
  'Butter',
  'Milk',
  'Coconut milk',
  'Cilantro',
  'Parsley',
  'Mint',
  'Ginger',
  'Cinnamon',
  'Honey',
  'Celery',
  'Fennel',
  'Seaweed (nori)',
  'Cocoa & chocolate',
] as const;

// Specific → parent group (null = group-less specific, never requires a parent).
// NOTE: only the 46 specifics are keys — a GROUP or unknown value lookup returns
// `undefined` (not `null`). Callers MUST use a truthy guard (`if (parent && …)`),
// never `parent !== null`, or a group would be misread as an orphaned specific.
export const INGREDIENT_PARENT_MAP: Record<string, string | null> = {
  Garlic: 'Alliums',
  Carrots: 'Root vegetables',
  'Sweet potatoes': 'Root vegetables',
  Potatoes: 'Root vegetables',
  Beets: 'Root vegetables',
  Tomatoes: 'Nightshades',
  'Bell peppers': 'Peppers',
  Cabbage: 'Cruciferous',
  'Winter squash': 'Squash, cucumbers & melons',
  Cucumbers: 'Squash, cucumbers & melons',
  Melons: 'Squash, cucumbers & melons',
  Bananas: 'Tropical fruits',
  Avocado: 'Tropical fruits',
  Coconut: 'Tropical fruits',
  Lemon: 'Citrus fruits',
  Oranges: 'Citrus fruits',
  Lime: 'Citrus fruits',
  Apples: 'Apples & pears',
  'Wheat/flour': 'Grains & starches',
  'Corn/masa': 'Grains & starches',
  Rice: 'Grains & starches',
  Oats: 'Grains & starches',
  'Black beans': 'Beans & legumes',
  'Black-eyed peas': 'Beans & legumes',
  Chickpeas: 'Beans & legumes',
  'Pinto beans': 'Beans & legumes',
  'Pumpkin seeds': 'Nuts & seeds',
  'Sunflower seeds': 'Nuts & seeds',
  'Sunflower butter': 'Nuts & seeds',
  Tahini: 'Nuts & seeds',
  'Peanut butter': 'Nuts & seeds',
  Yogurt: 'Dairy',
  Cheese: 'Dairy',
  Butter: 'Dairy',
  Milk: 'Dairy',
  'Coconut milk': 'Dairy alternatives',
  Cilantro: 'Fresh herbs',
  Parsley: 'Fresh herbs',
  Mint: 'Fresh herbs',
  Ginger: 'Spices',
  Cinnamon: 'Spices',
  Honey: 'Sweeteners',
  Celery: null,
  Fennel: null,
  'Seaweed (nori)': null,
  'Cocoa & chocolate': null,
};

// =============================================================================
// Closed-enum Zod types
// =============================================================================

export const ActivityTypeEnum = z.enum(ACTIVITY_TYPE_VALUES);
export const TagEnum = z.enum(TAG_VALUES);
export const SeasonTimingEnum = z.enum(SEASON_TIMING_VALUES);
export const CulturalResponsivenessFeatureEnum = z.enum(CULTURAL_RESPONSIVENESS_FEATURE_VALUES);
export const AcademicIntegrationEnum = z.enum(ACADEMIC_INTEGRATION_VALUES);
export const SocialEmotionalLearningEnum = z.enum(SOCIAL_EMOTIONAL_LEARNING_VALUES);
export const CoreCompetenciesEnum = z.enum(CORE_COMPETENCIES_VALUES);
export const CookingMethodsEnum = z.enum(COOKING_METHODS_VALUES);
export const ObservancesHolidaysEnum = z.enum(OBSERVANCES_HOLIDAYS_VALUES);
export const GardenSkillsEnum = z.enum(GARDEN_SKILLS_VALUES);
export const CookingSkillsEnum = z.enum(COOKING_SKILLS_VALUES);
export const MainIngredientsEnum = z.enum(MAIN_INGREDIENTS_VALUES);

export type ActivityTypeValue = z.infer<typeof ActivityTypeEnum>;
export type TagValue = z.infer<typeof TagEnum>;
export type SeasonTimingValue = z.infer<typeof SeasonTimingEnum>;
export type CulturalResponsivenessFeatureValue = z.infer<typeof CulturalResponsivenessFeatureEnum>;
export type AcademicIntegrationValue = z.infer<typeof AcademicIntegrationEnum>;
export type SocialEmotionalLearningValue = z.infer<typeof SocialEmotionalLearningEnum>;
export type CoreCompetenciesValue = z.infer<typeof CoreCompetenciesEnum>;
export type CookingMethodsValue = z.infer<typeof CookingMethodsEnum>;
export type ObservancesHolidaysValue = z.infer<typeof ObservancesHolidaysEnum>;
export type GardenSkillsValue = z.infer<typeof GardenSkillsEnum>;
export type CookingSkillsValue = z.infer<typeof CookingSkillsEnum>;
export type MainIngredientsValue = z.infer<typeof MainIngredientsEnum>;

// =============================================================================
// main_ingredients specific→group invariant (C02 design §4 Q7 / §7).
// The harness auto-adds a specific's parent group; the reviewer Zod path
// REJECTS an orphan specific on save. A specific value whose INGREDIENT_PARENT_MAP
// entry is a NON-null group requires that group to also appear in the array.
// Groups and the four null-parent specifics never trigger; an empty array
// passes. Reused by both the lesson and review schemas (and mirrored in the edge
// module) so the contract never drifts.
// =============================================================================

const refineMainIngredientParents = (values: readonly string[], ctx: z.RefinementCtx): void => {
  for (const value of values) {
    const parent = INGREDIENT_PARENT_MAP[value];
    if (parent && !values.includes(parent)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `main_ingredient "${value}" requires its parent group "${parent}" to also be selected`,
      });
    }
  }
};

export const mainIngredientsArraySchema = z
  .array(MainIngredientsEnum)
  .superRefine(refineMainIngredientParents);

// =============================================================================
// AcademicIntegration sub-shape (PROD has both array and object regimes).
// PR 5+ canonicalizes shape decisions during Stage 1 concepts worksheet.
// =============================================================================

const academicIntegrationObjectSchema = z.object({
  concepts: z.record(z.string(), z.array(z.string())),
  selected: z.array(z.string()),
});

const academicIntegrationSchema = z.union([
  z.array(AcademicIntegrationEnum),
  academicIntegrationObjectSchema,
]);

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

  // Closed small-field vocabularies (locked PR 6e).
  coreCompetencies: z.array(CoreCompetenciesEnum).optional(),
  gardenSkills: z.array(GardenSkillsEnum).optional(),
  cookingMethods: z.array(CookingMethodsEnum).optional(),
  observancesHolidays: z.array(ObservancesHolidaysEnum).optional(),
  socialEmotionalLearning: z.array(SocialEmotionalLearningEnum).optional(),
  // academicIntegration: array branch closed PR 6e; object branch preserved.
  academicIntegration: academicIntegrationSchema.optional(),

  // Closed C02 vocabularies (locked P4a — value===label Title-Case canonical,
  // frozen manifest). mainIngredients also carries the specific→group invariant.
  mainIngredients: mainIngredientsArraySchema.optional(),
  cookingSkills: z.array(CookingSkillsEnum).optional(),

  // Open-string-array placeholders. thematicCategories / culturalHeritage /
  // locationRequirements stay open pending later worksheets; gradeLevels stays
  // open (grade taxonomy is governed elsewhere).
  thematicCategories: z.array(z.string()).optional(),
  culturalHeritage: z.array(z.string()).optional(),
  locationRequirements: z.array(z.string()).optional(),
  gradeLevels: z.array(z.string()).optional(),
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
