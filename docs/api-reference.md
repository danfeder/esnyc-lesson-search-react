# ESYNYC Lesson Search API Reference

## Overview

This document provides a comprehensive reference for all Supabase Edge Functions in the ESYNYC Lesson Search application.

## Authentication

All edge functions use Supabase JWT authentication. Include the authorization header:
```
Authorization: Bearer <supabase-jwt-token>
```

## Edge Functions

### 1. Search Lessons

**Endpoint:** `/search-lessons`  
**Method:** POST  
**Description:** Advanced full-text search with filtering capabilities

#### Request Body
```typescript
{
  searchTerm?: string;           // Search query
  filters?: {
    activity_type?: string[];
    location?: string[];
    grade_levels?: string[];
    thematic_categories?: string[];
    season?: string[];
    include_year_round?: boolean;
    core_competencies?: string[];
    cultural_heritage?: string[];
    lesson_format?: string;
    academic_integration?: string[];
    sel_competencies?: string[];
    cooking_method?: string;
  };
  page?: number;                 // Default: 1
  limit?: number;                // Default: 20, Max: 100
}
```

#### Response
```typescript
{
  lessons: Lesson[];
  totalCount: number;
  page: number;
  totalPages: number;
}
```

### 2. Smart Search

**Endpoint:** `/smart-search`  
**Method:** POST  
**Description:** AI-enhanced search using embeddings (currently using mock similarity)

#### Request Body
```typescript
{
  query: string;                 // Natural language query
  limit?: number;                // Default: 10
  threshold?: number;            // Similarity threshold (0-1)
}
```

#### Response
```typescript
{
  results: {
    lesson: Lesson;
    similarity: number;
    relevance_explanation?: string;
  }[];
}
```

### 3. Process Submission

**Endpoint:** `/process-submission`  
**Method:** POST  
**Description:** Process new lesson submissions with content extraction

#### Request Body
```typescript
{
  submissionId: string;          // ID of submission to process
}
```

#### Response
```typescript
{
  success: boolean;
  message: string;
  processedData?: {
    title: string;
    content: string;
    metadata: object;
  };
}
```

### 4. Extract Google Doc

**Endpoint:** `/extract-google-doc`  
**Method:** POST  
**Description:** Extract content from Google Docs (production: real API, dev: mock fallback)

#### Request Body
```typescript
{
  docUrl: string;                // Google Doc URL
  docId?: string;                // Alternative: Doc ID
}
```

#### Response
```typescript
{
  title: string;
  content: string;
  extractedAt: string;
  metadata?: {
    lastModified?: string;
    author?: string;
  };
}
```

### 5. Detect Duplicates

**Endpoint:** `/detect-duplicates`  
**Method:** POST  
**Description:** Find potential duplicate lessons using similarity scoring

#### Request Body
```typescript
{
  lessonId?: string;             // Check specific lesson
  threshold?: number;            // Similarity threshold (0-1)
  limit?: number;                // Max duplicates to return
}
```

#### Response
```typescript
{
  duplicates: {
    lesson1_id: string;
    lesson2_id: string;
    similarity_score: number;
    comparison_details: {
      title_similarity: number;
      content_similarity: number;
      metadata_similarity: number;
    };
  }[];
}
```

### 6. User Management

**Endpoint:** `/user-management`  
**Method:** POST  
**Description:** Admin endpoint for user operations

#### Request Body
```typescript
{
  action: 'update_role' | 'deactivate' | 'reactivate';
  userId: string;
  data?: {
    role?: string;               // For update_role
    permissions?: string[];      // For update_role
  };
}
```

#### Response
```typescript
{
  success: boolean;
  user?: UserProfile;
  message?: string;
}
```

### 7. Invitation Management

**Endpoint:** `/invitation-management`  
**Method:** POST  
**Description:** Handle user invitations

#### Request Body
```typescript
{
  action: 'create' | 'resend' | 'cancel' | 'accept';
  data: {
    email?: string;              // For create
    role?: string;               // For create
    invitationId?: string;       // For resend/cancel
    token?: string;              // For accept
  };
}
```

#### Response
```typescript
{
  success: boolean;
  invitation?: Invitation;
  message?: string;
}
```

### 8. Send Email

**Endpoint:** `/send-email`  
**Method:** POST  
**Description:** Send transactional emails via Resend

#### Request Body
```typescript
{
  type: 'invitation' | 'role_changed' | 'submission_approved' | 'submission_rejected';
  to: string;
  data: {
    // Type-specific data
    inviteLink?: string;
    userName?: string;
    newRole?: string;
    submissionTitle?: string;
    rejectionReason?: string;
  };
}
```

#### Response
```typescript
{
  success: boolean;
  messageId?: string;
  error?: string;
}
```

### 9. Password Reset

**Endpoint:** `/password-reset`  
**Method:** POST  
**Description:** Initiate password reset flow

#### Request Body
```typescript
{
  email: string;
  redirectTo?: string;           // Custom redirect URL
}
```

#### Response
```typescript
{
  success: boolean;
  message: string;
}
```

### 10. Import Lessons

**Endpoint:** `/import-lessons`  
**Method:** POST  
**Description:** Bulk import lessons (admin only)

#### Request Body
```typescript
{
  lessons: Lesson[];             // Array of lesson objects
  mode?: 'append' | 'replace';   // Default: 'append'
}
```

#### Response
```typescript
{
  success: boolean;
  imported: number;
  failed: number;
  errors?: string[];
}
```

## Error Responses

All endpoints return errors in this format:
```typescript
{
  error: string;                 // Error message
  code?: string;                 // Error code
  status: number;                // HTTP status code
}
```

### Common Status Codes
- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

## Rate Limiting

Edge functions are rate-limited by Supabase:
- Anonymous requests: 100/hour
- Authenticated requests: 1000/hour

## CORS Configuration

Allowed origins are configured via environment variable:
- Development: `http://localhost:5173`
- Production: `https://app.esynyc.org`

## Environment Variables

Edge functions require these environment variables (set in Supabase dashboard):
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GOOGLE_SERVICE_ACCOUNT_JSON` (for Google Docs)
- `OPENAI_API_KEY` (for embeddings)
- `RESEND_API_KEY` (for emails)
- `PUBLIC_SITE_URL`
- `ALLOWED_ORIGINS`

## Testing Edge Functions

### Local Testing
```bash
# Start Supabase locally
supabase start

# Test function
curl -i --location --request POST 'http://localhost:54321/functions/v1/search-lessons' \
  --header 'Authorization: Bearer YOUR_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"searchTerm": "tomato"}'
```

### Production Testing
Replace localhost URL with your Supabase project URL.

## Implementation Notes

1. **Google Docs Integration**: Currently returns mock data. Real implementation requires:
   - Google Cloud service account
   - Docs API permissions
   - Proper error handling for rate limits

2. **OpenAI Embeddings**: Working in production. Requirements:
   - `OPENAI_API_KEY` environment variable (configured in production)
   - Uses `text-embedding-3-small` model for semantic similarity
   - Falls back gracefully if API fails

3. **Email Sending**: Requires Resend API key and verified domain

4. **Error Handling**: All functions include try-catch blocks and return appropriate error messages

5. **Performance**: Functions use connection pooling and are optimized for cold starts