import { culturalHeritageOptions } from '@/utils/heritageHierarchy.generated';

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

  location: {
    label: 'Location',
    type: 'single',
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
      { value: 'Culturally Responsive Education', label: 'Culturally Responsive Education' },
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
    label: 'Social-Emotional Learning',
    type: 'multiple',
    options: [
      { value: 'Relationship skills', label: 'Relationship skills' },
      { value: 'Self-awareness', label: 'Self-awareness' },
      { value: 'Responsible decision-making', label: 'Responsible decision-making' },
      { value: 'Self-management', label: 'Self-management' },
      { value: 'Social awareness', label: 'Social awareness' },
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

// Metadata fields used in review/submission process (NOT search filters)
// These are used for lesson data enrichment but not exposed as search filters
export const METADATA_CONFIGS: Record<string, FilterConfig> = {
  // Additional metadata fields for review process
  mainIngredients: {
    label: 'Main Ingredients',
    type: 'multiple',
    // Canonical Title-Case values (C02 re-tag — frozen c02-vocab.json manifest).
    // value === label so stored canonical values round-trip in the reviewer
    // control and survive the now-closed mainIngredients enum / DB CHECK.
    // 70 total: 24 groups + 46 specifics (frozen vocab — do not edit).
    options: [
      // Groups (24)
      { value: 'Alliums', label: 'Alliums' },
      { value: 'Leafy greens', label: 'Leafy greens' },
      { value: 'Root vegetables', label: 'Root vegetables' },
      { value: 'Nightshades', label: 'Nightshades' },
      { value: 'Peppers', label: 'Peppers' },
      { value: 'Cruciferous', label: 'Cruciferous' },
      { value: 'Squash, cucumbers & melons', label: 'Squash, cucumbers & melons' },
      { value: 'Mushrooms', label: 'Mushrooms' },
      { value: 'Berries', label: 'Berries' },
      { value: 'Citrus fruits', label: 'Citrus fruits' },
      { value: 'Tropical fruits', label: 'Tropical fruits' },
      { value: 'Apples & pears', label: 'Apples & pears' },
      { value: 'Stone fruits', label: 'Stone fruits' },
      { value: 'Dried fruits', label: 'Dried fruits' },
      { value: 'Grains & starches', label: 'Grains & starches' },
      { value: 'Beans & legumes', label: 'Beans & legumes' },
      { value: 'Nuts & seeds', label: 'Nuts & seeds' },
      { value: 'Eggs', label: 'Eggs' },
      { value: 'Tofu & plant proteins', label: 'Tofu & plant proteins' },
      { value: 'Dairy', label: 'Dairy' },
      { value: 'Dairy alternatives', label: 'Dairy alternatives' },
      { value: 'Fresh herbs', label: 'Fresh herbs' },
      { value: 'Spices', label: 'Spices' },
      { value: 'Sweeteners', label: 'Sweeteners' },
      // Specifics (46)
      { value: 'Garlic', label: 'Garlic' },
      { value: 'Carrots', label: 'Carrots' },
      { value: 'Sweet potatoes', label: 'Sweet potatoes' },
      { value: 'Potatoes', label: 'Potatoes' },
      { value: 'Beets', label: 'Beets' },
      { value: 'Tomatoes', label: 'Tomatoes' },
      { value: 'Bell peppers', label: 'Bell peppers' },
      { value: 'Cabbage', label: 'Cabbage' },
      { value: 'Winter squash', label: 'Winter squash' },
      { value: 'Cucumbers', label: 'Cucumbers' },
      { value: 'Melons', label: 'Melons' },
      { value: 'Bananas', label: 'Bananas' },
      { value: 'Avocado', label: 'Avocado' },
      { value: 'Coconut', label: 'Coconut' },
      { value: 'Lemon', label: 'Lemon' },
      { value: 'Oranges', label: 'Oranges' },
      { value: 'Lime', label: 'Lime' },
      { value: 'Apples', label: 'Apples' },
      { value: 'Wheat/flour', label: 'Wheat/flour' },
      { value: 'Corn/masa', label: 'Corn/masa' },
      { value: 'Rice', label: 'Rice' },
      { value: 'Oats', label: 'Oats' },
      { value: 'Black beans', label: 'Black beans' },
      { value: 'Black-eyed peas', label: 'Black-eyed peas' },
      { value: 'Chickpeas', label: 'Chickpeas' },
      { value: 'Pinto beans', label: 'Pinto beans' },
      { value: 'Pumpkin seeds', label: 'Pumpkin seeds' },
      { value: 'Sunflower seeds', label: 'Sunflower seeds' },
      { value: 'Sunflower butter', label: 'Sunflower butter' },
      { value: 'Tahini', label: 'Tahini' },
      { value: 'Peanut butter', label: 'Peanut butter' },
      { value: 'Yogurt', label: 'Yogurt' },
      { value: 'Cheese', label: 'Cheese' },
      { value: 'Butter', label: 'Butter' },
      { value: 'Milk', label: 'Milk' },
      { value: 'Coconut milk', label: 'Coconut milk' },
      { value: 'Cilantro', label: 'Cilantro' },
      { value: 'Parsley', label: 'Parsley' },
      { value: 'Mint', label: 'Mint' },
      { value: 'Ginger', label: 'Ginger' },
      { value: 'Cinnamon', label: 'Cinnamon' },
      { value: 'Honey', label: 'Honey' },
      { value: 'Celery', label: 'Celery' },
      { value: 'Fennel', label: 'Fennel' },
      { value: 'Seaweed (nori)', label: 'Seaweed (nori)' },
      { value: 'Cocoa & chocolate', label: 'Cocoa & chocolate' },
    ],
  },

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
    options: [
      { value: 'Measuring', label: 'Measuring' },
      { value: 'Mixing & stirring', label: 'Mixing & stirring' },
      { value: 'Reading & following recipes', label: 'Reading & following recipes' },
      { value: 'Kitchen & food safety', label: 'Kitchen & food safety' },
      { value: 'Tasting', label: 'Tasting' },
      { value: 'Grating', label: 'Grating' },
      { value: 'Mashing', label: 'Mashing' },
      { value: 'Blending & juicing', label: 'Blending & juicing' },
      { value: 'Seasoning & spice blending', label: 'Seasoning & spice blending' },
      { value: 'Knife skills', label: 'Knife skills' },
      { value: 'Boiling & simmering', label: 'Boiling & simmering' },
      { value: 'Sautéing & stir-frying', label: 'Sautéing & stir-frying' },
      { value: 'Steaming', label: 'Steaming' },
      { value: 'Roasting', label: 'Roasting' },
      { value: 'Baking', label: 'Baking' },
      { value: 'Grilling', label: 'Grilling' },
      { value: 'Dough making', label: 'Dough making' },
      { value: 'Creating sauces & dressings', label: 'Creating sauces & dressings' },
      { value: 'Pickling & preserving', label: 'Pickling & preserving' },
      { value: 'Fermenting', label: 'Fermenting' },
      { value: 'Assembling dishes', label: 'Assembling dishes' },
      { value: 'Wrapping & rolling', label: 'Wrapping & rolling' },
      { value: 'Plating & garnishing', label: 'Plating & garnishing' },
    ],
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

// Export filter keys for easy iteration
export const FILTER_KEYS = Object.keys(FILTER_CONFIGS) as Array<keyof typeof FILTER_CONFIGS>;

// Total number of filter categories (used in stats display)
export const TOTAL_FILTER_CATEGORIES = FILTER_KEYS.length;

// Export metadata keys separately
export const METADATA_KEYS = Object.keys(METADATA_CONFIGS) as Array<keyof typeof METADATA_CONFIGS>;

// Combined configs for backward compatibility in review forms
// WARNING: Do not use this for search filters!
export const ALL_FIELD_CONFIGS = {
  ...FILTER_CONFIGS,
  ...METADATA_CONFIGS,
};
