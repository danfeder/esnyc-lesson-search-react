#!/usr/bin/env npx tsx
/**
 * Backfill: publish approved submissions that don’t have a lesson yet
 *
 * Usage:
 *   VITE_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/backfill-publish-approved.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

type Submission = {
  id: string;
  google_doc_url: string;
  extracted_content: string | null;
  content_hash: string | null;
  content_embedding: string | null; // stored as vector literal string like "[1,2,...]"
};

type Review = {
  submission_id: string;
  created_at: string;
  tagged_metadata: any;
};

function ensureArray<T>(v: T | T[] | undefined | null): T[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

async function main() {
  console.log('🔄 Backfill: publish approved submissions → lessons');

  // Find approved submissions without lessons
  const { data: subs, error: subsErr } = await admin
    .from('lesson_submissions')
    .select('id, google_doc_url, extracted_content, content_hash, content_embedding')
    .eq('status', 'approved');

  if (subsErr) throw subsErr;
  if (!subs || subs.length === 0) {
    console.log('No approved submissions found');
    return;
  }

  // Filter to those not present in lessons
  const ids = subs.map((s) => s.id);
  const { data: existing, error: existErr } = await admin
    .from('lessons')
    .select('original_submission_id, lesson_id')
    .in('original_submission_id', ids);
  if (existErr) throw existErr;

  const existingMap = new Map<string, string>();
  (existing || []).forEach((r) => existingMap.set(r.original_submission_id, r.lesson_id));

  const todo: Submission[] = subs.filter((s) => !existingMap.has(s.id)) as any;
  console.log(`Found ${todo.length} approved submissions without lessons`);

  // Load latest review per submission for metadata
  for (const s of todo) {
    const { data: reviews, error: revErr } = await admin
      .from('submission_reviews')
      .select('submission_id, created_at, tagged_metadata')
      .eq('submission_id', s.id)
      .order('created_at', { ascending: false })
      .limit(1);
    if (revErr) throw revErr;

    const meta = (reviews?.[0]?.tagged_metadata || {}) as any;

    const newLesson: any = {
      lesson_id: `lesson_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      title: meta.title || 'Untitled Lesson',
      summary: meta.summary || '',
      file_link: s.google_doc_url,
      grade_levels: ensureArray<string>(meta.gradeLevels),
      activity_type: ensureArray<string>(meta.activityType),
      thematic_categories: ensureArray<string>(meta.themes),
      season_timing: ensureArray<string>(meta.season),
      core_competencies: ensureArray<string>(meta.coreCompetencies),
      cultural_heritage: ensureArray<string>(meta.culturalHeritage),
      location_requirements: ensureArray<string>(meta.location),
      lesson_format: meta.lessonFormat || null,
      academic_integration: ensureArray<string>(meta.academicIntegration),
      social_emotional_learning: ensureArray<string>(meta.socialEmotionalLearning),
      cooking_methods: ensureArray<string>(meta.cookingMethods),
      main_ingredients: ensureArray<string>(meta.mainIngredients),
      garden_skills: ensureArray<string>(meta.gardenSkills),
      cooking_skills: ensureArray<string>(meta.cookingSkills),
      observances_holidays: ensureArray<string>(meta.observancesHolidays),
      cultural_responsiveness_features: ensureArray<string>(meta.culturalResponsivenessFeatures),
      metadata: meta, // retain raw tagged metadata for compatibility
      content_text: s.extracted_content || '',
      content_hash: s.content_hash,
      original_submission_id: s.id,
      processing_notes: meta.processingNotes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (s.content_embedding) newLesson.content_embedding = s.content_embedding;

    const { error: insErr } = await admin.from('lessons').insert(newLesson);
    if (insErr) {
      console.error('❌ Insert failed for submission', s.id, insErr.message);
      continue;
    }
    console.log('✅ Published submission → lesson:', s.id);
  }

  console.log('Done.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

