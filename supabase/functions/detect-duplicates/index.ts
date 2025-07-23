import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { createHash } from 'https://deno.land/std@0.168.0/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
    semanticSimilarity: number;
    metadataOverlap: number;
  };
}

// Generate content hash for exact duplicate detection
function generateContentHash(content: string, metadata: any = {}): string {
  const contentParts = [content.toLowerCase().trim(), JSON.stringify(metadata)];
  const contentString = contentParts.join('|');
  const msgUint8 = new TextEncoder().encode(contentString);
  const hashBuffer = createHash('sha256').update(msgUint8).digest();
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// Calculate title similarity (simple Jaccard similarity)
function calculateTitleSimilarity(title1: string, title2: string): number {
  const words1 = new Set(title1.toLowerCase().split(/\s+/));
  const words2 = new Set(title2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter((x) => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

// Calculate metadata overlap
function calculateMetadataOverlap(meta1: any, meta2: any): number {
  if (!meta1 || !meta2) return 0;

  let overlapScore = 0;
  let totalChecks = 0;

  // Check grade levels
  if (meta1.gradeLevels && meta2.grade_levels) {
    const grades1 = new Set(meta1.gradeLevels);
    const grades2 = new Set(meta2.grade_levels);
    const intersection = new Set([...grades1].filter((x) => grades2.has(x)));
    if (intersection.size > 0) {
      overlapScore += intersection.size / Math.max(grades1.size, grades2.size);
    }
    totalChecks++;
  }

  // Check skills
  if (meta1.skills && meta2.skills) {
    const skills1 = new Set(meta1.skills);
    const skills2 = new Set(meta2.skills);
    const intersection = new Set([...skills1].filter((x) => skills2.has(x)));
    if (intersection.size > 0) {
      overlapScore += intersection.size / Math.max(skills1.size, skills2.size);
    }
    totalChecks++;
  }

  return totalChecks > 0 ? overlapScore / totalChecks : 0;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { submissionId, content, title, metadata } =
      (await req.json()) as DetectDuplicatesRequest;

    // Generate content hash
    const contentHash = generateContentHash(content, metadata);

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

    // Get embedding for semantic search (would be generated in production)
    // For now, we'll search by title similarity
    const { data: allLessons, error: lessonsError } = await supabase
      .from('lessons')
      .select('lesson_id, title, metadata')
      .limit(100); // In production, would use vector similarity search

    if (lessonsError) throw lessonsError;

    // Find similar lessons by title
    for (const lesson of allLessons || []) {
      // Skip if already found as exact match
      if (duplicates.some((d) => d.lessonId === lesson.lesson_id)) continue;

      const titleSim = calculateTitleSimilarity(title, lesson.title);
      const metaOverlap = calculateMetadataOverlap(metadata, lesson.metadata);

      // Combined score (would include semantic similarity in production)
      const combinedScore = titleSim * 0.5 + metaOverlap * 0.3 + 0.2; // 0.2 is placeholder for semantic

      if (combinedScore >= 0.3) {
        // Threshold for considering as potential duplicate
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
            semanticSimilarity: 0.2, // Placeholder
            metadataOverlap: metaOverlap,
          },
        });
      }
    }

    // Sort by similarity score
    duplicates.sort((a, b) => b.similarityScore - a.similarityScore);

    // Store results in submission_similarities table
    if (submissionId && duplicates.length > 0) {
      const similaritiesToInsert = duplicates.map((dup) => ({
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
          duplicatesFound: duplicates.length,
          duplicates: duplicates.slice(0, 10), // Return top 10
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
