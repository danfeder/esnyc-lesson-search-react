# Google Docs API Setup Guide

## Overview
This guide explains how to implement real Google Docs extraction when ready to move beyond the mock implementation.

## Current State
- ✅ Mock implementation provides realistic lesson content
- ✅ Edge Function checks for `GOOGLE_SERVICE_ACCOUNT_JSON` environment variable
- ✅ Structure is ready for real API integration

## Setup Steps

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Note your Project ID

### 2. Enable Google Docs API
```bash
# Using gcloud CLI
gcloud services enable docs.googleapis.com

# Or via Console:
# APIs & Services > Enable APIs > Search "Google Docs API" > Enable
```

### 3. Create Service Account
```bash
# Create service account
gcloud iam service-accounts create esnyc-docs-reader \
  --display-name="ESYNYC Docs Reader"

# Get the email
gcloud iam service-accounts list
```

### 4. Generate Service Account Key
```bash
gcloud iam service-accounts keys create credentials.json \
  --iam-account=esnyc-docs-reader@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

### 5. Add to Supabase Secrets
```bash
# Read the credentials file
cat credentials.json

# Add to Supabase (copy entire JSON)
npx supabase secrets set GOOGLE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}'
```

## Implementation Code

Replace the TODO section in `extract-google-doc/index.ts`:

```typescript
if (googleServiceAccount) {
  try {
    const credentials = JSON.parse(googleServiceAccount);
    
    // Get access token using service account
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: await createJWT(credentials)
      })
    });
    
    const { access_token } = await tokenResponse.json();
    
    // Get document content
    const docResponse = await fetch(
      `https://docs.googleapis.com/v1/documents/${docId}`,
      {
        headers: {
          'Authorization': `Bearer ${access_token}`
        }
      }
    );
    
    const doc = await docResponse.json();
    
    // Extract text content
    const content = extractTextFromDoc(doc);
    
    return new Response(
      JSON.stringify({
        success: true,
        data: {
          docId,
          title: doc.title,
          content,
          extractedAt: new Date().toISOString(),
          metadata: {
            wordCount: content.split(/\s+/).length,
            extractionMethod: 'google-api',
            hasImages: doc.inlineObjects ? Object.keys(doc.inlineObjects).length > 0 : false
          }
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Google Docs API error:', error);
    // Fall back to mock
  }
}
```

## Helper Functions Needed

```typescript
// Create JWT for service account authentication
async function createJWT(credentials: any): Promise<string> {
  // Implementation needed
  // Use a JWT library or implement manually
}

// Extract plain text from Google Doc structure
function extractTextFromDoc(doc: any): string {
  let text = '';
  
  if (doc.body?.content) {
    for (const element of doc.body.content) {
      if (element.paragraph?.elements) {
        for (const textRun of element.paragraph.elements) {
          if (textRun.textRun?.content) {
            text += textRun.textRun.content;
          }
        }
      }
    }
  }
  
  return text.trim();
}
```

## Alternative: OAuth2 Flow
For user-owned documents, implement OAuth2:
1. User authorizes app to access their Google Docs
2. Store refresh token
3. Use refresh token to get access token
4. Access documents on behalf of user

## Testing
1. Create a test Google Doc
2. Make it publicly readable OR share with service account email
3. Test extraction with the doc ID

## Security Notes
- Never commit service account credentials
- Use Supabase secrets for production
- Consider document access permissions
- Rate limiting: 300 requests per minute per user