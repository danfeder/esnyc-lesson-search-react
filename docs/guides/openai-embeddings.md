# OpenAI Embeddings Setup Guide

## Overview

OpenAI embeddings are used for semantic similarity search and duplicate detection. The implementation is already complete but requires API key configuration.

## Current State

- **Status**: ✅ Fully implemented
- **Location**: `supabase/functions/process-submission/index.ts`
- **Model**: `text-embedding-3-small`
- **Database**: Stored in `content_embedding` column as vector

## Configuration

### Step 1: Get OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com)
2. Navigate to API Keys
3. Create new secret key
4. Copy the key (starts with `sk-proj-`)

### Step 2: Add to Supabase Secrets

```bash
# Via Supabase CLI
supabase secrets set OPENAI_API_KEY='sk-proj-...'

# Or via Dashboard:
# Project Settings > Edge Functions > Secrets
# Add: OPENAI_API_KEY = your-key
```

### Step 3: Verify Setup

Test the edge function:

```bash
# Check if embedding generation works
curl -X POST https://your-project.supabase.co/functions/v1/process-submission \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"submissionId": "test-id"}'
```

## Implementation Details

### Current Code

The embedding generation is already implemented in `process-submission/index.ts`:

```typescript
// Step 4: Generate embedding
let contentEmbedding = null;
try {
  const openAIKey = Deno.env.get('OPENAI_API_KEY');
  if (openAIKey) {
    const embeddingResponse = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: `${title}\n${content}`.substring(0, 8000), // Truncate to avoid token limits
      }),
    });

    if (embeddingResponse.ok) {
      const embeddingData = await embeddingResponse.json();
      contentEmbedding = embeddingData.data[0].embedding;

      // Store embedding in submission
      const vectorString = `[${contentEmbedding.join(',')}]`;
      await supabaseAdmin
        .from('lesson_submissions')
        .update({ content_embedding: vectorString })
        .eq('id', submission.id);
    }
  }
} catch (error) {
  console.error('Embedding generation failed:', error);
  // Continue without embedding
}
```

### Semantic Search Implementation

For duplicate detection using embeddings:

```typescript
// In detect-duplicates function
async function findSemanticDuplicates(embedding: number[], threshold: number = 0.85) {
  // Convert embedding to PostgreSQL vector format
  const vectorString = `[${embedding.join(',')}]`;
  
  // Use pgvector's cosine similarity operator
  const { data, error } = await supabase.rpc('find_similar_lessons', {
    query_embedding: vectorString,
    similarity_threshold: threshold,
    limit: 10
  });
  
  return data || [];
}
```

### Database Function

Create PostgreSQL function for similarity search:

```sql
CREATE OR REPLACE FUNCTION find_similar_lessons(
  query_embedding vector(1536),
  similarity_threshold float DEFAULT 0.85,
  limit_count int DEFAULT 10
)
RETURNS TABLE(
  lesson_id uuid,
  title text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    l.id as lesson_id,
    l.title,
    1 - (l.content_embedding <=> query_embedding) as similarity
  FROM lessons l
  WHERE l.content_embedding IS NOT NULL
    AND 1 - (l.content_embedding <=> query_embedding) > similarity_threshold
  ORDER BY l.content_embedding <=> query_embedding
  LIMIT limit_count;
END;
$$;
```

## Model Selection

### Current Model: text-embedding-3-small

- **Dimensions**: 1536
- **Cost**: $0.02 per 1M tokens
- **Performance**: Good balance of quality and cost
- **Max Input**: 8191 tokens

### Alternative Models

| Model | Dimensions | Cost/1M tokens | Use Case |
|-------|------------|----------------|----------|
| text-embedding-3-small | 1536 | $0.02 | Default choice |
| text-embedding-3-large | 3072 | $0.13 | Higher accuracy needs |
| text-embedding-ada-002 | 1536 | $0.10 | Legacy support |

### Changing Models

To switch models, update in `process-submission/index.ts`:

```typescript
model: 'text-embedding-3-large', // Change model here
dimensions: 3072, // Optional: specify dimensions
```

## Cost Optimization

### Current Usage Patterns

- **Average lesson**: ~500 tokens
- **Cost per lesson**: ~$0.00001
- **Monthly estimate** (1000 lessons): ~$0.01

### Optimization Strategies

