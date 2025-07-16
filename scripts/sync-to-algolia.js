import 'dotenv/config';
import algoliasearch from 'algoliasearch';
import { createClient } from '@supabase/supabase-js';

// Check for required environment variables
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'ALGOLIA_APP_ID',
  'ALGOLIA_ADMIN_API_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    console.log('\nPlease add the following to your .env file:');
    console.log('ALGOLIA_APP_ID=your_algolia_app_id');
    console.log('ALGOLIA_ADMIN_API_KEY=your_algolia_admin_key');
    process.exit(1);
  }
}

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Algolia client
const algoliaClient = algoliasearch(
  process.env.ALGOLIA_APP_ID,
  process.env.ALGOLIA_ADMIN_API_KEY
);

const index = algoliaClient.initIndex('lessons');

async function syncLessonsToAlgolia() {
  try {
    console.log('🔄 Fetching lessons from Supabase...');
    
    // Fetch all lessons from Supabase
    const { data: lessons, error } = await supabase
      .from('lessons')
      .select('*')
      .order('lesson_id');
    
    if (error) {
      throw new Error(`Failed to fetch lessons: ${error.message}`);
    }
    
    console.log(`✅ Fetched ${lessons.length} lessons from Supabase`);
    
    // Transform lessons for Algolia
    const algoliaRecords = lessons.map((lesson) => ({
      objectID: lesson.lesson_id, // Algolia requires objectID
      lessonId: lesson.lesson_id,
      title: lesson.title || 'Untitled',
      summary: lesson.summary || '',
      fileLink: lesson.file_link,
      gradeLevels: lesson.grade_levels || [],
      metadata: lesson.metadata || {},
      confidence: lesson.confidence || { overall: 0.5 },
      createdAt: lesson.created_at,
      updatedAt: lesson.updated_at,
      
      // Flatten some metadata for better searching
      mainIngredients: lesson.metadata?.mainIngredients || [],
      thematicCategories: lesson.metadata?.thematicCategories || [],
      culturalHeritage: lesson.metadata?.culturalHeritage || [],
      skills: [
        ...(lesson.metadata?.skills || []),
        ...(lesson.metadata?.cookingSkills || []),
        ...(lesson.metadata?.gardenSkills || []),
      ],
    }));
    
    console.log('📤 Uploading lessons to Algolia...');
    
    // Configure index settings
    await index.setSettings({
      searchableAttributes: [
        'title,summary',
        'mainIngredients,skills',
        'thematicCategories,culturalHeritage',
      ],
      
      attributesForFaceting: [
        'searchable(gradeLevels)',
        'metadata.thematicCategories',
        'metadata.seasonTiming',
        'metadata.coreCompetencies',
        'metadata.culturalHeritage',
        'metadata.locationRequirements',
        'metadata.activityType',
        'metadata.lessonFormat',
      ],
      
      customRanking: ['desc(confidence.overall)'],
      
      typoTolerance: true,
      minWordSizefor1Typo: 4,
      minWordSizefor2Typos: 8,
    });
    
    // Upload records in batches
    const batchSize = 100;
    for (let i = 0; i < algoliaRecords.length; i += batchSize) {
      const batch = algoliaRecords.slice(i, i + batchSize);
      await index.saveObjects(batch);
      console.log(`📦 Uploaded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(algoliaRecords.length / batchSize)}`);
    }
    
    // Configure synonyms
    console.log('🔧 Configuring synonyms...');
    await index.saveSynonyms([
      // Word variations
      { objectID: 'woman-women', type: 'synonym', synonyms: ['woman', 'women', "women's"] },
      { objectID: 'vegetables', type: 'synonym', synonyms: ['vegetable', 'vegetables', 'veggie', 'veggies'] },
      { objectID: 'herbs', type: 'synonym', synonyms: ['herb', 'herbs', 'spice', 'spices'] },
      
      // Grade levels
      { objectID: '3rd-grade', type: 'synonym', synonyms: ['3', '3rd', 'third', 'grade 3'] },
      { objectID: 'kindergarten', type: 'synonym', synonyms: ['k', 'kindergarten', 'kinder'] },
      { objectID: 'pre-k', type: 'synonym', synonyms: ['pk', 'pre-k', 'prek', 'pre kindergarten', '3k'] },
      
      // Seasonal
      { objectID: 'thanksgiving', type: 'synonym', synonyms: ['thanksgiving', 'gratitude', 'harvest', 'turkey'] },
      { objectID: 'fall', type: 'synonym', synonyms: ['fall', 'autumn', 'september', 'october', 'november'] },
      
      // Cultural - one-way synonyms (searching "asian" finds specific cuisines)
      { objectID: 'asian-foods', type: 'oneWaySynonym', input: 'asian', synonyms: ['chinese', 'japanese', 'korean', 'vietnamese', 'thai'] },
      { objectID: 'hispanic-foods', type: 'oneWaySynonym', input: 'hispanic', synonyms: ['latino', 'latina', 'mexican', 'spanish', 'caribbean'] },
      { objectID: 'latin-foods', type: 'oneWaySynonym', input: 'latin', synonyms: ['latino', 'latina', 'mexican', 'spanish', 'caribbean'] },
    ]);
    
    console.log('✅ Successfully synced all lessons to Algolia!');
    console.log(`📊 Total records indexed: ${algoliaRecords.length}`);
    
    // Get index info
    const settings = await index.getSettings();
    console.log('\n📋 Index Configuration:');
    console.log(`- Searchable attributes: ${settings.searchableAttributes.length}`);
    console.log(`- Facets: ${settings.attributesForFaceting.length}`);
    console.log(`- Typo tolerance: ${settings.typoTolerance ? 'Enabled' : 'Disabled'}`);
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

// Run the sync
syncLessonsToAlgolia();