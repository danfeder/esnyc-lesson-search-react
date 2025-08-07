import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// Configuration constants
const GEMINI_TOKEN_LIMIT = 2048; // Maximum tokens supported by Gemini embedding model
const GEMINI_MODEL_NAME = 'models/gemini-embedding-001';
const EMBEDDING_DIMENSIONS = 1536; // Optimal for quality and matches existing DB schema

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute window
const RATE_LIMIT_MAX_REQUESTS = 60; // Max 60 requests per minute

// Simple in-memory rate limiter (resets on function cold start)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Simple rate limiting based on IP address
    const clientIp = req.headers.get('x-forwarded-for') || 'unknown';
    const now = Date.now();

    // Check rate limit
    const clientData = requestCounts.get(clientIp);
    if (clientData) {
      if (now < clientData.resetTime) {
        if (clientData.count >= RATE_LIMIT_MAX_REQUESTS) {
          return new Response(
            JSON.stringify({
              error: 'Rate limit exceeded. Please try again later.',
              retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
            }),
            {
              status: 429,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json',
                'Retry-After': String(Math.ceil((clientData.resetTime - now) / 1000)),
              },
            }
          );
        }
        clientData.count++;
      } else {
        // Reset window
        clientData.count = 1;
        clientData.resetTime = now + RATE_LIMIT_WINDOW_MS;
      }
    } else {
      // First request from this client
      requestCounts.set(clientIp, {
        count: 1,
        resetTime: now + RATE_LIMIT_WINDOW_MS,
      });
    }

    // Clean up old entries to prevent memory leak
    if (requestCounts.size > 1000) {
      for (const [ip, data] of requestCounts.entries()) {
        if (now > data.resetTime) {
          requestCounts.delete(ip);
        }
      }
    }

    const { text, taskType = 'RETRIEVAL_DOCUMENT' } = await req.json();

    if (!text) {
      throw new Error('No text provided');
    }

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    // Call Gemini API to generate embeddings
    // Using gemini-embedding-001 model which is the newest
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: GEMINI_MODEL_NAME,
          content: {
            parts: [
              {
                text: text.slice(0, GEMINI_TOKEN_LIMIT),
              },
            ],
          },
          taskType: taskType, // Can be: RETRIEVAL_QUERY, RETRIEVAL_DOCUMENT, SEMANTIC_SIMILARITY, CLASSIFICATION, CLUSTERING
          outputDimensionality: EMBEDDING_DIMENSIONS,
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API error: ${error}`);
    }

    const data = await response.json();

    // Gemini returns the embedding in a different structure
    const embedding = data.embedding?.values;

    if (!embedding) {
      throw new Error('No embedding returned from Gemini API');
    }

    return new Response(JSON.stringify({ embedding, dimensions: embedding.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Gemini embedding error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
