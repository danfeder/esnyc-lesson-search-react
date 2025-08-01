import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Users,
  Search,
  Plus,
  Edit,
  CheckCircle,
  XCircle,
  Download,
  ChevronLeft,
  ChevronRight,
  Mail,
  ChevronDown,
  UserCheck,
  UserX,
  Trash2,
} from 'lucide-react';
import { EnhancedUserProfile, UserFilters } from '../types/auth';
import { formatDistanceToNow } from 'date-fns';

export function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<EnhancedUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: 'all',
    is_active: 'all',
    school_borough: 'all',
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const bulkActionsRef = useRef<HTMLDivElement>(null);

  const USERS_PER_PAGE = 20;

  useEffect(() => {
    loadUsers();
  }, [filters, page]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bulkActionsRef.current && !bulkActionsRef.current.contains(event.target as Node)) {
        setShowBulkActions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // First, query user_profiles directly
      let query = supabase.from('user_profiles').select('*', { count: 'exact' });

      // Apply filters (except email search - we'll handle that after)
      if (filters.search) {
        query = query.or(
          `full_name.ilike.%${filters.search}%,school_name.ilike.%${filters.search}%`
        );
      }

      if (filters.role !== 'all') {
        query = query.eq('role', filters.role);
      }

      if (filters.is_active !== 'all') {
        query = query.eq('is_active', filters.is_active);
      }

      if (filters.school_borough !== 'all') {
        query = query.eq('school_borough', filters.school_borough);
      }

      // Apply sorting (except email - we'll handle that after)
      if (filters.sort_by !== 'email') {
        query = query.order(filters.sort_by || 'created_at', {
          ascending: filters.sort_order === 'asc',
        });
      }

      // Apply pagination
      const from = (page - 1) * USERS_PER_PAGE;
      const to = from + USERS_PER_PAGE - 1;
      query = query.range(from, to);

      const { data: profiles, error, count } = await query;

      if (error) throw error;

      if (profiles && profiles.length > 0) {
        // Get auth users to fetch emails
        await supabase.auth.getUser();

        // Create an RPC function call to get emails
        const { data: emailsData, error: emailError } = await supabase.rpc('get_user_emails', {
          user_ids: profiles.map((p) => p.id),
        });

        if (!emailError && emailsData) {
          // Create email map
          const emailMap = new Map(emailsData.map((item: any) => [item.id, item.email]));

          // Merge profiles with emails
          const usersWithEmails = profiles.map((profile) => ({
            ...profile,
            email: emailMap.get(profile.id) || 'No email',
          }));

          // Handle email search filtering
          let filteredUsers = usersWithEmails;
          if (
            filters.search &&
            !usersWithEmails.some(
              (u) =>
                u.full_name?.toLowerCase().includes(filters.search?.toLowerCase() || '') ||
                u.school_name?.toLowerCase().includes(filters.search?.toLowerCase() || '')
            )
          ) {
            // If search doesn't match name/school, check emails
            filteredUsers = usersWithEmails.filter((u) =>
              u.email.toLowerCase().includes(filters.search?.toLowerCase() || '')
            );
          }

          // Handle email sorting
          if (filters.sort_by === 'email') {
            filteredUsers.sort((a, b) => {
              const comparison = a.email.localeCompare(b.email);
              return filters.sort_order === 'asc' ? comparison : -comparison;
            });
          }

          setUsers(filteredUsers);
        } else {
          // Fallback: show profiles without emails
          setUsers(profiles.map((p) => ({ ...p, email: 'Loading...' })));
        }
      } else {
        setUsers([]);
      }

      setTotalPages(Math.ceil((count || 0) / USERS_PER_PAGE));
    } catch (error) {
      console.error('Error loading users:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (selectedUsers.length === 0) return;

    // Confirm destructive actions
    if (action === 'delete') {
      const confirm = window.confirm(
        `Are you sure you want to delete ${selectedUsers.length} user(s)? This action cannot be undone.`
      );
      if (!confirm) return;
    }

    try {
      if (action === 'delete') {
        // Use the bulk operations API endpoint
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');

        const response = await supabase.functions.invoke('user-management', {
          body: JSON.stringify({
            action: 'delete',
            userIds: selectedUsers,
          }),
          headers: {
            'Content-Type': 'application/json',
          },
          method: 'POST',
        });

        if (response.error) throw response.error;
      } else {
        // Handle activate/deactivate
        const { error } = await supabase
          .from('user_profiles')
          .update({ is_active: action === 'activate' })
          .in('id', selectedUsers);

        if (error) throw error;

        // Log audit
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) {
          await supabase.from('user_management_audit').insert({
            actor_id: user.id,
            action: action === 'activate' ? 'bulk_users_activated' : 'bulk_users_deactivated',
            metadata: { userIds: selectedUsers, count: selectedUsers.length },
          });
        }
      }

      setSelectedUsers([]);
      loadUsers();
    } catch (error) {
      console.error(`Error performing bulk ${action}:`, error);
    }
  };

  const handleExport = async () => {
    try {
      // Fetch all users without pagination for export
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*, auth.users!inner(email)')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Convert to CSV
      const csv = [
        ['Email', 'Name', 'Role', 'School', 'Borough', 'Status', 'Joined', 'Invited By'],
        ...(data || []).map((user: any) => [
          user.auth?.users?.email || user.email || '',
          user.full_name || '',
          user.role || 'teacher',
          user.school_name || '',
          user.school_borough || '',
          user.is_active ? 'Active' : 'Inactive',
          new Date(user.created_at).toLocaleDateString(),
          user.invited_by || 'Self-registered',
        ]),
      ]
        .map((row) => row.map((cell) => `"${cell}"`).join(','))
        .join('\n');

      // Download
      const blob = new window.Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting users:', error);
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

  if (loading && users.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="w-6 h-6" />
          User Management
        </h1>
        <p className="text-gray-600 mt-1">Manage user accounts, roles, and permissions</p>
      </div>

      {/* Status announcements for screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {selectedUsers.length > 0 && `${selectedUsers.length} users selected`}
      </div>

      {/* Actions Bar */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, email, or school..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <select
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value as any })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Roles</option>
              <option value="teacher">Teachers</option>
              <option value="reviewer">Reviewers</option>
              <option value="admin">Admins</option>
              <option value="super_admin">Super Admins</option>
            </select>

            <select
              value={filters.is_active?.toString() || 'all'}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  is_active: e.target.value === 'all' ? 'all' : e.target.value === 'true',
                })
              }
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>

            <button
              onClick={() => navigate('/admin/users/invite')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Invite User
            </button>

            <button
              onClick={() => navigate('/admin/invitations')}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Mail className="w-5 h-5" />
              Invitations
            </button>

            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              <Download className="w-5 h-5" />
              Export
            </button>
          </div>
        </div>

        {/* Bulk Actions */}
        {selectedUsers.length > 0 && (
          <div className="mt-4 flex items-center justify-between p-3 bg-blue-50 rounded-md">
            <span className="text-sm text-blue-800">
              {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-3">
              <div className="relative" ref={bulkActionsRef}>
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
                >
                  Bulk Actions
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showBulkActions && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-10">
                    <button
                      onClick={() => {
                        handleBulkAction('activate');
                        setShowBulkActions(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <UserCheck className="w-4 h-4 text-green-600" />
                      Activate Users
                    </button>
                    <button
                      onClick={() => {
                        handleBulkAction('deactivate');
                        setShowBulkActions(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <UserX className="w-4 h-4 text-yellow-600" />
                      Deactivate Users
                    </button>
                    <hr className="my-1 border-gray-200" />
                    <button
                      onClick={() => {
                        handleBulkAction('delete');
                        setShowBulkActions(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Users
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={() => setSelectedUsers([])}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  aria-label="Select all users"
                  checked={selectedUsers.length === users.length && users.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedUsers(users.map((u) => u.id));
                    } else {
                      setSelectedUsers([]);
                    }
                  }}
                  className="rounded text-green-600"
                />
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                User
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Role
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                School
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Status
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Joined
              </th>
              <th
                scope="col"
                className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
              >
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    aria-label={`Select ${user.full_name || user.email}`}
                    checked={selectedUsers.includes(user.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers([...selectedUsers, user.id]);
                      } else {
                        setSelectedUsers(selectedUsers.filter((id) => id !== user.id));
                      }
                    }}
                    className="rounded text-green-600"
                  />
                </td>
                <td className="px-6 py-4">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {user.full_name || 'Unnamed User'}
                    </div>
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                      user.role
                    )}`}
                    role="status"
                    aria-label={`Role: ${user.role.replace('_', ' ')}`}
                  >
                    {user.role.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  <div>
                    {user.school_name || '-'}
                    {user.school_borough && (
                      <div className="text-xs text-gray-500">{user.school_borough}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  {user.is_active ? (
                    <span
                      className="inline-flex items-center gap-1 text-green-600"
                      role="status"
                      aria-label="Status: Active"
                    >
                      <CheckCircle className="w-4 h-4" aria-hidden="true" />
                      <span className="text-sm">Active</span>
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 text-red-600"
                      role="status"
                      aria-label="Status: Inactive"
                    >
                      <XCircle className="w-4 h-4" aria-hidden="true" />
                      <span className="text-sm">Inactive</span>
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm text-gray-500">
                  {formatDistanceToNow(new Date(user.created_at), { addSuffix: true })}
                </td>
                <td className="px-6 py-4 text-right text-sm font-medium">
                  <button
                    onClick={() => navigate(`/admin/users/${user.id}`)}
                    className="text-indigo-600 hover:text-indigo-900"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-gray-700">
            Showing {(page - 1) * USERS_PER_PAGE + 1} to{' '}
            {Math.min(page * USERS_PER_PAGE, users.length)} users
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 py-1">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
