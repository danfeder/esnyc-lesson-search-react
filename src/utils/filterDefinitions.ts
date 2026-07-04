import { culturalHeritageOptions } from '@/utils/heritageHierarchy.generated';
import {
  COOKING_SKILLS_VALUES,
  INGREDIENT_PARENT_MAP,
  MAIN_INGREDIENTS_VALUES,
} from '@/types/lessonMetadata.zod';

// Type definitions for filter options.
// `children` is recursive: a nested option may itself have nested children,
// so the cultural-heritage tree can be 3-4 tiers deep (Americas › Latin
// American › Mexican). See heritageHierarchy.generated.ts (generated from
// data/vocab/cultural-heritage.vocab.json).
interface FilterOption {
  value: string;
  label: string;
  category?: string;
  children?: FilterOption[];
}

export interface FilterConfig {
  label: string;
  type: 'single' | 'multiple' | 'hierarchical' | 'creatable';
  options: FilterOption[];
  groups?: Array<{
    id: string;
    label: string;
    grades: string[];
  }>;
}

// Main Ingredients group→specific tree, generated once from the frozen canonical
// vocab (MAIN_INGREDIENTS_VALUES) + INGREDIENT_PARENT_MAP (lessonMetadata.zod.ts).
// 24 groups (17 carry child specifics; 7 are childless top-level groups) + the 4
// group-less specifics (parent === null: Celery, Fennel, Seaweed (nori),
// Cocoa & chocolate) as top-level leaves = 28 top-level nodes over all 70 values.
// value === label throughout (canonical Title-Case), so chips/labels/URL values
// resolve without a separate lookup.
const MAIN_INGREDIENT_GROUPS = MAIN_INGREDIENTS_VALUES.filter((v) => !(v in INGREDIENT_PARENT_MAP));
const mainIngredientsTree: FilterOption[] = [
  ...MAIN_INGREDIENT_GROUPS.map((group) => {
    const children = MAIN_INGREDIENTS_VALUES.filter((v) => INGREDIENT_PARENT_MAP[v] === group).map(
      (v) => ({ value: v, label: v })
    );
    return children.length > 0
      ? { value: group, label: group, children }
      : { value: group, label: group };
  }),
  ...MAIN_INGREDIENTS_VALUES.filter((v) => INGREDIENT_PARENT_MAP[v] === null).map((v) => ({
    value: v,
    label: v,
  })),
];

