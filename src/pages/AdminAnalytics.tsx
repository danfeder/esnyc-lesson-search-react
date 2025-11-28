import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';
import { Permission } from '@/types/auth';
import {
  ArrowLeft,
  BarChart3,
  Users,
  TrendingUp,
  Activity,
  Mail,
  CheckCircle,
  Clock,
  UserCheck,
  FileText,
  Star,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, subDays, endOfDay } from 'date-fns';
import { logger } from '@/utils/logger';

interface UserStats {
  total: number;
  byRole: { role: string; count: number }[];
  active: number;
  inactive: number;
  newThisWeek: number;
  newThisMonth: number;
}

interface InvitationStats {
  total: number;
  pending: number;
  accepted: number;
  expired: number;
  acceptanceRate: number;
}

interface ActivityStats {
  recentLogins: { date: string; count: number }[];
  topSubmitters: { name: string; email: string; submissions: number }[];
  topReviewers: { name: string; email: string; reviews: number }[];
  recentActivities: {
    id: string;
    actor_name: string;
    action: string;
    target_email?: string;
    created_at: string;
  }[];
}

interface GrowthData {
  date: string;
  users: number;
  invitations: number;
}

const ROLE_COLORS = {
  teacher: '#10b981',
  reviewer: '#3b82f6',
  admin: '#ef4444',
  super_admin: '#a855f7',
};

