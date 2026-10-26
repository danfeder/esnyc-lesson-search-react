import { describe, it, expect, vi, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { supabase } from '@/lib/supabase';
import { AuthProvider } from '@/components/Auth/AuthProvider';
import { useAuth } from '@/hooks/useAuth';

const mockGetUser = supabase.auth.getUser as Mock;
const mockOnAuthStateChange = supabase.auth.onAuthStateChange as Mock;

function Consumer({ label }: { label: string }) {
  const { loading, user } = useAuth();
  return <div>{`${label}:${loading ? 'loading' : user ? user.email : 'anon'}`}</div>;
}

describe('AuthProvider', () => {
  it('useAuth() throws outside an AuthProvider', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Consumer label="x" />)).toThrow(/AuthProvider/);
    errorSpy.mockRestore();
  });

  it('runs ONE auth pipeline for many consumers (one getUser, one onAuthStateChange)', async () => {
    render(
      <AuthProvider>
        <Consumer label="a" />
        <Consumer label="b" />
        <Consumer label="c" />
      </AuthProvider>
    );
    await waitFor(() => expect(screen.getByText('a:anon')).toBeInTheDocument());
    expect(screen.getByText('b:anon')).toBeInTheDocument();
    expect(screen.getByText('c:anon')).toBeInTheDocument();
    expect(mockGetUser).toHaveBeenCalledTimes(1);
    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);
  });

  it('unsubscribes its single listener on unmount', () => {
    const unsubscribe = vi.fn();
    mockOnAuthStateChange.mockReturnValueOnce({ data: { subscription: { unsubscribe } } });
    const { unmount } = render(
      <AuthProvider>
        <Consumer label="a" />
      </AuthProvider>
    );
    unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });
});
