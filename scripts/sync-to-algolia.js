import 'dotenv/config';
import { algoliasearch } from 'algoliasearch';
import { createClient } from '@supabase/supabase-js';

// Check for required environment variables
const requiredEnvVars = [
  'VITE_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VITE_ALGOLIA_APP_ID',
  'ALGOLIA_ADMIN_API_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    console.log('\nPlease add the following to your .env file:');
    console.log('VITE_ALGOLIA_APP_ID=your_algolia_app_id');
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
  process.env.VITE_ALGOLIA_APP_ID,
  process.env.ALGOLIA_ADMIN_API_KEY
);

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
    const algoliaRecords = lessons.map((lesson) => {
      // Derive activity type from skills
      const hasCooking = (lesson.metadata?.cookingSkills?.length > 0) || 
                         (lesson.metadata?.cookingMethods?.length > 0);
      const hasGarden = lesson.metadata?.gardenSkills?.length > 0;
      
      let activityType = 'academic-only';
      if (hasCooking && hasGarden) {
        activityType = 'both';
      } else if (hasCooking) {
        activityType = 'cooking-only';
      } else if (hasGarden) {
        activityType = 'garden-only';
      }
      
      // Add activityType to metadata
      const enhancedMetadata = {
        ...lesson.metadata,
        activityType: activityType
      };
      
      return {
        objectID: lesson.lesson_id, // Algolia requires objectID
        lessonId: lesson.lesson_id,
        title: lesson.title || 'Untitled',
        summary: lesson.summary || '',
        fileLink: lesson.file_link,
        gradeLevels: lesson.grade_levels || [],
        metadata: enhancedMetadata,
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
      };
    });
    
    console.log('📤 Uploading lessons to Algolia...');
    
    // Upload records in batches using v5 API
    const batchSize = 100;
    for (let i = 0; i < algoliaRecords.length; i += batchSize) {
      const batch = algoliaRecords.slice(i, i + batchSize);
      
      // Use v5 saveObjects method
      await algoliaClient.saveObjects({
        indexName: 'lessons',
        objects: batch,
      });
      
      console.log(`📦 Uploaded batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(algoliaRecords.length / batchSize)}`);
    }
    
    // Configure index settings using v5 API
    console.log('🔧 Configuring index settings...');
    await algoliaClient.setSettings({
      indexName: 'lessons',
      indexSettings: {
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
      },
    });
    
    // Configure synonyms using v5 API
    console.log('🔧 Synonyms can be configured in Algolia dashboard');
    // Note: Algolia v5 has a different synonym API that's more complex
    // For now, configure synonyms manually in the Algolia dashboard:
    // 1. Go to your Algolia dashboard
    // 2. Select the 'lessons' index
    // 3. Go to Synonyms tab
    // 4. Add these synonyms:
    //    - woman ↔ women ↔ women's
    //    - vegetable ↔ vegetables ↔ veggie ↔ veggies
    //    - 3 ↔ 3rd ↔ third ↔ grade 3
    //    - asian → chinese, japanese, korean, vietnamese, thai (one-way)
    //    - hispanic → latino, latina, mexican, spanish (one-way)
    
    console.log('✅ Successfully synced all lessons to Algolia!');
    console.log(`📊 Total records indexed: ${algoliaRecords.length}`);
    
  } catch (error) {
    console.error('❌ Sync failed:', error);
    process.exit(1);
  }
}

// Run the sync
syncLessonsToAlgolia();