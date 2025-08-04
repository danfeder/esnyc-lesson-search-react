import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Smart search synonyms and expansions
const searchSynonyms: Record<string, string[]> = {
  // Women's History
  women: ["women's", 'woman', 'female', 'ladies', 'girls'],
  woman: ['women', "women's", 'female', 'lady', 'girl'],

  // Cultural terms
  hispanic: ['latino', 'latina', 'latinx', 'latin american', 'spanish'],
  latino: ['hispanic', 'latina', 'latinx', 'latin american'],
  asian: ['chinese', 'japanese', 'korean', 'vietnamese', 'thai', 'indian'],

  // Food terms
  vegetables: ['veggies', 'veggie', 'vegetable', 'greens'],
  veggies: ['vegetables', 'veggie', 'vegetable', 'greens'],
  herbs: ['herb', 'spices', 'seasoning'],

  // Garden terms
  planting: ['plant', 'planted', 'sowing', 'seeding'],
  growing: ['grow', 'cultivation', 'gardening'],
  harvest: ['harvesting', 'picking', 'gathering'],

  // Cooking terms
  cooking: ['cook', 'baking', 'preparing', 'kitchen'],
  recipe: ['recipes', 'cooking', 'preparation'],

  // Grade levels
  kindergarten: ['k', 'kinder', 'pre-k', 'pk'],
  elementary: ['elem', 'primary', 'lower', 'upper'],
  middle: ['ms', 'junior high', 'intermediate'],

  // Seasons
  fall: ['autumn', 'september', 'october', 'november'],
  winter: ['december', 'january', 'february'],
  spring: ['march', 'april', 'may'],
  summer: ['june', 'july', 'august'],

  // Holidays and observances
  thanksgiving: ['turkey', 'gratitude', 'harvest festival'],
  christmas: ['holiday', 'winter celebration', 'december'],
  halloween: ['pumpkin', 'october', 'fall celebration'],
  valentine: ['love', 'heart', 'february'],
  easter: ['spring celebration', 'eggs', 'bunny'],
};

// Common misspellings and variations
const spellingSuggestions: Record<string, string> = {
  womens: "women's",
  womans: "woman's",
  vegatable: 'vegetable',
  vegatables: 'vegetables',
  recipie: 'recipe',
  recipies: 'recipes',
  kindergarden: 'kindergarten',
  elementry: 'elementary',
  middel: 'middle',
  cookin: 'cooking',
  plantin: 'planting',
  growin: 'growing',
};

function expandSearchTerms(query: string): string[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);
  const expandedTerms = new Set<string>();

  for (const term of terms) {
    // Add the original term
    expandedTerms.add(term);

    // Check for spelling corrections
    if (spellingSuggestions[term]) {
      expandedTerms.add(spellingSuggestions[term]);
    }

    // Add synonyms
    if (searchSynonyms[term]) {
      searchSynonyms[term].forEach((synonym) => expandedTerms.add(synonym));
    }

    // Add partial matches for longer terms
    if (term.length > 4) {
      expandedTerms.add(term.substring(0, term.length - 1)); // Remove last character
      expandedTerms.add(term + 's'); // Add plural
      if (term.endsWith('s')) {
        expandedTerms.add(term.substring(0, term.length - 1)); // Remove plural
      }
    }
  }

  return Array.from(expandedTerms);
}

function buildSmartSearchQuery(query: string): string {
  const expandedTerms = expandSearchTerms(query);

  // Create a tsquery that searches for any of the expanded terms
  // Use prefix matching (:*) for partial word matches
  const tsqueryParts = expandedTerms.map((term) => `${term}:*`);

  // Combine with OR for broader matching
  return tsqueryParts.join(' | ');
}

interface SearchRequest {
  query?: string;
  filters?: {
    gradeLevels?: string[];
    thematicCategories?: string[];
    seasons?: string[];
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

    // Apply smart text search if query exists
    if (query && query.trim()) {
      const smartSearchQuery = buildSmartSearchQuery(query.trim());
      console.log(`Original query: "${query}" -> Smart query: "${smartSearchQuery}"`);

      // Use the smart search query with full-text search
      supabaseQuery = supabaseQuery.textSearch('search_vector', smartSearchQuery);
    }

    // Apply filters (same as before)
    if (filters.gradeLevels && filters.gradeLevels.length > 0) {
      supabaseQuery = supabaseQuery.overlaps('grade_levels', filters.gradeLevels);
    }

    if (filters.thematicCategories && filters.thematicCategories.length > 0) {
      supabaseQuery = supabaseQuery.overlaps(
        'metadata->thematicCategories',
        filters.thematicCategories
      );
    }

    if (filters.seasons && filters.seasons.length > 0) {
      if (filters.includeAllSeasons) {
        supabaseQuery = supabaseQuery.or(
          `metadata->seasonTiming.ov.{${filters.seasons.join(',')}},metadata->seasonTiming.cs.{"All Seasons"}`
        );
      } else {
        supabaseQuery = supabaseQuery.overlaps('metadata->seasonTiming', filters.seasons);
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
      supabaseQuery = supabaseQuery.overlaps('metadata->locationRequirements', filters.location);
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
          // For text search, PostgreSQL automatically orders by relevance (ts_rank)
          // We can add a secondary sort by confidence
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
      gradeLevels: row.grade_levels || [],
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
        gradeLevel: row.metadata?.gradeLevel || [],
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

    // Include search suggestions if no results found
    let suggestions: string[] = [];
    if (lessons.length === 0 && query && query.trim()) {
      const expandedTerms = expandSearchTerms(query.trim());
      suggestions = expandedTerms.slice(0, 5); // Limit to 5 suggestions
    }

    return new Response(
      JSON.stringify({
        lessons,
        totalCount: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit),
        suggestions,
        expandedQuery: query ? buildSmartSearchQuery(query.trim()) : null,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Smart search error:', error);
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