export function AdminAnalytics() {
  const navigate = useNavigate();
  const { hasPermission } = useEnhancedAuth();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30); // days

  const [userStats, setUserStats] = useState<UserStats>({
    total: 0,
    byRole: [],
    active: 0,
    inactive: 0,
    newThisWeek: 0,
    newThisMonth: 0,
  });

  const [invitationStats, setInvitationStats] = useState<InvitationStats>({
    total: 0,
    pending: 0,
    accepted: 0,
    expired: 0,
    acceptanceRate: 0,
  });

  const [activityStats, setActivityStats] = useState<ActivityStats>({
    recentLogins: [],
    topSubmitters: [],
    topReviewers: [],
    recentActivities: [],
  });

  const [growthData, setGrowthData] = useState<GrowthData[]>([]);

  const loadUserStats = useCallback(async () => {
    // Get total users and by role
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select('role, is_active, created_at');

    if (error) throw error;

    const weekAgo = subDays(new Date(), 7);
    const monthAgo = subDays(new Date(), 30);

    const stats: UserStats = {
      total: users?.length || 0,
      byRole: [],
      active: users?.filter((u) => u.is_active).length || 0,
      inactive: users?.filter((u) => !u.is_active).length || 0,
      newThisWeek:
        users?.filter((u) => u.created_at && new Date(u.created_at) >= weekAgo).length || 0,
      newThisMonth:
        users?.filter((u) => u.created_at && new Date(u.created_at) >= monthAgo).length || 0,
    };

    // Count by role
    const roleCounts: Record<string, number> = {};
    users?.forEach((user) => {
      const role = user.role || 'unknown';
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    });

    stats.byRole = Object.entries(roleCounts).map(([role, count]) => ({
      role,
      count,
    }));

    setUserStats(stats);
  }, []);

  const loadInvitationStats = useCallback(async () => {
    const { data: invitations, error } = await supabase
      .from('user_invitations')
      .select('accepted_at, expires_at');

    if (error) throw error;

    const now = new Date();
    const pending =
      invitations?.filter((inv) => !inv.accepted_at && new Date(inv.expires_at) > now).length || 0;

    const accepted = invitations?.filter((inv) => inv.accepted_at).length || 0;

    const expired =
      invitations?.filter((inv) => !inv.accepted_at && new Date(inv.expires_at) <= now).length || 0;

    const total = invitations?.length || 0;
    const acceptanceRate = total > 0 ? (accepted / total) * 100 : 0;

    setInvitationStats({
      total,
      pending,
      accepted,
      expired,
      acceptanceRate,
    });
  }, []);

  const loadActivityStats = useCallback(async () => {
    const startDate = subDays(new Date(), dateRange);

    // Get recent login activity
    const { data: loginData } = await supabase
      .from('user_management_audit')
      .select('created_at')
      .eq('action', 'login')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    // Group logins by day
    const loginsByDay: Record<string, number> = {};
    loginData?.forEach((login) => {
      const day = format(new Date(login.created_at), 'yyyy-MM-dd');
      loginsByDay[day] = (loginsByDay[day] || 0) + 1;
    });

    const recentLogins = Object.entries(loginsByDay).map(([date, count]) => ({
      date: format(new Date(date), 'MMM dd'),
      count,
    }));

    // Get top submitters - wrapped in try/catch as table might not exist
    let topSubmitters: { name: string; email: string; submissions: number }[] = [];
    try {
      const { data: submissions, error: submissionsError } = await supabase
        .from('lesson_submissions')
        .select('teacher_id')
        .gte('created_at', startDate.toISOString());

      if (!submissionsError && submissions) {
        const submissionCounts: Record<string, number> = {};
        submissions.forEach((sub) => {
          submissionCounts[sub.teacher_id] = (submissionCounts[sub.teacher_id] || 0) + 1;
        });

        // Get user details separately
        const userIds = Object.keys(submissionCounts);
        if (userIds.length > 0) {
          const { data: users } = await supabase
            .from('user_profiles')
            .select('id, full_name, email')
            .in('id', userIds);

          topSubmitters = userIds
            .map((id) => {
              const user = users?.find((u) => u.id === id);
              return {
                name: user?.full_name || 'Unknown',
                email: user?.email || '',
                submissions: submissionCounts[id],
              };
            })
            .sort((a, b) => b.submissions - a.submissions)
            .slice(0, 5);
        }
      }
    } catch (error) {
      logger.error('Error loading submissions:', error);
    }

    // Get top reviewers - wrapped in try/catch as table might not exist
    let topReviewers: { name: string; email: string; reviews: number }[] = [];
    try {
      const { data: reviews, error: reviewsError } = await supabase
        .from('submission_reviews')
        .select('reviewer_id')
        .gte('created_at', startDate.toISOString());

      if (!reviewsError && reviews) {
        const reviewCounts: Record<string, number> = {};
        reviews.forEach((review) => {
          reviewCounts[review.reviewer_id] = (reviewCounts[review.reviewer_id] || 0) + 1;
        });

        // Get user details separately
        const userIds = Object.keys(reviewCounts);
        if (userIds.length > 0) {
          const { data: users } = await supabase
            .from('user_profiles')
            .select('id, full_name, email')
            .in('id', userIds);

          topReviewers = userIds
            .map((id) => {
              const user = users?.find((u) => u.id === id);
              return {
                name: user?.full_name || 'Unknown',
                email: user?.email || '',
                reviews: reviewCounts[id],
              };
            })
            .sort((a, b) => b.reviews - a.reviews)
            .slice(0, 5);
        }
      }
    } catch (error) {
      logger.error('Error loading reviews:', error);
    }

    // Get recent activities - simplified query
    const { data: activities } = await supabase
      .from('user_management_audit')
      .select('id, action, target_email, created_at, actor_id')
      .order('created_at', { ascending: false })
      .limit(10);

    // Get actor names separately
    let recentActivities: any[] = [];
    if (activities && activities.length > 0) {
      const actorIds = [...new Set(activities.map((a) => a.actor_id))].filter(Boolean);
      const { data: actors } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', actorIds);

      recentActivities = activities.map((activity) => {
        const actor = actors?.find((a) => a.id === activity.actor_id);
        return {
          id: activity.id,
          actor_name: actor?.full_name || 'Unknown',
          action: activity.action,
          target_email: activity.target_email,
          created_at: activity.created_at,
        };
      });
    }

    setActivityStats({
      recentLogins,
      topSubmitters,
      topReviewers,
      recentActivities,
    });
  }, [dateRange]);

  const loadGrowthData = useCallback(async () => {
    const data: GrowthData[] = [];

    // Get all users and invitations first to minimize queries
    const { data: allUsers } = await supabase
      .from('user_profiles')
      .select('created_at')
      .order('created_at', { ascending: true });

    const { data: allInvitations } = await supabase
      .from('user_invitations')
      .select('created_at')
      .order('created_at', { ascending: true });

    for (let i = dateRange - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const endDate = endOfDay(date);

      // Count users created up to this date
      const userCount =
        allUsers?.filter((u) => u.created_at && new Date(u.created_at) <= endDate).length || 0;

      // Count invitations sent up to this date
      const inviteCount =
        allInvitations?.filter((inv) => new Date(inv.created_at) <= endDate).length || 0;

      data.push({
        date: format(date, 'MMM dd'),
        users: userCount,
        invitations: inviteCount,
      });
    }

    setGrowthData(data);
  }, [dateRange]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadUserStats(),
        loadInvitationStats(),
        loadActivityStats(),
        loadGrowthData(),
      ]);
    } catch (error) {
      logger.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [loadUserStats, loadInvitationStats, loadActivityStats, loadGrowthData]);

  useEffect(() => {
    if (hasPermission(Permission.VIEW_ANALYTICS)) {
      loadAnalytics();
    }
  }, [hasPermission, loadAnalytics]);

  const formatAction = (action: string) => {
    const actionMap: Record<string, string> = {
      login: 'Logged in',
      invite_sent: 'Sent invitation',
      invite_accepted: 'Accepted invitation',
      invite_resent: 'Resent invitation',
      invite_cancelled: 'Cancelled invitation',
      user_profile_updated: 'Updated profile',
      user_deleted: 'Deleted user',
      bulk_users_activated: 'Activated users',
      bulk_users_deactivated: 'Deactivated users',
      bulk_users_deleted: 'Deleted users',
    };
    return actionMap[action] || action;
  };

  if (!hasPermission(Permission.VIEW_ANALYTICS)) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-600">You don't have permission to view analytics</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Admin
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6" />
              Analytics Dashboard
            </h1>
            <p className="text-gray-600 mt-1">User activity and system insights</p>
          </div>

          <select
            value={dateRange}
            onChange={(e) => setDateRange(Number(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{userStats.total}</p>
              <p className="text-xs text-green-600 mt-1">+{userStats.newThisWeek} this week</p>
            </div>
            <Users className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-green-600">{userStats.active}</p>
              <p className="text-xs text-gray-500 mt-1">
                {((userStats.active / userStats.total) * 100).toFixed(0)}% of total
              </p>
            </div>
            <UserCheck className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Invitations Sent</p>
              <p className="text-2xl font-bold text-blue-600">{invitationStats.total}</p>
              <p className="text-xs text-gray-500 mt-1">{invitationStats.pending} pending</p>
            </div>
            <Mail className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Acceptance Rate</p>
              <p className="text-2xl font-bold text-purple-600">
                {invitationStats.acceptanceRate.toFixed(0)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">{invitationStats.accepted} accepted</p>
            </div>
            <CheckCircle className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* User Growth Chart */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            User Growth
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={growthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="users"
                stroke="#10b981"
                name="Total Users"
                strokeWidth={2}
              />
              <Line
                type="monotone"
                dataKey="invitations"
                stroke="#3b82f6"
                name="Invitations"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Users by Role */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Users className="w-5 h-5" />
            Users by Role
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={userStats.byRole}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ role, count }) => `${role}: ${count}`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="count"
              >
                {userStats.byRole.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={ROLE_COLORS[entry.role as keyof typeof ROLE_COLORS] || '#gray'}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Login Activity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Login Activity
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={activityStats.recentLogins}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Submitters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Top Lesson Submitters
          </h3>
          {activityStats.topSubmitters.length > 0 ? (
            <div className="space-y-3">
              {activityStats.topSubmitters.map((user, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{user.name}</span>
                  </div>
                  <span className="text-sm text-gray-600">{user.submissions} lessons</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No submissions in this period</p>
          )}
        </div>

        {/* Top Reviewers */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Star className="w-5 h-5" />
            Top Reviewers
          </h3>
          {activityStats.topReviewers.length > 0 ? (
            <div className="space-y-3">
              {activityStats.topReviewers.map((user, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">{user.name}</span>
                  </div>
                  <span className="text-sm text-gray-600">{user.reviews} reviews</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No reviews in this period</p>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Recent Activity
        </h3>
        <div className="space-y-3">
          {activityStats.recentActivities.map((activity) => (
            <div
              key={activity.id}
              className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
            >
              <div className="flex items-center gap-3">
                <Activity className="w-4 h-4 text-gray-400" />
                <div>
                  <span className="text-sm font-medium text-gray-900">{activity.actor_name}</span>
                  <span className="text-sm text-gray-600 ml-2">
                    {formatAction(activity.action)}
                  </span>
                  {activity.target_email && (
                    <span className="text-sm text-gray-500 ml-1">→ {activity.target_email}</span>
                  )}
                </div>
              </div>
              <span className="text-xs text-gray-500">
                {format(new Date(activity.created_at), 'MMM dd, h:mm a')}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
