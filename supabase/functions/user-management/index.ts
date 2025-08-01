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
        (allowed) => allowed.includes('*') && origin.match(new RegExp(allowed.replace('*', '.*')))
      ));

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  };
};

interface UserFilters {
  search?: string;
  role?: string;
  isActive?: boolean;
  school?: string;
  borough?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
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

    // Route handling
    const pathParts = pathname.split('/').filter(Boolean);

    // GET /users - List all users with filtering
    if (req.method === 'GET' && pathParts.length === 1 && pathParts[0] === 'users') {
      const page = parseInt(url.searchParams.get('page') || '1');
      const limit = parseInt(url.searchParams.get('limit') || '20');
      const offset = (page - 1) * limit;

      const filters: UserFilters = {
        search: url.searchParams.get('search') || undefined,
        role: url.searchParams.get('role') || undefined,
        isActive:
          url.searchParams.get('isActive') === 'true'
            ? true
            : url.searchParams.get('isActive') === 'false'
              ? false
              : undefined,
        school: url.searchParams.get('school') || undefined,
        borough: url.searchParams.get('borough') || undefined,
        sortBy: url.searchParams.get('sortBy') || 'created_at',
        sortOrder: (url.searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc',
      };

      // Build query
      let query = supabase
        .from('user_profiles')
        .select('*, email:auth.users!inner(email)', { count: 'exact' })
        .range(offset, offset + limit - 1);

      // Apply filters - using Supabase's built-in query builder to prevent SQL injection
      if (filters.search) {
        // Use ilike with proper parameterization
        query = query.or(
          `full_name.ilike.%${filters.search.replace(/[%_]/g, '\\$&')}%,email.ilike.%${filters.search.replace(/[%_]/g, '\\$&')}%`
        );
      }
      if (filters.role) {
        query = query.eq('role', filters.role);
      }
      if (filters.isActive !== undefined) {
        query = query.eq('is_active', filters.isActive);
      }
      if (filters.school) {
        // Escape special characters in LIKE patterns
        query = query.ilike('school_name', `%${filters.school.replace(/[%_]/g, '\\$&')}%`);
      }
      if (filters.borough) {
        query = query.eq('school_borough', filters.borough);
      }

      // Apply sorting
      query = query.order(filters.sortBy, { ascending: filters.sortOrder === 'asc' });

      const { data: users, count, error } = await query;

      if (error) throw error;

      // Get email data separately due to RLS limitations
      const userIds = users?.map((u) => u.id) || [];
      const { data: emailData } = await supabase.rpc('get_user_emails', {
        user_ids: userIds,
      });

      // Merge email data
      const usersWithEmails = users?.map((user) => {
        const emailInfo = emailData?.find((e) => e.id === user.id);
        return {
          ...user,
          email: emailInfo?.email || user.email || 'Unknown',
        };
      });

      return new Response(
        JSON.stringify({
          users: usersWithEmails,
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

    // GET /users/:id - Get single user details
    if (req.method === 'GET' && pathParts.length === 2 && pathParts[0] === 'users') {
      const userId = pathParts[1];

      const { data: userProfile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !userProfile) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Get email
      const { data: emailData } = await supabase.rpc('get_user_emails', {
        user_ids: [userId],
      });

      // Get recent activity
      const { data: recentActivity } = await supabase
        .from('user_management_audit')
        .select('*')
        .eq('target_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      // Get submission stats
      const { data: submissions, count: submissionCount } = await supabase
        .from('lesson_submissions')
        .select('*', { count: 'exact', head: false })
        .eq('teacher_id', userId);

      const stats = {
        totalSubmissions: submissionCount || 0,
        approvedSubmissions: submissions?.filter((s) => s.status === 'approved').length || 0,
        pendingSubmissions:
          submissions?.filter((s) => s.status === 'submitted' || s.status === 'in_review').length ||
          0,
      };

      return new Response(
        JSON.stringify({
          user: {
            ...userProfile,
            email: emailData?.[0]?.email || userProfile.email || 'Unknown',
          },
          activity: recentActivity || [],
          stats,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH /users/:id - Update user
    if (req.method === 'PATCH' && pathParts.length === 2 && pathParts[0] === 'users') {
      const userId = pathParts[1];
      const updates = await req.json();

      // Get current user data for audit trail
      const { data: currentUser } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!currentUser) {
        return new Response(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Prepare update data
      const updateData: any = {};
      const allowedFields = [
        'role',
        'is_active',
        'school_name',
        'school_borough',
        'grades_taught',
        'subjects_taught',
        'notes',
        'full_name',
      ];

      for (const field of allowedFields) {
        if (field in updates) {
          updateData[field] = updates[field];
        }
      }

      updateData.updated_at = new Date().toISOString();

      // Perform update
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', userId);

      if (updateError) throw updateError;

      // Log audit trail
      await supabase.from('user_management_audit').insert({
        actor_id: user.id,
        action: 'user_profile_updated',
        target_user_id: userId,
        old_values: currentUser,
        new_values: updateData,
      });

      return new Response(JSON.stringify({ success: true, updated: updateData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // DELETE /users/:id - Soft delete user
    if (req.method === 'DELETE' && pathParts.length === 2 && pathParts[0] === 'users') {
      const userId = pathParts[1];

      // Soft delete by deactivating
      const { error } = await supabase
        .from('user_profiles')
        .update({
          is_active: false,
          notes: supabase.sql`COALESCE(notes, '') || ' [DELETED]'`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      // Log audit trail
      await supabase.from('user_management_audit').insert({
        actor_id: user.id,
        action: 'user_deleted',
        target_user_id: userId,
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

      let updateData: any = {};
      let auditAction = '';

      switch (action) {
        case 'activate':
          updateData = { is_active: true };
          auditAction = 'bulk_users_activated';
          break;
        case 'deactivate':
          updateData = { is_active: false };
          auditAction = 'bulk_users_deactivated';
          break;
        case 'delete':
          updateData = {
            is_active: false,
            notes: supabase.sql`COALESCE(notes, '') || ' [DELETED]'`,
          };
          auditAction = 'bulk_users_deleted';
          break;
        default:
          return new Response(JSON.stringify({ error: 'Invalid action' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
      }

      updateData.updated_at = new Date().toISOString();

      // Perform bulk update
      const { error } = await supabase.from('user_profiles').update(updateData).in('id', userIds);

      if (error) throw error;

      // Log audit trail
      await supabase.from('user_management_audit').insert({
        actor_id: user.id,
        action: auditAction,
        metadata: { userIds, action },
      });

      return new Response(JSON.stringify({ success: true, affected: userIds.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
