import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AlertCircle, Search } from 'lucide-react';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';
import { hasAdminOrReviewerAccess } from '@/utils/authHelpers';
import { logger } from '@/utils/logger';
import {
  fetchDuplicateGroups,
  dismissDuplicateGroup,
  type DuplicateGroupForReview,
} from '@/services/duplicateGroupService';
import {
  getGroupKey,
  getStoredResolvedGroups,
  saveResolvedGroups,
} from '@/utils/duplicateGroupHelpers';
import {
  IntAlert,
  IntButton,
  IntConfidencePill,
  IntDataTable,
  IntDetectionMethodChip,
  IntPageHeader,
  IntPillGroup,
  IntStatCard,
  IntStatRow,
  IntTabs,
  type IntConfidence,
  type IntDataTableColumn,
  type IntDetectionMethod,
} from '@/components/Internal';

type FilterStatus = 'pending' | 'resolved' | 'all';

const TAB_ORDER: FilterStatus[] = ['pending', 'resolved', 'all'];
const TAB_LABEL: Record<FilterStatus, string> = {
  pending: 'Pending',
  resolved: 'Resolved this session',
  all: 'All',
};

const CONFIDENCE_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const METHOD_OPTIONS = [
  { value: 'both', label: 'Both' },
  { value: 'same_title', label: 'Title' },
  { value: 'embedding', label: 'Embedding' },
  { value: 'mixed', label: 'Mixed' },
];

type Toast = { kind: 'success' | 'error' | 'info'; msg: string };

function truncateTitles(lessons: DuplicateGroupForReview['lessons'], cap = 3) {
  const titles = lessons.map((l) => l.title);
  if (titles.length <= cap) {
    return { primary: titles[0], rest: titles.slice(1).join(', '), moreCount: 0 };
  }
  const shown = titles.slice(0, cap);
  return { primary: shown[0], rest: shown.slice(1).join(', '), moreCount: titles.length - cap };
}

