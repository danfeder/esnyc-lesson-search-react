import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';
import { Permission, UserInvitation } from '@/types/auth';
import { Download, Plus, Search, Send, XCircle } from 'lucide-react';
import { format, formatDistanceToNow, isPast } from 'date-fns';
import { logger } from '@/utils/logger';
import {
  IntAlert,
  IntButton,
  IntDataTable,
  IntPageHeader,
  IntRoleBadge,
  IntStatCard,
  IntStatRow,
  IntStatusBadge,
  IntTabs,
  type IntDataTableColumn,
  type IntRole,
  type IntStatus,
} from '@/components/Internal';

type InvitationFilter = 'all' | 'pending' | 'accepted' | 'expired';

const TAB_ORDER: InvitationFilter[] = ['pending', 'expired', 'accepted', 'all'];
const TAB_LABEL: Record<InvitationFilter, string> = {
  all: 'All',
  pending: 'Pending',
  accepted: 'Accepted',
  expired: 'Expired',
};

const EMPTY_COPY: Record<InvitationFilter, { title: string; body: string }> = {
  pending: {
    title: 'No pending invitations',
    body: 'Every invite has been accepted, expired, or cancelled.',
  },
  expired: {
    title: 'No expired invitations',
    body: 'Expired invites stay here for reference so you can resend them.',
  },
  accepted: {
    title: 'No accepted invitations yet',
    body: "Once someone clicks through their invite link, they'll appear here.",
  },
  all: { title: 'No invitations', body: 'Invite your first teacher or reviewer to get started.' },
};

const EXPIRING_SOON_MS = 48 * 60 * 60 * 1000;

type Toast = { kind: 'success' | 'error' | 'info'; msg: string };

const PERMISSIONS_FOR_ROLE: Record<string, string[]> = {
  teacher: ['view_lessons', 'submit_lessons'],
  reviewer: [
    'view_lessons',
    'submit_lessons',
    'review_lessons',
    'approve_lessons',
    'view_analytics',
  ],
  admin: [
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
  ],
  super_admin: [
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
  ],
};

function getPermissionsForRole(role: string): string[] {
  return PERMISSIONS_FOR_ROLE[role] ?? ['view_lessons', 'submit_lessons'];
}

function statusOf(inv: UserInvitation): 'accepted' | 'expired' | 'pending' {
  if (inv.accepted_at) return 'accepted';
  if (isPast(new Date(inv.expires_at))) return 'expired';
  return 'pending';
}

function statusBadgeVariant(inv: UserInvitation): IntStatus {
  const s = statusOf(inv);
  if (s === 'accepted') return 'approved';
  if (s === 'expired') return 'expired';
  return 'pending';
}

