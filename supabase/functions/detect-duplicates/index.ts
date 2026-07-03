import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getRestrictedCorsHeaders } from '../_shared/cors.ts';
import { timingSafeEqual } from '../_shared/timing-safe-equal.ts';

interface DetectDuplicatesRequest {
  submissionId: string;
  content: string;
  title: string;
  metadata?: any;
}

interface DuplicateResult {
  lessonId: string;
  title: string;
  similarityScore: number;
  matchType: 'exact' | 'high' | 'medium' | 'low';
  matchDetails: {
    hashMatch: boolean;
    titleSimilarity: number;
    // Kept for byte-compatibility of the submission_similarities write shape
    // (match_details JSON + the content_similarity column). As of the T4b
    // rewrite this now carries the pg_trgm CONTENT-text similarity, not the
    // retired embedding "semantic" similarity — value semantics changed, keys
    // unchanged.
    semanticSimilarity: number;
    metadataOverlap: number;
  };
}

// Generate content hash for exact duplicate detection
// Now properly hashes the actual content, not metadata
async function generateContentHash(content: string, metadata: any = {}): Promise<string> {
  if (content && content.trim().length > 0) {
    // Normalize content: lowercase, single spaces, trim
    const normalizedContent = content.toLowerCase().replace(/\s+/g, ' ').trim();

    const msgUint8 = new TextEncoder().encode(normalizedContent);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  } else {
    // Fallback to metadata hash with prefix
    const metadataParts = [
      metadata.title?.toLowerCase().trim() || '',
      metadata.summary?.toLowerCase().trim() || '',
      JSON.stringify(metadata.gradeLevels || []),
      // Add other metadata fields as needed
    ];

    const metadataString = metadataParts.join('|');
    const msgUint8 = new TextEncoder().encode(metadataString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    // Prefix to indicate this is metadata-only
    return 'META_' + hash;
  }
}

// Calculate Jaccard similarity for array fields
function calculateJaccardSimilarity(arr1: any[], arr2: any[]): number {
  if (!arr1?.length && !arr2?.length) return 1.0; // Both empty = match
  if (!arr1?.length || !arr2?.length) return 0.0; // One empty = no match

  // Normalize strings for comparison
  const normalize = (item: any) => String(item).toLowerCase().trim();
  const set1 = new Set(arr1.map(normalize));
  const set2 = new Set(arr2.map(normalize));

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  return union.size === 0 ? 0 : intersection.size / union.size;
}

// Calculate metadata overlap across all 7 array fields
function calculateMetadataOverlap(meta1: any, meta2: any): number {
  if (!meta1 || !meta2) return 0;

  const fieldWeights = {
    gradeLevels: 0.2, // Important for age appropriateness
    thematicCategories: 0.2, // Core content categorization
    activityType: 0.15, // Type of lesson activity
    culturalHeritage: 0.15, // Cultural context
    seasonTiming: 0.1, // When lesson is relevant
    mainIngredients: 0.1, // For cooking lessons
    cookingMethods: 0.1, // For cooking lessons
  };

  let weightedScore = 0;
  let totalWeight = 0;

  // Map submission fields to lesson fields
  const fieldMappings = [
    { sub: 'gradeLevels', lesson: 'grade_levels', weight: fieldWeights.gradeLevels },
    {
      sub: 'thematicCategories',
      lesson: 'thematic_categories',
      weight: fieldWeights.thematicCategories,
    },
    { sub: 'activityType', lesson: 'activity_type', weight: fieldWeights.activityType },
    { sub: 'culturalHeritage', lesson: 'cultural_heritage', weight: fieldWeights.culturalHeritage },
    { sub: 'seasonTiming', lesson: 'season_timing', weight: fieldWeights.seasonTiming },
    { sub: 'mainIngredients', lesson: 'main_ingredients', weight: fieldWeights.mainIngredients },
    { sub: 'cookingMethods', lesson: 'cooking_methods', weight: fieldWeights.cookingMethods },
  ];

  for (const mapping of fieldMappings) {
    const subField = meta1[mapping.sub];
    const lessonField = meta2[mapping.lesson];

    // Skip if either field is missing
    if (subField && lessonField) {
      const similarity = calculateJaccardSimilarity(
        Array.isArray(subField) ? subField : [subField],
        Array.isArray(lessonField) ? lessonField : [lessonField]
      );

      weightedScore += similarity * mapping.weight;
      totalWeight += mapping.weight;
    }
  }

  // Normalize by actual weight used (in case some fields were missing)
  return totalWeight > 0 ? weightedScore / totalWeight : 0;
}

// Combined-score weights (T4b, D9). Content trigram carries the most signal,
// then title trigram, then metadata-set overlap.
const W_TITLE = 0.35;
const W_CONTENT = 0.45;
const W_METADATA = 0.2;

// Bucket floors on the combined score. `exact` is awarded ONLY on a content-hash
// match (below) — never from similarity — which kills the old false-"EXACT"
// class (an embedding tie of 0.999997 with a disagreeing hash).
const HIGH_FLOOR = 0.8;
const MEDIUM_FLOOR = 0.6;
const COMBINED_SCORE_FLOOR = 0.45; // low floor; below this a candidate is dropped
const MAX_RESULTS = 10;
const CANDIDATE_LIMIT = 20; // top-N candidates the SQL RPC returns to score here

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getRestrictedCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth gate — this function is deployed with --no-verify-jwt and uses the
    // service-role client (RLS-bypassing), so it MUST gate access in-code.
    // Accept either the service-role key (server-to-server callers like
    // process-submission) or an authenticated reviewer/admin/super_admin user.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const token = authHeader.replace('Bearer ', '');
    // Use constant-time comparison to prevent timing attacks.
    const tokenBytes = new TextEncoder().encode(token);
    const keyBytes = new TextEncoder().encode(supabaseServiceKey);
    const isServiceRole =
      tokenBytes.length === keyBytes.length &&
      timingSafeEqual(tokenBytes, keyBytes);

    if (!isServiceRole) {
      // Not the service-role key — require an authenticated reviewer/admin user.
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid authentication token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      if (!profile || !['reviewer', 'admin', 'super_admin'].includes(profile.role)) {
        return new Response(
          JSON.stringify({ success: false, error: 'Insufficient permissions' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    const { submissionId, content, title, metadata } =
      (await req.json()) as DetectDuplicatesRequest;

    // Generate content hash
    const contentHash = await generateContentHash(content, metadata);

    // Leg 1 — exact content-hash matches.
    // Intentionally queries the full corpus (no retired filter) so reviewers
    // catch a future re-submission of a previously retired import.
    const { data: hashMatches, error: hashError } = await supabase.rpc('find_lessons_by_hash', {
      hash_value: contentHash,
    });

    if (hashError) throw hashError;

    const duplicates: DuplicateResult[] = [];

    // Process hash matches (the ONLY source of an `exact` label).
    if (hashMatches && hashMatches.length > 0) {
      for (const match of hashMatches) {
        duplicates.push({
          lessonId: match.lesson_id,
          title: match.title,
          similarityScore: 1.0,
          matchType: 'exact',
          matchDetails: {
            hashMatch: true,
            titleSimilarity: 1.0,
            semanticSimilarity: 1.0,
            metadataOverlap: 1.0,
          },
        });
      }
    }

    // Leg 2 — pg_trgm title + content similarity over LIVE lessons
    // (find_similar_lessons_text filters retired_at IS NULL — a retired lesson
    // must never be offered as an update target). The RPC returns the top
    // CANDIDATE_LIMIT by GREATEST(title_sim, content_sim); we score each here
    // against the caller's combined-score floor. Replaces the retired embedding
    // leg entirely (D9).
    const { data: textMatches, error: textError } = await supabase.rpc(
      'find_similar_lessons_text',
      {
        p_title: title,
        p_content: content,
        p_exclude_lesson_id: null,
        p_limit: CANDIDATE_LIMIT,
      }
    );

    if (textError) throw textError;

    if (textMatches && textMatches.length > 0) {
      // Batch-fetch candidate metadata for the overlap leg (one query, not N).
      const candidateIds = textMatches
        .map((m: { lesson_id: string }) => m.lesson_id)
        .filter((id: string) => !duplicates.some((d) => d.lessonId === id));

      const metadataById = new Map<string, any>();
      if (candidateIds.length > 0) {
        const { data: metaRows } = await supabase
          .from('lessons_with_metadata')
          .select('lesson_id, metadata')
          .in('lesson_id', candidateIds);
        for (const row of metaRows || []) {
          metadataById.set(row.lesson_id, row.metadata);
        }
      }

      for (const match of textMatches) {
        // Skip anything already surfaced as an exact hash match.
        if (duplicates.some((d) => d.lessonId === match.lesson_id)) continue;

        const titleSim = match.title_sim ?? 0;
        const contentSim = match.content_sim ?? 0;
        const metaOverlap = calculateMetadataOverlap(
          metadata,
          metadataById.get(match.lesson_id)
        );

        const combinedScore = titleSim * W_TITLE + contentSim * W_CONTENT + metaOverlap * W_METADATA;

        // Non-hash candidates can never be `exact`.
        let matchType: 'high' | 'medium' | 'low';
        if (combinedScore >= HIGH_FLOOR) matchType = 'high';
        else if (combinedScore >= MEDIUM_FLOOR) matchType = 'medium';
        else matchType = 'low';

        duplicates.push({
          lessonId: match.lesson_id,
          title: match.title,
          similarityScore: combinedScore,
          matchType,
          matchDetails: {
            hashMatch: false,
            titleSimilarity: titleSim,
            semanticSimilarity: contentSim,
            metadataOverlap: metaOverlap,
          },
        });
      }
    }

    // Sort by similarity score
    duplicates.sort((a, b) => b.similarityScore - a.similarityScore);

    // Apply combined score floor (0.45) and limit to top 10. Exact (hash) always
    // survives the floor.
    const filteredDuplicates = duplicates
      .filter((dup) => dup.similarityScore >= COMBINED_SCORE_FLOOR || dup.matchType === 'exact')
      .slice(0, MAX_RESULTS);

    // Calculate observability metrics
    const matchCounts = {
      exact: filteredDuplicates.filter((d) => d.matchType === 'exact').length,
      high: filteredDuplicates.filter((d) => d.matchType === 'high').length,
      medium: filteredDuplicates.filter((d) => d.matchType === 'medium').length,
      low: filteredDuplicates.filter((d) => d.matchType === 'low').length,
      total: filteredDuplicates.length,
      preFilterTotal: duplicates.length,
      filtered: duplicates.length - filteredDuplicates.length,
    };

    // Calculate score statistics
    const scores = filteredDuplicates.map((d) => d.similarityScore).sort((a, b) => a - b);
    const scoreStats =
      scores.length > 0
        ? {
            min: scores[0],
            max: scores[scores.length - 1],
            avg: scores.reduce((a, b) => a + b, 0) / scores.length,
            p50: scores[Math.floor(scores.length * 0.5)],
            p90: scores[Math.floor(scores.length * 0.9)],
          }
        : null;

    // Log observability metrics
    console.log('Duplicate detection metrics:', {
      submissionId,
      matchCounts,
      scoreStats,
      thresholds: {
        highFloor: HIGH_FLOOR,
        mediumFloor: MEDIUM_FLOOR,
        combinedFloor: COMBINED_SCORE_FLOOR,
        candidateLimit: CANDIDATE_LIMIT,
        maxResults: MAX_RESULTS,
      },
    });

    // Store results in submission_similarities table
    if (submissionId && filteredDuplicates.length > 0) {
      const similaritiesToInsert = filteredDuplicates.map((dup) => ({
        submission_id: submissionId,
        lesson_id: dup.lessonId,
        title_similarity: dup.matchDetails.titleSimilarity,
        content_similarity: dup.matchDetails.semanticSimilarity,
        metadata_overlap_score: dup.matchDetails.metadataOverlap,
        combined_score: dup.similarityScore,
        match_type: dup.matchType,
        match_details: dup.matchDetails,
      }));

      const { error: insertError } = await supabase
        .from('submission_similarities')
        .insert(similaritiesToInsert);

      if (insertError) console.error('Error storing similarities:', insertError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          submissionId,
          contentHash,
          duplicatesFound: filteredDuplicates.length,
          duplicates: filteredDuplicates, // Already filtered to top 10
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
