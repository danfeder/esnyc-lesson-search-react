import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GoogleDocEmbed } from './GoogleDocEmbed';

describe('GoogleDocEmbed', () => {
  const mockDocId = 'test-doc-id-123';
  const mockDocUrl = 'https://docs.google.com/document/d/test-doc-id-123/edit';

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();
    // Clear localStorage to ensure fresh state for each test
    window.localStorage.clear();
  });

  it('shows pre-flight screen initially', () => {
    render(<GoogleDocEmbed docId={mockDocId} />);

    expect(screen.getByText('View in Google Docs Editor')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /continue to google docs/i })).toBeInTheDocument();
  });

  it('renders iframe after continuing from pre-flight screen', async () => {
    render(<GoogleDocEmbed docId={mockDocId} />);

    const continueButton = screen.getByRole('button', { name: /continue to google docs/i });
    fireEvent.click(continueButton);

    await waitFor(() => {
      const iframe = screen.getByTitle('Lesson Document');
      expect(iframe).toBeInTheDocument();
      expect(iframe).toHaveAttribute(
        'src',
        expect.stringContaining(`https://docs.google.com/document/d/${mockDocId}/edit`)
      );
    });
  });

  it('shows loading state after continuing', async () => {
    render(<GoogleDocEmbed docId={mockDocId} />);

    const continueButton = screen.getByRole('button', { name: /continue to google docs/i });
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(screen.getByText('Loading Google Doc...')).toBeInTheDocument();
      // Check for loading skeleton elements
      const skeletonElements = document.querySelectorAll('.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });
  });

  it('hides loading state after iframe loads', async () => {
    render(<GoogleDocEmbed docId={mockDocId} />);

    const continueButton = screen.getByRole('button', { name: /continue to google docs/i });
    fireEvent.click(continueButton);

    await waitFor(() => {
      const iframe = screen.getByTitle('Lesson Document');
      fireEvent.load(iframe);
    });

    await waitFor(() => {
      expect(screen.queryByText('Loading Google Doc...')).not.toBeInTheDocument();
    });
  });

  it('opens Google Docs in new tab when clicking external link after continuing', async () => {
    const mockOpen = vi.fn();
    window.open = mockOpen;

    render(<GoogleDocEmbed docId={mockDocId} docUrl={mockDocUrl} />);

    const continueButton = screen.getByRole('button', { name: /continue to google docs/i });
    fireEvent.click(continueButton);

    await waitFor(() => {
      const openButtons = screen.getAllByRole('button', { name: /open in google docs/i });
      fireEvent.click(openButtons[0]);
    });

    expect(mockOpen).toHaveBeenCalledWith(mockDocUrl, '_blank', 'noopener,noreferrer');
  });

  it('shows fallback text button when provided', () => {
    const mockFallback = vi.fn();
    render(<GoogleDocEmbed docId={mockDocId} fallbackToText={mockFallback} />);

    const textButton = screen.getByRole('button', { name: /view as text/i });
    expect(textButton).toBeInTheDocument();

    fireEvent.click(textButton);
    expect(mockFallback).toHaveBeenCalled();
  });

  it('remembers user choice after first continue', async () => {
    const { rerender } = render(<GoogleDocEmbed docId={mockDocId} />);

    const continueButton = screen.getByRole('button', { name: /continue to google docs/i });
    fireEvent.click(continueButton);

    await waitFor(() => {
      expect(screen.getByTitle('Lesson Document')).toBeInTheDocument();
    });

    // Re-render component - should skip pre-flight screen
    rerender(<GoogleDocEmbed docId="new-doc-id" />);

    // Should show iframe directly
    expect(screen.getByTitle('Lesson Document')).toBeInTheDocument();
    expect(screen.queryByText('View in Google Docs Editor')).not.toBeInTheDocument();
  });

  it('sets correct iframe attributes for security', async () => {
    render(<GoogleDocEmbed docId={mockDocId} />);

    const continueButton = screen.getByRole('button', { name: /continue to google docs/i });
    fireEvent.click(continueButton);

    await waitFor(() => {
      const iframe = screen.getByTitle('Lesson Document');
      expect(iframe).toHaveAttribute(
        'sandbox',
        'allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox'
      );
      expect(iframe).toHaveAttribute(
        'allow',
        'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
      );
    });
  });

  it('validates doc ID and shows error for invalid IDs', () => {
    const invalidDocId = '<script>alert("xss")</script>';
    const mockOnError = vi.fn();

    render(<GoogleDocEmbed docId={invalidDocId} onError={mockOnError} />);

    expect(mockOnError).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Invalid Google Doc ID format' })
    );
  });

  // Integration test for error state - this would need a real browser environment
  // to properly test iframe error events, so we'll skip the complex error tests
  // and rely on manual testing for error states
});
