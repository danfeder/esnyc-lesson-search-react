import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { parseDbError } from '@/utils/errorHandling';
import { AlertCircle, CheckCircle2, Loader2, FileText, AlertTriangle } from 'lucide-react';
import { AuthModal } from '@/components/Auth/AuthModal';
import { User } from '@supabase/supabase-js';
import { IntButton, IntFormField, IntPageHeader, IntStatusBadge } from '@/components/Internal';

export function SubmissionPage() {
  const navigate = useNavigate();
  const [googleDocUrl, setGoogleDocUrl] = useState('');
  const [submissionType, setSubmissionType] = useState<'new' | 'update'>('new');
  const [originalLessonId, setOriginalLessonId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    submissionId: string;
    extractedTitle: string;
    status: string;
    duplicatesFound: number;
    topDuplicates?: Array<{ title: string; similarityScore: number; matchType: string }>;
  } | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

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

    const docIdMatch = googleDocUrl.match(/\/document\/d\/([a-zA-Z0-9-_]+)/);
    if (!docIdMatch) {
      setError('Please enter a valid Google Docs URL');
      return;
    }

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
      setError(parseDbError(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const headerActions = user ? (
    <span className="adm-status adm-status--active" title={user.email ?? undefined}>
      Signed in
    </span>
  ) : null;

  return (
    <div className="int-shell-root">
      <div className="adm-page adm-page--narrow">
        <IntPageHeader
          title="Submit a lesson"
          description="Share a lesson plan with the ESYNYC community by submitting its Google Doc link. Our reviewers will check it for duplicates and metadata before publishing."
          actions={headerActions}
        />

        {!success ? (
          <form onSubmit={handleSubmit} className="adm-card">
            <IntFormField
              label="Google Doc URL"
              required
              hint="Make sure your document is shared with “Anyone with the link can view”."
            >
              <input
                type="url"
                className="adm-input"
                value={googleDocUrl}
                onChange={(e) => setGoogleDocUrl(e.target.value)}
                placeholder="https://docs.google.com/document/d/…"
                required
              />
            </IntFormField>

            <div className="adm-field">
              <span className="adm-label">Submission Type</span>
              <div className="adm-radio-group">
                <label className="adm-radio">
                  <input
                    type="radio"
                    value="new"
                    checked={submissionType === 'new'}
                    onChange={(e) => setSubmissionType(e.target.value as 'new')}
                  />
                  <span>New lesson plan</span>
                </label>
                <label className="adm-radio">
                  <input
                    type="radio"
                    value="update"
                    checked={submissionType === 'update'}
                    onChange={(e) => setSubmissionType(e.target.value as 'update')}
                  />
                  <span>Update to an existing lesson</span>
                </label>
              </div>
            </div>

            {submissionType === 'update' && (
              <IntFormField
                label="Original Lesson ID"
                required
                hint="Find this on the lesson detail page in the library."
              >
                <input
                  type="text"
                  className="adm-input adm-input-code"
                  value={originalLessonId}
                  onChange={(e) => setOriginalLessonId(e.target.value)}
                  placeholder="e.g. 8f3c-…"
                  required={submissionType === 'update'}
                />
              </IntFormField>
            )}

            {error && (
              <div className="adm-card adm-card--tight" style={{ borderColor: 'var(--esy-red)' }}>
                <p
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 8,
                    color: 'var(--esy-red)',
                    margin: 0,
                  }}
                >
                  <AlertCircle
                    size={16}
                    style={{ flexShrink: 0, marginTop: 2 }}
                    aria-hidden="true"
                  />
                  <span>{error}</span>
                </p>
              </div>
            )}

            <div style={{ marginTop: 8 }}>
              <IntButton
                type="submit"
                variant="primary"
                size="lg"
                disabled={isSubmitting}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin" size={14} aria-hidden="true" />
                    Processing submission…
                  </>
                ) : (
                  'Submit lesson plan'
                )}
              </IntButton>
            </div>
          </form>
        ) : (
          <div>
            <div
              className="adm-card adm-card--tight"
              style={{ borderColor: 'var(--esy-green)', marginBottom: 16 }}
            >
              <p
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  color: 'var(--esy-green-deep)',
                  margin: 0,
                  fontWeight: 500,
                }}
              >
                <CheckCircle2
                  size={16}
                  style={{ flexShrink: 0, marginTop: 2 }}
                  aria-hidden="true"
                />
                <span>Submission received. Your lesson plan is now under review.</span>
              </p>
            </div>

            {submissionResult && (
              <div className="adm-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <FileText size={16} aria-hidden="true" style={{ color: 'var(--esy-ink-70)' }} />
                  <h3 className="adm-section-eyebrow" style={{ margin: 0 }}>
                    Submission Details
                  </h3>
                </div>

                <dl
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    columnGap: 16,
                    rowGap: 6,
                    fontSize: 13,
                    margin: 0,
                  }}
                >
                  <dt style={{ color: 'var(--esy-ink-70)' }}>Submission ID</dt>
                  <dd style={{ margin: 0 }}>
                    <code
                      style={{
                        background: 'var(--esy-paper-alt)',
                        padding: '2px 6px',
                        borderRadius: 3,
                        fontFamily: 'SF Mono, Consolas, ui-monospace, monospace',
                        fontSize: 12,
                      }}
                    >
                      {submissionResult.submissionId}
                    </code>
                  </dd>
                  <dt style={{ color: 'var(--esy-ink-70)' }}>Extracted title</dt>
                  <dd style={{ margin: 0 }}>{submissionResult.extractedTitle}</dd>
                  <dt style={{ color: 'var(--esy-ink-70)' }}>Status</dt>
                  <dd style={{ margin: 0 }}>
                    <IntStatusBadge status="submitted">{submissionResult.status}</IntStatusBadge>
                  </dd>
                </dl>

                {submissionResult.duplicatesFound > 0 && (
                  <div
                    style={{
                      marginTop: 16,
                      paddingTop: 16,
                      borderTop: '1px solid var(--esy-ink-10)',
                    }}
                  >
                    <p
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 8,
                        margin: 0,
                        color: 'var(--esy-orange-revision)',
                        fontSize: 13,
                        fontWeight: 500,
                      }}
                    >
                      <AlertTriangle
                        size={16}
                        style={{ flexShrink: 0, marginTop: 2 }}
                        aria-hidden="true"
                      />
                      <span>
                        {submissionResult.duplicatesFound} potential duplicate
                        {submissionResult.duplicatesFound > 1 ? 's' : ''} found — the reviewer will
                        compare these matches.
                      </span>
                    </p>

                    {submissionResult.topDuplicates &&
                      submissionResult.topDuplicates.length > 0 && (
                        <ul
                          style={{
                            listStyle: 'none',
                            padding: 0,
                            margin: '12px 0 0',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 6,
                          }}
                        >
                          {submissionResult.topDuplicates.map((dup, idx) => (
                            <li
                              key={idx}
                              style={{
                                border: '1px solid var(--esy-ink-10)',
                                borderRadius: 4,
                                padding: '8px 10px',
                                fontSize: 13,
                              }}
                            >
                              <div style={{ fontWeight: 500 }}>{dup.title}</div>
                              <div
                                style={{ color: 'var(--esy-ink-70)', fontSize: 12, marginTop: 2 }}
                              >
                                {Math.round(dup.similarityScore * 100)}% match · {dup.matchType}
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <IntButton
                onClick={() => {
                  setSuccess(false);
                  setGoogleDocUrl('');
                  setSubmissionResult(null);
                }}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Submit another lesson
              </IntButton>
              <IntButton
                variant="primary"
                onClick={() => navigate('/')}
                style={{ flex: 1, justifyContent: 'center' }}
              >
                Back to library
              </IntButton>
            </div>
          </div>
        )}

        <div className="adm-card" style={{ marginTop: 24 }}>
          <h2 className="adm-section-eyebrow">Submission Guidelines</h2>
          <ul
            style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              fontSize: 13,
              color: 'var(--esy-ink-70)',
            }}
          >
            <li>· Format your Google Doc with clear sections.</li>
            <li>· Include grade levels, objectives, and materials needed.</li>
            <li>· Add step-by-step instructions for activities.</li>
            <li>· Submissions are reviewed within 2–3 business days.</li>
            <li>· You'll receive an email once your lesson is approved.</li>
          </ul>
        </div>
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={() => {
          setShowAuthModal(false);
          if (googleDocUrl) {
            handleSubmit({ preventDefault: () => {} } as React.FormEvent);
          }
        }}
      />
    </div>
  );
}
