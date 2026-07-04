import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';
import {
  AuditAction,
  EnhancedUserProfile,
  Permission,
  UserManagementAudit,
  UserRole,
} from '@/types/auth';
import { SchoolBadge, SchoolCheckboxGroup, School } from '@/components/Schools';
import { parseDbError } from '@/utils/errorHandling';
import { logger } from '@/utils/logger';
import { cn } from '@/utils/cn';
import { format, formatDistanceToNow } from 'date-fns';
import {
  Check,
  ChevronRight,
  Clock,
  FileText,
  GitMerge,
  KeyRound,
  Pencil,
  User,
  UserX,
  X,
} from 'lucide-react';
import {
  IntActivityTimeline,
  IntAlert,
  IntButton,
  IntFetchError,
  IntPageHeader,
  IntRoleBadge,
  IntStatusBadge,
  type IntRole,
  type IntStatus,
} from '@/components/Internal';

type Tab = 'activity' | 'access' | 'profile';

interface RecentSubmission {
  id: string;
  title: string | null;
  status: string;
  created_at: string | null;
}

interface RecentReview {
  id: string;
  submission_id: string;
  decision: string | null;
  created_at: string | null;
}

function initials(name: string | null | undefined): string {
  if (!name) return '·';
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || '·'
  );
}

function avatarTone(role: string): string {
  if (role === 'admin' || role === 'super_admin') return 'adm-avatar--ink';
  if (role === 'reviewer') return 'adm-avatar--green';
  return '';
}

function statusToBadge(status: string): IntStatus {
  switch (status) {
    case 'submitted':
      return 'submitted';
    case 'in_review':
      return 'review';
    case 'needs_revision':
      return 'revision';
    case 'approved':
      return 'approved';
    default:
      return 'submitted';
  }
}

