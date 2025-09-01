// Type definitions for filter options
interface FilterOption {
  value: string;
  label: string;
  category?: string;
  children?: FilterOption[];
}

interface FilterConfig {
  label: string;
  type: 'single' | 'multiple' | 'hierarchical' | 'creatable';
  options: FilterOption[];
  groups?: Array<{
    id: string;
    label: string;
    grades: string[];
  }>;
}

// Filter configurations for EXACTLY 11 filters used in search
// CRITICAL: Must maintain exactly 11 filters per ESYNYC requirements
export const FILTER_CONFIGS: Record<string, FilterConfig> = {
  activityType: {
    label: 'Activity Type',
    type: 'single',
    options: [
      { value: 'cooking-only', label: 'Cooking Only' },
      { value: 'garden-only', label: 'Garden Only' },
      { value: 'both', label: 'Cooking + Garden' },
      { value: 'academic-only', label: 'Academic Only' },
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

  gradeLevel: {
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

  theme: {
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
      { value: 'Environmental and Community Stewardship', label: 'Environmental and Community Stewardship' },
      { value: 'Social Justice', label: 'Social Justice' },
      { value: 'Social-Emotional Intelligence', label: 'Social-Emotional Intelligence' },
      { value: 'Garden Skills and Related Academic Content', label: 'Garden Skills and Related Academic Content' },
      { value: 'Kitchen Skills and Related Academic Content', label: 'Kitchen Skills and Related Academic Content' },
      { value: 'Culturally Responsive Education', label: 'Culturally Responsive Education' },
    ],
  },

  culturalHeritage: {
    label: 'Cultural Heritage',
    type: 'hierarchical',
    options: [
      {
        value: 'asian',
        label: 'Asian',
        children: [
          { value: 'east-asian', label: 'East Asian' },
          { value: 'southeast-asian', label: 'Southeast Asian' },
          { value: 'south-asian', label: 'South Asian' },
          { value: 'central-asian', label: 'Central Asian' },
        ],
      },
      {
        value: 'americas',
        label: 'Americas',
        children: [
          { value: 'latin-american', label: 'Latin American' },
          { value: 'caribbean', label: 'Caribbean' },
          { value: 'north-american', label: 'North American' },
        ],
      },
      {
        value: 'african',
        label: 'African',
        children: [
          { value: 'west-african', label: 'West African' },
          { value: 'ethiopian', label: 'Ethiopian' },
          { value: 'nigerian', label: 'Nigerian' },
        ],
      },
      {
        value: 'european',
        label: 'European',
        children: [
          { value: 'eastern-european', label: 'Eastern European' },
          { value: 'mediterranean', label: 'Mediterranean' },
        ],
      },
      {
        value: 'middle-eastern',
        label: 'Middle Eastern',
        children: [{ value: 'levantine', label: 'Levantine' }],
      },
    ],
  },

  lessonFormat: {
    label: 'Lesson Format',
    type: 'single',
    options: [
      { value: 'standalone', label: 'Standalone' },
      { value: 'multi-session', label: 'Multi-session unit' },
      { value: 'double-period', label: 'Double period' },
      { value: 'single-period', label: 'Single period' },
      { value: 'co-taught', label: 'Co-taught' },
      { value: 'remote-virtual', label: 'Remote/virtual adapted' },
      { value: 'mobile-education', label: 'Mobile education format' },
    ],
  },

  academicIntegration: {
    label: 'Academic Integration',
    type: 'multiple',
    options: [
      { value: 'math', label: 'Math' },
      { value: 'science', label: 'Science' },
      { value: 'literacy-ela', label: 'Literacy/ELA' },
      { value: 'social-studies', label: 'Social Studies' },
      { value: 'health', label: 'Health' },
      { value: 'arts', label: 'Arts' },
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
    options: [
      { value: 'Basic prep only', label: 'Basic prep only' },
      { value: 'Stovetop', label: 'Stovetop' },
      { value: 'Oven', label: 'Oven' },
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
    options: [
      // Planting & Growing
      { value: 'planting', label: 'Planting' },
      { value: 'seed-starting', label: 'Seed starting' },
      { value: 'transplanting', label: 'Transplanting' },
      { value: 'watering-techniques', label: 'Watering techniques' },
      { value: 'harvesting', label: 'Harvesting' },
      // Garden Care
      { value: 'composting', label: 'Composting' },
      { value: 'mulching', label: 'Mulching' },
      { value: 'soil-preparation', label: 'Soil preparation and care' },
      { value: 'weeding', label: 'Weeding' },
      { value: 'cover-cropping', label: 'Cover cropping' },
      // Planning & Design
      { value: 'garden-planning', label: 'Garden planning' },
      { value: 'companion-planting', label: 'Companion planting' },
      { value: 'crop-rotation', label: 'Crop rotation' },
      // Observation & Identification
      { value: 'observing-plant-parts', label: 'Observing plant parts' },
      { value: 'identifying-plants', label: 'Identifying plants' },
      { value: 'pest-identification', label: 'Pest identification' },
      { value: 'beneficial-insect-id', label: 'Beneficial insect identification' },
      { value: 'pollinator-observation', label: 'Pollinator observation' },
      // Advanced Skills
      { value: 'seed-saving', label: 'Seed saving' },
      { value: 'tool-maintenance', label: 'Tool use and maintenance' },
      { value: 'preservation', label: 'Preservation techniques' },
      { value: 'garden-exploration', label: 'Garden exploration' },
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

  // Suggested values for optional fields (used with CreatableSelect)
  observancesHolidays: {
    label: 'Observances & Holidays',
    type: 'creatable',
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
      { value: 'End of year', label: 'End of year' },
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

// Export metadata keys separately
export const METADATA_KEYS = Object.keys(METADATA_CONFIGS) as Array<keyof typeof METADATA_CONFIGS>;

// Combined configs for backward compatibility in review forms
// WARNING: Do not use this for search filters!
export const ALL_FIELD_CONFIGS = {
  ...FILTER_CONFIGS,
  ...METADATA_CONFIGS,
};
