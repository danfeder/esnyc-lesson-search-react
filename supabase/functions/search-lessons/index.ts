import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SearchRequest {
  query?: string;
  filters?: {
    gradeLevels?: string[];
    thematicCategory?: string[];
    season?: string[];
    coreCompetencies?: string[];
    culturalHeritage?: string[];
    location?: string[];
    activityType?: string[];
    lessonFormat?: string[];
    includeAllSeasons?: boolean;
  };
  page?: number;
  limit?: number;
  sortBy?: 'relevance' | 'title' | 'confidence' | 'grade' | 'modified';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const {
      query,
      filters = {},
      page = 1,
      limit = 20,
      sortBy = 'relevance',
    }: SearchRequest = await req.json();

    // Build the base query
    let supabaseQuery = supabaseClient
      .from('lessons_with_metadata')
      .select('*', { count: 'exact' });

    // Apply text search if query exists
    if (query && query.trim()) {
      const searchQuery = query
        .split(' ')
        .filter((term) => term.length > 0)
        .map((term) => `${term}:*`)
        .join(' & ');

      supabaseQuery = supabaseQuery.textSearch('search_vector', searchQuery);
    }

    // Apply filters
    if (filters.gradeLevels && filters.gradeLevels.length > 0) {
      supabaseQuery = supabaseQuery.overlaps('grade_levels', filters.gradeLevels);
    }

    if (filters.thematicCategory && filters.thematicCategory.length > 0) {
      supabaseQuery = supabaseQuery.overlaps(
        'metadata->thematicCategory',
        filters.thematicCategory
      );
    }

    if (filters.season && filters.season.length > 0) {
      if (filters.includeAllSeasons) {
        // Include lessons that match selected seasons OR are marked as "All Seasons"
        supabaseQuery = supabaseQuery.or(
          `metadata->season.ov.{${filters.season.join(',')}},metadata->season.cs.{"All Seasons"}`
        );
      } else {
        supabaseQuery = supabaseQuery.overlaps('metadata->season', filters.season);
      }
    }

    if (filters.coreCompetencies && filters.coreCompetencies.length > 0) {
      supabaseQuery = supabaseQuery.overlaps(
        'metadata->coreCompetencies',
        filters.coreCompetencies
      );
    }

    if (filters.culturalHeritage && filters.culturalHeritage.length > 0) {
      supabaseQuery = supabaseQuery.overlaps(
        'metadata->culturalHeritage',
        filters.culturalHeritage
      );
    }

    if (filters.location && filters.location.length > 0) {
      supabaseQuery = supabaseQuery.overlaps('metadata->location', filters.location);
    }

    if (filters.activityType && filters.activityType.length > 0) {
      supabaseQuery = supabaseQuery.overlaps('metadata->activityType', filters.activityType);
    }

    if (filters.lessonFormat && filters.lessonFormat.length > 0) {
      supabaseQuery = supabaseQuery.overlaps('metadata->lessonFormat', filters.lessonFormat);
    }

    // Apply sorting
    switch (sortBy) {
      case 'title':
        supabaseQuery = supabaseQuery.order('title', { ascending: true });
        break;
      case 'confidence':
        supabaseQuery = supabaseQuery.order('confidence->overall', { ascending: false });
        break;
      case 'grade':
        supabaseQuery = supabaseQuery.order('grade_levels', { ascending: true });
        break;
      case 'modified':
        supabaseQuery = supabaseQuery.order('updated_at', { ascending: false });
        break;
      default: // relevance
        if (query && query.trim()) {
          // For text search, PostgreSQL automatically orders by relevance
          supabaseQuery = supabaseQuery.order('confidence->overall', { ascending: false });
        } else {
          supabaseQuery = supabaseQuery.order('confidence->overall', { ascending: false });
        }
    }

    // Apply pagination
    const offset = (page - 1) * limit;
    supabaseQuery = supabaseQuery.range(offset, offset + limit - 1);

    const { data, error, count } = await supabaseQuery;

    if (error) {
      throw error;
    }

    // Transform data to match frontend expectations
    const lessons = (data || []).map((row: any) => ({
      lessonId: row.lesson_id,
      title: row.title,
      summary: row.summary,
      fileLink: row.file_link,
      gradeLevels: row.grade_levels,
      metadata: {
        // Map all metadata fields properly, using both direct columns and metadata object
        thematicCategories: row.thematic_categories || row.metadata?.thematicCategories || [],
        seasonTiming: row.season_timing || row.metadata?.seasonTiming || [],
        coreCompetencies: row.core_competencies || row.metadata?.coreCompetencies || [],
        culturalHeritage: row.cultural_heritage || row.metadata?.culturalHeritage || [],
        locationRequirements: row.location_requirements || row.metadata?.locationRequirements || [],
        activityType: row.metadata?.activityType || [],
        lessonFormat: row.lesson_format || row.metadata?.lessonFormat || [],
        mainIngredients: row.main_ingredients || row.metadata?.mainIngredients || [],
        skills: row.metadata?.skills || [],
        equipment: row.metadata?.equipment || [],
        duration: row.metadata?.duration,
        groupSize: row.metadata?.groupSize,
        gardenSkills: row.garden_skills || row.metadata?.gardenSkills || [],
        cookingSkills: row.cooking_skills || row.metadata?.cookingSkills || [],
        cookingMethods: row.cooking_methods || row.metadata?.cookingMethods || [],
        observancesHolidays: row.observances_holidays || row.metadata?.observancesHolidays || [],
        academicIntegration: row.academic_integration || row.metadata?.academicIntegration || [],
        socialEmotionalLearning:
          row.social_emotional_learning || row.metadata?.socialEmotionalLearning || [],
        culturalResponsivenessFeatures:
          row.cultural_responsiveness_features ||
          row.metadata?.culturalResponsivenessFeatures ||
          [],
      },
      confidence: row.confidence,
      last_modified: row.last_modified,
      processing_notes: row.processing_notes,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));

    return new Response(
      JSON.stringify({
        lessons,
        totalCount: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Search error:', error);
    return new Response(
      JSON.stringify({
        error: 'Search failed',
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
