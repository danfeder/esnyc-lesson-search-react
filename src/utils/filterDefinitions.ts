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
    options: [
      // Vegetables
      { value: 'root-vegetables', label: 'Root vegetables', category: 'Vegetables' },
      { value: 'leafy-greens', label: 'Leafy greens', category: 'Vegetables' },
      { value: 'nightshades', label: 'Nightshades (tomatoes, etc.)', category: 'Vegetables' },
      { value: 'cruciferous', label: 'Cruciferous (broccoli, cabbage)', category: 'Vegetables' },
      { value: 'winter-squash', label: 'Winter squash', category: 'Vegetables' },
      { value: 'alliums', label: 'Alliums (onions, garlic)', category: 'Vegetables' },
      { value: 'peppers', label: 'Peppers', category: 'Vegetables' },
      { value: 'cucumbers', label: 'Cucumbers', category: 'Vegetables' },
      { value: 'carrots', label: 'Carrots', category: 'Vegetables' },
      { value: 'beets', label: 'Beets', category: 'Vegetables' },
      { value: 'celery', label: 'Celery', category: 'Vegetables' },
      // Fruits
      { value: 'berries', label: 'Berries', category: 'Fruits' },
      { value: 'citrus', label: 'Citrus fruits', category: 'Fruits' },
      { value: 'apples', label: 'Apples', category: 'Fruits' },
      { value: 'stone-fruits', label: 'Stone fruits', category: 'Fruits' },
      { value: 'bananas', label: 'Bananas', category: 'Fruits' },
      { value: 'melons', label: 'Melons', category: 'Fruits' },
      { value: 'avocados', label: 'Avocados', category: 'Fruits' },
      // Grains & Starches
      { value: 'wheat-flour', label: 'Wheat/flour', category: 'Grains' },
      { value: 'corn-masa', label: 'Corn/masa', category: 'Grains' },
      { value: 'rice', label: 'Rice', category: 'Grains' },
      { value: 'oats', label: 'Oats', category: 'Grains' },
      { value: 'potatoes', label: 'Potatoes', category: 'Grains' },
      { value: 'bread', label: 'Bread', category: 'Grains' },
      { value: 'pasta', label: 'Pasta', category: 'Grains' },
      // Proteins
      { value: 'beans', label: 'Beans (various)', category: 'Proteins' },
      { value: 'black-beans', label: 'Black beans', category: 'Proteins' },
      { value: 'chickpeas', label: 'Chickpeas', category: 'Proteins' },
      { value: 'lentils', label: 'Lentils', category: 'Proteins' },
      { value: 'eggs', label: 'Eggs', category: 'Proteins' },
      { value: 'tofu', label: 'Tofu', category: 'Proteins' },
      { value: 'nuts', label: 'Nuts', category: 'Proteins' },
      { value: 'seeds', label: 'Seeds', category: 'Proteins' },
      // Dairy & Alternatives
      { value: 'milk', label: 'Milk', category: 'Dairy' },
      { value: 'cheese', label: 'Cheese', category: 'Dairy' },
      { value: 'yogurt', label: 'Yogurt', category: 'Dairy' },
      { value: 'butter', label: 'Butter', category: 'Dairy' },
      { value: 'plant-milk', label: 'Plant-based milk', category: 'Dairy' },
      // Herbs & Spices
      { value: 'herbs-aromatics', label: 'Herbs & Aromatics', category: 'Seasonings' },
      { value: 'basil', label: 'Basil', category: 'Seasonings' },
      { value: 'cilantro', label: 'Cilantro', category: 'Seasonings' },
      { value: 'parsley', label: 'Parsley', category: 'Seasonings' },
      { value: 'ginger', label: 'Ginger', category: 'Seasonings' },
      { value: 'various-spices', label: 'Various spices', category: 'Seasonings' },
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
    options: [
      // Basic Skills
      { value: 'measuring', label: 'Measuring', category: 'Basic' },
      { value: 'mixing', label: 'Mixing/stirring', category: 'Basic' },
      { value: 'following-recipes', label: 'Following recipes', category: 'Basic' },
      { value: 'food-safety', label: 'Food safety', category: 'Basic' },
      { value: 'kitchen-organization', label: 'Kitchen organization', category: 'Basic' },
      // Cutting Skills
      { value: 'chopping', label: 'Chopping', category: 'Cutting' },
      { value: 'dicing', label: 'Dicing', category: 'Cutting' },
      { value: 'slicing', label: 'Slicing', category: 'Cutting' },
      { value: 'julienning', label: 'Julienning', category: 'Cutting' },
      { value: 'mincing', label: 'Mincing', category: 'Cutting' },
      { value: 'chiffonade', label: 'Chiffonade', category: 'Cutting' },
      // Cooking Methods
      { value: 'boiling', label: 'Boiling', category: 'Cooking' },
      { value: 'sauteing', label: 'Sautéing', category: 'Cooking' },
      { value: 'roasting', label: 'Roasting', category: 'Cooking' },
      { value: 'baking', label: 'Baking', category: 'Cooking' },
      { value: 'steaming', label: 'Steaming', category: 'Cooking' },
      { value: 'grilling', label: 'Grilling', category: 'Cooking' },
      { value: 'blanching', label: 'Blanching', category: 'Cooking' },
      // Advanced Skills
      { value: 'dough-making', label: 'Dough making', category: 'Advanced' },
      { value: 'sauce-creation', label: 'Creating sauces/dressings', category: 'Advanced' },
      { value: 'pickling', label: 'Pickling/preserving', category: 'Advanced' },
      { value: 'fermenting', label: 'Fermenting', category: 'Advanced' },
      { value: 'bread-making', label: 'Bread making', category: 'Advanced' },
      // Assembly & Presentation
      { value: 'plating', label: 'Plating', category: 'Assembly' },
      { value: 'garnishing', label: 'Garnishing', category: 'Assembly' },
      { value: 'assembling-dishes', label: 'Assembling dishes', category: 'Assembly' },
      { value: 'wrapping-rolling', label: 'Wrapping/rolling', category: 'Assembly' },
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