// Filter configurations for filters used in search
// IMPORTANT: Consult stakeholders before adding or removing filter categories
export const FILTER_CONFIGS: Record<string, FilterConfig> = {
  activityType: {
    label: 'Activity Type',
    type: 'multiple',
    options: [
      { value: 'cooking-only', label: 'Cooking' },
      { value: 'garden-only', label: 'Garden' },
      { value: 'academic-only', label: 'Academic' },
      { value: 'craft-only', label: 'Craft' },
    ],
  },

  mainIngredients: {
    label: 'Main Ingredients',
    // Rendered as a group→specific tree like Cultural Heritage (design §D-C), at
    // sidebar slot #3, collapsed by default (IntMainIngredientsSection).
    // IMPORTANT — unlike Cultural Heritage, ingredient group filtering is a
    // DIRECT MATCH, NOT parent→children expansion: the data guarantees a
    // specific's parent group rides along in the same array (enforced on save by
    // `refineMainIngredientParents`; legacy rows healed by the Brief 5 data fix),
    // so selecting a group matches lessons tagged with that group verbatim. The
    // RPC WHERE (`filter_main_ingredients &&`) and the facet predicate
    // (`overlaps`) both match the selected value as-is, and the sidebar section
    // does NOT auto-check descendants. Do not add expansion logic here.
    // Promoted from METADATA_CONFIGS (reviewer-only) to a search filter — owner
    // decision D-C. Frozen 70-value vocab; do not add/remove/rename a value.
    type: 'hierarchical',
    options: mainIngredientsTree,
  },

  location: {
    label: 'Location',
    // Multi-select in the public search facet (rendered as SEARCH_LOCATION_OPTIONS
    // below). The REVIEWER metadata form treats it single-select via its own form
    // logic and still tags the literal Indoor/Outdoor/Both options kept here.
    type: 'multiple',
    options: [
      { value: 'Indoor', label: 'Indoor' },
      { value: 'Outdoor', label: 'Outdoor' },
      { value: 'Both', label: 'Both' },
    ],
  },

  gradeLevels: {
    label: 'Grade Levels',
    type: 'multiple',
    options: [
      { value: '3K', label: '3K' },
      { value: 'PK', label: 'Pre-K' },
      { value: 'K', label: 'Kindergarten' },
      { value: '1', label: '1st Grade' },
      { value: '2', label: '2nd Grade' },
      { value: '3', label: '3rd Grade' },
      { value: '4', label: '4th Grade' },
      { value: '5', label: '5th Grade' },
      { value: '6', label: '6th Grade' },
      { value: '7', label: '7th Grade' },
      { value: '8', label: '8th Grade' },
    ],
    groups: [
      { id: 'early-childhood', label: 'Early Childhood (3K-PK)', grades: ['3K', 'PK'] },
      { id: 'lower-elementary', label: 'Lower Elementary (K-2)', grades: ['K', '1', '2'] },
      { id: 'upper-elementary', label: 'Upper Elementary (3-5)', grades: ['3', '4', '5'] },
      { id: 'middle', label: 'Middle School (6-8)', grades: ['6', '7', '8'] },
    ],
  },

  thematicCategories: {
    label: 'Thematic Categories',
    type: 'multiple',
    options: [
      { value: 'Garden Basics', label: 'Garden Basics' },
      { value: 'Plant Growth', label: 'Plant Growth' },
      { value: 'Garden Communities', label: 'Garden Communities' },
      { value: 'Ecosystems', label: 'Ecosystems' },
      { value: 'Seed to Table', label: 'Seed to Table' },
      { value: 'Food Systems', label: 'Food Systems' },
      { value: 'Food Justice', label: 'Food Justice' },
    ],
  },

  seasonTiming: {
    label: 'Season & Timing',
    type: 'multiple',
    options: [
      { value: 'Fall', label: 'Fall' },
      { value: 'Winter', label: 'Winter' },
      { value: 'Spring', label: 'Spring' },
      { value: 'Summer', label: 'Summer' },
    ],
  },

  coreCompetencies: {
    label: 'Core Competencies',
    type: 'multiple',
    options: [
      {
        value: 'Environmental and Community Stewardship',
        label: 'Environmental and Community Stewardship',
      },
      { value: 'Social Justice', label: 'Social Justice' },
      { value: 'Social-Emotional Intelligence', label: 'Social-Emotional Intelligence' },
      {
        value: 'Garden Skills and Related Academic Content',
        label: 'Garden Skills and Related Academic Content',
      },
      {
        value: 'Kitchen Skills and Related Academic Content',
        label: 'Kitchen Skills and Related Academic Content',
      },
      // FP5 Brief 1 (owner 2026-07-04): renamed from "Culturally Responsive
      // Education" (same concept). Position unchanged.
      { value: 'Cultural Diversity', label: 'Cultural Diversity' },
    ],
  },

  culturalHeritage: {
    label: 'Cultural Heritage',
    type: 'hierarchical',
    // Generated from data/vocab/cultural-heritage.vocab.json (top + sub tiers;
    // `internal` nodes are hidden in the UI but still match via the recursive
    // DB expansion). Regenerate via:
    //   npx tsx scripts/heritage/generate-heritage-hierarchy.ts
    options: culturalHeritageOptions,
  },

  academicIntegration: {
    label: 'Academic Integration',
    type: 'multiple',
    options: [
      { value: 'Math', label: 'Math' },
      { value: 'Science', label: 'Science' },
      { value: 'Literacy/ELA', label: 'Literacy/ELA' },
      { value: 'Social Studies', label: 'Social Studies' },
      { value: 'Health', label: 'Health' },
      { value: 'Arts', label: 'Arts' },
    ],
  },

  socialEmotionalLearning: {
    // FP5 Brief 1 (owner 2026-07-04): label renamed "Social-Emotional Learning"
    // → "Social-Emotional Skills"; 6 template-era options appended to the 5
    // CASEL values (the old 5 only match pre-2026 lessons — mixed-era list
    // accepted). Key/column `socialEmotionalLearning` / `social_emotional_learning`
    // unchanged.
    label: 'Social-Emotional Skills',
    type: 'multiple',
    options: [
      { value: 'Relationship skills', label: 'Relationship skills' },
      { value: 'Self-awareness', label: 'Self-awareness' },
      { value: 'Responsible decision-making', label: 'Responsible decision-making' },
      { value: 'Self-management', label: 'Self-management' },
      { value: 'Social awareness', label: 'Social awareness' },
      { value: 'Bravery', label: 'Bravery' },
      { value: 'Kindness', label: 'Kindness' },
      { value: 'Respect', label: 'Respect' },
      { value: 'Collaboration', label: 'Collaboration' },
      { value: 'Pride', label: 'Pride' },
      { value: 'Joy', label: 'Joy' },
    ],
  },

  cookingMethods: {
    label: 'Cooking Methods',
    type: 'multiple',
    // Canonical kebab values (PR 6e — locked smaller-fields.vocab.json). Stored
    // PROD data is kebab; the facet badge buckets by the stored value, so the
    // option `value` MUST be kebab for the count lookup + reviewer save to match.
    options: [
      { value: 'basic-prep', label: 'Basic prep' },
      { value: 'stovetop', label: 'Stovetop' },
      { value: 'oven', label: 'Oven' },
    ],
  },
};

