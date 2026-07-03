import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';
import { sanitizeContent } from '@/utils/sanitize';
import {
  IntEmptyState,
  IntFetchError,
  IntPageHeader,
  IntQueueRow,
  IntTabs,
  type IntTab,
} from '@/components/Internal';
import { STATUS_TO_BADGE, type SubmissionStatus } from '@/utils/submissionStatus';

interface Similarity {
  lesson_id: string;
  combined_score: number;
  match_type: 'exact' | 'high' | 'medium' | 'low';
}

interface Submission {
  id: string;
  created_at: string;
  teacher_id: string;
  google_doc_url: string;
  google_doc_id: string;
  submission_type: 'new' | 'update';
  original_lesson_id?: string;
  status: SubmissionStatus;
  extracted_content?: string;
  extracted_title?: string;
  review_notes?: string;
  teacher?: { full_name?: string };
  similarities?: Similarity[];
  extractedTitle?: string;
  originalLessonTitle?: string | null;
}

const FILTER_KEYS = ['all', 'submitted', 'in_review', 'needs_revision', 'approved'] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

// Decision-outcome confirmation carried here from ReviewDetail via navigation
// state (the app's existing toast pattern — see AdminInviteUser/AdminInvitations).
interface Toast {
  kind: 'success' | 'error';
  msg: string;
}

const FILTER_LABELS: Record<FilterKey, string> = {
  all: 'All',
  submitted: 'Pending',
  in_review: 'In review',
  needs_revision: 'Revision',
  approved: 'Approved',
};

function parseExtractedContent(content: string): string {
  const cleaned = content.replace(/^---+\s*/m, '').trim();
  const lines = cleaned.split('\n').filter((line) => line.trim() && line.trim() !== '---');
  if (lines.length === 0) return '';
  const first = lines[0].trim();
  // Strip non-printable control chars that creep in from doc extraction.
  // eslint-disable-next-line no-control-regex
  return first.replace(/[\u000b\u0000-\u001f]/g, '').trim();
}

