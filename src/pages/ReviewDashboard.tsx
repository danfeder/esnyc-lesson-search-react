import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
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
import { logger } from '@/utils/logger';

interface Similarity {
  lesson_id: string;
  combined_score: number;
  match_type: 'exact' | 'high' | 'medium' | 'low';
  title_similarity: number;
  content_similarity: number;
  metadata_overlap_score: number;
}

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
  similarities?: Similarity[];
  extractedTitle?: string; // Added for memoized title
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

// Helper function to parse extracted content
function parseExtractedContent(content: string): string {
  // Remove leading dashes and clean up the content
  const cleanedContent = content.replace(/^---+\s*/m, '').trim();

  // Split into lines and filter out empty ones
  const lines = cleanedContent.split('\n').filter((line) => line.trim() && line.trim() !== '---');

  let title = '';

  // The first non-empty line after removing --- is usually the title
  if (lines.length > 0) {
    title = lines[0].trim();

    // Remove Unicode control characters (vertical tab \u000b and C0 controls \u0000-\u001f)
    // These are non-printable characters that may cause display issues
    // eslint-disable-next-line no-control-regex
    title = title.replace(/[\u000b\u0000-\u001f]/g, '').trim();
  }

  return title;
}

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      logger.error('Error fetching user profile:', error);
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

      // Fetch teacher information and similarities in parallel
      if (data && data.length > 0) {
        const submissionIds = data.map((s) => s.id);
        const teacherIds = [...new Set(data.map((s) => s.teacher_id))];

        // Parallel fetch of profiles and similarities
        const [profilesResult, similaritiesResult] = await Promise.all([
          supabase.from('user_profiles').select('id, full_name').in('id', teacherIds),
          supabase
            .from('submission_similarities')
            .select(
              'submission_id, lesson_id, combined_score, match_type, title_similarity, content_similarity, metadata_overlap_score'
            )
            .in('submission_id', submissionIds)
            .order('combined_score', { ascending: false }),
        ]);

        const profiles = profilesResult.data;
        const allSimilarities = similaritiesResult.data || [];

        // Group similarities by submission_id, filtering out nulls
        const similaritiesBySubmission = allSimilarities.reduce(
          (acc, sim) => {
            // Only include if all required fields are non-null
            if (
              sim.combined_score !== null &&
              sim.match_type !== null &&
              sim.title_similarity !== null &&
              sim.content_similarity !== null &&
              sim.metadata_overlap_score !== null
            ) {
              if (!acc[sim.submission_id]) {
                acc[sim.submission_id] = [];
              }
              acc[sim.submission_id].push({
                lesson_id: sim.lesson_id,
                combined_score: sim.combined_score,
                match_type: sim.match_type as 'exact' | 'high' | 'medium' | 'low',
                title_similarity: sim.title_similarity,
                content_similarity: sim.content_similarity,
                metadata_overlap_score: sim.metadata_overlap_score,
              });
            }
            return acc;
          },
          {} as Record<string, Similarity[]>
        );

        // Map teacher info and similarities to submissions
        const submissionsWithDetails = data.map((submission) => {
          const profile = profiles?.find((p) => p.id === submission.teacher_id);
          const similarities = similaritiesBySubmission[submission.id] || [];

          return {
            ...submission,
            created_at: submission.created_at || '',
            updated_at: submission.updated_at || '',
            submission_type: (submission.submission_type || 'new') as 'new' | 'update',
            original_lesson_id: submission.original_lesson_id || undefined,
            status: (submission.status || 'submitted') as
              | 'submitted'
              | 'under_review'
              | 'approved'
              | 'rejected'
              | 'needs_revision',
            extracted_content: submission.extracted_content || undefined,
            teacher: {
              email: 'teacher@example.com', // We'll use a placeholder for now
              full_name: profile?.full_name || 'Unknown Teacher',
            },
            similarities: similarities,
          };
        });

        setSubmissions(submissionsWithDetails);
      } else {
        setSubmissions(
          (data || []).map((submission) => ({
            ...submission,
            created_at: submission.created_at || '',
            updated_at: submission.updated_at || '',
            submission_type: (submission.submission_type || 'new') as 'new' | 'update',
            original_lesson_id: submission.original_lesson_id || undefined,
            status: (submission.status || 'submitted') as
              | 'submitted'
              | 'under_review'
              | 'approved'
              | 'rejected'
              | 'needs_revision',
            extracted_content: submission.extracted_content || undefined,
            similarities: [],
          }))
        );
      }
    } catch (error) {
      logger.error('Error loading submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSubmissionStatus = async (id: string, status: string, notes?: string) => {
    try {
      const updates: {
        status: string;
        review_notes?: string;
        reviewed_at: string;
        reviewed_by?: string;
      } = {
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
      logger.error('Error updating submission:', error);
    }
  };

  // Get lesson titles for similarity matches
  const [lessonTitles, setLessonTitles] = useState<Record<string, string>>({});
  const [showLowMatches, setShowLowMatches] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Fetch lesson titles for all similarities
    const fetchLessonTitles = async () => {
      const allLessonIds = new Set<string>();
      submissions.forEach((sub) => {
        sub.similarities?.forEach((sim) => {
          allLessonIds.add(sim.lesson_id);
        });
      });

      if (allLessonIds.size > 0) {
        const { data: lessons } = await supabase
          .from('lessons')
          .select('lesson_id, title')
          .in('lesson_id', Array.from(allLessonIds));

        if (lessons) {
          const titles = lessons.reduce(
            (acc, lesson) => {
              acc[lesson.lesson_id] = lesson.title;
              return acc;
            },
            {} as Record<string, string>
          );
          setLessonTitles(titles);
        }
      }
    };

    if (submissions.length > 0) {
      fetchLessonTitles();
    }
  }, [submissions]);

  // Filter similarities to show only high-quality matches by default
  const getFilteredSimilarities = (
    similarities: Similarity[] | undefined,
    submissionId: string
  ) => {
    if (!similarities || similarities.length === 0) return { visible: [], hidden: [] };

    const highQuality = similarities.filter(
      (s) => s.match_type === 'exact' || s.match_type === 'high' || s.match_type === 'medium'
    );
    const lowQuality = similarities.filter((s) => s.match_type === 'low');

    // If showing low matches for this submission, include them
    const visible = showLowMatches[submissionId] ? similarities : highQuality;

    return {
      visible: visible.slice(0, 5), // Show max 5 matches
      hidden: lowQuality,
      hasMore: visible.length > 5,
      totalCount: similarities.length,
    };
  };

  // Optimize title extraction with useMemo to avoid recalculating on every render
  const submissionsWithTitles = useMemo(
    () =>
      submissions.map((submission) => ({
        ...submission,
        extractedTitle:
          parseExtractedContent(submission.extracted_content || '') || 'Untitled Submission',
      })),
    [submissions]
  );

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
                    ({submissionsWithTitles.filter((s) => s.status === status).length})
                  </span>
                )}
              </button>
            )
          )}
        </nav>
      </div>

      {/* Submissions List */}
      <div className="space-y-4">
        {submissionsWithTitles.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <FileText className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-600">No submissions found</p>
          </div>
        ) : (
          submissionsWithTitles.map((submission) => {
            const StatusIcon = statusIcons[submission.status];
            const {
              visible: visibleDuplicates,
              hidden: hiddenDuplicates,
              hasMore,
            } = getFilteredSimilarities(submission.similarities, submission.id);

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
                        role="status"
                        aria-label={`Submission status: ${submission.status.replace('_', ' ')}`}
                      >
                        <StatusIcon size={16} />
                        {submission.status.replace('_', ' ')}
                      </span>
                      <span className="text-sm text-gray-500">
                        {submission.submission_type === 'new' ? 'New Lesson' : 'Update'}
                      </span>
                    </div>

                    {/* Display lesson title with accessibility */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        <span aria-label={`Lesson title: ${submission.extractedTitle}`}>
                          {submission.extractedTitle}
                        </span>
                      </h3>
                      <p
                        className="text-sm text-gray-500"
                        aria-label={`Submission ID: ${submission.id.slice(0, 8)}`}
                      >
                        Submission ID: {submission.id.slice(0, 8)}
                      </p>
                    </div>

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

                {/* Duplicate Warnings with Smart Filtering */}
                {visibleDuplicates.length > 0 && (
                  <div className="mb-4 bg-yellow-50 border border-yellow-200 rounded-md p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-medium text-yellow-800">
                        Potential Duplicates Detected
                      </h4>
                      {hiddenDuplicates.length > 0 && (
                        <button
                          onClick={() =>
                            setShowLowMatches((prev) => ({
                              ...prev,
                              [submission.id]: !prev[submission.id],
                            }))
                          }
                          className="text-xs text-yellow-600 hover:text-yellow-700 underline"
                        >
                          {showLowMatches[submission.id]
                            ? `Hide ${hiddenDuplicates.length} low matches`
                            : `Show ${hiddenDuplicates.length} more low-quality matches`}
                        </button>
                      )}
                    </div>
                    <ul className="space-y-2">
                      {visibleDuplicates.map((dup) => {
                        const matchColor = {
                          exact: 'text-red-700 font-semibold',
                          high: 'text-orange-700',
                          medium: 'text-yellow-700',
                          low: 'text-yellow-600 opacity-75',
                        }[dup.match_type];

                        return (
                          <li key={dup.lesson_id} className="text-sm">
                            <div className="flex items-start gap-2">
                              <span className={`${matchColor} uppercase text-xs mt-0.5`}>
                                [{dup.match_type}]
                              </span>
                              <div className="flex-1">
                                <span className="text-yellow-800">
                                  "{lessonTitles[dup.lesson_id] || 'Loading...'}"
                                </span>
                                <div className="text-xs text-yellow-600 mt-1">
                                  Score: {Math.round(dup.combined_score * 100)}% (Title:{' '}
                                  {Math.round(dup.title_similarity * 100)}%, Content:{' '}
                                  {Math.round(dup.content_similarity * 100)}%, Metadata:{' '}
                                  {Math.round(dup.metadata_overlap_score * 100)}%)
                                </div>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                    {hasMore && (
                      <p className="text-xs text-yellow-600 mt-2 italic">
                        Showing top 5 matches only
                      </p>
                    )}
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