// Metadata fields used in review/submission process (NOT search filters).
// Module-private (F3 dead-export sweep): the only exported surface consumers read
// is `ALL_FIELD_CONFIGS` below (ReviewMetadataForm). `mainIngredients` was
// promoted out of here into FILTER_CONFIGS (owner decision D-C) — the reviewer
// form still reaches it via ALL_FIELD_CONFIGS.
const METADATA_CONFIGS: Record<string, FilterConfig> = {
  gardenSkills: {
    label: 'Garden Skills',
    type: 'multiple',
    // Canonical Title-Case values (PR 6e — locked smaller-fields.vocab.json).
    // value === label so stored canonical values round-trip in the reviewer
    // control and survive the now-closed gardenSkills enum / DB CHECK. 24 total
    // (the 22 prior labels + 'Stewardship tasks' + 'Sensory exploration').
    options: [
      // Planting & Growing
      { value: 'Planting', label: 'Planting' },
      { value: 'Seed starting', label: 'Seed starting' },
      { value: 'Transplanting', label: 'Transplanting' },
      { value: 'Watering techniques', label: 'Watering techniques' },
      { value: 'Harvesting', label: 'Harvesting' },
      // Garden Care
      { value: 'Composting', label: 'Composting' },
      { value: 'Mulching', label: 'Mulching' },
      { value: 'Soil preparation and care', label: 'Soil preparation and care' },
      { value: 'Weeding', label: 'Weeding' },
      { value: 'Cover cropping', label: 'Cover cropping' },
      // Planning & Design
      { value: 'Garden planning', label: 'Garden planning' },
      { value: 'Companion planting', label: 'Companion planting' },
      { value: 'Crop rotation', label: 'Crop rotation' },
      // Observation & Identification
      { value: 'Observing plant parts', label: 'Observing plant parts' },
      { value: 'Identifying plants', label: 'Identifying plants' },
      { value: 'Pest identification', label: 'Pest identification' },
      { value: 'Beneficial insect identification', label: 'Beneficial insect identification' },
      { value: 'Pollinator observation', label: 'Pollinator observation' },
      // Advanced Skills
      { value: 'Seed saving', label: 'Seed saving' },
      { value: 'Tool use and maintenance', label: 'Tool use and maintenance' },
      { value: 'Preservation techniques', label: 'Preservation techniques' },
      { value: 'Garden exploration', label: 'Garden exploration' },
      { value: 'Stewardship tasks', label: 'Stewardship tasks' },
      { value: 'Sensory exploration', label: 'Sensory exploration' },
    ],
  },

  cookingSkills: {
    label: 'Cooking Skills',
    type: 'multiple',
    // Canonical Title-Case values (C02 re-tag — frozen c02-vocab.json manifest).
    // value === label so stored canonical values round-trip in the reviewer
    // control and survive the now-closed cookingSkills enum / DB CHECK.
    // 23 total (frozen vocab — do not edit).
    options: COOKING_SKILLS_VALUES.map((v) => ({ value: v, label: v })),
  },

  // Closed vocabulary (PR 6e — locked smaller-fields.vocab.json, 16 values).
  // type 'multiple' (non-creatable) so reviewers can't type an off-vocab
  // holiday that the now-closed observancesHolidays enum / DB CHECK rejects.
  observancesHolidays: {
    label: 'Observances & Holidays',
    type: 'multiple',
    options: [
      { value: 'AAPI Heritage Month', label: 'AAPI Heritage Month' },
      { value: 'Black History Month', label: 'Black History Month' },
      { value: 'Hispanic/Latinx Heritage Month', label: 'Hispanic/Latinx Heritage Month' },
      { value: "Indigenous Peoples' Month", label: "Indigenous Peoples' Month" },
      { value: "Women's History Month", label: "Women's History Month" },
      { value: 'Pride', label: 'Pride' },
      { value: 'Earth Month', label: 'Earth Month' },
      { value: 'Thanksgiving', label: 'Thanksgiving' },
      { value: 'Lunar New Year', label: 'Lunar New Year' },
      { value: 'New Year', label: 'New Year' },
      { value: 'Ramadan', label: 'Ramadan' },
      { value: 'Eid', label: 'Eid' },
      { value: 'Juneteenth', label: 'Juneteenth' },
      { value: 'School Food Hero Day', label: 'School Food Hero Day' },
      { value: 'Beginning of year', label: 'Beginning of year' },
      { value: 'End of year celebrations', label: 'End of year celebrations' },
    ],
  },

  culturalResponsivenessFeatures: {
    label: 'Cultural Responsiveness Features',
    type: 'creatable',
    options: [
      {
        value: 'Promotes student-centered instruction',
        label: 'Promotes student-centered instruction',
      },
      {
        value: 'Incorporates different individual and cultural learning styles',
        label: 'Incorporates different individual and cultural learning styles',
      },
      {
        value: 'Encourages learning within the context of culture',
        label: 'Encourages learning within the context of culture',
      },
      { value: 'Communicates high expectations', label: 'Communicates high expectations' },
      { value: 'Positions teacher as facilitator', label: 'Positions teacher as facilitator' },
      {
        value: 'Promotes positive perspectives on parents and families',
        label: 'Promotes positive perspectives on parents and families',
      },
      { value: 'Reshapes curriculum', label: 'Reshapes curriculum' },
    ],
  },
};

