import 'dotenv/config';
import { algoliasearch } from 'algoliasearch';
import fs from 'fs/promises';

// Check for required environment variables
const requiredEnvVars = [
  'VITE_ALGOLIA_APP_ID',
  'ALGOLIA_ADMIN_API_KEY',
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`❌ Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Initialize Algolia client with admin key
const algoliaClient = algoliasearch(
  process.env.VITE_ALGOLIA_APP_ID,
  process.env.ALGOLIA_ADMIN_API_KEY
);

async function configureSynonyms() {
  try {
    console.log('🔄 Reading synonyms from file...');
    
    // Read the synonyms file
    const synonymsData = await fs.readFile('algolia-synonyms.json', 'utf-8');
    const synonyms = JSON.parse(synonymsData);
    
    console.log(`📋 Found ${synonyms.length} synonym rules`);
    
    // Clear existing synonyms
    console.log('🧹 Clearing existing synonyms...');
    await algoliaClient.clearSynonyms({
      indexName: 'lessons',
      forwardToReplicas: true,
    });
    
    // Add synonyms one by one (v5 API requires individual saves)
    console.log('📤 Uploading synonyms to Algolia...');
    
    // Add objectIDs if missing
    const synonymsWithIds = synonyms.map((synonym, index) => ({
      ...synonym,
      objectID: synonym.objectID || `synonym-${index}`,
    }));
    
    let uploadedCount = 0;
    for (const synonym of synonymsWithIds) {
      try {
        await algoliaClient.saveSynonym({
          indexName: 'lessons',
          synonymHit: synonym,
          forwardToReplicas: true,
        });
        uploadedCount++;
        if (uploadedCount % 10 === 0) {
          console.log(`📦 Uploaded ${uploadedCount}/${synonymsWithIds.length} synonyms...`);
        }
      } catch (err) {
        console.error(`⚠️  Failed to upload synonym ${synonym.objectID}:`, err.message);
      }
    }
    
    console.log(`📦 Uploaded ${uploadedCount}/${synonymsWithIds.length} synonyms total`);
    
    // Verify index settings
    console.log('🔧 Verifying index settings...');
    const settings = await algoliaClient.getSettings({
      indexName: 'lessons',
    });
    
    console.log('✅ Index settings:');
    console.log('  - Typo tolerance:', settings.typoTolerance);
    console.log('  - Min word size for 1 typo:', settings.minWordSizefor1Typo);
    console.log('  - Min word size for 2 typos:', settings.minWordSizefor2Typos);
    
    // Get synonym count
    const synonymStats = await algoliaClient.searchSynonyms({
      indexName: 'lessons',
      query: '',
      hitsPerPage: 1,
    });
    
    console.log(`✅ Successfully configured ${synonymStats.nbHits} synonyms!`);
    
    // Test a few searches
    console.log('\n🧪 Testing synonym searches...');
    
    const testSearches = [
      { query: 'woman', expected: 'Should find lessons with "women"' },
      { query: 'vegitable', expected: 'Should find lessons with "vegetable" (typo correction)' },
      { query: 'asian', expected: 'Should find Chinese, Japanese, Korean lessons' },
    ];
    
    for (const test of testSearches) {
      const results = await algoliaClient.searchSingleIndex({
        indexName: 'lessons',
        searchParams: {
          query: test.query,
          hitsPerPage: 3,
        },
      });
      
      console.log(`\n  Query: "${test.query}"`);
      console.log(`  Expected: ${test.expected}`);
      console.log(`  Found: ${results.nbHits} results`);
      if (results.hits.length > 0) {
        console.log(`  First result: "${results.hits[0].title}"`);
      }
    }
    
  } catch (error) {
    console.error('❌ Failed to configure synonyms:', error);
    process.exit(1);
  }
}

// Run the configuration
configureSynonyms();