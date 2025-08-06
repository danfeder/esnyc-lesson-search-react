#!/usr/bin/env npx tsx
/**
 * Test the edge function directly to debug OpenAI issues
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function testEdgeFunction() {
  console.log('🧪 Testing edge function debug endpoint...\n');

  // Create a test edge function to check OpenAI key
  const testFunction = `
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    
    // Test the key
    let keyStatus = 'not configured';
    let apiTest = null;
    
    if (openAIKey) {
      keyStatus = \`configured (starts with: \${openAIKey.substring(0, 7)}...)\`;
      
      // Try to actually use the API
      const testResponse = await fetch('https://api.openai.com/v1/models', {
        headers: {
          'Authorization': \`Bearer \${openAIKey}\`,
        },
      });
      
      apiTest = {
        status: testResponse.status,
        ok: testResponse.ok,
      };
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        openAIKeyStatus: keyStatus,
        apiTest,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
  `;

  // We can't create a new function dynamically, so let's test the existing one
  // with a special debug flag
  console.log('📡 Calling process-submission with debug flag...');

  const { data, error } = await supabase.functions.invoke('process-submission', {
    body: {
      debug: true,
      testOpenAI: true,
    },
  });

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('📊 Response:', JSON.stringify(data, null, 2));
  }
}

testEdgeFunction().catch(console.error);
