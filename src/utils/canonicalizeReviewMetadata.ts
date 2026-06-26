/**
 * Legacy `tagged_metadata` canonicalizer (PR 6e E2c).
 *
 * `submission_reviews.tagged_metadata` (113 PROD rows, all decision=approve_new)
 * stores LEGACY SLUG forms for 4 of the 6 small-vocabulary fields
 * (`academicIntegration`, `socialEmotionalLearning`, `coreCompetencies`,
 * `gardenSkills`). `cookingMethods` + `observancesHolidays` are already canonical
 * in those rows (defensive folds included anyway). After PR 6e E2b closed
 * `reviewFormPayloadSchema` to the canonical vocab, reopening a legacy review row
 * would (a) render the legacy selections as deselected and (b) cause the closed
 * schema to REJECT the re-save. This util maps legacy → canonical IN MEMORY on
 * BOTH the load and save paths of `ReviewDetail.tsx`. The historical rows stay
 * legacy on disk — the forensic review records are deliberately preserved; no
 * database write happens here.
 *
 * Canonical targets are byte-identical to
 * `scripts/stage2-retag/data/smaller-fields.vocab.json` (the locked vocab,
 * = the live PROD column CHECK arrays).
 *
 * DEFENSIVE BY DESIGN: each field looks an element up in its legacy→canonical
 * map; an element NOT in the map passes through UNCHANGED (never thrown, never
 * dropped). So already-canonical values round-trip, and any unforeseen value
 * survives rather than crashing the reviewer surface.
 */
import type { ReviewMetadata } from '@/types';
import { INGREDIENT_PARENT_MAP } from '@/types/lessonMetadata.zod';

// academic_integration — canonical Title forms (smaller-fields.vocab.json).
const ACADEMIC_INTEGRATION_MAP: Record<string, string> = {
  math: 'Math',
  science: 'Science',
  'literacy-ela': 'Literacy/ELA',
  'social-studies': 'Social Studies',
  health: 'Health',
  arts: 'Arts',
};

// social_emotional_learning — canonical forms.
const SOCIAL_EMOTIONAL_LEARNING_MAP: Record<string, string> = {
  'relationship-skills': 'Relationship skills',
  'self-awareness': 'Self-awareness',
  'responsible-decision-making': 'Responsible decision-making',
  'self-management': 'Self-management',
  'social-awareness': 'Social awareness',
};

// core_competencies — canonical forms.
const CORE_COMPETENCIES_MAP: Record<string, string> = {
  'environmental-stewardship': 'Environmental and Community Stewardship',
  'social-justice': 'Social Justice',
  'social-emotional': 'Social-Emotional Intelligence',
  'garden-skills': 'Garden Skills and Related Academic Content',
  'kitchen-skills': 'Kitchen Skills and Related Academic Content',
  'culturally-responsive': 'Culturally Responsive Education',
};

// garden_skills — the full PRE-E2b filterDefinitions slug→label set
// (recovered from git ref 60163a8) PLUS the critical extra `sensory-exploration`
// which was never one of the 22 configured slugs but appears in 28 PROD rows.
const GARDEN_SKILLS_MAP: Record<string, string> = {
  planting: 'Planting',
  'seed-starting': 'Seed starting',
  transplanting: 'Transplanting',
  'watering-techniques': 'Watering techniques',
  harvesting: 'Harvesting',
  composting: 'Composting',
  mulching: 'Mulching',
  'soil-preparation': 'Soil preparation and care',
  weeding: 'Weeding',
  'cover-cropping': 'Cover cropping',
  'garden-planning': 'Garden planning',
  'companion-planting': 'Companion planting',
  'crop-rotation': 'Crop rotation',
  'observing-plant-parts': 'Observing plant parts',
  'identifying-plants': 'Identifying plants',
  'pest-identification': 'Pest identification',
  'beneficial-insect-id': 'Beneficial insect identification',
  'pollinator-observation': 'Pollinator observation',
  'seed-saving': 'Seed saving',
  'tool-maintenance': 'Tool use and maintenance',
  preservation: 'Preservation techniques',
  'garden-exploration': 'Garden exploration',
  'sensory-exploration': 'Sensory exploration',
};

