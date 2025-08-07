#!/usr/bin/env node

/**
 * Final attempt to extract content from stubborn Google Docs
 * Uses Google Docs viewer and other alternative methods
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

async function extractViaViewer(docId) {
  try {
    // Try Google Docs viewer URL (sometimes works when export doesn't)
    const viewerUrl = `https://docs.google.com/viewer?url=https://docs.google.com/document/d/${docId}/export?format=txt&embedded=true`;
    
    const response = await fetch(viewerUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (response.ok) {
      const text = await response.text();
      // Extract text from viewer response
      const cleanText = text
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (cleanText.length > 1000) {
        return cleanText;
      }
    }
  } catch (err) {
    // Continue to next method
  }
  
  // Try mobile version
  try {
    const mobileUrl = `https://docs.google.com/document/d/${docId}/mobilebasic`;
    const response = await fetch(mobileUrl);
    
    if (response.ok) {
      const html = await response.text();
      const text = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (text.length > 1000) {
        return text;
      }
    }
  } catch (err) {
    // Continue
  }
  
  return null;
}

async function finalExtraction() {
  console.log('🔧 Final Extraction Attempt for Stubborn Lessons\n');
  console.log('=' .repeat(60));

  try {
    // Get remaining problematic lessons
    const { data: allLessons } = await supabase
      .from('lessons')
      .select('*')
      .gte('created_at', '2025-08-07T00:00:00')
      .lt('created_at', '2025-08-08T00:00:00');
    
    const problematic = allLessons.filter(l => 
      l.content_text && l.content_text.length < 1000 && l.title !== 'Unknown'
    );
    
    console.log(`Found ${problematic.length} lessons to retry\n`);
    
    let improved = 0;
    
    for (let i = 0; i < problematic.length; i++) {
      const lesson = problematic[i];
      console.log(`[${i + 1}] Testing: ${lesson.title}`);
      console.log(`  Current: ${lesson.content_text?.length} chars`);
      
      const docIdMatch = lesson.file_link?.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (docIdMatch) {
        const docId = docIdMatch[1];
        const extracted = await extractViaViewer(docId);
        
        if (extracted && extracted.length > lesson.content_text?.length) {
          console.log(`  ✅ Improved: ${extracted.length} chars`);
          
          // Update in database
          await supabase
            .from('lessons')
            .update({ 
              content_text: extracted,
              updated_at: new Date().toISOString()
            })
            .eq('lesson_id', lesson.lesson_id);
          
          improved++;
        } else {
          console.log(`  ❌ No improvement`);
        }
      }
      
      // Small delay to avoid rate limiting
      if (i < problematic.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    console.log(`\n✅ Improved ${improved} lessons`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

finalExtraction().catch(console.error);