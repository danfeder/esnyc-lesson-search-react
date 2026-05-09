import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
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

type SynonymType = 'bidirectional' | 'oneway' | 'typo_correction';

interface SynonymRow {
  term: string;
  synonyms: string[];
  synonym_type: SynonymType;
}

async function fetchSynonyms(supabaseClient: SupabaseClient): Promise<SynonymRow[]> {
  const { data, error } = await supabaseClient
    .from('search_synonyms')
    .select('term, synonyms, synonym_type');
  if (error) throw error;
  return (data ?? []) as SynonymRow[];
}

function expandSearchTerms(query: string, synonyms: SynonymRow[]): string[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((term) => term.length > 0);
  const expandedTerms = new Set<string>();

  // Index synonyms by term and (for bidirectional) by their synonym values.
  const byTerm = new Map<string, SynonymRow[]>();
  const bidirectionalBySynonym = new Map<string, SynonymRow[]>();
  for (const row of synonyms) {
    const term = row.term.toLowerCase();
    if (!byTerm.has(term)) byTerm.set(term, []);
    byTerm.get(term)!.push(row);
    if (row.synonym_type === 'bidirectional') {
      for (const syn of row.synonyms) {
        const key = syn.toLowerCase();
        if (!bidirectionalBySynonym.has(key)) bidirectionalBySynonym.set(key, []);
        bidirectionalBySynonym.get(key)!.push(row);
      }
    }
  }

  for (const term of terms) {
    expandedTerms.add(term);

    // Term match: any synonym_type folds in its synonyms list.
    for (const row of byTerm.get(term) ?? []) {
      for (const syn of row.synonyms) expandedTerms.add(syn.toLowerCase());
    }

    // Synonym match: only bidirectional rows fold back to the term and siblings.
    for (const row of bidirectionalBySynonym.get(term) ?? []) {
      expandedTerms.add(row.term.toLowerCase());
      for (const syn of row.synonyms) expandedTerms.add(syn.toLowerCase());
    }

    // Prefix variants for words >4 chars (preserves prior behavior).
    if (term.length > 4) {
      expandedTerms.add(term.substring(0, term.length - 1));
      expandedTerms.add(term + 's');
      if (term.endsWith('s')) {
        expandedTerms.add(term.substring(0, term.length - 1));
      }
    }
  }

  return Array.from(expandedTerms);
}

function buildSmartSearchQuery(query: string, synonyms: SynonymRow[]): string {
  const expandedTerms = expandSearchTerms(query, synonyms);

  // Create a tsquery that searches for any of the expanded terms
  // Use prefix matching (:*) for partial word matches
  const tsqueryParts = expandedTerms
    .map((term) => term.trim())
    .filter((term) => term.length > 0)
    .map((term) => `${term}:*`);

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
      .select('*', { count: 'exact' })
      // Exclude soft-retired imports from user-facing search.
      // The `lessons_with_metadata` view is intentionally not filtered;
      // detect-duplicates / get_lesson_details_for_review need to keep
      // seeing retired rows so reviewers catch future re-submissions.
      .is('retired_at', null);

    // Fetch synonyms once per request when there is a query to expand.
    // Filter-only requests skip the round-trip.
    const trimmedQuery = query?.trim();
    let synonyms: SynonymRow[] = [];
    let smartSearchQuery: string | null = null;

    if (trimmedQuery) {
      // Defensive: if the synonyms fetch fails (RLS misconfig, transient
      // pooler hiccup specific to search_synonyms), proceed with no
      // synonym expansion rather than returning a 500. Pre-refactor the
      // hardcoded TS dictionary made this path infallible; restoring the
      // resilience for the narrow misconfig case.
      try {
        synonyms = await fetchSynonyms(supabaseClient);
      } catch (synonymsErr) {
        console.error('smart-search fetchSynonyms failed; proceeding with no expansion:', synonymsErr);
      }
      smartSearchQuery = buildSmartSearchQuery(trimmedQuery, synonyms);
      console.log(`Original query: "${query}" -> Smart query: "${smartSearchQuery}"`);
      // Use the smart search query with full-text search
      supabaseQuery = supabaseQuery.textSearch('search_vector', smartSearchQuery);
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

    // Include search suggestions if no results found
    let suggestions: string[] = [];
    if (lessons.length === 0 && trimmedQuery) {
      const expandedTerms = expandSearchTerms(trimmedQuery, synonyms);
      suggestions = expandedTerms.slice(0, 5); // Limit to 5 suggestions
    }

    return new Response(
      JSON.stringify({
        lessons,
        totalCount: count || 0,
        page,
        totalPages: Math.ceil((count || 0) / limit),
        suggestions,
        expandedQuery: smartSearchQuery,
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
