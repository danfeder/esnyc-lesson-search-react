import { createContext, useContext } from 'react';
import type { AuthContextValue } from '@/types/auth';

/**
 * Single auth context. Populated once by <AuthProvider> at the App root
 * (src/components/Auth/AuthProvider.tsx); every component reads it through
 * useAuth(). Do NOT call useEnhancedAuth() from components — that hook runs
 * the whole auth pipeline (getUser + profile fetch + onAuthStateChange
 * subscription) per call, which is exactly the duplication this context removes.
 */
export const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth() must be used within <AuthProvider>');
  }
  return ctx;
}
