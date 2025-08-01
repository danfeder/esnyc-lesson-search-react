import { useNavigate } from 'react-router-dom';
import { useEnhancedAuth } from '../hooks/useEnhancedAuth';
import { Permission } from '../types/auth';
import {
  BarChart3,
  Users,
  Shield,
  FileText,
  TrendingUp,
  Mail,
  Settings,
  ChevronRight,
} from 'lucide-react';

export function AdminDashboard() {
  const navigate = useNavigate();
  const { hasPermission } = useEnhancedAuth();

  const adminSections = [
    {
      title: 'User Management',
      description: 'Manage user accounts, roles, and permissions',
      icon: Users,
      path: '/admin/users',
      permission: Permission.VIEW_USERS,
      color: 'bg-blue-500',
    },
    {
      title: 'Analytics Dashboard',
      description: 'View user activity and system insights',
      icon: BarChart3,
      path: '/admin/analytics',
      permission: Permission.VIEW_ANALYTICS,
      color: 'bg-green-500',
    },
    {
      title: 'Invitations',
      description: 'Manage user invitations',
      icon: Mail,
      path: '/admin/invitations',
      permission: Permission.VIEW_USERS,
      color: 'bg-purple-500',
    },
    {
      title: 'Duplicate Management',
      description: 'Review and manage duplicate lessons',
      icon: Shield,
      path: '/admin/duplicates',
      permission: Permission.MANAGE_DUPLICATES,
      color: 'bg-yellow-500',
    },
    {
      title: 'Review Dashboard',
      description: 'Review submitted lessons',
      icon: FileText,
      path: '/review',
      permission: Permission.REVIEW_LESSONS,
      color: 'bg-indigo-500',
    },
  ];

  const availableSections = adminSections.filter((section) => hasPermission(section.permission));

  if (availableSections.length === 0) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-600">You don't have permission to access admin features</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Settings className="w-8 h-8" />
          Admin Dashboard
        </h1>
        <p className="text-gray-600 mt-2">Access administrative features and system management</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Lessons</p>
              <p className="text-2xl font-bold text-gray-900">831</p>
            </div>
            <FileText className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Users</p>
              <p className="text-2xl font-bold text-green-600">Coming Soon</p>
            </div>
            <Users className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending Reviews</p>
              <p className="text-2xl font-bold text-blue-600">Coming Soon</p>
            </div>
            <Shield className="w-8 h-8 text-blue-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Recent Activity</p>
              <p className="text-2xl font-bold text-purple-600">Active</p>
            </div>
            <TrendingUp className="w-8 h-8 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Admin Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {availableSections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.path}
              onClick={() => navigate(section.path)}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow text-left group"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${section.color} text-white`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{section.title}</h3>
                  <p className="text-sm text-gray-600">{section.description}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-gray-600 transition-colors mt-1" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
