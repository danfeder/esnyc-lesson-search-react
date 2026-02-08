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
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  };
};

interface InvitationData {
  email: string;
  role: string;
  message?: string;
  schoolName?: string;
  schoolBorough?: string;
  metadata?: any;
}

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const pathname = url.pathname;

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Public endpoint for accepting invitations
    if (req.method === 'POST' && pathname === '/invitations/accept') {
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

      return new Response(JSON.stringify({ success: true, userId: authData.user.id }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // All other endpoints require authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check admin permissions
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pathParts = pathname.split('/').filter(Boolean);

    // POST /invitations - Create new invitation
    if (req.method === 'POST' && pathParts.length === 1 && pathParts[0] === 'invitations') {
      const invitationData: InvitationData = await req.json();

      // Validate required fields
      if (!invitationData.email || !invitationData.role) {
        return new Response(JSON.stringify({ error: 'Email and role are required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if email already registered
      const { data: existingUser } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('email', invitationData.email)
        .single();

      if (existingUser) {
        return new Response(JSON.stringify({ error: 'User already exists' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check for pending invitation
      const { data: existingInvite } = await supabase
        .from('user_invitations')
        .select('id')
        .eq('email', invitationData.email)
        .is('accepted_at', null)
        .single();

      if (existingInvite) {
        return new Response(JSON.stringify({ error: 'Invitation already sent' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Create invitation
      const { data: invitation, error: inviteError } = await supabase
        .from('user_invitations')
        .insert({
          email: invitationData.email,
          role: invitationData.role,
          invited_by: user.id,
          school_name: invitationData.schoolName || null,
          school_borough: invitationData.schoolBorough || null,
          message: invitationData.message || null,
          metadata: invitationData.metadata || {},
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Send invitation email
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'invitation',
            to: invitationData.email,
            data: {
              invitationId: invitation.id,
              token: invitation.token,
              inviterName: profile.full_name || user.email,
              role: invitationData.role,
              customMessage: invitationData.message,
              permissions: getPermissionsForRole(invitationData.role),
              expiresAt: invitation.expires_at,
            },
          },
        });
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
      }

      // Log audit trail
      await supabase.from('user_management_audit').insert({
        actor_id: user.id,
        action: 'invite_sent',
        target_email: invitationData.email,
        new_values: {
          role: invitationData.role,
          school_name: invitationData.schoolName,
        },
      });

      return new Response(JSON.stringify({ success: true, invitation }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // GET /invitations - List invitations
    if (req.method === 'GET' && pathParts.length === 1 && pathParts[0] === 'invitations') {
      const page = Math.max(1, parseInt(url.searchParams.get('page') || '1') || 1);
      const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '20') || 20));
      const status = url.searchParams.get('status'); // pending, accepted, expired
      const search = url.searchParams.get('search');
      const offset = (page - 1) * limit;

      let query = supabase
        .from('user_invitations')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      // Apply filters - escape special characters to prevent SQL injection
      if (search) {
        // Escape special characters including backslashes that have special meaning in LIKE patterns
        const escapedSearch = search
          .replace(/\\/g, '\\\\') // Escape backslashes first
          .replace(/[%_]/g, '\\$&'); // Then escape wildcards
        query = query.or(`email.ilike.%${escapedSearch}%,school_name.ilike.%${escapedSearch}%`);
      }

      if (status === 'pending') {
        query = query.is('accepted_at', null).gt('expires_at', new Date().toISOString());
      } else if (status === 'accepted') {
        query = query.not('accepted_at', 'is', null);
      } else if (status === 'expired') {
        query = query.is('accepted_at', null).lt('expires_at', new Date().toISOString());
      }

      const { data: invitations, count, error } = await query;

      if (error) throw error;

      return new Response(
        JSON.stringify({
          invitations,
          pagination: {
            page,
            limit,
            total: count || 0,
            totalPages: Math.ceil((count || 0) / limit),
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /invitations/:id/resend - Resend invitation
    if (
      req.method === 'POST' &&
      pathParts.length === 3 &&
      pathParts[0] === 'invitations' &&
      pathParts[2] === 'resend'
    ) {
      const invitationId = pathParts[1];

      // Get invitation
      const { data: invitation, error } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (error || !invitation) {
        return new Response(JSON.stringify({ error: 'Invitation not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (invitation.accepted_at) {
        return new Response(JSON.stringify({ error: 'Invitation already accepted' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update expiration
      const { error: updateError } = await supabase
        .from('user_invitations')
        .update({
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      // Resend email
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'invitation',
            to: invitation.email,
            data: {
              invitationId: invitation.id,
              token: invitation.token,
              inviterName: profile.full_name || user.email,
              role: invitation.role,
              customMessage: invitation.message,
              permissions: getPermissionsForRole(invitation.role),
              expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            },
          },
        });
      } catch (emailError) {
        console.error('Failed to resend invitation email:', emailError);
      }

      // Log audit trail
      await supabase.from('user_management_audit').insert({
        actor_id: user.id,
        action: 'invite_resent',
        target_email: invitation.email,
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE /invitations/:id - Cancel invitation
    if (req.method === 'DELETE' && pathParts.length === 2 && pathParts[0] === 'invitations') {
      const invitationId = pathParts[1];

      // Get invitation for audit trail
      const { data: invitation } = await supabase
        .from('user_invitations')
        .select('email')
        .eq('id', invitationId)
        .single();

      // Delete invitation
      const { error } = await supabase.from('user_invitations').delete().eq('id', invitationId);

      if (error) throw error;

      // Log audit trail
      if (invitation) {
        await supabase.from('user_management_audit').insert({
          actor_id: user.id,
          action: 'invite_cancelled',
          target_email: invitation.email,
        });
      }

      return new Response(JSON.stringify({ success: true }), {
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

function getPermissionsForRole(role: string): string[] {
  switch (role) {
    case 'teacher':
      return ['view_lessons', 'submit_lessons'];
    case 'reviewer':
      return [
        'view_lessons',
        'submit_lessons',
        'review_lessons',
        'approve_lessons',
        'view_analytics',
      ];
    case 'admin':
      return [
        'view_lessons',
        'submit_lessons',
        'review_lessons',
        'approve_lessons',
        'delete_lessons',
        'view_users',
        'invite_users',
        'edit_users',
        'view_analytics',
        'manage_duplicates',
        'export_data',
      ];
    default:
      return ['view_lessons', 'submit_lessons'];
  }
}
