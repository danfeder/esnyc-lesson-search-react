import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useEnhancedAuth } from '../hooks/useEnhancedAuth';
import { Permission, UserInvitation } from '../types/auth';
import {
  ArrowLeft,
  Mail,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Send,
  Plus,
  Filter,
  Download,
} from 'lucide-react';
import { formatDistanceToNow, format, isPast } from 'date-fns';

type InvitationFilter = 'all' | 'pending' | 'accepted' | 'expired';

export function AdminInvitations() {
  const navigate = useNavigate();
  const { user, hasPermission } = useEnhancedAuth();
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<InvitationFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedInvitations, setSelectedInvitations] = useState<string[]>([]);
  const [resending, setResending] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (hasPermission(Permission.VIEW_USERS)) {
      loadInvitations();
    }
  }, [hasPermission]);

  const loadInvitations = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('user_invitations')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      setInvitations(data || []);
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredInvitations = () => {
    return invitations.filter((invitation) => {
      // Apply status filter
      if (
        filter === 'pending' &&
        (invitation.accepted_at || isPast(new Date(invitation.expires_at)))
      ) {
        return false;
      }
      if (filter === 'accepted' && !invitation.accepted_at) {
        return false;
      }
      if (
        filter === 'expired' &&
        (!isPast(new Date(invitation.expires_at)) || invitation.accepted_at)
      ) {
        return false;
      }

      // Apply search filter
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          invitation.email.toLowerCase().includes(search) ||
          invitation.school_name?.toLowerCase().includes(search) ||
          invitation.role.toLowerCase().includes(search)
        );
      }

      return true;
    });
  };

  const handleResend = async (invitationId: string) => {
    setResending(invitationId);
    try {
      // Update expiration date
      const { error: updateError } = await supabase
        .from('user_invitations')
        .update({
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        })
        .eq('id', invitationId);

      if (updateError) throw updateError;

      // Log audit
      const invitation = invitations.find((inv) => inv.id === invitationId);
      if (invitation && user) {
        await supabase.from('user_management_audit').insert({
          actor_id: user.id,
          action: 'invite_resent',
          target_email: invitation.email,
        });
      }

      // TODO: Trigger email sending edge function

      // Reload invitations
      await loadInvitations();
    } catch (error) {
      console.error('Error resending invitation:', error);
    } finally {
      setResending(null);
    }
  };

  const handleCancel = async (invitationId: string) => {
    if (!confirm('Are you sure you want to cancel this invitation?')) {
      return;
    }

    setCancelling(invitationId);
    try {
      const { error } = await supabase.from('user_invitations').delete().eq('id', invitationId);

      if (error) throw error;

      // Log audit
      const invitation = invitations.find((inv) => inv.id === invitationId);
      if (invitation && user) {
        await supabase.from('user_management_audit').insert({
          actor_id: user.id,
          action: 'invite_cancelled',
          target_email: invitation.email,
        });
      }

      // Remove from local state
      setInvitations(invitations.filter((inv) => inv.id !== invitationId));
    } catch (error) {
      console.error('Error cancelling invitation:', error);
    } finally {
      setCancelling(null);
    }
  };

  const exportToCSV = () => {
    const filtered = getFilteredInvitations();
    const csv = [
      [
        'Email',
        'Role',
        'School',
        'Borough',
        'Status',
        'Invited By',
        'Invited At',
        'Expires At',
        'Accepted At',
      ],
      ...filtered.map((inv) => [
        inv.email,
        inv.role,
        inv.school_name || '',
        inv.school_borough || '',
        inv.accepted_at ? 'Accepted' : isPast(new Date(inv.expires_at)) ? 'Expired' : 'Pending',
        inv.invited_by,
        format(new Date(inv.invited_at), 'yyyy-MM-dd HH:mm'),
        format(new Date(inv.expires_at), 'yyyy-MM-dd HH:mm'),
        inv.accepted_at ? format(new Date(inv.accepted_at), 'yyyy-MM-dd HH:mm') : '',
      ]),
    ]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invitations-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getStatusIcon = (invitation: UserInvitation) => {
    if (invitation.accepted_at) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    }
    if (isPast(new Date(invitation.expires_at))) {
      return <XCircle className="w-5 h-5 text-red-600" />;
    }
    return <Clock className="w-5 h-5 text-yellow-600" />;
  };

  const getStatusBadge = (invitation: UserInvitation) => {
    if (invitation.accepted_at) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          Accepted
        </span>
      );
    }
    if (isPast(new Date(invitation.expires_at))) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          Expired
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
        Pending
      </span>
    );
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'reviewer':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredInvitations = getFilteredInvitations();

  // Calculate stats
  const stats = {
    total: invitations.length,
    pending: invitations.filter((inv) => !inv.accepted_at && !isPast(new Date(inv.expires_at)))
      .length,
    accepted: invitations.filter((inv) => inv.accepted_at).length,
    expired: invitations.filter((inv) => !inv.accepted_at && isPast(new Date(inv.expires_at)))
      .length,
  };

  if (!hasPermission(Permission.VIEW_USERS)) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center py-12">
          <p className="text-gray-600">You don't have permission to view this page</p>
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
              <Mail className="w-6 h-6" />
              User Invitations
            </h1>
            <p className="text-gray-600 mt-1">Manage pending and sent invitations</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
              onClick={() => navigate('/admin/users/invite')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Invitation
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Invitations</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <Mail className="w-8 h-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Accepted</p>
              <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expired</p>
              <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
            </div>
            <XCircle className="w-8 h-8 text-red-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Filter className="w-5 h-5 text-gray-500" />
            <div className="flex gap-2">
              {(['all', 'pending', 'accepted', 'expired'] as InvitationFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    filter === f
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <input
            type="text"
            placeholder="Search by email, school, or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-96 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Invitations List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading invitations...</p>
          </div>
        ) : filteredInvitations.length === 0 ? (
          <div className="text-center py-12">
            <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">No invitations found</p>
            {filter !== 'all' && (
              <p className="text-sm text-gray-500 mt-2">
                Try changing your filter or search criteria
              </p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    School
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invited
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredInvitations.map((invitation) => (
                  <tr key={invitation.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        {getStatusIcon(invitation)}
                        <span className="ml-2 text-sm text-gray-900">{invitation.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                          invitation.role
                        )}`}
                      >
                        {invitation.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {invitation.school_name || '-'}
                      {invitation.school_borough && (
                        <span className="text-gray-500 ml-2">({invitation.school_borough})</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(invitation)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDistanceToNow(new Date(invitation.invited_at), { addSuffix: true })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {invitation.accepted_at ? (
                        <span className="text-green-600">Accepted</span>
                      ) : isPast(new Date(invitation.expires_at)) ? (
                        <span className="text-red-600">Expired</span>
                      ) : (
                        formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center gap-2">
                        {!invitation.accepted_at && (
                          <>
                            <button
                              onClick={() => handleResend(invitation.id)}
                              disabled={resending === invitation.id}
                              className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
                              title="Resend invitation"
                            >
                              {resending === invitation.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={() => handleCancel(invitation.id)}
                              disabled={cancelling === invitation.id}
                              className="text-red-600 hover:text-red-800 disabled:opacity-50"
                              title="Cancel invitation"
                            >
                              {cancelling === invitation.id ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <XCircle className="w-4 h-4" />
                              )}
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
