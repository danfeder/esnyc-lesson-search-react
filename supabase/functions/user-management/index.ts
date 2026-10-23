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
  const pathname = url.pathname;

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify authentication
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
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'super_admin')) {
      return new Response(JSON.stringify({ error: 'Insufficient permissions' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Route handling.
    // Supabase serves this function under a path that still contains the
    // function-name segment (e.g. `/user-management/users/bulk`), so the raw
    // pathParts start with `user-management` and the REST sub-route checks below
    // (which expect `users` first) never matched — every call fell
    // through to the 404 fallback. Resolve the route RELATIVE to the function name
    // so the sub-routes match regardless of how the platform presents the prefix.
    let pathParts = pathname.split('/').filter(Boolean);
    const fnNameIdx = pathParts.indexOf('user-management');
    if (fnNameIdx >= 0) {
      pathParts = pathParts.slice(fnNameIdx + 1);
    }

    // POST /users/bulk - Bulk operations
    if (
      req.method === 'POST' &&
      pathParts.length === 2 &&
      pathParts[0] === 'users' &&
      pathParts[1] === 'bulk'
    ) {
      const { action, userIds } = await req.json();

      if (!action || !userIds || !Array.isArray(userIds)) {
        return new Response(JSON.stringify({ error: 'Invalid request body' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      let auditAction = '';
      const now = new Date().toISOString();
      const failedIds: string[] = [];

      // Get current user data for all affected users before update.
      const { data: affectedUsers, error: affectedError } = await supabase
        .from('user_profiles')
        .select('id, full_name, email, is_active, notes')
        .in('id', userIds);

      // A failed pre-read must not masquerade as a no-op success: the delete loop
      // and the activate/deactivate notification block both iterate affectedUsers,
      // so an undefined result here would silently skip the work and still return 200.
      if (affectedError) {
        console.error('Failed to load affected users for bulk action:', affectedError);
        return new Response(JSON.stringify({ error: 'Failed to load affected users.' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // affected = rows that actually matched (truthful across all actions; the
      // delete branch subtracts per-user failures below). Unknown ids simply don't
      // match and aren't counted — soft-deleting an absent user is an idempotent no-op.
      let succeededCount = affectedUsers?.length ?? 0;

      switch (action) {
        case 'activate':
        case 'deactivate': {
          // Map to a valid user_management_audit_action_check value.
          auditAction = action === 'activate' ? 'user_activated' : 'user_deactivated';

          // activate/deactivate set a constant is_active (no per-user notes append),
          // so keep the single atomic bulk update.
          const { error } = await supabase
            .from('user_profiles')
            .update({ is_active: action === 'activate', updated_at: now })
            .in('id', userIds);

          if (error) throw error;
          break;
        }
        case 'delete': {
          auditAction = 'user_deleted';

          // Soft delete appends ' [DELETED]' to each user's existing notes, which
          // supabase-js .update() cannot express as a column-referencing SQL
          // expression. Read-then-write per user. Best-effort (LOCKED decision):
          // a mid-loop failure marks some users and not others; collect failures
          // and do NOT throw inside the loop.
          for (const u of affectedUsers ?? []) {
            const { error } = await supabase
              .from('user_profiles')
              .update({
                is_active: false,
                notes: (u.notes ?? '') + ' [DELETED]',
                updated_at: now,
              })
              .eq('id', u.id);

            if (error) {
              console.error(`Failed to soft-delete user ${u.id}:`, error);
              failedIds.push(u.id);
            }
          }

          succeededCount = (affectedUsers?.length ?? 0) - failedIds.length;

          // If every affected user failed, surface a hard error so the frontend
          // shows an error toast. (Empty affectedUsers => nothing to do, not an error.)
          if ((affectedUsers?.length ?? 0) > 0 && failedIds.length === (affectedUsers?.length ?? 0)) {
            return new Response(
              JSON.stringify({ error: 'Failed to delete the selected users.' }),
              {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              }
            );
          }
          break;
        }
        default:
          return new Response(JSON.stringify({ error: 'Invalid action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
      }

      // Send notification emails for activate/deactivate actions
      if ((action === 'activate' || action === 'deactivate') && affectedUsers) {
        // Get emails for affected users
        const { data: emailData } = await supabase.rpc('get_user_emails', {
          user_ids: userIds,
        });

        // Send notifications to each affected user
        for (const affectedUser of affectedUsers) {
          // Only send notification if status actually changed
          const wasActive = affectedUser.is_active;
          const willBeActive = action === 'activate';

          if (wasActive !== willBeActive) {
            const userEmailData = emailData?.find((e) => e.id === affectedUser.id);
            const userEmail = userEmailData?.email || affectedUser.email;

            if (userEmail) {
              try {
                // Raw fetch (not supabase.functions.invoke): the SDK's invoke from
                // inside a deployed edge fn with a service-role client silently fails
                // to deliver the bearer (mirror complete-review:310-322).
                const emailRes = await fetch(`${SUPABASE_URL}/functions/v1/send-email`, {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                    apikey: SUPABASE_SERVICE_ROLE_KEY,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    type: willBeActive ? 'account-reactivated' : 'account-deactivated',
                    to: userEmail,
                    data: {
                      recipientName: affectedUser.full_name || userEmail,
                      ...(willBeActive
                        ? { reactivatedBy: profile.full_name || user.email }
                        : { deactivatedBy: profile.full_name || user.email }),
                    },
                  }),
                });
                if (!emailRes.ok) {
                  const errText = await emailRes.text().catch(() => '<unreadable>');
                  console.error(
                    `Failed to send notification to ${userEmail} (${emailRes.status}):`,
                    errText.substring(0, 500)
                  );
                }
              } catch (emailError) {
                console.error(`Failed to send notification to ${userEmail}:`, emailError);
              }
            }
          }
        }
      }

      // Log audit trail. `bulk: true` lets audit readers distinguish bulk rows
      // from single-user rows (which share the same valid action enum values).
      const { error: auditError } = await supabase.from('user_management_audit').insert({
        actor_id: user.id,
        action: auditAction,
        metadata: { userIds, action, bulk: true },
      });
      // Non-fatal: an audit-write failure must not fail the user operation.
      if (auditError) {
        console.error('Failed to write bulk user-management audit row:', auditError);
      }

      return new Response(
        JSON.stringify({ success: true, affected: succeededCount, failed: failedIds }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // If no route matched
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in user-management function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
