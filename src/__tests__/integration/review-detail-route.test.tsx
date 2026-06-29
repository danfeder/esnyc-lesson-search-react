/**
 * Focused regression test for the `/review/:id` route wrapper (`ReviewDetailRoute`).
 *
 * Bug: `ReviewErrorBoundary` is a class boundary with `hasError` state and NO
 * reset path (no getDerivedStateFromProps / componentDidUpdate). If it sits
 * OUTSIDE the keyed subtree, a render error caught on `/review/A` leaves
 * `hasError: true` forever and PERMANENTLY blocks every later `/review/B` (the
 * boundary instance persists; its child never re-mounts). The fix keys the
 * boundary itself to `:id` so the whole boundary subtree remounts on navigation,
 * clearing `hasError`.
 *
 * The page-level harness (`review-detail-page.test.tsx`) renders `ReviewDetail`
 * directly under a Route and never exercises this wrapper, so this is a separate,
 * focused test that renders the REAL `ReviewDetailRoute` exported from App.tsx.
 */
import { Suspense } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';

// Mock the lazy-loaded ReviewDetail: throw for id 'err' (to trip the boundary),
// render normally otherwise. App's `lazy()` remaps this named export to default.
vi.mock('@/pages/ReviewDetail', () => ({
  ReviewDetail: function MockReviewDetail() {
    const { id } = useParams();
    if (id === 'err') throw new Error('boom');
    return <div>Review detail for {id}</div>;
  },
}));

import { ReviewDetailRoute } from '@/App';

/** Tiny in-router navigation control; lives OUTSIDE the boundary so it survives a catch. */
function GoTo({ to, label }: { to: string; label: string }) {
  const navigate = useNavigate();
  return <button onClick={() => navigate(to)}>{label}</button>;
}

describe('ReviewDetailRoute — ReviewErrorBoundary keyed to :id', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    // React (and the boundary's componentDidCatch) log the caught error to
    // console.error; silence it so the suite output stays pristine.
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('a render error caught on one review does not permanently block a later review', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/review/err']}>
        <GoTo to="/review/ok" label="go-ok" />
        <Suspense fallback={<div>loading</div>}>
          <Routes>
            <Route path="/review/:id" element={<ReviewDetailRoute />} />
          </Routes>
        </Suspense>
      </MemoryRouter>
    );

    // First review throws → the keyed boundary inside ReviewDetailRoute catches it
    // and renders its fallback.
    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();

    // Navigate to a DIFFERENT review id. Because the boundary is keyed to :id it
    // REMOUNTS (hasError clears) and the second review renders — a caught error on
    // one review must not permanently block later ones.
    await user.click(screen.getByRole('button', { name: 'go-ok' }));

    expect(await screen.findByText(/review detail for ok/i)).toBeInTheDocument();
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });
});
