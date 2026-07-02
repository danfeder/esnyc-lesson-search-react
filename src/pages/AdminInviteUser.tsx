import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import CreatableSelect from 'react-select/creatable';
import type { SingleValue } from 'react-select';
import { Clock, Info, Send } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';
import { UserRole, InvitationFormData, Permission } from '@/types/auth';
import { logger } from '@/utils/logger';
import { isEmailDuplicateError, parseDbError } from '@/utils/errorHandling';
import {
  IntAlert,
  IntButton,
  IntFormField,
  IntPageHeader,
  IntRoleBadge,
  type IntRole,
} from '@/components/Internal';
import { cn } from '@/utils/cn';

const NYC_BOROUGHS = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'];

const ROLE_DEFS: { id: IntRole; label: string; desc: string }[] = [
  { id: 'teacher', label: 'Teacher', desc: 'Submits lessons, saves drafts, browses the library.' },
  {
    id: 'reviewer',
    label: 'Reviewer',
    desc: 'Reviews submissions, requests revisions, publishes lessons.',
  },
  { id: 'admin', label: 'Admin', desc: 'Full access — users, taxonomy, settings, analytics.' },
];

const PERMISSIONS_FOR_ROLE: Record<UserRole, string[]> = {
  [UserRole.TEACHER]: ['view_lessons', 'submit_lessons'],
  [UserRole.REVIEWER]: [
    'view_lessons',
    'submit_lessons',
    'review_lessons',
    'approve_lessons',
    'view_analytics',
  ],
  [UserRole.ADMIN]: [
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
  [UserRole.SUPER_ADMIN]: [
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

type SchoolOption = { value: string; label: string; __isNew__?: boolean };

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function AdminInviteUser() {
  const navigate = useNavigate();
  const { user, hasPermission, loading: authLoading } = useEnhancedAuth();

  const [formData, setFormData] = useState<InvitationFormData>({
    email: '',
    role: UserRole.TEACHER,
    school_name: '',
    school_borough: '',
    message: '',
    grades_taught: [],
    subjects_taught: [],
  });
  const [schoolOption, setSchoolOption] = useState<SchoolOption | null>(null);
  const [schoolOptions, setSchoolOptions] = useState<SchoolOption[]>([]);
  const [pendingInviteFound, setPendingInviteFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ email: string; link: string; emailSent: boolean } | null>(
    null
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data, error: schoolsErr } = await supabase
          .from('schools')
          .select('id, name')
          .order('name');
        if (schoolsErr) throw schoolsErr;
        setSchoolOptions((data ?? []).map((s) => ({ value: s.name, label: s.name })));
      } catch (err) {
        logger.error('Failed to load schools list:', err);
      }
    })();
  }, []);

  // Check pending-invite existence as the admin types — debounced lightly via
  // effect deps.
  useEffect(() => {
    const email = formData.email.trim();
    if (!isValidEmail(email)) {
      setPendingInviteFound(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('user_invitations')
        .select('id')
        .eq('email', email)
        .is('accepted_at', null)
        .limit(1);
      if (!cancelled) setPendingInviteFound((data ?? []).length > 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [formData.email]);

  const emailIsValid = isValidEmail(formData.email.trim());
  const canSubmit = !!formData.email && emailIsValid && !pendingInviteFound && !submitting;

  const selectedRoleDef = ROLE_DEFS.find((r) => r.id === formData.role) ?? ROLE_DEFS[0];

  const handleSchoolChange = (opt: SingleValue<SchoolOption>) => {
    setSchoolOption(opt);
    setFormData((prev) => ({ ...prev, school_name: opt?.value ?? '' }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      if (!user?.id) throw new Error('User not authenticated');

      const { data: inviteData, error: inviteError } = await supabase
        .from('user_invitations')
        .insert({
          email: formData.email.trim(),
          role: formData.role,
          invited_by: user.id,
          school_name: formData.school_name || undefined,
          school_borough: formData.school_borough || undefined,
          message: formData.message || undefined,
          metadata: {
            invited_by_id: user.id,
          },
        })
        .select()
        .single();
      if (inviteError) throw inviteError;

      await supabase.from('user_management_audit').insert({
        actor_id: user.id,
        action: 'invite_sent',
        target_email: formData.email.trim(),
        new_values: {
          role: formData.role,
          school_name: formData.school_name,
          school_borough: formData.school_borough,
        },
      });

      if (!inviteData) throw new Error('Invitation was created but no data was returned.');

      // Attempt the email, but never claim it sent unless it actually did.
      // supabase.functions.invoke resolves (does not throw) on a non-2xx
      // response, so a failure surfaces in `error`, not the catch. Today the
      // Resend sandbox rejects any non-owner recipient, so this usually fails —
      // in which case the admin copies the always-visible link below and sends
      // it manually.
      let emailSent = false;
      try {
        const { error: emailError } = await supabase.functions.invoke('send-email', {
          body: {
            type: 'invitation',
            to: formData.email.trim(),
            data: {
              invitationId: inviteData.id,
              token: inviteData.token,
              inviterName: user.full_name || user.email,
              role: formData.role,
              customMessage: formData.message,
              permissions: PERMISSIONS_FOR_ROLE[formData.role],
              expiresAt: inviteData.expires_at,
            },
          },
        });
        if (emailError) {
          logger.error('Failed to send invitation email:', emailError);
        } else {
          emailSent = true;
        }
      } catch (err) {
        logger.error('Error invoking email function:', err);
      }

      const link = `${window.location.origin}/accept-invitation?token=${inviteData.token}`;
      setResult({ email: formData.email.trim(), link, emailSent });
    } catch (err) {
      if (isEmailDuplicateError(err)) {
        setError(
          'This email address is already registered to another user. Check the Users list or edit that account directly.'
        );
      } else {
        setError(parseDbError(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = async () => {
    if (!result) return;
    try {
      await window.navigator.clipboard.writeText(result.link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API can be blocked (permissions / insecure context); the
      // field is still selectable so the admin can copy manually.
    }
  };

  const handleInviteAnother = () => {
    setResult(null);
    setCopied(false);
    setError(null);
    setFormData({
      email: '',
      role: UserRole.TEACHER,
      school_name: '',
      school_borough: '',
      message: '',
      grades_taught: [],
      subjects_taught: [],
    });
    setSchoolOption(null);
  };

  const previewFirstLine = useMemo(() => {
    const target = formData.email.trim() || 'teacher@school.org';
    return target;
  }, [formData.email]);

  if (authLoading) {
    return (
      <div className="int-shell-root">
        <div className="adm-page">
          <p className="adm-section-desc">Loading…</p>
        </div>
      </div>
    );
  }

  if (!hasPermission(Permission.INVITE_USERS)) {
    return (
      <div className="int-shell-root">
        <div className="adm-page">
          <p className="adm-section-desc">You don't have permission to invite users.</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div className="int-shell-root">
        <div className="adm-page adm-page--narrow">
          <IntPageHeader
            title="Invitation created"
            description="Send the recipient their personal link so they can set a password and join."
            back={{ label: 'Back to Users', onClick: () => navigate('/admin/users') }}
          />

          <div className="adm-card" style={{ padding: 24 }}>
            <IntAlert
              variant={result.emailSent ? 'success' : 'warn'}
              title={
                result.emailSent
                  ? `Invitation created and emailed to ${result.email}.`
                  : 'Invitation created — but the email could NOT be sent automatically.'
              }
            >
              {result.emailSent
                ? 'You can also copy the link below and send it yourself as a backup.'
                : `Copy the link below and send it to ${result.email} yourself (email, chat, etc.). The link still works even though the automatic email didn't go out.`}
            </IntAlert>

            <div style={{ marginTop: 16 }}>
              <IntFormField
                label="Invitation link"
                hint="Anyone with this link can set up the account. It expires in 7 days."
              >
                <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
                  <input
                    className="adm-input"
                    style={{ flex: 1 }}
                    readOnly
                    value={result.link}
                    onFocus={(e) => e.currentTarget.select()}
                    aria-label="Invitation link"
                  />
                  <IntButton type="button" variant="primary" onClick={handleCopyLink}>
                    {copied ? 'Copied' : 'Copy link'}
                  </IntButton>
                </div>
              </IntFormField>
            </div>

            <div className="adm-form-actions" style={{ marginTop: 24 }}>
              <IntButton type="button" onClick={handleInviteAnother}>
                Invite another
              </IntButton>
              <IntButton
                type="button"
                variant="primary"
                onClick={() => navigate('/admin/invitations')}
              >
                Go to Invitations
              </IntButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const headerActions = (
    <IntButton onClick={() => navigate('/admin/invitations')}>
      <Clock className="w-4 h-4" aria-hidden="true" />
      <span>Invitations</span>
    </IntButton>
  );

  return (
    <div className="int-shell-root">
      <div className="adm-page adm-page--narrow">
        <IntPageHeader
          title="Invite a user"
          description="Send an invite email. The recipient sets their own password and lands on their dashboard."
          actions={headerActions}
          back={{ label: 'Back to Users', onClick: () => navigate('/admin/users') }}
        />

        <div className="adm-invite-grid">
          <form className="adm-card" onSubmit={handleSubmit} style={{ padding: 24 }}>
            {error && (
              <IntAlert variant="error" title="We couldn't send this invite.">
                {error}
              </IntAlert>
            )}

            {!error && formData.email && !emailIsValid && (
              <IntAlert variant="error" title="That email address isn't valid.">
                Double-check the format (e.g. <code>name@school.org</code>).
              </IntAlert>
            )}

            {!error && emailIsValid && pendingInviteFound && (
              <IntAlert variant="warn" title="An invite for that email is already pending.">
                <button
                  type="button"
                  className="adm-link"
                  onClick={() => navigate('/admin/invitations')}
                >
                  Resend from the Invitations list instead
                </button>
                .
              </IntAlert>
            )}

            <div className="adm-invite-fields">
              <IntFormField label="Email address" required>
                <input
                  id="invite-email"
                  className="adm-input"
                  type="email"
                  required
                  autoComplete="off"
                  placeholder="teacher@school.org"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </IntFormField>

              <div>
                <div className="adm-section-eyebrow">Role</div>
                <div className="adm-radio-cards" role="radiogroup" aria-label="Role">
                  {ROLE_DEFS.map((r) => {
                    const isSelected = formData.role === (r.id as unknown as UserRole);
                    return (
                      <label
                        key={r.id}
                        className={cn('adm-radio-card', isSelected && 'is-selected')}
                      >
                        <input
                          type="radio"
                          name="invite-role"
                          value={r.id}
                          checked={isSelected}
                          onChange={() =>
                            setFormData({ ...formData, role: r.id as unknown as UserRole })
                          }
                        />
                        <div className="adm-radio-card-head">
                          <IntRoleBadge role={r.id} />
                        </div>
                        <p>{r.desc}</p>
                      </label>
                    );
                  })}
                </div>
              </div>

              <IntFormField label="School" htmlFor="invite-school">
                <CreatableSelect<SchoolOption>
                  inputId="invite-school"
                  classNamePrefix="adm-rs"
                  isClearable
                  placeholder="Search or add a school…"
                  options={schoolOptions}
                  value={schoolOption}
                  onChange={handleSchoolChange}
                  formatCreateLabel={(input) => `Use "${input}" as school name`}
                />
              </IntFormField>

              <IntFormField label="Borough">
                <select
                  id="invite-borough"
                  className="adm-select"
                  value={formData.school_borough}
                  onChange={(e) => setFormData({ ...formData, school_borough: e.target.value })}
                >
                  <option value="">Select borough</option>
                  {NYC_BOROUGHS.map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </IntFormField>

              <IntFormField
                label="Personal note"
                hint={`${(formData.message ?? '').length}/240 · shown in the email`}
              >
                <textarea
                  id="invite-message"
                  className="adm-input"
                  rows={3}
                  maxLength={240}
                  placeholder="e.g. Looking forward to your Three Sisters draft — welcome!"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </IntFormField>

              <div className="adm-info-strip">
                <span className="adm-info-strip-icon">
                  <Info className="w-4 h-4" aria-hidden="true" />
                </span>
                <span>
                  <strong>Invites expire in 7 days.</strong> If the recipient misses the window,
                  resend from the Invitations list — no need to recreate.
                </span>
              </div>
            </div>

            <div className="adm-form-actions">
              <IntButton type="button" onClick={() => navigate('/admin/users')}>
                Cancel
              </IntButton>
              <IntButton type="submit" variant="primary" disabled={!canSubmit}>
                <Send className="w-4 h-4" aria-hidden="true" />
                <span>{submitting ? 'Sending…' : 'Send invite'}</span>
              </IntButton>
            </div>
          </form>

          <aside className="adm-card adm-email-preview" aria-label="Email preview">
            <div className="adm-section-eyebrow">Email preview</div>
            <div className="adm-email-preview-body">
              <dl className="adm-email-preview-headers">
                <div>
                  <dt>From</dt>
                  <dd>Edible Schoolyard NYC &lt;no-reply@esynyc.org&gt;</dd>
                </div>
                <div>
                  <dt>To</dt>
                  <dd>{previewFirstLine}</dd>
                </div>
                <div>
                  <dt>Subject</dt>
                  <dd>You're invited to Edible Schoolyard NYC's lesson library</dd>
                </div>
              </dl>
              <p>Hi,</p>
              <p>
                {user?.full_name || user?.email || 'An admin'} invited you to join{' '}
                <strong>Edible Schoolyard NYC</strong> as <strong>{selectedRoleDef.label}</strong>
                {formData.school_name && (
                  <>
                    {' '}
                    for <strong>{formData.school_name}</strong>
                  </>
                )}
                .
              </p>
              {formData.message && (
                <blockquote className="adm-email-preview-quote">{formData.message}</blockquote>
              )}
              <p>
                Click the link below to accept the invite and set up your account. The link expires
                in 7 days.
              </p>
              <div className="adm-email-preview-cta">
                <span className="adm-email-preview-cta-btn">Accept invitation</span>
              </div>
              <p className="adm-email-preview-footer">
                If you didn't expect this, you can ignore this email.
              </p>
            </div>
            <div className="adm-email-preview-meta">
              Live preview — updates as you edit the form.
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
