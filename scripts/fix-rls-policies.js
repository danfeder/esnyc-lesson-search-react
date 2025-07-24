import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

// Use service role key to run admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function fixRLSPolicies() {
  console.log('Fixing RLS policies for user_profiles table...');

  // Read the SQL file
  const sql = fs.readFileSync('./supabase/migrations/20250123_fix_user_profiles_rls.sql', 'utf8');

  try {
    // Execute the SQL
    const { data, error } = await supabase
      .rpc('exec_sql', {
        sql_query: sql,
      })
      .maybeSingle();

    if (error) {
      // If exec_sql doesn't exist, we'll need to use a different approach
      console.log('Direct SQL execution not available, using alternative approach...');

      // For now, let's just output the SQL for manual execution
      console.log('\nPlease run this SQL in the Supabase SQL editor:');
      console.log('=====================================');
      console.log(sql);
      console.log('=====================================');

      return;
    }

    console.log('RLS policies updated successfully!');
  } catch (err) {
    console.error('Error:', err);
  }

  // Test if we can now read profiles
  console.log('\nTesting profile reads...');
  const { data: profiles, error: readError } = await supabase.from('user_profiles').select('*');

  if (readError) {
    console.error('Still cannot read profiles:', readError);
  } else {
    console.log(`Successfully read ${profiles.length} profiles`);
  }
}

fixRLSPolicies().catch(console.error);
