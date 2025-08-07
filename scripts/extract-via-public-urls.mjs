#!/usr/bin/env node

/**
 * Alternative extraction method for problematic Google Docs
 * Uses public URL access instead of API
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
 * Extract content by making the doc public and fetching HTML
 */
async function extractViaPublicUrl(docId) {
  try {
    // Try different public URL formats
    const urls = [
      `https://docs.google.com/document/d/${docId}/export?format=txt`,
      `https://docs.google.com/document/d/${docId}/export?format=html`,
      `https://docs.google.com/document/d/e/${docId}/pub`,
      `https://drive.google.com/uc?export=download&id=${docId}`
    ];

    for (const url of urls) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; LessonExtractor/1.0)'
          },
          redirect: 'follow'
        });

        if (response.ok) {
          const contentType = response.headers.get('content-type');
          
          if (contentType?.includes('text/plain')) {
            const text = await response.text();
            if (text && text.length > 100) {
              console.log(`    ✅ Extracted via TXT export: ${text.length} chars`);
              return text;
            }
          } else if (contentType?.includes('text/html')) {
            const html = await response.text();
            // Basic HTML to text conversion
            const text = html
              .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
              .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
              .replace(/<[^>]+>/g, ' ')
              .replace(/&nbsp;/g, ' ')
              .replace(/&amp;/g, '&')
              .replace(/&lt;/g, '<')
              .replace(/&gt;/g, '>')
              .replace(/&quot;/g, '"')
              .replace(/&#39;/g, "'")
              .replace(/\s+/g, ' ')
              .trim();
            
            if (text && text.length > 100) {
              console.log(`    ✅ Extracted via HTML export: ${text.length} chars`);
              return text;
            }
          }
        }
      } catch (err) {
        // Try next URL
        continue;
      }
    }
    
    return null;
  } catch (error) {
    console.error(`    ❌ Public URL extraction failed: ${error.message}`);
    return null;
  }
}

/**
 * Try to extract content from Google Drive files (PDFs, etc)
 */
async function extractDriveFile(fileId) {
  try {
    // For Drive files, we need to check if they're viewable
    const viewUrl = `https://drive.google.com/file/d/${fileId}/view`;
    const response = await fetch(viewUrl);
    
    if (response.ok) {
      const html = await response.text();
      
      // Check if it's a Google Doc that's been shared as a file
      if (html.includes('application/vnd.google-apps.document')) {
        // It's actually a Google Doc, return null to try doc extraction
        return null;
      }
      
      // Extract any visible text from the preview
      const textMatch = html.match(/<div[^>]*class="[^"]*text[^"]*"[^>]*>(.*?)<\/div>/gi);
      if (textMatch) {
        const text = textMatch
          .map(div => div.replace(/<[^>]+>/g, '').trim())
          .filter(t => t.length > 0)
          .join('\n');
        
        if (text.length > 100) {
          console.log(`    ✅ Extracted from Drive preview: ${text.length} chars`);
          return text;
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error(`    ❌ Drive file extraction failed: ${error.message}`);
    return null;
  }
}

async function extractRemainingLessons() {
  console.log('🔧 Alternative Content Extraction for Remaining Lessons\n');
  console.log('=' .repeat(60));

  try {
    // Fetch lessons that still need extraction
    console.log('📋 Fetching lessons with incomplete content...');
    const { data: allLessons, error: fetchError } = await supabase
      .from('lessons')
      .select('*')
      .gte('created_at', '2025-08-07T00:00:00')
      .lt('created_at', '2025-08-08T00:00:00')
      .order('lesson_id');
    
    if (fetchError) throw fetchError;
    
    // Filter for short content
    const lessons = allLessons.filter(l => !l.content_text || l.content_text.length < 1000);
    
    console.log(`✅ Found ${lessons.length} lessons needing extraction\n`);

    let successCount = 0;
    let improvedCount = 0;
    let failCount = 0;
    const results = [];

    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i];
      console.log(`[${i + 1}/${lessons.length}] Processing: ${lesson.title}`);
      console.log(`  Current content: ${lesson.content_text?.length || 0} chars`);
      
      // Extract doc/file ID
      let docId = null;
      const patterns = [
        /\/document\/d\/([a-zA-Z0-9-_]+)/,
        /\/file\/d\/([a-zA-Z0-9-_]+)/,
        /id=([a-zA-Z0-9-_]+)/
      ];
      
      for (const pattern of patterns) {
        const match = lesson.file_link?.match(pattern);
        if (match) {
          docId = match[1];
          break;
        }
      }
      
      if (!docId) {
        console.log(`  ⚠️  Could not extract ID from URL`);
        failCount++;
        continue;
      }
      
      console.log(`  Doc/File ID: ${docId}`);
      
      // Try different extraction methods
      let extractedContent = null;
      
      // Method 1: Public URL extraction for Google Docs
      if (lesson.file_link.includes('/document/d/')) {
        console.log(`  🔄 Trying public URL extraction...`);
        extractedContent = await extractViaPublicUrl(docId);
      }
      
      // Method 2: Drive file extraction
      if (!extractedContent && lesson.file_link.includes('/file/d/')) {
        console.log(`  🔄 Trying Drive file extraction...`);
        extractedContent = await extractDriveFile(docId);
      }
      
      // Method 3: If still no content, try as Google Doc anyway
      if (!extractedContent) {
        console.log(`  🔄 Trying as Google Doc (last resort)...`);
        extractedContent = await extractViaPublicUrl(docId);
      }
      
      // Update if we got better content
      if (extractedContent && extractedContent.length > lesson.content_text?.length) {
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
        } else {
          if (extractedContent.length > 1000) {
            console.log(`  ✅ Successfully extracted: ${extractedContent.length} chars`);
            successCount++;
          } else {
            console.log(`  🔶 Improved content: ${extractedContent.length} chars`);
            improvedCount++;
          }
        }
        
        results.push({
          lesson_id: lesson.lesson_id,
          title: lesson.title,
          old_length: lesson.content_text?.length || 0,
          new_length: extractedContent.length,
          status: extractedContent.length > 1000 ? 'success' : 'improved'
        });
      } else {
        console.log(`  ❌ No better content found`);
        failCount++;
        
        results.push({
          lesson_id: lesson.lesson_id,
          title: lesson.title,
          status: 'failed',
          reason: 'no_content_found'
        });
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Generate report
    console.log('\n' + '='.repeat(60));
    console.log('📋 EXTRACTION COMPLETE');
    console.log('='.repeat(60));
    console.log(`\n📊 Results:`);
    console.log(`  ✅ Successfully extracted (>1000 chars): ${successCount}`);
    console.log(`  🔶 Improved content: ${improvedCount}`);
    console.log(`  ❌ Failed: ${failCount}`);
    
    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      method: 'public_url_extraction',
      summary: {
        total: lessons.length,
        success: successCount,
        improved: improvedCount,
        failed: failCount
      },
      results: results
    };
    
    const reportPath = join(
      __dirname, 
      '..', 
      'reports', 
      `public-extraction-${new Date().toISOString().split('T')[0]}.json`
    );
    await fs.mkdir(join(__dirname, '..', 'reports'), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Report saved to: ${reportPath}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run extraction
extractRemainingLessons().catch(console.error);