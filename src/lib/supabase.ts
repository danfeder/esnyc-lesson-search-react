import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Set' : '✗ Missing');
  throw new Error('Missing Supabase environment variables');
}

// console.log('🔗 Supabase client initialized with URL:', supabaseUrl);

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Test the connection
supabase
  .from('lessons_with_metadata')
  .select('count', { count: 'exact', head: true })
  .then(({ error }) => {
    if (error) {
      console.error('❌ Supabase connection test failed:', error);
    }
    // else {
    //   console.log(`✅ Supabase connected successfully! Found ${count} lessons in database`);
    // }
  });
// Helper function for handling Supabase errors
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error);
  return {
    message: error.message || 'An unexpected error occurred',
    code: error.code || 'UNKNOWN_ERROR',
  };
};

// Helper function for building search queries
export const buildSearchQuery = (query: string) => {
  // Convert search query to tsquery format for full-text search
  return (
    query
      .split(' ')
      .filter((term) => term.length > 0)
      // Sanitize input to prevent SQL injection - allow only alphanumeric and basic punctuation
      .map((term) => term.replace(/[^a-zA-Z0-9\-\_\s]/g, '').trim())
      .filter((term) => term.length > 0) // Re-filter after sanitization
      .map((term) => `${term}:*`)
      .join(' & ')
  );
};
