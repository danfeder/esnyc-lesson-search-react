#!/usr/bin/env node

// Test Edge Functions for Lesson Submission Pipeline
// Usage: node scripts/test-edge-functions.mjs

import dotenv from 'dotenv';
dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('❌ Missing environment variables. Please check your .env file.');
  process.exit(1);
}

// Test Google Docs extraction
async function testExtractGoogleDoc() {
  console.log('\n📄 Testing Google Docs Extraction...');
  
  const testUrls = [
    'https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
    'https://docs.google.com/document/d/invalid-doc-id/edit'
  ];

  for (const url of testUrls) {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/extract-google-doc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify({ url })
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ Successfully extracted from: ${url}`);
        console.log(`   Title: ${data.title || 'N/A'}`);
        console.log(`   Content length: ${data.content?.length || 0} characters`);
      } else {
        console.log(`❌ Failed to extract from: ${url}`);
        console.log(`   Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`❌ Network error for ${url}:`, error.message);
    }
  }
}

// Test duplicate detection
async function testDetectDuplicates() {
  console.log('\n🔍 Testing Duplicate Detection...');
  
  const testContents = [
    {
      title: 'Pizza Making Workshop',
      content: 'Students will learn to make pizza from scratch, exploring fractions through measuring ingredients.',
      contentHash: 'test-hash-pizza-1'
    },
    {
      title: 'Garden Composting Basics',
      content: 'Learn how to create nutrient-rich compost for your school garden.',
      contentHash: 'test-hash-compost-1'
    }
  ];

  for (const test of testContents) {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/detect-duplicates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        },
        body: JSON.stringify(test)
      });

      const data = await response.json();
      
      if (response.ok) {
        console.log(`✅ Duplicate detection for: "${test.title}"`);
        console.log(`   Found ${data.similarities?.length || 0} potential duplicates`);
        if (data.similarities?.length > 0) {
          console.log('   Top matches:');
          data.similarities.slice(0, 3).forEach(sim => {
            console.log(`   - ${sim.lesson.title} (${Math.round(sim.combined_score * 100)}%)`);
          });
        }
      } else {
        console.log(`❌ Failed duplicate detection for: "${test.title}"`);
        console.log(`   Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`❌ Network error:`, error.message);
    }
  }
}

// Test full submission processing
async function testProcessSubmission() {
  console.log('\n🚀 Testing Full Submission Processing...');
  
  // Note: This requires authentication
  console.log('⚠️  Note: Full submission processing requires user authentication.');
  console.log('   Please test this through the web interface with a logged-in teacher account.');
  
  // You can add code here to test with a service account or test token if available
}

// Check Edge Function health
async function checkEdgeFunctionHealth() {
  console.log('\n💚 Checking Edge Function Health...');
  
  const functions = [
    'extract-google-doc',
    'detect-duplicates',
    'process-submission'
  ];

  for (const func of functions) {
    try {
      // Try OPTIONS request to check if function exists
      const response = await fetch(`${SUPABASE_URL}/functions/v1/${func}`, {
        method: 'OPTIONS',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      if (response.ok || response.status === 400) {
        console.log(`✅ ${func}: Deployed and responding`);
      } else {
        console.log(`❌ ${func}: Not responding (Status: ${response.status})`);
      }
    } catch (error) {
      console.log(`❌ ${func}: Network error - ${error.message}`);
    }
  }
}

// Run all tests
async function runAllTests() {
  console.log('🧪 Testing Lesson Submission Pipeline Edge Functions');
  console.log('='.repeat(50));
  
  await checkEdgeFunctionHealth();
  await testExtractGoogleDoc();
  await testDetectDuplicates();
  await testProcessSubmission();
  
  console.log('\n✨ Testing complete!');
  console.log('\nNext steps:');
  console.log('1. Create test user accounts (teacher@example.com, reviewer@example.com)');
  console.log('2. Run scripts/setup-test-users.sql in Supabase');
  console.log('3. Test the full workflow through the web interface');
}

// Run tests
runAllTests().catch(console.error);