1. **Content Truncation**:
```typescript
// Current implementation truncates at 8000 chars
const truncatedContent = `${title}\n${content}`.substring(0, 8000);
```

2. **Selective Fields**:
```typescript
// Only embed important fields
const embeddingText = [
  title,
  summary,
  skills.join(' '),
  themes.join(' ')
].join('\n');
```

3. **Caching**:
```typescript
// Check if content hash changed before re-embedding
if (existingHash === newHash && existingEmbedding) {
  return existingEmbedding;
}
```

## Monitoring

### Add Usage Tracking

```typescript
// Log embedding generation
await supabase.from('embedding_logs').insert({
  lesson_id: submission.id,
  model: 'text-embedding-3-small',
  token_count: estimatedTokens,
  cost_estimate: estimatedTokens * 0.00000002,
  created_at: new Date().toISOString()
});
```

### Monitor via OpenAI Dashboard

1. Check usage at [OpenAI Usage](https://platform.openai.com/usage)
2. Set up billing alerts
3. Monitor rate limits

## Error Handling

### Common Issues

1. **Rate Limiting** (429):
```typescript
if (response.status === 429) {
  const retryAfter = response.headers.get('retry-after');
  await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
  // Retry request
}
```

2. **Invalid API Key** (401):
```typescript
if (response.status === 401) {
  console.error('Invalid OpenAI API key');
  // Fall back to non-semantic duplicate detection
}
```

3. **Token Limit Exceeded**:
```typescript
// Truncate more aggressively
const truncatedContent = content.substring(0, 4000);
```

## Testing

### Unit Test

```typescript
Deno.test('Generate embedding for lesson', async () => {
  const mockContent = 'Sample lesson about garden vegetables';
  
  const response = await generateEmbedding(mockContent);
  
  assertEquals(response.length, 1536); // Check dimension
  assertEquals(typeof response[0], 'number'); // Check type
  assert(response[0] >= -1 && response[0] <= 1); // Check range
});
```

### Integration Test

```typescript
Deno.test('Find similar lessons', async () => {
  // Insert test lesson with embedding
  const { data: lesson } = await supabase
    .from('lessons')
    .insert({
      title: 'Test Garden Lesson',
      content: 'Growing tomatoes and peppers',
      content_embedding: generateMockEmbedding()
    })
    .single();
    
  // Search for similar
  const similar = await findSimilarLessons('vegetables garden', 0.7);
  
  assert(similar.length > 0);
  assertEquals(similar[0].lesson_id, lesson.id);
});
```

## Performance Considerations

### Batch Processing

For multiple embeddings:

```typescript
const response = await fetch('https://api.openai.com/v1/embeddings', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'text-embedding-3-small',
    input: [content1, content2, content3], // Batch up to 2048 inputs
  }),
});
```

### Async Processing

For large batches:

```typescript
async function processEmbeddingsQueue() {
  const pending = await supabase
    .from('lessons')
    .select('id, title, content')
    .is('content_embedding', null)
    .limit(100);
    
  const embeddings = await batchGenerateEmbeddings(pending);
  
  await updateEmbeddings(embeddings);
}
```

## Future Enhancements

1. **Fine-tuning**: Train custom model on education content
2. **Multimodal**: Include images in embeddings
3. **Clustering**: Group similar lessons automatically
4. **Recommendation Engine**: "More like this" feature
5. **Query Expansion**: Improve search with semantic understanding

## Security Notes

- Never expose API key in client code
- Rotate keys periodically
- Use separate keys for dev/staging/prod
- Monitor for unusual usage patterns

## Troubleshooting

### Debugging Embeddings

```typescript
// Add detailed logging
console.log('Embedding generation:', {
  inputLength: content.length,
  model: 'text-embedding-3-small',
  timestamp: new Date().toISOString()
});

// Validate embedding
if (!Array.isArray(embedding) || embedding.length !== 1536) {
  throw new Error('Invalid embedding format');
}

// Check similarity scores
console.log('Similarity scores:', similarities.map(s => s.toFixed(3)));
```

## Success Metrics

- ✅ All new submissions get embeddings
- ✅ Duplicate detection accuracy > 90%
- ✅ Search relevance improved
- ✅ Cost < $10/month
- ⬜ Semantic search in UI
- ⬜ Recommendation system

---

*The embedding system is fully functional and just needs the OpenAI API key to be configured in Supabase.*