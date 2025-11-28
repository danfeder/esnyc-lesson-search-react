#!/usr/bin/env npx tsx
/**
 * Re-extract content for submissions that got mock data
 * Now that domain-wide delegation is working
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function main() {
  console.log('🔧 Fixing Lesson Submissions with Mock Data');
  console.log('==========================================\n');

  try {
    // Find submissions that likely have mock data
    // First get all submissions
    const { data: allSubmissions, error: fetchError } = await supabase
      .from('lesson_submissions')
      .select('id, google_doc_url, google_doc_id, extracted_content')
      .order('created_at', { ascending: false });

    if (fetchError) throw fetchError;

    // Filter for mock data (701 or 961 bytes, or specific content patterns)
    const mockSubmissions =
      allSubmissions?.filter((sub) => {
        const length = sub.extracted_content?.length || 0;
        const content = sub.extracted_content || '';

        // Check for known mock data patterns
        return (
          length === 701 ||
          length === 961 ||
          length === 39 ||
          content.startsWith('Grade Levels: 3, 4, 5\nTheme: Plant Growth') ||
          content.startsWith('Grade Levels: 5, 6, 7\nTheme: Plants as Medicine') ||
          content === 'Test Lesson: Pizza Making in the Garden'
        );
      }) || [];

    if (fetchError) throw fetchError;

    console.log(`Found ${mockSubmissions?.length || 0} submissions with mock data\n`);

    if (!mockSubmissions || mockSubmissions.length === 0) {
      console.log('✅ No submissions with mock data found!');
      return;
    }

    let fixed = 0;
    let failed = 0;

    for (const submission of mockSubmissions) {
      console.log(`Processing: ${submission.google_doc_id}`);

      try {
        // Call edge function to extract real content
        const { data: extractData, error: extractError } = await supabase.functions.invoke(
          'extract-google-doc',
          {
            body: { googleDocUrl: submission.google_doc_url },
          }
        );

        // Check if we got data even if there's an "error" (sometimes it's just a warning)
        if (!extractData?.data?.content) {
          console.error(
            `  ❌ Failed to extract: ${extractError?.message || extractData?.error || 'No content returned'}`
          );
          failed++;
          continue;
        }

        // Update the submission with real content
        const { error: updateError } = await supabase
          .from('lesson_submissions')
          .update({
            extracted_content: extractData.data.content,
            updated_at: new Date().toISOString(),
          })
          .eq('id', submission.id);

        if (updateError) {
          console.error(`  ❌ Failed to update: ${updateError.message}`);
          failed++;
        } else {
          console.log(`  ✅ Fixed! Title: "${extractData.data.title}"`);
          console.log(`     Content length: ${extractData.data.content.length} bytes`);
          fixed++;
        }
      } catch (err) {
        console.error(`  ❌ Error: ${err}`);
        failed++;
      }

      // Small delay to avoid rate limiting
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Summary:');
    console.log('='.repeat(50));
    console.log(`Total Processed: ${mockSubmissions.length}`);
    console.log(`Successfully Fixed: ${fixed}`);
    console.log(`Failed: ${failed}`);

    if (fixed > 0) {
      console.log('\n✅ Mock data has been replaced with real content!');
      console.log('   Submissions now have actual Google Docs content.');
    }
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

main().catch(console.error);