export function ReviewDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [isReviewer, setIsReviewer] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  // Honest-error state (FP-05/FP-07): a failed fetch must never render as
  // "No submissions" / "Access denied" — those are reserved for successful
  // fetches that genuinely returned empty / non-reviewer.
  const [loadError, setLoadError] = useState(false);
  const [authCheckError, setAuthCheckError] = useState(false);

  // Pick up any decision toast handed over by ReviewDetail on save, then clear
  // the history state so a refresh doesn't replay it (mirrors AdminInvitations).
  useEffect(() => {
    const incoming = (location.state as { toast?: Toast } | null)?.toast;
    if (incoming) {
      setToast(incoming);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate]);

  // Auto-dismiss the toast (also mirrors AdminInvitations) — otherwise the
  // fixed-position banner would sit on screen for the rest of the session while
  // the reviewer keeps working the queue.
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(t);
  }, [toast]);

  // Component-scope so the auth-error Retry button can re-run the whole page
  // load, not just the submissions fetch.
  const loadPage = async () => {
    const ok = await checkAuth();
    if (ok) await loadSubmissions();
  };

  useEffect(() => {
    // Run sequentially: only fetch submissions after the auth/role check
    // confirms reviewer access. Otherwise a non-reviewer briefly issues a
    // submissions read while waiting for the redirect.
    loadPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const checkAuth = async (): Promise<boolean> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      navigate('/');
      return false;
    }
    setUser(user);

    const { data: profile, error } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error || !profile) {
      // Transient fetch failure — NOT a permissions verdict. Leave isReviewer
      // untouched; the authCheckError render branch preempts "Access denied".
      logger.error('Error fetching user profile:', error);
      setAuthCheckError(true);
      return false;
    }
    setAuthCheckError(false);

    const ok = ['reviewer', 'admin', 'super_admin'].includes(profile.role ?? '');
    setIsReviewer(ok);
    if (!ok) navigate('/');
    return ok;
  };

  const loadSubmissions = async () => {
    setLoading(true);
    setLoadError(false);
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

      if (!data || data.length === 0) {
        setSubmissions([]);
        return;
      }

      const submissionIds = data.map((s) => s.id);
      const teacherIds = [...new Set(data.map((s) => s.teacher_id))].filter(Boolean) as string[];
      const targetLessonIds = [
        ...new Set(data.map((s) => s.original_lesson_id).filter(Boolean)),
      ] as string[];

      const [profilesResult, similaritiesResult, lessonsResult] = await Promise.all([
        teacherIds.length
          ? supabase.from('user_profiles').select('id, full_name').in('id', teacherIds)
          : Promise.resolve({ data: [] }),
        supabase
          .from('submission_similarities')
          .select('submission_id, lesson_id, combined_score, match_type')
          .in('submission_id', submissionIds)
          .order('combined_score', { ascending: false }),
        targetLessonIds.length
          ? supabase.from('lessons').select('lesson_id, title').in('lesson_id', targetLessonIds)
          : Promise.resolve({ data: [], error: null }),
      ]);

      const profiles = profilesResult.data ?? [];
      const allSimilarities = similaritiesResult.data ?? [];
      // Surface lessonsResult errors — silent failure here makes every UPDATE
      // row in the queue render as the amber UPDATE? badge with no log signal.
      // (profilesResult/similaritiesResult swallow errors the same way; tracked
      // as a separate pre-existing follow-up.)
      if (lessonsResult.error) {
        logger.error('Failed to fetch lesson titles for queue badges:', lessonsResult.error);
      }
      const lessonTitleMap: Record<string, string> = (lessonsResult.data ?? []).reduce(
        (acc, l) => {
          if (l.lesson_id && l.title) acc[l.lesson_id] = l.title;
          return acc;
        },
        {} as Record<string, string>
      );

      const similaritiesBySubmission = allSimilarities.reduce(
        (acc, sim) => {
          if (sim.combined_score === null || sim.match_type === null) return acc;
          if (!acc[sim.submission_id]) acc[sim.submission_id] = [];
          acc[sim.submission_id].push({
            lesson_id: sim.lesson_id,
            combined_score: sim.combined_score,
            match_type: sim.match_type as Similarity['match_type'],
          });
          return acc;
        },
        {} as Record<string, Similarity[]>
      );

      setSubmissions(
        data.map((submission) => {
          const profile = profiles.find((p) => p.id === submission.teacher_id);
          return {
            ...submission,
            created_at: submission.created_at || '',
            submission_type: (submission.submission_type || 'new') as 'new' | 'update',
            original_lesson_id: submission.original_lesson_id || undefined,
            status: (submission.status || 'submitted') as SubmissionStatus,
            extracted_content: submission.extracted_content || undefined,
            extracted_title: submission.extracted_title || undefined,
            teacher: { full_name: profile?.full_name || 'Unknown teacher' },
            similarities: similaritiesBySubmission[submission.id] ?? [],
            originalLessonTitle: submission.original_lesson_id
              ? (lessonTitleMap[submission.original_lesson_id] ?? null)
              : null,
          };
        })
      );
    } catch (err) {
      logger.error('Error loading submissions:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  };

  const submissionsWithTitles = useMemo(
    () =>
      submissions.map((submission) => ({
        ...submission,
        // Prefer the real extracted_title; fall back to the doc's first line
        // (why cards used to read "Grade Levels: 5, 6, 7"), then a placeholder.
        extractedTitle: sanitizeContent(
          submission.extracted_title?.trim() ||
            parseExtractedContent(submission.extracted_content || '') ||
            'Untitled submission'
        ),
      })),
    [submissions]
  );

  // Per-tab counts derived from a separate aggregate query would be ideal; for
  // now we count what's in memory under "all" so the badges aren't misleading
  // when a status filter is active.
  const counts = useMemo(() => {
    if (filter !== 'all') return undefined;
    const c: Partial<Record<FilterKey, number>> = { all: submissionsWithTitles.length };
    for (const s of submissionsWithTitles) {
      const key = s.status as FilterKey;
      c[key] = (c[key] ?? 0) + 1;
    }
    return c;
  }, [submissionsWithTitles, filter]);

  const tabs: IntTab[] = FILTER_KEYS.map((key) => ({
    key,
    label: FILTER_LABELS[key],
    count: counts?.[key],
  }));

  if (!isReviewer && !user) {
    return null; // Auth check redirects; nothing to show in the meantime.
  }

  // Role check failed to FETCH (transient error) — this is not a permissions
  // verdict, so never show "Access denied" here. Genuinely denied roles are
  // handled below after a successful fetch.
  if (authCheckError) {
    return (
      <div className="int-shell-root">
        <div className="adm-page adm-page--narrow">
          <IntPageHeader
            title="Review queue"
            description="Pending and recent lesson submissions awaiting reviewer action."
          />
          <IntFetchError onRetry={loadPage}>
            Couldn&apos;t check your access — this is usually a connection blip, not a permissions
            problem. Retry to load the queue.
          </IntFetchError>
        </div>
      </div>
    );
  }

  if (!isReviewer) {
    return (
      <div className="int-shell-root">
        <div className="adm-page adm-page--narrow">
          <IntPageHeader
            title="Access denied"
            description="You don't have permission to access the review dashboard."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="int-shell-root">
      <div className="adm-page">
        <IntPageHeader
          title="Review queue"
          description="Pending and recent lesson submissions awaiting reviewer action."
        />

        <IntTabs
          tabs={tabs}
          activeKey={filter}
          onChange={(k) => setFilter(k as FilterKey)}
          ariaLabel="Filter by status"
        />

        <div className="adm-card" style={{ marginTop: 16, padding: 0, overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: 'var(--esy-ink-70)' }}>
              Loading submissions…
            </div>
          ) : loadError ? (
            <div style={{ padding: 24 }}>
              <IntFetchError onRetry={loadSubmissions}>
                Couldn&apos;t load the review queue. Check your connection and retry — submissions
                may be waiting even though the list is empty.
              </IntFetchError>
            </div>
          ) : submissionsWithTitles.length === 0 ? (
            <div style={{ padding: 24 }}>
              <IntEmptyState
                title="No submissions"
                hint="Nothing matches this filter right now. Try another tab."
              />
            </div>
          ) : (
            submissionsWithTitles.map((submission) => (
              <IntQueueRow
                key={submission.id}
                submission={{
                  id: submission.id,
                  title: submission.extractedTitle ?? 'Untitled submission',
                  author: submission.teacher?.full_name ?? 'Unknown teacher',
                  status: STATUS_TO_BADGE[submission.status],
                  submittedAt: submission.created_at,
                  type: submission.submission_type,
                  originalLessonId: submission.original_lesson_id ?? null,
                  originalLessonTitle: submission.originalLessonTitle ?? null,
                  duplicateCount: submission.similarities?.length ?? 0,
                  topMatchType: submission.similarities?.[0]?.match_type,
                }}
                onSelect={(id) => navigate(`/review/${id}`)}
              />
            ))
          )}
        </div>

        {toast && (
          <div role="status" aria-live="polite" className={`adm-toast adm-toast--${toast.kind}`}>
            {toast.msg}
          </div>
        )}
      </div>
    </div>
  );
}
