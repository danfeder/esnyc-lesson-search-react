#!/usr/bin/env node

/**
 * Test Google Docs API integration
 * This script helps verify that the Google Docs API is working correctly
 */

import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

console.log('🧪 Google Docs API Test\n');

// Test cases
const testDocs = [
  {
    name: 'Public test document',
    url: 'https://docs.google.com/document/d/1kYq3UYx2mXimI2YyDAZH6dcPVnVWGMBI6YYJmOwNFis/edit',
    description: 'A public Google Doc for testing'
  },
  {
    name: 'Your own document',
    url: 'REPLACE_WITH_YOUR_DOC_URL',
    description: 'Your test document (must be shared with service account or public)'
  }
];

async function testGoogleDocsExtraction() {
  console.log('Testing Google Docs extraction...\n');

  // Check if credentials are set
  const hasCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || 
    await checkSupabaseSecrets();

  if (!hasCredentials) {
    console.log('⚠️  Google Service Account credentials not found');
    console.log('The function will use mock data instead of real Google Docs');
    console.log('\nTo enable real Google Docs extraction:');
    console.log('1. Follow the setup instructions in scripts/setup-google-docs-api.mjs');
    console.log('2. Add credentials with: npx supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON=\'...\'');
  }

  // Test each document
  for (const testDoc of testDocs) {
    if (testDoc.url === 'REPLACE_WITH_YOUR_DOC_URL') {
      console.log(`\n📄 Skipping: ${testDoc.name} (no URL provided)`);
      continue;
    }

    console.log(`\n📄 Testing: ${testDoc.name}`);
    console.log(`URL: ${testDoc.url}`);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/extract-google-doc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ANON_KEY}`
        },
        body: JSON.stringify({
          googleDocUrl: testDoc.url
        })
      });

      console.log('Response status:', response.status);
      
      const text = await response.text();
      let result;
      try {
        result = JSON.parse(text);
      } catch (e) {
        console.log('Response text:', text);
        throw new Error('Invalid JSON response');
      }

      if (result.success) {
        console.log('✅ Extraction successful!');
        console.log(`Title: ${result.data.title}`);
        console.log(`Word count: ${result.data.metadata.wordCount}`);
        console.log(`Method: ${result.data.metadata.extractionMethod}`);
        
        if (result.data.metadata.extractionMethod === 'google-api') {
          console.log('🎉 Using real Google Docs API!');
          
          // Show extracted metadata if any
          if (result.data.metadata.gradeLevels) {
            console.log(`Grade levels: ${result.data.metadata.gradeLevels.join(', ')}`);
          }
          if (result.data.metadata.theme) {
            console.log(`Theme: ${result.data.metadata.theme}`);
          }
          if (result.data.metadata.skills) {
            console.log(`Skills: ${result.data.metadata.skills.join(', ')}`);
          }
        } else {
          console.log('📝 Using mock data (Google API not configured)');
        }

        // Show content preview
        console.log('\nContent preview:');
        console.log(result.data.content.substring(0, 200) + '...');
      } else {
        console.log('❌ Extraction failed:', result.error);
      }
    } catch (error) {
      console.log('❌ Request error:', error.message);
    }
  }

  // Instructions for setting up your own test
  console.log('\n' + '='.repeat(60));
  console.log('📝 To test with your own Google Doc:');
  console.log('='.repeat(60));
  console.log('1. Create a Google Doc with lesson content');
  console.log('2. Include these elements for metadata extraction:');
  console.log('   - Grade Levels: 3, 4, 5');
  console.log('   - Theme: Your theme here');
  console.log('   - Skills: Skill1, Skill2, Skill3');
  console.log('3. Share the document:');
  console.log('   Option A: Make it public (Anyone with link can view)');
  console.log('   Option B: Share with your service account email');
  console.log('4. Update the URL in this script and run again');

  // Check for common issues
  console.log('\n🔍 Troubleshooting:');
  console.log('- If you see "Document not accessible", share the doc with service account');
  console.log('- If using mock data, ensure credentials are properly set in Supabase');
  console.log('- Service account email format: NAME@PROJECT_ID.iam.gserviceaccount.com');
}

async function checkSupabaseSecrets() {
  // This would check if secrets are set in Supabase
  // For now, return false as we can't check remotely
  return false;
}

// Run the test
testGoogleDocsExtraction().catch(console.error);