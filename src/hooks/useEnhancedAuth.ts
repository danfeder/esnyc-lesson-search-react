import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import {
  UserRole,
  Permission,
  DEFAULT_PERMISSIONS,
  EnhancedUserProfile,
  AuthContextValue,
} from '@/types/auth';
import { logger } from '@/utils/logger';

export function useEnhancedAuth(): AuthContextValue {
  const [user, setUser] = useState<EnhancedUserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check initial auth state
    checkUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkUser = async () => {
    try {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (authUser) {
        await fetchUserProfile(authUser);
      } else {
        setLoading(false);
      }
    } catch (error) {
      logger.error('Error checking user:', error);
      setLoading(false);
    }
  };

  const fetchUserProfile = async (authUser: User) => {
    try {
      // First, check if profile exists
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', authUser.id) // Changed from user_id to id
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        logger.error('Error fetching user profile:', error);
        setLoading(false);
        return;
      }

      if (!data) {
        // No profile exists, create one

        const newProfile = {
          id: authUser.id,
          user_id: authUser.id,
          email: authUser.email!,
          full_name:
            authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'Unknown User',
          role: UserRole.TEACHER,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        const { data: createdProfile, error: createError } = await supabase
          .from('user_profiles')
          .insert(newProfile)
          .select()
          .single();

        if (createError) {
          logger.error('Error creating user profile:', createError);
          // Still set a basic user object
          setUser({
            ...newProfile,
            email: authUser.email,
          });
        } else if (createdProfile) {
          setUser({
            ...createdProfile,
            email: authUser.email,
            user_id: createdProfile.user_id || authUser.id, // Handle nullable user_id
            permissions: createdProfile.permissions as Record<Permission, boolean> | undefined,
          } as EnhancedUserProfile);
        }
      } else {
        // Profile exists, use it
        setUser({
          ...data,
          email: authUser.email,
          role: (data.role || UserRole.TEACHER) as UserRole,
          user_id: data.user_id || authUser.id, // Handle nullable user_id
          permissions: data.permissions as Record<Permission, boolean> | undefined,
        } as EnhancedUserProfile);
      }
    } catch (error) {
      logger.error('Error in fetchUserProfile:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  // Calculate effective permissions
  const permissions = useMemo(() => {
    if (!user) return [];

    // Get default permissions for role
    const rolePermissions = DEFAULT_PERMISSIONS[user.role as UserRole] || [];

    // Apply custom permission overrides if any
    if (user.permissions) {
      const customPermissions = Object.entries(user.permissions)
        .filter(([, enabled]) => enabled)
        .map(([permission]) => permission as Permission);

      // Merge with role permissions (custom overrides take precedence)
      const permissionSet = new Set([...rolePermissions, ...customPermissions]);

      // Remove any explicitly disabled permissions
      Object.entries(user.permissions).forEach(([permission, enabled]) => {
        if (!enabled) {
          permissionSet.delete(permission as Permission);
        }
      });

      return Array.from(permissionSet);
    }

    return rolePermissions;
  }, [user]);

  // Permission check helpers
  const hasPermission = useCallback(
    (permission: Permission): boolean => {
      if (!user || !user.is_active) return false;
      return permissions.includes(permission);
    },
    [permissions, user]
  );

  const hasAnyPermission = useCallback(
    (requiredPermissions: Permission[]): boolean => {
      if (!user || !user.is_active) return false;
      return requiredPermissions.some((permission) => permissions.includes(permission));
    },
    [permissions, user]
  );

  const hasAllPermissions = useCallback(
    (requiredPermissions: Permission[]): boolean => {
      if (!user || !user.is_active) return false;
      return requiredPermissions.every((permission) => permissions.includes(permission));
    },
    [permissions, user]
  );

  const isAdmin = useCallback((): boolean => {
    if (!user || !user.is_active) return false;
    return user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN;
  }, [user]);

  const isReviewer = useCallback((): boolean => {
    if (!user || !user.is_active) return false;
    return (
      user.role === UserRole.REVIEWER ||
      user.role === UserRole.ADMIN ||
      user.role === UserRole.SUPER_ADMIN
    );
  }, [user]);

  return {
    user,
    loading,
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isAdmin,
    isReviewer,
  };
}
