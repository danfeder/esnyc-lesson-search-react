# Edge Functions Development

When working on Supabase Edge Functions, follow these patterns:

## Environment Variables
Access via `Deno.env.get()`:
```typescript
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
```

## Common Patterns

### CORS Headers
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

### Error Handling
```typescript
try {
  // Function logic
} catch (error) {
  return new Response(
    JSON.stringify({ error: error.message }),
    { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}
```

### Supabase Client
```typescript
const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_ANON_KEY') ?? '',
  { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
);
```

## Function-Specific Notes

### Google Docs Integration
- Currently returns mock data
- Real implementation needs: `GOOGLE_SERVICE_ACCOUNT_JSON`
- See `extract-google-doc/index.ts` for mock structure

### OpenAI Embeddings
- Currently commented out
- Uncomment after adding `OPENAI_API_KEY`
- Located in `smart-search` and `process-submission`

### Email Sending
- Requires `RESEND_API_KEY` in environment
- Templates in `send-email/*-template.ts`

## Local Testing
```bash
supabase functions serve <function-name> --no-verify-jwt
```

## Deployment
Functions auto-deploy on push to main branch