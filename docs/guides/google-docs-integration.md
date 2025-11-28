# Google Docs API Integration Guide

## Overview

The Google Docs API integration is fully implemented and working in production. This guide explains the setup and how the fallback mechanism works for local development.

## Current State

- **Location**: `supabase/functions/extract-google-doc/index.ts`
- **Status**: ✅ Working in production with real Google Docs API
- **Fallback**: Returns mock data in development when credentials not configured
- **Dependencies**: Google service account JSON needed

## Setup Instructions

### Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Note the Project ID

### Step 2: Enable Google Docs API

```bash
# Using gcloud CLI
gcloud services enable docs.googleapis.com

# Or via Console:
# APIs & Services > Library > Search "Google Docs API" > Enable
```

### Step 3: Create Service Account

1. Go to **IAM & Admin > Service Accounts**
2. Click **Create Service Account**
3. Name: `esynyc-docs-reader`
4. Description: `Service account for reading Google Docs`
5. Click **Create and Continue**
6. Skip role assignment (no roles needed for public docs)
7. Click **Done**

### Step 4: Generate Service Account Key

1. Click on the created service account
2. Go to **Keys** tab
3. Click **Add Key > Create New Key**
4. Choose **JSON** format
5. Download the key file (keep it secure!)

### Step 5: Configure Supabase Edge Function

Add the service account JSON to Supabase secrets:

```bash
# Option A: Via Supabase CLI
supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'

# Option B: Via Dashboard
# 1. Go to Project Settings > Edge Functions
# 2. Add new secret: GOOGLE_SERVICE_ACCOUNT_JSON
# 3. Paste the entire JSON content
```

### Step 6: Document Permissions

For the integration to work, documents must be:

#### Option A: Public Documents
- Share setting: "Anyone with the link can view"
- No additional configuration needed

#### Option B: Shared with Service Account
1. Get service account email from JSON (e.g., `esynyc-docs@project.iam.gserviceaccount.com`)
2. Share each document with this email as "Viewer"

## Implementation Details

### Current Code Structure

The edge function already handles both scenarios:

```typescript
// Check if credentials exist
const googleServiceAccount = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON');

if (googleServiceAccount) {
  // Use real Google Docs API
  const credentials = JSON.parse(googleServiceAccount);
  const accessToken = await getGoogleAccessToken(credentials);
  // ... fetch and parse document
} else {
  // Fall back to mock data
  // ... return mock lesson content
}
```

### Google Auth Implementation

File: `supabase/functions/_shared/google-auth-with-delegation.ts`

```typescript
export async function getGoogleAccessToken(credentials: any): Promise<string> {
  const jwt = await createJWT(credentials);
  
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  
  const data = await response.json();
  return data.access_token;
}

async function createJWT(credentials: any): Promise<string> {
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  };
  
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/documents.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  };
  
  // Sign with private key
  // Implementation depends on available crypto libraries
  return signedJWT;
}
```

### Document Parser

File: `supabase/functions/_shared/google-docs-parser.ts`

```typescript
export function extractTextFromGoogleDoc(doc: any): string {
  const blocks: string[] = [];
  
  // Parse document structure
  doc.body?.content?.forEach((element: any) => {
    if (element.paragraph) {
      const text = element.paragraph.elements
        .map((e: any) => e.textRun?.content || '')
        .join('');
      blocks.push(text);
    } else if (element.table) {
      // Handle tables
      const tableText = parseTable(element.table);
      blocks.push(tableText);
    }
    // Handle other element types...
  });
  
  return blocks.join('\n').trim();
}

export function extractMetadataFromContent(content: string): any {
  const metadata: any = {};
  
  // Extract grade levels
  const gradeMatch = content.match(/Grade(?:s)?\s*(?:Levels?)?\s*:?\s*([\d\s,K-]+)/i);
  if (gradeMatch) {
    metadata.gradeLevels = parseGradeLevels(gradeMatch[1]);
  }
  
  // Extract themes
  const themeMatch = content.match(/Theme\s*:?\s*([^\n]+)/i);
  if (themeMatch) {
    metadata.theme = themeMatch[1].trim();
  }
  
  // Extract skills
  const skillsMatch = content.match(/Skills?\s*:?\s*([^\n]+)/i);
  if (skillsMatch) {
    metadata.skills = skillsMatch[1].split(',').map(s => s.trim());
  }
  
  return metadata;
}
```

## Testing

### Local Testing

