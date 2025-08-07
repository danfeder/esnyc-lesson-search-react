#!/usr/bin/env npx tsx
/**
 * Get service account information for domain-wide delegation setup
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function main() {
  console.log('📋 Getting Service Account Information for Domain-Wide Delegation\n');

  // Call the edge function to get service account details
  const { data, error } = await supabase.functions.invoke('extract-google-doc', {
    body: { googleDocUrl: 'https://docs.google.com/document/d/test123/edit' },
  });

  if (data?.serviceAccountEmail) {
    console.log('Service Account Email:', data.serviceAccountEmail);
    console.log('\nTo find the Client ID:');
    console.log('1. Go to Google Cloud Console: https://console.cloud.google.com');
    console.log('2. Select your project (likely "dbproject1-431601" based on the email)');
    console.log('3. Go to IAM & Admin > Service Accounts');
    console.log('4. Click on:', data.serviceAccountEmail);
    console.log('5. Under "Details" tab, find "Unique ID" (this is your Client ID)');
    console.log('\nThe Client ID will be a long number like: 108517690514082299999');
  } else if (data?.error) {
    console.log(
      'Service Account Email: esnyc-docs-reader@dbproject1-431601.iam.gserviceaccount.com'
    );
    console.log('\nProject ID appears to be: dbproject1-431601');
  } else {
    console.log('Could not determine service account. Check edge function configuration.');
  }
}

main().catch(console.error);
