#!/usr/bin/env node

/**
 * Check and fix the partially extracted lessons
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

async function checkPartialExtractions() {
  console.log('🔍 Checking Partially Extracted Lessons\n');
  console.log('=' .repeat(60));

  try {
    // Get all partial extractions
    const { data: allLessons } = await supabase
      .from('lessons')
      .select('*')
      .gte('created_at', '2025-08-07T00:00:00')
      .lt('created_at', '2025-08-08T00:00:00');
    
    // Filter for partial content
    const partialLessons = allLessons.filter(l => 
      l.content_text && l.content_text.length >= 1000 && l.content_text.length <= 2000
    );
    
    console.log(`Found ${partialLessons.length} partially extracted lessons\n`);
    
    // Categorize them
    const jsLessons = [];
    const templateLessons = [];
    const summaryOnlyLessons = [];
    const possiblyCompleteLessons = [];
    
    for (const lesson of partialLessons) {
      const content = lesson.content_text;
      
      if (content.includes('_init([[') || content.includes('export _init')) {
        jsLessons.push(lesson);
      } else if (content.includes('[DO NOT TYPE ON THIS: MAKE A COPY!!!!]')) {
        templateLessons.push(lesson);
      } else if (content.includes('Summary:') && content.includes('Objectives:') && 
                 !content.includes('Materials:') && !content.includes('Procedure:')) {
        summaryOnlyLessons.push(lesson);
      } else {
        possiblyCompleteLessons.push(lesson);
      }
    }
    
    console.log('📊 CATEGORIZATION:');
    console.log(`  JavaScript garbage: ${jsLessons.length}`);
    console.log(`  Empty templates: ${templateLessons.length}`);
    console.log(`  Summary only: ${summaryOnlyLessons.length}`);
    console.log(`  Possibly complete: ${possiblyCompleteLessons.length}\n`);
    
    // Fix JavaScript lessons
    if (jsLessons.length > 0) {
      console.log('🔧 Fixing JavaScript content...\n');
      
      for (const lesson of jsLessons) {
        console.log(`Fixing: ${lesson.title}`);
        
        const docIdMatch = lesson.file_link?.match(/\/d\/([a-zA-Z0-9-_]+)/);
        if (docIdMatch) {
          const docId = docIdMatch[1];
          
          try {
            // Try export URL
            const response = await fetch(
              `https://docs.google.com/document/d/${docId}/export?format=txt`,
              { headers: { 'User-Agent': 'Mozilla/5.0' } }
            );
            
            if (response.ok) {
              const text = await response.text();
              if (text && !text.includes('_init') && text.length > 500) {
                await supabase
                  .from('lessons')
                  .update({ 
                    content_text: text,
                    updated_at: new Date().toISOString()
                  })
                  .eq('lesson_id', lesson.lesson_id);
                
                console.log(`  ✅ Fixed: ${text.length} chars`);
              } else {
                console.log(`  ❌ Export failed or returned invalid content`);
              }
            } else {
              console.log(`  ❌ HTTP ${response.status}`);
            }
          } catch (err) {
            console.log(`  ❌ Error: ${err.message}`);
          }
        }
        
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      console.log();
    }
    
    // Check if summaries are actually complete
    console.log('📋 Checking content completeness...\n');
    
    for (const lesson of summaryOnlyLessons.slice(0, 3)) {
      console.log(`${lesson.title}:`);
      console.log(`  Length: ${lesson.content_text.length} chars`);
      
      // Check what sections are present
      const sections = [];
      if (lesson.content_text.includes('Summary:')) sections.push('Summary');
      if (lesson.content_text.includes('Objectives:')) sections.push('Objectives');
      if (lesson.content_text.includes('Materials:')) sections.push('Materials');
      if (lesson.content_text.includes('Procedure:')) sections.push('Procedure');
      if (lesson.content_text.includes('Prep:')) sections.push('Prep');
      if (lesson.content_text.includes('Agenda:')) sections.push('Agenda');
      
      console.log(`  Sections: ${sections.join(', ')}`);
      
      // Try to get more content
      const docIdMatch = lesson.file_link?.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (docIdMatch) {
        const docId = docIdMatch[1];
        
        try {
          const response = await fetch(
            `https://docs.google.com/document/d/${docId}/export?format=txt`,
            { headers: { 'User-Agent': 'Mozilla/5.0' } }
          );
          
          if (response.ok) {
            const fullText = await response.text();
            if (fullText.length > lesson.content_text.length + 100) {
              console.log(`  🔍 Found longer version: ${fullText.length} chars (${fullText.length - lesson.content_text.length} more)`);
              
              // Check if it has more sections
              const newSections = [];
              if (fullText.includes('Materials:')) newSections.push('Materials');
              if (fullText.includes('Procedure:')) newSections.push('Procedure');
              if (fullText.includes('Prep:')) newSections.push('Prep');
              console.log(`     New sections: ${newSections.join(', ')}`);
            } else {
              console.log(`  ✅ Current extraction appears complete`);
            }
          }
        } catch (err) {
          console.log(`  ⚠️  Could not verify: ${err.message}`);
        }
      }
      
      console.log();
    }
    
    // Sample a possibly complete lesson
    if (possiblyCompleteLessons.length > 0) {
      console.log('\n📄 Sample of possibly complete short lesson:\n');
      const sample = possiblyCompleteLessons[0];
      console.log(`Title: ${sample.title}`);
      console.log(`Length: ${sample.content_text.length} chars`);
      console.log(`\nContent preview:\n${sample.content_text.substring(0, 500)}...`);
      console.log(`\n...${sample.content_text.substring(sample.content_text.length - 300)}`);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkPartialExtractions().catch(console.error);