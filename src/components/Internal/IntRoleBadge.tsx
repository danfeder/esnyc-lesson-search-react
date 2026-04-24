import type { UserRole } from '@/types/auth';

// String-literal union derived from the UserRole enum so the badge stays
// decoupled from the enum at the value level while remaining assignable
// to/from UserRole without unsafe casts.
export type IntRole = `${UserRole}`;

const ROLE_LABELS: Record<IntRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  reviewer: 'Reviewer',
  teacher: 'Teacher',
};

const ROLE_CLASS: Record<IntRole, string> = {
  super_admin: 'adm-role--super',
  admin: 'adm-role--admin',
  reviewer: 'adm-role--reviewer',
  teacher: 'adm-role--teacher',
};

interface IntRoleBadgeProps {
  role: IntRole;
}

export function IntRoleBadge({ role }: IntRoleBadgeProps) {
  return <span className={`adm-role ${ROLE_CLASS[role]}`}>{ROLE_LABELS[role]}</span>;
}
