import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Permission } from '@/types/auth';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';
import { Shield, AlertCircle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  permissions?: Permission[];
  requireAll?: boolean; // If true, requires all permissions. If false, requires any permission
  fallback?: React.ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  permissions = [],
  requireAll = false,
  fallback,
  redirectTo = '/',
}: ProtectedRouteProps) {
  const { user, loading, profileError, retryAuth, hasAllPermissions, hasAnyPermission } =
    useEnhancedAuth();
  const location = useLocation();

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Checking permissions...</p>
        </div>
      </div>
    );
  }

  // FP-07: the profile fetch failed for a (probably) signed-in user — a
  // transient error, not a sign-out. Offer a Retry instead of silently
  // redirecting home. When a LATER refetch errors while `user` is still set,
  // we fall through to children below: stale-but-authenticated beats a false
  // sign-out (RLS still enforces server-side).
  if (!user && profileError) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-3 text-red-800 mb-4">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <h2 className="text-xl font-semibold">Couldn&apos;t load your account</h2>
          </div>
          <p className="text-red-700 mb-4">
            We couldn&apos;t confirm your sign-in because of a connection problem. You are probably
            still signed in — retry to continue.
          </p>
          <button
            onClick={() => void retryAuth()}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Check if user is authenticated
  if (!user) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />;
  }

  // Check if user account is active
  if (!user.is_active) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <div className="flex items-center gap-3 text-red-800 mb-4">
            <AlertCircle className="w-6 h-6 flex-shrink-0" />
            <h2 className="text-xl font-semibold">Account Inactive</h2>
          </div>
          <p className="text-red-700">
            Your account has been deactivated. Please contact an administrator for assistance.
          </p>
        </div>
      </div>
    );
  }

  // Check permissions if specified
  if (permissions.length > 0) {
    const hasRequiredPermissions = requireAll
      ? hasAllPermissions(permissions)
      : hasAnyPermission(permissions);

    if (!hasRequiredPermissions) {
      // Show fallback content if provided
      if (fallback) {
        return <>{fallback}</>;
      }

      // Otherwise show unauthorized message
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 max-w-md">
            <div className="flex items-center gap-3 text-yellow-800 mb-4">
              <Shield className="w-6 h-6 flex-shrink-0" />
              <h2 className="text-xl font-semibold">Access Denied</h2>
            </div>
            <p className="text-yellow-700 mb-4">
              You don't have the required permissions to access this page.
            </p>
            <div className="text-sm text-yellow-600">
              <p className="font-medium mb-2">Required permissions:</p>
              <ul className="list-disc list-inside space-y-1">
                {permissions.map((permission) => (
                  <li key={permission}>{permission.replace(/_/g, ' ').toLowerCase()}</li>
                ))}
              </ul>
            </div>
            <button
              onClick={() => window.history.back()}
              className="mt-4 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  // User is authenticated and has required permissions
  return <>{children}</>;
}
