import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft,
  Send,
  Mail,
  Building,
  MapPin,
  GraduationCap,
  BookOpen,
  MessageSquare,
} from 'lucide-react';
import { UserRole, InvitationFormData } from '@/types/auth';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';
import { logger } from '@/utils/logger';
import { parseDbError, isEmailDuplicateError } from '@/utils/errorHandling';

// Extend Window interface for development debugging
declare global {
  interface Window {
    _lastInvitationLink?: string;
  }
}

const NYC_BOROUGHS = ['Manhattan', 'Brooklyn', 'Queens', 'Bronx', 'Staten Island'];
const GRADE_LEVELS = ['3K', 'Pre-K', 'K', '1', '2', '3', '4', '5', '6', '7', '8'];
const SUBJECTS = [
  'Math',
  'Science',
  'Literacy/ELA',
  'Social Studies',
  'Health',
  'Arts',
  'Garden',
  'Cooking',
];

const getPermissionsForRole = (role: UserRole): string[] => {
  switch (role) {
    case UserRole.TEACHER:
      return ['view_lessons', 'submit_lessons'];
    case UserRole.REVIEWER:
      return [
        'view_lessons',
        'submit_lessons',
        'review_lessons',
        'approve_lessons',
        'view_analytics',
      ];
    case UserRole.ADMIN:
      return [
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
      ];
    default:
      return ['view_lessons', 'submit_lessons'];
  }
};

