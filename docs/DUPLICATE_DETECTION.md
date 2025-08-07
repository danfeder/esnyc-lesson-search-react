# Duplicate Detection System

## Overview

The ESYNYC Lesson Search system uses a multi-layered approach to detect duplicate lessons:
1. **Content Hash Matching** - SHA256 hash of normalized lesson content
2. **Embedding Similarity** - Cosine similarity of OpenAI embeddings
3. **Metadata Comparison** - Title, grade levels, and theme matching

## Content Hash Generation

### Current Implementation (FIXED August 7, 2025)

Content hashes are generated from the actual lesson content, not just metadata:

```javascript
function generateContentHash(content, metadata = {}) {
  // Primary: Use actual content if available
  if (content && content.trim().length > 0) {
    const normalizedContent = content
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
    
    return crypto.createHash('sha256')
      .update(normalizedContent)
      .digest('hex');
  }
  
  // Fallback: Use metadata with META_ prefix
  const metadataParts = [
    metadata.title?.toLowerCase().trim() || '',
    metadata.summary?.toLowerCase().trim() || '',
    (metadata.grade_levels || []).sort().join(',')
  ];
  
  const metadataString = metadataParts.filter(part => part).join('|');
  const hash = crypto.createHash('sha256')
    .update(metadataString)
    .digest('hex');
  
  return 'META_' + hash;
}
```

### Hash Types

1. **Content-based hash** (default)
   - Generated from normalized lesson content text
   - Format: `[64-character hex string]`
   - Example: `a1b2c3d4e5f6...`

2. **Metadata-only hash** (fallback)
   - Generated when content extraction fails
   - Format: `META_[64-character hex string]`
   - Example: `META_a1b2c3d4e5f6...`

## Edge Functions

### detect-duplicates

Located at: `supabase/functions/detect-duplicates/index.ts`

Triggered when a new lesson is submitted to check for existing duplicates:

```typescript
interface DuplicateCheckRequest {
  submissionId: string;
  content: string;
  title: string;
  grade_levels?: string[];
  summary?: string;
}

interface DuplicateCheckResponse {
  hasDuplicates: boolean;
  duplicates: Array<{
    lesson_id: string;
    title: string;
    similarity_score: number;
    match_type: 'hash' | 'embedding' | 'metadata';
  }>;
}
```

### process-submission

Located at: `supabase/functions/process-submission/index.ts`

Processes approved lesson submissions and generates proper content hashes.

## Duplicate Detection Thresholds

- **Hash Match**: Exact match (100% duplicate)
- **Embedding Similarity**: > 0.95 cosine similarity
- **Title Match**: Exact match after normalization
- **Combined Score**: Weighted average of all signals

## Database Schema

### lessons table
```sql
content_hash TEXT -- SHA256 hash of content or META_ prefixed hash
embedding VECTOR(1536) -- OpenAI text-embedding-3-small
```

### duplicate_pairs table
```sql
lesson_id_1 TEXT
lesson_id_2 TEXT
similarity_score FLOAT
match_type TEXT -- 'hash', 'embedding', or 'combined'
detected_at TIMESTAMP
```

## Testing Duplicate Detection

### Manual Test
```bash
# Test with sample content
curl -X POST \
  ${SUPABASE_URL}/functions/v1/detect-duplicates \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "submissionId": "test-123",
    "content": "Sample lesson content here...",
    "title": "Test Lesson",
    "grade_levels": ["3", "4", "5"]
  }'
```

### Automated Test
```bash
npm run test:edge-functions
```

## Known Issues & Solutions

### Issue: Metadata-only hashes causing false positives
**Status**: ✅ FIXED (August 7, 2025)
**Solution**: Now using actual content for hash generation

### Issue: Incomplete content extraction
**Status**: ⚠️ PARTIAL (28 lessons remaining)
**Solution**: Using public URL extraction as fallback

### Issue: Embedding generation failures
**Status**: 🔄 IN PROGRESS
**Solution**: Retry logic and fallback to hash-only matching

## Monitoring

Check for duplicate detection issues:

```sql
-- Find lessons with META_ prefixed hashes
SELECT lesson_id, title, content_hash
FROM lessons
WHERE content_hash LIKE 'META_%';

-- Find potential duplicates not caught
SELECT 
  l1.lesson_id as id1,
  l2.lesson_id as id2,
  l1.title,
  l2.title,
  1 - (l1.embedding <=> l2.embedding) as similarity
FROM lessons l1
CROSS JOIN lessons l2
WHERE l1.lesson_id < l2.lesson_id
  AND 1 - (l1.embedding <=> l2.embedding) > 0.95
  AND l1.content_hash != l2.content_hash;
```

## Best Practices

1. **Always extract content first** - Never generate hash without attempting content extraction
2. **Use META_ prefix** - Clear indicator when falling back to metadata
3. **Log extraction failures** - Monitor and fix content extraction issues
4. **Test with edge cases** - Empty content, special characters, different formats
5. **Regular audits** - Check for META_ hashes and fix extraction

## Recent Improvements (August 2025)

1. ✅ Fixed hash generation to use actual content
2. ✅ Added META_ prefix for metadata-only fallbacks
3. ✅ Improved content extraction for Google Docs
4. ✅ Updated edge functions with new logic
5. ✅ Resolved 18 false positive duplicates
6. ✅ Identified 10 previously missed duplicates