import { useState, useEffect, useRef, useMemo, useCallback, type KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useDebounce } from '@/hooks/useDebounce';
import {
  Search,
  Plus,
  Download,
  ChevronLeft,
  ChevronRight,
  Mail,
  ChevronDown,
  UserCheck,
  UserX,
  Trash2,
  Settings as SettingsIcon,
  Check,
  X,
} from 'lucide-react';
import { EnhancedUserProfile, UserFilters, UserRole, Permission } from '@/types/auth';
import { SchoolBadge } from '@/components/Schools';
import { logger } from '@/utils/logger';
import {
  IntButton,
  IntDataTable,
  IntFetchError,
  IntPageHeader,
  IntRoleBadge,
  IntTabs,
  type IntDataTableColumn,
  type IntTab,
} from '@/components/Internal';

type UserCounts = { lessons: number; reviews: number };
type EnrichedUser = EnhancedUserProfile & { lessonCount: number; reviewCount: number };

const ROLE_TABS: IntTab[] = [
  { key: 'all', label: 'All' },
  { key: 'admin', label: 'Admins' },
  { key: 'super_admin', label: 'Super Admins' },
  { key: 'reviewer', label: 'Reviewers' },
  { key: 'teacher', label: 'Teachers' },
];

export function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<EnrichedUser[]>([]);
  const [loading, setLoading] = useState(true);
  // Honest-error state (FP-05/FP-07): a failed load must never render as the
  // confidently-wrong "No users found." — and, on a refetch failure, must not
  // leave the previous page's rows on screen labelled as the new query's result.
  const [loadError, setLoadError] = useState(false);
  const [schoolsError, setSchoolsError] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: 'all',
    is_active: 'all',
    school_borough: 'all',
    schoolId: 'all',
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const [toast, setToast] = useState<{ kind: 'success' | 'error' | 'info'; msg: string } | null>(
    null
  );
  const bulkActionsRef = useRef<HTMLDivElement>(null);
  const bulkTriggerRef = useRef<HTMLButtonElement>(null);
  const bulkFirstItemRef = useRef<HTMLButtonElement>(null);
  // FP-20a staleness guard: fast role-tab clicks / debounced-search overlap can
  // land an older query's rows last. Bumped at each load's start so only the
  // newest load may apply. Idiom copied from LessonSearchPicker.tsx.
  const requestIdRef = useRef(0);

  const USERS_PER_PAGE = 20;

  useEffect(() => {
    setFilters((prev) => ({ ...prev, search: debouncedSearch }));
    setPage(1);
  }, [debouncedSearch]);

  const loadUsers = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError(false);
    try {
      let query;
      if (filters.schoolId && filters.schoolId !== 'all') {
        query = supabase
          .from('user_profiles')
          .select('*, user_schools!inner(school_id)', { count: 'exact' })
          .eq('user_schools.school_id', filters.schoolId);
      } else {
        query = supabase.from('user_profiles').select('*', { count: 'exact' });
      }

      if (filters.search) {
        const escapedSearch = filters.search.replace(/\\/g, '\\\\').replace(/[%_]/g, '\\$&');
        query = query.or(`full_name.ilike.%${escapedSearch}%,school_name.ilike.%${escapedSearch}%`);
      }

      if (filters.role !== 'all') {
        query = query.eq('role', filters.role as string);
      }

      if (filters.is_active !== 'all') {
        query = query.eq('is_active', filters.is_active === 'active');
      }

      if (filters.school_borough !== 'all') {
        query = query.eq('school_borough', filters.school_borough as string);
      }

      if (filters.sort_by !== 'email') {
        query = query.order(filters.sort_by || 'created_at', {
          ascending: filters.sort_order === 'asc',
        });
      }

      const from = (page - 1) * USERS_PER_PAGE;
      const to = from + USERS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data: profiles, error, count } = await query;
      if (requestId !== requestIdRef.current) return; // superseded by a newer load

      if (error) throw error;

      if (profiles && profiles.length > 0) {
        const userIds = profiles.map((p) => p.id);

        // Per-user count-head queries: 2N round-trips for N users on the page,
        // but only counts come back over the wire (no full-row fetches).
        const lessonCountQueries = userIds.map((uid) =>
          supabase
            .from('lesson_submissions')
            .select('*', { count: 'exact', head: true })
            .eq('teacher_id', uid)
        );
        const reviewCountQueries = userIds.map((uid) =>
          supabase
            .from('submission_reviews')
            .select('*', { count: 'exact', head: true })
            .eq('reviewer_id', uid)
        );

        const [emailsRes, schoolsRes, lessonCountResults, reviewCountResults] = await Promise.all([
          supabase.rpc('get_user_emails', { user_ids: userIds }),
          supabase
            .from('user_schools')
            .select('user_id, schools!inner(id, name)')
            .in('user_id', userIds),
          Promise.all(lessonCountQueries),
          Promise.all(reviewCountQueries),
        ]);
        if (requestId !== requestIdRef.current) return; // superseded by a newer load

        interface EmailData {
          id: string;
          email: string;
        }
        const emailMap = new Map<string, string>(
          !emailsRes.error && emailsRes.data
            ? (emailsRes.data as EmailData[]).map((item) => [item.id, item.email])
            : []
        );

        const schoolsMap = new Map<string, Array<{ id: string; name: string }>>();
        if (!schoolsRes.error && schoolsRes.data) {
          schoolsRes.data.forEach(
            (us: { user_id: string; schools: { id: string; name: string } | null }) => {
              if (!schoolsMap.has(us.user_id)) schoolsMap.set(us.user_id, []);
              if (us.schools) schoolsMap.get(us.user_id)!.push(us.schools);
            }
          );
        }

        const countsMap = new Map<string, UserCounts>();
        userIds.forEach((id, idx) => {
          countsMap.set(id, {
            lessons: lessonCountResults[idx]?.count ?? 0,
            reviews: reviewCountResults[idx]?.count ?? 0,
          });
        });

        const merged = profiles.map((profile) => {
          const counts = countsMap.get(profile.id) ?? { lessons: 0, reviews: 0 };
          return {
            ...profile,
            email: emailMap.get(profile.id) || 'No email',
            schools: schoolsMap.get(profile.id) || [],
            lessonCount: counts.lessons,
            reviewCount: counts.reviews,
          };
        });

        if (filters.sort_by === 'email') {
          merged.sort((a, b) => {
            const comparison = a.email.localeCompare(b.email);
            return filters.sort_order === 'asc' ? comparison : -comparison;
          });
        }

        setUsers(
          merged.map(
            (u) =>
              ({
                ...u,
                role: (u.role || 'teacher') as UserRole,
                user_id: u.user_id || u.id,
                permissions: u.permissions as Record<Permission, boolean> | undefined,
              }) as EnrichedUser
          )
        );
      } else {
        setUsers([]);
      }

      setTotalPages(Math.max(1, Math.ceil((count || 0) / USERS_PER_PAGE)));
    } catch (error) {
      if (requestId !== requestIdRef.current) return; // superseded — don't flip UI state
      logger.error('Error loading users:', error);
      setLoadError(true);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadSchools();
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bulkActionsRef.current && !bulkActionsRef.current.contains(event.target as Node)) {
        setShowBulkActions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (showBulkActions) bulkFirstItemRef.current?.focus();
  }, [showBulkActions]);

  const handleBulkMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setShowBulkActions(false);
      bulkTriggerRef.current?.focus();
    }
  };

  const loadSchools = async () => {
    setSchoolsError(false);
    try {
      const { data, error } = await supabase.from('schools').select('id, name').order('name');
      if (error) throw error;
      setSchools(data ?? []);
    } catch (error) {
      // Non-blocking: the users list still loads; surface a small signal at the
      // school-filter dropdown so a failed fetch isn't an invisible empty list.
      logger.error('Error loading schools:', error);
      setSchoolsError(true);
    }
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedUsers.length === 0) return;

    if (action === 'delete') {
      const confirm = window.confirm(
        `Are you sure you want to delete ${selectedUsers.length} user(s)? This action cannot be undone.`
      );
      if (!confirm) return;
    }

    // Capture before setSelectedUsers([]) clears it.
    const selectedCount = selectedUsers.length;

    try {
      if (action === 'delete') {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        // Invoke the bulk sub-route explicitly: the edge function routes by path
        // (POST /users/bulk), so the subpath must be in the invoke target — a bare
        // 'user-management' invoke hits the function's 404 fallback.
        const response = await supabase.functions.invoke('user-management/users/bulk', {
          body: JSON.stringify({ action: 'delete', userIds: selectedUsers }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        });
        if (response.error) throw response.error;

        const failed: string[] = response.data?.failed ?? [];
        if (failed.length > 0) {
          setToast({
            kind: 'error',
            msg: `Deleted ${response.data?.affected ?? 0} user(s); ${failed.length} could not be deleted.`,
          });
        } else {
          // Use the server's authoritative count: a selection can desync from the
          // DB (rows removed elsewhere), so `affected` is truthful where selectedCount isn't.
          setToast({
            kind: 'success',
            msg: `Deleted ${response.data?.affected ?? selectedCount} user(s).`,
          });
        }
      } else {
        const { error } = await supabase
          .from('user_profiles')
          .update({ is_active: action === 'activate' })
          .in('id', selectedUsers);
        if (error) throw error;

        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('user_management_audit').insert({
            actor_id: user.id,
            // Canonical audit-action vocab (matches the DB CHECK, AdminUserDetail's
            // single-user path, and IntActivityTimeline). The legacy `bulk_users_*`
            // values violate user_management_audit_action_check and were silently
            // dropped; `bulk: true` in metadata distinguishes bulk from single rows.
            action: action === 'activate' ? 'user_activated' : 'user_deactivated',
            metadata: { userIds: selectedUsers, count: selectedUsers.length, bulk: true },
          });
        }

        setToast({
          kind: 'success',
          msg: `${action === 'activate' ? 'Activated' : 'Deactivated'} ${selectedCount} user(s).`,
        });
      }

      setSelectedUsers([]);
      loadUsers();
    } catch (error) {
      logger.error(`Error performing bulk ${action}:`, error);
      setToast({ kind: 'error', msg: `Failed to ${action} selected users.` });
    }
  };

  const handleExport = async () => {
    try {
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });
      if (profileError) throw profileError;

      const { data: emailsData, error: emailError } = await supabase.rpc('get_user_emails', {
        user_ids: profiles?.map((p) => p.id) || [],
      });
      if (emailError) throw emailError;

      interface EmailDataExport {
        id: string;
        email: string;
      }
      const emailMap = new Map(
        emailsData?.map((item: EmailDataExport) => [item.id, item.email]) || []
      );
      const data = profiles?.map((profile) => ({
        ...profile,
        email: emailMap.get(profile.id) || 'No email',
      }));

      const csv = [
        ['Email', 'Name', 'Role', 'School', 'Borough', 'Status', 'Joined', 'Invited By'],
        ...(data || []).map((user) => [
          user.email || '',
          user.full_name || '',
          user.role || 'teacher',
          user.school_name || '',
          user.school_borough || '',
          user.is_active ? 'Active' : 'Inactive',
          user.created_at ? new Date(user.created_at).toLocaleDateString() : '',
          user.invited_by || 'Self-registered',
        ]),
      ]
        .map((row) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n');

      const blob = new window.Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      // FP-20b: a failed export used to be a silent no-op — surface a toast so
      // the admin knows the click didn't produce a file.
      logger.error('Error exporting users:', error);
      setToast({ kind: 'error', msg: 'Could not export users. Please try again.' });
    }
  };

  const initialsFor = (user: EnrichedUser): string => {
    const source = user.full_name || user.email || '';
    return (
      source
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((n) => n[0]?.toUpperCase() ?? '')
        .join('') || '·'
    );
  };

  const columns = useMemo<IntDataTableColumn<EnrichedUser>[]>(
    () => [
      {
        key: 'user',
        header: 'User',
        render: (user) => (
          <div className="adm-user-cell">
            <span className="adm-avatar" aria-hidden="true">
              {initialsFor(user)}
            </span>
            <div>
              <div className="adm-user-cell-name">{user.full_name || 'Unnamed User'}</div>
              <div className="adm-user-cell-email">{user.email}</div>
            </div>
          </div>
        ),
      },
      {
        key: 'role',
        header: 'Role',
        render: (user) => <IntRoleBadge role={user.role} />,
      },
      {
        key: 'school',
        header: 'School',
        muted: true,
        render: (user) =>
          user.schools && user.schools.length > 0 ? (
            <div className="adm-school-chips">
              {user.schools.map((school) => (
                <SchoolBadge key={school.id} name={school.name} size="sm" />
              ))}
            </div>
          ) : (
            <span>—</span>
          ),
      },
      {
        key: 'lessons',
        header: 'Lessons',
        numeric: true,
        render: (user) =>
          user.lessonCount > 0 ? user.lessonCount : <span className="muted">—</span>,
      },
      {
        key: 'reviews',
        header: 'Reviews',
        numeric: true,
        render: (user) =>
          user.reviewCount > 0 ? user.reviewCount : <span className="muted">—</span>,
      },
      {
        key: 'actions',
        header: '',
        width: '48px',
        align: 'right',
        render: (user) => (
          <button
            type="button"
            className="adm-table-action"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/admin/users/${user.id}`);
            }}
            aria-label={`Settings for ${user.full_name || user.email}`}
          >
            <SettingsIcon className="w-4 h-4" aria-hidden="true" />
          </button>
        ),
      },
    ],
    [navigate]
  );

  const headerActions = (
    <>
      <IntButton variant="default" onClick={() => navigate('/admin/invitations')}>
        <Mail className="w-4 h-4" aria-hidden="true" />
        <span>Invitations</span>
      </IntButton>
      <IntButton variant="default" onClick={handleExport}>
        <Download className="w-4 h-4" aria-hidden="true" />
        <span>Export</span>
      </IntButton>
      <IntButton variant="primary" onClick={() => navigate('/admin/users/invite')}>
        <Plus className="w-4 h-4" aria-hidden="true" />
        <span>Invite user</span>
      </IntButton>
    </>
  );

  return (
    <div className="int-shell-root">
      <div className="adm-page">
        <IntPageHeader
          title="Users"
          description="Manage user accounts, roles, and permissions."
          actions={headerActions}
        />

        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {selectedUsers.length > 0 && `${selectedUsers.length} users selected`}
        </div>

        <IntTabs
          tabs={ROLE_TABS}
          activeKey={(filters.role as string) || 'all'}
          onChange={(key) => {
            setFilters({ ...filters, role: key as UserRole | 'all' });
            setPage(1);
          }}
          ariaLabel="Filter users by role"
        />

        <div className="adm-toolbar">
          <div className="adm-toolbar-search">
            <Search className="w-4 h-4" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search name, email, or school…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search users"
            />
          </div>

          <select
            className="adm-select"
            value={filters.is_active?.toString() || 'all'}
            onChange={(e) => {
              setFilters({
                ...filters,
                is_active: e.target.value as 'all' | 'active' | 'inactive',
              });
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            <option value="all">All status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <select
            className="adm-select"
            value={filters.schoolId || 'all'}
            onChange={(e) => {
              setFilters({ ...filters, schoolId: e.target.value as string | 'all' });
              setPage(1);
            }}
            aria-label="Filter by school"
          >
            <option value="all">All schools</option>
            {schoolsError && (
              <option value="__schools_unavailable__" disabled>
                Schools unavailable — retry →
              </option>
            )}
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>
          {schoolsError && (
            <button type="button" className="adm-link" onClick={loadSchools}>
              Retry schools
            </button>
          )}
        </div>

        {selectedUsers.length > 0 && (
          <div className="adm-bulk-bar">
            <span>
              {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
            </span>
            <div className="adm-bulk-actions" ref={bulkActionsRef}>
              <button
                ref={bulkTriggerRef}
                type="button"
                className="adm-btn adm-btn--ink adm-btn--sm"
                aria-haspopup="menu"
                aria-expanded={showBulkActions}
                onClick={() => setShowBulkActions(!showBulkActions)}
              >
                Bulk actions
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              </button>

              {showBulkActions && (
                <div className="adm-bulk-menu" role="menu" onKeyDown={handleBulkMenuKeyDown}>
                  <button
                    ref={bulkFirstItemRef}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      handleBulkAction('activate');
                      setShowBulkActions(false);
                    }}
                  >
                    <UserCheck className="w-4 h-4" aria-hidden="true" />
                    Activate users
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      handleBulkAction('deactivate');
                      setShowBulkActions(false);
                    }}
                  >
                    <UserX className="w-4 h-4" aria-hidden="true" />
                    Deactivate users
                  </button>
                  <hr />
                  <button
                    type="button"
                    role="menuitem"
                    className="adm-bulk-menu-danger"
                    onClick={() => {
                      handleBulkAction('delete');
                      setShowBulkActions(false);
                    }}
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                    Delete users
                  </button>
                </div>
              )}
            </div>
            <button type="button" className="adm-link" onClick={() => setSelectedUsers([])}>
              Clear selection
            </button>
          </div>
        )}

        {loading && users.length === 0 ? (
          <p className="adm-section-desc">Loading users…</p>
        ) : loadError ? (
          <div className="adm-card" style={{ marginTop: 16, padding: 24 }}>
            <IntFetchError onRetry={() => loadUsers()}>
              Could not load users. Check your connection and retry — accounts may exist even though
              the list is empty.
            </IntFetchError>
          </div>
        ) : (
          <IntDataTable
            columns={columns}
            rows={users}
            getRowKey={(user) => user.id}
            selectable
            selectedKeys={selectedUsers}
            onSelectionChange={setSelectedUsers}
            getSelectRowLabel={(user) => `Select ${user.full_name || user.email}`}
            ariaLabel="Users"
            emptyMessage="No users found."
          />
        )}

        {!loadError && (
          <div className="adm-pagination">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="adm-pagination-controls">
              <IntButton
                size="sm"
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" aria-hidden="true" />
              </IntButton>
              <IntButton
                size="sm"
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </IntButton>
            </div>
          </div>
        )}

        {toast && (
          <div role="status" aria-live="polite" className={`adm-toast adm-toast--${toast.kind}`}>
            {toast.kind === 'success' && <Check className="w-3 h-3" aria-hidden="true" />}
            {toast.kind === 'error' && <X className="w-3 h-3" aria-hidden="true" />}
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
}
