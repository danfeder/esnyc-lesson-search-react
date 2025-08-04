import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface PermissionState {
  hasAccess: boolean | null;
  isChecking: boolean;
  error: string | null;
  docName?: string;
  reason?: 'no_permission' | 'not_found' | 'error' | 'no_service_account';
}

interface CachedPermission {
  hasAccess: boolean | null;
  docName?: string;
  reason?: string;
  timestamp: number;
}

const CACHE_KEY_PREFIX = 'gdoc_permission_';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export function useGoogleDocPermission(docId: string | null) {
  const [state, setState] = useState<PermissionState>({
    hasAccess: null,
    isChecking: true,
    error: null,
  });

  // Get cached permission data
  const getCachedPermission = useCallback((id: string): CachedPermission | null => {
    if (typeof window === 'undefined' || !window.sessionStorage) {
      return null;
    }

    try {
      const cached = sessionStorage.getItem(`${CACHE_KEY_PREFIX}${id}`);
      if (!cached) return null;

      const data: CachedPermission = JSON.parse(cached);

      // Check if cache is still valid
      if (Date.now() - data.timestamp > CACHE_TTL) {
        sessionStorage.removeItem(`${CACHE_KEY_PREFIX}${id}`);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error reading permission cache:', error);
      return null;
    }
  }, []);

  // Set cached permission data
  const setCachedPermission = useCallback(
    (id: string, permission: Omit<CachedPermission, 'timestamp'>) => {
      if (typeof window === 'undefined' || !window.sessionStorage) {
        return;
      }

      try {
        const data: CachedPermission = {
          ...permission,
          timestamp: Date.now(),
        };
        sessionStorage.setItem(`${CACHE_KEY_PREFIX}${id}`, JSON.stringify(data));
      } catch (error) {
        console.error('Error setting permission cache:', error);
      }
    },
    []
  );

  // Check document permissions
  const checkPermissions = useCallback(
    async (id: string) => {
      // First check cache
      const cached = getCachedPermission(id);
      if (cached) {
        setState({
          hasAccess: cached.hasAccess,
          isChecking: false,
          error: null,
          docName: cached.docName,
          reason: cached.reason as any,
        });
        return;
      }

      // If not cached, check with the edge function
      setState((prev) => ({ ...prev, isChecking: true, error: null }));

      try {
        const { data, error } = await supabase.functions.invoke('check-google-doc-access', {
          body: { docId: id },
        });

        if (error) {
          throw new Error(error.message || 'Failed to check document permissions');
        }

        // Cache the result
        setCachedPermission(id, {
          hasAccess: data.hasAccess,
          docName: data.docName,
          reason: data.reason,
        });

        setState({
          hasAccess: data.hasAccess,
          isChecking: false,
          error: data.hasAccess === false ? data.message : null,
          docName: data.docName,
          reason: data.reason,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to check permissions';
        setState({
          hasAccess: null,
          isChecking: false,
          error: message,
          reason: 'error',
        });
      }
    },
    [getCachedPermission, setCachedPermission]
  );

  // Recheck permissions (bypassing cache)
  const recheckAccess = useCallback(async () => {
    if (!docId) return;

    // Clear cache for this doc
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.removeItem(`${CACHE_KEY_PREFIX}${docId}`);
    }

    // Check permissions again
    await checkPermissions(docId);
  }, [docId, checkPermissions]);

  // Check permissions when docId changes
  useEffect(() => {
    if (!docId) {
      setState({
        hasAccess: null,
        isChecking: false,
        error: 'No document ID provided',
      });
      return;
    }

    checkPermissions(docId);
  }, [docId, checkPermissions]);

  return {
    hasAccess: state.hasAccess,
    isChecking: state.isChecking,
    error: state.error,
    docName: state.docName,
    reason: state.reason,
    recheckAccess,
  };
}
