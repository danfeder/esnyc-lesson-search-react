import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';
import { parseDbError } from '@/utils/errorHandling';
import { SchoolBadge, type School } from '@/components/Schools';
import {
  AlertCircle,
  Building,
  CheckCircle,
  ChevronRight,
  Edit,
  FileText,
  Loader2,
  Lock,
  Mail,
  MapPin,
  Plus,
  Save,
  User as UserIcon,
  X,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { logger } from '@/utils/logger';
import {
  IntButton,
  IntFormField,
  IntPageHeader,
  IntRoleBadge,
  IntStatusBadge,
  type IntRole,
  type IntStatus,
} from '@/components/Internal';

const BOROUGHS = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'];

interface ProfileFormData {
  full_name: string;
  school_borough: string;
}

type SubmissionStatus = 'submitted' | 'in_review' | 'needs_revision' | 'approved';

interface LessonSubmission {
  id: string;
  google_doc_url: string;
  status: SubmissionStatus;
  submission_type: 'new' | 'update';
  reviewer_notes?: string;
  revision_requested_reason?: string;
  created_at: string;
  updated_at: string;
  review_completed_at?: string;
  original_lesson_id?: string;
}

const STATUS_BADGE: Record<SubmissionStatus, IntStatus> = {
  submitted: 'submitted',
  in_review: 'review',
  needs_revision: 'revision',
  approved: 'approved',
};

export function UserProfile() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useEnhancedAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const [formData, setFormData] = useState<ProfileFormData>({
    full_name: '',
    school_borough: '',
  });
  const [userSchools, setUserSchools] = useState<School[]>([]);

  const [submissions, setSubmissions] = useState<LessonSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  const [showPasswordSection, setShowPasswordSection] = useState(false);
  const [pwForm, setPwForm] = useState({ next: '', confirm: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');

  const loadUserProfile = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (profileError) throw profileError;

      setFormData({
        full_name: profile.full_name || '',
        school_borough: profile.school_borough || '',
      });

      const { data: userSchoolData, error: schoolsError } = await supabase
        .from('user_schools')
        .select('schools(id, name)')
        .eq('user_id', user.id);
      if (schoolsError) throw schoolsError;

      const schools =
        (userSchoolData
          ?.map((us: { schools: School | null }) => us.schools)
          .filter(Boolean) as School[]) || [];
      setUserSchools(schools);
    } catch (error) {
      logger.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const loadSubmissions = useCallback(async () => {
    if (!user) return;
    setLoadingSubmissions(true);
    try {
      const { data, error } = await supabase
        .from('lesson_submissions')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;

      setSubmissions(
        (data || []).map((sub) => ({
          ...sub,
          status: sub.status as SubmissionStatus,
          submission_type: sub.submission_type as 'new' | 'update',
          created_at: sub.created_at || '',
          updated_at: sub.updated_at || '',
          reviewer_notes: sub.reviewer_notes || undefined,
          revision_requested_reason: sub.revision_requested_reason || undefined,
          review_completed_at: sub.review_completed_at || undefined,
          original_lesson_id: sub.original_lesson_id || undefined,
        }))
      );
    } catch (error) {
      logger.error('Error loading submissions:', error);
    } finally {
      setLoadingSubmissions(false);
    }
  }, [user]);

  useEffect(() => {
    if (user && !authLoading) {
      loadUserProfile();
      loadSubmissions();
    }
  }, [user, authLoading, loadUserProfile, loadSubmissions]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const updateData = {
        full_name: formData.full_name || undefined,
        school_borough: formData.school_borough || undefined,
        updated_at: new Date().toISOString(),
      };

      const { error: profileError } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('id', user.id);
      if (profileError) throw profileError;

      setEditMode(false);
      setSuccessMessage('Profile updated.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      logger.error('Error updating profile:', error);
      setErrorMessage(parseDbError(error));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    setErrorMessage('');
    loadUserProfile();
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPwError('');
    setPwSuccess('');

    if (pwForm.next !== pwForm.confirm) {
      setPwError('Passwords do not match');
      return;
    }
    if (pwForm.next.length < 6) {
      setPwError('Password must be at least 6 characters');
      return;
    }

    setPwSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwForm.next });
      if (error) throw error;
      setPwSuccess('Password updated.');
      setPwForm({ next: '', confirm: '' });
      setTimeout(() => {
        setPwSuccess('');
        setShowPasswordSection(false);
      }, 2500);
    } catch (error) {
      logger.error('Error updating password:', error);
      setPwError(parseDbError(error));
    } finally {
      setPwSaving(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="int-shell-root">
        <div className="adm-page adm-page--narrow">
          <p className="adm-section-desc">
            <Loader2 className="w-4 h-4 adm-spin" aria-hidden="true" /> Loading your profile…
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="int-shell-root">
        <div className="adm-page adm-page--narrow">
          <div className="adm-empty">
            <h3>Sign in required</h3>
            <p>You need to be signed in to view your profile.</p>
            <div className="adm-empty-actions">
              <IntButton variant="primary" onClick={() => navigate('/login')}>
                Go to sign in
              </IntButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const headerActions = !editMode ? (
    <IntButton variant="primary" onClick={() => setEditMode(true)}>
      <Edit className="w-4 h-4" aria-hidden="true" />
      Edit profile
    </IntButton>
  ) : (
    <>
      <IntButton variant="ghost" onClick={handleCancel}>
        <X className="w-4 h-4" aria-hidden="true" />
        Cancel
      </IntButton>
      <IntButton variant="primary" onClick={handleSave} disabled={saving}>
        {saving ? (
          <Loader2 className="w-4 h-4 adm-spin" aria-hidden="true" />
        ) : (
          <Save className="w-4 h-4" aria-hidden="true" />
        )}
        {saving ? 'Saving…' : 'Save changes'}
      </IntButton>
    </>
  );

  return (
    <div className="int-shell-root">
      <div className="adm-page adm-page--narrow">
        <IntPageHeader
          title="My profile"
          description="Your account details and school affiliation."
          actions={headerActions}
          back={{ label: 'Back', onClick: () => navigate(-1) }}
        />

        {successMessage && (
          <div className="adm-auth-alert adm-auth-alert--success" role="status">
            <CheckCircle className="w-4 h-4" aria-hidden="true" />
            <span>{successMessage}</span>
          </div>
        )}
        {errorMessage && (
          <div className="adm-auth-alert" role="alert">
            <AlertCircle className="w-4 h-4" aria-hidden="true" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* --- Basic information --- */}
        <section className="adm-card">
          <h2 className="adm-section-eyebrow">
            <UserIcon className="w-3.5 h-3.5" aria-hidden="true" /> Basic information
          </h2>

          <IntFormField label="Full name">
            {editMode ? (
              <input
                type="text"
                className="adm-input"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Enter your full name"
                autoComplete="name"
              />
            ) : (
              <p className="adm-readonly">{formData.full_name || 'Not provided'}</p>
            )}
          </IntFormField>

          <IntFormField label="Email" hint="Email cannot be changed here — contact an admin.">
            <p className="adm-readonly adm-readonly--muted">
              <Mail className="w-3.5 h-3.5" aria-hidden="true" />
              {user.email}
            </p>
          </IntFormField>

          <IntFormField label="Role">
            <div>
              <IntRoleBadge role={user.role as IntRole} />
            </div>
          </IntFormField>
        </section>

        {/* --- School affiliation --- */}
        <section className="adm-card">
          <h2 className="adm-section-eyebrow">
            <Building className="w-3.5 h-3.5" aria-hidden="true" /> School affiliation
          </h2>

          <IntFormField
            label="Schools"
            hint={
              userSchools.length > 0
                ? 'Contact an administrator to update school assignments.'
                : undefined
            }
          >
            <div className="adm-readonly-stack">
              {userSchools.length > 0 ? (
                <div className="adm-school-chips">
                  {userSchools.map((school) => (
                    <SchoolBadge key={school.id} name={school.name} />
                  ))}
                </div>
              ) : (
                <p className="adm-readonly adm-readonly--muted">No schools assigned</p>
              )}
            </div>
          </IntFormField>

          <IntFormField label="Borough">
            {editMode ? (
              <select
                className="adm-select"
                value={formData.school_borough}
                onChange={(e) => setFormData({ ...formData, school_borough: e.target.value })}
              >
                <option value="">Select borough</option>
                {BOROUGHS.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            ) : (
              <p className="adm-readonly">
                {formData.school_borough ? (
                  <>
                    <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
                    {formData.school_borough}
                  </>
                ) : (
                  <span className="adm-readonly--muted">Not provided</span>
                )}
              </p>
            )}
          </IntFormField>
        </section>

        {/* --- Security / change password --- */}
        <section className="adm-card">
          <button
            type="button"
            className="adm-collapse-head"
            onClick={() => setShowPasswordSection((v) => !v)}
            aria-expanded={showPasswordSection}
          >
            <span>
              <Lock className="w-3.5 h-3.5 adm-collapse-head-icon" aria-hidden="true" />
              Change password
            </span>
            <ChevronRight
              className={`w-4 h-4 adm-collapse-chev${
                showPasswordSection ? ' adm-collapse-chev--open' : ''
              }`}
              aria-hidden="true"
            />
          </button>

          {showPasswordSection && (
            <form onSubmit={handleChangePassword} className="adm-auth-form adm-collapse-form">
              {pwError && (
                <div className="adm-auth-alert" role="alert">
                  <AlertCircle className="w-4 h-4" aria-hidden="true" />
                  <span>{pwError}</span>
                </div>
              )}
              {pwSuccess && (
                <div className="adm-auth-alert adm-auth-alert--success" role="status">
                  <CheckCircle className="w-4 h-4" aria-hidden="true" />
                  <span>{pwSuccess}</span>
                </div>
              )}

              <IntFormField label="New password" required hint="At least 6 characters.">
                <input
                  type="password"
                  className="adm-input"
                  value={pwForm.next}
                  onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </IntFormField>

              <IntFormField label="Confirm new password" required>
                <input
                  type="password"
                  className="adm-input"
                  value={pwForm.confirm}
                  onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                  required
                  minLength={6}
                  autoComplete="new-password"
                />
              </IntFormField>

              <div className="adm-form-actions">
                <IntButton
                  variant="ghost"
                  onClick={() => {
                    setShowPasswordSection(false);
                    setPwForm({ next: '', confirm: '' });
                    setPwError('');
                  }}
                >
                  Cancel
                </IntButton>
                <IntButton type="submit" variant="primary" disabled={pwSaving}>
                  {pwSaving ? (
                    <>
                      <Loader2 className="w-4 h-4 adm-spin" aria-hidden="true" />
                      Updating…
                    </>
                  ) : (
                    'Update password'
                  )}
                </IntButton>
              </div>
            </form>
          )}
        </section>

        {/* --- My submissions --- */}
        <section className="adm-card">
          <div className="adm-card-head">
            <h2 className="adm-section-eyebrow">
              <FileText className="w-3.5 h-3.5" aria-hidden="true" /> My submissions
            </h2>
            <IntButton variant="primary" size="sm" onClick={() => navigate('/submit')}>
              <Plus className="w-4 h-4" aria-hidden="true" />
              New submission
            </IntButton>
          </div>

          {loadingSubmissions ? (
            <p className="adm-submission-row-loading">
              <Loader2 className="w-4 h-4 adm-spin" aria-hidden="true" /> Loading submissions…
            </p>
          ) : submissions.length === 0 ? (
            <div className="adm-empty">
              <h3>No submissions yet</h3>
              <p>Submit your first lesson to share with the community.</p>
            </div>
          ) : (
            <div>
              {submissions.map((submission) => (
                <article key={submission.id} className="adm-submission-row">
                  <div className="adm-submission-row-head">
                    <IntStatusBadge status={STATUS_BADGE[submission.status]} />
                    <span className="adm-submission-row-type">
                      {submission.submission_type === 'update' ? 'Update' : 'New lesson'}
                    </span>
                  </div>

                  <p className="adm-submission-row-link">
                    <a
                      href={submission.google_doc_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="adm-link"
                    >
                      View Google Doc →
                    </a>
                  </p>

                  {submission.revision_requested_reason && (
                    <div className="adm-callout adm-callout--warning">
                      <p className="adm-callout-title">Revision requested</p>
                      <p>{submission.revision_requested_reason}</p>
                    </div>
                  )}

                  {submission.reviewer_notes && submission.status === 'approved' && (
                    <div className="adm-callout adm-callout--success">
                      <p className="adm-callout-title">Reviewer notes</p>
                      <p>{submission.reviewer_notes}</p>
                    </div>
                  )}

                  <div className="adm-submission-row-meta">
                    <span>
                      Submitted{' '}
                      {formatDistanceToNow(new Date(submission.created_at), { addSuffix: true })}
                    </span>
                    {submission.review_completed_at && (
                      <span>
                        Reviewed{' '}
                        {formatDistanceToNow(new Date(submission.review_completed_at), {
                          addSuffix: true,
                        })}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* --- Account meta --- */}
        <section className="adm-card adm-card--tight">
          <dl className="adm-kv-row">
            <div>
              <dt className="adm-label">Member since</dt>
              <dd>{formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}</dd>
            </div>
            <div>
              <dt className="adm-label">Account status</dt>
              <dd>
                <span className="adm-status adm-status--active">Active</span>
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
