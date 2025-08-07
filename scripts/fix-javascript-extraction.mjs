#!/usr/bin/env node

/**
 * Fix lessons that got JavaScript code instead of actual content
 * This happened when using the Google Docs viewer method incorrectly
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function fixJavaScriptContent() {
  console.log('🔧 Fixing JavaScript Extraction Issues\n');
  console.log('=' .repeat(60));

  try {
    // Find all lessons with JavaScript content
    console.log('📋 Finding lessons with JavaScript content...');
    const { data: affectedLessons, error } = await supabase
      .from('lessons')
      .select('*')
      .or('content_text.like.export _init%,content_text.like.%"https://drive.google.com"%,content_text.like.%"https://accounts.google.com%');
    
    if (error) throw error;
    
    console.log(`Found ${affectedLessons.length} lessons with JavaScript content\n`);
    
    // For each affected lesson, we need to restore or re-extract properly
    let fixed = 0;
    let failed = 0;
    
    for (let i = 0; i < affectedLessons.length; i++) {
      const lesson = affectedLessons[i];
      console.log(`[${i + 1}/${affectedLessons.length}] ${lesson.title}`);
      console.log(`  Current: ${lesson.content_text.substring(0, 50)}...`);
      
      // Extract doc ID
      const docIdMatch = lesson.file_link?.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (!docIdMatch) {
        console.log(`  ❌ Could not extract doc ID`);
        failed++;
        continue;
      }
      
      const docId = docIdMatch[1];
      
      // Try direct export URL (most reliable for Google Docs)
      try {
        const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;
        const response = await fetch(exportUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; LessonExtractor/1.0)'
          }
        });
        
        if (response.ok) {
          const text = await response.text();
          
          // Validate it's not JavaScript
          if (text && !text.includes('export _init') && text.length > 500) {
            // Update the lesson
            const { error: updateError } = await supabase
              .from('lessons')
              .update({ 
                content_text: text,
                updated_at: new Date().toISOString()
              })
              .eq('lesson_id', lesson.lesson_id);
            
            if (!updateError) {
              console.log(`  ✅ Fixed: ${text.length} chars of real content`);
              fixed++;
            } else {
              console.log(`  ❌ Update failed: ${updateError.message}`);
              failed++;
            }
          } else {
            console.log(`  ⚠️  Export returned invalid content`);
            
            // Fallback: revert to summary if it's better than JavaScript
            if (lesson.summary && lesson.summary.length > 100) {
              const fallbackContent = [
                lesson.title || 'Untitled',
                '',
                lesson.summary || '',
                '',
                'Grade Levels: ' + (lesson.grade_levels?.join(', ') || 'Not specified'),
                '',
                '[Full content extraction pending]'
              ].join('\n');
              
              const { error: updateError } = await supabase
                .from('lessons')
                .update({ 
                  content_text: fallbackContent,
                  updated_at: new Date().toISOString()
                })
                .eq('lesson_id', lesson.lesson_id);
              
              if (!updateError) {
                console.log(`  🔶 Reverted to summary (${fallbackContent.length} chars)`);
                fixed++;
              }
            } else {
              failed++;
            }
          }
        } else {
          console.log(`  ❌ Export failed: ${response.status}`);
          failed++;
        }
      } catch (err) {
        console.log(`  ❌ Error: ${err.message}`);
        failed++;
      }
      
      // Small delay
      if (i < affectedLessons.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('📊 RESULTS:');
    console.log(`  ✅ Fixed: ${fixed} lessons`);
    console.log(`  ❌ Failed: ${failed} lessons`);
    
    // Verify no more JavaScript content
    const { data: remaining } = await supabase
      .from('lessons')
      .select('lesson_id')
      .like('content_text', 'export _init%');
    
    if (remaining && remaining.length > 0) {
      console.log(`\n⚠️  Still ${remaining.length} lessons with JavaScript content`);
    } else {
      console.log('\n✅ All JavaScript content has been removed!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

fixJavaScriptContent().catch(console.error);