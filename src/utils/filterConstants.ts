// Cultural heritage hierarchy for search
export const CULTURAL_HIERARCHY: Record<string, string[]> = {
  Asian: [
    'East Asian',
    'Southeast Asian',
    'South Asian',
    'Central Asian',
    'Chinese',
    'Japanese',
    'Korean',
    'Taiwanese',
    'Vietnamese',
    'Filipino',
    'Malaysian',
    'Thai',
    'Indian',
    'Bengali',
    'Pakistani',
    'Uzbek',
  ],
  'East Asian': ['Chinese', 'Japanese', 'Korean', 'Taiwanese'],
  'Southeast Asian': ['Vietnamese', 'Filipino', 'Malaysian', 'Thai'],
  'South Asian': ['Indian', 'Bengali', 'Pakistani'],
  'Central Asian': ['Uzbek'],
  Americas: [
    'Latin American',
    'Caribbean',
    'North American',
    'Mexican',
    'Dominican',
    'Puerto Rican',
    'Salvadoran',
    'Jamaican',
    'Cajun/Creole',
    'Indigenous/Native American',
    'African American diaspora',
  ],
  'Latin American': ['Mexican', 'Dominican', 'Puerto Rican', 'Salvadoran'],
  Caribbean: ['Jamaican', 'Dominican', 'Puerto Rican'],
  'North American': ['Cajun/Creole', 'Indigenous/Native American', 'African American diaspora'],
  African: ['West African', 'Ethiopian', 'Nigerian'],
  European: [
    'Eastern European',
    'Mediterranean',
    'Italian',
    'Spanish',
    'Greek',
    'French',
    'Russian/Ukrainian',
    'Polish',
  ],
  Mediterranean: ['Italian', 'Spanish', 'Greek'],
  'Eastern European': ['Russian/Ukrainian', 'Polish'],
  'Middle Eastern': ['Levantine', 'Palestinian', 'Lebanese', 'Syrian', 'Jordanian', 'Israeli'],
  Levantine: ['Palestinian', 'Lebanese', 'Syrian', 'Jordanian'],
};

// Ingredient groupings for search
export const INGREDIENT_GROUPS: Record<string, string[]> = {
  'Root vegetables': ['potatoes', 'carrots', 'beets', 'turnips', 'radishes'],
  'Winter squash': ['butternut', 'honeynut', 'pumpkin', 'acorn squash', 'kabocha'],
  'Leafy greens': ['collards', 'kale', 'lettuce', 'spinach', 'chard'],
  Nightshades: ['tomatoes', 'peppers', 'eggplant'],
  Alliums: ['onions', 'garlic', 'scallions', 'leeks'],
  Cruciferous: ['cauliflower', 'cabbage', 'broccoli', 'brussels sprouts'],
};

// Grade level groupings
export const GRADE_GROUPS = {
  'early-childhood': {
    name: 'Early Childhood (3K-PK)',
    grades: ['3K', 'PK'],
  },
  'lower-elementary': {
    name: 'Lower Elementary (K-2)',
    grades: ['K', '1', '2'],
  },
  'upper-elementary': {
    name: 'Upper Elementary (3-5)',
    grades: ['3', '4', '5'],
  },
  middle: {
    name: 'Middle School (6-8)',
    grades: ['6', '7', '8'],
  },
};

// Note: Option lists for filters have moved to `filterDefinitions.ts` (Phase 2B).
// The remaining exports are still used by cultural heritage widgets and helpers.
