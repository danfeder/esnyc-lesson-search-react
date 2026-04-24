import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';
import { Permission } from '@/types/auth';
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
import { IntPageHeader, IntStatCard, IntStatRow } from '@/components/Internal';

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
    target_email: string | null;
    created_at: string;
  }[];
}

interface GrowthData {
  date: string;
  users: number;
  invitations: number;
}

interface ChartColors {
  green: string;
  amber: string;
  orange: string;
  ink: string;
  ink70: string;
  ink30: string;
  ink10: string;
}

const FALLBACK_COLORS: ChartColors = {
  green: '#00843D',
  amber: '#B8860B',
  orange: '#C97A2A',
  ink: '#1A1A1A',
  ink70: '#4D4D4D',
  ink30: '#B3B3B3',
  ink10: '#E6E6E6',
};

function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(FALLBACK_COLORS);
  useEffect(() => {
    const root = document.documentElement;
    const read = (name: string, fallback: string) =>
      window.getComputedStyle(root).getPropertyValue(name).trim() || fallback;
    setColors({
      green: read('--color-esy-green', FALLBACK_COLORS.green),
      amber: read('--color-esy-amber-review', FALLBACK_COLORS.amber),
      orange: read('--color-esy-orange-revision', FALLBACK_COLORS.orange),
      ink: read('--color-esy-ink', FALLBACK_COLORS.ink),
      ink70: read('--color-esy-ink-70', FALLBACK_COLORS.ink70),
      ink30: read('--color-esy-ink-30', FALLBACK_COLORS.ink30),
      ink10: read('--color-esy-ink-10', FALLBACK_COLORS.ink10),
    });
  }, []);
  return colors;
}

