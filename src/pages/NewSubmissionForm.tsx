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
import { User } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';

const SUBMISSION_STATUS_TO_BADGE: Record<string, IntStatus> = {
  submitted: 'submitted',
  in_review: 'review',
  needs_revision: 'revision',
  approved: 'approved',
};

export function NewSubmissionForm() {
  const navigate = useNavigate();
  const [googleDocUrl, setGoogleDocUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<{
    submissionId: string;
    extractedTitle: string;
    status: string;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      pendingSubmitRef.current = true;
      setShowAuthModal(true);
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
          body: { googleDocUrl, submissionType: 'new', originalLessonId: null },
        }
      );
      if (invokeError) throw invokeError;
      if (!response?.success) throw new Error(response?.error ?? 'Submission failed.');
      const payload = response.data;
      setSubmissionResult({
        submissionId: payload.submissionId,
        extractedTitle: payload.extractedTitle,
        status: payload.status,
      });
    } catch (err) {
      logger.debug('NewSubmissionForm submit failed:', err);
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
          <p className="mt-4 text-sm text-gray-700">We'll publish this once a reviewer approves.</p>
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
        Adding a new lesson · Change
      </Link>
      <IntPageHeader title="Add a new lesson" />

      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <IntFormField
          label="Google Doc URL"
          required
          hint="Before you submit, share your doc so we can read it: in Google Docs, click Share → “Anyone with the link” (Viewer)."
        >
          <input
            type="url"
            value={googleDocUrl}
            onChange={(e) => setGoogleDocUrl(e.target.value)}
            placeholder="https://docs.google.com/document/d/..."
            required
            className="adm-input"
          />
        </IntFormField>
        {error && (
          <div
            role="alert"
            className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800 flex items-start"
          >
            <AlertCircle size={16} className="mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <IntButton type="submit" variant="primary" disabled={isSubmitting || !googleDocUrl}>
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin mr-2 inline" />
              Submitting…
            </>
          ) : (
            'Submit'
          )}
        </IntButton>
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
