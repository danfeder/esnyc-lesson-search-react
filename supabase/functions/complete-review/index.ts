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
import { reviewFormPayloadSchema } from '../_shared/metadataSchemas.ts';

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

    // Zod-validate metadata when present. PR 1 Task 1.5: defense-in-depth
    // against stale frontend bundles or direct API hits sending malformed
    // shapes. The schema mirrors src/types/reviewFormPayload.zod.ts (review-
    // form keys: themes/season/location single-select); the RPC translates
    // to canonical keys downstream.
    if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
      const result = reviewFormPayloadSchema.safeParse(metadata);
      if (!result.success) {
        const flat = result.error.flatten();
        return jsonResponse(
          {
            error: 'Invalid metadata shape',
            fieldErrors: flat.fieldErrors,
            formErrors: flat.formErrors,
          },
          400,
          corsHeaders
        );
      }
    }

    const serviceClient = createClient(supabaseUrl, supabaseServiceKey);

    // Embedding regeneration RETIRED (T4b, D9). The Phase-4 block here called
    // OpenAI on approve_update (always) and on approve_new when the submission's
    // content_embedding was NULL. Post-T4b nothing consumes fresh embeddings —
    // detect-duplicates scores with pg_trgm + content-hash + metadata overlap —
    // and process-submission no longer generates them, so every new submission
    // would have hit the OpenAI call here at publish time (and a missing
    // OPENAI_API_KEY hard-failed the publish with a 500). Publishing must not
    // depend on OpenAI: the block is gone. complete_review_atomic copies the
    // submission's content_embedding (now NULL for new work) into the lessons
    // row as-is; both columns stay, inert.

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

    // Decision emails (approved / needs-revision / rejected) were retired for
    // launch per T3 (2026-07-01). The old block here fetched the teacher's
    // address via a PostgREST embed
    // (`lesson_submissions.select('…, user_profiles!inner(email)')`), but
    // `lesson_submissions` has NO foreign key to `user_profiles` — teacher_id,
    // reviewer_id and reviewed_by all reference `auth.users` — so the embed can
    // never resolve. PostgREST returns PGRST200 ("Could not find a relationship
    // between 'lesson_submissions' and 'user_profiles' in the schema cache"),
    // which the old fail-open catch silently swallowed (that is why the decision
    // email vanished with no send-email invocation in the logs). Confirming
    // probe recorded in the T3 PR. Email is auth-only for launch (invitations +
    // password reset); teachers are notified out-of-band.
    console.log(
      `Review completed for submission ${submissionId} (decision=${decision}); ` +
        `decision emails retired for launch per T3 (2026-07-01).`
    );

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