function formatRoleLabel(role: string): string {
  if (role === 'super_admin') return 'Super admin';
  if (!role) return 'Unknown';
  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function AdminAnalytics() {
  const navigate = useNavigate();
  const { hasPermission } = useEnhancedAuth();
  const colors = useChartColors();
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState(30); // days

  const roleColorMap: Record<string, string> = {
    teacher: colors.green,
    reviewer: colors.amber,
    admin: colors.orange,
    super_admin: colors.ink,
  };

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

    const { data: loginData } = await supabase
      .from('user_management_audit')
      .select('created_at')
      .eq('action', 'login')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true });

    const loginsByDay: Record<string, number> = {};
    loginData?.forEach((login) => {
      const day = format(new Date(login.created_at), 'yyyy-MM-dd');
      loginsByDay[day] = (loginsByDay[day] || 0) + 1;
    });

    const recentLogins = Object.entries(loginsByDay).map(([date, count]) => ({
      date: format(new Date(date), 'MMM dd'),
      count,
    }));

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

    const { data: activities } = await supabase
      .from('user_management_audit')
      .select('id, action, target_email, created_at, actor_id')
      .order('created_at', { ascending: false })
      .limit(10);

    let recentActivities: ActivityStats['recentActivities'] = [];
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

      const userCount =
        allUsers?.filter((u) => u.created_at && new Date(u.created_at) <= endDate).length || 0;

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
      <div className="int-shell-root">
        <div className="adm-page">
          <div className="adm-empty">
            <h3>Access denied</h3>
            <p>You don't have permission to view analytics.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="int-shell-root">
        <div className="adm-page">
          <p className="adm-section-desc" role="status" aria-live="polite">
            Loading analytics…
          </p>
        </div>
      </div>
    );
  }

  const activePct = userStats.total > 0 ? (userStats.active / userStats.total) * 100 : 0;

  const dateRangeSelect = (
    <select
      className="adm-select"
      value={dateRange}
      onChange={(e) => setDateRange(Number(e.target.value))}
      aria-label="Date range"
    >
      <option value={7}>Last 7 days</option>
      <option value={30}>Last 30 days</option>
      <option value={90}>Last 90 days</option>
    </select>
  );

  const chartAxisStyle = { fontSize: 11, fill: colors.ink70 };
  const tooltipStyle = {
    backgroundColor: '#ffffff',
    border: `1px solid ${colors.ink10}`,
    borderRadius: 4,
    fontSize: 12,
    color: colors.ink,
  };

  return (
    <div className="int-shell-root">
      <div className="adm-page">
        <IntPageHeader
          title="Analytics"
          description="User activity and system insights across the library."
          actions={dateRangeSelect}
          back={{ label: 'Back to Admin', onClick: () => navigate('/admin') }}
        />

        <IntStatRow>
          <IntStatCard
            label="Total users"
            value={userStats.total}
            delta={
              userStats.newThisWeek > 0
                ? { text: `+${userStats.newThisWeek} this week`, direction: 'up' }
                : { text: 'No new users this week' }
            }
          />
          <IntStatCard
            label="Active users"
            value={userStats.active}
            delta={{
              text: `${activePct.toFixed(0)}% of total`,
            }}
          />
          <IntStatCard
            label="Invitations sent"
            value={invitationStats.total}
            delta={{
              text: `${invitationStats.pending} pending`,
            }}
          />
          <IntStatCard
            label="Acceptance rate"
            value={`${invitationStats.acceptanceRate.toFixed(0)}%`}
            delta={{
              text: `${invitationStats.accepted} accepted`,
            }}
          />
        </IntStatRow>

        <div className="adm-analytics-grid adm-analytics-grid--2">
          <div className="adm-card">
            <div className="adm-section-eyebrow">User growth</div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={growthData}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.ink10} />
                <XAxis dataKey="date" tick={chartAxisStyle} stroke={colors.ink30} />
                <YAxis tick={chartAxisStyle} stroke={colors.ink30} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, color: colors.ink70 }} />
                <Line
                  type="monotone"
                  dataKey="users"
                  stroke={colors.green}
                  name="Total users"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="invitations"
                  stroke={colors.amber}
                  name="Invitations"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="adm-card">
            <div className="adm-section-eyebrow">Users by role</div>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={userStats.byRole}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ payload }) => `${formatRoleLabel(payload.role)}: ${payload.count}`}
                  outerRadius={80}
                  dataKey="count"
                  stroke={colors.ink10}
                >
                  {userStats.byRole.map((entry) => (
                    <Cell
                      key={`cell-${entry.role}`}
                      fill={roleColorMap[entry.role] ?? colors.ink30}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="adm-analytics-grid adm-analytics-grid--3">
          <div className="adm-card">
            <div className="adm-section-eyebrow">Login activity</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={activityStats.recentLogins}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.ink10} />
                <XAxis dataKey="date" tick={chartAxisStyle} stroke={colors.ink30} />
                <YAxis tick={chartAxisStyle} stroke={colors.ink30} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: colors.ink10 }} />
                <Bar dataKey="count" fill={colors.green} radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="adm-card">
            <div className="adm-section-eyebrow">Top lesson submitters</div>
            {activityStats.topSubmitters.length > 0 ? (
              <ul className="adm-leaderboard">
                {activityStats.topSubmitters.map((user, index) => (
                  <li key={`${user.email}-${index}`}>
                    <span className="adm-leaderboard-name">{user.name}</span>
                    <span className="adm-leaderboard-count">{user.submissions} lessons</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="adm-empty-text">No submissions in this period.</p>
            )}
          </div>

          <div className="adm-card">
            <div className="adm-section-eyebrow">Top reviewers</div>
            {activityStats.topReviewers.length > 0 ? (
              <ul className="adm-leaderboard">
                {activityStats.topReviewers.map((user, index) => (
                  <li key={`${user.email}-${index}`}>
                    <span className="adm-leaderboard-name">{user.name}</span>
                    <span className="adm-leaderboard-count">{user.reviews} reviews</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="adm-empty-text">No reviews in this period.</p>
            )}
          </div>
        </div>

        <div className="adm-card">
          <div className="adm-section-eyebrow">Recent activity</div>
          {activityStats.recentActivities.length > 0 ? (
            <ul className="adm-activity-list">
              {activityStats.recentActivities.map((activity) => (
                <li key={activity.id}>
                  <div className="adm-activity-body">
                    <span className="adm-activity-actor">{activity.actor_name}</span>
                    <span className="adm-activity-action">{formatAction(activity.action)}</span>
                    {activity.target_email && (
                      <span className="adm-activity-target">→ {activity.target_email}</span>
                    )}
                  </div>
                  <time className="adm-activity-time">
                    {format(new Date(activity.created_at), 'MMM dd, h:mm a')}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="adm-empty-text">No recent activity.</p>
          )}
        </div>
      </div>
    </div>
  );
}
