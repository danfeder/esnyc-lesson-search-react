#!/usr/bin/env node

/**
 * Analyze the remaining lessons that couldn't be extracted
 * to understand why and find alternative solutions
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

async function analyzeRemainingIssues() {
  console.log('🔍 Analyzing Remaining Content Extraction Issues\n');
  console.log('=' .repeat(60));

  try {
    // Fetch problematic lessons
    const { data: allLessons, error } = await supabase
      .from('lessons')
      .select('*')
      .gte('created_at', '2025-08-07T00:00:00')
      .lt('created_at', '2025-08-08T00:00:00')
      .order('lesson_id');
    
    if (error) throw error;
    
    // Filter for problematic ones
    const problematic = allLessons.filter(l => 
      !l.content_text || 
      l.content_text.length < 1000 || 
      l.title === 'Unknown'
    );
    
    console.log(`Found ${problematic.length} problematic lessons\n`);
    
    // Categorize by issue type
    const categories = {
      unknown: [],
      veryShort: [],
      pdfLikely: [],
      restrictedAccess: [],
      otherFormat: []
    };
    
    for (const lesson of problematic) {
      // Check various patterns
      if (lesson.title === 'Unknown') {
        categories.unknown.push(lesson);
      } else if (lesson.content_text?.length < 400) {
        categories.veryShort.push(lesson);
      } else if (lesson.file_link?.includes('/file/d/')) {
        categories.pdfLikely.push(lesson);
      } else if (lesson.content_text?.includes('Access Denied') || 
                 lesson.content_text?.includes('Permission denied')) {
        categories.restrictedAccess.push(lesson);
      } else {
        categories.otherFormat.push(lesson);
      }
    }
    
    // Print analysis
    console.log('📊 CATEGORIZATION OF ISSUES:');
    console.log('='.repeat(60));
    console.log(`\n1. Unknown Title (complete failures): ${categories.unknown.length}`);
    if (categories.unknown.length > 0) {
      console.log('   Sample URLs:');
      categories.unknown.slice(0, 3).forEach(l => {
        console.log(`   - ${l.file_link}`);
      });
    }
    
    console.log(`\n2. Very Short Content (<400 chars): ${categories.veryShort.length}`);
    if (categories.veryShort.length > 0) {
      console.log('   Sample lessons:');
      categories.veryShort.slice(0, 3).forEach(l => {
        console.log(`   - ${l.title} (${l.content_text?.length} chars)`);
      });
    }
    
    console.log(`\n3. Likely PDFs (Drive files): ${categories.pdfLikely.length}`);
    if (categories.pdfLikely.length > 0) {
      console.log('   Sample lessons:');
      categories.pdfLikely.slice(0, 3).forEach(l => {
        console.log(`   - ${l.title}: ${l.file_link}`);
      });
    }
    
    console.log(`\n4. Restricted Access: ${categories.restrictedAccess.length}`);
    console.log(`\n5. Other Format Issues: ${categories.otherFormat.length}`);
    
    // Check for patterns in content
    console.log('\n\n📝 CONTENT PATTERNS:');
    console.log('='.repeat(60));
    
    const contentPatterns = {};
    for (const lesson of problematic) {
      if (lesson.content_text) {
        const firstLine = lesson.content_text.split('\n')[0].substring(0, 50);
        contentPatterns[firstLine] = (contentPatterns[firstLine] || 0) + 1;
      }
    }
    
    console.log('\nCommon content starts:');
    Object.entries(contentPatterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .forEach(([pattern, count]) => {
        console.log(`  "${pattern}..." (${count} lessons)`);
      });
    
    // Try to fetch one problematic doc manually
    console.log('\n\n🔧 TESTING MANUAL EXTRACTION:');
    console.log('='.repeat(60));
    
    if (problematic.length > 0) {
      const testLesson = problematic[0];
      console.log(`\nTesting with: ${testLesson.title}`);
      console.log(`URL: ${testLesson.file_link}`);
      
      // Extract doc ID
      const docIdMatch = testLesson.file_link?.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (docIdMatch) {
        const docId = docIdMatch[1];
        console.log(`Doc ID: ${docId}`);
        
        // Try various methods
        console.log('\nTrying different access methods:');
        
        const methods = [
          `https://docs.google.com/document/d/${docId}/export?format=txt`,
          `https://docs.google.com/document/d/${docId}/export?format=html`,
          `https://docs.google.com/document/d/${docId}/export?format=pdf`,
          `https://docs.google.com/document/d/e/${docId}/pub`,
          `https://drive.google.com/uc?export=download&id=${docId}`,
          `https://drive.google.com/file/d/${docId}/view`
        ];
        
        for (const url of methods) {
          try {
            const response = await fetch(url, {
              method: 'HEAD',
              redirect: 'follow'
            });
            
            console.log(`  ${url.split('/').slice(-1)[0]}: ${response.status} ${response.statusText}`);
            
            if (response.status === 200) {
              const contentType = response.headers.get('content-type');
              console.log(`    Content-Type: ${contentType}`);
            }
          } catch (err) {
            console.log(`  ${url.split('/').slice(-1)[0]}: Failed - ${err.message}`);
          }
        }
      }
    }
    
    // Generate recommendations
    console.log('\n\n💡 RECOMMENDATIONS:');
    console.log('='.repeat(60));
    console.log('\n1. For PDFs: Consider using PDF extraction service');
    console.log('2. For restricted docs: Request proper access permissions');
    console.log('3. For Unknown titles: These may be deleted or invalid docs');
    console.log('4. For very short content: May be intentionally brief or need manual review');
    
    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      total_problematic: problematic.length,
      categories: {
        unknown: categories.unknown.map(l => ({
          id: l.lesson_id,
          title: l.title,
          url: l.file_link,
          content_length: l.content_text?.length || 0
        })),
        very_short: categories.veryShort.map(l => ({
          id: l.lesson_id,
          title: l.title,
          content_length: l.content_text?.length || 0
        })),
        pdf_likely: categories.pdfLikely.map(l => ({
          id: l.lesson_id,
          title: l.title,
          url: l.file_link
        })),
        restricted: categories.restrictedAccess.length,
        other: categories.otherFormat.length
      }
    };
    
    const reportPath = join(
      __dirname, 
      '..', 
      'reports', 
      `extraction-issues-analysis-${new Date().toISOString().split('T')[0]}.json`
    );
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run analysis
analyzeRemainingIssues().catch(console.error);