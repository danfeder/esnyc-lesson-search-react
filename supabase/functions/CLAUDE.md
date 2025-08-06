# Edge Functions Development

## ⚠️ CRITICAL RULES

1. **CORS Headers** - YOU MUST include CORS headers in ALL responses
2. **Error Responses** - ALWAYS return proper JSON error responses
3. **Environment Variables** - NEVER hardcode secrets, use `Deno.env.get()`
4. **JWT Verification** - Skip with `--no-verify-jwt` for local testing ONLY
5. **Service Role Key** - NEVER expose in frontend, edge functions only

## 🚀 Edge Function Pattern

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // ALWAYS handle OPTIONS for CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get environment variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for server operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Parse request
    const { data } = await req.json();
    
    // Function logic here
    
    // Return success response
    return new Response(
      JSON.stringify({ success: true, data: result }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  } catch (error) {
    // ALWAYS return proper error response
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
```

## 🐛 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| "CORS error" | Add corsHeaders to ALL responses including OPTIONS |
| "JWT verification failed" | Use `--no-verify-jwt` for local testing |
| "Environment variable undefined" | Check `.env` file and Supabase dashboard |
| "Cannot find module" | Use full URLs for Deno imports |
| "RLS policy violation" | Use service role key for admin operations |
| "Function timeout" | Implement request timeout (max 150s) |

## 🔧 Function-Specific Issues

### extract-google-doc
```typescript
// ⚠️ CURRENTLY MOCKED - Returns fake data
// TODO: Implement when GOOGLE_SERVICE_ACCOUNT_JSON available

// Mock response structure
return new Response(
  JSON.stringify({
    content: "Mock lesson content...",
    title: "Mock Lesson Title",
    metadata: { /* mock metadata */ }
  }),
  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
);

// Future implementation needs:
// 1. GOOGLE_SERVICE_ACCOUNT_JSON env var
// 2. Google Docs API client
// 3. Document parsing logic
```

### detect-duplicates
```typescript
// Common issue: Content hash mismatch
// Solution: Normalize content before hashing
const normalizedContent = content
  .toLowerCase()
  .replace(/\s+/g, ' ')
  .trim();

// Common issue: Embedding comparison fails
// Solution: Check if embeddings exist
if (!embedding || embedding.length === 0) {
  console.warn('No embedding provided, skipping semantic search');
  // Fall back to text-based comparison
}
```

### process-submission
```typescript
// ⚠️ OpenAI embeddings COMMENTED OUT
// Uncomment when OPENAI_API_KEY available

// Currently disabled:
// const embedding = await generateEmbedding(content);

// Temporary workaround:
const embedding = null; // Will skip semantic search
```

### send-email
```typescript
// Common issue: Email not sending
// Check: RESEND_API_KEY environment variable

// Template pattern
const emailHtml = getEmailTemplate({
  recipientName: user.full_name,
  actionUrl: `${SITE_URL}/action/${token}`,
  ...templateData
});

// Error handling
if (!RESEND_API_KEY) {
  console.error('RESEND_API_KEY not configured');
  // Return success anyway (don't break flow)
  return new Response(
    JSON.stringify({ success: true, emailSkipped: true }),
    { headers: corsHeaders }
  );
}
```

## 🧪 Local Testing

```bash
# Serve single function
supabase functions serve detect-duplicates --no-verify-jwt

# Test with curl
curl -i --location --request POST \
  'http://localhost:54321/functions/v1/detect-duplicates' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"submissionId":"123","content":"test","title":"Test"}'

# Debug mode
supabase functions serve detect-duplicates --debug --no-verify-jwt
```

## 📦 Deployment

```bash
# Deploy single function
supabase functions deploy detect-duplicates

# Deploy all functions
supabase functions deploy

# Check deployment status
supabase functions list

# View logs
supabase functions logs detect-duplicates
```

## ⚠️ Security Checklist

- [ ] NEVER expose service role key in frontend
- [ ] Always validate input data
- [ ] Use parameterized queries (Supabase handles this)
- [ ] Implement rate limiting for public endpoints
- [ ] Log errors but don't expose sensitive data
- [ ] Use HTTPS for all external API calls
- [ ] Verify JWT claims for user operations

## 🔑 Environment Variables

```typescript
// Required for all functions
SUPABASE_URL              // Your Supabase project URL
SUPABASE_ANON_KEY         // Public anon key
SUPABASE_SERVICE_ROLE_KEY // Admin key (functions only!)

// Function-specific
OPENAI_API_KEY            // For embeddings (not yet active)
GOOGLE_SERVICE_ACCOUNT_JSON // For Google Docs (not yet active)
RESEND_API_KEY            // For email sending
SITE_URL                  // For email links
```

## 📊 Performance Tips

1. **Batch Operations**: Use `.insert()` with arrays
2. **Limit Responses**: Use `.select()` with specific columns
3. **Connection Pooling**: Reuse Supabase client
4. **Streaming**: Use streams for large responses
5. **Caching**: Implement response caching where appropriate
6. **Timeouts**: Set reasonable timeouts (default 150s max)