export function AdminDuplicates() {
  const { user, loading: authLoading } = useEnhancedAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [groups, setGroups] = useState<DuplicateGroupForReview[]>([]);
  const [resolvedGroups, setResolvedGroups] =
    useState<DuplicateGroupForReview[]>(getStoredResolvedGroups);
  const [filter, setFilter] = useState<FilterStatus>('pending');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [confidence, setConfidence] = useState<string[]>([]);
  const [method, setMethod] = useState<string[]>([]);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);

  const addResolvedGroup = useCallback((group: DuplicateGroupForReview) => {
    setResolvedGroups((prev) => {
      const groupKey = getGroupKey(group.lessonIds);
      if (prev.some((g) => getGroupKey(g.lessonIds) === groupKey)) return prev;
      const updated = [...prev, group];
      saveResolvedGroups(updated);
      return updated;
    });
  }, []);

  const loadGroups = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchDuplicateGroups({ includeResolved: false });
      setGroups(data);
    } catch (err) {
      logger.error('Error loading duplicate groups:', err);
      setError(err instanceof Error ? err.message : 'Failed to load duplicate groups');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Pick up toast + resolvedGroup handoff from the review page.
  useEffect(() => {
    const state = location.state as {
      message?: string;
      resolvedGroup?: DuplicateGroupForReview;
    } | null;
    if (state?.message) {
      setToast({ kind: 'success', msg: state.message });
      if (state.resolvedGroup) addResolvedGroup(state.resolvedGroup);
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.pathname, location.state, navigate, addResolvedGroup]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [toast]);

  const isAdmin = hasAdminOrReviewerAccess(user?.role);

  const resolvedGroupKeys = useMemo(
    () => new Set(resolvedGroups.map((g) => getGroupKey(g.lessonIds))),
    [resolvedGroups]
  );
  const pendingGroups = useMemo(
    () => groups.filter((g) => !resolvedGroupKeys.has(getGroupKey(g.lessonIds))),
    [groups, resolvedGroupKeys]
  );
  const allGroups = useMemo(
    () => [...pendingGroups, ...resolvedGroups],
    [pendingGroups, resolvedGroups]
  );

  const baseList = useMemo(() => {
    if (filter === 'pending') return pendingGroups;
    if (filter === 'resolved') return resolvedGroups;
    return allGroups;
  }, [filter, pendingGroups, resolvedGroups, allGroups]);

  const filteredGroups = useMemo(() => {
    return baseList.filter((g) => {
      if (confidence.length > 0 && !confidence.includes(g.confidence)) return false;
      if (method.length > 0 && !method.includes(g.detectionMethod)) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        const hit =
          g.groupId.toLowerCase().includes(q) ||
          g.lessons.some((l) => l.title.toLowerCase().includes(q));
        if (!hit) return false;
      }
      return true;
    });
  }, [baseList, confidence, method, searchTerm]);

  const counts = useMemo(() => {
    const byConfidence = { high: 0, medium: 0, low: 0 };
    for (const g of pendingGroups) byConfidence[g.confidence]++;
    return byConfidence;
  }, [pendingGroups]);

  const counts_tabs = useMemo(
    () => ({
      pending: pendingGroups.length,
      resolved: resolvedGroups.length,
      all: allGroups.length,
    }),
    [pendingGroups.length, resolvedGroups.length, allGroups.length]
  );

  const tabs = TAB_ORDER.map((key) => ({
    key,
    label: TAB_LABEL[key],
    count: counts_tabs[key],
  }));

  // Only show primaryTeacher column if at least one row has it
  const showTeacherColumn = useMemo(
    () => filteredGroups.some((g) => !!g.primaryTeacher),
    [filteredGroups]
  );

  const selectable = filter !== 'resolved';
  const selectedCount = selectedKeys.length;

  const handleBulkDismiss = useCallback(async () => {
    if (selectedKeys.length === 0) return;
    const victims = filteredGroups.filter((g) => selectedKeys.includes(g.groupId));
    if (victims.length === 0) return;
    if (
      !window.confirm(
        `Dismiss ${victims.length} duplicate group${victims.length === 1 ? '' : 's'}? All lessons will be kept and the detector won't re-flag these clusters.`
      )
    ) {
      return;
    }
    setBulkRunning(true);
    const results = await Promise.allSettled(
      victims.map((g) => {
        const dm: 'same_title' | 'embedding' | 'both' =
          g.detectionMethod === 'mixed' ? 'both' : g.detectionMethod;
        return dismissDuplicateGroup(g.lessonIds, dm, 'Dismissed via bulk selection');
      })
    );
    const succeeded: DuplicateGroupForReview[] = [];
    let failed = 0;
    results.forEach((r, i) => {
      if (r.status === 'fulfilled' && r.value.success) {
        succeeded.push(victims[i]);
      } else {
        failed++;
      }
    });
    for (const g of succeeded) addResolvedGroup(g);
    setSelectedKeys([]);
    setBulkRunning(false);
    setToast({
      kind: failed === 0 ? 'success' : 'error',
      msg:
        failed === 0
          ? `Dismissed ${succeeded.length} group${succeeded.length === 1 ? '' : 's'}.`
          : `Dismissed ${succeeded.length}, ${failed} failed.`,
    });
    await loadGroups();
  }, [selectedKeys, filteredGroups, addResolvedGroup, loadGroups]);

  const columns: IntDataTableColumn<DuplicateGroupForReview>[] = useMemo(() => {
    const base: IntDataTableColumn<DuplicateGroupForReview>[] = [
      {
        key: 'group',
        header: 'Group / lessons',
        render: (g) => {
          const titles = truncateTitles(g.lessons, 3);
          return (
            <div className="adm-dup-group-row">
              <span className="adm-dup-group-id" title={g.groupId}>
                {g.groupId.replace('group_', 'G·')}
              </span>
              <div className="adm-dup-group-titles">
                <span className="primary">{titles.primary}</span>
                <span className="rest">
                  {titles.rest}
                  {titles.moreCount > 0 && <span className="more">+{titles.moreCount} more</span>}
                </span>
              </div>
            </div>
          );
        },
      },
      {
        key: 'sim',
        header: 'Avg similarity',
        width: '180px',
        render: (g) => {
          if (g.avgSimilarity == null) return <span className="muted">—</span>;
          const pct = Math.round(g.avgSimilarity * 100);
          return (
            <div className={`adm-confidence-bar adm-confidence-bar--${g.confidence}`}>
              <div
                className="adm-confidence-bar-track"
                style={{ ['--fill' as string]: `${pct}%` } as CSSProperties}
              />
              <span className="adm-confidence-bar-value">{pct}%</span>
            </div>
          );
        },
      },
      {
        key: 'conf',
        header: 'Confidence',
        width: '120px',
        render: (g) => <IntConfidencePill confidence={g.confidence as IntConfidence} />,
      },
      {
        key: 'meth',
        header: 'Detection',
        width: '120px',
        render: (g) => <IntDetectionMethodChip method={g.detectionMethod as IntDetectionMethod} />,
      },
      {
        key: 'pairs',
        header: 'Pairs',
        width: '90px',
        render: (g) => (
          <span className="adm-dup-paircount">
            <strong>{g.pairCount}</strong> / {g.lessons.length}L
          </span>
        ),
      },
    ];
    if (showTeacherColumn) {
      base.push({
        key: 'teach',
        header: 'Primary teacher',
        width: '160px',
        muted: true,
        render: (g) => g.primaryTeacher || '—',
      });
    }
    base.push({
      key: 'action',
      header: '',
      width: '110px',
      align: 'right',
      render: (g) => {
        if (resolvedGroupKeys.has(getGroupKey(g.lessonIds))) {
          return <span className="muted">Resolved</span>;
        }
        return (
          <IntButton size="sm" onClick={() => navigate(`/admin/duplicates/${g.groupId}`)}>
            Review
          </IntButton>
        );
      },
    });
    return base;
  }, [showTeacherColumn, navigate, resolvedGroupKeys]);

  if (authLoading) {
    return (
      <div className="int-shell-root">
        <div className="adm-page">
          <p className="adm-section-desc">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="int-shell-root">
        <div className="adm-page">
          <p className="adm-section-desc">You don't have permission to view this page.</p>
        </div>
      </div>
    );
  }

  const emptyMessage =
    filter === 'pending'
      ? 'No pending duplicates. The detector has no unresolved clusters.'
      : filter === 'resolved'
        ? 'Nothing resolved this session yet.'
        : 'No duplicate groups.';

  return (
    <div className="int-shell-root">
      <div className="adm-page">
        <IntPageHeader
          title="Duplicate management"
          description="Review clusters of lessons flagged as near-duplicates. Resolving picks a canonical lesson; archived lessons are linked to it. Dismissing keeps all lessons and prevents re-flagging."
          back={{ label: 'Back to Admin', onClick: () => navigate('/admin') }}
        />

        <IntStatRow>
          <IntStatCard label="Pending groups" value={pendingGroups.length} />
          <IntStatCard label="High confidence" value={counts.high} />
          <IntStatCard label="Medium" value={counts.medium} />
          <IntStatCard label="Low" value={counts.low} />
          <IntStatCard label="Resolved this session" value={resolvedGroups.length} />
        </IntStatRow>

        {toast && (
          <IntAlert variant={toast.kind === 'error' ? 'error' : 'success'}>{toast.msg}</IntAlert>
        )}

        {error && (
          <IntAlert variant="error" title="Couldn't load duplicate groups">
            {error}{' '}
            <button type="button" className="adm-link" onClick={() => loadGroups()}>
              Try again
            </button>
          </IntAlert>
        )}

        {filter === 'resolved' && resolvedGroups.length > 0 && (
          <IntAlert variant="info" title="Resolved this session">
            Groups you resolve or dismiss in this browser session are listed here. They clear on
            sign-out; the detector won't re-flag dismissed clusters.
          </IntAlert>
        )}

        <IntTabs
          tabs={tabs}
          activeKey={filter}
          onChange={(key) => {
            setFilter(key as FilterStatus);
            setSelectedKeys([]);
          }}
          ariaLabel="Filter duplicate groups by status"
        />

        <div className="adm-toolbar">
          <div className="adm-toolbar-search">
            <Search className="w-4 h-4" aria-hidden="true" />
            <input
              type="text"
              placeholder="Search titles or group ID…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              aria-label="Search duplicate groups"
            />
          </div>
          <IntPillGroup
            options={CONFIDENCE_OPTIONS}
            selected={confidence}
            onChange={setConfidence}
            mode="single"
            ariaLabel="Filter by confidence"
          />
          <IntPillGroup
            options={METHOD_OPTIONS}
            selected={method}
            onChange={setMethod}
            mode="single"
            ariaLabel="Filter by detection method"
          />
          <span className="muted" style={{ fontSize: 12, marginLeft: 'auto' }}>
            {filteredGroups.length} of {baseList.length}{' '}
            {baseList.length === 1 ? 'group' : 'groups'}
          </span>
        </div>

        <div aria-live="polite" aria-atomic="true" className="sr-only">
          {selectedCount > 0 &&
            `${selectedCount} duplicate group${selectedCount === 1 ? '' : 's'} selected`}
        </div>

        {selectable && selectedCount > 0 && (
          <div className="adm-bulk-bar">
            <span>
              {selectedCount} group{selectedCount === 1 ? '' : 's'} selected — bulk dismissal keeps
              all lessons.
            </span>
            <IntButton
              size="sm"
              variant="primary"
              onClick={handleBulkDismiss}
              disabled={bulkRunning}
            >
              <AlertCircle className="w-4 h-4" aria-hidden="true" />
              <span>Dismiss selected</span>
            </IntButton>
            <button
              type="button"
              className="adm-link"
              onClick={() => setSelectedKeys([])}
              disabled={bulkRunning}
            >
              Clear
            </button>
          </div>
        )}

        {loading ? (
          <p className="adm-section-desc">Loading duplicate groups…</p>
        ) : (
          <IntDataTable
            columns={columns}
            rows={filteredGroups}
            getRowKey={(g) => g.groupId}
            selectable={selectable}
            selectedKeys={selectedKeys}
            onSelectionChange={setSelectedKeys}
            onRowClick={(g) => {
              if (!resolvedGroupKeys.has(getGroupKey(g.lessonIds))) {
                navigate(`/admin/duplicates/${g.groupId}`);
              }
            }}
            emptyMessage={emptyMessage}
            ariaLabel="Duplicate groups"
            getSelectRowLabel={(g) => `Select group ${g.groupId}`}
          />
        )}
      </div>
    </div>
  );
}