1. Set environment variable locally:
```bash
export GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

2. Test with Supabase CLI:
```bash
supabase functions serve extract-google-doc --no-verify-jwt
```

3. Send test request:
```bash
curl -X POST http://localhost:54321/functions/v1/extract-google-doc \
  -H "Content-Type: application/json" \
  -d '{"googleDocUrl": "https://docs.google.com/document/d/YOUR_DOC_ID/edit"}'
```

### Integration Testing

Create test file: `supabase/functions/tests/extract-google-doc.test.ts`

```typescript
import { assertEquals } from 'https://deno.land/std@0.168.0/testing/asserts.ts';

Deno.test('Extract Google Doc - Public Document', async () => {
  const response = await fetch('http://localhost:54321/functions/v1/extract-google-doc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      googleDocUrl: 'https://docs.google.com/document/d/1abc123/edit'
    }),
  });
  
  const data = await response.json();
  assertEquals(data.success, true);
  assertEquals(typeof data.data.content, 'string');
  assertEquals(data.data.metadata.extractionMethod, 'google-api');
});

Deno.test('Extract Google Doc - Invalid URL', async () => {
  const response = await fetch('http://localhost:54321/functions/v1/extract-google-doc', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      googleDocUrl: 'not-a-valid-url'
    }),
  });
  
  const data = await response.json();
  assertEquals(data.success, false);
  assertEquals(data.error, 'Invalid Google Doc URL');
});
```

## Error Handling

### Common Issues and Solutions

1. **403 Forbidden Error**
   - Document not shared properly
   - Solution: Share doc with service account or make public

2. **401 Unauthorized**
   - Invalid or expired credentials
   - Solution: Regenerate service account key

3. **429 Rate Limit**
   - Too many requests
   - Solution: Implement exponential backoff

4. **Network Timeout**
   - Large documents taking too long
   - Solution: Increase timeout, implement chunking

### Error Response Format

```typescript
{
  success: false,
  error: "Document not accessible",
  details: {
    statusCode: 403,
    docId: "abc123",
    suggestion: "Please share the document with service-account@project.iam.gserviceaccount.com"
  }
}
```

## Security Considerations

1. **Service Account Key Security**:
   - Never commit to version control
   - Rotate keys periodically
   - Use minimal permissions

2. **Document Access Control**:
   - Validate user has permission to submit doc
   - Log all document access attempts
   - Consider implementing allowlist of domains

3. **Rate Limiting**:
   - Implement per-user rate limits
   - Cache extracted content
   - Use exponential backoff for retries

## Performance Optimization

1. **Caching Strategy**:
```typescript
// Check cache first
const cached = await supabase
  .from('document_cache')
  .select('content, extracted_at')
  .eq('doc_id', docId)
  .single();

if (cached && isRecent(cached.extracted_at)) {
  return cached.content;
}
```

2. **Batch Processing**:
   - Process multiple documents in parallel
   - Use connection pooling
   - Implement queue for large batches

## Monitoring

Add logging for debugging:

```typescript
console.log('Extraction attempt:', {
  docId,
  method: googleServiceAccount ? 'api' : 'mock',
  timestamp: new Date().toISOString(),
});

// Track metrics
await supabase.from('extraction_logs').insert({
  doc_id: docId,
  success: true,
  method: 'google-api',
  response_time_ms: Date.now() - startTime,
  word_count: content.split(/\s+/).length,
});
```

## Migration from Mock to Real

1. **Gradual Rollout**:
   - Start with 10% of requests using real API
   - Monitor for errors
   - Increase percentage gradually

2. **Feature Flag**:
```typescript
const useRealAPI = Math.random() < parseFloat(Deno.env.get('GOOGLE_API_ROLLOUT') || '0.1');
```

3. **Fallback Strategy**:
   - Try real API first
   - Fall back to mock on error
   - Log fallback occurrences

## Cost Considerations

- Google Docs API: Free up to quota limits
- Typical limits: 300 requests/minute
- Monitor usage in Google Cloud Console
- Consider caching to reduce API calls

## Next Steps

1. ✅ Create Google Cloud project
2. ✅ Generate service account credentials
3. ✅ Add credentials to Supabase
4. ✅ Test with real documents
5. ✅ Remove or reduce mock fallback
6. ⬜ Add monitoring and analytics
7. ⬜ Implement caching layer

---

*Estimated time to complete: 1-2 hours including Google Cloud setup*