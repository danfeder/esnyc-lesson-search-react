import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { Check, Pencil, Upload, X } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import type { UserManagementAudit, AuditAction } from '@/types/auth';
import { cn } from '@/utils/cn';

type TimelineDot = 'green' | 'red' | 'blue' | 'indigo' | 'ochre' | 'neutral';
type TimelineIcon = 'check' | 'x' | 'edit' | 'upload';

interface ActionDisplay {
  label: string;
  dot: TimelineDot;
  icon: TimelineIcon;
}

const ACTION_DISPLAY: Partial<Record<AuditAction, ActionDisplay>> = {
  invite_sent: { label: 'sent invite to', dot: 'indigo', icon: 'upload' },
  invite_resent: { label: 'resent invite to', dot: 'indigo', icon: 'upload' },
  invite_cancelled: { label: 'cancelled invite to', dot: 'red', icon: 'x' },
  invite_accepted: { label: 'accepted invite', dot: 'green', icon: 'check' },
  user_activated: { label: 'activated account', dot: 'green', icon: 'check' },
  user_deactivated: { label: 'deactivated account', dot: 'red', icon: 'x' },
  user_deleted: { label: 'deleted account', dot: 'red', icon: 'x' },
  user_role_changed: { label: 'changed role', dot: 'blue', icon: 'edit' },
  permissions_changed: { label: 'updated permissions', dot: 'blue', icon: 'edit' },
  user_profile_updated: { label: 'updated profile', dot: 'ochre', icon: 'edit' },
};

function resolveDisplay(action: string): ActionDisplay {
  return (
    ACTION_DISPLAY[action as AuditAction] ?? {
      label: action.replace(/_/g, ' '),
      dot: 'neutral',
      icon: 'edit',
    }
  );
}

const ICON_MAP: Record<TimelineIcon, ReactNode> = {
  check: <Check size={12} aria-hidden="true" />,
  x: <X size={12} aria-hidden="true" />,
  edit: <Pencil size={12} aria-hidden="true" />,
  upload: <Upload size={12} aria-hidden="true" />,
};

export interface AuditDiff {
  key: string;
  oldValue: unknown;
  newValue: unknown;
}

function computeDiff(row: UserManagementAudit): AuditDiff[] {
  const out: AuditDiff[] = [];
  const oldVals = (row.old_values ?? {}) as Record<string, unknown>;
  const newVals = (row.new_values ?? {}) as Record<string, unknown>;
  const keys = new Set([...Object.keys(oldVals), ...Object.keys(newVals)]);
  for (const k of keys) {
    const o = oldVals[k];
    const n = newVals[k];
    if (JSON.stringify(o) !== JSON.stringify(n)) {
      out.push({ key: k, oldValue: o, newValue: n });
    }
  }
  return out;
}

function defaultFormatValue(_key: string, val: unknown): string {
  if (val === undefined || val === null) return '';
  if (typeof val === 'boolean') return val ? 'true' : 'false';
  if (Array.isArray(val)) return val.length === 0 ? '(none)' : val.join(', ');
  return String(val);
}

function isTargetedAction(action: string): boolean {
  return action.startsWith('invite_');
}

export interface IntActivityTimelineProps {
  rows: UserManagementAudit[];
  emptyMessage?: string;
  /** Maps actor_id → display name so rows don't show raw UUIDs. Falls back to row.actor_id if unresolved. */
  resolveActor?: (actorId: string) => string;
  /** Custom diff value formatter (e.g. to look up school_ids → names). */
  formatDiffValue?: (key: string, value: unknown) => string;
  className?: string;
}

export function IntActivityTimeline({
  rows,
  emptyMessage = 'No activity yet.',
  resolveActor,
  formatDiffValue = defaultFormatValue,
  className,
}: IntActivityTimelineProps) {
  if (rows.length === 0) {
    return <div className="adm-timeline-empty">{emptyMessage}</div>;
  }

  return (
    <ol className={cn('adm-timeline', className)}>
      {rows.map((row) => {
        const disp = resolveDisplay(row.action);
        const diff = computeDiff(row);
        const actor = resolveActor ? resolveActor(row.actor_id) : row.actor_id;
        const when = new Date(row.created_at);
        return (
          <li key={row.id} className="adm-timeline-item">
            <span className={`adm-timeline-dot adm-timeline-dot--${disp.dot}`}>
              {ICON_MAP[disp.icon]}
            </span>
            <div className="adm-timeline-body">
              <div>
                <span className="adm-timeline-actor">{actor}</span>{' '}
                <span className="adm-timeline-action">{disp.label}</span>
                {isTargetedAction(row.action) && row.target_email && (
                  <>
                    {' '}
                    <span className="adm-timeline-target">{row.target_email}</span>
                  </>
                )}
              </div>
              {diff.length > 0 && (
                <div className="adm-timeline-diff">
                  {diff.map((d) => (
                    <Fragment key={d.key}>
                      <span className="adm-timeline-diff-chip adm-timeline-diff-chip--key">
                        {d.key}
                      </span>
                      {d.oldValue !== undefined && d.oldValue !== null && d.oldValue !== '' && (
                        <span className="adm-timeline-diff-chip adm-timeline-diff-chip--old">
                          {formatDiffValue(d.key, d.oldValue)}
                        </span>
                      )}
                      {d.newValue !== undefined && d.newValue !== null && d.newValue !== '' && (
                        <span className="adm-timeline-diff-chip adm-timeline-diff-chip--new">
                          → {formatDiffValue(d.key, d.newValue)}
                        </span>
                      )}
                    </Fragment>
                  ))}
                </div>
              )}
            </div>
            <time
              className="adm-timeline-when"
              dateTime={row.created_at}
              title={format(when, 'PPpp')}
            >
              {formatDistanceToNow(when, { addSuffix: true })}
            </time>
          </li>
        );
      })}
    </ol>
  );
}
