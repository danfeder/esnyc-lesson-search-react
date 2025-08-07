#!/usr/bin/env node

/**
 * Fix incomplete content extraction for 53 lessons added on August 7th
 * These lessons only have metadata/summaries, not full content
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

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

/**
 * Extract Google Doc ID from various URL formats
 */
function extractDocId(url) {
  if (!url) return null;
  
  // Try different patterns
  const patterns = [
    /\/document\/d\/([a-zA-Z0-9-_]+)/,  // Google Docs
    /\/file\/d\/([a-zA-Z0-9-_]+)/,      // Google Drive files
    /^([a-zA-Z0-9-_]+)$/                // Just the ID
  ];
  
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  
  return null;
}

/**
 * Call the extract-google-doc edge function to get content
 */
async function extractGoogleDocContent(docUrl) {
  try {
    const response = await fetch(`${supabaseUrl}/functions/v1/extract-google-doc`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ googleDocUrl: docUrl })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Edge function error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    
    if (result.success && result.data?.content) {
      return result.data.content;
    } else {
      throw new Error(result.error || 'No content returned');
    }
  } catch (error) {
    console.error(`  ❌ Extraction failed: ${error.message}`);
    return null;
  }
}

/**
 * Generate mock content for lessons that can't be extracted
 * This is better than the "Error processing lesson" placeholder
 */
function generateMockContent(lesson) {
  const parts = [];
  
  parts.push(lesson.title || 'Untitled Lesson');
  parts.push('');
  
  if (lesson.summary) {
    parts.push(lesson.summary);
    parts.push('');
  }
  
  if (lesson.objectives) {
    parts.push('Objectives:');
    parts.push(lesson.objectives);
    parts.push('');
  }
  
  // Add metadata as content
  parts.push('Grade Levels: ' + (lesson.grade_levels?.join(', ') || 'Not specified'));
  
  if (lesson.metadata) {
    const meta = lesson.metadata;
    if (meta.themes) parts.push('Themes: ' + (Array.isArray(meta.themes) ? meta.themes.join(', ') : meta.themes));
    if (meta.season) parts.push('Season: ' + meta.season);
    if (meta.location) parts.push('Location: ' + meta.location);
    if (meta.skills) parts.push('Skills: ' + (Array.isArray(meta.skills) ? meta.skills.join(', ') : meta.skills));
    if (meta.ingredients) parts.push('Ingredients: ' + (Array.isArray(meta.ingredients) ? meta.ingredients.join(', ') : meta.ingredients));
  }
  
  parts.push('');
  parts.push('[Full content extraction pending - this is a placeholder based on available metadata]');
  
  return parts.join('\n');
}

