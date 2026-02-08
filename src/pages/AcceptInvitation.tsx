import { useState, useEffect, useCallback, FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  Mail,
  User,
  Lock,
  Building,
  MapPin,
  GraduationCap,
  BookOpen,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { UserRole } from '@/types/auth';
import { logger } from '@/utils/logger';

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

  const gradeOptions = ['3K', '4K', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
  const subjectOptions = ['Math', 'Science', 'Literacy/ELA', 'Social Studies', 'Health', 'Arts'];

  const validateInvitation = useCallback(async () => {
    try {
      // Fetch invitation by token
      const { data, error: fetchError } = await supabase
        .from('user_invitations')
        .select('*')
        .eq('token', token!)
        .single();

      if (fetchError || !data) {
        throw new Error('Invalid or expired invitation');
      }

      // Check if already accepted
      if (data.accepted_at) {
        throw new Error('This invitation has already been accepted');
      }

      // Check if expired
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

      // Pre-fill form data from invitation metadata
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

    // Validate form
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
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: invitation.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create user');

      // Create user profile
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

      // Mark invitation as accepted
      const { error: updateError } = await supabase
        .from('user_invitations')
        .update({ accepted_at: new Date().toISOString() })
        .eq('id', invitation.id);

      if (updateError) throw updateError;

      // Log audit
      await supabase.from('user_management_audit').insert({
        actor_id: authData.user.id,
        action: 'invite_accepted',
        target_user_id: authData.user.id,
        target_email: invitation.email,
      });

      // Send welcome email
      try {
        await supabase.functions.invoke('send-email', {
          body: {
            type: 'welcome',
            to: invitation.email,
            data: {
              recipientName: formData.full_name,
              role: invitation.role,
            },
          },
        });
      } catch (emailError) {
        logger.error('Failed to send welcome email:', emailError);
        // Don't block the flow if email fails
      }

      // Sign in the user
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: invitation.email,
        password: formData.password,
      });

      if (signInError) throw signInError;

      // Redirect to dashboard
      navigate('/');
    } catch (err) {
      logger.error('Error accepting invitation:', err);
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleGrade = (grade: string) => {
    setFormData((prev) => ({
      ...prev,
      grades_taught: prev.grades_taught.includes(grade)
        ? prev.grades_taught.filter((g) => g !== grade)
        : [...prev.grades_taught, grade],
    }));
  };

  const toggleSubject = (subject: string) => {
    setFormData((prev) => ({
      ...prev,
      subjects_taught: prev.subjects_taught.includes(subject)
        ? prev.subjects_taught.filter((s) => s !== subject)
        : [...prev.subjects_taught, subject],
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Validating invitation...</p>
        </div>
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="text-green-600 hover:text-green-700 font-medium"
          >
            Go to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-green-100 rounded-full">
              <Mail className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Accept Your Invitation</h1>
          <p className="mt-2 text-gray-600">
            You've been invited to join ESYNYC Lesson Library as a{' '}
            <span className="font-semibold">{invitation?.role}</span>
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Account Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Information</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={invitation?.email || ''}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <User className="w-4 h-4 inline mr-1" />
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Lock className="w-4 h-4 inline mr-1" />
                    Password *
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Choose a password (min 6 characters)"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Lock className="w-4 h-4 inline mr-1" />
                    Confirm Password *
                  </label>
                  <input
                    type="password"
                    value={formData.confirmPassword}
                    onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>
            </div>

            {/* School Information */}
            {(invitation?.school_name || invitation?.school_borough) && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">School Information</h3>

                <div className="space-y-4">
                  {invitation.school_name && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <Building className="w-4 h-4 inline mr-1" />
                        School
                      </label>
                      <input
                        type="text"
                        value={invitation.school_name}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                      />
                    </div>
                  )}

                  {invitation.school_borough && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        <MapPin className="w-4 h-4 inline mr-1" />
                        Borough
                      </label>
                      <input
                        type="text"
                        value={invitation.school_borough}
                        disabled
                        className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Teaching Information */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Teaching Information</h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <GraduationCap className="w-4 h-4 inline mr-1" />
                    Grades Taught
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {gradeOptions.map((grade) => (
                      <button
                        key={grade}
                        type="button"
                        onClick={() => toggleGrade(grade)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          formData.grades_taught.includes(grade)
                            ? 'bg-green-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {grade}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <BookOpen className="w-4 h-4 inline mr-1" />
                    Subjects Taught
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {subjectOptions.map((subject) => (
                      <button
                        key={subject}
                        type="button"
                        onClick={() => toggleSubject(subject)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          formData.subjects_taught.includes(subject)
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {subject}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-gray-500">
                By accepting, you agree to our terms of service
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating Account...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5" />
                    Accept Invitation
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