export function AdminInviteUser() {
  const navigate = useNavigate();
  const { user } = useEnhancedAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState<InvitationFormData>({
    email: '',
    role: UserRole.TEACHER,
    school_name: '',
    school_borough: '',
    message: '',
    grades_taught: [],
    subjects_taught: [],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Check if there's already a pending invitation
      const { data: existingInvites } = await supabase
        .from('user_invitations')
        .select('id')
        .eq('email', formData.email)
        .is('accepted_at', null);

      if (existingInvites && existingInvites.length > 0) {
        throw new Error('An invitation has already been sent to this email');
      }

      // Create invitation
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      const { data: inviteData, error: inviteError } = await supabase
        .from('user_invitations')
        .insert({
          email: formData.email,
          role: formData.role,
          invited_by: user.id,
          school_name: formData.school_name || undefined,
          school_borough: formData.school_borough || undefined,
          message: formData.message || undefined,
          metadata: {
            grades_taught: formData.grades_taught,
            subjects_taught: formData.subjects_taught,
            invited_by_id: user.id,
          },
        })
        .select()
        .single();

      if (inviteError) throw inviteError;

      // Log audit
      await supabase.from('user_management_audit').insert({
        actor_id: user.id,
        action: 'invite_sent',
        target_email: formData.email,
        new_values: {
          role: formData.role,
          school_name: formData.school_name,
          school_borough: formData.school_borough,
        },
      });

      // Send invitation email
      if (inviteData) {
        try {
          const { error: emailError } = await supabase.functions.invoke('send-email', {
            body: {
              type: 'invitation',
              to: formData.email,
              data: {
                invitationId: inviteData.id,
                token: inviteData.token,
                inviterName: user?.full_name || user?.email,
                role: formData.role,
                customMessage: formData.message,
                permissions: getPermissionsForRole(formData.role),
                expiresAt: inviteData.expires_at,
              },
            },
          });

          if (emailError) {
            logger.error('Failed to send invitation email:', emailError);
            // In development, show the invitation link as fallback
            const invitationLink = `${window.location.origin}/accept-invitation?token=${inviteData.token}`;
            if (import.meta.env.DEV) {
              window._lastInvitationLink = invitationLink;
              logger.log('Invitation link available in window._lastInvitationLink');
            }
          }
        } catch (err) {
          logger.error('Error invoking email function:', err);
          // In development, show the invitation link as fallback
          const invitationLink = `${window.location.origin}/accept-invitation?token=${inviteData.token}`;
          if (import.meta.env.DEV) {
            window._lastInvitationLink = invitationLink;
            logger.log('Invitation link available in window._lastInvitationLink');
          }
        }
      }

      setSuccess(true);
    } catch (err) {
      // Use the enhanced error handling for better user feedback
      if (isEmailDuplicateError(err)) {
        setError(
          'This email address is already registered to another user. Please use a different email address.'
        );
      } else {
        setError(parseDbError(err));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGradeToggle = (grade: string) => {
    setFormData((prev) => ({
      ...prev,
      grades_taught: prev.grades_taught?.includes(grade)
        ? prev.grades_taught.filter((g) => g !== grade)
        : [...(prev.grades_taught || []), grade],
    }));
  };

  const handleSubjectToggle = (subject: string) => {
    setFormData((prev) => ({
      ...prev,
      subjects_taught: prev.subjects_taught?.includes(subject)
        ? prev.subjects_taught.filter((s) => s !== subject)
        : [...(prev.subjects_taught || []), subject],
    }));
  };

  if (success) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-green-100 rounded-full p-3">
              <Send className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-green-800 mb-2">Invitation Sent!</h2>
          <p className="text-green-700 mb-4">An invitation has been sent to {formData.email}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setSuccess(false);
                setFormData({
                  email: '',
                  role: UserRole.TEACHER,
                  school_name: '',
                  school_borough: '',
                  message: '',
                  grades_taught: [],
                  subjects_taught: [],
                });
              }}
              className="px-4 py-2 border border-green-300 text-green-700 rounded-md hover:bg-green-100 transition-colors"
            >
              Send Another Invitation
            </button>
            <button
              onClick={() => navigate('/admin/users')}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Go to User Management
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <button
          onClick={() => navigate('/admin/users')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invite New User</h1>
          <p className="text-gray-600">Send an invitation to join the platform</p>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        {/* Email */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="teacher@school.edu"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Role */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role <span className="text-red-500">*</span>
          </label>
          <div className="grid grid-cols-3 gap-3">
            {[UserRole.TEACHER, UserRole.REVIEWER, UserRole.ADMIN].map((role) => (
              <label
                key={role}
                className={`flex items-center justify-center p-3 border rounded-lg cursor-pointer transition-all ${
                  formData.role === role
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="radio"
                  name="role"
                  value={role}
                  checked={formData.role === role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="sr-only"
                />
                <span className="capitalize">{role}</span>
              </label>
            ))}
          </div>
          <p className="mt-2 text-sm text-gray-600">
            {formData.role === UserRole.TEACHER && 'Can view and submit lessons'}
            {formData.role === UserRole.REVIEWER && 'Can review and approve submitted lessons'}
            {formData.role === UserRole.ADMIN && 'Can manage users and system settings'}
          </p>
        </div>

        {/* School Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">School Name</label>
            <div className="relative">
              <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={formData.school_name}
                onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                placeholder="P.S. 123"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Borough</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={formData.school_borough}
                onChange={(e) => setFormData({ ...formData, school_borough: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent appearance-none"
              >
                <option value="">Select borough</option>
                {NYC_BOROUGHS.map((borough) => (
                  <option key={borough} value={borough}>
                    {borough}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Grades Taught */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <GraduationCap className="inline w-4 h-4 mr-1" />
            Grades Taught
          </label>
          <div className="flex flex-wrap gap-2">
            {GRADE_LEVELS.map((grade) => (
              <label
                key={grade}
                className={`px-3 py-1 border rounded-full cursor-pointer text-sm transition-all ${
                  formData.grades_taught?.includes(grade)
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.grades_taught?.includes(grade) || false}
                  onChange={() => handleGradeToggle(grade)}
                  className="sr-only"
                />
                {grade}
              </label>
            ))}
          </div>
        </div>

        {/* Subjects Taught */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <BookOpen className="inline w-4 h-4 mr-1" />
            Subjects Taught
          </label>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((subject) => (
              <label
                key={subject}
                className={`px-3 py-1 border rounded-full cursor-pointer text-sm transition-all ${
                  formData.subjects_taught?.includes(subject)
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <input
                  type="checkbox"
                  checked={formData.subjects_taught?.includes(subject) || false}
                  onChange={() => handleSubjectToggle(subject)}
                  className="sr-only"
                />
                {subject}
              </label>
            ))}
          </div>
        </div>

        {/* Custom Message */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <MessageSquare className="inline w-4 h-4 mr-1" />
            Personal Message (Optional)
          </label>
          <textarea
            value={formData.message}
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            placeholder="Add a personal message to the invitation..."
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate('/admin/users')}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>Sending...</>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send Invitation
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