// FP-18 (search UI only): the public search sidebar renders Location as two
// friendly checkboxes — Indoor-friendly / Outdoor-friendly. The stored value
// `Both` is intentionally NOT offered as a search option — search folds it into
// both indoor and outdoor server-side (`_match_location`) and in the badge
// counts (`expandLocationSelection`), so an explicit Both checkbox would be
// redundant. `FILTER_CONFIGS.location.options` above keeps the literal
// Indoor/Outdoor/Both for the REVIEWER metadata form, which must still be able
// to tag a lesson as `Both`. Consumed by IntSidebar, IntActivePills, and the
// URL validator (which drops a stale `?loc=Both`).
export const SEARCH_LOCATION_OPTIONS: ReadonlyArray<{ value: string; label: string }> = [
  { value: 'Indoor', label: 'Indoor-friendly' },
  { value: 'Outdoor', label: 'Outdoor-friendly' },
];

// Export filter keys for easy iteration
export const FILTER_KEYS = Object.keys(FILTER_CONFIGS) as Array<keyof typeof FILTER_CONFIGS>;

// Total number of filter categories (used in stats display)
export const TOTAL_FILTER_CATEGORIES = FILTER_KEYS.length;

// Combined configs for backward compatibility in review forms
// WARNING: Do not use this for search filters!
export const ALL_FIELD_CONFIGS = {
  ...FILTER_CONFIGS,
  ...METADATA_CONFIGS,
};
