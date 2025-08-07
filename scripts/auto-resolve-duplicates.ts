#!/usr/bin/env npx tsx
/**
 * Auto-resolve exact duplicate groups based on scoring criteria
 *
 * Selection logic:
 * 1. Highest canonical score
 * 2. If tied, highest completeness score
 * 3. If still tied, most recent last_modified date
 *
 * Usage:
 *   npm run auto-resolve-duplicates -- --dry-run  # See what would be resolved
 *   npm run auto-resolve-duplicates               # Actually resolve duplicates
 *   npm run auto-resolve-duplicates -- --group exact_1,exact_2  # Specific groups only
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client with service role key for admin operations
const supabaseUrl = process.env.VITE_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   VITE_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

interface LessonScore {
  lessonId: string;
  title: string;
  canonicalScore: number;
  metadataCompleteness: number;
  lastModified?: string;
  scoreBreakdown?: any;
}

interface DuplicateGroup {
  groupId: string;
  type: string;
  similarityScore?: number; // Old format
  averageSimilarity?: number; // New format
  lessons: LessonScore[];
  recommendedCanonical?: string;
}

interface ResolutionDecision {
  groupId: string;
  selectedCanonicalId: string;
  selectedCanonicalTitle: string;
  duplicateIds: string[];
  reason: string;
  canonicalScore: number;
  completenessScore: number;
  lastModified?: string;
}

async function loadDuplicateAnalysis(): Promise<DuplicateGroup[]> {
  const reportPath = path.join(
    __dirname,
    '..',
    'public',
    'reports',
    'duplicate-analysis-v2-2025-08-07.json'
  );

  if (!fs.existsSync(reportPath)) {
    console.error(`❌ Duplicate analysis report not found at: ${reportPath}`);
    process.exit(1);
  }

  const reportData = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));
  return reportData.groups || [];
}

async function checkIfResolved(groupId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('duplicate_resolutions')
    .select('id')
    .eq('group_id', groupId)
    .single();

  return !!data && !error;
}

function selectBestCanonical(lessons: LessonScore[]): ResolutionDecision['selectedCanonicalId'] {
  // Sort lessons by our selection criteria
  const sorted = [...lessons].sort((a, b) => {
    // 1. Compare canonical scores (higher is better)
    if (a.canonicalScore !== b.canonicalScore) {
      return b.canonicalScore - a.canonicalScore;
    }

    // 2. Compare completeness scores (higher is better)
    if (a.metadataCompleteness !== b.metadataCompleteness) {
      return b.metadataCompleteness - a.metadataCompleteness;
    }

    // 3. Compare last modified dates (more recent is better)
    if (a.lastModified && b.lastModified) {
      return new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime();
    }

    // 4. If one has a date and the other doesn't, prefer the one with a date
    if (a.lastModified && !b.lastModified) return -1;
    if (!a.lastModified && b.lastModified) return 1;

    // 5. Final tiebreaker: lexicographic order of lesson ID for consistency
    return a.lessonId.localeCompare(b.lessonId);
  });

  return sorted[0].lessonId;
}

type ResolutionResult = 'success' | 'failed' | 'submission-skip';

async function resolveGroup(
  group: DuplicateGroup,
  decision: ResolutionDecision,
  dryRun: boolean
): Promise<ResolutionResult> {
  if (dryRun) {
    console.log(`   [DRY RUN] Would resolve with canonical: ${decision.selectedCanonicalId}`);
    return 'success';
  }

  // Check if any lessons in this group are from submissions - if so, skip
  const lessonIds = [decision.selectedCanonicalId, ...decision.duplicateIds];
  const { data: submissionLessons, error: checkError } = await supabase
    .from('lessons')
    .select('lesson_id, original_submission_id')
    .in('lesson_id', lessonIds)
    .not('original_submission_id', 'is', null);

  if (checkError) {
    console.error(`   ❌ Error checking for submission lessons: ${checkError.message}`);
    return 'failed';
  }

  if (submissionLessons && submissionLessons.length > 0) {
    console.log(`   ⚠️  Skipping - contains submission-based lesson(s)`);
    return 'submission-skip';
  }

  // Also check for submission-generated IDs
  const hasSubmissionId = lessonIds.some((id) => id.startsWith('lesson_'));
  if (hasSubmissionId) {
    console.log(`   ⚠️  Skipping - contains submission-generated lesson ID`);
    return 'submission-skip';
  }

  // First, we need to authenticate as a service user
  // The resolve_duplicate_group function requires auth.uid() to be set
  // Since we're using service role, we need to create a proper authenticated context

  // For now, we'll directly perform the resolution operations
  // This is equivalent to what resolve_duplicate_group does internally

  try {
    // Archive duplicate lessons
    for (const duplicateId of decision.duplicateIds) {
      // Copy to archive
      const { data: lessonData, error: fetchError } = await supabase
        .from('lessons')
        .select('*')
        .eq('lesson_id', duplicateId)
        .single();

      if (fetchError) throw fetchError;

      // Insert into archive
      const { error: archiveError } = await supabase.from('lesson_archive').insert({
        ...lessonData,
        archived_at: new Date().toISOString(),
        archived_by: null, // Keep this null since it's a foreign key to user_profiles
        archived_by_system: 'auto-resolution-script', // Track that it was done by script
        archive_reason: 'duplicate_resolution',
        canonical_id: decision.selectedCanonicalId,
      });

      if (archiveError) throw archiveError;

      // Add to canonical_lessons mapping
      const { error: mappingError } = await supabase.from('canonical_lessons').insert({
        duplicate_id: duplicateId,
        canonical_id: decision.selectedCanonicalId,
        similarity_score: group.similarityScore ?? group.averageSimilarity ?? 1.0,
        resolution_type: group.type,
        resolved_by: null, // Keep null since it references user_profiles
        resolution_notes: `Auto-resolved by script. ${decision.reason}`,
      });

      if (mappingError) throw mappingError;

      // Delete from main table
      const { error: deleteError } = await supabase
        .from('lessons')
        .delete()
        .eq('lesson_id', duplicateId);

      if (deleteError) throw deleteError;
    }

    // Record the resolution
    const { error: resolutionError } = await supabase.from('duplicate_resolutions').insert({
      group_id: group.groupId,
      duplicate_type: group.type,
      similarity_score: group.similarityScore ?? group.averageSimilarity ?? 1.0,
      lessons_in_group: group.lessons.length,
      canonical_lesson_id: decision.selectedCanonicalId,
      action_taken: 'merge_and_archive',
      resolved_by: null, // Keep null since it references user_profiles
      notes: `Auto-resolved exact duplicate by script. ${decision.reason}`,
    });

    if (resolutionError) throw resolutionError;

    console.log(
      `   ✅ Resolved successfully - archived ${decision.duplicateIds.length} duplicate(s)`
    );
    return 'success';
  } catch (err: any) {
    console.error(`   ❌ Failed to resolve: ${err.message}`);
    return 'failed';
  }
}

async function main() {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const groupFilter = args
    .find((arg) => arg.startsWith('--group='))
    ?.split('=')[1]
    ?.split(',');

  console.log('🔍 Auto-Resolve Exact Duplicates');
  console.log('================================');
  console.log(
    `Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (will resolve duplicates)'}`
  );
  if (groupFilter) {
    console.log(`Groups: ${groupFilter.join(', ')}`);
  }
  console.log('');

  // Load duplicate analysis
  console.log('📊 Loading duplicate analysis report...');
  const allGroups = await loadDuplicateAnalysis();

  // Filter to exact duplicates only
  let exactGroups = allGroups.filter((g) => g.type === 'exact');

  // Apply group filter if specified
  if (groupFilter) {
    exactGroups = exactGroups.filter((g) => groupFilter.includes(g.groupId));
  }

  console.log(`Found ${exactGroups.length} exact duplicate groups\n`);

  let totalResolved = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  let totalSubmissionSkipped = 0;

  for (const group of exactGroups) {
    console.log(`\n📦 Group: ${group.groupId}`);
    console.log(`   Lessons: ${group.lessons.length}`);
    console.log(`   Similarity: ${(group.similarityScore * 100).toFixed(0)}%`);

    // Check if already resolved
    const isResolved = await checkIfResolved(group.groupId);
    if (isResolved) {
      console.log(`   ⏭️  Already resolved - skipping`);
      totalSkipped++;
      continue;
    }

    // Select the best canonical lesson
    const selectedId = selectBestCanonical(group.lessons);
    const selectedLesson = group.lessons.find((l) => l.lessonId === selectedId)!;
    const duplicateIds = group.lessons
      .filter((l) => l.lessonId !== selectedId)
      .map((l) => l.lessonId);

    const decision: ResolutionDecision = {
      groupId: group.groupId,
      selectedCanonicalId: selectedId,
      selectedCanonicalTitle: selectedLesson.title,
      duplicateIds,
      reason: `Selected based on canonical_score=${selectedLesson.canonicalScore.toFixed(3)}, completeness=${selectedLesson.metadataCompleteness.toFixed(3)}, modified=${selectedLesson.lastModified || 'unknown'}`,
      canonicalScore: selectedLesson.canonicalScore,
      completenessScore: selectedLesson.metadataCompleteness,
      lastModified: selectedLesson.lastModified,
    };

    console.log(`   📊 Selected: "${selectedLesson.title}"`);
    console.log(`      - Canonical Score: ${selectedLesson.canonicalScore.toFixed(3)}`);
    console.log(`      - Completeness: ${(selectedLesson.metadataCompleteness * 100).toFixed(0)}%`);
    console.log(`      - Last Modified: ${selectedLesson.lastModified || 'Unknown'}`);
    console.log(`   📚 Will archive: ${duplicateIds.length} duplicate(s)`);

    // Resolve the group
    const result = await resolveGroup(group, decision, dryRun);
    switch (result) {
      case 'success':
        totalResolved++;
        break;
      case 'submission-skip':
        totalSubmissionSkipped++;
        break;
      case 'failed':
        if (!dryRun) totalFailed++;
        break;
    }
  }

  // Summary
  console.log('\n=====================================');
  console.log('📈 Summary:');
  console.log(`   Processed: ${exactGroups.length} groups`);
  if (dryRun) {
    console.log(`   Would resolve: ${totalResolved}`);
    console.log(`   Already resolved: ${totalSkipped}`);
    if (totalSubmissionSkipped > 0) {
      console.log(`   Submission-based (excluded): ${totalSubmissionSkipped}`);
    }
  } else {
    console.log(`   Resolved: ${totalResolved}`);
    console.log(`   Skipped (already resolved): ${totalSkipped}`);
    console.log(`   Skipped (submission-based): ${totalSubmissionSkipped}`);
    console.log(`   Failed: ${totalFailed}`);
  }

  if (dryRun && totalResolved > 0) {
    console.log('\n💡 To actually resolve these duplicates, run without --dry-run flag:');
    console.log('   npm run auto-resolve-duplicates');
  }
}

// Run the script
main().catch(console.error);
