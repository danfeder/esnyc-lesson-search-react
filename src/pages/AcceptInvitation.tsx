import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Mail, CheckCircle, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import type { UserRole } from '@/types/auth';
import { logger } from '@/utils/logger';
import {
  IntAuthShell,
  IntButton,
  IntFormField,
  IntRoleBadge,
  type IntRole,
} from '@/components/Internal';

interface InvitationMetadata {
  grades_taught?: string[];
  subjects_taught?: string[];
  invited_by_id?: string;
}

interface InvitationData {
  id: string;
  email: string;
  role: UserRole;
  school_name?: string;
  school_borough?: string;
  metadata?: InvitationMetadata;
  expires_at: string;
  accepted_at?: string;
  invited_at: string;
}

const GRADE_OPTIONS = ['3K', '4K', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
const SUBJECT_OPTIONS = ['Math', 'Science', 'Literacy/ELA', 'Social Studies', 'Health', 'Arts'];

export function AcceptInvitation() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
    full_name: '',
    grades_taught: [] as string[],
    subjects_taught: [] as string[],
  });

  const validateInvitation = useCallback(async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('token', token!)
        .single();

      if (fetchError || !data) throw new Error('Invalid or expired invitation');
      if (data.accepted_at) throw new Error('This invitation has already been accepted');
      if (new Date(data.expires_at) < new Date()) {
        throw new Error('This invitation has expired');
      }

      setInvitation({
        ...data,
        role: data.role as UserRole,
        metadata: (data.metadata as InvitationMetadata | null) || undefined,
        school_name: data.school_name || undefined,
        school_borough: data.school_borough || undefined,
        accepted_at: data.accepted_at || undefined,
      });

      const metadata = data.metadata as InvitationMetadata | null;
      if (metadata) {
        setFormData((prev) => ({
          ...prev,
          grades_taught: metadata.grades_taught || [],
          subjects_taught: metadata.subjects_taught || [],
        }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch invitation');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      validateInvitation();
    } else {
      setError('Invalid invitation link');
      setLoading(false);
    }
  }, [token, validateInvitation]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!invitation) return;

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: formData.password,
        options: { data: { full_name: formData.full_name } },
      });
      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      const { error: profileError } = await supabase.from('user_profiles').insert({
        id: authData.user.id,
        user_id: authData.user.id,
        email: invitation.email,
        full_name: formData.full_name,
        role: invitation.role,
        school_name: invitation.school_name,
        school_borough: invitation.school_borough,
        grades_taught: formData.grades_taught.length > 0 ? formData.grades_taught : null,
        subjects_taught: formData.subjects_taught.length > 0 ? formData.subjects_taught : null,
        invited_by: invitation.metadata?.invited_by_id,
        invited_at: invitation.invited_at,
        accepted_at: new Date().toISOString(),
        is_active: true,
      });
      if (profileError) throw profileError;

      const { error: updateError } = await supabase
        .from('user_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);
      if (updateError) throw updateError;

      await supabase.from('user_management_audit').insert({
        actor_id: authData.user.id,
        action: 'invite_accepted',
        target_user_id: authData.user.id,
        target_email: invitation.email,
      });

      try {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'welcome',
            to: invitation.email,
            data: { recipientName: formData.full_name, role: invitation.role },
          },
        });
      } catch (emailError) {
        logger.error('Failed to send welcome email:', emailError);
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password: formData.password,
      });
      if (signInError) throw signInError;

      navigate('/search');
    } catch (err) {
      logger.error('Error accepting invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleGrade = (grade: string) =>
    setFormData((prev) => ({
      ...prev,
      grades_taught: prev.grades_taught.includes(grade)
        ? prev.grades_taught.filter((g) => g !== grade)
        : [...prev.grades_taught, grade],
    }));

  const toggleSubject = (subject: string) =>
    setFormData((prev) => ({
      ...prev,
      subjects_taught: prev.subjects_taught.includes(subject)
        ? prev.subjects_taught.filter((s) => s !== subject)
        : [...prev.subjects_taught, subject],
    }));

  if (loading) {
    return (
      <IntAuthShell
        title="Checking your invitation"
        description="One moment while we verify the link."
        icon={<Loader2 className="w-5 h-5 adm-spin" aria-hidden="true" />}
      >
        <p className="adm-auth-quiet">This usually takes less than a second.</p>
      </IntAuthShell>
    );
  }

  if (error && !invitation) {
    return (
      <IntAuthShell
        tone="red"
        icon={<XCircle className="w-5 h-5" aria-hidden="true" />}
        title="This invitation isn't valid"
        description={error}
        footer={
          <IntButton variant="primary" onClick={() => navigate('/')}>
            Go to homepage
          </IntButton>
        }
        caption={
          <>
            Think this is a mistake? Email{' '}
            <a href="mailto:support@edibleschoolyardnyc.org">support@edibleschoolyardnyc.org</a>.
          </>
        }
      >
        <p className="adm-auth-quiet">
          Invitations expire 7 days after they're sent. Ask whoever invited you to send a new link.
        </p>
      </IntAuthShell>
    );
  }

  return (
    <IntAuthShell
      width="wide"
      tone="green"
      icon={<Mail className="w-5 h-5" aria-hidden="true" />}
      eyebrow="You're invited to"
      title="The ESYNYC Lesson Library"
      description={
        <>
          You've been added as a{' '}
          <span className="adm-auth-inline-role">
            <IntRoleBadge role={invitation!.role as IntRole} />
          </span>
          . Set up your account to get started.
        </>
      }
      caption={
        <>
          By accepting, you agree to our <a href="/terms">terms of service</a> and{' '}
          <a href="/privacy">privacy policy</a>.
        </>
      }
    >
      <div className="adm-auth-summary">
        <div>
          <span className="adm-label">Email</span>
          <p className="adm-auth-summary-value">{invitation!.email}</p>
        </div>
        {(invitation!.school_name || invitation!.school_borough) && (
          <div>
            <span className="adm-label">School</span>
            <p className="adm-auth-summary-value">
              {invitation!.school_name || '—'}
              {invitation!.school_borough && (
                <span className="adm-auth-summary-sub"> · {invitation!.school_borough}</span>
              )}
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="adm-auth-form">
        {error && (
          <div className="adm-auth-alert" role="alert">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        <h2 className="adm-section-eyebrow">Your account</h2>

        <IntFormField label="Full name" required>
          <input
            type="text"
            className="adm-input"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            placeholder="Jane Rivera"
            required
            autoComplete="name"
          />
        </IntFormField>

        <div className="adm-auth-grid-2">
          <IntFormField label="Password" required hint="At least 6 characters.">
            <input
              type="password"
              className="adm-input"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              minLength={6}
              autoComplete="new-password"
            />
          </IntFormField>

          <IntFormField label="Confirm password" required>
            <input
              type="password"
              className="adm-input"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              required
              autoComplete="new-password"
            />
          </IntFormField>
        </div>

        {(formData.grades_taught.length > 0 ||
          formData.subjects_taught.length > 0 ||
          invitation!.role === 'teacher') && (
          <>
            <h2 className="adm-section-eyebrow">What you teach</h2>
            <p className="adm-section-desc">
              We use this to recommend lessons. You can change this later.
            </p>

            <div className="adm-field">
              <span className="adm-label">Grades</span>
              <div className="adm-pill-group">
                {GRADE_OPTIONS.map((grade) => (
                  <button
                    key={grade}
                    type="button"
                    className={`adm-pill adm-pill--green${
                      formData.grades_taught.includes(grade) ? ' active' : ''
                    }`}
                    onClick={() => toggleGrade(grade)}
                    aria-pressed={formData.grades_taught.includes(grade)}
                  >
                    {grade}
                  </button>
                ))}
              </div>
            </div>

            <div className="adm-field">
              <span className="adm-label">Subjects</span>
              <div className="adm-pill-group">
                {SUBJECT_OPTIONS.map((subject) => (
                  <button
                    key={subject}
                    type="button"
                    className={`adm-pill${
                      formData.subjects_taught.includes(subject) ? ' active' : ''
                    }`}
                    onClick={() => toggleSubject(subject)}
                    aria-pressed={formData.subjects_taught.includes(subject)}
                  >
                    {subject}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="adm-auth-submit">
          <IntButton
            type="submit"
            variant="primary"
            size="lg"
            disabled={submitting}
            className="adm-btn--block"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 adm-spin" aria-hidden="true" />
                Creating account…
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" aria-hidden="true" />
                Accept and sign in
              </>
            )}
          </IntButton>
        </div>
      </form>
    </IntAuthShell>
  );
}
