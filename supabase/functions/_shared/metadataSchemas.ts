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
import { isValidPublicCreatorName } from './driveProvenance.ts';

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

// 6 small-field vocabularies closed in PR 6e — MUST match
// src/types/lessonMetadata.zod.ts (verbatim from smaller-fields.vocab.json).

export const ACADEMIC_INTEGRATION_VALUES = [
  'Math',
  'Science',
  'Literacy/ELA',
  'Social Studies',
  'Health',
  'Arts',
] as const;

// FP5 Brief 1: 5 CASEL values + 6 template-era skills (order-identical to
// src/types/lessonMetadata.zod.ts — the equivalence test asserts lock-step).
export const SOCIAL_EMOTIONAL_LEARNING_VALUES = [
  'Relationship skills',
  'Self-awareness',
  'Responsible decision-making',
  'Self-management',
  'Social awareness',
  'Bravery',
  'Kindness',
  'Respect',
  'Collaboration',
  'Pride',
  'Joy',
] as const;

// FP5 Brief 1: "Culturally Responsive Education" → "Cultural Diversity" (rename).
export const CORE_COMPETENCIES_VALUES = [
  'Environmental and Community Stewardship',
  'Social Justice',
  'Social-Emotional Intelligence',
  'Garden Skills and Related Academic Content',
  'Kitchen Skills and Related Academic Content',
  'Cultural Diversity',
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

// C02 closed vocabularies (locked P4a) — MUST match src/types/lessonMetadata.zod.ts
// (byte-identical to the frozen manifest scripts/stage2-retag/data/c02-vocab.json).
// value===label Title-Case canonical. main_ingredients is a two-level taxonomy
// (24 groups + 46 specifics); INGREDIENT_PARENT_MAP maps each specific to its
// parent group (or null for the four group-less specifics).

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

// Cultural Heritage closed vocabulary (Brief 4 — reviewer field closed 2026-07-03).
// MUST match src/types/lessonMetadata.zod.ts, which re-exports CULTURAL_HERITAGE_VALUES
// from src/utils/heritageHierarchy.generated.ts (GENERATED from
// data/vocab/cultural-heritage.vocab.json). Edge can't import from src/, so this list
// is hand-synced; the equivalence test (edgeSharedSchemas.equivalence.test.ts) fails on
// drift. All 71 tiers incl. internal — every currently-stored value round-trips. To add
// a value: edit the vocab, regenerate, then copy the new list here (ask the maintainer).
export const CULTURAL_HERITAGE_VALUES = [
  'Americas',
  'North American',
  'Southern United States',
  'Latin American',
  'Mexican',
  'Puerto Rican',
  'Honduran',
  'Peruvian',
  'Salvadoran',
  'Brazilian',
  'Ecuadorian',
  'Guyanese',
  'Dominican',
  'Caribbean',
  'Cuban',
  'Jamaican',
  'Central American',
  'South American',
  'Asian',
  'East Asian',
  'Chinese',
  'Japanese',
  'Korean',
  'Taiwanese',
  'South Asian',
  'Indian',
  'Pakistani',
  'Sri Lankan',
  'Southeast Asian',
  'Vietnamese',
  'Malaysian',
  'Central Asian',
  'Uzbek',
  'Indigenous and Diaspora',
  'African American',
  'Black culinary history',
  'Soul Food',
  'Indigenous',
  'Lenape',
  'Haudenosaunee',
  'Three Sisters traditions',
  'Cajun/Creole',
  'European',
  'Mediterranean',
  'Italian',
  'Spanish',
  'Greek',
  'Eastern European',
  'Ukrainian',
  'Russian',
  'Polish',
  'Irish',
  'French',
  'African',
  'West African',
  'Nigerian',
  'North African',
  'Egyptian',
  'Moroccan',
  'East African',
  'Kenyan',
  'Ethiopian',
  'Middle Eastern',
  'Levantine',
  'Palestinian',
  'Jordanian',
  'Lebanese',
  'Syrian',
  'Yemeni',
  'Israeli',
  'Persian',
] as const;

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
export const CulturalHeritageEnum = z.enum(CULTURAL_HERITAGE_VALUES);

// =============================================================================
// main_ingredients specific→group invariant (C02 §4 Q7) — mirror of the
// src/types refinement. A specific value with a NON-null parent group requires
// that group to also be present; groups and null-parent specifics never trigger;
// an empty array passes.
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

const mainIngredientsArraySchema = z
  .array(MainIngredientsEnum)
  .superRefine(refineMainIngredientParents);

// =============================================================================
// AcademicIntegration sub-shape (canonical-keys path).
// =============================================================================

const academicIntegrationObjectSchema = z.object({
  concepts: z.record(z.string(), z.array(z.string())),
  selected: z.array(z.string()),
});

const academicIntegrationCanonicalSchema = z.union([
  z.array(AcademicIntegrationEnum),
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

  // Closed small-field vocabularies (locked PR 6e — mirror src/types).
  coreCompetencies: z.array(CoreCompetenciesEnum).optional(),
  gardenSkills: z.array(GardenSkillsEnum).optional(),
  cookingMethods: z.array(CookingMethodsEnum).optional(),
  observancesHolidays: z.array(ObservancesHolidaysEnum).optional(),
  socialEmotionalLearning: z.array(SocialEmotionalLearningEnum).optional(),
  academicIntegration: academicIntegrationCanonicalSchema.optional(),

  // Closed C02 vocabularies (locked P4a — mirror src/types). mainIngredients
  // carries the specific→group invariant.
  mainIngredients: mainIngredientsArraySchema.optional(),
  cookingSkills: z.array(CookingSkillsEnum).optional(),

  // Still-open string arrays.
  thematicCategories: z.array(z.string()).optional(),
  culturalHeritage: z.array(z.string()).optional(),
  locationRequirements: z.array(z.string()).optional(),
  gradeLevels: z.array(z.string()).optional(),
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

// Drive provenance cross-field rule — MUST match refineDriveCreator in
// src/types/reviewFormPayload.zod.ts ('created'/'adapted' require a safe
// name; a name without a publishable attribution is a shape error).
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

export const reviewFormPayloadObjectSchema = z.object({
  activityType: z.array(ActivityTypeEnum).optional(),
  location: z.string().optional(),

  season: z.array(SeasonTimingEnum).optional(),
  culturalResponsivenessFeatures: z.array(CulturalResponsivenessFeatureEnum).optional(),

  // Closed small-field vocabularies (locked PR 6e E2b — mirror src/types).
  coreCompetencies: z.array(CoreCompetenciesEnum).optional(),
  socialEmotionalLearning: z.array(SocialEmotionalLearningEnum).optional(),
  cookingMethods: z.array(CookingMethodsEnum).optional(),
  gardenSkills: z.array(GardenSkillsEnum).optional(),
  academicIntegration: z.array(AcademicIntegrationEnum).optional(),
  observancesHolidays: z.array(ObservancesHolidaysEnum).optional(),

  // Closed C02 vocabularies (locked P4a — mirror src/types).
  mainIngredients: mainIngredientsArraySchema.optional(),
  cookingSkills: z.array(CookingSkillsEnum).optional(),

  // Cultural Heritage closed 2026-07-03 (Brief 4 — mirror src/types). Enum is the
  // full vocab (all tiers) so every stored value round-trips; UI-level closure, no
  // DB CHECK.
  culturalHeritage: z.array(CulturalHeritageEnum).optional(),

  themes: z.array(z.string()).optional(),
  gradeLevels: z.array(z.string()).optional(),

  processingNotes: z.string().optional(),
  title: z.string().optional(),
  summary: z.string().optional(),

  // Drive provenance — the reviewer's creator confirmation. MUST match
  // src/types/reviewFormPayload.zod.ts (cross-field rule applied below).
  driveCreatorAttribution: z.enum(['created', 'adapted', 'omit']).optional(),
  driveCreatorName: z.string().optional(),
});

export const reviewFormPayloadSchema = reviewFormPayloadObjectSchema.superRefine(
  refineDriveCreator
);
