import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useDebounce } from '../hooks/useDebounce';
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
import { EnhancedUserProfile, UserFilters, UserRole, Permission } from '../types/auth';
import { formatDistanceToNow } from 'date-fns';
import { SchoolBadge } from '../components/Schools';
import { logger } from '../utils/logger';
import { VirtualizedTable, Column } from '../components/Common/VirtualizedTable';
import { shouldVirtualize } from '../utils/virtualization';

export function AdminUsers() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<EnhancedUserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [filters, setFilters] = useState<UserFilters>({
    search: '',
    role: 'all',
    is_active: 'all',
    school_borough: 'all',
    schoolId: 'all',
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [schools, setSchools] = useState<{ id: string; name: string }[]>([]);
  const bulkActionsRef = useRef<HTMLDivElement>(null);

  const USERS_PER_PAGE = 20;

  // Update filters when debounced search changes
  useEffect(() => {
    setFilters((prev) => ({ ...prev, search: debouncedSearch }));
  }, [debouncedSearch]);

  useEffect(() => {
    loadUsers();
  }, [filters, page]);

  useEffect(() => {
    loadSchools();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bulkActionsRef.current && !bulkActionsRef.current.contains(event.target as Node)) {
        setShowBulkActions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadSchools = async () => {
    try {
      const { data, error } = await supabase.from('schools').select('id, name').order('name');
      if (!error && data) {
        setSchools(data);
      }
    } catch (error) {
      logger.error('Error loading schools:', error);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Build the base query with optional JOIN for school filtering
      let query;
      if (filters.schoolId && filters.schoolId !== 'all') {
        // Use JOIN to filter by school in a single query
        query = supabase
          .from('user_profiles')
          .select('*, user_schools!inner(school_id)', { count: 'exact' })
          .eq('user_schools.school_id', filters.schoolId);
      } else {
        // Standard query without school filter
        query = supabase.from('user_profiles').select('*', { count: 'exact' });
      }

      // Apply filters (except email search - we'll handle that after)
      if (filters.search) {
        // Escape special characters including backslashes to prevent SQL injection
        const escapedSearch = filters.search
          .replace(/\\/g, '\\\\') // Escape backslashes first
          .replace(/[%_]/g, '\\$&'); // Then escape wildcards
        query = query.or(`full_name.ilike.%${escapedSearch}%,school_name.ilike.%${escapedSearch}%`);
      }

      if (filters.role !== 'all') {
        query = query.eq('role', filters.role as string);
      }

      if (filters.is_active !== 'all') {
        query = query.eq('is_active', filters.is_active === 'active');
      }

      if (filters.school_borough !== 'all') {
        query = query.eq('school_borough', filters.school_borough as string);
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

        // Fetch user schools with a single optimized query
        const { data: userSchoolsData, error: schoolsError } = await supabase
          .from('user_schools')
          .select('user_id, schools!inner(id, name)')
          .in(
            'user_id',
            profiles.map((p) => p.id)
          );

        if (!emailError && emailsData) {
          // Create email map
          interface EmailData {
            id: string;
            email: string;
          }
          const emailMap = new Map(emailsData.map((item: EmailData) => [item.id, item.email]));

          // Create schools map
          const schoolsMap = new Map<string, Array<{ id: string; name: string }>>();
          if (!schoolsError && userSchoolsData) {
            userSchoolsData.forEach((us: any) => {
              if (!schoolsMap.has(us.user_id)) {
                schoolsMap.set(us.user_id, []);
              }
              if (us.schools) {
                const userSchools = schoolsMap.get(us.user_id);
                if (userSchools) {
                  userSchools.push(us.schools);
                }
              }
            });
          }

          // Merge profiles with emails and schools
          const usersWithEmails = profiles.map((profile) => ({
            ...profile,
            email: emailMap.get(profile.id) || 'No email',
            schools: schoolsMap.get(profile.id) || [],
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

          setUsers(
            filteredUsers.map(
              (u) =>
                ({
                  ...u,
                  role: (u.role || 'teacher') as UserRole,
                  user_id: u.user_id || u.id,
                  permissions: u.permissions as Record<Permission, boolean> | undefined,
                }) as EnhancedUserProfile
            )
          );
        } else {
          // Fallback: show profiles without emails
          setUsers(
            profiles.map(
              (p) =>
                ({
                  ...p,
                  email: 'Loading...',
                  role: (p.role || 'teacher') as UserRole,
                  user_id: p.user_id || p.id,
                  permissions: p.permissions as Record<Permission, boolean> | undefined,
                }) as EnhancedUserProfile
            )
          );
        }
      } else {
        setUsers([]);
      }

      setTotalPages(Math.ceil((count || 0) / USERS_PER_PAGE));
    } catch (error) {
      logger.error('Error loading users:', error);
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
      logger.error(`Error performing bulk ${action}:`, error);
    }
  };

  const handleExport = async () => {
    try {
      // Fetch all users with emails using RPC function for export
      const { data: profiles, error: profileError } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (profileError) throw profileError;

      // Get emails for all users
      const { data: emailsData, error: emailError } = await supabase.rpc('get_user_emails', {
        user_ids: profiles?.map((p) => p.id) || [],
      });

      if (emailError) throw emailError;

      interface EmailDataExport {
        id: string;
        email: string;
      }
      const emailMap = new Map(
        emailsData?.map((item: EmailDataExport) => [item.id, item.email]) || []
      );
      const data = profiles?.map((profile) => ({
        ...profile,
        email: emailMap.get(profile.id) || 'No email',
      }));

      // Convert to CSV
      const csv = [
        ['Email', 'Name', 'Role', 'School', 'Borough', 'Status', 'Joined', 'Invited By'],
        ...(data || []).map((user) => [
          user.email || '',
          user.full_name || '',
          user.role || 'teacher',
          user.school_name || '',
          user.school_borough || '',
          user.is_active ? 'Active' : 'Inactive',
          user.created_at ? new Date(user.created_at).toLocaleDateString() : '',
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
      logger.error('Error exporting users:', error);
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

  // Define table columns for virtualized table
  const tableColumns = useMemo<Column<EnhancedUserProfile>[]>(
    () => [
      {
        key: 'select',
        header: '',
        width: '50px',
        render: (user) => (
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
        ),
      },
      {
        key: 'user',
        header: 'User',
        render: (user) => (
          <div>
            <div className="text-sm font-medium text-gray-900">
              {user.full_name || 'Unnamed User'}
            </div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        ),
      },
      {
        key: 'role',
        header: 'Role',
        render: (user) => (
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
              user.role
            )}`}
            role="status"
            aria-label={`Role: ${user.role.replace('_', ' ')}`}
          >
            {user.role.replace('_', ' ')}
          </span>
        ),
      },
      {
        key: 'school',
        header: 'School',
        render: (user) => (
          <div className="flex flex-wrap gap-1">
            {user.schools && user.schools.length > 0 ? (
              user.schools.map((school: { id: string; name: string }) => (
                <SchoolBadge key={school.id} name={school.name} size="sm" />
              ))
            ) : (
              <span className="text-sm text-gray-500">-</span>
            )}
          </div>
        ),
      },
      {
        key: 'status',
        header: 'Status',
        render: (user) =>
          user.is_active ? (
            <span className="inline-flex items-center gap-1 text-green-600">
              <CheckCircle className="w-4 h-4" aria-hidden="true" />
              <span>Active</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-gray-400">
              <XCircle className="w-4 h-4" aria-hidden="true" />
              <span>Inactive</span>
            </span>
          ),
      },
      {
        key: 'joined',
        header: 'Joined',
        render: (user) => (
          <span className="text-sm text-gray-500">
            {user.created_at
              ? formatDistanceToNow(new Date(user.created_at), { addSuffix: true })
              : 'Unknown'}
          </span>
        ),
      },
      {
        key: 'actions',
        header: 'Actions',
        width: '100px',
        className: 'text-right',
        render: (user) => (
          <button
            onClick={() => navigate(`/admin/users/${user.id}`)}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={`Edit ${user.full_name || user.email}`}
          >
            <Edit className="w-5 h-5" />
          </button>
        ),
      },
    ],
    [selectedUsers, navigate]
  );

  // Determine whether to use virtualization
  const useVirtualization = shouldVirtualize(users.length, 'table');

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
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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
                  is_active: e.target.value as 'all' | 'active' | 'inactive',
                })
              }
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>

            <select
              value={filters.schoolId || 'all'}
              onChange={(e) => setFilters({ ...filters, schoolId: e.target.value as any })}
              className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="all">All Schools</option>
              {schools.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
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

      {/* Users Table - Use virtualization for large datasets */}
      {useVirtualization ? (
        <VirtualizedTable
          data={users}
          columns={tableColumns}
          getRowKey={(user) => user.id}
          isLoading={loading}
          emptyMessage="No users found"
          className="bg-white"
        />
      ) : (
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
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.schools && user.schools.length > 0 ? (
                        user.schools.map((school: { id: string; name: string }) => (
                          <SchoolBadge key={school.id} name={school.name} size="sm" />
                        ))
                      ) : (
                        <span className="text-sm text-gray-500">-</span>
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
      )}
    </div>
  );
}
