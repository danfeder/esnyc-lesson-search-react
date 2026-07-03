import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';
import { Permission } from '@/types/auth';
import { IntHubTile, IntPageHeader } from '@/components/Internal';

interface AdminSection {
  eyebrow: string;
  title: string;
  description: string;
  path: string;
  permission: Permission;
}

const adminSections: AdminSection[] = [
  {
    eyebrow: 'People',
    title: 'User Management',
    description: 'Manage user accounts, roles, and permissions.',
    path: '/admin/users',
    permission: Permission.VIEW_USERS,
  },
  {
    eyebrow: 'Insights',
    title: 'Analytics',
    description: 'View user activity and system insights.',
    path: '/admin/analytics',
    permission: Permission.VIEW_ANALYTICS,
  },
  {
    eyebrow: 'People',
    title: 'Invitations',
    description: 'Send and manage invitations to new users.',
    path: '/admin/invitations',
    permission: Permission.VIEW_USERS,
  },
  {
    eyebrow: 'Submissions',
    title: 'Review Dashboard',
    description: 'Review and approve submitted lessons.',
    path: '/review',
    permission: Permission.REVIEW_LESSONS,
  },
];

export function AdminDashboard() {
  const { hasPermission, loading: authLoading } = useEnhancedAuth();

  if (authLoading) {
    return null;
  }

  const availableSections = adminSections.filter((section) => hasPermission(section.permission));

  if (availableSections.length === 0) {
    return (
      <div className="int-shell-root">
        <div className="adm-page">
          <IntPageHeader
            title="Admin"
            description="Administrative features and system management."
          />
          <p className="adm-section-desc">You don't have permission to access admin features.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="int-shell-root">
      <div className="adm-page">
        <IntPageHeader title="Admin" description="Administrative features and system management." />
        <div className="adm-hub-grid">
          {availableSections.map((section) => (
            <IntHubTile
              key={section.path}
              eyebrow={section.eyebrow}
              title={section.title}
              description={section.description}
              to={section.path}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
