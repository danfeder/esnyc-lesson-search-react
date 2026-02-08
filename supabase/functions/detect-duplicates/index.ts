import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getRestrictedCorsHeaders } from '../_shared/cors.ts';

interface DetectDuplicatesRequest {
  submissionId: string;
  content: string;
  title: string;
  metadata?: any;
  embedding?: number[];
}

interface DuplicateResult {
  lessonId: string;
  title: string;
  similarityScore: number;
  matchType: 'exact' | 'high' | 'medium' | 'low';
  matchDetails: {
    hashMatch: boolean;
    titleSimilarity: number;
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

// Common English stop words to filter out
const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'has',
  'he',
  'in',
  'is',
  'it',
  'its',
  'of',
  'on',
  'that',
  'the',
  'to',
  'was',
  'will',
  'with',
  'this',
  'these',
  'those',
  'what',
  'when',
  'where',
  'which',
  'who',
  'why',
  'how',
]);

// Normalize title for comparison
function normalizeTitle(title: string): string[] {
  // Lowercase, remove punctuation, split into words
  const words = title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 0 && !STOP_WORDS.has(word));

  return words;
}

// Calculate improved title similarity using token set ratio
function calculateTitleSimilarity(title1: string, title2: string): number {
  const words1 = normalizeTitle(title1);
  const words2 = normalizeTitle(title2);

  // Handle empty cases
  if (words1.length === 0 && words2.length === 0) return 1.0;
  if (words1.length === 0 || words2.length === 0) return 0.0;

  const set1 = new Set(words1);
  const set2 = new Set(words2);

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  // Token set ratio with length penalty
  const jaccardScore = union.size === 0 ? 0 : intersection.size / union.size;
  const lengthRatio =
    Math.min(words1.length, words2.length) / Math.max(words1.length, words2.length);

  // Weighted combination favoring Jaccard but considering length
  return jaccardScore * 0.8 + lengthRatio * 0.2;
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

    const { submissionId, content, title, metadata, embedding } =
      (await req.json()) as DetectDuplicatesRequest;

    // Generate content hash
    const contentHash = await generateContentHash(content, metadata);

    // First, check for exact hash matches
    const { data: hashMatches, error: hashError } = await supabase.rpc('find_lessons_by_hash', {
      hash_value: contentHash,
    });

    if (hashError) throw hashError;

    const duplicates: DuplicateResult[] = [];

    // Process hash matches (exact duplicates)
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

    // Get semantic matches if embedding provided
    if (embedding && embedding.length === 1536) {
      const vectorString = `[${embedding.join(',')}]`;

      // Use the SQL function for semantic search
      const { data: semanticMatches, error: semanticError } = await supabase.rpc(
        'find_similar_lessons_by_embedding',
        {
          query_embedding: vectorString,
          similarity_threshold: 0.5,
          max_results: 20,
        }
      );

      if (!semanticError && semanticMatches) {
        for (const match of semanticMatches) {
          // Skip if already found as exact match
          if (duplicates.some((d) => d.lessonId === match.lesson_id)) continue;

          // Get full lesson data for metadata
          const { data: lesson } = await supabase
            .from('lessons_with_metadata')
            .select('metadata')
            .eq('lesson_id', match.lesson_id)
            .single();

          const titleSim = calculateTitleSimilarity(title, match.title);
          const metaOverlap = calculateMetadataOverlap(metadata, lesson?.metadata);
          const semanticSim = match.similarity_score;

          // Combined score with improved weighting
          // Semantic similarity is most important (0.5), then title (0.3), then metadata (0.2)
          const combinedScore = titleSim * 0.3 + metaOverlap * 0.2 + semanticSim * 0.5;

          duplicates.push({
            lessonId: match.lesson_id,
            title: match.title,
            similarityScore: combinedScore,
            matchType: match.match_type as any,
            matchDetails: {
              hashMatch: false,
              titleSimilarity: titleSim,
              semanticSimilarity: semanticSim,
              metadataOverlap: metaOverlap,
            },
          });
        }
      }
    } else {
      // Fallback to title-based search if no embedding
      const { data: allLessons, error: lessonsError } = await supabase
        .from('lessons_with_metadata')
        .select('lesson_id, title, metadata')
        .limit(100);

      if (lessonsError) throw lessonsError;

      for (const lesson of allLessons || []) {
        if (duplicates.some((d) => d.lessonId === lesson.lesson_id)) continue;

        const titleSim = calculateTitleSimilarity(title, lesson.title);
        const metaOverlap = calculateMetadataOverlap(metadata, lesson.metadata);
        const combinedScore = titleSim * 0.7 + metaOverlap * 0.3;

        // Apply floor for fallback path as well
        if (combinedScore >= 0.45) {
          let matchType: 'high' | 'medium' | 'low';
          if (combinedScore >= 0.85) matchType = 'high';
          else if (combinedScore >= 0.7) matchType = 'medium';
          else matchType = 'low';

          duplicates.push({
            lessonId: lesson.lesson_id,
            title: lesson.title,
            similarityScore: combinedScore,
            matchType,
            matchDetails: {
              hashMatch: false,
              titleSimilarity: titleSim,
              semanticSimilarity: 0,
              metadataOverlap: metaOverlap,
            },
          });
        }
      }
    }

    // Sort by similarity score
    duplicates.sort((a, b) => b.similarityScore - a.similarityScore);

    // Apply combined score floor (0.45) and limit to top 10
    const COMBINED_SCORE_FLOOR = 0.45;
    const MAX_RESULTS = 10;

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
        semantic: 0.5,
        combinedFloor: COMBINED_SCORE_FLOOR,
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
