import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  applyFilters,
  applySorting,
  applyPagination,
  transformRow,
  type SearchFilters,
  type SortBy,
} from '../_shared/search-helpers.ts';

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
  filters?: SearchFilters;
  page?: number;
  limit?: number;
  sortBy?: SortBy;
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
      },
    );

    const body: SearchRequest = await req.json();
    const query = body.query;
    const filters = body.filters ?? {};
    const page = Math.max(1, Math.floor(Number(body.page) || 1));
    const limit = Math.min(100, Math.max(1, Math.floor(Number(body.limit) || 20)));
    const sortBy = body.sortBy ?? 'relevance';

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

    // Apply shared filters, sorting, pagination
    supabaseQuery = applyFilters(supabaseQuery, filters);
    supabaseQuery = applySorting(supabaseQuery, sortBy, !!(query && query.trim()));
    supabaseQuery = applyPagination(supabaseQuery, page, limit);

    const { data, error, count } = await supabaseQuery;

    if (error) {
      throw error;
    }

    // deno-lint-ignore no-explicit-any
    const lessons = (data || []).map((row: any) => transformRow(row));

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
      },
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
      },
    );
  }
});
