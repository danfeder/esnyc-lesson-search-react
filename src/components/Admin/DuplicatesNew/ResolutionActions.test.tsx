import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ResolutionActions } from './ResolutionActions';

describe('ResolutionActions', () => {
  const defaultProps = {
    onKeepAll: vi.fn(),
    onSkip: vi.fn(),
    onSaveAndNext: vi.fn(),
    isSubmitting: false,
    hasValidSelection: true,
  };

  it('renders all three action buttons', () => {
    render(<ResolutionActions {...defaultProps} />);

    expect(screen.getByRole('button', { name: /keep all/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /skip/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save & next/i })).toBeInTheDocument();
  });

  it('calls onKeepAll when Keep All button is clicked', async () => {
    const user = userEvent.setup();
    const onKeepAll = vi.fn();
    render(<ResolutionActions {...defaultProps} onKeepAll={onKeepAll} />);

    await user.click(screen.getByRole('button', { name: /keep all/i }));
    expect(onKeepAll).toHaveBeenCalledTimes(1);
  });

  it('calls onSkip when Skip button is clicked', async () => {
    const user = userEvent.setup();
    const onSkip = vi.fn();
    render(<ResolutionActions {...defaultProps} onSkip={onSkip} />);

    await user.click(screen.getByRole('button', { name: /skip/i }));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('calls onSaveAndNext when Save & Next button is clicked', async () => {
    const user = userEvent.setup();
    const onSaveAndNext = vi.fn();
    render(<ResolutionActions {...defaultProps} onSaveAndNext={onSaveAndNext} />);

    await user.click(screen.getByRole('button', { name: /save & next/i }));
    expect(onSaveAndNext).toHaveBeenCalledTimes(1);
  });

  it('disables all buttons when isSubmitting is true', () => {
    render(<ResolutionActions {...defaultProps} isSubmitting={true} />);

    expect(screen.getByRole('button', { name: /keep/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /skip/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /sav/i })).toBeDisabled();
  });

  it('disables Save & Next when hasValidSelection is false', () => {
    render(<ResolutionActions {...defaultProps} hasValidSelection={false} />);

    expect(screen.getByRole('button', { name: /keep all/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /skip/i })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: /save & next/i })).toBeDisabled();
  });

  it('shows loading state for Keep All button when submittingAction is keepAll', () => {
    render(<ResolutionActions {...defaultProps} isSubmitting={true} submittingAction="keepAll" />);

    expect(screen.getByRole('button', { name: /keeping/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save & next/i })).toBeInTheDocument();
  });

  it('shows loading state for Save & Next button when submittingAction is saveAndNext', () => {
    render(
      <ResolutionActions {...defaultProps} isSubmitting={true} submittingAction="saveAndNext" />
    );

    expect(screen.getByRole('button', { name: /keep all/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /saving/i })).toBeInTheDocument();
  });

  it('displays error message when error prop is provided', () => {
    render(<ResolutionActions {...defaultProps} error="Something went wrong" />);

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('does not display error message when error is null', () => {
    render(<ResolutionActions {...defaultProps} error={null} />);

    expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
  });
});
