import type { ReactNode } from 'react';
import { AuthContext } from '@/hooks/useAuth';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';

interface AuthProviderProps {
  children: ReactNode;
}

/** Runs the auth pipeline exactly once and shares it with every useAuth() consumer. */
export function AuthProvider({ children }: AuthProviderProps) {
  const value = useEnhancedAuth();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
