/**
 * FP-03 integration trace: submit-after-sign-in on NewSubmissionForm.
 *
 * A signed-out teacher clicks Submit → AuthModal opens and pendingSubmitRef is
 * set. On successful sign-in AuthModal must call ONLY onSuccess (the consumer
 * closes the modal); it must NOT call onClose, because the forms clear
 * pendingSubmitRef in onClose (the dismissal path). The forms' [user] effect
 * then auto-submits once the SIGNED_IN auth event lands. Before the fix,
 * AuthModal's success path also ran onClose(), clearing the ref before the
 * passive [user] effect could flush — the promised auto-submit never fired.
 * (Audit: docs/plans/fp1-audit/audit-state-bugs.md F1.)
 *
 * RevisingSubmissionForm carries byte-identical pendingSubmitRef wiring; only
 * the NewSubmissionForm path is traced here.
 *
 * Uses the global @/lib/supabase mock (src/__tests__/setup.ts). That mock has
 * no `functions` key, so a per-test `functions.invoke` is attached below. The
 * SIGNED_IN event is fired manually via the captured onAuthStateChange
 * callback — this simulates supabase-js event timing; the timing-independent
 * pin lives in AuthModal.test.tsx ("onSuccess only — never onClose").
 */
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NewSubmissionForm } from '@/pages/NewSubmissionForm';
import { supabase } from '@/lib/supabase';

const mockGetUser = supabase.auth.getUser as Mock;
const mockOnAuthStateChange = supabase.auth.onAuthStateChange as Mock;

type AuthCallback = (
  event: string,
  session: { user: { id: string; email: string } } | null
) => void;

const DOC_URL = 'https://docs.google.com/document/d/abc123';

describe('submit-after-sign-in (FP-03)', () => {
  let authCallback: AuthCallback | null = null;
  let invokeMock: Mock;

  beforeEach(() => {
    // Global afterEach runs vi.clearAllMocks(), so (re)apply implementations here.
    authCallback = null;
    mockOnAuthStateChange.mockImplementation((callback: AuthCallback) => {
      authCallback = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });

    // Response shape matches what NewSubmissionForm reads: response.success + response.data.
    invokeMock = vi.fn().mockResolvedValue({
      data: {
        success: true,
        data: { submissionId: 's1', extractedTitle: 'Tomato Tasting', status: 'submitted' },
      },
      error: null,
    });
    (supabase as unknown as { functions: { invoke: Mock } }).functions = { invoke: invokeMock };
  });

  async function renderFormSignedOutAndClickSubmit(user: ReturnType<typeof userEvent.setup>) {
    render(
      <MemoryRouter>
        <NewSubmissionForm />
      </MemoryRouter>
    );
    // Flush the initial getUser() resolution inside act.
    await act(async () => {});

    await user.type(screen.getByPlaceholderText('https://docs.google.com/document/d/...'), DOC_URL);
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    // Signed out → the auth wall appears instead of a submission.
    expect(await screen.findByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    expect(invokeMock).not.toHaveBeenCalled();
  }

  it('auto-submits the pending submission after a successful sign-in', async () => {
    const user = userEvent.setup();
    await renderFormSignedOutAndClickSubmit(user);

    // Sign in through the modal (global mock defaults signInWithPassword to success).
    await user.type(screen.getByPlaceholderText('teacher@school.edu'), 'teacher@school.edu');
    await user.type(screen.getByPlaceholderText('••••••••'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    // Consumer onSuccess closes the modal; pendingSubmitRef must survive this.
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Sign In' })).not.toBeInTheDocument()
    );

    // supabase-js fires SIGNED_IN → [user] effect fires the pending submit.
    act(() => {
      authCallback?.('SIGNED_IN', { user: { id: 'u1', email: 't@x.org' } });
    });

    await waitFor(() => expect(invokeMock).toHaveBeenCalledTimes(1));
    expect(invokeMock).toHaveBeenCalledWith('process-submission', {
      body: { googleDocUrl: DOC_URL, submissionType: 'new', originalLessonId: null },
    });
    expect(await screen.findByRole('heading', { name: 'Submitted!' })).toBeInTheDocument();
  });

  it('dismissing the modal cancels the pending submit — a later sign-in must not surprise-submit', async () => {
    const user = userEvent.setup();
    await renderFormSignedOutAndClickSubmit(user);

    // Dismiss with ✕ (button has no accessible name yet — FP-04 remainder).
    const closeButton = document.querySelector('svg.lucide-x')?.closest('button');
    expect(closeButton).toBeTruthy();
    await user.click(closeButton as HTMLButtonElement);
    await waitFor(() =>
      expect(screen.queryByRole('heading', { name: 'Sign In' })).not.toBeInTheDocument()
    );

    // A later sign-in elsewhere (e.g. via the Header) lands as SIGNED_IN here too.
    act(() => {
      authCallback?.('SIGNED_IN', { user: { id: 'u1', email: 't@x.org' } });
    });
    await act(async () => {});

    expect(invokeMock).not.toHaveBeenCalled();
    // Still on the untouched form, not the result screen.
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Submitted!' })).not.toBeInTheDocument();
  });
});
