/**
 * AuthModal contract tests (FP-03 + FP-04a).
 *
 * FP-03 regression pin: on successful sign-in the modal calls ONLY onSuccess —
 * never onClose. Consumers treat onClose as user-dismissal and clear
 * pending-intent state in it (NewSubmissionForm / RevisingSubmissionForm clear
 * pendingSubmitRef), so a success-path onClose() used to kill the
 * auto-resubmit-after-sign-in flow before the [user] effect could run.
 * (Audit: docs/plans/fp1-audit/audit-state-bugs.md F1.)
 *
 * Relies on the global @/lib/supabase mock from src/__tests__/setup.ts:
 * auth.signInWithPassword / auth.resetPasswordForEmail default to
 * { data: null, error: null } (= success for AuthModal, which only checks error).
 */
import { describe, it, expect, vi, type Mock } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthModal } from './AuthModal';
import { supabase } from '@/lib/supabase';

const mockSignInWithPassword = supabase.auth.signInWithPassword as Mock;

async function fillAndSubmitSignIn(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByPlaceholderText('teacher@school.edu'), 'teacher@school.edu');
  await user.type(screen.getByPlaceholderText('••••••••'), 'password123');
  await user.click(screen.getByRole('button', { name: 'Sign In' }));
}

describe('AuthModal', () => {
  it('successful sign-in calls onSuccess only — never onClose (FP-03)', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    render(<AuthModal isOpen onClose={onClose} onSuccess={onSuccess} />);

    await fillAndSubmitSignIn(user);

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('sign-in error shows the message, calls neither callback, keeps the modal open', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    mockSignInWithPassword.mockResolvedValueOnce({
      data: null,
      error: new Error('Invalid login credentials'),
    });
    render(<AuthModal isOpen onClose={onClose} onSuccess={onSuccess} />);

    await fillAndSubmitSignIn(user);

    expect(await screen.findByText('Invalid login credentials')).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('forgot-password success shows confirmation and keeps the modal open', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    render(<AuthModal isOpen onClose={onClose} onSuccess={onSuccess} />);

    await user.click(screen.getByRole('button', { name: 'Forgot your password?' }));
    await user.type(screen.getByPlaceholderText('teacher@school.edu'), 'teacher@school.edu');
    await user.click(screen.getByRole('button', { name: 'Send Reset Link' }));

    expect(
      await screen.findByText('Password reset link sent! Check your email.')
    ).toBeInTheDocument();
    expect(onSuccess).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('✕ close calls onClose only', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const onSuccess = vi.fn();
    const { container } = render(<AuthModal isOpen onClose={onClose} onSuccess={onSuccess} />);

    // The ✕ button has no accessible name yet (FP-04 remainder) — select via its icon.
    const closeButton = container.querySelector('svg.lucide-x')?.closest('button');
    expect(closeButton).toBeTruthy();
    await user.click(closeButton!);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSuccess).not.toHaveBeenCalled();
  });

  it('backdrop uses the design-system scrim, not the dead Tailwind-v3 bg-opacity utility (FP-04a)', () => {
    const { container } = render(<AuthModal isOpen onClose={vi.fn()} onSuccess={vi.fn()} />);

    const backdrop = container.firstElementChild;
    // Tailwind v4 removed bg-opacity-*; the old `bg-black bg-opacity-50` pair
    // rendered a fully opaque black backdrop. Tripwire against reintroduction.
    expect(backdrop?.className).toContain('bg-esy-ink/30');
    expect(backdrop?.className).not.toMatch(/bg-opacity-/);
  });
});
