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

interface PasswordResetRequest {
  email: string;
}

interface PasswordChangeNotification {
  userId: string;
  email: string;
  name?: string;
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

    // POST /password-reset/request - Request password reset (public endpoint)
    if (req.method === 'POST' && pathname === '/password-reset/request') {
      const { email } = (await req.json()) as PasswordResetRequest;

      if (!email) {
        return new Response(JSON.stringify({ error: 'Email is required' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if user exists
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .eq('email', email.toLowerCase())
        .single();

      if (!profile) {
        // Don't reveal if email exists or not for security
        return new Response(
          JSON.stringify({
            success: true,
            message: 'If an account exists with this email, a password reset link has been sent.',
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate password reset link using Supabase Auth
      const { data, error } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: email.toLowerCase(),
        options: {
          redirectTo: `${origin || 'http://localhost:5173'}/reset-password`,
        },
      });

      if (error) {
        console.error('Error generating reset link:', error);
        throw new Error('Failed to generate password reset link');
      }

      if (!data || !data.properties?.action_link) {
        throw new Error('No reset link generated');
      }

      // Send password reset email
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'password-reset',
            to: email,
            data: {
              resetUrl: data.properties.action_link,
              recipientName: profile.full_name,
            },
          },
        });
      } catch (emailError) {
        console.error('Failed to send password reset email:', emailError);
        // Don't fail the request if email fails
      }

      // Log the password reset request
      await supabase.from('user_management_audit').insert({
        action: 'password_reset_requested',
        target_user_id: profile.id,
        target_email: email,
        metadata: { ip_address: req.headers.get('x-forwarded-for') || 'unknown' },
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'If an account exists with this email, a password reset link has been sent.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /password-reset/notify - Send password changed notification (requires auth)
    if (req.method === 'POST' && pathname === '/password-reset/notify') {
      // This endpoint requires authentication
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

      const { userId, email, name } = (await req.json()) as PasswordChangeNotification;

      // Only allow users to send notifications for themselves or admins to send for anyone
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

      if (!isAdmin && user.id !== userId) {
        return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Send password changed notification email
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'password-changed',
            to: email,
            data: {
              recipientName: name,
            },
          },
        });
      } catch (emailError) {
        console.error('Failed to send password changed email:', emailError);
      }

      // Log the password change
      await supabase.from('user_management_audit').insert({
        actor_id: user.id,
        action: 'password_changed',
        target_user_id: userId,
        target_email: email,
      });

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
    console.error('Error in password-reset function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
