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

interface SearchRequest {
  query?: string;
  filters?: SearchFilters & {
    // Legacy field names from older clients
    thematicCategory?: string[];
    season?: string[];
  };
  page?: number;
  limit?: number;
  sortBy?: SortBy;
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
      },
    );

    const body: SearchRequest = await req.json();
    const query = body.query;
    const rawFilters = body.filters ?? {};
    const page = Math.max(1, Math.floor(Number(body.page) || 1));
    const limit = Math.min(100, Math.max(1, Math.floor(Number(body.limit) || 20)));
    const sortBy = body.sortBy ?? 'relevance';

    // Normalise legacy filter names to canonical ones
    const filters: SearchFilters = {
      ...rawFilters,
      thematicCategories: rawFilters.thematicCategories ?? rawFilters.thematicCategory,
      seasons: rawFilters.seasons ?? rawFilters.season,
    };

    // Build the base query
    let supabaseQuery = supabaseClient
      .from('lessons_with_metadata')
      .select('*', { count: 'exact' });

    // Apply text search if query exists
    if (query && query.trim()) {
      const searchQuery = query
        .split(' ')
        .filter((term: string) => term.length > 0)
        .map((term: string) => `${term}:*`)
        .join(' & ');

      supabaseQuery = supabaseQuery.textSearch('search_vector', searchQuery);
    }

    // Apply shared filters, sorting, pagination
    supabaseQuery = applyFilters(supabaseQuery, filters);
    supabaseQuery = applySorting(supabaseQuery, sortBy);
    supabaseQuery = applyPagination(supabaseQuery, page, limit);

    const { data, error, count } = await supabaseQuery;

    if (error) {
      throw error;
    }

    // deno-lint-ignore no-explicit-any
    const lessons = (data || []).map((row: any) => transformRow(row));

    return new Response(
      JSON.stringify({
        lessons,
        totalCount: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
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
      },
    );
  }
});
