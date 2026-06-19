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

const FIELD_MAPS: Partial<Record<keyof ReviewMetadata, Record<string, string>>> = {
  academicIntegration: ACADEMIC_INTEGRATION_MAP,
  socialEmotionalLearning: SOCIAL_EMOTIONAL_LEARNING_MAP,
  coreCompetencies: CORE_COMPETENCIES_MAP,
  gardenSkills: GARDEN_SKILLS_MAP,
  cookingMethods: COOKING_METHODS_MAP,
  observancesHolidays: OBSERVANCES_HOLIDAYS_MAP,
};

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
      typeof el === 'string' && el in map ? map[el] : el
    );
  }

  return out;
}
