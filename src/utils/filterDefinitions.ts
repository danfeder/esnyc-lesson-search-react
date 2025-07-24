// Filter configurations for the 11 filters
export const FILTER_CONFIGS = {
  activityType: {
    label: 'Activity Type',
    type: 'single',
    options: [
      { value: 'cooking', label: 'Cooking' },
      { value: 'garden', label: 'Garden' },
      { value: 'both', label: 'Both' },
      { value: 'academic', label: 'Academic' },
    ],
  },

  location: {
    label: 'Location',
    type: 'single',
    options: [
      { value: 'indoor', label: 'Indoor' },
      { value: 'outdoor', label: 'Outdoor' },
      { value: 'both', label: 'Both' },
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
      { value: 'garden-basics', label: 'Garden Basics' },
      { value: 'plant-growth', label: 'Plant Growth' },
      { value: 'garden-communities', label: 'Garden Communities' },
      { value: 'ecosystems', label: 'Ecosystems' },
      { value: 'seed-to-table', label: 'Seed to Table' },
      { value: 'food-systems', label: 'Food Systems' },
      { value: 'food-justice', label: 'Food Justice' },
    ],
  },

  seasonTiming: {
    label: 'Season & Timing',
    type: 'single',
    options: [
      { value: 'fall', label: 'Fall' },
      { value: 'winter', label: 'Winter' },
      { value: 'spring', label: 'Spring' },
      { value: 'summer', label: 'Summer' },
      { value: 'beginning-of-year', label: 'Beginning of Year' },
      { value: 'end-of-year', label: 'End of Year' },
      { value: 'year-round', label: 'Year-round' },
    ],
  },

  coreCompetencies: {
    label: 'Core Competencies',
    type: 'multiple',
    options: [
      { value: 'environmental-stewardship', label: 'Environmental and Community Stewardship' },
      { value: 'social-justice', label: 'Social Justice' },
      { value: 'social-emotional', label: 'Social-Emotional Intelligence' },
      { value: 'garden-skills', label: 'Garden Skills and Related Academic Content' },
      { value: 'kitchen-skills', label: 'Kitchen Skills and Related Academic Content' },
      { value: 'culturally-responsive', label: 'Culturally Responsive Education' },
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
      { value: 'relationship-skills', label: 'Relationship skills' },
      { value: 'self-awareness', label: 'Self-awareness' },
      { value: 'responsible-decision-making', label: 'Responsible decision-making' },
      { value: 'self-management', label: 'Self-management' },
      { value: 'social-awareness', label: 'Social awareness' },
    ],
  },

  cookingMethods: {
    label: 'Cooking Methods',
    type: 'single',
    options: [
      { value: 'no-cook', label: 'No-cook' },
      { value: 'stovetop', label: 'Stovetop' },
      { value: 'oven', label: 'Oven' },
      { value: 'basic-prep', label: 'Basic prep only' },
    ],
  },
};

// Export filter keys for easy iteration
export const FILTER_KEYS = Object.keys(FILTER_CONFIGS) as Array<keyof typeof FILTER_CONFIGS>;
