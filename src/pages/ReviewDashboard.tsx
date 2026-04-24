import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import { logger } from '@/utils/logger';
import { sanitizeContent } from '@/utils/sanitize';
import {
  IntEmptyState,
  IntPageHeader,
  IntQueueRow,
  IntTabs,
  type IntStatus,
  type IntTab,
} from '@/components/Internal';

/**
 * DB-backed status enum from the lesson_submissions check constraint:
 * 'submitted' | 'in_review' | 'needs_revision' | 'approved'.
 *
 * The TS Submission type elsewhere drifted to 'under_review' / includes
 * 'rejected' which the DB CHECK rejects — pre-existing inconsistency we're
 * NOT trying to fix in this slice. Use the DB-correct values here so the
 * tab filters actually return rows.
 */
type SubmissionStatus = 'submitted' | 'in_review' | 'needs_revision' | 'approved';

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
  review_notes?: string;
  teacher?: { full_name?: string };
  similarities?: Similarity[];
  extractedTitle?: string;
}

const STATUS_TO_BADGE: Record<SubmissionStatus, IntStatus> = {
  submitted: 'submitted',
  in_review: 'review',
  needs_revision: 'revision',
  approved: 'approved',
};

const FILTER_KEYS = ['all', 'submitted', 'in_review', 'needs_revision', 'approved'] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

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
  const [user, setUser] = useState<User | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [isReviewer, setIsReviewer] = useState(false);

  useEffect(() => {
    // Run sequentially: only fetch submissions after the auth/role check
    // confirms reviewer access. Otherwise a non-reviewer briefly issues a
    // submissions read while waiting for the redirect.
    (async () => {
      const ok = await checkAuth();
      if (ok) await loadSubmissions();
    })();
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
      logger.error('Error fetching user profile:', error);
      setIsReviewer(false);
      return false;
    }

    const ok = ['reviewer', 'admin', 'super_admin'].includes(profile.role ?? '');
    setIsReviewer(ok);
    if (!ok) navigate('/');
    return ok;
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

      if (!data || data.length === 0) {
        setSubmissions([]);
        return;
      }

      const submissionIds = data.map((s) => s.id);
      const teacherIds = [...new Set(data.map((s) => s.teacher_id))].filter(Boolean) as string[];

      const [profilesResult, similaritiesResult] = await Promise.all([
        teacherIds.length
          ? supabase.from('user_profiles').select('id, full_name').in('id', teacherIds)
          : Promise.resolve({ data: [] }),
        supabase
          .from('submission_similarities')
          .select('submission_id, lesson_id, combined_score, match_type')
          .in('submission_id', submissionIds)
          .order('combined_score', { ascending: false }),
      ]);

      const profiles = profilesResult.data ?? [];
      const allSimilarities = similaritiesResult.data ?? [];

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
            teacher: { full_name: profile?.full_name || 'Unknown teacher' },
            similarities: similaritiesBySubmission[submission.id] ?? [],
          };
        })
      );
    } catch (err) {
      logger.error('Error loading submissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const submissionsWithTitles = useMemo(
    () =>
      submissions.map((submission) => ({
        ...submission,
        extractedTitle: sanitizeContent(
          parseExtractedContent(submission.extracted_content || '') || 'Untitled submission'
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
                  duplicateCount: submission.similarities?.length ?? 0,
                  topMatchType: submission.similarities?.[0]?.match_type,
                }}
                onSelect={(id) => navigate(`/review/${id}`)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
