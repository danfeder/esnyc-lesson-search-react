import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getRestrictedCorsHeaders } from '../_shared/cors.ts';

interface ProcessSubmissionRequest {
  googleDocUrl?: string;
  submissionType?: 'new' | 'update';
  originalLessonId?: string;
  submissionId?: string; // For regenerating embeddings
  regenerateEmbedding?: boolean; // Flag to only regenerate embedding
  debug?: boolean; // For debugging
  testOpenAI?: boolean; // For testing OpenAI connectivity
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getRestrictedCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Parse request body first to check if it's a regenerate request
    const requestBody = (await req.json()) as ProcessSubmissionRequest;
    const {
      googleDocUrl,
      submissionType,
      originalLessonId,
      submissionId,
      regenerateEmbedding,
      debug,
      testOpenAI,
    } = requestBody;

    // Debug mode to test OpenAI configuration (only allow in development)
    if (debug && testOpenAI) {
      // Restrict debug endpoint to development environment
      const isDevelopment = Deno.env.get('DENO_DEPLOYMENT_ID') === undefined;
      if (!isDevelopment) {
        throw new Error('Debug endpoint is only available in development');
      }

      const openAIKey = Deno.env.get('OPENAI_API_KEY');
      let keyStatus = 'not configured';
      let keyLength = 0;
      let apiTest = null;

      if (openAIKey) {
        keyLength = openAIKey.length;
        keyStatus = 'configured';

        // Test the API
        try {
          const testResponse = await fetch('https://api.openai.com/v1/models', {
            headers: {
              Authorization: `Bearer ${openAIKey}`,
            },
          });

          apiTest = {
            status: testResponse.status,
            ok: testResponse.ok,
            statusText: testResponse.statusText,
          };

          if (!testResponse.ok) {
            const errorText = await testResponse.text();
            apiTest.error = errorText.substring(0, 200);
          }
        } catch (error) {
          apiTest = { error: error.message };
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          debug: true,
          openAIKeyStatus: keyStatus,
          keyLength,
          apiTest,
          timestamp: new Date().toISOString(),
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create service client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // If regenerating embeddings with service role key, skip user auth
    const token = authHeader.replace('Bearer ', '');
    const isServiceRole = token === supabaseServiceKey;

    let user: any = null;
    let supabaseClient: any;

    if (isServiceRole && regenerateEmbedding) {
      // Service role for embedding regeneration only
      supabaseClient = supabaseAdmin;
    } else {
      // Regular user flow - default to user's client with RLS
      supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      // Get user - need to pass the JWT token
      const {
        data: { user: authUser },
        error: userError,
      } = await supabaseClient.auth.getUser(token);
      if (userError || !authUser) throw new Error('Unauthorized');
      user = authUser;
    }

    let submission;
    let title: string;
    let content: string;

    // Handle regenerating embeddings for existing submissions
    if (regenerateEmbedding && submissionId) {
      console.log('[Regenerate] Processing existing submission:', submissionId);

      // Fetch existing submission
      const { data: existingSubmission, error: fetchError } = await supabaseAdmin
        .from('lesson_submissions')
        .select('*')
        .eq('id', submissionId)
        .single();

      if (fetchError || !existingSubmission) {
        throw new Error(`Submission not found: ${submissionId}`);
      }

      submission = existingSubmission;
      content = submission.extracted_content || '';

      // Extract title from content or use a default
      const titleMatch = content.match(/^#?\s*(.+)/);
      title = titleMatch ? titleMatch[1].trim() : 'Untitled Lesson';
    } else {
      // Normal flow: create new submission
      if (!googleDocUrl) {
        throw new Error('Google Doc URL is required for new submissions');
      }

      if (!user) {
        throw new Error('User authentication required for new submissions');
      }

      // Extract Google Doc ID
      const docIdMatch = googleDocUrl.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
      if (!docIdMatch) {
        throw new Error('Invalid Google Doc URL');
      }
      const googleDocId = docIdMatch[1];

      // Step 1: Create submission record
      const { data: newSubmission, error: submissionError } = await supabaseClient
        .from('lesson_submissions')
        .insert({
          teacher_id: user.id,
          google_doc_url: googleDocUrl,
          google_doc_id: googleDocId,
          submission_type: submissionType || 'new',
          original_lesson_id: originalLessonId,
          status: 'submitted',
        })
        .select()
        .single();

      if (submissionError) throw submissionError;
      submission = newSubmission;

      // Step 2: Extract content from Google Doc
      const extractResponse = await fetch(`${supabaseUrl}/functions/v1/extract-google-doc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ googleDocUrl }),
      });

      const extractResult = await extractResponse.json();
      if (!extractResult.success) {
        throw new Error('Failed to extract content');
      }

      title = extractResult.data.title;
      content = extractResult.data.content;

      // Step 3: Update submission with extracted content and title
      const { error: updateError } = await supabaseAdmin
        .from('lesson_submissions')
        .update({
          extracted_content: content,
          extracted_title: title,
        })
        .eq('id', submission.id);

      if (updateError) throw updateError;
    }

    // Step 4: Generate embedding
    let contentEmbedding = null;
    try {
      const openAIKey = Deno.env.get('OPENAI_API_KEY');
      if (!openAIKey) {
        console.warn('[OpenAI] OPENAI_API_KEY not configured, skipping embedding generation');
      } else {
        console.log('[OpenAI] Generating embedding for submission:', submission.id);
        const startTime = Date.now();

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

        const responseTime = Date.now() - startTime;
        console.log(
          `[OpenAI] Response received in ${responseTime}ms - Status: ${embeddingResponse.status}`
        );

        if (embeddingResponse.ok) {
          const embeddingData = await embeddingResponse.json();
          contentEmbedding = embeddingData.data[0].embedding;

          console.log(
            `[OpenAI] Embedding generated successfully - Dimensions: ${contentEmbedding.length}`
          );

          // Store embedding in submission
          const vectorString = `[${contentEmbedding.join(',')}]`;
          const { error: updateError } = await supabaseAdmin
            .from('lesson_submissions')
            .update({ content_embedding: vectorString })
            .eq('id', submission.id);

          if (updateError) {
            console.error('[OpenAI] Failed to store embedding:', updateError);
          } else {
            console.log('[OpenAI] Embedding stored successfully for submission:', submission.id);
          }
        } else {
          // Log detailed error information
          const errorText = await embeddingResponse.text();
          console.error('[OpenAI] API error:', {
            status: embeddingResponse.status,
            statusText: embeddingResponse.statusText,
            error: errorText,
            submissionId: submission.id,
          });
        }
      }
    } catch (error) {
      console.error('[OpenAI] Embedding generation failed:', {
        error: error.message,
        stack: error.stack,
        submissionId: submission.id,
      });
      // Continue without embedding
    }

    // Skip duplicate detection if we're just regenerating embeddings
    if (!regenerateEmbedding) {
      // Step 5: Detect duplicates
      const duplicateResponse = await fetch(`${supabaseUrl}/functions/v1/detect-duplicates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({
          submissionId: submission.id,
          content,
          title,
          metadata: {}, // Would extract from content in production
          embedding: contentEmbedding,
        }),
      });

      const duplicateResult = await duplicateResponse.json();
      if (!duplicateResult.success) {
        console.error('Duplicate detection failed:', duplicateResult.error);
      }

      // Step 6: Update submission with content hash
      if (duplicateResult.data?.contentHash) {
        await supabaseAdmin
          .from('lesson_submissions')
          .update({
            content_hash: duplicateResult.data.contentHash,
          })
          .eq('id', submission.id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            submissionId: submission.id,
            status: submission.status,
            extractedTitle: title,
            duplicatesFound: duplicateResult.data?.duplicatesFound || 0,
            topDuplicates: duplicateResult.data?.duplicates?.slice(0, 3) || [],
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    } else {
      // Return simple success for embedding regeneration
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            submissionId: submission.id,
            embeddingGenerated: contentEmbedding !== null,
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }
  } catch (error) {
    console.error('Process submission error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
