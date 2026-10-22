# Google Docs API Setup Guide

## Overview
Google Docs extraction is LIVE. `extract-google-doc` (submission intake) and `sync-drive-metadata` (daily Drive provenance refresh) authenticate as a Google Workspace service account using **domain-wide delegation**, impersonating a reader account inside the ESYNYC domain. This guide covers creating or rotating those credentials.

## Current State
- ✅ Real Docs API + Drive API reads via `_shared/google-auth-with-delegation.ts` (scopes `documents.readonly`, `drive.readonly`)
- ✅ Secrets: `GOOGLE_SERVICE_ACCOUNT_JSON` (service-account key JSON) and `GOOGLE_IMPERSONATE_EMAIL` (defaults to `docs-reader@esynyc.org`), set in Supabase edge-function secrets
- ✅ Without `GOOGLE_SERVICE_ACCOUNT_JSON` the function serves canned mock lessons — **local development only**; production returns real errors, never mock

## Setup Steps

### 1. Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Note your Project ID

### 2. Enable Google Docs API and Google Drive API
```bash
# Using gcloud CLI
gcloud services enable docs.googleapis.com
gcloud services enable drive.googleapis.com

# Or via Console:
# APIs & Services > Enable APIs > Search "Google Docs API" > Enable
# APIs & Services > Enable APIs > Search "Google Drive API" > Enable
```

### 3. Create Service Account
```bash
# Create service account
gcloud iam service-accounts create esnyc-docs-reader \
  --display-name="ESYNYC Docs Reader"

# Get the email
gcloud iam service-accounts list
```

#### 3b. Authorize domain-wide delegation
Google Workspace Admin console → Security → Access and data control → API controls → Domain-wide delegation → Add new → paste the service account's **Client ID** with scopes `https://www.googleapis.com/auth/documents.readonly,https://www.googleapis.com/auth/drive.readonly`. The impersonated account (`GOOGLE_IMPERSONATE_EMAIL`) must be a real user in the domain that can open the lesson docs.

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
npx supabase secrets set GOOGLE_IMPERSONATE_EMAIL=docs-reader@esynyc.org
```

Both `extract-google-doc` and `sync-drive-metadata` read these two secrets. Rotating the key = re-run step 4 + step 5; no redeploy is needed.

## How it works
- `_shared/google-auth-with-delegation.ts` — signs a service-account JWT with a `sub` claim (the impersonated user) and exchanges it for an access token
- `_shared/google-docs-parser.ts` — plain-text extraction from the Docs API document structure
- `_shared/google-drive-metadata.ts` — Drive provenance fields (id, MIME type, created/modified time only; deliberately no owners or permissions)
- `extract-google-doc/index.ts` — orchestration; metadata fetch is fail-soft, document fetch is not

## Testing
1. Create a test Google Doc
2. Share it with the impersonated reader account (or place it in a folder that account can read)
3. Test extraction with the doc ID

## Security Notes
- Never commit service account credentials
- Use Supabase secrets for production
- Consider document access permissions
- Rate limiting: 300 requests per minute per user
