#!/usr/bin/env node

import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

async function testDetectDuplicates() {
  console.log('Testing detect-duplicates function...\n');
  console.log('URL:', `${SUPABASE_URL}/functions/v1/detect-duplicates`);
  
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/detect-duplicates`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${ANON_KEY}`
      },
      body: JSON.stringify({
        submissionId: 'test-123',
        content: 'This lesson teaches students about medicinal properties of herbs including mint, chamomile, and lavender. Students will learn traditional healing practices.',
        title: 'Herbs as Medicine Workshop',
        metadata: { 
          gradeLevels: ['3', '4', '5'],
          skills: ['Garden', 'Herbs', 'Medicine', 'Plant Identification']
        }
      })
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const text = await response.text();
    console.log('Response body:', text);
    
    if (text) {
      try {
        const json = JSON.parse(text);
        console.log('\nParsed response:', JSON.stringify(json, null, 2));
      } catch (e) {
        console.log('Could not parse as JSON');
      }
    }
  } catch (error) {
    console.error('Request error:', error);
  }
}

testDetectDuplicates();