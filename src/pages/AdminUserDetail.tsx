import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useEnhancedAuth } from '../hooks/useEnhancedAuth';
import {
  ArrowLeft,
  User,
  Mail,
  Building,
  Calendar,
  Shield,
  CheckCircle,
  XCircle,
  Edit,
  Save,
  X,
  AlertTriangle,
  History,
  UserPlus,
} from 'lucide-react';
import { EnhancedUserProfile, UserRole, Permission, UserManagementAudit } from '../types/auth';
import { formatDistanceToNow } from 'date-fns';

export function AdminUserDetail() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user: currentUser, hasPermission } = useEnhancedAuth();

  const [user, setUser] = useState<EnhancedUserProfile | null>(null);
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [auditLogs, setAuditLogs] = useState<UserManagementAudit[]>([]);

  // Form state
  const [formData, setFormData] = useState({
    full_name: '',
    role: UserRole.TEACHER,
    school_name: '',
    school_borough: '',
    grades_taught: [] as string[],
    subjects_taught: [] as string[],
    is_active: true,
    notes: '',
  });

  useEffect(() => {
    if (userId) {
      loadUserDetails();
      loadAuditLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadUserDetails = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Load user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError) throw profileError;

      // Load email separately
      const { data: emailData, error: emailError } = await supabase.rpc('get_user_emails', {
        user_ids: [userId],
      });

      if (!emailError && emailData?.[0]) {
        setEmail(emailData[0].email);
      }

      setUser(profile);
      setFormData({
        full_name: profile.full_name || '',
        role: profile.role || UserRole.TEACHER,
        school_name: profile.school_name || '',
        school_borough: profile.school_borough || '',
        grades_taught: profile.grades_taught || [],
        subjects_taught: profile.subjects_taught || [],
        is_active: profile.is_active ?? true,
        notes: profile.notes || '',
      });
    } catch (error) {
      console.error('Error loading user details:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('user_management_audit')
        .select('*')
        .eq('target_user_id', userId)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setAuditLogs(data);
      }
    } catch (error) {
      console.error('Error loading audit logs:', error);
    }
  };

  const handleSave = async () => {
    if (!user || !userId) return;

    setSaving(true);
    try {
      // Update user profile
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({
          ...formData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Try to log the update, but don't fail if audit fails
      try {
        await supabase.from('user_management_audit').insert({
          action: 'user_profile_updated',
          target_user_id: userId,
          old_values: {
            role: user.role,
            is_active: user.is_active,
          },
          new_values: {
            role: formData.role,
            is_active: formData.is_active,
          },
        });
      } catch (auditError) {
        console.warn('Failed to log audit trail:', auditError);
        // Continue even if audit fails
      }

      setEditMode(false);
      loadUserDetails(); // Reload to get fresh data
      loadAuditLogs();
    } catch (error) {
      console.error('Error updating user:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleActivationToggle = async () => {
    if (!user || !userId) return;

    setSaving(true);
    try {
      const newStatus = !formData.is_active;

      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: newStatus })
        .eq('id', userId);

      if (error) throw error;

      // Try to log the action
      try {
        await supabase.from('user_management_audit').insert({
          action: newStatus ? 'user_activated' : 'user_deactivated',
          target_user_id: userId,
        });
      } catch (auditError) {
        console.warn('Failed to log audit trail:', auditError);
      }

      setFormData({ ...formData, is_active: newStatus });
      loadAuditLogs();
    } catch (error) {
      console.error('Error toggling user activation:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !userId) return;

    setSaving(true);
    try {
      // Soft delete by deactivating and marking as deleted
      const { error } = await supabase
        .from('user_profiles')
        .update({
          is_active: false,
          notes: `[DELETED] ${formData.notes || ''}`,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (error) throw error;

      // Try to log the deletion
      try {
        await supabase.from('user_management_audit').insert({
          action: 'user_deleted',
          target_user_id: userId,
        });
      } catch (auditError) {
        console.warn('Failed to log audit trail:', auditError);
      }

      navigate('/admin/users');
    } catch (error) {
      console.error('Error deleting user:', error);
    } finally {
      setSaving(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-100 text-purple-800';
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'reviewer':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'user_activated':
      case 'invite_accepted':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'user_deactivated':
      case 'user_deleted':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'user_role_changed':
      case 'permissions_changed':
        return <Shield className="w-4 h-4 text-blue-600" />;
      case 'invite_sent':
      case 'invite_resent':
        return <UserPlus className="w-4 h-4 text-indigo-600" />;
      default:
        return <Edit className="w-4 h-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading user details...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-600">User not found</p>
          <button
            onClick={() => navigate('/admin/users')}
            className="mt-4 text-green-600 hover:text-green-700"
          >
            Back to Users
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/users')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Users
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <User className="w-6 h-6" />
              User Details
            </h1>
            <p className="text-gray-600 mt-1">Manage user account, roles, and permissions</p>
          </div>

          <div className="flex gap-3">
            {!editMode ? (
              <>
                <button
                  onClick={() => setEditMode(true)}
                  disabled={!hasPermission(Permission.EDIT_USERS)}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Edit className="w-4 h-4" />
                  Edit User
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => {
                    setEditMode(false);
                    loadUserDetails(); // Reset form
                  }}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">{formData.full_name || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email
                  </label>
                  <p className="text-gray-900">{email || 'Loading...'}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Shield className="w-4 h-4 inline mr-1" />
                    Role
                  </label>
                  {editMode ? (
                    <select
                      value={formData.role}
                      onChange={(e) =>
                        setFormData({ ...formData, role: e.target.value as UserRole })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value={UserRole.TEACHER}>Teacher</option>
                      <option value={UserRole.REVIEWER}>Reviewer</option>
                      <option value={UserRole.ADMIN}>Admin</option>
                      {currentUser?.role === UserRole.SUPER_ADMIN && (
                        <option value={UserRole.SUPER_ADMIN}>Super Admin</option>
                      )}
                    </select>
                  ) : (
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                        formData.role
                      )}`}
                    >
                      {formData.role.replace('_', ' ')}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <div className="flex items-center gap-4">
                    {formData.is_active ? (
                      <span className="inline-flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm">Active</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-600">
                        <XCircle className="w-4 h-4" />
                        <span className="text-sm">Inactive</span>
                      </span>
                    )}
                    {!editMode && hasPermission(Permission.EDIT_USERS) && (
                      <button
                        onClick={handleActivationToggle}
                        disabled={saving}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        {formData.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Building className="w-4 h-4 inline mr-1" />
                    School
                  </label>
                  {editMode ? (
                    <input
                      type="text"
                      value={formData.school_name}
                      onChange={(e) => setFormData({ ...formData, school_name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  ) : (
                    <p className="text-gray-900">{formData.school_name || 'Not provided'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Borough</label>
                  {editMode ? (
                    <select
                      value={formData.school_borough}
                      onChange={(e) => setFormData({ ...formData, school_borough: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Select Borough</option>
                      <option value="Manhattan">Manhattan</option>
                      <option value="Brooklyn">Brooklyn</option>
                      <option value="Queens">Queens</option>
                      <option value="Bronx">Bronx</option>
                      <option value="Staten Island">Staten Island</option>
                    </select>
                  ) : (
                    <p className="text-gray-900">{formData.school_borough || 'Not provided'}</p>
                  )}
                </div>
              </div>

              {editMode && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Add any notes about this user..."
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Metadata */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account Details</h2>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">User ID</p>
                <p className="text-sm font-mono text-gray-900">{user.id}</p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Created</p>
                <p className="text-sm text-gray-900">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-600">Last Updated</p>
                <p className="text-sm text-gray-900">
                  {formatDistanceToNow(new Date(user.updated_at), { addSuffix: true })}
                </p>
              </div>

              {user.invited_by && (
                <div>
                  <p className="text-sm text-gray-600">Invited By</p>
                  <p className="text-sm text-gray-900">{user.invited_by}</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <History className="w-5 h-5" />
              Recent Activity
            </h2>

            <div className="space-y-3">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3 text-sm">
                    {getActionIcon(log.action)}
                    <div className="flex-1">
                      <p className="text-gray-900">{log.action.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">No recent activity</p>
              )}
            </div>
          </div>

          {/* Danger Zone */}
          {hasPermission(Permission.DELETE_USERS) && !editMode && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-900 mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Danger Zone
              </h3>
              <p className="text-sm text-red-700 mb-4">
                Deleting a user will deactivate their account and prevent login. This action cannot
                be undone.
              </p>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  Delete User
                </button>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-red-900">
                    Are you sure? Type "DELETE" to confirm:
                  </p>
                  <input
                    type="text"
                    placeholder="Type DELETE"
                    className="w-full px-3 py-2 border border-red-300 rounded-md"
                    onChange={(e) => {
                      if (e.target.value === 'DELETE') {
                        handleDelete();
                      }
                    }}
                  />
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
