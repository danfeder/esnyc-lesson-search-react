import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  role: string | null;
  loading: boolean;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    role: null,
    loading: true,
  });

  useEffect(() => {
    // Check initial auth state
    checkUser();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchUserRole(session.user);
      } else {
        setAuthState({ user: null, role: null, loading: false });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkUser = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        await fetchUserRole(user);
      } else {
        setAuthState({ user: null, role: null, loading: false });
      }
    } catch (error) {
      console.error('Error checking user:', error);
      setAuthState({ user: null, role: null, loading: false });
    }
  };

  const fetchUserRole = async (user: User) => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        setAuthState({ user, role: 'teacher', loading: false });
      } else {
        setAuthState({ user, role: data?.role || 'teacher', loading: false });
      }
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      setAuthState({ user, role: 'teacher', loading: false });
    }
  };

  return authState;
}
