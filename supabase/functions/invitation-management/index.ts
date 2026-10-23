import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.1';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Get allowed origins from environment or use defaults
const ALLOWED_ORIGINS = Deno.env.get('ALLOWED_ORIGINS')?.split(',') || [
  'http://localhost:5173',
  'https://esynyc-lessonlibrary-v2.netlify.app',
  'https://deploy-preview-*--esynyc-lessonlibrary-v2.netlify.app',
];

const getCorsHeaders = (origin: string | null) => {
  // Check if origin is allowed
  const isAllowed =
    origin &&
    (ALLOWED_ORIGINS.includes(origin) ||
      ALLOWED_ORIGINS.some(
        (allowed) => allowed.includes('*') && origin.match(new RegExp(allowed.replace(/\*/g, '.*')))
      ));

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);

  // Resolve routes RELATIVE to the function name: the hosted edge runtime
  // serves this function with the slug still in the path (e.g.
  // `/invitation-management/invitations/accept`), while local serve may not.
  // Mirrors user-management/index.ts. Before 2026-07-02 only the accept route
  // handled this (via endsWith, added in PR #573 after it 401'd on every call
  // for months). This function now serves ONLY the accept route; invitation
  // create/list/resend/cancel are done by the admin pages directly against
  // `user_invitations` under RLS (C128, ruled 2026-10-21).
  let pathParts = url.pathname.split('/').filter(Boolean);
  const fnNameIdx = pathParts.indexOf('invitation-management');
  if (fnNameIdx >= 0) {
    pathParts = pathParts.slice(fnNameIdx + 1);
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Public endpoint for accepting invitations (token-gated, no user JWT —
    // the invitee doesn't have an account yet).
    if (
      req.method === 'POST' &&
      pathParts.length === 2 &&
      pathParts[0] === 'invitations' &&
      pathParts[1] === 'accept'
    ) {
      const { token, password, fullName, gradesTaught, subjectsTaught } = await req.json();

      if (!token || !password || !fullName) {
        return new Response(JSON.stringify({ error: 'Missing required fields' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Fetch invitation by token
      const { data: invitation, error: inviteError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('token', token)
        .single();

      if (inviteError || !invitation) {
        return new Response(JSON.stringify({ error: 'Invalid or expired invitation' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if already accepted
      if (invitation.accepted_at) {
        return new Response(JSON.stringify({ error: 'Invitation already accepted' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if expired
      if (new Date(invitation.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: 'Invitation has expired' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: invitation.email,
        password,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (authError || !authData.user) {
        // Check if user already exists
        if (authError?.message?.includes('already registered')) {
          return new Response(JSON.stringify({ error: 'Email already registered' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw authError || new Error('Failed to create user');
      }

      // Create user profile
      const { error: profileError } = await supabase.from('user_profiles').insert({
        id: authData.user.id,
        user_id: authData.user.id,
        email: invitation.email,
        full_name: fullName,
        role: invitation.role,
        school_name: invitation.school_name,
        school_borough: invitation.school_borough,
        grades_taught: gradesTaught?.length > 0 ? gradesTaught : null,
        subjects_taught: subjectsTaught?.length > 0 ? subjectsTaught : null,
        invited_by: invitation.invited_by,
        invited_at: invitation.invited_at,
        accepted_at: new Date().toISOString(),
        is_active: true,
      });

      if (profileError) throw profileError;

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('user_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      // Log audit trail
      await supabase.from('user_management_audit').insert({
        actor_id: authData.user.id,
        action: 'invite_accepted',
        target_user_id: authData.user.id,
        target_email: invitation.email,
      });

      // Observability for this endpoint now that it is actually reachable
      // (see the pathname note above — it previously 401'd on every call).
      console.log(
        `Invitation accepted: created user ${authData.user.id} (role=${invitation.role})`
      );

      return new Response(JSON.stringify({ success: true, userId: authData.user.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If no route matched
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in invitation-management function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