async function fixIncompleteContent() {
  console.log('🔧 Fixing Incomplete Content Extraction\n');
  console.log('=' .repeat(60));

  try {
    // 1. Fetch lessons with incomplete content (added Aug 7)
    console.log('📋 Fetching lessons with incomplete content...');
    const { data: lessons, error: fetchError } = await supabase
      .from('lessons')
      .select('*')
      .gte('created_at', '2025-08-07T00:00:00')
      .lt('created_at', '2025-08-08T00:00:00')
      .order('lesson_id');
    
    if (fetchError) throw fetchError;
    
    console.log(`✅ Found ${lessons.length} lessons from August 7th\n`);

    // Categorize lessons
    const failedExtraction = lessons.filter(l => 
      l.title === 'Unknown' || l.content_text?.includes('Error processing lesson')
    );
    const shortContent = lessons.filter(l => 
      l.title !== 'Unknown' && !l.content_text?.includes('Error processing lesson')
    );

    console.log(`📊 Breakdown:`);
    console.log(`  - Failed extraction (Unknown): ${failedExtraction.length}`);
    console.log(`  - Short/incomplete content: ${shortContent.length}`);
    console.log(`  - Average content length: ${Math.round(lessons.reduce((sum, l) => sum + (l.content_text?.length || 0), 0) / lessons.length)} chars\n`);

    // 2. Process each lesson
    console.log('🔄 Extracting full content from Google Docs...\n');
    
    let successCount = 0;
    let failCount = 0;
    let skipCount = 0;
    const results = [];

    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i];
      const docId = extractDocId(lesson.file_link);
      
      console.log(`[${i + 1}/${lessons.length}] Processing: ${lesson.title || 'Unknown'}`);
      console.log(`  Doc ID: ${docId}`);
      console.log(`  Current content: ${lesson.content_text?.length || 0} chars`);
      
      if (!docId) {
        console.log(`  ⚠️  Could not extract doc ID from: ${lesson.file_link}`);
        failCount++;
        results.push({ lesson_id: lesson.lesson_id, status: 'failed', reason: 'invalid_url' });
        continue;
      }

      // Check if it's a Google Doc (not a Drive file)
      const isGoogleDoc = lesson.file_link.includes('/document/d/');
      
      if (!isGoogleDoc) {
        console.log(`  ⚠️  Not a Google Doc (might be PDF/other): ${lesson.file_link}`);
        
        // Generate better placeholder content
        const mockContent = generateMockContent(lesson);
        
        const { error: updateError } = await supabase
          .from('lessons')
          .update({ 
            content_text: mockContent,
            updated_at: new Date().toISOString()
          })
          .eq('lesson_id', lesson.lesson_id);
        
        if (updateError) {
          console.log(`  ❌ Failed to update: ${updateError.message}`);
          failCount++;
        } else {
          console.log(`  ✅ Updated with improved placeholder (${mockContent.length} chars)`);
          skipCount++;
        }
        
        results.push({ 
          lesson_id: lesson.lesson_id, 
          status: 'placeholder', 
          reason: 'not_google_doc',
          new_length: mockContent.length 
        });
        continue;
      }

      // Try to extract content
      console.log(`  🔄 Calling extract-google-doc edge function...`);
      const extractedContent = await extractGoogleDocContent(lesson.file_link);
      
      if (extractedContent && extractedContent.length > 1000) {
        // Update the lesson with extracted content
        const { error: updateError } = await supabase
          .from('lessons')
          .update({ 
            content_text: extractedContent,
            updated_at: new Date().toISOString()
          })
          .eq('lesson_id', lesson.lesson_id);
        
        if (updateError) {
          console.log(`  ❌ Failed to update: ${updateError.message}`);
          failCount++;
          results.push({ lesson_id: lesson.lesson_id, status: 'update_failed', error: updateError.message });
        } else {
          console.log(`  ✅ Successfully extracted: ${extractedContent.length} chars`);
          successCount++;
          results.push({ 
            lesson_id: lesson.lesson_id, 
            status: 'success', 
            old_length: lesson.content_text?.length || 0,
            new_length: extractedContent.length 
          });
        }
      } else {
        // Extraction failed or returned too little content
        console.log(`  ⚠️  Extraction failed or insufficient content`);
        
        // Generate better placeholder
        const mockContent = generateMockContent(lesson);
        
        const { error: updateError } = await supabase
          .from('lessons')
          .update({ 
            content_text: mockContent,
            updated_at: new Date().toISOString()
          })
          .eq('lesson_id', lesson.lesson_id);
        
        if (!updateError) {
          console.log(`  ✅ Updated with improved placeholder`);
        }
        
        failCount++;
        results.push({ 
          lesson_id: lesson.lesson_id, 
          status: 'extraction_failed', 
          new_length: mockContent.length 
        });
      }
      
      // Add a small delay to avoid rate limiting
      if (i < lessons.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // 3. Generate report
    console.log('\n' + '='.repeat(60));
    console.log('📋 CONTENT EXTRACTION COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n📊 Results:`);
    console.log(`  ✅ Successfully extracted: ${successCount}`);
    console.log(`  ⚠️  Placeholders added: ${skipCount}`);
    console.log(`  ❌ Failed: ${failCount}`);
    
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: lessons.length,
        success: successCount,
        placeholders: skipCount,
        failed: failCount
      },
      results: results
    };
    
    const reportPath = join(
      __dirname, 
      '..', 
      'reports', 
      `content-extraction-${new Date().toISOString().split('T')[0]}.json`
    );
    await fs.mkdir(join(__dirname, '..', 'reports'), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    // 4. Re-generate hashes for updated content
    if (successCount > 0) {
      console.log('\n🔄 Re-generating content hashes for updated lessons...');
      
      // Import the hash generation function
      const crypto = await import('crypto');
      
      for (const result of results.filter(r => r.status === 'success')) {
        const { data: lesson } = await supabase
          .from('lessons')
          .select('content_text')
          .eq('lesson_id', result.lesson_id)
          .single();
        
        if (lesson?.content_text) {
          const normalizedContent = lesson.content_text
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
          
          const hash = crypto.default.createHash('sha256')
            .update(normalizedContent)
            .digest('hex');
          
          await supabase
            .from('lessons')
            .update({ content_hash: hash })
            .eq('lesson_id', result.lesson_id);
        }
      }
      
      console.log('✅ Content hashes updated');
    }
    
    console.log('\n✨ Done! Content extraction and hash generation complete.');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the fix
fixIncompleteContent().catch(console.error);