// User roles and permissions types
/* eslint-disable no-unused-vars */
export enum UserRole {
  TEACHER = 'teacher',
  REVIEWER = 'reviewer',
  ADMIN = 'admin',
  SUPER_ADMIN = 'super_admin',
}

export enum Permission {
  // Lesson Management
  VIEW_LESSONS = 'view_lessons',
  SUBMIT_LESSONS = 'submit_lessons',
  REVIEW_LESSONS = 'review_lessons',
  APPROVE_LESSONS = 'approve_lessons',
  DELETE_LESSONS = 'delete_lessons',

  // User Management
  VIEW_USERS = 'view_users',
  INVITE_USERS = 'invite_users',
  EDIT_USERS = 'edit_users',
  DELETE_USERS = 'delete_users',
  MANAGE_ROLES = 'manage_roles',

  // Admin Features
  VIEW_ANALYTICS = 'view_analytics',
  MANAGE_DUPLICATES = 'manage_duplicates',
  EXPORT_DATA = 'export_data',
  SYSTEM_SETTINGS = 'system_settings',
}
/* eslint-enable no-unused-vars */

// Default permissions for each role
export const DEFAULT_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.TEACHER]: [Permission.VIEW_LESSONS, Permission.SUBMIT_LESSONS],

  [UserRole.REVIEWER]: [
    Permission.VIEW_LESSONS,
    Permission.SUBMIT_LESSONS,
    Permission.REVIEW_LESSONS,
    Permission.APPROVE_LESSONS,
    Permission.VIEW_ANALYTICS,
  ],

  [UserRole.ADMIN]: [
    Permission.VIEW_LESSONS,
    Permission.SUBMIT_LESSONS,
    Permission.REVIEW_LESSONS,
    Permission.APPROVE_LESSONS,
    Permission.DELETE_LESSONS,
    Permission.VIEW_USERS,
    Permission.INVITE_USERS,
    Permission.EDIT_USERS,
    Permission.VIEW_ANALYTICS,
    Permission.MANAGE_DUPLICATES,
    Permission.EXPORT_DATA,
  ],

  [UserRole.SUPER_ADMIN]: Object.values(Permission), // All permissions
};

// Enhanced user profile interface
export interface EnhancedUserProfile {
  id: string;
  user_id: string;
  email?: string;
  full_name?: string;
  role: UserRole;
  school_name?: string;
  school_borough?: 'Manhattan' | 'Brooklyn' | 'Queens' | 'Bronx' | 'Staten Island';
  grades_taught?: string[];
  subjects_taught?: string[];
  invited_by?: string;
  invited_at?: string;
  accepted_at?: string;
  is_active: boolean;
  notes?: string;
  permissions?: Record<Permission, boolean>; // Custom permission overrides
  created_at: string;
  updated_at: string;
}

// User invitation interface
export interface UserInvitation {
  id: string;
  email: string;
  role: UserRole;
  invited_by: string;
  invited_at: string;
  expires_at: string;
  accepted_at?: string;
  token: string;
  metadata?: {
    message?: string;
    [key: string]: any;
  };
  school_name?: string;
  school_borough?: string;
  created_at: string;
}

// Audit log interface
export interface UserManagementAudit {
  id: string;
  actor_id: string;
  action: AuditAction;
  target_user_id?: string;
  target_email?: string;
  old_values?: any;
  new_values?: any;
  metadata?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

export type AuditAction =
  | 'invite_sent'
  | 'invite_accepted'
  | 'invite_cancelled'
  | 'invite_resent'
  | 'user_role_changed'
  | 'user_activated'
  | 'user_deactivated'
  | 'user_deleted'
  | 'user_profile_updated'
  | 'permissions_changed';

// Auth context interface
export interface AuthContextValue {
  user: EnhancedUserProfile | null;
  loading: boolean;
  permissions: Permission[];
  // eslint-disable-next-line no-unused-vars
  hasPermission: (permission: Permission) => boolean;
  // eslint-disable-next-line no-unused-vars
  hasAnyPermission: (permissions: Permission[]) => boolean;
  // eslint-disable-next-line no-unused-vars
  hasAllPermissions: (permissions: Permission[]) => boolean;
  isAdmin: () => boolean;
  isReviewer: () => boolean;
}

// Invitation form data
export interface InvitationFormData {
  email: string;
  role: UserRole;
  school_name?: string;
  school_borough?: string;
  message?: string;
  grades_taught?: string[];
  subjects_taught?: string[];
}

// User filters for admin list
export interface UserFilters {
  search?: string;
  role?: UserRole | 'all';
  is_active?: boolean | 'all';
  school_borough?: string | 'all';
  sort_by?: 'name' | 'email' | 'role' | 'created_at' | 'last_active';
  sort_order?: 'asc' | 'desc';
}
