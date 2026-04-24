export type IntRole = 'admin' | 'super_admin' | 'reviewer' | 'teacher';

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
