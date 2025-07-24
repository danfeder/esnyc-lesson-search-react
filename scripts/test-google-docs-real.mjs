#!/usr/bin/env node

/**
 * Test Google Docs API with real credentials
 */

import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🧪 Testing Google Docs API with Real Credentials\n');

console.log('Service Account Email: esnyc-docs-reader@dbproject1-431601.iam.gserviceaccount.com\n');

async function testRealGoogleDoc(url) {
  console.log(`📄 Testing: ${url}`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/extract-google-doc`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        googleDocUrl: url
      })
    });

    const result = await response.json();

    if (result.success) {
      console.log('✅ Extraction successful!');
      console.log(`\nDocument Details:`);
      console.log(`- Title: ${result.data.title}`);
      console.log(`- Word count: ${result.data.metadata.wordCount}`);
      console.log(`- Method: ${result.data.metadata.extractionMethod}`);
      
      if (result.data.metadata.extractionMethod === 'google-api') {
        console.log('🎉 Successfully using Google Docs API!');
        
        // Show extracted metadata
        if (result.data.metadata.gradeLevels) {
          console.log(`- Grade levels: ${result.data.metadata.gradeLevels.join(', ')}`);
        }
        if (result.data.metadata.theme) {
          console.log(`- Theme: ${result.data.metadata.theme}`);
        }
        if (result.data.metadata.skills) {
          console.log(`- Skills: ${result.data.metadata.skills.join(', ')}`);
        }
      }

      // Show content preview
      console.log('\nContent Preview:');
      console.log('-'.repeat(50));
      console.log(result.data.content.substring(0, 300) + '...');
      console.log('-'.repeat(50));
    } else {
      console.log('❌ Extraction failed:', result.error);
      
      if (result.error?.includes('not accessible')) {
        console.log('\n⚠️  Please share the document with:');
        console.log('   esnyc-docs-reader@dbproject1-431601.iam.gserviceaccount.com');
      }
    }
  } catch (error) {
    console.log('❌ Request error:', error.message);
  }
}

// Test with a public Google Doc first
console.log('1️⃣ Testing with public document...\n');
await testRealGoogleDoc('https://docs.google.com/document/d/1kYq3UYx2mXimI2YyDAZH6dcPVnVWGMBI6YYJmOwNFis/edit');

console.log('\n' + '='.repeat(60) + '\n');

// Prompt for user's document
console.log('2️⃣ To test with your own document:');
console.log('   1. Share your Google Doc with: esnyc-docs-reader@dbproject1-431601.iam.gserviceaccount.com');
console.log('   2. Run: node scripts/test-google-docs-real.mjs <your-doc-url>');

// Test with command line argument if provided
if (process.argv[2]) {
  console.log('\n3️⃣ Testing with your document...\n');
  await testRealGoogleDoc(process.argv[2]);
}