#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMissingEmbeddings() {
  console.log('🔍 Checking for lessons without embeddings...\n');

  const { data: missingLessons, error } = await supabase
    .from('lessons')
    .select('lesson_id, title, content_text')
    .is('content_embedding', null)
    .order('lesson_id');

  if (error) {
    console.error('Error:', error);
    return;
  }

  if (!missingLessons || missingLessons.length === 0) {
    console.log('✅ All lessons have embeddings!');
    return;
  }

  console.log(`Found ${missingLessons.length} lessons without embeddings:\n`);
  
  missingLessons.forEach((lesson, index) => {
    console.log(`${index + 1}. ${lesson.title}`);
    console.log(`   ID: ${lesson.lesson_id}`);
    console.log(`   Has content: ${lesson.content_text ? 'Yes' : 'No'}`);
    if (lesson.content_text) {
      console.log(`   Content length: ${lesson.content_text.length} chars`);
    }
    console.log('');
  });
}

checkMissingEmbeddings().catch(console.error);