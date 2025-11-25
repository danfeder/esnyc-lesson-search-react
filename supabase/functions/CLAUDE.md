# Edge Functions Guidelines

## Function Pattern

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data } = await req.json();
    // Function logic

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

## Key Rules

- Include CORS headers in ALL responses (including OPTIONS)
- Use `Deno.env.get()` for secrets
- Return JSON errors with proper status codes
- Use service role key for admin operations

## Available Functions

| Function | Status | Notes |
|----------|--------|-------|
| `extract-google-doc` | Working | Needs GOOGLE_SERVICE_ACCOUNT_JSON |
| `detect-duplicates` | Working | Falls back to text similarity |
| `process-submission` | Working | Generates embeddings with OPENAI_API_KEY |
| `send-email` | Working | Needs RESEND_API_KEY |

## Local Testing

```bash
supabase functions serve <name> --no-verify-jwt

curl -X POST 'http://localhost:54321/functions/v1/<name>' \
  -H 'Content-Type: application/json' \
  -d '{}'
```

## Common Errors

| Error | Fix |
|-------|-----|
| CORS error | Add corsHeaders to ALL responses |
| JWT verification failed | Use `--no-verify-jwt` locally |
| RLS policy violation | Use service role key |