export function AdminInvitations() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, hasPermission, loading: authLoading } = useEnhancedAuth();
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<InvitationFilter>('pending');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  // Pick up any toast passed in navigation state (e.g. from AdminInviteUser).
  useEffect(() => {
    const incoming = (location.state as { toast?: Toast } | null)?.toast;
    if (incoming) {
      setToast(incoming);
      // Clear history state so a refresh doesn't replay the toast.
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  const loadInvitations = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_invitations')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setInvitations(
        (data || []).map((inv) => ({
          ...inv,
          role: inv.role as UserInvitation['role'],
          accepted_at: inv.accepted_at || undefined,
          school_name: inv.school_name || undefined,
          school_borough: inv.school_borough || undefined,
          metadata: (inv.metadata as UserInvitation['metadata']) || undefined,
        }))
      );
    } catch (err) {
      logger.error('Error loading invitations:', err);
      setToast({ kind: 'error', msg: 'Failed to load invitations.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasPermission(Permission.VIEW_USERS)) {
      loadInvitations();
    }
  }, [hasPermission, loadInvitations]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  // --- Single-invite helpers (also reused by bulk paths) ------------------

  const resendOne = useCallback(
    async (inv: UserInvitation): Promise<{ emailDelivered: boolean }> => {
      const newExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

      const { error: updateError } = await supabase
        .from('user_invitations')
        .update({ expires_at: newExpiresAt })
        .eq('id', inv.id);
      if (updateError) throw updateError;

      if (!user) return { emailDelivered: false };

      await supabase.from('user_management_audit').insert({
        actor_id: user.id,
        action: 'invite_resent',
        target_email: inv.email,
      });

      // Email delivery failures are reported but don't unwind the DB update —
      // re-throwing here would make the caller show "Failed to resend" and
      // prompt a retry that double-extends expires_at + writes a duplicate
      // audit row. The caller surfaces a softer warning instead.
      try {
        const inviterProfile = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        // supabase.functions.invoke resolves (does not throw) on a non-2xx
        // response — the failure surfaces in `error`, not the catch. Check it
        // explicitly so we never report "delivered" when send-email actually
        // failed (e.g. the Resend sandbox rejecting a non-owner recipient).
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            type: 'invitation',
            to: inv.email,
            data: {
              invitationId: inv.id,
              token: inv.token,
              inviterName: inviterProfile.data?.full_name || user.email || 'Admin',
              role: inv.role,
              permissions: getPermissionsForRole(inv.role),
              expiresAt: newExpiresAt,
            },
          },
        });
        if (emailError) {
          logger.error('Failed to resend invitation email:', emailError);
          return { emailDelivered: false };
        }
        return { emailDelivered: true };
      } catch (emailError) {
        logger.error('Failed to resend invitation email:', emailError);
        return { emailDelivered: false };
      }
    },
    [user]
  );

  const cancelOne = useCallback(
    async (inv: UserInvitation): Promise<void> => {
      const { error } = await supabase.from('user_invitations').delete().eq('id', inv.id);
      if (error) throw error;
      if (user) {
        await supabase.from('user_management_audit').insert({
          actor_id: user.id,
          action: 'invite_cancelled',
          target_email: inv.email,
        });
      }
    },
    [user]
  );

  // --- Single-row handlers ------------------------------------------------

  const handleResend = useCallback(
    async (inv: UserInvitation) => {
      try {
        const { emailDelivered } = await resendOne(inv);
        await loadInvitations();
        setToast(
          emailDelivered
            ? { kind: 'success', msg: `Invitation resent to ${inv.email}` }
            : {
                kind: 'info',
                msg: `Invitation extended for ${inv.email} — email delivery may be delayed.`,
              }
        );
      } catch (err) {
        logger.error('Error resending invitation:', err);
        setToast({ kind: 'error', msg: `Failed to resend to ${inv.email}` });
      }
    },
    [resendOne, loadInvitations]
  );

  const handleCancel = useCallback(
    async (inv: UserInvitation) => {
      if (!window.confirm(`Cancel the invitation to ${inv.email}?`)) return;
      try {
        await cancelOne(inv);
        setInvitations((list) => list.filter((i) => i.id !== inv.id));
        setSelectedKeys((keys) => keys.filter((k) => k !== inv.id));
        setToast({ kind: 'info', msg: `Invitation to ${inv.email} cancelled` });
      } catch (err) {
        logger.error('Error cancelling invitation:', err);
        setToast({ kind: 'error', msg: `Failed to cancel invite for ${inv.email}` });
      }
    },
    [cancelOne]
  );

  // --- Bulk handlers ------------------------------------------------------

  const selectedInvitations = useMemo(
    () => invitations.filter((inv) => selectedKeys.includes(inv.id)),
    [invitations, selectedKeys]
  );
  const selectedResendable = useMemo(
    () => selectedInvitations.filter((inv) => !inv.accepted_at),
    [selectedInvitations]
  );

  const handleBulkResend = async () => {
    if (selectedResendable.length === 0) return;
    setBulkRunning(true);
    try {
      const results = await Promise.allSettled(selectedResendable.map((inv) => resendOne(inv)));
      const failed = results.filter((r) => r.status === 'rejected').length;
      const fulfilled = results.filter(
        (r): r is PromiseFulfilledResult<{ emailDelivered: boolean }> => r.status === 'fulfilled'
      );
      const delivered = fulfilled.filter((r) => r.value.emailDelivered).length;
      const delayed = fulfilled.length - delivered;
      await loadInvitations();
      setSelectedKeys([]);
      let msg: string;
      let kind: Toast['kind'];
      if (failed > 0) {
        kind = 'error';
        msg =
          delayed > 0
            ? `${delivered} resent, ${delayed} extended without email, ${failed} failed`
            : `${delivered + delayed} resent, ${failed} failed`;
      } else if (delayed > 0) {
        kind = 'info';
        msg = `${delivered} resent, ${delayed} extended without email — delivery may be delayed.`;
      } else {
        kind = 'success';
        msg = `${delivered} invitation${delivered === 1 ? '' : 's'} resent`;
      }
      setToast({ kind, msg });
    } finally {
      setBulkRunning(false);
    }
  };

  const handleBulkCancel = async () => {
    if (selectedResendable.length === 0) return;
    // On the 'all' tab the user can select accepted invitations alongside
    // pending/expired ones. Accepted invitations can't be cancelled, so they
    // get silently filtered out via selectedResendable. Spell that out in the
    // confirm dialog so the count doesn't look mysteriously off.
    const skipped = selectedInvitations.length - selectedResendable.length;
    const confirmMsg =
      skipped > 0
        ? `Cancel ${selectedResendable.length} invitation(s)? (${skipped} accepted invitation${
            skipped === 1 ? '' : 's'
          } in your selection will be skipped.)`
        : `Cancel ${selectedResendable.length} invitation(s)?`;
    if (!window.confirm(confirmMsg)) return;
    setBulkRunning(true);
    try {
      const results = await Promise.allSettled(selectedResendable.map((inv) => cancelOne(inv)));
      const failed = results.filter((r) => r.status === 'rejected').length;
      const ok = results.length - failed;
      await loadInvitations();
      setSelectedKeys([]);
      setToast({
        kind: failed > 0 ? 'error' : 'info',
        msg:
          failed > 0
            ? `${ok} cancelled, ${failed} failed`
            : `${ok} invitation${ok === 1 ? '' : 's'} cancelled`,
      });
    } finally {
      setBulkRunning(false);
    }
  };

  // --- Derived -----------------------------------------------------------

  const counts = useMemo(() => {
    const c = { all: invitations.length, pending: 0, accepted: 0, expired: 0 };
    for (const inv of invitations) c[statusOf(inv)]++;
    return c;
  }, [invitations]);

  const expiringSoon = useMemo(
    () =>
      invitations.filter((inv) => {
        if (statusOf(inv) !== 'pending') return false;
        const ms = new Date(inv.expires_at).getTime() - Date.now();
        return ms > 0 && ms < EXPIRING_SOON_MS;
      }).length,
    [invitations]
  );

  const filteredInvitations = useMemo(() => {
    let list = invitations;
    if (filter !== 'all') list = list.filter((inv) => statusOf(inv) === filter);
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (inv) =>
          inv.email.toLowerCase().includes(q) ||
          inv.school_name?.toLowerCase().includes(q) ||
          inv.role.toLowerCase().includes(q)
      );
    }
    return list;
  }, [invitations, filter, searchTerm]);

  // --- Export -----------------------------------------------------------

  const exportToCSV = () => {
    // Defend against CSV injection: prefix cells beginning with =/+/-/@ (and
    // tab/CR which Excel also treats as formula starts) with a single quote so
    // Excel/Sheets render them as literal text. Also double up embedded `"` per
    // RFC 4180 so values containing quotes don't break the CSV format.
    const escapeCell = (raw: string): string => {
      const value = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;
      return `"${value.replace(/"/g, '""')}"`;
    };
    const csv = [
      [
        'Email',
        'Role',
        'School',
        'Borough',
        'Status',
        'Invited By',
        'Invited At',
        'Expires At',
        'Accepted At',
      ],
      ...filteredInvitations.map((inv) => [
        inv.email,
        inv.role,
        inv.school_name || '',
        inv.school_borough || '',
        statusOf(inv),
        inv.invited_by,
        format(new Date(inv.invited_at), 'yyyy-MM-dd HH:mm'),
        format(new Date(inv.expires_at), 'yyyy-MM-dd HH:mm'),
        inv.accepted_at ? format(new Date(inv.accepted_at), 'yyyy-MM-dd HH:mm') : '',
      ]),
    ]
      .map((row) => row.map(escapeCell).join(','))
      .join('\n');

    const blob = new window.Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `invitations-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // --- Columns ----------------------------------------------------------

  const columns: IntDataTableColumn<UserInvitation>[] = useMemo(
    () => [
      {
        key: 'email',
        header: 'Email',
        render: (inv) => (
          <div>
            <div style={{ fontWeight: 500, color: 'var(--color-esy-ink)' }}>{inv.email}</div>
            {inv.metadata?.message && <div className="adm-inv-message">{inv.metadata.message}</div>}
          </div>
        ),
      },
      {
        key: 'role',
        header: 'Role',
        render: (inv) => <IntRoleBadge role={inv.role as IntRole} />,
      },
      {
        key: 'school',
        header: 'School',
        render: (inv) =>
          inv.school_name ? (
            <span>
              {inv.school_name}
              {inv.school_borough && (
                <span className="muted" style={{ marginLeft: 6, fontSize: 12 }}>
                  · {inv.school_borough}
                </span>
              )}
            </span>
          ) : (
            <span className="muted">—</span>
          ),
      },
      {
        key: 'invited_at',
        header: 'Sent',
        render: (inv) => (
          <span className="muted" title={format(new Date(inv.invited_at), 'PPpp')}>
            {formatDistanceToNow(new Date(inv.invited_at), { addSuffix: true })}
          </span>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (inv) => (
          <IntStatusBadge status={statusBadgeVariant(inv)}>
            {inv.accepted_at ? 'Accepted' : undefined}
          </IntStatusBadge>
        ),
      },
      {
        key: 'actions',
        header: '',
        width: '92px',
        render: (inv) => {
          if (inv.accepted_at) return null;
          return (
            <div className="adm-row-actions">
              <button
                type="button"
                className="adm-icon-btn adm-icon-btn--primary"
                onClick={(e) => {
                  e.stopPropagation();
                  handleResend(inv);
                }}
                aria-label={`Resend invitation to ${inv.email}`}
                title="Resend"
              >
                <Send className="w-4 h-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                className="adm-icon-btn adm-icon-btn--danger"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCancel(inv);
                }}
                aria-label={`Cancel invitation to ${inv.email}`}
                title="Cancel"
              >
                <XCircle className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          );
        },
      },
    ],
    [handleResend, handleCancel]
  );

  // --- Tabs -------------------------------------------------------------

  const tabs = TAB_ORDER.map((key) => ({
    key,
    label: TAB_LABEL[key],
    count: counts[key],
  }));

  // --- Guard ------------------------------------------------------------

  if (authLoading) {
    return (
      <div className="int-shell-root">
        <div className="adm-page">
          <p className="adm-section-desc">Loading…</p>
        </div>
      </div>
    );
  }

  if (!hasPermission(Permission.VIEW_USERS)) {
    return (
      <div className="int-shell-root">
        <div className="adm-page">
          <p className="adm-section-desc">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const headerActions = (
    <>
      <IntButton onClick={exportToCSV}>
        <Download className="w-4 h-4" aria-hidden="true" />
        <span>Export CSV</span>
      </IntButton>
      <IntButton variant="primary" onClick={() => navigate('/admin/users/invite')}>
        <Plus className="w-4 h-4" aria-hidden="true" />
        <span>Invite user</span>
      </IntButton>
    </>
  );

  const showBulkBar = selectedResendable.length > 0 && filter !== 'accepted';

  return (
    <div className="int-shell-root">
      <div className="adm-page">
        <IntPageHeader
          title="Invitations"
          description="Track pending invites, resend if the link never landed, or cancel if an invite shouldn't have gone out."
          actions={headerActions}
          back={{ label: 'Back to Users', onClick: () => navigate('/admin/users') }}
        />

        <IntStatRow>
          <IntStatCard label="Total" value={counts.all} />
          <IntStatCard label="Pending" value={counts.pending} />
          <IntStatCard label="Accepted" value={counts.accepted} />
          <IntStatCard label="Expired" value={counts.expired} />
        </IntStatRow>

        {expiringSoon > 0 && filter !== 'accepted' && (
          <IntAlert
            variant="warn"
            title={`${expiringSoon} invitation${expiringSoon === 1 ? '' : 's'} expiring in the next 48 hours.`}
          >
            Reach out to the teacher, or resend the invite to extend the link another 7 days.
          </IntAlert>
        )}

        <IntTabs
          tabs={tabs}
          activeKey={filter}
          onChange={(key) => {
            setFilter(key as InvitationFilter);
            setSelectedKeys([]);
          }}
          ariaLabel="Filter invitations by status"
        />

        <div className="adm-toolbar">
          <div className="adm-toolbar-search">
            <Search className="w-4 h-4" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search email, school, or role…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search invitations"
            />
          </div>
          <span className="muted" style={{ fontSize: 12, marginLeft: 'auto' }}>
            {filteredInvitations.length} {filteredInvitations.length === 1 ? 'result' : 'results'}
          </span>
        </div>

        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {selectedKeys.length > 0 &&
            `${selectedKeys.length} invitation${selectedKeys.length === 1 ? '' : 's'} selected`}
        </div>

        {showBulkBar && (
          <div className="adm-bulk-bar">
            <span>
              {selectedResendable.length} invitation
              {selectedResendable.length === 1 ? '' : 's'} selected
            </span>
            <IntButton
              size="sm"
              variant="primary"
              onClick={handleBulkResend}
              disabled={bulkRunning}
            >
              <Send className="w-4 h-4" aria-hidden="true" />
              <span>Resend selected</span>
            </IntButton>
            <IntButton size="sm" variant="danger" onClick={handleBulkCancel} disabled={bulkRunning}>
              <XCircle className="w-4 h-4" aria-hidden="true" />
              <span>Cancel selected</span>
            </IntButton>
            <button
              type="button"
              className="adm-link"
              onClick={() => setSelectedKeys([])}
              disabled={bulkRunning}
            >
              Clear selection
            </button>
          </div>
        )}

        {loading && invitations.length === 0 ? (
          <p className="adm-section-desc">Loading invitations…</p>
        ) : filteredInvitations.length === 0 ? (
          <div className="adm-empty adm-empty--large">
            <h3>{EMPTY_COPY[filter].title}</h3>
            <p>{EMPTY_COPY[filter].body}</p>
            <IntButton variant="primary" onClick={() => navigate('/admin/users/invite')}>
              <Plus className="w-4 h-4" aria-hidden="true" />
              <span>Invite user</span>
            </IntButton>
          </div>
        ) : (
          <IntDataTable
            columns={columns}
            rows={filteredInvitations}
            getRowKey={(inv) => inv.id}
            selectable={filter !== 'accepted'}
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
            getSelectRowLabel={(inv) => `Select invitation to ${inv.email}`}
            ariaLabel="Invitations"
            emptyMessage="No invitations match your search."
          />
        )}

        {toast && (
          <div role="status" aria-live="polite" className={`adm-toast adm-toast--${toast.kind}`}>
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
}
