# Edge Functions Guidelines

## Function Pattern

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getRestrictedCorsHeaders } from '../_shared/cors.ts';
import { timingSafeEqual } from '../_shared/timing-safe-equal.ts';

serve(async (req) => {
  // Origin-restricted CORS (see _shared/cors.ts) — do NOT use a literal '*'.
  const origin = req.headers.get('origin');
  const corsHeaders = getRestrictedCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // AUTH GATE (mandatory for any function deployed with --no-verify-jwt):
    // the service-role client bypasses RLS, so the function MUST do its own
    // in-code auth. Accept the service-role key (constant-time compare) for
    // server-to-server callers, OR an authenticated user with the right role.
    // Canonical example: extract-google-doc/index.ts:42-60.
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const token = authHeader.replace('Bearer ', '');
    const tokenBytes = new TextEncoder().encode(token);
    const keyBytes = new TextEncoder().encode(supabaseServiceKey);
    const isServiceRole =
      tokenBytes.length === keyBytes.length &&
      timingSafeEqual(tokenBytes, keyBytes);
    if (!isServiceRole) {
      const { data: { user }, error: authError } = await supabase.auth.getUser(token);
      if (authError || !user) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid authentication token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      // ...then check the user's role (e.g. reviewer/admin) as the function requires.
    }

    const { data } = await req.json();
    // Function logic

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

## Key Rules

- Use origin-restricted CORS via `getRestrictedCorsHeaders(origin)` from `../_shared/cors.ts` — never a literal `'*'`. Include the headers in ALL responses (including OPTIONS).
- **Auth-gate in-code.** All functions deploy with `--no-verify-jwt`, so the platform does NOT authenticate the caller for you. Any function that uses the service-role key (which bypasses RLS) MUST gate access itself: constant-time-compare the bearer token against the service-role key for server-to-server callers, OR verify a user token + role. Canonical example: `extract-google-doc/index.ts:42-60`.
- Use `Deno.env.get()` for secrets
- Return JSON errors with proper status codes

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
| RLS policy violation | The service-role key bypasses RLS — but because it does, the function MUST run its own in-code auth gate (see Key Rules). Do NOT reach for the service-role key as a way to skip authentication. |
| `crypto.subtle.timingSafeEqual is not a function` | Deno 2 (now the hosted edge runtime) removed the non-standard Deno-1 API. Use the shared `timingSafeEqual` from `../_shared/timing-safe-equal.ts` instead. |
