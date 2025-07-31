import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useEnhancedAuth } from '../hooks/useEnhancedAuth';
import {
  ArrowLeft,
  User,
  Mail,
  Building,
  Calendar,
  Save,
  Edit,
  X,
  BookOpen,
  GraduationCap,
  MapPin,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface LessonSubmission {
  id: string;
  google_doc_url: string;
  status: 'submitted' | 'in_review' | 'needs_revision' | 'approved';
  submission_type: 'new' | 'update';
  reviewer_notes?: string;
  revision_requested_reason?: string;
  created_at: string;
  updated_at: string;
  review_completed_at?: string;
  original_lesson_id?: string;
}

export function UserProfile() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useEnhancedAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [submissions, setSubmissions] = useState<LessonSubmission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    school_name: '',
    school_borough: '',
    grades_taught: [] as string[],
    subjects_taught: [] as string[],
  });

  // Grade options
  const gradeOptions = ['3K', '4K', '1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];

  // Subject options
  const subjectOptions = ['Math', 'Science', 'Literacy/ELA', 'Social Studies', 'Health', 'Arts'];

  useEffect(() => {
    if (user && !authLoading) {
      loadUserProfile();
      loadSubmissions();
    }
  }, [user, authLoading]);

  const loadUserProfile = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;

      setFormData({
        full_name: profile.full_name || '',
        school_name: profile.school_name || '',
        school_borough: profile.school_borough || '',
        grades_taught: profile.grades_taught || [],
        subjects_taught: profile.subjects_taught || [],
      });
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async () => {
    if (!user) return;

    setLoadingSubmissions(true);
    try {
      const { data, error } = await supabase
        .from('lesson_submissions')
        .select('*')
        .eq('teacher_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setSubmissions(data || []);
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setSuccessMessage('');

    try {
      const updateData = {
        full_name: formData.full_name || null,
        school_name: formData.school_name || null,
        school_borough: formData.school_borough || null,
        grades_taught: formData.grades_taught.length > 0 ? formData.grades_taught : null,
        subjects_taught: formData.subjects_taught.length > 0 ? formData.subjects_taught : null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from('user_profiles').update(updateData).eq('id', user.id);

      if (error) throw error;

      setEditMode(false);
      setSuccessMessage('Profile updated successfully!');

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditMode(false);
    loadUserProfile(); // Reset form to original values
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'needs_revision':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'in_review':
        return <Clock className="w-5 h-5 text-blue-600" />;
      case 'submitted':
        return <FileText className="w-5 h-5 text-gray-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'needs_revision':
        return 'bg-yellow-100 text-yellow-800';
      case 'in_review':
        return 'bg-blue-100 text-blue-800';
      case 'submitted':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-600">Please log in to view your profile</p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 text-green-600 hover:text-green-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <User className="w-6 h-6" />
              My Profile
            </h1>
            <p className="text-gray-600 mt-1">Manage your account information</p>
          </div>

          <div className="flex gap-3">
            {!editMode ? (
              <button
                onClick={() => setEditMode(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit Profile
              </button>
            ) : (
              <>
                <button
                  onClick={handleCancel}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter your full name"
                  />
                ) : (
                  <p className="text-gray-900">{formData.full_name || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email
                </label>
                <p className="text-gray-900">{user.email}</p>
                <p className="text-xs text-gray-500 mt-1">Email cannot be changed here</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {user.role.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* School Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              <Building className="w-5 h-5 inline mr-2" />
              School Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">School Name</label>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.school_name}
                    onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Enter your school name"
                  />
                ) : (
                  <p className="text-gray-900">{formData.school_name || 'Not provided'}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="w-4 h-4 inline mr-1" />
                  Borough
                </label>
                {editMode ? (
                  <select
                    value={formData.school_borough}
                    onChange={(e) => setFormData({ ...formData, school_borough: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select Borough</option>
                    <option value="Manhattan">Manhattan</option>
                    <option value="Brooklyn">Brooklyn</option>
                    <option value="Queens">Queens</option>
                    <option value="Bronx">Bronx</option>
                    <option value="Staten Island">Staten Island</option>
                  </select>
                ) : (
                  <p className="text-gray-900">{formData.school_borough || 'Not provided'}</p>
                )}
              </div>
            </div>
          </div>

          {/* Teaching Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              <GraduationCap className="w-5 h-5 inline mr-2" />
              Teaching Information
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Grades Taught
                </label>
                {editMode ? (
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
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {formData.grades_taught.length > 0 ? (
                      formData.grades_taught.map((grade) => (
                        <span
                          key={grade}
                          className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                        >
                          {grade}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500">Not specified</p>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <BookOpen className="w-4 h-4 inline mr-1" />
                  Subjects Taught
                </label>
                {editMode ? (
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
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {formData.subjects_taught.length > 0 ? (
                      formData.subjects_taught.map((subject) => (
                        <span
                          key={subject}
                          className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {subject}
                        </span>
                      ))
                    ) : (
                      <p className="text-gray-500">Not specified</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Submission History */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                My Submissions
              </h2>
              <Link
                to="/submit"
                className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                New Submission
              </Link>
            </div>

            {loadingSubmissions ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto"></div>
                <p className="mt-2 text-sm text-gray-600">Loading submissions...</p>
              </div>
            ) : submissions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">No submissions yet</p>
                <p className="text-sm text-gray-500 mt-1">
                  Submit your first lesson to share with the community!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {submissions.map((submission) => (
                  <div
                    key={submission.id}
                    className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusIcon(submission.status)}
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                              submission.status
                            )}`}
                          >
                            {submission.status.replace('_', ' ')}
                          </span>
                          <span className="text-sm text-gray-500">
                            {submission.submission_type === 'update' ? 'Update' : 'New Lesson'}
                          </span>
                        </div>

                        <div className="mb-2">
                          <a
                            href={submission.google_doc_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                          >
                            View Google Doc →
                          </a>
                        </div>

                        {submission.revision_requested_reason && (
                          <div className="mb-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                            <p className="text-sm font-medium text-yellow-800 mb-1">
                              Revision Requested
                            </p>
                            <p className="text-sm text-yellow-700">
                              {submission.revision_requested_reason}
                            </p>
                          </div>
                        )}

                        {submission.reviewer_notes && submission.status === 'approved' && (
                          <div className="mb-2 p-3 bg-green-50 border border-green-200 rounded-md">
                            <p className="text-sm font-medium text-green-800 mb-1">
                              Reviewer Notes
                            </p>
                            <p className="text-sm text-green-700">{submission.reviewer_notes}</p>
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span>
                            Submitted{' '}
                            {formatDistanceToNow(new Date(submission.created_at), {
                              addSuffix: true,
                            })}
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
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Account Details */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Details</h2>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Member Since</p>
                <p className="text-sm text-gray-900">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="text-sm text-gray-900">
                  {formatDistanceToNow(new Date(user.updated_at), { addSuffix: true })}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Account Status</p>
                <p className="text-sm text-green-600 font-medium">Active</p>
              </div>
            </div>
          </div>

          {/* Help & Support */}
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Need Help?</h3>
            <p className="text-sm text-gray-600 mb-4">
              If you need to change your email address or have any issues with your account, please
              contact your administrator.
            </p>
            <button
              onClick={() => navigate('/contact')}
              className="text-sm text-green-600 hover:text-green-700 font-medium"
            >
              Contact Support →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
