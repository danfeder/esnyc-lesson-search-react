// Phase 4 of the lesson-submission Tier-1 work. This edge function is the
// single auth boundary (Pattern A in the plan): it validates the JWT,
// checks the caller's role, ensures the submission embedding is fresh
// enough for an approve_* decision, and then calls the
// complete_review_atomic RPC with the service-role key. The RPC trusts
// p_reviewer_id because EXECUTE is granted only to service_role.
//
// Phase 7c will add the post-success email trigger; today there's a
// placeholder comment marking the seam.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { getRestrictedCorsHeaders } from '../_shared/cors.ts';

type ReviewDecision = 'approve_new' | 'approve_update' | 'needs_revision' | 'reject';

interface CompleteReviewRequest {
  submissionId?: string;
  decision?: ReviewDecision;
  metadata?: Record<string, unknown>;
  notes?: string;
  selectedLessonId?: string | null;
}

const VALID_DECISIONS: ReadonlyArray<ReviewDecision> = [
  'approve_new',
  'approve_update',
  'needs_revision',
  'reject',
];

function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getRestrictedCorsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return jsonResponse({ error: 'Missing authorization header' }, 401, corsHeaders);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return jsonResponse({ error: 'Supabase env not configured' }, 500, corsHeaders);
    }

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: userErr,
    } = await userClient.auth.getUser(token);
    if (userErr || !user) {
      return jsonResponse({ error: 'Invalid or expired token' }, 401, corsHeaders);
    }

    const { data: profile, error: profileErr } = await userClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileErr || !profile) {
      return jsonResponse({ error: 'User profile not found' }, 403, corsHeaders);
    }

    if (!['reviewer', 'admin', 'super_admin'].includes(profile.role)) {
      return jsonResponse({ error: 'Insufficient role' }, 403, corsHeaders);
    }

    const body = (await req.json().catch(() => null)) as CompleteReviewRequest | null;
    if (!body) {
      return jsonResponse({ error: 'Invalid JSON body' }, 400, corsHeaders);
    }

    const { submissionId, decision, metadata, notes, selectedLessonId } = body;

    if (!submissionId || typeof submissionId !== 'string') {
      return jsonResponse({ error: 'Missing submissionId' }, 400, corsHeaders);
    }
    if (!decision || !VALID_DECISIONS.includes(decision)) {
      return jsonResponse({ error: `Invalid decision: ${decision}` }, 400, corsHeaders);
    }
    if (decision === 'approve_update' && !selectedLessonId) {
      return jsonResponse(
        { error: 'approve_update requires selectedLessonId' },
        400,
        corsHeaders
      );
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Embedding handling. For non-approve decisions the embedding doesn't
    // matter (no lessons row gets written). For approve_update we always
    // regenerate — the doc content is the source of truth and the prior
    // embedding is being replaced anyway. For approve_new we only
    // regenerate when the submission's embedding is null (e.g. the
    // process-submission run that originally created the row didn't have
    // OpenAI configured at the time).
    if (decision === 'approve_new' || decision === 'approve_update') {
      const { data: submission, error: subErr } = await serviceClient
        .from('lesson_submissions')
        .select('content_embedding, extracted_content, extracted_title')
        .eq('id', submissionId)
        .single();

      if (subErr || !submission) {
        return jsonResponse({ error: 'Submission not found' }, 404, corsHeaders);
      }

      const embeddingMissing = !submission.content_embedding;
      const needsRegen = decision === 'approve_update' || embeddingMissing;

      if (needsRegen) {
        if (!submission.extracted_content) {
          return jsonResponse(
            {
              error:
                'Submission has no extracted_content; cannot regenerate embedding. Re-run process-submission first.',
            },
            422,
            corsHeaders
          );
        }

        const openAIKey = Deno.env.get('OPENAI_API_KEY');
        if (!openAIKey) {
          return jsonResponse(
            { error: 'OPENAI_API_KEY not configured; cannot regenerate embedding' },
            500,
            corsHeaders
          );
        }

        const titlePrefix = submission.extracted_title ? `${submission.extracted_title}\n` : '';
        const embedInput = `${titlePrefix}${submission.extracted_content}`.substring(0, 8000);

        const embedRes = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openAIKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: embedInput,
          }),
        });

        if (!embedRes.ok) {
          const errText = await embedRes.text();
          return jsonResponse(
            {
              error: `OpenAI embedding request failed: ${embedRes.status}`,
              detail: errText.substring(0, 200),
            },
            502,
            corsHeaders
          );
        }

        const embedJson = await embedRes.json();
        const embedding = embedJson?.data?.[0]?.embedding;
        if (!Array.isArray(embedding) || embedding.length === 0) {
          return jsonResponse(
            { error: 'OpenAI returned an invalid embedding payload' },
            502,
            corsHeaders
          );
        }

        // pgvector text format. Matches process-submission's storage shape.
        const vectorString = `[${embedding.join(',')}]`;
        const { error: updateErr } = await serviceClient
          .from('lesson_submissions')
          .update({ content_embedding: vectorString })
          .eq('id', submissionId);

        if (updateErr) {
          return jsonResponse(
            { error: `Failed to store regenerated embedding: ${updateErr.message}` },
            500,
            corsHeaders
          );
        }
      }
    }

    const { data: lessonId, error: rpcErr } = await serviceClient.rpc('complete_review_atomic', {
      p_submission_id: submissionId,
      p_reviewer_id: user.id,
      p_decision: decision,
      p_metadata: metadata ?? {},
      p_notes: notes ?? '',
      p_selected_lesson_id: selectedLessonId ?? null,
    });

    if (rpcErr) {
      return jsonResponse(
        {
          error: `complete_review_atomic failed: ${rpcErr.message}`,
          code: rpcErr.code,
          detail: rpcErr.details,
        },
        500,
        corsHeaders
      );
    }

    // Phase 7c: post-RPC email notification. Fail-open — errors are logged
    // but do not roll back the approval. The RPC has already committed.
    try {
      const { data: subRow, error: subErr } = await serviceClient
        .from('lesson_submissions')
        .select('extracted_title, teacher_id, user_profiles!inner(email)')
        .eq('id', submissionId)
        .single<{
          extracted_title: string | null;
          teacher_id: string;
          user_profiles: { email: string };
        }>();

      if (subErr) {
        console.error(
          `Phase 7c: failed to fetch teacher email for submission ${submissionId}:`,
          subErr
        );
      }

      const teacherEmail = subRow?.user_profiles?.email;

      if (teacherEmail) {
        // Map RPC decision to email type. RPC returns the new status, but
        // here we map directly from the reviewer's decision since
        // approve_new and approve_update both result in 'approved'.
        let emailType:
          | 'submission-approved'
          | 'submission-needs-revision'
          | 'submission-rejected'
          | null = null;

        if (decision === 'approve_new' || decision === 'approve_update') {
          emailType = 'submission-approved';
        } else if (decision === 'needs_revision') {
          emailType = 'submission-needs-revision';
        } else if (decision === 'reject') {
          emailType = 'submission-rejected';
        }

        if (emailType) {
          const emailData: Record<string, unknown> = {
            lessonTitle: subRow.extracted_title ?? 'your submission',
          };
          if (emailType === 'submission-needs-revision' && notes) {
            emailData.reviewerNotes = notes;
          }

          const { error: emailErr } = await serviceClient.functions.invoke(
            'send-email',
            {
              body: {
                type: emailType,
                to: teacherEmail,
                data: emailData,
              },
            }
          );
          if (emailErr) {
            console.error(
              `Phase 7c: send-email returned error for submission ${submissionId}:`,
              emailErr
            );
          }
        }
      } else {
        console.warn(
          `Phase 7c: no teacher email found for submission ${submissionId}; skipping notification`
        );
      }
    } catch (err) {
      console.error(
        `Phase 7c: email notification failed for submission ${submissionId}:`,
        err
      );
    }

    return jsonResponse(
      {
        success: true,
        lessonId: lessonId ?? null,
        decision,
      },
      200,
      corsHeaders
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return jsonResponse({ error: message }, 500, corsHeaders);
  }
});
