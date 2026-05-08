import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import Anthropic from '@anthropic-ai/sdk';
import { getRestrictedCorsHeaders } from '../_shared/cors.ts';
import type { MetadataSketch } from '../_shared/google-docs-parser.ts';
import {
  ACTIVITY_TYPE_VALUES,
  CULTURAL_RESPONSIVENESS_FEATURE_VALUES,
  lessonMetadataSchema,
} from '../_shared/metadataSchemas.ts';
import { normalizeSubmissionInputs } from './normalizeSubmissionInputs.ts';

const CRF_MODEL = 'claude-opus-4-7';
const CRF_PROMPT_URL = new URL('./prompts/cultural-responsiveness-features.md', import.meta.url);
let crfPromptCache: string | null = null;
async function loadCrfPrompt(): Promise<string> {
  if (crfPromptCache === null) {
    crfPromptCache = await Deno.readTextFile(CRF_PROMPT_URL);
  }
  return crfPromptCache;
}

const ACTIVITY_TYPE_MODEL = 'claude-opus-4-7';
const ACTIVITY_TYPE_PROMPT_URL = new URL('./prompts/activity-type.md', import.meta.url);
let activityTypePromptCache: string | null = null;
async function loadActivityTypePrompt(): Promise<string> {
  if (activityTypePromptCache === null) {
    activityTypePromptCache = await Deno.readTextFile(ACTIVITY_TYPE_PROMPT_URL);
  }
  return activityTypePromptCache;
}

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
    let metadataSketch: MetadataSketch = {};

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

      // Phase 8b: normalize submissionType + originalLessonId together so
      // the persisted row is internally consistent. Defense in depth — the
      // PR 2 UI never sends inconsistent combinations, but other callers
      // (future edge functions, scripts, manual API) might.
      const { normalizedSubmissionType, normalizedOriginalLessonId } =
        normalizeSubmissionInputs({ submissionType, originalLessonId });

      // Phase 8b: validate originalLessonId BEFORE INSERT to avoid orphan
      // rows on the error path. The DB-level FK serves as the TOCTOU
      // backstop; this check provides fast user feedback.
      //
      // PR 4: also reject UPDATEs targeting soft-retired imports. The
      // submitter UI (RevisingSubmissionForm + LessonSearchPicker
      // excludeRetired prop) hides retired rows, but a hand-typed or
      // direct-API call could still send a retired lesson_id; defense in
      // depth at the server boundary.
      if (normalizedSubmissionType === 'update' && normalizedOriginalLessonId) {
        const { count: lessonCount, error: lessonCheckError } = await supabaseAdmin
          .from('lessons')
          .select('lesson_id', { count: 'exact', head: true })
          .eq('lesson_id', normalizedOriginalLessonId)
          .is('retired_at', null);
        if (lessonCheckError) {
          throw lessonCheckError;
        }
        if ((lessonCount ?? 0) === 0) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Original lesson not found: ${normalizedOriginalLessonId}`,
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Step 1: Create submission record
      const { data: newSubmission, error: submissionError } = await supabaseClient
        .from('lesson_submissions')
        .insert({
          teacher_id: user.id,
          google_doc_url: googleDocUrl,
          google_doc_id: googleDocId,
          submission_type: normalizedSubmissionType,
          original_lesson_id: normalizedOriginalLessonId,
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
      metadataSketch = extractResult.data.metadataSketch ?? {};

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

    // Step 4.5: LLM auto-tag — Cultural Responsiveness Features (D9). Skip
    // when body has no "Cultural Responsiveness" header (older legacy
    // template, ~45% of corpus) and on regenerate-embedding-only flow.
    // Output is canonical-keys shape per `lessonMetadataSchema`. Reviewer
    // flips `lessons.crf_confirmed` true via the existing review save flow
    // when the draft is accepted (Phase 2 picker UI redesign deferred).
    if (!regenerateEmbedding && /cultural\s+responsiveness/i.test(content)) {
      try {
        const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
        if (!anthropicKey) {
          console.warn('[CRF auto-tag] ANTHROPIC_API_KEY not configured, skipping');
        } else {
          const crfPrompt = await loadCrfPrompt();
          const anthropic = new Anthropic({ apiKey: anthropicKey });
          console.log('[CRF auto-tag] Generating draft for submission:', submission.id);
          const startTime = Date.now();

          const response = await anthropic.messages.create({
            model: CRF_MODEL,
            max_tokens: 1024,
            system: [
              { type: 'text', text: crfPrompt, cache_control: { type: 'ephemeral' } },
            ],
            tools: [
              {
                name: 'submit_tags',
                description:
                  'Submit the selected cultural_responsiveness_features value(s) for the lesson.',
                input_schema: {
                  type: 'object',
                  properties: {
                    selected_values: {
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: [...CULTURAL_RESPONSIVENESS_FEATURE_VALUES],
                      },
                      uniqueItems: true,
                    },
                  },
                  required: ['selected_values'],
                },
                cache_control: { type: 'ephemeral' },
              },
            ],
            tool_choice: { type: 'tool', name: 'submit_tags' },
            messages: [{ role: 'user', content }],
          });

          const responseTime = Date.now() - startTime;

          let predicted: unknown[] = [];
          for (const block of response.content) {
            if (block.type === 'tool_use' && block.name === 'submit_tags') {
              const input = block.input as Record<string, unknown>;
              if (Array.isArray(input.selected_values)) {
                predicted = input.selected_values;
              }
              break;
            }
          }

          const draft = { culturalResponsivenessFeatures: predicted };
          const parsed = lessonMetadataSchema.safeParse(draft);
          if (!parsed.success) {
            console.error(
              '[CRF auto-tag] Zod validation failed:',
              JSON.stringify(parsed.error.issues)
            );
          } else {
            const features = parsed.data.culturalResponsivenessFeatures ?? [];
            const { error: draftUpdateError } = await supabaseAdmin
              .from('lesson_submissions')
              .update({
                ai_draft_metadata: parsed.data,
                ai_draft_generated_at: new Date().toISOString(),
                ai_draft_model: CRF_MODEL,
              })
              .eq('id', submission.id);
            if (draftUpdateError) {
              console.error('[CRF auto-tag] Failed to write draft:', draftUpdateError);
            } else {
              console.log(
                `[CRF auto-tag] Draft written in ${responseTime}ms — ${features.length} feature(s)`
              );
            }
          }
        }
      } catch (error) {
        console.error('[CRF auto-tag] Failed:', {
          error: error instanceof Error ? error.message : String(error),
          submissionId: submission.id,
        });
      }
    }

    // Step 4.6: LLM auto-tag — Activity Type (D2). Multi-label output (1-or-more
    // of cooking/garden/academic/craft) per Rule Y hybrid garden semantics.
    // Skip on regenerate-embedding-only flow. Output is canonical-keys shape
    // per `lessonMetadataSchema`. Reviewer edits via the existing multi-select
    // picker (post-PR-1b Task 1b.5).
    //
    // Read-modify-write into ai_draft_metadata: preserves any keys written by
    // earlier auto-tag passes (e.g., culturalResponsivenessFeatures from CRF)
    // since the CRF writer overwrites the JSONB column.
    if (!regenerateEmbedding) {
      try {
        const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY');
        if (!anthropicKey) {
          console.warn('[Activity-type auto-tag] ANTHROPIC_API_KEY not configured, skipping');
        } else {
          const activityTypePrompt = await loadActivityTypePrompt();
          const anthropic = new Anthropic({ apiKey: anthropicKey });
          console.log('[Activity-type auto-tag] Generating draft for submission:', submission.id);
          const startTime = Date.now();

          const response = await anthropic.messages.create({
            model: ACTIVITY_TYPE_MODEL,
            max_tokens: 1024,
            system: [
              { type: 'text', text: activityTypePrompt, cache_control: { type: 'ephemeral' } },
            ],
            tools: [
              {
                name: 'submit_tags',
                description: 'Submit the selected activityType value(s) for the lesson.',
                input_schema: {
                  type: 'object',
                  properties: {
                    selected_values: {
                      type: 'array',
                      items: {
                        type: 'string',
                        enum: [...ACTIVITY_TYPE_VALUES],
                      },
                      uniqueItems: true,
                    },
                  },
                  required: ['selected_values'],
                },
                cache_control: { type: 'ephemeral' },
              },
            ],
            tool_choice: { type: 'tool', name: 'submit_tags' },
            messages: [{ role: 'user', content }],
          });

          const responseTime = Date.now() - startTime;

          let predicted: unknown[] = [];
          for (const block of response.content) {
            if (block.type === 'tool_use' && block.name === 'submit_tags') {
              const input = block.input as Record<string, unknown>;
              if (Array.isArray(input.selected_values)) {
                predicted = input.selected_values;
              }
              break;
            }
          }

          const draft = { activityType: predicted };
          const parsed = lessonMetadataSchema.safeParse(draft);
          if (!parsed.success) {
            console.error(
              '[Activity-type auto-tag] Zod validation failed:',
              JSON.stringify(parsed.error.issues)
            );
          } else {
            const activityTypes = parsed.data.activityType ?? [];
            // Read existing ai_draft_metadata so we merge instead of overwrite
            // (CRF writes culturalResponsivenessFeatures earlier in this flow).
            const { data: currentSubmission, error: readError } = await supabaseAdmin
              .from('lesson_submissions')
              .select('ai_draft_metadata')
              .eq('id', submission.id)
              .single();
            if (readError) {
              console.error(
                '[Activity-type auto-tag] Failed to read existing draft:',
                readError
              );
            } else {
              const existingDraft =
                (currentSubmission?.ai_draft_metadata as Record<string, unknown> | null) ?? {};
              const merged = { ...existingDraft, activityType: parsed.data.activityType };
              const { error: draftUpdateError } = await supabaseAdmin
                .from('lesson_submissions')
                .update({
                  ai_draft_metadata: merged,
                  ai_draft_generated_at: new Date().toISOString(),
                  ai_draft_model: ACTIVITY_TYPE_MODEL,
                })
                .eq('id', submission.id);
              if (draftUpdateError) {
                console.error(
                  '[Activity-type auto-tag] Failed to write draft:',
                  draftUpdateError
                );
              } else {
                console.log(
                  `[Activity-type auto-tag] Draft written in ${responseTime}ms — ${activityTypes.length} value(s): ${activityTypes.join(',')}`
                );
              }
            }
          }
        }
      } catch (error) {
        console.error('[Activity-type auto-tag] Failed:', {
          error: error instanceof Error ? error.message : String(error),
          submissionId: submission.id,
        });
      }
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
          metadata: metadataSketch,
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
