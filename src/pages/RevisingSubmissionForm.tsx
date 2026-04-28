import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ChevronLeft, AlertCircle, CheckCircle2, Loader2, FileText } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { parseDbError } from '@/utils/errorHandling';
import { AuthModal } from '@/components/Auth/AuthModal';
import {
  IntButton,
  IntFormField,
  IntPageHeader,
  IntStatusBadge,
  type IntStatus,
} from '@/components/Internal';
import { LessonSearchPicker, type LessonSearchResult } from '@/components/LessonSearchPicker';
import { User } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

const SUBMISSION_STATUS_TO_BADGE: Record<string, IntStatus> = {
  submitted: 'submitted',
  in_review: 'review',
  needs_revision: 'revision',
  approved: 'approved',
};

export function RevisingSubmissionForm() {
  const navigate = useNavigate();
  const [selectedLesson, setSelectedLesson] = useState<LessonSearchResult | null>(null);
  const [cantFind, setCantFind] = useState(false);
  const [googleDocUrl, setGoogleDocUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<{
    submissionId: string;
    extractedTitle: string;
    status: string;
    targetTitle: string | null;
  } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const pendingSubmitRef = useRef(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && pendingSubmitRef.current) {
      pendingSubmitRef.current = false;
      formRef.current?.requestSubmit();
    }
  }, [user]);

  const targetReady = Boolean(selectedLesson) || cantFind;
  const canSubmit =
    targetReady && /\/document\/d\/([a-zA-Z0-9-_]+)/.test(googleDocUrl) && !isSubmitting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      pendingSubmitRef.current = true;
      setShowAuthModal(true);
      return;
    }
    if (!targetReady) {
      setError('Pick a lesson or use the "can\'t find it" option first.');
      return;
    }
    if (!/\/document\/d\/([a-zA-Z0-9-_]+)/.test(googleDocUrl)) {
      setError('Please paste a valid Google Doc URL.');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const { data: response, error: invokeError } = await supabase.functions.invoke(
        'process-submission',
        {
          body: {
            googleDocUrl,
            submissionType: 'update',
            originalLessonId: selectedLesson?.lesson_id ?? null,
          },
        }
      );
      if (invokeError) throw invokeError;
      if (!response?.success) throw new Error(response?.error ?? 'Submission failed.');
      const payload = response.data;
      setSubmissionResult({
        submissionId: payload.submissionId,
        extractedTitle: payload.extractedTitle,
        status: payload.status,
        targetTitle: selectedLesson?.title ?? null,
      });
    } catch (err) {
      logger.debug('RevisingSubmissionForm submit failed:', err);
      setError(parseDbError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submissionResult) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="p-6 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 className="text-green-600 mb-2" size={32} />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Submitted!</h2>
          <div className="text-gray-700 mb-4">
            <FileText size={16} className="inline mr-1" />
            <strong>{submissionResult.extractedTitle}</strong>
          </div>
          <IntStatusBadge
            status={SUBMISSION_STATUS_TO_BADGE[submissionResult.status] ?? 'submitted'}
          />
          <p className="mt-4 text-sm text-gray-700">
            {submissionResult.targetTitle ? (
              <>
                We'll merge this into <strong>"{submissionResult.targetTitle}"</strong> once a
                reviewer approves.
              </>
            ) : (
              <>
                A reviewer will identify which lesson this updates and either merge or publish as
                new.
              </>
            )}
          </p>
          <div className="mt-4 text-xs text-gray-500">
            Submission ID: {submissionResult.submissionId}
          </div>
          <IntButton variant="primary" onClick={() => navigate('/')} className="mt-6">
            Back to library
          </IntButton>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <Link
        to="/submit"
        className="text-sm text-gray-600 hover:text-gray-900 inline-flex items-center mb-4"
      >
        <ChevronLeft size={14} className="mr-1" />
        Updating a lesson · Change
      </Link>
      <IntPageHeader title="Update an existing lesson" />

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-2">
            Step 1 · Find the lesson you're revising
          </label>
          {cantFind && !selectedLesson ? (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center justify-between">
              <span className="text-sm text-amber-900">
                A reviewer will identify which lesson this updates.
              </span>
              <button
                type="button"
                onClick={() => setCantFind(false)}
                className="text-sm text-amber-800 underline hover:text-amber-900"
              >
                Try search again
              </button>
            </div>
          ) : (
            <LessonSearchPicker
              selected={selectedLesson}
              onSelect={(l) => {
                setSelectedLesson(l);
                setCantFind(false);
              }}
              onClear={() => setSelectedLesson(null)}
              cantFindOption
              onCantFind={() => setCantFind(true)}
            />
          )}
        </div>

        <div className={targetReady ? '' : 'opacity-50 pointer-events-none'}>
          <IntFormField label="Step 2 · Paste your Google Doc link" required>
            <input
              type="url"
              className="adm-input"
              value={googleDocUrl}
              onChange={(e) => setGoogleDocUrl(e.target.value)}
              placeholder="https://docs.google.com/document/d/..."
              disabled={!targetReady}
              required
            />
          </IntFormField>
        </div>

        {error && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex items-start"
          >
            <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <IntButton type="submit" variant="primary" disabled={!canSubmit}>
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin mr-2 inline" />
              Submitting…
            </>
          ) : selectedLesson ? (
            <>Submit as a revision of {selectedLesson.title}</>
          ) : (
            <>Submit for reviewer to match</>
          )}
        </IntButton>
        <p className="text-xs text-gray-500">
          {selectedLesson
            ? 'A reviewer will replace the published lesson with this content.'
            : 'A reviewer will identify which lesson this updates.'}
        </p>
      </form>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          pendingSubmitRef.current = false;
        }}
        onSuccess={() => setShowAuthModal(false)}
      />
    </div>
  );
}
