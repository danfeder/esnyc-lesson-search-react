import type { ReactNode } from 'react';

export type IntStatus =
  | 'submitted'
  | 'review'
  | 'revision'
  | 'approved'
  | 'rejected'
  | 'active'
  | 'inactive'
  | 'pending'
  | 'expired';

const DEFAULT_LABELS: Record<IntStatus, string> = {
  submitted: 'Submitted',
  review: 'In review',
  revision: 'Revision',
  approved: 'Approved',
  rejected: 'Rejected',
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending',
  expired: 'Expired',
};

interface IntStatusBadgeProps {
  status: IntStatus;
  children?: ReactNode;
}

export function IntStatusBadge({ status, children }: IntStatusBadgeProps) {
  return (
    <span className={`adm-status adm-status--${status}`}>{children ?? DEFAULT_LABELS[status]}</span>
  );
}