// cooking_methods — already canonical in tagged_metadata; cheap defensive folds.
const COOKING_METHODS_MAP: Record<string, string> = {
  'basic-prep-only': 'basic-prep',
  'no-cook': 'basic-prep',
};

// observances_holidays — already canonical in tagged_metadata; cheap defensive folds.
const OBSERVANCES_HOLIDAYS_MAP: Record<string, string> = {
  'End of year': 'End of year celebrations',
  'Earth month': 'Earth Month',
};

// cooking_skills — legacy filterDefinitions slug → canonical (cross-checked
// against the C02 corpus alias map; the catch-alls — kitchen-organization /
// julienning / blanching / plating / garnishing → nearest canonical cooking
// skill — resolved deterministically for the reviewer-reopen unblock). Every
// VALUE is a member of the frozen COOKING_SKILLS_VALUES vocab (drift-locked in
// the test). Exported so the drift-lock test can iterate its values.
export const COOKING_SKILLS_MAP: Record<string, string> = {
  measuring: 'Measuring',
  mixing: 'Mixing & stirring',
  'following-recipes': 'Reading & following recipes',
  'food-safety': 'Kitchen & food safety',
  'kitchen-organization': 'Kitchen & food safety',
  chopping: 'Knife skills',
  dicing: 'Knife skills',
  slicing: 'Knife skills',
  julienning: 'Knife skills',
  mincing: 'Knife skills',
  chiffonade: 'Knife skills',
  boiling: 'Boiling & simmering',
  sauteing: 'Sautéing & stir-frying',
  roasting: 'Roasting',
  baking: 'Baking',
  steaming: 'Steaming',
  grilling: 'Grilling',
  blanching: 'Boiling & simmering',
  'dough-making': 'Dough making',
  'sauce-creation': 'Creating sauces & dressings',
  pickling: 'Pickling & preserving',
  fermenting: 'Fermenting',
  'bread-making': 'Dough making',
  plating: 'Plating & garnishing',
  garnishing: 'Plating & garnishing',
  'assembling-dishes': 'Assembling dishes',
  'wrapping-rolling': 'Wrapping & rolling',
};

// main_ingredients — legacy filterDefinitions slug → canonical (cross-checked
// against the C02 corpus alias map; plant-milk → Dairy alternatives and
// herbs-aromatics → Fresh herbs resolved deterministically for the
// reviewer-reopen unblock). Every VALUE is a member of the frozen
// MAIN_INGREDIENTS_VALUES vocab (drift-locked in the test). Exported so the
// drift-lock test can iterate its values.
export const MAIN_INGREDIENTS_MAP: Record<string, string> = {
  'root-vegetables': 'Root vegetables',
  'leafy-greens': 'Leafy greens',
  nightshades: 'Nightshades',
  cruciferous: 'Cruciferous',
  'winter-squash': 'Winter squash',
  alliums: 'Alliums',
  peppers: 'Peppers',
  cucumbers: 'Cucumbers',
  carrots: 'Carrots',
  beets: 'Beets',
  celery: 'Celery',
  berries: 'Berries',
  citrus: 'Citrus fruits',
  apples: 'Apples',
  'stone-fruits': 'Stone fruits',
  bananas: 'Bananas',
  melons: 'Melons',
  avocados: 'Avocado',
  'wheat-flour': 'Wheat/flour',
  'corn-masa': 'Corn/masa',
  rice: 'Rice',
  oats: 'Oats',
  potatoes: 'Potatoes',
  bread: 'Grains & starches',
  pasta: 'Grains & starches',
  beans: 'Beans & legumes',
  'black-beans': 'Black beans',
  chickpeas: 'Chickpeas',
  lentils: 'Beans & legumes',
  eggs: 'Eggs',
  tofu: 'Tofu & plant proteins',
  nuts: 'Nuts & seeds',
  seeds: 'Nuts & seeds',
  milk: 'Milk',
  cheese: 'Cheese',
  yogurt: 'Yogurt',
  butter: 'Butter',
  'plant-milk': 'Dairy alternatives',
  'herbs-aromatics': 'Fresh herbs',
  basil: 'Fresh herbs',
  cilantro: 'Cilantro',
  parsley: 'Parsley',
  ginger: 'Ginger',
  'various-spices': 'Spices',
};