export function AdminUserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser, hasPermission, loading: authLoading } = useEnhancedAuth();

  const [user, setUser] = useState<EnhancedUserProfile | null>(null);
  const [email, setEmail] = useState<string>('Loading…');
  const [userSchools, setUserSchools] = useState<School[]>([]);
  const [editedSchools, setEditedSchools] = useState<School[]>([]);
  const [audit, setAudit] = useState<UserManagementAudit[]>([]);
  const [actorMap, setActorMap] = useState<Record<string, string>>({});
  const [submissions, setSubmissions] = useState<RecentSubmission[]>([]);
  const [submissionCount, setSubmissionCount] = useState(0);
  const [reviews, setReviews] = useState<RecentReview[]>([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [loading, setLoading] = useState(true);
  // Honest-error state (FP-05/FP-07): reserve "User not found." for a genuine
  // zero-row profile (PGRST116). Any other load failure sets loadError so we
  // render the retryable card instead of telling the admin the user doesn't
  // exist. partialError covers the five soft-fail sub-fetches (email/schools/
  // audit/subs/reviews): if any errored we flag it inline rather than silently
  // rendering empty sections.
  const [loadError, setLoadError] = useState(false);
  const [partialError, setPartialError] = useState(false);
  // FP-20a staleness guard: this route is NOT key-remounted (App.tsx renders
  // AdminUserDetail without a key), so fast user→user navigation reuses the
  // component and can land an earlier user's data last. Bumped at each load's
  // start so only the newest load may apply. Idiom from LessonSearchPicker.tsx.
  const requestIdRef = useRef(0);
  const [toast, setToast] = useState<{ kind: 'success' | 'error' | 'info'; msg: string } | null>(
    null
  );

  const [tab, setTab] = useState<Tab>('activity');
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [roleEditing, setRoleEditing] = useState(false);
  const [schoolsEditing, setSchoolsEditing] = useState(false);
  const [notesEditing, setNotesEditing] = useState(false);
  const [nameEditing, setNameEditing] = useState(false);

  const [pendingRole, setPendingRole] = useState<UserRole>(UserRole.TEACHER);
  const [pendingNotes, setPendingNotes] = useState('');
  const [pendingName, setPendingName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    if (!userId) return;
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError(false);
    setPartialError(false);
    try {
      const [profileRes, emailsRes, schoolsRes, auditRes, subsRes, revsRes] = await Promise.all([
        supabase.from('user_profiles').select('*').eq('id', userId).single(),
        supabase.rpc('get_user_emails', { user_ids: [userId] }),
        supabase.from('user_schools').select('schools(id, name)').eq('user_id', userId),
        supabase
          .from('user_management_audit')
          .select('*')
          .eq('target_user_id', userId)
          .order('created_at', { ascending: false })
          .limit(15),
        supabase
          .from('lesson_submissions')
          .select('id, extracted_title, status, created_at', { count: 'exact' })
          .eq('teacher_id', userId)
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('submission_reviews')
          .select('id, submission_id, decision, created_at', { count: 'exact' })
          .eq('reviewer_id', userId)
          .order('created_at', { ascending: false })
          .limit(5),
      ]);
      if (requestId !== requestIdRef.current) return; // superseded by a newer load

      if (profileRes.error) throw profileRes.error;
      const profile = profileRes.data;

      // Any of the five secondary fetches erroring → non-blocking "couldn't load
      // everything" signal rather than a silently-empty section.
      setPartialError(
        !!emailsRes.error ||
          !!schoolsRes.error ||
          !!auditRes.error ||
          !!subsRes.error ||
          !!revsRes.error
      );

      setUser({
        ...profile,
        role: (profile.role || UserRole.TEACHER) as UserRole,
        user_id: profile.user_id || profile.id,
        permissions: profile.permissions as Record<Permission, boolean> | undefined,
      } as EnhancedUserProfile);
      setPendingRole((profile.role || UserRole.TEACHER) as UserRole);
      setPendingNotes(profile.notes || '');
      setPendingName(profile.full_name || '');

      if (!emailsRes.error && emailsRes.data && emailsRes.data.length > 0) {
        setEmail(emailsRes.data[0].email);
      } else if (profile.email) {
        setEmail(profile.email);
      } else {
        setEmail('Email unavailable');
      }

      if (!schoolsRes.error && schoolsRes.data) {
        const schools = schoolsRes.data
          .map((us: unknown) => (us as { schools: School | null }).schools)
          .filter((s): s is School => s !== null);
        setUserSchools(schools);
        setEditedSchools(schools);
      }

      if (!auditRes.error && auditRes.data) {
        const rows = auditRes.data.map(
          (r) => ({ ...r, action: r.action as AuditAction }) as UserManagementAudit
        );
        setAudit(rows);
        const actorIds = Array.from(new Set(rows.map((r) => r.actor_id).filter(Boolean)));
        if (actorIds.length > 0) {
          const { data: actorProfiles } = await supabase
            .from('user_profiles')
            .select('id, full_name')
            .in('id', actorIds);
          if (requestId !== requestIdRef.current) return; // superseded by a newer load
          const map: Record<string, string> = {};
          for (const p of actorProfiles ?? []) {
            if (p.id && p.full_name) map[p.id] = p.full_name;
          }
          setActorMap(map);
        }
      }

      if (!subsRes.error) {
        setSubmissions(
          (subsRes.data ?? []).map((s) => ({
            id: s.id,
            title: s.extracted_title,
            status: s.status,
            created_at: s.created_at,
          }))
        );
        setSubmissionCount(subsRes.count ?? 0);
      }

      if (!revsRes.error) {
        setReviews(
          (revsRes.data ?? []).map((r) => ({
            id: r.id,
            submission_id: r.submission_id,
            decision: r.decision,
            created_at: r.created_at,
          }))
        );
        setReviewCount(revsRes.count ?? 0);
      }
    } catch (err) {
      if (requestId !== requestIdRef.current) return; // superseded — don't flip UI state
      logger.error('Error loading user detail:', err);
      // PGRST116 = `.single()` matched zero rows → the user genuinely doesn't
      // exist; fall through to the "User not found." branch (user stays null).
      // Every other error (network/RLS/5xx) is transient → honest error card.
      const code = (err as { code?: string } | null)?.code;
      if (code !== 'PGRST116') setLoadError(true);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  const isActive = user?.is_active ?? false;

  const resolveActor = useCallback((actorId: string) => actorMap[actorId] ?? 'Someone', [actorMap]);

  const schoolIdToName = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of userSchools) m.set(s.id, s.name);
    for (const s of editedSchools) m.set(s.id, s.name);
    return m;
  }, [userSchools, editedSchools]);

  const formatDiffValue = useCallback(
    (key: string, value: unknown): string => {
      if (value === null || value === undefined) return '';
      if (typeof value === 'boolean') return value ? 'yes' : 'no';
      if (Array.isArray(value)) {
        if (key === 'school_ids') {
          return (
            value.map((id) => schoolIdToName.get(String(id)) ?? String(id)).join(', ') || '(none)'
          );
        }
        return value.length === 0 ? '(none)' : value.join(', ');
      }
      return String(value);
    },
    [schoolIdToName]
  );

  const roleChoices: { role: IntRole; label: string }[] = useMemo(() => {
    const base: { role: IntRole; label: string }[] = [
      { role: 'teacher', label: 'Teacher' },
      { role: 'reviewer', label: 'Reviewer' },
      { role: 'admin', label: 'Admin' },
    ];
    if (currentUser?.role === UserRole.SUPER_ADMIN) {
      base.push({ role: 'super_admin', label: 'Super Admin' });
    }
    return base;
  }, [currentUser?.role]);

  const handleSaveRole = async () => {
    if (!user || !userId || !currentUser?.id) return;
    setSaving(true);
    setSaveError(null);
    try {
      const oldRole = user.role;
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: pendingRole, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) throw error;
      await supabase.from('user_management_audit').insert({
        actor_id: currentUser.id,
        action: 'user_role_changed',
        target_user_id: userId,
        old_values: { role: oldRole },
        new_values: { role: pendingRole },
      });
      setRoleEditing(false);
      setToast({ kind: 'success', msg: `Role changed to ${pendingRole}` });
      await loadAll();
    } catch (err) {
      setSaveError(parseDbError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSchools = async () => {
    if (!userId || !currentUser) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { error: delErr } = await supabase.from('user_schools').delete().eq('user_id', userId);
      if (delErr) throw delErr;
      if (editedSchools.length > 0) {
        const { error: insErr } = await supabase
          .from('user_schools')
          .insert(editedSchools.map((s) => ({ user_id: userId, school_id: s.id })));
        if (insErr) throw insErr;
      }
      await supabase.from('user_management_audit').insert({
        actor_id: currentUser.id,
        action: 'user_profile_updated',
        target_user_id: userId,
        old_values: { school_ids: userSchools.map((s) => s.id) },
        new_values: { school_ids: editedSchools.map((s) => s.id) },
      });
      setSchoolsEditing(false);
      setToast({ kind: 'success', msg: 'School assignments updated' });
      await loadAll();
    } catch (err) {
      setSaveError(parseDbError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    if (!user || !userId || !currentUser?.id) return;
    setSaving(true);
    setSaveError(null);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ notes: pendingNotes || undefined, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) throw error;
      await supabase.from('user_management_audit').insert({
        actor_id: currentUser.id,
        action: 'user_profile_updated',
        target_user_id: userId,
        old_values: { notes: user.notes ?? '' },
        new_values: { notes: pendingNotes },
      });
      setNotesEditing(false);
      setToast({ kind: 'success', msg: 'Notes saved' });
      await loadAll();
    } catch (err) {
      setSaveError(parseDbError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveName = async () => {
    if (!user || !userId || !currentUser?.id) return;
    setSaving(true);
    setSaveError(null);
    try {
      const oldName = user.full_name ?? '';
      const { error } = await supabase
        .from('user_profiles')
        .update({ full_name: pendingName || undefined, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) throw error;
      await supabase.from('user_management_audit').insert({
        actor_id: currentUser.id,
        action: 'user_profile_updated',
        target_user_id: userId,
        old_values: { full_name: oldName },
        new_values: { full_name: pendingName },
      });
      setNameEditing(false);
      setToast({ kind: 'success', msg: 'Name saved' });
      await loadAll();
    } catch (err) {
      setSaveError(parseDbError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActivation = async () => {
    if (!user || !userId || !currentUser?.id) return;
    setSaving(true);
    try {
      const newStatus = !user.is_active;
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: newStatus, updated_at: new Date().toISOString() })
        .eq('id', userId);
      if (error) throw error;
      await supabase.from('user_management_audit').insert({
        actor_id: currentUser.id,
        action: newStatus ? 'user_activated' : 'user_deactivated',
        target_user_id: userId,
        old_values: { is_active: user.is_active },
        new_values: { is_active: newStatus },
      });
      setToast({
        kind: newStatus ? 'success' : 'info',
        msg: newStatus ? 'Account reactivated' : 'Account deactivated',
      });
      await loadAll();
    } catch (err) {
      setToast({ kind: 'error', msg: parseDbError(err) });
    } finally {
      setSaving(false);
    }
  };

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

  if (loading && !user) {
    return (
      <div className="int-shell-root">
        <div className="adm-page">
          <p className="adm-section-desc">Loading user…</p>
        </div>
      </div>
    );
  }

  if (loadError && !user) {
    return (
      <div className="int-shell-root">
        <div className="adm-page">
          <IntPageHeader
            title="User"
            actions={null}
            back={{ label: 'Back to Users', onClick: () => navigate('/admin/users') }}
          />
          <div className="adm-card" style={{ padding: 24 }}>
            <IntFetchError onRetry={() => loadAll()}>
              Could not load this user — this is usually a connection blip, not a missing account.
              Retry to load their details.
            </IntFetchError>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="int-shell-root">
        <div className="adm-page">
          <p className="adm-section-desc">User not found.</p>
          <IntButton onClick={() => navigate('/admin/users')}>Back to Users</IntButton>
        </div>
      </div>
    );
  }

  const canEdit = hasPermission(Permission.EDIT_USERS);

  return (
    <div className="int-shell-root">
      <div className="adm-page">
        <IntPageHeader
          title={user.full_name || email}
          actions={null}
          back={{ label: 'Back to Users', onClick: () => navigate('/admin/users') }}
        />

        <div className="adm-user-head">
          <div className={cn('adm-avatar adm-avatar--xl', avatarTone(user.role))}>
            {initials(user.full_name)}
          </div>
          <div className="adm-user-head-main">
            <h2>{user.full_name || 'Unnamed user'}</h2>
            <div className="adm-user-head-meta">
              <IntRoleBadge role={user.role} />
              <span className="adm-user-head-meta-sep">·</span>
              <span>{email}</span>
              <span className="adm-user-head-meta-sep">·</span>
              {isActive ? (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    color: 'var(--color-esy-green)',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--color-esy-green)',
                    }}
                  />
                  Active
                </span>
              ) : (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    color: 'var(--color-esy-ink-50)',
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: 'var(--color-esy-ink-30)',
                    }}
                  />
                  Deactivated
                </span>
              )}
            </div>
          </div>
          <div className="adm-user-head-extras">
            <dl>
              <dt>Lessons</dt>
              <dd>{submissionCount || '—'}</dd>
            </dl>
            <dl>
              <dt>Reviews</dt>
              <dd>{reviewCount || '—'}</dd>
            </dl>
          </div>
        </div>

        {!isActive && (
          <IntAlert variant="warn" title="This account is deactivated.">
            {user.full_name || 'This user'} can't sign in and won't receive invite emails. Use the
            Access tab to reactivate.
          </IntAlert>
        )}

        {saveError && (
          <IntAlert variant="error" title="Save failed">
            {saveError}
          </IntAlert>
        )}

        {partialError && (
          <IntAlert variant="warn" title="Couldn't load everything.">
            Some sections (schools, activity, or recent items) may be incomplete.{' '}
            <button type="button" className="adm-link" onClick={() => loadAll()}>
              Retry
            </button>
          </IntAlert>
        )}

        {(() => {
          const TAB_DEFS: { key: Tab; label: string; icon: typeof Clock; count?: number }[] = [
            { key: 'activity', label: 'Activity', icon: Clock, count: audit.length },
            { key: 'access', label: 'Access', icon: User },
            { key: 'profile', label: 'Profile', icon: FileText },
          ];
          const focusTabAt = (i: number) => {
            const total = TAB_DEFS.length;
            const idx = ((i % total) + total) % total;
            const node = tabRefs.current[idx];
            if (node) {
              node.focus();
              setTab(TAB_DEFS[idx].key);
            }
          };
          const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, i: number) => {
            switch (e.key) {
              case 'ArrowRight':
              case 'ArrowDown':
                e.preventDefault();
                focusTabAt(i + 1);
                break;
              case 'ArrowLeft':
              case 'ArrowUp':
                e.preventDefault();
                focusTabAt(i - 1);
                break;
              case 'Home':
                e.preventDefault();
                focusTabAt(0);
                break;
              case 'End':
                e.preventDefault();
                focusTabAt(TAB_DEFS.length - 1);
                break;
              default:
                break;
            }
          };
          return (
            <div className="adm-tabs-inline" role="tablist">
              {TAB_DEFS.map((t, i) => {
                const Icon = t.icon;
                const isActive = tab === t.key;
                return (
                  <button
                    key={t.key}
                    ref={(el) => {
                      tabRefs.current[i] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`adm-tab-${t.key}`}
                    aria-selected={isActive}
                    aria-controls={`adm-tab-panel-${t.key}`}
                    tabIndex={isActive ? 0 : -1}
                    className={cn(isActive && 'is-active')}
                    onClick={() => setTab(t.key)}
                    onKeyDown={(e) => onTabKeyDown(e, i)}
                  >
                    <Icon className="w-3 h-3" aria-hidden="true" /> {t.label}
                    {typeof t.count === 'number' && (
                      <span className="adm-tabs-inline-count">{t.count}</span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })()}

        {tab === 'activity' && (
          <div
            id="adm-tab-panel-activity"
            role="tabpanel"
            aria-labelledby="adm-tab-activity"
            className="adm-split adm-split--2-1"
          >
            <div className="adm-card">
              <div className="adm-section-eyebrow">
                Activity · {audit.length} event{audit.length === 1 ? '' : 's'}
              </div>
              <IntActivityTimeline
                rows={audit}
                resolveActor={resolveActor}
                formatDiffValue={formatDiffValue}
                emptyMessage={`No activity for ${user.full_name || 'this user'} yet.`}
              />
            </div>
            <div className="adm-col-sticky">
              <div className="adm-card">
                <div className="adm-section-eyebrow">Recent submissions</div>
                {submissions.length === 0 ? (
                  <p className="adm-section-desc">No submissions yet.</p>
                ) : (
                  <ul className="adm-recent-list">
                    {submissions.map((s) => (
                      <li key={s.id}>
                        <div className="adm-recent-title">{s.title || 'Untitled submission'}</div>
                        <div className="adm-recent-meta">
                          <IntStatusBadge status={statusToBadge(s.status)} />
                          <span>
                            {s.created_at
                              ? formatDistanceToNow(new Date(s.created_at), { addSuffix: true })
                              : '—'}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="adm-recent-footer">
                  {submissionCount > submissions.length
                    ? `${submissions.length} of ${submissionCount} shown`
                    : `${submissionCount} total`}
                </div>
              </div>
              <div className="adm-card">
                <div className="adm-section-eyebrow">Recent reviews</div>
                {reviews.length === 0 ? (
                  <p className="adm-section-desc">No reviews yet.</p>
                ) : (
                  <ul className="adm-recent-list">
                    {reviews.map((r) => (
                      <li key={r.id}>
                        <div className="adm-recent-title">
                          Submission {r.submission_id.slice(0, 8)}…
                        </div>
                        <div className="adm-recent-meta">
                          {r.decision && <span>{r.decision.replace(/_/g, ' ')}</span>}
                          <span>
                            {r.created_at
                              ? formatDistanceToNow(new Date(r.created_at), { addSuffix: true })
                              : '—'}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="adm-recent-footer">
                  {reviewCount > reviews.length
                    ? `${reviews.length} of ${reviewCount} shown`
                    : `${reviewCount} total`}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'access' && (
          <div
            id="adm-tab-panel-access"
            role="tabpanel"
            aria-labelledby="adm-tab-access"
            className="adm-split adm-split--2-1"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="adm-card">
                <div className="adm-card-head">
                  <div className="adm-section-eyebrow" style={{ margin: 0 }}>
                    Role
                  </div>
                  {!roleEditing && canEdit && (
                    <button
                      type="button"
                      className="adm-icon-btn"
                      aria-label="Edit role"
                      onClick={() => setRoleEditing(true)}
                    >
                      <Pencil className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
                {!roleEditing ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <IntRoleBadge role={user.role} />
                    <span className="muted" style={{ fontSize: 12 }}>
                      since {format(new Date(user.created_at), 'PP')}
                    </span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div role="radiogroup" aria-label="Role">
                      {roleChoices.map((r) => (
                        <label
                          key={r.role}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            padding: '6px 8px',
                            borderRadius: 4,
                            cursor: 'pointer',
                            background:
                              pendingRole === r.role ? 'var(--color-esy-paper-alt)' : 'transparent',
                          }}
                        >
                          <input
                            type="radio"
                            name="role-edit"
                            checked={pendingRole === r.role}
                            onChange={() => setPendingRole(r.role as UserRole)}
                          />
                          <IntRoleBadge role={r.role} />
                        </label>
                      ))}
                    </div>
                    <div className="adm-form-actions" style={{ justifyContent: 'flex-end' }}>
                      <IntButton
                        onClick={() => {
                          setPendingRole(user.role);
                          setRoleEditing(false);
                        }}
                        disabled={saving}
                      >
                        Cancel
                      </IntButton>
                      <IntButton variant="primary" onClick={handleSaveRole} disabled={saving}>
                        {saving ? 'Saving…' : 'Save'}
                      </IntButton>
                    </div>
                  </div>
                )}
              </div>

              <div className="adm-card">
                <div className="adm-card-head">
                  <div className="adm-section-eyebrow" style={{ margin: 0 }}>
                    School affiliation
                  </div>
                  {!schoolsEditing && canEdit && (
                    <button
                      type="button"
                      className="adm-icon-btn"
                      aria-label="Edit schools"
                      onClick={() => setSchoolsEditing(true)}
                    >
                      <Pencil className="w-4 h-4" aria-hidden="true" />
                    </button>
                  )}
                </div>
                {!schoolsEditing ? (
                  userSchools.length === 0 ? (
                    <p className="adm-section-desc">No schools assigned.</p>
                  ) : (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {userSchools.map((s) => (
                        <SchoolBadge key={s.id} name={s.name} />
                      ))}
                    </div>
                  )
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <SchoolCheckboxGroup
                      selectedSchools={editedSchools}
                      onChange={setEditedSchools}
                      disabled={saving}
                    />
                    <div className="adm-form-actions" style={{ justifyContent: 'flex-end' }}>
                      <IntButton
                        onClick={() => {
                          setEditedSchools(userSchools);
                          setSchoolsEditing(false);
                        }}
                        disabled={saving}
                      >
                        Cancel
                      </IntButton>
                      <IntButton variant="primary" onClick={handleSaveSchools} disabled={saving}>
                        {saving ? 'Saving…' : 'Save'}
                      </IntButton>
                    </div>
                  </div>
                )}
              </div>

              {hasPermission(Permission.DELETE_USERS) && (
                <div className="adm-danger-zone">
                  <h3>
                    <UserX className="w-3 h-3" aria-hidden="true" /> Danger zone
                  </h3>
                  <p>Account-level actions. All are logged in the audit trail.</p>
                  <div className="adm-danger-zone-actions">
                    <div className="adm-danger-zone-row">
                      <div>
                        <div className="adm-danger-zone-row-title">Send password reset</div>
                        <div>
                          Admin-initiated password reset needs a service-role endpoint. Ask the user
                          to click <em>Forgot password</em> from the sign-in screen for now.
                        </div>
                      </div>
                      <IntButton disabled title="Not yet wired — needs a service-role endpoint">
                        <KeyRound className="w-4 h-4" aria-hidden="true" />
                        <span>Send link</span>
                      </IntButton>
                    </div>
                    <div className="adm-danger-zone-row">
                      <div>
                        <div className="adm-danger-zone-row-title">
                          {isActive ? 'Deactivate account' : 'Reactivate account'}
                        </div>
                        <div>
                          {isActive
                            ? 'Prevents sign-in and hides the user from assignment pickers. Submitted lessons are preserved.'
                            : 'Restores sign-in and makes the user available for review assignment.'}
                        </div>
                      </div>
                      <IntButton
                        variant="danger"
                        onClick={handleToggleActivation}
                        disabled={saving}
                      >
                        {isActive ? (
                          <>
                            <UserX className="w-4 h-4" aria-hidden="true" />
                            <span>Deactivate</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" aria-hidden="true" />
                            <span>Reactivate</span>
                          </>
                        )}
                      </IntButton>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="adm-col-sticky">
              {/* intentionally empty — no permissions matrix */}
            </div>
          </div>
        )}

        {tab === 'profile' && (
          <div
            id="adm-tab-panel-profile"
            role="tabpanel"
            aria-labelledby="adm-tab-profile"
            className="adm-split adm-split--2-1"
          >
            <div className="adm-card">
              <div className="adm-card-head">
                <div className="adm-section-eyebrow" style={{ margin: 0 }}>
                  Profile
                </div>
              </div>
              <dl className="adm-kv">
                <div className="adm-kv-row">
                  <dt>Full name</dt>
                  <dd>
                    {nameEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <input
                          className="adm-input"
                          value={pendingName}
                          onChange={(e) => setPendingName(e.target.value)}
                        />
                        <div className="adm-form-actions" style={{ justifyContent: 'flex-end' }}>
                          <IntButton
                            onClick={() => {
                              setPendingName(user.full_name || '');
                              setNameEditing(false);
                            }}
                            disabled={saving}
                          >
                            Cancel
                          </IntButton>
                          <IntButton variant="primary" onClick={handleSaveName} disabled={saving}>
                            {saving ? 'Saving…' : 'Save'}
                          </IntButton>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{user.full_name || <span className="muted">Not set</span>}</span>
                        {canEdit && (
                          <button
                            type="button"
                            className="adm-icon-btn"
                            aria-label="Edit full name"
                            onClick={() => setNameEditing(true)}
                          >
                            <Pencil className="w-4 h-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    )}
                  </dd>
                </div>
                <div className="adm-kv-row">
                  <dt>Email</dt>
                  <dd className="adm-kv-mono">{email}</dd>
                </div>
                <div className="adm-kv-row">
                  <dt>User ID</dt>
                  <dd className="adm-kv-mono">{user.id}</dd>
                </div>
                <div className="adm-kv-row">
                  <dt>Created</dt>
                  <dd title={user.created_at}>
                    {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                  </dd>
                </div>
                <div className="adm-kv-row">
                  <dt>Last updated</dt>
                  <dd title={user.updated_at}>
                    {formatDistanceToNow(new Date(user.updated_at), { addSuffix: true })}
                  </dd>
                </div>
                <div className="adm-kv-row">
                  <dt>Notes</dt>
                  <dd>
                    {notesEditing ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        <textarea
                          className="adm-input"
                          rows={3}
                          value={pendingNotes}
                          onChange={(e) => setPendingNotes(e.target.value)}
                          placeholder="Internal notes (visible to admins only)"
                        />
                        <div className="adm-form-actions" style={{ justifyContent: 'flex-end' }}>
                          <IntButton
                            onClick={() => {
                              setPendingNotes(user.notes || '');
                              setNotesEditing(false);
                            }}
                            disabled={saving}
                          >
                            Cancel
                          </IntButton>
                          <IntButton variant="primary" onClick={handleSaveNotes} disabled={saving}>
                            {saving ? 'Saving…' : 'Save'}
                          </IntButton>
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {user.notes ? (
                          <span style={{ fontStyle: 'italic', color: 'var(--color-esy-ink-70)' }}>
                            "{user.notes}"
                          </span>
                        ) : (
                          <span className="muted">—</span>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            className="adm-icon-btn"
                            aria-label="Edit notes"
                            onClick={() => setNotesEditing(true)}
                          >
                            <Pencil className="w-4 h-4" aria-hidden="true" />
                          </button>
                        )}
                      </div>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="adm-col-sticky">
              <div className="adm-card">
                <div className="adm-section-eyebrow">Related</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
                  {reviewCount > 0 && (
                    <Link to="/review" className="adm-related-link">
                      <GitMerge className="w-4 h-4" aria-hidden="true" />
                      <span>
                        {reviewCount} review{reviewCount === 1 ? '' : 's'} completed
                      </span>
                      <ChevronRight className="w-3 h-3" aria-hidden="true" />
                    </Link>
                  )}
                  <Link to="/admin/invitations" className="adm-related-link">
                    <Clock className="w-4 h-4" aria-hidden="true" />
                    <span>Original invitation</span>
                    <ChevronRight className="w-3 h-3" aria-hidden="true" />
                  </Link>
                </div>
              </div>
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
