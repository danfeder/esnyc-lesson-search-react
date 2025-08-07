#!/usr/bin/env node

/**
 * Final fix for partially extracted lessons
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

async function finalFix() {
  console.log('🔧 Final Fix for Partial Extractions\n');
  console.log('=' .repeat(60));

  try {
    // 1. Fix the 4 with JavaScript content
    const jsLessons = [
      { id: '1zWWtG2dHMTzPCuwZQkHmCk6mJ4sKFcmW', title: 'Introduction to Pollination', type: 'file' },
      { id: '1qwnlNUIZnVwYAO2D9ue3Du_nlmZUAkmO', title: 'Food Memories', type: 'file' },
      { id: '1n8wS0X-dXAw9sfQuLFgsMg_kNvACph3cT4yd9p2i1eg', title: "Who's Who in the Food System", type: 'doc' },
      { id: '1GT1SrywshxtU_QLTWKoUKv-fFi7rxPyK', title: 'Stone Soup', type: 'file' }
    ];
    
    console.log('📋 Fixing JavaScript content in 4 lessons:\n');
    
    for (const lesson of jsLessons) {
      console.log(`${lesson.title} (${lesson.type}):`);
      
      // Get current data
      const { data: current } = await supabase
        .from('lessons')
        .select('*')
        .eq('lesson_id', lesson.id)
        .single();
      
      if (!current) continue;
      
      // Since these are likely PDFs or inaccessible, create better placeholder content
      const placeholderContent = [
        current.title || 'Untitled Lesson',
        '',
        current.summary || '[Summary not available]',
        '',
        'Grade Levels: ' + (current.grade_levels?.join(', ') || 'Not specified'),
        '',
        'Objectives:',
        current.objectives || '[Objectives not available]',
        '',
        'Themes: ' + (current.metadata?.themes?.join(', ') || 'Not specified'),
        'Season: ' + (current.metadata?.season || 'Not specified'),
        'Location: ' + (current.metadata?.location || 'Not specified'),
        '',
        'Note: This lesson content could not be fully extracted.',
        lesson.type === 'file' ? 'The source appears to be a PDF or other non-Google Doc format.' : '',
        'Please refer to the original document for complete details.'
      ].filter(line => line !== '').join('\n');
      
      const { error } = await supabase
        .from('lessons')
        .update({ 
          content_text: placeholderContent,
          updated_at: new Date().toISOString()
        })
        .eq('lesson_id', lesson.id);
      
      if (!error) {
        console.log(`  ✅ Replaced JS with structured placeholder (${placeholderContent.length} chars)`);
      } else {
        console.log(`  ❌ Update failed: ${error.message}`);
      }
    }
    
    // 2. Check if the 8 "possibly complete" lessons are actually complete
    console.log('\n📊 Analyzing possibly complete short lessons:\n');
    
    const { data: shortLessons } = await supabase
      .from('lessons')
      .select('*')
      .gte('created_at', '2025-08-07T00:00:00')
      .lt('created_at', '2025-08-08T00:00:00')
      .gte('content_text', 1000)
      .lte('content_text', 2000)
      .not('content_text', 'like', '%_init%')
      .not('content_text', 'like', '%MAKE A COPY%')
      .order('content_text');
    
    console.log(`Found ${shortLessons.length} short lessons without JS/template issues\n`);
    
    // Analyze content structure
    for (const lesson of shortLessons) {
      const content = lesson.content_text;
      const sections = [];
      
      // Check for key sections
      if (content.includes('Summary:') || content.match(/summary/i)) sections.push('Summary');
      if (content.includes('Objectives:') || content.match(/objectives?/i)) sections.push('Objectives');
      if (content.includes('Grade') || content.includes('grade')) sections.push('Grades');
      if (content.includes('Materials:') || content.match(/materials?/i)) sections.push('Materials');
      if (content.includes('Procedure:') || content.match(/procedures?/i)) sections.push('Procedure');
      if (content.includes('Ingredients:') || content.match(/ingredients?/i)) sections.push('Ingredients');
      if (content.includes('Instructions:') || content.match(/instructions?/i)) sections.push('Instructions');
      if (content.includes('Prep:') || content.match(/prep/i)) sections.push('Prep');
      if (content.includes('Notes:') || content.match(/notes?/i)) sections.push('Notes');
      
      console.log(`${lesson.title} (${content.length} chars):`);
      console.log(`  Sections found: ${sections.join(', ')}`);
      
      // Determine if it seems complete
      if (sections.length >= 4) {
        console.log(`  ✅ Appears complete (has ${sections.length} sections)`);
      } else {
        console.log(`  ⚠️  May be incomplete (only ${sections.length} sections)`);
        
        // Try one more extraction attempt
        const docIdMatch = lesson.file_link?.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (docIdMatch) {
          try {
            const response = await fetch(
              `https://docs.google.com/document/d/${docIdMatch[1]}/export?format=txt`
            );
            if (response.ok) {
              const fullText = await response.text();
              if (fullText.length > content.length + 500) {
                console.log(`     🔍 Fuller version available: ${fullText.length} chars`);
                
                await supabase
                  .from('lessons')
                  .update({ 
                    content_text: fullText,
                    updated_at: new Date().toISOString()
                  })
                  .eq('lesson_id', lesson.lesson_id);
                
                console.log(`     ✅ Updated with fuller content`);
              }
            }
          } catch (err) {
            // Skip
          }
        }
      }
    }
    
    // 3. Final summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL STATUS CHECK:\n');
    
    const { data: finalStatus } = await supabase
      .from('lessons')
      .select('lesson_id')
      .gte('created_at', '2025-08-07T00:00:00')
      .lt('created_at', '2025-08-08T00:00:00');
    
    const lengths = await Promise.all(
      finalStatus.map(async (l) => {
        const { data } = await supabase
          .from('lessons')
          .select('content_text')
          .eq('lesson_id', l.lesson_id)
          .single();
        return data?.content_text?.length || 0;
      })
    );
    
    const stats = {
      total: lengths.length,
      full: lengths.filter(l => l > 2000).length,
      partial: lengths.filter(l => l >= 1000 && l <= 2000).length,
      minimal: lengths.filter(l => l < 1000).length,
      hasJS: 0
    };
    
    // Check for any remaining JS
    const { data: jsCheck } = await supabase
      .from('lessons')
      .select('lesson_id')
      .gte('created_at', '2025-08-07T00:00:00')
      .lt('created_at', '2025-08-08T00:00:00')
      .like('content_text', '%_init%');
    
    stats.hasJS = jsCheck?.length || 0;
    
    console.log(`Total: ${stats.total} lessons`);
    console.log(`  ✅ Full extraction (>2000): ${stats.full} (${Math.round(stats.full/stats.total*100)}%)`);
    console.log(`  🔶 Partial (1000-2000): ${stats.partial} (${Math.round(stats.partial/stats.total*100)}%)`);
    console.log(`  ❌ Minimal (<1000): ${stats.minimal} (${Math.round(stats.minimal/stats.total*100)}%)`);
    console.log(`  🐛 JavaScript garbage: ${stats.hasJS}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

finalFix().catch(console.error);