const FIELD_MAPS: Partial<Record<keyof ReviewMetadata, Record<string, string>>> = {
  academicIntegration: ACADEMIC_INTEGRATION_MAP,
  socialEmotionalLearning: SOCIAL_EMOTIONAL_LEARNING_MAP,
  coreCompetencies: CORE_COMPETENCIES_MAP,
  gardenSkills: GARDEN_SKILLS_MAP,
  cookingMethods: COOKING_METHODS_MAP,
  observancesHolidays: OBSERVANCES_HOLIDAYS_MAP,
  cookingSkills: COOKING_SKILLS_MAP,
  mainIngredients: MAIN_INGREDIENTS_MAP,
};

/** Returns a new array with duplicates removed, preserving first-seen order. */
function dedupePreserveOrder(values: readonly string[]): string[] {
  return [...new Set(values)];
}

/**
 * Returns a NEW metadata object with the 6 small-vocabulary fields'
 * array values mapped legacy→canonical. All other keys/values are
 * passed through untouched. Unmapped elements (incl. already-canonical
 * values) pass through unchanged. Non-array / undefined field values
 * are left as-is. Never mutates the input; never throws.
 */
export function canonicalizeReviewMetadata(meta: ReviewMetadata): ReviewMetadata {
  const out: ReviewMetadata = { ...meta };

  for (const [field, map] of Object.entries(FIELD_MAPS) as [
    keyof ReviewMetadata,
    Record<string, string>,
  ][]) {
    const value = out[field];
    if (!Array.isArray(value)) continue; // undefined / non-array → leave as-is
    (out[field] as string[]) = value.map((el) =>
      typeof el === 'string' && Object.prototype.hasOwnProperty.call(map, el) ? map[el] : el
    );
  }

  // -------------------------------------------------------------------------
  // C02 post-processing (two behaviors the other 6 fields don't need). The
  // FIELD_MAPS loop above has already mapped slug→canonical for both fields;
  // these run on the already-mapped values. Order: map (done) → parent-complete
  // → dedupe.
  // -------------------------------------------------------------------------

  // cookingSkills: dedupe (preserve first-seen order). The 5 cutting slugs
  // (chopping/dicing/slicing/julienning/mincing) all map to 'Knife skills', so a
  // row with several would otherwise carry duplicate 'Knife skills'.
  if (Array.isArray(out.cookingSkills)) {
    out.cookingSkills = dedupePreserveOrder(out.cookingSkills as string[]);
  }

  // mainIngredients: (a) parent-complete — for every value that is a specific
  // with a NON-null parent in INGREDIENT_PARENT_MAP, ensure that parent group is
  // also present (append if missing) so the closed schema's specific→group
  // superRefine passes on reopen; then (b) dedupe (preserve order). Groups and
  // the four null-parent specifics never require a parent.
  if (Array.isArray(out.mainIngredients)) {
    const mapped = out.mainIngredients as string[];
    const completed = [...mapped];
    for (const value of mapped) {
      if (typeof value !== 'string') continue;
      const parent = INGREDIENT_PARENT_MAP[value];
      if (parent && !completed.includes(parent)) completed.push(parent);
    }
    out.mainIngredients = dedupePreserveOrder(completed);
  }

  return out;
}
