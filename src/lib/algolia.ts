import algoliasearch, { SearchClient } from 'algoliasearch';

// Initialize Algolia client
export const algoliaClient: SearchClient = algoliasearch(
  import.meta.env.VITE_ALGOLIA_APP_ID || '',
  import.meta.env.VITE_ALGOLIA_SEARCH_API_KEY || ''
);

// Get the lessons index
export const lessonsIndex = algoliaClient.initIndex('lessons');

// Algolia search configuration
export const algoliaConfig = {
  // Search settings
  searchableAttributes: [
    'title,summary', // Primary search fields with higher priority
    'metadata.mainIngredients,metadata.skills',
    'metadata.thematicCategories,metadata.culturalHeritage',
    'metadata.cookingSkills,metadata.gardenSkills',
    'metadata.academicConnections',
  ],
  
  // Define custom ranking
  customRanking: [
    'desc(confidence.overall)',
    'asc(title)',
  ],
  
  // Facets for filtering
  attributesForFaceting: [
    'searchable(gradeLevels)',
    'metadata.thematicCategories',
    'metadata.seasonTiming',
    'metadata.coreCompetencies',
    'metadata.culturalHeritage',
    'metadata.locationRequirements',
    'metadata.activityType',
    'metadata.lessonFormat',
    'metadata.groupSizeOptions',
    'metadata.preparationTime',
    'metadata.materialsNeeded',
    'metadata.dietaryConsiderations',
    'metadata.academicConnections',
  ],
  
  // Configure typo tolerance
  typoTolerance: true,
  minWordSizefor1Typo: 4,
  minWordSizefor2Typos: 8,
  
  // Configure synonyms
  synonyms: [
    // Seasonal synonyms
    {
      type: 'synonym',
      synonyms: ['thanksgiving', 'gratitude', 'harvest', 'turkey', 'fall celebration'],
    },
    {
      type: 'synonym',
      synonyms: ['winter', 'cold season', 'december', 'january', 'february'],
    },
    {
      type: 'synonym',
      synonyms: ['spring', 'march', 'april', 'may', 'planting season'],
    },
    {
      type: 'synonym',
      synonyms: ['summer', 'june', 'july', 'august', 'warm weather'],
    },
    
    // Cultural synonyms
    {
      type: 'oneWaySynonym',
      input: 'asian',
      synonyms: ['chinese', 'japanese', 'korean', 'vietnamese', 'thai'],
    },
    {
      type: 'oneWaySynonym',
      input: 'hispanic',
      synonyms: ['latino', 'latina', 'latinx', 'spanish', 'mexican'],
    },
    
    // Grade level synonyms
    {
      type: 'synonym',
      synonyms: ['3', '3rd', 'third', 'grade 3', 'three'],
    },
    {
      type: 'synonym',
      synonyms: ['k', 'kindergarten', 'kinder'],
    },
    {
      type: 'synonym',
      synonyms: ['pk', 'pre-k', 'prek', 'pre kindergarten'],
    },
    
    // Activity synonyms
    {
      type: 'synonym',
      synonyms: ['cooking', 'kitchen', 'culinary', 'food preparation'],
    },
    {
      type: 'synonym',
      synonyms: ['garden', 'gardening', 'planting', 'growing'],
    },
    
    // Common word variations
    {
      type: 'synonym',
      synonyms: ['woman', 'women', "women's"],
    },
    {
      type: 'synonym',
      synonyms: ['vegetable', 'vegetables', 'veggie', 'veggies'],
    },
    {
      type: 'synonym',
      synonyms: ['herb', 'herbs', 'spices', 'seasoning'],
    },
    
    // Common misspellings
    {
      type: 'altCorrection1',
      word: 'pumkin',
      corrections: ['pumpkin'],
    },
    {
      type: 'altCorrection1',
      word: 'vegitable',
      corrections: ['vegetable'],
    },
    {
      type: 'altCorrection1',
      word: 'reciepe',
      corrections: ['recipe'],
    },
  ],
  
  // Configure distinct/deduplication
  distinct: 1,
  attributeForDistinct: 'lessonId',
};