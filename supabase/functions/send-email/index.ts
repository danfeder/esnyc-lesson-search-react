import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.1';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface EmailRequest {
  type: 'invitation' | 'welcome' | 'password-reset';
  to: string;
  data: {
    invitationId?: string;
    token?: string;
    inviterName?: string;
    recipientName?: string;
    role?: string;
    customMessage?: string;
    permissions?: string[];
    expiresAt?: string;
  };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify the request is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the JWT token and verify it
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

    // Check if user has permission to send emails (admin or super_admin)
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { type, to, data } = (await req.json()) as EmailRequest;

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured');
      // In development, just log the email details
      console.log('Email would be sent:', { type, to, data });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Email logged (development mode)',
          email: { type, to, data },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let emailHtml = '';
    let subject = '';

    switch (type) {
      case 'invitation':
        subject = "You're invited to join ESNYC Lesson Library";
        emailHtml = generateInvitationEmail(data, to);
        break;

      case 'welcome':
        subject = 'Welcome to ESNYC Lesson Library!';
        emailHtml = generateWelcomeEmail(data, to);
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    // Send email via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'ESNYC Lesson Library <noreply@esnyc.org>',
        to: [to],
        subject,
        html: emailHtml,
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      console.error('Resend API error:', error);
      throw new Error(`Failed to send email: ${error}`);
    }

    const result = await resendResponse.json();

    // Log the email send event
    await supabase.from('user_management_audit').insert({
      actor_id: user.id,
      action: `email_sent_${type}`,
      target_email: to,
      metadata: { email_id: result.id, type },
    });

    return new Response(JSON.stringify({ success: true, emailId: result.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in send-email function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateInvitationEmail(data: any, email: string): string {
  const baseUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://app.esnyc.org';
  const invitationUrl = `${baseUrl}/accept-invitation?token=${data.token}`;

  const permissions = data.permissions || [];
  const permissionsList =
    permissions.length > 0
      ? permissions.map((p: string) => `<li>${formatPermission(p)}</li>`).join('')
      : '<li>View and search lesson library</li><li>Submit new lessons</li>';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invitation to ESNYC Lesson Library</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #22c55e; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background-color: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .button:hover { background-color: #16a34a; }
          .permissions { background-color: white; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>You're Invited!</h1>
          </div>
          <div class="content">
            <p>Hi there,</p>
            
            <p><strong>${data.inviterName || 'An administrator'}</strong> has invited you to join the ESNYC Lesson Library as a <strong>${data.role || 'teacher'}</strong>.</p>
            
            ${data.customMessage ? `<p><em>"${data.customMessage}"</em></p>` : ''}
            
            <div class="permissions">
              <p><strong>As a ${data.role || 'teacher'}, you'll be able to:</strong></p>
              <ul>${permissionsList}</ul>
            </div>
            
            <p>Ready to get started? Click the button below to set up your account:</p>
            
            <div style="text-align: center;">
              <a href="${invitationUrl}" class="button">Accept Invitation</a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              This invitation will expire on ${new Date(data.expiresAt || Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString()}.
              If you have any questions, please contact your administrator.
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Edible Schoolyard NYC. All rights reserved.</p>
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateWelcomeEmail(data: any, email: string): string {
  const baseUrl = Deno.env.get('PUBLIC_SITE_URL') || 'https://app.esnyc.org';
  const dashboardUrl = `${baseUrl}/`;

  const roleGuides: Record<string, string[]> = {
    teacher: [
      'Search and discover lesson plans',
      'Save your favorite lessons',
      'Submit new lesson ideas',
      'Track your submission status',
    ],
    reviewer: [
      'All teacher capabilities',
      'Review submitted lessons',
      'Provide feedback to teachers',
      'Approve lessons for publication',
    ],
    admin: [
      'All reviewer capabilities',
      'Manage user accounts',
      'View analytics and reports',
      'Configure system settings',
    ],
  };

  const guides = roleGuides[data.role || 'teacher'] || roleGuides.teacher;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ESNYC Lesson Library</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #22c55e; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background-color: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
          .button:hover { background-color: #16a34a; }
          .guide-box { background-color: white; padding: 20px; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #6b7280; font-size: 14px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to ESNYC Lesson Library!</h1>
          </div>
          <div class="content">
            <p>Hi ${data.recipientName || 'there'},</p>
            
            <p>Your account has been successfully created! We're excited to have you join our community of educators.</p>
            
            <div class="guide-box">
              <h3>Here's what you can do as a ${data.role || 'teacher'}:</h3>
              <ul>
                ${guides.map((guide) => `<li>${guide}</li>`).join('')}
              </ul>
            </div>
            
            <p>Ready to explore? Click below to access your dashboard:</p>
            
            <div style="text-align: center;">
              <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
            </div>
            
            <h3>Need Help?</h3>
            <p>We're here to support you:</p>
            <ul>
              <li>📚 <a href="${baseUrl}/help">Browse our help documentation</a></li>
              <li>📧 Contact support at <a href="mailto:support@esnyc.org">support@esnyc.org</a></li>
              <li>🎥 <a href="${baseUrl}/tutorials">Watch video tutorials</a></li>
            </ul>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} Edible Schoolyard NYC. All rights reserved.</p>
            <p>You're receiving this because you recently created an account.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function formatPermission(permission: string): string {
  const permissionMap: Record<string, string> = {
    view_lessons: 'View and search lesson library',
    submit_lessons: 'Submit new lesson plans',
    review_lessons: 'Review submitted lessons',
    approve_lessons: 'Approve lessons for publication',
    delete_lessons: 'Delete lessons',
    view_users: 'View user accounts',
    invite_users: 'Invite new users',
    edit_users: 'Edit user profiles',
    delete_users: 'Remove user accounts',
    manage_roles: 'Manage user roles and permissions',
    view_analytics: 'View analytics and reports',
    manage_duplicates: 'Manage duplicate lessons',
    export_data: 'Export lesson data',
    system_settings: 'Configure system settings',
  };

  return permissionMap[permission] || permission.replace(/_/g, ' ');
}
