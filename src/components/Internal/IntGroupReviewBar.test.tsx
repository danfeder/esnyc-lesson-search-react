import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { IntGroupReviewBar } from './IntGroupReviewBar';

describe('IntGroupReviewBar', () => {
  const baseProps = {
    summary: <>Will keep canonical and archive others</>,
    primaryLabel: 'Resolve (keep 1, archive 2)',
    onResolve: vi.fn(),
    onDismiss: vi.fn(),
  };

  it('renders the summary, primary label, and default dismiss label', () => {
    render(<IntGroupReviewBar {...baseProps} />);
    expect(screen.getByText(/will keep canonical/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /resolve \(keep 1, archive 2\)/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dismiss group/i })).toBeInTheDocument();
  });

  it('respects a custom dismissLabel', () => {
    render(<IntGroupReviewBar {...baseProps} dismissLabel="Keep all" />);
    expect(screen.getByRole('button', { name: /keep all/i })).toBeInTheDocument();
  });

  it('fires onResolve / onDismiss on click', () => {
    const onResolve = vi.fn();
    const onDismiss = vi.fn();
    render(<IntGroupReviewBar {...baseProps} onResolve={onResolve} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: /resolve/i }));
    fireEvent.click(screen.getByRole('button', { name: /dismiss group/i }));
    expect(onResolve).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  describe('disabled states', () => {
    it('disables the primary button when resolveDisabled is true', () => {
      render(<IntGroupReviewBar {...baseProps} resolveDisabled />);
      expect(screen.getByRole('button', { name: /resolve/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /dismiss/i })).not.toBeDisabled();
    });

    it('disables the dismiss button when dismissDisabled is true', () => {
      render(<IntGroupReviewBar {...baseProps} dismissDisabled />);
      expect(screen.getByRole('button', { name: /dismiss/i })).toBeDisabled();
    });

    it('isSubmitting disables both buttons', () => {
      render(<IntGroupReviewBar {...baseProps} isSubmitting />);
      expect(screen.getByRole('button', { name: /resolve/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /dismiss/i })).toBeDisabled();
    });
  });

  describe('submitting label + aria-busy', () => {
    it('swaps to "Resolving…" and sets aria-busy on the resolve button only', () => {
      render(
        <IntGroupReviewBar
          {...baseProps}
          isSubmitting
          submittingAction="resolve"
          dismissLabel="Dismiss group"
        />
      );
      const resolveBtn = screen.getByRole('button', { name: /resolving…/i });
      const dismissBtn = screen.getByRole('button', { name: /dismiss group/i });
      expect(resolveBtn).toHaveAttribute('aria-busy', 'true');
      expect(dismissBtn).toHaveAttribute('aria-busy', 'false');
    });

    it('swaps to "Dismissing…" and sets aria-busy on the dismiss button only', () => {
      render(<IntGroupReviewBar {...baseProps} isSubmitting submittingAction="dismiss" />);
      expect(screen.getByRole('button', { name: /dismissing…/i })).toHaveAttribute(
        'aria-busy',
        'true'
      );
      expect(screen.getByRole('button', { name: /resolve/i })).toHaveAttribute(
        'aria-busy',
        'false'
      );
    });

    it('aria-busy is not asserted on either button when not submitting', () => {
      // React renders aria-busy={undefined|false} as no attribute, which is
      // semantically correct: an absent aria-busy = not busy.
      render(<IntGroupReviewBar {...baseProps} />);
      screen.getAllByRole('button').forEach((btn) => {
        const value = btn.getAttribute('aria-busy');
        expect(value === null || value === 'false').toBe(true);
      });
    });
  });

  describe('error display', () => {
    it('renders error in role="alert" only when present', () => {
      const { rerender } = render(<IntGroupReviewBar {...baseProps} />);
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();

      rerender(<IntGroupReviewBar {...baseProps} error="Something failed" />);
      expect(screen.getByRole('alert')).toHaveTextContent('Something failed');
    });
  });
});
