import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ExternalLink,
  Calendar,
  User as UserIcon,
  FileText,
} from 'lucide-react';

interface Submission {
  id: string;
  created_at: string;
  teacher_id: string;
  google_doc_url: string;
  google_doc_id: string;
  submission_type: 'new' | 'update';
  original_lesson_id?: string;
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'needs_revision';
  extracted_content?: string;
  review_notes?: string;
  teacher?: {
    email: string;
    full_name?: string;
  };
  similarities?: Array<{
    lesson_id: string;
    combined_score: number;
    match_type: string;
    lesson: {
      title: string;
    };
  }>;
}

const statusIcons = {
  submitted: Clock,
  under_review: AlertTriangle,
  approved: CheckCircle,
  rejected: XCircle,
  needs_revision: AlertTriangle,
};

const statusColors = {
  submitted: 'bg-gray-100 text-gray-800',
  under_review: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  needs_revision: 'bg-orange-100 text-orange-800',
};

export function ReviewDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [isReviewer, setIsReviewer] = useState(false);

  useEffect(() => {
    checkAuth();
    loadSubmissions();
  }, [filter]);

  const checkAuth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      navigate('/');
      return;
    }
    setUser(user);

    // Check if user has reviewer role
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      console.error('Error fetching user profile:', error);
      setIsReviewer(false);
      return;
    }

    // Only allow access if user has reviewer or admin role
    const isReviewerRole = profile.role === 'reviewer' || profile.role === 'admin';
    setIsReviewer(isReviewerRole);

    if (!isReviewerRole) {
      // Redirect non-reviewers back to home page
      navigate('/');
    }
  };

  const loadSubmissions = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('lesson_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch teacher information separately from user_profiles
      if (data && data.length > 0) {
        const teacherIds = [...new Set(data.map((s) => s.teacher_id))];
        const { data: profiles } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', teacherIds);

        // Map teacher info to submissions
        const submissionsWithTeachers = data.map((submission) => {
          const profile = profiles?.find((p) => p.id === submission.teacher_id);
          return {
            ...submission,
            teacher: {
              email: 'teacher@example.com', // We'll use a placeholder for now
              full_name: profile?.full_name || 'Unknown Teacher',
            },
          };
        });

        setSubmissions(submissionsWithTeachers);
      } else {
        setSubmissions(data || []);
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSubmissionStatus = async (id: string, status: string, notes?: string) => {
    try {
      const updates: any = {
        status,
        review_notes: notes,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user?.id,
      };

      const { error } = await supabase.from('lesson_submissions').update(updates).eq('id', id);

      if (error) throw error;

      // Reload submissions
      loadSubmissions();
    } catch (error) {
      console.error('Error updating submission:', error);
    }
  };

  // Temporarily disabled until we fix the relationship
  const getTopDuplicates = (submission: Submission) => {
    return [];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading submissions...</p>
        </div>
      </div>
    );
  }

  if (!isReviewer) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Access Denied</h2>
          <p className="text-red-600">You don't have permission to access the review dashboard.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Submission Review Dashboard</h1>
        <p className="text-gray-600">Review and approve lesson plan submissions</p>
      </div>

      {/* Filter Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['all', 'submitted', 'under_review', 'approved', 'rejected', 'needs_revision'].map(
            (status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  filter === status
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}
                {status !== 'all' && (
                  <span className="ml-2 text-xs">
                    ({submissions.filter((s) => s.status === status).length})
                  </span>
                )}
              </button>
            )
          )}
        </nav>
      </div>

      {/* Submissions List */}
      <div className="space-y-4">
        {submissions.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600">No submissions found</p>
          </div>
        ) : (
          submissions.map((submission) => {
            const StatusIcon = statusIcons[submission.status];
            const topDuplicates = getTopDuplicates(submission);

            return (
              <div
                key={submission.id}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-2">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusColors[submission.status]}`}
                      >
                        <StatusIcon size={16} />
                        {submission.status.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-gray-500">
                        {submission.submission_type === 'new' ? 'New Lesson' : 'Update'}
                      </span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      Submission #{submission.id.slice(0, 8)}
                    </h3>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <UserIcon size={16} />
                        {submission.teacher?.full_name || submission.teacher?.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar size={16} />
                        {new Date(submission.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <a
                    href={submission.google_doc_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    View Document
                    <ExternalLink size={16} />
                  </a>
                </div>

                {/* Duplicate Warnings */}
                {topDuplicates.length > 0 && (
                  <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <h4 className="text-sm font-medium text-yellow-800 mb-2">
                      Potential Duplicates Detected
                    </h4>
                    <ul className="space-y-1">
                      {topDuplicates.map((dup) => (
                        <li key={dup.lesson_id} className="text-sm text-yellow-700">
                          • "{dup.lesson.title}" - {Math.round(dup.combined_score * 100)}% match
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Content Preview */}
                {submission.extracted_content && (
                  <div className="mb-4 bg-gray-50 rounded-md p-4">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Content Preview</h4>
                    <p className="text-sm text-gray-600 line-clamp-3">
                      {submission.extracted_content}
                    </p>
                  </div>
                )}

                {/* Review Notes */}
                {submission.review_notes && (
                  <div className="mb-4 bg-blue-50 rounded-md p-4">
                    <h4 className="text-sm font-medium text-blue-700 mb-1">Review Notes</h4>
                    <p className="text-sm text-blue-600">{submission.review_notes}</p>
                  </div>
                )}

                {/* Action Buttons */}
                {submission.status === 'submitted' && (
                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={() => navigate(`/review/${submission.id}`)}
                      className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
                    >
                      Review & Tag
                    </button>
                    <button
                      onClick={() =>
                        updateSubmissionStatus(submission.id, 'rejected', 'Duplicate content')
                      }
                      className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors"
                    >
                      Quick Reject
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
