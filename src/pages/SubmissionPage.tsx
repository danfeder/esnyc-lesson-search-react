import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { AlertCircle, CheckCircle2, Loader2, FileText, AlertTriangle } from 'lucide-react';
import { AuthModal } from '../components/Auth/AuthModal';
import { User } from '@supabase/supabase-js';

export function SubmissionPage() {
  const navigate = useNavigate();
  const [googleDocUrl, setGoogleDocUrl] = useState('');
  const [submissionType, setSubmissionType] = useState<'new' | 'update'>('new');
  const [originalLessonId, setOriginalLessonId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check if user is logged in
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setSubmissionResult(null);

    // Validate Google Docs URL
    const docIdMatch = googleDocUrl.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    if (!docIdMatch) {
      setError('Please enter a valid Google Docs URL');
      return;
    }

    // Check if user is authenticated
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await supabase.functions.invoke('process-submission', {
        body: {
          googleDocUrl,
          submissionType,
          originalLessonId: submissionType === 'update' ? originalLessonId : undefined,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const result = response.data;
      if (!result.success) {
        throw new Error(result.error || 'Submission failed');
      }

      setSuccess(true);
      setSubmissionResult(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Submit a Lesson Plan</h1>
            <p className="text-gray-600">
              Share your lesson plan with the ESYNYC community by submitting a Google Doc link.
            </p>
          </div>
          {user && (
            <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded-md">
              Signed in as: <span className="font-medium">{user.email}</span>
            </div>
          )}
        </div>

        {!success ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="docUrl" className="block text-sm font-medium text-gray-700 mb-2">
                Google Doc URL *
              </label>
              <input
                type="url"
                id="docUrl"
                value={googleDocUrl}
                onChange={(e) => setGoogleDocUrl(e.target.value)}
                placeholder="https://docs.google.com/document/d/..."
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                required
              />
              <p className="mt-2 text-sm text-gray-500">
                Make sure your document is shared with "Anyone with the link can view"
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Submission Type
              </label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="new"
                    checked={submissionType === 'new'}
                    onChange={(e) => setSubmissionType(e.target.value as 'new')}
                    className="mr-2 text-green-600"
                  />
                  <span>New lesson plan</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    value="update"
                    checked={submissionType === 'update'}
                    onChange={(e) => setSubmissionType(e.target.value as 'update')}
                    className="mr-2 text-green-600"
                  />
                  <span>Update to existing lesson</span>
                </label>
              </div>
            </div>

            {submissionType === 'update' && (
              <div>
                <label
                  htmlFor="originalLesson"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Original Lesson ID
                </label>
                <input
                  type="text"
                  id="originalLesson"
                  value={originalLessonId}
                  onChange={(e) => setOriginalLessonId(e.target.value)}
                  placeholder="Enter the ID of the lesson you're updating"
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  required={submissionType === 'update'}
                />
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-start">
                <AlertCircle className="text-red-500 mr-2 flex-shrink-0 mt-0.5" size={20} />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={20} />
                    Processing submission...
                  </>
                ) : (
                  'Submit Lesson Plan'
                )}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-start">
              <CheckCircle2 className="text-green-500 mr-2 flex-shrink-0 mt-0.5" size={20} />
              <div>
                <h3 className="font-semibold text-green-800">Submission Received!</h3>
                <p className="text-green-700 mt-1">
                  Your lesson plan has been submitted successfully and is now under review.
                </p>
              </div>
            </div>

            {submissionResult && (
              <div className="bg-gray-50 rounded-md p-6 space-y-4">
                <div className="flex items-center">
                  <FileText className="text-gray-600 mr-2" size={20} />
                  <h4 className="font-semibold text-gray-900">Submission Details</h4>
                </div>

                <div className="space-y-2 text-sm">
                  <p>
                    <span className="font-medium">Submission ID:</span>{' '}
                    <code className="bg-gray-200 px-2 py-1 rounded">
                      {submissionResult.submissionId}
                    </code>
                  </p>
                  <p>
                    <span className="font-medium">Extracted Title:</span>{' '}
                    {submissionResult.extractedTitle}
                  </p>
                  <p>
                    <span className="font-medium">Status:</span>{' '}
                    <span className="text-green-600 font-medium">{submissionResult.status}</span>
                  </p>
                </div>

                {submissionResult.duplicatesFound > 0 && (
                  <div className="mt-4 border-t pt-4">
                    <div className="flex items-start">
                      <AlertTriangle
                        className="text-yellow-600 mr-2 flex-shrink-0 mt-0.5"
                        size={20}
                      />
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">
                          {submissionResult.duplicatesFound} Potential Duplicate
                          {submissionResult.duplicatesFound > 1 ? 's' : ''} Found
                        </h5>
                        <p className="text-sm text-gray-600 mt-1">
                          Our system detected similar lessons in the database. The reviewer will
                          check these matches.
                        </p>

                        {submissionResult.topDuplicates &&
                          submissionResult.topDuplicates.length > 0 && (
                            <div className="mt-3 space-y-2">
                              <p className="text-sm font-medium text-gray-700">Top matches:</p>
                              {submissionResult.topDuplicates.map((dup: any, idx: number) => (
                                <div
                                  key={idx}
                                  className="text-sm bg-white p-2 rounded border border-gray-200"
                                >
                                  <p className="font-medium">{dup.title}</p>
                                  <p className="text-gray-600">
                                    {Math.round(dup.similarityScore * 100)}% match ({dup.matchType})
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-4">
              <button
                onClick={() => {
                  setSuccess(false);
                  setGoogleDocUrl('');
                  setSubmissionResult(null);
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
              >
                Submit Another Lesson
              </button>
              <button
                onClick={() => navigate('/')}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors"
              >
                Back to Search
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 bg-blue-50 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">Submission Guidelines</h2>
        <ul className="space-y-2 text-sm text-blue-800">
          <li>• Ensure your Google Doc is formatted with clear sections</li>
          <li>• Include grade levels, objectives, and materials needed</li>
          <li>• Add step-by-step instructions for activities</li>
          <li>• Your submission will be reviewed within 2-3 business days</li>
          <li>• You'll receive an email once your lesson is approved</li>
        </ul>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          // Re-submit form after successful auth
          if (googleDocUrl) {
            handleSubmit({ preventDefault: () => {} } as React.FormEvent);
          }
        }}
      />
    </div>
  );
}
