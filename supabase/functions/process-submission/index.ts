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
import { validateResubmit } from './validateResubmit.ts';

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

// AI auto-tag OFF switch (owner decision 2026-07-04). Short-term the owner does
// NOT want the two LLM auto-tag passes below (Step 4.5 CRF, Step 4.6
// activity-type) to run: "i think for the short term i do not want to use it. i
// dont want to just delete it because i think i will come back to it and build
// it out." So the code, prompts, models, and merge logic all STAY — only the
// runtime gate flips off. Both passes have never run in PROD (all drafts predate
// the feature) and previously depended silently on whether ANTHROPIC_API_KEY
// happened to be set; this makes the OFF state explicit and deliberate.
// Re-enable by setting the edge secret ENABLE_AI_AUTO_TAG=true (owner will
// revisit and build this out later — see docs/plans/fp5-briefs/brief-2-*).
const AI_AUTO_TAG_ENABLED = Deno.env.get('ENABLE_AI_AUTO_TAG') === 'true';

interface ProcessSubmissionRequest {
  googleDocUrl?: string;
  submissionType?: 'new' | 'update';
  originalLessonId?: string;
  submissionId?: string; // For resubmitting an existing submission
  resubmit?: boolean; // Resubmit-after-revisions: re-snapshot an existing needs_revision row
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
      resubmit,
    } = requestBody;

    // Create service client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const token = authHeader.replace('Bearer ', '');

    // Regular user flow — the user's client with RLS. The embedding-regeneration
    // service-role entrypoint was retired with the embedding pipeline (T4b), so
    // process-submission is now always called by an authenticated teacher
    // (new submission or resubmit-after-revisions).
    let user: any = null;
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get user - need to pass the JWT token
    const {
      data: { user: authUser },
      error: userError,
    } = await supabaseClient.auth.getUser(token);
    if (userError || !authUser) throw new Error('Unauthorized');
    user = authUser;

    let submission;
    let title: string;
    let content: string;
    let metadataSketch: MetadataSketch = {};

    // Handle resubmit-after-revisions for existing submissions
    if (resubmit && submissionId) {
      // Resubmit-after-revisions (T3b): the teacher edited the SAME Google Doc
      // after a reviewer sent it back. Re-snapshot that doc onto the existing
      // row, flip it back into the review queue, and re-run dedup. Reviewer tags
      // + notes are preserved automatically (submission_reviews is one upserted
      // row per submission; the review form restores it on re-open).
      if (!user) {
        // Defensive: the auth path above always resolves `user` via
        // supabaseClient.auth.getUser(token) (throwing 'Unauthorized' on
        // failure), so this is unreachable today. Kept to guard any future
        // auth-path change that could leave `user` unset.
        throw new Error('User authentication required for resubmission');
      }

      // Fetch the row with the service client (RLS forbids teacher SELECT of
      // arbitrary rows; ownership is gated in-code immediately below).
      const { data: existingSubmission, error: fetchError } = await supabaseAdmin
        .from('lesson_submissions')
        .select('*')
        .eq('id', submissionId)
        .single();

      if (fetchError || !existingSubmission) {
        // Log for observability — the resubmit button always targets a real,
        // teacher-owned row, so a miss here is anomalous (transient DB error or
        // a deleted row), not a routine path. Without this a transient failure
        // would be invisible in logs and misreported to the teacher as "not
        // found." 200 { success:false } so supabase-js surfaces the message
        // verbatim (same reasoning as the extraction-error path below).
        if (fetchError) {
          console.error('[Resubmit] Failed to fetch submission:', fetchError);
        }
        return new Response(JSON.stringify({ success: false, error: 'Submission not found.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      // Ownership + status gate (pure helper, unit-tested in validateResubmit.test.ts).
      const gate = validateResubmit(existingSubmission, user.id);
      if (!gate.ok) {
        return new Response(JSON.stringify({ success: false, error: gate.error }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      submission = existingSubmission;

      // An update-type submission targets an existing lesson. Re-validate that
      // the target still exists and hasn't been retired since the original
      // submission — mirrors the normal-flow guard so a resubmit can't quietly
      // send an update against a soft-retired lesson back into the review queue
      // (complete_review_atomic's approve_update only checks existence, not
      // retired_at). Dormant at launch (no retiring in flight), but keeps the
      // two write paths consistent — data-safety. Runs before any write, so a
      // failure leaves the row untouched in needs_revision.
      if (submission.submission_type === 'update' && submission.original_lesson_id) {
        const { count: lessonCount, error: lessonCheckError } = await supabaseAdmin
          .from('lessons')
          .select('lesson_id', { count: 'exact', head: true })
          .eq('lesson_id', submission.original_lesson_id)
          .is('retired_at', null);
        if (lessonCheckError) throw lessonCheckError;
        if ((lessonCount ?? 0) === 0) {
          return new Response(
            JSON.stringify({
              success: false,
              error: 'The lesson this submission updates is no longer available.',
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
          );
        }
      }

      // Step 2 (resubmit): re-extract the SAME stored doc — no new URL is
      // accepted here. Mirrors the normal-flow extraction (:253-283) verbatim.
      const extractResponse = await fetch(`${supabaseUrl}/functions/v1/extract-google-doc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${supabaseServiceKey}`,
        },
        body: JSON.stringify({ googleDocUrl: submission.google_doc_url }),
      });

      const extractResult = await extractResponse.json();
      if (!extractResult.success) {
        // Extraction failed (doc unshared/deleted). Return the honest error and
        // LEAVE the row in needs_revision so the teacher can fix sharing and
        // retry — status is only flipped AFTER a successful snapshot below.
        const extractionError =
          typeof extractResult.error === 'string' && extractResult.error
            ? typeof extractResult.serviceAccountEmail === 'string' &&
              extractResult.serviceAccountEmail
              ? `${extractResult.error} Share the doc with ${extractResult.serviceAccountEmail}.`
              : extractResult.error
            : 'Failed to extract content';
        return new Response(JSON.stringify({ success: false, error: extractionError }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      title = extractResult.data.title;
      content = extractResult.data.content;
      metadataSketch = extractResult.data.metadataSketch ?? {};

      // Step 3 (resubmit): store the fresh snapshot AND flip back into review in
      // the SAME update. Nulling revision_requested_reason returns the teacher
      // card cleanly to "Submitted" with no stale ask; the reviewer's note is
      // NOT lost (it lives on in submission_reviews.notes). reviewer_notes /
      // reviewed_at / review_completed_at are left alone (history).
      //
      // content_hash / ai_draft_metadata are content-DERIVED, so they're nulled
      // here: if the fail-soft regen (Step 6 hash) or the LLM auto-tag passes
      // (Steps 4.5/4.6) don't fully re-run on the new content, the row must carry
      // NO derived value rather than the PREVIOUS snapshot's. In particular the
      // CRF pass (4.5) only runs when the new content still matches /cultural
      // responsiveness/i, so a revision that drops that section would otherwise
      // leave a stale culturalResponsivenessFeatures draft prefilling the
      // reviewer's form. Steps 4.5/4.6/6 repopulate each field from the fresh
      // content on success (activity-type always runs; CRF/hash conditionally).
      // content_embedding is NOT touched — the embedding pipeline was retired
      // (T4b); the column is inert.
      //
      // The `.eq('status', 'needs_revision')` is a compare-and-swap: only flip
      // if the row is STILL awaiting revisions at write time. This closes the
      // TOCTOU window between the gate above and this write (a concurrent
      // reviewer action, or a double-fired resubmit, could have already moved
      // the row). The loser of the race gets the same plain message as a stale
      // gate and leaves the winner's state intact.
      const { data: flippedRows, error: updateError } = await supabaseAdmin
        .from('lesson_submissions')
        .update({
          extracted_content: content,
          extracted_title: title,
          status: 'submitted',
          revision_requested_reason: null,
          content_hash: null,
          ai_draft_metadata: null,
          ai_draft_generated_at: null,
          ai_draft_model: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', submission.id)
        .eq('status', 'needs_revision')
        .select('id');

      if (updateError) throw updateError;
      if (!flippedRows || flippedRows.length === 0) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "This submission isn't waiting on revisions.",
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      // Reflect the flipped status so the response returns 'submitted', not the
      // stale fetched 'needs_revision'.
      submission.status = 'submitted';

      // Clear stale duplicate candidates from the OLD snapshot before dedup
      // re-runs (detect-duplicates only INSERTs, and a zero-result re-run
      // inserts nothing — without this the reviewer would see stale/doubled
      // candidates). Only the CAS winner reaches here, so there is no concurrent
      // re-detection to double against. Fail-soft: a failed clear (transient DB
      // error) logs but does not abort — the row is already flipped and can't be
      // cleanly rolled back, and a stray stale candidate is reviewer-recoverable.
      const { error: clearSimilaritiesError } = await supabaseAdmin
        .from('submission_similarities')
        .delete()
        .eq('submission_id', submission.id);
      if (clearSimilaritiesError) {
        console.error('[Resubmit] Failed to clear stale similarities:', clearSimilaritiesError);
      }
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
      // Also reject UPDATEs targeting soft-retired imports. The
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
        // Surface the SPECIFIC extraction failure to the teacher — most often
        // "Document not accessible…" from a doc that wasn't shared. Append the
        // service-account address when extract-google-doc provides it so they
        // know exactly who to share with. Returned as a 2xx { success:false } so
        // the frontend reads `response.error` verbatim: on a non-2xx status
        // supabase-js hands the caller a generic FunctionsHttpError and the
        // helpful message is lost.
        const extractionError =
          typeof extractResult.error === 'string' && extractResult.error
            ? typeof extractResult.serviceAccountEmail === 'string' &&
              extractResult.serviceAccountEmail
              ? `${extractResult.error} Share the doc with ${extractResult.serviceAccountEmail}.`
              : extractResult.error
            : 'Failed to extract content';
        return new Response(JSON.stringify({ success: false, error: extractionError }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
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

    // Step 4 (embedding generation) was removed in T4b — dedup detection no
    // longer uses embeddings (D9). The lessons/lesson_submissions
    // content_embedding columns stay but are inert.

    // AI auto-tag off switch (owner decision 2026-07-04): when disabled, log
    // one line and skip BOTH passes below entirely. Steps 5/6 still run.
    if (!AI_AUTO_TAG_ENABLED) {
      console.log('[auto-tag] disabled by owner decision 2026-07-04');
    }

    // Step 4.5: LLM auto-tag — Cultural Responsiveness Features (D9). Skip
    // when body has no "Cultural Responsiveness" header (older legacy
    // template, ~45% of corpus). Output is canonical-keys shape per
    // `lessonMetadataSchema`. Reviewer flips `lessons.crf_confirmed` true via
    // the existing review save flow when the draft is accepted (Phase 2 picker
    // UI redesign deferred).
    if (AI_AUTO_TAG_ENABLED && /cultural\s+responsiveness/i.test(content)) {
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
    // Output is canonical-keys shape per `lessonMetadataSchema`. Reviewer edits
    // via the existing multi-select picker (post-PR-1b Task 1b.5).
    //
    // Read-modify-write into ai_draft_metadata: preserves any keys written by
    // earlier auto-tag passes (e.g., culturalResponsivenessFeatures from CRF)
    // since the CRF writer overwrites the JSONB column.
    //
    // Runs for every submission (new + resubmit) WHEN the auto-tag switch is on.
    // The block scope is retained only to preserve the surrounding structure
    // after the embedding-regen guard that used to wrap it was removed in T4b.
    if (AI_AUTO_TAG_ENABLED) {
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
